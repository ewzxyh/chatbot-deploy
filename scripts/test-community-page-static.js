#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = {
  html: path.join(root, 'public', 'community', 'index.html'),
  css: path.join(root, 'public', 'community', 'assets', 'community.css'),
  js: path.join(root, 'public', 'community', 'assets', 'community.js'),
  nginx: path.join(root, 'proxy-nginx.conf'),
  compose: path.join(root, 'docker-compose.yml')
};

function read(file) {
  assert(fs.existsSync(file), `Missing file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

const html = read(files.html);
const css = read(files.css);
const js = read(files.js);
const nginx = read(files.nginx);
const compose = read(files.compose);

/*
 * AC: A pagina publica da Community precisa ser white-label, servida pelo proxy e consumir a API local.
 * Behavior: valida arquivos estaticos, rota nginx, montagem docker, endpoints locais e ausencia de assets externos obrigatorios.
 * @category: deployment-static
 */
assert(html.includes('ChatCase Community'), 'HTML should be branded ChatCase');
assert(html.includes('https://chatcase.com.br/community/'), 'HTML should declare the final public community URL');
assert(html.includes('/community/assets/community.css'), 'HTML should load local CSS');
assert(html.includes('/community/assets/community.js'), 'HTML should load local JS');
assert(html.includes('/dashboard/assets/img/logos/chatcase-logo.svg'), 'HTML should use local ChatCase logo');
assert(!/https?:\/\/fonts\./i.test(html + css + js), 'Community page should not depend on external font hosts');
assert(js.includes('/api/modules/templates/public/templates'), 'JS should consume public templates API');
assert(js.includes('/api/modules/templates/public/community'), 'JS should keep community API fallback');
assert(js.includes("params.set('template'"), 'JS should support public template query links');
assert(js.includes('/dashboard/#/projects?'), 'JS should route template installs through the protected projects page');
assert(js.includes("params.set('install', '1')") && js.includes("params.set('source', 'community')"), 'JS should preserve direct community install intent');
assert(js.includes("selectedChannel !== 'all'"), 'JS should only add channel query params for explicit channel installs');
assert(js.includes('hasExplicitChannelScope'), 'JS should distinguish explicit channel-exclusive templates from multichannel templates');
assert(js.includes('exclusiveChannel === true') && js.includes('isChannelExclusive === true'), 'JS should only honor stored template channel when exclusivity is explicit');
assert(js.includes("initialParams.get('channel')"), 'JS should initialize the community channel filter from URL query');
assert(js.includes("url.searchParams.set('channel'"), 'JS should preserve selected channel in public links');
assert(!js.includes("return 'casezap';"), 'JS should not default public template installs to CaseZap');
assert(js.includes('chatcase-ecommerce-orders'), 'JS fallback should include ecommerce template');
assert(js.includes('chatcase-clinic-scheduling'), 'JS fallback should include clinic template');
assert(js.includes('chatcase-restaurant-delivery'), 'JS fallback should include restaurant delivery template');
assert(js.includes('chatcase-real-estate-leads'), 'JS fallback should include real estate template');
assert(js.includes('chatcase-education-courses'), 'JS fallback should include education template');
assert(js.includes('/export'), 'JS should expose template JSON export links');
assert(nginx.includes('location /community/'), 'Nginx should serve /community/');
assert(nginx.includes('try_files $uri $uri/ /community/index.html'), 'Nginx should fallback to community index');
assert(nginx.includes("script-src 'self'"), 'Nginx CSP should avoid unsafe inline scripts for community');
assert(compose.includes('./public/community:/usr/share/nginx/html/community:ro'), 'Compose should mount community static files into proxy');
assert(compose.includes('./cds-rebrand.sh:/docker-entrypoint.d/99-cds-rebrand.sh:ro'), 'Compose should run CDS rebrand patch');

const cdsRebrand = read(path.join(root, 'cds-rebrand.sh'));
assert(cdsRebrand.includes('chatcase-cds-channel-guard.js'), 'CDS rebrand should inject runtime guard');
assert(cdsRebrand.includes('Template WABA'), 'CDS rebrand should rename WABA-specific actions');
assert(!cdsRebrand.includes('Compatibilidade:'), 'CDS guard should not render a global channel compatibility badge');
assert(!cdsRebrand.includes('data-chatcase-channel-hidden'), 'CDS guard should not hide actions by global channel');
assert(!cdsRebrand.includes("return 'casezap';"), 'CDS guard should not default flows to CaseZap');
assert(cdsRebrand.includes('removeChannelBadge'), 'CDS guard should remove stale channel badges from older bundles');
assert(cdsRebrand.includes('chatcase-cds-runtime-fixes'), 'CDS guard should inject runtime overlay fixes');
assert(cdsRebrand.includes('removeExternalSplashFrames'), 'CDS guard should remove external splash iframes blocked by CSP');
assert(cdsRebrand.includes('20260613-multichannel1'), 'CDS guard version should be bumped after multichannel runtime fix');

console.log('OK community page static checks');
