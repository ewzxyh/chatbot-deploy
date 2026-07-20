#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

mkdir "$TEST_DIR/dashboard-before-old" "$TEST_DIR/dashboard-before-latest"
mkdir "$TEST_DIR/server-before-only" "$TEST_DIR/unrelated-backup"
touch -d '60 days ago' "$TEST_DIR/dashboard-before-old" "$TEST_DIR/unrelated-backup"
touch -d '40 days ago' "$TEST_DIR/dashboard-before-latest" "$TEST_DIR/server-before-only"

BACKUP_DIR="$TEST_DIR" RETENTION_DAYS=30 \
  "$SCRIPT_DIR/chatcase-code-backup-retention"

[[ ! -e "$TEST_DIR/dashboard-before-old" ]]
[[ -d "$TEST_DIR/dashboard-before-latest" ]]
[[ -d "$TEST_DIR/server-before-only" ]]
[[ -d "$TEST_DIR/unrelated-backup" ]]

echo "PASS: retention deletes only expired non-latest code backups"
