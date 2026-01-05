# 🔧 SOLUCIÓN: Problema de Conexión Dispositivo Móvil con API

**Fecha:** 28/11/2025  
**Problema:** Dispositivo móvil no tiene conexión con la API

---

## 🔍 DIAGNÓSTICO PASO A PASO

### ✅ 1. Verificar que el Backend esté Corriendo

**Comando:**
```powershell
# Verificar si el puerto 3000 está en uso
Test-NetConnection -ComputerName localhost -Port 3000
```

**Si no está corriendo:**
```powershell
cd api-clinica
npm start
```

**Verificar en el navegador:**
- Abre: `http://localhost:3000/api/mobile/config`
- Debe responder con JSON

---

### ✅ 2. Verificar Dispositivo Conectado

**Comando:**
```powershell
adb devices
```

**Debe mostrar:**
```
List of devices attached
XXXXXXXX    device
```

**Si no aparece:**
- Activa "Depuración USB" en el dispositivo
- Acepta el diálogo de "Permitir depuración USB"
- Conecta el cable USB

---

### ✅ 3. Configurar ADB Reverse (Método 1 - Recomendado)

**Para dispositivos físicos Android, ADB reverse permite usar `localhost`:**

```powershell
# Configurar ADB reverse para el backend
adb reverse tcp:3000 tcp:3000

# Configurar ADB reverse para Metro bundler
adb reverse tcp:8081 tcp:8081

# Verificar que esté configurado
adb reverse --list
```

**Debe mostrar:**
```
tcp:3000 tcp:3000
tcp:8081 tcp:8081
```

**Ventajas:**
- ✅ No necesitas cambiar la IP en el código
- ✅ Funciona automáticamente
- ✅ Más fácil de mantener

---

### ✅ 4. Usar IP de Red Local (Método 2 - Alternativa)

**Si ADB reverse no funciona, usar la IP de tu PC en la red local:**

**Tu IP actual detectada:** `192.168.1.74`

**Verificar que la IP sea correcta:**
```powershell
ipconfig | Select-String -Pattern "IPv4"
```

**Actualizar `apiConfig.js` si es necesario:**
```javascript
// En ClinicaMovil/src/config/apiConfig.js
const getLocalIP = () => {
  return '192.168.1.74'; // ← Cambiar si tu IP es diferente
};
```

**Verificar que el dispositivo esté en la misma red WiFi:**
- El dispositivo y la PC deben estar en la misma red WiFi
- No usar datos móviles

---

### ✅ 5. Verificar Firewall de Windows

**El firewall puede estar bloqueando conexiones:**

**Permitir puerto 3000:**
```powershell
# Abrir PowerShell como Administrador
New-NetFirewallRule -DisplayName "Backend API" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

**O manualmente:**
1. Abre "Firewall de Windows Defender"
2. Click en "Configuración avanzada"
3. Click en "Reglas de entrada"
4. Click en "Nueva regla"
5. Selecciona "Puerto" → TCP → 3000
6. Permite la conexión

---

### ✅ 6. Verificar Configuración de Red en Android

**El archivo `network_security_config.xml` ya está configurado correctamente:**
- ✅ Permite HTTP (cleartext traffic) en desarrollo
- ✅ Incluye tu IP: `192.168.1.74`
- ✅ Incluye localhost y 10.0.2.2

**Ubicación:** `ClinicaMovil/android/app/src/main/res/xml/network_security_config.xml`

**Si tu IP cambió, actualiza el archivo:**
```xml
<domain includeSubdomains="true">192.168.1.74</domain>
```

---

### ✅ 7. Verificar CORS en el Backend

**El backend ya está configurado para permitir conexiones desde dispositivos móviles:**

**Ubicación:** `api-clinica/index.js` (líneas 108-157)

**Configuración actual:**
- ✅ Permite todas las conexiones en desarrollo
- ✅ Headers móviles permitidos: `X-Device-ID`, `X-Platform`, `X-App-Version`
- ✅ Métodos permitidos: GET, POST, PUT, DELETE, OPTIONS, PATCH

**No requiere cambios** - ya está configurado correctamente

---

## 🚀 SOLUCIÓN RÁPIDA (Paso a Paso)

### Opción A: Usar ADB Reverse (Recomendado)

```powershell
# 1. Verificar dispositivo conectado
adb devices

# 2. Configurar ADB reverse
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081

# 3. Verificar configuración
adb reverse --list

# 4. Reiniciar la app en el dispositivo
# (Cierra y vuelve a abrir la app)
```

**Ventaja:** No necesitas cambiar nada en el código

---

### Opción B: Usar IP de Red Local

```powershell
# 1. Obtener tu IP local
ipconfig | Select-String -Pattern "IPv4"

# 2. Verificar que el backend esté accesible desde la red
# Abre en el navegador: http://TU_IP:3000/api/mobile/config
# Ejemplo: http://192.168.1.74:3000/api/mobile/config

# 3. Si funciona, la app debería conectarse automáticamente
# (getApiConfigWithFallback() detectará la IP automáticamente)
```

**Ventaja:** Funciona sin ADB reverse

---

## 🧪 PRUEBAS DE CONECTIVIDAD

### Desde la PC:

```powershell
# Probar localhost
Invoke-WebRequest -Uri "http://localhost:3000/api/mobile/config" -Method GET

# Probar IP local
Invoke-WebRequest -Uri "http://192.168.1.74:3000/api/mobile/config" -Method GET
```

### Desde el Dispositivo:

**Abre en el navegador del dispositivo:**
- `http://192.168.1.74:3000/api/mobile/config`

**Si funciona:** El problema está en la app  
**Si no funciona:** El problema está en la red/firewall

---

## 🔧 SCRIPT DE DIAGNÓSTICO AUTOMÁTICO

**Ejecuta el script de diagnóstico:**

```powershell
cd ClinicaMovil
.\scripts\diagnosticar-conexion-api.ps1
```

**Este script verifica:**
- ✅ Dispositivos conectados
- ✅ ADB reverse configurado
- ✅ IPs locales detectadas
- ✅ Conexión al backend
- ✅ Recomendaciones específicas

---

## ⚠️ PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: "Network request failed"

**Causas posibles:**
1. Backend no está corriendo
2. ADB reverse no configurado
3. IP incorrecta en `apiConfig.js`
4. Firewall bloqueando conexiones

**Solución:**
```powershell
# 1. Verificar backend
Test-NetConnection -ComputerName localhost -Port 3000

# 2. Configurar ADB reverse
adb reverse tcp:3000 tcp:3000

# 3. Verificar IP
ipconfig | Select-String -Pattern "IPv4"
```

---

### Problema 2: "Connection timeout"

**Causas posibles:**
1. Dispositivo y PC en redes diferentes
2. Firewall bloqueando
3. IP incorrecta

**Solución:**
- Asegúrate de que el dispositivo y la PC estén en la misma red WiFi
- Verifica el firewall
- Usa ADB reverse en lugar de IP local

---

### Problema 3: "CORS error"

**Causa:** Backend rechazando la conexión

**Solución:**
- El backend ya está configurado para permitir todas las conexiones en desarrollo
- Si persiste, verifica que `NODE_ENV=development` en el backend

---

### Problema 4: "Cleartext traffic not permitted"

**Causa:** Android bloqueando HTTP

**Solución:**
- El archivo `network_security_config.xml` ya está configurado
- Recompila la app después de cambios:
```powershell
cd ClinicaMovil
npm run android
```

---

## 📋 CHECKLIST DE VERIFICACIÓN

Antes de reportar el problema, verifica:

- [ ] Backend está corriendo en puerto 3000
- [ ] Dispositivo conectado (`adb devices`)
- [ ] ADB reverse configurado (`adb reverse --list`)
- [ ] Dispositivo y PC en la misma red WiFi
- [ ] Firewall permite conexiones en puerto 3000
- [ ] IP en `apiConfig.js` coincide con tu IP real
- [ ] App recompilada después de cambios

---

## 🎯 SOLUCIÓN RECOMENDADA (Orden de Prioridad)

1. **Primero:** Configurar ADB reverse
   ```powershell
   adb reverse tcp:3000 tcp:3000
   ```

2. **Segundo:** Verificar que el backend esté corriendo
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 3000
   ```

3. **Tercero:** Si ADB reverse no funciona, usar IP local
   - Verificar IP: `ipconfig`
   - Actualizar `apiConfig.js` si es necesario

4. **Cuarto:** Verificar firewall
   - Permitir puerto 3000 en Windows Firewall

---

## 📞 INFORMACIÓN ADICIONAL

**Tu configuración actual:**
- IP local: `192.168.1.74`
- Puerto backend: `3000`
- Puerto Metro: `8081`

**Archivos importantes:**
- `ClinicaMovil/src/config/apiConfig.js` - Configuración de API
- `ClinicaMovil/android/app/src/main/res/xml/network_security_config.xml` - Seguridad de red Android
- `api-clinica/index.js` - Configuración CORS del backend

---

**Última actualización:** 28/11/2025


