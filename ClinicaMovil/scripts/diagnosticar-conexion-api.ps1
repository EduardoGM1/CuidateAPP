# Script para diagnosticar problemas de conexión API en dispositivos físicos
# Uso: .\scripts\diagnosticar-conexion-api.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 DIAGNÓSTICO DE CONEXIÓN API" -ForegroundColor Cyan
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
Write-Host "📱 DISPOSITIVOS CONECTADOS" -ForegroundColor Yellow
Write-Host ""
$devicesOutput = adb devices
$devices = $devicesOutput | Select-Object -Skip 1 | Where-Object { $_ -match "device" }

if ($devices.Count -eq 0) {
    Write-Host "❌ No se encontraron dispositivos conectados" -ForegroundColor Red
    exit 1
}

foreach ($device in $devices) {
    $deviceId = ($device -split "\s+")[0]
    $deviceType = if ($deviceId -like "emulator-*") { "Emulador" } else { "Dispositivo Físico" }
    Write-Host "$deviceType: $deviceId" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 CONFIGURACIÓN ADB REVERSE" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar ADB reverse
Write-Host "Verificando ADB reverse..." -ForegroundColor Yellow
$reverseList = adb reverse --list

if ($reverseList) {
    Write-Host "✅ ADB reverse configurado:" -ForegroundColor Green
    $reverseList | ForEach-Object {
        Write-Host "   $_" -ForegroundColor White
    }
} else {
    Write-Host "❌ ADB reverse NO está configurado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Configurando ADB reverse..." -ForegroundColor Yellow
    
    foreach ($device in $devices) {
        $deviceId = ($device -split "\s+")[0]
        if ($deviceId -notlike "emulator-*") {
            Write-Host "  Configurando para $deviceId..." -ForegroundColor Cyan
            adb -s $deviceId reverse tcp:3000 tcp:3000 | Out-Null
            adb -s $deviceId reverse tcp:8081 tcp:8081 | Out-Null
        }
    }
    
    Write-Host "✅ ADB reverse configurado" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🌐 CONFIGURACIÓN DE RED" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Obtener IP local
$localIPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -like "192.168.*" -or 
    $_.IPAddress -like "10.0.*" -or
    $_.IPAddress -like "172.16.*" -or
    $_.IPAddress -like "172.17.*" -or
    $_.IPAddress -like "172.18.*" -or
    $_.IPAddress -like "172.19.*" -or
    $_.IPAddress -like "172.20.*" -or
    $_.IPAddress -like "172.21.*" -or
    $_.IPAddress -like "172.22.*" -or
    $_.IPAddress -like "172.23.*" -or
    $_.IPAddress -like "172.24.*" -or
    $_.IPAddress -like "172.25.*" -or
    $_.IPAddress -like "172.26.*" -or
    $_.IPAddress -like "172.27.*" -or
    $_.IPAddress -like "172.28.*" -or
    $_.IPAddress -like "172.29.*" -or
    $_.IPAddress -like "172.30.*" -or
    $_.IPAddress -like "172.31.*"
} | Select-Object -First 5

if ($localIPs) {
    Write-Host "✅ IPs locales detectadas:" -ForegroundColor Green
    foreach ($ip in $localIPs) {
        Write-Host "   $($ip.IPAddress)" -ForegroundColor White
        Write-Host "      → Backend: http://$($ip.IPAddress):3000" -ForegroundColor Gray
        Write-Host "      → Metro: http://$($ip.IPAddress):8081" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  No se detectaron IPs locales" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧪 PRUEBAS DE CONECTIVIDAD" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Probar conexión al backend
Write-Host "Probando conexión al backend..." -ForegroundColor Yellow

# Probar localhost (requiere adb reverse)
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/mobile/config" -Method GET -TimeoutSec 3 -ErrorAction Stop
    Write-Host "✅ localhost:3000 - Conectado (ADB reverse funcionando)" -ForegroundColor Green
} catch {
    Write-Host "❌ localhost:3000 - No conectado (ADB reverse puede no estar configurado)" -ForegroundColor Red
}

# Probar IPs locales
if ($localIPs) {
    foreach ($ip in $localIPs) {
        $ipAddress = $ip.IPAddress
        try {
            $response = Invoke-WebRequest -Uri "http://${ipAddress}:3000/api/mobile/config" -Method GET -TimeoutSec 3 -ErrorAction Stop
            Write-Host "✅ $ipAddress:3000 - Conectado" -ForegroundColor Green
        } catch {
            Write-Host "❌ $ipAddress:3000 - No conectado" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "💡 RECOMENDACIONES" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Para dispositivos físicos:" -ForegroundColor White
Write-Host "  1. Asegúrate de que ADB reverse esté configurado:" -ForegroundColor Gray
Write-Host "     adb reverse tcp:3000 tcp:3000" -ForegroundColor Cyan
Write-Host "     adb reverse tcp:8081 tcp:8081" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. O usa la IP de red local en la app:" -ForegroundColor Gray
if ($localIPs) {
    $firstIP = $localIPs[0].IPAddress
    Write-Host "     http://$firstIP:3000" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  3. Verifica que el backend esté ejecutándose:" -ForegroundColor Gray
Write-Host "     cd api-clinica" -ForegroundColor Cyan
Write-Host "     npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "  4. Verifica que Metro esté ejecutándose:" -ForegroundColor Gray
Write-Host "     cd ClinicaMovil" -ForegroundColor Cyan
Write-Host "     npm run start:multi" -ForegroundColor Cyan
Write-Host ""

