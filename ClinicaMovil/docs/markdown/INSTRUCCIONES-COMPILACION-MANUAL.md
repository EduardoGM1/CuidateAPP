# 📱 Instrucciones para Compilar Manualmente la Aplicación Android

**Proyecto:** ClinicaMovil  
**Fecha:** 12 de enero de 2025

---

## 🔍 Verificar Estado Actual

Antes de compilar, verifica:

1. **Emulador o dispositivo conectado:**
   ```powershell
   adb devices
   ```
   Debe mostrar al menos un dispositivo conectado.

2. **Puerto 8081 disponible:**
   ```powershell
   netstat -ano | findstr :8081
   ```
   Si está en uso, mata el proceso o usa otro puerto.

3. **NDK instalado:**
   ```powershell
   Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\ndk" | Select-Object Name
   ```
   Debe mostrar al menos una versión válida del NDK.

---

## 🚀 Método 1: Compilación Completa (Recomendado)

### **Paso 1: Limpiar build anterior**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil\android
.\gradlew clean
cd ..
```

### **Paso 2: Instalar dependencias (si es necesario)**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil
npm install
```

### **Paso 3: Compilar e instalar**
```powershell
npx react-native run-android
```

**Opciones útiles:**
- `--port 8082` - Usar puerto alternativo si 8081 está ocupado
- `--no-packager` - No iniciar Metro bundler automáticamente
- `--variant=release` - Compilar versión de release (requiere configuración adicional)

---

## 🔧 Método 2: Compilación Solo con Gradle

Si React Native CLI tiene problemas, puedes compilar directamente con Gradle:

### **Paso 1: Navegar al directorio Android**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil\android
```

### **Paso 2: Limpiar build anterior**
```powershell
.\gradlew clean
```

### **Paso 3: Compilar APK de debug**
```powershell
.\gradlew assembleDebug
```

### **Paso 4: Instalar en dispositivo/emulador**
```powershell
.\gradlew installDebug
```

### **Paso 5: Iniciar Metro bundler manualmente (en otra terminal)**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil
npx react-native start
```

### **Paso 6: Abrir la app en el dispositivo**
La app debería abrirse automáticamente. Si no, ábrela manualmente desde el dispositivo.

---

## 🛠️ Método 3: Compilación Paso a Paso (Troubleshooting)

Si hay errores, sigue estos pasos uno por uno:

### **1. Verificar entorno**
```powershell
npx react-native doctor
```

### **2. Verificar dispositivos conectados**
```powershell
adb devices
```

Si no hay dispositivos:
- Inicia el emulador desde Android Studio
- O conecta un dispositivo físico con USB debugging habilitado

### **3. Limpiar caché de Gradle**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil\android
.\gradlew clean
Remove-Item -Recurse -Force .gradle -ErrorAction SilentlyContinue
cd ..
```

### **4. Limpiar caché de Metro**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil
npx react-native start --reset-cache
```
(Presiona `Ctrl+C` después de verificar que inicia correctamente)

### **5. Limpiar node_modules (si hay problemas de dependencias)**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

### **6. Compilar nuevamente**
```powershell
npx react-native run-android
```

---

## ⚠️ Solución de Problemas Comunes

### **Error: NDK no encontrado**

**Solución:**
1. Abre Android Studio
2. `Tools` > `SDK Manager` > `SDK Tools`
3. Marca `Show Package Details`
4. Instala `NDK (Side by side)` versión `25.2.9519653` o más reciente
5. Espera a que termine la instalación
6. Vuelve a compilar

### **Error: Puerto 8081 en uso**

**Solución:**
```powershell
# Encontrar proceso
netstat -ano | findstr :8081

# Matar proceso (reemplaza <PID> con el número del proceso)
taskkill /PID <PID> /F

# O usar puerto alternativo
npx react-native run-android --port 8082
```

### **Error: Emulador no inicia**

**Solución:**
1. Abre Android Studio
2. `Tools` > `Device Manager`
3. Inicia un emulador manualmente
4. O conecta un dispositivo físico con USB debugging

### **Error: Gradle build failed**

**Solución:**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil\android
.\gradlew clean
.\gradlew --stop
cd ..
npx react-native run-android
```

### **Error: Metro bundler no inicia**

**Solución:**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil
npx react-native start --reset-cache
```

---

## 📋 Checklist de Compilación

Antes de compilar, verifica:

- [ ] Emulador o dispositivo conectado (`adb devices`)
- [ ] NDK instalado y válido
- [ ] Dependencias instaladas (`npm install`)
- [ ] Puerto 8081 disponible o usar alternativo
- [ ] Android SDK configurado correctamente
- [ ] JAVA_HOME configurado (si es necesario)

---

## 🎯 Comandos Rápidos

### **Compilación rápida (todo en uno):**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil
npx react-native run-android
```

### **Compilación con limpieza:**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil\android
.\gradlew clean
cd ..
npx react-native run-android
```

### **Solo Metro bundler:**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil
npx react-native start
```

### **Solo instalar APK (si ya está compilado):**
```powershell
cd C:\Users\eduar\Desktop\Backend\ClinicaMovil\android
.\gradlew installDebug
```

---

## 📍 Ubicación del APK Compilado

Si la compilación es exitosa, el APK estará en:

```
C:\Users\eduar\Desktop\Backend\ClinicaMovil\android\app\build\outputs\apk\debug\app-debug.apk
```

Puedes instalarlo manualmente con:
```powershell
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

---

## ✅ Verificación de Compilación Exitosa

Después de compilar, verifica:

1. **APK generado:**
   ```powershell
   Test-Path "android\app\build\outputs\apk\debug\app-debug.apk"
   ```
   Debe retornar `True`

2. **App instalada en dispositivo:**
   ```powershell
   adb shell pm list packages | findstr clinicamovil
   ```

3. **Metro bundler corriendo:**
   - Debe estar escuchando en `http://localhost:8081` (o puerto alternativo)
   - Puedes verificar en el navegador: `http://localhost:8081/status`

---

## 💡 Tips Adicionales

1. **Primera compilación:** Puede tardar 10-15 minutos mientras descarga dependencias
2. **Compilaciones subsecuentes:** Deben ser más rápidas (2-5 minutos)
3. **Hot Reload:** Una vez compilado, los cambios en código JS se reflejan automáticamente
4. **Logs:** Usa `adb logcat` para ver logs de la aplicación en tiempo real

---

## 🆘 Si Nada Funciona

1. Cierra todas las terminales y procesos relacionados
2. Reinicia Android Studio
3. Reinicia el emulador/dispositivo
4. Sigue el Método 3 (Troubleshooting) paso a paso
5. Verifica `npx react-native doctor` para problemas de configuración

---

## 📞 Comandos de Diagnóstico

```powershell
# Verificar entorno completo
npx react-native doctor

# Ver dispositivos conectados
adb devices

# Ver logs en tiempo real
adb logcat *:S ReactNative:V ReactNativeJS:V

# Verificar versión de Node
node --version

# Verificar versión de npm
npm --version

# Verificar versión de Java
java -version
```

---

¡Buena suerte con la compilación! 🚀
