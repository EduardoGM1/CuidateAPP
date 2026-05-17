#!/usr/bin/env bash
# Compara el commit desplegado en la VPS con origin/main en GitHub.
# Uso en la VPS: bash deploy/verificar-version-vps.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/CuidateAPP}"
REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"

cd "$APP_ROOT" || { echo "ERROR: no existe $APP_ROOT"; exit 1; }

echo "=== CuidateAPP — versión en servidor ==="
echo "Ruta: $APP_ROOT"
echo ""

git fetch "$REMOTE" "$BRANCH" 2>/dev/null || echo "AVISO: git fetch falló (¿sin red o sin credenciales?)"

LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "desconocido")
REMOTE_HEAD=$(git rev-parse "$REMOTE/$BRANCH" 2>/dev/null || echo "desconocido")

echo "Commit local (HEAD):     $LOCAL"
echo "Commit remoto ($REMOTE/$BRANCH): $REMOTE_HEAD"
echo ""

if [ "$LOCAL" = "$REMOTE_HEAD" ]; then
  echo "OK: el servidor está al día con $REMOTE/$BRANCH."
else
  echo "DESFASE: hay commits en GitHub que no están en esta VPS."
  echo ""
  echo "Commits pendientes de pull:"
  git log --oneline HEAD.."$REMOTE/$BRANCH" 2>/dev/null || true
  echo ""
  echo "Para actualizar:"
  echo "  cd $APP_ROOT && git pull $REMOTE $BRANCH"
  echo "  cd $APP_ROOT/api-clinica && npm ci && pm2 restart api-clinica"
  echo "  sudo bash $APP_ROOT/deploy/rebuild-cuidate-web.sh"
fi

echo ""
echo "=== Servicios ==="
pm2 list 2>/dev/null | head -20 || echo "(pm2 no disponible)"
echo ""
echo "Último commit desplegado (mensaje):"
git log -1 --format='%h %ci %s' 2>/dev/null || true
