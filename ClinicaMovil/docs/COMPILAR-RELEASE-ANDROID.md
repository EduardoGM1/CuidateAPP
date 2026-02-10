# Compilar APK release (Android)

## Error: "ninja: manifest 'build.ninja' still dirty after 100 tries"

Este error suele aparecer en **Windows** cuando el proyecto está en una ruta **muy larga** o en **OneDrive** (sincronización puede dejar archivos “sucios” durante el build). El módulo afectado es `react-native-nitro-modules` (usado por ejemplo por `@react-native-voice/voice`).

### Soluciones recomendadas

1. **Compilar desde una ruta corta (recomendado)**  
   Copia el proyecto a una carpeta con camino corto, sin OneDrive:
   - Ejemplo: `C:\dev\ClinicaMovil`
   - Luego:
     ```bash
     cd C:\dev\ClinicaMovil
     npm install
     cd android
     .\gradlew.bat assembleRelease
     ```
   - El APK quedará en: `android\app\build\outputs\apk\release\app-release.apk`

2. **Pausar OneDrive**  
   Antes de compilar, pausa la sincronización de OneDrive para la carpeta del proyecto y vuelve a ejecutar:
   ```bash
   cd android
   .\gradlew.bat clean
   .\gradlew.bat assembleRelease
   ```

3. **Build en la nube (EAS Build)**  
   Si usas Expo o puedes configurar EAS:
   ```bash
   npx eas build -p android --profile production
   ```
   El build se hace en servidores de Expo y se evita el problema de rutas/OneDrive en tu PC.

## Comandos útiles

```bash
# Desde la raíz del proyecto (ClinicaMovil)
cd ClinicaMovil

# Generar solo el bundle JS (release)
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# Compilar APK release (después de lo anterior, si el build nativo falla puedes tener ya el bundle)
cd android
.\gradlew.bat assembleRelease
```

## Dónde está el APK

Si la compilación termina bien:

- **APK sin firmar:** `ClinicaMovil/android/app/build/outputs/apk/release/app-release-unsigned.apk`
- **APK firmado:** `ClinicaMovil/android/app/build/outputs/apk/release/app-release.apk` (si está configurada la firma en `build.gradle`).

Para instalar en un dispositivo: copia el `.apk` al móvil e instálalo, o usa `adb install app-release.apk`.
