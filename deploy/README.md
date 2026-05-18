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
| `nginx-security-headers.inc` | Cabeceras HTTP de seguridad (CSP, X-Frame-Options, COOP, etc.) para la SPA — incluir desde el `server` de la web |
| `nginx-security-headers-https.inc` | HSTS (solo en `listen 443 ssl`) — precarga opcional documentada |
| `nginx-security-headers-api.inc` | Cabeceras mínimas para el `server` que hace proxy solo a la API (modo dominio) |
| `nginx-hardening.conf` | `server_tokens off` y notas para ocultar la cabecera `Server` |
| `scripts/verificar-cabeceras-seguridad.sh` | Comprueba cabeceras con `curl` tras el deploy |
| `rebuild-cuidate-web.sh` | Reinstala deps y ejecuta `vite build` con `.env.production` (servidor ya desplegado) |
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

## Cabeceras de seguridad y HSTS

### Checklist post-auditoría

| Control | Estado en repo | Notas |
|---------|----------------|-------|
| HTTPS + HSTS | Plantilla `nginx-security-headers-https.inc` | Incluir solo en `443 ssl` tras Certbot |
| CSP / XSS | `style-src-elem` + `style-src-attr` | Bloquea `<style>` inyectados; React usa solo atributos `style=""` |
| Clickjacking | `X-Frame-Options` + `frame-ancestors` | Web SAMEORIGIN, API DENY |
| MIME sniffing | `nosniff` | Web y API |
| Referer | `Referrer-Policy` | |
| Permissions-Policy | SPA | APIs del navegador restringidas |
| COOP / CORP | SPA y API | `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` |
| COEP `require-corp` | No implementado | Rompería Google Fonts y recursos cross-origin |
| Ocultar versión Nginx | `nginx-hardening.conf` | `server_tokens off`; cabecera `Server` completa requiere `headers-more` |
| HSTS preload | Activo en plantilla | Cabecera con `preload`; registrar dominio en [hstspreload.org](https://hstspreload.org) |

### CSP (SPA)

La política vive en **`cuidate-web/security/csp-spa-policy.js`** y se replica en **`nginx-security-headers.inc`**:

- **`style-src-elem`**: hojas de estilo externas (`'self'`, Google Fonts).
- **`style-src-attr 'unsafe-inline'`**: necesario para `style={{}}` de React/Ant Design; más restrictivo que `style-src 'unsafe-inline'` global.
- **`script-src 'self'`** en producción (sin `unsafe-eval`).

### HSTS

No enviar HSTS en **HTTP:80**. Tras Certbot, en cada `server` con **`listen 443 ssl`**:

```nginx
include /var/www/CuidateAPP/deploy/nginx-security-headers-https.inc;
```

Para **precarga HSTS**: la plantilla ya envía `preload`. Tras desplegar, envía el dominio en [hstspreload.org](https://hstspreload.org) (lista global de Chrome, Firefox, Edge, Safari). La inclusión puede tardar semanas.

### Endurecimiento Nginx

En **`/etc/nginx/nginx.conf`**, dentro de `http { }`:

```nginx
include /var/www/CuidateAPP/deploy/nginx-hardening.conf;
```

### Verificación

```bash
bash deploy/scripts/verificar-cabeceras-seguridad.sh https://tudominio.com
```

Escaneos activos recomendados (fuera del repo): **OWASP ZAP** (XSS/SQLi), **nmap** (puertos expuestos; MySQL 3306 y SSH 22 no deben estar abiertos al mundo salvo política explícita).

La app en desarrollo (`npm run dev`) envía cabeceras equivalentes vía **`vite.security-headers.js`** (con `unsafe-eval` solo en dev por Vite HMR).

## Actualizar solo la web en un servidor que ya corre

1. `cd /var/www/CuidateAPP` (o tu `APP_ROOT`) y `git pull`.
2. Ejecutar **`sudo bash deploy/rebuild-cuidate-web.sh`** con el argumento adecuado:
   - **API en subdominio:** `sudo bash deploy/rebuild-cuidate-web.sh "https://api.tudominio.com"`
   - **Mismo host + Nginx `/api`:** `sudo bash deploy/rebuild-cuidate-web.sh -`
   - **Sin argumento:** no sobrescribe `.env.production` si ya existe; si no existe, copia `cuidate-web/.env.production.example`.
3. Recargar Nginx si hace falta: `sudo nginx -t && sudo systemctl reload nginx`.

Variables de build: ver **`cuidate-web/.env.production.example`**. Ese archivo puede versionarse; **`.env.production`** en el servidor no debe subirse a Git (está en `.gitignore`).

### Web SPA: API en producción, CORS y rendimiento

| Escenario | Build (`rebuild-cuidate-web.sh`) | Cliente HTTP |
|-----------|----------------------------------|--------------|
| **Mismo host** (Nginx hace `location /api` → Node, p. ej. `nginx-cuidateapp.conf`) | Argumento `-` → `VITE_API_BASE_URL` vacío | Peticiones a rutas relativas `/api/...` (mismo origen que la SPA). |
| **Web y API en hosts distintos** (p. ej. `nginx-cuidateapp-domain.conf`) | URL de la API, p. ej. `https://api.tudominio.com` | Axios usa esa base; en **api-clinica** `ALLOWED_ORIGINS` debe incluir el origen público de la web (`https://tudominio.com`, `https://www...`). |

La **CSP** de `deploy/nginx-security-headers.inc` usa `connect-src 'self' https: wss:`, compatible con API HTTPS en otro subdominio. El **proxy de Vite** (`vite.config.js`) solo aplica en desarrollo; el build de producción no lo incluye.

El **build de producción** aplica *code-splitting* por ruta (páginas bajo `MainLayout` en chunks lazy) y agrupa dependencias pesadas (`vendor-react`, `vendor-antd`, `vendor-exceljs`, etc.) para mejorar caché y tiempo de carga inicial.

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

## Dominio cuidateapp.com.mx

Para servir la app web con el dominio **cuidateapp.com.mx**:

1. **Nginx:** Usar `nginx-cuidateapp-domain.conf` sustituyendo `{{WEB_DOMAIN}}` por `cuidateapp.com.mx` y `{{API_DOMAIN}}` por tu subdominio de API (ej. `api.cuidateapp.com.mx`). O bien, en el `server` que ya usas por IP, añadir a `server_name`: `cuidateapp.com.mx www.cuidateapp.com.mx`.
2. **API (.env):** Incluir en `ALLOWED_ORIGINS` las URLs del dominio, por ejemplo:  
   `ALLOWED_ORIGINS=...,http://cuidateapp.com.mx,http://www.cuidateapp.com.mx`  
   (y con `https://` si usas SSL). Actualizar `FRONTEND_URL` (y `WEB_APP_ORIGIN` si se usa) a `http://cuidateapp.com.mx` (o `https://` si aplica). Reiniciar la API: `pm2 restart api-clinica`.
3. **DNS:** Dejar solo el registro **A** de `@` (y `www` si lo usas) apuntando a la IP del servidor (ej. `187.77.14.148`). Eliminar cualquier registro A que apunte a otra IP (ej. página aparcada en `84.32.84.32`) para evitar que a veces cargue el sitio equivocado.
