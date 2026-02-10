#!/usr/bin/env bash
# =============================================================================
# CuidateAPP - Configuración total en VPS (desde cero)
# Crea carpetas, clona el repositorio y ejecuta el setup completo.
# Repositorio: git@github.com:EduardoGM1/CuidateAPP.git
#
# Uso en la VPS (Ubuntu 22.04):
#   1. Descargar el script (o clonar el repo y ejecutarlo):
#      curl -sL https://raw.githubusercontent.com/EduardoGM1/CuidateAPP/main/deploy/configuracion-total-vps.sh -o configuracion-total-vps.sh
#   2. Definir variables y ejecutar:
#      export VPS_IP=123.45.67.89
#      export DB_PASSWORD='tu_password_seguro'
#      sudo bash configuracion-total-vps.sh
#
# Con dominio:
#      export WEB_DOMAIN=tudominio.com
#      export API_DOMAIN=api.tudominio.com
#      export DB_PASSWORD='tu_password_seguro'
#      sudo bash configuracion-total-vps.sh
# =============================================================================

set -euo pipefail

REPO_URL="${REPO_URL:-git@github.com:EduardoGM1/CuidateAPP.git}"
APP_ROOT="${APP_ROOT:-/var/www/CuidateAPP}"
BRANCH="${BRANCH:-main}"

# Sin dominio: IP de la VPS. Con dominio: WEB_DOMAIN y API_DOMAIN.
VPS_IP="${VPS_IP:-}"
WEB_DOMAIN="${WEB_DOMAIN:-}"
API_DOMAIN="${API_DOMAIN:-}"

DB_NAME="${DB_NAME:-medical_db}"
DB_USER="${DB_USER:-api_user}"
DB_PASSWORD="${DB_PASSWORD:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()  { echo -e "${RED}[ERROR]${NC} $1"; }

if [ "$(id -u)" -ne 0 ]; then
  log_err "Ejecuta como root: sudo bash configuracion-total-vps.sh"
  exit 1
fi

# Comprobar variables mínimas
if [ -z "$DB_PASSWORD" ]; then
  log_err "Define DB_PASSWORD (ej: export DB_PASSWORD='tu_password_seguro')"
  exit 1
fi

USE_DOMAIN=false
if [ -n "${WEB_DOMAIN:-}" ] && [ -n "${API_DOMAIN:-}" ]; then
  USE_DOMAIN=true
else
  if [ -z "${VPS_IP:-}" ]; then
    log_err "Sin dominio: define VPS_IP (ej: export VPS_IP=123.45.67.89)"
    exit 1
  fi
fi

echo ""
echo "=============================================="
echo "  CuidateAPP - Configuración total VPS"
echo "=============================================="
echo "  Repositorio: $REPO_URL"
echo "  Directorio:   $APP_ROOT"
echo "  Rama:         $BRANCH"
echo "=============================================="
echo ""

# -----------------------------------------------------------------------------
# 1. Dependencias mínimas para clonar (git)
# -----------------------------------------------------------------------------
log_info "Actualizando sistema e instalando git..."
apt update
apt install -y git

# -----------------------------------------------------------------------------
# 2. Crear directorio y clonar o actualizar repositorio
# -----------------------------------------------------------------------------
mkdir -p "$(dirname "$APP_ROOT")"

if [ -d "$APP_ROOT/.git" ]; then
  log_info "El directorio $APP_ROOT ya existe (repositorio Git). Actualizando..."
  cd "$APP_ROOT"
  git fetch origin
  git checkout -q "$BRANCH" 2>/dev/null || true
  git pull origin "$BRANCH" || log_warn "git pull falló; se usará el código actual."
  cd - >/dev/null
else
  if [ -d "$APP_ROOT" ] && [ -n "$(ls -A "$APP_ROOT" 2>/dev/null)" ]; then
    log_err "El directorio $APP_ROOT existe y no es un clon Git. Elimínalo o usa otro APP_ROOT."
    exit 1
  fi
  log_info "Clonando repositorio en $APP_ROOT ..."
  rm -rf "$APP_ROOT" 2>/dev/null || true
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_ROOT"
  log_info "Clonado correctamente."
fi

# -----------------------------------------------------------------------------
# 3. Comprobar que existen api-clinica y cuidate-web
# -----------------------------------------------------------------------------
if [ ! -d "$APP_ROOT/api-clinica" ] || [ ! -d "$APP_ROOT/cuidate-web" ]; then
  log_err "Tras clonar, no se encontraron api-clinica o cuidate-web en $APP_ROOT"
  exit 1
fi

# -----------------------------------------------------------------------------
# 4. Ejecutar script de setup (instala todo y configura)
# -----------------------------------------------------------------------------
SETUP_SCRIPT="$APP_ROOT/deploy/setup-vps.sh"
if [ ! -f "$SETUP_SCRIPT" ]; then
  log_err "No se encontró $SETUP_SCRIPT"
  exit 1
fi

log_info "Ejecutando setup completo (Node, MySQL, Nginx, PM2, build, etc.)..."
export APP_ROOT
export VPS_IP
export WEB_DOMAIN
export API_DOMAIN
export DB_NAME
export DB_USER
export DB_PASSWORD
bash "$SETUP_SCRIPT"

echo ""
log_info "Configuración total finalizada."
echo ""
