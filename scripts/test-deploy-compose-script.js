#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'scripts', 'deploy-compose.sh'), 'utf8');

function indexOfSnippet(snippet) {
  const index = script.indexOf(snippet);
  assert.notStrictEqual(index, -1, `deploy-compose.sh must include: ${snippet}`);
  return index;
}

const configIndex = indexOfSnippet('docker compose --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" config --quiet');
const upIndex = indexOfSnippet('docker compose --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" "${UP_ARGS[@]}"');
const guardIndex = indexOfSnippet('node scripts/check-chat21-runtime-env.js --env "$ENV_FILE" "${COMPOSE_ARGS[@]}"');
const smokeIndex = indexOfSnippet('node scripts/production-smoke.js --env "$ENV_FILE"');

assert.ok(configIndex < upIndex, 'compose config must run before compose up');
assert.ok(upIndex < guardIndex, 'runtime env guard must run after compose up');
assert.ok(guardIndex < smokeIndex, 'authenticated smoke must run after runtime env guard');
assert.match(script, /RUN_SMOKE="auto"/);
assert.match(script, /--smoke\)/);
assert.match(script, /--skip-smoke\)/);
assert.match(script, /SMOKE_ADMIN_PASSWORD is required when --smoke is used/);
assert.match(script, /Skipping authenticated smoke because SMOKE_ADMIN_PASSWORD is not set/);

console.log('OK test-deploy-compose-script');
