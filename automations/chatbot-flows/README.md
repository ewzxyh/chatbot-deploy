# Chatbot flows

Este diretorio guarda fluxos de automacao importaveis no Tiledesk/ChatCase.

## `whatsapp-menu-basic.json`

Fluxo inicial para canais de mensagem como WhatsApp, CaseZap/UAZAPI e Telegram:

- `/start` abre um menu numerico simples com botoes nativos quando o canal suporta;
- `1` retorna informacoes de planos;
- `2` orienta encaminhamento para atendente;
- mensagens desconhecidas caem em `defaultFallback`.

O fluxo preserva texto e numeros como fallback universal, mas tambem carrega `attributes.attachment.buttons`. No WABA esse formato vira mensagem interativa de botoes/lista pelo tradutor WhatsApp; no CaseZap/UAZAPI vira `/send/menu`. Os intents de destino tambem possuem `attributes.aliases`; no import do ChatCase esses aliases viram perguntas auxiliares persistidas, entao clicar em "Ver planos" resolve o mesmo bloco de digitar `1`.

## Teste local

O teste usa o motor real do Tybot instalado em `..\chatcase-tiledesk-server` e uma fonte de dados em memoria:

```powershell
node scripts\test-chatbot-flow-engine.js
```

Se o `tiledesk-server` estiver em outro caminho:

```powershell
$env:TILEDESK_SERVER_DIR="C:\caminho\para\tiledesk-server"
node scripts\test-chatbot-flow-engine.js
```

Para validar outro arquivo de fluxo:

```powershell
$env:CHATBOT_FLOW_FILE="C:\caminho\para\fluxo.json"
node scripts\test-chatbot-flow-engine.js
```

## Importar no Tiledesk local

Com o Docker local rodando, informe o projeto e as credenciais do admin:

```powershell
$env:CHATCASE_BASE_URL="http://localhost:8081"
$env:CHATCASE_PROJECT_ID="<project-id>"
$env:CHATCASE_ADMIN_EMAIL="<admin-email>"
$env:CHATCASE_ADMIN_PASSWORD="<admin-password>"
node scripts\import-chatbot-flow.js
```

Por padrao o script usa a rota `/api/<project-id>/faq_kb/importjson/null?create=true` e cria um novo bot a partir do JSON.

## Teste da API local

Para validar a rota oficial contra a stack local, o script abaixo cria um usuario/projeto temporario, importa o fluxo, busca o bot e confere os blocos persistidos:

```powershell
node scripts\test-chatbot-flow-import-api.js
```

O projeto temporario e removido ao fim do teste. Use `--keep-project` se quiser inspecionar o bot no dashboard.

## Templates visiveis na galeria

O `tiledesk-server` publica uma biblioteca inicial de templates certificados ChatCase:

- ID: `chatcase-whatsapp-menu-basic`;
- ID: `chatcase-ecommerce-orders`;
- ID: `chatcase-clinic-scheduling`;
- ID: `chatcase-restaurant-delivery`;
- ID: `chatcase-real-estate-leads`;
- ID: `chatcase-education-courses`;
- rota de lista: `/api/modules/templates/public/templates`;
- rota de detalhe: `/api/modules/templates/public/templates/<template-id>`;
- rota de exportacao JSON: `/api/modules/templates/public/templates/<template-id>/export`;
- importacao no dashboard: usa a rota oficial `faq_kb/fork` com `public=true`.

Para validar a galeria e a importacao por template contra a stack local:

```powershell
node scripts\test-chatbot-template-gallery-api.js
```

O teste cria um usuario/projeto temporario, confirma que os templates aparecem na galeria, valida detalhe/exportacao, importa cada template por `fork` e verifica se os intents foram persistidos.
