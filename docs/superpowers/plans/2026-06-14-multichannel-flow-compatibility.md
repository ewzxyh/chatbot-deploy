# Multichannel Flow Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish and verify the ideal ChatCase flow behavior where flows remain multichannel by default, channel-specific WABA actions are explicit in the builder, and CaseZap receives a safe text fallback at runtime.

**Architecture:** The flow builder should not force every flow into one channel. Channel scope is only shown when a flow/template is explicitly exclusive, while the server runtime adapts unsupported WABA directives for CaseZap conversations. Department/instance binding remains the operational way to choose which bot answers which connected channel.

**Tech Stack:** Tiledesk server Node.js tests with Mocha, Angular dashboard/design-studio frontends, Docker Compose DEV VPS at `69.6.250.104:18081`.

---

### Task 1: Verify Existing Scope Rules

**Files:**
- Inspect: `C:/Users/enzo/chatcase-tiledesk-dashboard/src/app/chatbot-design-studio/cds-dashboard/cds-dashboard.component.ts`
- Inspect: `C:/Users/enzo/chatcase-design-studio/src/app/chatbot-design-studio/utils-actions.ts`
- Inspect: `C:/Users/enzo/chatcase-tiledesk-server/pubmodules/tilebot/channelActionCompatibility.js`

- [ ] **Step 1: Confirm dashboard does not force a channel**

Run:

```powershell
Select-String -Path "C:/Users/enzo/chatcase-tiledesk-dashboard/src/app/chatbot-design-studio/cds-dashboard/cds-dashboard.component.ts" -Pattern "exclusiveChannel|isChannelExclusive|selectedChannel = 'all'" -Context 2,2
```

Expected: `selectedChannel` defaults to `all`, and channel badge only appears when `exclusiveChannel` or `isChannelExclusive` is true.

- [ ] **Step 2: Confirm WABA-specific action badges**

Run:

```powershell
Select-String -Path "C:/Users/enzo/chatcase-design-studio/src/app/chatbot-design-studio/utils-actions.ts" -Pattern "channelBadge|WabaSpecific|WHATSAPP_STATIC|WHATSAPP_ATTRIBUTE|SEND_WHATSAPP" -Context 2,2
```

Expected: WABA-native actions expose `channelBadge` or are covered by backend fallback tests.

### Task 2: Verify Runtime Fallback With Tests

**Files:**
- Test: `C:/Users/enzo/chatcase-tiledesk-server/test/tilebotChannelActionCompatibility.test.js`
- Test: `C:/Users/enzo/chatcase-tiledesk-server/test/chatcaseTemplates.js`
- Source: `C:/Users/enzo/chatcase-tiledesk-server/pubmodules/tilebot/channelActionCompatibility.js`

- [ ] **Step 1: Run focused backend tests**

Run:

```powershell
cd C:/Users/enzo/chatcase-tiledesk-server
./node_modules/.bin/mocha.cmd ./test/casezap/connector.test.js ./test/departmentChannelBinding.test.js ./test/chatcaseTemplates.js ./test/tilebotChannelActionCompatibility.test.js --exit
```

Expected: all tests pass, including CaseZap fallback and WABA-native preservation.

- [ ] **Step 2: Run diff hygiene**

Run:

```powershell
git -C C:/Users/enzo/chatcase-tiledesk-server diff --check
git -C C:/Users/enzo/chatcase-design-studio diff --check
git -C C:/Users/enzo/chatcase-tiledesk-dashboard diff --check
```

Expected: no whitespace errors in touched files.

### Task 3: Verify DEV VPS Surface

**Files:**
- Inspect: `C:/Users/enzo/chatcase-tiledesk-deploy/docker-compose*.yml`
- Runtime: `http://69.6.250.104:18081/dashboard/`
- Runtime: `http://69.6.250.104:18081/cds/`
- Runtime: `http://69.6.250.104:18081/chat/`

- [ ] **Step 1: HTTP smoke**

Run:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri "http://69.6.250.104:18081/dashboard/" -TimeoutSec 15
Invoke-WebRequest -UseBasicParsing -Uri "http://69.6.250.104:18081/cds/" -TimeoutSec 15
```

Expected: both return HTTP 200.

- [ ] **Step 2: Authenticated browser E2E**

Open `http://69.6.250.104:18081/dashboard/`, login with the test user, open project `Ewzxyh`, verify:

```text
1. Flow list remains multichannel by default.
2. CaseZap-specific department/instance binding is visible where configured.
3. WABA-specific actions are visible but marked as WABA-native.
4. CaseZap does not require a separate flow type to receive safe text fallback.
```

Expected: UI behavior matches the multichannel decision and no stale "Canal do fluxo: CaseZap" appears for generic flows.

### Task 4: Publish Only If New Changes Are Needed

**Files:**
- Any files changed by Tasks 1-3.

- [ ] **Step 1: Check current dirty state**

Run:

```powershell
git -C C:/Users/enzo/chatcase-tiledesk-server status --short --branch
git -C C:/Users/enzo/chatcase-design-studio status --short --branch
git -C C:/Users/enzo/chatcase-tiledesk-dashboard status --short --branch
```

Expected: only intended files are staged or changed; unrelated files remain untouched.

- [ ] **Step 2: Commit and push scoped changes**

Run only when there are new intended edits:

```powershell
git add <intended files>
git commit -m "<scoped message>"
git push
```

Expected: remote branch receives only the intended scope.
