# Verificación de login y servidor

Cuando el login en la web no funciona (502, timeout, 401), sigue esta verificación.

---

## 1. Ejecutar el script de verificación en la VPS

En la VPS, con la API **corriendo** (pm2):

```bash
cd /var/www/CuidateAPP/api-clinica
node scripts/verificar-servidor.js
```

O probar login con un usuario y contraseña concretos:

```bash
node scripts/verificar-servidor.js "Admin@clinica.com" "TuPassword"
```

El script comprueba:

- Variables de entorno (.env)
- Conexión a MySQL
- Que exista la tabla `usuarios` y cuántos usuarios hay
- Listado de algunos usuarios (email, rol)
- Llamada a `POST /api/auth/login` y resultado

---

## 2. Comprobar manualmente en la VPS

### Base de datos

```bash
mysql -u api_user -p medical_db -e "SELECT id_usuario, email, rol, activo FROM usuarios LIMIT 5;"
```

- Si no hay filas: no hay usuarios; hay que crear al menos uno (Admin).
- Si hay usuarios: anota un email y prueba con esa contraseña (si la conoces).

### API en marcha

```bash
pm2 status
pm2 logs api-clinica --lines 20
```

- Estado debe ser `online`.
- Si hay muchos reinicios (↺), revisa los logs por errores al arrancar.

### Login directo (curl)

```bash
curl -v -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Admin@clinica.com","password":"TuPassword"}'
```

- **200 + token**: login correcto; el fallo puede ser Nginx, CORS o front.
- **301**: redirección a HTTPS; pon `FORCE_HTTPS=false` en `.env` y reinicia con `pm2 restart api-clinica`.
- **401**: email o contraseña incorrectos.
- **Connection refused**: la API no está escuchando en 3000; revisa pm2 y logs.

### Nginx

```bash
nginx -t
tail -20 /var/log/nginx/error.log
```

- Si ves `connect() failed (111: Connection refused)` al hacer login: la API no estaba disponible en ese momento (reinicios, crash).

---

## 3. Crear un usuario Admin si no hay ninguno

Si la tabla `usuarios` está vacía o no tienes credenciales, crea un Admin. Opciones:

### Opción A: Script crear-admin.js (recomendado)

```bash
cd /var/www/CuidateAPP/api-clinica
node scripts/crear-admin.js
```

Crea (o actualiza) un usuario Admin con email `admin@clinica.com` y contraseña `Admin123!` (o las que definas con variables de entorno `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

### Opción B: INSERT directo en MySQL (contraseña hasheada)

Generar hash de la contraseña en Node:

```bash
cd /var/www/CuidateAPP/api-clinica
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('Admin123!',10).then(h=>console.log(h));"
```

Luego en MySQL:

```sql
INSERT INTO usuarios (email, password_hash, rol, fecha_creacion, activo)
VALUES ('admin@clinica.com', 'PEGA_AQUI_EL_HASH', 'Admin', NOW(), 1);
```

### Opción C: Registro por API (si la ruta está abierta)

Si tienes un endpoint de registro (por ejemplo solo en desarrollo):

```bash
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinica.com","password":"Admin123!","rol":"Admin"}'
```

---

## 4. Checklist rápido

| Comprobación | Comando / acción |
|--------------|-------------------|
| DB conecta | `node scripts/verificar-servidor.js` (sección 1) |
| Hay usuarios | Misma salida del script o `mysql ... SELECT FROM usuarios` |
| API responde | `curl -X POST http://127.0.0.1:3000/api/auth/login ...` |
| No 301 en login | `FORCE_HTTPS=false` en `.env` + `pm2 restart api-clinica` |
| Nginx proxy OK | `tail /var/log/nginx/error.log` sin "connection refused" |
| Credenciales correctas | Usar email/password de un usuario que exista en `usuarios` |

Cuando el script de verificación y el curl devuelvan 200 con token, el problema restante suele ser la URL que usa la web (CORS, origen, o que la web llame a otra IP/puerto). Revisa en el navegador la petición que falla (URL exacta y código de estado).
