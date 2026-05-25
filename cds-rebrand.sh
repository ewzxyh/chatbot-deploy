#!/bin/sh
set -eu

ROOT="/usr/share/nginx/html"

patch_static_text() {
  find "$ROOT" -type f \( -name '*.html' -o -name '*.js' -o -name '*.json' \) -print | while read -r file; do
    sed -i \
      -e 's#Tiledesk Design Studio#ChatCase Design Studio#g' \
      -e 's#Tiledesk ver#ChatCase ver#g' \
      -e 's#Try Tiledesk now!#ChatCase Design Studio#g' \
      -e 's#Try ChatCase now!#ChatCase Design Studio#g' \
      -e 's#WhatsApp Static#Template WABA#g' \
      -e 's#WhatsApp by Attribute#Template WABA por atributo#g' \
      -e 's#WhatsApp by Segment#Template WABA por segmento#g' \
      -e 's#WhatsApp static#Template WABA#g' \
      -e 's#WhatsApp by attribute#Template WABA por atributo#g' \
      -e 's#WhatsApp by segment#Template WABA por segmento#g' \
      -e 's#This action send an approved WhatsApp template#Envia um template aprovado pela Meta/WABA#g' \
      -e "s#Qualify your leads to increase your sales faster\. It's really easy to do it with the Tiledesk conversational form builder#Crie e publique fluxos de atendimento do ChatCase#g" \
      -e "s#Qualify your leads to increase your sales faster\. It's really easy to do it with the ChatCase conversational form builder#Crie e publique fluxos de atendimento do ChatCase#g" \
      -e 's#© 2024 Tiledesk#© 2026 ChatCase#g' \
      -e 's#© 2025 Tiledesk#© 2026 ChatCase#g' \
      -e 's#© 2026 Tiledesk#© 2026 ChatCase#g' \
      -e 's#\\xa9 2024 #\\xa9 2026 #g' \
      -e 's#Tiledesk#ChatCase#g' \
      -e 's#redacted@example.invalid#redacted@example.invalid#g' \
      -e 's#redacted@example.invalid#redacted@example.invalid#g' \
      -e 's#https://tiledesk.com/wp-content/uploads/2022/12/6029654-02-min.png#/assets/logos/tiledesk_logo.svg#g' \
      -e 's#[REDACTED_BASIC_AUTH_URL]' \
      -e 's#https://feedback.tiledesk.com/changelog#https://chatcase.com.br/#g' \
      -e 's#https://feedback.tiledesk.com/roadmap#https://chatcase.com.br/#g' \
      -e 's#https://gethelp.tiledesk.com#https://chatcase.com.br#g' \
      -e 's#https://developer.tiledesk.com#https://chatcase.com.br#g' \
      -e 's#https://tiledesk.statuspage.io#https://chatcase.com.br/#g' \
      -e 's#https://github.com/Tiledesk#https://github.com/ewzxyh#g' \
      -e 's#https://tiledesk.com/wp-content/uploads/2022/07/tiledesk_v13-300x300.png#/favicon.ico#g' \
      -e 's#https://www.tiledesk.com#https://chatcase.com.br#g' \
      -e 's#https://tiledesk.com#https://chatcase.com.br#g' \
      -e 's#https://gethelp.tilidesk.com#https://chatcase.com.br#g' \
      -e 's#https://gethelp.tuiledesk.com#https://chatcase.com.br#g' \
      -e 's#https://chatcase.com.br/articles/how-to-perform-a-whatsapp-broadcast-using-tiledesk/[^"'\''<)]*#https://chatcase.com.br/#g' \
      -e 's#using-tiledesk#using-chatcase#g' \
      -e 's#https://support-pre.tiledesk.com/dashboard/assets/img/logos/tiledesk-logo_new_gray.svg#/assets/logos/tiledesk_logo.svg#g' \
      -e 's#feedback.ChatCase.com#chatcase.com.br#g' \
      -e 's#gethelp.ChatCase.com#chatcase.com.br#g' \
      -e 's#developer.ChatCase.com#chatcase.com.br#g' \
      -e 's#github.com/ChatCase#github.com/ewzxyh#g' \
      -e 's#COMPANY_SITE_NAME:"tiledesk.com"#COMPANY_SITE_NAME:"chatcase.com.br"#g' \
      -e 's#COMPANY_SITE_URL:"https://www.tiledesk.com"#COMPANY_SITE_URL:"https://chatcase.com.br"#g' \
      -e 's#FAVICON:"https://tiledesk.com/wp-content/uploads/2022/07/tiledesk_v13-300x300.png"#FAVICON:"/favicon.ico"#g' \
      -e 's#company_site_name:"tiledesk.com"#company_site_name:"chatcase.com.br"#g' \
      "$file"
  done

  find "$ROOT" -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' \) -print | while read -r file; do
    sed -i \
      -e 's#<link[^>]*maxcdn\.bootstrapcdn\.com/font-awesome[^>]*>##g' \
      -e 's#<link[^>]*fonts\.googleapis\.com[^>]*>##g' \
      -e 's#<link[^>]*fonts\.gstatic\.com[^>]*>##g' \
      -e 's#@import[[:space:]]*url([^)]*fonts\.googleapis\.com[^)]*);##g' \
      -e "s#https://fonts\\.googleapis\\.com[^\"' )]*##g" \
      -e "s#https://fonts\\.gstatic\\.com[^\"' )]*##g" \
      -e "s#src: url() format('woff2');#src: local('Segoe UI');#g" \
      "$file"
  done
}

patch_i18n() {
  file="$1"
  [ -f "$file" ] || return 0

  sed -i \
    -e 's#"Required": "Required"#"Required": "Obrigatório"#g' \
    -e 's#"Title": "Title"#"Title": "Título"#g' \
    -e 's#"Description": "Description"#"Description": "Descrição"#g' \
    -e 's#"CreateNew": "Create New"#"CreateNew": "Criar novo"#g' \
    -e 's#"Loading": "Loading"#"Loading": "Carregando"#g' \
    -e 's#"Cancel": "Cancel"#"Cancel": "Cancelar"#g' \
    -e 's#"Continue": "Continue"#"Continue": "Continuar"#g' \
    -e 's#"Add": "Add"#"Add": "Adicionar"#g' \
    -e 's#"Edit": "Edit"#"Edit": "Editar"#g' \
    -e 's#"Update": "Update"#"Update": "Atualizar"#g' \
    -e 's#"Close": "Close"#"Close": "Fechar"#g' \
    -e 's#"Upload": "Upload"#"Upload": "Enviar arquivo"#g' \
    -e 's#"Delete": "Delete"#"Delete": "Excluir"#g' \
    -e 's#"Search": "Search"#"Search": "Pesquisar"#g' \
    -e 's#"Back": "Back"#"Back": "Voltar"#g' \
    -e 's#"GoBack": "Go back"#"GoBack": "Voltar"#g' \
    -e 's#"GoToDashboard": "Go to dashboard"#"GoToDashboard": "Ir para o painel"#g' \
    -e 's#"LogOut": "Logout"#"LogOut": "Sair"#g' \
    -e 's#"HelpCenter": "Help Center"#"HelpCenter": "Central de ajuda"#g' \
    -e 's#"RoadMap": "Roadmap"#"RoadMap": "Roadmap"#g' \
    -e 's#"SystemStatus": "System Status"#"SystemStatus": "Status do sistema"#g' \
    -e 's#"Feedback": "Feedback"#"Feedback": "Feedback"#g' \
    -e 's#"Support": "Support"#"Support": "Suporte"#g' \
    -e 's#"Help": "Help"#"Help": "Ajuda"#g' \
    -e 's#"DeveloperDocs": "Developer Docs"#"DeveloperDocs": "Documentação"#g' \
    -e 's#"SendUsEmail": "Send us an email"#"SendUsEmail": "Enviar e-mail"#g' \
    -e 's#"ChatUs": "Chat with us"#"ChatUs": "Falar com suporte"#g' \
    -e 's#"ContactUs": "Contact us"#"ContactUs": "Fale conosco"#g' \
    -e 's#"Done": "Done!"#"Done": "Concluído"#g' \
    -e 's#"RememberToClickThePublishButton": "Remember to click the Publish button when you finish your work. Otherwise, your changes won’t be visible to users."#"RememberToClickThePublishButton": "Clique em Publicar ao finalizar. Caso contrário, as alterações não ficarão visíveis para os usuários."#g' \
    -e 's#"YouHaveNoRules": "You have no rules set for this Chatbot <br><br> Rules allow your Chatbot to proactively write to your visitor based on specific events (i.e. visitor lands on a specific page)"#"YouHaveNoRules": "Nenhuma regra configurada para este fluxo <br><br> Regras permitem enviar mensagens proativas ao contato com base em eventos específicos."#g' \
    -e 's#"LearnAboutAI": "Learn about AI rules and how to apply them here"#"LearnAboutAI": "Veja como criar e aplicar regras aqui"#g' \
    -e 's#"Publish": "Publish"#"Publish": "Publicar"#g' \
    -e 's#"TestIt": "Test it"#"TestIt": "Testar"#g' \
    -e 's#"TryOnWhatsapp": "Try on Whatsapp"#"TryOnWhatsapp": "Testar no WhatsApp"#g' \
    -e 's#"intentsProgress": "Loading intents in progress"#"intentsProgress": "Carregando blocos"#g' \
    -e 's#"intentsComplete": "Intents loading completed"#"intentsComplete": "Blocos carregados"#g' \
    -e 's#"connectorsProgress": "Loading connectors in progress"#"connectorsProgress": "Carregando conexões"#g' \
    -e 's#"connectorsComplete": "Connectors loading completed"#"connectorsComplete": "Conexões carregadas"#g' \
    -e 's#"loadingCompleteWithErrors": "Loading completed with errors"#"loadingCompleteWithErrors": "Carregamento concluído com erros"#g' \
    -e 's#"WebWidget": "Web widget"#"WebWidget": "Widget web"#g' \
    -e 's#"Blocks": "Blocks"#"Blocks": "Blocos"#g' \
    -e 's#"Fulfillment": "Fulfillment"#"Fulfillment": "Execução"#g' \
    -e 's#"Rules": "Rules"#"Rules": "Regras"#g' \
    -e 's#"General": "General"#"General": "Geral"#g' \
    -e 's#"Settings": "Settings"#"Settings": "Configurações"#g' \
    -e 's#"Button": "Button"#"Button": "Botão"#g' \
    -e 's#"ButtonTitle": "Button title"#"ButtonTitle": "Título do botão"#g' \
    -e 's#"ButtonTypingAlias": "Button typing alias"#"ButtonTypingAlias": "Apelidos digitáveis"#g' \
    -e 's#"Type": "Type"#"Type": "Tipo"#g' \
    -e 's#"OpenIn": "Open in"#"OpenIn": "Abrir em"#g' \
    -e 's#"GoToBlock": "Go to block"#"GoToBlock": "Ir para bloco"#g' \
    -e 's#"SearchABlock": "search a block..."#"SearchABlock": "pesquisar bloco..."#g' \
    -e 's#"MostUsed": "Most used"#"MostUsed": "Mais usadas"#g' \
    -e 's#"Flow": "Flow"#"Flow": "Fluxo"#g' \
    -e 's#"Integrations": "Integrations"#"Integrations": "Integrações"#g' \
    -e 's#"Special": "Special"#"Special": "Especiais"#g' \
    -e 's#"Reply": "Reply"#"Reply": "Resposta"#g' \
    -e 's#"ReplyV2": "Advanced reply"#"ReplyV2": "Resposta avançada"#g' \
    -e 's#"RandomReply": "Random reply"#"RandomReply": "Resposta aleatória"#g' \
    -e 's#"AgentHandoff": "Transfer to a human"#"AgentHandoff": "Transferir para humano"#g' \
    -e 's#"IfOperatingHours": "If operating hours"#"IfOperatingHours": "Se estiver no horário"#g' \
    -e 's#"IfOnlineAgent": "If online agents"#"IfOnlineAgent": "Se houver agentes online"#g' \
    -e 's#"Condition": "Condition"#"Condition": "Condição"#g' \
    -e 's#"ConditionElse": "Condition w/ else"#"ConditionElse": "Condição com senão"#g' \
    -e 's#"ConnectBlock": "Connect block"#"ConnectBlock": "Conectar bloco"#g' \
    -e 's#"SetAttribute": "Set attribute"#"SetAttribute": "Definir atributo"#g' \
    -e 's#"DeleteAttribute": "Delete attribute"#"DeleteAttribute": "Excluir atributo"#g' \
    -e 's#"ReplaceBot": "Replace bot"#"ReplaceBot": "Trocar bot"#g' \
    -e 's#"ReplaceAIAgent":"Replace AI Agent"#"ReplaceAIAgent":"Trocar agente de IA"#g' \
    -e 's#"Wait": "Wait"#"Wait": "Aguardar"#g' \
    -e 's#"WebRequest": "Web request"#"WebRequest": "Requisição web"#g' \
    -e 's#"WebResponse": "Web response"#"WebResponse": "Resposta web"#g' \
    -e 's#"SendEmail": "Send email"#"SendEmail": "Enviar e-mail"#g' \
    -e 's#"WhatsAppStatic": "WhatsApp static"#"WhatsAppStatic": "Template WABA"#g' \
    -e 's#"WhatsAppByAttribute": "WhatsApp by attribute"#"WhatsAppByAttribute": "Template WABA por atributo"#g' \
    -e 's#"WhatsAppBySegment": "WhatsApp by segment"#"WhatsAppBySegment": "Template WABA por segmento"#g' \
    -e 's#"AddKBContent":"Add to knowledge base"#"AddKBContent":"Adicionar à base de conhecimento"#g' \
    -e 's#"AskTheKnowledgeBase": "Ask knowledge base"#"AskTheKnowledgeBase": "Consultar base de conhecimento"#g' \
    -e 's#"AskTheKnowledgeBaseV2": "Ask knowledge base V2"#"AskTheKnowledgeBaseV2": "Consultar base de conhecimento V2"#g' \
    -e 's#"GPTTask": "ChatGPT task"#"GPTTask": "Tarefa ChatGPT"#g' \
    -e 's#"GPTAssistant": "ChatGPT assistant"#"GPTAssistant": "Assistente ChatGPT"#g' \
    -e 's#"AiPrompt": "AI Prompt"#"AiPrompt": "Prompt de IA"#g' \
    -e 's#"AiCondition": "AI Condition"#"AiCondition": "Condição de IA"#g' \
    -e 's#"HiddenMessage": "Hidden message"#"HiddenMessage": "Mensagem oculta"#g' \
    -e 's#"ChangeDept": "Change department"#"ChangeDept": "Alterar departamento"#g' \
    -e 's#"Code": "Code"#"Code": "Código"#g' \
    -e 's#"SetFunction": "Set function"#"SetFunction": "Definir função"#g' \
    -e 's#"CaptureUserReply": "Capture user reply"#"CaptureUserReply": "Capturar resposta"#g' \
    -e 's#"LeadUpdate": "Lead update"#"LeadUpdate": "Atualizar lead"#g' \
    -e 's#"ClearTranscript": "Clear transcript"#"ClearTranscript": "Limpar transcrição"#g' \
    -e 's#"MoveToUnassigned": "Move to unassigned"#"MoveToUnassigned": "Mover para não atribuídas"#g' \
    -e 's#"AddTag": "Add tag"#"AddTag": "Adicionar etiqueta"#g' \
    -e 's#"FlowLog":"Flow log"#"FlowLog":"Log do fluxo"#g' \
    -e 's#"SendWhatsapp": "Send Whatsapp"#"SendWhatsapp": "Enviar WhatsApp"#g' \
    -e 's#"userDefined": "User defined"#"userDefined": "Definidas pelo usuário"#g' \
    -e 's#"globals": "Globals"#"globals": "Globais"#g' \
    -e 's#"mostUsed": "Most used"#"mostUsed": "Mais usadas"#g' \
    -e 's#"systemDefined": "System defined"#"systemDefined": "Sistema"#g' \
    -e 's#"New": "New"#"New": "Novo"#g' \
    -e 's#"Event": "Event"#"Event": "Evento"#g' \
    -e "s#\"WhatsNew\": \"What's new ?\"#\"WhatsNew\": \"Novidades\"#g" \
    -e 's#"Changelog": "Changelog"#"Changelog": "Novidades"#g' \
    -e 's#"NoGlobalVariables": "No global variables <br><br>Global variables are a set of variables that are always available in your flows"#"NoGlobalVariables": "Nenhuma variável global <br><br>Variáveis globais ficam sempre disponíveis nos seus fluxos"#g' \
    "$file"
}

patch_channel_guard() {
  cat > "$ROOT/chatcase-cds-channel-guard.js" <<'EOF'
(function () {
  'use strict';

  var blockedWabaLabels = [
    /whatsapp\s+static/i,
    /whatsapp\s+by\s+attribute/i,
    /whatsapp\s+by\s+segment/i,
    /send\s+whatsapp/i,
    /template\s+waba/i,
    /waba\s+por\s+atributo/i,
    /waba\s+por\s+segmento/i,
    /enviar\s+whatsapp/i
  ];
  var observer;
  var lastChannel = '';

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function getChannelFromLocation() {
    var searchChannel = new URLSearchParams(window.location.search || '').get('channel');
    if (searchChannel) {
      return normalize(searchChannel);
    }

    var hash = window.location.hash || '';
    var queryIndex = hash.indexOf('?');
    if (queryIndex === -1) {
      return 'casezap';
    }

    return normalize(new URLSearchParams(hash.slice(queryIndex + 1)).get('channel')) || 'casezap';
  }

  function shouldHideWabaActions(channel) {
    return !!channel && channel !== 'waba';
  }

  function matchesBlockedLabel(element) {
    var ownText = '';
    Array.prototype.forEach.call(element.childNodes || [], function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        ownText += ' ' + node.nodeValue;
      }
    });

    var text = [
      ownText,
      element.getAttribute && element.getAttribute('title'),
      element.getAttribute && element.getAttribute('aria-label')
    ].join(' ');

    return blockedWabaLabels.some(function (pattern) {
      return pattern.test(text);
    });
  }

  function findSmallContainer(element) {
    var candidate = element;
    var current = element;

    for (var depth = 0; depth < 5 && current && current.parentElement; depth += 1) {
      var parent = current.parentElement;
      var textLength = String(parent.textContent || '').trim().length;
      var childCount = parent.children ? parent.children.length : 0;

      if (textLength > 0 && textLength <= 140 && childCount <= 8) {
        candidate = parent;
      }

      if (
        parent.tagName === 'BUTTON' ||
        parent.tagName === 'LI' ||
        /action|menu|item|row/i.test(parent.className || '')
      ) {
        candidate = parent;
      }

      current = parent;
    }

    return candidate;
  }

  function setHidden(element, hidden) {
    if (!element) {
      return;
    }

    if (hidden) {
      element.setAttribute('data-chatcase-channel-hidden', 'waba-only');
      element.style.display = 'none';
      return;
    }

    if (element.getAttribute('data-chatcase-channel-hidden') === 'waba-only') {
      element.removeAttribute('data-chatcase-channel-hidden');
      element.style.display = '';
    }
  }

  function updateBadge(channel) {
    var existing = document.getElementById('chatcase-cds-channel-badge');
    if (!channel) {
      if (existing) {
        existing.remove();
      }
      return;
    }

    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'chatcase-cds-channel-badge';
      existing.style.cssText = 'position:fixed;top:76px;right:18px;z-index:2147483647;padding:7px 10px;border:1px solid rgba(43,149,233,.35);border-radius:999px;background:#fff;color:#1f3550;font:600 12px/1.2 Arial,sans-serif;box-shadow:0 6px 18px rgba(31,53,80,.12)';
      document.body.appendChild(existing);
    }

    existing.textContent = 'Canal do fluxo: ' + (channel === 'casezap' ? 'CaseZap' : channel === 'waba' ? 'WABA / Meta' : channel);
  }

  function applyGuard() {
    var channel = getChannelFromLocation();
    var hideWaba = shouldHideWabaActions(channel);
    var hiddenTargets = [];

    updateBadge(channel);

    Array.prototype.forEach.call(document.querySelectorAll('[data-chatcase-channel-hidden="waba-only"]'), function (element) {
      setHidden(element, false);
    });

    if (!hideWaba) {
      return;
    }

    Array.prototype.forEach.call(document.querySelectorAll('body *'), function (element) {
      if (matchesBlockedLabel(element)) {
        hiddenTargets.push(findSmallContainer(element));
      }
    });

    hiddenTargets.forEach(function (element) {
      setHidden(element, true);
    });
  }

  function start() {
    applyGuard();
    observer = new MutationObserver(function () {
      window.clearTimeout(observer._chatcaseTimer);
      observer._chatcaseTimer = window.setTimeout(applyGuard, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.setInterval(function () {
      var channel = getChannelFromLocation();
      if (channel !== lastChannel) {
        lastChannel = channel;
        applyGuard();
      }
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());
EOF

  if [ -f "$ROOT/index.html" ] && ! grep -q "chatcase-cds-channel-guard.js" "$ROOT/index.html"; then
    sed -i 's#</body>#<script src="chatcase-cds-channel-guard.js?v=20260525"></script></body>#' "$ROOT/index.html"
  fi
}

patch_static_text

for lang in "$ROOT"/assets/i18n/*.json; do
  patch_i18n "$lang"
done

patch_channel_guard
