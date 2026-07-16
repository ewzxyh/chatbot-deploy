#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createAutomationServer } = require('./incident-automation-webhook');

function fixture(name) {
  const fullPath = path.join(__dirname, '..', 'automations', 'incident-flow', 'fixtures', name);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function postJson(url, body, secret) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-chatcase-automation-secret': secret,
    },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  return { status: response.status, json };
}

async function main() {
  const secret = 'REDACTED_SECRET';
  const server = createAutomationServer({
    webhookSecret: secret,
    dryRun: true,
    silent: true,
  });

  const port = await listen(server);
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const chatcase = await postJson(
      `${baseUrl}/webhooks/chatcase/operational-alert`,
      fixture('chatcase-operational-alert.json'),
      secret,
    );
    assert.strictEqual(chatcase.status, 200);
    assert.strictEqual(chatcase.json.ok, true);
    assert.strictEqual(chatcase.json.notify, true);
    assert.strictEqual(chatcase.json.delivery.status, 'dry_run');
    assert.strictEqual(chatcase.json.incident.source, 'chatcase');
    assert.strictEqual(chatcase.json.incident.severity, 'critical');
    assert(!chatcase.json.incident.message.includes('secret123'));

    const stillOpenPayload = fixture('chatcase-operational-alert.json');
    stillOpenPayload.event = 'alert.still_open';
    const stillOpen = await postJson(
      `${baseUrl}/webhooks/chatcase/operational-alert`,
      stillOpenPayload,
      secret,
    );
    assert.strictEqual(stillOpen.status, 200);
    assert.strictEqual(stillOpen.json.notify, false);
    assert.strictEqual(stillOpen.json.delivery.reason, 'below_threshold');

    const sentry = await postJson(
      `${baseUrl}/webhooks/sentry/issue-alert`,
      fixture('sentry-issue-alert.json'),
      secret,
    );
    assert.strictEqual(sentry.status, 200);
    assert.strictEqual(sentry.json.ok, true);
    assert.strictEqual(sentry.json.notify, true);
    assert.strictEqual(sentry.json.delivery.status, 'dry_run');
    assert.strictEqual(sentry.json.incident.source, 'sentry');
    assert.strictEqual(sentry.json.incident.severity, 'critical');
    assert(!sentry.json.incident.message.includes('redacted@example.invalid'));
    assert(!sentry.json.incident.issueUrl.includes('token='));

    const unauthorized = await fetch(`${baseUrl}/webhooks/sentry/issue-alert`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    assert.strictEqual(unauthorized.status, 401);

    console.log('OK incident automation flow: chatcase dry-run, sentry dry-run, auth guard');
  } finally {
    await close(server);
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
