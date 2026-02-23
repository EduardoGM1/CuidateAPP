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

REM ========== GENERAR BUNDLE DESDE EL PROYECTO (menu hamburguesa) ==========
REM El bundle se crea AQUI (origen) para que use 100%% el codigo actual; luego se copia a destino.
echo Generando bundle JS desde proyecto origen...
if not exist "%PROJECT_DIR%\android\app\src\main\assets" mkdir "%PROJECT_DIR%\android\app\src\main\assets"
cd /d "%PROJECT_DIR%"
call npx react-native bundle --platform android --dev false --reset-cache --entry-file index.js --bundle-output "%PROJECT_DIR%\android\app\src\main\assets\index.android.bundle" --assets-dest "%PROJECT_DIR%\android\app\src\main\res"
if exist "%PROJECT_DIR%\android\app\src\main\assets\index.android.bundle" (
  echo Bundle generado correctamente.
) else (
  echo AVISO: No se pudo generar el bundle; la compilacion puede usar Metro en ejecucion.
)
cd /d "%PROJECT_DIR%"
echo.

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

REM Forzar copia del BUNDLE generado desde el proyecto (contiene menu hamburguesa)
if exist "%PROJECT_DIR%\android\app\src\main\assets\index.android.bundle" (
  if not exist "%DEST_DIR%\android\app\src\main\assets" mkdir "%DEST_DIR%\android\app\src\main\assets"
  copy /Y "%PROJECT_DIR%\android\app\src\main\assets\index.android.bundle" "%DEST_DIR%\android\app\src\main\assets\" >nul
  echo Bundle con menu hamburguesa copiado a destino.
)

REM Forzar copia de navegacion y App
if not exist "%DEST_DIR%\src\navigation" mkdir "%DEST_DIR%\src\navigation"
xcopy /Y /E /I "%PROJECT_DIR%\src\navigation\*" "%DEST_DIR%\src\navigation\" >nul
copy /Y "%PROJECT_DIR%\src\navigation\NavegacionProfesional.js" "%DEST_DIR%\src\navigation\" >nul
copy /Y "%PROJECT_DIR%\App.tsx" "%DEST_DIR%\" >nul
echo Navegacion y App copiados.

REM Limpiar cache de Metro/bundle en la copia para que el bundle se regenere con el codigo actual
if exist "%DEST_DIR%\node_modules\.cache" rmdir /s /q "%DEST_DIR%\node_modules\.cache" 2>nul
if exist "%DEST_DIR%\android\app\build\generated" rmdir /s /q "%DEST_DIR%\android\app\build\generated" 2>nul

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
