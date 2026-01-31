<#
PowerShell helper: Habilita LongPathsEnabled en Windows (requiere Admin y reinicio).
Uso: Ejecutar PowerShell "Como administrador" y ejecutar este script.
#>
$ErrorActionPreference = 'Stop'

function Is-Administrator {
    $current = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Is-Administrator)) {
    Write-Host "Este script requiere privilegios de Administrador. Ejecuta PowerShell como Administrador." -ForegroundColor Red
    exit 1
}

Write-Host "Habilitando LongPathsEnabled en el registro (HKLM)..." -ForegroundColor Cyan
try {
    New-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name 'LongPathsEnabled' -Value 1 -PropertyType DWord -Force | Out-Null
    Write-Host "LongPathsEnabled=1 aplicado correctamente. Reinicia el equipo para que el cambio tenga efecto." -ForegroundColor Green
} catch {
    Write-Host "Error al aplicar la clave de registro:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
