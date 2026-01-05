# 🚀 Guía Rápida: Múltiples Dispositivos con Metro

## ⚡ Inicio Rápido (3 Pasos)

### 1️⃣ Configurar ADB Reverse (Una vez por sesión)
```powershell
cd ClinicaMovil
.\scripts\configurar-multi-dispositivos.ps1
```

### 2️⃣ Iniciar Metro en Modo Multi-Dispositivo
```powershell
npm run start:multi
```

### 3️⃣ Ejecutar App en Cada Dispositivo
```powershell
# Terminal 2: Dispositivo físico
npm run android

# Terminal 3: Emulador (si tienes múltiples)
npx react-native run-android --deviceId=emulator-5554
```

---

## 📋 Comandos Útiles

### Verificar Estado
```powershell
.\scripts\verificar-multi-dispositivos.ps1
```

### Ver Dispositivos Conectados
```bash
adb devices
```

### Ver ADB Reverse Configurado
```bash
adb reverse --list
```

### Limpiar Cache y Reiniciar
```powershell
npm run start:multi:reset
```

---

## 🔧 Configuración Manual (Si los Scripts No Funcionan)

### Para Dispositivo Físico:
```bash
adb reverse tcp:8081 tcp:8081  # Metro
adb reverse tcp:3000 tcp:3000  # Backend
```

### Para Emulador:
```bash
adb -s emulator-5554 reverse tcp:8081 tcp:8081
adb -s emulator-5554 reverse tcp:3000 tcp:3000
```

---

## ⚠️ Problemas Comunes

**"Unable to connect to Metro"**
- ✅ Verifica que Metro está corriendo: `npm run start:multi`
- ✅ Verifica ADB reverse: `adb reverse --list`
- ✅ Reinicia Metro con cache limpio: `npm run start:multi:reset`

**Solo un dispositivo se conecta**
- ✅ Asegúrate de usar `--host 0.0.0.0` (ya está en `start:multi`)
- ✅ Verifica firewall de Windows (permite puerto 8081)

**Dispositivo físico no se conecta**
- ✅ Verifica USB: `adb devices`
- ✅ Reconfigura ADB reverse: `.\scripts\configurar-multi-dispositivos.ps1`

---

## 📚 Documentación Completa

Ver: `ClinicaMovil/docs/CONFIGURACION-MULTIPLES-DISPOSITIVOS.md`

---

**Última actualización:** 28/11/2025

