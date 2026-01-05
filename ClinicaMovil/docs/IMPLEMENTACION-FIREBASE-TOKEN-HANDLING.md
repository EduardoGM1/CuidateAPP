# 🔥 Implementación: Manejo de Tokens FCM según Documentación Oficial

## 📋 Análisis de la Documentación Oficial de Firebase

### Puntos Clave de la Documentación:

1. **Generación del Token:**
   - El token FCM se genera cuando la app se inicia por primera vez
   - Se debe llamar a `FirebaseMessaging.getInstance().getToken()` para obtener el token actual

2. **Rotación del Token:**
   - El token puede cambiar en varias situaciones:
     - La app se restablece en un dispositivo nuevo
     - El usuario desinstala y vuelve a instalar la app
     - El usuario borra los datos de la app

3. **Supervisión de Tokens:**
   - Es necesario extender `FirebaseMessagingService` y anular `onNewToken()`
   - `onNewToken()` se activa cuando se genera un token nuevo o cuando cambia

4. **Actualización de APIs:**
   - Las apps que usan APIs obsoletas de Instance ID deben actualizar a las APIs de FCM

---

## ✅ Implementación en Nuestro Proyecto

### 1. Servicio Personalizado de Firebase (`CustomFirebaseMessagingService.kt`)

**Ubicación:** `android/app/src/main/java/com/clinicamovil/CustomFirebaseMessagingService.kt`

**Características:**
- ✅ Extiende `FirebaseMessagingService` oficial
- ✅ Implementa `onNewToken()` para detectar cambios de token
- ✅ Implementa `onMessageReceived()` para recibir mensajes
- ✅ Envía tokens al módulo JavaScript cuando cambian
- ✅ Maneja mensajes recibidos y los envía a React Native

**Funcionalidades:**
```kotlin
override fun onNewToken(token: String) {
    // Se llama cuando se genera un nuevo token o cuando cambia
    // Envía el token al módulo JavaScript para registrarlo en el servidor
}

override fun onMessageReceived(remoteMessage: RemoteMessage) {
    // Se llama cuando se recibe un mensaje de Firebase
    // Envía el mensaje al módulo JavaScript
}
```

### 2. Integración con React Native (`pushTokenService.js`)

**Ubicación:** `ClinicaMovil/src/services/pushTokenService.js`

**Características:**
- ✅ Escucha eventos `FCMTokenReceived` desde el servicio nativo
- ✅ Registra automáticamente tokens nuevos cuando cambian
- ✅ Mantiene compatibilidad con el método JavaScript existente
- ✅ Maneja tokens pendientes si no hay usuario logueado

**Flujo:**
1. El servicio nativo detecta un nuevo token en `onNewToken()`
2. Envía el token al módulo JavaScript vía evento
3. El servicio JavaScript registra el token en el servidor automáticamente

### 3. AndroidManifest.xml Actualizado

**Cambio realizado:**
- ✅ Cambiado de `FirebaseMessagingService` genérico a `CustomFirebaseMessagingService`
- ✅ Mantiene todas las configuraciones necesarias

---

## 🔄 Flujo Completo de Tokens

### Escenario 1: Primera Inicialización de la App

1. **App se inicia** → Firebase SDK genera token automáticamente
2. **CustomFirebaseMessagingService.onNewToken()** → Se ejecuta con el nuevo token
3. **Token se envía a JavaScript** → Vía evento `FCMTokenReceived`
4. **pushTokenService.js** → Recibe el token y lo registra en el servidor
5. **Token guardado** → En base de datos y AsyncStorage

### Escenario 2: Token se Actualiza (Rotación)

1. **Token cambia** → Por reinstalación, reset, etc.
2. **CustomFirebaseMessagingService.onNewToken()** → Se ejecuta con el nuevo token
3. **Token se envía a JavaScript** → Automáticamente
4. **pushTokenService.js** → Actualiza el token en el servidor
5. **Token actualizado** → En base de datos y AsyncStorage

### Escenario 3: Obtener Token Manualmente

1. **JavaScript llama** → `obtenerTokenFirebaseMessaging()`
2. **Firebase Messaging** → `messaging().getToken()` (equivalente a `FirebaseMessaging.getInstance().getToken()`)
3. **Token obtenido** → Se registra en el servidor

---

## ✅ Ventajas de esta Implementación

### 1. Cumple con la Documentación Oficial
- ✅ Implementa `FirebaseMessagingService` personalizado
- ✅ Usa `onNewToken()` para detectar cambios
- ✅ Llama a `getToken()` para obtener el token actual

### 2. Manejo Automático de Rotación
- ✅ Detecta automáticamente cuando el token cambia
- ✅ Actualiza el token en el servidor sin intervención del usuario
- ✅ No requiere que el usuario reinicie sesión

### 3. Integración Transparente
- ✅ Funciona con el código JavaScript existente
- ✅ Mantiene compatibilidad con tokens alternativos
- ✅ No rompe funcionalidad existente

### 4. Robustez
- ✅ Maneja tokens pendientes si no hay usuario logueado
- ✅ Registra tokens automáticamente cuando el usuario inicia sesión
- ✅ Logging detallado para debugging

---

## 📊 Comparación: Antes vs Después

### ❌ Antes (Solo JavaScript)
- Dependía únicamente de `react-native-firebase/messaging`
- No detectaba cambios de token automáticamente
- Requería llamar manualmente `getToken()` para obtener el token

### ✅ Después (Nativo + JavaScript)
- Servicio nativo detecta cambios de token automáticamente
- `onNewToken()` se ejecuta cuando el token cambia
- Integración bidireccional: nativo → JavaScript
- Cumple con las mejores prácticas de Firebase

---

## 🧪 Pruebas

### Prueba 1: Token Inicial
1. Recompila la app
2. Inicia sesión
3. Verifica que el token se registre automáticamente
4. Revisa logs: `✅ Token FCM REAL obtenido exitosamente`

### Prueba 2: Rotación de Token
1. Desinstala y reinstala la app
2. Inicia sesión
3. Verifica que el nuevo token se registre automáticamente
4. Revisa logs: `🔄 Token FCM recibido desde servicio nativo (onNewToken)`

### Prueba 3: Token Manual
1. Llama a `obtenerTokenFirebaseMessaging()` desde JavaScript
2. Verifica que obtenga el token actual
3. Revisa logs: `🔥 Intentando obtener token FCM usando Firebase Messaging...`

---

## ✅ Conclusión

**Implementación completa según documentación oficial:**
- ✅ Servicio nativo personalizado (`CustomFirebaseMessagingService`)
- ✅ Implementación de `onNewToken()` para detectar cambios
- ✅ Integración con React Native vía eventos
- ✅ Registro automático de tokens en el servidor
- ✅ Manejo de rotación de tokens

**El sistema ahora maneja tokens FCM de manera robusta y conforme a las mejores prácticas de Firebase.**


