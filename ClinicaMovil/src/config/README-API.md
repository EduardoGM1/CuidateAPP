# Configuración de la API (app móvil)

## Comportamiento por defecto

| Build        | API usada                          |
|-------------|-------------------------------------|
| **Release** | API online (VPS): `http://187.77.14.148` |
| **Debug**   | Detección automática: localhost (adb reverse), IP local o emulador |

La URL de producción está centralizada en **`apiEndpoints.js`**. Al pasar a dominio/HTTPS, solo se cambia ahí.

## Archivos

- **`apiEndpoints.js`** – URL base de la API en producción (VPS). Única fuente de verdad.
- **`apiConfig.js`** – Entornos (development, production, emulator, localNetwork) y detección automática.
- **`apiUrlOverride.js`** – Override opcional: si no es `null`, la app usa siempre esa URL (útil para probar API online en dev).

## Forzar API online en desarrollo

Para que la app use siempre la API del servidor (incluso en modo debug):

1. Abre `apiUrlOverride.js`.
2. Sustituye por:
   ```js
   import { PRODUCTION_API_BASE_URL } from './apiEndpoints';
   export const API_BASE_URL_OVERRIDE = PRODUCTION_API_BASE_URL;
   ```

## Cambiar a dominio con HTTPS

1. Edita `apiEndpoints.js`.
2. Cambia `PRODUCTION_API_BASE_URL` a tu URL, por ejemplo: `'https://api.tudominio.com'`.
3. En `apiConfig.js`, en `production`, pon `forceHttps: true`.

## Probar en dispositivo físico contra PC local

1. PC y teléfono en el mismo WiFi.
2. En la PC: `ipconfig` → anota la IPv4 (ej. 192.168.1.68).
3. En `apiUrlOverride.js`: `export const API_BASE_URL_OVERRIDE = 'http://192.168.1.68:3000';`
4. Firewall Windows: permitir conexiones entrantes en el puerto 3000 (red privada).

