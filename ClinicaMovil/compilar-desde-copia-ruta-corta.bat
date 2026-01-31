@echo off
REM Compila la app desde una COPIA del proyecto en ruta corta (C:\CuidateAPP\ClinicaMovil)
REM para evitar error "Filename longer than 260 characters" en Windows.
REM Si ejecutaste "npx react-native run-android" y fallo con 260 caracteres, USA ESTE SCRIPT
REM o habilita rutas largas: scripts\habilitar-rutas-largas-windows.ps1 (como Admin, luego reiniciar). Ver BUILD-WINDOWS.md

setlocal enabledelayedexpansion
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "PROJECT_DIR=%SCRIPT_DIR%"
set "DEST_DIR=C:\CuidateAPP\ClinicaMovil"

echo ============================================================
echo Compilacion desde ruta corta (copia en C:\CuidateAPP\ClinicaMovil)
echo ============================================================
echo.
echo Proyecto origen: %PROJECT_DIR%
echo Copia destino:  %DEST_DIR%
echo.

REM Crear carpeta destino
if not exist "C:\CuidateAPP" mkdir "C:\CuidateAPP"

REM Detener daemon Gradle en origen y en destino para liberar archivos .lock (evita ERROR 33 en robocopy)
echo Deteniendo daemon Gradle...
if exist "%PROJECT_DIR%\android\gradlew.bat" (cmd /c "cd /d %PROJECT_DIR%\android && gradlew.bat --stop" 2>nul)
if exist "%DEST_DIR%\android\gradlew.bat" (cmd /c "cd /d %DEST_DIR%\android && gradlew.bat --stop" 2>nul)
timeout /t 2 /nobreak >nul

REM Sincronizar proyecto a la ruta corta (excluir .git, build y TODAS las carpetas .gradle)
echo Sincronizando proyecto a ruta corta...
robocopy "%PROJECT_DIR%" "%DEST_DIR%" /E /XD .git ".gradle" "android\app\.cxx" "android\app\build" "android\.gradle" "android\build" "node_modules\.gradle" /NFL /NDL /NJH /NJS /R:2 /W:2
if %ERRORLEVEL% geq 8 (
  echo ERROR: Robocopy fallo con codigo %ERRORLEVEL%
  exit /b 1
)
echo Sincronizacion completada.
echo.

REM Copiar local.properties y gradle.properties (newArchEnabled=true obligatorio en RN 0.82+)
if exist "%PROJECT_DIR%\android\local.properties" copy /Y "%PROJECT_DIR%\android\local.properties" "%DEST_DIR%\android\" >nul
if exist "%PROJECT_DIR%\android\gradle.properties" copy /Y "%PROJECT_DIR%\android\gradle.properties" "%DEST_DIR%\android\" >nul
if exist "%PROJECT_DIR%\android\build.gradle" copy /Y "%PROJECT_DIR%\android\build.gradle" "%DEST_DIR%\android\" >nul
if exist "%PROJECT_DIR%\android\gradle\wrapper\gradle-wrapper.properties" copy /Y "%PROJECT_DIR%\android\gradle\wrapper\gradle-wrapper.properties" "%DEST_DIR%\android\gradle\wrapper\" >nul

REM Limpiar .cxx y build anterior en la COPIA (ruta corta) - obligatorio tras cambiar newArchEnabled
if exist "%DEST_DIR%\android\app\.cxx" rmdir /s /q "%DEST_DIR%\android\app\.cxx"
if exist "%DEST_DIR%\android\app\build" rmdir /s /q "%DEST_DIR%\android\app\build"
if exist "%DEST_DIR%\android\build" rmdir /s /q "%DEST_DIR%\android\build"
if exist "%DEST_DIR%\android\.gradle" rmdir /s /q "%DEST_DIR%\android\.gradle"

REM CRITICO: Ejecutar Gradle en un proceso NUEVO con directorio C:\CuidateAPP\ClinicaMovil\android
REM para que todas las rutas sean cortas (evita 260 caracteres)
echo Compilando desde: %DEST_DIR%\android
echo.
cmd /c "cd /d %DEST_DIR%\android && gradlew.bat app:installDebug -PreactNativeDevServerPort=8081 %*"
set "BUILD_EXIT=!ERRORLEVEL!"

if !BUILD_EXIT! neq 0 (
  echo.
  echo BUILD FALLO con codigo !BUILD_EXIT!
  exit /b !BUILD_EXIT!
)

REM Copiar APK generado de vuelta al proyecto original
if exist "%DEST_DIR%\android\app\build\outputs\apk\debug\app-debug.apk" (
  if not exist "%PROJECT_DIR%\android\app\build\outputs\apk\debug" mkdir "%PROJECT_DIR%\android\app\build\outputs\apk\debug"
  copy /Y "%DEST_DIR%\android\app\build\outputs\apk\debug\app-debug.apk" "%PROJECT_DIR%\android\app\build\outputs\apk\debug\" >nul
  echo APK copiado a proyecto original.
)

echo.
echo ============================================================
echo Compilacion e instalacion finalizada correctamente.
echo ============================================================
exit /b 0
