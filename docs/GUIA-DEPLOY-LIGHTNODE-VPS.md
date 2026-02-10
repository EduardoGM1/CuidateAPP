# Guía de despliegue CuidateAPP en LightNode VPS

Esta guía explica cómo configurar y desplegar la API de CuidateAPP en un VPS de LightNode (Ciudad de México).

---

## 1. Crear la instancia en LightNode

### 1.1 Registro y plan

1. Entra en [lightnode.com](https://www.lightnode.com)
2. Regístrate con Google, GitHub o email
3. **Crear instancia** → **VPS** → **México (Ciudad de México)**
4. **Plan recomendado:** Start ($7.7–8.7/mes)
   - 1 vCPU, 2 GB RAM, 50 GB NVMe, 1 TB tráfico
5. **Sistema operativo:** Ubuntu 22.04 LTS
6. **Autenticación:** SSH Key (recomendado) o contraseña
7. Crea la instancia y espera 2–3 minutos

### 1.2 Datos que obtendrás

- **IP pública:** ej. `123.45.67.89`
- **Usuario:** `root` (por defecto)
- **Contraseña** o acceso por SSH

---

## 2. Conectar por SSH

### Windows (PowerShell o CMD)

```powershell
ssh root@TU_IP
```

### Con clave SSH

```powershell
ssh -i C:\ruta\a\tu-clave.pem root@TU_IP
```

---

## 3. Ejecutar el script de setup

### Opción A: Script automático (recomendado)

1. En tu PC local, clona el repo si no lo tienes:
   ```powershell
   git clone https://github.com/EduardoGM1/CuidateAPP.git
   cd CuidateAPP
   ```

2. Copia el script al servidor:
   ```powershell
   scp deploy/setup-vps.sh root@TU_IP:/root/
   ```

3. Conecta por SSH y ejecuta:
   ```bash
   chmod +x /root/setup-vps.sh
   sudo /root/setup-vps.sh
   ```

4. El script instalará: Node.js 20, MySQL, Nginx, PM2, Certbot.

### Opción B: Pasos manuales

Sigue la sección 4 siguiente.

---

## 4. Instalación manual (si no usas el script)

### 4.1 Actualizar sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 4.2 Instalar Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # debe mostrar v20.x
```

### 4.3 Instalar MySQL

```bash
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

**Configurar MySQL:**

```bash
sudo mysql
```

En el prompt de MySQL:

```sql
CREATE DATABASE medical_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cuidateapp'@'localhost' IDENTIFIED BY 'TU_PASSWORD_SEGURO';
GRANT ALL PRIVILEGES ON medical_db.* TO 'cuidateapp'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4.4 Instalar Nginx y Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 4.5 Instalar PM2 globalmente

```bash
sudo npm install -g pm2
```

---

## 5. Desplegar la aplicación

### 5.1 Clonar el repositorio

```bash
cd /var/www
sudo mkdir -p cuidateapp
sudo chown $USER:$USER cuidateapp
cd cuidateapp
git clone https://github.com/EduardoGM1/CuidateAPP.git .
```

### 5.2 Instalar dependencias de la API

```bash
cd /var/www/cuidateapp/api-clinica
npm install
```

### 5.3 Crear archivo .env

```bash
cp .env.example .env
nano .env
```

Configura al menos:

```env
NODE_ENV=production
PORT=3000

# Base de datos (usa el usuario y password que creaste)
DB_HOST=localhost
DB_USER=cuidateapp
DB_PASSWORD=TU_PASSWORD_SEGURO
DB_NAME=medical_db
DB_PORT=3306
DB_SSL=false

# Seguridad (genera con: node scripts/generate-keys.js)
JWT_SECRET=tu_jwt_secret_64_caracteres
JWT_REFRESH_SECRET=tu_refresh_secret_diferente
ENCRYPTION_KEY=tu_encryption_key_64_caracteres
CSRF_SECRET=tu_csrf_secret_32_caracteres
SESSION_SECRET=tu_session_secret_32_caracteres

# URLs (reemplaza con tu dominio o IP)
ALLOWED_ORIGINS=https://api.tudominio.com,https://tudominio.com,capacitor://localhost,http://localhost:8081
FRONTEND_URL=https://tudominio.com

# Firebase (obligatorio en producción)
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Resend (obligatorio en producción)
RESEND_API_KEY=re_xxx
```

Generar claves de seguridad:

```bash
cd /var/www/cuidateapp/api-clinica
node scripts/generate-keys.js
```

Copia las líneas que imprime y pégalas en `.env`.

### 5.4 Iniciar con PM2

```bash
cd /var/www/cuidateapp
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

(Si `pm2 startup` te da un comando para ejecutar, copia y ejecútalo.)

### 5.5 Crear usuarios iniciales (opcional)

Después del primer arranque, crea el administrador y usuarios de prueba:

```bash
cd /var/www/cuidateapp/api-clinica
node scripts/crear-3-usuarios.js
```

Esto crea:
- **Admin:** admin@clinica.com / Admin123!
- **Doctor:** doctor@clinica.com / Doctor123!
- **Paciente:** PIN 2020

> Cambia estas contraseñas en producción.

---

## 6. Configurar Nginx

### 6.1 Sin dominio (solo IP)

Edita el archivo de configuración:

```bash
sudo nano /etc/nginx/sites-available/cuidateapp
```

Pega (reemplaza `TU_IP` por tu IP real):

```nginx
server {
    listen 80;
    server_name TU_IP;
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activa el sitio:

```bash
sudo ln -sf /etc/nginx/sites-available/cuidateapp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Accede a `http://TU_IP/health` para verificar.

### 6.2 Con dominio y SSL (HTTPS)

1. Apunta tu dominio (ej. `api.tudominio.com`) a la IP del VPS (registro A).
2. Crea el archivo de sitio:

```bash
sudo nano /etc/nginx/sites-available/cuidateapp
```

```nginx
server {
    listen 80;
    server_name api.tudominio.com;
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

3. Activa y obtén SSL:

```bash
sudo ln -sf /etc/nginx/sites-available/cuidateapp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo certbot --nginx -d api.tudominio.com
```

Certbot configurará HTTPS automáticamente.

---

## 7. Firewall y seguridad

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Opcional: Fail2ban (protección contra fuerza bruta)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 8. Comandos útiles

| Acción | Comando |
|--------|---------|
| Ver logs de la API | `pm2 logs cuidateapp-api` |
| Reiniciar API | `pm2 restart cuidateapp-api` |
| Estado de servicios | `pm2 status` |
| Ver uso de recursos | `pm2 monit` |
| Logs de Nginx | `sudo tail -f /var/log/nginx/error.log` |

---

## 9. Configurar la app móvil

En `ClinicaMovil/src/config/apiUrlOverride.js` o `apiConfig.js`, usa la URL de tu API:

- Con IP: `http://TU_IP` o `https://TU_IP` si usas certificado
- Con dominio: `https://api.tudominio.com`

---

## 10. Checklist final

- [ ] MySQL creado y usuario configurado
- [ ] `.env` con todas las variables (JWT, Firebase, Resend, DB)
- [ ] PM2 ejecutando la API
- [ ] Nginx configurado y sirviendo
- [ ] Firewall (ufw) activo
- [ ] Prueba: `curl http://TU_IP/health` o `https://api.tudominio.com/health`

---

*Documento generado para CuidateAPP. Actualizar según cambios en el proyecto.*
