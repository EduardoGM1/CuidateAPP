# Seguridad y autenticación (API)

## Modelo Bearer-first

La API usa **JWT en cabecera** `Authorization: Bearer <token>` (web y móvil).

- **No** se aplica CSRF global a mutaciones: sin cookie de sesión el riesgo CSRF clásico no aplica a los clientes actuales.
- `GET /api/csrf-token` existe por compatibilidad; **no es obligatorio**.

## Auth canónica

| Cliente | Endpoint |
|---------|----------|
| Doctor / Admin | `POST /api/auth/login` |
| Paciente (PIN / biometría) | `POST /api/auth-unified/login-paciente` |
| Legacy paciente | ` /api/paciente-auth/*` → **410 Gone** |
| Mobile wrapper | `POST /api/mobile/login` (compatibilidad) |

## Registro

- `POST /api/auth/register` **solo** crea rol `Paciente`.
- Crear `Doctor` / `Admin`: `POST /api/auth/usuarios` con token Admin.

## Validadores en desarrollo

Por defecto los validadores de auth están activos. Para Postman local:

```bash
NODE_ENV=development
RELAX_AUTH_VALIDATION=1
```

## Rutas `/api/test`

Solo se montan si `NODE_ENV !== 'production'`.
