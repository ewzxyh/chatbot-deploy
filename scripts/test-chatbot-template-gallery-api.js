#!/usr/bin/env node

const assert = require('assert');
const http = require('http');
const https = require('https');

const EXPECTED_TEMPLATES = [
  {
    id: 'chatcase-whatsapp-menu-basic',
    intents: ['defaultFallback', 'start', 'menu', 'plans', 'human_handoff'],
    questions: {
      start: '\\start',
      plans: '1',
      human_handoff: '2'
    },
    buttons: {
      start: ['Ver planos', 'Falar atendente'],
      menu: ['Ver planos', 'Falar atendente'],
      plans: ['Falar atendente', 'Menu']
    },
    aliases: {
      plans: ['Ver planos'],
      human_handoff: ['Falar atendente', 'Atendente']
    }
  },
  {
    id: 'chatcase-ecommerce-orders',
    intents: ['defaultFallback', 'start', 'menu', 'order_status', 'exchange_return', 'human_handoff'],
    questions: {
      start: '\\start',
      order_status: '1',
      exchange_return: '2',
      human_handoff: '3'
    },
    buttons: {
      start: ['Status pedido', 'Trocas', 'Atendente'],
      menu: ['Status pedido', 'Trocas', 'Atendente']
    },
    aliases: {
      order_status: ['Status pedido', 'Pedido', 'Entrega'],
      exchange_return: ['Trocas', 'Devolucao', 'Trocas ou devolucoes'],
      human_handoff: ['Atendente', 'Falar com atendente']
    }
  },
  {
    id: 'chatcase-clinic-scheduling',
    intents: ['defaultFallback', 'start', 'menu', 'schedule', 'prices', 'human_handoff'],
    questions: {
      start: '\\start',
      schedule: '1',
      prices: '2',
      human_handoff: '3'
    },
    buttons: {
      start: ['Agendar', 'Valores', 'Recepcao'],
      menu: ['Agendar', 'Valores', 'Recepcao']
    },
    aliases: {
      schedule: ['Agendar', 'Agendar horario'],
      prices: ['Valores', 'Convenios', 'Valores e convenios'],
      human_handoff: ['Recepcao', 'Falar com recepcao']
    }
  },
  {
    id: 'chatcase-restaurant-delivery',
    intents: ['defaultFallback', 'start', 'menu', 'menu_link', 'hours_delivery', 'order_status', 'human_handoff'],
    questions: {
      start: '\\start',
      menu_link: '1',
      hours_delivery: '2',
      order_status: '3',
      human_handoff: '4'
    },
    buttons: {
      start: ['Cardapio', 'Horario', 'Pedido', 'Atendente'],
      menu: ['Cardapio', 'Horario', 'Pedido', 'Atendente']
    },
    aliases: {
      menu_link: ['Cardapio', 'Ver cardapio'],
      hours_delivery: ['Horario', 'Horario e entrega', 'Entrega'],
      order_status: ['Pedido', 'Status do pedido', 'Status pedido'],
      human_handoff: ['Atendente', 'Falar com atendente']
    }
  },
  {
    id: 'chatcase-real-estate-leads',
    intents: ['defaultFallback', 'start', 'menu', 'buy_property', 'rent_property', 'schedule_visit', 'human_handoff'],
    questions: {
      start: '\\start',
      buy_property: '1',
      rent_property: '2',
      schedule_visit: '3',
      human_handoff: '4'
    },
    buttons: {
      start: ['Comprar', 'Alugar', 'Visita', 'Corretor'],
      menu: ['Comprar', 'Alugar', 'Visita', 'Corretor']
    },
    aliases: {
      buy_property: ['Comprar', 'Comprar imovel'],
      rent_property: ['Alugar', 'Alugar imovel'],
      schedule_visit: ['Visita', 'Agendar visita'],
      human_handoff: ['Corretor', 'Falar com corretor']
    }
  },
  {
    id: 'chatcase-education-courses',
    intents: ['defaultFallback', 'start', 'menu', 'courses', 'pricing', 'enrollment', 'human_handoff'],
    questions: {
      start: '\\start',
      courses: '1',
      pricing: '2',
      enrollment: '3',
      human_handoff: '4'
    },
    buttons: {
      start: ['Cursos', 'Valores', 'Matricula', 'Consultor'],
      menu: ['Cursos', 'Valores', 'Matricula', 'Consultor']
    },
    aliases: {
      courses: ['Cursos', 'Ver cursos'],
      pricing: ['Valores', 'Valores e bolsas', 'Bolsas'],
      enrollment: ['Matricula', 'Fazer matricula'],
      human_handoff: ['Consultor', 'Falar com consultor']
    }
  }
];

function parseArgs(argv) {
  const args = {};

  for (let index = 2; index < argv.length; index += 1) {
    const part = argv[index];

    if (!part.startsWith('--')) {
      continue;
    }

    const [rawKey, rawValue] = part.slice(2).split('=');
    const key = rawKey.trim();
    let value = rawValue;

    if (value === undefined && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      value = argv[index + 1];
      index += 1;
    }

    args[key] = value === undefined ? true : value;
  }

  return args;
}

function normalizeBaseUrl(value) {
  return (value || 'http://localhost:8081').replace(/\/$/, '');
}

function normalizePrefix(prefix) {
  if (!prefix || prefix === '/') {
    return '';
  }

  return prefix.startsWith('/') ? prefix.replace(/\/$/, '') : `/${prefix.replace(/\/$/, '')}`;
}

function authHeader(email, password) {
  return `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`;
}

function requestJson({ method, url, auth, payload }) {
  const target = new URL(url);
  const body = payload === undefined ? null : JSON.stringify(payload);
  const client = target.protocol === 'https:' ? https : http;
  const headers = {};

  if (auth) {
    headers.Authorization = authHeader(auth.email, auth.password);
  }

  if (body !== null) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  const options = {
    method,
    hostname: target.hostname,
    port: target.port || undefined,
    path: `${target.pathname}${target.search}`,
    headers
  };

  return new Promise((resolve, reject) => {
    const req = client.request(options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed = raw;

        try {
          parsed = raw ? JSON.parse(raw) : null;
        } catch (error) {
          parsed = raw;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const message = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
          reject(new Error(`${method} ${url} failed with HTTP ${res.statusCode}: ${message}`));
          return;
        }

        resolve(parsed);
      });
    });

    req.on('error', reject);

    if (body !== null) {
      req.write(body);
    }

    req.end();
  });
}

async function cleanupProject({ baseUrl, apiPrefix, projectId, auth }) {
  if (!projectId) {
    return;
  }

  try {
    await requestJson({
      method: 'DELETE',
      url: `${baseUrl}${apiPrefix}/projects/${encodeURIComponent(projectId)}/physical`,
      auth
    });
  } catch (error) {
    console.warn(`WARN cleanup project failed: ${error.message}`);
  }
}

function getIntentButtons(intent) {
  const commands = (intent.actions || [])
    .flatMap((action) => action.attributes && action.attributes.commands || []);
  const messageCommand = commands.find((command) => command.type === 'message' && command.message);
  const buttons = messageCommand &&
    messageCommand.message.attributes &&
    messageCommand.message.attributes.attachment &&
    messageCommand.message.attributes.attachment.buttons || [];

  return buttons.map((button) => button.value || button.label || button.title);
}

function assertNativeInteractions(payload, templateId) {
  assert.strictEqual(
    payload.attributes && payload.attributes.nativeInteractions && payload.attributes.nativeInteractions.whatsapp,
    'buttons',
    `template ${templateId} should mark WhatsApp native buttons`
  );
  assert.strictEqual(
    payload.attributes && payload.attributes.nativeInteractions && payload.attributes.nativeInteractions.casezap,
    'menu',
    `template ${templateId} should mark CaseZap native menu`
  );
}

function assertIntentButtons(intent, expectedButtons, label) {
  assert.deepStrictEqual(getIntentButtons(intent), expectedButtons, `${label} should preserve native buttons`);
}

function assertIntentAliases(intent, expectedAliases, label) {
  const aliases = intent.attributes && intent.attributes.aliases || [];
  expectedAliases.forEach((alias) => {
    assert(aliases.includes(alias), `${label} should include alias ${alias}`);
  });
}

async function run() {
  const args = parseArgs(process.argv);
  const baseUrl = normalizeBaseUrl(args['base-url'] || process.env.CHATCASE_BASE_URL);
  const apiPrefix = normalizePrefix(args['api-prefix'] || process.env.CHATCASE_API_PREFIX || '/api');
  const timestamp = Date.now();
  const auth = {
    email: `chatbot-template-${timestamp}@example.com`,
    password: `pwd-${timestamp}`
  };

  let projectId;

  try {
    /*
     * AC: Os templates oficiais ChatCase precisam aparecer na galeria publica e ser importaveis pela rota oficial.
     * Behavior: lista publica -> detalhe publico -> fork em projeto temporario -> intents persistidos.
     * @category: service-integration-e2e
     * @lane: service-integration-e2e
     * @dependency: full-system
     */
    const templates = await requestJson({
      method: 'GET',
      url: `${baseUrl}${apiPrefix}/modules/templates/public/templates`
    });

    assert(Array.isArray(templates), 'template list should be an array');
    const detailByTemplateId = new Map();

    for (const expected of EXPECTED_TEMPLATES) {
      const template = templates.find((item) => item._id === expected.id);
      assert(template, `template ${expected.id} should be listed`);
      assert.strictEqual(template.type, 'tilebot');
      assert.strictEqual(template.subtype, 'chatbot');
      assert.strictEqual(template.public, true);
      assert.strictEqual(template.certified, true);
      assert(template.intentsCount >= expected.intents.length, `template ${expected.id} should report intentsCount`);
      assert(template.attributes && Array.isArray(template.attributes.channels), `template ${expected.id} should expose channels`);
      assert(template.attributes.channels.includes('whatsapp'), `template ${expected.id} should support WhatsApp`);
      assert(template.attributes.channels.includes('casezap'), `template ${expected.id} should support CaseZap`);
      assertNativeInteractions(template, expected.id);

      const detail = await requestJson({
        method: 'GET',
        url: `${baseUrl}${apiPrefix}/modules/templates/public/templates/${encodeURIComponent(expected.id)}`
      });

      assert.strictEqual(detail.name, template.name);
      assert.strictEqual(detail.type, 'tilebot');
      assert.strictEqual(detail.subtype, 'chatbot');
      assert(Array.isArray(detail.intents), `template detail ${expected.id} should include intents`);
      expected.intents.forEach((name) => {
        assert(detail.intents.some((intent) => intent.intent_display_name === name), `template ${expected.id} intent ${name} should exist`);
      });
      assertNativeInteractions(detail, expected.id);

      const detailByName = new Map(detail.intents.map((intent) => [intent.intent_display_name, intent]));
      Object.keys(expected.buttons || {}).forEach((name) => {
        assertIntentButtons(detailByName.get(name), expected.buttons[name], `detail ${expected.id}:${name}`);
      });
      Object.keys(expected.aliases || {}).forEach((name) => {
        assertIntentAliases(detailByName.get(name), expected.aliases[name], `detail ${expected.id}:${name}`);
      });

      const exported = await requestJson({
        method: 'GET',
        url: `${baseUrl}${apiPrefix}/modules/templates/public/templates/${encodeURIComponent(expected.id)}/export`
      });
      assert.strictEqual(exported._id, expected.id);
      assert.strictEqual(exported.source, 'chatcase-template-export');
      assert(Array.isArray(exported.intents), `template export ${expected.id} should include intents`);
      assertNativeInteractions(exported, expected.id);

      detailByTemplateId.set(expected.id, detail);
    }

    const signup = await requestJson({
      method: 'POST',
      url: `${baseUrl}${apiPrefix}/auth/signup`,
      payload: {
        email: auth.email,
        password: auth.password,
        firstname: 'Chatbot',
        lastname: 'Template',
        disableEmail: true
      }
    });

    assert.strictEqual(signup.success, true, 'signup should succeed');

    const project = await requestJson({
      method: 'POST',
      url: `${baseUrl}${apiPrefix}/projects`,
      auth,
      payload: {
        name: `Chatbot Template Import ${timestamp}`
      }
    });

    projectId = project._id;
    assert(projectId, 'project id should be returned');

    const imported = [];

    for (const expected of EXPECTED_TEMPLATES) {
      const detail = detailByTemplateId.get(expected.id);
      const fork = await requestJson({
        method: 'POST',
        url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq_kb/fork/${encodeURIComponent(expected.id)}?public=true&projectid=${encodeURIComponent(projectId)}`,
        auth
      });

      assert(fork.bot_id, `fork ${expected.id} should return bot id`);

      const persistedBot = await requestJson({
        method: 'GET',
        url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq_kb/${encodeURIComponent(fork.bot_id)}`,
        auth
      });

      assert.strictEqual(persistedBot.name, detail.name);
      assert.strictEqual(persistedBot.type, 'tilebot');
      assert.strictEqual(persistedBot.subtype, 'chatbot');

      const intents = await requestJson({
        method: 'GET',
        url: `${baseUrl}${apiPrefix}/${encodeURIComponent(projectId)}/faq?id_faq_kb=${encodeURIComponent(fork.bot_id)}`,
        auth
      });

      const byName = new Map(intents.map((intent) => [intent.intent_display_name, intent]));
      expected.intents.forEach((name) => {
        assert(byName.has(name), `persisted template ${expected.id} intent ${name} should exist`);
      });

      Object.keys(expected.questions).forEach((name) => {
        assert.strictEqual(byName.get(name).question, expected.questions[name], `persisted template ${expected.id} question ${name}`);
      });

      Object.keys(expected.buttons || {}).forEach((name) => {
        assertIntentButtons(byName.get(name), expected.buttons[name], `persisted ${expected.id}:${name}`);
      });

      Object.keys(expected.aliases || {}).forEach((name) => {
        assertIntentAliases(byName.get(name), expected.aliases[name], `persisted ${expected.id}:${name}`);
      });

      imported.push(`${expected.id}:${fork.bot_id}:${intents.length}`);
    }

    console.log(`OK chatbot template gallery api: project=${projectId} imported=${imported.join(',')}`);
  } finally {
    if (!args['keep-project']) {
      await cleanupProject({ baseUrl, apiPrefix, projectId, auth });
    }
  }
}

run().catch((error) => {
  console.error('FAIL chatbot template gallery api:', error.message);
  process.exitCode = 1;
});
