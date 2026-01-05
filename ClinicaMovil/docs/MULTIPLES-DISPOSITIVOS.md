# 📱 Desarrollo con Múltiples Dispositivos Simultáneos

## ✅ Respuesta Rápida

**Sí, es posible tener múltiples dispositivos conectados a Metro simultáneamente.** Metro puede servir a varios dispositivos al mismo tiempo (emulador + dispositivo físico, o múltiples dispositivos físicos).

---

## 🚀 Configuración Rápida

### Paso 1: Iniciar Metro Bundler (Una sola vez)

```powershell
cd ClinicaMovil
npm start
```

Metro se ejecutará en `http://localhost:8081` y estará disponible para **todos los dispositivos** en tu red local.

### Paso 2: Conectar Dispositivos

#### Opción A: Emulador + Dispositivo Físico

**Para el Emulador Android:**
```powershell
# En una terminal separada
cd ClinicaMovil
npm run android
```

**Para el Dispositivo Físico:**
1. Conecta el dispositivo por USB
2. Habilita "Depuración USB" en el dispositivo
3. Verifica que esté conectado:
   ```powershell
   adb devices
   ```
4. Configura adb reverse para el backend:
   ```powershell
   adb reverse tcp:3000 tcp:3000
   ```
5. Instala la app en el dispositivo físico:
   ```powershell
   cd ClinicaMovil
   npx react-native run-android --deviceId=[ID_DEL_DISPOSITIVO]
   ```

#### Opción B: Múltiples Dispositivos Físicos

1. Conecta todos los dispositivos por USB
2. Verifica todos los dispositivos:
   ```powershell
   adb devices
   ```
   Deberías ver algo como:
   ```
   List of devices attached
   emulator-5554    device
   R58M1234567       device
   R58M7654321       device
   ```

3. Configura adb reverse para cada dispositivo:
   ```powershell
   # Para dispositivo 1
   adb -s R58M1234567 reverse tcp:3000 tcp:3000
   
   # Para dispositivo 2
   adb -s R58M7654321 reverse tcp:3000 tcp:3000
   ```

4. Instala la app en cada dispositivo:
   ```powershell
   # Dispositivo 1
   npx react-native run-android --deviceId=R58M1234567
   
   # Dispositivo 2 (en otra terminal)
   npx react-native run-android --deviceId=R58M7654321
   ```

---

## 🌐 Conectividad de Red

### Para Dispositivos Físicos (Sin USB)

Si prefieres conectar dispositivos físicos por Wi-Fi (sin USB):

1. **Asegúrate de que todos los dispositivos estén en la misma red Wi-Fi**

2. **Obtén la IP de tu computadora:**
   ```powershell
   ipconfig
   # Busca "IPv4 Address" (ejemplo: 192.168.1.65)
   ```

3. **En cada dispositivo físico:**
   - Abre la app
   - Agita el dispositivo → "Settings" → "Debug server host & port for device"
   - Ingresa: `192.168.1.65:8081` (reemplaza con tu IP)
   - Presiona "Reload"

4. **Para el backend API:**
   - Los dispositivos físicos usarán: `http://192.168.1.65:3000`
   - El emulador usará: `http://10.0.2.2:3000` (automático)

---

## 🔧 Scripts Útiles

### Script Automático para Conectar Múltiples Dispositivos

Ya existe un script en el proyecto que automatiza todo el proceso:

**Uso:**
```powershell
cd ClinicaMovil
.\scripts\connect-multiple-devices.ps1
```

Este script:
- ✅ Detecta automáticamente todos los dispositivos conectados
- ✅ Configura `adb reverse` para cada dispositivo
- ✅ Muestra la IP local para configuración Wi-Fi
- ✅ Proporciona comandos listos para copiar y pegar

**Ubicación:** `ClinicaMovil/scripts/connect-multiple-devices.ps1`

---

## 📊 Verificar Conexión

### Verificar que Metro está sirviendo a múltiples dispositivos

Cuando Metro está ejecutándose, deberías ver logs como:

```
Metro waiting on exp://192.168.1.65:8081
```

Y cuando los dispositivos se conectan, verás:

```
 BUNDLE  ./index.js
```

Cada dispositivo generará su propio bundle cuando se conecte.

### Verificar en la App

En cada dispositivo:
1. Agita el dispositivo → "Settings"
2. Verifica "Debug server host & port for device"
3. Debería mostrar la IP correcta (ejemplo: `192.168.1.65:8081`)

---

## 🎯 Casos de Uso

### 1. Probar en Diferentes Tamaños de Pantalla
- **Emulador**: Tablet (10 pulgadas)
- **Dispositivo Físico**: Teléfono (5.5 pulgadas)

### 2. Probar Funcionalidades Específicas
- **Emulador**: Para desarrollo rápido
- **Dispositivo Físico**: Para probar cámara, GPS, sensores, etc.

### 3. Testing en Tiempo Real
- **Dispositivo 1**: Como paciente
- **Dispositivo 2**: Como doctor
- Ambos conectados al mismo backend, probando interacciones en tiempo real

### 4. Comparar Rendimiento
- Ejecutar la misma funcionalidad en ambos dispositivos
- Comparar tiempos de respuesta, uso de memoria, etc.

---

## ⚠️ Consideraciones Importantes

### 1. Puerto 8081 (Metro)
- **Un solo Metro Bundler** puede servir a múltiples dispositivos
- No necesitas múltiples instancias de Metro

### 2. Puerto 3000 (Backend API)
- **Un solo servidor backend** puede servir a múltiples dispositivos
- Asegúrate de que el backend esté ejecutándose:
  ```powershell
  cd api-clinica
  node index.js
  ```

### 3. Hot Reload
- Los cambios en el código se reflejarán en **todos los dispositivos** simultáneamente
- Si un dispositivo tiene problemas, los otros seguirán funcionando

### 4. Debugging
- Puedes abrir múltiples instancias de Chrome DevTools
- Cada dispositivo tendrá su propia sesión de debugging

---

## 🐛 Solución de Problemas

### Error: "Port 8081 already in use"
```powershell
# Encontrar y matar el proceso
netstat -ano | findstr :8081
taskkill /PID [número_pid] /F
```

### Error: "Device not found"
```powershell
# Verificar dispositivos
adb devices

# Reiniciar adb
adb kill-server
adb start-server
adb devices
```

### Error: "Unable to load script"
En el dispositivo:
1. Agita el dispositivo → "Settings" → "Debug server host & port"
2. Verifica que la IP sea correcta
3. Presiona "Reload"

### Un dispositivo se conecta pero otro no
1. Verifica que ambos estén en la misma red Wi-Fi
2. Verifica que el firewall de Windows permita conexiones en el puerto 8081
3. Intenta reiniciar Metro:
   ```powershell
   # Detener Metro (Ctrl+C)
   npm start -- --reset-cache
   ```

---

## ✅ Checklist para Múltiples Dispositivos

- [ ] Metro Bundler ejecutándose (`npm start`)
- [ ] Backend API ejecutándose (`node index.js` en `api-clinica`)
- [ ] Todos los dispositivos conectados y visibles (`adb devices`)
- [ ] `adb reverse` configurado para cada dispositivo físico
- [ ] App instalada en cada dispositivo
- [ ] IP correcta configurada en cada dispositivo (si usa Wi-Fi)
- [ ] Hot reload funcionando en todos los dispositivos

---

## 🎉 Ventajas de Usar Múltiples Dispositivos

1. **Testing más rápido**: Pruebas en diferentes dispositivos simultáneamente
2. **Comparación en tiempo real**: Ver cómo se comporta la app en diferentes dispositivos
3. **Testing de interacciones**: Probar funcionalidades que requieren múltiples usuarios
4. **Detección temprana de bugs**: Encontrar problemas específicos de dispositivo más rápido

---

## 📚 Referencias

- [React Native - Running on Device](https://reactnative.dev/docs/running-on-device)
- [ADB - Android Debug Bridge](https://developer.android.com/studio/command-line/adb)
- [Metro Bundler Documentation](https://facebook.github.io/metro/)

