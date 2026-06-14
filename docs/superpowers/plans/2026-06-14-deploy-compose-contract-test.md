# Deploy Compose Contract Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static regression test that proves the guarded deploy wrapper keeps the required safety order before a ChatCase compose deployment is considered valid.

**Architecture:** Keep the change inside the deploy repository. The test reads `scripts/deploy-compose.sh` and asserts the wrapper validates compose config, starts the stack, runs `scripts/check-chat21-runtime-env.js` after `docker compose up`, and only then handles the optional authenticated smoke.

**Tech Stack:** Node.js built-in `assert`, `fs`, `path`; Bash deploy wrapper; GitHub Actions static deploy checks.

---

### Task 1: Lock the Deploy Wrapper Contract

**Files:**
- Create: `scripts/test-deploy-compose-script.js`
- Modify: `.github/workflows/deploy-checks.yml`
- Modify: `scripts/test-ci-deploy-workflow.js`

- [ ] **Step 1: Write the static deploy wrapper test**

Create `scripts/test-deploy-compose-script.js` with assertions for command ordering and smoke behavior:

```js
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
```

- [ ] **Step 2: Run the new test and confirm it passes**

Run:

```bash
node scripts/test-deploy-compose-script.js
```

Expected output:

```text
OK test-deploy-compose-script
```

- [ ] **Step 3: Add the test to CI**

Add `node scripts/test-deploy-compose-script.js` to the `Run static deploy tests` step in `.github/workflows/deploy-checks.yml`.

- [ ] **Step 4: Extend the workflow self-test**

Add `'node scripts/test-deploy-compose-script.js'` to the `requiredSnippets` array in `scripts/test-ci-deploy-workflow.js`.

- [ ] **Step 5: Run the deploy static verification suite**

Run:

```bash
node --check scripts/check-chat21-runtime-env.js
bash -n scripts/deploy-compose.sh
node scripts/test-chat21-runtime-env.js
node scripts/test-deploy-compose-script.js
node scripts/test-ci-deploy-workflow.js
node scripts/test-hardening-config.js
node scripts/test-community-page-static.js
node scripts/test-legal-pages-static.js
node scripts/test-media-cdn-worker.js
```

Expected result: every command exits with code 0.

- [ ] **Step 6: Commit and push**

Run:

```bash
git status --short
git add docs/superpowers/plans/2026-06-14-deploy-compose-contract-test.md scripts/test-deploy-compose-script.js .github/workflows/deploy-checks.yml scripts/test-ci-deploy-workflow.js
git commit -m "ci: lock deploy wrapper contract"
git push
```

Expected result: commit is created on `main` and pushed to `origin/main`.

## Self-Review

- Spec coverage: the plan covers static proof that `deploy-compose.sh` keeps compose validation, stack start, Chat21 runtime guard, and optional smoke in the intended sequence.
- Placeholder scan: no placeholders remain.
- Type consistency: all referenced files and commands match existing repo paths and Node/Bash usage.
