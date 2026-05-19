#!/usr/bin/env bash
# Añade include de nginx-spa-cache.inc en el sitio activo (si aún no está).
# Uso en VPS: sudo bash deploy/apply-nginx-spa-cache.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INC_LINE="include $APP_ROOT/deploy/nginx-spa-cache.inc;"
MARKER="nginx-spa-cache.inc"

for f in /etc/nginx/sites-enabled/*; do
  [ -f "$f" ] || continue
  if grep -q "$MARKER" "$f" 2>/dev/null; then
    echo "[OK] Ya configurado: $f"
    continue
  fi
  if grep -q "cuidate-web/dist" "$f" 2>/dev/null; then
    sed -i "/location \\/ {/i\\    $INC_LINE\\n" "$f"
    echo "[OK] Añadido include en $f"
  fi
done

nginx -t
systemctl reload nginx
echo "[OK] Nginx recargado"
