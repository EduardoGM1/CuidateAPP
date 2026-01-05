# 🔧 Solución: Dispositivo Físico No Puede Conectar a la API

**Problema:** El dispositivo físico no puede enviar o recibir datos de la API.

---

## ✅ Correcciones Aplicadas

### 1. **Actualización de `servicioApi.js`**
- ✅ Ahora usa `getApiConfigWithFallback()` que detecta automáticamente la mejor configuración
- ✅ Prueba en orden: localhost (adb reverse) → IP local → emulador
- ✅ Inicialización asíncrona para dispositivos físicos

### 2. **Actualización de `network_security_config.xml`**
- ✅ Permite HTTP (cleartext traffic) para desarrollo
- ✅ Incluye IP actual: `192.168.1.74`
- ✅ Incluye IPs comunes de desarrollo

### 3. **Actualización de `apiConfig.js`**
- ✅ IP actualizada a `192.168.1.74` (detectada automáticamente)
- ✅ Fallback inteligente que prueba diferentes configuraciones

---

## 🚀 Solución Rápida

### Paso 1: Configurar ADB Reverse

```powershell
# Configurar ADB reverse para Backend (puerto 3000)
adb reverse tcp:3000 tcp:3000

# Configurar ADB reverse para Metro (puerto 8081)
adb reverse tcp:8081 tcp:8081

# Verificar configuración
adb reverse --list
```

### Paso 2: Usar Script de Diagnóstico

```powershell
cd ClinicaMovil
.\scripts\diagnosticar-conexion-api.ps1
```

Este script:
- ✅ Verifica dispositivos conectados
- ✅ Configura ADB reverse automáticamente
- ✅ Detecta IPs locales
- ✅ Prueba conectividad al backend

### Paso 3: Reiniciar la Aplicación

Después de configurar ADB reverse, reinicia la aplicación:

```powershell
# Detener la app si está ejecutándose
# Luego reinstalar
npx react-native run-android
```

---

## 🔍 Verificación

### Verificar que ADB reverse está configurado:
```powershell
adb reverse --list
```

**Salida esperada:**
```
3000 tcp:3000
8081 tcp:8081
```

### Verificar que el backend está ejecutándose:
```powershell
# En otra terminal
cd api-clinica
npm start
```

Deberías ver:
```
Server running on port 3000
```

### Verificar logs de la app:
```powershell
npx react-native log-android
```

Busca mensajes como:
```
🌐 API inicializada: http://localhost:3000
✅ ADB reverse detectado y funcionando - usando localhost
```

---

## ⚠️ Problemas Comunes

### 1. **Error: "Network request failed"**

**Causa:** ADB reverse no está configurado o el backend no está ejecutándose.

**Solución:**
```powershell
# Configurar ADB reverse
adb reverse tcp:3000 tcp:3000

# Verificar que el backend está ejecutándose
# En otra terminal: cd api-clinica && npm start
```

### 2. **Error: "Cleartext HTTP traffic not permitted"**

**Causa:** Android bloquea HTTP en modo producción.

**Solución:** Ya está corregido en `network_security_config.xml` - permite HTTP en desarrollo.

### 3. **La app usa IP incorrecta**

**Causa:** La IP en `apiConfig.js` no coincide con la IP real de tu PC.

**Solución:**
1. Encuentra tu IP: `ipconfig` (Windows)
2. Actualiza `apiConfig.js` con tu IP real
3. O usa ADB reverse (recomendado)

### 4. **La app se conecta pero no recibe datos**

**Causa:** El backend puede estar rechazando peticiones.

**Solución:**
- Verifica logs del backend
- Verifica que CORS esté configurado correctamente
- Verifica que el token de autenticación sea válido

---

## 📝 Configuración Manual (Si los scripts no funcionan)

### Opción A: Usar ADB Reverse (Recomendado)

```powershell
# 1. Configurar ADB reverse
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081

# 2. La app usará localhost:3000 automáticamente
```

### Opción B: Usar IP de Red Local

```powershell
# 1. Encuentra tu IP
ipconfig

# 2. Actualiza apiConfig.js con tu IP
# Cambia '192.168.1.74' por tu IP real

# 3. Asegúrate de que el backend esté accesible desde la red
# Verifica firewall de Windows
```

---

## 🎯 Checklist de Solución

- [ ] ADB reverse configurado (`adb reverse --list`)
- [ ] Backend ejecutándose en puerto 3000
- [ ] Metro ejecutándose en puerto 8081
- [ ] IP actualizada en `apiConfig.js` (si usas IP local)
- [ ] `network_security_config.xml` permite HTTP
- [ ] App reiniciada después de cambios
- [ ] Logs verificados (`npx react-native log-android`)

---

## 📞 Si el Problema Persiste

1. **Ejecuta el script de diagnóstico:**
   ```powershell
   .\scripts\diagnosticar-conexion-api.ps1
   ```

2. **Verifica logs detallados:**
   ```powershell
   npx react-native log-android | Select-String -Pattern "API|Error|Network"
   ```

3. **Revisa la configuración:**
   - IP en `apiConfig.js` debe coincidir con tu IP real
   - `network_security_config.xml` debe permitir HTTP
   - Backend debe estar ejecutándose

---

**Última actualización:** $(Get-Date -Format "yyyy-MM-dd")
**IP actual detectada:** 192.168.1.74

