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

function encodeQuery(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data || '').digest('hex');
}

function hmac(key, data, encoding) {
  return crypto.createHmac('sha256', key).update(data).digest(encoding);
}

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = readTextFile(envPath).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function readJsonFile(filePath) {
  return JSON.parse(readTextFile(filePath));
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
  const keyPrefix = trimSlashes(process.env.MONGO_BACKUP_R2_PREFIX
    || process.env.R2_BACKUP_PREFIX
    || 'backups/mongo');

  const accountId = process.env.MONGO_BACKUP_R2_ACCOUNT_ID
    || process.env.R2_BACKUP_ACCOUNT_ID
    || process.env.R2_ACCOUNT_ID
    || process.env.CLOUDFLARE_R2_ACCOUNT_ID;

  return {
    endpoint: process.env.MONGO_BACKUP_R2_ENDPOINT
      || process.env.R2_BACKUP_ENDPOINT
      || process.env.R2_ENDPOINT
      || process.env.CLOUDFLARE_R2_ENDPOINT
      || endpointFromAccountId(accountId),
    bucket: process.env.MONGO_BACKUP_R2_BUCKET || process.env.R2_BACKUP_BUCKET || process.env.R2_BUCKET || process.env.CLOUDFLARE_R2_BUCKET,
    accessKeyId: process.env.MONGO_BACKUP_R2_ACCESS_KEY_ID
      || process.env.R2_BACKUP_ACCESS_KEY_ID
      || process.env.R2_ACCESS_KEY_ID
      || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.MONGO_BACKUP_R2_SECRET_ACCESS_KEY
      || process.env.R2_BACKUP_SECRET_ACCESS_KEY
      || process.env.R2_SECRET_ACCESS_KEY
      || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    region: process.env.MONGO_BACKUP_R2_REGION || process.env.R2_BACKUP_REGION || process.env.R2_REGION || process.env.CLOUDFLARE_R2_REGION || 'auto',
    prefix: keyPrefix || 'backups/mongo',
    retention: {
      daily: Number(process.env.MONGO_BACKUP_R2_RETENTION_DAILY || 7),
      weekly: Number(process.env.MONGO_BACKUP_R2_RETENTION_WEEKLY || 4),
      monthly: Number(process.env.MONGO_BACKUP_R2_RETENTION_MONTHLY || 6),
    },
  };
}

function missingConfig(config) {
  const missing = [];
  if (!config.endpoint) missing.push('MONGO_BACKUP_R2_ENDPOINT or MONGO_BACKUP_R2_ACCOUNT_ID');
  if (!config.bucket) missing.push('MONGO_BACKUP_R2_BUCKET');
  if (!config.accessKeyId) missing.push('MONGO_BACKUP_R2_ACCESS_KEY_ID');
  if (!config.secretAccessKey) missing.push('MONGO_BACKUP_R2_SECRET_ACCESS_KEY');
  return missing;
}

function requireConfig(config) {
  const missing = missingConfig(config);
  if (missing.length > 0) {
    throw new Error(`Missing R2 backup configuration: ${missing.join(', ')}`);
  }
}

function canonicalQuery(query) {
  return Object.keys(query || {})
    .filter((key) => query[key] !== undefined && query[key] !== null)
    .sort()
    .map((key) => `${encodeQuery(key)}=${encodeQuery(query[key])}`)
    .join('&');
}

class R2BackupClient {
  constructor(config) {
    this.config = config;
  }

  async request(method, key, options = {}) {
    const endpoint = new URL(this.config.endpoint);
    const body = options.body || Buffer.alloc(0);
    const encodedKey = key ? `/${encodePath(key)}` : '';
    const bucketPath = `/${encodeURIComponent(this.config.bucket)}${encodedKey}`;
    const basePath = trimSlashes(endpoint.pathname);
    const pathname = `${basePath ? `/${basePath}` : ''}${bucketPath}`;
    const queryString = canonicalQuery(options.query || {});
    const requestPath = queryString ? `${pathname}?${queryString}` : pathname;

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

    headers.authorization = this.authorizationHeader(method, pathname, queryString, headers, payloadHash, amzDate, dateStamp);

    return new Promise((resolve, reject) => {
      const req = https.request({
        method,
        protocol: endpoint.protocol,
        hostname: endpoint.hostname,
        port: endpoint.port,
        path: requestPath,
        headers,
      }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('error', reject);
        res.on('end', () => {
          const responseBody = Buffer.concat(chunks);
          if (res.statusCode >= 300) {
            reject(new Error(`R2 ${method} failed for ${key || this.config.bucket}: ${res.statusCode} ${responseBody.toString()}`));
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

  authorizationHeader(method, canonicalUri, queryString, headers, payloadHash, amzDate, dateStamp) {
    const signedHeaderNames = Object.keys(headers).map((name) => name.toLowerCase()).sort();
    const canonicalHeaders = signedHeaderNames
      .map((name) => `${name}:${String(headers[name]).trim().replace(/\s+/g, ' ')}\n`)
      .join('');
    const signedHeaders = signedHeaderNames.join(';');
    const canonicalRequest = [
      method,
      canonicalUri,
      queryString || '',
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

  async putObject(key, filePath, contentType) {
    const body = fs.readFileSync(filePath);
    await this.request('PUT', key, { body, contentType });
    return body.length;
  }

  async headObject(key) {
    const response = await this.request('HEAD', key);
    return {
      size: Number(response.headers['content-length'] || 0),
      contentType: response.headers['content-type'],
    };
  }

  async getObject(key) {
    return this.request('GET', key);
  }

  async deleteObject(key) {
    await this.request('DELETE', key);
  }

  async listObjects(prefix) {
    const objects = [];
    let continuationToken;
    do {
      const query = {
        'list-type': '2',
        prefix,
        'max-keys': '1000',
      };
      if (continuationToken) {
        query['continuation-token'] = continuationToken;
      }

      const response = await this.request('GET', '', { query });
      const parsed = parseListObjectsXml(response.body.toString('utf8'));
      objects.push(...parsed.objects);
      continuationToken = parsed.nextContinuationToken;
    } while (continuationToken);

    return objects;
  }
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function xmlValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? decodeXml(match[1]) : undefined;
}

function parseListObjectsXml(xml) {
  const objects = [];
  const contentMatches = xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g);
  for (const match of contentMatches) {
    const content = match[1];
    objects.push({
      key: xmlValue(content, 'Key'),
      lastModified: xmlValue(content, 'LastModified'),
      size: Number(xmlValue(content, 'Size') || 0),
    });
  }

  return {
    objects,
    nextContinuationToken: xmlValue(xml, 'NextContinuationToken'),
  };
}

function findLatestBackupSet(backupDir) {
  if (!fs.existsSync(backupDir)) {
    throw new Error(`Backup directory not found: ${backupDir}`);
  }

  const candidates = [];
  for (const entry of fs.readdirSync(backupDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const manifestPath = path.join(backupDir, entry.name, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      candidates.push({ dir: path.join(backupDir, entry.name), mtime: fs.statSync(manifestPath).mtimeMs });
    }
  }

  candidates.sort((a, b) => b.mtime - a.mtime);
  if (!candidates.length) {
    throw new Error(`No backup manifest found under: ${backupDir}`);
  }
  return candidates[0].dir;
}

function contentTypeFor(file) {
  if (file.endsWith('.json')) {
    return 'application/json';
  }
  if (file.endsWith('.gz')) {
    return 'application/gzip';
  }
  return 'application/octet-stream';
}

function loadBackupSet(args) {
  const scriptRoot = __dirname;
  const backupRoot = path.resolve(process.env.MONGO_BACKUP_DIR || path.join(scriptRoot, '..', 'backups', 'mongo'));
  const backupSet = args['backup-set'] ? path.resolve(args['backup-set']) : findLatestBackupSet(backupRoot);
  const manifestPath = fs.statSync(backupSet).isDirectory() ? path.join(backupSet, 'manifest.json') : backupSet;
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const dir = path.dirname(manifestPath);
  const manifest = readJsonFile(manifestPath);
  const setId = path.basename(dir);
  return { dir, manifest, manifestPath, setId };
}

function filesForBackupSet(backupSet) {
  const files = [];
  for (const db of backupSet.manifest.databases || []) {
    const archivePath = path.join(backupSet.dir, db.archive);
    if (!fs.existsSync(archivePath)) {
      throw new Error(`Archive not found: ${archivePath}`);
    }
    files.push({ name: db.archive, path: archivePath });
  }
  files.push({ name: 'manifest.json', path: backupSet.manifestPath });
  return files;
}

async function uploadBackupSet(config, args) {
  const backupSet = loadBackupSet(args);
  const files = filesForBackupSet(backupSet);
  const dryRun = Boolean(args['dry-run']);
  const prefix = trimSlashes(config.prefix);
  const client = dryRun ? null : new R2BackupClient(config);

  console.log(`Backup set: ${backupSet.dir}`);
  console.log(`R2 prefix: ${prefix}/${backupSet.setId}`);

  if (!dryRun) {
    requireConfig(config);
  }

  for (const file of files) {
    const key = `${prefix}/${backupSet.setId}/${file.name}`;
    const size = fs.statSync(file.path).size;
    if (dryRun) {
      console.log(`[dry-run] upload ${file.path} -> r2://${config.bucket || '<bucket>'}/${key} (${size} bytes)`);
      continue;
    }

    await client.putObject(key, file.path, contentTypeFor(file.name));
    const remote = await client.headObject(key);
    if (remote.size !== size) {
      throw new Error(`Uploaded size mismatch for ${key}: local=${size} remote=${remote.size}`);
    }
    console.log(`uploaded r2://${config.bucket}/${key} (${size} bytes)`);
  }

  console.log('R2 backup upload completed.');
}

function parseSetDate(setId) {
  const match = String(setId || '').match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return undefined;
  }

  return new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  ));
}

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function retentionPlan(sets, retention) {
  const sorted = sets
    .map((set) => ({ ...set, date: parseSetDate(set.id) }))
    .filter((set) => set.date)
    .sort((a, b) => b.date - a.date);

  const keep = new Set();
  const addByBucket = (limit, keyFor) => {
    const seen = new Set();
    for (const set of sorted) {
      const key = keyFor(set.date);
      if (seen.has(key)) {
        continue;
      }
      if (seen.size >= limit) {
        break;
      }
      seen.add(key);
      keep.add(set.id);
    }
  };

  if (sorted[0]) {
    keep.add(sorted[0].id);
  }
  addByBucket(retention.daily, (date) => date.toISOString().slice(0, 10));
  addByBucket(retention.weekly, isoWeekKey);
  addByBucket(retention.monthly, (date) => date.toISOString().slice(0, 7));

  return {
    keep: sorted.filter((set) => keep.has(set.id)),
    remove: sorted.filter((set) => !keep.has(set.id)),
  };
}

function groupObjectsBySet(objects, prefix) {
  const normalizedPrefix = `${trimSlashes(prefix)}/`;
  const groups = new Map();
  for (const object of objects) {
    if (!object.key || !object.key.startsWith(normalizedPrefix)) {
      continue;
    }

    const rest = object.key.slice(normalizedPrefix.length);
    const setId = rest.split('/')[0];
    if (!setId) {
      continue;
    }

    if (!groups.has(setId)) {
      groups.set(setId, { id: setId, keys: [] });
    }
    groups.get(setId).keys.push(object.key);
  }
  return Array.from(groups.values());
}

function latestRemoteSet(sets) {
  const sorted = sets
    .map((set) => ({ ...set, date: parseSetDate(set.id) }))
    .filter((set) => set.date)
    .sort((a, b) => b.date - a.date);

  if (!sorted.length) {
    throw new Error('No timestamped R2 backup sets found.');
  }
  return sorted[0];
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

async function resolveRemoteSetId(client, prefix, args) {
  if (args['set-id'] && args['set-id'] !== 'latest') {
    return args['set-id'];
  }

  const objects = await client.listObjects(`${prefix}/`);
  const sets = groupObjectsBySet(objects, prefix);
  return latestRemoteSet(sets).id;
}

async function downloadBackupSet(config, args) {
  requireConfig(config);

  const client = new R2BackupClient(config);
  const prefix = trimSlashes(config.prefix);
  const setId = await resolveRemoteSetId(client, prefix, args);
  const outputRoot = path.resolve(args['output-dir']
    || process.env.MONGO_R2_DOWNLOAD_DIR
    || path.join(__dirname, '..', 'backups', 'mongo-r2-download-test'));
  const outputDir = path.join(outputRoot, setId);

  fs.mkdirSync(outputDir, { recursive: true });

  const manifestKey = `${prefix}/${setId}/manifest.json`;
  const manifestPath = path.join(outputDir, 'manifest.json');
  const manifestResponse = await client.getObject(manifestKey);
  fs.writeFileSync(manifestPath, manifestResponse.body);
  const manifest = readJsonFile(manifestPath);

  console.log(`R2 backup set: r2://${config.bucket}/${prefix}/${setId}`);
  console.log(`Download directory: ${outputDir}`);
  console.log(`downloaded ${manifestKey} -> ${manifestPath} (${manifestResponse.body.length} bytes)`);

  for (const db of manifest.databases || []) {
    const archiveName = String(db.archive || '');
    if (!archiveName) {
      throw new Error(`Invalid manifest entry without archive: ${JSON.stringify(db)}`);
    }

    const key = `${prefix}/${setId}/${archiveName}`;
    const archivePath = path.join(outputDir, archiveName);
    const response = await client.getObject(key);
    fs.writeFileSync(archivePath, response.body);

    const expectedBytes = Number(db.bytes || 0);
    const actualBytes = fs.statSync(archivePath).size;
    if (expectedBytes && actualBytes !== expectedBytes) {
      throw new Error(`Downloaded size mismatch for ${archiveName}: expected=${expectedBytes} actual=${actualBytes}`);
    }

    if (db.sha256) {
      const actualSha = sha256File(archivePath);
      if (actualSha !== db.sha256) {
        throw new Error(`Downloaded sha256 mismatch for ${archiveName}: expected=${db.sha256} actual=${actualSha}`);
      }
    }

    console.log(`downloaded ${key} -> ${archivePath} (${actualBytes} bytes)`);
  }

  console.log('R2 backup download completed.');
}

async function applyRetention(config, args) {
  requireConfig(config);
  const client = new R2BackupClient(config);
  const prefix = trimSlashes(config.prefix);
  const dryRun = Boolean(args['dry-run']);
  const objects = await client.listObjects(`${prefix}/`);
  const sets = groupObjectsBySet(objects, prefix);
  const plan = retentionPlan(sets, config.retention);

  console.log(`R2 backup sets found: ${sets.length}`);
  console.log(`Keeping ${plan.keep.length} sets, removing ${plan.remove.length} sets.`);

  for (const set of plan.remove) {
    for (const key of set.keys) {
      if (dryRun) {
        console.log(`[dry-run] delete r2://${config.bucket}/${key}`);
      } else {
        await client.deleteObject(key);
        console.log(`deleted r2://${config.bucket}/${key}`);
      }
    }
  }
}

function printConfig(config) {
  const missing = missingConfig(config);
  console.log(JSON.stringify({
    configured: missing.length === 0,
    missing,
    endpoint: config.endpoint ? '<set>' : undefined,
    bucket: config.bucket || undefined,
    prefix: config.prefix,
    region: config.region,
    retention: config.retention,
  }, null, 2));
  if (missing.length > 0) {
    process.exitCode = 2;
  }
}

function selfTest() {
  const sets = [
    '20260513-133500',
    '20260512-133500',
    '20260511-133500',
    '20260501-133500',
    '20260420-133500',
    '20260401-133500',
    '20260301-133500',
  ].map((id) => ({ id, keys: [`backups/mongo/${id}/manifest.json`] }));
  const plan = retentionPlan(sets, { daily: 2, weekly: 2, monthly: 2 });
  if (!plan.keep.find((set) => set.id === '20260513-133500')) {
    throw new Error('self-test failed: latest backup was not retained');
  }
  if (plan.keep.length === 0 || plan.remove.length === 0) {
    throw new Error('self-test failed: retention plan did not split keep/remove');
  }
  console.log('self-test-ok');
}

async function main() {
  readEnvFile(path.resolve(process.cwd(), '.env'));
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0] || 'upload';
  const config = getConfig();

  if (command === 'check-config') {
    printConfig(config);
    return;
  }
  if (command === 'self-test') {
    selfTest();
    return;
  }
  if (command === 'upload') {
    await uploadBackupSet(config, args);
    if (args.retention) {
      await applyRetention(config, args);
    }
    return;
  }
  if (command === 'download') {
    await downloadBackupSet(config, args);
    return;
  }
  if (command === 'retention') {
    await applyRetention(config, args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
