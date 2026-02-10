# Configurar la app móvil con la API en Railway

La API está desplegada en **Railway**:  
`https://cuidateappbackend-production.up.railway.app`

## Comportamiento por tipo de build

| Modo | Qué URL usa la app |
|------|--------------------|
| **Debug / desarrollo** (`npx react-native run-android` o `run-ios`) | Local: localhost, IP de red o `apiUrlOverride.js` |
| **Release / producción** (`--mode=release` o build firmado) | **Railway**: `apiConfig.js` → `production.baseURL` |

En builds **release**, `__DEV__` es `false`, así que la app usa siempre la config **production** (Railway). No hace falta cambiar nada más.

## Archivos clave

- **`src/config/apiConfig.js`**  
  - `production.baseURL` = URL de Railway (ya configurada).  
  - Aquí se definen development, emulator, localNetwork y production.

- **`src/config/apiUrlOverride.js`**  
  - Si pones una URL, **anula** la detección automática (solo en desarrollo).  
  - `null` = usar detección automática (localhost / IP de red).  
  - Para probar Railway desde dev:  
    `API_BASE_URL_OVERRIDE = 'https://cuidateappbackend-production.up.railway.app'`

## Compilar la app para usar solo Railway

### Android (APK release)

```bash
cd ClinicaMovil
npx react-native run-android --mode=release
```

O generar el bundle y el APK:

```bash
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

### iOS (release)

```bash
npx react-native run-ios --configuration Release
```

En Xcode: seleccionar **Any iOS Device** y **Product → Archive** para generar el IPA.

## Probar Railway desde desarrollo

Sin compilar en release, puedes apuntar la app a Railway:

1. Abre **`src/config/apiUrlOverride.js`**.
2. Pon:
   ```js
   export const API_BASE_URL_OVERRIDE = 'https://cuidateappbackend-production.up.railway.app';
   ```
3. Ejecuta la app en modo debug:  
   `npx react-native run-android` o `run-ios`.

Todas las peticiones irán a Railway. Para volver a la API local, pon de nuevo `null` o la IP de tu PC.

## WebSockets

El chat y la conexión en tiempo real usan la misma URL base que la API (la que devuelve `getApiConfigSync()`). Si la app está en producción o con override a Railway, los WebSockets apuntan automáticamente a Railway.

## Resumen

- **Producción (release):** la app usa Railway por defecto (`apiConfig.js` → production).
- **Desarrollo:** usa local/IP o override; si quieres Railway en dev, configura `API_BASE_URL_OVERRIDE` en `apiUrlOverride.js`.
