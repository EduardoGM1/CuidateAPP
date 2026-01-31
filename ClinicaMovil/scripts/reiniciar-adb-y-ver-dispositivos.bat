@echo off
REM Ejecutar despues de conectar el telefono por USB
echo Reiniciando ADB...
adb kill-server
timeout /t 2 /nobreak >nul
adb start-server
timeout /t 1 /nobreak >nul
echo.
echo Dispositivos conectados:
adb devices -l
echo.
pause
