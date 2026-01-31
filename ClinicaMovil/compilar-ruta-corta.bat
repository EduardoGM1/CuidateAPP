@echo off
REM Compila la app desde una ruta corta (unidad W:) para evitar error
REM "Filename longer than 260 characters" en Windows.
REM Ejecutar desde la carpeta ClinicaMovil o desde la raiz del repo.

setlocal enabledelayedexpansion
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

REM Si el script esta en ClinicaMovil, PROJECT_DIR = carpeta ClinicaMovil
set "PROJECT_DIR=%SCRIPT_DIR%"
echo Proyecto: %PROJECT_DIR%

REM Usar unidad W: para acortar rutas (evita limite 260 caracteres)
set "DRIVE_LETTER=W:"

REM Comprobar si W: ya esta en uso por otro path
subst %DRIVE_LETTER% 2>nul
if exist %DRIVE_LETTER%\ (
  echo.
  echo [AVISO] La unidad %DRIVE_LETTER% ya esta en uso.
  echo Desmontando para reasignar al proyecto...
  subst %DRIVE_LETTER% /d
  timeout /t 1 /nobreak >nul
)

echo.
echo Asignando %DRIVE_LETTER% a la carpeta del proyecto...
subst %DRIVE_LETTER% "%PROJECT_DIR%"

cd /d %DRIVE_LETTER%\
echo Directorio de trabajo: %CD%
echo.

REM Limpiar build anterior en .cxx para forzar recompilacion con rutas cortas
if exist "android\app\.cxx" (
  echo Limpiando carpeta .cxx anterior...
  rmdir /s /q "android\app\.cxx"
)

REM Limpiar build completo de Android para forzar recompilacion desde cero
echo Limpiando build anterior de Android...
cd android
call gradlew.bat clean
cd ..

REM Configurar variables de entorno para forzar rutas cortas
set "GRADLE_USER_HOME=%TEMP%\gradle-home"
set "ANDROID_NDK_HOME=%ANDROID_HOME%\ndk-bundle"
REM Usar una ruta muy corta para CMake build (evita limite 260 caracteres)
set "CMAKE_BUILD_DIR=%TEMP%\cb"
set "TMP=%TEMP%"
set "TEMP=%TEMP%"

echo Compilando e instalando app (rutas cortas)...
echo Usando directorio de trabajo: %CD%
echo.
cd android
call gradlew.bat app:installDebug -PreactNativeDevServerPort=8081 %*
cd ..

set "BUILD_EXIT=!ERRORLEVEL!"

REM Desmontar unidad virtual
echo.
subst %DRIVE_LETTER% /d
echo Unidad %DRIVE_LETTER% desmontada.

if %BUILD_EXIT% neq 0 (
  echo.
  echo BUILD FALLO con codigo %BUILD_EXIT%
  exit /b %BUILD_EXIT%
)

echo.
echo Compilacion e instalacion finalizada correctamente.
exit /b 0
