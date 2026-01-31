@echo off
REM Ejecutar como Administrador: clic derecho en fix-tls-servicepointmanager.bat -> Ejecutar como administrador
echo === Correccion ServicePointManager / TLS ===
echo.

echo [1/4] Configurando TLS 1.2 en SCHANNEL...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Client" /v Enabled /t REG_DWORD /d 1 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Client" /v DisabledByDefault /t REG_DWORD /d 0 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server" /v Enabled /t REG_DWORD /d 1 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server" /v DisabledByDefault /t REG_DWORD /d 0 /f
if %errorlevel% equ 0 (echo   OK) else (echo   Error: ejecuta como Administrador)

echo.
echo [2/4] Forzando TLS 1.2 en .NET Framework...
reg add "HKLM\SOFTWARE\Microsoft\.NETFramework\v4.0.30319" /v SchUseStrongCrypto /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\Microsoft\.NETFramework\v4.0.30319" /v SystemDefaultTlsVersions /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\WOW6432Node\Microsoft\.NETFramework\v4.0.30319" /v SchUseStrongCrypto /t REG_DWORD /d 1 /f
reg add "HKLM\SOFTWARE\WOW6432Node\Microsoft\.NETFramework\v4.0.30319" /v SystemDefaultTlsVersions /t REG_DWORD /d 1 /f
if %errorlevel% equ 0 (echo   OK) else (echo   Error: ejecuta como Administrador)

echo.
echo [3/4] Actualizando certificados raiz (puede tardar)...
certutil -generateSSTFromWU roots.sst
certutil -addstore -f root roots.sst
if exist roots.sst del roots.sst
echo   Hecho.

echo.
echo [4/4] Reparar imagen Windows (DISM + SFC). Esto tarda varios minutos.
set /p run="Ejecutar DISM y SFC ahora? (S/N): "
if /i "%run%"=="S" (
  echo Ejecutando DISM /RestoreHealth...
  DISM /Online /Cleanup-Image /RestoreHealth
  echo Ejecutando sfc /scannow...
  sfc /scannow
)

echo.
echo === Listo. REINICIA el PC para que los cambios surtan efecto. ===
pause
