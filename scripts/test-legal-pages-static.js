#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pages = [
  { route: '/privacy', file: path.join(root, 'public', 'legal', 'privacy', 'index.html'), title: 'Política de Privacidade' },
  { route: '/terms', file: path.join(root, 'public', 'legal', 'terms', 'index.html'), title: 'Termos de Uso' },
  {
    route: '/data-deletion',
    file: path.join(root, 'public', 'legal', 'data-deletion', 'index.html'),
    title: 'Instrucoes para exclusao de dados'
  }
];

function read(file) {
  assert(fs.existsSync(file), `Missing file: ${file}`);
  return fs.readFileSync(file, 'utf8');
}

const nginx = read(path.join(root, 'proxy-nginx.conf'));
const compose = read(path.join(root, 'docker-compose.yml'));

/*
 * AC: paginas publicas de privacidade, termos e exclusao precisam estar disponiveis antes do fallback do dashboard.
 * Behavior: valida arquivos legais, rotas nginx, montagem docker e ausencia de dependencias externas obrigatorias.
 * @category: deployment-static
 */
for (const page of pages) {
  const html = read(page.file);
  assert(html.includes(page.title), `${page.route} should include title ${page.title}`);
  assert(html.includes('ChatCase'), `${page.route} should be branded ChatCase`);
  assert(html.includes('CASE PUBLICIDADE E PROPAGANDA LTDA'), `${page.route} should identify the company`);
  assert(html.includes('48.977.411/0001-68'), `${page.route} should identify the CNPJ`);
  assert(!/<script\b/i.test(html), `${page.route} should not include scripts`);
  assert(!/https?:\/\/fonts\./i.test(html), `${page.route} should not load external fonts`);
  assert(nginx.includes(`location = ${page.route}`), `Nginx should serve ${page.route}`);
}

assert(
  nginx.indexOf('location = /privacy') < nginx.indexOf('location / {'),
  'Legal pages must be declared before the dashboard fallback'
);
assert(
  compose.includes('./public/legal:/usr/share/nginx/html/legal:ro'),
  'Compose should mount legal static files into proxy'
);
assert(
  nginx.includes("script-src 'none'"),
  'Legal page CSP should block scripts'
);

console.log('OK legal pages static checks');
