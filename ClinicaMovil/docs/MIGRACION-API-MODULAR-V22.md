# Migración a API Modular v22 - Firebase Messaging

## Fecha: 2025-01-05

## Problema Identificado

Según la [documentación oficial de migración a v22](https://rnfirebase.io/migrating-to-v22), estábamos usando la **API namespaced (deprecada)** en lugar de la **API modular**.

### ❌ Antes (API Namespaced - DEPRECADA):
```javascript
const messagingModule = await import('@react-native-firebase/messaging');
const messaging = messagingModule.default;
fcmToken = await messaging().getToken();
```

### ✅ Después (API Modular v22):
```javascript
const appModule = await import('@react-native-firebase/app');
const messagingModule = await import('@react-native-firebase/messaging');

const getApp = appModule.getApp;
const getMessaging = messagingModule.getMessaging;
const getToken = messagingModule.getToken;

const app = getApp();
const messaging = getMessaging(app);
fcmToken = await getToken(messaging);
```

## Cambios Implementados

### 1. **pushTokenService.js** - `obtenerTokenFirebaseMessaging()`

#### Cambios principales:
- ✅ Cambiado de `messaging()` (namespaced) a `getMessaging(app)` (modular)
- ✅ Cambiado de `messaging().getToken()` a `getToken(messaging)`
- ✅ Usa `getApp()` para obtener la instancia de Firebase App
- ✅ Sigue el patrón de migración según documentación oficial

#### Flujo de la API modular:
1. Importar funciones modulares: `getApp`, `getMessaging`, `getToken`
2. Obtener Firebase App: `app = getApp()`
3. Obtener Messaging instance: `messaging = getMessaging(app)`
4. Obtener token: `token = await getToken(messaging)`

### 2. **firebaseInitService.js** - Actualizado para API modular

#### Cambios principales:
- ✅ Usa `getApp()` en lugar de verificar `messaging()`
- ✅ Verifica disponibilidad de funciones modulares
- ✅ Alineado con el patrón de migración v22

## Patrón de Migración v22

Según la documentación, el proceso siempre sigue los mismos pasos:

1. **Determinar la función modular** para la API namespaced que estás usando
2. **Importar esa función modular**
3. **Cambiar la llamada** de usar el módulo firebase para acceder a la API y pasar parámetros, al nuevo estilo de usar la función de la API modular, pasando los objetos de Firebase requeridos y luego los parámetros

### Ejemplo de Firestore (documentación oficial):

**Antes (namespaced):**
```javascript
import firestore from '@react-native-firebase/firestore';
const db = firestore();
const querySnapshot = await db.collection('cities').where('capital', '==', true).get();
```

**Después (modular):**
```javascript
import { collection, query, where, getDocs, getFirestore } from '@react-native-firebase/firestore';
const db = getFirestore();
const q = query(collection(db, 'cities'), where('capital', '==', true));
const querySnapshot = await getDocs(q);
```

### Aplicado a Messaging:

**Antes (namespaced):**
```javascript
import messaging from '@react-native-firebase/messaging';
const messagingInstance = messaging();
const token = await messagingInstance.getToken();
```

**Después (modular):**
```javascript
import { getApp } from '@react-native-firebase/app';
import { getMessaging, getToken } from '@react-native-firebase/messaging';
const app = getApp();
const messaging = getMessaging(app);
const token = await getToken(messaging);
```

## Configuración Adicional

### Silenciar advertencias de deprecación (opcional)

Si quieres silenciar las advertencias de deprecación temporalmente:

```javascript
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
```

### Modo estricto de deprecación

Para identificar rápidamente cualquier uso restante de la API namespaced:

```javascript
globalThis.RNFB_MODULAR_DEPRECATION_STRICT_MODE = true;
```

Esto lanzará un error de JavaScript inmediatamente cuando se detecte cualquier uso de la API namespaced.

## Beneficios de la Migración

1. ✅ **Compatibilidad futura**: La API namespaced será eliminada en v22+
2. ✅ **Mejor rendimiento**: La API modular es más eficiente
3. ✅ **Tree-shaking**: Solo importas lo que necesitas
4. ✅ **Alineado con documentación**: Sigue las mejores prácticas oficiales
5. ✅ **Sin warnings**: Elimina las advertencias de deprecación

## Verificación

Para verificar que la migración fue exitosa:

1. No deberías ver warnings de deprecación en la consola
2. El token FCM se debe obtener correctamente
3. Los logs mostrarán `apiVersion: 'modular_v22'` cuando se obtiene el token

## Referencias

- [Guía de migración a v22](https://rnfirebase.io/migrating-to-v22)
- [Documentación oficial de Firebase Messaging](https://rnfirebase.io/messaging/usage)
- [Firebase JS SDK - Guía de actualización modular](https://firebase.google.com/docs/web/modular-upgrade)


