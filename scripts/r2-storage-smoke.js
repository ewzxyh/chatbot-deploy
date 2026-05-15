#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');

function trimSlashes(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '');
}

function encodePath(value) {
  return String(value || '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data || '').digest('hex');
}

function hmac(key, data, encoding) {
  return crypto.createHmac('sha256', key).update(data).digest(encoding);
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function readEnvFile(envPath) {
  if (!envPath || !fs.existsSync(envPath)) {
    return;
  }

  readTextFile(envPath).split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      return;
    }

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

function endpointFromAccountId(accountId) {
  return accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined;
}

function getConfig() {
  const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  return {
    endpoint: process.env.R2_ENDPOINT || process.env.CLOUDFLARE_R2_ENDPOINT || endpointFromAccountId(accountId),
    bucket: process.env.R2_BUCKET || process.env.CLOUDFLARE_R2_BUCKET,
    accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    region: process.env.R2_REGION || process.env.CLOUDFLARE_R2_REGION || 'auto',
    keyPrefix: trimSlashes(process.env.R2_KEY_PREFIX || process.env.CLOUDFLARE_R2_KEY_PREFIX || ''),
    driver: process.env.FILE_STORAGE_DRIVER || process.env.FILE_STORAGE_PROVIDER || process.env.STORAGE_DRIVER,
  };
}

function isPlaceholder(value) {
  return !value
    || /^CHANGE_ME/i.test(value)
    || /<[^>]+>/.test(value)
    || value.includes('example.com');
}

function missingConfig(config) {
  const missing = [];
  if (isPlaceholder(config.endpoint)) missing.push('R2_ENDPOINT or R2_ACCOUNT_ID');
  if (isPlaceholder(config.bucket)) missing.push('R2_BUCKET');
  if (isPlaceholder(config.accessKeyId)) missing.push('R2_ACCESS_KEY_ID');
  if (isPlaceholder(config.secretAccessKey)) missing.push('R2_SECRET_ACCESS_KEY');
  return missing;
}

function requireConfig(config) {
  const missing = missingConfig(config);
  if (missing.length) {
    throw new Error(`Missing R2 upload configuration: ${missing.join(', ')}`);
  }
}

class R2StorageSmokeClient {
  constructor(config) {
    this.config = config;
  }

  async request(method, key, options = {}) {
    const endpoint = new URL(this.config.endpoint);
    const body = options.body || Buffer.alloc(0);
    const encodedKey = encodePath(key);
    const bucketPath = `/${encodeURIComponent(this.config.bucket)}/${encodedKey}`;
    const basePath = trimSlashes(endpoint.pathname);
    const pathname = `${basePath ? `/${basePath}` : ''}${bucketPath}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(body);
    const headers = {
      host: endpoint.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };

    if (method === 'PUT') {
      headers['content-length'] = String(body.length);
    }
    if (options.contentType) {
      headers['content-type'] = options.contentType;
    }

    headers.authorization = this.authorizationHeader(method, pathname, headers, payloadHash, amzDate, dateStamp);

    return new Promise((resolve, reject) => {
      const req = https.request({
        method,
        protocol: endpoint.protocol,
        hostname: endpoint.hostname,
        port: endpoint.port,
        path: pathname,
        headers,
      }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('error', reject);
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks);
          if (res.statusCode >= 300) {
            reject(new Error(`R2 ${method} failed for ${key}: ${res.statusCode} ${responseBody.toString()}`));
            return;
          }
          resolve({ statusCode: res.statusCode, headers: res.headers, body: responseBody });
        });
      });

      req.on('error', reject);
      if (method === 'PUT') {
        req.write(body);
      }
      req.end();
    });
  }

  authorizationHeader(method, canonicalUri, headers, payloadHash, amzDate, dateStamp) {
    const signedHeaderNames = Object.keys(headers).map((name) => name.toLowerCase()).sort();
    const canonicalHeaders = signedHeaderNames
      .map((name) => `${name}:${String(headers[name]).trim().replace(/\s+/g, ' ')}\n`)
      .join('');
    const signedHeaders = signedHeaderNames.join(';');
    const canonicalRequest = [
      method,
      canonicalUri,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');

    const kDate = hmac(`AWS4${this.config.secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, this.config.region);
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = hmac(kSigning, stringToSign, 'hex');

    return `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  putObject(key, body) {
    return this.request('PUT', key, { body, contentType: 'text/plain' });
  }

  getObject(key) {
    return this.request('GET', key);
  }

  deleteObject(key) {
    return this.request('DELETE', key);
  }
}

function smokeKey(config) {
  const random = crypto.randomBytes(8).toString('hex');
  const key = `healthchecks/storage-smoke-${Date.now()}-${random}.txt`;
  return config.keyPrefix ? `${config.keyPrefix}/${key}` : key;
}

async function runSmoke(config, args) {
  requireConfig(config);

  const key = args.key || smokeKey(config);
  const payload = Buffer.from(`chatcase-r2-storage-smoke:${new Date().toISOString()}\n`);

  if (args['dry-run']) {
    console.log(JSON.stringify({
      ok: true,
      dryRun: true,
      bucket: config.bucket,
      key,
      region: config.region,
      endpointHost: new URL(config.endpoint).host,
      driver: config.driver || null,
    }, null, 2));
    return;
  }

  const client = new R2StorageSmokeClient(config);
  let uploaded = false;

  try {
    await client.putObject(key, payload);
    uploaded = true;

    const downloaded = await client.getObject(key);
    if (!downloaded.body.equals(payload)) {
      throw new Error('R2 smoke read verification failed');
    }

    await client.deleteObject(key);
    uploaded = false;

    console.log(JSON.stringify({
      ok: true,
      bucket: config.bucket,
      key,
      bytes: payload.length,
      endpointHost: new URL(config.endpoint).host,
      keyPrefix: config.keyPrefix || null,
    }, null, 2));
  } catch (error) {
    if (uploaded) {
      try {
        await client.deleteObject(key);
      } catch (cleanupError) {
        console.error(`cleanup failed for r2://${config.bucket}/${key}: ${cleanupError.message}`);
      }
    }
    throw error;
  }
}

function printConfig(config) {
  const missing = missingConfig(config);
  console.log(JSON.stringify({
    configured: missing.length === 0,
    missing,
    endpoint: config.endpoint ? '<set>' : undefined,
    bucket: config.bucket || undefined,
    keyPrefix: config.keyPrefix || undefined,
    region: config.region,
    driver: config.driver || undefined,
  }, null, 2));
  if (missing.length) {
    process.exitCode = 2;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envPath = args.env
    ? path.resolve(process.cwd(), args.env)
    : path.resolve(process.cwd(), '.env');

  readEnvFile(envPath);

  const command = args._[0] || 'smoke';
  const config = getConfig();

  if (command === 'check-config') {
    printConfig(config);
    return;
  }

  if (command === 'smoke') {
    await runSmoke(config, args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
