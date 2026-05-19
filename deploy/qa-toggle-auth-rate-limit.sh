#!/usr/bin/env bash
# Activa/desactiva rate limit de login en VPS (api-clinica/.env + pm2 restart).
# Uso en el VPS:
#   bash deploy/qa-toggle-auth-rate-limit.sh off   # pruebas QA
#   bash deploy/qa-toggle-auth-rate-limit.sh on    # producción normal

set -euo pipefail
MODE="${1:-}"
ENV_FILE="${APP_ROOT:-/var/www/CuidateAPP}/api-clinica/.env"

if [ -z "$MODE" ] || { [ "$MODE" != "on" ] && [ "$MODE" != "off" ]; }; then
  echo "Uso: $0 on|off"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] No existe $ENV_FILE"
  exit 1
fi

VALUE="true"
[ "$MODE" = "off" ] && VALUE="false"

if grep -q '^AUTH_RATE_LIMIT_ENABLED=' "$ENV_FILE"; then
  sed -i "s/^AUTH_RATE_LIMIT_ENABLED=.*/AUTH_RATE_LIMIT_ENABLED=$VALUE/" "$ENV_FILE"
else
  echo "AUTH_RATE_LIMIT_ENABLED=$VALUE" >> "$ENV_FILE"
fi

if grep -q '^AUTH_RATE_LIMIT_MAX=' "$ENV_FILE"; then
  if [ "$MODE" = "on" ]; then
    sed -i 's/^AUTH_RATE_LIMIT_MAX=.*/AUTH_RATE_LIMIT_MAX=5/' "$ENV_FILE"
  fi
else
  echo "AUTH_RATE_LIMIT_MAX=5" >> "$ENV_FILE"
fi

echo "[OK] AUTH_RATE_LIMIT_ENABLED=$VALUE en $ENV_FILE"
cd "$(dirname "$ENV_FILE")"
pm2 restart api-clinica --update-env || pm2 restart all
sleep 2
curl -sS -o /dev/null -w "health HTTP %{http_code}\n" http://127.0.0.1:3000/health || true
