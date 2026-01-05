# Script para verificar el estado de múltiples dispositivos y Metro

Write-Host "`n🔍 VERIFICACIÓN DE CONFIGURACIÓN MULTI-DISPOSITIVOS`n" -ForegroundColor Cyan

# Verificar ADB
Write-Host "1️⃣ Verificando ADB..." -ForegroundColor Yellow
try {
    $adbVersion = adb version 2>&1 | Select-Object -First 1
    Write-Host "   ✅ ADB disponible: $adbVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ ADB no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar dispositivos
Write-Host "`n2️⃣ Verificando dispositivos conectados..." -ForegroundColor Yellow
$devicesOutput = adb devices
$devices = @()
$devicesOutput | ForEach-Object {
    if ($_ -match "^\s*(\S+)\s+device\s*$") {
        $deviceId = $matches[1]
        if ($deviceId -ne "List") {
            $devices += $deviceId
        }
    }
}

if ($devices.Count -eq 0) {
    Write-Host "   ❌ No hay dispositivos conectados" -ForegroundColor Red
} else {
    Write-Host "   ✅ Dispositivos encontrados: $($devices.Count)" -ForegroundColor Green
    foreach ($device in $devices) {
        $deviceType = if ($device -like "emulator-*") { "Emulador" } else { "Físico" }
        Write-Host "      - $device ($deviceType)" -ForegroundColor Cyan
    }
}

# Verificar ADB Reverse
Write-Host "`n3️⃣ Verificando ADB Reverse..." -ForegroundColor Yellow
$reverseList = adb reverse --list
if ($reverseList) {
    Write-Host "   ✅ Configuraciones de reverse encontradas:" -ForegroundColor Green
    $reverseList | ForEach-Object {
        if ($_ -match "(\S+)\s+tcp:(\d+)\s+tcp:(\d+)") {
            $deviceId = $matches[1]
            $port = $matches[2]
            Write-Host "      - $deviceId : puerto $port" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "   ⚠️  No hay configuraciones de reverse" -ForegroundColor Yellow
    Write-Host "      Ejecuta: .\scripts\configurar-multi-dispositivos.ps1" -ForegroundColor Gray
}

# Verificar Metro (puerto 8081)
Write-Host "`n4️⃣ Verificando Metro Bundler (puerto 8081)..." -ForegroundColor Yellow
try {
    $metroResponse = Invoke-WebRequest -Uri "http://localhost:8081/status" -TimeoutSec 2 -ErrorAction Stop
    if ($metroResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Metro está corriendo en localhost:8081" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Metro no está corriendo o no es accesible" -ForegroundColor Red
    Write-Host "      Inicia Metro con: npm run start:multi" -ForegroundColor Gray
}

# Verificar IP local
Write-Host "`n5️⃣ Verificando IP local..." -ForegroundColor Yellow
try {
    $ipConfig = ipconfig | Select-String "IPv4" | Select-Object -First 1
    if ($ipConfig -match "(\d+\.\d+\.\d+\.\d+)") {
        $localIP = $matches[1]
        Write-Host "   ✅ IP Local: $localIP" -ForegroundColor Green
        
        # Verificar si Metro es accesible desde IP local
        try {
            $metroIPResponse = Invoke-WebRequest -Uri "http://$localIP:8081/status" -TimeoutSec 2 -ErrorAction Stop
            if ($metroIPResponse.StatusCode -eq 200) {
                Write-Host "   ✅ Metro accesible desde IP local ($localIP:8081)" -ForegroundColor Green
            }
        } catch {
            Write-Host "   ⚠️  Metro no accesible desde IP local" -ForegroundColor Yellow
            Write-Host "      Asegúrate de iniciar Metro con: npm run start:multi" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ⚠️  No se pudo obtener IP local" -ForegroundColor Yellow
}

# Verificar Backend (puerto 3000)
Write-Host "`n6️⃣ Verificando Backend API (puerto 3000)..." -ForegroundColor Yellow
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 2 -ErrorAction Stop
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Backend está corriendo en localhost:3000" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Backend no está corriendo o no es accesible" -ForegroundColor Yellow
    Write-Host "      Inicia el backend desde: api-clinica" -ForegroundColor Gray
}

# Resumen
Write-Host "`n📊 RESUMEN:`n" -ForegroundColor Cyan
$allGood = $true

if ($devices.Count -eq 0) {
    Write-Host "   ❌ No hay dispositivos conectados" -ForegroundColor Red
    $allGood = $false
} else {
    Write-Host "   ✅ $($devices.Count) dispositivo(s) conectado(s)" -ForegroundColor Green
}

if (-not $reverseList) {
    Write-Host "   ⚠️  ADB Reverse no configurado" -ForegroundColor Yellow
    $allGood = $false
} else {
    Write-Host "   ✅ ADB Reverse configurado" -ForegroundColor Green
}

try {
    $metroCheck = Invoke-WebRequest -Uri "http://localhost:8081/status" -TimeoutSec 1 -ErrorAction Stop
    Write-Host "   ✅ Metro está corriendo" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Metro no está corriendo" -ForegroundColor Red
    $allGood = $false
}

if ($allGood) {
    Write-Host "`n✅ TODO LISTO - Puedes usar múltiples dispositivos`n" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Revisa los problemas arriba antes de continuar`n" -ForegroundColor Yellow
}

