# Fix: Datos del paciente no cargan tras login (citas, signos vitales, medicamentos, historial)

## Qué pasaba

El fallo estaba en la API, en cómo se interpretaba el token del paciente al autenticar.

### Login del paciente (PIN)

El JWT que devuelve el login unificado puede traer:

- `id` = `id_usuario` (cuando el paciente tiene usuario vinculado, como en el seed).
- `id_paciente` = `id_paciente` (siempre presente).

### Middleware de autenticación (`auth.js`)

Para tipo Paciente se hacía:

- `userId = decoded.id || decoded.id_paciente` … → podía quedar `id_usuario`.
- `Paciente.findByPk(userId)` → se buscaba en pacientes por `id_paciente` usando un valor que en realidad era `id_usuario`.

La tabla `pacientes` tiene PK `id_paciente`; no hay fila con `id_paciente = id_usuario`, así que la consulta devolvía `null` y se respondía **401** (“Token inválido o paciente inactivo”).

### Consecuencia

El paciente “iniciaba sesión” en el cliente (tenía token), pero en cada petición a `/api/pacientes/:id/citas`, `/api/pacientes/:id/signos-vitales`, etc., la API no reconocía al paciente y denegaba el acceso. Por eso no cargaban citas, signos vitales, medicamentos ni historial.

Los endpoints y la autorización (`authorizePatientAccess`) estaban bien; el fallo era solo en la **resolución del paciente a partir del token**.

---

## Cambios realizados

### 1. `api-clinica/middlewares/auth.js`

Para usuarios de tipo **Paciente** ya no se usa solo `decoded.id` para buscar en la tabla `Paciente`.

- Se usa el identificador de paciente del token:
  - `pacienteId = decoded.id_paciente != null ? decoded.id_paciente : userId`
- Se busca con:
  - `Paciente.findByPk(pacienteId)`

Así, tanto si el token trae `id` como `id_usuario` como `id_paciente`, la búsqueda usa siempre `id_paciente` y `req.user` queda con `id` e `id_paciente` correctos para todas las rutas de datos médicos.

### 2. `api-clinica/services/refreshTokenService.js`

Al renovar el token (refresh), el nuevo access token no incluía `id_paciente` y se perdía tras el refresh.

- Se añade al payload del nuevo token:
  - `id_paciente` cuando viene en el token que se renueva (`decoded.id_paciente`).
  - `user_type` cuando viene en el token (`decoded.user_type`).

Así, después de un refresh el access token sigue llevando `id_paciente` y el middleware sigue resolviendo bien al paciente.

### 3. Documentación

Este archivo (`api-clinica/docs/FIX-PACIENTE-DATOS-NO-CARGAN.md`) documenta el problema y la solución.

### 4. API

Reiniciar la API (por ejemplo con PM2) para aplicar los cambios.

---

## Cómo comprobarlo

1. Iniciar sesión como paciente (por ejemplo PIN 2020 en el entorno de prueba).
2. En web o app, abrir dashboard / citas / signos vitales / medicamentos / historial.
3. Deberían cargarse citas, signos vitales, medicamentos y resumen sin 401/403.

Si algo sigue fallando, conviene revisar en red (DevTools o logs) que las peticiones vayan a `/api/pacientes/{id_paciente}/...` con el mismo `id_paciente` que devuelve el login en `user.id_paciente` o `user.id`.
