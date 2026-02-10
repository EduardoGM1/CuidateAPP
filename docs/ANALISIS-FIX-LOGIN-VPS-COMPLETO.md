# Análisis completo: correcciones para login en VPS

Documento que recoge todos los errores encontrados y las soluciones aplicadas (en otro chat con acceso SSH directo a la VPS), para que el código en el repo quede alineado y sirva de referencia.

---

## 1. Contexto inicial

- **Objetivo:** Verificar la VPS, hacer git pull, ejecutar verificar-servidor.js, crear Admin si no había usuarios, probar login y revisar endpoints.
- **Entorno:** API en producción (PM2), base MySQL, un solo usuario Admin (admin@clinica.com / Admin123!).

---

## 2. Errores encontrados y causas

### 2.1 Script verificar-servidor.js – ReferenceError: rows is not defined

- **Dónde:** Línea ~88, al probar el login.
- **Causa:** La variable `rows` se declaraba dentro del `try` (consulta de usuarios) y se usaba después fuera de ese bloque en `rows?.[0]?.email`.
- **Solución:** Se creó `usuariosRows = []` antes del try, se asignó `usuariosRows = rows` dentro del try y se usó `usuariosRows?.[0]?.email` en la prueba de login.

### 2.2 La API no respondía (timeout en todas las peticiones)

- **Síntoma:** Tanto GET / como POST /api/auth/login hacían timeout; la conexión TCP se establecía pero no llegaba respuesta.
- **Causa:** El middleware `memoryMonitoring()` no devolvía una función que llamara a `next()`. Solo ejecutaba `setInterval(...)` y no pasaba la petición al siguiente middleware, por lo que la cadena se quedaba colgada.
- **Solución:**
  - En `middlewares/monitoring.js`: hacer que `memoryMonitoring()` devuelva `(req, res, next) => next()`.
  - En `index.js`: cambiar `app.use(memoryMonitoring)` por `app.use(memoryMonitoring())`.

### 2.3 Error 500 en login – tabla refresh_tokens inexistente

- **Síntoma:** Tras arreglar el timeout, el login devolvía 500.
- **Causa:** El servicio de refresh tokens intentaba hacer INSERT en la tabla `refresh_tokens`, que no existía.
- **Solución:** Ejecutar `node scripts/ejecutar-migracion-refresh-tokens.js` y crear la tabla según `migrations/create-refresh-tokens-table.sql`.

### 2.4 Error 500 – TypeError: Cannot read properties of undefined (reading 'sanitizeObject')

- **Síntoma:** Login seguía en 500 tras crear la tabla.
- **Causa:** Al usar `app.use(XSSProtection.xssProtection)`, Express no conserva el `this` de la clase. Dentro del middleware se llamaba a `this.sanitizeObject(...)` y `this` era undefined.
- **Solución:** En `index.js` registrar el middleware con contexto explícito:
  `app.use((req, res, next) => XSSProtection.xssProtection.call(XSSProtection, req, res, next))`.

### 2.5 Error 500 – Cannot set property query of #<IncomingMessage> which has only a getter

- **Causa:** El middleware XSS hacía `req.query = this.sanitizeObject(req.query)`. En Express, `req.query` puede ser de solo lectura (solo getter).
- **Solución:** En `middlewares/xssProtection.js` dejar de reasignar `req.query` y `req.params`. Solo sanitizar `req.body`.

### 2.6 Error 500 – Cannot read properties of undefined (reading 'getSafeRegexPatterns')

- **Causa:** Mismo problema de contexto: `app.use(ReDoSProtection.preventReDoS)` hace que dentro del middleware `this` sea undefined.
- **Solución:** En `index.js`: `app.use((req, res, next) => ReDoSProtection.preventReDoS.call(ReDoSProtection, req, res, next))`.

### 2.7 Error 400 en login – ReDoS: "Input contiene patrones peligrosos"

- **Causa:** El middleware ReDoS marcaba el email (p. ej. admin@clinica.com) como "patrón peligroso" (falso positivo).
- **Solución:** En `middlewares/reDoSProtection.js` omitir la validación ReDoS en rutas de autenticación: paths que contienen o terminan en login, register, forgot-password, reset-password, login-doctor-admin, login-paciente o auth-unified.

### 2.8 CORS – peticiones sin header Origin

- **Contexto:** En producción se exigía Origin; curl y scripts no lo envían.
- **Solución:** En `index.js` permitir peticiones sin header Origin (callback(null, true) cuando !origin).

### 2.9 Logs de error sin mensaje

- **Problema:** El manejador global de errores no registraba el mensaje del error.
- **Solución:** En `middlewares/errorHandler.js` añadir `errorMessage: err.message` al objeto que se loguea.

### 2.10 Script de verificación – timeout corto y body consumido dos veces

- **Problemas:** Timeout de 5 s a veces insuficiente; lectura doble del body (res.json() y luego res.text()) → "Body has already been read".
- **Solución:** En `scripts/verificar-servidor.js`: timeout a 15 s; leer el body una sola vez como texto y luego parsear con JSON.parse si aplica.

---

## 3. Archivos modificados (resumen)

| Archivo | Cambios |
|---------|--------|
| api-clinica/scripts/verificar-servidor.js | usuariosRows para uso fuera del try; timeout 15 s; body leído una sola vez |
| api-clinica/middlewares/monitoring.js | memoryMonitoring() devuelve (req, res, next) => next() |
| api-clinica/index.js | memoryMonitoring(); CORS permite sin Origin; XSS y ReDoS con .call(Clase, req, res, next) |
| api-clinica/middlewares/xssProtection.js | Solo sanitizar req.body; no reasignar req.query ni req.params |
| api-clinica/middlewares/reDoSProtection.js | Exclusión de rutas login/register/auth-unified en preventReDoS |
| api-clinica/middlewares/errorHandler.js | Loguear errorMessage: err.message |
| Base de datos | Tabla refresh_tokens creada con scripts/ejecutar-migracion-refresh-tokens.js |

---

## 4. Resumen de causas de los fallos

- Middleware que no llama a **next()** → peticiones colgadas (timeout).
- Uso de métodos de clase sin contexto (**this**) → TypeError al pasar middlewares a app.use().
- Reasignar propiedades de solo lectura de **req** (query/params) → TypeError.
- Tabla de BD inexistente → error en el flujo de refresh token y 500 en login.
- ReDoS demasiado estricto → falsos positivos en emails y bloqueo del login.
- CORS sin permitir peticiones sin Origin → problemas con curl y scripts.
- Lectura doble del body en fetch → "Body has already been read".

---

## 5. Estado final

- **Login:** POST /api/auth/login y POST /api/auth-unified/login-doctor-admin con admin@clinica.com / Admin123! responden 200 y devuelven token.
- **Verificación:** `node scripts/verificar-servidor.js` y con credenciales pasan correctamente.
- **Credenciales de prueba:** admin@clinica.com / Admin123!
