# Script para instalar la aplicación en un dispositivo físico Android
# Uso: .\scripts\instalar-dispositivo-fisico.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📱 INSTALACIÓN EN DISPOSITIVO FÍSICO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en la carpeta correcta
$currentPath = Get-Location
$expectedPath = Join-Path $PSScriptRoot ".."

if ($currentPath -ne $expectedPath) {
    Write-Host "⚠️  Cambiando a la carpeta correcta..." -ForegroundColor Yellow
    Set-Location $expectedPath
    Write-Host "✅ Directorio actual: $(Get-Location)" -ForegroundColor Green
    Write-Host ""
}

# Verificar ADB
$adbPath = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbPath) {
    Write-Host "❌ ERROR: ADB no encontrado" -ForegroundColor Red
    Write-Host "   Asegúrate de tener Android SDK instalado" -ForegroundColor Red
    exit 1
}

# Listar dispositivos
Write-Host "🔍 Buscando dispositivos conectados..." -ForegroundColor Yellow
Write-Host ""

$devicesOutput = adb devices
$devices = $devicesOutput | Select-Object -Skip 1 | Where-Object { $_ -match "device" }

if ($devices.Count -eq 0) {
    Write-Host "❌ ERROR: No se encontraron dispositivos conectados" -ForegroundColor Red
    Write-Host ""
    Write-Host "Pasos a seguir:" -ForegroundColor Yellow
    Write-Host "  1. Conecta tu dispositivo Android por USB" -ForegroundColor White
    Write-Host "  2. Habilita 'Depuración USB' en el dispositivo:" -ForegroundColor White
    Write-Host "     - Ajustes > Acerca del teléfono" -ForegroundColor Gray
    Write-Host "     - Toca 'Número de compilación' 7 veces" -ForegroundColor Gray
    Write-Host "     - Ajustes > Opciones de desarrollador" -ForegroundColor Gray
    Write-Host "     - Activa 'Depuración USB'" -ForegroundColor Gray
    Write-Host "  3. Acepta el diálogo de depuración USB en el teléfono" -ForegroundColor White
    Write-Host "  4. Ejecuta este script nuevamente" -ForegroundColor White
    exit 1
}

# Filtrar solo dispositivos físicos (no emuladores)
$physicalDevices = @()
foreach ($device in $devices) {
    $deviceId = ($device -split "\s+")[0]
    if ($deviceId -notlike "emulator-*") {
        $physicalDevices += $deviceId
    }
}

if ($physicalDevices.Count -eq 0) {
    Write-Host "⚠️  No se encontraron dispositivos físicos" -ForegroundColor Yellow
    Write-Host "   Solo se encontraron emuladores" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Conecta un dispositivo físico por USB y habilita depuración USB" -ForegroundColor White
    exit 1
}

# Si hay múltiples dispositivos, preguntar cuál usar
$selectedDevice = $null
if ($physicalDevices.Count -eq 1) {
    $selectedDevice = $physicalDevices[0]
    Write-Host "✅ Dispositivo encontrado: $selectedDevice" -ForegroundColor Green
} else {
    Write-Host "Múltiples dispositivos encontrados:" -ForegroundColor Yellow
    Write-Host ""
    for ($i = 0; $i -lt $physicalDevices.Count; $i++) {
        $deviceId = $physicalDevices[$i]
        $model = adb -s $deviceId shell getprop ro.product.model 2>$null
        Write-Host "  $($i + 1). $deviceId" -ForegroundColor Cyan
        if ($model) {
            Write-Host "     Modelo: $model" -ForegroundColor Gray
        }
    }
    Write-Host ""
    $selection = Read-Host "Selecciona el dispositivo (1-$($physicalDevices.Count))"
    $index = [int]$selection - 1
    if ($index -ge 0 -and $index -lt $physicalDevices.Count) {
        $selectedDevice = $physicalDevices[$index]
    } else {
        Write-Host "❌ Selección inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔧 CONFIGURANDO CONEXIÓN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configurar ADB reverse para Metro (puerto 8081)
Write-Host "📡 Configurando ADB reverse para Metro (puerto 8081)..." -ForegroundColor Yellow
$reverseMetro = adb -s $selectedDevice reverse tcp:8081 tcp:8081
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ADB reverse configurado para Metro" -ForegroundColor Green
} else {
    Write-Host "⚠️  No se pudo configurar ADB reverse para Metro" -ForegroundColor Yellow
}

# Configurar ADB reverse para Backend (puerto 3000)
Write-Host "📡 Configurando ADB reverse para Backend (puerto 3000)..." -ForegroundColor Yellow
$reverseBackend = adb -s $selectedDevice reverse tcp:3000 tcp:3000
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ ADB reverse configurado para Backend" -ForegroundColor Green
} else {
    Write-Host "⚠️  No se pudo configurar ADB reverse para Backend" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📦 INSTALANDO APLICACIÓN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dispositivo: $selectedDevice" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - Asegúrate de que Metro Bundler esté ejecutándose" -ForegroundColor White
Write-Host "   - Ejecuta en otra terminal: npm start" -ForegroundColor White
Write-Host "   - O usa: npm run start:multi (para múltiples dispositivos)" -ForegroundColor White
Write-Host ""
Write-Host "Presiona Enter para continuar con la instalación..." -ForegroundColor Yellow
Read-Host

Write-Host ""
Write-Host "🚀 Instalando aplicación..." -ForegroundColor Cyan
Write-Host ""

# Instalar la aplicación
npx react-native run-android --deviceId=$selectedDevice

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ INSTALACIÓN COMPLETADA" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "La aplicación debería estar ejecutándose en tu dispositivo" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Si la app no se conecta a Metro:" -ForegroundColor Yellow
    Write-Host "   1. Agita el dispositivo o presiona Ctrl+M" -ForegroundColor White
    Write-Host "   2. Selecciona 'Settings'" -ForegroundColor White
    Write-Host "   3. Cambia 'Debug server host & port for device' a:" -ForegroundColor White
    Write-Host "      localhost:8081" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ ERROR EN LA INSTALACIÓN" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Revisa los errores anteriores" -ForegroundColor Yellow
    Write-Host ""
}

