const DEFAULT_CACHE_TTL_SECONDS = 300;

function trimSlashes(value) {
  return String(value || '').replace(/^\/+|\/+$/g, '');
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function base64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function normalizeKey(value) {
  let decoded = String(value || '').replace(/\\/g, '/');
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) {
        break;
      }
      decoded = next;
    } catch (err) {
      break;
    }
  }

  const key = trimSlashes(decoded);
  if (!key || key.startsWith('.') || key.includes('..') || key.includes('\0')) {
    throw new Error('Unsafe media path');
  }
  if (key.split('/').some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Unsafe media path');
  }
  return key;
}

function encodeKey(key) {
  return normalizeKey(key)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function objectKey(publicKey, env) {
  const prefix = trimSlashes(env.MEDIA_CDN_R2_KEY_PREFIX || env.R2_KEY_PREFIX || '');
  return prefix ? `${prefix}/${publicKey}` : publicKey;
}

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text));
  return base64Url(signature);
}

async function createSignature({ pathname, exp, disposition, secret }) {
  return hmac(secret, ['GET', pathname, String(exp), disposition || 'inline'].join('\n'));
}

async function createSignedUrl({ baseUrl, key, exp, disposition, secret }) {
  const pathname = `/files/${encodeKey(key)}`;
  const url = new URL(String(baseUrl || '').replace(/\/+$/, '') + pathname);
  const safeDisposition = disposition === 'attachment' ? 'attachment' : 'inline';
  url.searchParams.set('exp', String(exp));
  url.searchParams.set('disposition', safeDisposition);
  url.searchParams.set('sig', await createSignature({
    pathname,
    exp,
    disposition: safeDisposition,
    secret,
  }));
  return url.toString();
}

function timingSafeEqual(left, right) {
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < left.length; i += 1) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return result === 0;
}

function filenameFromKey(key) {
  return key.split('/').pop().replace(/"/g, '');
}

function contentDisposition(disposition, key) {
  const filename = filenameFromKey(key);
  return `${disposition === 'attachment' ? 'attachment' : 'inline'}; filename="${filename}"`;
}

function rangeOptions(request) {
  const header = request.headers.get('range');
  if (!header) {
    return {};
  }

  const match = header.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) {
    return {};
  }

  const start = match[1] ? Number(match[1]) : undefined;
  const end = match[2] ? Number(match[2]) : undefined;
  if (Number.isInteger(start) && Number.isInteger(end) && end >= start) {
    return { range: { offset: start, length: end - start + 1 } };
  }
  if (Number.isInteger(start)) {
    return { range: { offset: start } };
  }
  if (Number.isInteger(end)) {
    return { range: { suffix: end } };
  }
  return {};
}

function cacheTtl(env) {
  const parsed = Number(env.MEDIA_CDN_CACHE_TTL_SECONDS || DEFAULT_CACHE_TTL_SECONDS);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : DEFAULT_CACHE_TTL_SECONDS;
}

function responseHeaders(object, env, publicKey, disposition, ranged) {
  const headers = new Headers();
  if (object.writeHttpMetadata) {
    object.writeHttpMetadata(headers);
  }
  if (object.httpEtag) {
    headers.set('etag', object.httpEtag);
  }
  if (object.size !== undefined && !ranged) {
    headers.set('content-length', String(object.size));
  }
  headers.set('content-disposition', contentDisposition(disposition, publicKey));
  headers.set('accept-ranges', 'bytes');
  headers.set('x-content-type-options', 'nosniff');

  const ttl = cacheTtl(env);
  headers.set('cache-control', ttl > 0 ? `private, max-age=${ttl}` : 'no-store');

  if (env.MEDIA_CDN_ALLOWED_ORIGIN) {
    headers.set('access-control-allow-origin', env.MEDIA_CDN_ALLOWED_ORIGIN);
    headers.set('vary', 'origin');
  }

  return headers;
}

async function validateRequest(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return { error: jsonError('Method not allowed', 405) };
  }

  if (!env.MEDIA_CDN_SIGNING_SECRET) {
    return { error: jsonError('Media CDN secret is not configured', 500) };
  }
  if (!env.MEDIA_BUCKET) {
    return { error: jsonError('R2 bucket binding is not configured', 500) };
  }

  const url = new URL(request.url);
  if (!url.pathname.startsWith('/files/')) {
    return { error: jsonError('Not found', 404) };
  }

  let key;
  try {
    key = normalizeKey(url.pathname.slice('/files/'.length));
  } catch (err) {
    return { error: jsonError('Unsafe media path', 400) };
  }

  const exp = Number(url.searchParams.get('exp'));
  const sig = url.searchParams.get('sig');
  const disposition = url.searchParams.get('disposition') === 'attachment' ? 'attachment' : 'inline';
  if (!Number.isInteger(exp) || !sig) {
    return { error: jsonError('Missing signature', 401) };
  }
  if (exp < Math.floor(Date.now() / 1000)) {
    return { error: jsonError('Expired signature', 410) };
  }

  const expected = await createSignature({
    pathname: `/files/${encodeKey(key)}`,
    exp,
    disposition,
    secret: REDACTED_SECRET,
  });
  if (!timingSafeEqual(sig, expected)) {
    return { error: jsonError('Invalid signature', 403) };
  }

  return { key, disposition };
}

async function fetch(request, env) {
  const validated = await validateRequest(request, env);
  if (validated.error) {
    return validated.error;
  }

  const publicKey = validated.key;
  const r2Key = objectKey(publicKey, env);
  const options = rangeOptions(request);
  const object = await env.MEDIA_BUCKET.get(r2Key, options);
  if (!object || !object.body) {
    return jsonError('Not found', 404);
  }

  const ranged = Boolean(options.range);
  const headers = responseHeaders(object, env, publicKey, validated.disposition, ranged);
  let status = ranged ? 206 : 200;
  if (object.range && object.size !== undefined) {
    const offset = object.range.offset || 0;
    const length = object.range.length || object.size;
    headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
    headers.set('content-length', String(length));
  }

  return new Response(request.method === 'HEAD' ? null : object.body, { status, headers });
}

const worker = { fetch };

export {
  createSignature,
  createSignedUrl,
  fetch,
  normalizeKey,
  objectKey,
};

export default worker;
