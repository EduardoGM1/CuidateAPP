# Script para conectar múltiples dispositivos Android a Metro
# Uso: .\scripts\connect-multiple-devices.ps1

Write-Host "`n🔍 Detectando dispositivos conectados..." -ForegroundColor Cyan

# Obtener lista de dispositivos
$devices = adb devices | Select-String "device$" | ForEach-Object {
    ($_ -split "\s+")[0]
}

if ($devices.Count -eq 0) {
    Write-Host "❌ No se encontraron dispositivos" -ForegroundColor Red
    Write-Host "💡 Asegúrate de que:" -ForegroundColor Yellow
    Write-Host "   1. Los dispositivos estén conectados por USB" -ForegroundColor Yellow
    Write-Host "   2. La depuración USB esté habilitada" -ForegroundColor Yellow
    Write-Host "   3. Ejecuta 'adb devices' para verificar" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Dispositivos encontrados: $($devices.Count)" -ForegroundColor Green
$devices | ForEach-Object { 
    Write-Host "   📱 $_" -ForegroundColor Yellow 
}

# Configurar adb reverse para cada dispositivo
Write-Host "`n🔧 Configurando adb reverse (puerto 3000) para cada dispositivo..." -ForegroundColor Cyan
$successCount = 0
$devices | ForEach-Object {
    $deviceId = $_
    Write-Host "   Configurando $deviceId..." -ForegroundColor Gray
    adb -s $deviceId reverse tcp:3000 tcp:3000 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $deviceId configurado correctamente" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "   ⚠️  Advertencia al configurar $deviceId (puede que ya esté configurado)" -ForegroundColor Yellow
    }
}

Write-Host "`n📊 Resumen:" -ForegroundColor Cyan
Write-Host "   Dispositivos detectados: $($devices.Count)" -ForegroundColor White
Write-Host "   Configurados exitosamente: $successCount" -ForegroundColor White

# Obtener IP local para Wi-Fi
Write-Host "`n🌐 Información de red:" -ForegroundColor Cyan
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.0.*" 
} | Select-Object -First 1).IPAddress

if ($ipAddress) {
    Write-Host "   IP Local: $ipAddress" -ForegroundColor White
    Write-Host "   Metro Bundler: http://$ipAddress`:8081" -ForegroundColor White
    Write-Host "   Backend API: http://$ipAddress`:3000" -ForegroundColor White
} else {
    Write-Host "   ⚠️  No se pudo detectar IP local" -ForegroundColor Yellow
}

Write-Host "`n💡 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Asegúrate de que Metro Bundler esté ejecutándose:" -ForegroundColor Yellow
Write-Host "      npm start" -ForegroundColor White
Write-Host "`n   2. Asegúrate de que el Backend API esté ejecutándose:" -ForegroundColor Yellow
Write-Host "      cd ..\api-clinica" -ForegroundColor White
Write-Host "      node index.js" -ForegroundColor White
Write-Host "`n   3. Instala la app en cada dispositivo:" -ForegroundColor Yellow
$devices | ForEach-Object {
    Write-Host "      npx react-native run-android --deviceId=$_" -ForegroundColor White
}
Write-Host "`n   4. O instala manualmente en cada dispositivo y configura la IP:" -ForegroundColor Yellow
Write-Host "      Agita el dispositivo → Settings → Debug server host & port" -ForegroundColor White
if ($ipAddress) {
    Write-Host "      Ingresa: $ipAddress`:8081" -ForegroundColor White
}

Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
Write-Host "`n"

