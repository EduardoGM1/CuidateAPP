# 🔧 Solución: "No se pudo conectar con el servidor"

## ✅ Problema Resuelto

**Error:** Ambos dispositivos (emulador + físico) mostraban "No se pudo conectar con el servidor. Verifica tu conexión a internet."

**Causa:** 
1. `gestionService.js` estaba usando `http://localhost:3000` hardcodeado
2. Los dispositivos Android no pueden acceder a `localhost` sin `adb reverse`
3. `adb reverse` no estaba configurado para ambos dispositivos

## 🔧 Solución Aplicada

### 1. Configuración de `adb reverse`

Se configuró `adb reverse` para ambos dispositivos:

```powershell
# Para el emulador
adb -s emulator-5554 reverse tcp:3000 tcp:3000

# Para el dispositivo físico
adb -s HLGYD22718000911 reverse tcp:3000 tcp:3000
```

**Verificar configuración:**
```powershell
adb -s emulator-5554 reverse --list
adb -s HLGYD22718000911 reverse --list
```

### 2. Actualización de `gestionService.js`

Se actualizó `gestionService.js` para usar la configuración dinámica (igual que `authService.js`):

**Antes:**
```javascript
const API_BASE_URL = 'http://localhost:3000'; // hardcodeado
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // ...
});
```

**Después:**
```javascript
import { getApiConfig } from '../config/apiConfig';

let API_CONFIG = null;
let apiClient = null;

const initializeApiConfig = async () => {
  if (!API_CONFIG) {
    API_CONFIG = await getApiConfig(); // Configuración dinámica
    // ...
  }
  return API_CONFIG;
};

const getApiClient = async () => {
  if (!apiClient) {
    const config = await initializeApiConfig();
    apiClient = axios.create({
      baseURL: config.baseURL, // Usa la configuración dinámica
      // ...
    });
  }
  return apiClient;
};
```

### 3. Actualización de todas las llamadas API

Todas las llamadas a `apiClient` fueron actualizadas para usar `ensureApiClient()`:

**Antes:**
```javascript
const response = await apiClient.get(url);
```

**Después:**
```javascript
const client = await ensureApiClient();
const response = await client.get(url);
```

## 📋 Verificación

### 1. Verificar que el backend está ejecutándose

```powershell
netstat -an | findstr :3000
```

Deberías ver:
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING
```

### 2. Verificar dispositivos conectados

```powershell
adb devices
```

Deberías ver ambos dispositivos:
```
List of devices attached
HLGYD22718000911        device
emulator-5554   device
```

### 3. Verificar `adb reverse` configurado

```powershell
adb -s emulator-5554 reverse --list
adb -s HLGYD22718000911 reverse --list
```

Deberías ver:
```
host-34 tcp:3000 tcp:3000
UsbFfs tcp:3000 tcp:3000
```

### 4. Probar conexión desde los dispositivos

1. Abre la app en ambos dispositivos
2. Intenta hacer login o cualquier acción que requiera conexión al backend
3. Deberías ver en los logs del backend las peticiones entrantes

## 🚀 Script Automático

Para configurar `adb reverse` automáticamente para todos los dispositivos:

```powershell
cd ClinicaMovil
.\scripts\connect-multiple-devices.ps1
```

Este script:
- ✅ Detecta todos los dispositivos conectados
- ✅ Configura `adb reverse` para cada uno
- ✅ Muestra la IP local para configuración Wi-Fi

## ⚠️ Notas Importantes

1. **`adb reverse` se resetea al desconectar el dispositivo**: Necesitas ejecutar el comando cada vez que conectes un dispositivo nuevo.

2. **Para dispositivos físicos por Wi-Fi**: Si prefieres no usar USB, puedes configurar la IP manualmente en la app:
   - Agita el dispositivo → Settings → Debug server host & port
   - Ingresa: `[TU_IP_LOCAL]:8081` (ejemplo: `192.168.1.65:8081`)

3. **El backend debe estar ejecutándose**: Asegúrate de que el servidor backend esté corriendo en el puerto 3000.

## 🔍 Troubleshooting

### Error: "No se pudo conectar con el servidor"

1. **Verifica que el backend esté ejecutándose:**
   ```powershell
   netstat -an | findstr :3000
   ```

2. **Verifica `adb reverse`:**
   ```powershell
   adb -s [DEVICE_ID] reverse --list
   ```

3. **Reconfigura `adb reverse`:**
   ```powershell
   adb -s [DEVICE_ID] reverse tcp:3000 tcp:3000
   ```

4. **Reinicia la app** en el dispositivo

### Error: "Device not found"

1. **Verifica dispositivos conectados:**
   ```powershell
   adb devices
   ```

2. **Reinicia adb:**
   ```powershell
   adb kill-server
   adb start-server
   adb devices
   ```

### El emulador funciona pero el dispositivo físico no

1. **Verifica que ambos tengan `adb reverse` configurado:**
   ```powershell
   adb -s emulator-5554 reverse --list
   adb -s [PHYSICAL_DEVICE_ID] reverse --list
   ```

2. **Configura manualmente para el dispositivo físico:**
   ```powershell
   adb -s [PHYSICAL_DEVICE_ID] reverse tcp:3000 tcp:3000
   ```

## ✅ Checklist Final

- [ ] Backend ejecutándose en puerto 3000
- [ ] Metro Bundler ejecutándose en puerto 8081
- [ ] Ambos dispositivos conectados (`adb devices`)
- [ ] `adb reverse` configurado para ambos dispositivos
- [ ] `gestionService.js` actualizado con configuración dinámica
- [ ] App reiniciada en ambos dispositivos
- [ ] Conexión funcionando correctamente

