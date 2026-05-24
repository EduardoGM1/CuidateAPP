#!/usr/bin/env bash
# Actualiza bloques location /socket.io existentes (Connection upgrade + buffering off).
set -euo pipefail

patch_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  grep -q 'location /socket.io' "$f" || return 0
  if grep -q 'proxy_set_header Connection \$connection_upgrade' "$f"; then
    return 0
  fi
  cp -a "$f" "${f}.bak-socket-$(date +%Y%m%d%H%M%S)"
  sed -i 's/proxy_set_header Connection "upgrade";/proxy_set_header Connection $connection_upgrade;/g' "$f"
  sed -i 's/proxy_set_header Connection upgrade;/proxy_set_header Connection $connection_upgrade;/g' "$f"
  if ! grep -q 'proxy_buffering off' "$f"; then
    sed -i '/location \/socket\.io/,/^[[:space:]]*}/{
      /proxy_cache_bypass/ a\    proxy_buffering off;
    }' "$f"
  fi
  echo "[OK] Bloque socket.io actualizado: $f"
}

for f in /etc/nginx/sites-enabled/*; do
  [[ -f "$f" ]] || continue
  [[ "$f" == *".bak"* ]] && continue
  patch_file "$f"
done
