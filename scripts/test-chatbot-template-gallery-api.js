#!/usr/bin/env node

const assert = require('assert');
const http = require('http');
const https = require('https');

const TEMPLATE_ID = 'chatcase-whatsapp-menu-basic';
const EXPECTED_INTENTS = ['defaultFallback', 'start', 'menu', 'plans', 'human_handoff'];

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
  const timestamp = Date.now();
  const auth = {
    email: `chatbot-template-${timestamp}@example.com`,
    password: `pwd-${timestamp}`
  };

  let projectId;

  try {
    /*
     * AC: O template ChatCase precisa aparecer na galeria publica e ser importavel pela rota oficial.
     * Behavior: lista publica -> detalhe publico -> fork em projeto temporario -> intents persistidos.
     * @category: service-integration-e2e
     * @lane: service-integration-e2e
     * @dependency: full-system
     */
    const templates = await requestJson({
      method: 'GET',
      url: `${baseUrl}${apiPrefix}/modules/templates/public/templates`
    });

    assert(Array.isArray(templates), 'template list should be an array');
    const template = templates.find((item) => item._id === TEMPLATE_ID);
    assert(template, `template ${TEMPLATE_ID} should be listed`);
    assert.strictEqual(template.type, 'tilebot');
    assert.strictEqual(template.subtype, 'chatbot');
    assert.strictEqual(template.public, true);
    assert.strictEqual(template.certified, true);

    const detail = await requestJson({
      method: 'GET',
      url: `${baseUrl}${apiPrefix}/modules/templates/public/templates/${encodeURIComponent(TEMPLATE_ID)}`
    });

    assert.strictEqual(detail.name, template.name);
    assert.strictEqual(detail.type, 'tilebot');
    assert.strictEqual(detail.subtype, 'chatbot');
    assert(Array.isArray(detail.intents), 'template detail should include intents');
    EXPECTED_INTENTS.forEach((name) => {
      assert(detail.intents.some((intent) => intent.intent_display_name === name), `template intent ${name} should exist`);
    });

    const signup = await requestJson({
      method: 'POST',
      url: `${baseUrl}${apiPrefix}/auth/signup`,
      payload: {
        email: auth.email,
        password: auth.password,
        firstname: 'Chatbot',
        lastname: 'Template',
        disableEmail: true
      }
    });

    assert.strictEqual(signup.success, true, 'signup should succeed');

    const project = await requestJson({
      method: 'POST',
      url: `${baseUrl}${apiPrefix}/projects`,
      auth,
      payload: {
        name: `Chatbot Template Import ${timestamp}`
      }
    });

    projectId = project._id;
    assert(projectId, 'project id should be returned');

    const fork = await requestJson({
      method: 'POST',
      url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq_kb/fork/${encodeURIComponent(TEMPLATE_ID)}?public=true&projectid=${encodeURIComponent(projectId)}`,
      auth
    });

    assert(fork.bot_id, 'fork should return bot id');

    const persistedBot = await requestJson({
      method: 'GET',
      url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq_kb/${encodeURIComponent(fork.bot_id)}`,
      auth
    });

    assert.strictEqual(persistedBot.name, detail.name);
    assert.strictEqual(persistedBot.type, 'tilebot');
    assert.strictEqual(persistedBot.subtype, 'chatbot');

    const intents = await requestJson({
      method: 'GET',
      url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq?id_faq_kb=${encodeURIComponent(fork.bot_id)}`,
      auth
    });

    const byName = new Map(intents.map((intent) => [intent.intent_display_name, intent]));
    EXPECTED_INTENTS.forEach((name) => {
      assert(byName.has(name), `persisted intent ${name} should exist`);
    });

    assert.strictEqual(byName.get('start').question, '\\start');
    assert.strictEqual(byName.get('plans').question, '1');
    assert.strictEqual(byName.get('human_handoff').question, '2');

    console.log(`OK chatbot template gallery api: template=${TEMPLATE_ID} project=${projectId} bot=${fork.bot_id} intents=${intents.length}`);
  } finally {
    if (!args['keep-project']) {
      await cleanupProject({ baseUrl, apiPrefix, projectId, auth });
    }
  }
}

run().catch((error) => {
  console.error('FAIL chatbot template gallery api:', error.message);
  process.exitCode = 1;
});
