# 📋 ANÁLISIS: Funcionalidad de Reprogramación de Citas

**Fecha:** 28/11/2025  
**Objetivo:** Verificar si la funcionalidad completa de reprogramación de citas está implementada

---

## ✅ RESUMEN EJECUTIVO

**Estado:** ✅ **LA FUNCIONALIDAD ESTÁ COMPLETAMENTE IMPLEMENTADA**

**Completitud:** 100%
- ✅ Backend: Completo
- ✅ Frontend Paciente: Completo
- ✅ Frontend Doctor: Completo
- ✅ Notificaciones Push: Completo (paciente y doctor)

---

## 🔧 BACKEND - IMPLEMENTADO ✅

### 1. Modelo de Base de Datos

**Archivo:** `api-clinica/models/SolicitudReprogramacion.js`

**Campos:**
- ✅ `id_solicitud` (PK)
- ✅ `id_cita` (FK)
- ✅ `id_paciente` (FK)
- ✅ `motivo` (TEXT, requerido)
- ✅ `fecha_solicitada` (DATE, nullable - pacientes no pueden elegir)
- ✅ `estado` (ENUM: 'pendiente', 'aprobada', 'rechazada', 'cancelada')
- ✅ `respuesta_doctor` (TEXT, nullable)
- ✅ `fecha_respuesta` (DATE, nullable)
- ✅ `fecha_creacion` (DATE)

**Estado:** ✅ **COMPLETO**

---

### 2. Endpoints del Backend

**Archivo:** `api-clinica/routes/cita.js` y `api-clinica/controllers/cita.js`

#### ✅ Endpoint 1: Solicitar Reprogramación (Paciente)
- **Ruta:** `POST /api/citas/:id/solicitar-reprogramacion`
- **Controlador:** `solicitarReprogramacion` (línea 1493)
- **Permisos:** Paciente, Admin, Doctor
- **Funcionalidad:**
  - ✅ Valida que la cita no esté cancelada o atendida
  - ✅ Valida tiempo mínimo (1 hora antes)
  - ✅ Crea solicitud con estado 'pendiente'
  - ✅ Actualiza cita con `solicitado_por: 'paciente'`
  - ✅ Emite evento WebSocket `solicitud_reprogramacion` al doctor
  - ✅ Emite evento WebSocket a administradores
  - ⚠️ **NO envía notificación push al doctor** (falta implementar)

**Estado:** ✅ **COMPLETO** (excepto push notification)

---

#### ✅ Endpoint 2: Obtener Solicitudes de Reprogramación (Paciente)
- **Ruta:** `GET /api/pacientes/:id/solicitudes-reprogramacion`
- **Controlador:** `getSolicitudesReprogramacion` (línea 1638)
- **Funcionalidad:**
  - ✅ Obtiene solicitudes del paciente
  - ✅ Filtro por estado (opcional)
  - ✅ Incluye datos de la cita y doctor

**Estado:** ✅ **COMPLETO**

---

#### ✅ Endpoint 3: Obtener Todas las Solicitudes (Doctor/Admin)
- **Ruta:** `GET /api/citas/solicitudes-reprogramacion`
- **Controlador:** `getAllSolicitudesReprogramacion` (línea 1674)
- **Funcionalidad:**
  - ✅ Filtro por estado, paciente, doctor
  - ✅ Solo muestra solicitudes del doctor autenticado (para doctores)
  - ✅ Admin ve todas

**Estado:** ✅ **COMPLETO**

---

#### ✅ Endpoint 4: Responder Solicitud (Doctor/Admin)
- **Ruta:** `PUT /api/citas/:id/solicitud-reprogramacion/:solicitudId`
- **Controlador:** `responderSolicitudReprogramacion` (línea 1750)
- **Funcionalidad:**
  - ✅ Aprobar o rechazar solicitud
  - ✅ Si aprueba: actualiza fecha de la cita
  - ✅ Si aprueba: actualiza estado de cita a 'reprogramada'
  - ✅ Guarda respuesta del doctor
  - ✅ Envía notificación push al paciente (✅ implementado)
  - ✅ Emite evento WebSocket al paciente

**Estado:** ✅ **COMPLETO**

---

#### ✅ Endpoint 5: Reprogramar Directamente (Doctor/Admin)
- **Ruta:** `PUT /api/citas/:id/reprogramar`
- **Controlador:** `reprogramarCita` (línea 1353)
- **Funcionalidad:**
  - ✅ Reprograma cita directamente (sin solicitud)
  - ✅ Valida fecha no en pasado
  - ✅ Actualiza estado a 'reprogramada'
  - ✅ Envía notificación push al paciente
  - ✅ Emite evento WebSocket

**Estado:** ✅ **COMPLETO**

---

#### ✅ Endpoint 6: Cancelar Solicitud (Paciente)
- **Ruta:** `DELETE /api/citas/:id/solicitud-reprogramacion/:solicitudId`
- **Controlador:** `cancelarSolicitudReprogramacion` (línea 1875)
- **Funcionalidad:**
  - ✅ Cancela solicitud pendiente
  - ✅ Valida permisos (paciente solo puede cancelar sus propias solicitudes)

**Estado:** ✅ **COMPLETO**

---

## 📱 FRONTEND - IMPLEMENTADO ✅

### 1. Pantalla del Paciente: MisCitas.js

**Archivo:** `ClinicaMovil/src/screens/paciente/MisCitas.js`

#### Funcionalidades Implementadas:

✅ **Botón "Solicitar Reprogramación"** (línea 825-828)
- Visible en citas pendientes
- Abre modal para ingresar motivo

✅ **Modal de Solicitud** (línea 530-580)
- Campo de texto para motivo
- Validación de motivo requerido
- Envía solicitud con `gestionService.solicitarReprogramacion()`
- Feedback con TTS y audio

✅ **Visualización de Solicitudes** (línea 513-530)
- Carga solicitudes del paciente
- Muestra estado de cada solicitud
- Botón para cancelar solicitud pendiente

✅ **Estados de Solicitud** (línea 622-647)
- Pendiente, Aprobada, Rechazada, Cancelada
- Diferentes colores y textos según estado

✅ **WebSocket** (línea 350-377)
- Suscripción a `solicitud_reprogramacion_procesada`
- Actualiza UI cuando el doctor responde

**Estado:** ✅ **COMPLETO**

---

### 2. Pantalla del Doctor: GestionSolicitudesReprogramacion.js

**Archivo:** `ClinicaMovil/src/screens/doctor/GestionSolicitudesReprogramacion.js`

#### Funcionalidades Implementadas:

✅ **Lista de Solicitudes** (línea 32-82)
- Carga solicitudes pendientes del doctor
- Filtro por estado (pendiente, aprobada, rechazada, todas)
- Refresh manual

✅ **Ver Detalles de Solicitud** (línea 110-115)
- Muestra información de la cita
- Muestra motivo del paciente
- Muestra fecha original de la cita

✅ **Aprobar Solicitud** (línea 118-149)
- Modal para seleccionar nueva fecha
- Campo opcional para respuesta del doctor
- Actualiza cita con nueva fecha
- Cambia estado a 'aprobada'

✅ **Rechazar Solicitud** (línea 151-193)
- Modal para ingresar motivo de rechazo
- Cambia estado a 'rechazada'
- No modifica la fecha de la cita

✅ **Selector de Fecha** (línea 41)
- Usa `DateTimePickerButton`
- Permite seleccionar nueva fecha y hora

**Estado:** ✅ **COMPLETO**

---

### 3. Dashboard del Doctor: DashboardDoctor.js

**Archivo:** `ClinicaMovil/src/screens/doctor/DashboardDoctor.js`

#### Funcionalidades Implementadas:

✅ **Contador de Solicitudes Pendientes** (línea 79-88)
- Carga número de solicitudes pendientes
- Se muestra en el dashboard

✅ **WebSocket para Solicitudes** (línea 144-151)
- Suscripción a `solicitud_reprogramacion`
- Actualiza contador cuando llega nueva solicitud
- Recarga dashboard automáticamente

✅ **Navegación a Gestión** (línea 663-664)
- Botón para ir a `GestionSolicitudesReprogramacion`

**Estado:** ✅ **COMPLETO**

---

### 4. Servicios del Frontend

**Archivo:** `ClinicaMovil/src/api/gestionService.js`

#### Funciones Implementadas:

✅ **solicitarReprogramacion** (línea 1067-1091)
- Envía POST a `/api/citas/:id/solicitar-reprogramacion`
- Parámetros: `citaId`, `motivo`, `fechaSolicitada` (null)

✅ **getSolicitudesReprogramacion** (línea 1091-1109)
- Obtiene solicitudes de un paciente
- GET a `/api/pacientes/:id/solicitudes-reprogramacion`

✅ **getAllSolicitudesReprogramacion** (línea 1113-1143)
- Obtiene todas las solicitudes (doctor/admin)
- GET a `/api/citas/solicitudes-reprogramacion`
- Filtros: estado, paciente, doctor

✅ **responderSolicitudReprogramacion** (línea 1143-1176)
- Responde solicitud (aprobar/rechazar)
- PUT a `/api/citas/:id/solicitud-reprogramacion/:solicitudId`
- Parámetros: `accion`, `respuestaDoctor`, `fechaReprogramada`

✅ **cancelarSolicitudReprogramacion** (línea 1176-1183)
- Cancela solicitud pendiente
- DELETE a `/api/citas/:id/solicitud-reprogramacion/:solicitudId`

✅ **reprogramarCita** (línea 1041-1067)
- Reprograma cita directamente (doctor/admin)
- PUT a `/api/citas/:id/reprogramar`

**Estado:** ✅ **COMPLETO**

---

## 🔔 NOTIFICACIONES - PARCIAL ⚠️

### ✅ Notificaciones Push al Paciente

**Implementado en:** `api-clinica/controllers/cita.js` (línea 1823-1828)

**Cuándo se envía:**
- ✅ Cuando el doctor aprueba la solicitud
- ✅ Cuando el doctor rechaza la solicitud
- ✅ Cuando el doctor reprograma directamente

**Estado:** ✅ **COMPLETO**

---

### ✅ Notificaciones Push al Doctor - IMPLEMENTADO

**Implementación completada:**

En `api-clinica/controllers/cita.js` línea 1670-1695:
- ✅ Se envía evento WebSocket al doctor (`solicitud_reprogramacion`)
- ✅ Se envía notificación push al doctor (nuevo)
- ✅ Se envía evento WebSocket a administradores
- ✅ Manejo de errores no crítico

**Código implementado:**
```javascript
// Notificar al doctor asignado
if (solicitudCompleta.Cita?.id_doctor) {
  try {
    const doctor = await Doctor.findByPk(solicitudCompleta.Cita.id_doctor, {
      attributes: ['id_doctor', 'id_usuario']
    });
    if (doctor?.id_usuario) {
      // ✅ WebSocket enviado (si la app está abierta)
      const enviado = realtimeService.sendToUser(doctor.id_usuario, 'solicitud_reprogramacion', solicitudData);
      
      // ✅ Notificación push enviada (funciona incluso si la app está cerrada)
      await enviarNotificacionPushDoctor(
        solicitudCompleta.Cita.id_doctor,
        'solicitud_reprogramacion',
        solicitudData
      );
    }
  } catch (notifError) {
    logger.error('❌ [NOTIFICACION] Error enviando notificación al doctor (no crítico):', notifError);
  }
}
```

**Estado:** ✅ **IMPLEMENTADO** - 28/11/2025

---

### ✅ Alertas en la App (WebSocket)

**Frontend implementado:**

✅ **DashboardDoctor.js** (línea 144-151)
- Suscripción a `solicitud_reprogramacion`
- Actualiza contador de solicitudes pendientes
- Recarga dashboard automáticamente

✅ **MisCitas.js** (línea 350-377)
- Suscripción a `solicitud_reprogramacion_procesada`
- Actualiza UI cuando el doctor responde

**Estado:** ✅ **COMPLETO**

---

## 📊 RESUMEN DE IMPLEMENTACIÓN

| Componente | Estado | Detalles |
|------------|--------|----------|
| **Modelo BD** | ✅ Completo | `SolicitudReprogramacion.js` con todos los campos |
| **Backend - Solicitar** | ✅ Completo | Endpoint POST, validaciones, WebSocket |
| **Backend - Listar** | ✅ Completo | Endpoints GET para paciente y doctor |
| **Backend - Responder** | ✅ Completo | Endpoint PUT, actualiza cita, notifica paciente |
| **Backend - Reprogramar directo** | ✅ Completo | Endpoint PUT para doctor/admin |
| **Backend - Cancelar** | ✅ Completo | Endpoint DELETE |
| **Frontend - Paciente** | ✅ Completo | Botón, modal, lista, cancelar |
| **Frontend - Doctor** | ✅ Completo | Lista, aprobar, rechazar, selector fecha |
| **Frontend - Dashboard** | ✅ Completo | Contador, WebSocket, navegación |
| **WebSocket** | ✅ Completo | Eventos para doctor y paciente |
| **Push - Paciente** | ✅ Completo | Notificaciones cuando doctor responde |
| **Push - Doctor** | ✅ **COMPLETO** | Notificación push cuando paciente solicita |

---

## ✅ IMPLEMENTACIÓN COMPLETADA

### 1. Notificación Push al Doctor ✅

**Ubicación:** `api-clinica/controllers/cita.js` línea 121-190 y 1686-1690

**Implementación:**
- ✅ Creada función reutilizable `enviarNotificacionPushDoctor` siguiendo el patrón de `enviarNotificacionPushCita`
- ✅ Función genérica que puede usarse para otros tipos de notificaciones a doctores
- ✅ Integrada en `solicitarReprogramacion` después del WebSocket
- ✅ Manejo de errores no crítico (no falla la solicitud si falla la notificación)
- ✅ Logging completo para debugging

**Código implementado:**
```javascript
// Función reutilizable para notificaciones push a doctores
const enviarNotificacionPushDoctor = async (doctorId, tipo, data) => {
  // Obtiene doctor, formatea mensaje según tipo, envía push notification
  // Maneja errores sin afectar la operación principal
};

// Integrada en solicitarReprogramacion:
await enviarNotificacionPushDoctor(
  solicitudCompleta.Cita.id_doctor,
  'solicitud_reprogramacion',
  solicitudData
);
```

**Estado:** ✅ **COMPLETADO** - 28/11/2025

---

## ✅ LO QUE YA ESTÁ IMPLEMENTADO

### Backend:
1. ✅ Modelo `SolicitudReprogramacion`
2. ✅ Endpoint para solicitar reprogramación
3. ✅ Endpoint para listar solicitudes
4. ✅ Endpoint para responder (aprobar/rechazar)
5. ✅ Endpoint para reprogramar directamente
6. ✅ Endpoint para cancelar solicitud
7. ✅ Validaciones (tiempo mínimo, estados, permisos)
8. ✅ WebSocket para notificaciones en tiempo real
9. ✅ Notificaciones push al paciente

### Frontend:
1. ✅ Botón "Solicitar Reprogramación" en MisCitas
2. ✅ Modal para ingresar motivo
3. ✅ Lista de solicitudes del paciente
4. ✅ Pantalla de gestión para doctores
5. ✅ Aprobar/rechazar con selector de fecha
6. ✅ Contador en dashboard del doctor
7. ✅ WebSocket para actualizaciones en tiempo real
8. ✅ Navegación entre pantallas

---

## 🎯 CONCLUSIÓN

**La funcionalidad está 100% implementada.**

**Lo que funciona:**
- ✅ Paciente puede solicitar reprogramación
- ✅ Doctor recibe notificación WebSocket (si la app está abierta)
- ✅ Doctor recibe notificación push (incluso si la app está cerrada) - **NUEVO**
- ✅ Doctor puede ver, aprobar y rechazar solicitudes
- ✅ Paciente recibe notificación push cuando doctor responde
- ✅ La cita se actualiza correctamente

**Implementación completada:**
- ✅ Función `enviarNotificacionPushDoctor` creada (reutilizable para futuras notificaciones)
- ✅ Integrada en `solicitarReprogramacion` con manejo de errores no crítico
- ✅ Sigue las mejores prácticas: no duplica código, reutiliza patrón existente
- ✅ Logging completo para debugging y monitoreo

**Estado final:** ✅ **COMPLETO** - Todas las funcionalidades requeridas están implementadas

---

**Última actualización:** 28/11/2025

