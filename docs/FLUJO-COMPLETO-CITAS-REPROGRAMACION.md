# 📋 Flujo Completo de Citas y Reprogramación

**Documentación técnica del sistema de gestión de citas médicas**

---

## 📊 Índice

1. [Estados de las Citas](#estados-de-las-citas)
2. [Flujo de Creación de Citas](#flujo-de-creación-de-citas)
3. [Flujo de Reprogramación](#flujo-de-reprogramación)
4. [Notificaciones](#notificaciones)
5. [Diagramas de Flujo](#diagramas-de-flujo)

---

## 📌 Estados de las Citas

### Estados Disponibles

```javascript
ENUM: 'pendiente', 'atendida', 'no_asistida', 'reprogramada', 'cancelada'
```

| Estado | Descripción | Cuándo se Asigna |
|--------|-------------|------------------|
| **pendiente** | Cita creada, esperando atención | Por defecto al crear |
| **atendida** | Cita completada exitosamente | Cuando el doctor marca como atendida |
| **no_asistida** | Paciente no asistió | Cuando el doctor marca como no asistida |
| **reprogramada** | Cita movida a otra fecha | Al aprobar solicitud o reprogramar directamente |
| **cancelada** | Cita cancelada | Cuando se cancela explícitamente |

---

## 🔄 Flujo de Creación de Citas

### 1. Creación Simple de Cita

**Endpoint:** `POST /api/citas`

**Flujo:**
```
1. Doctor/Admin crea cita
   ↓
2. Validaciones:
   - id_paciente requerido
   - fecha_cita requerida y válida
   - id_doctor opcional
   ↓
3. Crear registro en BD:
   - estado: 'pendiente' (por defecto)
   - fecha_creacion: ahora
   ↓
4. Notificaciones:
   - WebSocket: 'cita_creada' → Paciente, Doctor, Admin
   - Push Notification → Paciente
   ↓
5. Retornar cita creada
```

**Datos Requeridos:**
```json
{
  "id_paciente": 1,
  "id_doctor": 2,        // Opcional
  "fecha_cita": "2025-12-01T10:00:00Z",
  "motivo": "Consulta general",
  "es_primera_consulta": false
}
```

### 2. Primera Consulta Completa

**Endpoint:** `POST /api/citas/primera-consulta`

**Flujo:**
```
1. Doctor/Admin crea primera consulta
   ↓
2. Transacción BD (todo o nada):
   a. Crear Cita
   b. Crear Diagnóstico (si se proporciona)
   c. Crear Plan de Medicación (si se proporciona)
   d. Crear Signos Vitales (si se proporciona)
   e. Crear Asignación Doctor-Paciente
   ↓
3. Notificaciones:
   - WebSocket: 'cita_creada' → Paciente
   - Push Notification → Paciente
   ↓
4. Retornar id_cita creada
```

**Datos Requeridos:**
```json
{
  "id_paciente": 1,
  "id_doctor": 2,
  "fecha_cita": "2025-12-01T10:00:00Z",
  "motivo": "Primera consulta",
  "diagnostico": { ... },
  "plan_medicacion": { ... },
  "signos_vitales": { ... }
}
```

### 3. Consulta Completa (Nueva o Completar Existente)

**Endpoint:** `POST /api/citas/consulta-completa`

**Flujo:**
```
1. Verificar si existe cita (id_cita_existente)
   ↓
2a. Si NO existe cita:
    - Crear nueva cita
    - Crear todos los datos médicos
    - Crear asignación Doctor-Paciente
   ↓
2b. Si existe cita:
    - Actualizar cita existente
    - Agregar/actualizar datos médicos
   ↓
3. Notificaciones
   ↓
4. Retornar resultado
```

---

## 🔄 Flujo de Reprogramación

### Escenario 1: Paciente Solicita Reprogramación

#### Paso 1: Paciente Solicita Reprogramación

**Endpoint:** `POST /api/citas/:id/solicitar-reprogramacion`

**Flujo:**
```
1. Paciente presiona "Solicitar Reprogramación" en la app
   ↓
2. Validaciones:
   ✅ Cita existe
   ✅ Paciente tiene permiso (es su cita)
   ✅ Cita NO está cancelada
   ✅ Cita NO está atendida
   ✅ Cita NO está en el pasado
   ✅ Al menos 1 hora antes de la cita
   ✅ No existe solicitud pendiente previa
   ↓
3. Crear SolicitudReprogramacion:
   - id_cita: ID de la cita
   - id_paciente: ID del paciente
   - motivo: Motivo proporcionado por paciente
   - fecha_solicitada: null (paciente NO puede elegir fecha)
   - estado: 'pendiente'
   - fecha_creacion: ahora
   ↓
4. Actualizar Cita:
   - solicitado_por: 'paciente'
   - fecha_solicitud_reprogramacion: ahora
   ↓
5. Notificaciones:
   - WebSocket: 'solicitud_reprogramacion' → Doctor asignado
   - WebSocket: 'solicitud_reprogramacion' → Administradores
   - Push Notification → Doctor asignado
   ↓
6. Retornar solicitud creada
```

**Datos Requeridos:**
```json
{
  "motivo": "No puedo asistir por emergencia familiar"
}
```

**Estados de Solicitud:**
- `pendiente`: Esperando respuesta del doctor
- `aprobada`: Doctor aprobó y reprogramó
- `rechazada`: Doctor rechazó la solicitud
- `cancelada`: Paciente canceló la solicitud

#### Paso 2: Doctor Ve la Solicitud

**Endpoint:** `GET /api/citas/solicitudes-reprogramacion?estado=pendiente`

**Flujo:**
```
1. Doctor abre pantalla "Gestión de Solicitudes"
   ↓
2. Backend filtra:
   - Solo solicitudes de pacientes asignados al doctor
   - Estado: 'pendiente' (por defecto)
   ↓
3. Retornar lista de solicitudes con:
   - Datos del paciente
   - Fecha original de la cita
   - Motivo de la solicitud
   - Fecha de creación
```

#### Paso 3: Doctor Responde (Aprobar o Rechazar)

**Endpoint:** `PUT /api/citas/:id/solicitud-reprogramacion/:solicitudId`

**Flujo de Aprobación:**
```
1. Doctor selecciona "Aprobar"
   ↓
2. Doctor selecciona nueva fecha (obligatorio)
   ↓
3. Validaciones:
   ✅ Solicitud existe y está pendiente
   ✅ Nueva fecha no es en el pasado
   ✅ Acción válida ('aprobar' o 'rechazar')
   ↓
4. Actualizar SolicitudReprogramacion:
   - estado: 'aprobada'
   - respuesta_doctor: Comentario opcional
   - fecha_respuesta: ahora
   ↓
5. Actualizar Cita:
   - estado: 'reprogramada'
   - fecha_reprogramada: Nueva fecha seleccionada
   - motivo_reprogramacion: Motivo del paciente
   - solicitado_por: 'paciente'
   ↓
6. Notificaciones:
   - WebSocket: 'solicitud_reprogramacion_procesada' → Paciente
   - Push Notification → Paciente (cita reprogramada)
   ↓
7. Retornar solicitud actualizada
```

**Flujo de Rechazo:**
```
1. Doctor selecciona "Rechazar"
   ↓
2. Doctor ingresa motivo de rechazo (opcional)
   ↓
3. Validaciones (mismas que aprobación)
   ↓
4. Actualizar SolicitudReprogramacion:
   - estado: 'rechazada'
   - respuesta_doctor: Motivo del rechazo
   - fecha_respuesta: ahora
   ↓
5. NO actualizar Cita (mantiene fecha original)
   ↓
6. Notificaciones:
   - WebSocket: 'solicitud_reprogramacion_procesada' → Paciente
   - Push Notification → Paciente (solicitud rechazada)
   ↓
7. Retornar solicitud actualizada
```

**Datos para Aprobar:**
```json
{
  "accion": "aprobar",
  "fecha_reprogramada": "2025-12-05T14:00:00Z",
  "respuesta_doctor": "Aprobado, nueva fecha disponible"
}
```

**Datos para Rechazar:**
```json
{
  "accion": "rechazar",
  "respuesta_doctor": "No hay disponibilidad en esa fecha"
}
```

### Escenario 2: Doctor Reprograma Directamente

**Endpoint:** `PUT /api/citas/:id/reprogramar`

**Flujo:**
```
1. Doctor/Admin reprograma cita directamente
   ↓
2. Validaciones:
   ✅ Cita existe
   ✅ Cita NO está cancelada
   ✅ Cita NO está atendida
   ✅ Nueva fecha no es en el pasado
   ↓
3. Actualizar Cita:
   - estado: 'reprogramada'
   - fecha_reprogramada: Nueva fecha
   - motivo_reprogramacion: Motivo opcional
   - solicitado_por: 'doctor' o 'admin'
   - fecha_solicitud_reprogramacion: ahora
   ↓
4. Auditoría:
   - Registrar cambio de fecha
   ↓
5. Notificaciones:
   - WebSocket: 'cita_reprogramada' → Paciente, Doctor
   - Push Notification → Paciente
   ↓
6. Retornar cita actualizada
```

**Datos Requeridos:**
```json
{
  "fecha_reprogramada": "2025-12-05T14:00:00Z",
  "motivo_reprogramacion": "Cambio de agenda del doctor"
}
```

### Escenario 3: Paciente Cancela Solicitud Pendiente

**Endpoint:** `DELETE /api/citas/:id/solicitud-reprogramacion/:solicitudId`

**Flujo:**
```
1. Paciente cancela su solicitud pendiente
   ↓
2. Validaciones:
   ✅ Solicitud existe
   ✅ Solicitud está pendiente
   ✅ Paciente tiene permiso (es su solicitud)
   ↓
3. Actualizar SolicitudReprogramacion:
   - estado: 'cancelada'
   ↓
4. NO actualizar Cita (mantiene estado original)
   ↓
5. Retornar éxito
```

---

## 🔔 Notificaciones

### Notificaciones Push

#### Al Paciente:

1. **Cita Creada:**
   - Título: "📅 Nueva Cita Programada"
   - Mensaje: "Tienes una nueva cita médica programada para el [fecha]"

2. **Cita Reprogramada:**
   - Título: "📅 Cita Reprogramada"
   - Mensaje: "Tu cita médica ha sido reprogramada para el [fecha]"

3. **Solicitud Procesada (Aprobada):**
   - Título: "📅 Cita Reprogramada"
   - Mensaje: "Tu solicitud de reprogramación fue aprobada. Nueva fecha: [fecha]"

4. **Solicitud Procesada (Rechazada):**
   - Título: "📅 Actualización de Cita"
   - Mensaje: "Tu solicitud de reprogramación fue rechazada. [Motivo]"

#### Al Doctor:

1. **Solicitud de Reprogramación:**
   - Título: "📅 Solicitud de Reprogramación"
   - Mensaje: "[Nombre paciente] solicitó reprogramar su cita del [fecha]"

### Eventos WebSocket

#### Eventos Enviados:

1. **`cita_creada`**
   - Destinatarios: Paciente, Doctor, Admin
   - Datos: Información completa de la cita

2. **`cita_reprogramada`**
   - Destinatarios: Paciente, Doctor, Admin
   - Datos: Cita con nueva fecha

3. **`solicitud_reprogramacion`**
   - Destinatarios: Doctor asignado, Admin
   - Datos: Información de la solicitud

4. **`solicitud_reprogramacion_procesada`**
   - Destinatarios: Paciente
   - Datos: Resultado de la solicitud (aprobada/rechazada)

---

## 📊 Diagramas de Flujo

### Flujo Completo de Reprogramación (Paciente → Doctor)

```
┌─────────────────┐
│   PACIENTE      │
│  Presiona botón │
│ "Solicitar      │
│ Reprogramación" │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ POST /api/citas/:id/    │
│ solicitar-reprogramacion│
│                         │
│ Validaciones:           │
│ - Cita existe           │
│ - No cancelada/atendida │
│ - Al menos 1h antes     │
│ - No hay solicitud      │
│   pendiente             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Crear Solicitud         │
│ Reprogramacion:         │
│ - estado: 'pendiente'    │
│ - motivo: [del paciente]│
│ - fecha_solicitada: null│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Notificaciones:         │
│ - WebSocket → Doctor    │
│ - Push → Doctor         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│   DOCTOR        │
│  Recibe         │
│  notificación   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ GET /api/citas/         │
│ solicitudes-reprogramacion│
│                         │
│ Ver lista de solicitudes│
│ pendientes              │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Doctor selecciona:      │
│ - Aprobar (con fecha)   │
│ - Rechazar (con motivo) │
└────────┬────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│ APROBAR │ │ RECHAZAR│
└────┬────┘ └────┬────┘
    │            │
    ▼            ▼
┌─────────────────────────┐
│ PUT /api/citas/:id/     │
│ solicitud-reprogramacion│
│ /:solicitudId           │
│                         │
│ Si APROBAR:             │
│ - Actualizar cita       │
│   (fecha_reprogramada)  │
│ - estado: 'reprogramada'│
│                         │
│ Si RECHAZAR:            │
│ - NO actualizar cita    │
│ - estado: 'rechazada'   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Notificaciones:         │
│ - WebSocket → Paciente  │
│ - Push → Paciente       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│   PACIENTE      │
│  Recibe         │
│  notificación   │
│  de resultado   │
└─────────────────┘
```

### Estados de la Cita Durante Reprogramación

```
CITA ORIGINAL
   │
   │ estado: 'pendiente'
   │ fecha_cita: 2025-12-01
   │
   ▼
PACIENTE SOLICITA REPROGRAMACIÓN
   │
   │ Se crea SolicitudReprogramacion:
   │ - estado: 'pendiente'
   │
   │ Cita se actualiza:
   │ - solicitado_por: 'paciente'
   │ - fecha_solicitud_reprogramacion: ahora
   │ - estado: 'pendiente' (NO cambia aún)
   │
   ▼
DOCTOR APRUEBA
   │
   │ SolicitudReprogramacion:
   │ - estado: 'aprobada'
   │
   │ Cita se actualiza:
   │ - estado: 'reprogramada' ✅
   │ - fecha_reprogramada: 2025-12-05
   │ - motivo_reprogramacion: [motivo del paciente]
   │
   ▼
CITA REPROGRAMADA
   │
   │ estado: 'reprogramada'
   │ fecha_cita: 2025-12-01 (original)
   │ fecha_reprogramada: 2025-12-05 (nueva)
```

---

## 🔐 Validaciones y Reglas de Negocio

### Validaciones al Solicitar Reprogramación

1. ✅ **Cita debe existir**
2. ✅ **Paciente debe tener permiso** (es su cita)
3. ✅ **Cita NO debe estar cancelada**
4. ✅ **Cita NO debe estar atendida**
5. ✅ **Cita NO debe estar en el pasado**
6. ✅ **Al menos 1 hora antes** de la cita
7. ✅ **No debe existir solicitud pendiente** previa
8. ✅ **Motivo es requerido**

### Validaciones al Aprobar/Rechazar

1. ✅ **Solicitud debe existir**
2. ✅ **Solicitud debe estar pendiente**
3. ✅ **Acción debe ser válida** ('aprobar' o 'rechazar')
4. ✅ **Si aprueba: fecha_reprogramada es requerida**
5. ✅ **Nueva fecha NO debe ser en el pasado**

### Reglas de Negocio

1. **Pacientes NO pueden elegir fecha:** Solo solicitan, el doctor decide
2. **Solo una solicitud pendiente por cita:** Evita duplicados
3. **Tiempo mínimo:** 1 hora antes de la cita para solicitar
4. **Doctor decide fecha:** Al aprobar, el doctor selecciona la nueva fecha
5. **Auditoría completa:** Todos los cambios se registran

---

## 📱 Flujo en el Frontend

### Pantalla del Paciente (MisCitas.js)

```
1. Paciente ve lista de citas
   ↓
2. Para cada cita pendiente:
   - Muestra botón "Solicitar Reprogramación"
   ↓
3. Al presionar:
   - Abre modal
   - Solicita motivo
   ↓
4. Envía solicitud:
   - POST /api/citas/:id/solicitar-reprogramacion
   ↓
5. Escucha WebSocket:
   - 'solicitud_reprogramacion_procesada'
   - Actualiza UI cuando doctor responde
```

### Pantalla del Doctor (GestionSolicitudesReprogramacion.js)

```
1. Doctor ve lista de solicitudes pendientes
   ↓
2. Para cada solicitud:
   - Muestra datos del paciente
   - Muestra fecha original
   - Muestra motivo
   ↓
3. Al presionar "Aprobar":
   - Abre modal
   - Solicita nueva fecha (obligatorio)
   - Solicita comentario (opcional)
   ↓
4. Al presionar "Rechazar":
   - Abre modal
   - Solicita motivo (opcional)
   ↓
5. Envía respuesta:
   - PUT /api/citas/:id/solicitud-reprogramacion/:solicitudId
   ↓
6. Actualiza lista automáticamente
```

---

## 🗄️ Modelos de Base de Datos

### Tabla: `citas`

```sql
- id_cita (PK)
- id_paciente (FK)
- id_doctor (FK, nullable)
- fecha_cita (DATE, required)
- estado (ENUM: pendiente, atendida, no_asistida, reprogramada, cancelada)
- fecha_reprogramada (DATE, nullable)
- motivo_reprogramacion (TEXT, nullable)
- solicitado_por (ENUM: paciente, doctor, admin, nullable)
- fecha_solicitud_reprogramacion (DATE, nullable)
- motivo (STRING)
- es_primera_consulta (BOOLEAN)
- observaciones (TEXT)
- fecha_creacion (DATE)
```

### Tabla: `solicitudes_reprogramacion`

```sql
- id_solicitud (PK)
- id_cita (FK)
- id_paciente (FK)
- motivo (TEXT, required)
- fecha_solicitada (DATE, nullable)
- estado (ENUM: pendiente, aprobada, rechazada, cancelada)
- respuesta_doctor (TEXT, nullable)
- fecha_respuesta (DATE, nullable)
- fecha_creacion (DATE)
```

---

## 🔄 Resumen del Flujo Completo

### Creación de Cita
```
Doctor/Admin → Crea Cita → Notifica Paciente → Cita en estado 'pendiente'
```

### Solicitud de Reprogramación
```
Paciente → Solicita Reprogramación → Notifica Doctor → Solicitud 'pendiente'
```

### Procesamiento de Solicitud
```
Doctor → Aproba/Rechaza → Actualiza Cita → Notifica Paciente → Solicitud 'aprobada'/'rechazada'
```

### Reprogramación Directa
```
Doctor/Admin → Reprograma Directamente → Actualiza Cita → Notifica Paciente → Cita 'reprogramada'
```

---

**Última actualización:** 28/11/2025

