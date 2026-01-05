# 🔍 Comparación: Chat Doctor vs Chat Paciente

## ❌ PROBLEMAS ENCONTRADOS

### 1. **ChatPaciente.js (Doctor) - NO usa refs para evitar closure stale**

**Problema:**
```javascript
// ChatPaciente.js línea 276-322
const unsubscribePush = chatNotificationService.onNuevoMensaje((data) => {
  // ❌ Usa pacienteId directamente (closure stale)
  const currentPacienteId = pacienteId; // Puede estar desactualizado
  
  if (dataPacienteId === currentPacienteId) {
    cargarMensajes(false); // ❌ Usa cargarMensajes directamente
  }
});
```

**Solución en ChatDoctor.js:**
```javascript
// ChatDoctor.js línea 358-436
const unsubscribePush = chatNotificationService.onNuevoMensaje((data) => {
  // ✅ Usa ref para obtener valor actual
  const currentPacienteIdFromRef = pacienteIdRef.current;
  
  if (dataPacienteId === currentPacienteIdFromRef) {
    // ✅ Usa ref para función
    cargarMensajesRef.current(false);
  }
});
```

### 2. **ChatPaciente.js - Dependencias del useEffect incluyen cargarMensajes**

**Problema:**
```javascript
// ChatPaciente.js línea 322
}, [pacienteId, cargarMensajes]); // ❌ Incluye cargarMensajes
```

**Solución en ChatDoctor.js:**
```javascript
// ChatDoctor.js línea 436
}, [pacienteId]); // ✅ Solo pacienteId, funciones vienen de refs
```

### 3. **ChatPaciente.js - WebSocket usa cargarMensajes() sin parámetro**

**Problema:**
```javascript
// ChatPaciente.js línea 230
cargarMensajes(); // ❌ Sin parámetro, muestra loading
```

**Solución en ChatDoctor.js:**
```javascript
// ChatDoctor.js línea 280
cargarMensajes(false); // ✅ Con parámetro false, no muestra loading
```

---

## ✅ CORRECCIONES NECESARIAS

### 1. Añadir refs en ChatPaciente.js
- `pacienteIdRef` para evitar closure stale
- `cargarMensajesRef` para función actualizada

### 2. Actualizar useEffect de push notifications
- Usar refs en lugar de valores directos
- Simplificar dependencias

### 3. Actualizar WebSocket
- Usar `cargarMensajes(false)` en lugar de `cargarMensajes()`



