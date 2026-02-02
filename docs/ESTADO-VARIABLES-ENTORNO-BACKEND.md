# Estado de variables de entorno y configuración del backend (api-clinica)

## Resumen rápido

| Ámbito | ¿Listo para producción? | Notas |
|--------|-------------------------|--------|
| **Desarrollo** | Sí | Con .env mínimo (DB_*, JWT_SECRET); el resto tiene valores por defecto o es opcional. |
| **Producción** | Casi | Falta documentar/validar algunas variables y generar JWT_REFRESH_SECRET. |

---

## 1. Variables que el validador exige

El archivo `utils/envValidator.js` define qué variables son **obligatorias** al arrancar.

### Desarrollo

- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `JWT_SECRET`
- `DB_PASSWORD` y `ENCRYPTION_KEY` pueden estar vacíos en desarrollo (el validador no falla).

### Producción

- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `JWT_SECRET`
- `ENCRYPTION_KEY`
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `ALERT_EMAIL`
- `RESEND_API_KEY` (emails de recuperación y transaccionales)
- `FIREBASE_SERVICE_ACCOUNT_KEY`, `FIREBASE_PROJECT_ID` (notificaciones push)

Además se valida longitud mínima de `JWT_SECRET` y `ENCRYPTION_KEY` (según `config/constants.js`).

---

## 2. Variables usadas en el código pero no validadas

Estas variables **no** están en la lista obligatoria del validador, pero el código las usa. Si no las defines, el backend puede usar un valor por defecto o desactivar una función.

| Variable | Uso | Si falta |
|----------|-----|----------|
| `DB_PORT` | Conexión MySQL (config/db.js) | Sequelize usa 3306 por defecto. |
| `JWT_REFRESH_SECRET` | Refresh token (auth, mobileAuth, refreshTokenService) | Se usa `JWT_SECRET` como fallback. **En producción conviene definir una distinta.** |
| `CSRF_SECRET` | config/index.js | No validado; si algo lo usa sin fallback, puede fallar. |
| `SESSION_SECRET` | .env.example | No se encontró uso directo en el código revisado; dejarlo por si se usa en el futuro. |
| `RESEND_API_KEY` | Email transaccional (emailService) | En producción solo se muestra un warning; los emails con Resend no se envían. |
| `EMAIL_FROM` | Remitente con Resend | Por defecto `onboarding@resend.dev`. |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Push (Firebase Admin) | Push no se inicializa; solo warning. |
| `FIREBASE_PROJECT_ID` | Push | Igual que arriba. |
| `ALLOWED_ORIGINS` | CORS (index.js) | Por defecto lista localhost. En producción debes poner tu dominio. |
| `FRONTEND_URL` / `APP_URL` | Enlaces en emails (reset password, auth) | Por defecto `http://localhost:3000`. En producción debe ser la URL real del front/app. |
| `PORT` | Puerto del servidor | Por defecto 3000. |
| `NODE_ENV` | Entorno | Por defecto `development`. |
| `LOG_LEVEL` | Winston | Por defecto `info`. |
| `SSL_*` | HTTPS en el propio proceso | Opcional si usas proxy reverso con SSL. |

---

## 3. Lo que sí está bien cubierto

- **.env.example**: Incluye DB, JWT, ENCRYPTION_KEY, CSRF, SESSION, SMTP, Firebase, Resend, SSL, backups, límites, etc.
- **Script de claves**: `scripts/generate-keys.js` genera `JWT_SECRET`, `ENCRYPTION_KEY`, `CSRF_SECRET`.
- **Validador**: En producción exige DB, JWT_SECRET, ENCRYPTION_KEY y SMTP/ALERT_EMAIL; en desarrollo solo lo mínimo para correr.
- **Firebase push**: Si no hay credenciales, el servicio no rompe el arranque; solo no envía push.
- **Resend**: Si no hay `RESEND_API_KEY`, el servicio de email no rompe el arranque.

---

## 4. Gaps recomendados a cerrar para producción

1. **JWT_REFRESH_SECRET**  
   - Debe ser distinta de `JWT_SECRET`.  
   - Añadirla al generador (`generate-keys.js`) y a `.env.example` (y usarla en el hosting).

2. **FRONTEND_URL o APP_URL**  
   - Para enlaces de “restablecer contraseña” y similares.  
   - Añadir a `.env.example` y configurarla en producción (URL pública del front o de la app).

3. **ALLOWED_ORIGINS**  
   - En producción debe incluir la URL del frontend/app (ej. `https://app.tudominio.com`).  
   - Ya está en .env.example; solo asegurarse de configurarla en el servidor.

4. **SMTP y Resend**  
   - En producción son obligatorios: **SMTP** (alertas de seguridad a `ALERT_EMAIL`) y **Resend** (`RESEND_API_KEY` para emails de recuperación y transaccionales).

5. **Firebase (push)** y **Resend (email)**  
   - Son **obligatorios** en producción: el validador exige `RESEND_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_KEY` y `FIREBASE_PROJECT_ID`. Sin ellos el servidor no arranca en `NODE_ENV=production`.

---

## 5. Checklist mínimo para producción

- [ ] `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (y `DB_SSL` si aplica).
- [ ] `JWT_SECRET` (≥ longitud mínima definida en constants).
- [ ] `JWT_REFRESH_SECRET` (diferente de `JWT_SECRET`).
- [ ] `ENCRYPTION_KEY` (≥ longitud mínima).
- [ ] `CSRF_SECRET` (generado por generate-keys).
- [ ] SMTP_* + `ALERT_EMAIL` (alertas de seguridad).
- [ ] `RESEND_API_KEY` (emails de recuperación y transaccionales; obligatorio).
- [ ] `ALLOWED_ORIGINS` con la URL real del frontend/app.
- [ ] `FRONTEND_URL` o `APP_URL` con la URL pública del front/app.
- [ ] Push: `FIREBASE_SERVICE_ACCOUNT_KEY` y `FIREBASE_PROJECT_ID` (obligatorios).
- [ ] `NODE_ENV=production`, `PORT` si no es 3000.
- [ ] SSL: ya sea en el proceso (SSL_*) o en un proxy reverso.

---

## 6. Conclusión

- **Desarrollo**: El backend tiene las variables y la configuración necesarias para funcionar; lo que no está se puede dejar por defecto u opcional.
- **Producción**: El validador exige DB, JWT, ENCRYPTION_KEY, SMTP, ALERT_EMAIL, **RESEND_API_KEY** y **FIREBASE_SERVICE_ACCOUNT_KEY** + **FIREBASE_PROJECT_ID**. Además conviene configurar JWT_REFRESH_SECRET, FRONTEND_URL/APP_URL y ALLOWED_ORIGINS.

Con esos ajustes, el backend puede considerarse con “todas las variables y configuración necesarias” para el despliegue en producción.
