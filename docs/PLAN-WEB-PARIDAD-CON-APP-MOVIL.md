# Plan: Paridad Web con aplicación móvil (Cuidate)

Objetivo: que la **aplicación web** (cuidate-web) ofrezca los **mismos módulos y funciones** que la **aplicación móvil** (ClinicaMovil), en la medida en que sean aplicables a una SPA (sin push nativo, offline móvil, etc.).

---

## 1. Resumen ejecutivo

| Área | Móvil | Web actual | Estado |
|------|--------|------------|--------|
| **Auth (Doctor/Admin)** | Login, Recuperar contraseña, Reset | Login | ⚠ Parcial |
| **Auth (Paciente)** | Inicio sesión, Login PIN, Recuperar PIN | — | ❌ Web solo Doctor/Admin por ahora |
| **Dashboard** | Admin: métricas, gráficos, alertas, accesos. Doctor: mis pacientes, citas, notificaciones | Mensaje bienvenida + accesos rápidos | ⚠ Parcial |
| **Gestión** | Admin: pestañas Doctores/Pacientes, filtros, infinite scroll. Doctor: lista pacientes | Doctores list, Pacientes list, Citas list | ✅ Esencial cubierto |
| **Detalle Doctor** | Datos, editar, eliminar, asignar pacientes | Detalle, editar, eliminar | ✅ |
| **Detalle Paciente** | Datos, citas, signos vitales, diagnósticos, medicación, red apoyo, vacunas, comorbilidades, salud bucal, TB, complicaciones, sesiones educativas, expediente, gráficos, chat, agendar/completar cita | Datos básicos, comorbilidades, expediente HTML | ❌ Falta casi todo el detalle rico |
| **Alta/Edición Paciente** | AgregarPaciente, EditarPaciente | — | ❌ Falta |
| **Citas** | VerTodasCitas (admin), filtros, detalle | CitasList, filtros | ⚠ Falta detalle cita y acciones |
| **Catálogos Admin** | GestionMedicamentos, GestionModulos, GestionComorbilidades, GestionVacunas, GestionUsuarios | — | ❌ Falta |
| **Reportes** | ReportesAdmin/Doctor: estadísticas, PDF, heatmap comorbilidades, filtros módulo/periodo | Reportes: estadísticas HTML, expediente | ⚠ Parcial |
| **Auditoría** | HistorialAuditoria | AuditoriaList + detalle | ✅ |
| **Notificaciones** | HistorialNotificaciones (doctor) | — | ❌ Falta |
| **Gráficos evolución** | GraficosEvolucion (por paciente) | — | ❌ Falta |
| **Solicitudes reprogramación** | GestionSolicitudesReprogramacion (doctor) | — | ❌ Falta |
| **Chat** | ListaChats, ChatPaciente (doctor-paciente) | — | ❌ Falta |
| **Perfil / Config** | Perfil, Cambiar contraseña | — | ❌ Falta |
| **Paciente (rol)** | Inicio, Mis Citas, Mis Medicamentos, Signos vitales, Historial, Gráficos, Chat, Config, Cambiar PIN | — | ❌ Web actual solo Doctor/Admin |

---

## 2. Inventario por rol (móvil → web)

### 2.1 Autenticación (Doctor/Admin)

| Pantalla / función móvil | Web | Notas |
|--------------------------|-----|--------|
| PantallaInicioSesion (selector tipo login) | — | Opcional: web suele ir directo a login email |
| LoginDoctor (email/password) | ✅ Login | |
| ForgotPasswordScreen | ❌ | Recuperar contraseña |
| ResetPasswordScreen | ❌ | Restablecer con token |
| DiagnosticScreen | — | Solo desarrollo/diagnóstico |

### 2.2 Dashboard

| Pantalla móvil | Web | Falta |
|----------------|-----|--------|
| **DashboardAdmin** | Dashboard básico | Métricas (total pacientes, doctores, citas hoy, tasa asistencia), gráficos (pacientes nuevos, citas por estado, doctores activos), alertas/notificaciones, botones Agregar Doctor/Paciente, accesos a Gestión/Reportes/Auditoría |
| **DashboardDoctor** | — | Métricas propias, lista pacientes recientes, citas del día, notificaciones, accesos a lista pacientes y reportes |

### 2.3 Gestión (Admin: GestionAdmin / Doctor: ListaPacientesDoctor)

| Función móvil | Web | Falta |
|---------------|-----|--------|
| Pestaña Doctores (lista, filtros estado/módulo/orden, búsqueda, infinite scroll) | DoctoresList | Infinite scroll, realtime opcional |
| Pestaña Pacientes (lista, filtros estado/módulo/comorbilidad/orden, búsqueda, infinite scroll) | PacientesList | Filtro comorbilidad, infinite scroll |
| Navegación a DetalleDoctor / DetallePaciente | ✅ | |
| AgregarDoctor / EditarDoctor | ✅ | |
| AgregarPaciente / EditarPaciente | ❌ | CRUD paciente completo (alta con usuario/PIN o vinculación) |

### 2.4 Detalle Paciente (móvil: DetallePaciente.js + componentes)

| Sección / función móvil | Web | Falta |
|--------------------------|-----|--------|
| Datos personales (header, info general) | ✅ PacienteDetail | Mejorar con más campos si API los expone |
| Comorbilidades (lista, agregar/editar/eliminar) | Solo lectura | CRUD comorbilidades del paciente |
| Próxima cita / Citas (timeline, agendar, completar cita wizard) | — | Citas del paciente, agendar, completar consulta |
| Signos vitales (registro, historial, monitoreo continuo) | — | Listado + alta + gráficos básicos |
| Diagnósticos (lista, agregar, ver historial) | — | Listado + alta |
| Planes de medicación / Medicamentos | — | Listado + alta/edición planes |
| Red de apoyo (contactos) | — | Listado + CRUD |
| Esquema de vacunación | — | Listado + CRUD |
| Salud bucal | — | Listado + CRUD |
| Detección tuberculosis | — | Listado + CRUD |
| Detecciones complicaciones | — | Listado + CRUD |
| Sesiones educativas | — | Listado + CRUD |
| Expediente médico (PDF/HTML) | ✅ Botón “Ver expediente” | |
| Gráficos evolución (por paciente) | — | Pantalla gráficos desde detalle paciente |
| Asignar / ver doctores | — | Asignación doctor-paciente (Admin) |
| Chat con paciente | — | Chat doctor-paciente |

### 2.5 Citas

| Función móvil | Web | Falta |
|---------------|-----|--------|
| VerTodasCitas (listado, filtros, detalle) | CitasList | Detalle de cita, cambiar estado, completar/registrar consulta |
| Detalle cita (modal/pantalla): datos, signos vitales, diagnóstico, medicación, observaciones | — | Vista detalle + acciones |

### 2.6 Catálogos (solo Admin en móvil)

| Pantalla móvil | Web | Falta |
|----------------|-----|--------|
| GestionMedicamentos | — | CRUD medicamentos (catálogo) |
| GestionModulos | — | CRUD módulos |
| GestionComorbilidades | — | CRUD comorbilidades |
| GestionVacunas | — | CRUD vacunas (catálogo) |
| GestionUsuarios | — | Lista usuarios, crear/editar/desactivar (Admin) |

### 2.7 Reportes

| Función móvil | Web | Falta |
|---------------|-----|--------|
| ReportesAdmin: estadísticas, filtros módulo/periodo, gráficos, heatmap comorbilidades, exportar PDF | ReportesPage (estadísticas HTML, descarga) | Filtros (módulo, periodo), heatmap, más gráficos si API da datos |
| ReportesDoctor: estadísticas propias, exportar | Mismo endpoint estadísticas HTML | Filtros/periodo si aplica |
| Expediente por paciente | ✅ | |

### 2.8 Auditoría

| Función móvil | Web | Falta |
|---------------|-----|--------|
| HistorialAuditoria (listado, filtros, detalle) | ✅ AuditoriaList, AuditoriaDetail | Filtros fecha opcionales en UI |

### 2.9 Doctor específico

| Pantalla móvil | Web | Falta |
|----------------|-----|--------|
| HistorialNotificaciones | — | Listado notificaciones del doctor |
| HistorialMedicoDoctor | — | Historial médico (resumen consultas/procedimientos) |
| GestionSolicitudesReprogramacion | — | Listar y aprobar/rechazar solicitudes de reprogramación |
| ListaChats / ChatPaciente | — | Chat con pacientes |

### 2.10 Perfil y configuración

| Función móvil | Web | Falta |
|---------------|-----|--------|
| Perfil (ver datos, email, rol) | — | Página Perfil o sección en layout |
| Cambiar contraseña | — | Página o modal Cambiar contraseña |

### 2.11 Rol Paciente (móvil)

La web actual es **solo Doctor/Admin**. Si se desea paridad total:

| Pantalla móvil paciente | Web | Notas |
|--------------------------|-----|--------|
| InicioPaciente | — | Dashboard paciente |
| MisCitas | — | Citas del paciente |
| MisMedicamentos | — | Planes de medicación |
| RegistrarSignosVitales | — | Autoregistro signos vitales |
| HistorialMedico | — | Resumen historial |
| GraficosEvolucion | — | Gráficos propios |
| ChatDoctor | — | Chat con doctor |
| Configuracion | — | Config + Cambiar PIN |

---

## 3. Planificación por fases

### Fase A – Prioridad alta (base de paridad)

1. **Dashboard en paridad**
   - Consumir métricas (dashboard API): total pacientes, doctores, citas hoy, tasa asistencia.
   - Tarjetas y, si la API lo permite, gráficos sencillos (pacientes nuevos, citas por estado).
   - Alertas/notificaciones recientes (si hay endpoint).
   - Accesos rápidos: Pacientes, Citas, Doctores, Reportes, Auditoría (según rol).

2. **Alta y edición de pacientes**
   - AgregarPaciente: formulario (datos personales + usuario/PIN o vinculación según API).
   - EditarPaciente: formulario de edición.
   - Rutas y permisos solo Admin (y Doctor si el backend lo permite).

3. **Detalle de cita**
   - Vista detalle de una cita (datos, estado, paciente, doctor, motivo).
   - Acciones: cambiar estado (pendiente/atendida/cancelada, etc.) según API.

4. **Perfil y cambiar contraseña**
   - Página o sección Perfil (nombre, email, rol).
   - Cambiar contraseña (endpoint existente en API).

### Fase B – Prioridad media (detalle paciente rico)

5. **Detalle paciente ampliado**
   - Pestañas o secciones: Citas, Signos vitales, Diagnósticos, Medicación, Red de apoyo, Vacunación, Comorbilidades, etc.
   - Cada bloque: listado + “Ver todo” y, donde la API lo permita, “Agregar” (formularios modales o páginas hijas).
   - Reutilizar API de paciente médico (signos-vitales, diagnósticos, medicación, etc.).

6. **Citas desde detalle paciente**
   - Listado de citas del paciente.
   - Botón “Agendar cita” (formulario con doctor, fecha, motivo).
   - “Completar cita” (wizard simplificado: signos vitales, diagnóstico, medicación u observaciones) si la API lo soporta.

7. **Gráficos de evolución (por paciente)**
   - Pantalla o sección “Gráficos de evolución” desde detalle paciente (signos vitales en el tiempo, etc.).
   - Consumir datos de la API y representarlos en web (p. ej. Recharts).

### Fase C – Prioridad media (catálogos y reportes)

8. **Catálogos Admin**
   - Módulos: listado + alta/edición (y baja si aplica).
   - Comorbilidades: idem.
   - Medicamentos (catálogo): idem.
   - Vacunas (catálogo): idem.
   - Cada uno: página lista + formulario crear/editar, con validación y mensajes de error.

9. **Reportes con filtros**
   - Filtros por módulo y periodo en la página de reportes.
   - Si la API expone datos para heatmap de comorbilidades, sección o pantalla específica.
   - Mantener descarga de estadísticas y expediente ya implementados.

10. **GestionUsuarios (Admin)**
    - Listado de usuarios (email, rol, estado).
    - Crear usuario (ya hay createUsuario para Doctor; extender para otros roles si aplica).
    - Editar/desactivar usuario según API.

### Fase D – Prioridad menor (notificaciones, reprogramación, chat)

11. **Historial de notificaciones (Doctor)**
    - Página que consuma el endpoint de notificaciones del doctor.
    - Listado y, si aplica, marcar como leídas.

12. **Solicitudes de reprogramación (Doctor)**
    - Listado de solicitudes (pendientes, aprobadas, rechazadas).
    - Acciones aprobar/rechazar según API.

13. **Chat Doctor–Paciente**
    - Lista de conversaciones (por paciente).
    - Vista de conversación (mensajes, enviar texto).
    - Depende de que la API de mensajes/chat esté disponible y estable para web.

### Fase E – Rol Paciente en web (opcional)

14. **Área paciente en la web**
    - Login paciente (email/contraseña o flujo que use la API).
    - Dashboard paciente: resumen, próxima cita, accesos a Mis Citas, Mis Medicamentos, Signos vitales, Historial, Gráficos, Chat, Configuración.
    - Pantallas: Mis Citas, Mis Medicamentos, Registrar signos vitales, Historial médico, Gráficos, Chat con doctor, Configuración, Cambiar PIN.
    - Implementar solo si el producto requiere que los pacientes usen también la web.

---

## 4. No replicable o diferido en web

- **Login por PIN / recuperar PIN**: flujo típico de app móvil; en web suele usarse email/contraseña. Opcional más adelante.
- **Push notifications**: en web se puede usar Service Worker / Push API más adelante; no es paridad 1:1 con móvil.
- **Modo offline móvil**: específico de la app; en web se puede plantear PWA y caché en una fase posterior.
- **TTS / accesibilidad avanzada**: replicable en web con APIs del navegador si se prioriza.
- **DiagnosticScreen**: solo desarrollo; no necesario en web de producción.

---

## 5. Orden sugerido de implementación

1. **Fase A** (Dashboard, Alta/Edición paciente, Detalle cita, Perfil y cambio de contraseña).
2. **Fase B** (Detalle paciente ampliado, Citas desde paciente, Gráficos evolución).
3. **Fase C** (Catálogos, Reportes con filtros, GestionUsuarios).
4. **Fase D** (Notificaciones, Reprogramación, Chat) según prioridad del producto.
5. **Fase E** (Rol Paciente en web) solo si se confirma que la web debe atender también a pacientes.

Cada fase puede dividirse en sprints (p. ej. por pantalla o por grupo de endpoints) y revisar dependencias con la API (api-clinica) antes de desarrollar.

---

## 6. Referencias

- **Móvil:** `ClinicaMovil/src/screens/`, `ClinicaMovil/src/navigation/NavegacionProfesional.js`, `NavegacionPaciente.js`.
- **Web:** `cuidate-web/src/pages/`, `cuidate-web/src/router/index.jsx`.
- **API:** `api-clinica/routes/`, `api-clinica/controllers/`.
- **Planes previos:** `docs/PLAN-IMPLEMENTACION-WEB-DOCTORES-ADMIN.md`, `docs/PLAN-IMPLEMENTACION-WEB-FASE2-PACIENTES-CITAS.md`, `docs/PLAN-IMPLEMENTACION-WEB-FASE4-ADMIN.md`.
