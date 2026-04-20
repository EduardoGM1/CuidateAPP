#!/usr/bin/env bash
# Reconstruye cuidate-web para producción (npm install + vite build).
# Uso en servidor existente tras git pull:
#   sudo bash deploy/rebuild-cuidate-web.sh "https://api.tudominio.com"
# Mismo origen (Nginx sirve /api en el mismo host):
#   sudo bash deploy/rebuild-cuidate-web.sh -
# Sin argumento: no toca .env.production si ya existe; si no, copia .env.production.example
#
# APP_ROOT por defecto: directorio padre de deploy/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_DIR="$APP_ROOT/cuidate-web"

if [ ! -d "$WEB_DIR" ]; then
  echo "[ERROR] No existe $WEB_DIR" >&2
  exit 1
fi

cd "$WEB_DIR"

ARG="${1:-}"

if [ "$ARG" = "-" ]; then
  echo "VITE_API_BASE_URL=" > .env.production
  echo "[INFO] .env.production → VITE_API_BASE_URL vacío (mismo origen /api)"
elif [ -n "$ARG" ]; then
  BASE="${ARG%/}"
  echo "VITE_API_BASE_URL=$BASE" > .env.production
  echo "[INFO] .env.production → VITE_API_BASE_URL=$BASE"
elif [ ! -f .env.production ]; then
  if [ -f .env.production.example ]; then
    cp .env.production.example .env.production
    echo "[INFO] Creado .env.production desde .env.production.example"
  else
    echo "VITE_API_BASE_URL=" > .env.production
    echo "[WARN] Sin .env.production.example; creado .env.production con URL vacía"
  fi
else
  echo "[INFO] Conservando .env.production existente"
fi

echo "[INFO] Instalando dependencias (cuidate-web)..."
npm install

echo "[INFO] Compilando (vite build, modo production)..."
NODE_ENV=production npm run build

echo "[OK] Listo: $WEB_DIR/dist"
