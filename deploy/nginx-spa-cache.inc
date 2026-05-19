# Caché SPA (incluir en server que sirve cuidate-web/dist, ANTES de location /)
# index.html y version.json: sin caché (evita chunks obsoletos tras deploy)
# /assets/*: inmutable (nombres con hash de Vite)

location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
}

location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

location = /version.json {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    try_files $uri =404;
}
