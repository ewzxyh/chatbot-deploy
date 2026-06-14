#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github', 'workflows', 'deploy-checks.yml');

assert.ok(fs.existsSync(workflowPath), 'deploy-checks workflow must exist');

const workflow = fs.readFileSync(workflowPath, 'utf8');
const requiredSnippets = [
  'actions/checkout',
  'actions/setup-node',
  'node --check scripts/check-chat21-runtime-env.js',
  'bash -n scripts/deploy-compose.sh',
  'node scripts/test-chat21-runtime-env.js',
  'node scripts/test-deploy-compose-script.js',
  'node scripts/test-hardening-config.js',
  'node scripts/test-community-page-static.js',
  'node scripts/test-legal-pages-static.js',
  'node scripts/test-media-cdn-worker.js',
];

for (const snippet of requiredSnippets) {
  assert.ok(workflow.includes(snippet), `deploy-checks workflow must include: ${snippet}`);
}

console.log('OK test-ci-deploy-workflow');
