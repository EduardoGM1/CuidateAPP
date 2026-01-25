# Guía de Compilación Manual - React Native

## 📋 Requisitos Previos

1. **Node.js** (v18 o superior)
2. **Java JDK** (v17 recomendado)
3. **Android Studio** con Android SDK instalado
4. **React Native CLI** instalado globalmente:
   ```bash
   npm install -g react-native-cli
   ```

---

## 🧹 Paso 1: Limpiar Cache

### Limpiar Cache de Metro Bundler
```bash
cd ClinicaMovil
npx react-native start --reset-cache
```
O manualmente:
```bash
# Detener procesos de Metro
taskkill /F /IM node.exe

# Limpiar cache de Metro
rmdir /s /q .metro 2>nul
rmdir /s /q %LOCALAPPDATA%\Temp\metro-* 2>nul
```

### Limpiar Cache de Android
```bash
cd android
.\gradlew clean
cd ..
```

### Limpiar Cache de Node
```bash
npm cache clean --force
```

### Limpiar node_modules (opcional, si hay problemas)
```bash
rmdir /s /q node_modules
npm install
```

---

## 🔨 Paso 2: Compilar para Android

### Opción A: Compilación desde Android Studio (Recomendado)

1. **Abrir Android Studio**
   - Abrir Android Studio
   - Seleccionar "Open an Existing Project"
   - Navegar a `ClinicaMovil/android` y abrir

2. **Sincronizar Gradle**
   - Android Studio detectará automáticamente los cambios
   - Si no, ir a: `File > Sync Project with Gradle Files`

3. **Limpiar y Reconstruir**
   - Ir a: `Build > Clean Project`
   - Esperar a que termine
   - Ir a: `Build > Rebuild Project`

4. **Ejecutar en Emulador o Dispositivo**
   - Conectar dispositivo Android o iniciar emulador
   - Presionar `Shift + F10` o hacer clic en el botón "Run"

### Opción B: Compilación desde Terminal

1. **Iniciar Metro Bundler** (en una terminal)
   ```bash
   cd ClinicaMovil
   npx react-native start --reset-cache
   ```

2. **Compilar y Ejecutar** (en otra terminal)
   ```bash
   cd ClinicaMovil
   npx react-native run-android
   ```

   O compilar APK de debug:
   ```bash
   cd android
   .\gradlew assembleDebug
   ```
   El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

3. **Compilar APK de Release** (para producción)
   ```bash
   cd android
   .\gradlew assembleRelease
   ```
   El APK estará en: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📱 Paso 3: Ejecutar en Dispositivo/Emulador

### Verificar Dispositivos Conectados
```bash
adb devices
```

### Instalar APK Manualmente
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Ver Logs en Tiempo Real
```bash
adb logcat | findstr "ReactNative"
```

O con filtro más específico:
```bash
adb logcat *:S ReactNative:V ReactNativeJS:V
```

---

## 🔧 Solución de Problemas Comunes

### Error: "SDK location not found"
```bash
# Crear archivo local.properties en android/
echo sdk.dir=C\:\\Users\\TU_USUARIO\\AppData\\Local\\Android\\Sdk > android\local.properties
```

### Error: "Gradle sync failed"
```bash
cd android
.\gradlew clean
.\gradlew --stop
cd ..
# Eliminar .gradle y volver a sincronizar
```

### Error: "Metro bundler no inicia"
```bash
# Limpiar cache de Metro
npx react-native start --reset-cache

# O reiniciar completamente
taskkill /F /IM node.exe
npx react-native start --reset-cache
```

### Error: "Unable to resolve module"
```bash
# Limpiar e instalar dependencias
rmdir /s /q node_modules
npm install
npx react-native start --reset-cache
```

### Error: "Execution failed for task ':app:installDebug'"
```bash
# Desinstalar app anterior del dispositivo
adb uninstall com.clinicamovil

# O limpiar cache de Android
cd android
.\gradlew clean
cd ..
npx react-native run-android
```

---

## 🚀 Compilación Rápida (Script)

Crear archivo `build.bat` en la raíz del proyecto:

```batch
@echo off
echo Limpiando cache...
cd ClinicaMovil
taskkill /F /IM node.exe 2>nul
cd android
call gradlew clean
cd ..

echo Instalando dependencias...
call npm install

echo Iniciando Metro...
start "Metro Bundler" cmd /k "npx react-native start --reset-cache"

echo Esperando 5 segundos...
timeout /t 5 /nobreak >nul

echo Compilando y ejecutando...
call npx react-native run-android

pause
```

Ejecutar con:
```bash
.\build.bat
```

---

## 📝 Notas Importantes

1. **Primera Compilación**: Puede tardar 10-15 minutos (descarga dependencias)
2. **Compilaciones Subsecuentes**: 2-5 minutos normalmente
3. **Cache de Gradle**: Se guarda en `~/.gradle/caches` (no eliminar a menos que sea necesario)
4. **Metro Bundler**: Debe estar corriendo antes de ejecutar la app
5. **Hot Reload**: Presiona `R` dos veces en el emulador para recargar

---

## 🔍 Verificar Instalación

```bash
# Verificar Node.js
node --version

# Verificar npm
npm --version

# Verificar React Native CLI
npx react-native --version

# Verificar Java
java -version

# Verificar Android SDK
adb version
```

---

## 📚 Recursos Adicionales

- [Documentación Oficial React Native](https://reactnative.dev/docs/environment-setup)
- [Troubleshooting React Native](https://reactnative.dev/docs/troubleshooting)
- [Android Studio Guide](https://developer.android.com/studio)
