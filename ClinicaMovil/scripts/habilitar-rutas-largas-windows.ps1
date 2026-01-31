# Habilita rutas largas en Windows (>260 caracteres) para evitar fallos de compilacion
# React Native / CMake / Ninja en rutas como OneDrive\Escritorio\...\ClinicaMovil
#
# EJECUTAR COMO ADMINISTRADOR:
#   Clic derecho en PowerShell -> "Ejecutar como administrador"
#   cd "ruta\a\ClinicaMovil\scripts"
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\habilitar-rutas-largas-windows.ps1
#
# Despues de ejecutar, REINICIA el PC para que el cambio tenga efecto.

$ErrorActionPreference = "Stop"
$keyPath = "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem"
$valueName = "LongPathsEnabled"

# Comprobar si se ejecuta como administrador
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Este script debe ejecutarse como Administrador." -ForegroundColor Red
    Write-Host ""
    Write-Host "Pasos:" -ForegroundColor Yellow
    Write-Host "  1. Cierra esta ventana." -ForegroundColor White
    Write-Host "  2. Clic derecho en PowerShell o en 'Símbolo del sistema'." -ForegroundColor White
    Write-Host "  3. Elige 'Ejecutar como administrador'." -ForegroundColor White
    Write-Host "  4. Navega a la carpeta scripts y ejecuta de nuevo:" -ForegroundColor White
    Write-Host "     cd `"$PSScriptRoot`"" -ForegroundColor Gray
    Write-Host "     .\habilitar-rutas-largas-windows.ps1" -ForegroundColor Gray
    exit 1
}

try {
    $current = Get-ItemProperty -Path $keyPath -Name $valueName -ErrorAction SilentlyContinue
    if ($current.LongPathsEnabled -eq 1) {
        Write-Host "Las rutas largas ya estan habilitadas en este equipo." -ForegroundColor Green
        Write-Host "Si la compilacion sigue fallando, usa: npm run android:install o compilar-desde-copia-ruta-corta.bat" -ForegroundColor Yellow
        exit 0
    }
} catch {
    # No existe la clave, la crearemos
}

Set-ItemProperty -Path $keyPath -Name $valueName -Value 1 -Type DWord -Force
Write-Host "Rutas largas habilitadas correctamente (LongPathsEnabled = 1)." -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANTE: Reinicia el PC para que el cambio tenga efecto." -ForegroundColor Yellow
Write-Host "Despues del reinicio podras compilar con npx react-native run-android desde cualquier ruta." -ForegroundColor Gray
