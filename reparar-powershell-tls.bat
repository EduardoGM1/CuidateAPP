@echo off
chcp 65001 >nul
echo ========================================
echo  Reparar PowerShell / TLS (ejecutar como Administrador)
echo ========================================
echo.

echo [1/5] Habilitando TLS 1.2 en el registro...
reg add "HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Client" /v Enabled /t REG_DWORD /d 1 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Client" /v DisabledByDefault /t REG_DWORD /d 0 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server" /v Enabled /t REG_DWORD /d 1 /f
reg add "HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols\TLS 1.2\Server" /v DisabledByDefault /t REG_DWORD /d 0 /f
if %errorlevel% equ 0 (echo   TLS 1.2 configurado correctamente.) else (echo   Error al escribir en el registro.)
echo.

echo [2/5] Reparando imagen de Windows (DISM)... Puede tardar varios minutos.
DISM /Online /Cleanup-Image /RestoreHealth
echo.

echo [3/5] Comprobando archivos del sistema (sfc)...
sfc /scannow
echo.

echo [4/5] Actualizando certificados raiz (opcional)...
certutil -generateSSTFromWU roots.sst 2>nul
if exist roots.sst (
  certutil -addstore -f root roots.sst
  del roots.sst
  echo   Certificados actualizados.
) else (
  echo   No se pudo descargar roots.sst; puede omitirse si no hay problemas de certificados.
)
echo.

echo [5/5] Comprobando PowerShell 7 (winget)...
where winget >nul 2>&1
if %errorlevel% equ 0 (
  winget install Microsoft.PowerShell --accept-package-agreements --accept-source-agreements 2>nul
  echo   Si se instalo PowerShell 7, usa "pwsh" en lugar de "powershell".
) else (
  echo   winget no encontrado; puedes instalar PowerShell 7 manualmente desde https://github.com/PowerShell/PowerShell/releases
)
echo.

echo ========================================
echo  IMPORTANTE: Reinicia el PC para que los cambios de registro y TLS surtan efecto.
echo ========================================
pause
