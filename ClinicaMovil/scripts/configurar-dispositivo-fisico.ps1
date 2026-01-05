# Script para configurar ADB reverse para dispositivo físico
# Útil cuando Metro ya está ejecutándose y solo necesitas configurar la conexión
# Uso: .\scripts\configurar-dispositivo-fisico.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 CONFIGURACIÓN PARA DISPOSITIVO FÍSICO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar ADB
$adbPath = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbPath) {
    Write-Host "❌ ERROR: ADB no encontrado" -ForegroundColor Red
    Write-Host "   Asegúrate de tener Android SDK instalado" -ForegroundColor Red
    exit 1
}

# Listar dispositivos físicos
Write-Host "🔍 Buscando dispositivos físicos..." -ForegroundColor Yellow
Write-Host ""

$devicesOutput = adb devices
$devices = $devicesOutput | Select-Object -Skip 1 | Where-Object { $_ -match "device" }

if ($devices.Count -eq 0) {
    Write-Host "❌ ERROR: No se encontraron dispositivos conectados" -ForegroundColor Red
    Write-Host ""
    Write-Host "Conecta tu dispositivo por USB y habilita depuración USB" -ForegroundColor Yellow
    exit 1
}

# Filtrar solo dispositivos físicos
$physicalDevices = @()
foreach ($device in $devices) {
    $deviceId = ($device -split "\s+")[0]
    if ($deviceId -notlike "emulator-*") {
        $physicalDevices += $deviceId
    }
}

if ($physicalDevices.Count -eq 0) {
    Write-Host "⚠️  No se encontraron dispositivos físicos" -ForegroundColor Yellow
    exit 1
}

# Configurar ADB reverse para todos los dispositivos físicos
Write-Host "📡 Configurando ADB reverse..." -ForegroundColor Yellow
Write-Host ""

foreach ($deviceId in $physicalDevices) {
    $model = adb -s $deviceId shell getprop ro.product.model 2>$null
    Write-Host "Dispositivo: $deviceId" -ForegroundColor Cyan
    if ($model) {
        Write-Host "  Modelo: $model" -ForegroundColor Gray
    }
    
    # Configurar reverse para Metro
    Write-Host "  → Configurando Metro (puerto 8081)..." -ForegroundColor Yellow
    adb -s $deviceId reverse tcp:8081 tcp:8081 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ Metro configurado" -ForegroundColor Green
    } else {
        Write-Host "    ❌ Error configurando Metro" -ForegroundColor Red
    }
    
    # Configurar reverse para Backend
    Write-Host "  → Configurando Backend (puerto 3000)..." -ForegroundColor Yellow
    adb -s $deviceId reverse tcp:3000 tcp:3000 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    ✅ Backend configurado" -ForegroundColor Green
    } else {
        Write-Host "    ❌ Error configurando Backend" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Asegúrate de que Metro esté ejecutándose:" -ForegroundColor White
Write-Host "      npm start" -ForegroundColor Cyan
Write-Host "      O para múltiples dispositivos:" -ForegroundColor Gray
Write-Host "      npm run start:multi" -ForegroundColor Cyan
Write-Host ""
Write-Host "   2. Instala la aplicación en el dispositivo:" -ForegroundColor White
Write-Host "      npx react-native run-android --deviceId=<ID>" -ForegroundColor Cyan
Write-Host ""
Write-Host "   3. O usa el script de instalación:" -ForegroundColor White
Write-Host "      .\scripts\instalar-dispositivo-fisico.ps1" -ForegroundColor Cyan
Write-Host ""

