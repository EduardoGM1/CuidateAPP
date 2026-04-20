# Cabeceras mínimas para el reverse-proxy de la API (JSON).
# Incluir en el server {} que hace proxy_pass al backend Node:
#   include {{APP_ROOT}}/deploy/nginx-security-headers-api.inc;

add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;
