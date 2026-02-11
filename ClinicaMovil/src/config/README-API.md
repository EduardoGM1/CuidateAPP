# Configuración de API en ClinicaMovil

Esta carpeta controla **a qué backend se conecta la app móvil** (dev, red local, emulador, producción).

## Archivos clave

- `apiEndpoints.js`  
  - Define la **URL de producción** de la API: `PRODUCTION_API_BASE_URL`.  
  - Actualmente apunta a la VPS: `http://187.77.14.148`.  
  - Cuando tengas dominio + HTTPS, cambia SOLO aquí, por ej.:  
    ```js
    export const PRODUCTION_API_BASE_URL = 'https://api.tudominio.com';
    ```

- `apiConfig.js`  
  - Lógica inteligente de entornos:
    - `development`: `http://localhost:3000` (con `adb reverse`).
    - `localNetwork`: IP de red local o `API_BASE_URL_OVERRIDE`.
    - `emulator`: `http://10.0.2.2:3000`.
    - `production`: **SIEMPRE** usa `PRODUCTION_API_BASE_URL` de `apiEndpoints.js`.
  - En compilaciones **release** (`npx react-native run-android --mode=release`), la app usará la URL de producción.

- `apiUrlOverride.js`  
  - **Solo para desarrollo / pruebas**.  
  - Permite forzar una URL concreta de API (por ejemplo, IP local de la PC o Railway) cuando estás desarrollando.
  - En release debe quedar en:
    ```js
    export const API_BASE_URL_OVERRIDE = null;
    ```
    para que se use `PRODUCTION_API_BASE_URL`.

## Flujo recomendado

### Desarrollo local (backend en tu PC)

1. Arranca la API en tu PC (puerto 3000).
2. Conéctalo al emulador/dispositivo:
   ```bash
   adb reverse tcp:3000 tcp:3000
   ```
3. Deja:
   - `API_BASE_URL_OVERRIDE = null`
   - `PRODUCTION_API_BASE_URL` apuntando a la VPS (no afecta al dev).

La app usará `http://localhost:3000` en dev y la VPS en release.

### Pruebas contra la VPS desde el móvil (dev)

Si quieres que **desde dev** la app apunte directamente a la VPS:

```js
// apiUrlOverride.js
export const API_BASE_URL_OVERRIDE = 'http://187.77.14.148';
```

### Producción / Release

- `API_BASE_URL_OVERRIDE` debe quedar en `null`.
- `PRODUCTION_API_BASE_URL` debe apuntar al backend real (VPS o dominio HTTPS).

Cuando cambies a dominio:

```js
// apiEndpoints.js
export const PRODUCTION_API_BASE_URL = 'https://api.tudominio.com';
```

No hace falta tocar nada más; la app móvil en release usará automáticamente la nueva URL.

