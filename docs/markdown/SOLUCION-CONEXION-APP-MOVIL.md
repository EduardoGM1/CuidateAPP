# 🔧 SOLUCIÓN: App Móvil Sin Conexión a API

**Fecha:** 28/11/2025  
**Problema:** App en dispositivo físico no tiene conexión con la API

---

## 🔍 DIAGNÓSTICO COMPLETADO

### ✅ Estado Actual:

1. **Backend:** ✅ Corriendo y respondiendo (puerto 3000)
2. **Dispositivo:** ✅ Conectado (HLGYD22718000911)
3. **ADB Reverse:** ✅ Configurado (tcp:3000 y tcp:8081)
4. **Conexión desde dispositivo:** ✅ Funciona (localhost:3000 accesible)
5. **IP Local:** ✅ Responde (192.168.1.74:3000)

### ❌ Problema Identificado:

**La app estaba probando configuraciones en el orden incorrecto:**
1. ❌ Primero probaba `10.0.2.2` (emulador) - puede fallar o tardar
2. ⚠️ Luego probaba `localhost` (ADB reverse)
3. ⚠️ Finalmente probaba IP local

**Esto causaba que:**
- La app podía usar la configuración de emulador incorrectamente
- El timeout de 5 segundos podía ser demasiado largo
- El cache podía guardar una configuración incorrecta

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Cambios Realizados:

1. **Orden de pruebas corregido:**
   - ✅ **PRIMERO:** `localhost:3000` (ADB reverse) - más rápido
   - ✅ **SEGUNDO:** `192.168.1.74:3000` (IP local) - fallback
   - ✅ **TERCERO:** `10.0.2.2:3000` (emulador) - solo si es emulador

2. **Timeout reducido:**
   - De 5 segundos a 3 segundos para pruebas más rápidas

3. **Fallback mejorado:**
   - Si todas las pruebas fallan, usa `localhost` (requiere ADB reverse)

---

## 🚀 PASOS PARA APLICAR LA SOLUCIÓN

### Paso 1: Limpiar Cache de la App

**Opción A: Desde la app (si tienes acceso a logs):**
```javascript
// En la consola de React Native o Metro
import { clearEnvironmentCache } from './src/config/apiConfig';
clearEnvironmentCache();
```

**Opción B: Recompilar la app:**
```powershell
cd ClinicaMovil
npm run android
```

### Paso 2: Verificar que ADB Reverse esté Configurado

```powershell
adb reverse --list
```

**Debe mostrar:**
```
tcp:3000 tcp:3000
tcp:8081 tcp:8081
```

**Si no está configurado:**
```powershell
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081
```

### Paso 3: Reiniciar la App

1. **Cierra completamente la app** en el dispositivo
2. **Vuelve a abrirla**
3. **Observa los logs** en Metro bundler o React Native Debugger

**Deberías ver:**
```
🔍 Detectando mejor configuración para Android...
🔄 Probando localhost (adb reverse): http://localhost:3000
✅ ADB reverse detectado y funcionando - usando localhost
🌐 API inicializada: http://localhost:3000
```

---

## 🧪 VERIFICACIÓN

### Desde la App:

**Abre React Native Debugger o Metro logs y busca:**
- `🔍 Detectando mejor configuración para Android...`
- `✅ ADB reverse detectado y funcionando - usando localhost`
- `🌐 API inicializada: http://localhost:3000`

**Si ves:**
- `❌ Error de conexión` → Verifica que el backend esté corriendo
- `⚠️ No se pudo conectar` → Verifica ADB reverse
- `🔄 Probando emulador` → La app está usando el orden antiguo (recompila)

### Desde Terminal:

```powershell
# Verificar backend
Invoke-WebRequest -Uri "http://localhost:3000/api/mobile/config"

# Verificar dispositivo
adb devices

# Verificar ADB reverse
adb reverse --list

# Probar desde dispositivo
adb shell "curl http://localhost:3000/api/mobile/config"
```

---

## 🔧 SI AÚN NO FUNCIONA

### Opción 1: Forzar IP Local

Si ADB reverse no funciona, puedes forzar el uso de IP local:

**Modificar `apiConfig.js` línea 110:**
```javascript
// Cambiar de:
return 'development'; // localhost:3000

// A:
return 'localNetwork'; // 192.168.1.74:3000
```

**Luego recompilar:**
```powershell
cd ClinicaMovil
npm run android
```

### Opción 2: Limpiar Cache Completamente

```powershell
cd ClinicaMovil

# Limpiar cache de Metro
npm start -- --reset-cache

# Limpiar build de Android
cd android
./gradlew clean
cd ..

# Recompilar
npm run android
```

### Opción 3: Verificar Logs de la App

**Abre Metro bundler y busca errores:**
- Errores de red
- Timeouts
- URLs incorrectas

**Comandos útiles:**
```powershell
# Ver logs de React Native
npx react-native log-android

# Ver logs del dispositivo
adb logcat | Select-String -Pattern "ReactNative|Network"
```

---

## 📋 CHECKLIST FINAL

Antes de reportar que no funciona, verifica:

- [ ] Backend corriendo (`http://localhost:3000/api/mobile/config` responde)
- [ ] Dispositivo conectado (`adb devices` muestra el dispositivo)
- [ ] ADB reverse configurado (`adb reverse --list` muestra tcp:3000)
- [ ] App recompilada después de los cambios
- [ ] App reiniciada completamente
- [ ] Logs muestran "✅ ADB reverse detectado"
- [ ] No hay errores en Metro bundler
- [ ] Dispositivo y PC en la misma red WiFi (si usas IP local)

---

## 🎯 RESUMEN DE CAMBIOS

**Archivo modificado:** `ClinicaMovil/src/config/apiConfig.js`

**Cambios:**
1. ✅ Orden de pruebas corregido (localhost primero)
2. ✅ Timeout reducido (3 segundos)
3. ✅ Fallback mejorado (usa localhost si todo falla)

**Resultado esperado:**
- La app detecta `localhost:3000` más rápido
- No intenta usar configuración de emulador en dispositivos físicos
- Conexión más confiable y rápida

---

**Última actualización:** 28/11/2025  
**Estado:** ✅ Cambios aplicados - Recompilar app para aplicar

