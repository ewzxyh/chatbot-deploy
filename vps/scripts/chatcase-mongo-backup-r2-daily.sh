#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="${PROJECT_ROOT:-/opt/chatcase/tiledesk}"
ENV_FILE="${ENV_FILE:-/etc/chatcase/chatcase-backup.env}"
MONGO_SERVICE="${MONGO_SERVICE:-${MONGO_CONTAINER:-mongo}}"
MONGO_DATABASES="${MONGO_DATABASES:-tiledesk,chat21,tiledesk-logs}"
MONGO_BACKUP_DIR="${MONGO_BACKUP_DIR:-/var/backups/chatcase/mongo}"
MONGO_R2_DOWNLOAD_DIR="${MONGO_R2_DOWNLOAD_DIR:-/var/backups/chatcase/mongo-r2-download-test}"
MONGO_BACKUP_LOG_DIR="${MONGO_BACKUP_LOG_DIR:-/var/log/chatcase/backups}"
MONGO_RESTORE_SUFFIX="${MONGO_RESTORE_SUFFIX:-restore-test}"
SKIP_RESTORE_CHECK="${SKIP_RESTORE_CHECK:-false}"
BACKUP_ALERT_ON_SUCCESS="${BACKUP_ALERT_ON_SUCCESS:-false}"

umask 077

load_env_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    . "$file"
    set +a
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 127
  fi
}

json_write_status() {
  local status="$1"
  local backup_set="$2"
  local message="$3"
  node -e "
const fs = require('fs');
const data = {
  status: process.argv[1],
  backupSet: process.argv[2] || null,
  message: process.argv[3] || null,
  completedAt: new Date().toISOString(),
  logPath: process.env.LOG_PATH,
  restoreCheck: process.env.SKIP_RESTORE_CHECK !== 'true'
};
fs.writeFileSync(process.env.LAST_RESULT_PATH, JSON.stringify(data, null, 2));
" "$status" "$backup_set" "$message"
}

send_alert() {
  local status="$1"
  local message="$2"

  if [[ -n "${BACKUP_ALERT_WEBHOOK_URL:-}" ]]; then
    local payload
    payload="$(node -e "
const payload = {
  text: 'ChatCase Mongo R2 backup ' + process.argv[1] + ' on ' + process.env.HOSTNAME + ': ' + process.argv[2],
  content: 'ChatCase Mongo R2 backup ' + process.argv[1] + ' on ' + process.env.HOSTNAME + ': ' + process.argv[2],
  status: process.argv[1],
  host: process.env.HOSTNAME,
  timestamp: new Date().toISOString(),
  logPath: process.env.LOG_PATH
};
console.log(JSON.stringify(payload));
" "$status" "$message")"
    curl -fsS --max-time 20 \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$BACKUP_ALERT_WEBHOOK_URL" >/dev/null
    return
  fi

  if [[ "$status" != "success" ]]; then
    local alert_path="${MONGO_BACKUP_LOG_DIR}/last-failure-alert.json"
    node -e "
const fs = require('fs');
fs.writeFileSync(process.argv[1], JSON.stringify({
  status: 'failed',
  host: process.env.HOSTNAME,
  timestamp: new Date().toISOString(),
  message: process.argv[2],
  logPath: process.env.LOG_PATH
}, null, 2));
" "$alert_path" "$message"
    logger -t ChatCaseBackup "Mongo R2 backup failed: ${message}. Log: ${LOG_PATH}" || true
  fi
}

on_error() {
  local exit_code=$?
  local line_no="${1:-unknown}"
  local message="line ${line_no} failed with exit code ${exit_code}"
  echo "$message" >&2
  json_write_status "failed" "${BACKUP_SET_ID:-}" "$message" || true
  send_alert "failed" "$message" || true
  exit "$exit_code"
}
trap 'on_error $LINENO' ERR

load_env_file "${PROJECT_ROOT}/.env"
load_env_file "$ENV_FILE"

mkdir -p "$MONGO_BACKUP_DIR" "$MONGO_R2_DOWNLOAD_DIR" "$MONGO_BACKUP_LOG_DIR"

RUN_ID="$(date +%Y%m%d-%H%M%S)"
BACKUP_SET_ID="$RUN_ID"
BACKUP_SET_DIR="${MONGO_BACKUP_DIR}/${RUN_ID}"
LOG_PATH="${MONGO_BACKUP_LOG_DIR}/mongo-r2-daily-${RUN_ID}.log"
LAST_RESULT_PATH="${MONGO_BACKUP_LOG_DIR}/mongo-r2-daily-last.json"
export LOG_PATH LAST_RESULT_PATH SKIP_RESTORE_CHECK

exec > >(tee -a "$LOG_PATH") 2>&1

require_command docker
require_command node
require_command curl
require_command sha256sum
require_command stat

cd "$PROJECT_ROOT"

echo "ChatCase Mongo R2 daily backup started at $(date --iso-8601=seconds)"
echo "Project root: $PROJECT_ROOT"
echo "Backup set: $BACKUP_SET_ID"
echo "Log: $LOG_PATH"

container_id="$(docker compose ps -q "$MONGO_SERVICE")"
if [[ -z "$container_id" ]]; then
  echo "Mongo service '$MONGO_SERVICE' is not running or was not found." >&2
  exit 1
fi

mkdir -p "$BACKUP_SET_DIR"

IFS=',' read -r -a databases <<< "$MONGO_DATABASES"
entries=()
for raw_db in "${databases[@]}"; do
  db="$(echo "$raw_db" | xargs)"
  [[ -z "$db" ]] && continue

  archive="${db}.archive.gz"
  container_archive="/tmp/chatcase-${RUN_ID}-${archive}"
  local_archive="${BACKUP_SET_DIR}/${archive}"

  echo "Backing up database '$db'..."
  dump_args=(mongodump)
  if [[ -n "${MONGO_BACKUP_URI:-}" ]]; then
    dump_args+=(--uri "$MONGO_BACKUP_URI")
  fi
  dump_args+=(--db "$db" --archive="$container_archive" --gzip)
  docker compose exec -T "$MONGO_SERVICE" "${dump_args[@]}"
  docker cp "${container_id}:${container_archive}" "$local_archive"
  docker compose exec -T "$MONGO_SERVICE" rm -f "$container_archive"

  bytes="$(stat -c%s "$local_archive")"
  sha="$(sha256sum "$local_archive" | awk '{print $1}')"
  entries+=("${db}|${archive}|${bytes}|${sha}")
done

if [[ "${#entries[@]}" -eq 0 ]]; then
  echo "No databases configured in MONGO_DATABASES." >&2
  exit 1
fi

MONGO_SERVICE_NAME="$MONGO_SERVICE" node -e "
const fs = require('fs');
const entries = process.argv.slice(2).map((item) => {
  const [name, archive, bytes, sha256] = item.split('|');
  return { name, archive, bytes: Number(bytes), sha256 };
});
const manifest = {
  createdAt: new Date().toISOString(),
  mongoContainer: process.env.MONGO_SERVICE_NAME || 'mongo',
  databases: entries
};
fs.writeFileSync(process.argv[1], JSON.stringify(manifest, null, 2));
" "${BACKUP_SET_DIR}/manifest.json" "${entries[@]}"

echo "Uploading backup set to R2..."
node "${PROJECT_ROOT}/scripts/r2-backup-sync.js" upload --backup-set "$BACKUP_SET_DIR" --retention

if [[ "$SKIP_RESTORE_CHECK" != "true" ]]; then
  echo "Downloading uploaded backup set from R2..."
  node "${PROJECT_ROOT}/scripts/r2-backup-sync.js" download --set-id "$BACKUP_SET_ID" --output-dir "$MONGO_R2_DOWNLOAD_DIR"

  downloaded_set="${MONGO_R2_DOWNLOAD_DIR}/${BACKUP_SET_ID}"
  echo "Restoring downloaded backup set into *-${MONGO_RESTORE_SUFFIX} databases..."
  for entry in "${entries[@]}"; do
    IFS='|' read -r db archive _ <<< "$entry"
    target_db="${db}-${MONGO_RESTORE_SUFFIX}"
    safe_target="$(echo "$target_db" | sed 's/[^A-Za-z0-9_.-]/_/g')"
    container_archive="/tmp/chatcase-restore-${safe_target}.archive.gz"

    docker cp "${downloaded_set}/${archive}" "${container_id}:${container_archive}"
    restore_args=(mongorestore)
    if [[ -n "${MONGO_BACKUP_URI:-}" ]]; then
      restore_args+=(--uri "$MONGO_BACKUP_URI")
    fi
    restore_args+=(
      --archive="$container_archive"
      --gzip
      "--nsFrom=${db}.*"
      "--nsTo=${target_db}.*"
      --drop
    )
    docker compose exec -T "$MONGO_SERVICE" "${restore_args[@]}"
    docker compose exec -T "$MONGO_SERVICE" rm -f "$container_archive"
  done

  echo "Comparing critical collection counts..."
  compare_js='
const restoreSuffix = process.env.RESTORE_SUFFIX || "restore-test";
const checks = {
  tiledesk: ["users","projects","requests","leads","integrations","messages","files.files","files.chunks","project_users","kvstore"],
  chat21: ["messages","conversations","groups","instances"],
  "tiledesk-logs": ["router_loggers"]
};
let failed = false;
for (const [dbName, collections] of Object.entries(checks)) {
  const source = db.getSiblingDB(dbName);
  const restored = db.getSiblingDB(`${dbName}-${restoreSuffix}`);
  for (const collection of collections) {
    const left = source.getCollection(collection).countDocuments({});
    const right = restored.getCollection(collection).countDocuments({});
    const ok = left === right;
    print(`${ok ? "OK" : "FAIL"} ${dbName}.${collection}: ${left} -> ${right}`);
    if (!ok) failed = true;
  }
}
if (failed) quit(1);
'
  mongosh_args=(mongosh)
  if [[ -n "${MONGO_BACKUP_URI:-}" ]]; then
    mongosh_args+=("$MONGO_BACKUP_URI")
  fi
  mongosh_args+=(--quiet --eval "$compare_js")
  docker compose exec -T -e "RESTORE_SUFFIX=${MONGO_RESTORE_SUFFIX}" "$MONGO_SERVICE" "${mongosh_args[@]}"
else
  echo "Restore check skipped by SKIP_RESTORE_CHECK=true."
fi

json_write_status "success" "$BACKUP_SET_ID" "backup completed"
rm -f "${MONGO_BACKUP_LOG_DIR}/last-failure-alert.json"

if [[ "$BACKUP_ALERT_ON_SUCCESS" == "true" ]]; then
  send_alert "success" "backup set ${BACKUP_SET_ID} completed"
fi

echo "ChatCase Mongo R2 daily backup completed successfully at $(date --iso-8601=seconds)"
