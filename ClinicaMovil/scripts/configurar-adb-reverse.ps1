# Script para configurar ADB reverse para Metro y Backend
# Útil para dispositivos físicos que necesitan acceder a localhost
# Uso: .\scripts\configurar-adb-reverse.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 CONFIGURAR ADB REVERSE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar ADB
$adbPath = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbPath) {
    Write-Host "❌ ERROR: ADB no encontrado" -ForegroundColor Red
    Write-Host "   Asegúrate de tener Android SDK instalado" -ForegroundColor Red
    exit 1
}

# Listar dispositivos
$devicesOutput = adb devices
$devices = $devicesOutput | Select-Object -Skip 1 | Where-Object { $_ -match "device" }

if ($devices.Count -eq 0) {
    Write-Host "❌ ERROR: No se encontraron dispositivos conectados" -ForegroundColor Red
    exit 1
}

Write-Host "📡 Configurando ADB reverse para todos los dispositivos..." -ForegroundColor Yellow
Write-Host ""

foreach ($device in $devices) {
    $deviceId = ($device -split "\s+")[0]
    $deviceType = if ($deviceId -like "emulator-*") { "Emulador" } else { "Dispositivo Físico" }
    
    Write-Host "$deviceType: $deviceId" -ForegroundColor Cyan
    
    # Configurar reverse para Metro (puerto 8081)
    Write-Host "  → Metro (puerto 8081)..." -ForegroundColor Yellow
    if ($deviceId -like "emulator-*") {
        # Emuladores no necesitan reverse, pero lo configuramos por si acaso
        adb -s $deviceId reverse tcp:8081 tcp:8081 | Out-Null
    } else {
        adb -s $deviceId reverse tcp:8081 tcp:8081 | Out-Null
    }
    
    # Configurar reverse para Backend (puerto 3000)
    Write-Host "  → Backend (puerto 3000)..." -ForegroundColor Yellow
    if ($deviceId -like "emulator-*") {
        adb -s $deviceId reverse tcp:3000 tcp:3000 | Out-Null
    } else {
        adb -s $deviceId reverse tcp:3000 tcp:3000 | Out-Null
    }
    
    Write-Host "  ✅ Configurado" -ForegroundColor Green
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verificar configuración:" -ForegroundColor Yellow
Write-Host "  adb reverse --list" -ForegroundColor Cyan
Write-Host ""

