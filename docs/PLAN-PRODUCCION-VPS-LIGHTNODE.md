# Información para producción en VPS (LightNode)

Documento de referencia para desplegar la API en una VPS. Resumen de lo analizado para el backend listo para producción.

---

## VPS objetivo (LightNode)

| Concepto        | Valor                    |
|-----------------|--------------------------|
| **Ubicación**   | Mexico City              |
| **Imagen**      | Ubuntu 22.04             |
| **Instancia**   | 1 vCPU, 2 GB RAM         |
| **Red**         | Pago por tráfico, BGP, 1000 GB |
| **IPv4**        | Habilitado               |
| **Almacenamiento** | 50 GB SSD            |
| **Costo**       | ~7.71 USD/mes            |

---

## Requisitos que cumple el backend

- Node.js 18+ (instalar en VPS).
- MySQL 8 (instalar en la misma VPS o externo).
- Proceso siempre activo (PM2).
- HTTPS vía Nginx + Let's Encrypt (no exponer Node directamente).
- Variables de entorno para producción (ver `api-clinica/utils/envValidator.js` y `.env.example`).
- Cron 24/7 (recordatorios medicamentos/citas) en el mismo proceso.
- WebSocket (Socket.io) en el mismo servidor.
- Carpeta `uploads/` persistente en disco.

---

## Variables de entorno obligatorias (producción)

- **DB:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **Seguridad:** `NODE_ENV=production`, `JWT_SECRET`, `ENCRYPTION_KEY`
- **Correo/alertas:** `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `ALERT_EMAIL`, `RESEND_API_KEY`
- **Firebase (push):** `FIREBASE_SERVICE_ACCOUNT_KEY`, `FIREBASE_PROJECT_ID`
- **CORS:** `ALLOWED_ORIGINS=https://tu-dominio.com` (incluir dominio de la web de doctores cuando exista)

---

## Pasos resumidos en la VPS

1. Instalar Node 18, MySQL 8, PM2, Nginx.
2. Clonar repo, `npm ci --production`, crear `logs`, `backups`, `uploads`.
3. Configurar `.env` con todas las variables anteriores.
4. Crear BD y usuario MySQL; ejecutar migraciones/scripts de tablas si aplica.
5. `npm run production:pm2`; `pm2 startup`; `pm2 save`.
6. Nginx como proxy reverso: HTTP→HTTPS, `proxy_pass http://localhost:3000`.
7. Certificados SSL (Certbot/Let's Encrypt) para el dominio.
8. UFW: permitir 22, 80, 443; no exponer 3000 ni 3306 al público.
9. Backups diarios de MySQL (cron + mysqldump).
10. Opcional: fail2ban, usuario `medical-api` para ejecutar la app.

---

## Documentos relacionados

- **Guía detallada:** `api-clinica/docs/DEPLOYMENT-GUIDE.md`
- **Análisis hosting:** `docs/ANALISIS-HOSTING-PRODUCCION.md`
- **Config deploy:** carpeta `deploy/` (ecosystem.config.cjs, nginx, setup-vps.sh)

---

*Actualizado a partir del análisis del backend y la VPS LightNode (Mexico City).*
