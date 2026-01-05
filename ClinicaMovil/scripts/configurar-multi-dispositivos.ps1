# Script para configurar ADB Reverse para múltiples dispositivos
# Permite usar 1 dispositivo físico + 1 emulador simultáneamente con Metro

Write-Host "`n🔧 CONFIGURACIÓN DE MÚLTIPLES DISPOSITIVOS PARA METRO`n" -ForegroundColor Cyan

# Verificar que ADB está disponible
try {
    $adbVersion = adb version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "ADB no encontrado"
    }
} catch {
    Write-Host "❌ Error: ADB no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "   Instala Android SDK Platform Tools" -ForegroundColor Yellow
    exit 1
}

# Detectar dispositivos conectados
Write-Host "🔍 Detectando dispositivos conectados..." -ForegroundColor Yellow
$devicesOutput = adb devices
$devices = @()

# Parsear salida de adb devices
$devicesOutput | ForEach-Object {
    $line = $_.Trim()
    # Buscar líneas que terminan con "device" (no "offline" o "unauthorized")
    if ($line -match '^([^\s]+)\s+device$') {
        $deviceId = $matches[1]
        if ($deviceId -ne "List" -and $deviceId -notmatch "^List") {
            $devices += $deviceId
        }
    }
}

if ($devices.Count -eq 0) {
    Write-Host "`n❌ No se encontraron dispositivos conectados" -ForegroundColor Red
    Write-Host "   Conecta tu dispositivo físico por USB o inicia el emulador" -ForegroundColor Yellow
    Write-Host "   Luego ejecuta: adb devices" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n✅ Dispositivos encontrados: $($devices.Count)" -ForegroundColor Green
foreach ($device in $devices) {
    $deviceType = if ($device -like "emulator-*") { "Emulador" } else { "Dispositivo Físico" }
    Write-Host "   - $device ($deviceType)" -ForegroundColor Cyan
}

# Configurar ADB Reverse para cada dispositivo
Write-Host "`n🔧 Configurando ADB Reverse..." -ForegroundColor Yellow

$configured = 0
foreach ($device in $devices) {
    Write-Host "`n   Configurando $device..." -ForegroundColor Gray
    
    # Configurar puerto 8081 (Metro Bundler)
    $result8081 = adb -s $device reverse tcp:8081 tcp:8081 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ Metro (8081) configurado" -ForegroundColor Green
    } else {
        Write-Host "      ⚠️  Error configurando Metro: $result8081" -ForegroundColor Yellow
    }
    
    # Configurar puerto 3000 (Backend API)
    $result3000 = adb -s $device reverse tcp:3000 tcp:3000 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      ✅ API Backend (3000) configurado" -ForegroundColor Green
    } else {
        Write-Host "      ⚠️  Error configurando API: $result3000" -ForegroundColor Yellow
    }
    
    $configured++
}

# Mostrar resumen
Write-Host "`n📋 RESUMEN DE CONFIGURACIÓN:`n" -ForegroundColor Cyan
$reverseList = adb reverse --list
if ($reverseList) {
    $reverseList | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  No se encontraron configuraciones de reverse" -ForegroundColor Yellow
}

# Obtener IP local
Write-Host "`n🌐 INFORMACIÓN DE RED:`n" -ForegroundColor Cyan
try {
    $ipConfig = ipconfig | Select-String "IPv4" | Select-Object -First 1
    if ($ipConfig -match '(\d+\.\d+\.\d+\.\d+)') {
        $localIP = $matches[1]
        Write-Host "   IP Local: $localIP" -ForegroundColor Green
        Write-Host "   Metro URL: http://$localIP:8081" -ForegroundColor Gray
        Write-Host "   API URL: http://$localIP:3000" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️  No se pudo obtener IP local" -ForegroundColor Yellow
}

# Instrucciones finales
Write-Host "`n✅ CONFIGURACIÓN COMPLETADA`n" -ForegroundColor Green
Write-Host "📝 PRÓXIMOS PASOS:`n" -ForegroundColor Cyan
Write-Host "   1. Inicia Metro en modo multi-dispositivo:" -ForegroundColor Yellow
Write-Host "      npm run start:multi" -ForegroundColor Gray
Write-Host "`n   2. En otra terminal, ejecuta la app en cada dispositivo:" -ForegroundColor Yellow
Write-Host "      npm run android" -ForegroundColor Gray
Write-Host "`n   3. O ejecuta en dispositivo específico:" -ForegroundColor Yellow
Write-Host "      npx react-native run-android --deviceId=$($devices[0])" -ForegroundColor Gray
Write-Host "`n💡 NOTA: Si desconectas un dispositivo USB, vuelve a ejecutar este script`n" -ForegroundColor Yellow

