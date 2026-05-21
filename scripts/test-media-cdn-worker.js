#!/usr/bin/env node

const assert = require('assert');

const SECRET = 'REDACTED_SECRET';

function fakeEnv() {
  const seen = [];
  return {
    MEDIA_CDN_SIGNING_SECRET: SECRET,
    MEDIA_CDN_R2_KEY_PREFIX: 'prod',
    MEDIA_CDN_CACHE_TTL_SECONDS: '120',
    MEDIA_BUCKET: {
      get: async function(key) {
        seen.push(key);
        if (key !== 'prod/uploads/users/u1/files/report.pdf') {
          return null;
        }
        return {
          key: key,
          body: new Blob(['pdf']),
          httpEtag: '"etag"',
          size: 3,
          httpMetadata: {
            contentType: 'application/pdf'
          },
          writeHttpMetadata: function(headers) {
            headers.set('content-type', this.httpMetadata.contentType);
          }
        };
      }
    },
    seen: seen
  };
}

async function readText(response) {
  return await response.text();
}

async function main() {
  const worker = await import('../workers/media-cdn/worker.mjs');
  const exp = Math.floor(Date.now() / 1000) + 60;
  const signedUrl = await worker.createSignedUrl({
    baseUrl: 'https://media.example.com',
    key: 'uploads/users/u1/files/report.pdf',
    exp: exp,
    disposition: 'inline',
    secret: SECRET
  });

  const env = fakeEnv();
  const ok = await worker.fetch(new Request(signedUrl), env, { waitUntil: function() {} });
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.headers.get('content-type'), 'application/pdf');
  assert.strictEqual(ok.headers.get('content-disposition'), 'inline; filename="report.pdf"');
  assert.strictEqual(env.seen[0], 'prod/uploads/users/u1/files/report.pdf');
  assert.strictEqual(await readText(ok), 'pdf');

  const missingSignature = await worker.fetch(
    new Request('https://media.example.com/files/uploads/users/u1/files/report.pdf'),
    fakeEnv(),
    { waitUntil: function() {} }
  );
  assert.strictEqual(missingSignature.status, 401);

  const expiredUrl = await worker.createSignedUrl({
    baseUrl: 'https://media.example.com',
    key: 'uploads/users/u1/files/report.pdf',
    exp: Math.floor(Date.now() / 1000) - 10,
    disposition: 'inline',
    secret: SECRET
  });
  const expired = await worker.fetch(new Request(expiredUrl), fakeEnv(), { waitUntil: function() {} });
  assert.strictEqual(expired.status, 410);

  const traversal = await worker.fetch(
    new Request('https://media.example.com/files/%252e%252e/secret.txt?exp=' + exp + '&sig=x'),
    fakeEnv(),
    { waitUntil: function() {} }
  );
  assert.strictEqual(traversal.status, 400);

  console.log('media CDN Worker tests passed');
}

main().catch(function(err) {
  console.error(err);
  process.exit(1);
});
