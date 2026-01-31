<#
PowerShell helper: compila e instala Android usando un mapeo corto (subst)
Evita copiar el proyecto y resuelve problemas de "Filename longer than 260 characters".
Uso:
  PS> .\build-on-subst.ps1            # usa S: por defecto
  PS> .\build-on-subst.ps1 -Drive T  # usa T:\ como unidad
  PS> .\build-on-subst.ps1 -KeepMapping  # deja la unidad mappeada (útil para iterar builds)
#>
[CmdletBinding()]
param(
    [string]$Drive = "S",
    [switch]$KeepMapping,
    [switch]$SkipInstall  # si solo quieres compilar y no instalar
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")) | Select-Object -ExpandProperty Path
Write-Host "Proyecto raíz detectado: $projectRoot" -ForegroundColor Cyan

$driveLetter = "$($Drive.TrimEnd(':')):`\"
$substCreated = $false
try {
    # Comprobar si la unidad ya existe
    $existing = subst | Select-String "^$($Drive.ToUpper()):" -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Unidad $Drive: ya está mapeada." -ForegroundColor Yellow
    } else {
        Write-Host "Creando mapeo: $Drive: -> $projectRoot" -ForegroundColor Green
        subst $Drive $projectRoot
        $substCreated = $true
        Start-Sleep -Milliseconds 300
    }

    $buildPath = "$($Drive.TrimEnd(':')):`\android"
    Write-Host "Compilando desde $buildPath (ejecutando gradlew)..." -ForegroundColor Cyan

    cd $buildPath

    if ($SkipInstall) {
        & gradlew.bat assembleDebug
    } else {
        & gradlew.bat app:installDebug -PreactNativeDevServerPort=8081
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Compilación/instalación finalizada con éxito." -ForegroundColor Green
    } else {
        Write-Host "La compilación devolvió código de salida $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}
catch {
    Write-Host "ERROR durante la compilación:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
finally {
    # Limpiar el mapeo a menos que se pida mantenerlo
    if ($substCreated -and -not $KeepMapping) {
        Write-Host "Eliminando mapeo $Drive:..." -ForegroundColor Gray
        subst /d $Drive 2>$null
    } else {
        if ($substCreated) { Write-Host "Manteniendo mapeo $Drive: (KeepMapping solicitado)." -ForegroundColor Yellow }
    }
}
