# Incluir una sola vez en el bloque http {} de /etc/nginx/nginx.conf (antes de sites-enabled):
#   include /var/www/CuidateAPP/deploy/nginx-socketio-upgrade-map.inc;
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}
