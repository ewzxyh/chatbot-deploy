#!/bin/sh
set -eu

sed -i 's/Tiledesk - Open Source Live Chat/ChatCase/g' /usr/share/nginx/html/index.html
sed -i 's/<title>Tiledesk<\/title>/<title>ChatCase<\/title>/g' /usr/share/nginx/html/index.html
sed -i 's/src="main.js[^"]*"/src="main.js?v=chatcase-20260508"/g' /usr/share/nginx/html/index.html
sed -i 's/chatcase-pdf-preview.js?v=[^"]*/chatcase-pdf-preview.js?v=chatcase-20260519-files1/g' /usr/share/nginx/html/index.html
grep -q 'chatcase-pdf-preview.js' /usr/share/nginx/html/index.html || \
  sed -i 's#</body>#<script src="chatcase-pdf-preview.js?v=chatcase-20260519-files1"></script></body>#' /usr/share/nginx/html/index.html
sed -i 's/href="assets\/icon\/favicon.ico[^"]*"/href="assets\/icon\/favicon.ico?v=chatcase-20260508"/g' /usr/share/nginx/html/index.html
sed -i 's/href=".\/manifest.json[^"]*"/href=".\/manifest.json?v=chatcase-20260508"/g' /usr/share/nginx/html/index.html

find /usr/share/nginx/html -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' \) -print | while read -r file; do
  sed -i \
    -e 's#<link[^>]*fonts\.googleapis\.com[^>]*>##g' \
    -e 's#<link[^>]*fonts\.gstatic\.com[^>]*>##g' \
    -e 's#@import[[:space:]]*url([^)]*fonts\.googleapis\.com[^)]*);##g' \
    -e "s#https://fonts\\.googleapis\\.com[^\"' )]*##g" \
    -e "s#https://fonts\\.gstatic\\.com[^\"' )]*##g" \
    "$file"
done

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
    '.chatcase-file-action{flex:0 0 auto;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(23,35,60,.14);color:#516070;background:#fff}'
  ].join('');
  document.head.appendChild(style);

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
