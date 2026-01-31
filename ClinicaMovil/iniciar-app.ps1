# PowerShell: Recompilar, instalar y arrancar Metro para ClinicaMovil
# El error "PlatformConstants could not be found" se evita con newArchEnabled=false y REcompilando.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  ClinicaMovil - Compilar, instalar y arrancar Metro" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1) Recompilar e instalar (usa la copia en ruta corta para evitar error 260 caracteres)
Write-Host "1. Compilando e instalando la app (arquitectura sin TurboModules)..." -ForegroundColor Yellow
& cmd /c "compilar-desde-copia-ruta-corta.bat"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: La compilacion fallo." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. Configurando ADB reverse (Metro 8081 + API 3000)..." -ForegroundColor Yellow
$devices = adb devices 2>$null | Select-String "device$"
if ($devices) {
    adb reverse tcp:8081 tcp:8081 2>$null
    adb reverse tcp:3000 tcp:3000 2>$null
    Write-Host "   ADB reverse configurado (8081 Metro, 3000 API)." -ForegroundColor Green
} else {
    Write-Host "   No hay dispositivo conectado. Conecta el telefono por USB y ejecuta:" -ForegroundColor Yellow
    Write-Host "   adb reverse tcp:8081 tcp:8081" -ForegroundColor Cyan
    Write-Host "   adb reverse tcp:3000 tcp:3000" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "3. Liberando puerto 8081 si esta en uso..." -ForegroundColor Yellow
try {
    $procs = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $procs) {
        if ($procId -gt 0) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "   Proceso en puerto 8081 (PID $procId) cerrado." -ForegroundColor Gray
        }
    }
} catch {
    $lines = netstat -ano | Select-String ":8081\s"
    foreach ($line in $lines) {
        if ($line -match "\s+(\d+)\s*$") {
            $procId = $Matches[1]
            if ($procId -match "^\d+$") { taskkill /PID $procId /F 2>$null; Write-Host "   Proceso (PID $procId) cerrado." -ForegroundColor Gray }
        }
    }
}
Start-Sleep -Seconds 1
Write-Host "   Iniciando Metro (bundler)..." -ForegroundColor Yellow
Write-Host "   Cierra con Ctrl+C cuando termines." -ForegroundColor Gray
Write-Host ""

# Arrancar Metro (con --reset-cache por si acaso)
npx react-native start --reset-cache
