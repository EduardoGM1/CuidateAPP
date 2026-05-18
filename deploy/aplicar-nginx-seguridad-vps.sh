#!/usr/bin/env bash
# Aplica endurecimiento Nginx y cabeceras HSTS en el VPS (post-Certbot).
# Uso: sudo bash deploy/aplicar-nginx-seguridad-vps.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/CuidateAPP}"
NGINX_MAIN="/etc/nginx/nginx.conf"
HARDENING="$APP_ROOT/deploy/nginx-hardening.conf"
HTTPS_INC="$APP_ROOT/deploy/nginx-security-headers-https.inc"
MARKER="# cuidateapp-security-hardening"

if [[ ! -f "$HARDENING" ]]; then
  echo "[ERROR] No existe $HARDENING — ejecuta git pull en $APP_ROOT"
  exit 1
fi

echo "=== Incluir nginx-hardening.conf en $NGINX_MAIN ==="
if grep -qF "$MARKER" "$NGINX_MAIN" 2>/dev/null; then
  echo "[OK] Hardening global ya configurado"
else
  cp -a "$NGINX_MAIN" "${NGINX_MAIN}.bak-$(date +%Y%m%d%H%M%S)"
  awk -v inc="include $HARDENING; $MARKER" '
    /^[[:space:]]*http[[:space:]]*\{/ && !done {
      print
      print "    " inc
      done=1
      next
    }
    { print }
  ' "$NGINX_MAIN" > "${NGINX_MAIN}.tmp" && mv "${NGINX_MAIN}.tmp" "$NGINX_MAIN"
  echo "[OK] Añadido include de hardening"
fi

echo ""
echo "=== HSTS en bloques SSL (sites-enabled) ==="
shopt -s nullglob
for f in /etc/nginx/sites-enabled/*; do
  [[ -f "$f" ]] || continue
  if grep -qE 'listen[[:space:]]+443' "$f" && ! grep -qF 'nginx-security-headers-https.inc' "$f"; then
    cp -a "$f" "${f}.bak-$(date +%Y%m%d%H%M%S)"
    # Tras cada include de nginx-security-headers.inc (SPA o API)
    sed -i "s|\(include ${APP_ROOT}/deploy/nginx-security-headers\.inc;\)|\1\n    include ${APP_ROOT}/deploy/nginx-security-headers-https.inc;|g" "$f"
    sed -i "s|\(include ${APP_ROOT}/deploy/nginx-security-headers-api\.inc;\)|\1\n    include ${APP_ROOT}/deploy/nginx-security-headers-https.inc;|g" "$f"
    echo "[OK] HSTS include en $f"
  fi
done

echo ""
echo "=== Probar y recargar Nginx ==="
nginx -t
systemctl reload nginx
echo "[OK] Nginx recargado"

echo ""
echo "=== Cabeceras HTTPS (muestra) ==="
DOMAIN="${WEB_DOMAIN:-cuidateapp.com.mx}"
curl -sSI "https://${DOMAIN}/" 2>/dev/null | grep -iE '^(server|strict-transport|content-security|cross-origin)' || true
