#!/usr/bin/env bash
# Sincroniza VPS con origin/main (mismo commit que GitHub).
# Uso en VPS: bash deploy/sync-vps-main.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/CuidateAPP}"
cd "$APP_ROOT"

echo "=== Sync VPS con origin/main ==="
git fetch origin main
git reset --hard origin/main
echo "Commit: $(git log -1 --oneline)"

echo ""
echo "=== API ==="
cd "$APP_ROOT/api-clinica"
rm -rf node_modules
npm cache clean --force
npm install --omit=dev
test -f node_modules/lodash/lodash.js || { echo "[ERROR] lodash incompleto"; exit 1; }
cd "$APP_ROOT"
pm2 delete api-clinica 2>/dev/null || true
pm2 start deploy/ecosystem.config.cjs
sleep 12

echo ""
echo "=== Web ==="
cd "$APP_ROOT"
bash deploy/rebuild-cuidate-web.sh -

echo ""
echo "=== Verificacion ==="
pm2 list
curl -sS -m 10 http://127.0.0.1:3000/health || echo "HEALTH: fallo"
echo ""
systemctl is-active nginx 2>/dev/null || true
