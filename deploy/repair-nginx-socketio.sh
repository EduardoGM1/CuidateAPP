#!/usr/bin/env bash
# Repara Nginx si socket.io quedó dentro de location /api (parche incorrecto).
set -euo pipefail
SITE="${1:-/etc/nginx/sites-enabled/cuidateapp}"
if [[ ! -f "$SITE" ]]; then
  echo "[ERROR] No existe $SITE"
  exit 1
fi
if nginx -t 2>/dev/null; then
  echo "[OK] Nginx ya válido"
  exit 0
fi
bak="$(ls -t "${SITE}.bak-"* 2>/dev/null | head -1 || true)"
if [[ -n "$bak" ]]; then
  cp -a "$bak" "$SITE"
  echo "[OK] Restaurado desde $bak"
fi
# Quitar bloque socket.io mal insertado si sigue inválido
if ! nginx -t 2>/dev/null; then
  python3 - "$SITE" <<'PY'
import re, sys
from pathlib import Path
p = Path(sys.argv[1])
t = p.read_text(encoding="utf-8")
t = re.sub(r"\n    # cuidateapp-socketio-proxy\n(?:    .+\n)*?    location /socket\.io[^\n]*\n(?:    .+\n)*?(?=    location |    include |    \})", "\n", t)
p.write_text(t, encoding="utf-8")
PY
  echo "[INFO] Eliminado bloque socket.io anidado"
fi
nginx -t
