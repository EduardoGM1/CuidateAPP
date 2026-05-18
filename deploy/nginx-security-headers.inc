# Cabeceras de seguridad HTTP para la SPA (cuidate-web/dist).
# Incluir en cada bloque server { } que sirva el frontend, después de root/index:
#   include {{APP_ROOT}}/deploy/nginx-security-headers.inc;
#
# Sobre HTTPS (443), añadir también:
#   include {{APP_ROOT}}/deploy/nginx-security-headers-https.inc;
#
# CSP: ver cuidate-web/security/csp-spa-policy.js (style-src-elem vs style-src-attr).
# HSTS: solo en nginx-security-headers-https.inc (no enviar HSTS en HTTP:80).

add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-site" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src-elem 'self' https://fonts.googleapis.com; style-src-attr 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'" always;
