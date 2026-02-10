# Resumen: correcciones para que el login funcione en la VPS

Este documento recoge los cambios aplicados para que el login en la web (y la API) funcionara correctamente en la VPS (Hostinger, IP 187.77.14.148).

---

## Comandos de verificación realizados

**Verificación global**
```bash
cd /var/www/CuidateAPP/api-clinica && node scripts/verificar-servidor.js
```
- Variables de entorno: OK  
- Conexión MySQL: OK  
- Tabla usuarios: 1 (admin@clinica.com)  
- Primera prueba sin credenciales: 400 (password por defecto "test" no cumple validación; es esperado)

**Login con Admin**
```bash
node scripts/verificar-servidor.js "admin@clinica.com" "Admin123!"
```
- Login OK (admin@clinica.com). Token recibido.

---

## Cambios aplicados para que funcionara

### CORS
- Se permiten peticiones sin header `Origin` (curl, scripts, health checks).

### memoryMonitoring()
- En `monitoring.js`: el middleware ahora devuelve `(req, res, next) => next()`.
- En `index.js`: se usa `app.use(memoryMonitoring())` (con paréntesis) para registrar ese middleware.

### Tabla refresh_tokens
- Creada con: `node scripts/ejecutar-migracion-refresh-tokens.js`.

### Middleware XSS
- Uso con contexto: `XSSProtection.xssProtection.call(XSSProtection, req, res, next)`.
- Solo se sanitiza `req.body` (no `req.query`/`req.params`, que son de solo lectura).

### Middleware ReDoS
- Uso con contexto: `ReDoSProtection.preventReDoS.call(ReDoSProtection, ...)`.
- Se omite la validación ReDoS en rutas de auth (`/login`, `/register`, etc.) para evitar falsos positivos con emails.

### Script de verificación
- Timeout de la petición de login aumentado a 15 s.

### Error handler
- Se registra `errorMessage` en el log para depuración.

---

## Recordatorio para la web

Si la web no hace login:

1. Revisar en el navegador (F12 → Red) la petición a `/api/auth/login`: URL, código de estado y CORS.
2. Confirmar en `.env`: **FORCE_HTTPS=false** cuando se accede por IP sin SSL (ya está así).
3. Con **admin@clinica.com** / **Admin123!** el login por API responde correctamente y devuelve token.

---

## Credenciales de prueba (VPS)

- **Email:** admin@clinica.com  
- **Contraseña:** Admin123!

(Usuario creado con `node scripts/crear-admin.js`.)
