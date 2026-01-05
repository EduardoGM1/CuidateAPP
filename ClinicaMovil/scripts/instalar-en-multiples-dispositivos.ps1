# Script para instalar la app en múltiples dispositivos/emuladores
# Permite probar diferentes usuarios con diferentes roles simultáneamente
# Funciona con cualquier combinación: emuladores, dispositivos físicos, o ambos

param(
    [string[]]$DeviceIds = @(),
    [switch]$ListDevices = $false,
    [switch]$Build = $true,
    [switch]$SkipBuild = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Instalacion en Multiples Dispositivos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Listar dispositivos disponibles (emuladores y físicos)
Write-Host "[1/4] Listando dispositivos disponibles..." -ForegroundColor Yellow

# Reiniciar ADB para asegurar detección correcta
adb kill-server 2>&1 | Out-Null
Start-Sleep -Seconds 1
adb start-server 2>&1 | Out-Null
Start-Sleep -Seconds 2

$devicesOutput = adb devices
$devices = @()

foreach ($line in $devicesOutput) {
    # Detectar cualquier dispositivo conectado (device, emulator, o authorized)
    if ($line -match "^\s+([^\s]+)\s+(device|emulator|unauthorized)") {
        $deviceId = $matches[1]
        $deviceStatus = $matches[2]
        
        # Determinar tipo de dispositivo
        $deviceType = "Desconocido"
        if ($deviceId -match "^emulator-") {
            $deviceType = "Emulador"
        } elseif ($deviceStatus -eq "device") {
            # Intentar determinar si es físico
            $deviceInfo = adb -s $deviceId shell getprop ro.kernel.qemu 2>&1
            if ($deviceInfo -match "1") {
                $deviceType = "Emulador"
            } else {
                $deviceType = "Dispositivo Fisico"
            }
        } elseif ($deviceStatus -eq "unauthorized") {
            $deviceType = "No Autorizado"
        }
        
        # Solo incluir dispositivos autorizados y listos
        if ($deviceStatus -eq "device" -or $deviceStatus -eq "emulator") {
            $devices += @{
                Id = $deviceId
                Type = $deviceType
                Status = $deviceStatus
            }
        }
    }
}

if ($devices.Count -eq 0) {
    Write-Host "No se encontraron dispositivos conectados." -ForegroundColor Red
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Yellow
    Write-Host "  1. Inicia emuladores desde Android Studio" -ForegroundColor White
    Write-Host "  2. Conecta dispositivos físicos via USB (con depuracion USB habilitada)" -ForegroundColor White
    Write-Host "  3. Verifica que los dispositivos esten autorizados:" -ForegroundColor White
    Write-Host "     adb devices" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Si ves 'unauthorized', acepta el dialogo en el dispositivo" -ForegroundColor Yellow
    exit 1
}

Write-Host "Dispositivos encontrados:" -ForegroundColor Green
for ($i = 0; $i -lt $devices.Count; $i++) {
    Write-Host "  [$($i + 1)] $($devices[$i].Id) ($($devices[$i].Type))" -ForegroundColor White
}
Write-Host ""

if ($ListDevices) {
    exit 0
}

# 2. Seleccionar dispositivos
$selectedDevices = @()

if ($DeviceIds.Count -gt 0) {
    # Usar dispositivos especificados
    foreach ($deviceId in $DeviceIds) {
        $device = $devices | Where-Object { $_.Id -eq $deviceId }
        if ($device) {
            $selectedDevices += $device
        } else {
            Write-Host "Dispositivo no encontrado: $deviceId" -ForegroundColor Red
        }
    }
} else {
    # Usar todos los dispositivos disponibles
    $selectedDevices = $devices
}

if ($selectedDevices.Count -eq 0) {
    Write-Host "No hay dispositivos seleccionados." -ForegroundColor Red
    exit 1
}

Write-Host "[2/4] Dispositivos seleccionados:" -ForegroundColor Yellow
foreach ($device in $selectedDevices) {
    Write-Host "  - $($device.Id) ($($device.Type))" -ForegroundColor White
}
Write-Host ""

# 3. Construir la app (si es necesario)
if ($Build -and -not $SkipBuild) {
    Write-Host "[3/4] Construyendo la app..." -ForegroundColor Yellow
    Write-Host "Esto puede tardar varios minutos..." -ForegroundColor Gray
    Write-Host ""
    
    cd android
    ./gradlew assembleDebug
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error al construir la app." -ForegroundColor Red
        cd ..
        exit 1
    }
    cd ..
    Write-Host "App construida exitosamente" -ForegroundColor Green
    Write-Host ""
} elseif ($SkipBuild) {
    Write-Host "[3/4] Omitiendo construccion (usando APK existente)..." -ForegroundColor Yellow
    Write-Host ""
}

# 4. Instalar en cada dispositivo
Write-Host "[4/4] Instalando en dispositivos..." -ForegroundColor Yellow
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $apkPath)) {
    Write-Host "APK no encontrado en: $apkPath" -ForegroundColor Red
    Write-Host "Ejecuta primero la construccion con: ./gradlew assembleDebug" -ForegroundColor Yellow
    exit 1
}

$successCount = 0
foreach ($device in $selectedDevices) {
    Write-Host "Instalando en $($device.Id)..." -ForegroundColor Cyan
    
    $installOutput = adb -s $device.Id install -r $apkPath 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Instalado exitosamente en $($device.Id)" -ForegroundColor Green
        $successCount++
        
        # Configurar adb reverse para cada dispositivo
        Write-Host "  Configurando adb reverse..." -ForegroundColor Gray
        adb -s $device.Id reverse tcp:3000 tcp:3000 2>&1 | Out-Null
        adb -s $device.Id reverse tcp:8081 tcp:8081 2>&1 | Out-Null
    } else {
        Write-Host "  Error al instalar en $($device.Id)" -ForegroundColor Red
        Write-Host "  $installOutput" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Instalacion completada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dispositivos con app instalada: $successCount de $($selectedDevices.Count)" -ForegroundColor $(if ($successCount -eq $selectedDevices.Count) { "Green" } else { "Yellow" })
Write-Host ""

# 5. Instrucciones para iniciar Metro y las apps
Write-Host "Para iniciar Metro y las apps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Inicia Metro (en una terminal):" -ForegroundColor Yellow
Write-Host "   npx react-native start" -ForegroundColor White
Write-Host ""
Write-Host "2. Inicia las apps en cada dispositivo:" -ForegroundColor Yellow
foreach ($device in $selectedDevices) {
    Write-Host "   adb -s $($device.Id) shell am start -n com.clinicamovil/.MainActivity" -ForegroundColor White
}
Write-Host ""
Write-Host "O usa el script:" -ForegroundColor Yellow
Write-Host "   .\scripts\iniciar-apps-en-dispositivos.ps1" -ForegroundColor White
Write-Host ""

