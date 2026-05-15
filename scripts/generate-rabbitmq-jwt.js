#!/usr/bin/env node

const crypto = require('crypto');

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: 'tiledesk-key',
  };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function payloadFor(subject, role, days) {
  const now = Math.floor(Date.now() / 1000);
  return {
    jti: crypto.randomUUID(),
    sub: subject,
    scope: [
      'rabbitmq.read:*/*/*',
      'rabbitmq.write:*/*/*',
      'rabbitmq.configure:*/*/*',
    ],
    client_id: subject,
    cid: subject,
    azp: subject,
    user_id: subject,
    app_id: 'tilechat',
    iat: now,
    exp: now + days * 24 * 60 * 60,
    aud: ['rabbitmq', subject],
    kid: 'tiledesk-key',
    tiledesk_api_roles: role,
  };
}

function amqpUrl(token, host) {
  return `[REDACTED_CREDENTIAL_URL]
}

const secret = process.argv[2] || process.env.CHAT21_JWT_SECRET || process.env.RABBITMQ_JWT_SECRET || 'tokenKey';
const host = process.argv[3] || process.env.RABBITMQ_HOST || 'rabbitmq';
const days = Number(process.env.RABBITMQ_TOKEN_DAYS || 3650);

const userToken = signJwt(payloadFor('01-OBSERVER', 'user', days), secret);
const adminToken = signJwt(payloadFor('100-APIADMIN', 'admin', days), secret);

console.log(`# Generated with host=${host} and expirationDays=${days}`);
console.log(`AMQP_MANAGER_URL=${amqpUrl(userToken, host)}`);
console.log(`RABBITMQ_URI=${amqpUrl(userToken, host)}`);
console.log(`RABBITMQ_ADMIN_URI=${amqpUrl(adminToken, host)}`);
