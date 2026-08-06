# Autenticación de pacientes

## Flujo canónico

Los pacientes usan **`/api/auth-unified/*`** (PIN de 4 dígitos o biometría).

| Acción | Método y ruta |
|--------|----------------|
| Login PIN / biometría | `POST /api/auth-unified/login-paciente` |
| Setup PIN | `POST /api/auth-unified/setup-pin` |
| Setup biometría | `POST /api/auth-unified/setup-biometric` |
| Cambiar PIN (autenticado) | según rutas en `routes/unifiedAuth.js` |
| Reset PIN (Admin/Doctor) | `PUT /api/auth-unified/admin/reset-patient-pin` |

Doctor/Admin **no** usan este flujo: `POST /api/auth/login`.

## Legacy

`/api/paciente-auth/*` → **410 Gone** (tablas legacy eliminadas).

## Ejemplo login PIN

```http
POST /api/auth-unified/login-paciente
Content-Type: application/json

{
  "pin": "2020",
  "device_id": "android-device-id"
}
```

Respuesta incluye `token`, `refresh_token` y `user` (con `id_paciente`).

## Seguridad

Ver [SECURITY-AUTH.md](SECURITY-AUTH.md) (Bearer JWT, sin CSRF obligatorio).
