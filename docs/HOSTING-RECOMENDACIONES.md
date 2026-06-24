# Hosting recomendado para CuidateAPP

Resumen de qué necesitas contratar para que **API + base de datos + app móvil** funcionen en producción.

---

## Qué hay que alojar

| Componente | Necesita hosting | Notas |
|------------|------------------|--------|
| **api-clinica** (Node.js) | Sí | API REST, WebSockets, cron jobs, archivos en `uploads/` |
| **MySQL** | Sí | Base de datos de la API |
| **ClinicaMovil** (app) | No | Se instala en el móvil; solo apuntas la URL de la API |
| **Firebase** (push) | No | Servicio en la nube, solo configuras proyecto |
| **Resend** (email) | No | Servicio en la nube, solo API key |

---

## Opción 1: Todo en uno (recomendada para empezar)

Un solo proveedor para API + base de datos. Menos configuración.

### Render
- **Qué contratar:** **Web Service** (Node) + **PostgreSQL** o MySQL (add-on; revisar si tienen MySQL).
- **Ventajas:** SSL automático, cron jobs con “Background Workers” si hace falta.
- **Precio orientativo:** desde ~7 USD/mes.
- **Web:** https://render.com

### DigitalOcean App Platform
- **Qué contratar:** **App** (Node.js) + **Database** (MySQL managed).
- **Ventajas:** Muy estable, MySQL gestionado, SSL, fácil escalar.
- **Precio orientativo:** ~12–25 USD/mes (app + DB).
- **Web:** https://www.digitalocean.com/products/app-platform

---

## Opción 2: VPS (más control, tú administras todo)

Un servidor (VPS) donde instalas Node.js, MySQL, Nginx y certificados SSL.

### DigitalOcean Droplet
- **Qué contratar:** Droplet 4 GB RAM (o más), Ubuntu. Instalar Node, MySQL, Nginx, PM2.
- **Precio orientativo:** ~24 USD/mes (4 GB).
- **Web:** https://www.digitalocean.com/products/droplets

### Linode / Akamai
- **Qué contratar:** VPS 4 GB, Ubuntu. Misma idea que DigitalOcean.
- **Precio orientativo:** ~24 USD/mes.
- **Web:** https://www.linode.com

### Vultr
- **Qué contratar:** VPS 4 GB, Ubuntu.
- **Precio orientativo:** ~24 USD/mes.
- **Web:** https://www.vultr.com

Con VPS usas la guía que ya tienes en `api-clinica/docs/DEPLOYMENT-GUIDE.md` (Nginx, PM2, MySQL, SSL).

---

## Opción 3: API en PaaS + base de datos gestionada

Separar “donde corre la API” y “donde está la base de datos”.

- **API:** Render o Fly.io (Node.js).
- **Base de datos:** 
  - **PlanetScale** (MySQL compatible) — https://planetscale.com  
  - **DigitalOcean Managed MySQL** — https://www.digitalocean.com/products/managed-databases-mysql  
  - **AWS RDS (MySQL)** — si ya usas AWS.

Ventaja: backups, parches y alta disponibilidad los gestiona el proveedor de la BD.

---

## Requisitos técnicos que debe cumplir el hosting de la API

- **Node.js 18+**
- **Proceso persistente** (no solo serverless por request), porque tienes:
  - WebSockets (Socket.IO)
  - Cron (node-cron) para recordatorios y tareas programadas
- **SSL/HTTPS** (dominio con certificado)
- **Puerto 3000** (o el que uses) accesible; si usas Nginx, proxy a ese puerto
- **Almacenamiento** para `uploads/` (o migrar después a S3/Spaces si crece)

---

## Servicios que no son “hosting” pero sí debes tener configurados

| Servicio | Para qué | Dónde |
|----------|----------|--------|
| **Dominio** | URL de la API (ej. `api.tuclinica.com`) | Registrador (Namecheap, Google Domains, etc.) o el mismo proveedor (DO, Cloudflare) |
| **Firebase** | Push a la app | Proyecto en https://console.firebase.google.com (gratis hasta cierto uso) |
| **Resend** | Emails (alertas, restablecer contraseña) | https://resend.com (plan gratuito limitado) |

---

## Recomendación práctica

- **Para lanzar rápido y con poco mantenimiento:**  
  **Render** (API + MySQL en el mismo proyecto) o **DigitalOcean App Platform** (App + MySQL managed).

- **Si quieres control total y ya sabes administrar servidores:**  
  **DigitalOcean Droplet** (o Linode/Vultr) + seguir `api-clinica/docs/DEPLOYMENT-GUIDE.md`.

- **App móvil:** No contratas hosting para ella. En producción configuras en la app la URL base de la API (ej. `https://api.tuclinica.com`) y opcionalmente un entorno de build (ej. `API_URL=https://api.tuclinica.com`).

---

## Checklist mínimo para producción

- [ ] Hosting para API (Render / DO App Platform / VPS).
- [ ] Base de datos MySQL (incluida en el mismo plan o gestionada).
- [ ] Dominio y SSL para la API (ej. `https://api.tuclinica.com`).
- [ ] Variables de entorno de producción (`.env` o panel del proveedor): `JWT_SECRET`, `DB_*`, `ENCRYPTION_KEY`, etc.
- [ ] Firebase configurado (push) y Resend (email).
- [ ] En la app móvil, `API_URL` o equivalente apuntando a `https://api.tuclinica.com` (o tu URL real).
