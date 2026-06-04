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
  'COMMUNITY_PUBLIC_URL',
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
  'GLOBAL_SECRET',
  'CHAT21_JWT_SECRET',
  'JWT_SECRET_KEY',
  'APPS_ACCESS_TOKEN_SECRET',
  'SESSION_SECRET',
  'CHAT21_ADMIN_TOKEN',
  'PUSH_WH_CHAT21_API_ADMIN_TOKEN',
  'PUSH_WH_WEBHOOK_TOKEN',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'SUPER_PASSWORD',
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
  'CHANGE_ME_LONG_RANDOM_SESSION_SECRET',
  'CHANGE_ME_LONG_RANDOM_API_JWT_SECRET',
  'CHANGE_ME_LONG_RANDOM_CHAT21_JWT_SECRET',
  'CHANGE_ME_LONG_RANDOM_APPS_ACCESS_SECRET',
  'CHANGE_ME_CHAT21_ADMIN_TOKEN',
  'CHANGE_ME_PUSH_API_ADMIN_TOKEN',
  'CHANGE_ME_PUSH_WEBHOOK_TOKEN',
  'CHANGE_ME_LONG_RANDOM_ADMIN_PASSWORD',
  'CHANGE_ME_LONG_RANDOM_SUPER_PASSWORD',
  'CHANGE_ME_OPENAI_OR_PROVIDER_KEY',
  'CHANGE_ME_LONG_RANDOM_VERIFY_TOKEN',
  'CHANGE_ME_LONG_RANDOM_MEDIA_CDN_SIGNING_SECRET',
  'CHANGEIT',
  'CHANGEIT_FB_APP_SECRET',
  'tokenKey',
  'nodeauthsecret',
  'change-me',
  'change-me-cookie',
]);

const warnings = [
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

function assertDifferent(env, leftKey, rightKey, errors) {
  if (hasValue(env, leftKey) && hasValue(env, rightKey) && env[leftKey] === env[rightKey]) {
    errors.push(`${leftKey} must be different from ${rightKey}`);
  }
}

function assertSame(env, leftKey, rightKey, errors) {
  if (hasValue(env, leftKey) && hasValue(env, rightKey) && env[leftKey] !== env[rightKey]) {
    errors.push(`${leftKey} must match ${rightKey}`);
  }
}

function validateAmqpUri(env, errors, key) {
  const uri = env[key];
  if (!uri || looksPlaceholder(uri)) return;

  if (!uri.startsWith('amqp://')) {
    errors.push(`${key} must start with amqp://`);
  }
  if (!uri.includes('@rabbitmq:5672')) {
    errors.push(`${key} must target the internal RabbitMQ service: @rabbitmq:5672`);
  }
  if (/tokenKey|CHANGE_ME|change-me|ignored:ignored/i.test(uri)) {
    errors.push(`${key} must not use a dev or placeholder token`);
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

function assertNumberBetween(env, key, min, max, errors) {
  if (env[key] !== undefined && env[key] !== '' && !looksPlaceholder(env[key])) {
    const parsed = Number(env[key]);
    if (Number.isNaN(parsed) || parsed < min || parsed > max) {
      errors.push(`${key} must be a number between ${min} and ${max}`);
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

  if (env.COMMUNITY_PUBLIC_URL && !looksPlaceholder(env.COMMUNITY_PUBLIC_URL)) {
    if (!env.COMMUNITY_PUBLIC_URL.startsWith('https://')) {
      errors.push('COMMUNITY_PUBLIC_URL must use https:// in production');
    }
    if (!/\/community\/?$/.test(env.COMMUNITY_PUBLIC_URL)) {
      errors.push('COMMUNITY_PUBLIC_URL must point to the public /community/ page');
    }
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
    'AUDIT_EVENT_RETENTION_DAYS',
    'PRIVACY_CONVERSATION_RETENTION_DAYS',
    'PRIVACY_ATTACHMENT_RETENTION_DAYS',
    'PRIVACY_LEAD_RETENTION_DAYS',
    'PRIVACY_RETENTION_BATCH_LIMIT',
    'PRIVACY_RETENTION_ATTACHMENT_BATCH_LIMIT',
    'PRIVACY_RETENTION_JOB_INTERVAL_HOURS',
    'PRIVACY_RETENTION_JOB_START_DELAY_SECONDS',
    'PRIVACY_EXPORT_MAX_REQUESTS',
    'PRIVACY_EXPORT_MAX_MESSAGES',
    'BILLING_LIFECYCLE_JOB_INTERVAL_HOURS',
    'BILLING_LIFECYCLE_JOB_START_DELAY_SECONDS',
    'BILLING_LIFECYCLE_BATCH_LIMIT',
    'BILLING_GRACE_DAYS',
    'BILLING_SUSPEND_AFTER_DAYS',
    'BILLING_DOWNGRADE_AFTER_DAYS',
    'BILLING_DUNNING_NOTICE_INTERVAL_HOURS',
    'BILLING_EXPIRING_NOTICE_DAYS',
  ].forEach((key) => assertPositiveInteger(env, key, errors));

  [
    'PRIVACY_RETENTION_DELETE_ATTACHMENTS',
    'PRIVACY_RETENTION_JOB_ENABLED',
    'PRIVACY_RETENTION_JOB_DRY_RUN',
    'PRIVACY_ANONYMIZE_MESSAGE_TEXT',
    'BILLING_LIFECYCLE_JOB_ENABLED',
    'BILLING_LIFECYCLE_JOB_DRY_RUN',
    'BILLING_LIFECYCLE_DRY_RUN',
    'BILLING_LIFECYCLE_EMAIL_ENABLED',
  ].forEach((key) => {
    if (env[key] && !['true', 'false'].includes(env[key])) {
      errors.push(`${key} must be true or false`);
    }
  });

  if (isEnabled(env.BILLING_LIFECYCLE_EMAIL_ENABLED) && env.EMAIL_ENABLED !== 'true') {
    errors.push('BILLING_LIFECYCLE_EMAIL_ENABLED=true requires EMAIL_ENABLED=true');
  }

  if (env.AI_FEATURES_ENABLED && !['true', 'false'].includes(env.AI_FEATURES_ENABLED)) {
    errors.push('AI_FEATURES_ENABLED must be true or false');
  }

  if (isEnabled(env.AI_FEATURES_ENABLED) && !hasValue(env, 'GPTKEY')) {
    errors.push('AI_FEATURES_ENABLED=true requires GPTKEY');
  }

  if (isEnabled(env.BILLING_LIFECYCLE_JOB_ENABLED) && env.BILLING_LIFECYCLE_JOB_DRY_RUN === 'true') {
    warn.push('BILLING_LIFECYCLE_JOB_ENABLED=true with BILLING_LIFECYCLE_JOB_DRY_RUN=true will only simulate billing changes');
  }

  if (isEnabled(env.BILLING_LIFECYCLE_JOB_ENABLED) &&
      env.BILLING_LIFECYCLE_DRY_RUN &&
      env.BILLING_LIFECYCLE_DRY_RUN !== env.BILLING_LIFECYCLE_JOB_DRY_RUN) {
    warn.push('BILLING_LIFECYCLE_DRY_RUN differs from BILLING_LIFECYCLE_JOB_DRY_RUN; status endpoints may show a different default from the scheduled job');
  }

  if (isEnabled(env.BILLING_LIFECYCLE_JOB_ENABLED) &&
      (!hasValue(env, 'CASEPAY_API_KEY') || !hasValue(env, 'CASEPAY_CONNECTION_ID') || !hasValue(env, 'CASEPAY_WEBHOOK_SECRET'))) {
    warn.push('BILLING_LIFECYCLE_JOB_ENABLED=true should only be used after CasePay credentials and webhooks are configured');
  }

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

  assertNumberBetween(env, 'SENTRY_TRACES_SAMPLE_RATE', 0, 1, errors);
  if (isEnabled(env.SENTRY_ENABLED) && !hasValue(env, 'SENTRY_DSN')) {
    errors.push('SENTRY_ENABLED=true requires SENTRY_DSN');
  }
  if (hasValue(env, 'SENTRY_DSN') && !/^https:\/\/[^@\s]+@[^/\s]+\/\d+/.test(env.SENTRY_DSN)) {
    errors.push('SENTRY_DSN must look like an https Sentry DSN');
  }
  assertNumberBetween(env, 'DASHBOARD_SENTRY_TRACES_SAMPLE_RATE', 0, 1, errors);
  if (isEnabled(env.DASHBOARD_SENTRY_ENABLED) && !hasValue(env, 'DASHBOARD_SENTRY_DSN')) {
    errors.push('DASHBOARD_SENTRY_ENABLED=true requires DASHBOARD_SENTRY_DSN');
  }
  if (hasValue(env, 'DASHBOARD_SENTRY_DSN') && !/^https:\/\/[^@\s]+@[^/\s]+\/\d+/.test(env.DASHBOARD_SENTRY_DSN)) {
    errors.push('DASHBOARD_SENTRY_DSN must look like an https Sentry DSN');
  }

  if (isEnabled(env.MEDIA_CDN_ENABLED)) {
    if (!hasValue(env, 'MEDIA_CDN_BASE_URL')) {
      errors.push('MEDIA_CDN_ENABLED=true requires MEDIA_CDN_BASE_URL');
    } else if (!env.MEDIA_CDN_BASE_URL.startsWith('https://')) {
      errors.push('MEDIA_CDN_BASE_URL must use https:// in production');
    }
    if (!hasValue(env, 'MEDIA_CDN_SIGNING_SECRET')) {
      errors.push('MEDIA_CDN_ENABLED=true requires MEDIA_CDN_SIGNING_SECRET');
    }
    assertPositiveInteger(env, 'MEDIA_CDN_DEFAULT_TTL_SECONDS', errors);
    if (env.MEDIA_CDN_REPLACE_SRC && !['true', 'false'].includes(env.MEDIA_CDN_REPLACE_SRC)) {
      errors.push('MEDIA_CDN_REPLACE_SRC must be true or false');
    }
  }

  [
    'MONGO_TILEDESK_PASSWORD',
    'MONGO_LOGS_PASSWORD',
    'MONGO_CHAT21_PASSWORD',
    'REDIS_PASSWORD',
    'GLOBAL_SECRET',
    'CHAT21_JWT_SECRET',
    'JWT_SECRET_KEY',
    'APPS_ACCESS_TOKEN_SECRET',
    'SESSION_SECRET',
    'VERIFY_TOKEN',
    'INCIDENT_WEBHOOK_SECRET',
    'ADMIN_PASSWORD',
    'SUPER_PASSWORD',
    'CHAT21_ADMIN_TOKEN',
    'PUSH_WH_CHAT21_API_ADMIN_TOKEN',
    'PUSH_WH_WEBHOOK_TOKEN',
    'MEDIA_CDN_SIGNING_SECRET',
  ].forEach((key) => assertUrlSafeSecret(env, key, errors));

  assertDifferent(env, 'GLOBAL_SECRET', 'CHAT21_JWT_SECRET', errors);
  assertDifferent(env, 'GLOBAL_SECRET', 'JWT_SECRET_KEY', errors);
  assertSame(env, 'APPS_ACCESS_TOKEN_SECRET', 'GLOBAL_SECRET', errors);
  assertDifferent(env, 'JWT_SECRET_KEY', 'CHAT21_JWT_SECRET', errors);
  assertDifferent(env, 'APPS_ACCESS_TOKEN_SECRET', 'CHAT21_JWT_SECRET', errors);
  assertDifferent(env, 'SESSION_SECRET', 'JWT_SECRET_KEY', errors);
  assertDifferent(env, 'SESSION_SECRET', 'GLOBAL_SECRET', errors);
  assertDifferent(env, 'SESSION_SECRET', 'CHAT21_JWT_SECRET', errors);
  assertDifferent(env, 'SESSION_SECRET', 'APPS_ACCESS_TOKEN_SECRET', errors);

  validateAmqpUri(env, errors, 'AMQP_MANAGER_URL');
  validateAmqpUri(env, errors, 'RABBITMQ_URI');
  validateAmqpUri(env, errors, 'RABBITMQ_ADMIN_URI');

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
