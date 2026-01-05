# 🔴 Funcionalidades WebSocket en Tiempo Real

## 📋 Resumen Ejecutivo

**Estado Actual:** El sistema tiene WebSockets implementados con múltiples eventos en tiempo real, pero **NO todos están siendo utilizados en los dashboards**.

---

## ✅ Eventos WebSocket Implementados

### 🔴 **Eventos Activos (Emitidos desde Backend)**

#### 1. **Gestión de Doctores**
- ✅ `doctor_created` - Cuando se crea un nuevo doctor
  - **Emitido desde:** `api-clinica/controllers/doctor.js` (línea 248, 251)
  - **Recibe:** Admin, Doctor
  - **Datos:** `{ id_doctor, id_usuario, nombre, apellido_paterno, apellido_materno, id_modulo, activo, fecha_registro }`

#### 2. **Gestión de Pacientes**
- ✅ `patient_created` - Cuando se crea un nuevo paciente
  - **Emitido desde:** `api-clinica/controllers/paciente.js` (línea 632, 636)
  - **Recibe:** Admin, Doctor (si tiene módulo asignado)
  - **Datos:** `{ id_paciente, id_usuario, nombre, apellido_paterno, apellido_materno, numero_celular, activo }`

#### 3. **Asignación de Pacientes a Doctores**
- ✅ `patient_assigned` - Cuando se asigna un paciente a un doctor
  - **Emitido desde:** `api-clinica/controllers/doctor.js` (línea 813, 814)
  - **Recibe:** Admin, Doctor
  - **Datos:** `{ id_doctor, id_paciente, doctor_nombre, paciente_nombre, fecha_asignacion, observaciones }`

- ✅ `patient_unassigned` - Cuando se desasigna un paciente de un doctor
  - **Emitido desde:** `api-clinica/controllers/doctor.js` (línea 907, 908)
  - **Recibe:** Admin, Doctor
  - **Datos:** `{ id_doctor, id_paciente, doctor_nombre, paciente_nombre, fecha_desasignacion }`

### 🟡 **Eventos Disponibles (No Emitidos Automáticamente)**

#### 4. **Notificaciones Push**
- 🟡 `push_notification` - Notificación genérica
  - **Método:** `realtimeService.sendPushNotification(userId, notification)`
  - **Uso:** Notificaciones personalizadas

#### 5. **Recordatorios de Citas**
- 🟡 `appointment_reminder` - Recordatorio de cita
  - **Método:** `realtimeService.sendAppointmentReminder(userId, appointment)`
  - **Uso:** Recordatorios automáticos de citas

#### 6. **Recordatorios de Medicamentos**
- 🟡 `medication_reminder` - Recordatorio de medicamento
  - **Método:** `realtimeService.sendMedicationReminder(userId, medication)`
  - **Uso:** Recordatorios automáticos de medicamentos

#### 7. **Resultados de Exámenes**
- 🟡 `test_result` - Resultado de examen disponible
  - **Método:** `realtimeService.sendTestResult(userId, result)`
  - **Uso:** Notificar resultados de laboratorio

#### 8. **Eventos de Pacientes (Solicitudes)**
- 🟡 `request_upcoming_appointments` - Solicitar citas próximas
  - **Cliente → Servidor:** El paciente solicita sus citas
  - **Servidor → Cliente:** `upcoming_appointments` con lista de citas

- 🟡 `request_medication_reminders` - Solicitar recordatorios de medicamentos
  - **Cliente → Servidor:** El paciente solicita sus recordatorios
  - **Servidor → Cliente:** `medication_reminders` con lista de recordatorios

#### 9. **Eventos de Doctores (Solicitudes)**
- 🟡 `request_waiting_patients` - Solicitar pacientes en espera
  - **Cliente → Servidor:** El doctor solicita pacientes en espera
  - **Servidor → Cliente:** `waiting_patients` con lista de pacientes

- 🟡 `patient_waiting` - Notificar que un paciente está esperando
  - **Cliente → Servidor:** Notificar que un paciente llegó
  - **Servidor → Cliente:** `new_patient_waiting` a todos los doctores

#### 10. **Eventos de Sistema**
- ✅ `ping` / `pong` - Heartbeat (cada 30 segundos)
  - **Cliente → Servidor:** `ping`
  - **Servidor → Cliente:** `pong` con timestamp

- ✅ `sync_status_request` / `sync_status` - Estado de sincronización
  - **Cliente → Servidor:** `sync_status_request`
  - **Servidor → Cliente:** `sync_status` con `{ last_sync, pending_changes, server_time }`

- ✅ `server_info` - Información del servidor
  - **Cliente → Servidor:** `server_info`
  - **Servidor → Cliente:** `server_info` con `{ uptime, timestamp, version, environment }`

- ✅ `app_background` / `app_foreground` - Estado de la app
  - **Cliente → Servidor:** `app_background` o `app_foreground`
  - **Servidor → Cliente:** `background_acknowledged` o `foreground_acknowledged`

---

## 🎯 Eventos que Podemos Probar Visualmente

### **Para Dashboard Administrador:**

1. ✅ **Crear un Doctor** → Ver actualización en tiempo real
2. ✅ **Crear un Paciente** → Ver actualización en tiempo real
3. ✅ **Asignar Paciente a Doctor** → Ver actualización en tiempo real
4. ✅ **Desasignar Paciente de Doctor** → Ver actualización en tiempo real

### **Para Dashboard Doctor:**

1. ✅ **Asignar Paciente** → Ver nuevo paciente en lista
2. ✅ **Desasignar Paciente** → Ver paciente removido de lista
3. 🟡 **Paciente en Espera** → Ver notificación (requiere implementación)

### **Para Dashboard Paciente:**

1. 🟡 **Recordatorio de Cita** → Ver notificación (requiere implementación)
2. 🟡 **Recordatorio de Medicamento** → Ver notificación (requiere implementación)
3. 🟡 **Resultado de Examen** → Ver notificación (requiere implementación)

---

## 🧪 Cómo Probar los Eventos Activos

### **Prueba 1: Crear Doctor (Tiempo Real)**

**Pasos:**
1. Abre el Dashboard Admin en un dispositivo
2. Abre el Dashboard Admin en otro dispositivo (o emulador)
3. En el primer dispositivo, crea un nuevo doctor
4. **Resultado esperado:** El segundo dispositivo debería ver el nuevo doctor aparecer automáticamente sin recargar

**Evento WebSocket:**
```javascript
// Backend emite:
realtimeService.sendToRole('Admin', 'doctor_created', {
  id_doctor: 1,
  id_usuario: 10,
  nombre: 'Dr. Juan',
  apellido_paterno: 'Pérez',
  // ...
});

// Frontend escucha:
socket.on('doctor_created', (doctorData) => {
  // Actualizar lista de doctores
});
```

### **Prueba 2: Crear Paciente (Tiempo Real)**

**Pasos:**
1. Abre el Dashboard Admin en un dispositivo
2. Abre el Dashboard Doctor en otro dispositivo
3. En el Admin, crea un nuevo paciente
4. **Resultado esperado:** El Doctor debería ver el nuevo paciente aparecer automáticamente

**Evento WebSocket:**
```javascript
// Backend emite:
realtimeService.sendToRole('Admin', 'patient_created', pacienteData);
realtimeService.sendToRole('Doctor', 'patient_created', pacienteData);

// Frontend escucha:
socket.on('patient_created', (patientData) => {
  // Actualizar lista de pacientes
});
```

### **Prueba 3: Asignar Paciente a Doctor (Tiempo Real)**

**Pasos:**
1. Abre el Dashboard Admin en un dispositivo
2. Abre el Dashboard Doctor en otro dispositivo
3. En el Admin, asigna un paciente al doctor
4. **Resultado esperado:** 
   - El Doctor debería ver el paciente aparecer en su lista
   - El Admin debería ver la actualización en tiempo real

**Evento WebSocket:**
```javascript
// Backend emite:
realtimeService.sendToRole('Admin', 'patient_assigned', assignmentData);
realtimeService.sendToRole('Doctor', 'patient_assigned', assignmentData);

// Frontend escucha:
socket.on('patient_assigned', (assignmentData) => {
  // Actualizar lista de pacientes del doctor
});
```

---

## 🔧 Estado Actual de Integración

### ✅ **Implementado:**
- ✅ Backend: WebSocket server inicializado
- ✅ Backend: Eventos emitidos en controllers
- ✅ Frontend: Hook `useWebSocket` disponible
- ✅ Frontend: Hook `useRealtimeList` para listas
- ✅ Frontend: `GestionAdmin.js` usa WebSocket (solo verifica conexión)

### ❌ **NO Implementado:**
- ❌ Dashboard Admin: No escucha eventos WebSocket
- ❌ Dashboard Doctor: No escucha eventos WebSocket
- ❌ Dashboard Paciente: No escucha eventos WebSocket
- ❌ No hay indicadores visuales de actualizaciones en tiempo real
- ❌ No hay notificaciones toast/banner cuando llegan eventos

---

## 🚀 Próximos Pasos Recomendados

### **Prioridad Alta:**
1. Integrar WebSocket en Dashboard Admin para escuchar `doctor_created`, `patient_created`, `patient_assigned`
2. Integrar WebSocket en Dashboard Doctor para escuchar `patient_assigned`, `patient_unassigned`
3. Agregar indicadores visuales (toast, banner) cuando lleguen eventos
4. Actualizar listas automáticamente sin necesidad de pull-to-refresh

### **Prioridad Media:**
1. Implementar notificaciones push para pacientes (`appointment_reminder`, `medication_reminder`)
2. Implementar sistema de "paciente en espera" para doctores
3. Agregar contador de conexiones WebSocket en Dashboard Admin

### **Prioridad Baja:**
1. Implementar sincronización offline/online
2. Agregar métricas de WebSocket (latencia, eventos por minuto)
3. Implementar reconnection visual feedback

---

## 📊 Métricas Disponibles

El backend expone métodos para obtener estadísticas:

```javascript
// En el backend:
realtimeService.getConnectionStats()
// Retorna: { total_connections, by_platform, by_role, uptime }

realtimeService.getConnectionsByPlatform()
// Retorna: { android: 2, ios: 1 }

realtimeService.getConnectionsByRole()
// Retorna: { Admin: 1, Doctor: 2, Paciente: 3 }
```

---

## 🔍 Verificación de Conexión

### **En el Frontend:**
```javascript
import useWebSocket from '../hooks/useWebSocket';

const { isConnected, socket } = useWebSocket();

// Verificar estado
console.log('WebSocket conectado:', isConnected);
console.log('Socket ID:', socket?.id);
```

### **En los Logs del Backend:**
```
📱 Cliente conectado: 1 - android - device_xxx
📱 Cliente desconectado: 1
```

---

## ⚠️ Notas Importantes

1. **WebSocket se conecta automáticamente** cuando el usuario inicia sesión
2. **Los eventos se emiten por rol**, no individualmente (excepto `sendToUser`)
3. **El heartbeat (`ping`/`pong`) se ejecuta cada 30 segundos** automáticamente
4. **La reconexión es automática** si se pierde la conexión
5. **Los eventos solo funcionan si el usuario está autenticado** (requiere token JWT)

---

## 🎬 Demo Rápida

### **Escenario de Prueba:**

1. **Dispositivo 1 (Admin):**
   - Abre Dashboard Admin
   - Verifica que WebSocket esté conectado (ver logs)

2. **Dispositivo 2 (Doctor):**
   - Abre Dashboard Doctor
   - Verifica que WebSocket esté conectado

3. **En Dispositivo 1:**
   - Crea un nuevo paciente
   - Asigna el paciente a un doctor

4. **En Dispositivo 2:**
   - **Debería ver:** El paciente aparece automáticamente en la lista sin recargar

---

## 📝 Eventos que Necesitan Implementación en Frontend

Para que los eventos funcionen visualmente, necesitas:

1. **Suscribirse a eventos en los dashboards:**
   ```javascript
   const { subscribeToEvent } = useWebSocket();
   
   useEffect(() => {
     const unsubscribe = subscribeToEvent('patient_created', (data) => {
       // Actualizar lista de pacientes
       refreshPacientes();
     });
     
     return unsubscribe;
   }, []);
   ```

2. **Mostrar notificaciones toast:**
   ```javascript
   subscribeToEvent('patient_assigned', (data) => {
     showToast(`Nuevo paciente asignado: ${data.paciente_nombre}`);
     refreshPacientes();
   });
   ```

3. **Actualizar métricas en tiempo real:**
   ```javascript
   subscribeToEvent('doctor_created', (data) => {
     // Incrementar contador de doctores
     setTotalDoctores(prev => prev + 1);
   });
   ```

---

## ✅ Checklist de Implementación

- [ ] Dashboard Admin escucha `doctor_created`
- [ ] Dashboard Admin escucha `patient_created`
- [ ] Dashboard Admin escucha `patient_assigned`
- [ ] Dashboard Admin escucha `patient_unassigned`
- [ ] Dashboard Doctor escucha `patient_assigned`
- [ ] Dashboard Doctor escucha `patient_unassigned`
- [ ] Indicadores visuales de actualizaciones (toast/banner)
- [ ] Actualización automática de listas
- [ ] Contador de conexiones WebSocket en Admin
- [ ] Notificaciones push para pacientes
- [ ] Sistema de "paciente en espera" para doctores

