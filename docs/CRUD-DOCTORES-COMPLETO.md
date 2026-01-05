# 📋 CRUD Completo - Rol de Doctores

**Fecha:** 17 de noviembre de 2025  
**Objetivo:** Documentar todas las operaciones CRUD que los doctores pueden realizar en el sistema

---

## 📊 RESUMEN EJECUTIVO

### ✅ **Operaciones Permitidas para Doctores:**
- **CREATE (Crear):** ✅ Pacientes, Citas, Signos Vitales, Diagnósticos, Planes de Medicación, Red de Apoyo, Esquema de Vacunación, Comorbilidades
- **READ (Leer):** ✅ Todas las entidades relacionadas con sus pacientes asignados
- **UPDATE (Actualizar):** ✅ Pacientes, Citas, Signos Vitales, Diagnósticos, Planes de Medicación, Red de Apoyo, Esquema de Vacunación, Comorbilidades
- **DELETE (Eliminar):** ❌ **NO pueden eliminar** - Solo Admin puede eliminar

---

## 👥 PACIENTES

### ✅ **CREATE (Crear)**
- **Endpoint:** `POST /api/pacientes` o `POST /api/pacientes/completo`
- **Permisos:** `authorizeRoles('Admin', 'Doctor')`
- **Funcionalidad:**
  - ✅ Crear nuevos pacientes
  - ✅ Crear pacientes completos (con usuario, PIN, primera consulta)
  - ✅ Asignación automática al doctor que lo crea
- **Frontend:** `AgregarPaciente.js`
- **Restricción:** Solo ven pacientes asignados a ellos después de crearlos

### ✅ **READ (Leer)**
- **Endpoints:**
  - `GET /api/pacientes` - Lista de pacientes (solo asignados al doctor)
  - `GET /api/pacientes/:id` - Detalle de paciente específico
  - `GET /api/pacientes/:id/citas` - Citas del paciente
  - `GET /api/pacientes/:id/signos-vitales` - Signos vitales del paciente
  - `GET /api/pacientes/:id/diagnosticos` - Diagnósticos del paciente
  - `GET /api/pacientes/:id/medicamentos` - Medicamentos del paciente
  - `GET /api/pacientes/:id/resumen-medico` - Resumen médico completo
- **Permisos:** `authorizeRoles('Admin', 'Doctor')` + Verificación de asignación
- **Restricción:** Solo pueden ver pacientes asignados a ellos
- **Frontend:** `ListaPacientesDoctor.js`, `DetallePaciente.js`

### ✅ **UPDATE (Actualizar)**
- **Endpoint:** `PUT /api/pacientes/:id`
- **Permisos:** `authorizeRoles('Admin', 'Doctor')`
- **Funcionalidad:**
  - ✅ Actualizar datos básicos del paciente
  - ✅ Actualizar información de contacto
  - ✅ Actualizar datos demográficos
- **Frontend:** `EditarPaciente.js` (si está disponible para doctores)
- **Restricción:** Solo pueden actualizar pacientes asignados a ellos

### ❌ **DELETE (Eliminar)**
- **Endpoint:** `DELETE /api/pacientes/:id`
- **Permisos:** `authorizeRoles('Admin')` **SOLO ADMIN**
- **Restricción:** Los doctores **NO pueden eliminar** pacientes

---

## 📅 CITAS

### ✅ **CREATE (Crear)**
- **Endpoints:**
  - `POST /api/citas` - Crear cita simple
  - `POST /api/citas/primera-consulta` - Crear primera consulta completa
  - `POST /api/citas/consulta-completa` - Crear consulta completa (nueva o existente)
  - `POST /api/citas/:id/completar-wizard` - Completar cita con wizard paso a paso
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Crear citas para sus pacientes asignados
  - ✅ Crear primera consulta con datos médicos completos
  - ✅ Completar citas existentes con wizard
- **Frontend:** `CompletarCitaWizard.js`, `DetallePaciente.js`

### ✅ **READ (Leer)**
- **Endpoints:**
  - `GET /api/citas` - Lista todas las citas (solo del doctor)
  - `GET /api/citas/:id` - Detalle de cita específica
  - `GET /api/citas/paciente/:pacienteId` - Citas de un paciente
  - `GET /api/citas/doctor/:doctorId` - Citas del doctor
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Restricción:** Solo ven citas de sus pacientes asignados
- **Frontend:** `VerTodasCitas.js`, `DashboardDoctor.js`

### ✅ **UPDATE (Actualizar)**
- **Endpoints:**
  - `PUT /api/citas/:id` - Actualizar cita
  - `PUT /api/citas/:id/estado` - Actualizar estado de cita
  - `PUT /api/citas/:id/reprogramar` - Reprogramar cita
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Actualizar fecha, hora, motivo de cita
  - ✅ Cambiar estado de cita (pendiente, atendida, cancelada)
  - ✅ Reprogramar citas
- **Frontend:** `DetallePaciente.js`, `VerTodasCitas.js`

### ✅ **DELETE (Eliminar)**
- **Endpoint:** `DELETE /api/citas/:id`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Cancelar/eliminar citas
- **Restricción:** Solo pueden eliminar citas de sus pacientes asignados
- **Frontend:** `DetallePaciente.js`, `VerTodasCitas.js`

---

## 💊 SIGNOS VITALES

### ✅ **CREATE (Crear)**
- **Endpoint:** `POST /api/pacientes/:id/signos-vitales`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Registrar peso, talla, IMC
  - ✅ Registrar presión arterial
  - ✅ Registrar glucosa
  - ✅ Registrar colesterol, triglicéridos
  - ✅ Asociar a una cita (opcional)
- **Frontend:** `DetallePaciente.js` (modal Agregar Signos Vitales)
- **Restricción:** Solo para pacientes asignados

### ✅ **READ (Leer)**
- **Endpoint:** `GET /api/pacientes/:id/signos-vitales`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Ver historial completo de signos vitales
  - ✅ Ver signos vitales agrupados por fecha
  - ✅ Ver signos vitales de monitoreo continuo (sin cita)
- **Frontend:** `DetallePaciente.js` (card Signos Vitales)

### ✅ **UPDATE (Actualizar)**
- **Endpoint:** `PUT /api/pacientes/:id/signos-vitales/:signoId`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Corregir valores de signos vitales
  - ✅ Actualizar observaciones
- **Frontend:** `DetallePaciente.js` (modal Editar Signos Vitales)
- **Restricción:** Solo para pacientes asignados

### ❌ **DELETE (Eliminar)**
- **Endpoint:** `DELETE /api/pacientes/:id/signos-vitales/:signoId`
- **Permisos:** `authorizeRoles('Admin')` **SOLO ADMIN**
- **Restricción:** Los doctores **NO pueden eliminar** signos vitales

---

## 🩺 DIAGNÓSTICOS

### ✅ **CREATE (Crear)**
- **Endpoint:** `POST /api/pacientes/:id/diagnosticos`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Crear diagnósticos médicos
  - ✅ Asociar a una cita (opcional)
  - ✅ Agregar descripción del diagnóstico
- **Frontend:** `DetallePaciente.js` (modal Agregar Diagnóstico)
- **Restricción:** Solo para pacientes asignados

### ✅ **READ (Leer)**
- **Endpoint:** `GET /api/pacientes/:id/diagnosticos`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Ver historial completo de diagnósticos
  - ✅ Ver diagnósticos por cita
- **Frontend:** `DetallePaciente.js` (card Diagnósticos)

### ✅ **UPDATE (Actualizar)**
- **Endpoint:** `PUT /api/pacientes/:id/diagnosticos/:diagnosticoId`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Actualizar descripción del diagnóstico
  - ✅ Corregir información
- **Frontend:** `DetallePaciente.js` (modal Editar Diagnóstico)
- **Restricción:** Solo para pacientes asignados

### ❌ **DELETE (Eliminar)**
- **Endpoint:** `DELETE /api/pacientes/:id/diagnosticos/:diagnosticoId`
- **Permisos:** `authorizeRoles('Admin')` **SOLO ADMIN**
- **Restricción:** Los doctores **NO pueden eliminar** diagnósticos

---

## 💉 PLANES DE MEDICACIÓN

### ✅ **CREATE (Crear)**
- **Endpoint:** `POST /api/pacientes/:id/planes-medicacion`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Crear planes de medicación
  - ✅ Agregar múltiples medicamentos al plan
  - ✅ Definir dosis, frecuencia, duración
  - ✅ Asociar a una cita (opcional)
- **Frontend:** `DetallePaciente.js` (modal Agregar Medicamento)
- **Restricción:** Solo para pacientes asignados

### ✅ **READ (Leer)**
- **Endpoint:** `GET /api/pacientes/:id/medicamentos`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Ver planes de medicación activos
  - ✅ Ver historial de medicamentos
  - ✅ Ver detalles de cada medicamento (dosis, frecuencia)
- **Frontend:** `DetallePaciente.js` (card Medicamentos)

### ✅ **UPDATE (Actualizar)**
- **Endpoint:** `PUT /api/pacientes/:id/planes-medicacion/:planId`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Actualizar dosis de medicamentos
  - ✅ Modificar frecuencia
  - ✅ Cambiar fechas de inicio/fin
  - ✅ Agregar o quitar medicamentos del plan
- **Frontend:** `DetallePaciente.js` (modal Editar Medicamento)
- **Restricción:** Solo para pacientes asignados

### ❌ **DELETE (Eliminar)**
- **Endpoint:** `DELETE /api/pacientes/:id/planes-medicacion/:planId`
- **Permisos:** `authorizeRoles('Admin')` **SOLO ADMIN**
- **Restricción:** Los doctores **NO pueden eliminar** planes de medicación

---

## 👨‍👩‍👧‍👦 RED DE APOYO

### ✅ **CREATE (Crear)**
- **Endpoint:** `POST /api/pacientes/:id/red-apoyo`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Agregar contactos de red de apoyo
  - ✅ Registrar nombre, teléfono, email, dirección, parentesco
- **Frontend:** `DetallePaciente.js` (modal Agregar Red de Apoyo)
- **Restricción:** Solo para pacientes asignados

### ✅ **READ (Leer)**
- **Endpoint:** `GET /api/pacientes/:id/red-apoyo`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Ver lista completa de contactos de red de apoyo
- **Frontend:** `DetallePaciente.js` (card Red de Apoyo)

### ✅ **UPDATE (Actualizar)**
- **Endpoint:** `PUT /api/pacientes/:id/red-apoyo/:contactoId`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Actualizar información de contacto
  - ✅ Modificar datos de contacto
- **Frontend:** `DetallePaciente.js` (modal Editar Red de Apoyo)
- **Restricción:** Solo para pacientes asignados

### ❌ **DELETE (Eliminar)**
- **Endpoint:** `DELETE /api/pacientes/:id/red-apoyo/:contactoId`
- **Permisos:** `authorizeRoles('Admin')` **SOLO ADMIN**
- **Restricción:** Los doctores **NO pueden eliminar** contactos de red de apoyo

---

## 💉 ESQUEMA DE VACUNACIÓN

### ✅ **CREATE (Crear)**
- **Endpoint:** `POST /api/pacientes/:id/esquema-vacunacion`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Registrar vacunas aplicadas
  - ✅ Agregar fecha de aplicación, lote, lugar
- **Frontend:** `DetallePaciente.js` (modal Agregar Vacuna)
- **Restricción:** Solo para pacientes asignados

### ✅ **READ (Leer)**
- **Endpoint:** `GET /api/pacientes/:id/esquema-vacunacion`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Ver historial completo de vacunación
  - ✅ Ver vacunas pendientes
- **Frontend:** `DetallePaciente.js` (card Esquema de Vacunación)

### ✅ **UPDATE (Actualizar)**
- **Endpoint:** `PUT /api/pacientes/:id/esquema-vacunacion/:vacunaId`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Corregir fecha de aplicación
  - ✅ Actualizar información de lote
- **Frontend:** `DetallePaciente.js` (modal Editar Vacuna)
- **Restricción:** Solo para pacientes asignados

### ❌ **DELETE (Eliminar)**
- **Endpoint:** `DELETE /api/pacientes/:id/esquema-vacunacion/:vacunaId`
- **Permisos:** `authorizeRoles('Admin')` **SOLO ADMIN**
- **Restricción:** Los doctores **NO pueden eliminar** registros de vacunación

---

## 🏥 COMORBILIDADES

### ✅ **CREATE (Crear)**
- **Endpoint:** `POST /api/pacientes/:id/comorbilidades`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Asociar comorbilidades al paciente
  - ✅ Registrar años de diagnóstico
  - ✅ Agregar observaciones
- **Frontend:** `DetallePaciente.js` (modal Agregar Comorbilidad)
- **Restricción:** Solo para pacientes asignados

### ✅ **READ (Leer)**
- **Endpoint:** `GET /api/pacientes/:id` (incluye comorbilidades)
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Ver comorbilidades del paciente
  - ✅ Ver años de diagnóstico
- **Frontend:** `DetallePaciente.js` (card Comorbilidades)

### ✅ **UPDATE (Actualizar)**
- **Endpoint:** `PUT /api/pacientes/:id/comorbilidades/:comorbilidadId`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Actualizar años de diagnóstico
  - ✅ Modificar observaciones
- **Frontend:** `DetallePaciente.js` (modal Editar Comorbilidad)
- **Restricción:** Solo para pacientes asignados

### ❌ **DELETE (Eliminar)**
- **Endpoint:** `DELETE /api/pacientes/:id/comorbilidades/:comorbilidadId`
- **Permisos:** `authorizeRoles('Admin')` **SOLO ADMIN**
- **Restricción:** Los doctores **NO pueden eliminar** comorbilidades

---

## 🔄 ASIGNACIÓN DE PACIENTES

### ✅ **CREATE (Asignar)**
- **Endpoint:** `POST /api/pacientes/:id/doctores` o `POST /api/doctores/:id/assign-patient`
- **Permisos:** `authorizeRoles('Admin', 'Doctor')`
- **Funcionalidad:**
  - ✅ Asignar pacientes a doctores
  - ✅ Agregar observaciones de asignación
- **Frontend:** `DetallePaciente.js` (si está disponible)
- **Nota:** Los doctores pueden asignar pacientes a otros doctores (si tienen acceso)

### ✅ **READ (Ver Asignaciones)**
- **Endpoint:** `GET /api/pacientes/:id/doctores`
- **Permisos:** `authorizeRoles('Admin', 'Doctor')`
- **Funcionalidad:**
  - ✅ Ver doctores asignados a un paciente
- **Frontend:** `DetallePaciente.js`

### ✅ **UPDATE (Reasignar)**
- **Endpoint:** `PUT /api/pacientes/:id/doctores/:doctorIdAntiguo`
- **Permisos:** `authorizeRoles('Admin', 'Doctor')`
- **Funcionalidad:**
  - ✅ Reemplazar un doctor por otro
  - ✅ Reasignar pacientes
- **Frontend:** `DetallePaciente.js` (si está disponible)

### ✅ **DELETE (Desasignar)**
- **Endpoint:** `DELETE /api/pacientes/:id/doctores/:doctorId`
- **Permisos:** `authorizeRoles('Admin', 'Doctor')`
- **Funcionalidad:**
  - ✅ Desasignar un doctor de un paciente
- **Frontend:** `DetallePaciente.js` (si está disponible)

---

## 📋 SOLICITUDES DE REPROGRAMACIÓN

### ✅ **CREATE (Crear Solicitud)**
- **Endpoint:** `POST /api/citas/:id/solicitar-reprogramacion`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])` (también Paciente)
- **Funcionalidad:**
  - ✅ Solicitar reprogramación de cita
  - ✅ Agregar motivo de reprogramación
- **Frontend:** `GestionSolicitudesReprogramacion.js`

### ✅ **READ (Ver Solicitudes)**
- **Endpoints:**
  - `GET /api/citas/solicitudes-reprogramacion` - Solicitudes del doctor
  - `GET /api/citas/todas-solicitudes-reprogramacion` - Todas las solicitudes (Admin)
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Ver solicitudes pendientes
  - ✅ Ver historial de solicitudes
- **Frontend:** `GestionSolicitudesReprogramacion.js`, `DashboardDoctor.js`

### ✅ **UPDATE (Responder Solicitud)**
- **Endpoint:** `PUT /api/citas/solicitudes-reprogramacion/:id/responder`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Aprobar o rechazar solicitudes
  - ✅ Agregar observaciones
- **Frontend:** `GestionSolicitudesReprogramacion.js`

### ✅ **DELETE (Cancelar Solicitud)**
- **Endpoint:** `DELETE /api/citas/solicitudes-reprogramacion/:id`
- **Permisos:** `authorizeRoles(['Admin', 'Doctor'])`
- **Funcionalidad:**
  - ✅ Cancelar solicitudes de reprogramación
- **Frontend:** `GestionSolicitudesReprogramacion.js`

---

## ❌ OPERACIONES NO PERMITIDAS PARA DOCTORES

### 🚫 **Gestión de Doctores**
- ❌ Crear doctores
- ❌ Editar doctores
- ❌ Eliminar doctores
- ❌ Activar/desactivar doctores
- **Solo Admin puede gestionar doctores**

### 🚫 **Gestión de Catálogos**
- ❌ Gestionar módulos
- ❌ Gestionar medicamentos del sistema
- ❌ Gestionar comorbilidades del sistema
- ❌ Gestionar vacunas del sistema
- **Solo Admin puede gestionar catálogos**

### 🚫 **Eliminación de Datos Médicos**
- ❌ Eliminar signos vitales
- ❌ Eliminar diagnósticos
- ❌ Eliminar planes de medicación
- ❌ Eliminar red de apoyo
- ❌ Eliminar esquema de vacunación
- ❌ Eliminar comorbilidades
- ❌ Eliminar pacientes
- **Solo Admin puede eliminar datos**

### 🚫 **Acceso Global**
- ❌ Ver todos los pacientes (solo ven asignados)
- ❌ Ver historial de auditoría completo
- ❌ Gestionar configuración del sistema
- ❌ Ver reportes globales del sistema

---

## 📊 TABLA RESUMEN DE PERMISOS

| Entidad | CREATE | READ | UPDATE | DELETE |
|---------|--------|------|--------|--------|
| **Pacientes** | ✅ | ✅ (solo asignados) | ✅ (solo asignados) | ❌ Solo Admin |
| **Citas** | ✅ | ✅ (solo asignados) | ✅ (solo asignados) | ✅ (solo asignados) |
| **Signos Vitales** | ✅ | ✅ (solo asignados) | ✅ (solo asignados) | ❌ Solo Admin |
| **Diagnósticos** | ✅ | ✅ (solo asignados) | ✅ (solo asignados) | ❌ Solo Admin |
| **Planes Medicación** | ✅ | ✅ (solo asignados) | ✅ (solo asignados) | ❌ Solo Admin |
| **Red de Apoyo** | ✅ | ✅ (solo asignados) | ✅ (solo asignados) | ❌ Solo Admin |
| **Esquema Vacunación** | ✅ | ✅ (solo asignados) | ✅ (solo asignados) | ❌ Solo Admin |
| **Comorbilidades** | ✅ | ✅ (solo asignados) | ✅ (solo asignados) | ❌ Solo Admin |
| **Asignación Pacientes** | ✅ | ✅ | ✅ | ✅ |
| **Solicitudes Reprogramación** | ✅ | ✅ | ✅ | ✅ |
| **Doctores** | ❌ Solo Admin | ✅ (solo ver) | ❌ Solo Admin | ❌ Solo Admin |
| **Catálogos** | ❌ Solo Admin | ✅ (solo ver) | ❌ Solo Admin | ❌ Solo Admin |

---

## 🔒 RESTRICCIONES DE SEGURIDAD

### **Verificación de Asignación**
Todos los endpoints que acceden a datos de pacientes verifican que:
1. El doctor esté autenticado
2. El doctor tenga una asignación activa con el paciente
3. El paciente esté activo

### **Filtrado Automático**
- Los doctores solo ven datos de pacientes asignados a ellos
- El backend filtra automáticamente las consultas
- No pueden acceder a datos de pacientes no asignados

### **Logging y Auditoría**
- Todas las operaciones CRUD se registran en logs
- Se registra el rol del usuario que realiza la operación
- Se registra el ID del doctor y del paciente

---

## 📝 NOTAS IMPORTANTES

1. **Asignación Automática:** Cuando un doctor crea un paciente, se asigna automáticamente a ese doctor
2. **Pre-selección:** Cuando un doctor crea un paciente, se pre-selecciona automáticamente en la primera consulta
3. **Acceso Restringido:** Los doctores solo pueden ver y modificar datos de pacientes asignados a ellos
4. **Sin Eliminación:** Los doctores NO pueden eliminar datos médicos, solo Admin puede hacerlo
5. **Gestión Limitada:** Los doctores no pueden gestionar doctores ni catálogos del sistema

---

**Última actualización:** 17 de noviembre de 2025



