# 🚀 Guía de Despliegue en Producción - API Clínica

## 📋 Pre-requisitos

### Sistema Operativo
- Ubuntu 20.04+ / CentOS 8+ / Windows Server 2019+
- Mínimo 4GB RAM, 2 CPU cores
- 50GB espacio en disco

### Software Requerido
```bash
# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MySQL 8.0+
sudo apt-get install mysql-server

# PM2 para gestión de procesos
npm install -g pm2

# Nginx (opcional, para proxy reverso)
sudo apt-get install nginx
```

## 🔧 Configuración del Servidor

### 1. Configurar MySQL con SSL
```sql
-- Crear usuario específico para la aplicación
CREATE USER 'medical_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT SELECT, INSERT, UPDATE, DELETE ON medical_db.* TO 'medical_user'@'localhost';

-- Habilitar SSL (en my.cnf)
[mysqld]
ssl-ca=ca-cert.pem
ssl-cert=server-cert.pem
ssl-key=server-key.pem
require_secure_transport=ON
```

### 2. Configurar Variables de Entorno
```bash
# Copiar y configurar variables de entorno
cp .env.example .env

# Editar con valores de producción
nano .env
```

**Variables críticas a configurar:**
```env
NODE_ENV=production
JWT_SECRET=tu_secreto_super_seguro_de_al_menos_32_caracteres
DB_PASSWORD=tu_password_seguro_de_bd
DB_SSL=true
ALLOWED_ORIGINS=https://tu-dominio.com
ENCRYPTION_KEY=tu_clave_de_encriptacion_32_caracteres
ALERT_EMAIL=admin@tu-dominio.com
SMTP_HOST=smtp.tu-proveedor.com
SMTP_USER=alerts@tu-dominio.com
SMTP_PASS=tu_password_smtp
```

### 3. Configurar Certificados SSL
```bash
# Crear directorio para certificados
sudo mkdir -p /etc/ssl/medical-api

# Copiar certificados (ejemplo con Let's Encrypt)
sudo cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem /etc/ssl/medical-api/cert.pem
sudo cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem /etc/ssl/medical-api/key.pem

# Configurar permisos
sudo chmod 600 /etc/ssl/medical-api/*
sudo chown medical-api:medical-api /etc/ssl/medical-api/*
```

## 🚀 Despliegue

### 1. Preparar la aplicación
```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/api-clinica.git
cd api-clinica

# Instalar dependencias
npm ci --production

# Ejecutar auditorías de seguridad
npm run production:check

# Crear directorios necesarios
mkdir -p logs backups
```

### 2. Configurar base de datos
```bash
# Ejecutar scripts de creación
mysql -u root -p < setup-database.sql
mysql -u root -p < tablas_completas.sql
mysql -u root -p < datos_prueba_movil.sql
mysql -u root -p < datos_historiales_medicos.sql
```

### 3. Iniciar con PM2
```bash
# Iniciar aplicación
npm run production:pm2

# Verificar estado
pm2 status

# Ver logs
pm2 logs medical-api

# Configurar inicio automático
pm2 startup
pm2 save
```

### 4. Configurar Nginx (Opcional)
```nginx
# /etc/nginx/sites-available/medical-api
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com;

    ssl_certificate /etc/ssl/medical-api/cert.pem;
    ssl_certificate_key /etc/ssl/medical-api/key.pem;
    
    # Configuraciones SSL seguras
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://localhost:3000;
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

## 🔒 Configuración de Seguridad

### 1. Firewall
```bash
# Ubuntu/Debian
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3306/tcp from localhost

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. Fail2Ban (Protección contra fuerza bruta)
```bash
sudo apt-get install fail2ban

# Configurar para Nginx
sudo nano /etc/fail2ban/jail.local
```

### 3. Permisos de archivos
```bash
# Configurar usuario específico
sudo useradd -r -s /bin/false medical-api
sudo chown -R medical-api:medical-api /path/to/api-clinica
sudo chmod 600 .env
sudo chmod 600 config/db.js
```

## 📊 Monitoreo

### 1. Health Checks
```bash
# Verificar estado de la API
curl https://tu-dominio.com/health

# Configurar monitoreo automático
crontab -e
# Añadir: */5 * * * * curl -f https://tu-dominio.com/health || echo "API Down" | mail -s "API Alert" admin@tu-dominio.com
```

### 2. Logs
```bash
# Ver logs en tiempo real
npm run logs:view
npm run logs:errors

# Configurar rotación de logs
sudo nano /etc/logrotate.d/medical-api
```

### 3. Backups automáticos
```bash
# Los backups se ejecutan automáticamente
# Verificar backups manuales
npm run backup:db

# Configurar backup externo (ejemplo con rsync)
crontab -e
# 0 2 * * * rsync -av /path/to/backups/ user@backup-server:/backups/medical-api/
```

## 🚨 Procedimientos de Emergencia

### 1. Rollback rápido
```bash
# Detener aplicación
pm2 stop medical-api

# Restaurar versión anterior
git checkout previous-stable-tag
npm ci --production
pm2 restart medical-api
```

### 2. Restaurar base de datos
```bash
# Desde backup encriptado
mysql -u medical_user -p medical_db < backups/medical_db_backup_YYYY-MM-DD.sql
```

### 3. Contactos de emergencia
- **Administrador del sistema**: admin@tu-dominio.com
- **Desarrollador principal**: dev@tu-dominio.com
- **Soporte técnico**: support@tu-dominio.com

## ✅ Checklist de Despliegue

- [ ] Variables de entorno configuradas
- [ ] Certificados SSL instalados
- [ ] Base de datos configurada con SSL
- [ ] Firewall configurado
- [ ] PM2 configurado con inicio automático
- [ ] Nginx configurado (si aplica)
- [ ] Backups automáticos funcionando
- [ ] Monitoreo configurado
- [ ] Alertas por email funcionando
- [ ] Health checks respondiendo
- [ ] Logs rotando correctamente
- [ ] Auditorías de seguridad pasando

## 📞 Soporte

Para soporte técnico, contactar:
- **Email**: support@tu-dominio.com
- **Documentación**: https://docs.tu-dominio.com
- **Issues**: https://github.com/tu-usuario/api-clinica/issues