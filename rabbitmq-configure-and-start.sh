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
        {auth_backends, [rabbit_auth_backend_oauth2, rabbit_auth_backend_internal]}
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
rm -f /tmp/chatcase-rabbitmq-ready

rabbitmq-server &
RABBITMQ_PID="$!"

stop_rabbitmq() {
  rabbitmqctl stop >/dev/null 2>&1 || true
  wait "$RABBITMQ_PID" >/dev/null 2>&1 || true
}
trap stop_rabbitmq TERM INT

for i in $(seq 1 60); do
  if rabbitmqctl status >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! rabbitmqctl status >/dev/null 2>&1; then
  echo "RabbitMQ did not become ready in time" >&2
  wait "$RABBITMQ_PID"
  exit 1
fi

MANAGEMENT_USER="${RABBITMQ_DEFAULT_USER:-admin}"
MANAGEMENT_PASS="${RABBITMQ_DEFAULT_PASS:-change-me}"

if rabbitmqctl list_users | awk 'NR > 1 { print $1 }' | grep -qx "$MANAGEMENT_USER"; then
  rabbitmqctl change_password "$MANAGEMENT_USER" "$MANAGEMENT_PASS"
else
  rabbitmqctl add_user "$MANAGEMENT_USER" "$MANAGEMENT_PASS"
fi

rabbitmqctl set_user_tags "$MANAGEMENT_USER" administrator
rabbitmqctl set_permissions -p / "$MANAGEMENT_USER" ".*" ".*" ".*"
touch /tmp/chatcase-rabbitmq-ready

wait "$RABBITMQ_PID"
