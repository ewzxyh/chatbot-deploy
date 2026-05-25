#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const defaultFlowPath = path.join(rootDir, 'automations', 'chatbot-flows', 'whatsapp-menu-basic.json');
const defaultServerDir = path.resolve(rootDir, '..', 'tiledesk-server');

const flowPath = path.resolve(process.env.CHATBOT_FLOW_FILE || defaultFlowPath);
const serverDir = path.resolve(process.env.TILEDESK_SERVER_DIR || defaultServerDir);
const engineDir = path.join(serverDir, 'node_modules', '@tiledesk', 'tiledesk-tybot-connector', 'engine');

const { TiledeskChatbot } = require(path.join(engineDir, 'TiledeskChatbot.js'));
const { MockBotsDataSource } = require(path.join(engineDir, 'mock', 'MockBotsDataSource.js'));
const { MockTdCache } = require(path.join(engineDir, 'mock', 'MockTdCache.js'));

function readFlow(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildBotFixture(flow, botId) {
  const questionsIntent = {};
  const intents = {};
  const intentsByIntentId = {};
  const intentsNlp = {};

  flow.intents.forEach((intent) => {
    assert(intent.intent_display_name, 'intent_display_name is mandatory');
    intents[intent.intent_display_name] = intent;

    if (intent.intent_id) {
      intentsByIntentId[intent.intent_id] = intent;
    }

    if (intent.question) {
      questionsIntent[intent.question] = intent.intent_display_name;
    }

    (intent.attributes && intent.attributes.aliases || []).forEach((alias) => {
      intentsNlp[alias] = { intent_display_name: intent.intent_display_name };
    });
  });

  return {
    bots: {
      [botId]: {
        webhook_enabled: false,
        webhook_url: null,
        language: flow.language || 'pt',
        name: flow.name,
        questions_intent: questionsIntent,
        intents,
        intents_by_intent_id: intentsByIntentId,
        intents_nlp: intentsNlp
      }
    }
  };
}

function createMessage(text, channelName) {
  const projectId = 'chatcase-test-project';
  const requestId = 'support-group-chatcase-test-project-automation-flow';

  return {
    _id: `msg-${text.replace(/[^a-z0-9]/gi, '-')}`,
    text,
    sender: 'user',
    id_project: projectId,
    request: {
      request_id: requestId,
      id_project: projectId,
      requester_id: 'whatsapp-user-1',
      channel: {
        name: channelName
      }
    }
  };
}

function extractReplyText(reply) {
  if (!reply) {
    return '';
  }

  if (reply.text) {
    return reply.text;
  }

  const actionTexts = (reply.actions || [])
    .map((action) => {
      if (action.text) {
        return action.text;
      }

      const commands = action.attributes && action.attributes.commands || [];
      return commands
        .filter((command) => command.type === 'message' && command.message && command.message.text)
        .map((command) => command.message.text)
        .join('\n');
    })
    .filter(Boolean);

  return actionTexts.join('\n');
}

function extractMessageCommands(reply) {
  return (reply && reply.actions || [])
    .flatMap((action) => action.attributes && action.attributes.commands || [])
    .filter((command) => command.type === 'message' && command.message);
}

function extractReplyButtons(reply) {
  return extractMessageCommands(reply)
    .flatMap((command) => {
      const buttons = command.message.attributes &&
        command.message.attributes.attachment &&
        command.message.attributes.attachment.buttons || [];
      return buttons.map((button) => button.value || button.label || button.title);
    });
}

function createChatbot(flow) {
  const botId = 'chatcase-whatsapp-menu-basic';
  const dataSource = new MockBotsDataSource(buildBotFixture(flow, botId));

  return new TiledeskChatbot({
    botsDataSource: dataSource,
    intentsFinder: dataSource,
    backupIntentsFinder: dataSource,
    botId,
    bot: {
      name: flow.name,
      webhook_enabled: false,
      webhook_url: null,
      language: flow.language || 'pt'
    },
    token: 'test-token',
    tdcache: new MockTdCache(),
    APIURL: 'http://localhost:3000',
    APIKEY: 'test-api-key',
    requestId: 'support-group-chatcase-test-project-automation-flow',
    projectId: 'chatcase-test-project',
    MAX_STEPS: 100,
    MAX_EXECUTION_TIME: 30000
  });
}

async function assertReply(chatbot, channel, input, expectedFragments) {
  const reply = await chatbot.replyToMessage(createMessage(input, channel));
  const text = extractReplyText(reply);

  expectedFragments.forEach((fragment) => {
    assert(
      text.includes(fragment),
      `Expected reply to "${input}" to include "${fragment}". Got: ${text}`
    );
  });

  return reply;
}

async function run() {
  const flow = readFlow(flowPath);
  const chatbot = createChatbot(flow);

  assert.deepStrictEqual(flow.attributes.channels, ['whatsapp', 'casezap'], 'flow should only advertise compatible session channels');
  assert(!flow.attributes.channels.includes('telegram'), 'flow should not advertise Telegram without a compatible translator');
  assert.strictEqual(flow.attributes.channelCompatibility.casezap.status, 'supported', 'flow should declare CaseZap compatibility');
  assert.strictEqual(flow.attributes.channelCompatibility.whatsapp.status, 'supported', 'flow should declare WhatsApp session compatibility');

  /*
   * AC: Usuario consegue montar um fluxo de automacao de mensagens para canais como WhatsApp.
   * Behavior: Mensagem do usuario -> motor Tybot resolve bloco -> resposta observavel do chatbot.
   * @category: integration
   * @lane: integration
   * @dependency: tiledesk-tybot-connector
   * @complexity: medium
   * ROI: 82
   */
  const startReply = await assertReply(chatbot, 'whatsapp', '/start', [
    'assistente ChatCase',
    '1 - Ver planos',
    '2 - Falar com atendente'
  ]);
  assert.deepStrictEqual(extractReplyButtons(startReply), ['Ver planos', 'Falar atendente']);

  /*
   * AC: O fluxo precisa aceitar opcoes numericas simples para WhatsApp/CaseZap.
   * Behavior: Usuario responde "1" -> bloco de planos -> resposta de planos.
   * @category: integration
   * @lane: integration
   * @dependency: tiledesk-tybot-connector
   * @complexity: medium
   * ROI: 78
   */
  await assertReply(chatbot, 'whatsapp', '1', [
    'Planos ChatCase',
    'Business'
  ]);

  /*
   * AC: O mesmo fluxo precisa aceitar o texto retornado por botoes nativos.
   * Behavior: Usuario clica "Ver planos" no WhatsApp/CaseZap -> motor resolve alias -> bloco de planos.
   * @category: integration
   * @lane: integration
   * @dependency: tiledesk-tybot-connector
   * @complexity: medium
   * ROI: 82
   */
  await assertReply(chatbot, 'whatsapp', 'Ver planos', [
    'Planos ChatCase',
    'Business'
  ]);

  /*
   * AC: O fluxo precisa ter uma saida clara para atendimento humano.
   * Behavior: Usuario responde "2" -> bloco de handoff -> orientacao para atendente.
   * @category: integration
   * @lane: integration
   * @dependency: tiledesk-tybot-connector
   * @complexity: medium
   * ROI: 76
   */
  await assertReply(chatbot, 'casezap', '2', [
    'chamar uma atendente',
    'descreva em uma mensagem'
  ]);

  await assertReply(chatbot, 'casezap', 'Falar atendente', [
    'chamar uma atendente',
    'descreva em uma mensagem'
  ]);

  /*
   * AC: Mensagens fora do fluxo nao podem deixar o usuario sem resposta.
   * Behavior: Usuario envia texto desconhecido -> fallback -> resposta com instrucao de recuperacao.
   * @category: integration
   * @lane: integration
   * @dependency: tiledesk-tybot-connector
   * @complexity: low
   * ROI: 66
   */
  await assertReply(chatbot, 'whatsapp', 'valor do boleto', [
    'Nao entendi',
    'Digite menu'
  ]);

  console.log(`OK chatbot flow engine: ${path.relative(rootDir, flowPath)} via ${path.relative(rootDir, engineDir)}`);
}

run().catch((error) => {
  console.error('FAIL chatbot flow engine:', error.message);
  process.exitCode = 1;
});
