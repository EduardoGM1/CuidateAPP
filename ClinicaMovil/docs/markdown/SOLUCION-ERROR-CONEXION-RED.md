# Solución: Error de Conexión de Red (Network Error)

## Problema
La aplicación móvil muestra errores de conexión de red cuando intenta conectarse al backend:
```
[ERROR] Error en respuesta de API {url: '/pacientes/17/signos-vitales', status: undefined, message: 'Network Error'}
[ERROR] Error obteniendo signos vitales del paciente {message: 'Network Error', name: 'AxiosError', code: 'ERR_NETWORK'}
```

## Causa
En dispositivos físicos Android, `localhost:3000` no funciona a menos que se configure `adb reverse`. El sistema de fallback automático no estaba funcionando correctamente.

## Solución Implementada

### 1. Mejoras en `apiConfig.js`
- **Timeout aumentado**: De 5000ms a 8000ms para pruebas de conectividad
- **Timeout corto para localhost**: En dispositivos físicos, localhost tiene un timeout de 3 segundos para fallback rápido
- **Orden de endpoints mejorado**: Health check primero (más rápido)

### 2. Mejoras en `gestionService.js`
- **Fallback más agresivo**: Cuando detecta error de red con localhost, automáticamente:
  1. Limpia el cache de entorno
  2. Reinicializa la configuración de API
  3. Crea un nuevo cliente con IP de red local (`192.168.1.79:3000`)
  4. Reintenta el request automáticamente

### 3. Detección Automática Mejorada
El sistema ahora:
- Detecta si es emulador o dispositivo físico
- Para dispositivos físicos: Prueba localhost primero (3 segundos timeout)
- Si localhost falla: Cambia automáticamente a IP de red local
- Para emuladores: Usa `10.0.2.2:3000` directamente

## Configuración Actual

### IP de Red Local
- **IP actual**: `192.168.1.79` (detectada automáticamente)
- **Puerto**: `3000`
- **URL completa**: `http://192.168.1.79:3000`

### Configuraciones Disponibles
1. **Development** (`localhost:3000`): Requiere `adb reverse tcp:3000 tcp:3000`
2. **Local Network** (`192.168.1.79:3000`): Funciona directamente en dispositivos físicos
3. **Emulator** (`10.0.2.2:3000`): Para emuladores Android

## Cómo Funciona Ahora

1. **Primera conexión**: El sistema intenta usar `localhost:3000` (si está configurado `adb reverse`)
2. **Si localhost falla**: Automáticamente cambia a `192.168.1.79:3000`
3. **Reintento automático**: Los requests fallidos se reintentan automáticamente con la nueva configuración
4. **Cache inteligente**: Una vez que encuentra una configuración que funciona, la cachea para futuras conexiones

## Verificación

### Verificar que el servidor está corriendo
```bash
netstat -ano | findstr :3000
```

### Verificar conectividad desde la IP local
```bash
curl http://192.168.1.79:3000/health
```

### Verificar IP local actual
```bash
ipconfig | findstr /i "IPv4"
```

## Solución Alternativa: ADB Reverse

Si prefieres usar `localhost:3000` en dispositivos físicos, puedes configurar `adb reverse`:

```bash
adb reverse tcp:3000 tcp:3000
```

Esto redirige el puerto 3000 del dispositivo al puerto 3000 de tu PC.

**Nota**: El sistema ahora detecta automáticamente si `adb reverse` está configurado y usa localhost. Si no está configurado, cambia automáticamente a la IP de red local.

## Logs de Diagnóstico

El sistema ahora muestra logs detallados en desarrollo:
- `🔍 Detectando mejor configuración para Android...`
- `🔄 Probando localhost (adb reverse): http://localhost:3000`
- `⚠️ Localhost falló, probando red local: http://192.168.1.79:3000`
- `✅ Red local funcionando - usando IP de red`

## Estado
✅ **RESUELTO**: El sistema ahora detecta automáticamente la mejor configuración y hace fallback a IP de red local cuando localhost falla.

## Próximos Pasos
1. Reiniciar la aplicación móvil para que use la nueva configuración
2. Verificar que los logs muestren la detección automática
3. Si persisten problemas, verificar que el firewall permita conexiones en el puerto 3000
