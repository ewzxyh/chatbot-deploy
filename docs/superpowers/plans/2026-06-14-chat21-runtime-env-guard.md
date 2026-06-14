# Chat21 Runtime Env Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deploy smoke guard that detects Chat21 runtime env drift before `/chat` breaks.

**Architecture:** Keep the guard in the deploy repo as a standalone Node script, matching existing `scripts/*.js` operational checks. The script reads the expected env file, queries running Docker Compose services, compares only required values, and prints hashes/lengths rather than secret values.

**Tech Stack:** Node.js, Docker Compose CLI, standalone `assert` tests.

---

### Task 1: Runtime Env Guard

**Files:**
- Create: `scripts/check-chat21-runtime-env.js`
- Create: `scripts/test-chat21-runtime-env.js`
- Modify: `README.md`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-chat21-runtime-env.js` with two assertions:

```js
assert.notStrictEqual(mismatch.status, 0);
assert.match(mismatch.stdout + mismatch.stderr, /CHAT21_JWT_SECRET must match chat21httpserver JWT_KEY/);
assert.doesNotMatch(mismatch.stdout + mismatch.stderr, /server-secret|wrong-secret/);
assert.strictEqual(match.status, 0);
assert.match(match.stdout, /OK chat21 runtime env/);
```

- [ ] **Step 2: Verify red**

Run:

```bash
node scripts/test-chat21-runtime-env.js
```

Expected: fail because `scripts/check-chat21-runtime-env.js` does not exist yet.

- [ ] **Step 3: Implement guard**

Create `scripts/check-chat21-runtime-env.js` that:

```text
reads --env <file>
execs docker compose exec -T server/chat21httpserver/chat21server
compares server.CHAT21_JWT_SECRET, chat21httpserver.JWT_KEY, chat21server/web RABBITMQ_URI
prints only length and sha256 prefix for compared values
exits 1 on mismatch
```

- [ ] **Step 4: Verify green locally**

Run:

```bash
node scripts/test-chat21-runtime-env.js
```

Expected: pass.

- [ ] **Step 5: Verify against DEV VPS**

Run from `/opt/chatcase-dev/chatcase-tiledesk-deploy`:

```bash
node scripts/check-chat21-runtime-env.js --env .env.dev-vps
```

Expected: exit 0 and `OK chat21 runtime env`.

- [ ] **Step 6: Document deploy usage**

Add the guard to README smoke/deploy commands after `docker compose up -d --build`.
