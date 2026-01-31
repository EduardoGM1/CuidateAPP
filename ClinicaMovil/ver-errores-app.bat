@echo off
REM Ver errores de la app en el emulador/dispositivo Android
REM Ejecutar mientras la app se cierra o justo despues.

echo Conectando a logcat (errores de Android y React Native)...
echo Cierra con Ctrl+C cuando termines.
echo.
adb logcat *:E ReactNative:V ReactNativeJS:V AndroidRuntime:E -d 2>nul
if %ERRORLEVEL% neq 0 (
  echo.
  echo Si adb no se encuentra, anade al PATH:
  echo   %%ANDROID_HOME%%\platform-tools
  echo.
  adb logcat -d 2>nul | findstr /i "FATAL ReactNative error exception"
)
pause
