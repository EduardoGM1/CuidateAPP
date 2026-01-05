# 📱 NOTIFICACIONES PUSH PARA CITAS - IMPLEMENTACIÓN

## ✅ IMPLEMENTADO

### Notificaciones Push cuando el Doctor Interactúa con Citas

Se han agregado notificaciones push al teléfono del paciente cuando:

1. **📅 Nueva Cita Creada** (`createCita`)
   - Título: "📅 Nueva Cita Programada"
   - Mensaje: "Tienes una nueva cita médica programada para el [fecha formateada]"
   - Tipo: `cita_creada`

2. **🔄 Estado de Cita Cambiado** (`updateEstadoCita`)
   - Título: "📅 Actualización de Cita"
   - Mensajes según estado:
     - `atendida`: "Tu cita médica ha sido marcada como atendida"
     - `cancelada`: "Tu cita médica ha sido cancelada"
     - `reprogramada`: "Tu cita médica ha sido reprogramada"
     - `no_asistida`: "Tu cita médica ha sido marcada como no asistida"
     - `pendiente`: "El estado de tu cita ha sido actualizado"
   - Tipo: `cita_actualizada`

3. **📝 Cita Reprogramada** (`reprogramarCita`)
   - Título: "📅 Cita Reprogramada"
   - Mensaje: "Tu cita médica ha sido reprogramada para el [fecha nueva formateada]"
   - Tipo: `cita_reprogramada`

## 🔧 REQUISITOS

Para que las notificaciones push funcionen, el paciente debe tener:

1. **Token de dispositivo registrado** en `usuarios.device_tokens`
2. **Firebase Cloud Messaging (FCM)** configurado (para Android)
3. **Apple Push Notification Service (APNs)** configurado (para iOS)

## 📊 LOGS

### Backend
```
📱 [PUSH] Notificación push de nueva cita enviada al paciente
📱 [PUSH] Notificación push enviada al paciente
📱 [PUSH] Notificación push de reprogramación enviada al paciente
```

### Si hay error (no crítico):
```
❌ [PUSH] Error enviando notificación push (no crítico): { error: ... }
```

## 🎯 CÓMO FUNCIONA

1. **Doctor/Admin interactúa con cita** (crea, cambia estado, reprograma)
2. **Backend detecta la acción**
3. **Se envía WebSocket** (para actualización en tiempo real)
4. **Se envía notificación push** (para notificar al teléfono, incluso si la app está cerrada)
5. **Paciente recibe notificación** en su teléfono

## ⚠️ NOTAS IMPORTANTES

- Las notificaciones push son **asíncronas** y **no bloquean** la respuesta HTTP
- Si falla el envío de push, **no afecta** la operación principal
- Los errores de push se registran en logs pero no se propagan
- El paciente debe tener tokens de dispositivo registrados para recibir notificaciones

## 🔍 VERIFICACIÓN

Para verificar que las notificaciones se están enviando:

1. **Backend logs:** Buscar `[PUSH]` en los logs del servidor
2. **Frontend:** El paciente debería recibir la notificación en su teléfono
3. **Firebase Console:** Verificar envíos en Firebase Cloud Messaging (si está configurado)


