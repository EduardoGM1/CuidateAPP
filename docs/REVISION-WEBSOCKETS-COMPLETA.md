# 🔍 REVISIÓN COMPLETA DE WEBSOCKETS - PROBLEMAS Y SOLUCIONES

## ❌ PROBLEMAS CRÍTICOS ENCONTRADOS Y CORREGIDOS

### 1. **PROBLEMA PRINCIPAL: `sendToUser` usaba `socketId` incorrectamente**

**Problema:**
```javascript
// ❌ INCORRECTO - No funciona
this.io.to(socketId).emit(event, data);
```

**Solución:**
```javascript
// ✅ CORRECTO - Usa la sala del usuario
const userRoom = `user_${userId}`;
this.io.to(userRoom).emit(event, data);
```

**Razón:** Cuando un usuario se conecta, se une a la sala `user_${userId}`, no al `socketId` directamente. El `socketId` puede cambiar si el usuario se reconecta.

### 2. **PROBLEMA: `sendToPaciente` no verificaba si había clientes**

**Problema:** Enviaba eventos a salas vacías sin verificar.

**Solución:** Ahora verifica si hay clientes en la sala antes de enviar:
```javascript
const room = this.io.sockets.adapter.rooms.get(salaPaciente);
const hasClients = room && room.size > 0;
if (hasClients) {
  this.io.to(salaPaciente).emit(event, data);
}
```

### 3. **PROBLEMA: `sendToRole` no normalizaba roles**

**Problema:** `sendToRole('Admin', ...)` no funcionaba porque la sala es `admins_notifications`, no `Admins_notifications`.

**Solución:** Normaliza los nombres de roles:
```javascript
if (roleName === 'admin' || roleName === 'administrador') {
  salaRole = 'admins_notifications';
} else if (roleName === 'doctor' || roleName === 'doctores') {
  salaRole = 'doctors_notifications';
}
```

## ✅ CORRECCIONES APLICADAS

### Backend (`api-clinica/services/realtimeService.js`)

1. ✅ **`sendToUser`** - Ahora usa salas `user_${userId}` en lugar de `socketId`
2. ✅ **`sendToPaciente`** - Verifica clientes antes de enviar
3. ✅ **`sendToRole`** - Normaliza roles y verifica clientes
4. ✅ **Logs mejorados** - Todos los métodos ahora tienen logs detallados con `[WS]`
5. ✅ **Logs de conexión** - Se registra cuando usuarios se unen a salas

### Backend - Controladores

1. ✅ **`cita.js`** - Todos los eventos ahora usan sistema dual (id_usuario + id_paciente)
2. ✅ **`pacienteMedicalData.js`** - Signos vitales y alertas usan sistema dual
3. ✅ **Logs detallados** - Todos los eventos tienen logs con `[WS-BACKEND]`

### Frontend

1. ✅ **Actualización optimista** - Las citas se agregan inmediatamente al estado
2. ✅ **Logs mejorados** - `WSLogger` con emojis y colores
3. ✅ **Comparación de IDs** - Maneja string vs number correctamente

## 📋 EVENTOS WEBSOCKET DISPONIBLES

### Eventos de Citas
- ✅ `cita_creada` - Nueva cita creada
- ✅ `cita_actualizada` - Estado de cita cambiado
- ✅ `cita_reprogramada` - Cita reprogramada
- ✅ `solicitud_reprogramacion` - Solicitud de reprogramación

### Eventos de Signos Vitales
- ✅ `signos_vitales_registrados` - Signos vitales registrados
- ✅ `alerta_signos_vitales_critica` - Alerta crítica
- ✅ `alerta_signos_vitales_moderada` - Alerta moderada

### Eventos de Notificaciones
- ✅ `notificacion_doctor` - Notificación para doctor

### Eventos de Gestión
- ✅ `doctor_created` - Nuevo doctor creado
- ✅ `patient_created` - Nuevo paciente creado
- ✅ `patient_assigned` - Paciente asignado a doctor
- ✅ `patient_unassigned` - Paciente desasignado

## 🔧 CÓMO PROBAR

### 1. Verificar Conexión WebSocket

**Backend:**
```bash
# Deberías ver en los logs:
📱 [WS] Usuario X (Paciente) unido a sala user_X (socket: abc123)
📱 [WS] Paciente 1 unido a sala paciente_1 (socket: abc123)
```

**Frontend:**
```bash
# Deberías ver en los logs:
🟢 [WS-CONNECTION] Conectado exitosamente
📡 [WS-SUBSCRIBE] cita_creada
```

### 2. Probar Evento `cita_creada`

1. **Backend:** Crea una cita desde admin/doctor
2. **Backend logs:** Deberías ver:
   ```
   📤 [WS] Evento cita_creada enviado a usuario X (sala: user_X, clientes: 1)
   📤 [WS] Evento cita_creada enviado a paciente 1 (sala: paciente_1, clientes: 1)
   ```
3. **Frontend logs:** Deberías ver:
   ```
   📅 [WS-RECEIVED] cita_creada
   ✅ [WS-PROCESSED] cita_creada { coinciden: true }
   ✅ [WS-SUCCESS] Cita agregada optimistamente al estado
   ```

### 3. Verificar Salas

El backend ahora verifica si hay clientes en las salas antes de enviar. Si no hay clientes, verás:
```
⚠️ [WS] No hay clientes en sala paciente_X para evento cita_creada
```

Esto indica que el paciente no está conectado o no se unió correctamente a la sala.

## 🐛 DIAGNÓSTICO DE PROBLEMAS

### Problema: Eventos no llegan al frontend

**Verificar:**
1. ✅ ¿El usuario está conectado? (buscar `[WS-CONNECTION] Conectado`)
2. ✅ ¿El usuario se unió a la sala? (buscar `unido a sala user_X`)
3. ✅ ¿El paciente se unió a la sala del paciente? (buscar `unido a sala paciente_X`)
4. ✅ ¿El backend está enviando? (buscar `[WS] Evento X enviado`)
5. ✅ ¿Hay clientes en la sala? (buscar `clientes: X`)

### Problema: Eventos llegan pero no se procesan

**Verificar:**
1. ✅ ¿Los IDs coinciden? (buscar `coinciden: true/false`)
2. ✅ ¿El callback está registrado? (buscar `Suscripción a X registrada exitosamente`)

## 📊 LOGS DE REFERENCIA

### Conexión Exitosa (Backend)
```
📱 Cliente conectado: 1 - mobile - device123
📱 [WS] Usuario 1 (Paciente) unido a sala user_1 (socket: abc123)
📱 [WS] Paciente 1 unido a sala paciente_1 (socket: abc123)
```

### Evento Enviado (Backend)
```
📤 [WS] Evento cita_creada enviado a usuario 1 (sala: user_1, socket: abc123, clientes: 1)
📤 [WS] Evento cita_creada enviado a paciente 1 (sala: paciente_1, clientes: 1)
```

### Evento Recibido (Frontend)
```
📅 [WS-RECEIVED] cita_creada
✅ [WS-PROCESSED] cita_creada { coinciden: true }
✅ [WS-SUCCESS] Cita agregada optimistamente al estado
```

## 🎯 PRÓXIMOS PASOS

1. ✅ Reiniciar el servidor backend para aplicar cambios
2. ✅ Probar crear una cita desde admin/doctor
3. ✅ Verificar logs en backend y frontend
4. ✅ Confirmar que la cita aparece inmediatamente en "Mis Citas"

## 📝 NOTAS IMPORTANTES

- **Sistema Dual:** Todos los eventos ahora se envían por `id_usuario` Y por `id_paciente` (sala) como fallback
- **Logs Detallados:** Todos los métodos tienen logs con prefijos `[WS]` y `[WS-BACKEND]` para fácil identificación
- **Verificación de Salas:** El backend ahora verifica si hay clientes antes de enviar, evitando envíos a salas vacías
- **Actualización Optimista:** El frontend actualiza la UI inmediatamente, luego sincroniza con el servidor


