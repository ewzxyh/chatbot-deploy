# ChatCase Tiledesk Deploy

Deployment and local orchestration files for ChatCase on top of the Tiledesk stack.

This repository contains Docker Compose, nginx proxy config, ChatCase runtime patches, backup scripts, and the VPS/systemd backup structure.

## Contents

- `docker-compose.yml`: local/production container orchestration.
- `proxy-nginx.conf`: nginx routes, cache headers, websocket proxying, and app shell cache rules.
- `ionic-rebrand.sh`: runtime customization for the local `../chatcase-chat21-ionic` fork.
- `scripts/`: Mongo backup, restore-test, R2 upload/download, daily backup wrapper, and config checks.
- `vps/`: Linux VPS backup service/timer templates and installer.
- `.env.example`: safe template for local/VPS secrets.

## Local Setup

```powershell
copy .env.example .env
docker compose up -d
```

Keep `.env`, backups, and local storage directories out of git.

## Production Notes

- Use fresh production secrets on the VPS.
- Mongo root credentials are only for initialization/admin/backup. Application services should use the dedicated `MONGO_TILEDESK_*`, `MONGO_LOGS_*`, and `MONGO_CHAT21_*` users.
- Use `MONGO_BACKUP_R2_*` for Mongo backups.
- Use `R2_*` for uploads and conversation attachments.
- Prefer separate private R2 buckets for backups and uploads.
- Revoke any R2 credentials that were shared during local testing before production.
- Generate separate values for `GLOBAL_SECRET`, `CHAT21_JWT_SECRET`, `JWT_SECRET_KEY`, and `SESSION_SECRET`.
- Set `APPS_ACCESS_TOKEN_SECRET` to the same value as `GLOBAL_SECRET`; the apps module validates dashboard user JWTs and the integrations page depends on this.
- Fill `CHAT21_ADMIN_TOKEN`, `PUSH_WH_CHAT21_API_ADMIN_TOKEN`, and `PUSH_WH_WEBHOOK_TOKEN`; production must not fall back to the public dev defaults in `docker-compose.yml`.

## Production Setup

```bash
cp .env.production.example .env.production
nano .env.production
set -a; . ./.env.production; set +a
node scripts/generate-rabbitmq-jwt.js "$CHAT21_JWT_SECRET" rabbitmq
node scripts/check-production-env.js .env.production
node scripts/test-community-page-static.js
node scripts/r2-storage-smoke.js smoke --env .env.production
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d --build
SMOKE_ADMIN_PASSWORD='<superadmin-password>' node scripts/production-smoke.js --env .env.production
```

The base compose keeps dev defaults so local Docker remains easy to run. Production must use `.env.production` plus `docker-compose.prod.yml`.

The `/chat/` service is built from the local `../chatcase-chat21-ionic` fork. The `/cds/` flow builder is built from the local `../chatcase-design-studio` fork. Keep those repos beside this deploy repo before running `docker compose up --build`; the official images are left commented in `docker-compose.yml` only as upstream references.

`GPTKEY` is optional when `AI_FEATURES_ENABLED=false`. Leave it empty if ChatCase will not use AI, Knowledge Base, or RAG features in the first production cut. If those features are enabled later, set `AI_FEATURES_ENABLED=true`, fill `GPTKEY`, and rerun `node scripts/check-production-env.js .env.production`.

`ADMIN_PASSWORD` is the bootstrap password used only when the Mongo volume is fresh and `BOOT_LOADING=true` creates the first superadmin user. Store it in a password manager. After the first login, rotate the password from the dashboard and keep the rotated value in the password manager. `SUPER_PASSWORD` is a separate emergency/master password used by upstream Tiledesk auth; always set it to a long random value in production so the upstream default is never active.

For the authenticated production smoke, either rely on `ADMIN_PASSWORD` from the env file during first deploy or export the current superadmin password only for the current shell session:

```bash
export SMOKE_ADMIN_PASSWORD='<superadmin-password>'
node scripts/production-smoke.js --env .env.production
```

In production, only the proxy port should be published. `docker-compose.prod.yml` resets inherited internal service ports with `ports: !reset []`, so Mongo, Redis, RabbitMQ, server, chat, dashboard, Qdrant, workers, and the incident receiver are reachable only on the Docker network. Use the proxy for every public route.

## Proxy Hardening

`proxy-nginx.conf` applies the production-facing hardening layer:

- security headers for dashboard, CDS, chat, API, chat API, and static assets;
- CSP/frame protection on dashboard, CDS, and chat without applying frame blocking to `/widget/`;
- HSTS when the incoming request is known to be HTTPS through `X-Forwarded-Proto`;
- request limits of `10r/s` on `/api/` and `20r/s` on `/chatapi/`, both returning `429` when exceeded.

Run this before deploy changes:

```bash
node scripts/test-hardening-config.js
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml config --quiet
```

## MongoDB

Production MongoDB runs with `--auth`. On a fresh volume, `mongo-init/01-create-app-users.js` creates three read/write application users:

- `MONGO_TILEDESK_USERNAME` for the `tiledesk` database.
- `MONGO_LOGS_USERNAME` for the `tiledesk-logs` database.
- `MONGO_CHAT21_USERNAME` for the `chat21` database.

Use URL-safe passwords for these users because they are embedded in `TILEDESK_MONGODB_URI`, `TILEDESK_LOGS_MONGODB_URI`, and `CHAT21_MONGODB_URI`.

Backups and restore-checks need admin access. Set `MONGO_BACKUP_URI` in `/etc/chatcase/chatcase-backup.env`, usually:

```bash
MONGO_BACKUP_URI=mongodb://chatcase_root:<root_password_url_encoded>@localhost:27017/?authSource=admin
```

## R2 Upload Storage

Production uploads and conversation attachments use `R2_*`, separate from `MONGO_BACKUP_R2_*`.

Before the first production deploy, run:

```bash
node scripts/r2-storage-smoke.js check-config --env .env.production
node scripts/r2-storage-smoke.js smoke --env .env.production
```

The smoke command writes, reads, verifies, and deletes a small object under `R2_KEY_PREFIX`. It prints bucket/key metadata only, never access keys or secrets.

## Community Templates

`/community/` is a public, white-label template gallery served by the proxy. Its install CTA opens the protected dashboard projects route with `template=<id>&install=1&source=community&channel=<channel>`; after login, the user selects the target project and the dashboard uses the native public-template fork flow to import it automatically for the selected channel.

ChatCase templates carry channel compatibility metadata. CaseZap and WhatsApp session flows do not expose WABA/Meta template publication actions during import. The CDS container is built from the local `../chatcase-design-studio` fork; `cds-rebrand.sh` still injects the existing runtime guard that hides WABA-only actions when the flow URL contains `?channel=casezap`, `?channel=whatsapp`, or another non-WABA channel. Deeper channel-specific editing rules should now move into the fork instead of growing more bundle patches.

Before deploying or changing the public template page, run:

```bash
node scripts/test-community-page-static.js
```

The production smoke also checks `GET /community/` and `/community/assets/community.js`. Set `COMMUNITY_PUBLIC_URL=https://chatcase.com.br/community/` and keep `SMOKE_COMMUNITY_PATH=/community/` unless the public route changes intentionally.

## Legal Pages

The proxy serves the public legal pages required for Meta review and LGPD:

- Privacy Policy: `https://app.chatcase.com.br/privacy`
- Terms of Use: `https://app.chatcase.com.br/terms`
- Data Deletion Instructions: `https://app.chatcase.com.br/data-deletion`

Run the static check before deploying legal page changes:

```bash
node scripts/test-legal-pages-static.js
```

## R2 Private Media Worker

R2 should stay private. To serve media directly through Cloudflare instead of proxying every file through the API, deploy the Worker in `workers/media-cdn`.

The Worker validates HMAC signed URLs generated by the backend and then reads the object through an R2 binding. Keep `MEDIA_CDN_REPLACE_SRC=false` at first: ChatCase keeps `/api/files` as the persisted fallback, while outbound WABA/CaseZap media can prefer `cdnUrl` when present.

Backend env on the VPS:

```bash
MEDIA_CDN_ENABLED=true
MEDIA_CDN_BASE_URL=https://media.chatcase.com.br
MEDIA_CDN_SIGNING_SECRET=<same-secret-used-by-worker>
MEDIA_CDN_DEFAULT_TTL_SECONDS=604800
MEDIA_CDN_REPLACE_SRC=false
```

Worker setup:

```bash
cd workers/media-cdn
copy wrangler.toml.example wrangler.toml
npx wrangler secret put MEDIA_CDN_SIGNING_SECRET
npx wrangler deploy
```

In `wrangler.toml`, set `bucket_name` to the same value as `R2_BUCKET` and `MEDIA_CDN_R2_KEY_PREFIX` to the same value as `R2_KEY_PREFIX`. The custom domain should be a media subdomain, for example `media.chatcase.com.br`.

Local Worker verification does not need real Cloudflare credentials:

```bash
node scripts/test-media-cdn-worker.js
```

## RabbitMQ

The `chat21/chat21-rabbitmq` image authenticates AMQP clients with JWT/OAuth tokens. `RABBITMQ_DEFAULT_USER` and `RABBITMQ_DEFAULT_PASS` are still useful for the management user, but application containers must use token URLs:

- `AMQP_MANAGER_URL` for Tiledesk server, chatbot, and LLM workers.
- `RABBITMQ_URI` for Chat21 server.
- `RABBITMQ_ADMIN_URI` for Chat21 HTTP/push services.
- `RABBITMQ_MANAGEMENT_URL`, `RABBITMQ_MANAGEMENT_USERNAME`, and `RABBITMQ_MANAGEMENT_PASSWORD` let the Tiledesk server read queue metrics from the internal Management API.

Generate them with the same `CHAT21_JWT_SECRET` used by the app:

```bash
node scripts/generate-rabbitmq-jwt.js "$CHAT21_JWT_SECRET" rabbitmq
```

The Management API URL should stay internal:

```bash
RABBITMQ_MANAGEMENT_URL=http://rabbitmq:15672/api
```

Keep the monitored queue list aligned with the queues that really exist in the running RabbitMQ instance. The local ChatCase compose currently exposes these operational queues with consumers:

```bash
OPERATIONAL_RABBITMQ_QUEUES=jobsmanager,webhooks,messages,logs_queue,conversation-tags_queue,persist,tiledesk-trainer
```

Before going live on the VPS, confirm the final list with:

```bash
docker exec rabbitmq rabbitmqctl list_queues name consumers messages_ready messages_unacknowledged
```

Remove a queue from `OPERATIONAL_RABBITMQ_QUEUES` only if its service is intentionally disabled in that environment. Leaving a non-existent queue in the list creates a false critical alert; omitting an active critical queue leaves it unmonitored.

## Operational Monitor

The Tiledesk server runs the internal operational monitor in the background. It periodically refreshes health checks and syncs `operational_alerts`, so alerts do not depend on someone opening the admin panel.

```bash
OPERATIONAL_MONITOR_ENABLED=true
OPERATIONAL_MONITOR_INTERVAL_SECONDS=300
OPERATIONAL_MONITOR_START_DELAY_SECONDS=60
```

Set `OPERATIONAL_MONITOR_ENABLED=false` only for maintenance or debugging.

## Operational Alerts

When the monitor opens, reopens, or records a still-open critical `operational_alert`, the server can notify an external webhook and/or the admin e-mail channel.

```bash
OPERATIONAL_ALERT_MIN_SEVERITY=critical
OPERATIONAL_ALERT_WEBHOOK_URL=https://hooks.example.com/chatcase
OPERATIONAL_ALERT_WEBHOOK_EVENTS=alert.opened,alert.reopened,alert.still_open
OPERATIONAL_ALERT_EMAIL_ENABLED=false
OPERATIONAL_ALERT_EMAIL_TO=redacted@example.invalid
```

Keep `OPERATIONAL_ALERT_MIN_SEVERITY=critical` at first. Use `OPERATIONAL_ALERT_NOTIFY_RESOLVED=true` only if you also want a notification when a critical alert is resolved.

Production must have at least one alert destination configured before `node scripts/check-production-env.js .env.production` passes:

- Webhook: for the first production cut, use the built-in incident automation receiver exposed by the proxy at `/automation/`. n8n can replace it later if the flow needs approvals, branching, or external integrations.
- E-mail: set `OPERATIONAL_ALERT_EMAIL_ENABLED=true`, `OPERATIONAL_ALERT_EMAIL_TO`, and valid SMTP settings.

After deploy, open Superadmin > Operacao and use `Testar notificacao`. A healthy production configuration should return `sent`; `skipped` means no destination is active.

## Billing Lifecycle

The server includes an optional billing lifecycle job for CasePay projects. It can simulate or apply:

- dunning notices while a paid project is overdue;
- automatic suspension after `BILLING_SUSPEND_AFTER_DAYS`;
- automatic downgrade to Free after `BILLING_DOWNGRADE_AFTER_DAYS`;
- owner e-mail notices when `BILLING_LIFECYCLE_EMAIL_ENABLED=true`.

Keep the job disabled and dry-run until CasePay webhooks and SMTP are validated:

```bash
BILLING_LIFECYCLE_JOB_ENABLED=false
BILLING_LIFECYCLE_JOB_DRY_RUN=true
BILLING_LIFECYCLE_DRY_RUN=true
BILLING_SUSPEND_AFTER_DAYS=7
BILLING_DOWNGRADE_AFTER_DAYS=30
BILLING_LIFECYCLE_EMAIL_ENABLED=true
```

Superadmin > Projetos exposes the same sweep as `Simular` and `Executar`. Production should run at least one simulation before enabling the scheduled job.

## Incident Automation Flow

This repository includes a small webhook automation flow for incident routing:

- ChatCase operational alerts: `POST /webhooks/chatcase/operational-alert`
- Sentry issue alerts: `POST /webhooks/sentry/issue-alert`
- Health check: `GET /healthz`

The flow normalizes ChatCase and Sentry payloads into one incident shape, redacts common secrets/PII, applies `INCIDENT_MIN_SEVERITY`, and can either dry-run or send a Resend e-mail.

Run the local dry-run test:

```bash
node scripts/test-incident-automation-flow.js
```

Run the webhook locally through Docker Compose or directly:

```bash
INCIDENT_WEBHOOK_SECRET='<long-random-secret>' \
INCIDENT_AUTOMATION_DRY_RUN=true \
node scripts/incident-automation-webhook.js
```

To connect ChatCase in production, set `OPERATIONAL_ALERT_WEBHOOK_URL` to the public HTTPS URL for:

```text
https://app.example.com/automation/webhooks/chatcase/operational-alert?secret=<long-random-secret>
```

To connect Sentry, create an issue alert webhook pointing to:

```text
https://app.example.com/automation/webhooks/sentry/issue-alert?secret=<long-random-secret>
```

Keep `INCIDENT_AUTOMATION_DRY_RUN=true` until the endpoint, secret, and routing are verified. To send via Resend, set `INCIDENT_AUTOMATION_DRY_RUN=false`, `RESEND_API_KEY`, `INCIDENT_EMAIL_FROM`, and `INCIDENT_EMAIL_TO`.

## Production Smoke Test

After each VPS deploy, run the smoke test from this repository:

```bash
node scripts/production-smoke.js --env .env.production --public-only
SMOKE_ADMIN_PASSWORD='<superadmin-password>' node scripts/production-smoke.js --env .env.production
```

It checks the public/proxy path, not Docker internals:

- `GET /dashboard/`
- `GET /community/`
- `GET /community/assets/community.js`
- `GET /api/sadmin/health/summary`
- `GET /api/sadmin/health/queues`
- `POST /api/sadmin/health/storage/test`

The script exits with code `1` if a required check fails. `WARN` is allowed for expected non-critical states. It does not send operational alert e-mails by default. To test the real alert destination, run with `--test-alert-notification` or `SMOKE_TEST_ALERT_NOTIFICATION=true`; that explicit alert check should return `OK ... status=sent` in production.

Use `--public-only` first when DNS/TLS/proxy is the only thing being checked. It runs only public checks and does not require superadmin credentials.

Useful overrides:

```bash
node scripts/production-smoke.js \
  --base-url https://app.example.com \
  --community-path /community/ \
  --admin-email redacted@example.invalid \
  --admin-password '<superadmin-password>' \
  --timeout-ms 15000
```

Do not commit the real superadmin password. Prefer passing it through the shell or a temporary deployment secret.
