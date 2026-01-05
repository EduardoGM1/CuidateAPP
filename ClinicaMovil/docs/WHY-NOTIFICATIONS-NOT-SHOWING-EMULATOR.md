# 🔔 ¿Por qué no se muestran las notificaciones en el emulador?

## 📋 Razones Principales

### 1. **App en FOREGROUND (Primer Plano)** ⚠️ MÁS COMÚN

**Problema**: Firebase **NO muestra notificaciones automáticamente** cuando la app está abierta y visible.

**Solución**: Ya implementada - ahora se muestran manualmente usando `react-native-push-notification`.

**Comportamiento**:
- ✅ **BACKGROUND**: Las notificaciones se muestran automáticamente
- ✅ **QUIT (Cerrada)**: Las notificaciones se muestran automáticamente
- ❌ **FOREGROUND**: NO se muestran automáticamente (requiere código manual)

### 2. **Emulador sin Google Play Services**

**Problema**: Algunos emuladores no tienen Google Play Services instalado o actualizado.

**Verificación**:
```bash
# Verificar que Google Play Services esté disponible
adb shell pm list packages | grep "com.google.android.gms"
```

**Solución**:
1. Usa un emulador con Google Play Services (ícono de Google Play)
2. Actualiza Google Play Services en el emulador
3. Reinicia el emulador

### 3. **Permisos de Notificaciones No Otorgados**

**Problema**: Aunque se soliciten, los permisos pueden no estar otorgados.

**Verificación**:
- En el emulador: Configuración > Apps > Clínica Móvil > Notificaciones
- Debe estar habilitado

**Solución**: La app solicita permisos automáticamente, pero verifica manualmente.

### 4. **Canal de Notificaciones No Creado**

**Problema**: Android requiere que los canales de notificaciones estén creados antes de mostrar notificaciones.

**Solución**: Ya configurado - el canal `clinica-movil-reminders` se crea automáticamente.

### 5. **Emulador en Modo Silencioso o Sin Sonido**

**Problema**: El emulador puede estar en modo silencioso.

**Solución**: 
- Verifica el volumen del emulador
- Verifica que el sonido esté habilitado

## ✅ Solución Implementada

He actualizado el código para que **muestre notificaciones manualmente cuando la app está en FOREGROUND**:

```javascript
// Cuando la app está en foreground, Firebase no muestra notificaciones automáticamente
// Por eso las mostramos manualmente usando react-native-push-notification
PushNotification.localNotification({
  channelId: 'clinica-movil-reminders',
  title: remoteMessage.notification.title,
  message: remoteMessage.notification.body,
  playSound: true,
  soundName: 'default',
  vibrate: true,
});
```

## 🧪 Cómo Probar

### 1. **Con App en Foreground (Abierta y Visible)**
- Abre la app
- Mantén la app abierta
- Envía una notificación desde Firebase Console
- **Deberías ver la notificación** (ahora se muestra manualmente)

### 2. **Con App en Background (Abierta pero Minimizada)**
- Abre la app
- Presiona el botón Home para minimizarla
- Envía una notificación desde Firebase Console
- **Deberías ver la notificación** (se muestra automáticamente)

### 3. **Con App Cerrada**
- Cierra completamente la app (swipe away)
- Envía una notificación desde Firebase Console
- **Deberías ver la notificación** (se muestra automáticamente)

## 🔍 Verificar Logs

Los logs te mostrarán exactamente qué está pasando:

```
📬 NOTIFICACIÓN PUSH RECIBIDA (App en FOREGROUND)
   Estado: App abierta y visible
   Título: [título]
   Cuerpo: [cuerpo]
✅ Notificación mostrada en foreground
```

Si ves "✅ Notificación mostrada en foreground" pero no la ves en el emulador, entonces el problema es del emulador (permisos, Google Play Services, etc.).

## 📝 Notas Importantes

1. **En dispositivos reales**: Las notificaciones funcionan mejor que en emuladores
2. **Emuladores con Google Play**: Usa siempre emuladores con Google Play Services
3. **Permisos**: Asegúrate de que los permisos estén otorgados
4. **Volumen**: Verifica que el emulador tenga volumen habilitado

## 🚀 Próximos Pasos

1. Recompila la app si es necesario
2. Prueba enviando una notificación desde Firebase Console
3. Verifica los logs en la consola
4. Si aún no funciona, prueba en un dispositivo real

