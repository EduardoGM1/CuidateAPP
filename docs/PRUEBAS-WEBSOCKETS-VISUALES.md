# 🧪 Guía de Pruebas Visuales - WebSockets en Tiempo Real

## 🎯 Objetivo

Probar y visualizar las funcionalidades WebSocket en tiempo real en los dashboards de Admin, Doctor y Paciente.

---

## ✅ Eventos Disponibles para Probar

### **1. Eventos Activos (Ya Emitidos desde Backend)**

| Evento | Cuándo se Emite | Quién lo Recibe | Dónde Probar |
|--------|----------------|-----------------|--------------|
| `doctor_created` | Al crear un doctor | Admin, Doctor | Dashboard Admin |
| `patient_created` | Al crear un paciente | Admin, Doctor | Dashboard Admin |
| `patient_assigned` | Al asignar paciente a doctor | Admin, Doctor | Dashboard Admin, Dashboard Doctor |
| `patient_unassigned` | Al desasignar paciente | Admin, Doctor | Dashboard Admin, Dashboard Doctor |

### **2. Eventos de Sistema (Siempre Activos)**

| Evento | Descripción | Frecuencia |
|--------|-------------|------------|
| `ping` / `pong` | Heartbeat de conexión | Cada 30 segundos |
| `sync_status` | Estado de sincronización | Al solicitar |
| `server_info` | Información del servidor | Al solicitar |

---

## 🚀 Configuración para Pruebas

### **Paso 1: Verificar que WebSocket esté funcionando**

1. **Abre la consola del backend** y verifica:
   ```
   🚀 WebSocket server initialized for mobile app
   ```

2. **Abre la app móvil** y verifica en los logs:
   ```
   WebSocket: Conectado exitosamente
   ```

### **Paso 2: Preparar Dispositivos**

**Opción A: Dos Dispositivos Físicos**
- Dispositivo 1: Login como Admin
- Dispositivo 2: Login como Doctor

**Opción B: Emulador + Dispositivo Físico**
- Emulador: Login como Admin
- Dispositivo Físico: Login como Doctor

**Opción C: Mismo Dispositivo (Dos Sesiones)**
- Abre la app dos veces (si es posible)
- O usa modo incógnito/privado

---

## 🧪 Pruebas Visuales Paso a Paso

### **Prueba 1: Crear Doctor en Tiempo Real** ⭐

**Objetivo:** Ver cómo aparece un nuevo doctor automáticamente en el dashboard.

**Pasos:**
1. **Dispositivo 1 (Admin):**
   - Abre Dashboard Admin
   - Ve a "Gestión" → "Doctores"
   - **NO cierres esta pantalla**

2. **Dispositivo 2 (Admin o Doctor):**
   - Abre Dashboard Admin
   - Ve a "Gestión" → "Doctores"
   - Crea un nuevo doctor (botón "Agregar Doctor")
   - Completa el formulario y guarda

3. **En Dispositivo 1:**
   - **Deberías ver:** El nuevo doctor aparece automáticamente en la lista
   - **Sin necesidad de:** Recargar, deslizar hacia abajo, o salir y volver

**Evento WebSocket:**
```javascript
// Backend emite automáticamente:
realtimeService.sendToRole('Admin', 'doctor_created', {
  id_doctor: 5,
  nombre: 'Dr. Nuevo',
  // ...
});
```

**Resultado Esperado:**
- ✅ Lista de doctores se actualiza automáticamente
- ✅ Contador de "Doctores Activos" se incrementa
- ✅ No hay necesidad de recargar manualmente

---

### **Prueba 2: Crear Paciente en Tiempo Real** ⭐

**Objetivo:** Ver cómo aparece un nuevo paciente automáticamente.

**Pasos:**
1. **Dispositivo 1 (Admin):**
   - Abre Dashboard Admin
   - Ve a "Gestión" → "Pacientes"
   - **NO cierres esta pantalla**

2. **Dispositivo 2 (Admin):**
   - Abre Dashboard Admin
   - Ve a "Gestión" → "Pacientes"
   - Crea un nuevo paciente
   - Completa el formulario y guarda

3. **En Dispositivo 1:**
   - **Deberías ver:** El nuevo paciente aparece automáticamente

**Evento WebSocket:**
```javascript
realtimeService.sendToRole('Admin', 'patient_created', {
  id_paciente: 10,
  nombre: 'Nuevo Paciente',
  // ...
});
```

**Resultado Esperado:**
- ✅ Lista de pacientes se actualiza automáticamente
- ✅ Contador de "Pacientes Totales" se incrementa
- ✅ Si el paciente tiene módulo, los doctores también lo ven

---

### **Prueba 3: Asignar Paciente a Doctor (Tiempo Real)** ⭐⭐⭐

**Objetivo:** Ver cómo un paciente aparece automáticamente en la lista del doctor.

**Pasos:**
1. **Dispositivo 1 (Doctor):**
   - Abre Dashboard Doctor
   - Ve a la sección "Mis Pacientes"
   - **NO cierres esta pantalla**
   - Anota cuántos pacientes tiene actualmente

2. **Dispositivo 2 (Admin):**
   - Abre Dashboard Admin
   - Ve a "Detalle Doctor" de un doctor específico
   - Asigna un paciente a ese doctor
   - Confirma la asignación

3. **En Dispositivo 1 (Doctor):**
   - **Deberías ver:** 
     - El nuevo paciente aparece automáticamente en "Mis Pacientes"
     - El contador de pacientes se incrementa
     - Una notificación (si está implementada)

**Evento WebSocket:**
```javascript
realtimeService.sendToRole('Admin', 'patient_assigned', {
  id_doctor: 1,
  id_paciente: 5,
  doctor_nombre: 'Dr. Juan',
  paciente_nombre: 'Eduardo Gonzalez',
  // ...
});

realtimeService.sendToRole('Doctor', 'patient_assigned', {
  // Mismo dato
});
```

**Resultado Esperado:**
- ✅ Doctor ve el paciente automáticamente
- ✅ Admin ve la actualización en tiempo real
- ✅ No hay necesidad de recargar

---

### **Prueba 4: Desasignar Paciente de Doctor (Tiempo Real)** ⭐⭐⭐

**Objetivo:** Ver cómo un paciente desaparece automáticamente de la lista del doctor.

**Pasos:**
1. **Dispositivo 1 (Doctor):**
   - Abre Dashboard Doctor
   - Ve a "Mis Pacientes"
   - Anota un paciente específico que esté asignado

2. **Dispositivo 2 (Admin):**
   - Abre Dashboard Admin
   - Ve a "Detalle Doctor"
   - Desasigna el paciente que anotaste
   - Confirma la desasignación

3. **En Dispositivo 1 (Doctor):**
   - **Deberías ver:** El paciente desaparece automáticamente de la lista

**Evento WebSocket:**
```javascript
realtimeService.sendToRole('Admin', 'patient_unassigned', {
  id_doctor: 1,
  id_paciente: 5,
  // ...
});
```

**Resultado Esperado:**
- ✅ Paciente desaparece de la lista del doctor
- ✅ Contador de pacientes se decrementa
- ✅ Actualización instantánea

---

## 🔍 Verificación de Conexión WebSocket

### **En el Frontend (Logs de la App):**

Busca en la consola de React Native:
```
[INFO] WebSocket: Conectado exitosamente { socketId: 'xxx', userId: 1 }
[DEBUG] WebSocket: Pong recibido { timestamp: 1234567890 }
```

### **En el Backend (Logs del Servidor):**

Busca en la consola del servidor:
```
📱 Cliente conectado: 1 - android - device_xxx
```

### **Verificar Estado de Conexión:**

En cualquier pantalla que use `useWebSocket`:
```javascript
const { isConnected } = useWebSocket();
console.log('WebSocket conectado:', isConnected);
```

---

## 📊 Indicadores Visuales Recomendados

### **1. Badge de Conexión WebSocket**

Agregar un pequeño indicador en los dashboards:
- 🟢 Verde: WebSocket conectado
- 🔴 Rojo: WebSocket desconectado
- 🟡 Amarillo: Reconectando

### **2. Toast/Banner de Actualizaciones**

Cuando llegue un evento:
- Mostrar un banner temporal: "Nuevo doctor agregado"
- Auto-ocultar después de 3 segundos
- Permitir hacer clic para ver detalles

### **3. Animación de Actualización**

Cuando se actualice una lista:
- Mostrar una animación sutil
- Resaltar el nuevo elemento por 2 segundos
- Sonido opcional (si está habilitado)

---

## 🐛 Troubleshooting

### **Problema: Los eventos no llegan**

**Solución:**
1. Verifica que el backend esté ejecutándose
2. Verifica que WebSocket esté conectado (logs)
3. Verifica que el usuario esté autenticado (token válido)
4. Verifica que ambos dispositivos estén en la misma red

### **Problema: Eventos llegan pero no se actualiza la UI**

**Solución:**
1. Verifica que el componente esté suscrito al evento
2. Verifica que el hook `useRealtimeList` esté configurado
3. Verifica que `refresh` se esté llamando correctamente

### **Problema: WebSocket se desconecta frecuentemente**

**Solución:**
1. Verifica la conexión a internet
2. Verifica que el servidor no esté reiniciándose
3. Verifica los logs del backend para errores

---

## 📝 Checklist de Pruebas

### **Dashboard Admin:**
- [ ] Crear doctor → Ver actualización en tiempo real
- [ ] Crear paciente → Ver actualización en tiempo real
- [ ] Asignar paciente → Ver actualización en tiempo real
- [ ] Desasignar paciente → Ver actualización en tiempo real
- [ ] Ver indicador de conexión WebSocket

### **Dashboard Doctor:**
- [ ] Asignar paciente → Ver paciente aparecer automáticamente
- [ ] Desasignar paciente → Ver paciente desaparecer automáticamente
- [ ] Ver notificaciones en tiempo real
- [ ] Ver indicador de conexión WebSocket

### **Dashboard Paciente:**
- [ ] (Pendiente: Recordatorios de citas)
- [ ] (Pendiente: Recordatorios de medicamentos)
- [ ] Ver indicador de conexión WebSocket

---

## 🎬 Demo Rápida (2 Minutos)

1. **Abre Dashboard Admin en dispositivo 1**
2. **Abre Dashboard Admin en dispositivo 2**
3. **En dispositivo 2:** Crea un nuevo doctor
4. **En dispositivo 1:** Deberías ver el doctor aparecer automáticamente
5. **✅ Éxito:** WebSocket funciona correctamente

---

## 📚 Referencias

- **Backend:** `api-clinica/services/realtimeService.js`
- **Frontend Hook:** `ClinicaMovil/src/hooks/useWebSocket.js`
- **Frontend Lista:** `ClinicaMovil/src/hooks/useRealtimeList.js`
- **Guía Completa:** `docs/GUIA-WEBSOCKETS-TIEMPO-REAL.md`

