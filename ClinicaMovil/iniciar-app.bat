@echo off
REM Compila, instala la app en el emulador y luego inicia Metro.
REM Ejecutar desde la carpeta ClinicaMovil o con: npm start

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
cd /d "%SCRIPT_DIR%"

echo.
echo [1/2] Compilando e instalando app en emulador...
call "%~dp0compilar-desde-copia-ruta-corta.bat"
if %ERRORLEVEL% neq 0 (
  echo.
  echo ERROR: La compilacion fallo. No se inicia Metro.
  exit /b 1
)

echo.
echo [2/2] Iniciando Metro Bundler...
cd /d "%SCRIPT_DIR%"
npx react-native start
