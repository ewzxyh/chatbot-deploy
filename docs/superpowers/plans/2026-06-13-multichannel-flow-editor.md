# Multichannel Flow Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-align ChatCase flow creation with Tiledesk's original multichannel model: flows are channel-agnostic by default, while departments/instances choose which bot handles a channel and channel-specific actions are treated as action compatibility concerns.

**Architecture:** Keep chatbot templates and imported flows generic unless a template is explicitly marked as channel-exclusive. Preserve department `channel_bindings` for routing CaseZap/WABA instances to departments/bots. Avoid global action filtering in the Design Studio; add/keep compatibility metadata without forcing the whole flow into one channel.

**Tech Stack:** Node.js/Express/Mongoose in `tiledesk-server`, Angular dashboard in `tiledesk-dashboard`, Angular Design Studio in `chatcase-design-studio`, Docker Compose deployment in `chatcase-tiledesk-deploy`.

---

### Task 1: Confirm Current Channel Scope Sources

**Files:**
- Inspect: `C:/Users/enzo/tiledesk-server/pubmodules/chatbotTemplates/chatcaseTemplates.js`
- Inspect: `C:/Users/enzo/tiledesk-server/routes/faq_kb.js`
- Inspect: `C:/Users/enzo/tiledesk-dashboard/src/app/chatbot-design-studio/cds-dashboard/cds-dashboard.component.ts`
- Inspect: `C:/Users/enzo/chatcase-design-studio/src/app/chatbot-design-studio`

- [x] **Step 1: Search for channel-scope state**

Run:
```powershell
rg -n "targetChannel|selectedChannel|exclusiveChannel|isChannelExclusive|channelScope|Canal do fluxo|Canal exclusivo" C:\Users\enzo\tiledesk-server C:\Users\enzo\tiledesk-dashboard C:\Users\enzo\chatcase-design-studio
```

Expected: channel scope exists only in template import/detail compatibility and the dashboard embedded CDS header; Design Studio source should not force a channel badge.

- [x] **Step 2: Compare with upstream**

Run:
```powershell
git -C C:\Users\enzo\chatcase-design-studio grep -n "createActionListByCategory" tiledesk-upstream/master -- src/app/chatbot-design-studio
git -C C:\Users\enzo\tiledesk-dashboard grep -n "selectedChannel|channelCompatibility" tiledesk-upstream/master -- src/app/bots src/app/chatbot-design-studio src/app/services
```

Expected: upstream action palette is global by category and upstream has no project-wide flow channel marker.

### Task 2: Remove Artificial Flow Channel Scope

**Files:**
- Modify: `C:/Users/enzo/tiledesk-server/pubmodules/chatbotTemplates/chatcaseTemplates.js`
- Modify: `C:/Users/enzo/tiledesk-server/routes/faq_kb.js`
- Test: `C:/Users/enzo/tiledesk-server/test/chatcaseTemplates.js`

- [x] **Step 1: Write/extend tests for stale scope cleanup**

Add assertions that a template with `targetChannel: "casezap"` but without `exclusiveChannel` remains `all`, and that `prepareTemplateForChannel(template, "casezap")` does not persist `targetChannel`, `selectedChannel`, or `channelScopeMode`.

- [x] **Step 2: Keep implementation minimal**

Only explicit flags may make a flow channel-exclusive:
```js
attributes.exclusiveChannel === true || attributes.isChannelExclusive === true
```

Legacy fields by themselves must be treated as stale metadata and removed from prepared payloads.

- [x] **Step 3: Run server template tests**

Run:
```powershell
npm test -- --grep "ChatCase chatbot templates"
```

Expected: tests covering multichannel defaults pass.

### Task 3: Keep Builder Actions Multichannel

**Files:**
- Inspect/modify only if needed: `C:/Users/enzo/chatcase-design-studio/src/app/chatbot-design-studio/cds-dashboard/cds-canvas/cds-panel-elements/cds-panel-elements.component.ts`
- Inspect/modify only if needed: `C:/Users/enzo/tiledesk-dashboard/src/app/chatbot-design-studio/cds-dashboard/cds-dashboard.component.html`

- [x] **Step 1: Verify no channel filtering in the action palette**

Run:
```powershell
rg -n "selectedChannel|targetChannel|supportedChannels|Canal do fluxo" C:\Users\enzo\chatcase-design-studio\src
```

Expected: no Design Studio source-level channel restriction.

- [x] **Step 2: Hide any flow channel badge unless explicit**

If a badge is rendered by dashboard-embedded CDS, keep:
```html
*ngIf="selectedChannel && selectedChannel !== 'all'"
```
and make the text `Canal exclusivo`, not `Canal do fluxo`.

### Task 4: Validate Department/Instance Routing

**Files:**
- Inspect: `C:/Users/enzo/tiledesk-server/models/department.js`
- Inspect: `C:/Users/enzo/tiledesk-server/services/departmentService.js`
- Inspect: `C:/Users/enzo/tiledesk-server/pubmodules/casezap/connector.js`
- Test: `C:/Users/enzo/tiledesk-server/test/departmentChannelBinding*.test.js`

- [x] **Step 1: Confirm department bindings are the channel/instance selector**

Run:
```powershell
rg -n "channel_bindings|getDepartmentByChannelBinding|skipDepartmentBot|id_bot" C:\Users\enzo\tiledesk-server
```

Expected: CaseZap incoming requests use `channel_bindings` to choose a department and that department's `id_bot`.

- [x] **Step 2: Run department binding tests**

Run:
```powershell
npm test -- --grep "department.*channel"
```

Expected: route/service tests for bindings pass.

### Task 5: Deploy to DEV and Browser-Validate

**Files:**
- Deploy scope: `C:/Users/enzo/chatcase-tiledesk-deploy`

- [ ] **Step 1: Push changed repos**

Run scoped `git status`, stage only intended files, commit, and push each changed repo.

- [ ] **Step 2: Update DEV VPS**

SSH to `69.6.250.104:22022`, pull changed repositories, rebuild only ChatCase containers, and do not touch WordPress or CloudPanel.

- [ ] **Step 3: Browser validate**

Open:
```text
http://69.6.250.104:18081/dashboard/#/project/69ed3b00ea616400130956dc/bots/my-chatbots/all
http://69.6.250.104:18081/cds/#/project/69ed3b00ea616400130956dc/chatbot/<bot_id>/blocks
```

Expected: flow list and editor do not show a forced `Canal do fluxo: CaseZap` badge for ordinary flows.

### Task 6: CaseZap Runtime Smoke

**Files:**
- Runtime only; no code files unless a bug is found.

- [ ] **Step 1: Create two simple flows**

Create one simple text-response flow intended for `markus-chatcase` and one simple text-response flow intended for `Lovtok`. Do not add channel-exclusive metadata.

- [ ] **Step 2: Bind flows by department/instance**

Configure departments so each CaseZap instance points to a different department/bot through `channel_bindings`.

- [ ] **Step 3: Send messages only between connected numbers**

Send a unique text from `markus-chatcase` to `Lovtok`, and from `Lovtok` to `markus-chatcase`.

Expected: each conversation appears in `/chat`, each bot response comes from the department-bound flow, and no global flow channel badge is required.

- [ ] **Step 4: Disable test flows**

After validation, detach or disable the test flows so they do not keep answering real conversations.

### Review Checklist

- [ ] New/imported flows are multichannel unless explicitly marked exclusive.
- [ ] Design Studio action list remains global like upstream Tiledesk.
- [ ] Department/instance binding is the supported way to choose which bot handles a CaseZap/WABA number.
- [ ] DEV bundle matches current code.
- [ ] CaseZap smoke proves `Lovtok` and `markus-chatcase` can route to different flows without flow-level channel scoping.
