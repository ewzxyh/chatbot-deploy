#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function readEnvFile(envPath) {
  if (!envPath) return;
  const resolved = path.resolve(envPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Env file not found: ${resolved}`);
  }

  readTextFile(resolved).split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return;

    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith('--')) {
      args._.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }
  return args;
}

function firstValue(values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return undefined;
}

function normalizeBaseUrl(raw) {
  const value = firstValue([raw, process.env.SMOKE_BASE_URL, process.env.EXTERNAL_BASE_URL, 'http://localhost:8081']);
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, '');
}

function normalizePath(value, fallback) {
  const raw = firstValue([value, fallback]) || '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function authHeader(email, password) {
  return `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
}

function shortBody(text) {
  if (!text) return '';
  return text.length > 300 ? `${text.slice(0, 300)}...` : text;
}

function asStatus(value) {
  return String(value || '').toLowerCase();
}

function result(status, name, message, details) {
  return {
    status,
    name,
    message,
    details: details || {},
  };
}

function statusFromHealth(value) {
  const status = asStatus(value);
  if (status === 'ok') return 'ok';
  if (status === 'degraded' || status === 'unknown' || status === 'skipped') return 'warn';
  return 'fail';
}

async function request(ctx, method, requestPath, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ctx.timeoutMs);
  const headers = Object.assign({}, options.headers || {});
  let body;

  if (options.json !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(options.json);
  } else {
    body = options.body;
  }

  try {
    const response = await fetch(`${ctx.baseUrl}${requestPath}`, {
      method,
      headers,
      body,
      signal: controller.signal,
      redirect: options.redirect || 'follow',
    });
    const text = await response.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (err) {
        json = null;
      }
    }
    return {
      ok: response.ok,
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      text,
      json,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function requireFetch() {
  if (typeof fetch !== 'function' || typeof AbortController !== 'function') {
    throw new Error('Node.js 18+ is required because this script uses global fetch.');
  }
}

async function checkDashboard(ctx) {
  const response = await request(ctx, 'GET', ctx.dashboardPath);
  if (!response.ok) {
    return result('fail', 'dashboard', `HTTP ${response.statusCode}`, { path: ctx.dashboardPath });
  }
  return result('ok', 'dashboard', `HTTP ${response.statusCode}`, {
    path: ctx.dashboardPath,
    contentType: response.headers['content-type'] || null,
  });
}

async function checkSummary(ctx) {
  const response = await request(ctx, 'GET', `${ctx.apiPrefix}/sadmin/health/summary`, {
    headers: { authorization: ctx.authorization },
  });

  if (!response.ok || !response.json) {
    return result('fail', 'health summary', `HTTP ${response.statusCode}: ${shortBody(response.text)}`, {
      path: `${ctx.apiPrefix}/sadmin/health/summary`,
    });
  }

  const status = response.json.overallStatus || response.json.status;
  const mapped = statusFromHealth(status);
  const alerts = Array.isArray(response.json.alerts) ? response.json.alerts.length : 0;
  const services = Array.isArray(response.json.services) ? response.json.services.length : 0;
  const channels = Array.isArray(response.json.channels) ? response.json.channels.length : 0;
  return result(mapped, 'health summary', `overall=${status || 'unknown'}, services=${services}, channels=${channels}, alerts=${alerts}`, {
    overallStatus: status || null,
    alerts,
    services,
    channels,
  });
}

async function checkQueues(ctx) {
  const response = await request(ctx, 'GET', `${ctx.apiPrefix}/sadmin/health/queues`, {
    headers: { authorization: ctx.authorization },
  });

  if (!response.ok || !response.json) {
    return result('fail', 'rabbitmq queues', `HTTP ${response.statusCode}: ${shortBody(response.text)}`, {
      path: `${ctx.apiPrefix}/sadmin/health/queues`,
    });
  }

  const queueService = response.json.queueService || {};
  const queues = Array.isArray(queueService.details && queueService.details.queues)
    ? queueService.details.queues
    : [];
  const mapped = statusFromHealth(queueService.status);
  const downQueues = queues.filter((queue) => queue.status === 'down').length;
  const backlogQueues = queues.filter((queue) => Number(queue.messagesReady || 0) > 0 || Number(queue.messagesUnacknowledged || 0) > 0).length;
  return result(mapped, 'rabbitmq queues', `status=${queueService.status || 'unknown'}, queues=${queues.length}, down=${downQueues}, backlog=${backlogQueues}`, {
    status: queueService.status || null,
    queues: queues.length,
    downQueues,
    backlogQueues,
    queueSource: queueService.details ? queueService.details.queueSource : null,
  });
}

async function checkStorage(ctx) {
  if (ctx.skipStorageTest) {
    return result('warn', 'storage probe', 'skipped by --skip-storage-test');
  }

  const response = await request(ctx, 'POST', `${ctx.apiPrefix}/sadmin/health/storage/test`, {
    headers: { authorization: ctx.authorization },
    json: {},
  });

  if (!response.ok || !response.json) {
    return result('fail', 'storage probe', `HTTP ${response.statusCode}: ${shortBody(response.text)}`, {
      path: `${ctx.apiPrefix}/sadmin/health/storage/test`,
    });
  }

  const probe = response.json.result || {};
  const mapped = statusFromHealth(probe.status);
  return result(mapped, 'storage probe', `status=${probe.status || 'unknown'}, driver=${probe.details && probe.details.driver ? probe.details.driver : 'unknown'}`, {
    status: probe.status || null,
    driver: probe.details ? probe.details.driver || null : null,
    latencyMs: probe.latencyMs || null,
  });
}

async function checkAlertNotification(ctx) {
  if (ctx.skipAlertTest) {
    return result('warn', 'alert notification', 'skipped by --skip-alert-test');
  }

  const response = await request(ctx, 'POST', `${ctx.apiPrefix}/sadmin/operational-alerts/test-notification`, {
    headers: { authorization: ctx.authorization },
    json: {},
  });

  if (!response.ok || !response.json) {
    return result('fail', 'alert notification', `HTTP ${response.statusCode}: ${shortBody(response.text)}`, {
      path: `${ctx.apiPrefix}/sadmin/operational-alerts/test-notification`,
    });
  }

  const notification = response.json.result || {};
  if (notification.status === 'failed' || notification.ok === false) {
    return result('fail', 'alert notification', `status=${notification.status || 'failed'}`, {
      status: notification.status || 'failed',
      error: notification.error || null,
    });
  }

  const status = notification.status === 'sent' ? 'ok' : 'warn';
  return result(status, 'alert notification', `status=${notification.status || 'unknown'}`, {
    status: notification.status || null,
    webhook: notification.webhook ? notification.webhook.status : null,
    email: notification.email ? notification.email.status : null,
  });
}

async function runCheck(check, ctx) {
  try {
    return await check(ctx);
  } catch (err) {
    return result('fail', check.name.replace(/^check/, '').toLowerCase() || 'check', err.message);
  }
}

function printResults(results, jsonOutput) {
  if (jsonOutput) {
    console.log(JSON.stringify({
      ok: !results.some((item) => item.status === 'fail'),
      generatedAt: new Date().toISOString(),
      results,
    }, null, 2));
    return;
  }

  for (const item of results) {
    console.log(`${item.status.toUpperCase().padEnd(4)} ${item.name}: ${item.message}`);
  }
}

async function main() {
  requireFetch();

  const args = parseArgs(process.argv.slice(2));
  readEnvFile(args.env);

  const email = firstValue([args['admin-email'], process.env.SMOKE_ADMIN_EMAIL, process.env.ADMIN_EMAIL, process.env.SUPER_ADMIN_EMAILS && process.env.SUPER_ADMIN_EMAILS.split(',')[0]]);
  const password = firstValue([args['admin-password'], process.env.SMOKE_ADMIN_PASSWORD, process.env.ADMIN_PASSWORD]);
  if (!email || !password) {
    throw new Error('Missing superadmin credentials. Use --admin-email/--admin-password or SMOKE_ADMIN_EMAIL/SMOKE_ADMIN_PASSWORD.');
  }

  const ctx = {
    baseUrl: normalizeBaseUrl(args['base-url']),
    apiPrefix: normalizePath(firstValue([args['api-prefix'], process.env.SMOKE_API_PREFIX]), '/api').replace(/\/+$/, ''),
    dashboardPath: normalizePath(firstValue([args['dashboard-path'], process.env.SMOKE_DASHBOARD_PATH]), '/dashboard/'),
    authorization: authHeader(email, password),
    timeoutMs: Number(firstValue([args['timeout-ms'], process.env.SMOKE_TIMEOUT_MS, '15000'])),
    skipStorageTest: Boolean(args['skip-storage-test']),
    skipAlertTest: Boolean(args['skip-alert-test']),
  };

  if (!Number.isInteger(ctx.timeoutMs) || ctx.timeoutMs < 1000) {
    throw new Error('SMOKE_TIMEOUT_MS/--timeout-ms must be an integer >= 1000.');
  }

  const checks = [
    checkDashboard,
    checkSummary,
    checkQueues,
    checkStorage,
    checkAlertNotification,
  ];

  const results = [];
  for (const check of checks) {
    results.push(await runCheck(check, ctx));
  }

  printResults(results, Boolean(args.json));

  if (results.some((item) => item.status === 'fail')) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`FAIL production smoke: ${err.message}`);
  process.exitCode = 1;
});
