# Script para iniciar la app en todos los dispositivos conectados
# Funciona con emuladores y dispositivos físicos

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Iniciar App en Todos los Dispositivos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Reiniciar ADB para asegurar detección correcta
adb kill-server 2>&1 | Out-Null
Start-Sleep -Seconds 1
adb start-server 2>&1 | Out-Null
Start-Sleep -Seconds 2

Write-Host "Detectando dispositivos..." -ForegroundColor Yellow
$devicesOutput = adb devices
$deviceIds = @()
$deviceInfo = @()

foreach ($line in $devicesOutput) {
    if ($line -match "^\s+([^\s]+)\s+(device|emulator)") {
        $deviceId = $matches[1]
        $deviceIds += $deviceId
        
        # Determinar tipo de dispositivo
        $deviceType = "Desconocido"
        $qemuCheck = adb -s $deviceId shell getprop ro.kernel.qemu 2>&1
        if ($qemuCheck -match "1") {
            $deviceType = "Emulador"
        } else {
            $deviceType = "Dispositivo Fisico"
        }
        
        $deviceInfo += @{
            Id = $deviceId
            Type = $deviceType
        }
    }
}

if ($deviceIds.Count -eq 0) {
    Write-Host "No se encontraron dispositivos conectados." -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifica que:" -ForegroundColor Yellow
    Write-Host "  - Los emuladores esten completamente iniciados" -ForegroundColor White
    Write-Host "  - Los dispositivos fisicos tengan depuracion USB habilitada" -ForegroundColor White
    Write-Host "  - Ejecuta: adb devices" -ForegroundColor White
    exit 1
}

Write-Host "Dispositivos encontrados: $($deviceIds.Count)" -ForegroundColor Green
foreach ($info in $deviceInfo) {
    Write-Host "  - $($info.Id) ($($info.Type))" -ForegroundColor White
}
Write-Host ""

$successCount = 0
foreach ($info in $deviceInfo) {
    Write-Host "Iniciando app en $($info.Id) ($($info.Type))..." -ForegroundColor Yellow
    $result = adb -s $info.Id shell am start -n com.clinicamovil/.MainActivity 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  App iniciada exitosamente" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  Error al iniciar app" -ForegroundColor Red
        if ($result) {
            Write-Host "  Detalles: $($result -join ' ')" -ForegroundColor Gray
        }
    }
    Write-Host ""
}

Write-Host ""
Write-Host "Apps iniciadas en todos los dispositivos" -ForegroundColor Green
Write-Host ""
Write-Host "Asegurate de que Metro este corriendo:" -ForegroundColor Yellow
Write-Host "  npx react-native start" -ForegroundColor White
Write-Host ""

