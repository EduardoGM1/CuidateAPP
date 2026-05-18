# Cabeceras que SOLO deben enviarse sobre HTTPS (bloque server listen 443 ssl).
# Incluir después de Certbot/TLS y de nginx-security-headers.inc:
#   include {{APP_ROOT}}/deploy/nginx-security-headers-https.inc;
#
# Precarga HSTS: https://hstspreload.org (registrar dominio tras desplegar esta cabecera).

add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
