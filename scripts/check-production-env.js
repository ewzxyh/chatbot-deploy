#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.argv[2] || '.env.production');

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Env file not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return env;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) return env;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[match[1]] = value;
      return env;
    }, {});
}

const required = [
  'EXTERNAL_BASE_URL',
  'PROXY_HTTP_BIND',
  'FILE_STORAGE_DRIVER',
  'MONGO_INITDB_ROOT_USERNAME',
  'MONGO_INITDB_ROOT_PASSWORD',
  'MONGO_TILEDESK_USERNAME',
  'MONGO_TILEDESK_PASSWORD',
  'MONGO_LOGS_USERNAME',
  'MONGO_LOGS_PASSWORD',
  'MONGO_CHAT21_USERNAME',
  'MONGO_CHAT21_PASSWORD',
  'TILEDESK_MONGODB_URI',
  'TILEDESK_LOGS_MONGODB_URI',
  'CHAT21_MONGODB_URI',
  'REDIS_PASSWORD',
  'REDIS_URL',
  'RABBITMQ_DEFAULT_USER',
  'RABBITMQ_DEFAULT_PASS',
  'RABBITMQ_ERLANG_COOKIE',
  'RABBITMQ_MANAGEMENT_URL',
  'RABBITMQ_MANAGEMENT_USERNAME',
  'RABBITMQ_MANAGEMENT_PASSWORD',
  'OPERATIONAL_RABBITMQ_QUEUES',
  'AMQP_MANAGER_URL',
  'RABBITMQ_URI',
  'RABBITMQ_ADMIN_URI',
  'CHAT21_JWT_SECRET',
  'JWT_SECRET_KEY',
  'APPS_ACCESS_TOKEN_SECRET',
  'GPTKEY',
  'ADMIN_EMAIL',
  'SUPER_ADMIN_EMAILS',
  'FB_APP_ID',
  'FB_APP_SECRET',
  'META_CONFIGURATION_ID',
  'VERIFY_TOKEN',
  'R2_ENDPOINT',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_REGION',
  'R2_KEY_PREFIX',
  'MONGO_BACKUP_R2_ENDPOINT',
  'MONGO_BACKUP_R2_BUCKET',
  'MONGO_BACKUP_R2_ACCESS_KEY_ID',
  'MONGO_BACKUP_R2_SECRET_ACCESS_KEY',
  'MONGO_BACKUP_R2_REGION',
  'MONGO_BACKUP_R2_PREFIX',
];

const weakValues = new Set([
  '',
  'CHANGE_ME',
  'CHANGE_ME_STRONG_PASSWORD',
  'CHANGE_ME_MONGO_TILEDESK_PASSWORD',
  'CHANGE_ME_MONGO_LOGS_PASSWORD',
  'CHANGE_ME_MONGO_CHAT21_PASSWORD',
  'CHANGE_ME_REDIS_PASSWORD',
  'CHANGE_ME_LONG_RANDOM_COOKIE',
  'CHANGE_ME_LONG_RANDOM_SECRET',
  'CHANGE_ME_OPENAI_OR_PROVIDER_KEY',
  'CHANGE_ME_LONG_RANDOM_VERIFY_TOKEN',
  'CHANGEIT',
  'CHANGEIT_FB_APP_SECRET',
  'tokenKey',
  'nodeauthsecret',
  'change-me',
  'change-me-cookie',
]);

const warnings = [
  'CHAT21_ADMIN_TOKEN',
  'PUSH_WH_CHAT21_API_ADMIN_TOKEN',
  'PUSH_WH_WEBHOOK_TOKEN',
  'EMAIL_HOST',
  'EMAIL_USERNAME',
  'EMAIL_PASSWORD',
  'CASEPAY_API_KEY',
  'CASEPAY_CONNECTION_ID',
  'CASEPAY_WEBHOOK_SECRET',
];

const recommendedRabbitQueues = [
  'jobsmanager',
  'webhooks',
  'messages',
  'logs_queue',
  'conversation-tags_queue',
  'persist',
  'tiledesk-trainer',
];

function looksPlaceholder(value) {
  return weakValues.has(value) ||
    /^<.+>$/.test(value || '') ||
    /<[^>]+>/.test(value || '') ||
    /CHANGE_ME/.test(value || '');
}

function assertUrlSafeSecret(env, key, errors) {
  if (env[key] && !looksPlaceholder(env[key]) && !/^[A-Za-z0-9._~-]{24,}$/.test(env[key])) {
    errors.push(`${key} must be at least 24 URL-safe characters: A-Z a-z 0-9 . _ ~ -`);
  }
}

function assertPositiveInteger(env, key, errors) {
  if (env[key] !== undefined && env[key] !== '' && !looksPlaceholder(env[key])) {
    const parsed = Number(env[key]);
    if (!Number.isInteger(parsed) || parsed < 1) {
      errors.push(`${key} must be a positive integer`);
    }
  }
}

function parseQueueList(raw) {
  return String(raw || '')
    .split(',')
    .map((queue) => queue.trim())
    .filter(Boolean);
}

function hasValue(env, key) {
  return Boolean(env[key]) && !looksPlaceholder(env[key]);
}

function isEnabled(value) {
  return value === true || value === 'true' || value === '1' || value === 'yes';
}

function validateMongoUri(env, errors, uriKey, dbName, userKey, authSource) {
  const uri = env[uriKey];
  if (!uri || looksPlaceholder(uri)) return;

  if (env.MONGO_INITDB_ROOT_USERNAME && uri.includes(env.MONGO_INITDB_ROOT_USERNAME)) {
    errors.push(`${uriKey} must use a dedicated application user, not MONGO_INITDB_ROOT_USERNAME`);
  }
  if (env[userKey] && !looksPlaceholder(env[userKey]) && !uri.includes(`${env[userKey]}:`)) {
    errors.push(`${uriKey} must use ${userKey}`);
  }
  if (!uri.includes(`@mongo:27017/${dbName}`)) {
    errors.push(`${uriKey} must target mongo:27017/${dbName}`);
  }
  if (!uri.includes(`authSource=${authSource}`)) {
    errors.push(`${uriKey} must use authSource=${authSource}`);
  }
}

function main() {
  const env = readEnv(envPath);
  const errors = [];
  const warn = [];

  for (const key of required) {
    if (!(key in env)) {
      errors.push(`${key} is missing`);
    } else if (looksPlaceholder(env[key])) {
      errors.push(`${key} still has a placeholder/dev value`);
    }
  }

  if (env.EXTERNAL_BASE_URL && !env.EXTERNAL_BASE_URL.startsWith('https://')) {
    errors.push('EXTERNAL_BASE_URL must use https:// in production');
  }

  if (env.FILE_STORAGE_DRIVER && env.FILE_STORAGE_DRIVER !== 'r2') {
    errors.push('FILE_STORAGE_DRIVER should be r2 in production');
  }

  [
    'OPERATIONAL_MONITOR_INTERVAL_SECONDS',
    'OPERATIONAL_MONITOR_START_DELAY_SECONDS',
    'OPERATIONAL_QUEUE_READY_ALERT_THRESHOLD',
    'OPERATIONAL_QUEUE_UNACKED_ALERT_THRESHOLD',
    'OPERATIONAL_STORAGE_CHECK_TTL_SECONDS',
    'OPERATIONAL_ALERT_WEBHOOK_TIMEOUT_MS',
  ].forEach((key) => assertPositiveInteger(env, key, errors));

  if (env.OPERATIONAL_ALERT_MIN_SEVERITY &&
      !['info', 'warning', 'critical'].includes(env.OPERATIONAL_ALERT_MIN_SEVERITY)) {
    errors.push('OPERATIONAL_ALERT_MIN_SEVERITY must be info, warning, or critical');
  }

  if (env.OPERATIONAL_ALERT_WEBHOOK_URL && !looksPlaceholder(env.OPERATIONAL_ALERT_WEBHOOK_URL) &&
      !env.OPERATIONAL_ALERT_WEBHOOK_URL.startsWith('https://')) {
    errors.push('OPERATIONAL_ALERT_WEBHOOK_URL must use https:// in production');
  }

  if (env.OPERATIONAL_ALERT_EMAIL_ENABLED === 'true' && env.EMAIL_ENABLED !== 'true') {
    errors.push('OPERATIONAL_ALERT_EMAIL_ENABLED=true requires EMAIL_ENABLED=true');
  }

  const hasOperationalAlertWebhook = hasValue(env, 'OPERATIONAL_ALERT_WEBHOOK_URL');
  const hasOperationalAlertEmail = isEnabled(env.OPERATIONAL_ALERT_EMAIL_ENABLED) && hasValue(env, 'OPERATIONAL_ALERT_EMAIL_TO');
  if (!hasOperationalAlertWebhook && !hasOperationalAlertEmail) {
    errors.push('Production must configure at least one operational alert destination: OPERATIONAL_ALERT_WEBHOOK_URL or OPERATIONAL_ALERT_EMAIL_ENABLED=true with OPERATIONAL_ALERT_EMAIL_TO');
  }

  if (isEnabled(env.OPERATIONAL_ALERT_EMAIL_ENABLED) && !hasValue(env, 'OPERATIONAL_ALERT_EMAIL_TO')) {
    errors.push('OPERATIONAL_ALERT_EMAIL_ENABLED=true requires OPERATIONAL_ALERT_EMAIL_TO');
  }

  [
    'MONGO_TILEDESK_PASSWORD',
    'MONGO_LOGS_PASSWORD',
    'MONGO_CHAT21_PASSWORD',
    'REDIS_PASSWORD',
  ].forEach((key) => assertUrlSafeSecret(env, key, errors));

  if (env.REDIS_URL && !looksPlaceholder(env.REDIS_URL)) {
    if (!env.REDIS_URL.startsWith('redis://:')) {
      errors.push('REDIS_URL must include Redis password, for example redis://:<password>@redis:6379');
    }
    if (!env.REDIS_URL.includes('@redis:6379')) {
      errors.push('REDIS_URL must target the internal redis service: @redis:6379');
    }
    if (env.REDIS_PASSWORD && !looksPlaceholder(env.REDIS_PASSWORD) && !env.REDIS_URL.includes(`:${env.REDIS_PASSWORD}@`)) {
      errors.push('REDIS_URL must use the same value as REDIS_PASSWORD');
    }
  }

  if (env.RABBITMQ_MANAGEMENT_URL && !looksPlaceholder(env.RABBITMQ_MANAGEMENT_URL)) {
    if (env.RABBITMQ_MANAGEMENT_URL !== 'http://rabbitmq:15672/api') {
      errors.push('RABBITMQ_MANAGEMENT_URL must target the internal RabbitMQ management API: http://rabbitmq:15672/api');
    }
  }

  if (env.RABBITMQ_MANAGEMENT_USERNAME && env.RABBITMQ_DEFAULT_USER &&
      !looksPlaceholder(env.RABBITMQ_MANAGEMENT_USERNAME) && !looksPlaceholder(env.RABBITMQ_DEFAULT_USER) &&
      env.RABBITMQ_MANAGEMENT_USERNAME !== env.RABBITMQ_DEFAULT_USER) {
    errors.push('RABBITMQ_MANAGEMENT_USERNAME must match RABBITMQ_DEFAULT_USER unless a separate RabbitMQ management user is created');
  }

  if (env.RABBITMQ_MANAGEMENT_PASSWORD && env.RABBITMQ_DEFAULT_PASS &&
      !looksPlaceholder(env.RABBITMQ_MANAGEMENT_PASSWORD) && !looksPlaceholder(env.RABBITMQ_DEFAULT_PASS) &&
      env.RABBITMQ_MANAGEMENT_PASSWORD !== env.RABBITMQ_DEFAULT_PASS) {
    errors.push('RABBITMQ_MANAGEMENT_PASSWORD must match RABBITMQ_DEFAULT_PASS unless a separate RabbitMQ management user is created');
  }

  if (env.OPERATIONAL_RABBITMQ_QUEUES && !looksPlaceholder(env.OPERATIONAL_RABBITMQ_QUEUES)) {
    if (env.OPERATIONAL_RABBITMQ_QUEUES.split(',').some((queue) => queue.trim() === '')) {
      errors.push('OPERATIONAL_RABBITMQ_QUEUES must not contain empty queue names');
    }

    const queues = parseQueueList(env.OPERATIONAL_RABBITMQ_QUEUES);
    const duplicates = queues.filter((queue, index) => queues.indexOf(queue) !== index);
    if (duplicates.length > 0) {
      errors.push(`OPERATIONAL_RABBITMQ_QUEUES contains duplicate names: ${[...new Set(duplicates)].join(', ')}`);
    }

    const missingRecommended = recommendedRabbitQueues.filter((queue) => !queues.includes(queue));
    if (missingRecommended.length > 0) {
      warn.push(`OPERATIONAL_RABBITMQ_QUEUES is missing currently recommended queues: ${missingRecommended.join(', ')}`);
    }
  }

  validateMongoUri(env, errors, 'TILEDESK_MONGODB_URI', 'tiledesk', 'MONGO_TILEDESK_USERNAME', 'tiledesk');
  validateMongoUri(env, errors, 'TILEDESK_LOGS_MONGODB_URI', 'tiledesk-logs', 'MONGO_LOGS_USERNAME', 'tiledesk-logs');
  validateMongoUri(env, errors, 'CHAT21_MONGODB_URI', 'chat21', 'MONGO_CHAT21_USERNAME', 'chat21');

  for (const key of warnings) {
    if (!(key in env) || looksPlaceholder(env[key])) {
      warn.push(`${key} is empty or still using a placeholder`);
    }
  }

  const result = { ok: errors.length === 0, errors, warnings: warn };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main();
