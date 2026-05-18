#!/usr/bin/env node

const http = require('http');
const { URL } = require('url');
const { processIncidentPayload } = require('../automations/incident-flow/incidentFlow');

function readJson(req, limitBytes = 1024 * 256) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8') || '{}';
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('invalid_json'));
      }
    });
    req.on('error', reject);
  });
}

function writeJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function routeSource(pathname) {
  if (pathname === '/webhooks/sentry/issue-alert') return 'sentry';
  if (pathname === '/webhooks/chatcase/operational-alert') return 'chatcase';
  return null;
}

function checkSecret(req, parsedUrl, expectedSecret) {
  if (!expectedSecret) return true;
  const headerSecret = req.headers['x-chatcase-automation-secret'];
  const querySecret = REDACTED_SECRET('secret');
  return headerSecret === expectedSecret || querySecret === expectedSecret;
}

async function sendResendEmail(email, options) {
  const apiKey = REDACTED_SECRET || process.env.RESEND_API_KEY;
  const from = options.emailFrom || process.env.INCIDENT_EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS;
  const to = options.emailTo || process.env.INCIDENT_EMAIL_TO || process.env.OPERATIONAL_ALERT_EMAIL_TO;

  if (!apiKey || !from || !to) {
    return { status: 'skipped', reason: 'resend_not_configured' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: String(to).split(/[;,]/).map((item) => item.trim()).filter(Boolean),
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    return { status: 'failed', statusCode: response.status, body: body.slice(0, 300) };
  }
  return { status: 'sent', statusCode: response.status };
}

async function deliver(result, options) {
  if (!result.notify) {
    return { status: 'skipped', reason: 'below_threshold' };
  }

  const dryRun = options.dryRun !== undefined
    ? options.dryRun
    : process.env.INCIDENT_AUTOMATION_DRY_RUN !== 'false';

  if (dryRun) {
    return { status: 'dry_run' };
  }

  return sendResendEmail(result.email, options);
}

function createAutomationServer(options = {}) {
  return http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, 'http://localhost');

    if (req.method === 'GET' && parsedUrl.pathname === '/healthz') {
      writeJson(res, 200, { ok: true });
      return;
    }

    const source = routeSource(parsedUrl.pathname);
    if (req.method !== 'POST' || !source) {
      writeJson(res, 404, { error: 'not_found' });
      return;
    }

    const expectedSecret = REDACTED_SECRET || process.env.INCIDENT_WEBHOOK_SECRET;
    if (!checkSecret(req, parsedUrl, expectedSecret)) {
      writeJson(res, 401, { error: 'unauthorized' });
      return;
    }

    try {
      const payload = await readJson(req, options.maxBodyBytes);
      const result = processIncidentPayload(payload, {
        source,
        minSeverity: options.minSeverity || process.env.INCIDENT_MIN_SEVERITY || 'critical',
        notifyResolved: options.notifyResolved,
      });
      const delivery = await deliver(result, options);

      if (!options.silent) {
        console.log(JSON.stringify({
          at: new Date().toISOString(),
          source,
          delivery,
          notify: result.notify,
          incident: result.incident,
        }));
      }

      writeJson(res, 200, {
        ok: delivery.status !== 'failed',
        delivery,
        notify: result.notify,
        incident: result.incident,
      });
    } catch (err) {
      const statusCode = err.message === 'payload_too_large' ? 413 : 400;
      writeJson(res, statusCode, { error: err.message });
    }
  });
}

function start() {
  const port = Number(process.env.INCIDENT_AUTOMATION_PORT || 8787);
  const host = process.env.INCIDENT_AUTOMATION_HOST || '127.0.0.1';
  const server = createAutomationServer();
  server.listen(port, host, () => {
    console.log(`incident automation webhook listening on http://${host}:${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = {
  createAutomationServer,
  sendResendEmail,
};
