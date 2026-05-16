# ChatCase Tiledesk Deploy

Deployment and local orchestration files for ChatCase on top of the Tiledesk stack.

This repository contains Docker Compose, nginx proxy config, ChatCase runtime patches, backup scripts, and the VPS/systemd backup structure.

## Contents

- `docker-compose.yml`: local/production container orchestration.
- `proxy-nginx.conf`: nginx routes, cache headers, websocket proxying, and app shell cache rules.
- `ionic-rebrand.sh`: runtime customization for `chat21-ionic`.
- `scripts/`: Mongo backup, restore-test, R2 upload/download, and daily backup wrapper.
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

## Production Setup

```bash
cp .env.production.example .env.production
nano .env.production
set -a; . ./.env.production; set +a
node scripts/generate-rabbitmq-jwt.js "$CHAT21_JWT_SECRET" rabbitmq
node scripts/check-production-env.js .env.production
node scripts/r2-storage-smoke.js smoke --env .env.production
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d --build
SMOKE_ADMIN_PASSWORD='<superadmin-password>' node scripts/production-smoke.js --env .env.production
```

The base compose keeps dev defaults so local Docker remains easy to run. Production must use `.env.production` plus `docker-compose.prod.yml`.

In production, only the proxy port should be public. Internal service ports are bound to `127.0.0.1` by default.

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

- Webhook: set `OPERATIONAL_ALERT_WEBHOOK_URL` to a private HTTPS endpoint from n8n, Discord, Slack, or an incident service.
- E-mail: set `OPERATIONAL_ALERT_EMAIL_ENABLED=true`, `OPERATIONAL_ALERT_EMAIL_TO`, and valid SMTP settings.

After deploy, open Superadmin > Operacao and use `Testar notificacao`. A healthy production configuration should return `sent`; `skipped` means no destination is active.

## Production Smoke Test

After each VPS deploy, run the smoke test from this repository:

```bash
SMOKE_ADMIN_PASSWORD='<superadmin-password>' node scripts/production-smoke.js --env .env.production
```

It checks the public/proxy path, not Docker internals:

- `GET /dashboard/`
- `GET /api/sadmin/health/summary`
- `GET /api/sadmin/health/queues`
- `POST /api/sadmin/health/storage/test`
- `POST /api/sadmin/operational-alerts/test-notification`

The script exits with code `1` if a required check fails. `WARN` is allowed for expected non-critical states, such as a local environment with no alert webhook/e-mail destination. In production, the alert notification check should return `OK ... status=sent`.

Useful overrides:

```bash
node scripts/production-smoke.js \
  --base-url https://app.example.com \
  --admin-email redacted@example.invalid \
  --admin-password '<superadmin-password>' \
  --timeout-ms 15000
```

Do not commit the real superadmin password. Prefer passing it through the shell or a temporary deployment secret.
