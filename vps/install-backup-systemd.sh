#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash vps/install-backup-systemd.sh" >&2
  exit 1
fi

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-/opt/chatcase/tiledesk}"

install -d -m 755 "${PROJECT_ROOT}/scripts"
install -d -m 700 /etc/chatcase
install -d -m 700 /var/backups/chatcase/mongo
install -d -m 700 /var/backups/chatcase/mongo-r2-download-test
install -d -m 755 /var/log/chatcase/backups

install -m 700 "${SRC_DIR}/scripts/chatcase-mongo-backup-r2-daily.sh" \
  "${PROJECT_ROOT}/scripts/chatcase-mongo-backup-r2-daily.sh"

if [[ ! -f "${PROJECT_ROOT}/scripts/r2-backup-sync.js" ]]; then
  echo "Missing ${PROJECT_ROOT}/scripts/r2-backup-sync.js" >&2
  echo "Copy r2-backup-sync.js from the deployment scripts directory before enabling the timer." >&2
  exit 1
fi

if [[ ! -f /etc/chatcase/chatcase-backup.env ]]; then
  install -m 600 "${SRC_DIR}/env/chatcase-backup.env.example" /etc/chatcase/chatcase-backup.env
  echo "Created /etc/chatcase/chatcase-backup.env from example. Edit it before starting the backup service."
else
  chmod 600 /etc/chatcase/chatcase-backup.env
fi

install -m 644 "${SRC_DIR}/systemd/chatcase-mongo-backup.service" /etc/systemd/system/chatcase-mongo-backup.service
install -m 644 "${SRC_DIR}/systemd/chatcase-mongo-backup.timer" /etc/systemd/system/chatcase-mongo-backup.timer

systemctl daemon-reload
systemctl enable chatcase-mongo-backup.timer

echo "Installed systemd timer."
echo "Edit /etc/chatcase/chatcase-backup.env, then test with:"
echo "  systemctl start chatcase-mongo-backup.service"
echo "  systemctl status chatcase-mongo-backup.service --no-pager"
echo "  journalctl -u chatcase-mongo-backup.service -n 120 --no-pager"
echo "Enable/start timer with:"
echo "  systemctl start chatcase-mongo-backup.timer"
