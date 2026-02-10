#!/usr/bin/env bash
# CuidateAPP - Configuración VPS (Hostinger KVM 2 / Ubuntu 22.04)
# Ejecutar como root: sudo bash setup-vps.sh
# Requiere: código en /var/www/CuidateAPP (api-clinica + cuidate-web)

set -euo pipefail

# ============== VARIABLES (editar antes de ejecutar) ==============
APP_ROOT="${APP_ROOT:-/var/www/CuidateAPP}"

# Sin dominio: usar IP de la VPS (ej: 123.45.67.89). Con dominio: poner el dominio (ej: tudominio.com).
VPS_IP="${VPS_IP:-}"
WEB_DOMAIN="${WEB_DOMAIN:-}"
API_DOMAIN="${API_DOMAIN:-}"

# Si tienes dominio, rellena WEB_DOMAIN y API_DOMAIN. Si no, rellena VPS_IP y déjalos vacíos.
# Ejemplo con dominio: WEB_DOMAIN=tudominio.com  API_DOMAIN=api.tudominio.com
# Ejemplo solo IP:     VPS_IP=123.45.67.89      WEB_DOMAIN=  API_DOMAIN=

DB_NAME="${DB_NAME:-medical_db}"
DB_USER="${DB_USER:-api_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

# ============== NO EDITAR DE AQUÍ ABAJO ==============
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()  { echo -e "${RED}[ERROR]${NC} $1"; }

if [ "$(id -u)" -ne 0 ]; then
  log_err "Ejecuta como root: sudo bash setup-vps.sh"
  exit 1
fi

USE_DOMAIN=false
if [ -n "${WEB_DOMAIN:-}" ] && [ -n "${API_DOMAIN:-}" ]; then
  USE_DOMAIN=true
  log_info "Modo: dominio (web=$WEB_DOMAIN, api=$API_DOMAIN)"
else
  if [ -z "${VPS_IP:-}" ]; then
    log_err "Sin dominio: define VPS_IP (ej: export VPS_IP=123.45.67.89)"
    exit 1
  fi
  log_info "Modo: solo IP ($VPS_IP)"
fi

if [ -z "$DB_PASSWORD" ]; then
  log_err "Define DB_PASSWORD (ej: export DB_PASSWORD='tu_password_seguro')"
  exit 1
fi

echo ""
echo "=============================================="
echo "  CuidateAPP - Setup VPS (Hostinger KVM 2)"
echo "=============================================="
echo ""

# 1. Sistema y paquetes
log_info "Actualizando sistema..."
apt update && apt upgrade -y

log_info "Instalando Node.js 20, MySQL, Nginx, Git, Certbot, PM2..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
fi
apt install -y nodejs mysql-server nginx git
apt install -y certbot python3-certbot-nginx || true
npm install -g pm2

# 2. MySQL
log_info "Configurando MySQL..."
mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

# 3. Backend (api-clinica)
API_DIR="$APP_ROOT/api-clinica"
if [ ! -d "$API_DIR" ]; then
  log_err "No existe $API_DIR. Clona el repo en $APP_ROOT antes de ejecutar este script."
  exit 1
fi

log_info "Instalando dependencias de api-clinica..."
cd "$API_DIR"
npm install --production

if [ ! -f .env ]; then
  log_info "Creando .env desde .env.example..."
  cp .env.example .env
fi

log_info "Ajustando .env (DB, PORT, NODE_ENV, CORS)..."
set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" .env 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}
set_env "DB_HOST" "localhost"
set_env "DB_USER" "$DB_USER"
set_env "DB_PASSWORD" "$DB_PASSWORD"
set_env "DB_NAME" "$DB_NAME"
set_env "DB_PORT" "3306"
set_env "PORT" "3000"
set_env "NODE_ENV" "production"

if [ "$USE_DOMAIN" = true ]; then
  set_env "ALLOWED_ORIGINS" "https://${WEB_DOMAIN},https://www.${WEB_DOMAIN}"
  set_env "FRONTEND_URL" "https://${WEB_DOMAIN}"
else
  set_env "ALLOWED_ORIGINS" "http://${VPS_IP}"
  set_env "FRONTEND_URL" "http://${VPS_IP}"
fi

log_warn "Revisa api-clinica/.env: JWT_SECRET, ENCRYPTION_KEY, Firebase, Resend, etc."

log_info "Iniciando API con PM2..."
pm2 start index.js --name "api-clinica" || pm2 restart "api-clinica"
pm2 save
pm2 startup -u root --hp /root 2>/dev/null || true

# 4. Frontend (cuidate-web)
WEB_DIR="$APP_ROOT/cuidate-web"
if [ ! -d "$WEB_DIR" ]; then
  log_err "No existe $WEB_DIR. Clona el repo en $APP_ROOT."
  exit 1
fi

cd "$WEB_DIR"
log_info "Instalando dependencias de cuidate-web..."
npm install

log_info "Creando .env.production y generando build..."
if [ "$USE_DOMAIN" = true ]; then
  echo "VITE_API_BASE_URL=https://${API_DOMAIN}" > .env.production
else
  echo "VITE_API_BASE_URL=" > .env.production
fi
npm run build

# 5. Nginx
log_info "Configurando Nginx..."
DEPLOY_DIR="$APP_ROOT/deploy"
NGINX_AVAILABLE="/etc/nginx/sites-available/cuidateapp"
NGINX_ENABLED="/etc/nginx/sites-enabled/cuidateapp"

if [ "$USE_DOMAIN" = true ]; then
  [ -f "$DEPLOY_DIR/nginx-cuidateapp-domain.conf" ] || { log_err "No existe $DEPLOY_DIR/nginx-cuidateapp-domain.conf"; exit 1; }
  cp "$DEPLOY_DIR/nginx-cuidateapp-domain.conf" "$NGINX_AVAILABLE"
  sed -i "s|{{APP_ROOT}}|$APP_ROOT|g" "$NGINX_AVAILABLE"
  sed -i "s|{{WEB_DOMAIN}}|$WEB_DOMAIN|g" "$NGINX_AVAILABLE"
  sed -i "s|{{API_DOMAIN}}|$API_DOMAIN|g" "$NGINX_AVAILABLE"
else
  [ -f "$DEPLOY_DIR/nginx-cuidateapp-ip.conf" ] || { log_err "No existe $DEPLOY_DIR/nginx-cuidateapp-ip.conf"; exit 1; }
  cp "$DEPLOY_DIR/nginx-cuidateapp-ip.conf" "$NGINX_AVAILABLE"
  sed -i "s|{{APP_ROOT}}|$APP_ROOT|g" "$NGINX_AVAILABLE"
fi

ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED"
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx

echo ""
echo "=============================================="
echo "  Setup completado"
echo "=============================================="
echo ""
if [ "$USE_DOMAIN" = true ]; then
  echo "  Web:  http://$WEB_DOMAIN"
  echo "  API:  http://$API_DOMAIN"
  echo ""
  echo "  Siguiente paso (SSL):"
  echo "    certbot --nginx -d $WEB_DOMAIN -d www.$WEB_DOMAIN -d $API_DOMAIN"
else
  echo "  Web:  http://$VPS_IP"
  echo "  API:  http://$VPS_IP/api"
  echo ""
  echo "  Cuando tengas dominio, configura DNS y vuelve a ejecutar (o actualiza Nginx a mano):"
  echo "    WEB_DOMAIN=tudominio.com API_DOMAIN=api.tudominio.com sudo bash $0"
fi
echo ""
echo "  PM2:  pm2 status   |   pm2 logs api-clinica"
echo "  Revisa: $API_DIR/.env (JWT_SECRET, ENCRYPTION_KEY, Firebase, Resend)"
echo ""
