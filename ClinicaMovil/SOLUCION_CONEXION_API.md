# 🔧 Solución de Problemas de Conexión con la API

## Problema
La API está activa pero la app no conecta correctamente.

## Soluciones Rápidas

### 1. Para Dispositivos Físicos Android

**Opción A: Usar ADB Reverse (Recomendado)**
```bash
# Conecta tu dispositivo Android por USB
# Luego ejecuta en tu terminal:
adb reverse tcp:3000 tcp:3000
```

**Opción B: Usar IP de Red Local**
- Asegúrate de que tu PC y dispositivo estén en la misma red WiFi
- La IP actual configurada es: `192.168.1.74`
- Verifica que el servidor esté corriendo en el puerto 3000

### 2. Para Emulador Android

El emulador usa automáticamente `10.0.2.2:3000` que apunta a `localhost:3000` de tu PC.

### 3. Verificar que el Servidor Esté Corriendo

```bash
# En la carpeta del backend, verifica que el servidor esté activo:
cd api-clinica
npm start

# O si usas otro comando:
node server.js
```

### 4. Verificar la IP de tu PC

**Windows:**
```bash
ipconfig
# Busca "Dirección IPv4" en la sección de tu adaptador WiFi/Ethernet
```

**Linux/Mac:**
```bash
ifconfig
# O
ip addr show
```

### 5. Actualizar la IP en la Configuración

Si tu IP cambió, actualiza el archivo:
`ClinicaMovil/src/config/apiConfig.js`

En la función `getLocalIP()`, actualiza el primer valor del array:
```javascript
const commonIPs = [
  'TU_IP_AQUI',    // Ejemplo: '192.168.1.74'
  // ...
];
```

## Diagnóstico en la App

La app ahora incluye mejor logging. Revisa la consola de Metro para ver:
- ✅ `API inicializada: http://...`
- ✅ `Conexión verificada exitosamente`
- ⚠️ Advertencias sobre problemas de conexión

## Pruebas de Conectividad

Puedes probar manualmente desde tu dispositivo:

1. Abre un navegador en tu dispositivo Android
2. Ve a: `http://192.168.1.74:3000/api/mobile/config`
3. Si ves una respuesta JSON, la conexión funciona
4. Si no, verifica el firewall de Windows

## Firewall de Windows

Si el servidor no responde, verifica el firewall:

1. Abre "Firewall de Windows Defender"
2. Permite Node.js a través del firewall
3. O desactiva temporalmente el firewall para probar

## Reiniciar la Configuración de la App

Si cambiaste la configuración, reinicia la app completamente:
```bash
# Detén Metro
# Luego:
npx react-native start --reset-cache
npx react-native run-android
```

## Contacto

Si el problema persiste, revisa los logs de Metro para más detalles sobre el error específico.

