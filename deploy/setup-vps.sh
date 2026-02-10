#!/bin/bash
# Script de configuración inicial para VPS (LightNode - Ubuntu 22.04)
# Ejecutar como root: sudo ./setup-vps.sh

set -e

echo "=============================================="
echo "  CuidateAPP - Configuración VPS LightNode"
echo "=============================================="

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Actualizar sistema
log_info "Actualizando sistema..."
apt update && apt upgrade -y

# 2. Instalar Node.js 20
log_info "Instalando Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
node -v
npm -v

# 3. Instalar MySQL
log_info "Instalando MySQL..."
if ! command -v mysql &> /dev/null; then
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
fi

# 4. Instalar Nginx
log_info "Instalando Nginx..."
apt install -y nginx

# 5. Instalar Certbot (SSL)
log_info "Instalando Certbot..."
apt install -y certbot python3-certbot-nginx

# 6. Instalar PM2
log_info "Instalando PM2..."
npm install -g pm2

# 7. Crear directorio de la app
log_info "Creando directorio /var/www/cuidateapp..."
mkdir -p /var/www/cuidateapp

echo ""
echo "=============================================="
log_info "Instalación base completada."
echo "=============================================="
echo ""
echo "Pasos siguientes (manual):"
echo "1. Configurar MySQL:"
echo "   sudo mysql"
echo "   CREATE DATABASE medical_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "   CREATE USER 'cuidateapp'@'localhost' IDENTIFIED BY 'TU_PASSWORD';"
echo "   GRANT ALL PRIVILEGES ON medical_db.* TO 'cuidateapp'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "   EXIT;"
echo ""
echo "2. Clonar repo:"
echo "   cd /var/www/cuidateapp"
echo "   git clone https://github.com/EduardoGM1/CuidateAPP.git ."
echo ""
echo "3. Configurar .env en api-clinica y ejecutar:"
echo "   cd api-clinica && npm install"
echo "   node scripts/generate-keys.js"
echo ""
echo "4. Copiar nginx config y ajustar:"
echo "   sudo cp deploy/nginx-cuidateapp.conf /etc/nginx/sites-available/cuidateapp"
echo "   sudo sed -i 's/TU_DOMINIO_O_IP/TU_IP_O_DOMINIO/' /etc/nginx/sites-available/cuidateapp"
echo "   sudo ln -sf /etc/nginx/sites-available/cuidateapp /etc/nginx/sites-enabled/"
echo "   sudo rm -f /etc/nginx/sites-enabled/default"
echo "   sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "5. Iniciar con PM2:"
echo "   cd /var/www/cuidateapp"
echo "   pm2 start deploy/ecosystem.config.cjs"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
