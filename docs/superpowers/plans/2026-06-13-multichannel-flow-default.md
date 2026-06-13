# Multichannel Flow Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ChatCase flow creation and editing behave like the original Tiledesk model: flows are multichannel by default, and channel-specific behavior is handled as compatibility/fallback instead of forcing every flow to be CaseZap.

**Architecture:** Keep flow identity neutral unless the user explicitly scopes a flow to one channel. Preserve template compatibility metadata for preview/validation, but do not persist `targetChannel`/`selectedChannel` for generic templates. Legacy `targetChannel`/`selectedChannel` values alone are treated as stale metadata; only `channelScopeMode: "exclusive"` or equivalent flags make a flow channel-exclusive. Existing stale CaseZap-scoped bots on dev should be repaired so the editor opens without a CaseZap-only badge.

**Tech Stack:** Angular dashboard, Angular design-studio, Node/Express Tiledesk server, MongoDB, Docker Compose dev VPS.

---

### Task 1: Verify Current Channel Scope Sources

**Files:**
- Inspect: `C:\Users\enzo\tiledesk-dashboard\src\app\chatbot-design-studio\cds-dashboard\cds-dashboard.component.ts`
- Inspect: `C:\Users\enzo\tiledesk-dashboard\src\app\chatbot-design-studio\cds-dashboard\cds-dashboard.component.html`
- Inspect: `C:\Users\enzo\chatcase-design-studio\src\app\chatbot-design-studio`
- Inspect: `C:\Users\enzo\tiledesk-server\pubmodules\chatbotTemplates\chatcaseTemplates.js`

- [x] **Step 1: Search for persisted channel scope**

Run:

```powershell
rg -n "targetChannel|selectedChannel|Canal do fluxo|Canal exclusivo|channelCompatibility" C:\Users\enzo\tiledesk-dashboard\src C:\Users\enzo\chatcase-design-studio\src C:\Users\enzo\tiledesk-server
```

Expected: only template compatibility code and optional scoped-channel UI remain; no unconditional CaseZap default should exist.

- [ ] **Step 2: Compare the currently deployed dev bundle**

Run:

```powershell
ssh -p 22022 root@69.6.250.104 "cd /opt/chatcase-dev/chatcase-tiledesk-deploy && docker compose ps && grep -R \"Canal do fluxo\" -n . 2>/dev/null | head -20"
```

Expected: if the string exists only in built bundles or stale source on VPS, rebuild/redeploy is required.

### Task 2: Keep Generic Templates Multichannel

**Files:**
- Modify if needed: `C:\Users\enzo\tiledesk-server\pubmodules\chatbotTemplates\chatcaseTemplates.js`
- Test if present: `C:\Users\enzo\tiledesk-server\test\chatcaseTemplates*.js`

- [x] **Step 1: Add/verify server test for default channel**

Behavior to prove:

```js
// Generic templates with multiple compatible channels return "all".
expect(getDefaultChannel(multichannelTemplate)).toBe('all');
// Preparing with no channel does not set targetChannel or selectedChannel.
expect(prepared.attributes.targetChannel).toBeUndefined();
expect(prepared.attributes.selectedChannel).toBeUndefined();
```

- [x] **Step 2: Keep channel-specific preparation explicit**

Implementation rule:

```js
if (!normalizedChannel || normalizedChannel === 'all') {
  delete prepared.attributes.targetChannel;
  delete prepared.attributes.selectedChannel;
  delete prepared.attributes.channelScopeMode;
  return prepared;
}
```

Expected: selecting a concrete channel still filters metadata; importing without channel remains multichannel.

- [x] **Step 3: Ignore stale channel fields unless scope is explicit**

Implementation rule:

```js
if (isExplicitChannelScope(attributes) && explicitChannel !== 'all') {
  return explicitChannel;
}
```

Expected: old bots/templates that only contain `targetChannel: "casezap"` still behave as multichannel.

### Task 3: Remove Forced Channel Badge From Editor

**Files:**
- Modify if needed: `C:\Users\enzo\tiledesk-dashboard\src\app\chatbot-design-studio\cds-dashboard\cds-dashboard.component.ts`
- Modify if needed: `C:\Users\enzo\tiledesk-dashboard\src\app\chatbot-design-studio\cds-dashboard\cds-dashboard.component.html`
- Modify if needed: `C:\Users\enzo\chatcase-design-studio\src\app\chatbot-design-studio`

- [x] **Step 1: Make badge semantics explicit**

Desired rule:

```ts
const scopedChannel = this.normalizeTemplateChannel(attributes.targetChannel || attributes.selectedChannel);
this.selectedChannel = isExplicitChannelScope(attributes) && scopedChannel !== 'all' ? scopedChannel : 'all';
```

Desired UI:

```html
<div class="cds-channel-badge" *ngIf="selectedChannel && selectedChannel !== 'all'">
  Canal exclusivo: {{ getSelectedChannelLabel() }}
</div>
```

Expected: no badge appears for `all`; badge appears only for truly scoped bots.

- [x] **Step 2: Ensure action list is not filtered by selected channel**

Behavior to prove:

```ts
isActionCompatible(): boolean {
  return true;
}
```

Expected: WABA/WhatsApp action nodes remain visible, but their real compatibility must be validated later at publish/runtime.

### Task 4: Repair Stale Dev Bot Metadata

**Files:**
- Use Docker/Mongo on VPS dev only.

- [ ] **Step 1: Inspect the bot attributes**

Run:

```powershell
ssh -p 22022 root@69.6.250.104 "cd /opt/chatcase-dev/chatcase-tiledesk-deploy && docker compose exec -T mongo mongosh tiledesk --quiet --eval 'db.faq_kb.find({_id:ObjectId(\"6a0bc45ab6f45f00130e22ef\")},{name:1,attributes:1}).pretty()'"
```

Expected: if `attributes.targetChannel` or `attributes.selectedChannel` is `casezap`, this is stale metadata.

- [ ] **Step 2: Clear only stale scope fields**

Run only after confirming the fields are present:

```powershell
ssh -p 22022 root@69.6.250.104 "cd /opt/chatcase-dev/chatcase-tiledesk-deploy && docker compose exec -T mongo mongosh tiledesk --quiet --eval 'db.faq_kb.updateOne({_id:ObjectId(\"6a0bc45ab6f45f00130e22ef\")},{\$unset:{\"attributes.targetChannel\":\"\",\"attributes.selectedChannel\":\"\"}})'"
```

Expected: the existing flow opens as multichannel without changing intents/actions.

### Task 5: Validate With CaseZap Dev Instances

**Files:**
- Runtime only: `http://69.6.250.104:18081`

- [ ] **Step 1: Rebuild/redeploy dev if source changed**

Run:

```powershell
ssh -p 22022 root@69.6.250.104 "cd /opt/chatcase-dev/chatcase-tiledesk-deploy && git pull --ff-only && docker compose up -d --build"
```

Expected: dev stack restarts without touching production.

- [ ] **Step 2: Browser validation**

Open:

```text
http://69.6.250.104:18081/cds/#/project/69ed3b00ea616400130956dc/chatbot/6a0bc45ab6f45f00130e22ef/blocks
```

Expected:
- the flow editor renders;
- no `Canal do fluxo: CaseZap` badge appears for the generic template;
- action nodes remain available.

- [ ] **Step 3: CaseZap smoke between Lovtok and markus-chatcase**

Use only the dev VPS project `Ewzxyh` and CaseZap numbers:
- Lovtok: `556295359231`
- markus-chatcase: `5585958546364`

Expected:
- inbound messages from each number appear in `/chat`;
- disabling any test flow leaves both instances without forced bot routing;
- no WABA-only runtime test is required until a WABA account is connected.

### Task 6: Commit And Push

**Files:**
- Commit only modified repositories.

- [ ] **Step 1: Review diffs**

Run:

```powershell
git -C C:\Users\enzo\tiledesk-dashboard diff --stat
git -C C:\Users\enzo\chatcase-design-studio diff --stat
git -C C:\Users\enzo\tiledesk-server diff --stat
git -C C:\Users\enzo\chatcase-tiledesk-deploy diff --stat
```

Expected: every changed file maps to this plan.

- [ ] **Step 2: Commit per repository**

Use scoped commits such as:

```powershell
git -C C:\Users\enzo\tiledesk-dashboard add <files>
git -C C:\Users\enzo\tiledesk-dashboard commit -m "fix: keep flow editor multichannel"
git -C C:\Users\enzo\tiledesk-dashboard push
```

Expected: no unrelated user changes are committed.
