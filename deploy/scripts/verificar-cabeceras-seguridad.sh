#!/usr/bin/env bash
# Verificación rápida de cabeceras de seguridad (post-deploy).
# Uso: ./deploy/scripts/verificar-cabeceras-seguridad.sh https://cuidateapp.com.mx

set -euo pipefail

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "Uso: $0 <URL-base>   ej. https://cuidateapp.com.mx"
  exit 1
fi

echo "=== Cabeceras: $URL ==="
curl -sSI "$URL" | grep -iE '^(server|strict-transport|content-security|x-frame|x-content-type|referrer|permissions|cross-origin)' || true

echo ""
echo "=== CSP (detalle) ==="
curl -sSI "$URL" | grep -i '^content-security-policy:' || echo "(sin CSP)"

echo ""
echo "Comprobaciones manuales recomendadas:"
echo "  - OWASP ZAP: escaneo activo de XSS/SQLi en la API"
echo "  - nmap: puertos expuestos (evitar 3306/MySQL público, restringir SSH)"
