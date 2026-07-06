#!/bin/sh
set -eu

ROOT="/usr/share/nginx/html"

copy_asset() {
  source="$ROOT/assets/img/$1"
  target="$ROOT/assets/img/$2"

  if [ -f "$source" ] && [ ! -f "$target" ]; then
    cp "$source" "$target"
  fi
}

copy_asset "avatar_bot_tiledesk.svg" "avatar_bot_chatcase.svg"
copy_asset "avatar_bot_tiledesk_old.svg" "avatar_bot_chatcase_old.svg"
copy_asset "avatar_bot_tiledesk_white.svg" "avatar_bot_chatcase_white.svg"
copy_asset "avatar_flow_tiledesk.svg" "avatar_flow_chatcase.svg"

find "$ROOT" -type f \( -name '*.html' -o -name '*.js' -o -name '*.json' -o -name '*.css' \) -print | while read -r file; do
  sed -i \
    -e 's#Tiledesk#ChatCase#g' \
    -e 's#redacted@example.invalid#redacted@example.invalid#g' \
    -e 's#redacted@example.invalid#redacted@example.invalid#g' \
    -e 's#[REDACTED_BASIC_AUTH_URL]' \
    -e 's#https://feedback.tiledesk.com/changelog#https://chatcase.com.br/#g' \
    -e 's#https://feedback.tiledesk.com/roadmap#https://chatcase.com.br/#g' \
    -e 's#https://gethelp.tiledesk.com[^"'\''< )]*#https://chatcase.com.br/#g' \
    -e 's#https://developer.tiledesk.com[^"'\''< )]*#https://chatcase.com.br/#g' \
    -e 's#https://docs.tiledesk.com[^"'\''< )]*#https://chatcase.com.br/#g' \
    -e 's#https://guide.tiledesk.com[^"'\''< )]*#https://chatcase.com.br/#g' \
    -e 's#https://tiledesk.statuspage.io#https://chatcase.com.br/#g' \
    -e 's#https://github.com/Tiledesk#https://github.com/ewzxyh#g' \
    -e 's#https://www.tiledesk.com#https://chatcase.com.br#g' \
    -e 's#https://tiledesk.com[^"'\''< )]*#https://chatcase.com.br/#g' \
    -e 's#https://support-pre.tiledesk.com[^"'\''< )]*#https://chatcase.com.br/#g' \
    -e 's#https://widget-pre.tiledesk.com[^"'\''< )]*#https://chatcase.com.br/#g' \
    -e 's#https://support.tiledesk.com[^"'\''< )]*#https://chatcase.com.br/#g' \
    -e 's#https://api.tiledesk.com/v2/#/api/#g' \
    -e 's#https://rtm.tiledesk.com/files#/api/files#g' \
    -e 's#docs.ChatCase.com#chatcase.com.br#g' \
    -e 's#gethelp.ChatCase.com#chatcase.com.br#g' \
    -e 's#developer.ChatCase.com#chatcase.com.br#g' \
    -e 's#feedback.ChatCase.com#chatcase.com.br#g' \
    -e 's#github.com/ChatCase#github.com/ewzxyh#g' \
    "$file"
done
