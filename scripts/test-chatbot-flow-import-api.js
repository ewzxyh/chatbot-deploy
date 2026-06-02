#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {};

  for (let index = 2; index < argv.length; index += 1) {
    const part = argv[index];

    if (!part.startsWith('--')) {
      continue;
    }

    const [rawKey, rawValue] = part.slice(2).split('=');
    const key = rawKey.trim();
    let value = rawValue;

    if (value === undefined && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      value = argv[index + 1];
      index += 1;
    }

    args[key] = value === undefined ? true : value;
  }

  return args;
}

function normalizeBaseUrl(value) {
  return (value || 'http://localhost:8081').replace(/\/$/, '');
}

function normalizePrefix(prefix) {
  if (!prefix || prefix === '/') {
    return '';
  }

  return prefix.startsWith('/') ? prefix.replace(/\/$/, '') : `/${prefix.replace(/\/$/, '')}`;
}

function authHeader(email, password) {
  return `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
}

function requestJson({ method, url, auth, payload }) {
  const target = new URL(url);
  const body = payload === undefined ? null : JSON.stringify(payload);
  const client = target.protocol === 'https:' ? https : http;
  const headers = {};

  if (auth) {
    headers.Authorization = authHeader(auth.email, auth.password);
  }

  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  const options = {
    method,
    hostname: target.hostname,
    port: target.port || undefined,
    path: `${target.pathname}${target.search}`,
    headers
  };

  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
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
          reject(new Error(`${method} ${url} failed with HTTP ${res.statusCode}: ${message}`));
          return;
        }

        resolve(parsed);
      });
    });

    req.on('error', reject);

    if (body !== null) {
      req.write(body);
    }

    req.end();
  });
}

function expectedImportedIntentCount(flow) {
  const questions = new Set(
    (flow.intents || [])
      .map((intent) => typeof intent.question === 'string' ? intent.question.trim() : '')
      .filter(Boolean)
  );

  return (flow.intents || []).reduce((count, intent) => {
    const aliases = intent.attributes && Array.isArray(intent.attributes.aliases)
      ? intent.attributes.aliases
      : [];
    let aliasCount = 0;

    aliases.forEach((alias) => {
      if (typeof alias !== 'string') {
        return;
      }
      const normalized = alias.trim();
      if (!normalized || questions.has(normalized)) {
        return;
      }
      questions.add(normalized);
      aliasCount += 1;
    });

    return count + 1 + aliasCount;
  }, 0);
}

async function cleanupProject({ baseUrl, apiPrefix, projectId, auth }) {
  if (!projectId) {
    return;
  }

  try {
    await requestJson({
      method: 'DELETE',
      url: `${baseUrl}${apiPrefix}/projects/${encodeURIComponent(projectId)}/physical`,
      auth
    });
  } catch (error) {
    console.warn(`WARN cleanup project failed: ${error.message}`);
  }
}

async function run() {
  const args = parseArgs(process.argv);
  const baseUrl = normalizeBaseUrl(args['base-url'] || process.env.CHATCASE_BASE_URL);
  const apiPrefix = normalizePrefix(args['api-prefix'] || process.env.CHATCASE_API_PREFIX || '/api');
  const flowFile = path.resolve(args.file || process.env.CHATBOT_FLOW_FILE || path.join(rootDir, 'automations', 'chatbot-flows', 'whatsapp-menu-basic.json'));
  const flow = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
  const timestamp = Date.now();
  const auth = {
    email: `chatbot-flow-${timestamp}@example.com`,
    password: `pwd-${timestamp}`
  };

  let projectId;

  try {
    /*
     * AC: O fluxo de automacao precisa ser importavel pela API oficial do Tiledesk.
     * Behavior: Signup temporario -> cria projeto -> importa JSON -> bot tilebot e intents ficam persistidos.
     * @category: service-integration-e2e
     * @lane: service-integration-e2e
     * @dependency: full-system
     * @complexity: medium
     * ROI: 86
     */
    const signup = await requestJson({
      method: 'POST',
      url: `${baseUrl}${apiPrefix}/auth/signup`,
      payload: {
        email: auth.email,
        password: auth.password,
        firstname: 'Chatbot',
        lastname: 'Flow',
        disableEmail: true
      }
    });

    assert.strictEqual(signup.success, true, 'signup should succeed');

    const project = await requestJson({
      method: 'POST',
      url: `${baseUrl}${apiPrefix}/projects`,
      auth,
      payload: {
        name: `Chatbot Flow Import ${timestamp}`
      }
    });

    projectId = project._id;
    assert(projectId, 'project id should be returned');

    const bot = await requestJson({
      method: 'POST',
      url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq_kb/importjson/null?create=true`,
      auth,
      payload: flow
    });

    assert(bot._id, 'bot id should be returned');
    assert.strictEqual(bot.type, 'tilebot');
    assert.strictEqual(bot.subtype, 'chatbot');

    const persistedBot = await requestJson({
      method: 'GET',
      url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq_kb/${encodeURIComponent(bot._id)}`,
      auth
    });

    assert.strictEqual(persistedBot.name, flow.name);
    assert.strictEqual(persistedBot.type, 'tilebot');
    assert(persistedBot.url && persistedBot.url.includes(`/ext/${bot._id}`), 'tilebot url should point to tybot ext endpoint');

    const intents = await requestJson({
      method: 'GET',
      url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq?id_faq_kb=${encodeURIComponent(bot._id)}`,
      auth
    });

    const byName = new Map(intents.map((intent) => [intent.intent_display_name, intent]));
    assert.strictEqual(intents.length, expectedImportedIntentCount(flow));
    ['defaultFallback', 'start', 'menu', 'plans', 'human_handoff', 'menu_alias_menu', 'plans_alias_ver_planos', 'human_handoff_alias_falar_atendente', 'human_handoff_alias_atendente'].forEach((name) => {
      assert(byName.has(name), `intent ${name} should be imported`);
    });

    assert.strictEqual(byName.get('start').question, '\\start');
    assert.strictEqual(byName.get('menu_alias_menu').question, 'Menu');
    assert.strictEqual(byName.get('plans').question, '1');
    assert.strictEqual(byName.get('plans_alias_ver_planos').question, 'Ver planos');
    assert.strictEqual(byName.get('human_handoff').question, '2');
    assert.strictEqual(byName.get('human_handoff_alias_falar_atendente').question, 'Falar atendente');
    assert.strictEqual(byName.get('human_handoff_alias_atendente').question, 'Atendente');
    assert(
      !byName.get('human_handoff').answer.includes('\\agent'),
      'human handoff should not leak routing commands to the user'
    );
    assert(
      byName.get('human_handoff').actions.some((action) => action._tdActionType === 'agent'),
      'human handoff should trigger Tiledesk agent routing'
    );
    assert(
      byName.get('human_handoff_alias_falar_atendente').actions.some((action) => action._tdActionType === 'agent'),
      'human handoff alias should preserve Tiledesk agent routing'
    );
    assert(
      byName.get('human_handoff_alias_atendente').actions.some((action) => action._tdActionType === 'agent'),
      'human handoff alias should preserve Tiledesk agent routing'
    );

    /*
     * AC: Atualizar um fluxo existente deve preservar metadados ChatCase usados por canais nativos.
     * Behavior: importjson/:id com replace/overwrite atualiza attributes.nativeInteractions mesmo com rules vazias.
     * @category: service-integration-e2e
     * @lane: service-integration-e2e
     * @dependency: full-system
     * @complexity: medium
     * ROI: 78
     */
    const updatedBot = await requestJson({
      method: 'POST',
      url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq_kb/importjson/${encodeURIComponent(bot._id)}?replace=true&overwrite=true`,
      auth,
      payload: flow
    });

    assert.strictEqual(updatedBot._id, bot._id);
    assert.strictEqual(updatedBot.attributes.nativeInteractions.whatsapp, 'buttons');
    assert.strictEqual(updatedBot.attributes.nativeInteractions.casezap, 'menu');

    const updatedIntents = await requestJson({
      method: 'GET',
      url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq?id_faq_kb=${encodeURIComponent(bot._id)}`,
      auth
    });

    assert.strictEqual(updatedIntents.length, expectedImportedIntentCount(flow));

    console.log(`OK chatbot flow import api: project=${projectId} bot=${bot._id} intents=${intents.length}`);
  } finally {
    if (!args['keep-project']) {
      await cleanupProject({ baseUrl, apiPrefix, projectId, auth });
    }
  }
}

run().catch((error) => {
  console.error('FAIL chatbot flow import api:', error.message);
  process.exitCode = 1;
});
