(function () {
  'use strict';

  var ENDPOINTS = {
    templates: '/api/modules/templates/public/templates',
    community: '/api/modules/templates/public/community'
  };
  var LABELS = {
    casezap: 'CaseZap',
    whatsapp: 'WhatsApp',
    waba: 'WABA',
    telegram: 'Telegram',
    messenger: 'Messenger',
    sms: 'SMS',
    voice: 'Voice',
    email: 'E-mail',
    widget: 'Widget',
    atendimento: 'Atendimento',
    ecommerce: 'E-commerce',
    pedidos: 'Pedidos',
    vendas: 'Vendas',
    clinica: 'Clinica',
    agendamento: 'Agendamento',
    recepcao: 'Recepcao',
    restaurante: 'Restaurante',
    delivery: 'Delivery',
    cardapio: 'Cardapio',
    imobiliaria: 'Imobiliaria',
    imoveis: 'Imoveis',
    visitas: 'Visitas',
    leads: 'Leads',
    educacao: 'Educacao',
    cursos: 'Cursos',
    matriculas: 'Matriculas',
    'customer satisfaction': 'Satisfacao do cliente',
    'increase sales': 'Aumentar vendas'
  };
  var KNOWN_CHANNELS = ['whatsapp', 'casezap', 'telegram', 'messenger', 'sms', 'voice', 'email', 'widget', 'waba'];

  var fallbackTemplates = [
    {
      _id: 'chatcase-whatsapp-menu-basic',
      certified: true,
      public: true,
      language: 'pt',
      name: 'ChatCase WhatsApp menu basico',
      title: 'Menu basico para WhatsApp',
      description: 'Fluxo inicial de automacao para canais de mensagem: saudacao, menu numerico, planos e encaminhamento para atendimento humano.',
      short_description: 'Menu inicial para WhatsApp e CaseZap com saudacao, opcoes numericas e handoff para atendimento humano.',
      type: 'tilebot',
      subtype: 'chatbot',
      mainCategory: 'Atendimento',
      bigImage: '/dashboard/assets/img/logos/chatcase-logo.svg',
      tags: ['whatsapp', 'casezap', 'atendimento'],
      certifiedTags: [
        { name: 'WhatsApp', color: '#25833e' },
        { name: 'CaseZap', color: '#0049bd' }
      ],
      templateFeatures: [
        'Saudacao automatica com menu numerico',
        'Respostas para planos e atendimento humano',
        'Compatibilidade inicial com WhatsApp e CaseZap'
      ],
      attributes: {
        channels: ['whatsapp', 'casezap'],
        availableChannels: ['whatsapp', 'casezap']
      },
      intentsCount: 5
    },
    {
      _id: 'chatcase-ecommerce-orders',
      certified: true,
      public: true,
      language: 'pt',
      name: 'ChatCase Loja online e pedidos',
      title: 'Loja online e pedidos',
      description: 'Fluxo pronto para lojas que recebem perguntas de WhatsApp sobre pedido, entrega, trocas e atendimento humano.',
      short_description: 'Menu para e-commerce com status de pedido, trocas/devolucoes e handoff para atendente.',
      type: 'tilebot',
      subtype: 'chatbot',
      mainCategory: 'Increase Sales',
      bigImage: '/dashboard/assets/img/logos/chatcase-logo.svg',
      tags: ['whatsapp', 'casezap', 'ecommerce', 'pedidos', 'vendas'],
      certifiedTags: [
        { name: 'WhatsApp', color: '#25833e' },
        { name: 'CaseZap', color: '#0049bd' }
      ],
      templateFeatures: [
        'Triagem de status de pedido e entrega',
        'Orientacao para trocas e devolucoes',
        'Handoff quando o cliente precisa de atendimento humano'
      ],
      attributes: {
        channels: ['whatsapp', 'casezap']
      },
      intentsCount: 6
    },
    {
      _id: 'chatcase-clinic-scheduling',
      certified: true,
      public: true,
      language: 'pt',
      name: 'ChatCase Clinica e agendamentos',
      title: 'Clinica e agendamentos',
      description: 'Fluxo para clinicas, consultorios e servicos com triagem inicial, agendamento, informacoes de valores/convenios e atendimento humano.',
      short_description: 'Menu para agendamento, valores/convenios e encaminhamento para recepcao.',
      type: 'tilebot',
      subtype: 'chatbot',
      mainCategory: 'Customer Satisfaction',
      bigImage: '/dashboard/assets/img/logos/chatcase-logo.svg',
      tags: ['whatsapp', 'casezap', 'clinica', 'agendamento', 'recepcao'],
      certifiedTags: [
        { name: 'WhatsApp', color: '#25833e' },
        { name: 'CaseZap', color: '#0049bd' }
      ],
      templateFeatures: [
        'Coleta inicial de disponibilidade para agendamento',
        'Resposta guiada sobre valores e convenios',
        'Encaminhamento para recepcao quando precisar'
      ],
      attributes: {
        channels: ['whatsapp', 'casezap']
      },
      intentsCount: 6
    },
    {
      _id: 'chatcase-restaurant-delivery',
      certified: true,
      public: true,
      language: 'pt',
      name: 'ChatCase Restaurante e delivery',
      title: 'Restaurante e delivery',
      description: 'Fluxo para restaurantes, lanchonetes e operacoes de delivery com cardapio, horario, status do pedido e atendimento humano.',
      short_description: 'Menu para cardapio, horario de funcionamento, status do pedido e atendimento.',
      type: 'tilebot',
      subtype: 'chatbot',
      mainCategory: 'Increase Sales',
      bigImage: '/dashboard/assets/img/logos/chatcase-logo.svg',
      tags: ['whatsapp', 'casezap', 'restaurante', 'delivery', 'cardapio', 'pedidos'],
      certifiedTags: [
        { name: 'WhatsApp', color: '#25833e' },
        { name: 'CaseZap', color: '#0049bd' }
      ],
      templateFeatures: [
        'Atendimento inicial para delivery',
        'Opcoes de cardapio, horario e status do pedido',
        'Handoff para atendente quando precisar'
      ],
      attributes: {
        channels: ['whatsapp', 'casezap']
      },
      intentsCount: 7
    },
    {
      _id: 'chatcase-real-estate-leads',
      certified: true,
      public: true,
      language: 'pt',
      name: 'ChatCase Imobiliaria e visitas',
      title: 'Imobiliaria e visitas',
      description: 'Fluxo para imobiliarias e corretores captarem interesse, filtrarem compra ou aluguel, agendarem visitas e encaminharem para atendimento.',
      short_description: 'Menu para compra, aluguel, agendamento de visita e atendimento com corretor.',
      type: 'tilebot',
      subtype: 'chatbot',
      mainCategory: 'Increase Sales',
      bigImage: '/dashboard/assets/img/logos/chatcase-logo.svg',
      tags: ['whatsapp', 'casezap', 'imobiliaria', 'imoveis', 'visitas', 'leads'],
      certifiedTags: [
        { name: 'WhatsApp', color: '#25833e' },
        { name: 'CaseZap', color: '#0049bd' }
      ],
      templateFeatures: [
        'Qualificacao inicial para compra ou aluguel',
        'Coleta de bairro, faixa de valor e tipo de imovel',
        'Agendamento de visita com corretor'
      ],
      attributes: {
        channels: ['whatsapp', 'casezap']
      },
      intentsCount: 7
    },
    {
      _id: 'chatcase-education-courses',
      certified: true,
      public: true,
      language: 'pt',
      name: 'ChatCase Cursos e matriculas',
      title: 'Cursos e matriculas',
      description: 'Fluxo para escolas, cursos livres e treinamentos responderem sobre cursos, valores, matricula e atendimento humano.',
      short_description: 'Menu para cursos, valores, matricula e atendimento com consultor.',
      type: 'tilebot',
      subtype: 'chatbot',
      mainCategory: 'Increase Sales',
      bigImage: '/dashboard/assets/img/logos/chatcase-logo.svg',
      tags: ['whatsapp', 'casezap', 'educacao', 'cursos', 'matriculas', 'leads'],
      certifiedTags: [
        { name: 'WhatsApp', color: '#25833e' },
        { name: 'CaseZap', color: '#0049bd' }
      ],
      templateFeatures: [
        'Triagem de interesse por curso',
        'Resposta inicial sobre valores e formas de pagamento',
        'Encaminhamento para consultor de matricula'
      ],
      attributes: {
        channels: ['whatsapp', 'casezap']
      },
      intentsCount: 7
    }
  ];

  var state = {
    templates: [],
    filtered: [],
    detailById: {},
    query: '',
    channel: 'all',
    category: 'all',
    selectedId: new URLSearchParams(window.location.search).get('template') || null,
    apiNotice: ''
  };

  var els = {};

  document.addEventListener('DOMContentLoaded', function () {
    els.status = document.getElementById('templates-status');
    els.search = document.getElementById('template-search');
    els.grid = document.getElementById('templates-grid');
    els.detail = document.getElementById('template-detail');
    els.resultCount = document.getElementById('result-count');
    els.channelFilters = document.getElementById('channel-filters');
    els.categoryFilters = document.getElementById('category-filters');
    els.summaryTotal = document.getElementById('summary-total');
    els.summaryChannels = document.getElementById('summary-channels');
    els.summaryCertified = document.getElementById('summary-certified');

    els.search.addEventListener('input', function (event) {
      state.query = event.target.value.trim().toLowerCase();
      applyFilters();
    });

    loadTemplates();
  });

  function fetchJson(url) {
    return fetch(url, {
      headers: {
        Accept: 'application/json'
      },
      credentials: 'same-origin'
    }).then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      return response.json();
    });
  }

  function normalizeListPayload(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    return payload.templates || payload.chatbots || payload.data || payload.results || [];
  }

  function unique(values) {
    var seen = {};
    return values.filter(function (value) {
      var key = String(value || '').trim().toLowerCase();
      if (!key || seen[key]) {
        return false;
      }
      seen[key] = true;
      return true;
    });
  }

  function titleCase(value) {
    return String(value || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function labelFor(value) {
    var key = String(value || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    return LABELS[key] || titleCase(value);
  }

  function textOnly(value) {
    var div = document.createElement('div');
    div.innerHTML = String(value || '');
    return div.textContent.replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeTemplate(item) {
    var id = String(item._id || item.id || item.bot_id || item.uid || '').trim();
    var certifiedTags = Array.isArray(item.certifiedTags) ? item.certifiedTags : [];
    var rawTags = Array.isArray(item.tags) ? item.tags : [];
    var explicitChannels = item.attributes && Array.isArray(item.attributes.availableChannels) ? item.attributes.availableChannels :
      item.attributes && Array.isArray(item.attributes.channels) ? item.attributes.channels : [];
    var certifiedTagNames = certifiedTags.map(function (tag) { return tag && tag.name; });
    var channelCandidates = explicitChannels.concat(certifiedTagNames).concat(rawTags.filter(function (tag) {
      return KNOWN_CHANNELS.indexOf(String(tag || '').trim().toLowerCase()) !== -1;
    }));
    var channels = unique(channelCandidates)
      .map(function (tag) {
        return String(tag).trim();
      });
    var tags = unique(rawTags.concat(certifiedTagNames));
    var title = item.title || item.name || 'Modelo ChatCase';
    var description = textOnly(item.shortDescription || item.short_description || item.description || '');
    var fullDescription = textOnly(item.description || item.short_description || item.shortDescription || '');
    var features = Array.isArray(item.templateFeatures) ? item.templateFeatures : [];
    var intentsCount = Array.isArray(item.intents) ? item.intents.length : Number(item.intentsCount || item.intents_count || 0);

    return {
      id: id,
      name: title,
      rawName: item.name || title,
      description: description || 'Modelo pronto para acelerar a configuracao do atendimento.',
      fullDescription: fullDescription || description || 'Modelo pronto para acelerar a configuracao do atendimento.',
      category: item.mainCategory || item.category || 'Atendimento',
      language: item.language || item.lang || 'pt',
      image: item.bigImage || item.image || item.photoUrl || '/dashboard/assets/img/logos/chatcase-logo.svg',
      channels: channels.length ? channels : ['atendimento'],
      tags: tags.length ? tags : channels,
      certified: item.certified === true,
      type: item.type || 'template',
      subtype: item.subtype || '',
      features: features.length ? features : buildFeatures(item, intentsCount),
      intentsCount: intentsCount,
      source: item
    };
  }

  function buildFeatures(item, intentsCount) {
    var features = [];

    if (intentsCount) {
      features.push(intentsCount + ' intents de automacao importaveis');
    }

    if (item.attributes && (Array.isArray(item.attributes.availableChannels) || Array.isArray(item.attributes.channels))) {
      var channels = Array.isArray(item.attributes.availableChannels) ? item.attributes.availableChannels : item.attributes.channels;
      features.push('Canais suportados: ' + channels.map(titleCase).join(', '));
    }

    features.push('Pronto para editar no construtor visual');
    return features;
  }

  function loadTemplates() {
    setStatus('Carregando modelos publicos...');

    fetchJson(ENDPOINTS.templates)
      .then(function (payload) {
        var list = normalizeListPayload(payload);
        if (!list.length) {
          return fetchJson(ENDPOINTS.community).then(normalizeListPayload);
        }

        return list;
      })
      .then(function (list) {
        state.templates = list.map(normalizeTemplate).filter(function (template) {
          return template.id;
        });

        if (!state.templates.length) {
          throw new Error('Lista vazia');
        }

        state.apiNotice = '';
        completeLoad();
      })
      .catch(function () {
        state.templates = fallbackTemplates.map(normalizeTemplate);
        state.apiNotice = 'API local indisponivel; exibindo modelos base ChatCase.';
        completeLoad();
      });
  }

  function completeLoad() {
    if (!state.selectedId || !findTemplate(state.selectedId)) {
      state.selectedId = state.templates[0] && state.templates[0].id;
    }

    renderFilters();
    applyFilters();
    updateSummary();

    if (state.selectedId) {
      hydrateDetail(state.selectedId);
    }
  }

  function setStatus(message) {
    els.status.textContent = message;
  }

  function getChannelOptions() {
    var channels = [];
    state.templates.forEach(function (template) {
      channels = channels.concat(template.channels);
    });

    return unique(channels).map(labelFor).sort();
  }

  function getCategoryOptions() {
    return unique(state.templates.map(function (template) {
      return template.category;
    })).map(labelFor).sort();
  }

  function renderFilters() {
    renderFilterGroup(els.channelFilters, 'channel', ['Todos'].concat(getChannelOptions()));
    renderFilterGroup(els.categoryFilters, 'category', ['Todas categorias'].concat(getCategoryOptions()));
  }

  function renderFilterGroup(container, key, options) {
    container.innerHTML = options.map(function (option, index) {
      var value = index === 0 ? 'all' : option.toLowerCase();
      var pressed = state[key] === value;
      return '<button type="button" class="filter-chip" data-filter="' + key + '" data-value="' + escapeHtml(value) + '" aria-pressed="' + pressed + '">' + escapeHtml(option) + '</button>';
    }).join('');

    container.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        state[key] = button.getAttribute('data-value');
        renderFilters();
        applyFilters();
      });
    });
  }

  function matchesTemplate(template) {
    var query = state.query;
    var haystack = [
      template.name,
      template.description,
      template.category,
      template.language,
      template.channels.join(' ')
    ].join(' ').toLowerCase();
    var channelMatch = state.channel === 'all' || template.channels.some(function (channel) {
      return labelFor(channel).toLowerCase() === state.channel;
    });
    var categoryMatch = state.category === 'all' || labelFor(template.category).toLowerCase() === state.category;
    var queryMatch = !query || haystack.indexOf(query) !== -1;

    return channelMatch && categoryMatch && queryMatch;
  }

  function applyFilters() {
    state.filtered = state.templates.filter(matchesTemplate);

    if (!state.filtered.some(function (template) { return template.id === state.selectedId; }) && state.filtered[0]) {
      state.selectedId = state.filtered[0].id;
      hydrateDetail(state.selectedId);
    }

    renderGrid();
    renderDetail();
    setStatus(state.apiNotice || 'Modelos carregados da API publica do ChatCase.');
  }

  function renderGrid() {
    els.resultCount.textContent = state.filtered.length + ' modelo(s) encontrado(s)';

    if (!state.filtered.length) {
      els.grid.innerHTML = '<div class="empty-state">Nenhum modelo encontrado para os filtros atuais.</div>';
      return;
    }

    els.grid.innerHTML = state.filtered.map(function (template) {
      var cardTags = unique(template.channels.concat(template.tags || [])).slice(0, 4);
      var tags = cardTags.map(function (tag, index) {
        var variant = index === 0 ? ' is-green' : index === 1 ? ' is-orange' : '';
        return '<span class="tag' + variant + '">' + escapeHtml(labelFor(tag)) + '</span>';
      }).join('');
      var selected = template.id === state.selectedId ? ' is-selected' : '';
      var certified = template.certified ? '<span class="certified-mark">OK</span>' : '';

      return '' +
        '<button type="button" class="template-card' + selected + '" data-template-id="' + escapeHtml(template.id) + '">' +
          '<span class="template-media"><img src="' + escapeHtml(template.image) + '" alt=""></span>' +
          '<span class="template-title-row"><h3>' + escapeHtml(template.name) + '</h3>' + certified + '</span>' +
          '<p>' + escapeHtml(template.description) + '</p>' +
          '<span class="tag-list">' + tags + '</span>' +
        '</button>';
    }).join('');

    els.grid.querySelectorAll('[data-template-id]').forEach(function (card) {
      card.addEventListener('click', function () {
        selectTemplate(card.getAttribute('data-template-id'));
      });
    });
  }

  function selectTemplate(id) {
    state.selectedId = id;
    var url = new URL(window.location.href);
    url.searchParams.set('template', id);
    window.history.replaceState({}, '', url.toString());
    hydrateDetail(id);
    renderGrid();
    renderDetail();
  }

  function findTemplate(id) {
    return state.templates.find(function (template) {
      return template.id === id;
    });
  }

  function hydrateDetail(id) {
    var channel = getSelectedChannelForTemplate(findTemplate(id));
    var cacheKey = id + ':' + channel;

    if (state.detailById[cacheKey]) {
      return;
    }

    fetchJson(ENDPOINTS.templates + '/' + encodeURIComponent(id) + '?channel=' + encodeURIComponent(channel))
      .then(function (payload) {
        state.detailById[cacheKey] = normalizeTemplate(Object.assign({}, findTemplate(id) ? findTemplate(id).source : {}, payload, { _id: id }));
        renderDetail();
      })
      .catch(function () {
        state.detailById[cacheKey] = findTemplate(id);
        renderDetail();
      });
  }

  function renderDetail() {
    var baseTemplate = findTemplate(state.selectedId);
    var cacheKey = state.selectedId + ':' + getSelectedChannelForTemplate(baseTemplate);
    var template = state.detailById[cacheKey] || baseTemplate;

    if (!template) {
      els.detail.innerHTML = '<div class="detail-empty"><strong>Selecione um modelo</strong><span>Os detalhes e a acao de importacao aparecem aqui.</span></div>';
      return;
    }

    var featureItems = template.features.slice(0, 5).map(function (feature) {
      return '<li>' + escapeHtml(feature) + '</li>';
    }).join('');
    var tags = template.channels.map(function (channel) {
      return '<span class="tag">' + escapeHtml(labelFor(channel)) + '</span>';
    }).join('');
    var selectedChannel = getSelectedChannelForTemplate(template);
    var installParams = 'template=' + encodeURIComponent(template.id) + '&install=1&source=community&channel=' + encodeURIComponent(selectedChannel);
    var installHref = '/dashboard/#/projects?' + installParams;
    var signupHref = '/dashboard/#/signup?' + installParams;
    var exportHref = ENDPOINTS.templates + '/' + encodeURIComponent(template.id) + '/export?channel=' + encodeURIComponent(selectedChannel);

    els.detail.innerHTML = '' +
      '<div class="detail-cover"><img src="' + escapeHtml(template.image) + '" alt=""></div>' +
      '<div class="detail-body">' +
        '<div>' +
          '<h3>' + escapeHtml(template.name) + '</h3>' +
          '<p class="detail-description">' + escapeHtml(template.fullDescription) + '</p>' +
        '</div>' +
        '<div class="tag-list">' + tags + '</div>' +
        '<div class="detail-meta">' +
          '<div><strong>' + escapeHtml(labelFor(template.category)) + '</strong><span>Categoria</span></div>' +
          '<div><strong>' + escapeHtml(template.intentsCount || '-') + '</strong><span>Intents</span></div>' +
          '<div><strong>' + escapeHtml(template.language.toUpperCase()) + '</strong><span>Idioma</span></div>' +
          '<div><strong>' + escapeHtml(template.certified ? 'Sim' : 'Nao') + '</strong><span>Certificado</span></div>' +
        '</div>' +
        '<ul class="feature-list">' + featureItems + '</ul>' +
        '<p class="install-note">Ao entrar no dashboard, escolha o projeto e o ChatCase importa este modelo automaticamente para ' + escapeHtml(labelFor(selectedChannel)) + '.</p>' +
        '<div class="detail-actions">' +
          '<a class="button button-primary" href="' + installHref + '">Instalar no meu projeto</a>' +
          '<a class="button" href="' + signupHref + '">Criar conta com este modelo</a>' +
          '<a class="button" href="' + exportHref + '">Baixar JSON</a>' +
          '<button type="button" class="button" data-copy-link="' + escapeHtml(template.id) + '">Copiar link publico</button>' +
        '</div>' +
      '</div>';

    var copyButton = els.detail.querySelector('[data-copy-link]');
    copyButton.addEventListener('click', function () {
      copyPublicLink(template.id, copyButton);
    });
  }

  function getSelectedChannelForTemplate(template) {
    if (!template || !Array.isArray(template.channels) || !template.channels.length) {
      return 'casezap';
    }

    if (state.channel && state.channel !== 'all') {
      var selected = template.channels.find(function (channel) {
        return labelFor(channel).toLowerCase() === state.channel;
      });

      if (selected) {
        return String(selected).trim().toLowerCase();
      }
    }

    if (template.channels.some(function (channel) { return String(channel).trim().toLowerCase() === 'casezap'; })) {
      return 'casezap';
    }

    return String(template.channels[0]).trim().toLowerCase();
  }

  function copyPublicLink(id, button) {
    var url = new URL(window.location.href);
    url.searchParams.set('template', id);
    var value = url.toString();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () {
        button.textContent = 'Link copiado';
      });
      return;
    }

    window.prompt('Copie o link publico:', value);
  }

  function updateSummary() {
    var channels = getChannelOptions();
    var certified = state.templates.filter(function (template) {
      return template.certified;
    }).length;

    els.summaryTotal.textContent = state.templates.length;
    els.summaryChannels.textContent = channels.length;
    els.summaryCertified.textContent = certified;
  }
}());
