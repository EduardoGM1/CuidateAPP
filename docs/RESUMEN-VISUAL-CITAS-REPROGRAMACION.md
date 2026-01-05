# 📊 Resumen Visual: Flujo de Citas y Reprogramación

**Versión simplificada para comprensión rápida**

---

## 🎯 Flujo Principal: Solicitud de Reprogramación

```
┌─────────────────────────────────────────────────────────────┐
│                    PACIENTE                                 │
│  Ve su cita pendiente en "Mis Citas"                       │
│  Presiona: "🔄 Solicitar Reprogramación"                    │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  MODAL: Ingresa motivo                                      │
│  "No puedo asistir por emergencia familiar"                │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND: POST /api/citas/:id/solicitar-reprogramacion     │
│                                                             │
│  ✅ Validaciones:                                           │
│     - Cita existe y es del paciente                        │
│     - No está cancelada/atendida                           │
│     - Al menos 1 hora antes                                │
│     - No hay solicitud pendiente previa                     │
│                                                             │
│  📝 Crea SolicitudReprogramacion:                           │
│     - estado: 'pendiente'                                   │
│     - motivo: [del paciente]                               │
│     - fecha_solicitada: null (paciente NO elige fecha)     │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICACIONES:                                            │
│  📱 Push Notification → Doctor                              │
│  🔔 WebSocket → Doctor (si app abierta)                    │
│  🔔 WebSocket → Admin                                       │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    DOCTOR                                   │
│  Recibe notificación push                                  │
│  Ve contador en Dashboard: "1 solicitud pendiente"          │
│  Abre: "Gestión de Solicitudes de Reprogramación"           │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  DOCTOR VE:                                                 │
│  - Nombre del paciente                                      │
│  - Fecha original de la cita                               │
│  - Motivo de la solicitud                                  │
│  - Fecha de creación de la solicitud                       │
└────────────────────┬──────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌───────────────┐        ┌───────────────┐
│   APROBAR     │        │   RECHAZAR    │
└───────┬───────┘        └───────┬───────┘
        │                        │
        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│ Selecciona nueva │    │ Ingresa motivo   │
│ fecha (obligatorio)│    │ (opcional)        │
└───────┬──────────┘    └───────┬──────────┘
        │                        │
        └────────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND: PUT /api/citas/:id/solicitud-reprogramacion/:id   │
│                                                             │
│  Si APROBAR:                                                │
│  ✅ Actualiza SolicitudReprogramacion:                      │
│     - estado: 'aprobada'                                    │
│     - respuesta_doctor: [comentario]                       │
│     - fecha_respuesta: ahora                                │
│                                                             │
│  ✅ Actualiza Cita:                                         │
│     - estado: 'reprogramada'                                │
│     - fecha_reprogramada: [nueva fecha]                     │
│     - motivo_reprogramacion: [motivo del paciente]         │
│                                                             │
│  Si RECHAZAR:                                               │
│  ✅ Actualiza SolicitudReprogramacion:                      │
│     - estado: 'rechazada'                                   │
│     - respuesta_doctor: [motivo del rechazo]               │
│     - fecha_respuesta: ahora                                │
│                                                             │
│  ❌ NO actualiza Cita (mantiene fecha original)             │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  NOTIFICACIONES:                                            │
│  📱 Push Notification → Paciente                            │
│  🔔 WebSocket → Paciente (si app abierta)                   │
│                                                             │
│  Si APROBADA:                                               │
│  "Tu solicitud fue aprobada. Nueva fecha: [fecha]"         │
│                                                             │
│  Si RECHAZADA:                                              │
│  "Tu solicitud fue rechazada. Motivo: [motivo]"            │
└────────────────────┬──────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    PACIENTE                                 │
│  Recibe notificación                                        │
│  Ve actualización en "Mis Citas"                           │
│  Si aprobada: Cita muestra nueva fecha                     │
│  Si rechazada: Cita mantiene fecha original                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Estados y Transiciones

### Estados de la Cita

```
pendiente ──┐
            │
            ├──> atendida (doctor marca como atendida)
            │
            ├──> no_asistida (doctor marca como no asistida)
            │
            ├──> cancelada (se cancela explícitamente)
            │
            └──> reprogramada (se aprueba solicitud o reprograma directamente)
```

### Estados de la Solicitud de Reprogramación

```
pendiente ──┐
            │
            ├──> aprobada (doctor aprueba y reprograma)
            │
            ├──> rechazada (doctor rechaza)
            │
            └──> cancelada (paciente cancela su solicitud)
```

---

## 🔑 Puntos Clave

### ✅ Lo que SÍ puede hacer el Paciente:
- Solicitar reprogramación de su cita
- Ingresar motivo de la solicitud
- Cancelar su solicitud pendiente
- Ver estado de su solicitud

### ❌ Lo que NO puede hacer el Paciente:
- Elegir nueva fecha (solo el doctor decide)
- Solicitar reprogramación de citas canceladas/atendidas
- Solicitar con menos de 1 hora de anticipación
- Tener múltiples solicitudes pendientes para la misma cita

### ✅ Lo que SÍ puede hacer el Doctor:
- Ver todas las solicitudes de sus pacientes
- Aprobar solicitud (con nueva fecha)
- Rechazar solicitud (con motivo opcional)
- Reprogramar cita directamente (sin solicitud)

### 🔔 Notificaciones Automáticas:
- **Paciente → Doctor:** Cuando paciente solicita
- **Doctor → Paciente:** Cuando doctor aprueba/rechaza
- **Sistema → Ambos:** Cuando se reprograma directamente

---

## 📱 Pantallas Involucradas

### Paciente:
1. **MisCitas.js** - Ver citas y solicitar reprogramación
2. **Modal de Solicitud** - Ingresar motivo

### Doctor:
1. **DashboardDoctor.js** - Ver contador de solicitudes pendientes
2. **GestionSolicitudesReprogramacion.js** - Ver y responder solicitudes
3. **Modal de Respuesta** - Aprobar/Rechazar con fecha/motivo

---

## 🎯 Casos de Uso Comunes

### Caso 1: Paciente no puede asistir
```
1. Paciente solicita reprogramación con motivo
2. Doctor recibe notificación
3. Doctor aprueba y selecciona nueva fecha
4. Paciente recibe notificación con nueva fecha
5. Cita queda reprogramada
```

### Caso 2: Doctor rechaza solicitud
```
1. Paciente solicita reprogramación
2. Doctor recibe notificación
3. Doctor rechaza con motivo (ej: "No hay disponibilidad")
4. Paciente recibe notificación de rechazo
5. Cita mantiene fecha original
```

### Caso 3: Doctor reprograma directamente
```
1. Doctor reprograma cita sin solicitud previa
2. Sistema actualiza cita directamente
3. Paciente recibe notificación de reprogramación
4. Cita queda reprogramada
```

---

**Para más detalles técnicos, ver:** `FLUJO-COMPLETO-CITAS-REPROGRAMACION.md`

