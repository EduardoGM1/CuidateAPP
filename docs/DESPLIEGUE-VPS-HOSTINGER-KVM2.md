# Despliegue en VPS Hostinger (plan KVM 2)

Guía para tener **activo** en una VPS de Hostinger (KVM 2) el **backend** (api-clinica) y la **página web** (cuidate-web).

**Plan KVM 2:** 2 vCPU, 8 GB RAM, 100 GB NVMe, 8 TB ancho de banda. Suficiente para API + MySQL + web estática + Nginx.

---

## ¿Sin dominio? Puedes empezar por IP y añadir el dominio después

Sí. Puedes tener todo funcionando **solo con la IP** de la VPS y, cuando tengas dominio, configurarlo y activar SSL.

| Fase | Web | API |
|------|-----|-----|
| **Sin dominio** | `http://TU_IP_VPS` | `http://TU_IP_VPS/api` (o `http://TU_IP_VPS:3000`) |
| **Con dominio** | `https://tudominio.com` | `https://api.tudominio.com` o `https://tudominio.com/api` |

- En **Nginx** usas `server_name` con la IP (o `_` para “cualquier nombre”) para servir la web y el proxy de la API.
- En **api-clinica** `.env` pones `ALLOWED_ORIGINS=http://TU_IP_VPS` y `FRONTEND_URL=http://TU_IP_VPS`.
- En **cuidate-web** el build puede usar `VITE_API_BASE_URL=http://TU_IP_VPS` (o `http://TU_IP_VPS/api` si la API va bajo `/api`).
- Cuando tengas dominio: apuntas el DNS a la misma IP, añades el dominio en Nginx, ejecutas Certbot y actualizas `ALLOWED_ORIGINS`, `FRONTEND_URL` y `VITE_API_BASE_URL` con las URLs HTTPS del dominio.

---

## 1. Acceso a la VPS

1. En el panel de Hostinger (hPanel), abre tu VPS y anota:
   - **IP del servidor**
   - **Usuario** (normalmente `root` o el que configuraste)
   - **Contraseña** o **clave SSH** (si usas clave, descárgala y úsala en `ssh -i clave.pem`)

2. Conectar por SSH (en PowerShell o terminal):

```bash
ssh root@TU_IP_VPS
# o con clave:
ssh -i ruta/a/tu-clave.pem root@TU_IP_VPS
```

---

## 2. Instalar software en la VPS (Ubuntu 22.04)

Ejecuta como `root` o con `sudo`:

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# MySQL (servidor)
apt install -y mysql-server
mysql_secure_installation   # Contraseña root, desactivar login remoto si no lo necesitas

# Nginx (proxy reverso y servir la web)
apt install -y nginx

# PM2 (mantener la API siempre activa y reiniciar si cae)
npm install -g pm2

# Certbot (SSL gratis con Let's Encrypt)
apt install -y certbot python3-certbot-nginx
```

---

## 3. Base de datos MySQL

1. Crear base de datos y usuario para la API:

```bash
mysql -u root -p
```

Dentro de MySQL:

```sql
CREATE DATABASE medical_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'api_user'@'localhost' IDENTIFIED BY 'TU_PASSWORD_SEGURA';
GRANT ALL PRIVILEGES ON medical_db.* TO 'api_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

2. (Opcional) Si tienes un dump o migraciones, importar después de subir el proyecto.

---

## 4. Subir el proyecto a la VPS

Puedes usar **Git** (recomendado) o **SFTP/SCP**.

### Opción A: Clonar con Git

En la VPS:

```bash
# Instalar git si no está
apt install -y git

# Crear directorio (ej. /var/www)
mkdir -p /var/www
cd /var/www
git clone git@github.com:EduardoGM1/CuidateAPP.git CuidateAPP
cd CuidateAPP
```

Si el repo es privado, configura SSH key o token en el servidor.

### Opción B: Subir por SCP desde tu PC (Windows PowerShell)

Desde tu máquina (en la carpeta del proyecto):

```powershell
scp -r "C:\Users\eduar\OneDrive\Escritorio\CuidateApp\CuidateAPP\api-clinica" root@TU_IP_VPS:/var/www/CuidateAPP/
scp -r "C:\Users\eduar\OneDrive\Escritorio\CuidateApp\CuidateAPP\cuidate-web" root@TU_IP_VPS:/var/www/CuidateAPP/
```

Ajusta la ruta local y la IP. Si solo subes código (sin `node_modules`), en la VPS tendrás que ejecutar `npm install` en cada proyecto.

### Opción C: Script de configuración total (todo en uno)

En una VPS **nueva**, puedes usar un solo script que crea carpetas, clona el repositorio y ejecuta todo el setup (Node, MySQL, Nginx, PM2, build de la web, etc.):

Repositorio: **git@github.com:EduardoGM1/CuidateAPP.git**

```bash
# Descargar el script
curl -sL https://raw.githubusercontent.com/EduardoGM1/CuidateAPP/main/deploy/configuracion-total-vps.sh -o configuracion-total-vps.sh

# Solo IP
export VPS_IP=123.45.67.89
export DB_PASSWORD='tu_password_seguro'
sudo bash configuracion-total-vps.sh

# O con dominio
export WEB_DOMAIN=tudominio.com
export API_DOMAIN=api.tudominio.com
export DB_PASSWORD='tu_password_seguro'
sudo bash configuracion-total-vps.sh
```

El script clona el repo en `/var/www/CuidateAPP` y luego ejecuta `deploy/setup-vps.sh`. Ver **deploy/README.md** para más detalles.

---

## 5. Backend (api-clinica)

En la VPS:

```bash
cd /var/www/CuidateAPP/api-clinica
npm install --production
```

Crear archivo `.env` (no subas el de tu PC con datos reales; créalo en el servidor):

```bash
cp .env.example .env
nano .env
```

Configura al menos:

- `DB_HOST=localhost`
- `DB_USER=api_user`
- `DB_PASSWORD=TU_PASSWORD_SEGURA`
- `DB_NAME=medical_db`
- `DB_PORT=3306`
- `PORT=3000`
- `NODE_ENV=production`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, etc. (generar con `node scripts/generate-keys.js` en local y copiar, o ejecutar ese script en la VPS)
- `ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com` (dominio de la web)
- `FRONTEND_URL=https://tudominio.com`
- Firebase y Resend si los usas

Generar claves en el servidor (opcional):

```bash
node scripts/generate-keys.js
# Copia las claves que imprima al .env
```

Ejecutar migraciones si tienes:

```bash
# Si usas scripts SQL en /migrations, ejecutarlos contra MySQL
mysql -u api_user -p medical_db < migrations/001_initial.sql
# (ajusta nombres de archivos según tu proyecto)
```

Iniciar la API con PM2 (y que arranque al reiniciar el servidor):

```bash
pm2 start index.js --name "api-clinica" -i 1
pm2 save
pm2 startup
```

Comprobar:

```bash
pm2 status
curl -s http://localhost:3000/api/health  # o el endpoint que tengas
```

---

## 6. Página web (cuidate-web)

La web es una SPA (React + Vite). Se hace **build** y los archivos estáticos se sirven con Nginx.

En la VPS:

```bash
cd /var/www/CuidateAPP/cuidate-web
npm install
```

Crear `.env.production` (o usar variables de entorno al hacer build):

```bash
echo 'VITE_API_BASE_URL=https://api.tudominio.com' > .env.production
```

Si la API va en el **mismo dominio** bajo `/api` (por ejemplo `https://tudominio.com/api`), puedes poner:

```bash
echo 'VITE_API_BASE_URL=' > .env.production
```

y en Nginx redirigir `/api` al backend (ver sección 7). En ese caso la web llamará a la misma URL actual (ej. `https://tudominio.com/api/...`).

Build:

```bash
npm run build
```

Se genera la carpeta `dist/`. Esa carpeta es la que Nginx servirá como sitio web.

---

## 7. Nginx: dominio, SSL y proxy

### 7.0 Sin dominio (solo IP)

Si aún no tienes dominio, usa un solo `server` que escuche en la IP (o en el puerto 80 por defecto). Sustituye `TU_IP_VPS` por la IP real:

**Un solo archivo** `/etc/nginx/sites-available/cuidate-app-ip`:

```nginx
server {
    listen 80 default_server;
    server_name _;   # acepta cualquier Host, incluye la IP

    root /var/www/CuidateAPP/cuidate-web/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Activa el sitio: `ln -sf /etc/nginx/sites-available/cuidate-app-ip /etc/nginx/sites-enabled/` y quita el default si hace falta: `rm -f /etc/nginx/sites-enabled/default`. Luego `nginx -t` y `systemctl reload nginx`.

- **Web:** `http://TU_IP_VPS`
- **API:** `http://TU_IP_VPS/api`

En **api-clinica** `.env`: `ALLOWED_ORIGINS=http://TU_IP_VPS` y `FRONTEND_URL=http://TU_IP_VPS`.  
En **cuidate-web** build con `VITE_API_BASE_URL=` (vacío) para que use la misma origen y las peticiones vayan a `/api`.

Cuando tengas dominio, añades otro `server` (o cambias este) con `server_name tudominio.com` y ejecutas Certbot.

---

Supón que tu dominio es `tudominio.com` y la API la quieres en `https://api.tudominio.com` (o en `https://tudominio.com/api`).

### 7.1 DNS (en Hostinger o donde tengas el dominio)

- **tudominio.com** → A → IP de la VPS  
- **www.tudominio.com** → A o CNAME → IP de la VPS  
- **api.tudominio.com** → A → IP de la VPS  

### 7.2 Ejemplo: API en subdominio (api.tudominio.com) y web en tudominio.com

Crear dos archivos en Nginx:

**Sitio web (tudominio.com):**

```bash
nano /etc/nginx/sites-available/cuidate-web
```

Contenido:

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    root /var/www/CuidateAPP/cuidate-web/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**API (api.tudominio.com):**

```bash
nano /etc/nginx/sites-available/api-clinica
```

```nginx
server {
    listen 80;
    server_name api.tudominio.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Activar sitios y comprobar:

```bash
ln -sf /etc/nginx/sites-available/cuidate-web /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/api-clinica /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 7.3 SSL con Let's Encrypt

```bash
certbot --nginx -d tudominio.com -d www.tudominio.com -d api.tudominio.com
```

Certbot modificará los `server` para escuchar en 443 y añadir el certificado. Reinicia o recarga Nginx si hace falta.

Después de SSL, en el `.env` del backend asegúrate de que `ALLOWED_ORIGINS` incluya `https://tudominio.com` y `https://api.tudominio.com` si la web hace peticiones a la API. Y en la web, `VITE_API_BASE_URL=https://api.tudominio.com`.

### 7.4 Alternativa: API en el mismo dominio (/api)

Si prefieres una sola entrada (por ejemplo solo `tudominio.com`):

- **tudominio.com** → sirve los archivos de `cuidate-web/dist`.
- **tudominio.com/api** → proxy a `http://127.0.0.1:3000`.

En Nginx (un solo `server`):

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    root /var/www/CuidateAPP/cuidate-web/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

En ese caso, en **cuidate-web** construye **sin** subdominio de API (misma origen):

- `.env.production`: `VITE_API_BASE_URL=` (vacío) para que las peticiones vayan a `/api` en el mismo dominio.

---

## 8. Resumen de comprobaciones

| Qué | Dónde | Cómo comprobar |
|-----|--------|-----------------|
| API activa | PM2 | `pm2 status` → api-clinica "online" |
| API responde | VPS | `curl -s http://localhost:3000/api/health` o login |
| MySQL | VPS | `mysql -u api_user -p -e "SELECT 1" medical_db` |
| Web estática | Nginx | `ls /var/www/CuidateAPP/cuidate-web/dist` y abrir https://tudominio.com |
| SSL | Navegador | https://tudominio.com y https://api.tudominio.com sin avisos |
| CORS | Navegador | Login en la web y que no falle por CORS |

---

## 9. Mantenimiento

- **Reiniciar API:** `pm2 restart api-clinica`
- **Ver logs API:** `pm2 logs api-clinica`
- **Actualizar código:** `git pull` en `/var/www/CuidateAPP`, luego `npm install` y `pm2 restart api-clinica` en api-clinica; en cuidate-web `npm run build` y Nginx ya sirve el nuevo `dist/`
- **Renovar SSL:** `certbot renew` (se puede automatizar con cron)
- **Backups MySQL:** script o `mysqldump` periódico a otro disco o servicio

Con esto tendrás el **backend** y la **página web** activos en tu VPS Hostinger KVM 2.
