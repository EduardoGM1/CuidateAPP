# 📱 Cómo Obtener el Token FCM

## 🔍 Situación Actual

No hay tokens FCM registrados todavía para el usuario. El token se genera automáticamente cuando inicias sesión en la app móvil.

---

## ✅ Métodos para Obtener el Token FCM

### Método 1: Iniciar Sesión en la App (Recomendado)

1. **Abre la app móvil**
2. **Inicia sesión** con el usuario (ID: 7 - Eduardo González González)
3. **El token se registrará automáticamente** en el backend
4. **Ejecuta el script** para ver el token:
   ```bash
   cd api-clinica
   node scripts/obtener-token-fcm-usuario.js 7
   ```

### Método 2: Revisar Logs de Metro/React Native

1. **Abre la terminal donde corre Metro Bundler**
2. **Busca en los logs** cuando inicies sesión:
   ```
   ✅ Token FCM REAL obtenido exitosamente usando Firebase Messaging
   ```
3. **El token aparecerá en los logs** (es un string largo)

### Método 3: Script de Consulta Directa

```bash
cd api-clinica
node scripts/obtener-token-fcm-usuario.js 7
```

Este script mostrará:
- ✅ Todos los tokens registrados para el usuario
- ✅ Indica si son FCM reales o alternativos
- ✅ Muestra el token completo para copiar

---

## ⚠️ Importante: Token FCM Real vs Alternativo

### Token FCM Real ✅
- Formato: String largo que NO empieza con `fcm_temp_`
- Ejemplo: `eXample1234567890abcdefghijklmnopqrstuvwxyz...`
- **Funciona con Firebase Console** ✅
- **Se obtiene después de recompilar la app** ✅

### Token Alternativo ⚠️
- Formato: Empieza con `fcm_temp_`
- Ejemplo: `fcm_temp_device_1234567890_abc123...`
- **NO funciona con Firebase Console** ❌
- Se usa como fallback cuando Firebase no está configurado

---

## 🚀 Pasos Completos para Obtener Token FCM Real

### Paso 1: Recompilar la App (si aún no lo has hecho)
```bash
cd ClinicaMovil
npm run android
```

### Paso 2: Iniciar Sesión en la App
1. Abre la app en tu dispositivo/emulador
2. Inicia sesión con el usuario (ID: 7)
3. Espera unos segundos para que el token se registre

### Paso 3: Obtener el Token
```bash
cd api-clinica
node scripts/obtener-token-fcm-usuario.js 7
```

El script mostrará el token FCM completo que puedes copiar.

### Paso 4: Usar el Token en Firebase Console
1. Ve a Firebase Console → Cloud Messaging
2. Selecciona "Token FCM"
3. Pega el token que obtuviste del script
4. Envía la notificación

---

## 📋 Alternativa: Ver Token en Logs de la App

Si prefieres verlo directamente en los logs:

1. **Abre Metro Bundler** (donde corre `npm start`)
2. **Filtra por "Token"** o "FCM"
3. **Busca esta línea:**
   ```
   ✅ Token FCM REAL obtenido exitosamente usando Firebase Messaging
   ```
4. **El token aparecerá justo después** en los logs

---

## 🔧 Si No Aparece el Token

### Posibles Razones:
1. **La app no fue recompilada** → Ejecuta `npm run android`
2. **Firebase no se inicializó** → Revisa los logs para ver errores
3. **El usuario no inició sesión** → Inicia sesión en la app
4. **Token alternativo** → Necesitas recompilar para obtener token FCM real

### Solución:
1. Recompila la app
2. Inicia sesión
3. Espera 5-10 segundos
4. Ejecuta el script de nuevo

---

## ✅ Resumen

**Para obtener el token FCM:**
1. ✅ Recompila la app (si es necesario)
2. ✅ Inicia sesión en la app
3. ✅ Ejecuta: `node scripts/obtener-token-fcm-usuario.js 7`
4. ✅ Copia el token que aparece
5. ✅ Úsalo en Firebase Console

**El token se genera automáticamente cuando inicias sesión.**


