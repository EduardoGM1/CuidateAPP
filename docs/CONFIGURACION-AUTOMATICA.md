# 🚀 Configuración Automática de Desarrollo

## 📋 Descripción
Sistema de configuración automática que detecta la IP local y configura la conectividad entre el frontend móvil y el backend sin necesidad de cambios manuales.

## 🔧 Archivos Creados

### Frontend (React Native)
- `src/config/apiConfig.js` - Configuración avanzada con detección automática
- `src/config/simpleApiConfig.js` - Configuración simple con fallback

### Backend (Node.js)
- `scripts/configure-server.js` - Script de configuración del servidor
- `scripts/start-dev.js` - Script de inicio automático

### Utilidades
- `start-dev.bat` - Script de Windows para inicio rápido

## 🚀 Uso Rápido

### Opción 1: Script de Windows (Más Fácil)
```bash
# Ejecutar desde la carpeta Backend
start-dev.bat
```

### Opción 2: Manual
```bash
# 1. Configurar adb reverse
adb reverse tcp:3000 tcp:3000

# 2. Iniciar servidor
cd api-clinica
node index.js

# 3. La app móvil detectará automáticamente la IP correcta
```

## 🔄 Cómo Funciona

### Detección Automática
1. **Frontend**: Prueba `localhost:3000` primero (con adb reverse)
2. **Fallback**: Si falla, prueba `192.168.1.65:3000` (red local)
3. **Producción**: Usa `https://api.tuclinica.com`

### Configuración Dinámica
```javascript
// El frontend detecta automáticamente:
const config = await getApiConfig();
// Resultado: { baseURL: 'http://localhost:3000', timeout: 10000 }
```

## 📱 Para Diferentes Dispositivos

### Dispositivo Físico Android
- **Con adb reverse**: `http://localhost:3000`
- **Sin adb reverse**: `http://192.168.1.65:3000`

### Emulador Android
- **Automático**: `http://10.0.2.2:3000`

### iOS Simulator
- **Automático**: `http://localhost:3000`

## 🛠️ Solución de Problemas

### Servidor no responde
```bash
# Verificar que esté corriendo
netstat -an | findstr :3000

# Reiniciar servidor
cd api-clinica
node index.js
```

### App móvil no conecta
```bash
# Verificar adb reverse
adb reverse tcp:3000 tcp:3000

# Probar conectividad
curl http://localhost:3000/health
curl http://192.168.1.65:3000/health
```

### IP cambió
- El sistema detecta automáticamente la nueva IP
- No requiere cambios manuales

## 🎯 Ventajas

✅ **Sin cambios manuales**: Detecta IP automáticamente
✅ **Fallback inteligente**: Prueba múltiples opciones
✅ **Multiplataforma**: Funciona en Android, iOS, emuladores
✅ **Desarrollo rápido**: Un comando para iniciar todo
✅ **Producción lista**: Configuración automática para producción

## 📊 Estado de Conectividad

El sistema muestra automáticamente:
- ✅ `localhost:3000` - Con adb reverse
- ✅ `192.168.1.65:3000` - Red local
- ❌ Servidor no responde

## 🔮 Futuras Mejoras

- [ ] Detección automática de IP en tiempo real
- [ ] Configuración de múltiples servidores
- [ ] Monitoreo de conectividad en tiempo real
- [ ] Configuración de proxy automática




