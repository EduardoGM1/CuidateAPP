# 🚀 Guía de Migración: Firebase → OneSignal

## 📋 Resumen

Esta guía te ayudará a migrar de Firebase Cloud Messaging a OneSignal, una alternativa más simple y confiable.

---

## ✅ Ventajas de OneSignal sobre Firebase

1. ✅ **Setup en minutos** vs horas con Firebase
2. ✅ **No requiere `google-services.json`** ni configuración nativa compleja
3. ✅ **Dashboard visual** para enviar notificaciones de prueba
4. ✅ **Mejor documentación** para React Native
5. ✅ **No más errores `MISSING_INSTANCEID_SERVICE`**

---

## 📦 Paso 1: Instalar OneSignal

```bash
cd ClinicaMovil
npm install react-native-onesignal
```

---

## 🔧 Paso 2: Configurar Android

### 2.1 Actualizar `android/app/build.gradle`

```gradle
dependencies {
    // ... otras dependencias existentes
    
    // OneSignal
    implementation 'com.onesignal:OneSignal:[5.0.0, 5.99.99]'
}
```

### 2.2 Actualizar `AndroidManifest.xml`

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application>
        <!-- OneSignal App ID -->
        <meta-data android:name="onesignal_app_id" android:value="TU_APP_ID_AQUI" />
        <meta-data android:name="onesignal_google_project_number" android:value="str:TU_PROJECT_NUMBER" />
    </application>
</manifest>
```

---

## 💻 Paso 3: Crear Servicio OneSignal (Frontend)

```javascript
// src/services/oneSignalService.js
import OneSignal from 'react-native-onesignal';
import Logger from './logger';
import servicioApi from '../api/servicioApi';

class OneSignalService {
  constructor() {
    this.isInitialized = false;
    this.userId = null;
  }

  /**
   * Inicializar OneSignal
   */
  async initialize(appId) {
    if (this.isInitialized) {
      Logger.info('OneSignal ya está inicializado');
      return;
    }

    try {
      Logger.info('🔔 Inicializando OneSignal...');
      
      // Configurar App ID
      OneSignal.setAppId(appId);
      
      // Solicitar permisos
      const permission = await OneSignal.promptForPushNotificationsWithUserResponse();
      Logger.info('Permisos OneSignal:', permission);
      
      // Obtener User ID (equivalente al token FCM)
      const deviceState = await OneSignal.getDeviceState();
      this.userId = deviceState.userId;
      
      Logger.success('✅ OneSignal inicializado', {
        userId: this.userId,
        hasPermission: permission
      });
      
      // Listener para notificaciones recibidas
      OneSignal.setNotificationOpenedHandler((notification) => {
        Logger.info('📬 Notificación abierta:', notification);
        // Manejar la notificación aquí
      });
      
      // Listener para notificaciones recibidas en foreground
      OneSignal.setNotificationWillShowInForegroundHandler((notification) => {
        Logger.info('📬 Notificación recibida en foreground:', notification);
        // Mostrar la notificación
        notification.complete(notification);
      });
      
      this.isInitialized = true;
    } catch (error) {
      Logger.error('❌ Error inicializando OneSignal:', error);
      throw error;
    }
  }

  /**
   * Obtener User ID (equivalente al token FCM)
   */
  async getUserId() {
    if (!this.isInitialized) {
      throw new Error('OneSignal no está inicializado');
    }
    
    if (!this.userId) {
      const deviceState = await OneSignal.getDeviceState();
      this.userId = deviceState.userId;
    }
    
    return this.userId;
  }

  /**
   * Registrar token en el servidor
   */
  async registerToken(userId, oneSignalUserId) {
    try {
      Logger.info('📝 Registrando token OneSignal en el servidor...');
      
      const response = await servicioApi.post('/mobile/device/register', {
        device_token: oneSignalUserId,
        platform: 'android',
        user_id: userId
      });
      
      Logger.success('✅ Token OneSignal registrado exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('❌ Error registrando token OneSignal:', error);
      throw error;
    }
  }
}

export default new OneSignalService();
```

---

## 🔄 Paso 4: Actualizar `pushTokenService.js`

```javascript
// Agregar método para OneSignal
async obtenerTokenOneSignal() {
  try {
    const oneSignalService = (await import('./oneSignalService')).default;
    
    // Inicializar si no está inicializado
    if (!oneSignalService.isInitialized) {
      await oneSignalService.initialize(process.env.ONESIGNAL_APP_ID);
    }
    
    // Obtener User ID
    const userId = await oneSignalService.getUserId();
    
    if (userId) {
      Logger.success('✅ Token OneSignal obtenido exitosamente');
      return userId;
    }
    
    return null;
  } catch (error) {
    Logger.error('❌ Error obteniendo token OneSignal:', error);
    return null;
  }
}
```

---

## 🖥️ Paso 5: Actualizar Backend

### 5.1 Instalar SDK de OneSignal

```bash
cd api-clinica
npm install onesignal-node
```

### 5.2 Crear Servicio OneSignal (Backend)

```javascript
// api-clinica/services/oneSignalService.js
const OneSignal = require('onesignal-node');
const Logger = require('./logger');

class OneSignalNotificationService {
  constructor() {
    this.client = new OneSignal.Client({
      appId: process.env.ONESIGNAL_APP_ID,
      restApiKey: process.env.ONESIGNAL_REST_API_KEY
    });
  }

  /**
   * Enviar notificación a un usuario específico
   */
  async sendToUser(oneSignalUserId, title, message, data = {}) {
    try {
      const notification = {
        contents: { en: message },
        headings: { en: title },
        include_player_ids: [oneSignalUserId],
        data: data
      };

      const response = await this.client.createNotification(notification);
      
      Logger.info('✅ Notificación OneSignal enviada:', {
        notificationId: response.body.id,
        userId: oneSignalUserId
      });
      
      return response;
    } catch (error) {
      Logger.error('❌ Error enviando notificación OneSignal:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación a múltiples usuarios
   */
  async sendToUsers(oneSignalUserIds, title, message, data = {}) {
    try {
      const notification = {
        contents: { en: message },
        headings: { en: title },
        include_player_ids: oneSignalUserIds,
        data: data
      };

      const response = await this.client.createNotification(notification);
      
      Logger.info('✅ Notificación OneSignal enviada a múltiples usuarios:', {
        notificationId: response.body.id,
        userCount: oneSignalUserIds.length
      });
      
      return response;
    } catch (error) {
      Logger.error('❌ Error enviando notificación OneSignal:', error);
      throw error;
    }
  }
}

module.exports = new OneSignalNotificationService();
```

### 5.3 Actualizar `pushNotificationService.js`

```javascript
// Agregar soporte para OneSignal
const oneSignalService = require('./oneSignalService');

// En el método sendPushNotification:
if (deviceToken.platform === 'android') {
  // Verificar si es token OneSignal (formato diferente)
  if (deviceToken.token.startsWith('onesignal_') || deviceToken.token.length === 36) {
    // Es un token OneSignal
    await oneSignalService.sendToUser(
      deviceToken.token,
      notification.title,
      notification.body,
      notification.data
    );
  } else {
    // Token FCM (mantener compatibilidad)
    // ... código existente de Firebase
  }
}
```

---

## 🔑 Paso 6: Obtener Credenciales de OneSignal

1. **Crear cuenta en OneSignal:**
   - Ve a https://onesignal.com
   - Crea una cuenta gratuita

2. **Crear una nueva App:**
   - Dashboard → New App/Website
   - Selecciona "Google Android (FCM)"
   - Ingresa nombre de la app

3. **Obtener App ID y REST API Key:**
   - Settings → Keys & IDs
   - Copia `OneSignal App ID`
   - Copia `REST API Key`

4. **Agregar al `.env`:**
   ```env
   ONESIGNAL_APP_ID=tu-app-id-aqui
   ONESIGNAL_REST_API_KEY=tu-rest-api-key-aqui
   ```

---

## 🧪 Paso 7: Probar

1. **Inicializar OneSignal en la app:**
   ```javascript
   // En App.tsx o AuthContext.js
   import oneSignalService from './services/oneSignalService';
   
   useEffect(() => {
     oneSignalService.initialize(process.env.ONESIGNAL_APP_ID);
   }, []);
   ```

2. **Registrar token al iniciar sesión:**
   ```javascript
   const userId = await oneSignalService.getUserId();
   await oneSignalService.registerToken(userId, oneSignalUserId);
   ```

3. **Enviar notificación de prueba desde el backend:**
   ```javascript
   await oneSignalService.sendToUser(
     oneSignalUserId,
     'Prueba',
     'Esta es una notificación de prueba'
   );
   ```

---

## ✅ Ventajas de la Migración

1. ✅ **No más errores de Firebase** - OneSignal es más simple
2. ✅ **Setup más rápido** - minutos vs horas
3. ✅ **Dashboard visual** - fácil enviar notificaciones
4. ✅ **Mejor documentación** - especialmente para React Native
5. ✅ **Menos dependencias nativas** - menos problemas de compilación

---

## 🔄 Migración Gradual

Puedes mantener ambos servicios durante la transición:

1. **Registrar tokens de ambos servicios**
2. **Enviar notificaciones por ambos canales**
3. **Monitorear cuál funciona mejor**
4. **Eliminar Firebase** una vez OneSignal esté funcionando

---

¿Quieres que implemente esta migración completa? Puedo crear todos los archivos necesarios.

