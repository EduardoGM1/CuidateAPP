# ✅ Verificación: Envío de Notificaciones a Firebase

## 📋 Resumen

Se ha mejorado el sistema de logging y verificación para rastrear el envío de notificaciones a Firebase y capturar sus respuestas.

## ✅ Mejoras Implementadas

### 1. Logging Detallado en `sendFCMNotification()`

**Antes:**
- Solo mostraba error si fallaba
- No registraba cuando enviaba exitosamente
- No mostraba detalles de la respuesta de Firebase

**Ahora:**
- ✅ Log antes de enviar: Muestra token, título, mensaje
- ✅ Log de mensaje preparado: Verifica que todos los campos estén presentes
- ✅ Log de respuesta exitosa: Muestra `messageId` de Firebase
- ✅ Log de errores detallado: Incluye código de error, errorInfo, stack

**Ejemplo de logs:**
```
🔥 Enviando notificación FCM a Firebase...
📤 Mensaje preparado para Firebase: { hasToken: true, hasNotification: true, ... }
✅ Firebase respondió exitosamente: { messageId: "projects/.../messages/...", success: true }
```

### 2. Detección de Tokens Alternativos

**Nuevo:**
- ✅ Detecta si el token es alternativo (`fcm_temp_`)
- ✅ Usa servicio genérico automáticamente para tokens alternativos
- ✅ Solo intenta Firebase para tokens FCM reales

**Ejemplo:**
```
⚠️ Token alternativo detectado, Firebase no puede enviar a este token
   Usando servicio genérico como fallback
```

### 3. Logging en `sendPushNotification()`

**Nuevo:**
- ✅ Muestra cuántos dispositivos se van a notificar
- ✅ Log por cada token procesado
- ✅ Resumen final con estadísticas

**Ejemplo:**
```
📤 Enviando notificación a 2 dispositivo(s)
📱 Procesando token android: { tokenPreview: "...", isFCMToken: true }
🔥 Intentando enviar via FCM (Firebase)...
✅ Notificación FCM enviada exitosamente: { messageId: "...", method: "FCM" }
📊 Resumen de envío: { total: 2, successful: 2, failed: 0 }
```

### 4. Logging Mejorado en Controller

**Nuevo:**
- ✅ Log antes de enviar notificación
- ✅ Log de resultado con detalles
- ✅ Log de errores con código de error

## 🧪 Cómo Probar

### Prueba 1: Desde la App (Panel de Pruebas)

1. Abre la app e inicia sesión
2. Ve al panel de pruebas (solo en desarrollo)
3. Presiona "🧪 Probar Push con App Cerrada (15 seg)"
4. Revisa los logs del servidor

**Logs esperados en el servidor:**
```
📤 Enviando notificación de prueba inmediatamente... { userId: 7 }
📤 Enviando notificación a 1 dispositivo(s) { userId: 7, notificationType: 'test' }
📱 Procesando token android: { tokenPreview: "...", isFCMToken: true/false }
🔥 Enviando notificación FCM a Firebase... { tokenPreview: "...", title: "..." }
📤 Mensaje preparado para Firebase: { hasToken: true, ... }
✅ Firebase respondió exitosamente: { messageId: "...", success: true }
✅ Resultado de notificación de prueba: { success: true, sent_to: 1 }
```

### Prueba 2: Script de Prueba Directo

```bash
cd api-clinica
node scripts/test-firebase-connection.js 7
```

Este script:
- ✅ Verifica que Firebase esté inicializado
- ✅ Verifica variables de entorno
- ✅ Envía una notificación de prueba
- ✅ Muestra resultado detallado

### Prueba 3: Verificar Logs del Servidor

Cuando envíes una notificación, busca en los logs del servidor:

**Si Firebase está funcionando:**
```
🔥 Enviando notificación FCM a Firebase...
✅ Firebase respondió exitosamente: { messageId: "..." }
```

**Si Firebase falla:**
```
🔥 Enviando notificación FCM a Firebase...
❌ Error enviando notificación FCM: { error: "...", code: "messaging/..." }
⚠️ FCM falló, usando fallback genérico
```

**Si es token alternativo:**
```
⚠️ Token alternativo detectado, Firebase no puede enviar a este token
   Usando servicio genérico como fallback
```

## 📊 Información Capturada

### En cada envío a Firebase:
- ✅ Token preview (primeros 30 caracteres)
- ✅ Longitud del token
- ✅ Título y mensaje de la notificación
- ✅ Timestamp de envío
- ✅ Message ID de Firebase (si exitoso)
- ✅ Código de error (si falla)
- ✅ ErrorInfo completo (si disponible)

### En el resumen:
- ✅ Total de dispositivos
- ✅ Dispositivos exitosos
- ✅ Dispositivos fallidos
- ✅ Método usado para cada uno (FCM, genérico, etc.)

## 🔍 Verificación de Firebase

### Variables de Entorno Verificadas:
- ✅ `FIREBASE_SERVICE_ACCOUNT_KEY`: 2348 caracteres (✅ Definido)
- ✅ `FIREBASE_PROJECT_ID`: clinicamovil-f70e0 (✅ Definido)

### Estado de Firebase:
- ✅ Firebase se inicializa automáticamente al importar el módulo
- ✅ Verifica que Firebase Apps estén disponibles
- ✅ Muestra Project ID después de inicializar

## ⚠️ Errores Comunes y Soluciones

### Error: "Firebase no inicializado"
**Causa:** Variables de entorno no configuradas
**Solución:** Verifica `.env` con `FIREBASE_SERVICE_ACCOUNT_KEY` y `FIREBASE_PROJECT_ID`

### Error: "messaging/invalid-registration-token"
**Causa:** Token no es FCM real (es token alternativo)
**Solución:** El sistema usa automáticamente servicio genérico como fallback

### Error: "messaging/registration-token-not-registered"
**Causa:** Token FCM no está registrado en Firebase
**Solución:** El token debe registrarse en Firebase Console

## ✅ Checklist de Verificación

- ✅ Logging detallado implementado
- ✅ Detección de tokens alternativos
- ✅ Captura de respuestas de Firebase
- ✅ Manejo de errores mejorado
- ✅ Script de prueba creado
- ✅ Variables de entorno verificadas

## 📝 Próximos Pasos

1. **Ejecutar script de prueba:**
   ```bash
   cd api-clinica
   node scripts/test-firebase-connection.js 7
   ```

2. **Probar desde la app:**
   - Usar panel de pruebas
   - Verificar logs del servidor
   - Confirmar que Firebase responde

3. **Verificar tokens:**
   - Si es token FCM real → Firebase debe responder con messageId
   - Si es token alternativo → Usa servicio genérico automáticamente


