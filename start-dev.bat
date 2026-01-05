@echo off
echo 🔧 Configurando entorno de desarrollo...

REM Obtener IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set LOCAL_IP=%%b
        goto :found
    )
)
:found

echo 📍 IP Local detectada: %LOCAL_IP%

REM Configurar adb reverse
echo 📱 Configurando adb reverse...
adb reverse tcp:3000 tcp:3000

REM Iniciar servidor
echo 🚀 Iniciando servidor API...
start "API Server" cmd /k "cd /d C:\Users\eduar\Desktop\Backend\api-clinica && node index.js"

REM Esperar un momento
timeout /t 3 /nobreak >nul

REM Probar conectividad
echo 🔍 Probando conectividad...
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Servidor respondiendo en localhost:3000
) else (
    echo ❌ Servidor no responde en localhost:3000
)

curl -s http://%LOCAL_IP%:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Servidor respondiendo en %LOCAL_IP%:3000
) else (
    echo ❌ Servidor no responde en %LOCAL_IP%:3000
)

echo.
echo 🎉 Configuración completada!
echo 📱 Para la app móvil:
echo    - Con adb reverse: http://localhost:3000
echo    - Sin adb reverse: http://%LOCAL_IP%:3000
echo.
echo Presiona cualquier tecla para continuar...
pause >nul




