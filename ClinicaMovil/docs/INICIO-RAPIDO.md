# 🚀 Inicio Rápido - Modo Desarrollo

## ⚡ Comandos Rápidos (Windows)

### Paso 1: Abrir Metro Bundler
Abre una terminal PowerShell en la carpeta del proyecto:

```powershell
cd ClinicaMovil
npm start
```

Deberías ver algo como:
```
Metro waiting on exp://192.168.x.x:8081
```

### Paso 2: Ejecutar la App (En otra terminal)

**Para Android:**
```powershell
cd ClinicaMovil
npm run android
```

**Para iOS (solo Mac):**
```powershell
cd ClinicaMovil
npm run ios
```

---

## 📱 Verificar que Está en Modo Desarrollo

### 1. Menú de Desarrollo
- **Android**: Agita el dispositivo o presiona `Ctrl+M`
- **iOS**: Agita el dispositivo o presiona `Cmd+D`

Deberías ver un menú con opciones como:
- Reload
- Debug
- Show Inspector
- etc.

### 2. Performance Overlay
- **Toca 3 veces rápidamente** en cualquier parte de la pantalla
- Deberías ver el overlay con métricas (FPS, Memory, etc.)

### 3. Hot Reload
- Cambia algo en el código
- La app debería actualizarse automáticamente

---

## 🔧 Solución Rápida de Problemas

### Error: "Port 8081 in use"
```powershell
# Encontrar y matar el proceso
netstat -ano | findstr :8081
taskkill /PID [número_pid] /F

# Luego intenta de nuevo
npm start
```

### Error: "Unable to load script"
```powershell
# Limpiar cache y reiniciar
npm start -- --reset-cache
```

### Error: "Device not found"
```powershell
# Verificar dispositivos Android conectados
adb devices

# Si no aparece:
adb kill-server
adb start-server
adb devices
```

---

## ✅ Checklist

- [ ] Metro Bundler ejecutándose (`npm start`)
- [ ] Dispositivo/Emulador conectado
- [ ] App instalada y ejecutándose
- [ ] Menú de desarrollo accesible (Ctrl+M)
- [ ] Performance Overlay funciona (3 taps rápidos)

---

## 🎯 Una Vez que la App Esté Ejecutando

### Para ejecutar tests de rendimiento:

1. **Performance Overlay (Visual)**
   - Toca 3 veces rápido → Ver métricas en tiempo real

2. **Tests Automáticos (Consola)**
   - Abre React Native Debugger o Chrome DevTools
   - En la consola escribe:
     ```javascript
     executeAllPerformanceTests()
     ```

---

¡Eso es todo! Con estos pasos deberías tener la app en modo desarrollo. 🚀

