# 📱 Guía: Ejecutar App en Dispositivo Físico + Emulador

Esta guía te permite ejecutar la aplicación en **ambos dispositivos simultáneamente** para probar diferentes usuarios con diferentes roles.

---

## 🚀 MÉTODO RÁPIDO (Recomendado)

### Paso 1: Preparar Dispositivos

**Dispositivo Físico:**
- Conecta tu teléfono vía USB
- Habilita **Depuración USB** en opciones de desarrollador
- Acepta el diálogo de autorización si aparece

**Emulador:**
- Abre **Android Studio** → **AVD Manager**
- Inicia un emulador (o usa uno ya iniciado)

### Paso 2: Verificar Dispositivos

```powershell
adb devices
```

Deberías ver algo como:
```
List of devices attached
emulator-5554    device
HLGYD22718000911 device    # Tu dispositivo físico
```

### Paso 3: Instalar App en Ambos Dispositivos

```powershell
.\scripts\instalar-en-multiples-dispositivos.ps1
```

Este script:
- ✅ Detecta ambos dispositivos automáticamente
- ✅ Compila la aplicación
- ✅ Instala en ambos dispositivos
- ✅ Configura `adb reverse` para cada uno

### Paso 4: Iniciar Metro Bundler

En una **terminal nueva**:

```powershell
npx react-native start
```

Espera a que aparezca: `Metro waiting on...`

### Paso 5: Iniciar Apps en Ambos Dispositivos

```powershell
.\scripts\iniciar-apps-en-dispositivos.ps1
```

O manualmente:
```powershell
# Dispositivo físico
adb -s HLGYD22718000911 shell am start -n com.clinicamovil/.MainActivity

# Emulador
adb -s emulator-5554 shell am start -n com.clinicamovil/.MainActivity
```

---

## 📋 MÉTODO MANUAL (Paso a Paso)

### Paso 1: Conectar Dispositivos

**Dispositivo Físico:**
1. Conecta el teléfono vía USB
2. En el teléfono: **Configuración** → **Opciones de desarrollador** → **Depuración USB** (activar)
3. Acepta el diálogo de autorización en el teléfono

**Emulador:**
1. Abre **Android Studio**
2. **Tools** → **AVD Manager**
3. Haz clic en ▶️ para iniciar un emulador

### Paso 2: Verificar Conexión

```powershell
adb devices
```

Si no aparecen los dispositivos:
```powershell
adb kill-server
adb start-server
adb devices
```

### Paso 3: Compilar la App

```powershell
cd android
.\gradlew assembleDebug
cd ..
```

### Paso 4: Instalar en Dispositivo Físico

```powershell
adb -s HLGYD22718000911 install -r android\app\build\outputs\apk\debug\app-debug.apk
adb -s HLGYD22718000911 reverse tcp:3000 tcp:3000
adb -s HLGYD22718000911 reverse tcp:8081 tcp:8081
```

### Paso 5: Instalar en Emulador

```powershell
adb -s emulator-5554 install -r android\app\build\outputs\apk\debug\app-debug.apk
adb -s emulator-5554 reverse tcp:3000 tcp:3000
adb -s emulator-5554 reverse tcp:8081 tcp:8081
```

### Paso 6: Iniciar Metro Bundler

En una **terminal nueva**:

```powershell
npx react-native start
```

### Paso 7: Iniciar Apps

**Dispositivo Físico:**
```powershell
adb -s HLGYD22718000911 shell am start -n com.clinicamovil/.MainActivity
```

**Emulador:**
```powershell
adb -s emulator-5554 shell am start -n com.clinicamovil/.MainActivity
```

---

## ✅ Verificar que Funciona

1. **Metro Bundler** debe mostrar: `Metro waiting on...`
2. **Ambos dispositivos** deben tener la app abierta
3. Puedes usar **diferentes usuarios** en cada dispositivo:
   - **Dispositivo Físico**: Paciente
   - **Emulador**: Doctor/Administrador

---

## 🔧 Solución de Problemas

### ❌ "No se encontraron dispositivos"

**Solución:**
```powershell
# Reiniciar ADB
adb kill-server
adb start-server
adb devices

# Si el dispositivo físico no aparece:
# 1. Desconecta y reconecta el USB
# 2. Acepta el diálogo de autorización en el teléfono
# 3. Verifica que la depuración USB esté activada
```

### ❌ "Error al instalar"

**Solución:**
```powershell
# Desinstalar app anterior
adb -s HLGYD22718000911 uninstall com.clinicamovil
adb -s emulator-5554 uninstall com.clinicamovil

# Reinstalar
.\scripts\instalar-en-multiples-dispositivos.ps1
```

### ❌ "Metro no conecta"

**Solución:**
```powershell
# Verificar adb reverse
adb -s HLGYD22718000911 reverse tcp:8081 tcp:8081
adb -s emulator-5554 reverse tcp:8081 tcp:8081

# Recargar app en ambos dispositivos
# Agita el dispositivo → "Reload"
```

### ❌ "App se cierra al abrir"

**Solución:**
```powershell
# Ver logs
adb -s HLGYD22718000911 logcat | findstr "ReactNative"
adb -s emulator-5554 logcat | findstr "ReactNative"

# Limpiar cache de Metro
npx react-native start --reset-cache
```

---

## 📝 Comandos Útiles

### Ver dispositivos conectados
```powershell
adb devices
```

### Ver logs en tiempo real
```powershell
# Dispositivo físico
adb -s HLGYD22718000911 logcat

# Emulador
adb -s emulator-5554 logcat
```

### Recargar app en ambos dispositivos
```powershell
# Dispositivo físico
adb -s HLGYD22718000911 shell input keyevent 82  # Menú de desarrollo

# Emulador
adb -s emulator-5554 shell input keyevent 82  # Menú de desarrollo
```

### Desinstalar app
```powershell
adb -s HLGYD22718000911 uninstall com.clinicamovil
adb -s emulator-5554 uninstall com.clinicamovil
```

---

## 🎯 Flujo de Trabajo Recomendado

1. **Primera vez:**
   ```powershell
   .\scripts\instalar-en-multiples-dispositivos.ps1
   ```

2. **Cada vez que inicies desarrollo:**
   ```powershell
   # Terminal 1: Metro
   npx react-native start
   
   # Terminal 2: Iniciar apps
   .\scripts\iniciar-apps-en-dispositivos.ps1
   ```

3. **Después de cambios en código:**
   - Los cambios se reflejan automáticamente en ambos dispositivos
   - Si no, agita el dispositivo → "Reload"

---

## 📌 Notas Importantes

- ✅ **Metro puede servir a múltiples dispositivos** simultáneamente
- ✅ Cada dispositivo necesita su propio `adb reverse` (se hace automáticamente)
- ✅ Los cambios en código se reflejan en **ambos dispositivos** al mismo tiempo
- ✅ Puedes tener **más de 2 dispositivos** si quieres
- ✅ Funciona con cualquier combinación: emuladores + físicos

---

## 🆘 Obtener IDs de Dispositivos

Si no conoces los IDs de tus dispositivos:

```powershell
adb devices
```

Ejemplo de salida:
```
List of devices attached
emulator-5554        device    # ID: emulator-5554
HLGYD22718000911     device    # ID: HLGYD22718000911
```

Usa estos IDs en los comandos que requieren `-s <device-id>`.


