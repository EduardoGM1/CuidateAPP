# 📱 Guía: Instalar Aplicación en Dispositivo Físico

**Objetivo:** Configurar e instalar la aplicación React Native en un dispositivo Android físico.

---

## 📋 Requisitos Previos

1. ✅ **Android SDK** instalado
2. ✅ **ADB (Android Debug Bridge)** en el PATH
3. ✅ **Node.js** y **npm** instalados
4. ✅ **Backend** ejecutándose (opcional, para funcionalidad completa)

---

## 🚀 Configuración Rápida (3 Pasos)

### Paso 1: Preparar el Dispositivo

1. **Conectar dispositivo por USB**
2. **Habilitar Depuración USB:**
   - Ajustes → Acerca del teléfono
   - Toca "Número de compilación" **7 veces**
   - Regresa a Ajustes → **Opciones de desarrollador**
   - Activa **"Depuración USB"**
   - Activa **"Instalar vía USB"** (opcional)
3. **Aceptar diálogo de depuración** en el dispositivo**

### Paso 2: Verificar Conexión

```powershell
# Verificar que el dispositivo está conectado
adb devices
```

**Salida esperada:**
```
List of devices attached
R58M1234567    device
```

### Paso 3: Instalar la Aplicación

#### Opción A: Script Automático (Recomendado)

```powershell
cd ClinicaMovil
.\scripts\instalar-dispositivo-fisico.ps1
```

Este script:
- ✅ Detecta automáticamente el dispositivo
- ✅ Configura ADB reverse para Metro y Backend
- ✅ Instala la aplicación

#### Opción B: Manual

```powershell
# 1. Configurar ADB reverse
adb reverse tcp:8081 tcp:8081  # Metro
adb reverse tcp:3000 tcp:3000  # Backend

# 2. Iniciar Metro (en una terminal)
cd ClinicaMovil
npm run start:multi

# 3. Instalar app (en otra terminal)
cd ClinicaMovil
npx react-native run-android
```

---

## 🔧 Configuración Detallada

### 1. Configurar Metro para Dispositivos Físicos

Metro debe escuchar en `0.0.0.0` para permitir conexiones desde la red local.

**Iniciar Metro con soporte multi-dispositivo:**
```powershell
npm run start:multi
# O directamente:
npx @react-native-community/cli start --host 0.0.0.0
```

**Verificar que Metro está escuchando:**
```
Metro waiting on 0.0.0.0:8081
```

### 2. Configurar ADB Reverse

ADB reverse permite que el dispositivo físico acceda a servicios en `localhost` de tu PC.

**Configurar para Metro:**
```powershell
adb reverse tcp:8081 tcp:8081
```

**Configurar para Backend:**
```powershell
adb reverse tcp:3000 tcp:3000
```

**Para múltiples dispositivos:**
```powershell
# Dispositivo 1
adb -s R58M1234567 reverse tcp:8081 tcp:8081
adb -s R58M1234567 reverse tcp:3000 tcp:3000

# Dispositivo 2
adb -s R58M7654321 reverse tcp:8081 tcp:8081
adb -s R58M7654321 reverse tcp:3000 tcp:3000
```

### 3. Instalar la Aplicación

**Instalar en dispositivo específico:**
```powershell
npx react-native run-android --deviceId=R58M1234567
```

**Instalar en primer dispositivo disponible:**
```powershell
npx react-native run-android
```

---

## 📱 Conexión por WiFi (Opcional)

Si prefieres conectar por WiFi en lugar de USB:

### Paso 1: Conectar por USB primero
```powershell
adb devices
```

### Paso 2: Obtener IP del dispositivo
```powershell
adb shell ip addr show wlan0
# O
adb shell ifconfig wlan0
```

### Paso 3: Conectar por TCP/IP
```powershell
adb tcpip 5555
adb connect <IP_DEL_DISPOSITIVO>:5555
```

### Paso 4: Desconectar USB
El dispositivo seguirá conectado por WiFi.

---

## 🔍 Verificar Instalación

### 1. Verificar que la app se instaló
```powershell
adb shell pm list packages | findstr clinica
```

### 2. Verificar conexión a Metro
- Abre la app en el dispositivo
- Agita el dispositivo o presiona `Ctrl+M` (si usas emulador)
- Selecciona "Settings"
- Verifica que "Debug server host & port" sea `localhost:8081`

### 3. Verificar logs
```powershell
npx react-native log-android
```

---

## ⚠️ Solución de Problemas

### Error: "Device not found"
```powershell
# Reiniciar ADB
adb kill-server
adb start-server
adb devices
```

### Error: "Unable to load script"
```powershell
# Limpiar cache de Metro
npm start -- --reset-cache
```

### Error: "Port 8081 in use"
```powershell
# Encontrar y matar el proceso
netstat -ano | findstr :8081
taskkill /PID [número_pid] /F
```

### La app no se conecta a Metro
1. Verifica que Metro esté ejecutándose
2. Verifica ADB reverse: `adb reverse --list`
3. En la app, agita el dispositivo → Settings → Cambiar host a `localhost:8081`

### Error: "INSTALL_FAILED_INSUFFICIENT_STORAGE"
- Libera espacio en el dispositivo
- O desinstala la app anterior: `adb uninstall com.clinicamovil`

---

## 📝 Scripts Disponibles

### `instalar-dispositivo-fisico.ps1`
Instala la aplicación en un dispositivo físico (configuración automática).

### `configurar-dispositivo-fisico.ps1`
Solo configura ADB reverse (útil si Metro ya está ejecutándose).

### `listar-dispositivos.ps1`
Lista todos los dispositivos conectados con información detallada.

### `iniciar-metro-multi-dispositivo.ps1`
Inicia Metro con soporte para múltiples dispositivos.

---

## ✅ Checklist de Instalación

- [ ] Dispositivo conectado por USB
- [ ] Depuración USB habilitada
- [ ] Dispositivo visible en `adb devices`
- [ ] ADB reverse configurado (puertos 8081 y 3000)
- [ ] Metro ejecutándose con `--host 0.0.0.0`
- [ ] Aplicación instalada en el dispositivo
- [ ] App se conecta a Metro correctamente
- [ ] Backend accesible desde el dispositivo

---

## 🎯 Comandos Rápidos

```powershell
# Ver dispositivos
adb devices

# Configurar ADB reverse
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000

# Iniciar Metro
npm run start:multi

# Instalar app
npx react-native run-android

# Ver logs
npx react-native log-android

# Reiniciar ADB
adb kill-server && adb start-server
```

---

**Última actualización:** $(Get-Date -Format "yyyy-MM-dd")

