#!/usr/bin/env node

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const defaultFlowPath = path.join(rootDir, 'automations', 'chatbot-flows', 'whatsapp-menu-basic.json');
const mongoContainer = process.env.MONGO_CONTAINER || 'mongo';

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const part = argv[index];
    if (!part.startsWith('--')) continue;
    const [rawKey, rawValue] = part.slice(2).split('=');
    let value = rawValue;
    if (value === undefined && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      value = argv[index + 1];
      index += 1;
    }
    args[rawKey.trim()] = value === undefined ? true : value;
  }
  return args;
}

function required(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function normalizeBaseUrl(value) {
  return (value || 'http://localhost:8081').replace(/\/$/, '');
}

function normalizePrefix(prefix) {
  if (!prefix || prefix === '/') return '';
  return prefix.startsWith('/') ? prefix.replace(/\/$/, '') : `/${prefix.replace(/\/$/, '')}`;
}

function authHeader(auth) {
  return `Basic ${Buffer.from(`${auth.email}:${auth.password}`).toString('base64')}`;
}

function redactUrl(value) {
  return String(value).replace(/([?&]secret=)[^&]+/i, '$1***');
}

function requestJson({ method, url, auth, payload }) {
  const target = new URL(url);
  const body = payload === undefined ? null : JSON.stringify(payload);
  const client = target.protocol === 'https:' ? https : http;
  const headers = {};

  if (auth) headers.Authorization = authHeader(auth);
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  return new Promise((resolve, reject) => {
    const req = client.request({
      method,
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      headers
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed = raw;
        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch (error) {
          parsed = raw;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const message = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
          reject(new Error(`${method} ${redactUrl(url)} failed with HTTP ${res.statusCode}: ${message}`));
          return;
        }
        resolve(parsed);
      });
    });

    req.on('error', reject);
    if (body !== null) req.write(body);
    req.end();
  });
}

function mongoJson(jsExpression) {
  const script = `
    const result = (${jsExpression});
    print(JSON.stringify(result));
  `;
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const mongoArgs = [
    'exec',
    mongoContainer,
    'mongosh',
    '--quiet',
  ];
  mongoArgs.push(mongoUri || 'tiledesk');
  mongoArgs.push(
    '--eval',
    script
  );

  const result = childProcess.spawnSync('docker', mongoArgs, {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    throw new Error(`mongosh failed: ${result.stderr || result.stdout}`);
  }

  const line = result.stdout.trim().split(/\r?\n/).filter(Boolean).pop();
  return line ? JSON.parse(line) : null;
}

function maskPhone(phone) {
  return String(phone || '').replace(/\d(?=(?:\D*\d){4})/g, '*');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findOrImportBot({ baseUrl, apiPrefix, projectId, auth, flow }) {
  const bots = await requestJson({
    method: 'GET',
    url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq_kb`,
    auth
  });
  const botList = Array.isArray(bots) ? bots : [];
  const existing = botList.find((bot) => bot.name === flow.name && bot.type === 'tilebot' && bot.trashed !== true);
  const endpointId = existing ? existing._id : 'null';
  const query = existing ? 'replace=true&overwrite=true' : 'create=true';
  const bot = await requestJson({
    method: 'POST',
    url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq_kb/importjson/${encodeURIComponent(endpointId)}?${query}`,
    auth,
    payload: flow
  });

  assert(bot._id, 'bot id should be returned');
  assert.strictEqual(bot.name, flow.name);
  assert.strictEqual(bot.attributes.nativeInteractions.casezap, 'menu');
  assert.strictEqual(bot.attributes.nativeInteractions.whatsapp, 'buttons');
  return { bot, reused: Boolean(existing) };
}

async function closeExistingCaseZapRequests({ baseUrl, apiPrefix, projectId, auth, integrationId, phone }) {
  const activeRequests = mongoJson(`(() => {
    const requests = db.requests.find({
      id_project: ${JSON.stringify(projectId)},
      integrationId: ObjectId(${JSON.stringify(integrationId)}),
      "attributes.casezapPhone": ${JSON.stringify(phone)},
      status: { $lt: 1000 }
    }, { request_id: 1 }).toArray();
    return requests.map((item) => item.request_id);
  })()`);

  for (const requestId of activeRequests) {
    await requestJson({
      method: 'PUT',
      url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/requests/${encodeURIComponent(requestId)}/close`,
      auth,
      payload: { force: true }
    });
  }

  return activeRequests;
}

async function attachBotToDefaultDepartment({ baseUrl, apiPrefix, projectId, auth, botId }) {
  const department = await requestJson({
    method: 'GET',
    url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/departments/default`,
    auth
  });

  assert(department && department._id, 'default department should exist');
  const previousBotId = department.id_bot || null;

  await requestJson({
    method: 'PATCH',
    url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/departments/${encodeURIComponent(department._id)}`,
    auth,
    payload: {
      id_bot: botId,
      bot_only: false
    }
  });

  return { departmentId: department._id, previousBotId };
}

async function restoreDefaultDepartment({ baseUrl, apiPrefix, projectId, auth, departmentId, previousBotId }) {
  await requestJson({
    method: 'PATCH',
    url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/departments/${encodeURIComponent(departmentId)}`,
    auth,
    payload: {
      id_bot: previousBotId || null,
      bot_only: false
    }
  });
}

async function postCaseZapWebhook({ baseUrl, integrationId, secret, phone, text, messageId }) {
  return requestJson({
    method: 'POST',
    url: `${baseUrl}/api/modules/casezap/webhook/${encodeURIComponent(integrationId)}?secret=${encodeURIComponent(secret)}`,
    payload: {
      EventType: 'messages',
      messageid: messageId,
      id: messageId,
      type: 'text',
      messageType: 'conversation',
      chatid: `${phone}@s.whatsapp.net`,
      senderName: 'ChatCase Flow E2E',
      text,
      content: text,
      fromMe: false,
      isGroup: false,
      messageTimestamp: Date.now()
    }
  });
}

function getConversationSnapshot({ projectId, integrationId, phone }) {
  return mongoJson(`(() => {
    const request = db.requests.find({
      id_project: ${JSON.stringify(projectId)},
      integrationId: ObjectId(${JSON.stringify(integrationId)}),
      "attributes.casezapPhone": ${JSON.stringify(phone)}
    }, {
      request_id: 1,
      status: 1,
      participants: 1,
      first_text: 1,
      createdAt: 1,
      updatedAt: 1
    }).sort({ createdAt: -1 }).limit(1).toArray()[0];

    if (!request) return null;

    const messages = db.messages.find({
      id_project: ${JSON.stringify(projectId)},
      recipient: request.request_id
    }, {
      sender: 1,
      senderFullname: 1,
      text: 1,
      type: 1,
      attributes: 1,
      metadata: 1,
      createdAt: 1
    }).sort({ createdAt: 1 }).toArray();

    return {
      request: {
        request_id: request.request_id,
        status: request.status,
        participants: request.participants || [],
        first_text: request.first_text,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      },
      messages: messages.map((message) => ({
        sender: message.sender,
        senderFullname: message.senderFullname,
        text: message.text,
        type: message.type,
        attributes: message.attributes,
        metadata: message.metadata,
        createdAt: message.createdAt
      }))
    };
  })()`);
}

async function waitForText({ projectId, integrationId, phone, fragment, timeoutMs }) {
  const startedAt = Date.now();
  let snapshot = null;
  while (Date.now() - startedAt < timeoutMs) {
    snapshot = getConversationSnapshot({ projectId, integrationId, phone });
    if (snapshot && snapshot.messages.some((message) => String(message.text || '').includes(fragment))) {
      return snapshot;
    }
    await delay(1000);
  }
  throw new Error(`Timed out waiting for chatbot text containing "${fragment}". Last snapshot: ${JSON.stringify(snapshot)}`);
}

async function run() {
  const args = parseArgs(process.argv);
  const baseUrl = normalizeBaseUrl(args['base-url'] || process.env.CHATCASE_BASE_URL);
  const apiPrefix = normalizePrefix(args['api-prefix'] || process.env.CHATCASE_API_PREFIX || '/api');
  const flowFile = path.resolve(args.file || process.env.CHATBOT_FLOW_FILE || defaultFlowPath);
  const flow = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
  const projectId = required(args['project-id'] || process.env.CHATCASE_PROJECT_ID, 'project id');
  const integrationId = required(args['integration-id'] || process.env.CASEZAP_INTEGRATION_ID, 'CaseZap integration id');
  const phone = required(args.phone || process.env.CASEZAP_TEST_PHONE, 'CaseZap test phone');
  const auth = {
    email: required(args.email || process.env.CHATCASE_ADMIN_EMAIL, 'admin email'),
    password: required(args.password || process.env.CHATCASE_ADMIN_PASSWORD, 'admin password')
  };

  const integration = mongoJson(`(() => {
    const item = db.integrations.findOne({
      _id: ObjectId(${JSON.stringify(integrationId)}),
      id_project: ${JSON.stringify(projectId)},
      name: "casezap"
    }, { value: 1 });
    if (!item || !item.value) return null;
    return {
      status: item.value.status,
      number: item.value.number,
      hasSecret: Boolean(item.value.webhookSecret),
      webhookSecret: REDACTED_SECRET
    };
  })()`);

  assert(integration, 'CaseZap integration should exist for project');
  assert(integration.hasSecret, 'CaseZap integration should have webhookSecret');

  const imported = await findOrImportBot({ baseUrl, apiPrefix, projectId, auth, flow });
  const attached = await attachBotToDefaultDepartment({
    baseUrl,
    apiPrefix,
    projectId,
    auth,
    botId: imported.bot._id
  });

  let closedRequests = [];
  let snapshot;
  try {
    if (args['close-existing']) {
      closedRequests = await closeExistingCaseZapRequests({
        baseUrl,
        apiPrefix,
        projectId,
        auth,
        integrationId,
        phone
      });
    }

    const marker = Date.now();
    await postCaseZapWebhook({
      baseUrl,
      integrationId,
      secret: REDACTED_SECRET,
      phone,
      text: 'menu',
      messageId: `chatcase-flow-menu-${marker}`
    });
    snapshot = await waitForText({
      projectId,
      integrationId,
      phone,
      fragment: 'Menu ChatCase',
      timeoutMs: Number(args.timeout || 30000)
    });

    assert(snapshot.request.participants.includes(`bot_${imported.bot._id}`), 'request should be assigned to the imported bot');

    await postCaseZapWebhook({
      baseUrl,
      integrationId,
      secret: REDACTED_SECRET,
      phone,
      text: 'Ver planos',
      messageId: `chatcase-flow-plans-${marker}`
    });
    snapshot = await waitForText({
      projectId,
      integrationId,
      phone,
      fragment: 'Planos ChatCase',
      timeoutMs: Number(args.timeout || 30000)
    });

    await postCaseZapWebhook({
      baseUrl,
      integrationId,
      secret: REDACTED_SECRET,
      phone,
      text: 'Menu',
      messageId: `chatcase-flow-menu-alias-${marker}`
    });
    snapshot = await waitForText({
      projectId,
      integrationId,
      phone,
      fragment: 'Menu ChatCase',
      timeoutMs: Number(args.timeout || 30000)
    });

    if (!args['keep-request'] && snapshot && snapshot.request && snapshot.request.request_id) {
      await requestJson({
        method: 'PUT',
        url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/requests/${encodeURIComponent(snapshot.request.request_id)}/close`,
        auth,
        payload: { force: true }
      });
    }
  } finally {
    if (!args['keep-bot-attached']) {
      await restoreDefaultDepartment({
        baseUrl,
        apiPrefix,
        projectId,
        auth,
        departmentId: attached.departmentId,
        previousBotId: attached.previousBotId
      });
    }
  }

  console.log(
    [
      'OK chatbot CaseZap real flow',
      `project=${projectId}`,
      `integration=${integrationId}`,
      `phone=${maskPhone(phone)}`,
      `bot=${imported.bot._id}`,
      `botReused=${imported.reused}`,
      `closedExisting=${closedRequests.length}`,
      `request=${snapshot && snapshot.request ? snapshot.request.request_id : 'not-found'}`,
      `departmentRestored=${!args['keep-bot-attached']}`
    ].join(' ')
  );
}

run().catch((error) => {
  console.error('FAIL chatbot CaseZap real flow:', error.message);
  process.exitCode = 1;
});
