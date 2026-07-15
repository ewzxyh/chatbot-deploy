#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const checker = path.join(root, 'scripts', 'check-chat21-runtime-env.js');

function writeTempFile(name, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatcase-runtime-env-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, body);
  return { dir, file };
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeFakeDocker(values) {
  const fake = writeTempFile('fake-docker.js', `
const values = JSON.parse(process.env.FAKE_CHATCASE_DOCKER_VALUES || '{}');
const args = process.argv.slice(2);
const execIndex = args.indexOf('exec');
const service = args[execIndex + 2];
const commandIndex = args.indexOf('-lc');
const command = commandIndex >= 0 ? args[commandIndex + 1] : '';
const match = command.match(/\\$\\{([A-Za-z0-9_]+)\\}/);
const key = match ? match[1] : '';
process.stdout.write((values[service] && values[service][key]) || '');
`);
  return {
    dir: fake.dir,
    file: fake.file,
    env: Object.assign({}, process.env, {
      FAKE_CHATCASE_DOCKER_VALUES: JSON.stringify(values),
    }),
  };
}

function makeEnvFile(chat21Secret, rabbitmqAdminUri, rabbitmqUri) {
  return writeTempFile(
    'runtime.env',
    `CHAT21_JWT_SECRET=${chat21Secret}\nRABBITMQ_ADMIN_URI=${rabbitmqAdminUri}\nRABBITMQ_URI=${rabbitmqUri}\n`
  );
}

function runChecker(values, envSecret, rabbitmqAdminUri, rabbitmqUri) {
  const fakeDocker = makeFakeDocker(values);
  const envFile = makeEnvFile(envSecret, rabbitmqAdminUri, rabbitmqUri);
  try {
    return spawnSync(process.execPath, [
      checker,
      '--env',
      envFile.file,
      '--docker',
      fakeDocker.file,
    ], {
      cwd: root,
      encoding: 'utf8',
      env: fakeDocker.env,
    });
  } finally {
    cleanup(fakeDocker.dir);
    cleanup(envFile.dir);
  }
}

const rabbitmqAdminUri = '[REDACTED_CREDENTIAL_URL]';
const rabbitmqUri = '[REDACTED_CREDENTIAL_URL]';

function testFailsWithoutLeakingSecretWhenJwtDiffers() {
  const result = runChecker({
    server: { CHAT21_JWT_SECRET: 'REDACTED_SECRET' },
    chat21httpserver: {
      JWT_KEY: 'wrong-secret-value-1234567890',
      RABBITMQ_URI: rabbitmqAdminUri,
    },
    chat21server: {
      RABBITMQ_URI: rabbitmqUri,
    },
  }, 'server-secret-value-1234567890', rabbitmqAdminUri, rabbitmqUri);

  const output = `${result.stdout}\n${result.stderr}`;
  assert.notStrictEqual(result.status, 0);
  assert.match(output, /CHAT21_JWT_SECRET must match chat21httpserver JWT_KEY/);
  assert.match(output, /sha256:/);
  assert.doesNotMatch(output, /server-secret-value-1234567890|wrong-secret-value-1234567890/);
}

function testPassesWithLeastPrivilegeRabbitMqCredentials() {
  const result = runChecker({
    server: { CHAT21_JWT_SECRET: 'REDACTED_SECRET' },
    chat21httpserver: {
      JWT_KEY: 'shared-secret-value-1234567890',
      RABBITMQ_URI: rabbitmqAdminUri,
    },
    chat21server: {
      RABBITMQ_URI: rabbitmqUri,
    },
  }, 'shared-secret-value-1234567890', rabbitmqAdminUri, rabbitmqUri);

  const output = `${result.stdout}\n${result.stderr}`;
  assert.strictEqual(result.status, 0, output);
  assert.match(result.stdout, /OK chat21 runtime env/);
}

function testFailsWhenRuntimeRabbitMqCredentialDoesNotMatchItsRole() {
  const result = runChecker({
    server: { CHAT21_JWT_SECRET: 'REDACTED_SECRET' },
    chat21httpserver: {
      JWT_KEY: 'shared-secret-value-1234567890',
      RABBITMQ_URI: rabbitmqUri,
    },
    chat21server: {
      RABBITMQ_URI: rabbitmqUri,
    },
  }, 'shared-secret-value-1234567890', rabbitmqAdminUri, rabbitmqUri);

  const output = `${result.stdout}\n${result.stderr}`;
  assert.notStrictEqual(result.status, 0);
  assert.match(output, /chat21httpserver RABBITMQ_URI must match env file RABBITMQ_ADMIN_URI/);
  assert.doesNotMatch(output, /admin-token|observer-token/);
}

testFailsWithoutLeakingSecretWhenJwtDiffers();
testPassesWithLeastPrivilegeRabbitMqCredentials();
testFailsWhenRuntimeRabbitMqCredentialDoesNotMatchItsRole();
console.log('OK test-chat21-runtime-env');
