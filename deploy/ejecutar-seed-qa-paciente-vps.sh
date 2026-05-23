#!/usr/bin/env bash
# Ejecuta seed de datos de evolución para QA Paciente en el VPS (tras git pull).
# Uso en VPS:
#   cd /var/www/CuidateAPP && bash deploy/ejecutar-seed-qa-paciente-vps.sh
#   PACIENTE_ID=1123 bash deploy/ejecutar-seed-qa-paciente-vps.sh

set -euo pipefail

find_app_root() {
  for d in /var/www/CuidateAPP /var/www/cuidateapp/CuidateAPP /var/www/cuidateapp; do
    if [ -d "$d/.git" ] && [ -d "$d/api-clinica" ]; then
      echo "$d"
      return 0
    fi
  done
  return 1
}

APP_ROOT="${APP_ROOT:-}"
if [ -z "$APP_ROOT" ]; then
  APP_ROOT="$(find_app_root)" || { echo "[ERROR] No se encontró el repo"; exit 1; }
fi

PACIENTE_ID="${PACIENTE_ID:-1123}"

echo "=== Seed QA Paciente (BD directa) ==="
echo "APP_ROOT: $APP_ROOT"
echo "PACIENTE_ID: $PACIENTE_ID"
echo ""

cd "$APP_ROOT"
git fetch origin main
git pull origin main

cd "$APP_ROOT/api-clinica"
export PACIENTE_ID
node scripts/seed-qa-paciente-datos-evolucion.js

echo ""
echo "[OK] Seed terminado."
