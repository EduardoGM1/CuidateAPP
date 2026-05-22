#!/usr/bin/env bash
# Aplica límites de rate limit recomendados en api-clinica/.env (VPS).
# Uso: sudo bash deploy/update-rate-limits.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$(cd "$SCRIPT_DIR/.." && pwd)/api-clinica/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] No existe $ENV_FILE" >&2
  exit 1
fi

set_kv() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s/^${key}=.*/${key}=${val}/" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

set_kv RATE_LIMIT_MAX 300
set_kv RATE_LIMIT_DDOS_MAX 400
set_kv RATE_LIMIT_SEARCH_MAX 180
set_kv RATE_LIMIT_WRITE_MAX 60
set_kv AUTH_RATE_LIMIT_MAX 15
set_kv AUTH_RATE_LIMIT_ENABLED true

echo "[OK] Rate limits actualizados en $ENV_FILE"
grep -E '^RATE_LIMIT_|^AUTH_RATE_LIMIT' "$ENV_FILE" || true
