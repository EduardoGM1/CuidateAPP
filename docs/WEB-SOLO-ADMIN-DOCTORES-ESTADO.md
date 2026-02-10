# Web solo administrativa / doctores – Estado y pendientes

La aplicación web (cuidate-web) está orientada **únicamente a Admin y Doctor**. No hay rol Paciente en web.

---

## ✅ Ya implementado

### Autenticación
- Login (email/contraseña) Doctor/Admin
- Perfil (ver datos, email, rol)
- Cambiar contraseña

### Dashboard
- Admin: métricas (pacientes, doctores, citas hoy, tasa asistencia), alertas, accesos rápidos
- Doctor: métricas (citas hoy, pacientes, mensajes, próximas citas), alertas, accesos rápidos

### Gestión
- **Doctores:** lista, filtros (estado, módulo), detalle, crear, editar, eliminar (solo Admin)
- **Pacientes:** lista, filtros (estado), detalle con pestañas, crear, editar
- **Citas:** lista (filtros, filtro por paciente en URL), detalle, cambiar estado, agendar cita desde detalle paciente

### Detalle paciente (rico)
- Pestañas: Datos, Citas, Signos vitales, Diagnósticos, Medicación, Red de apoyo, Vacunación, Comorbilidades, Gráficos (evolución peso/glucosa)
- Botón “Ver expediente médico” (HTML)
- Botón “Agendar cita” (formulario doctor/fecha/motivo)

### Catálogos (Admin)
- Módulos, Comorbilidades, Medicamentos, Vacunas: listado + crear / editar / eliminar

### Reportes
- Reporte de estadísticas en HTML (Admin/Doctor) con filtros opcionales (módulo, fechas)
- Expediente médico por paciente (HTML)

### Auditoría (Admin)
- Lista con filtros, detalle por registro

### Usuarios (Admin)
- Lista de usuarios, editar (email, rol, activo), desactivar

### Doctor
- Notificaciones: historial, marcar leída, archivar
- Solicitudes de reprogramación: listar (filtro estado), aprobar / rechazar
- Chat: lista de conversaciones, vista de conversación con paciente, enviar mensaje

---

## ⚠ Pendiente / opcional (lo que podría faltar)

### 1. Recuperar contraseña y restablecer con token
- **Backend:** existen `POST /api/auth/forgot-password` y `POST /api/auth/reset-password`.
- **Web:** no hay aún:
  - Página “¿Olvidaste tu contraseña?” (ingreso de email).
  - Página “Restablecer contraseña” (recibe token por URL o email; formulario nueva + confirmar contraseña).

### 2. CRUD desde detalle paciente (agregar/editar en cada pestaña)
- Hoy en detalle paciente solo hay **listados** (signos vitales, diagnósticos, medicación, red de apoyo, vacunación, comorbilidades).
- El backend ya expone POST/PUT/DELETE para cada recurso en `/api/pacientes/:id/...`.
- **Falta en web:** formularios o modales para:
  - Agregar/editar signos vitales
  - Agregar/editar diagnósticos
  - Agregar/editar planes de medicación
  - Agregar/editar red de apoyo
  - Agregar/editar esquema de vacunación
  - Agregar/editar comorbilidades del paciente (vínculo paciente–comorbilidad)

### 3. Completar cita (wizard)
- **Backend:** `POST /api/citas/:id/completar-wizard` (signos vitales, diagnóstico, medicación, etc.).
- **Web:** solo está el cambio de estado de la cita; no el flujo “Completar consulta” paso a paso.
- Opcional si los doctores completan la consulta en la app móvil.

### 4. Asignar / desasignar doctores a paciente (Admin)
- **Backend:** `GET/POST/DELETE/PUT /api/pacientes/:id/doctores`.
- **Web:** no hay sección “Doctores asignados” en detalle paciente con agregar/quitar/cambiar doctor.

### 5. Mejoras menores
- **Pacientes:** filtro por comorbilidad en la lista (si la API lo soporta).
- **Auditoría:** filtros por rango de fechas en la UI.
- **Reportes:** heatmap de comorbilidades si el backend expone datos/endpoint.
- **Listas:** infinite scroll en Doctores/Pacientes/Citas (opcional).

---

## Resumen

| Área              | Estado   | Nota                                      |
|-------------------|----------|-------------------------------------------|
| Auth básico       | ✅       | Falta recuperar/reset contraseña          |
| Dashboard         | ✅       | —                                         |
| Gestión + CRUD    | ✅       | —                                         |
| Detalle paciente  | ✅ listas| Falta CRUD en pestañas y asignar doctores |
| Citas             | ✅       | Falta wizard “Completar consulta”         |
| Catálogos         | ✅       | —                                         |
| Reportes          | ✅       | Opcional: heatmap                         |
| Auditoría         | ✅       | Opcional: filtros fecha                   |
| Usuarios          | ✅       | —                                         |
| Notif / Repro / Chat | ✅    | —                                         |

Para una web **solo administrativa y de doctores**, el núcleo está cubierto. Lo más útil por implementar sería:

1. **Recuperar / restablecer contraseña** (flujos forgot + reset).
2. **Asignar doctores al paciente** (Admin) en detalle paciente.
3. **CRUD en detalle paciente** (al menos signos vitales y diagnósticos) si se quiere registrar todo desde web.
4. **Completar cita (wizard)** si se quiere cerrar la consulta desde web en lugar de desde la app.

Si indicas prioridad (por ejemplo: “solo recuperar contraseña” o “recuperar contraseña + asignar doctores + CRUD signos/diagnósticos”), se puede bajar a tareas concretas por pantalla/endpoint.
