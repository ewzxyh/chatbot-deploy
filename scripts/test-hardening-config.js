#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function extractBlock(source, marker) {
  const start = source.indexOf(marker);
  assert.notStrictEqual(start, -1, `missing block marker: ${marker}`);
  const open = source.indexOf('{', start);
  assert.notStrictEqual(open, -1, `missing opening brace for: ${marker}`);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }
  throw new Error(`unterminated block: ${marker}`);
}

function extractYamlService(source, service) {
  const marker = `  ${service}:`;
  const start = source.indexOf(marker);
  assert.notStrictEqual(start, -1, `missing service: ${service}`);
  const rest = source.slice(start);
  const next = rest.slice(marker.length).search(/\n  [A-Za-z0-9_-]+:/);
  return next === -1 ? rest : rest.slice(0, marker.length + next);
}

function baseProductionEnv(overrides = {}) {
  const env = {
    EXTERNAL_BASE_URL: 'https://app.chatcase.com.br',
    COMMUNITY_PUBLIC_URL: 'https://chatcase.com.br/community/',
    EXTERNAL_MQTT_BASE_URL: '',
    PROXY_HTTP_BIND: '80',
    FILE_STORAGE_DRIVER: 'r2',
    R2_ENDPOINT: 'https://accountid.r2.cloudflarestorage.com',
    R2_BUCKET: 'chatcase-uploads',
    R2_ACCESS_KEY_ID: 'R2AccessKeyIdValue1234567890',
    R2_SECRET_ACCESS_KEY: 'R2SecretAccessKeyValue1234567890',
    R2_REGION: 'auto',
    R2_KEY_PREFIX: 'prod',
    OPERATIONAL_STORAGE_CHECK_ENABLED: 'true',
    OPERATIONAL_STORAGE_CHECK_TTL_SECONDS: '300',
    MAX_UPLOAD_FILE_SIZE: '209715200',
    CHAT_FILES_ALLOW_LIST: '*/*',
    ASSETS_FILES_ALLOW_LIST: '*/*',
    CASEZAP_MEDIA_MAX_BYTES: '209715200',
    CHATCASE_AUTO_ASSIGN_SOLE_AGENT: 'true',
    MONGO_INITDB_ROOT_USERNAME: 'chatcase_root',
    MONGO_INITDB_ROOT_PASSWORD: 'REDACTED_SECRET',
    MONGO_TILEDESK_USERNAME: 'chatcase_tiledesk',
    MONGO_TILEDESK_PASSWORD: 'REDACTED_SECRET',
    MONGO_LOGS_USERNAME: 'chatcase_logs',
    MONGO_LOGS_PASSWORD: 'REDACTED_SECRET',
    MONGO_CHAT21_USERNAME: 'chatcase_chat21',
    MONGO_CHAT21_PASSWORD: 'REDACTED_SECRET',
    TILEDESK_MONGODB_URI: '[REDACTED_CREDENTIAL_URL]',
    TILEDESK_LOGS_MONGODB_URI: '[REDACTED_CREDENTIAL_URL]',
    CHAT21_MONGODB_URI: '[REDACTED_CREDENTIAL_URL]',
    REDIS_PASSWORD: 'REDACTED_SECRET',
    REDIS_URL: 'redis://:RedisPasswordValue1234567890@redis:6379',
    RABBITMQ_DEFAULT_USER: 'chatcase',
    RABBITMQ_DEFAULT_PASS: 'RabbitPasswordValue1234567890',
    RABBITMQ_ERLANG_COOKIE: 'RabbitCookieValue1234567890',
    RABBITMQ_MANAGEMENT_URL: 'http://rabbitmq:15672/api',
    RABBITMQ_MANAGEMENT_USERNAME: 'chatcase',
    RABBITMQ_MANAGEMENT_PASSWORD: 'REDACTED_SECRET',
    OPERATIONAL_RABBITMQ_QUEUES: 'jobsmanager,webhooks,messages,logs_queue,conversation-tags_queue,persist,tiledesk-trainer',
    OPERATIONAL_QUEUE_READY_ALERT_THRESHOLD: '100',
    OPERATIONAL_QUEUE_UNACKED_ALERT_THRESHOLD: '100',
    OPERATIONAL_MONITOR_ENABLED: 'true',
    OPERATIONAL_MONITOR_INTERVAL_SECONDS: '300',
    OPERATIONAL_MONITOR_START_DELAY_SECONDS: '60',
    OPERATIONAL_ALERT_MIN_SEVERITY: 'critical',
    OPERATIONAL_ALERT_WEBHOOK_URL: 'https://app.chatcase.com.br/automation/webhooks/chatcase/operational-alert?secret=REDACTED_SECRET',
    OPERATIONAL_ALERT_WEBHOOK_EVENTS: 'alert.opened,alert.reopened,alert.still_open',
    OPERATIONAL_ALERT_WEBHOOK_TIMEOUT_MS: '5000',
    OPERATIONAL_ALERT_NOTIFY_RESOLVED: 'false',
    OPERATIONAL_ALERT_EMAIL_ENABLED: 'false',
    OPERATIONAL_ALERT_EMAIL_TO: 'redacted@example.invalid',
    SENTRY_ENABLED: 'false',
    SENTRY_DSN: '',
    SENTRY_ENVIRONMENT: 'production',
    SENTRY_RELEASE: '',
    SENTRY_TRACES_SAMPLE_RATE: '0',
    SENTRY_SERVER_NAME: 'chatcase-vps-1',
    DASHBOARD_SENTRY_ENABLED: 'false',
    DASHBOARD_SENTRY_DSN: '',
    DASHBOARD_SENTRY_ENVIRONMENT: 'production',
    DASHBOARD_SENTRY_RELEASE: '',
    DASHBOARD_SENTRY_TRACES_SAMPLE_RATE: '0',
    INCIDENT_AUTOMATION_PORT: '8787',
    INCIDENT_AUTOMATION_DRY_RUN: 'true',
    INCIDENT_WEBHOOK_SECRET: 'REDACTED_SECRET',
    INCIDENT_MIN_SEVERITY: 'critical',
    INCIDENT_EMAIL_FROM: 'redacted@example.invalid',
    INCIDENT_EMAIL_TO: 'redacted@example.invalid',
    AMQP_MANAGER_URL: '[REDACTED_CREDENTIAL_URL]',
    RABBITMQ_URI: '[REDACTED_CREDENTIAL_URL]',
    RABBITMQ_ADMIN_URI: '[REDACTED_CREDENTIAL_URL]',
    GLOBAL_SECRET: 'REDACTED_SECRET',
    CHAT21_JWT_SECRET: 'REDACTED_SECRET',
    RABBITMQ_JWT_SECRET: 'REDACTED_SECRET',
    JWT_SECRET_KEY: 'ApiJwtSecretValue1234567890',
    APPS_ACCESS_TOKEN_SECRET: 'REDACTED_SECRET',
    SESSION_SECRET: 'REDACTED_SECRET',
    AI_FEATURES_ENABLED: 'false',
    GPTKEY: '',
    CHAT21_ADMIN_TOKEN: 'Chat21AdminTokenValue1234567890',
    PUSH_WH_CHAT21_API_ADMIN_TOKEN: 'PushApiAdminTokenValue1234567890',
    PUSH_WH_WEBHOOK_TOKEN: 'PushWebhookTokenValue1234567890',
    ADMIN_EMAIL: 'redacted@example.invalid',
    ADMIN_PASSWORD: 'REDACTED_SECRET',
    SUPER_PASSWORD: 'REDACTED_SECRET',
    SUPER_ADMIN_EMAILS: 'redacted@example.invalid',
    FB_APP_ID: '1234567890',
    FB_APP_SECRET: 'REDACTED_SECRET',
    META_CONFIGURATION_ID: '1234567890',
    VERIFY_TOKEN: 'VerifyTokenValue1234567890',
    EMAIL_ENABLED: 'true',
    EMAIL_HOST: 'smtp.resend.com',
    EMAIL_USERNAME: 'resend',
    EMAIL_PASSWORD: 'REDACTED_SECRET',
    EMAIL_SECURE: 'true',
    EMAIL_PORT: '465',
    EMAIL_FROM_ADDRESS: 'redacted@example.invalid',
    CASEPAY_API_KEY: 'REDACTED_SECRET',
    CASEPAY_CONNECTION_ID: 'CasepayConnectionValue1234567890',
    CASEPAY_WEBHOOK_SECRET: 'REDACTED_SECRET',
    BILLING_LIFECYCLE_JOB_ENABLED: 'false',
    BILLING_LIFECYCLE_JOB_DRY_RUN: 'true',
    BILLING_LIFECYCLE_JOB_INTERVAL_HOURS: '24',
    BILLING_LIFECYCLE_JOB_START_DELAY_SECONDS: '300',
    BILLING_LIFECYCLE_BATCH_LIMIT: '100',
    BILLING_GRACE_DAYS: '3',
    BILLING_SUSPEND_AFTER_DAYS: '7',
    BILLING_DOWNGRADE_AFTER_DAYS: '30',
    BILLING_DUNNING_NOTICE_INTERVAL_HOURS: '24',
    BILLING_EXPIRING_NOTICE_DAYS: '3',
    BILLING_LIFECYCLE_EMAIL_ENABLED: 'true',
    MONGO_BACKUP_R2_ENDPOINT: 'https://accountid.r2.cloudflarestorage.com',
    MONGO_BACKUP_R2_BUCKET: 'chatcase-backups',
    MONGO_BACKUP_R2_ACCESS_KEY_ID: 'BackupAccessKeyIdValue1234567890',
    MONGO_BACKUP_R2_SECRET_ACCESS_KEY: 'BackupSecretAccessKeyValue1234567890',
    MONGO_BACKUP_R2_REGION: 'auto',
    MONGO_BACKUP_R2_PREFIX: 'backups/mongo',
    MONGO_BACKUP_R2_RETENTION_DAILY: '7',
    MONGO_BACKUP_R2_RETENTION_WEEKLY: '4',
    MONGO_BACKUP_R2_RETENTION_MONTHLY: '6',
    PRIVACY_RETENTION_BATCH_LIMIT: '500',
    PRIVACY_RETENTION_ATTACHMENT_BATCH_LIMIT: '500',
    PRIVACY_RETENTION_DELETE_ATTACHMENTS: 'true',
    PRIVACY_RETENTION_JOB_ENABLED: 'false',
    PRIVACY_RETENTION_JOB_DRY_RUN: 'true',
    PRIVACY_RETENTION_JOB_INTERVAL_HOURS: '24',
    PRIVACY_RETENTION_JOB_START_DELAY_SECONDS: '300',
    BACKUP_ALERT_WEBHOOK_URL: '',
    BACKUP_ALERT_ON_SUCCESS: 'false',
    SKIP_RESTORE_CHECK: 'false',
  };

  return Object.assign(env, overrides);
}

function writeTempEnv(env) {
  const file = path.join(os.tmpdir(), `chatcase-hardening-${process.pid}-${Date.now()}.env`);
  const body = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.writeFileSync(file, `${body}\n`);
  return file;
}

function runChecker(env) {
  const file = writeTempEnv(env);
  try {
    return spawnSync(process.execPath, [path.join(root, 'scripts', 'check-production-env.js'), file], {
      cwd: root,
      encoding: 'utf8',
    });
  } finally {
    fs.unlinkSync(file);
  }
}

function testProxySecurityHeadersAndRateLimit() {
  const proxy = read('proxy-nginx.conf');

  assert.match(proxy, /limit_req_status\s+429;/);
  assert.match(proxy, /limit_req_zone\s+\$binary_remote_addr\s+zone=chatcase_api_per_ip:10m\s+rate=10r\/s;/);
  assert.match(proxy, /limit_req_zone\s+\$binary_remote_addr\s+zone=chatcase_chatapi_per_ip:10m\s+rate=20r\/s;/);
  assert.match(proxy, /add_header\s+X-Content-Type-Options\s+"nosniff"\s+always;/);
  assert.match(proxy, /add_header\s+Referrer-Policy\s+"strict-origin-when-cross-origin"\s+always;/);
  assert.match(proxy, /add_header\s+Permissions-Policy\s+/);
  assert.match(proxy, /add_header\s+Strict-Transport-Security\s+\$chatcase_hsts_header\s+always;/);
  assert.match(proxy, /add_header\s+Content-Security-Policy\s+\$chatcase_app_csp\s+always;/);
  assert.match(proxy, /script-src[^;"]*https:\/\/client\.sleekplan\.com/);
  assert.match(proxy, /frame-src[^;"]*https:\/\/sleekplan\.com[^;"]*https:\/\/\*\.sleekplan\.com/);
  assert.match(proxy, /add_header\s+X-Frame-Options\s+"SAMEORIGIN"\s+always;/);

  const api = extractBlock(proxy, 'location /api/');
  const chatapi = extractBlock(proxy, 'location /chatapi/');
  const widget = extractBlock(proxy, 'location /widget/');
  assert.match(api, /limit_req\s+zone=chatcase_api_per_ip\s+burst=40\s+nodelay;/);
  assert.match(chatapi, /limit_req\s+zone=chatcase_chatapi_per_ip\s+burst=80\s+nodelay;/);
  assert.doesNotMatch(widget, /X-Frame-Options|frame-ancestors/);
}

function testProductionOverrideClosesInternalPorts() {
  const compose = read('docker-compose.prod.yml');
  [
    'dashboard',
    'cds',
    'webwidget',
    'ionic',
    'server',
    'incident-automation',
    'chat21httpserver',
    'backend-llm-train',
    'backend-llm-qa',
    'qdrant',
    'rabbitmq',
    'mongo',
    'redis',
  ].forEach((service) => {
    const block = extractYamlService(compose, service);
    assert.match(block, /ports:\s+!reset\s+\[\]/, `${service} must reset inherited ports in production`);
  });
}

function testIonicPatchRemovesExternalGoogleFonts() {
  const script = read('ionic-rebrand.sh');
  assert.match(script, /fonts\\\.googleapis\\\.com|fonts\.googleapis\.com/);
  assert.match(script, /fonts\\\.gstatic\\\.com|fonts\.gstatic\.com/);
  assert.match(script, /find \/usr\/share\/nginx\/html/);
}

function testCheckerRequiresFinalSecrets() {
  const valid = runChecker(baseProductionEnv());
  assert.strictEqual(valid.status, 0, valid.stdout + valid.stderr);

  const weak = runChecker(baseProductionEnv({
    SESSION_SECRET: '',
    CHAT21_ADMIN_TOKEN: '',
    PUSH_WH_CHAT21_API_ADMIN_TOKEN: '',
    PUSH_WH_WEBHOOK_TOKEN: '',
  }));
  assert.notStrictEqual(weak.status, 0, 'checker must reject missing final session/chat tokens');
  assert.match(weak.stdout, /SESSION_SECRET/);
  assert.match(weak.stdout, /CHAT21_ADMIN_TOKEN/);
  assert.match(weak.stdout, /PUSH_WH_CHAT21_API_ADMIN_TOKEN/);
  assert.match(weak.stdout, /PUSH_WH_WEBHOOK_TOKEN/);

  const shared = runChecker(baseProductionEnv({
    GLOBAL_SECRET: 'REDACTED_SECRET',
    APPS_ACCESS_TOKEN_SECRET: 'REDACTED_SECRET',
  }));
  assert.notStrictEqual(shared.status, 0, 'checker must reject shared JWT secrets');
  assert.match(shared.stdout, /GLOBAL_SECRET must be different from CHAT21_JWT_SECRET/);

  const appsSecretMismatch = runChecker(baseProductionEnv({
    APPS_ACCESS_TOKEN_SECRET: 'REDACTED_SECRET',
  }));
  assert.notStrictEqual(appsSecretMismatch.status, 0, 'checker must reject apps secret mismatching the API JWT secret');
  assert.match(appsSecretMismatch.stdout, /APPS_ACCESS_TOKEN_SECRET must match GLOBAL_SECRET/);

  const sharedJwt = runChecker(baseProductionEnv({
    JWT_SECRET_KEY: 'Chat21JwtSecretValue1234567890',
  }));
  assert.notStrictEqual(sharedJwt.status, 0, 'checker must reject shared internal JWT secrets');
  assert.match(sharedJwt.stdout, /JWT_SECRET_KEY must be different from CHAT21_JWT_SECRET/);

  const rabbitJwtMismatch = runChecker(baseProductionEnv({
    RABBITMQ_JWT_SECRET: 'REDACTED_SECRET',
  }));
  assert.notStrictEqual(rabbitJwtMismatch.status, 0, 'checker must reject RabbitMQ JWT drift');
  assert.match(rabbitJwtMismatch.stdout, /RABBITMQ_JWT_SECRET must match CHAT21_JWT_SECRET/);

  const badBilling = runChecker(baseProductionEnv({
    BILLING_LIFECYCLE_JOB_ENABLED: 'maybe',
    BILLING_SUSPEND_AFTER_DAYS: '0',
  }));
  assert.notStrictEqual(badBilling.status, 0, 'checker must reject invalid billing lifecycle settings');
  assert.match(badBilling.stdout, /BILLING_LIFECYCLE_JOB_ENABLED/);
  assert.match(badBilling.stdout, /BILLING_SUSPEND_AFTER_DAYS/);

  const aiWithoutKey = runChecker(baseProductionEnv({
    AI_FEATURES_ENABLED: 'true',
    GPTKEY: '',
  }));
  assert.notStrictEqual(aiWithoutKey.status, 0, 'checker must require GPTKEY only when AI features are enabled');
  assert.match(aiWithoutKey.stdout, /AI_FEATURES_ENABLED=true requires GPTKEY/);

  const aiWithKey = runChecker(baseProductionEnv({
    AI_FEATURES_ENABLED: 'true',
    GPTKEY: 'OpenAiProviderKeyValue1234567890',
  }));
  assert.strictEqual(aiWithKey.status, 0, aiWithKey.stdout + aiWithKey.stderr);

  const badCommunityUrl = runChecker(baseProductionEnv({
    COMMUNITY_PUBLIC_URL: 'http://app.chatcase.com.br/templates',
  }));
  assert.notStrictEqual(badCommunityUrl.status, 0, 'checker must reject invalid public community URL');
  assert.match(badCommunityUrl.stdout, /COMMUNITY_PUBLIC_URL must use https/);
  assert.match(badCommunityUrl.stdout, /COMMUNITY_PUBLIC_URL must point to the public \/community\/ page/);
}

testProxySecurityHeadersAndRateLimit();
testProductionOverrideClosesInternalPorts();
testIonicPatchRemovesExternalGoogleFonts();
testCheckerRequiresFinalSecrets();

console.log('OK hardening config tests passed');
