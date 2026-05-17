#!/usr/bin/env bash
# Actualiza CuidateAPP en VPS: git pull main, API (pm2), rebuild web.
# Uso: bash deploy/actualizar-vps.sh
# Desde fuera: curl -sL https://raw.githubusercontent.com/EduardoGM1/CuidateAPP/main/deploy/actualizar-vps.sh | bash

set -euo pipefail

find_app_root() {
  for d in /var/www/CuidateAPP /var/www/cuidateapp/CuidateAPP /var/www/cuidateapp; do
    if [ -d "$d/.git" ] && [ -d "$d/api-clinica" ]; then
      echo "$d"
      return 0
    fi
  done
  local api
  api="$(find /var/www -maxdepth 5 -type d -name api-clinica 2>/dev/null | head -1)"
  if [ -n "$api" ]; then
    dirname "$api"
    return 0
  fi
  return 1
}

APP_ROOT="${APP_ROOT:-}"
if [ -z "$APP_ROOT" ]; then
  APP_ROOT="$(find_app_root)" || { echo "[ERROR] No se encontró el repo en /var/www"; exit 1; }
fi

echo "=== CuidateAPP — actualización VPS ==="
echo "APP_ROOT: $APP_ROOT"
cd "$APP_ROOT"

echo ""
echo "--- Versión antes ---"
git fetch origin main
LOCAL_BEFORE="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
git log -1 --oneline HEAD
echo "origin/main: $(git log -1 --oneline origin/main)"

if [ "$LOCAL_BEFORE" = "$REMOTE" ]; then
  echo "[INFO] Ya estaba en el mismo commit que origin/main."
else
  echo ""
  echo "--- git pull ---"
  git pull origin main
fi

echo ""
echo "--- API (api-clinica) ---"
cd "$APP_ROOT/api-clinica"
rm -rf node_modules
npm install --omit=dev
pm2 restart api-clinica || pm2 start ecosystem.config.cjs --cwd "$APP_ROOT/api-clinica" 2>/dev/null || pm2 restart all

echo ""
echo "--- Web (cuidate-web) ---"
cd "$APP_ROOT"
REBUILD_ARGS=(-)
if [ -f cuidate-web/.env.production ]; then
  VITE_VAL="$(grep -E '^VITE_API_BASE_URL=' cuidate-web/.env.production | cut -d= -f2- || true)"
  if [ -n "$VITE_VAL" ]; then
    REBUILD_ARGS=("$VITE_VAL")
    echo "[INFO] Rebuild con VITE_API_BASE_URL existente: $VITE_VAL"
  else
    echo "[INFO] Rebuild mismo origen (VITE_API_BASE_URL vacío)"
  fi
fi
bash deploy/rebuild-cuidate-web.sh "${REBUILD_ARGS[@]}"

echo ""
echo "--- Verificación ---"
pm2 status || true
sleep 2
HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/health 2>/dev/null || echo '000')"
echo "GET http://127.0.0.1:3000/health → HTTP $HTTP_CODE"
echo "Commit desplegado: $(git -C "$APP_ROOT" log -1 --oneline)"
echo ""
echo "[OK] Actualización terminada."
