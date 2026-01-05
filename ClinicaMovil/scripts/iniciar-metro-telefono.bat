@echo off
REM Script para iniciar Metro Bundler desde la carpeta correcta
REM Uso: scripts\iniciar-metro-telefono.bat

echo ========================================
echo Iniciando Metro Bundler
echo ========================================
echo.

REM Cambiar a la carpeta del proyecto
cd /d "%~dp0.."

REM Verificar que existe package.json
if not exist "package.json" (
    echo ERROR: No se encontro package.json
    echo Asegurate de estar en la carpeta ClinicaMovil
    pause
    exit /b 1
)

REM Verificar que existe index.js
if not exist "index.js" (
    echo ERROR: No se encontro index.js
    echo Asegurate de estar en la carpeta ClinicaMovil
    pause
    exit /b 1
)

echo Directorio de trabajo: %CD%
echo.

REM Verificar node_modules
if not exist "node_modules" (
    echo Instalando dependencias...
    call npm install
)

echo.
echo ========================================
echo Iniciando Metro Bundler...
echo ========================================
echo.
echo Consejos:
echo    - Asegurate de que tu telefono este conectado por USB
echo    - O que ambos (PC y telefono) esten en la misma red WiFi
echo    - En otra terminal, ejecuta: npx react-native run-android
echo.
echo ========================================
echo.

REM Iniciar Metro
call npm start


