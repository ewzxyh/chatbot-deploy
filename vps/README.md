# ChatCase VPS backup structure

This directory contains the production-oriented backup structure for a Linux VPS.

Target layout on the VPS:

```text
/opt/chatcase/tiledesk
/opt/chatcase/tiledesk/scripts/r2-backup-sync.js
/opt/chatcase/tiledesk/scripts/chatcase-mongo-backup-r2-daily.sh
/etc/chatcase/chatcase-backup.env
/var/backups/chatcase/mongo
/var/backups/chatcase/mongo-r2-download-test
/var/log/chatcase/backups
/etc/systemd/system/chatcase-mongo-backup.service
/etc/systemd/system/chatcase-mongo-backup.timer
```

The job performs:

- MongoDB dump for `tiledesk`, `chat21`, and `tiledesk-logs`.
- Upload to Cloudflare R2.
- R2 retention.
- Download of the just-uploaded backup set.
- Restore into `*-restore-test` databases.
- Critical collection count comparison.
- Failure alert through `BACKUP_ALERT_WEBHOOK_URL`, with local fallback logs.

R2 buckets:

- Use `MONGO_BACKUP_R2_*` for Mongo backup archives.
- Use `R2_*` for tiledesk-server uploads and conversation attachments.
- Prefer separate private buckets, for example `chatcase-backups` and `chatcase-uploads`.
- If you intentionally use one bucket, keep separate prefixes such as `MONGO_BACKUP_R2_PREFIX=backups/mongo` and `R2_KEY_PREFIX=uploads/prod`.

Mongo auth:

- Set `MONGO_BACKUP_URI` in `/etc/chatcase/chatcase-backup.env`.
- This URI should use the root/admin Mongo user because restore-check creates `*-restore-test` databases.
- If the root password has reserved URL characters, URL-encode it in `MONGO_BACKUP_URI`.

Install on VPS:

```bash
cd /opt/chatcase/tiledesk
sudo bash vps/install-backup-systemd.sh
sudo nano /etc/chatcase/chatcase-backup.env
```

Test manually:

```bash
sudo systemctl start chatcase-mongo-backup.service
sudo systemctl status chatcase-mongo-backup.service --no-pager
sudo journalctl -u chatcase-mongo-backup.service -n 120 --no-pager
cat /var/log/chatcase/backups/mongo-r2-daily-last.json
```

Enable daily schedule:

```bash
sudo systemctl start chatcase-mongo-backup.timer
sudo systemctl list-timers chatcase-mongo-backup.timer
```

Default schedule: daily at `03:15`, with up to five minutes of randomized delay.

Important production note:

The R2 key used during local testing was exposed in conversation. Revoke it before production and create a fresh bucket-scoped R2 access key.
