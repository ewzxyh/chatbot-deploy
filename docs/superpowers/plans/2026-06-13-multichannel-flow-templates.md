# Multichannel Flow Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Keep ChatCase flow templates channel-agnostic by default, matching Tiledesk's generic flow model, while preserving explicit channel scoping only when the user chooses a specific target channel.

**Architecture:** Template data stays multichannel unless a request explicitly provides a concrete channel. Generic flow actions remain available for all channels. Channel-specific actions, such as WABA template actions, are filtered only when a template is explicitly imported for a channel that cannot execute them.

**Tech Stack:** Static community gallery JavaScript, Node integration scripts, Tiledesk server template module, Angular dashboard template import, Docker/VPS DEV validation.

---

- [ ] Verify current repository state and existing multichannel changes.
  - Verify: `git status --short --branch` in deploy, dashboard, server, design studio.

- [ ] Confirm Tiledesk source model from docs/upstream.
  - Verify: generic Reply actions are not channel-scoped, while WhatsApp template actions are channel-specific.

- [ ] Remove implicit CaseZap default from the public template gallery.
  - Files: `public/community/assets/community.js`.
  - Behavior: no `channel` query parameter for the default "all channels" path.
  - Behavior: explicit `channel=casezap` or `channel=waba` still fetches/imports scoped variants.

- [ ] Update static/API checks to encode the new behavior.
  - Files: `scripts/test-community-page-static.js`, `scripts/test-chatbot-template-gallery-api.js`.
  - Verify: fork without `channel` remains multichannel; `channel=all` is treated as multichannel/no-op rather than an error.

- [ ] Run targeted tests locally.
  - Verify: `node scripts/test-community-page-static.js`.
  - Verify: API template script if a full ChatCase stack is available.

- [ ] Commit/push the deploy fix and deploy to VPS DEV.
  - Verify: `/community/` and `/cds/` on `69.6.250.104:18081` no longer force CaseZap.

- [ ] Test CaseZap flow behavior with DEV instances only.
  - Instances: Lovtok and markus-chatcase.
  - Verify: create or reuse one CaseZap-safe flow per instance, bind in department/settings if required, send messages only between the two connected numbers, then disable test bindings.
