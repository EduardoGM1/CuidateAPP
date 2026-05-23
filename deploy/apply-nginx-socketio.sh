#!/usr/bin/env bash
# Añade proxy /socket.io/ a los sitios Nginx de CuidateAPP (si falta).
# Uso en VPS: sudo bash deploy/apply-nginx-socketio.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/CuidateAPP}"
INC="$APP_ROOT/deploy/nginx-socketio.inc"
MARKER="# cuidateapp-socketio-proxy"

if [[ ! -f "$INC" ]]; then
  echo "[ERROR] No existe $INC — git pull en $APP_ROOT"
  exit 1
fi

patch_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  if grep -qF "$MARKER" "$f" 2>/dev/null; then
    echo "[OK] Ya tiene socket.io: $f"
    return 0
  fi
  cp -a "$f" "${f}.bak-$(date +%Y%m%d%H%M%S)"
  awk -v marker="$MARKER" -v incfile="$INC" '
    BEGIN { while ((getline line < incfile) > 0) block = block line "\n" }
    /^[[:space:]]*location \/api[[:space:]]*\{/ && !done {
      print
      print ""
      print "    " marker
      n = split(block, lines, "\n")
      for (i = 1; i <= n; i++) if (lines[i] != "") print "    " lines[i]
      print ""
      done = 1
      next
    }
    { print }
  ' "$f" > "${f}.tmp" && mv "${f}.tmp" "$f"
  echo "[OK] Parcheado: $f"
}

echo "=== Aplicar proxy Socket.IO en Nginx ==="
shopt -s nullglob
for f in /etc/nginx/sites-enabled/*; do
  [[ -f "$f" ]] || continue
  [[ "$f" == *".bak-"* ]] && continue
  if grep -qE 'cuidate|CuidateAPP|/var/www/CuidateAPP' "$f" 2>/dev/null || grep -q 'location /api' "$f" 2>/dev/null; then
    patch_file "$f"
  fi
done

nginx -t
systemctl reload nginx
echo "[OK] Nginx recargado"
