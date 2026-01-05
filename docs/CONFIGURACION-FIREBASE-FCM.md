# 🔥 Guía de Configuración de Firebase Cloud Messaging (FCM)

Esta guía te ayudará a configurar Firebase Cloud Messaging para las notificaciones push en la aplicación.

## 📋 Opciones Disponibles

Tienes **dos opciones** para las notificaciones push:

### Opción 1: Servicio Genérico (Actual - Sin Firebase)
- ✅ **Funciona ahora mismo** sin configuración adicional
- ✅ Usa `node-pushnotifications` con GCM (Google Cloud Messaging)
- ✅ No requiere Firebase en el cliente
- ⚠️ Funcionalidad limitada comparado con FCM

### Opción 2: Firebase Cloud Messaging (Recomendado)
- ✅ Más confiable y moderno
- ✅ Mejor soporte para Android e iOS
- ✅ Analytics y métricas integradas
- ⚠️ Requiere configuración inicial

---

## 🚀 Configuración de Firebase Cloud Messaging (FCM)

### Paso 1: Crear Proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en **"Agregar proyecto"** o selecciona un proyecto existente
3. Ingresa el nombre del proyecto (ej: "Clínica Móvil")
4. Sigue el asistente de configuración
5. **Desactiva** Google Analytics si no lo necesitas (opcional)

### Paso 2: Agregar App Android

1. En el dashboard de Firebase, haz clic en el ícono de **Android**
2. Ingresa el **Package name**: `com.clinicamovil` (verifica en `android/app/build.gradle`)
3. Ingresa un **App nickname** (opcional): "Clínica Móvil Android"
4. Haz clic en **"Registrar app"**

### Paso 3: Descargar google-services.json

1. Descarga el archivo `google-services.json`
2. **MUY IMPORTANTE**: Colócalo en:
   ```
   ClinicaMovil/android/app/google-services.json
   ```
3. **NO** lo subas a Git (ya debería estar en `.gitignore`)

### Paso 4: Configurar Android en build.gradle

Abre `ClinicaMovil/android/build.gradle` y asegúrate de tener:

```gradle
buildscript {
    dependencies {
        // ... otras dependencias
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

Abre `ClinicaMovil/android/app/build.gradle` y agrega al final:

```gradle
apply plugin: 'com.google.gms.google-services'
```

### Paso 5: Obtener Credenciales del Servidor

1. En Firebase Console, ve a **⚙️ Configuración del proyecto** (ícono de engranaje)
2. Ve a la pestaña **"Cuentas de servicio"**
3. Haz clic en **"Generar nueva clave privada"**
4. Se descargará un archivo JSON (ej: `clinica-movil-firebase-adminsdk-xxxxx.json`)

### Paso 6: Configurar Backend (.env)

Abre `api-clinica/.env` y agrega:

```env
# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"tu-proyecto-id",...}'
FIREBASE_PROJECT_ID=tu-proyecto-id
```

**Opción A: JSON completo en una línea** (Recomendado para desarrollo)
```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"clinica-movil-12345","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
FIREBASE_PROJECT_ID=clinica-movil-12345
```

**Opción B: Ruta al archivo** (Alternativa)
Si prefieres usar un archivo, puedes modificar `pushNotificationService.js` para leer desde un archivo.

### Paso 7: Verificar Configuración

1. Reinicia el servidor backend
2. Verifica los logs - deberías ver:
   ```
   ✅ Firebase Cloud Messaging inicializado
   ```

### Paso 8: Configurar App Móvil (Opcional)

Si quieres usar Firebase directamente en la app móvil (en lugar de `react-native-push-notification`):

```bash
cd ClinicaMovil
npm install @react-native-firebase/app @react-native-firebase/messaging
```

Sin embargo, **NO es necesario** si usas `react-native-push-notification`, ya que el backend enviará las notificaciones push.

---

## 🔍 Verificación de Configuración

### Verificar Backend

```bash
cd api-clinica
node -e "
const pushNotificationService = require('./services/pushNotificationService.js').default;
console.log('FCM Inicializado:', pushNotificationService.fcmInitialized);
"
```

### Verificar Android

1. Abre la app en Android
2. Ve al panel de pruebas
3. Presiona "🔍 Ver Estado del Token"
4. El token debería estar registrado

---

## 📝 Variables de Entorno Necesarias

En `api-clinica/.env`:

```env
# Firebase (Opcional - Solo si quieres usar FCM)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
FIREBASE_PROJECT_ID=tu-proyecto-id

# Push Notifications Genérico (Funciona sin Firebase)
FCM_SERVER_KEY=tu-server-key-de-firebase
```

### Obtener FCM_SERVER_KEY (Para servicio genérico)

1. Firebase Console → ⚙️ Configuración del proyecto
2. Pestaña **"Cloud Messaging"**
3. Copia el **"Server key"** o **"Cloud Messaging API (Legacy)"**

---

## 🆘 Solución de Problemas

### Error: "Firebase no está inicializado"

**Causa**: Las credenciales no están configuradas correctamente.

**Solución**:
1. Verifica que `FIREBASE_SERVICE_ACCOUNT_KEY` esté en formato JSON válido
2. Verifica que `FIREBASE_PROJECT_ID` coincida con tu proyecto
3. Reinicia el servidor

### Error: "google-services.json not found"

**Causa**: El archivo no está en la ubicación correcta.

**Solución**:
```bash
# Verifica que el archivo existe
ls ClinicaMovil/android/app/google-services.json

# Si no existe, descárgalo de Firebase Console y colócalo ahí
```

### Las notificaciones no llegan

**Verificaciones**:
1. ✅ Firebase está inicializado en backend (logs)
2. ✅ Token está registrado (botón diagnóstico)
3. ✅ El servidor está corriendo
4. ✅ Los permisos de notificación están otorgados en Android

---

## ✅ Estado Actual

**Sin configuración de Firebase:**
- ✅ El sistema funciona con el servicio genérico
- ✅ Las notificaciones push funcionan desde el servidor
- ✅ Compatible con todos los dispositivos Android

**Con configuración de Firebase:**
- ✅ Funcionalidad adicional (analytics, métricas)
- ✅ Mejor confiabilidad
- ✅ Soporte mejorado para iOS

---

## 📚 Referencias

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/)

---

## 💡 Recomendación

**Para empezar rápidamente:**
- Usa el servicio genérico actual (ya funciona)
- Configura Firebase más tarde si necesitas funcionalidades adicionales

**Para producción:**
- Configura Firebase para mejor confiabilidad y métricas


