# ChatCase Media CDN Worker

This Worker serves private R2 objects through signed URLs.

Required binding and secret:

- `MEDIA_BUCKET`: R2 bucket binding.
- `MEDIA_CDN_SIGNING_SECRET`: HMAC secret shared with the Tiledesk server.

Runtime vars:

- `MEDIA_CDN_R2_KEY_PREFIX`: must match `R2_KEY_PREFIX` in the server env.
- `MEDIA_CDN_CACHE_TTL_SECONDS`: short private browser cache TTL.
- `MEDIA_CDN_ALLOWED_ORIGIN`: optional app origin for CORS.

Deploy:

```bash
copy wrangler.toml.example wrangler.toml
npx wrangler secret put MEDIA_CDN_SIGNING_SECRET
npx wrangler deploy
```

The signed URL covers method, path, expiration, and disposition. Do not log full URLs with `sig` in production logs.
