#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    composeFiles: [],
    docker: 'docker',
    env: path.join(root, '.env.production'),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--env') {
      args.env = argv[index + 1];
      index += 1;
    } else if (arg === '--docker') {
      args.docker = argv[index + 1];
      index += 1;
    } else if (arg === '-f' || arg === '--compose-file') {
      args.composeFiles.push(argv[index + 1]);
      index += 1;
    }
  }

  return args;
}

function readEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return {};
  }

  const env = {};
  const body = fs.readFileSync(filePath, 'utf8');
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function safeDescribe(value) {
  if (!value) {
    return 'missing';
  }

  const digest = crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
  return `len=${value.length}, sha256:${digest}`;
}

function dockerComposeArgs(config, commandArgs) {
  const args = ['compose'];
  if (config.env) {
    args.push('--env-file', config.env);
  }
  for (const file of config.composeFiles) {
    args.push('-f', file);
  }
  return args.concat(commandArgs);
}

function runCommand(command, args, options) {
  const executable = command.endsWith('.js') ? process.execPath : command;
  const finalArgs = command.endsWith('.js') ? [command].concat(args) : args;
  return spawnSync(executable, finalArgs, {
    cwd: root,
    encoding: 'utf8',
    ...options,
  });
}

function readRuntimeEnv(config, service, key) {
  const result = runCommand(config.docker, dockerComposeArgs(config, [
    'exec',
    '-T',
    service,
    'sh',
    '-lc',
    `printf "%s" "\${${key}}"`,
  ]));

  if (result.status !== 0) {
    throw new Error(`Failed to read ${service}.${key}: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }

  return result.stdout.trim();
}

function addMismatch(errors, message, left, right) {
  errors.push(`${message} (${safeDescribe(left)} vs ${safeDescribe(right)})`);
}

function validate(config) {
  const env = readEnvFile(config.env);
  const runtime = {
    serverChat21JwtSecret: readRuntimeEnv(config, 'server', 'CHAT21_JWT_SECRET'),
    chat21HttpJwtKey: readRuntimeEnv(config, 'chat21httpserver', 'JWT_KEY'),
    chat21HttpRabbitUri: readRuntimeEnv(config, 'chat21httpserver', 'RABBITMQ_URI'),
    chat21ServerRabbitUri: readRuntimeEnv(config, 'chat21server', 'RABBITMQ_URI'),
  };

  const errors = [];
  if (!runtime.serverChat21JwtSecret) {
    errors.push('server CHAT21_JWT_SECRET is missing');
  }
  if (!runtime.chat21HttpJwtKey) {
    errors.push('chat21httpserver JWT_KEY is missing');
  }
  if (!runtime.chat21HttpRabbitUri) {
    errors.push('chat21httpserver RABBITMQ_URI is missing');
  }
  if (!runtime.chat21ServerRabbitUri) {
    errors.push('chat21server RABBITMQ_URI is missing');
  }

  if (runtime.serverChat21JwtSecret !== runtime.chat21HttpJwtKey) {
    addMismatch(
      errors,
      'CHAT21_JWT_SECRET must match chat21httpserver JWT_KEY',
      runtime.serverChat21JwtSecret,
      runtime.chat21HttpJwtKey
    );
  }

  if (env.CHAT21_JWT_SECRET && runtime.serverChat21JwtSecret !== env.CHAT21_JWT_SECRET) {
    addMismatch(
      errors,
      'server CHAT21_JWT_SECRET must match env file CHAT21_JWT_SECRET',
      runtime.serverChat21JwtSecret,
      env.CHAT21_JWT_SECRET
    );
  }

  if (env.CHAT21_JWT_SECRET && runtime.chat21HttpJwtKey !== env.CHAT21_JWT_SECRET) {
    addMismatch(
      errors,
      'chat21httpserver JWT_KEY must match env file CHAT21_JWT_SECRET',
      runtime.chat21HttpJwtKey,
      env.CHAT21_JWT_SECRET
    );
  }

  if (runtime.chat21HttpRabbitUri !== runtime.chat21ServerRabbitUri) {
    addMismatch(
      errors,
      'chat21httpserver RABBITMQ_URI must match chat21server RABBITMQ_URI',
      runtime.chat21HttpRabbitUri,
      runtime.chat21ServerRabbitUri
    );
  }

  return { errors, runtime };
}

function main() {
  const config = parseArgs(process.argv.slice(2));
  try {
    const { errors, runtime } = validate(config);
    if (errors.length > 0) {
      console.error('FAIL chat21 runtime env');
      for (const error of errors) {
        console.error(`- ${error}`);
      }
      process.exit(1);
    }

    console.log('OK chat21 runtime env');
    console.log(`- server CHAT21_JWT_SECRET: ${safeDescribe(runtime.serverChat21JwtSecret)}`);
    console.log(`- chat21httpserver JWT_KEY: ${safeDescribe(runtime.chat21HttpJwtKey)}`);
    console.log(`- chat21 RABBITMQ_URI: ${safeDescribe(runtime.chat21HttpRabbitUri)}`);
  } catch (error) {
    console.error('FAIL chat21 runtime env');
    console.error(`- ${error.message}`);
    process.exit(1);
  }
}

main();
