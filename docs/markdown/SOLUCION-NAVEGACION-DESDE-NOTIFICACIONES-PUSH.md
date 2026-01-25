# 🔗 SOLUCIÓN: Navegación desde Notificaciones Push

**Fecha:** 31 de Diciembre, 2025

---

## ✅ SÍ, ES POSIBLE

Sí, es totalmente posible que al presionar una notificación push (con la app cerrada), se abra la aplicación y navegue directamente a la pantalla relacionada con esa notificación.

---

## 🎯 SOLUCIÓN PROPUESTA

### **Enfoque: Deep Linking + Navigation State**

La solución consiste en:

1. **Incluir datos de navegación en la notificación push**
2. **Manejar el evento cuando se presiona la notificación**
3. **Navegar a la pantalla correcta según el tipo de notificación**

---

## 📋 PASOS DE LA SOLUCIÓN

### **1. Backend: Incluir Datos de Navegación en Notificaciones**

En el backend, cuando se envía una notificación push, incluir en `notification.data`:

```javascript
{
  type: 'nuevo_mensaje',
  title: '💬 Nuevo Mensaje',
  message: '...',
  data: {
    // Datos existentes
    id_mensaje: 123,
    id_paciente: 456,
    id_doctor: 789,
    
    // ✅ NUEVO: Datos de navegación
    screen: 'Chat', // Nombre de la pantalla
    params: {       // Parámetros para la navegación
      pacienteId: 456,
      doctorId: 789,
      mensajeId: 123
    }
  }
}
```

**Tipos de notificaciones y sus pantallas:**

| Tipo de Notificación | Pantalla Destino | Parámetros |
|---------------------|-----------------|------------|
| `nuevo_mensaje` | `Chat` | `pacienteId`, `doctorId`, `mensajeId` |
| `cita_creada` | `DetalleCita` | `citaId` |
| `cita_actualizada` | `DetalleCita` | `citaId` |
| `cita_reprogramada` | `DetalleCita` | `citaId` |
| `recordatorio_cita` | `DetalleCita` | `citaId` |
| `alerta_signos_vitales` | `DetallePaciente` | `pacienteId` |
| `recordatorio_medicamento` | `Medicamentos` | `planId`, `detalleId` |
| `test_result` | `ResultadosLaboratorio` | `testId` |
| `solicitud_reprogramacion` | `DetalleCita` | `citaId` |

---

### **2. Frontend: Manejar Notificación Presionada**

#### **2.1. Configurar Listener de Notificaciones**

En el componente raíz de la app (App.js o similar):

```javascript
import { useEffect, useRef } from 'react';
import { AppState, Linking } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { useNavigation } from '@react-navigation/native';

// Manejar cuando se presiona una notificación
useEffect(() => {
  // Listener para cuando se presiona una notificación con la app cerrada
  const notificationOpenedHandler = (notification) => {
    const data = notification.data || notification.userInfo;
    
    if (data && data.screen) {
      // Navegar a la pantalla especificada
      navigation.navigate(data.screen, data.params || {});
    }
  };

  // Listener para cuando se presiona una notificación con la app en background
  const notificationReceivedHandler = (notification) => {
    // Similar al anterior
  };

  // Registrar listeners
  PushNotification.configure({
    onNotification: (notification) => {
      if (notification.userInteraction) {
        // Usuario presionó la notificación
        notificationOpenedHandler(notification);
      } else {
        // Notificación recibida (app en foreground)
        notificationReceivedHandler(notification);
      }
    },
    // ... otras configuraciones
  });

  // También manejar cuando la app se abre desde una notificación (app cerrada)
  const handleInitialNotification = async () => {
    const initialNotification = await PushNotification.getInitialNotification();
    if (initialNotification) {
      notificationOpenedHandler(initialNotification);
    }
  };

  handleInitialNotification();

  return () => {
    // Cleanup
  };
}, []);
```

#### **2.2. Manejar Deep Links (Alternativa/Complemento)**

También se puede usar `Linking` API de React Native:

```javascript
useEffect(() => {
  // Manejar cuando la app se abre desde un deep link
  const handleDeepLink = (url) => {
    // Parsear URL: clinica://chat?pacienteId=123&doctorId=456
    const route = url.replace(/.*?:\/\//g, '');
    const [screen, paramsString] = route.split('?');
    const params = {};
    
    if (paramsString) {
      paramsString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        params[key] = value;
      });
    }
    
    navigation.navigate(screen, params);
  };

  // URL inicial (si la app se abrió desde un link)
  Linking.getInitialURL().then(url => {
    if (url) {
      handleDeepLink(url);
    }
  });

  // Listener para cuando se abre un link mientras la app está corriendo
  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });

  return () => {
    subscription.remove();
  };
}, []);
```

---

### **3. Backend: Incluir Deep Link en Notificación (Opcional)**

Si se quiere usar deep links además de datos, incluir en `notification.data`:

```javascript
{
  type: 'nuevo_mensaje',
  data: {
    // ... datos existentes
    deepLink: 'clinica://chat?pacienteId=456&doctorId=789&mensajeId=123',
    screen: 'Chat',
    params: { pacienteId: 456, doctorId: 789, mensajeId: 123 }
  }
}
```

Y en Android/iOS configurar el esquema `clinica://` en los archivos de configuración.

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### **Opción 1: Usar `react-native-push-notification` (Recomendado)**

**Ventajas:**
- ✅ Ya está en uso en el proyecto
- ✅ Maneja automáticamente notificaciones con app cerrada
- ✅ `getInitialNotification()` para app cerrada
- ✅ `onNotification` con `userInteraction` para app en background

**Implementación:**
```javascript
// En App.js o NavigationContainer
PushNotification.configure({
  onNotification: function(notification) {
    if (notification.userInteraction) {
      // Usuario presionó la notificación
      handleNotificationPress(notification);
    }
  },
  requestPermissions: Platform.OS === 'ios',
});

// Manejar notificación inicial (app cerrada)
PushNotification.getInitialNotification()
  .then(notification => {
    if (notification) {
      handleNotificationPress(notification);
    }
  });
```

---

### **Opción 2: Usar Firebase Messaging + Deep Links**

**Ventajas:**
- ✅ Integración nativa con FCM
- ✅ Soporte para deep links nativos
- ✅ Mejor para notificaciones remotas

**Implementación:**
```javascript
// Manejar notificación cuando se presiona
messaging().onNotificationOpenedApp(remoteMessage => {
  handleNotificationPress(remoteMessage);
});

// Manejar notificación cuando se abre la app desde cerrada
messaging().getInitialNotification()
  .then(remoteMessage => {
    if (remoteMessage) {
      handleNotificationPress(remoteMessage);
    }
  });
```

---

### **Opción 3: Combinar Ambos (Híbrido)**

**Ventajas:**
- ✅ Máxima compatibilidad
- ✅ Funciona en todos los escenarios

**Implementación:**
- Usar `react-native-push-notification` para notificaciones locales
- Usar Firebase Messaging para notificaciones remotas
- Unificar el manejo de navegación en una función común

---

## 📱 ESTRUCTURA DE DATOS DE NAVEGACIÓN

### **Formato Estándar:**

```javascript
{
  type: 'tipo_notificacion',
  title: 'Título',
  message: 'Mensaje',
  data: {
    // Datos de negocio
    id_mensaje: 123,
    id_paciente: 456,
    
    // Datos de navegación (NUEVO)
    screen: 'Chat',           // Pantalla destino
    params: {                 // Parámetros para navegación
      pacienteId: 456,
      doctorId: 789,
      mensajeId: 123
    },
    deepLink: 'clinica://chat?pacienteId=456&doctorId=789' // Opcional
  }
}
```

---

## 🎯 MAPEO DE NOTIFICACIONES A PANTALLAS

### **Para Pacientes:**

| Tipo | Pantalla | Parámetros |
|------|----------|------------|
| `nuevo_mensaje` | `Chat` | `pacienteId`, `doctorId`, `mensajeId` |
| `cita_creada` | `DetalleCita` | `citaId` |
| `cita_actualizada` | `DetalleCita` | `citaId` |
| `cita_reprogramada` | `DetalleCita` | `citaId` |
| `recordatorio_cita` | `DetalleCita` | `citaId` |
| `recordatorio_medicamento` | `Medicamentos` o `DetalleMedicamento` | `planId`, `detalleId` |
| `test_result` | `ResultadosLaboratorio` | `testId` |
| `emergency_alert` | `Alertas` o `DetalleAlerta` | `alertId` |

### **Para Doctores:**

| Tipo | Pantalla | Parámetros |
|------|----------|------------|
| `nuevo_mensaje` | `Chat` | `pacienteId`, `doctorId`, `mensajeId` |
| `cita_creada` | `DetalleCita` | `citaId` |
| `solicitud_reprogramacion` | `DetalleCita` | `citaId` |
| `alerta_signos_vitales` | `DetallePaciente` | `pacienteId` |
| `paciente_registro_signos` | `DetallePaciente` | `pacienteId` |
| `citas_actualizadas` | `ListaCitas` | (sin parámetros, mostrar todas) |

---

## 🔄 FLUJO COMPLETO

### **Escenario: Notificación de Nuevo Mensaje**

1. **Backend envía notificación:**
   ```javascript
   {
     type: 'nuevo_mensaje',
     data: {
       id_mensaje: 123,
       screen: 'Chat',
       params: { pacienteId: 456, doctorId: 789, mensajeId: 123 }
     }
   }
   ```

2. **Usuario presiona notificación** (app cerrada)

3. **App se abre** y detecta la notificación inicial

4. **Navegación automática:**
   ```javascript
   navigation.navigate('Chat', {
     pacienteId: 456,
     doctorId: 789,
     mensajeId: 123
   });
   ```

5. **Pantalla Chat se carga** con el mensaje específico

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### **1. Estado de la App:**
- **App cerrada:** Usar `getInitialNotification()`
- **App en background:** Usar `onNotification` con `userInteraction`
- **App en foreground:** Mostrar notificación local y opcionalmente navegar

### **2. Autenticación:**
- Verificar que el usuario esté autenticado antes de navegar
- Si no está autenticado, guardar la intención de navegación y navegar después del login

### **3. Navegación Anidada:**
- Si la pantalla destino está dentro de un stack/tab anidado, usar navegación completa:
  ```javascript
  navigation.navigate('Main', {
    screen: 'Chat',
    params: { pacienteId: 456 }
  });
  ```

### **4. Validación de Parámetros:**
- Verificar que los parámetros sean válidos antes de navegar
- Manejar casos donde el recurso ya no existe (ej: mensaje eliminado)

### **5. Permisos:**
- Asegurar que los permisos de notificación estén otorgados
- Manejar casos donde el usuario denegó permisos

---

## 📚 BIBLIOGRAFÍA TÉCNICA

### **Librerías Necesarias:**
- ✅ `react-native-push-notification` (ya instalada)
- ✅ `@react-navigation/native` (ya instalada)
- ✅ `@react-navigation/stack` o similar (ya instalada)
- ⚠️ `@react-native-firebase/messaging` (si se usa FCM directamente)

### **APIs de React Native:**
- `Linking` - Para deep links
- `AppState` - Para detectar estado de la app
- `PushNotification` - Para manejar notificaciones

---

## ✅ RESUMEN

**Solución:**
1. ✅ Incluir `screen` y `params` en `notification.data` del backend
2. ✅ Manejar `getInitialNotification()` para app cerrada
3. ✅ Manejar `onNotification` con `userInteraction` para app en background
4. ✅ Navegar usando `navigation.navigate(screen, params)`
5. ✅ Validar autenticación y parámetros antes de navegar

**Complejidad:** Media
**Tiempo estimado:** 2-4 horas
**Impacto:** Alto (mejora significativa en UX)

---

**Última Actualización:** 31 de Diciembre, 2025

