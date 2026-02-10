# CuidateAPP – Instrucciones de deploy paso a paso (VPS Hostinger KVM 2)

Repositorio: **git@github.com:EduardoGM1/CuidateAPP.git**

---

## Opción 1: Configuración total con un solo script (recomendado)

Todo el proceso en un solo script: clona el repo, instala Node/MySQL/Nginx/PM2, crea la base de datos, configura la API y la web, y deja Nginx listo.

### Requisitos previos

- VPS con **Ubuntu 22.04** (p. ej. Hostinger KVM 2).
- **IP de la VPS** (y, si usas dominio, el dominio ya apuntando a esa IP no es obligatorio para el script, pero sí para SSL después).
- Si usas **clonación por SSH**: la VPS debe tener una **clave SSH** añadida en GitHub (Deploy key o tu clave en *Settings → SSH and GPG keys*).

---

### Paso 1. Conectar por SSH

En tu PC (PowerShell o terminal):

```bash
ssh root@TU_IP_VPS
```

Sustituye `TU_IP_VPS` por la IP que te da Hostinger (y `root` por tu usuario si es otro). Si usas clave descargada: `ssh -i ruta/a/tu-clave.pem root@TU_IP_VPS`.

---

### Paso 2. Descargar el script de configuración total

En la VPS (ya conectado por SSH):

```bash
curl -sL https://raw.githubusercontent.com/EduardoGM1/CuidateAPP/main/deploy/configuracion-total-vps.sh -o configuracion-total-vps.sh
```

---

### Paso 3. Definir variables y ejecutar

**Si aún NO tienes dominio (solo IP):**

Sustituye `123.45.67.89` por la IP de tu VPS y `tu_password_seguro` por la contraseña que quieras para el usuario de MySQL.

```bash
export VPS_IP=123.45.67.89
export DB_PASSWORD='tu_password_seguro'
sudo bash configuracion-total-vps.sh
```

**Si YA tienes dominio:**

Sustituye `tudominio.com` y `api.tudominio.com` por tu dominio y subdominio de la API, y `tu_password_seguro` por la contraseña de MySQL.

```bash
export WEB_DOMAIN=tudominio.com
export API_DOMAIN=api.tudominio.com
export DB_PASSWORD='tu_password_seguro'
sudo bash configuracion-total-vps.sh
```

---

### Paso 4. Esperar a que termine el script

El script:

- Actualiza el sistema e instala git.
- Clona **git@github.com:EduardoGM1/CuidateAPP.git** en `/var/www/CuidateAPP`.
- Instala Node.js 20, MySQL, Nginx, Certbot y PM2.
- Crea la base de datos `medical_db` y el usuario `api_user`.
- Instala dependencias de **api-clinica**, crea/ajusta `.env` y arranca la API con PM2.
- Instala dependencias de **cuidate-web**, genera el build y configura Nginx.

Puede tardar varios minutos.

---

### Paso 5. Revisar el archivo .env del backend

En la VPS:

```bash
nano /var/www/CuidateAPP/api-clinica/.env
```

Comprueba y completa si hace falta:

- **JWT_SECRET**, **JWT_REFRESH_SECRET**, **ENCRYPTION_KEY** (puedes generarlos en la VPS con: `cd /var/www/CuidateAPP/api-clinica && node scripts/generate-keys.js` y copiar lo que imprima al `.env`).
- **Firebase** (FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT_KEY, etc.) si usas notificaciones push.
- **Resend** (RESEND_API_KEY) si usas envío de emails.

Guarda (Ctrl+O, Enter) y sal (Ctrl+X). Luego reinicia la API:

```bash
pm2 restart api-clinica
```

---

### Paso 6. Probar que todo funciona

- **Solo IP:** abre en el navegador `http://TU_IP_VPS`. Deberías ver la web y el login. La API se usa en `http://TU_IP_VPS/api`.
- **Con dominio:** abre `http://tudominio.com` y `http://api.tudominio.com` (o las URLs que hayas configurado).

---

### Paso 7. Activar SSL (solo si usas dominio)

Cuando el DNS de tu dominio y subdominio apunten a la IP de la VPS, en la VPS ejecuta:

```bash
certbot --nginx -d tudominio.com -d www.tudominio.com -d api.tudominio.com
```

Sustituye por tus dominios. Después de esto, la web y la API quedarán en **https**.

---

### Resumen rápido (solo IP)

```bash
ssh root@TU_IP_VPS
curl -sL https://raw.githubusercontent.com/EduardoGM1/CuidateAPP/main/deploy/configuracion-total-vps.sh -o configuracion-total-vps.sh
export VPS_IP=TU_IP_VPS
export DB_PASSWORD='tu_password_seguro'
sudo bash configuracion-total-vps.sh
# Revisar api-clinica/.env y: pm2 restart api-clinica
```

---

## Opción 2: Paso a paso manual (sin script de configuración total)

Si prefieres no usar el script que clona y hace todo, puedes seguir estos pasos manuales.

### Paso 1. Conectar por SSH

```bash
ssh root@TU_IP_VPS
```

---

### Paso 2. Actualizar sistema e instalar software

```bash
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs mysql-server nginx git
apt install -y certbot python3-certbot-nginx
npm install -g pm2
```

(Opcional) Ajustar MySQL:

```bash
mysql_secure_installation
```

---

### Paso 3. Crear base de datos y usuario MySQL

```bash
mysql -u root -p
```

Dentro de MySQL (sustituye `TU_PASSWORD_SEGURA`):

```sql
CREATE DATABASE medical_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'api_user'@'localhost' IDENTIFIED BY 'TU_PASSWORD_SEGURA';
GRANT ALL PRIVILEGES ON medical_db.* TO 'api_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

### Paso 4. Clonar el repositorio

```bash
mkdir -p /var/www
cd /var/www
git clone git@github.com:EduardoGM1/CuidateAPP.git CuidateAPP
cd CuidateAPP
```

(Si el repo es privado, la VPS debe tener clave SSH configurada en GitHub.)

---

### Paso 5. Ejecutar el script de setup (desde el repo clonado)

**Solo IP:**

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

---

### Paso 6. Revisar .env y reiniciar API

```bash
nano /var/www/CuidateAPP/api-clinica/.env
# Completar JWT_SECRET, ENCRYPTION_KEY, Firebase, Resend, etc.
pm2 restart api-clinica
```

---

### Paso 7. Probar y (si usas dominio) activar SSL

- Probar: `http://TU_IP_VPS` o `http://tudominio.com`.
- SSL con dominio: `certbot --nginx -d tudominio.com -d www.tudominio.com -d api.tudominio.com`

---

## Comandos útiles después del deploy

| Acción | Comando |
|--------|--------|
| Ver estado de la API | `pm2 status` |
| Ver logs de la API | `pm2 logs api-clinica` |
| Reiniciar la API | `pm2 restart api-clinica` |
| Recargar Nginx | `sudo systemctl reload nginx` |
| Actualizar código | `cd /var/www/CuidateAPP && git pull` y luego `pm2 restart api-clinica`; en web: `cd cuidate-web && npm run build` |

---

## URLs finales

| Modo | Web | API |
|------|-----|-----|
| Solo IP | `http://TU_IP_VPS` | `http://TU_IP_VPS/api` |
| Con dominio (sin SSL) | `http://tudominio.com` | `http://api.tudominio.com` |
| Con dominio + SSL | `https://tudominio.com` | `https://api.tudominio.com` |
