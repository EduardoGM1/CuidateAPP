# Plan Fase 4 – Admin, Doctores y Auditoría (Cuidate Web)

## Objetivos

- **Doctores (Admin):** listado, detalle, alta (crear usuario + doctor) y edición de doctores.
- **Auditoría (Admin):** listado con filtros y detalle de registros.
- **Módulos:** consumo de catálogo para formularios (dropdown) y listado opcional para Admin.
- Mismas reglas: buenas prácticas, reutilización (componentes, utils, API), seguridad (sanitización, validación IDs, rutas por rol).

## API de referencia (api-clinica)

| Recurso      | Método | Ruta | Rol    | Notas |
|-------------|--------|------|--------|-------|
| Doctores    | GET    | /api/doctores | Admin, Doctor | Doctor solo ve el suyo. Query: limit, offset, sort, estado, modulo |
| Doctores    | GET    | /api/doctores/:id | Admin, Doctor | Doctor solo :id propio |
| Doctores    | POST   | /api/doctores | Admin | body: nombre, apellido_paterno, apellido_materno, id_usuario, id_modulo?, ... |
| Doctores    | PUT    | /api/doctores/:id | Admin | body: email?, nombre?, apellidos?, id_modulo?, ... |
| Doctores    | DELETE | /api/doctores/:id | Admin | soft delete |
| Usuarios    | POST   | /api/auth/usuarios | Admin | body: email, password, rol ('Doctor') |
| Auditoría   | GET    | /api/admin/auditoria | Admin | Query: page, limit, offset, tipo_accion, fecha_desde, fecha_hasta, id_usuario, search |
| Auditoría   | GET    | /api/admin/auditoria/:id | Admin | Detalle |
| Módulos     | GET    | /api/modulos | Público | Listado para dropdowns |

## Estructura a implementar

- `api/doctores.js`, `api/auditoria.js`, `api/modulos.js`; ampliar `api/auth.js` con createUsuario.
- Componente `AdminRoute`: redirige a `/` si el usuario no es Admin.
- Páginas: `doctores/DoctoresList`, `doctores/DoctorDetail`, `doctores/AgregarDoctor`, `doctores/EditarDoctor`.
- Páginas: `auditoria/AuditoriaList`, `auditoria/AuditoriaDetail`.
- Router: rutas bajo protección Admin; Header muestra Doctores y Auditoría solo a Admin.

## Seguridad

- Validar IDs con `parsePositiveInt`.
- Sanitizar búsquedas y fechas (YYYY-MM-DD).
- No exponer errores crudos al usuario; mensaje amigable + Reintentar.
