#!/usr/bin/env node

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

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

function required(value, name) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function normalizePrefix(prefix) {
  if (!prefix) {
    return '';
  }

  const trimmed = prefix.trim();
  if (trimmed === '/' || trimmed === '') {
    return '';
  }

  return trimmed.startsWith('/') ? trimmed.replace(/\/$/, '') : `/${trimmed.replace(/\/$/, '')}`;
}

function requestJson(url, auth, payload) {
  const target = new URL(url);
  const body = JSON.stringify(payload);
  const client = target.protocol === 'https:' ? https : http;

  const options = {
    method: 'POST',
    hostname: target.hostname,
    port: target.port || undefined,
    path: `${target.pathname}${target.search}`,
    headers: {
      Authorization: `Basic ${Buffer.from(`${auth.email}:${auth.password}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
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
          reject(new Error(`Import failed with HTTP ${res.statusCode}: ${message}`));
          return;
        }

        resolve(parsed);
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  const args = parseArgs(process.argv);
  const rootDir = path.resolve(__dirname, '..');
  const flowFile = path.resolve(args.file || process.env.CHATBOT_FLOW_FILE || path.join(rootDir, 'automations', 'chatbot-flows', 'whatsapp-menu-basic.json'));
  const baseUrl = (args['base-url'] || process.env.CHATCASE_BASE_URL || 'http://localhost:8081').replace(/\/$/, '');
  const apiPrefix = normalizePrefix(args['api-prefix'] || process.env.CHATCASE_API_PREFIX || '/api');
  const projectId = required(args['project-id'] || process.env.CHATCASE_PROJECT_ID, 'project id');
  const email = required(args.email || process.env.CHATCASE_ADMIN_EMAIL, 'admin email');
  const password = required(args.password || process.env.CHATCASE_ADMIN_PASSWORD, 'admin password');

  const flow = JSON.parse(fs.readFileSync(flowFile, 'utf8'));
  const endpoint = `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq_kb/importjson/null?create=true`;
  const result = await requestJson(endpoint, { email, password }, flow);

  console.log(`OK chatbot flow import: ${flow.name}`);
  console.log(`Bot id: ${result && result._id ? result._id : 'not returned'}`);
  console.log(`Endpoint: ${endpoint.replace(/:[^:@/]+@/, ':***@')}`);
}

run().catch((error) => {
  console.error('FAIL chatbot flow import:', error.message);
  process.exitCode = 1;
});
