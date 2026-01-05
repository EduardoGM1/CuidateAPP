# WebSockets Disponibles para Pacientes - Guía de Pruebas

## 📋 Eventos WebSocket Implementados para Pacientes

### ✅ Eventos Activos en Pantallas de Paciente

#### 1. **MisCitas.js** - Gestión de Citas
Los siguientes eventos están suscritos y funcionando:

- **`cita_creada`** - Nueva cita creada
- **`cita_actualizada`** - Cambio de estado de cita (atendida, cancelada, etc.)
- **`cita_reprogramada`** - Cita reprogramada por el doctor
- **`solicitud_reprogramacion`** - Respuesta a solicitud de reprogramación

#### 2. **RegistrarSignosVitales.js** - Registro de Signos Vitales
Los siguientes eventos están suscritos:

- **`signos_vitales_registrados`** - Confirmación de registro exitoso
- **`alerta_signos_vitales_critica`** - Alerta crítica de signos vitales
- **`alerta_signos_vitales_moderada`** - Alerta moderada de signos vitales

---

## 🧪 Cómo Probar los WebSockets desde el Dashboard de Pacientes

### Prueba 1: Nueva Cita Creada (`cita_creada`)

**Pasos:**
1. Abre la app como **paciente** y ve a **"Mis Citas"**
2. En otra sesión (admin/doctor), crea una nueva cita para ese paciente
3. **Resultado esperado:**
   - La lista de citas se actualiza automáticamente
   - Vibración ligera + sonido de éxito
   - TTS anuncia: "Nueva cita programada para [fecha]"

**Verificación:**
- Revisa los logs del frontend: `Logger.info('MisCitas: Nueva cita recibida por WebSocket', data)`
- La cita aparece sin necesidad de refrescar manualmente

---

### Prueba 2: Cambio de Estado de Cita (`cita_actualizada`)

**Pasos:**
1. Abre la app como **paciente** y ve a **"Mis Citas"**
2. En otra sesión (admin/doctor), cambia el estado de una cita del paciente:
   - Marca como "atendida"
   - Marca como "cancelada"
   - Marca como "no asistida"
3. **Resultado esperado:**
   - El estado de la cita se actualiza en tiempo real en la lista
   - Vibración media
   - TTS anuncia el cambio según el estado:
     - "Tu cita ha sido marcada como atendida"
     - "Tu cita ha sido cancelada"
     - "Tu cita ha sido marcada como no asistida"

**Verificación:**
- El badge de estado cambia inmediatamente
- No necesitas refrescar la pantalla

---

### Prueba 3: Cita Reprogramada (`cita_reprogramada`)

**Pasos:**
1. Abre la app como **paciente** y ve a **"Mis Citas"**
2. En otra sesión (admin/doctor), reprograma una cita del paciente
3. **Resultado esperado:**
   - La lista de citas se recarga automáticamente
   - Vibración media + sonido de éxito
   - TTS anuncia: "Tu cita ha sido reprogramada para [nueva fecha]"

**Verificación:**
- La fecha de la cita se actualiza sin refrescar
- El estado cambia a "reprogramada"

---

### Prueba 4: Solicitud de Reprogramación (`solicitud_reprogramacion`)

**Pasos:**
1. Abre la app como **paciente** y ve a **"Mis Citas"**
2. Solicita una reprogramación desde la app del paciente
3. En otra sesión (admin/doctor), responde a la solicitud
4. **Resultado esperado:**
   - La lista de solicitudes se actualiza automáticamente
   - El estado de la solicitud cambia (aprobada/rechazada)

**Verificación:**
- Revisa el modal de "Mis Solicitudes"
- El estado se actualiza sin refrescar

---

### Prueba 5: Signos Vitales Registrados (`signos_vitales_registrados`)

**Pasos:**
1. Abre la app como **paciente** y ve a **"Registrar Signos Vitales"**
2. Completa el formulario y envía los signos vitales
3. **Resultado esperado:**
   - Confirmación inmediata vía WebSocket (además de la respuesta HTTP)
   - Los signos vitales se guardan correctamente

**Verificación:**
- Revisa los logs: `Logger.info('RegistrarSignosVitales: Confirmación de registro recibida por WebSocket', data)`
- El evento se recibe casi instantáneamente después del guardado

---

### Prueba 6: Alertas de Signos Vitales (`alerta_signos_vitales_critica` / `alerta_signos_vitales_moderada`)

**Pasos:**
1. Abre la app como **paciente** y ve a **"Registrar Signos Vitales"**
2. Ingresa valores fuera de rango (ej: presión muy alta, glucosa muy alta)
3. **Resultado esperado:**
   - Si hay alerta crítica: evento `alerta_signos_vitales_critica`
   - Si hay alerta moderada: evento `alerta_signos_vitales_moderada`
   - Las alertas se procesan y muestran al paciente

**Verificación:**
- Revisa los logs del frontend
- Las alertas se muestran en la UI

---

## 🔍 Verificar Conexión WebSocket

### Estado de Conexión
En cualquier pantalla de paciente, puedes verificar el estado de la conexión WebSocket:

```javascript
const { isConnected } = useWebSocket();
// isConnected será true si está conectado
```

### Logs de Debug
Los siguientes logs te ayudarán a verificar que los eventos están llegando:

1. **En MisCitas.js:**
   - `Logger.info('MisCitas: Nueva cita recibida por WebSocket', data)`
   - `Logger.info('MisCitas: Cita actualizada recibida por WebSocket', data)`
   - `Logger.info('MisCitas: Cita reprogramada recibida por WebSocket', data)`

2. **En RegistrarSignosVitales.js:**
   - `Logger.info('RegistrarSignosVitales: Confirmación de registro recibida por WebSocket', data)`
   - `Logger.info('RegistrarSignosVitales: Alerta crítica recibida por WebSocket', data)`

3. **Heartbeat (ping/pong):**
   - `Logger.debug('WebSocket: Evento enviado {event: 'ping', data: undefined}')`
   - `Logger.debug('WebSocket: Pong recibido {timestamp: ...}')`

---

## 🎯 Escenarios de Prueba Recomendados

### Escenario Completo 1: Flujo de Cita
1. **Paciente** abre "Mis Citas"
2. **Admin/Doctor** crea una nueva cita → Debe aparecer automáticamente
3. **Admin/Doctor** cambia estado a "atendida" → Debe actualizarse automáticamente
4. **Admin/Doctor** reprograma la cita → Debe actualizarse con nueva fecha

### Escenario Completo 2: Flujo de Signos Vitales
1. **Paciente** abre "Registrar Signos Vitales"
2. **Paciente** registra signos vitales con valores normales → Confirmación inmediata
3. **Paciente** registra signos vitales con valores críticos → Alerta en tiempo real
4. **Doctor** (en otra sesión) ve la alerta en su dashboard automáticamente

---

## ⚠️ Notas Importantes

1. **WebSocket debe estar inicializado:** Verifica que el servidor backend tenga WebSocket activo
2. **Autenticación:** El paciente debe estar autenticado para recibir eventos
3. **Filtrado por paciente:** Los eventos solo llegan al paciente correspondiente (`data.id_paciente === pacienteId`)
4. **Manejo de errores:** Si WebSocket falla, la funcionalidad HTTP sigue funcionando (no bloquea)

---

## 📊 Eventos Disponibles en Backend (Emitidos)

### Desde `cita.js`:
- `cita_creada` → Notifica a paciente, doctor y admin
- `cita_actualizada` → Notifica a paciente, doctor y admin
- `cita_reprogramada` → Notifica a paciente, doctor y admin
- `solicitud_reprogramacion` → Notifica a doctor y admin

### Desde `pacienteMedicalData.js`:
- `signos_vitales_registrados` → Notifica a paciente y doctores asignados
- `alerta_signos_vitales_critica` → Notifica a paciente, doctores y admin
- `alerta_signos_vitales_moderada` → Notifica a paciente y doctores

### Desde `pushNotificationService.js`:
- `notificacion_doctor` → Notifica a doctor específico

---

## 🚀 Próximos Pasos

Para probar desde el dashboard de pacientes:

1. **Abre la app como paciente**
2. **Navega a "Mis Citas"** o **"Registrar Signos Vitales"**
3. **En otra sesión (admin/doctor)**, realiza acciones que generen eventos
4. **Observa las actualizaciones en tiempo real** sin necesidad de refrescar

Los eventos se procesan automáticamente y actualizan la UI con feedback visual, sonoro y TTS.


