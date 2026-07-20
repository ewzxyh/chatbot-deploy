#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

cat >"$TEST_DIR/docker" <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$1 $2" == "ps -aq" ]]; then
  echo container-1
elif [[ "$1 $2" == "inspect --format" ]]; then
  echo sha256:active
elif [[ "$1 $2" == "image ls" ]]; then
  cat <<'IMAGES'
chatcase-rollback/dashboard|old|sha256:old
chatcase-rollback/dashboard|active-old|sha256:active
chatcase-rollback/dashboard|latest|sha256:latest
chatcase-server|pre-only|sha256:pre-only
unrelated/image|old|sha256:unrelated
IMAGES
elif [[ "$1 $2" == "image inspect" ]]; then
  case "${@: -1}" in
    *:latest) date -u -d '1 day ago' +%FT%TZ ;;
    *:pre-only) date -u -d '60 days ago' +%FT%TZ ;;
    *) date -u -d '60 days ago' +%FT%TZ ;;
  esac
elif [[ "$1 $2" == "image rm" ]]; then
  echo "${@: -1}" >>"$FAKE_REMOVED"
fi
EOF
chmod +x "$TEST_DIR/docker"

export FAKE_REMOVED="$TEST_DIR/removed"
touch "$FAKE_REMOVED"
DOCKER_BIN="$TEST_DIR/docker" "$SCRIPT_DIR/chatcase-docker-retention" --dry-run >"$TEST_DIR/dry-run"
[[ ! -s "$FAKE_REMOVED" ]]
grep -qx 'WOULD_DELETE chatcase-rollback/dashboard:old' "$TEST_DIR/dry-run"

DOCKER_BIN="$TEST_DIR/docker" "$SCRIPT_DIR/chatcase-docker-retention"

[[ "$(cat "$FAKE_REMOVED")" == 'chatcase-rollback/dashboard:old' ]]
echo "PASS: Docker retention removes only expired, inactive, non-latest recognized rollbacks"
