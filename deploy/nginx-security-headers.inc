# Cabeceras de seguridad HTTP para la SPA (cuidate-web/dist).
# Incluir en cada bloque server { } que sirva el frontend, después de root/index:
#   include {{APP_ROOT}}/deploy/nginx-security-headers.inc;
# (setup-vps sustituye {{APP_ROOT}} en el .conf principal; la ruta del include queda absoluta.)
#
# Strict-Transport-Security: enviar solo sobre HTTPS. Tras Certbot/TLS, añada en ese server:
#   add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
# Ver deploy/README.md sección "Cabeceras de seguridad y HSTS".

add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'" always;
