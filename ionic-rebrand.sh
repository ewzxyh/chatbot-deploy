#!/bin/sh
set -eu

sed -i 's/Tiledesk - Open Source Live Chat/ChatCase/g' /usr/share/nginx/html/index.html
sed -i 's/<title>Tiledesk<\/title>/<title>ChatCase<\/title>/g' /usr/share/nginx/html/index.html
grep -q 'chatcase-pdf-preview.js' /usr/share/nginx/html/index.html || \
  sed -i 's#</body>#<script src="chatcase-pdf-preview.js?v=chatcase-20260524-locale2"></script></body>#' /usr/share/nginx/html/index.html
sed -i 's/href="assets\/icon\/favicon.ico[^"]*"/href="assets\/icon\/favicon.ico?v=chatcase-20260524-locale2"/g' /usr/share/nginx/html/index.html
sed -i 's/href=".\/manifest.json[^"]*"/href=".\/manifest.json?v=chatcase-20260524-locale2"/g' /usr/share/nginx/html/index.html

find /usr/share/nginx/html -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' \) -print | while read -r file; do
  sed -i \
    -e 's#<link[^>]*fonts\.googleapis\.com[^>]*>##g' \
    -e 's#<link[^>]*fonts\.gstatic\.com[^>]*>##g' \
    -e 's#@import[[:space:]]*url([^)]*fonts\.googleapis\.com[^)]*);##g' \
    -e "s#https://fonts\\.googleapis\\.com[^\"' )]*##g" \
    -e "s#https://fonts\\.gstatic\\.com[^\"' )]*##g" \
    "$file"
done

if [ ! -f /usr/share/nginx/html/assets/chatcase-pdf-preview.js ]; then
cat > /usr/share/nginx/html/chatcase-pdf-preview.js <<'EOF'
(function () {
  if (window.__chatcaseAttachmentEnhancerInstalled) {
    return;
  }
  window.__chatcaseAttachmentEnhancerInstalled = true;

  var style = document.createElement('style');
  style.textContent = [
    '.chatcase-pdf-card{width:min(310px,72vw);border-radius:10px;overflow:hidden;background:#eef2f7;border:1px solid rgba(0,0,0,.08);margin:4px 0 6px 0;box-shadow:0 1px 2px rgba(0,0,0,.05)}',
    '.chatcase-pdf-frame{display:block;width:100%;height:168px;border:0;background:#fff}',
    '.chatcase-pdf-link{display:flex;align-items:center;gap:8px;padding:9px 10px;color:#1a73e8!important;text-decoration:none!important;font-size:13px;line-height:1.25;background:#f8fafc;word-break:break-word}',
    '.chatcase-pdf-icon{flex:0 0 auto;width:26px;height:32px;border-radius:4px;background:#d93025;color:#fff;font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;letter-spacing:.2px}',
    '.chatcase-pdf-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.chatcase-file-card{display:flex;align-items:center;gap:10px;width:min(310px,72vw);padding:10px 11px;margin:4px 0 6px 0;border-radius:10px;background:#eef2f7;border:1px solid rgba(0,0,0,.08);box-shadow:0 1px 2px rgba(0,0,0,.05);color:#17233c!important;text-decoration:none!important}',
    '.chatcase-file-card:hover{background:#e7edf6;text-decoration:none!important}',
    '.chatcase-file-icon{flex:0 0 auto;width:34px;height:40px;border-radius:6px;background:#607d8b;color:#fff;font-size:10px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;letter-spacing:.2px;text-transform:uppercase}',
    '.chatcase-file-icon.zip{background:#ef8f22}.chatcase-file-icon.exe{background:#596579}.chatcase-file-icon.img{background:#1e9b72}.chatcase-file-icon.doc{background:#2d6cdf}.chatcase-file-icon.pdf{background:#d93025}',
    '.chatcase-file-info{min-width:0;display:flex;flex-direction:column;gap:3px;flex:1}',
    '.chatcase-file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:1.25;color:#17233c}',
    '.chatcase-file-meta{font-size:11px;line-height:1.2;color:#6b7485;text-transform:uppercase}',
    '.chatcase-file-action{flex:0 0 auto;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(23,35,60,.14);color:#516070;background:#fff}',
    '.chatcase-quote-card{display:block;width:min(300px,70vw);box-sizing:border-box;margin:2px 0 7px 0;padding:8px 10px 8px 12px;border-radius:8px;background:#f1f6fb;border:1px solid rgba(45,108,223,.18);border-left:4px solid #2d6cdf;color:#334155;box-shadow:0 1px 2px rgba(15,23,42,.05)}',
    '.chatcase-quote-label{display:block;margin:0 0 3px 0;font-size:12px;line-height:1.2;font-weight:700;color:#1f64c8;letter-spacing:0}',
    '.chatcase-quote-text{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:0;font-size:12px;line-height:1.35;color:#475569;white-space:normal;word-break:break-word}',
    '.chatcase-wa-card{display:block;width:min(310px,72vw);box-sizing:border-box;margin:4px 0 7px 0;padding:12px;border-radius:12px;background:#eef4f8;border:1px solid rgba(15,23,42,.08);box-shadow:0 1px 2px rgba(15,23,42,.06);color:#17233c}',
    '.chatcase-wa-header{display:flex;align-items:center;gap:10px;min-width:0}',
    '.chatcase-wa-icon{flex:0 0 auto;width:38px;height:38px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#dbe7ef;color:#334155;font-size:0;overflow:hidden}',
    '.chatcase-wa-icon svg{width:21px;height:21px;display:block;fill:currentColor}',
    '.chatcase-contact-avatar{background:#dbe7ef;color:#475569}',
    '.chatcase-contact-avatar img{width:100%;height:100%;object-fit:cover;display:block}',
    '.chatcase-event-icon{background:#1f9d69;color:#fff}',
    '.chatcase-wa-title{display:block;font-size:14px;line-height:1.25;font-weight:700;color:#17233c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.chatcase-wa-sub{display:block;margin-top:2px;font-size:12px;line-height:1.3;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.chatcase-wa-action{display:inline-flex;margin-top:10px;padding:7px 12px;border-radius:999px;background:#1f9d69;color:#fff!important;text-decoration:none!important;font-size:12px;font-weight:700}',
    '.chatcase-poll-option{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px;padding:8px 9px;border-radius:8px;background:#f8fafc;border:1px solid rgba(15,23,42,.07);font-size:13px;color:#243247}',
    '.chatcase-poll-option-bar{position:absolute;left:0;top:0;bottom:0;width:var(--chatcase-poll-percent,0%);background:rgba(31,157,105,.14);pointer-events:none}',
    '.chatcase-poll-option-content{position:relative;z-index:1;display:flex;align-items:center;gap:8px;min-width:0}',
    '.chatcase-poll-option-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.chatcase-poll-percent{position:relative;z-index:1;font-size:12px;color:#475569;font-weight:700;white-space:nowrap}',
    '.chatcase-poll-dot{width:14px;height:14px;border-radius:50%;border:2px solid #94a3b8;box-sizing:border-box;flex:0 0 auto}',
    '.chatcase-event-meta{margin-top:8px;display:flex;flex-direction:column;gap:4px;font-size:12px;line-height:1.35;color:#475569}',
    '.chatcase-event-status{display:flex;align-items:center;gap:6px;margin-top:8px;font-size:12px;line-height:1.35;color:#475569}',
    '.chatcase-audio-card{display:flex;flex-direction:column;gap:7px}',
    '.chatcase-audio-main{display:flex;align-items:center;gap:10px;width:100%}',
    '.chatcase-audio-toggle{width:34px;height:34px;border:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#1f9d69;color:#fff;cursor:pointer;flex:0 0 auto;padding:0}',
    '.chatcase-audio-toggle svg{width:18px;height:18px;fill:currentColor}',
    '.chatcase-audio-range{flex:1;min-width:0;accent-color:#238be6;cursor:pointer}',
    '.chatcase-audio-time{font-size:12px;line-height:1;color:#475569;white-space:nowrap;min-width:32px;text-align:right}',
    '.chatcase-audio-meta{display:flex;justify-content:space-between;gap:12px;font-size:11px;line-height:1.2;color:#64748b}',
    '.chatcase-audio-hidden{display:none}',
    '.chatcase-hidden-message{display:none!important}'
  ].join('');
  document.head.appendChild(style);

  function decodeQuotePayload(value) {
    try {
      var binary = atob(value);
      if (window.TextDecoder) {
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return JSON.parse(new TextDecoder('utf-8').decode(bytes));
      }
      var escaped = '';
      for (var j = 0; j < binary.length; j++) {
        escaped += '%' + ('00' + binary.charCodeAt(j).toString(16)).slice(-2);
      }
      return JSON.parse(decodeURIComponent(escaped));
    } catch (e) {
      return null;
    }
  }

  function createQuoteCard(quote) {
    var card = document.createElement('span');
    card.className = 'chatcase-quote-card';
    card.setAttribute('aria-label', 'Mensagem citada');

    var label = document.createElement('span');
    label.className = 'chatcase-quote-label';
    label.textContent = (quote && (quote.senderLabel || quote.authorName || quote.participantName)) || 'Você';

    var text = document.createElement('span');
    text.className = 'chatcase-quote-text';
    text.textContent = quote && quote.text ? quote.text : '[mensagem]';

    card.appendChild(label);
    card.appendChild(text);
    return card;
  }

  function shouldRenderQuoteCard(parent) {
    if (!parent || !parent.closest) {
      return true;
    }
    var current = parent;
    while (current && current.nodeType === 1) {
      if (current.tagName && current.tagName.toLowerCase() === 'ion-item') {
        return false;
      }
      current = current.parentElement;
    }
    return true;
  }

  function shouldRenderStructuredCard(parent) {
    return shouldRenderQuoteCard(parent);
  }

  function initials(value) {
    var words = String(value || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      return '?';
    }
    return words.slice(0, 2).map(function (word) { return word.charAt(0).toUpperCase(); }).join('');
  }

  function digits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function formatEventDate(value) {
    var seconds = Number(value || 0);
    if (!seconds) {
      return '';
    }
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(seconds * 1000));
    } catch (e) {
      return new Date(seconds * 1000).toLocaleString();
    }
  }

  function appendText(parent, className, text) {
    if (!text) {
      return null;
    }
    var node = document.createElement('span');
    node.className = className;
    node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  function iconSvg(name) {
    var paths = {
      user: '<path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"/>',
      calendar: '<path d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10ZM6 8h12V6H6v2Z"/>',
      play: '<path d="M8 5v14l11-7L8 5Z"/>',
      pause: '<path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || '') + '</svg>';
  }

  function createContactAvatar(payload) {
    var icon = document.createElement('span');
    icon.className = 'chatcase-wa-icon chatcase-contact-avatar';
    if (payload && payload.avatarUrl) {
      var image = document.createElement('img');
      image.src = payload.avatarUrl;
      image.alt = '';
      icon.appendChild(image);
    } else {
      icon.innerHTML = iconSvg('user');
    }
    return icon;
  }

  function formatSeconds(seconds) {
    seconds = Number(seconds || 0);
    if (!seconds || seconds < 0) return '0:00';
    var minutes = Math.floor(seconds / 60);
    var rest = Math.floor(seconds % 60);
    return minutes + ':' + String(rest).padStart(2, '0');
  }

  function createContactCard(payload) {
    var card = document.createElement('span');
    card.className = 'chatcase-wa-card chatcase-contact-card';

    var header = document.createElement('span');
    header.className = 'chatcase-wa-header';
    var info = document.createElement('span');
    info.className = 'chatcase-file-info';
    appendText(info, 'chatcase-wa-title', payload.displayName || payload.phone || 'Contato');
    appendText(info, 'chatcase-wa-sub', payload.phone || payload.organization || payload.email || '');
    header.appendChild(createContactAvatar(payload));
    header.appendChild(info);
    card.appendChild(header);

    var phone = digits(payload.phone);
    if (phone) {
      var action = document.createElement('a');
      action.className = 'chatcase-wa-action';
      action.href = 'https://wa.me/' + phone;
      action.target = '_blank';
      action.rel = 'noopener noreferrer';
      action.textContent = 'Conversar';
      card.appendChild(action);
    }
    return card;
  }

  function createPollCard(payload) {
    var card = document.createElement('span');
    card.className = 'chatcase-wa-card chatcase-poll-card';
    appendText(card, 'chatcase-wa-title', payload.title || 'Enquete');
    appendText(card, 'chatcase-wa-sub', 'Enquete do WhatsApp');

    var options = payload.options || [];
    var results = payload.results || [];
    function resultForOption(option, index) {
      for (var r = 0; r < results.length; r++) {
        if (String(results[r].option) === String(option)) {
          return results[r];
        }
      }
      return { option: option, count: 0, percent: 0 };
    }
    for (var i = 0; i < options.length; i++) {
      var result = resultForOption(options[i], i);
      var option = document.createElement('span');
      option.className = 'chatcase-poll-option';
      option.style.setProperty('--chatcase-poll-percent', String(result.percent || 0) + '%');
      var bar = document.createElement('span');
      bar.className = 'chatcase-poll-option-bar';
      var content = document.createElement('span');
      content.className = 'chatcase-poll-option-content';
      var dot = document.createElement('span');
      dot.className = 'chatcase-poll-dot';
      var label = document.createElement('span');
      label.className = 'chatcase-poll-option-label';
      label.textContent = options[i];
      var percent = document.createElement('span');
      percent.className = 'chatcase-poll-percent';
      percent.textContent = String(result.percent || 0) + '%';
      content.appendChild(dot);
      content.appendChild(label);
      option.appendChild(bar);
      option.appendChild(content);
      option.appendChild(percent);
      card.appendChild(option);
    }
    return card;
  }

  function createEventCard(payload) {
    var card = document.createElement('span');
    card.className = 'chatcase-wa-card chatcase-event-card';
    var header = document.createElement('span');
    header.className = 'chatcase-wa-header';
    var icon = document.createElement('span');
    icon.className = 'chatcase-wa-icon chatcase-event-icon';
    icon.innerHTML = iconSvg('calendar');
    var info = document.createElement('span');
    info.className = 'chatcase-file-info';
    appendText(info, 'chatcase-wa-title', payload.title || 'Evento');
    appendText(info, 'chatcase-wa-sub', formatEventDate(payload.startTime));
    header.appendChild(icon);
    header.appendChild(info);
    card.appendChild(header);

    var meta = document.createElement('span');
    meta.className = 'chatcase-event-meta';
    appendText(meta, 'chatcase-event-description', payload.description || '');
    appendText(meta, 'chatcase-event-location', payload.locationName ? 'Local: ' + payload.locationName : '');
    if (meta.childNodes.length) {
      card.appendChild(meta);
    }
    if (payload.attendanceCount) {
      appendText(card, 'chatcase-event-status', 'Presen\u00e7a confirmada: ' + payload.attendanceCount);
    }
    return card;
  }

  function createAudioCard(payload) {
    var card = document.createElement('span');
    card.className = 'chatcase-wa-card chatcase-audio-card';
    var row = document.createElement('span');
    row.className = 'chatcase-audio-main';

    var audio = document.createElement('audio');
    audio.className = 'chatcase-audio-hidden';
    audio.preload = 'metadata';
    if (payload.src) audio.src = payload.src;
    var pendingSeek = null;

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'chatcase-audio-toggle';
    toggle.setAttribute('aria-label', 'Reproduzir áudio');
    toggle.innerHTML = iconSvg('play');

    var range = document.createElement('input');
    range.className = 'chatcase-audio-range';
    range.type = 'range';
    range.min = '0';
    range.max = String(payload.seconds || 0);
    range.step = '0.01';
    range.value = '0';

    var current = document.createElement('span');
    current.className = 'chatcase-audio-time';
    current.textContent = '0:00';

    row.appendChild(toggle);
    row.appendChild(range);
    row.appendChild(current);
    card.appendChild(row);

    var meta = document.createElement('span');
    meta.className = 'chatcase-audio-meta';
    appendText(meta, 'chatcase-audio-label', payload.ptt ? 'Mensagem de voz' : 'Áudio');
    appendText(meta, 'chatcase-audio-total', payload.duration || formatSeconds(payload.seconds));
    card.appendChild(meta);
    card.appendChild(audio);

    function applyPendingSeek() {
      if (pendingSeek === null || audio.readyState < 1) return;
      try {
        audio.currentTime = pendingSeek;
      } catch (error) {}
      range.value = String(pendingSeek);
      current.textContent = formatSeconds(pendingSeek);
      pendingSeek = null;
    }

    audio.addEventListener('loadedmetadata', function() {
      if (audio.duration && isFinite(audio.duration)) {
        range.max = String(audio.duration);
        var total = card.querySelector('.chatcase-audio-total');
        if (total) total.textContent = formatSeconds(audio.duration);
      }
      applyPendingSeek();
    });
    audio.addEventListener('canplay', applyPendingSeek);
    audio.addEventListener('timeupdate', function() {
      range.value = String(audio.currentTime || 0);
      current.textContent = formatSeconds(audio.currentTime || 0);
    });
    audio.addEventListener('play', function() {
      toggle.innerHTML = iconSvg('pause');
      toggle.setAttribute('aria-label', 'Pausar áudio');
    });
    audio.addEventListener('pause', function() {
      toggle.innerHTML = iconSvg('play');
      toggle.setAttribute('aria-label', 'Reproduzir áudio');
    });
    function seekFromRange() {
      var nextTime = Number(range.value || 0);
      if (audio.readyState < 1) {
        pendingSeek = nextTime;
        if (audio.src) audio.load();
        current.textContent = formatSeconds(nextTime);
        return;
      }
      try {
        audio.currentTime = nextTime;
      } catch (error) {}
      current.textContent = formatSeconds(nextTime);
    }
    range.addEventListener('input', seekFromRange);
    range.addEventListener('change', seekFromRange);
    toggle.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      if (!audio.src) return;
      if (audio.readyState < 1) audio.load();
      if (audio.paused) {
        var promise = audio.play();
        if (promise && promise.catch) promise.catch(function() {});
      } else {
        audio.pause();
      }
    });
    return card;
  }

  function removeStructuredPreviewText(textNode, preview) {
    if (!textNode || !textNode.parentNode) return;
    var parent = textNode.parentNode;
    var cursor = textNode.nextSibling;
    parent.removeChild(textNode);
    while (cursor && cursor.nodeType === Node.TEXT_NODE && !cursor.nodeValue.trim()) {
      var empty = cursor;
      cursor = cursor.nextSibling;
      parent.removeChild(empty);
    }
    if (cursor && cursor.nodeType === Node.ELEMENT_NODE && cursor.tagName && cursor.tagName.toLowerCase() === 'br') {
      var br = cursor;
      cursor = cursor.nextSibling;
      parent.removeChild(br);
    }
    while (cursor && cursor.nodeType === Node.TEXT_NODE && !cursor.nodeValue.trim()) {
      var blank = cursor;
      cursor = cursor.nextSibling;
      parent.removeChild(blank);
    }
    if (preview && cursor && cursor.nodeType === Node.TEXT_NODE && cursor.nodeValue.trim() === preview) {
      parent.removeChild(cursor);
    }
  }

  function hideNativeAudioForCard(card) {
    if (!card || !card.closest) return;
    var bubble = card.closest('#bubble-message') || card.closest('chat-bubble-message') || card.closest('.bubble-container');
    if (!bubble || !bubble.querySelectorAll) return;
    var nativeAudio = bubble.querySelectorAll('chat-audio');
    for (var i = 0; i < nativeAudio.length; i++) {
      nativeAudio[i].style.display = 'none';
      nativeAudio[i].setAttribute('data-chatcase-hidden', 'native-audio');
    }
  }

  function normalizeStructuredCards(root) {
    if (!root || !root.querySelectorAll) return;
    var audioCards = root.querySelectorAll('.chatcase-audio-card');
    for (var i = 0; i < audioCards.length; i++) {
      hideNativeAudioForCard(audioCards[i]);
    }
  }

  function createStructuredCard(kind, payload) {
    if (kind === 'contact') return createContactCard(payload);
    if (kind === 'poll') return createPollCard(payload);
    if (kind === 'event') return createEventCard(payload);
    if (kind === 'audio') return createAudioCard(payload);
    return null;
  }

  function enhanceQuoteMarkers(root) {
    var marker = /\[casezap-quote:([A-Za-z0-9+/=]+)\]\s*/;
    var textNodes = [];
    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          return node.nodeValue && marker.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
    var node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    for (var i = 0; i < textNodes.length; i++) {
      var textNode = textNodes[i];
      var match = textNode.nodeValue.match(marker);
      if (!match) {
        continue;
      }

      var parent = textNode.parentNode;
      if (!parent) {
        continue;
      }

      var quote = decodeQuotePayload(match[1]);
      textNode.nodeValue = textNode.nodeValue.replace(match[0], '');
      if (!quote || !quote.text) {
        continue;
      }
      if (!shouldRenderQuoteCard(parent)) {
        continue;
      }
      if (parent.querySelector && parent.querySelector('.chatcase-quote-card')) {
        continue;
      }

      parent.insertBefore(createQuoteCard(quote), textNode);
    }
  }

  function enhanceStructuredMarkers(root) {
    var marker = /\[casezap-(contact|poll|event|audio):([A-Za-z0-9+/=]+)\]\s*/;
    var textNodes = [];
    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          return node.nodeValue && marker.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
    var node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    for (var i = 0; i < textNodes.length; i++) {
      var textNode = textNodes[i];
      var match = textNode.nodeValue.match(marker);
      if (!match) continue;

      var parent = textNode.parentNode;
      if (!parent) continue;

      var payload = decodeQuotePayload(match[2]);
      var preview = payload && payload.preview ? payload.preview : textNode.nodeValue.replace(match[0], '').trim();
      if (!shouldRenderStructuredCard(parent)) {
        textNode.nodeValue = preview;
        continue;
      }

      if (parent.querySelector && parent.querySelector('.chatcase-wa-card')) {
        textNode.nodeValue = preview;
        continue;
      }

      var card = createStructuredCard(match[1], payload || {});
      if (!card) {
        textNode.nodeValue = preview;
        continue;
      }

      parent.insertBefore(card, textNode);
      removeStructuredPreviewText(textNode, preview);
      if (match[1] === 'audio') hideNativeAudioForCard(card);
    }
  }

  function hideRawCaseZapUpdateMessages(root) {
    var rawMessage = /^\[(pollupdatemessage|reactionmessage)\]$/i;
    var textNodes = [];
    var walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          return node.nodeValue && rawMessage.test(node.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
    var node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    for (var i = 0; i < textNodes.length; i++) {
      var parent = textNodes[i].parentNode;
      var bubble = parent && parent.closest && (
        parent.closest('chat-bubble-message') ||
        parent.closest('#bubble-message') ||
        parent.closest('.bubble-container')
      );
      if (bubble && !(parent.closest && parent.closest('ion-item'))) {
        bubble.classList.add('chatcase-hidden-message');
      } else {
        textNodes[i].nodeValue = '';
      }
    }
  }

  function safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch (e) {
      return value;
    }
  }

  function isPdfAnchor(anchor) {
    var href = safeDecode(anchor.getAttribute('href') || '');
    var text = anchor.textContent || '';
    return /\.pdf(?:$|[?#&])/i.test(href) || /\.pdf$/i.test(text.trim());
  }

  function getFileName(anchor) {
    var text = (anchor.textContent || '').trim();
    if (/\.[a-z0-9]{2,8}$/i.test(text)) {
      return text;
    }

    var href = safeDecode(anchor.getAttribute('href') || '');
    var pathMatch = href.match(/[?&]path=([^&]+)/i);
    if (pathMatch && pathMatch[1]) {
      var decodedPath = safeDecode(pathMatch[1]);
      var pathName = decodedPath.split('/').pop();
      if (pathName) {
        return pathName;
      }
    }

    try {
      var url = new URL(anchor.href);
      var name = safeDecode(url.pathname.split('/').pop() || '');
      if (name) {
        return name;
      }
    } catch (e) {}

    return text || 'arquivo';
  }

  function getPdfName(anchor) {
    var name = getFileName(anchor);
    return name === 'arquivo' ? 'document.pdf' : name;
  }

  function extensionFromName(name) {
    var match = String(name || '').match(/\.([a-z0-9]{2,8})$/i);
    return match ? match[1].toLowerCase() : 'file';
  }

  function fileKindClass(ext) {
    if (/^(zip|rar|7z|gz|tar)$/i.test(ext)) {
      return 'zip';
    }
    if (/^(exe|msi|apk|dmg)$/i.test(ext)) {
      return 'exe';
    }
    if (/^(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(ext)) {
      return 'img';
    }
    if (/^(doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(ext)) {
      return 'doc';
    }
    if (/^pdf$/i.test(ext)) {
      return 'pdf';
    }
    return '';
  }

  function looksLikeAttachment(anchor) {
    var href = safeDecode(anchor.getAttribute('href') || '');
    var text = (anchor.textContent || '').trim();
    if (!text || anchor.closest('.chatcase-file-card') || anchor.closest('.chatcase-pdf-card')) {
      return false;
    }
    if (isPdfAnchor(anchor)) {
      return false;
    }
    if (/\/files(?:\/download)?\?path=/i.test(href)) {
      return true;
    }
    if (/\.(zip|rar|7z|gz|tar|exe|msi|apk|dmg|webp|jpg|jpeg|png|gif|bmp|svg|doc|docx|xls|xlsx|ppt|pptx|txt|csv)(?:$|[?#&])/i.test(href)) {
      return true;
    }
    return /\.(zip|rar|7z|gz|tar|exe|msi|apk|dmg|webp|jpg|jpeg|png|gif|bmp|svg|doc|docx|xls|xlsx|ppt|pptx|txt|csv)$/i.test(text);
  }

  function inlinePdfHref(anchor) {
    var href = anchor.href || anchor.getAttribute('href') || '';
    return href.replace('/files/download?path=', '/files?path=');
  }

  function enhancePdfAnchor(anchor) {
    if (!anchor || anchor.dataset.chatcasePdfPreview === '1' || !isPdfAnchor(anchor)) {
      return;
    }
    if (anchor.closest('.chatcase-pdf-card')) {
      return;
    }

    anchor.dataset.chatcasePdfPreview = '1';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';

    var name = getPdfName(anchor);
    var inlineHref = inlinePdfHref(anchor);
    var card = document.createElement('div');
    card.className = 'chatcase-pdf-card';

    var frame = document.createElement('iframe');
    frame.className = 'chatcase-pdf-frame';
    frame.src = inlineHref;
    frame.loading = 'lazy';
    frame.title = name;

    var link = document.createElement('a');
    link.className = 'chatcase-pdf-link';
    link.href = inlineHref;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    var icon = document.createElement('span');
    icon.className = 'chatcase-pdf-icon';
    icon.textContent = 'PDF';

    var label = document.createElement('span');
    label.className = 'chatcase-pdf-name';
    label.textContent = name;

    link.appendChild(icon);
    link.appendChild(label);
    card.appendChild(frame);
    card.appendChild(link);

    anchor.style.display = 'none';
    anchor.parentNode.insertBefore(card, anchor);
  }

  function enhanceFileAnchor(anchor) {
    if (!anchor || anchor.dataset.chatcaseFileCard === '1' || !looksLikeAttachment(anchor)) {
      return;
    }

    anchor.dataset.chatcaseFileCard = '1';
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';

    var name = getFileName(anchor);
    var ext = extensionFromName(name);
    var card = document.createElement('a');
    card.className = 'chatcase-file-card';
    card.href = anchor.href || anchor.getAttribute('href') || '#';
    card.target = '_blank';
    card.rel = 'noopener noreferrer';

    var icon = document.createElement('span');
    icon.className = 'chatcase-file-icon ' + fileKindClass(ext);
    icon.textContent = ext.slice(0, 4);

    var info = document.createElement('span');
    info.className = 'chatcase-file-info';

    var label = document.createElement('span');
    label.className = 'chatcase-file-name';
    label.textContent = name;

    var meta = document.createElement('span');
    meta.className = 'chatcase-file-meta';
    meta.textContent = ext === 'file' ? 'arquivo' : ext;

    var action = document.createElement('span');
    action.className = 'chatcase-file-action';
    action.setAttribute('aria-hidden', 'true');
    action.innerHTML = '&#8595;';

    info.appendChild(label);
    info.appendChild(meta);
    card.appendChild(icon);
    card.appendChild(info);
    card.appendChild(action);

    anchor.style.display = 'none';
    anchor.parentNode.insertBefore(card, anchor);
  }

  function scan(root) {
    if (!root || !root.querySelectorAll) {
      return;
    }
    enhanceQuoteMarkers(root);
    enhanceStructuredMarkers(root);
    hideRawCaseZapUpdateMessages(root);
    normalizeStructuredCards(root);
    var anchors = root.querySelectorAll('a[href]');
    for (var i = 0; i < anchors.length; i++) {
      enhancePdfAnchor(anchors[i]);
      enhanceFileAnchor(anchors[i]);
    }
  }

  scan(document);
  document.addEventListener('DOMContentLoaded', function () {
    scan(document);
  });

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      for (var j = 0; j < mutations[i].addedNodes.length; j++) {
        var node = mutations[i].addedNodes[j];
        if (node.nodeType === 1) {
          scan(node);
        }
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
EOF
fi

if [ -f /usr/share/nginx/html/main.js ]; then
  sed -i 's/new_uri = "mqtt:";/new_uri = loc.protocol === "https:" ? "wss:" : "ws:";/g' /usr/share/nginx/html/main.js
  sed -i 's/BRAND_NAME: "Tiledesk"/BRAND_NAME: "ChatCase"/g' /usr/share/nginx/html/main.js
  sed -i 's/META_TITLE: "Tiledesk - Open Source Live Chat"/META_TITLE: "ChatCase"/g' /usr/share/nginx/html/main.js
  sed -i "s/document.title = this.brand\['BRAND_NAME'\] + ' ' + this.brand\['META_TITLE'\];/document.title = this.brand['META_TITLE'] || this.brand['BRAND_NAME'];/g" /usr/share/nginx/html/main.js
fi

if [ -f /usr/share/nginx/html/manifest.json ]; then
  sed -i 's/"name": "Tiledesk"/"name": "ChatCase"/g' /usr/share/nginx/html/manifest.json
  sed -i 's/"short_name": "Tiledesk"/"short_name": "ChatCase"/g' /usr/share/nginx/html/manifest.json
  sed -i 's/"description": "Description of your app from template"/"description": "ChatCase"/g' /usr/share/nginx/html/manifest.json
  sed -i 's/"theme_color": "#000"/"theme_color": "#02D05C"/g' /usr/share/nginx/html/manifest.json
  sed -i 's/"background_color": "#000"/"background_color": "#02D05C"/g' /usr/share/nginx/html/manifest.json
  sed -i 's/"sizes": "192x192"/"sizes": "350x350"/g' /usr/share/nginx/html/manifest.json
  sed -i 's/"sizes": "512x512"/"sizes": "350x350"/g' /usr/share/nginx/html/manifest.json
fi
