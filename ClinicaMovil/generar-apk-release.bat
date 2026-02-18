@echo off
REM Genera el APK RELEASE de producción desde una COPIA del proyecto en ruta corta
REM para evitar error "Filename longer than 260 characters" en Windows.

setlocal enabledelayedexpansion
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "PROJECT_DIR=%SCRIPT_DIR%"
set "DEST_DIR=C:\CuidateAPP\ClinicaMovil"

echo ============================================================
echo Generando APK RELEASE de produccion
echo ============================================================
echo.
echo Proyecto origen: %PROJECT_DIR%
echo Copia destino:  %DEST_DIR%
echo.

REM Crear carpeta destino
if not exist "C:\CuidateAPP" mkdir "C:\CuidateAPP"

REM Detener daemon Gradle
echo Deteniendo daemon Gradle...
if exist "%PROJECT_DIR%\android\gradlew.bat" (cmd /c "cd /d %PROJECT_DIR%\android && gradlew.bat --stop" 2>nul)
if exist "%DEST_DIR%\android\gradlew.bat" (cmd /c "cd /d %DEST_DIR%\android && gradlew.bat --stop" 2>nul)
timeout /t 2 /nobreak >nul

REM Sincronizar proyecto a la ruta corta
echo Sincronizando proyecto a ruta corta...
robocopy "%PROJECT_DIR%" "%DEST_DIR%" /E /XD .git ".gradle" "android\app\.cxx" "android\app\build" "android\.gradle" "android\build" "node_modules\.gradle" /NFL /NDL /NJH /NJS /R:2 /W:2
if %ERRORLEVEL% geq 8 (
  echo ERROR: Robocopy fallo con codigo %ERRORLEVEL%
  exit /b 1
)
echo Sincronizacion completada.
echo.

REM Copiar archivos de configuracion y keystore
if exist "%PROJECT_DIR%\android\local.properties" copy /Y "%PROJECT_DIR%\android\local.properties" "%DEST_DIR%\android\" >nul
if exist "%PROJECT_DIR%\android\gradle.properties" copy /Y "%PROJECT_DIR%\android\gradle.properties" "%DEST_DIR%\android\" >nul
if exist "%PROJECT_DIR%\android\build.gradle" copy /Y "%PROJECT_DIR%\android\build.gradle" "%DEST_DIR%\android\" >nul
if exist "%PROJECT_DIR%\android\gradle\wrapper\gradle-wrapper.properties" copy /Y "%PROJECT_DIR%\android\gradle\wrapper\gradle-wrapper.properties" "%DEST_DIR%\android\gradle\wrapper\" >nul
if exist "%PROJECT_DIR%\android\app\release.keystore" copy /Y "%PROJECT_DIR%\android\app\release.keystore" "%DEST_DIR%\android\app\" >nul
if exist "%PROJECT_DIR%\android\app\build.gradle" copy /Y "%PROJECT_DIR%\android\app\build.gradle" "%DEST_DIR%\android\app\" >nul

REM Limpiar builds anteriores
if exist "%DEST_DIR%\android\app\.cxx" rmdir /s /q "%DEST_DIR%\android\app\.cxx"
if exist "%DEST_DIR%\android\app\build" rmdir /s /q "%DEST_DIR%\android\app\build"
if exist "%DEST_DIR%\android\build" rmdir /s /q "%DEST_DIR%\android\build"
if exist "%DEST_DIR%\android\.gradle" rmdir /s /q "%DEST_DIR%\android\.gradle"

REM Generar bundle de JavaScript para producción
echo Generando bundle de JavaScript para produccion...
if not exist "%DEST_DIR%\android\app\src\main\assets" mkdir "%DEST_DIR%\android\app\src\main\assets"
cd /d "%PROJECT_DIR%"
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output "%DEST_DIR%\android\app\src\main\assets\index.android.bundle" --assets-dest "%DEST_DIR%\android\app\src\main\res" --reset-cache
if %ERRORLEVEL% neq 0 (
  echo ADVERTENCIA: Error generando bundle, continuando con compilacion...
)

REM Generar APK RELEASE desde ruta corta
echo.
echo Compilando APK RELEASE desde: %DEST_DIR%\android
echo Esto puede tardar varios minutos...
echo.
cd /d "%DEST_DIR%\android"
gradlew.bat assembleRelease --no-daemon
set "BUILD_EXIT=!ERRORLEVEL!"

if !BUILD_EXIT! neq 0 (
  echo.
  echo BUILD FALLO con codigo !BUILD_EXIT!
  exit /b !BUILD_EXIT!
)

REM Copiar APK generado de vuelta al proyecto original
if exist "%DEST_DIR%\android\app\build\outputs\apk\release\app-release.apk" (
  if not exist "%PROJECT_DIR%\android\app\build\outputs\apk\release" mkdir "%PROJECT_DIR%\android\app\build\outputs\apk\release"
  copy /Y "%DEST_DIR%\android\app\build\outputs\apk\release\app-release.apk" "%PROJECT_DIR%\android\app\build\outputs\apk\release\" >nul
  
  REM Crear copia con nombre descriptivo
  for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
  set "timestamp=%datetime:~0,8%_%datetime:~8,6%"
  copy /Y "%PROJECT_DIR%\android\app\build\outputs\apk\release\app-release.apk" "%PROJECT_DIR%\android\app\build\outputs\apk\release\ClinicaMovil-release-%timestamp%.apk" >nul
  
  echo.
  echo ============================================================
  echo APK RELEASE generado exitosamente!
  echo ============================================================
  echo Ubicacion: %PROJECT_DIR%\android\app\build\outputs\apk\release\app-release.apk
  echo Copia con timestamp: %PROJECT_DIR%\android\app\build\outputs\apk\release\ClinicaMovil-release-%timestamp%.apk
  echo.
) else (
  echo ERROR: APK no encontrado despues de la compilacion
  exit /b 1
)

exit /b 0
