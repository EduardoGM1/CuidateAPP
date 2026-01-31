@echo off
REM ============================================
REM SOLUCIÓN: Error ServicePointManager
REM Configura TLS 1.2 en el registro de Windows
REM ============================================
echo.
echo ============================================
echo   SOLUCIONANDO ERROR SERVICEPOINTMANAGER
echo ============================================
echo.
echo Esta solucion configura TLS 1.2 en el registro de Windows
echo para que .NET Framework lo use por defecto.
echo.
echo Requiere permisos de Administrador.
echo.

REM Verificar permisos de administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Este script requiere permisos de Administrador
    echo Por favor, ejecuta este archivo como Administrador
    pause
    exit /b 1
)

echo [1/4] Configurando TLS 1.2 para .NET Framework 64-bit...
reg add "HKLM\SOFTWARE\Microsoft\.NETFramework\v4.0.30319" /v SystemDefaultTlsVersions /t REG_DWORD /d 1 /f >nul 2>&1
if %errorLevel% equ 0 (
    echo    [OK] SystemDefaultTlsVersions configurado
) else (
    echo    [ERROR] No se pudo configurar SystemDefaultTlsVersions
)

reg add "HKLM\SOFTWARE\Microsoft\.NETFramework\v4.0.30319" /v SchUseStrongCrypto /t REG_DWORD /d 1 /f >nul 2>&1
if %errorLevel% equ 0 (
    echo    [OK] SchUseStrongCrypto configurado
) else (
    echo    [ERROR] No se pudo configurar SchUseStrongCrypto
)

echo.
echo [2/4] Configurando TLS 1.2 para .NET Framework 32-bit (WOW64)...
reg add "HKLM\SOFTWARE\WOW6432Node\Microsoft\.NETFramework\v4.0.30319" /v SystemDefaultTlsVersions /t REG_DWORD /d 1 /f >nul 2>&1
if %errorLevel% equ 0 (
    echo    [OK] SystemDefaultTlsVersions (32-bit) configurado
) else (
    echo    [ADVERTENCIA] No se pudo configurar SystemDefaultTlsVersions (32-bit)
    echo    Esto es normal si no tienes .NET Framework 32-bit instalado
)

reg add "HKLM\SOFTWARE\WOW6432Node\Microsoft\.NETFramework\v4.0.30319" /v SchUseStrongCrypto /t REG_DWORD /d 1 /f >nul 2>&1
if %errorLevel% equ 0 (
    echo    [OK] SchUseStrongCrypto (32-bit) configurado
) else (
    echo    [ADVERTENCIA] No se pudo configurar SchUseStrongCrypto (32-bit)
)

echo.
echo [3/4] Configurando TLS para WinHTTP...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Internet Settings\WinHttp" /v DefaultSecureProtocols /t REG_DWORD /d 0x00000800 /f >nul 2>&1
if %errorLevel% equ 0 (
    echo    [OK] DefaultSecureProtocols configurado (TLS 1.2)
) else (
    echo    [ADVERTENCIA] No se pudo configurar DefaultSecureProtocols
)

echo.
echo [4/4] Verificando configuracion...
echo.
reg query "HKLM\SOFTWARE\Microsoft\.NETFramework\v4.0.30319" /v SystemDefaultTlsVersions >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Configuracion aplicada correctamente
) else (
    echo [ERROR] No se pudo verificar la configuracion
)

echo.
echo ============================================
echo   CONFIGURACION COMPLETADA
echo ============================================
echo.
echo IMPORTANTE: Reinicia tu computadora para que los cambios
echo tengan efecto completo. Despues de reiniciar, PowerShell
echo deberia funcionar correctamente.
echo.
echo Si el problema persiste despues de reiniciar:
echo 1. Verifica que .NET Framework 4.8 este instalado
echo 2. Ejecuta Windows Update
echo 3. Considera instalar PowerShell 7 (pwsh)
echo.
pause
