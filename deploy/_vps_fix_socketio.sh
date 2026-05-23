#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="${APP_ROOT:-/var/www/CuidateAPP}"
cd "$APP_ROOT"
git fetch origin main
git reset --hard origin/main
ENV_FILE="$APP_ROOT/api-clinica/.env"
if grep -q '^WEB_APP_ORIGIN=' "$ENV_FILE" 2>/dev/null; then
  sed -i 's|^WEB_APP_ORIGIN=.*|WEB_APP_ORIGIN=https://cuidateapp.com.mx|' "$ENV_FILE"
else
  echo 'WEB_APP_ORIGIN=https://cuidateapp.com.mx' >> "$ENV_FILE"
fi
# Corregir línea duplicada accidental WEB_APP_ORIGIN=WEB_APP_ORIGIN=
sed -i 's|^WEB_APP_ORIGIN=WEB_APP_ORIGIN=|WEB_APP_ORIGIN=|' "$ENV_FILE"
grep '^WEB_APP_ORIGIN=' "$ENV_FILE" || true
# Restaurar Nginx si quedó inválido por un parche anterior
for bak in /etc/nginx/sites-enabled/cuidateapp.bak-*; do
  if [[ -f "$bak" ]] && ! nginx -t 2>/dev/null; then
    cp -a "$bak" /etc/nginx/sites-enabled/cuidateapp
    echo "[INFO] Restaurado Nginx desde $bak"
    break
  fi
done
bash "$APP_ROOT/deploy/apply-nginx-socketio.sh"
cd "$APP_ROOT/api-clinica"
rm -rf node_modules
npm cache clean --force 2>/dev/null || true
npm install --omit=dev
cd "$APP_ROOT"
pm2 delete api-clinica 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
sleep 10
bash deploy/rebuild-cuidate-web.sh -
echo "--- local socket.io via nginx ---"
curl -sS -m 8 -I "http://127.0.0.1/socket.io/?EIO=4&transport=polling" -H "Host: cuidateapp.com.mx" | head -8
echo "--- health ---"
curl -sS -m 5 http://127.0.0.1:3000/health | head -c 100
echo ""
