# 📱 TIPOS DE NOTIFICACIONES PUSH

**Fecha:** 31 de Diciembre, 2025

---

## 📋 RESUMEN DE TIPOS DE NOTIFICACIONES

El sistema envía diferentes tipos de notificaciones push según el evento. A continuación se detallan todos los tipos implementados:

---

## 🎯 NOTIFICACIONES PARA PACIENTES

### **1. Notificaciones de Citas** 📅

#### **1.1. Nueva Cita Creada** (`cita_creada`)
- **Título:** "📅 Nueva Cita Programada"
- **Mensaje:** "Tienes una nueva cita médica programada para el [fecha formateada]"
- **Cuándo se envía:** Cuando un doctor/admin crea una nueva cita para el paciente
- **Datos incluidos:**
  - `id_cita`
  - `id_paciente`
  - `fecha_cita`
  - `tipo: 'cita_creada'`

#### **1.2. Cita Actualizada** (`cita_actualizada`)
- **Título:** "📅 Actualización de Cita"
- **Mensajes según estado:**
  - `atendida`: "Tu cita médica ha sido marcada como atendida"
  - `cancelada`: "Tu cita médica ha sido cancelada"
  - `reprogramada`: "Tu cita médica ha sido reprogramada"
  - `no_asistida`: "Tu cita médica ha sido marcada como no asistida"
  - `pendiente`: "El estado de tu cita ha sido actualizado"
- **Cuándo se envía:** Cuando se cambia el estado de una cita
- **Datos incluidos:**
  - `id_cita`
  - `id_paciente`
  - `fecha_cita`
  - `tipo: 'cita_actualizada'`

#### **1.3. Cita Reprogramada** (`cita_reprogramada`)
- **Título:** "📅 Cita Reprogramada"
- **Mensaje:** "Tu cita médica ha sido reprogramada para el [fecha nueva formateada]"
- **Cuándo se envía:** Cuando se reprograma una cita
- **Datos incluidos:**
  - `id_cita`
  - `id_paciente`
  - `fecha_cita` (nueva fecha)
  - `tipo: 'cita_reprogramada'`

#### **1.4. Recordatorio de Cita** (`recordatorio_cita` / `appointment_reminder`)
- **Títulos según tiempo restante:**
  - `30 minutos`: "🚨 Cita en 30 Minutos"
  - `1 hora`: "⏰ Cita en 1 Hora"
  - `2 horas`: "⏰ Cita en 2 Horas"
  - `5 horas`: "⏰ Cita Muy Próxima"
  - `24 horas`: "📅 Recordatorio de Cita"
- **Mensaje:** Incluye motivo, doctor, fecha y hora
- **Cuándo se envía:** Automáticamente por cron job (30 min, 1h, 2h, 5h, 24h antes)
- **Datos incluidos:**
  - `citaId`
  - `fechaCita`
  - `doctorNombre`
  - `tiempo` (tiempo restante)
  - `tipo: 'recordatorio_cita'`

---

### **2. Notificaciones de Medicamentos** 💊

#### **2.1. Recordatorio de Medicamento** (`recordatorio_medicamento` / `medication_reminder`)
- **Título:** "💊 Recordatorio de Medicamento"
- **Mensaje:** "TOMA EL MEDICAMENTO: [NOMBRE]\nDosis: [DOSIS]\n[INSTRUCCIONES]"
- **Cuándo se envía:** Automáticamente por cron job cuando es hora de tomar medicamento
- **Ventanas de notificación:**
  - **Desarrollo:** 30 segundos antes + en el horario exacto
  - **Producción:** 30 minutos antes + en el horario exacto
- **Datos incluidos:**
  - `planId`
  - `detalleId`
  - `medicamentoNombre`
  - `dosis`
  - `instructions`
  - `tipo: 'recordatorio_medicamento'`

---

### **3. Notificaciones de Mensajes** 💬

#### **3.1. Nuevo Mensaje** (`nuevo_mensaje`)
- **Título:** 
  - Si es de paciente: "💬 Nuevo mensaje de [nombre paciente]"
  - Si es de doctor: "💬 Nuevo mensaje de [nombre doctor]"
- **Mensaje:** Preview del mensaje (primeros caracteres)
- **Cuándo se envía:** Cuando se recibe un nuevo mensaje en el chat
- **Datos incluidos:**
  - `id_mensaje`
  - `id_paciente`
  - `id_doctor`
  - `preview_mensaje`
  - `tipo: 'nuevo_mensaje'`

---

### **4. Notificaciones de Resultados** 🧪

#### **4.1. Resultado de Examen** (`test_result`)
- **Título:** "Resultado de Examen"
- **Mensaje:** "Tus resultados de laboratorio están listos"
- **Cuándo se envía:** Cuando hay resultados de laboratorio disponibles
- **Datos incluidos:**
  - `test_id`
  - `test_type`
  - `result_status`
  - `doctor_notes`
  - `tipo: 'test_result'`

---

### **5. Notificaciones de Alertas** 🚨

#### **5.1. Alerta Médica** (`emergency_alert`)
- **Título:** "🚨 Alerta Médica"
- **Mensaje:** Mensaje personalizado de la alerta
- **Cuándo se envía:** En caso de emergencia médica
- **Datos incluidos:**
  - `alert_id`
  - `severity` (severidad)
  - `action_required` (acción requerida)
  - `tipo: 'emergency_alert'`

---

## 🎯 NOTIFICACIONES PARA DOCTORES

### **1. Notificaciones de Citas** 📅

#### **1.1. Nueva Cita Asignada** (`cita_creada`)
- **Título:** "📅 Nueva Cita Asignada"
- **Mensaje:** "Tienes una nueva cita programada para el [fecha formateada]"
- **Cuándo se envía:** Cuando se asigna una nueva cita al doctor
- **Datos incluidos:**
  - `id_cita`
  - `id_paciente`
  - `fecha_cita`
  - `paciente_nombre`
  - `tipo: 'cita_creada'`

#### **1.2. Solicitud de Reprogramación** (`solicitud_reprogramacion`)
- **Título:** "📅 Solicitud de Reprogramación"
- **Mensaje:** "[Nombre paciente] solicitó reprogramar su cita del [fecha original]"
- **Cuándo se envía:** Cuando un paciente solicita reprogramar una cita
- **Datos incluidos:**
  - `id_cita`
  - `id_paciente`
  - `fecha_cita_original`
  - `paciente_nombre`
  - `tipo: 'solicitud_reprogramacion'`

#### **1.3. Citas Actualizadas Automáticamente** (`citas_actualizadas`)
- **Título:** "📋 Citas Actualizadas Automáticamente"
- **Mensaje:** "[N] citas fueron marcadas como 'no asistida' por fecha pasada"
- **Cuándo se envía:** Automáticamente por cron job cuando hay citas pasadas sin atender
- **Datos incluidos:**
  - `totalCitas`
  - `citas` (array con detalles)
  - `tipo: 'citas_actualizadas'`

---

### **2. Notificaciones de Signos Vitales** ⚠️

#### **2.1. Alerta Signos Vitales** (`alerta_signos_vitales` / `alerta_paciente` / `alerta_salud`)
- **Título:** 
  - Crítica: "🚨 Alerta Signos Vitales Fuera de Rango"
  - Normal: "⚠️ Alerta Signos Vitales Fuera de Rango"
- **Mensaje:** "[Nombre paciente] tiene signos vitales fuera del rango normal. Tipo: [tipo]. Valor: [valor]. Rango normal: [rango]"
- **Cuándo se envía:** Cuando un paciente registra signos vitales fuera del rango normal
- **Datos incluidos:**
  - `pacienteId`
  - `paciente_nombre`
  - `tipo` (tipo de signo vital)
  - `valor` (valor registrado)
  - `rangoNormal` (rango esperado)
  - `severidad` ('critica' o 'normal')
  - `tipo: 'alerta_signos_vitales'`

---

### **3. Notificaciones de Mensajes** 💬

#### **3.1. Nuevo Mensaje de Paciente** (`nuevo_mensaje`)
- **Título:** "💬 Nuevo Mensaje"
- **Mensaje:** "[Nombre paciente]: [preview del mensaje]"
- **Cuándo se envía:** Cuando un paciente envía un mensaje al doctor
- **Datos incluidos:**
  - `id_mensaje`
  - `id_paciente`
  - `paciente_nombre`
  - `preview_mensaje`
  - `tipo: 'nuevo_mensaje'`

---

### **4. Notificaciones de Registro de Paciente** 📝

#### **4.1. Paciente Registró Signos Vitales** (`paciente_registro_signos`)
- **Título:** "📊 Nuevo Registro de Signos Vitales"
- **Mensaje:** "[Nombre paciente] registró nuevos signos vitales"
- **Cuándo se envía:** Cuando un paciente registra signos vitales
- **Datos incluidos:**
  - `id_paciente`
  - `paciente_nombre`
  - `tipo: 'paciente_registro_signos'`

---

### **5. Notificaciones de Auditoría** 🔍

#### **5.1. Alerta de Auditoría** (`alerta_auditoria`)
- **Título:** Título personalizado según el tipo de alerta
- **Mensaje:** Mensaje personalizado de la alerta
- **Cuándo se envía:** Para administradores, cuando hay eventos de auditoría importantes
- **Datos incluidos:**
  - `tipoAccion`
  - `entidad`
  - `detalles`
  - `tipo: 'alerta_auditoria'`

---

## 📊 RESUMEN POR TIPO

| Tipo | Destinatario | Descripción | Frecuencia |
|------|-------------|-------------|------------|
| `cita_creada` | Paciente/Doctor | Nueva cita creada/asignada | Evento |
| `cita_actualizada` | Paciente | Estado de cita cambiado | Evento |
| `cita_reprogramada` | Paciente | Cita reprogramada | Evento |
| `recordatorio_cita` | Paciente | Recordatorio antes de cita | Automático (cron) |
| `recordatorio_medicamento` | Paciente | Hora de tomar medicamento | Automático (cron) |
| `nuevo_mensaje` | Paciente/Doctor | Nuevo mensaje en chat | Evento |
| `test_result` | Paciente | Resultados de laboratorio | Evento |
| `emergency_alert` | Paciente | Alerta médica de emergencia | Evento |
| `solicitud_reprogramacion` | Doctor | Paciente solicita reprogramar | Evento |
| `citas_actualizadas` | Doctor | Citas marcadas automáticamente | Automático (cron) |
| `alerta_signos_vitales` | Doctor | Signos vitales fuera de rango | Evento |
| `paciente_registro_signos` | Doctor | Paciente registró signos vitales | Evento |
| `alerta_auditoria` | Admin | Evento de auditoría importante | Evento |

---

## 🔧 CONFIGURACIÓN

### **Plataformas Soportadas:**
- ✅ **Android:** Firebase Cloud Messaging (FCM)
- ✅ **iOS:** Apple Push Notification Service (APNs)

### **Canales de Notificación (Android):**
- `clinica-movil-reminders` - Canal principal para recordatorios

### **Prioridad:**
- **High** - Para todas las notificaciones importantes
- **TTL:** 1 hora (3600000ms) para dispositivos restrictivos

---

## 📱 CARACTERÍSTICAS TÉCNICAS

### **Datos Incluidos en Notificaciones:**
- `type` - Tipo de notificación
- `data` - Datos adicionales (JSON stringificado)
- `timestamp` - Timestamp del envío

### **Configuración Android:**
- Priority: `high`
- Sound: `default`
- Channel: `clinica-movil-reminders`
- Visibility: `public` (visible en pantalla bloqueada)
- TTL: 1 hora

### **Configuración iOS:**
- Sound: `default`
- Badge: `1`
- Content-available: `1`

---

## 🎯 FLUJO DE NOTIFICACIONES

1. **Evento ocurre** (creación de cita, registro de signos, etc.)
2. **Backend detecta el evento**
3. **Se envía WebSocket** (para actualización en tiempo real)
4. **Se envía notificación push** (para notificar al teléfono)
5. **Se guarda en BD** (para doctores, se guarda en `notificaciones_doctor`)
6. **Usuario recibe notificación** en su dispositivo

---

## ⚠️ NOTAS IMPORTANTES

- Las notificaciones push son **asíncronas** y **no bloquean** la respuesta HTTP
- Si falla el envío de push, **no afecta** la operación principal
- Los errores de push se registran en logs pero no se propagan
- El usuario debe tener **tokens de dispositivo registrados** para recibir notificaciones
- Las notificaciones automáticas (cron) se ejecutan cada minuto

---

**Última Actualización:** 31 de Diciembre, 2025

