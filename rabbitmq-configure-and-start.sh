#!/bin/sh
set -eu

JWT_SECRET="${RABBITMQ_JWT_SECRET:-${CHAT21_JWT_SECRET:-tokenKey}}"

escape_erlang_binary() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

JWT_SECRET_ESCAPED="$(escape_erlang_binary "$JWT_SECRET")"
ADVANCED_CONFIG_FILE="/tmp/chatcase-rabbitmq-advanced.config"

cat > "$ADVANCED_CONFIG_FILE" <<EOF
[
    {rabbit, [
        {auth_backends, [rabbit_auth_backend_oauth2]}
    ]},

    {rabbitmq_auth_backend_oauth2, [
        {resource_server_id, <<"rabbitmq">>},
        {key_config, [
            {default_key, <<"legacy-token-key">>},
            {signing_keys, #{
                <<"legacy-token-key">> =>
                    {map, #{
                        <<"alg">> => <<"HS256">>,
                        <<"value">> => <<"$JWT_SECRET_ESCAPED">>,
                        <<"kty">> => <<"MAC">>}
                    }
                }
            }
        ]}
    ]}
].
EOF

export RABBITMQ_ADVANCED_CONFIG_FILE="$ADVANCED_CONFIG_FILE"
exec rabbitmq-server
