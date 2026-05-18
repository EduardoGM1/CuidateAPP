# Cabeceras que SOLO deben enviarse sobre HTTPS (bloque server listen 443 ssl).
# Incluir después de Certbot/TLS y de nginx-security-headers.inc:
#   include {{APP_ROOT}}/deploy/nginx-security-headers-https.inc;
#
# Precarga HSTS (https://hstspreload.org): descomente "preload" solo si TODOS los
# subdominios sirven HTTPS de forma permanente y nunca volverá a usarse HTTP.

add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
# add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
