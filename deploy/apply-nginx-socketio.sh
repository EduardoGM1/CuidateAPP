#!/usr/bin/env bash
# Añade proxy /socket.io al sitio Nginx de CuidateAPP (después del bloque location /api).
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
  if grep -qF "$MARKER" "$f" 2>/dev/null && nginx -t 2>/dev/null; then
    echo "[OK] Ya tiene socket.io: $f"
    return 0
  fi
  if grep -qF "$MARKER" "$f" 2>/dev/null; then
    echo "[WARN] Marcador presente pero Nginx inválido; reparando $f"
    bash "$APP_ROOT/deploy/repair-nginx-socketio.sh" "$f"
  fi
  cp -a "$f" "${f}.bak-$(date +%Y%m%d%H%M%S)"
  python3 - "$f" "$INC" "$MARKER" <<'PY'
import sys
from pathlib import Path

path, inc_path, marker = sys.argv[1:4]
text = Path(path).read_text(encoding="utf-8")
inc = Path(inc_path).read_text(encoding="utf-8")
block = f"\n    {marker}\n"
for line in inc.splitlines():
    if line.strip():
        block += f"    {line}\n"

lines = text.splitlines(keepends=True)
out = []
i = 0
patched = False
while i < len(lines):
    line = lines[i]
    out.append(line)
    if not patched and "location /api" in line and "{" in line:
        depth = line.count("{") - line.count("}")
        j = i + 1
        while j < len(lines) and depth > 0:
            depth += lines[j].count("{") - lines[j].count("}")
            out.append(lines[j])
            j += 1
        out.append(block)
        i = j
        patched = True
        continue
    i += 1

if not patched:
    print(f"[WARN] No se encontró location /api en {path}", file=sys.stderr)
    sys.exit(1)
Path(path).write_text("".join(out), encoding="utf-8")
PY
  echo "[OK] Parcheado: $f"
}

echo "=== Aplicar proxy Socket.IO en Nginx ==="
shopt -s nullglob
for f in /etc/nginx/sites-enabled/*; do
  [[ -f "$f" ]] || continue
  [[ "$f" == *".bak-"* ]] && continue
  if grep -qE 'cuidate|CuidateAPP|/var/www/CuidateAPP|location /api' "$f" 2>/dev/null; then
    patch_file "$f"
  fi
done

nginx -t
systemctl reload nginx
echo "[OK] Nginx recargado"
