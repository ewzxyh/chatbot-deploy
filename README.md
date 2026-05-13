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
