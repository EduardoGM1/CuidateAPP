# 🔧 SOLUCIÓN: Error "CuidateApp no ha sido registrado" o Metro en carpeta errónea

**Fecha:** 2025-11-17  
**Problema:** Error indicando que "CuidateApp no ha sido registrado" o que Metro está corriendo en una carpeta errónea.

---

## ✅ CAMBIOS REALIZADOS

### 1. ✅ Configuración de Metro (`metro.config.js`)

**Problema identificado:**
- Metro podría estar ejecutándose desde una carpeta incorrecta
- No había configuración explícita de `projectRoot` y `watchFolders`

**Solución implementada:**
- ✅ Agregado `projectRoot: __dirname` para asegurar que Metro se ejecute desde la carpeta correcta
- ✅ Agregado `watchFolders: [__dirname]` para incluir la carpeta del proyecto en el watch
- ✅ Agregado `roots: [path.resolve(__dirname)]` en el resolver para asegurar resolución correcta de módulos

**Ubicación:** `ClinicaMovil/metro.config.js`

---

### 2. ✅ Verificación en `index.js`

**Problema identificado:**
- No había validación del nombre de la app antes de registrarla
- No había mensajes de debug para identificar problemas

**Solución implementada:**
- ✅ Agregada validación de `appName` antes de registrar el componente
- ✅ Agregados mensajes de console.log para debug
- ✅ Agregado try-catch alrededor del registro para capturar errores

**Ubicación:** `ClinicaMovil/index.js`

---

### 3. ✅ Script de verificación (`scripts/verificar-metro.ps1`)

**Nuevo archivo creado:**
- Script PowerShell para verificar la configuración de Metro
- Verifica que todos los archivos necesarios existan
- Verifica que `app.json` tenga el nombre correcto
- Verifica procesos de Metro corriendo
- Verifica que `MainActivity.kt` esté configurado correctamente

**Uso:**
```powershell
.\scripts\verificar-metro.ps1
```

**Ubicación:** `ClinicaMovil/scripts/verificar-metro.ps1`

---

## 🔍 VERIFICACIÓN DE CONFIGURACIÓN

### Archivos verificados:
1. ✅ `package.json` - Nombre del proyecto: "CuidateApp"
2. ✅ `app.json` - name: "CuidateApp", displayName: "CuidateApp"
3. ✅ `index.js` - Registra componente con `appName` de `app.json`
4. ✅ `MainActivity.kt` - `getMainComponentName()` retorna "CuidateApp"
5. ✅ `metro.config.js` - Configurado con `projectRoot` y `watchFolders`

### Coincidencias verificadas:
- ✅ `app.json.name` = "CuidateApp"
- ✅ `MainActivity.kt.getMainComponentName()` = "CuidateApp"
- ✅ `index.js` registra con `appName` de `app.json` = "CuidateApp"

---

## 🚀 PASOS PARA RESOLVER EL PROBLEMA

### Si Metro está corriendo en una carpeta errónea:

1. **Detener todos los procesos de Metro:**
   ```powershell
   Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
   ```

2. **Navegar a la carpeta correcta:**
   ```powershell
   cd C:\Users\eduar\Desktop\Backend\ClinicaMovil
   ```

3. **Verificar configuración:**
   ```powershell
   .\scripts\verificar-metro.ps1
   ```

4. **Limpiar caché de Metro:**
   ```powershell
   npm start -- --reset-cache
   ```

5. **Iniciar Metro desde la carpeta correcta:**
   ```powershell
   npm start
   ```

### Si el error persiste:

1. **Verificar que `app.json` tenga el nombre correcto:**
   ```json
   {
     "name": "CuidateApp",
     "displayName": "CuidateApp"
   }
   ```

2. **Verificar que `MainActivity.kt` tenga:**
   ```kotlin
   override fun getMainComponentName(): String = "CuidateApp"
   ```

3. **Verificar que `index.js` registre correctamente:**
   ```javascript
   AppRegistry.registerComponent(appName, () => App);
   ```

4. **Reconstruir la app Android:**
   ```powershell
   cd android
   .\gradlew clean
   cd ..
   npx react-native run-android
   ```

---

## 📝 NOTAS

1. **Metro debe ejecutarse desde `ClinicaMovil/`**: La carpeta que contiene `package.json`, `index.js`, `App.tsx`, y `metro.config.js`

2. **El nombre de la app debe coincidir en 3 lugares:**
   - `app.json` → `name: "CuidateApp"`
   - `MainActivity.kt` → `getMainComponentName(): String = "CuidateApp"`
   - `index.js` → Usa `appName` de `app.json` (debe ser "CuidateApp")

3. **Si cambias el nombre de la app:**
   - Actualiza `app.json`
   - Actualiza `MainActivity.kt`
   - Reinicia Metro con `--reset-cache`

---

## ✅ VERIFICACIÓN FINAL

Después de aplicar estos cambios, verifica:

1. ✅ Metro se ejecuta desde `ClinicaMovil/`
2. ✅ `app.json` tiene `name: "CuidateApp"`
3. ✅ `MainActivity.kt` retorna `"CuidateApp"`
4. ✅ `index.js` registra el componente correctamente
5. ✅ No hay errores en la consola de Metro
6. ✅ La app se carga correctamente en el dispositivo

---

## 🐛 DEBUGGING

Si el problema persiste, revisa los logs:

1. **Logs de Metro:**
   - Busca mensajes como "✅ Registrando componente: CuidateApp"
   - Busca errores relacionados con "UNREGISTERED_DEVICE"

2. **Logs de Android:**
   ```powershell
   adb logcat | Select-String "CuidateApp"
   ```

3. **Verificar registro del componente:**
   - En `index.js` deberías ver: `✅ Componente "CuidateApp" registrado correctamente`

---

**Estado:** ✅ Configuración corregida y verificada



