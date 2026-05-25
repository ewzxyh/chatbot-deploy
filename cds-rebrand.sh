#!/bin/sh
set -eu

ROOT="/usr/share/nginx/html"

patch_static_text() {
  find "$ROOT" -type f \( -name '*.html' -o -name '*.js' -o -name '*.json' \) -print | while read -r file; do
    sed -i \
      -e 's#Tiledesk Design Studio#ChatCase Design Studio#g' \
      -e 's#ChatCase Design Studio#ChatCase Estúdio de Fluxos#g' \
      -e 's#Design Studio#Estúdio de Fluxos#g' \
      -e 's#Tiledesk ver#ChatCase ver#g' \
      -e 's#Try Tiledesk now!#ChatCase Estudio de Fluxos#g' \
      -e 's#Try ChatCase now!#ChatCase Estudio de Fluxos#g' \
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
      -e 's#Portuguese - pt#Português - pt#g' \
      -e 's#Portuguese (Brazilian)#Português (Brasil)#g' \
      -e 's#Portuguese (European)#Português (Portugal)#g' \
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
    -e 's#"YourDescription": "Your description"#"YourDescription": "Sua descriÃ§Ã£o"#g' \
    -e 's#"ShortDescription": "Short Description"#"ShortDescription": "DescriÃ§Ã£o curta"#g' \
    -e 's#"MarkdownSupported": "Markdown supported - use the Markdown language to enrich your text"#"MarkdownSupported": "Markdown suportado - use Markdown para enriquecer o texto"#g' \
    -e 's#"Tags": "Tags"#"Tags": "Etiquetas"#g' \
    -e 's#"CreateNew": "Create New"#"CreateNew": "Criar novo"#g' \
    -e 's#"Loading": "Loading"#"Loading": "Carregando"#g' \
    -e 's#"Cancel": "Cancel"#"Cancel": "Cancelar"#g' \
    -e 's#"Continue": "Continue"#"Continue": "Continuar"#g' \
    -e 's#"Add": "Add"#"Add": "Adicionar"#g' \
    -e 's#"Edit": "Edit"#"Edit": "Editar"#g' \
    -e 's#"Update": "Update"#"Update": "Atualizar"#g' \
    -e 's#"Close": "Close"#"Close": "Fechar"#g' \
    -e 's#"Upload": "Upload"#"Upload": "Enviar arquivo"#g' \
    -e 's#"UploadImage": "Upload image"#"UploadImage": "Enviar imagem"#g' \
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
    -e 's#"TestYourChatbot": "Test your Chatbot"#"TestYourChatbot": "Teste seu fluxo"#g' \
    -e 's#"StartTryingYourChatbot": "Start trying your chatbot and interact with it"#"StartTryingYourChatbot": "Teste o fluxo e interaja com ele"#g' \
    -e 's#"ResolutionBotLanguage": "The language of the chatbot"#"ResolutionBotLanguage": "Idioma do fluxo"#g' \
    -e 's#"ChangeChatbotLanguage": "Change chatbot language"#"ChangeChatbotLanguage": "Alterar idioma do fluxo"#g' \
    -e 's#"BeAwereToTranslate": "Be aware that you must translate your training phrases to match the new language to get the maximum in terms of \\n Machine Learning performance."#"BeAwereToTranslate": "Lembre-se de traduzir as frases de treinamento para o novo idioma."#g' \
    -e 's#"TheChatbotTrainingWillRestart": "The chatbot training will restarted. "#"TheChatbotTrainingWillRestart": "O treinamento do fluxo serÃ¡ reiniciado. "#g' \
    -e 's#"Profile": "Profile"#"Profile": "Perfil"#g' \
    -e 's#"Avatar": "Avatar"#"Avatar": "Avatar"#g' \
    -e 's#"Name": "Name"#"Name": "Nome"#g' \
    -e 's#"Lastname": "Lastname"#"Lastname": "Sobrenome"#g' \
    -e 's#"UserId": "User Id"#"UserId": "ID do usuÃ¡rio"#g' \
    -e 's#"UpdateProfile": "Update profile"#"UpdateProfile": "Atualizar perfil"#g' \
    -e 's#"ChangePsw": "Change password"#"ChangePsw": "Alterar senha"#g' \
    -e 's#"BotDetails": "Bot details"#"BotDetails": "Detalhes do fluxo"#g' \
    -e 's#"Developer": "Developer"#"Developer": "Desenvolvedor"#g' \
    -e 's#"Enabled": "Enabled"#"Enabled": "Ativado"#g' \
    -e 's#"Disabled": "Disabled"#"Disabled": "Desativado"#g' \
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
    -e 's#"Label": "Label"#"Label": "RÃ³tulo"#g' \
    -e 's#"Actions": "Actions"#"Actions": "AÃ§Ãµes"#g' \
    -e 's#"DisableUserInput": "Disable user input"#"DisableUserInput": "Desativar entrada do usuÃ¡rio"#g' \
    -e 's#"SameWidgetWindow": "Same widget window"#"SameWidgetWindow": "Mesma janela do widget"#g' \
    -e 's#"NewTabWindow": "New Tab window"#"NewTabWindow": "Nova aba"#g' \
    -e 's#"Text": "Text"#"Text": "Texto"#g' \
    -e 's#"Image": "Image"#"Image": "Imagem"#g' \
    -e 's#"Frame": "Frame"#"Frame": "Frame"#g' \
    -e 's#"Gallery": "Gallery"#"Gallery": "Galeria"#g' \
    -e 's#"Redirect": "Redirect"#"Redirect": "Redirecionamento"#g' \
    -e 's#"AudioUrl": "Audio File Url"#"AudioUrl": "URL do arquivo de Ã¡udio"#g' \
    -e 's#"Message": "Message"#"Message": "Mensagem"#g' \
    -e 's#"Every": "Every"#"Every": "A cada"#g' \
    -e 's#"RuleName": "Rule name"#"RuleName": "Nome da regra"#g' \
    -e 's#"AddRule": "Add Rule"#"AddRule": "Adicionar regra"#g' \
    -e 's#"DeleteRule": "Delete Rule"#"DeleteRule": "Excluir regra"#g' \
    -e 's#"UpdateRule": "Update Rule"#"UpdateRule": "Atualizar regra"#g' \
    -e 's#"Voice": "Voice"#"Voice": "Voz"#g' \
    -e 's#"VoiceTwilio": "Voice Twilio"#"VoiceTwilio": "Voz Twilio"#g' \
    -e 's#"equalAsNumbers": "equal As Numbers"#"equalAsNumbers": "igual como nÃºmero"#g' \
    -e 's#"equalAsStrings": "equal As Text"#"equalAsStrings": "igual como texto"#g' \
    -e 's#"notEqualAsNumbers": "not Equal As Numbers"#"notEqualAsNumbers": "diferente como nÃºmero"#g' \
    -e 's#"notEqualAsStrings": "not Equal As Text"#"notEqualAsStrings": "diferente como texto"#g' \
    -e 's#"greaterThan": "greater Than"#"greaterThan": "maior que"#g' \
    -e 's#"greaterThanOrEqual": "greater Than Or Equal"#"greaterThanOrEqual": "maior ou igual"#g' \
    -e 's#"lessThan": "less Than"#"lessThan": "menor que"#g' \
    -e 's#"lessThanOrEqual": "less Than Or Equal"#"lessThanOrEqual": "menor ou igual"#g' \
    -e 's#"startsWith": "starts With"#"startsWith": "comeÃ§a com"#g' \
    -e 's#"notStartsWith": "not starts With"#"notStartsWith": "nÃ£o comeÃ§a com"#g' \
    -e 's#"startsWithIgnoreCase": "starts With Ignore Case"#"startsWithIgnoreCase": "comeÃ§a com sem diferenciar maiÃºsculas"#g' \
    -e 's#"endsWith": "ends With"#"endsWith": "termina com"#g' \
    -e 's#"contains": "contains"#"contains": "contÃ©m"#g' \
    -e 's#"containsIgnoreCase": "contains Ignore Case"#"containsIgnoreCase": "contÃ©m sem diferenciar maiÃºsculas"#g' \
    -e 's#"isEmpty": "is Empty"#"isEmpty": "estÃ¡ vazio"#g' \
    -e 's#"isNull": "is Null"#"isNull": "Ã© nulo"#g' \
    -e 's#"isUndefined": "is Undefined"#"isUndefined": "nÃ£o definido"#g' \
    -e 's#"matches": "matches"#"matches": "corresponde"#g' \
    -e 's#"userDefined": "User defined"#"userDefined": "Definidas pelo usuário"#g' \
    -e 's#"globals": "Globals"#"globals": "Globais"#g' \
    -e 's#"mostUsed": "Most used"#"mostUsed": "Mais usadas"#g' \
    -e 's#"systemDefined": "System defined"#"systemDefined": "Sistema"#g' \
    -e 's#"New": "New"#"New": "Novo"#g' \
    -e 's#"Event": "Event"#"Event": "Evento"#g' \
    -e "s#\"WhatsNew\": \"What's new ?\"#\"WhatsNew\": \"Novidades\"#g" \
    -e 's#"Changelog": "Changelog"#"Changelog": "Novidades"#g' \
    -e 's#"NoGlobalVariables": "No global variables <br><br>Global variables are a set of variables that are always available in your flows"#"NoGlobalVariables": "Nenhuma variável global <br><br>Variáveis globais ficam sempre disponíveis nos seus fluxos"#g' \
    -e 's#"HookTheBot": "Activate this bot"#"HookTheBot": "Ativar este fluxo"#g' \
    -e 's#"ActivateBot": "Activate"#"ActivateBot": "Ativar"#g' \
    -e 's#"BotSuccessFullyPublished": "Flow successfully published"#"BotSuccessFullyPublished": "Fluxo publicado com sucesso"#g' \
    -e 's#"AnErroOccurredWhileActivatingTheBot": "An error occurred while activating the Flow"#"AnErroOccurredWhileActivatingTheBot": "Ocorreu um erro ao ativar o fluxo"#g' \
    -e 's#"AnErroOccurredWhilePublishingTheBot": "An error occurred while publishing the Flow"#"AnErroOccurredWhilePublishingTheBot": "Ocorreu um erro ao publicar o fluxo"#g' \
    -e 's#"Installation": "Installation"#"Installation": "InstalaÃ§Ã£o"#g' \
    -e 's#"ChatbotInfo": "Chatbot info"#"ChatbotInfo": "InformaÃ§Ãµes do fluxo"#g' \
    -e 's#"PersonalInfo": "Personal Info"#"PersonalInfo": "InformaÃ§Ãµes pessoais"#g' \
    -e 's#"GoLiveOnCommunity": "Go live on Community"#"GoLiveOnCommunity": "Publicar na comunidade"#g' \
    -e 's#"RemoveFromCommunity": "Remove from community"#"RemoveFromCommunity": "Remover da comunidade"#g' \
    -e 's#"ChatbotCommunityInfo": "Chatbot community info"#"ChatbotCommunityInfo": "InformaÃ§Ãµes do fluxo na comunidade"#g' \
    -e 's#"AddsTheBelowInformations": "Adds the below informations to describe to the community what your chatbot does"#"AddsTheBelowInformations": "Preencha as informaÃ§Ãµes abaixo para descrever o que o fluxo faz"#g' \
    -e 's#"MainCategory": "Main Category"#"MainCategory": "Categoria principal"#g' \
    -e 's#"SelectCategory": "Select a category and press enter"#"SelectCategory": "Selecione uma categoria e pressione Enter"#g' \
    -e 's#"YourCommunityProfile": " Your community profile"#"YourCommunityProfile": " Seu perfil na comunidade"#g' \
    -e 's#"EnterYourInformation": "Enter your information which will be shown to the community for all chatbots you post live"#"EnterYourInformation": "Informe os dados que aparecerÃ£o na comunidade para os fluxos publicados"#g' \
    -e 's#"ExportAndImport": "Export and Import"#"ExportAndImport": "Exportar e importar"#g' \
    -e 's#"ExportAsJSON": "Export as JSON"#"ExportAsJSON": "Exportar como JSON"#g' \
    -e 's#"ImportFromJSON": "Import from JSON"#"ImportFromJSON": "Importar de JSON"#g' \
    -e 's#"ImportFromCSV": "Import from CSV"#"ImportFromCSV": "Importar de CSV"#g' \
    -e 's#"ImportCsvFile": "Import CSV File"#"ImportCsvFile": "Importar arquivo CSV"#g' \
    -e 's#"download": "download"#"download": "baixar"#g' \
    -e 's#"ColumnsSeparatedWith": "Columns separated with:"#"ColumnsSeparatedWith": "Colunas separadas por:"#g' \
    -e 's#"FrequentlyAskedQuestions": "Frequently Asked Questions"#"FrequentlyAskedQuestions": "Perguntas frequentes"#g' \
    -e 's#"Question": "Question"#"Question": "Pergunta"#g' \
    -e 's#"Answer": "Answer"#"Answer": "Resposta"#g' \
    -e 's#"Form": "Form"#"Form": "FormulÃ¡rio"#g' \
    -e 's#"ChooseFile": "CHOOSE FILE"#"ChooseFile": "ESCOLHER ARQUIVO"#g' \
    -e 's#"UploadCsv": "Upload CSV"#"UploadCsv": "Enviar CSV"#g' \
    -e 's#"Completed": "Completed"#"Completed": "ConcluÃ­do"#g' \
    -e 's#"Website": "Website"#"Website": "Site"#g' \
    -e 's#"YourWebSite": "Your Website"#"YourWebSite": "Seu site"#g' \
    -e 's#"PublicEmail": "Public email"#"PublicEmail": "E-mail pÃºblico"#g' \
    -e 's#"YourPublicEmail": "Your public email"#"YourPublicEmail": "Seu e-mail pÃºblico"#g' \
    -e 's#"UpdateYourProfile": "Update your profile"#"UpdateYourProfile": "Atualizar perfil"#g' \
    -e 's#"VoiceProvider":"Voice provider"#"VoiceProvider":"Provedor de voz"#g' \
    -e 's#"VoiceName" :"Voice"#"VoiceName" :"Voz"#g' \
    -e 's#"VoiceLanguage":"Voice language"#"VoiceLanguage":"Idioma da voz"#g' \
    -e 's#"SelectProvider":"Select provider"#"SelectProvider":"Selecionar provedor"#g' \
    -e 's#"SelectAnOption":"Select an option"#"SelectAnOption":"Selecione uma opÃ§Ã£o"#g' \
    -e 's#"VoiceSettings":"Voice settings"#"VoiceSettings":"ConfiguraÃ§Ãµes de voz"#g' \
    -e 's#"Globals": "Globals"#"Globals": "VariÃ¡veis globais"#g' \
    -e 's#"GLOBAL_KEY": "GLOBAL_KEY"#"GLOBAL_KEY": "CHAVE_GLOBAL"#g' \
    -e 's#"value": "value"#"value": "valor"#g' \
    -e 's#"ManageGlobal": "Manage global variable"#"ManageGlobal": "Gerenciar variÃ¡vel global"#g' \
    -e 's#"Options": "Options"#"Options": "OpÃ§Ãµes"#g' \
    -e 's#"LinkCopiedToClipboard": "Link copied to clipboard"#"LinkCopiedToClipboard": "Link copiado"#g' \
    -e 's#"ReleaseHistory": "Release History"#"ReleaseHistory": "HistÃ³rico de publicaÃ§Ãµes"#g' \
    -e 's#"ReleaseNotes": "Release notes"#"ReleaseNotes": "Notas da publicaÃ§Ã£o"#g' \
    -e 's#"EnterNotes": "Enter notes"#"EnterNotes": "Digite as notas"#g' \
    -e 's#"PreparingToPublish": "Preparing to publish"#"PreparingToPublish": "Preparando publicaÃ§Ã£o"#g' \
    -e 's#"InstallWidget": "Install widget"#"InstallWidget": "Instalar widget"#g' \
    -e 's#"Restore": "Restore"#"Restore": "Restaurar"#g' \
    -e 's#"Less": "less"#"Less": "menos"#g' \
    -e 's#"More": "more"#"More": "mais"#g' \
    -e 's#"NoReleaseHistoryAvailable": "No release history available"#"NoReleaseHistoryAvailable": "Nenhum histÃ³rico de publicaÃ§Ã£o disponÃ­vel"#g' \
    -e 's#"PublishYourFlowToSeeTheReleaseHistoryAppearHere": "Publish your Flow to see the release history appear here"#"PublishYourFlowToSeeTheReleaseHistoryAppearHere": "Publique seu fluxo para ver o histÃ³rico aqui"#g' \
    -e 's#"FollowLog": "Follow log"#"FollowLog": "Acompanhar log"#g' \
    -e 's#"DeleteLog": "Delete log"#"DeleteLog": "Excluir log"#g' \
    -e 's#"GetToken": "Get token"#"GetToken": "Gerar token"#g' \
    -e 's#"ClickToGetToken": " Click the '\''Get Token'\'' button to generate the chatbot token"#"ClickToGetToken": " Clique em '\''Gerar token'\'' para criar o token do fluxo"#g' \
    "$file"
}

patch_cds_metadata() {
  mkdir -p "$ROOT/assets/logos"

  cat > "$ROOT/assets/logos/chatcase-icon.svg" <<'EOF'
<svg width="350" height="350" viewBox="0 0 350 350" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M38.2505 250.327C38.1294 250.651 38.0999 251.001 38.1652 251.341C38.2305 251.68 38.3882 251.995 38.6207 252.25C38.8533 252.506 39.1519 252.692 39.4836 252.789C39.8152 252.886 40.1672 252.889 40.5009 252.799L72.9704 244.32C75.2698 243.729 77.711 243.965 79.8699 244.987C84.2552 247.08 88.8796 249.132 93.743 251.143C97.0897 252.527 99.7193 254.612 101.632 257.398C105.011 262.325 109.768 269.552 115.9 279.078C116.857 280.578 116.453 281.245 114.689 281.081C96.9991 279.416 81.1476 274.579 67.1343 266.569C64.7603 265.218 62.0401 265.135 58.9737 266.322C39.7837 273.771 21.1543 280.314 3.08543 285.951C2.86553 286.015 2.63178 286.016 2.41134 285.954C2.19089 285.891 1.99278 285.767 1.84002 285.596C1.68725 285.425 1.58609 285.214 1.54827 284.988C1.51046 284.762 1.53755 284.53 1.6264 284.319L24.1053 233.962C24.4819 233.126 24.6344 232.208 24.5476 231.297C24.4609 230.386 24.1379 229.515 23.6107 228.77C19.077 222.26 16.0848 217.53 14.634 214.58C-4.77025 175.141 -4.87741 136.518 14.3125 98.7109C33.1068 61.6536 71.0168 35.4489 112.933 31.5676C139.789 29.079 165.301 34.7732 189.47 48.6501C191.597 49.8697 191.506 50.8998 189.198 51.7403L162.763 61.3569C161.108 61.9668 159.296 62.0275 157.594 61.53C135.783 55.1766 112.117 54.7316 91.0228 62.3458C36.3463 82.0487 11.4687 141.998 33.181 194.951C36.2639 202.45 40.7234 210.427 46.5595 218.882C47.1643 219.77 47.5513 220.787 47.6888 221.848C47.8264 222.909 47.7106 223.985 47.3509 224.988L38.2505 250.327Z" fill="#02D05C"/>
<path d="M325.895 265.14L348.947 316.288C349.05 316.507 349.083 316.752 349.042 316.99C349.002 317.228 348.89 317.449 348.72 317.624C348.55 317.799 348.33 317.92 348.09 317.972C347.849 318.024 347.598 318.004 347.369 317.914C332.642 312.116 314.586 305.743 293.202 298.795C289.143 297.481 286.069 297.3 283.981 298.253C240.655 318.16 200.147 317.167 162.458 295.272C117.118 268.934 92.3156 217.441 102.128 165.627C116.157 91.6146 189.899 46.3547 262.014 68.7506C278.286 73.8096 292.66 81.5623 305.135 92.0088C338.074 119.603 355.949 164.863 348.207 207.807C344.723 227.205 337.458 244.616 326.412 260.04C325.887 260.775 325.563 261.632 325.473 262.527C325.382 263.422 325.527 264.323 325.895 265.14ZM302.177 252.229C305.678 246.957 308.743 242.054 311.373 237.52C334.45 197.755 326.733 147.444 294.164 116.08C251.265 74.7129 180.777 81.0203 145.471 128.276C125.517 154.967 120.381 184.861 130.062 217.958C134.023 231.575 141.116 243.795 151.339 254.619C173.052 277.631 199.498 288.349 230.678 286.772C245.076 286.049 258.349 282.419 270.495 275.882C271.749 275.215 273.224 275.04 274.637 275.389L308.981 283.741C309.622 283.896 310.277 283.874 310.84 283.677C311.403 283.481 311.842 283.122 312.088 282.657C312.17 282.509 312.071 282.074 311.792 281.351C308.406 272.432 305.094 263.587 301.856 254.816C301.704 254.388 301.653 253.931 301.709 253.482C301.765 253.033 301.925 252.604 302.177 252.229Z" fill="#F8A405"/>
<path d="M259 174C274.464 174 287 161.016 287 145C287 128.984 274.464 116 259 116C243.536 116 231 128.984 231 145C231 161.016 243.536 174 259 174Z" fill="#F8A405"/>
<path d="M183 197C203.435 197 220 180.435 220 160C220 139.565 203.435 123 183 123C162.565 123 146 139.565 146 160C146 180.435 162.565 197 183 197Z" fill="#0130FD"/>
<path d="M254.236 255.181C274.615 257.718 293.168 243.457 295.676 223.326C298.184 203.196 283.697 184.82 263.318 182.282C242.939 179.744 224.385 194.006 221.877 214.136C219.369 234.267 233.857 252.643 254.236 255.181Z" fill="#0130FD"/>
<path d="M191.141 250.962C202.255 249.99 210.485 240.305 209.525 229.331C208.564 218.356 198.777 210.247 187.663 211.219C176.55 212.191 168.32 221.876 169.28 232.851C170.24 243.825 180.028 251.934 191.141 250.962Z" fill="#F8A405"/>
</svg>
EOF

  if [ -f "$ROOT/index.html" ]; then
    sed -i 's#<link[^>]*rel="icon"[^>]*>##g' "$ROOT/index.html"
    sed -i 's#<link[^>]*rel="shortcut icon"[^>]*>##g' "$ROOT/index.html"
    sed -i 's#<link[^>]*apple-touch-icon[^>]*>##g' "$ROOT/index.html"
    sed -i 's#</head>#<link rel="icon" type="image/svg+xml" href="assets/logos/chatcase-icon.svg?v=20260525-ptbr8"></head>#' "$ROOT/index.html"
  fi
}

patch_cds_performance() {
  find "$ROOT" -maxdepth 1 -type f -name '*.js' -print | while read -r file; do
    name="${file##*/}"

    case "$name" in
      *-chatcase-ptbr8.js|chatcase-cds-channel-guard.js)
        continue
        ;;
    esac

    if grep -q 'showStageForLimitTime()},2e4' "$file" || grep -q 'showStageForLimitTime()},1200' "$file"; then
      sed -i 's#setTimeout(()=>{this.showStageForLimitTime()},2e4)#setTimeout(()=>{this.showStageForLimitTime()},1200)#g' "$file"

      chunk_id="${name%%.*}"
      hash_part="${name#*.}"
      hash_part="${hash_part%.js}"
      versioned_hash="${hash_part}-chatcase-ptbr8"
      versioned_name="${chunk_id}.${versioned_hash}.js"

      cp "$file" "$ROOT/$versioned_name"

      find "$ROOT" -maxdepth 1 -type f -name '*.js' -print | while read -r runtime_candidate; do
        sed -i "s#${chunk_id}:\"${hash_part}\"#${chunk_id}:\"${versioned_hash}\"#g" "$runtime_candidate"
      done
    fi
  done

  if [ -f "$ROOT/index.html" ]; then
    find "$ROOT" -maxdepth 1 -type f -name '*.js' -print | while read -r script; do
      script_name="${script##*/}"

      case "$script_name" in
        [0-9]*.*.js|common.*.js|chatcase-cds-channel-guard.js|*-chatcase-ptbr8.js)
          continue
          ;;
      esac

      sed -i "s#src=\"$script_name?v=[^\"]*\"#src=\"$script_name\"#g" "$ROOT/index.html"
      sed -i "s#src=\"$script_name\"#src=\"$script_name?v=20260525-ptbr8\"#g" "$ROOT/index.html"
    done
  fi
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
  var lastLocation = '';
  var pendingMutationRoots = [];
  var mutationWorkScheduled = false;
  var textTranslations = {
    'ChatCase Design Studio': 'ChatCase Est\u00fadio de Fluxos',
    'Design Studio': 'Est\u00fadio de Fluxos',
    'Rule name:': 'Nome da regra:',
    'Rule name': 'Nome da regra',
    'Url:': 'URL:',
    'URL:': 'URL:',
    'Every:': 'A cada:',
    'always': 'sempre',
    'Action': 'A\u00e7\u00e3o',
    'Message:': 'Mensagem:',
    'ADD RULE': 'ADICIONAR REGRA',
    'Add Rule': 'Adicionar regra',
    'Update Rule': 'Atualizar regra',
    'Delete Rule': 'Excluir regra',
    'any': 'qualquer',
    'starts': 'come\u00e7a com',
    'ends': 'termina com',
    'contains': 'cont\u00e9m',
    'custom': 'personalizado',
    'Manage global variable': 'Gerenciar vari\u00e1vel global',
    'Key': 'Chave',
    'Value': 'Valor',
    'GLOBAL_KEY': 'CHAVE_GLOBAL',
    'value': 'valor',
    'Release History': 'Hist\u00f3rico de publica\u00e7\u00f5es',
    'No release history available': 'Nenhum hist\u00f3rico de publica\u00e7\u00e3o dispon\u00edvel',
    'Publish your Flow to see the release history appear here': 'Publique seu fluxo para ver o hist\u00f3rico aqui',
    'Bot details': 'Detalhes do fluxo',
    'Export': 'Exportar',
    'Community': 'Comunidade',
    'Developer': 'Desenvolvedor',
    'Advanced': 'Avan\u00e7ado',
    'Profile': 'Perfil',
    'Avatar': 'Avatar',
    'Upload image': 'Enviar imagem',
    'Name': 'Nome',
    'Update Bot': 'Atualizar fluxo',
    'Be careful in modifying the slug name. It is used to reference chatbots in the flow': 'Tenha cuidado ao alterar o slug. Ele referencia o fluxo nas automa\u00e7\u00f5es.',
    'Be careful in modifying the slug name. It is used to reference chatbots in the flow Learn more': 'Tenha cuidado ao alterar o slug. Ele referencia o fluxo nas automa\u00e7\u00f5es. Saiba mais',
    'Learn more': 'Saiba mais',
    'Departments': 'Departamentos',
    'Default Department': 'Departamento padr\u00e3o',
    'Departments this bot is associated with': 'Departamentos associados a este fluxo',
    'Manage all bots and departments in': 'Gerencie todos os fluxos e departamentos em',
    'Routing & Depts': 'Roteamento e departamentos',
    'Agents available': 'Atendentes dispon\u00edveis',
    'Available to agents': 'Dispon\u00edvel para atendentes',
    'A chatbot with this option is visible to agents for the purpose to be put back in the conversation': 'Com esta op\u00e7\u00e3o, o fluxo fica vis\u00edvel para atendentes retomarem a conversa',
    'JSON': 'JSON',
    'Chatbot': 'Fluxo',
    'Export As JSON': 'Exportar como JSON',
    'Chatbot info': 'Informa\u00e7\u00f5es do fluxo',
    'Personal Info': 'Informa\u00e7\u00f5es pessoais',
    'Chatbot community info': 'Informa\u00e7\u00f5es do fluxo na comunidade',
    'Adds the below informations to describe to the community what your chatbot does': 'Preencha as informa\u00e7\u00f5es abaixo para descrever o que o fluxo faz',
    'Main Category *': 'Categoria principal *',
    'Main Category': 'Categoria principal',
    'Select a category and press enter': 'Selecione uma categoria e pressione Enter',
    'Short Description *': 'Descri\u00e7\u00e3o curta *',
    'Short Description': 'Descri\u00e7\u00e3o curta',
    'Markdown supported - use the Markdown language to enrich your text': 'Markdown suportado - use Markdown para enriquecer o texto',
    'Tags': 'Etiquetas',
    'Type to create a tag and press enter': 'Digite para criar uma etiqueta e pressione Enter',
    'Go Live On Community': 'Publicar na comunidade',
    'Your community profile': 'Seu perfil na comunidade',
    'Enter your information which will be shown to the community for all chatbots you post live': 'Informe os dados que aparecer\u00e3o na comunidade para os fluxos publicados',
    'Website': 'Site',
    'Your Website': 'Seu site',
    'Public email': 'E-mail p\u00fablico',
    'Your public email': 'Seu e-mail p\u00fablico',
    'Your description': 'Sua descri\u00e7\u00e3o',
    'UpdateYourProfile': 'Atualizar perfil',
    'Token': 'Token',
    "Click the 'Get Token' button to generate the chatbot token": 'Clique em Gerar token para criar o token do fluxo',
    'Get Token': 'Gerar token',
    'The language of the chatbot': 'Idioma do fluxo',
    'Language': 'Idioma',
    'Portuguese - pt': 'Portugu\u00eas - pt',
    'Change': 'Alterar',
    'Cancel': 'Cancelar',
    'Adicionar': 'Adicionar',
    '+ Add': '+ Adicionar',
    '+Adicionar': '+ Adicionar',
    'Blocks': 'Blocos',
    'Rules': 'Regras',
    'Globals': 'Vari\u00e1veis globais',
    'No global variables': 'Nenhuma vari\u00e1vel global',
    'Global variables are a set of variables that are always available in your flows': 'Vari\u00e1veis globais ficam sempre dispon\u00edveis nos seus fluxos',
    'No global variables Global variables are a set of variables that are always available in your flows': 'Nenhuma vari\u00e1vel global Vari\u00e1veis globais ficam sempre dispon\u00edveis nos seus fluxos'
  };
  var placeholderTranslations = {
    'GLOBAL_KEY': 'CHAVE_GLOBAL',
    'value': 'valor',
    'Title': 'T\u00edtulo',
    'Short Description': 'Descri\u00e7\u00e3o curta',
    'Your Website': 'Seu site',
    'Your public email': 'Seu e-mail p\u00fablico',
    'Your description': 'Sua descri\u00e7\u00e3o',
    'Type to create a tag and press enter': 'Digite para criar uma etiqueta e pressione Enter',
    'Select a category and press enter': 'Selecione uma categoria e pressione Enter'
  };
  var titleTranslations = {
    'Design studio': 'Est\u00fadio de Fluxos',
    'Rules': 'Regras',
    'Globals': 'Vari\u00e1veis globais',
    'Publish history': 'Hist\u00f3rico de publica\u00e7\u00f5es',
    'Detail': 'Detalhes',
    'Blocks': 'Blocos'
  };

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

  function collapseWhitespace(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function preserveWhitespace(original, translated) {
    var prefix = (String(original).match(/^\s*/) || [''])[0];
    var suffix = (String(original).match(/\s*$/) || [''])[0];
    return prefix + translated + suffix;
  }

  function hasMojibake(value) {
    return /[\u00c2\u00c3]/.test(String(value || ''));
  }

  function repairMojibake(value) {
    var output = String(value || '');

    for (var index = 0; index < 3 && hasMojibake(output); index += 1) {
      try {
        var repaired = decodeURIComponent(escape(output));
        if (!repaired || repaired === output) {
          break;
        }
        output = repaired;
      } catch (error) {
        break;
      }
    }

    return output;
  }

  function getElementRoot(root) {
    if (!root || root === document || root.nodeType === Node.DOCUMENT_NODE) {
      return document.body;
    }

    if (root.nodeType === Node.TEXT_NODE) {
      return root.parentElement || document.body;
    }

    return root.nodeType === Node.ELEMENT_NODE ? root : document.body;
  }

  function queueMutationRoot(node) {
    var root;

    if (!node || node.nodeType === Node.COMMENT_NODE) {
      return;
    }

    root = node.nodeType === Node.TEXT_NODE ? node : getElementRoot(node);

    if (!root || pendingMutationRoots.indexOf(root) !== -1) {
      return;
    }

    pendingMutationRoots.push(root);
  }

  function translateSingleTextNode(node) {
    var key = collapseWhitespace(node.nodeValue);

    if (textTranslations[key]) {
      node.nodeValue = preserveWhitespace(node.nodeValue, textTranslations[key]);
    } else if (hasMojibake(node.nodeValue)) {
      node.nodeValue = repairMojibake(node.nodeValue);
    }
  }

  function translateTextNodes(root) {
    if (!document.body || typeof document.createTreeWalker !== 'function') {
      return;
    }

    if (root && root.nodeType === Node.TEXT_NODE) {
      translateSingleTextNode(root);
      return;
    }

    var elementRoot = getElementRoot(root);
    if (!elementRoot) {
      return;
    }

    var walker = document.createTreeWalker(elementRoot, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        var value = collapseWhitespace(node.nodeValue);

        if (!value || !parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/i.test(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }

        return textTranslations[value] || hasMojibake(value) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [];

    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach(function (node) {
      translateSingleTextNode(node);
    });
  }

  function translateAttributes(root) {
    var elementRoot = getElementRoot(root);
    var selector = '[placeholder], [title], [aria-label], input[type="button"], input[type="submit"]';
    var elements = [];

    if (!elementRoot) {
      return;
    }

    if (elementRoot.matches && elementRoot.matches(selector)) {
      elements.push(elementRoot);
    }

    Array.prototype.push.apply(elements, elementRoot.querySelectorAll ? Array.prototype.slice.call(elementRoot.querySelectorAll(selector)) : []);

    elements.forEach(function (element) {
      ['placeholder', 'title', 'aria-label'].forEach(function (attribute) {
        var value = element.getAttribute(attribute);
        var key = collapseWhitespace(value);

        if (key && (placeholderTranslations[key] || textTranslations[key])) {
          element.setAttribute(attribute, placeholderTranslations[key] || textTranslations[key]);
        } else if (hasMojibake(value)) {
          element.setAttribute(attribute, repairMojibake(value));
        }
      });

      if (element.value) {
        var valueKey = collapseWhitespace(element.value);
        if (textTranslations[valueKey]) {
          element.value = textTranslations[valueKey];
        }
      }
    });
  }

  function translatePortuguese(root) {
    Object.keys(titleTranslations).forEach(function (key) {
      document.title = String(document.title || '').replace(new RegExp(key, 'ig'), titleTranslations[key]);
    });

    translateTextNodes(root || document.body);
    translateAttributes(root || document.body);
  }

  function collectBlockedTargets(root, hiddenTargets) {
    var elementRoot = getElementRoot(root);
    var elements = [];

    if (!elementRoot) {
      return;
    }

    if (elementRoot.nodeType === Node.ELEMENT_NODE) {
      elements.push(elementRoot);
    }

    Array.prototype.push.apply(elements, elementRoot.querySelectorAll ? Array.prototype.slice.call(elementRoot.querySelectorAll('*')) : []);

    elements.forEach(function (element) {
      if (matchesBlockedLabel(element)) {
        hiddenTargets.push(findSmallContainer(element));
      }
    });
  }

  function processMutationRoots() {
    var roots = pendingMutationRoots.splice(0, pendingMutationRoots.length);
    var channel = getChannelFromLocation();
    var hideWaba = shouldHideWabaActions(channel);
    var hiddenTargets = [];

    mutationWorkScheduled = false;
    updateBadge(channel);

    roots.forEach(function (root) {
      translatePortuguese(root);
      if (hideWaba) {
        collectBlockedTargets(root, hiddenTargets);
      }
    });

    hiddenTargets.forEach(function (element) {
      setHidden(element, true);
    });
  }

  function scheduleMutationWork() {
    if (mutationWorkScheduled) {
      return;
    }

    mutationWorkScheduled = true;
    var schedule = window.requestIdleCallback || function (callback) {
      return window.setTimeout(callback, 120);
    };

    schedule(processMutationRoots, { timeout: 500 });
  }

  function applyGuard() {
    var channel = getChannelFromLocation();
    var hideWaba = shouldHideWabaActions(channel);
    var hiddenTargets = [];

    updateBadge(channel);
    translatePortuguese();

    Array.prototype.forEach.call(document.querySelectorAll('[data-chatcase-channel-hidden="waba-only"]'), function (element) {
      setHidden(element, false);
    });

    if (!hideWaba) {
      return;
    }

    collectBlockedTargets(document.body, hiddenTargets);

    hiddenTargets.forEach(function (element) {
      setHidden(element, true);
    });
  }

  function start() {
    lastChannel = getChannelFromLocation();
    lastLocation = window.location.href;
    applyGuard();
    observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
            queueMutationRoot(node);
          });
        } else if (mutation.target) {
          queueMutationRoot(mutation.target);
        }
      });

      if (pendingMutationRoots.length) {
        scheduleMutationWork();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label', 'value'] });

    window.setInterval(function () {
      var channel = getChannelFromLocation();
      var currentLocation = window.location.href;
      if (channel !== lastChannel || currentLocation !== lastLocation) {
        lastChannel = channel;
        lastLocation = currentLocation;
        applyGuard();
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());
EOF

  if [ -f "$ROOT/index.html" ] && grep -q "chatcase-cds-channel-guard.js" "$ROOT/index.html"; then
    sed -i 's#chatcase-cds-channel-guard.js?v=[A-Za-z0-9._-]*#chatcase-cds-channel-guard.js?v=20260525-ptbr8#g' "$ROOT/index.html"
  elif [ -f "$ROOT/index.html" ]; then
    sed -i 's#</body>#<script src="chatcase-cds-channel-guard.js?v=20260525-ptbr8"></script></body>#' "$ROOT/index.html"
  fi
}

patch_static_text
patch_cds_metadata
patch_cds_performance

for lang in "$ROOT"/assets/i18n/*.json; do
  patch_i18n "$lang"
done

patch_channel_guard
