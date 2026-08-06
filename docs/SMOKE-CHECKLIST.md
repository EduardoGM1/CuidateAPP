# Checklist de no-regresión (smoke)

Tras cambios de API / móvil / web, verificar:

1. `GET /health` → 200 healthy
2. Login doctor/admin → `POST /api/auth/login`
3. Login paciente PIN → `POST /api/auth-unified/login-paciente`
4. Lista pacientes (web o móvil autenticado)
5. Chat: cargar conversación y enviar mensaje
6. Signos vitales: listar o registrar (flujo paciente)
7. Registro público no puede crear `Admin`/`Doctor` sin token Admin

Auth canónica:

- Pacientes: `/api/auth-unified/*`
- Doctor/Admin: `/api/auth/*`
- Legacy: `/api/paciente-auth/*` → 410
