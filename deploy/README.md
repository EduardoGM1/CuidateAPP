# Deploy CuidateAPP (VPS Hostinger KVM 2)

Configuración para desplegar **backend** (api-clinica) y **web** (cuidate-web) en una VPS (Ubuntu 22.04).

Repositorio: **git@github.com:EduardoGM1/CuidateAPP.git**

## Contenido

| Archivo | Descripción |
|---------|-------------|
| **`configuracion-total-vps.sh`** | **Configuración total:** crea carpetas, clona el repo y ejecuta el setup completo (todo en uno) |
| `setup-vps.sh` | Script de instalación (requiere código ya en el servidor): Node, MySQL, Nginx, PM2, Certbot; crea DB, configura API y web, build y Nginx |
| `nginx-cuidateapp.conf` | Plantilla Nginx por defecto (solo IP) |
| `nginx-cuidateapp-ip.conf` | Nginx: modo solo IP (web + `/api` en la misma IP) |
| `nginx-cuidateapp-domain.conf` | Nginx: modo dominio (web en tudominio.com, API en api.tudominio.com) |
| `ecosystem.config.cjs` | PM2: arranque de api-clinica |

## Guía completa

Ver **[docs/DESPLIEGUE-VPS-HOSTINGER-KVM2.md](../docs/DESPLIEGUE-VPS-HOSTINGER-KVM2.md)**.

## Opción A: Configuración total (recomendado en VPS nueva)

En una VPS **nueva** (sin código), descarga el script, define variables y ejecuta. El script clona el repo y hace todo el setup.

1. **Conectar por SSH:** `ssh root@TU_IP`
2. **Descargar el script:**
   ```bash
   curl -sL https://raw.githubusercontent.com/EduardoGM1/CuidateAPP/main/deploy/configuracion-total-vps.sh -o configuracion-total-vps.sh
   ```
3. **Solo IP (sin dominio):**
   ```bash
   export VPS_IP=123.45.67.89
   export DB_PASSWORD='tu_password_seguro'
   sudo bash configuracion-total-vps.sh
   ```
4. **Con dominio:**
   ```bash
   export WEB_DOMAIN=tudominio.com
   export API_DOMAIN=api.tudominio.com
   export DB_PASSWORD='tu_password_seguro'
   sudo bash configuracion-total-vps.sh
   ```

El script crea `/var/www`, clona **git@github.com:EduardoGM1/CuidateAPP.git** en `/var/www/CuidateAPP` y luego ejecuta `deploy/setup-vps.sh`. Para clonar por SSH, la VPS debe tener una clave SSH configurada en GitHub (deploy key o tu clave).

## Opción B: Ya tienes el código en el servidor

1. **Crear VPS** (Hostinger KVM 2 u otro con Ubuntu 22.04).
2. **Conectar por SSH:** `ssh root@TU_IP`
3. **Clonar el repo** en `/var/www/CuidateAPP` (o subir código).
4. **Ejecutar solo el setup:**

   **Solo IP (sin dominio):**
   ```bash
   cd /var/www/CuidateAPP
   export VPS_IP=123.45.67.89
   export DB_PASSWORD='tu_password_seguro'
   sudo bash deploy/setup-vps.sh
   ```

   **Con dominio:**
   ```bash
   cd /var/www/CuidateAPP
   export WEB_DOMAIN=tudominio.com
   export API_DOMAIN=api.tudominio.com
   export DB_PASSWORD='tu_password_seguro'
   sudo bash deploy/setup-vps.sh
   ```

5. **Revisar** `api-clinica/.env` (JWT_SECRET, ENCRYPTION_KEY, Firebase, Resend, etc.).
6. **Si usas dominio:** configurar DNS (A/CNAME a la IP) y luego:
   ```bash
   certbot --nginx -d tudominio.com -d www.tudominio.com -d api.tudominio.com
   ```

## PM2

- Iniciar (desde la raíz del repo): `pm2 start deploy/ecosystem.config.cjs`
- Estado: `pm2 status`
- Logs: `pm2 logs api-clinica`
- Reiniciar: `pm2 restart api-clinica`
- Persistir al reinicio del servidor: `pm2 save` y `pm2 startup`

## Rutas tras el deploy

| Modo | Web | API |
|------|-----|-----|
| Solo IP | `http://TU_IP` | `http://TU_IP/api` |
| Con dominio | `https://tudominio.com` | `https://api.tudominio.com` |
