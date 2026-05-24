#!/usr/bin/env bash
# Nginx: map de upgrade + proxy /socket.io + quitar .bak de sites-enabled.
# Uso en VPS: sudo bash deploy/ensure-nginx-socketio.sh

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/CuidateAPP}"
MAP_INC="$APP_ROOT/deploy/nginx-socketio-upgrade-map.inc"
NGINX_CONF="/etc/nginx/nginx.conf"
MARKER_MAP="cuidateapp-socketio-upgrade-map"

echo "=== Nginx Socket.IO (map + location + limpieza) ==="

shopt -s nullglob
for bak in /etc/nginx/sites-enabled/*.bak-*; do
  echo "[INFO] Quitando backup de sites-enabled: $bak"
  rm -f "$bak"
done

if [[ -f "$MAP_INC" ]] && ! grep -qF "$MARKER_MAP" "$NGINX_CONF" 2>/dev/null; then
  cp -a "$NGINX_CONF" "${NGINX_CONF}.bak-$(date +%Y%m%d%H%M%S)"
  python3 - "$NGINX_CONF" "$MAP_INC" "$MARKER_MAP" <<'PY'
import sys
from pathlib import Path

conf, inc, marker = sys.argv[1:4]
text = Path(conf).read_text(encoding="utf-8")
if marker in text:
    sys.exit(0)
inc_body = Path(inc).read_text(encoding="utf-8").strip()
block = f"\n    # {marker}\n    " + inc_body.replace("\n", "\n    ") + "\n"
needle = "http {"
idx = text.find(needle)
if idx < 0:
    print("[ERROR] No se encontró bloque http {}", file=sys.stderr)
    sys.exit(1)
insert = idx + len(needle)
Path(conf).write_text(text[:insert] + block + text[insert:], encoding="utf-8")
print(f"[OK] Map upgrade añadido en {conf}")
PY
elif grep -qF "$MARKER_MAP" "$NGINX_CONF" 2>/dev/null; then
  echo "[OK] Map upgrade ya presente"
else
  echo "[WARN] Falta $MAP_INC — git pull"
fi

# Parchear location /socket.io en sitios CuidateAPP (Connection $connection_upgrade)
bash "$APP_ROOT/deploy/patch-nginx-socketio-blocks.sh" 2>/dev/null || true
bash "$APP_ROOT/deploy/apply-nginx-socketio.sh"

nginx -t
systemctl reload nginx
echo "[OK] Nginx listo para Socket.IO"
