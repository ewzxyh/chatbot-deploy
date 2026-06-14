#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env.production"
COMPOSE_FILES=("docker-compose.yml" "docker-compose.prod.yml")
SKIP_BUILD="false"
RUN_SMOKE="auto"

usage() {
  cat <<'USAGE'
Usage: scripts/deploy-compose.sh [options]

Options:
  --env <file>         Env file to pass to docker compose. Default: .env.production
  -f, --file <file>    Compose file. Can be repeated. Default: docker-compose.yml + docker-compose.prod.yml
  --skip-build         Run docker compose up -d without --build.
  --smoke             Require and run scripts/production-smoke.js after runtime checks.
  --skip-smoke         Do not run scripts/production-smoke.js.
  -h, --help          Show this help.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      ENV_FILE="${2:?Missing value for --env}"
      shift 2
      ;;
    -f|--file)
      if [[ "${COMPOSE_FILES[*]}" == "docker-compose.yml docker-compose.prod.yml" ]]; then
        COMPOSE_FILES=()
      fi
      COMPOSE_FILES+=("${2:?Missing value for $1}")
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD="true"
      shift
      ;;
    --smoke)
      RUN_SMOKE="required"
      shift
      ;;
    --skip-smoke)
      RUN_SMOKE="skip"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

COMPOSE_ARGS=()
for file in "${COMPOSE_FILES[@]}"; do
  COMPOSE_ARGS+=("-f" "$file")
done

echo "Checking docker compose config..."
docker compose --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" config --quiet

echo "Starting ChatCase stack..."
UP_ARGS=("up" "-d")
if [[ "$SKIP_BUILD" != "true" ]]; then
  UP_ARGS+=("--build")
fi
docker compose --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" "${UP_ARGS[@]}"

echo "Checking Chat21 runtime environment..."
node scripts/check-chat21-runtime-env.js --env "$ENV_FILE" "${COMPOSE_ARGS[@]}"

if [[ "$RUN_SMOKE" == "skip" ]]; then
  echo "Skipping authenticated smoke by request."
elif [[ -n "${SMOKE_ADMIN_PASSWORD:-}" ]]; then
  echo "Running authenticated production smoke..."
  node scripts/production-smoke.js --env "$ENV_FILE"
elif [[ "$RUN_SMOKE" == "required" ]]; then
  echo "SMOKE_ADMIN_PASSWORD is required when --smoke is used." >&2
  exit 1
else
  echo "Skipping authenticated smoke because SMOKE_ADMIN_PASSWORD is not set."
fi

echo "Deploy checks completed."
