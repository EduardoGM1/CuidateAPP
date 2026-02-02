# Análisis de hosting para CuidateAPP (producción)

Este documento resume los requisitos técnicos del sistema (API + app móvil) y recomienda servicios de hosting que los cumplan.

---

## 1. Resumen del sistema

| Componente | Tecnología | Dónde se hospeda |
|------------|------------|------------------|
| **API Backend** | Node.js (ES modules), Express 5, puerto 3000 | **Servidor a contratar** |
| **Base de datos** | MySQL (mysql2, Sequelize), puerto 3306 | Mismo servidor o DB gestionada |
| **App móvil** | React Native (ClinicaMovil) | No se “hospeda”: se publica en Google Play / App Store (o Expo). La API sí se hospeda. |
| **WebSocket** | Socket.io (tiempo real) | Mismo proceso que la API |
| **Push** | Firebase Cloud Messaging | Solo configuración (env vars), no servidor propio |
| **Email** | Resend API / SMTP | Solo configuración (env vars) |

---

## 2. Requisitos técnicos de la API

### 2.1 Runtime y servidor

- **Node.js**: LTS (v18 o v20 recomendado).
- **Proceso largo**: La API debe estar siempre en ejecución (no solo “on request”).
- **Puerto**: 3000 (configurable con `PORT`).
- **HTTPS**: Obligatorio en producción (SSL/TLS). Puede ser:
  - Certificado en el mismo servidor, o
  - Proxy reverso (Nginx/Cloudflare) con SSL que termine en el puerto de la API.

### 2.2 Base de datos

- **Motor**: MySQL (o MariaDB compatible).
- **Puerto**: 3306.
- **Variables**: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- **Opcional**: `DB_SSL=true` y certificados para conexión cifrada.
- **Pool**: En producción el código usa hasta 20 conexiones; el plan debe permitir al menos eso (o menos si se ajusta el pool).
- **Persistencia**: Datos médicos, usuarios, citas, signos vitales, etc. Backups recomendados.

### 2.3 WebSocket (Socket.io)

- Mismo proceso que Express (se adjunta al `http.Server`).
- Transports: `websocket` y `polling`.
- Si en el futuro usas **varios procesos/instancias**, necesitarás **sticky sessions** o adaptador Redis para Socket.io (por ahora no es obligatorio).

### 2.4 Tareas programadas (cron)

- **node-cron** y **scheduledTasksService**:
  - Recordatorios de medicamentos: cada 5 minutos.
  - Recordatorios de citas: cada 5, 10, 15 y 60 minutos.
- **Zona horaria**: `America/Mexico_City`.
- Implicación: el proceso debe estar **siempre activo** (no un “serverless” que solo corre al recibir HTTP). Un **VPS**, **Railway**, **Render** (plan de pago), **Fly.io**, etc., son adecuados.

### 2.5 Almacenamiento de archivos

- **Carpeta `uploads/`**: audios (multer), posiblemente PDFs generados.
- **Requisito**: disco persistente (o almacenamiento tipo S3/Spaces y cambiar el código a subir ahí).
- Si el host reinicia y borra el disco: hay que usar **volumen persistente** o **objeto storage**.

### 2.6 Variables de entorno necesarias

- **DB**: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, opcional `DB_SSL`.
- **Seguridad**: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `CSRF_SECRET`, `SESSION_SECRET`.
- **Servidor**: `PORT`, `NODE_ENV=production`.
- **SSL** (si se usa en el mismo proceso): `SSL_ENABLED`, `SSL_CERT_PATH`, `SSL_KEY_PATH`.
- **Firebase (push)** (obligatorio): `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON), `FIREBASE_PROJECT_ID`.
- **Email**: `RESEND_API_KEY` (obligatorio para recuperación y transaccionales) y SMTP (`SMTP_HOST`, etc.) para alertas.
- **CORS**: `ALLOWED_ORIGINS` con el dominio de la app y, si aplica, del panel web.

### 2.7 Seguridad y cumplimiento

- Código preparado para **HIPAA_COMPLIANT**, **AUDIT_LOGGING**, **DATA_ENCRYPTION** (env).
- Datos sensibles encriptados en BD.
- En México aplican consideraciones de privacidad (ej. NOM-024). El hosting debe permitir:
  - HTTPS.
  - Variables de entorno seguras (sin exponer secretos en el front).
  - Backups y, si se requiere, acuerdos de confidencialidad / ubicación de datos.

### 2.8 Tráfico y recursos estimados

- **Escenario**: clínica pequeña/mediana (decenas de usuarios activos, no miles simultáneos).
- **CPU/RAM sugerido para empezar**: 1 vCPU, 1–2 GB RAM (ajustable según uso real).
- **Disco**: 10–20 GB (SO + app + uploads + logs) o más si se guardan muchos archivos.
- **Ancho de banda**: según uso; la mayoría de planes básicos incluyen suficiente para este tamaño.

---

## 3. Opciones de hosting que cumplen los requisitos

Todas asumen: **Node.js**, **proceso siempre activo**, **HTTPS** (directo o por proxy) y **MySQL** (incluido o externo).

### 3.1 Railway (recomendado para empezar)

- **Qué ofrece**: Despliegue desde Git, Node.js, MySQL como add-on, variables de entorno, volumen persistente para `uploads`, cron dentro del mismo proceso.
- **WebSocket**: Soportado.
- **Ventajas**: Configuración rápida, buena relación facilidad/precio, México/LATAM suelen tener buena latencia a sus servidores (USA).
- **Consideraciones**: MySQL y volumen se facturan aparte; revisar límites del plan.
- **Precio orientativo**: desde ~5–10 USD/mes (plan de pago según uso).
- **Web**: [railway.app](https://railway.app)

### 3.2 Render

- **Qué ofrece**: Web Service para Node, MySQL (o DB externa), disco persistente, env vars, SSL incluido.
- **WebSocket**: Soportado.
- **Ventajas**: Plan gratuito “duerme” el servicio; plan de pago mantiene la API y el cron activos.
- **Consideraciones**: En plan gratuito no sirve para cron 24/7; para producción usar plan de pago.
- **Precio orientativo**: desde ~7 USD/mes (Web Service) + DB si la contratas en Render.
- **Web**: [render.com](https://render.com)

### 3.3 Fly.io

- **Qué ofrece**: Máquinas (VMs) donde corres Node, MySQL en el mismo Fly o DB externa (p. ej. PlanetScale, Aiven), volúmenes persistentes.
- **WebSocket**: Soportado.
- **Ventajas**: Buena opción si quieres más control, múltiples regiones, buena documentación.
- **Consideraciones**: Configuración más “manual” (Dockerfile o imagen Node).
- **Precio orientativo**: desde ~5 USD/mes según máquina y volumen.
- **Web**: [fly.io](https://fly.io)

### 3.4 VPS (DigitalOcean, Vultr, Linode, Contabo, etc.)

- **Qué ofrece**: Servidor Linux (Ubuntu) donde instalas Node, MySQL, Nginx, PM2, Certbot (Let’s Encrypt).
- **Ventajas**: Control total, un solo servidor puede albergar API + MySQL + cron + uploads; útil si ya tienes experiencia en servidores.
- **Consideraciones**: Tú mantienes actualizaciones, backups, firewall, SSL y monitoreo.
- **Requisitos mínimos**: 1 vCPU, 1–2 GB RAM, 20 GB SSD.
- **Precio orientativo**: 5–12 USD/mes según proveedor y región.
- **Recomendación**: Si eliges VPS, usar **PM2** para mantener la API viva (`npm run production:pm2` en el proyecto).

### 3.5 AWS / Google Cloud / Azure

- **Qué ofrecen**: EC2 / App Engine / App Service + RDS o Cloud SQL o Azure Database for MySQL + S3/Storage para archivos.
- **Ventajas**: Escalabilidad, opciones de cumplimiento (ej. HIPAA en AWS/GCP con configuración adecuada), backups gestionados.
- **Consideraciones**: Más complejidad y costo; recomendable cuando el proyecto crezca o se exija cumplimiento estricto.
- **Precio orientativo**: desde ~20–50 USD/mes en configuraciones mínimas.

---

## 4. Comparativa rápida

| Criterio              | Railway | Render | Fly.io | VPS   | AWS/GCP/Azure |
|-----------------------|--------|--------|--------|-------|----------------|
| Facilidad             | Alta   | Alta   | Media  | Baja  | Baja           |
| Node + MySQL          | Sí     | Sí     | Sí*    | Sí    | Sí             |
| WebSocket             | Sí     | Sí     | Sí     | Sí    | Sí             |
| Cron 24/7             | Sí     | Sí (pago) | Sí  | Sí    | Sí             |
| Disco/upload persist. | Sí     | Sí     | Sí     | Sí    | Sí (S3/storage)|
| HTTPS                 | Sí     | Sí     | Sí     | Tú    | Sí             |
| Coste inicial bajo     | Sí     | Sí     | Sí     | Sí    | No             |
| Escalabilidad futura   | Sí     | Sí     | Sí     | Limitada | Muy alta    |

\* MySQL en Fly o externo (PlanetScale, Aiven, etc.).

---

## 5. Recomendación según perfil

- **Quieres desplegar rápido y no tocar servidor**: **Railway** o **Render** (plan de pago).
- **Quieres control total y tienes experiencia en Linux**: **VPS** (DigitalOcean, Vultr, Linode) + Nginx + PM2 + Let’s Encrypt.
- **Piensas en escalar mucho o cumplimiento HIPAA estricto**: **AWS** o **Google Cloud** (con RDS/Cloud SQL y buena configuración de seguridad).

---

## 6. Checklist antes de contratar

- [ ] El plan permite **Node.js** (v18 o v20).
- [ ] Hay **MySQL** (incluido o como add-on / DB gestionada).
- [ ] El proceso puede estar **siempre activo** (no solo serverless por request).
- [ ] Soporte para **WebSocket** (Socket.io).
- [ ] **HTTPS** (certificado incluido o posibilidad de poner Nginx + Let’s Encrypt).
- [ ] **Variables de entorno** para secretos (JWT, ENCRYPTION_KEY, Firebase, DB, etc.).
- [ ] **Disco o volumen persistente** para `uploads/` (o plan para migrar a S3/Spaces).
- [ ] **Zona horaria** configurable (para cron `America/Mexico_City`) o que use UTC y el código ya compense.
- [ ] **Backups** de base de datos (incluidos o que puedas configurar).
- [ ] **Región**: preferible USA o LATAM para menor latencia desde México.

---

## 7. App móvil (ClinicaMovil)

La app **no se contrata en un hosting web**. Opciones:

- **Expo (EAS Build)**: compilar y publicar en Google Play / App Store; el backend sigue siendo la API que contrates arriba.
- **Build local o CI**: generar APK/IPA y subirlos a las tiendas.
- En producción, la app debe apuntar a la **URL de la API** (ej. `https://api.tudominio.com`) configurada en `apiUrlOverride.js` o en la config de build.

---

*Documento generado a partir del análisis del repositorio CuidateAPP (api-clinica + ClinicaMovil). Actualizar según cambios en stack o requisitos legales.*
