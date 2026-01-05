# 📍 Ubicación Correcta para Enviar Notificaciones en Firebase Console

## 🔍 El Problema

Si en Cloud Messaging solo ves:
- ✅ API de Firebase Cloud Messaging (V1) (habilitado)
- ✅ Configuración web - certificados push web

**Estás en la sección de CONFIGURACIÓN**, no en la de ENVÍO.

---

## ✅ Solución: Dónde Enviar Notificaciones

### Opción 1: Firebase Console - Notificaciones (Recomendado)

**La interfaz para enviar notificaciones está en otra sección:**

1. **Ve a Firebase Console**: https://console.firebase.google.com/project/clinicamovil-f70e0
2. **En el menú lateral izquierdo**, busca:
   - **"Notificaciones"** o **"Notifications"** (puede estar en la sección "Engage" o "Compromiso")
   - O directamente: https://console.firebase.google.com/project/clinicamovil-f70e0/notification/compose
3. **Haz clic en "Nuevo mensaje"** o **"Compose notification"**

### Opción 2: Usar la API directamente (Más Técnico)

Si no encuentras la interfaz de notificaciones, puedes usar la API directamente desde el backend que ya tienes configurado.

---

## 🚀 Alternativa: Usar el Backend (Ya Configurado)

**Ya tienes todo configurado en el backend para enviar notificaciones.** Puedes usar:

### Opción A: Panel de Pruebas en la App
1. Abre la app
2. Ve al panel de pruebas (solo visible en desarrollo)
3. Presiona "🧪 Probar Push con App Cerrada (15 seg)"
4. La notificación se enviará desde el backend usando Firebase

### Opción B: Script de Prueba del Backend
```bash
cd api-clinica
node scripts/test-firebase-connection.js 7
```

Este script:
- ✅ Envía una notificación de prueba
- ✅ Muestra el resultado detallado
- ✅ Indica si Firebase respondió correctamente

### Opción C: Endpoint de Prueba del Backend
Puedes hacer una petición POST a:
```
POST http://localhost:3000/api/mobile/notification/test
Headers: Authorization: Bearer <tu_token>
Body: {
  "message": "Notificación de prueba",
  "title": "Prueba desde Backend",
  "type": "test",
  "delay_seconds": 0
}
```

---

## 📱 Ubicaciones en Firebase Console

### Sección 1: Cloud Messaging (Configuración)
**URL**: https://console.firebase.google.com/project/clinicamovil-f70e0/settings/cloudmessaging

**Aquí verás:**
- ✅ API de Firebase Cloud Messaging (V1)
- ✅ Configuración web - certificados push web
- ✅ Configuración de Android/iOS
- ❌ **NO puedes enviar notificaciones aquí**

### Sección 2: Notificaciones (Envío)
**URL**: https://console.firebase.google.com/project/clinicamovil-f70e0/notification

**Aquí verás:**
- ✅ "Nuevo mensaje" o "Compose notification"
- ✅ Historial de notificaciones enviadas
- ✅ Estadísticas de entregas
- ✅ **SÍ puedes enviar notificaciones aquí**

---

## 🔧 Si No Encuentras la Sección "Notificaciones"

### Posibles Razones:
1. **Tu proyecto no tiene Cloud Messaging completamente habilitado**
2. **La interfaz cambió en tu región/versión de Firebase**
3. **Necesitas permisos adicionales**

### Solución: Usar el Backend (Ya Funciona)
**Tu backend ya está configurado y funcionando.** Puedes:
- ✅ Enviar notificaciones desde el backend
- ✅ Probar con el script de prueba
- ✅ Usar el panel de pruebas en la app

---

## ✅ Recomendación

**Para pruebas rápidas:**
1. **Usa el panel de pruebas en la app** (más fácil)
2. **O usa el script del backend** (`test-firebase-connection.js`)

**Para producción:**
- ✅ Usa el backend que ya tienes (ya está configurado y funcionando)

**Para verificar que Firebase funciona:**
- ✅ El script de prueba del backend te mostrará si Firebase responde correctamente
- ✅ Verás en los logs: `✅ Firebase respondió exitosamente: { messageId: "..." }`

---

## 🎯 Próximos Pasos Recomendados

1. **Recompila la app** (si aún no lo has hecho):
   ```bash
   cd ClinicaMovil
   npm run android
   ```

2. **Prueba con el backend**:
   ```bash
   cd api-clinica
   node scripts/test-firebase-connection.js 7
   ```

3. **Verifica los logs** para ver si Firebase responde:
   - Busca: `✅ Firebase respondió exitosamente`
   - Si ves esto, Firebase está funcionando correctamente ✅

---

## 📝 Nota

La interfaz de Firebase Console puede variar según:
- La versión de Firebase que estés usando
- Tu región
- Los permisos de tu cuenta

**No te preocupes si no encuentras la sección de notificaciones en Firebase Console.** El backend que ya tienes configurado es más potente y ya funciona correctamente.


