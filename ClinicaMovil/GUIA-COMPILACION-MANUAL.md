# 📱 Guía de Compilación Manual - CuidateApp (React Native)

**Proyecto:** ClinicaMovil  
**Plataforma:** Android (Windows)  
**Última actualización:** Enero 2026

---

## 1. CHECKLIST DE REQUISITOS

Antes de compilar, verifica que todo esté instalado y configurado.

### 1.1 Node.js y npm
- **Requerido:** Node.js >= 20 (el proyecto especifica `"node": ">=20"`)
- **Verificar:**
  ```powershell
  node --version   # Ejemplo: v22.15.1
  npm --version    # Ejemplo: 10.9.2
  ```
- **Instalar:** [https://nodejs.org](https://nodejs.org) (versión LTS)

### 1.2 Java JDK
- **Requerido:** JDK 17 (el proyecto usa `jvmTarget = "17"` y `JavaVersion.VERSION_17`)
- **Verificar:**
  ```powershell
  java -version
  javac -version
  ```
- **Nota:** Si tienes Java 21, suele ser compatible. Si hay errores, instala JDK 17.
- **Instalar:** [Adoptium JDK 17](https://adoptium.net/) o [Oracle JDK 17](https://www.oracle.com/java/technologies/downloads/#java17)

### 1.3 Android SDK
- **Requerido:** Android SDK con Build Tools 36.0.0, compileSdk 36, targetSdk 36, minSdk 24
- **Variable de entorno:** `ANDROID_HOME` debe apuntar al SDK
  - Ejemplo: `C:\Users\<tu_usuario>\AppData\Local\Android\Sdk`
- **Verificar:**
  ```powershell
  echo $env:ANDROID_HOME
  Test-Path "$env:ANDROID_HOME\platform-tools\adb.exe"   # Debe ser True
  ```
- **Componentes recomendados (Android Studio / SDK Manager):**
  - Android SDK Platform 36
  - Android SDK Build-Tools 36.0.0
  - Android SDK Platform-Tools
  - Android SDK Command-line Tools
  - Android Emulator (opcional)
  - NDK (si se requiere, Gradle puede descargarlo)

### 1.4 Dependencias del proyecto
- **Verificar:** Que exista la carpeta `node_modules` en `ClinicaMovil`
- **Si no existe:**
  ```powershell
  cd ClinicaMovil
  npm install
  ```

### 1.5 Resumen de tu entorno (verificado)
| Requisito      | Estado |
|----------------|--------|
| Node.js >= 20  | ✅ v22.15.1 |
| npm            | ✅ 10.9.2 |
| Java           | ✅ 21.0.7 (compatible con 17) |
| ANDROID_HOME   | ✅ Configurado |
| platform-tools | ✅ Presente |
| node_modules   | ✅ 777 paquetes |

---

## 2. COMPILAR MANUALMENTE (PASO A PASO)

### 2.1 Abrir terminal en la raíz del proyecto móvil
```powershell
cd "c:\Users\eduar\OneDrive\Escritorio\CuidateApp\CuidateAPP\ClinicaMovil"
```

### 2.2 (Opcional) Limpiar caché y builds anteriores
```powershell
# Limpiar Metro
npx react-native start --reset-cache
# Cierra con Ctrl+C después de que arranque, o déjalo en otra terminal

# En otra terminal: limpiar build de Android
cd android
.\gradlew.bat clean
cd ..
```

### 2.3 Generar el bundle de JavaScript (necesario para Release)
Para **Release** (APK/AAB) el bundle se suele generar durante el build. Para comprobaciones manuales:
```powershell
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
```
*(Si la carpeta `android/app/src/main/assets` no existe, créala.)*

### 2.4 Compilar solo el APK (sin instalar en dispositivo)

#### Debug (rápido, para pruebas)
```powershell
cd ClinicaMovil\android
.\gradlew.bat assembleDebug
cd ..\..
```
- **Salida:** `ClinicaMovil\android\app\build\outputs\apk\debug\app-debug.apk`

#### Release (para distribución)
```powershell
cd ClinicaMovil\android
.\gradlew.bat assembleRelease
cd ..\..
```
- **Salida:** `ClinicaMovil\android\app\build\outputs\apk\release\app-release.apk`  
- **Nota:** Para Release necesitas tener configurado un keystore (firmar la app). Si no está configurado, el build puede fallar o pedir configuración de firma.

### 2.5 Compilar AAB (Android App Bundle) para Google Play
```powershell
cd ClinicaMovil\android
.\gradlew.bat bundleRelease
cd ..\..
```
- **Salida:** `ClinicaMovil\android\app\build\outputs\bundle\release\app-release.aab`

### 2.6 Compilar e instalar en dispositivo/emulador (recomendado para desarrollo)
```powershell
cd ClinicaMovil
npx react-native run-android
```
- Requiere un emulador Android abierto o un dispositivo conectado por USB con depuración USB activada.
- Primero arranca Metro (o usa `npx react-native start` en otra terminal).

---

## 3. USAR EL SCRIPT DE COMPILACIÓN DEL PROYECTO

El proyecto incluye `compilar.ps1`, que limpia caché, verifica dependencias, inicia Metro y ejecuta la app en Android:
```powershell
cd ClinicaMovil
.\compilar.ps1
```

---

## 4. UBICACIÓN DE LOS ARCHIVOS GENERADOS

| Tipo        | Ruta relativa a `ClinicaMovil` |
|------------|---------------------------------|
| APK Debug  | `android\app\build\outputs\apk\debug\app-debug.apk` |
| APK Release | `android\app\build\outputs\apk\release\app-release.apk` |
| AAB Release | `android\app\build\outputs\bundle\release\app-release.aab` |

---

## 5. CONFIGURACIÓN DE FIRMA (Release)

Para `assembleRelease` o `bundleRelease` necesitas un keystore. Si ya existe uno en el proyecto, Gradle puede usarlo vía `android/app/build.gradle` (signingConfigs). Si no:

1. Generar keystore:
   ```powershell
   keytool -genkeypair -v -storetype PKCS12 -keystore clinicamovil-release.keystore -alias clinicamovil -keyalg RSA -keysize 2048 -validity 10000
   ```
2. En `android/gradle.properties` (o variables de entorno) definir las rutas y contraseñas del keystore y referenciarlas en `android/app/build.gradle` en `signingConfigs.release`.

---

## 6. ERROR "Filename longer than 260 characters" (Windows)

Si el build falla con *Filename longer than 260 characters* al compilar CMake/ninja (p. ej. `react_codegen_safeareacontext`), la ruta del proyecto es demasiado larga para el límite de Windows. En React Native 0.82+ la Nueva Arquitectura es obligatoria y no se puede desactivar; usar `subst` no basta porque Gradle/CMake resuelven la ruta real.

**Solución 1 – Compilar desde copia en ruta corta (recomendada, sin reiniciar):**

1. Desde la carpeta **ClinicaMovil**, ejecuta:
   ```cmd
   compilar-desde-copia-ruta-corta.bat
   ```
   El script copia el proyecto a `C:\CuidateAPP\ClinicaMovil`, compila e instala desde ahí (rutas cortas) y copia el APK de vuelta al proyecto original. La primera vez tarda más por la copia; después solo sincroniza cambios.

**Solución 2 – Habilitar rutas largas en Windows (definitiva, requiere reinicio):**

1. Ejecutar PowerShell **como Administrador**.
2. En la carpeta ClinicaMovil ejecutar:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; .\habilitar-rutas-largas-windows.ps1
   ```
   O manualmente: Editor del Registro → `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem` → `LongPathsEnabled` = `1` (DWORD).
3. Reiniciar el equipo.
4. A partir de entonces puedes compilar con `npx react-native run-android` o `gradlew app:installDebug` desde la ruta normal.

---

## 7. SOLUCIÓN DE PROBLEMAS FRECUENTES

- **"SDK location not found":** Crea `android/local.properties` con:
  ```properties
  sdk.dir=C:\\Users\\eduar\\AppData\\Local\\Android\\Sdk
  ```
  (Ajusta la ruta a tu `ANDROID_HOME` y usa doble backslash.)

- **"Unable to load script":** Asegúrate de que Metro esté corriendo (`npx react-native start`) o de que el bundle esté generado en `android/app/src/main/assets/` para builds Release.

- **Errores de Java/Gradle:** Confirma que `JAVA_HOME` apunte al JDK correcto (17 recomendado) y que `.\gradlew.bat clean` y luego `assembleDebug` se ejecuten desde `ClinicaMovil\android`.

- **Memoria en Gradle:** En `android/gradle.properties` ya tienes `org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m`. Si hace falta, sube `-Xmx` (por ejemplo a 4096m).

---

## 8. RESUMEN RÁPIDO (COPIAR Y PEGAR)

```powershell
# 1. Ir al proyecto
cd "c:\Users\eduar\OneDrive\Escritorio\CuidateApp\CuidateAPP\ClinicaMovil"

# 2. Dependencias (si hace falta)
npm install

# 3. Compilar APK Debug
cd android
.\gradlew.bat assembleDebug
cd ..

# 4. APK generado en:
# android\app\build\outputs\apk\debug\app-debug.apk
```

Para ejecutar en dispositivo/emulador en lugar de solo compilar:
```powershell
cd "c:\Users\eduar\OneDrive\Escritorio\CuidateApp\CuidateAPP\ClinicaMovil"
npx react-native run-android
```
