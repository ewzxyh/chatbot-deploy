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
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

The base compose keeps dev defaults so local Docker remains easy to run. Production must use `.env.production` plus `docker-compose.prod.yml`.

In production, only the proxy port should be public. Internal service ports are bound to `127.0.0.1` by default.

## RabbitMQ

The `chat21/chat21-rabbitmq` image authenticates AMQP clients with JWT/OAuth tokens. `RABBITMQ_DEFAULT_USER` and `RABBITMQ_DEFAULT_PASS` are still useful for the management user, but application containers must use token URLs:

- `AMQP_MANAGER_URL` for Tiledesk server, chatbot, and LLM workers.
- `RABBITMQ_URI` for Chat21 server.
- `RABBITMQ_ADMIN_URI` for Chat21 HTTP/push services.

Generate them with the same `CHAT21_JWT_SECRET` used by the app:

```bash
node scripts/generate-rabbitmq-jwt.js "$CHAT21_JWT_SECRET" rabbitmq
```
