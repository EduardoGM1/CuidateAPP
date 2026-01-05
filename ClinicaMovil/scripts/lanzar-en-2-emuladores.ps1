# Script completo para lanzar la app en múltiples dispositivos
# Funciona con cualquier combinación: emuladores, dispositivos físicos, o ambos
# Permite probar diferentes usuarios con diferentes roles simultáneamente

param(
    [int]$MinDevices = 1,
    [int]$MaxDevices = 0,  # 0 = sin límite
    [switch]$Build = $true,
    [switch]$StartEmulators = $true
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Lanzar App en Multiples Dispositivos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Este script funciona con:" -ForegroundColor Yellow
Write-Host "  - Emuladores Android" -ForegroundColor White
Write-Host "  - Dispositivos fisicos (USB/WiFi)" -ForegroundColor White
Write-Host "  - Cualquier combinacion de ambos" -ForegroundColor White
Write-Host ""

# 1. Verificar ADB
Write-Host "[1/6] Verificando ADB..." -ForegroundColor Yellow
$adbCheck = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbCheck) {
    Write-Host "ADB no encontrado. Asegurate de tener Android SDK instalado." -ForegroundColor Red
    exit 1
}
Write-Host "ADB encontrado" -ForegroundColor Green
Write-Host ""

# 2. Listar emuladores disponibles
Write-Host "[2/6] Listando emuladores disponibles..." -ForegroundColor Yellow

# Buscar emulator en diferentes ubicaciones comunes
$emulatorPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe",
    "$env:ANDROID_HOME\emulator\emulator.exe",
    "$env:ANDROID_SDK_ROOT\emulator\emulator.exe"
)

$emulatorExe = $null
foreach ($path in $emulatorPaths) {
    if (Test-Path $path) {
        $emulatorExe = $path
        break
    }
}

if (-not $emulatorExe) {
    Write-Host "Emulador no encontrado. Buscando en PATH..." -ForegroundColor Yellow
    $emulatorExe = Get-Command emulator -ErrorAction SilentlyContinue
    if ($emulatorExe) {
        $emulatorExe = $emulatorExe.Source
    }
}

if (-not $emulatorExe) {
    Write-Host "No se encontro el emulador de Android." -ForegroundColor Red
    Write-Host "Por favor, inicia los emuladores manualmente desde Android Studio." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Luego ejecuta:" -ForegroundColor Cyan
    Write-Host "  .\scripts\instalar-en-multiples-dispositivos.ps1" -ForegroundColor White
    exit 1
}

# Listar AVDs disponibles
$avdsOutput = & $emulatorExe -list-avds 2>&1
$avds = @()

foreach ($line in $avdsOutput) {
    if ($line.Trim() -ne "") {
        $avds += $line.Trim()
    }
}

if ($avds.Count -eq 0) {
    Write-Host "No se encontraron AVDs (Android Virtual Devices)." -ForegroundColor Red
    Write-Host "Crea emuladores desde Android Studio -> AVD Manager" -ForegroundColor Yellow
    exit 1
}

Write-Host "AVDs disponibles:" -ForegroundColor Green
for ($i = 0; $i -lt $avds.Count; $i++) {
    Write-Host "  [$($i + 1)] $($avds[$i])" -ForegroundColor White
}
Write-Host ""

# 3. Verificar dispositivos ya conectados
Write-Host "[3/6] Verificando dispositivos ya conectados..." -ForegroundColor Yellow
adb kill-server 2>&1 | Out-Null
Start-Sleep -Seconds 1
adb start-server 2>&1 | Out-Null
Start-Sleep -Seconds 2

$connectedDevices = adb devices | Select-String -Pattern "^\s+([^\s]+)\s+(device|emulator)" | ForEach-Object { $_.Matches.Groups[1].Value }

if ($connectedDevices.Count -gt 0) {
    Write-Host "Dispositivos ya conectados: $($connectedDevices.Count)" -ForegroundColor Green
    foreach ($device in $connectedDevices) {
        $deviceType = "Desconocido"
        $deviceInfo = adb -s $device shell getprop ro.kernel.qemu 2>&1
        if ($deviceInfo -match "1") {
            $deviceType = "Emulador"
        } else {
            $deviceType = "Dispositivo Fisico"
        }
        Write-Host "  - $device ($deviceType)" -ForegroundColor White
    }
    Write-Host ""
}

# 4. Determinar cuántos emuladores iniciar
$targetDeviceCount = $MinDevices
if ($MaxDevices -gt 0 -and $targetDeviceCount -gt $MaxDevices) {
    $targetDeviceCount = $MaxDevices
}

$devicesNeeded = $targetDeviceCount - $connectedDevices.Count
$selectedAvds = @()

if ($StartEmulators -and $devicesNeeded -gt 0 -and $avds.Count -gt 0) {
    Write-Host "Se necesitan $devicesNeeded dispositivo(s) adicional(es)" -ForegroundColor Yellow
    
    # Seleccionar emuladores para iniciar
    $avdsToStart = [Math]::Min($devicesNeeded, $avds.Count)
    $selectedAvds = $avds[0..($avdsToStart - 1)]
    
    Write-Host "Emuladores a iniciar:" -ForegroundColor Yellow
    foreach ($avd in $selectedAvds) {
        Write-Host "  - $avd" -ForegroundColor White
    }
    Write-Host ""
} elseif ($connectedDevices.Count -ge $MinDevices) {
    Write-Host "Ya hay suficientes dispositivos conectados ($($connectedDevices.Count))" -ForegroundColor Green
    Write-Host "No es necesario iniciar emuladores adicionales" -ForegroundColor Gray
    Write-Host ""
}

# 5. Iniciar emuladores si es necesario
if ($StartEmulators -and $selectedAvds.Count -gt 0) {
    Write-Host "[4/6] Iniciando emuladores..." -ForegroundColor Yellow
    
    $emulatorsToStart = @()
    foreach ($avd in $selectedAvds) {
        # Verificar si el emulador ya esta corriendo
        $isRunning = $false
        foreach ($device in $connectedDevices) {
            $deviceInfo = adb -s $device shell getprop ro.kernel.qemu 2>&1
            if ($deviceInfo -match "1") {
                # Es un emulador, verificar si es el que buscamos
                $avdName = adb -s $device shell getprop ro.boot.qemu.avd_name 2>&1
                if ($avdName -match $avd) {
                    $isRunning = $true
                    break
                }
            }
        }
        
        if (-not $isRunning) {
            $emulatorsToStart += $avd
        } else {
            Write-Host "  $avd ya esta corriendo" -ForegroundColor Green
        }
    }

    if ($emulatorsToStart.Count -gt 0) {
        Write-Host "Iniciando $($emulatorsToStart.Count) emulador(es)..." -ForegroundColor Cyan
        foreach ($avd in $emulatorsToStart) {
            Write-Host "  Iniciando $avd..." -ForegroundColor White
            Start-Process -FilePath $emulatorExe -ArgumentList "-avd", $avd -WindowStyle Minimized
            Start-Sleep -Seconds 3
        }
        
        Write-Host "Esperando a que los emuladores inicien..." -ForegroundColor Yellow
        Write-Host "Esto puede tardar 30-90 segundos..." -ForegroundColor Gray
        
        # Esperar a que los emuladores esten listos
        $maxWait = 120 # segundos
        $waited = 0
        $targetCount = $connectedDevices.Count + $emulatorsToStart.Count
        
        while ($waited -lt $maxWait) {
            Start-Sleep -Seconds 5
            $waited += 5
            
            $currentDevices = adb devices | Select-String -Pattern "^\s+([^\s]+)\s+device" | ForEach-Object { $_.Matches.Groups[1].Value }
            if ($currentDevices.Count -ge $targetCount) {
                Write-Host "Emuladores listos" -ForegroundColor Green
                break
            } else {
                Write-Host "  Esperando... ($waited/$maxWait segundos) - $($currentDevices.Count)/$targetCount dispositivos" -ForegroundColor Gray
            }
        }
        
        if ($waited -ge $maxWait) {
            Write-Host "Los emuladores pueden no estar completamente listos." -ForegroundColor Yellow
            Write-Host "Continua de todas formas..." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Todos los emuladores seleccionados ya estan corriendo" -ForegroundColor Green
    }
    Write-Host ""
} else {
    Write-Host "[4/6] Omitiendo inicio de emuladores (StartEmulators=false o no necesario)" -ForegroundColor Yellow
    Write-Host ""
}

# 6. Construir la app (si es necesario)
if ($Build) {
    Write-Host "[5/6] Construyendo la app..." -ForegroundColor Yellow
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
}

# 7. Instalar en todos los dispositivos
Write-Host "[6/6] Instalando en dispositivos..." -ForegroundColor Yellow
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $apkPath)) {
    Write-Host "APK no encontrado. Construyendo..." -ForegroundColor Yellow
    cd android
    ./gradlew assembleDebug
    cd ..
}

$devices = adb devices | Select-String -Pattern "^\s+([^\s]+)\s+device" | ForEach-Object { $_.Matches.Groups[1].Value }

if ($devices.Count -eq 0) {
    Write-Host "No hay dispositivos conectados." -ForegroundColor Red
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Yellow
    Write-Host "  1. Espera a que los emuladores terminen de iniciar" -ForegroundColor White
    Write-Host "  2. Conecta dispositivos fisicos via USB" -ForegroundColor White
    Write-Host "  3. Ejecuta manualmente: .\scripts\instalar-en-multiples-dispositivos.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Verificar que tenemos al menos el mínimo requerido
if ($devices.Count -lt $MinDevices) {
    Write-Host "Advertencia: Solo hay $($devices.Count) dispositivo(s), se requieren al menos $MinDevices" -ForegroundColor Yellow
    Write-Host "Continuando de todas formas..." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Dispositivos encontrados: $($devices.Count)" -ForegroundColor Green

# Mostrar información de cada dispositivo
foreach ($device in $devices) {
    $deviceType = "Desconocido"
    $deviceInfo = adb -s $device shell getprop ro.kernel.qemu 2>&1
    if ($deviceInfo -match "1") {
        $deviceType = "Emulador"
    } else {
        $deviceType = "Dispositivo Fisico"
    }
    Write-Host "  - $device ($deviceType)" -ForegroundColor White
}
Write-Host ""

$successCount = 0
foreach ($device in $devices) {
    $deviceType = "Dispositivo"
    $deviceInfo = adb -s $device shell getprop ro.kernel.qemu 2>&1
    if ($deviceInfo -match "1") {
        $deviceType = "Emulador"
    } else {
        $deviceType = "Fisico"
    }
    
    Write-Host "Instalando en $device ($deviceType)..." -ForegroundColor Cyan
    
    $installOutput = adb -s $device install -r $apkPath 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Instalado exitosamente" -ForegroundColor Green
        $successCount++
        
        # Configurar adb reverse para cada dispositivo
        Write-Host "  Configurando adb reverse..." -ForegroundColor Gray
        adb -s $device reverse tcp:3000 tcp:3000 2>&1 | Out-Null
        adb -s $device reverse tcp:8081 tcp:8081 2>&1 | Out-Null
        Write-Host "  adb reverse configurado" -ForegroundColor Gray
    } else {
        Write-Host "  Error al instalar" -ForegroundColor Red
        if ($installOutput) {
            Write-Host "  Detalles: $($installOutput -join ' ')" -ForegroundColor Gray
        }
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Instalacion completada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Apps instaladas en: $successCount dispositivo(s)" -ForegroundColor Green
Write-Host ""

# 7. Instrucciones finales
Write-Host "Siguientes pasos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Inicia Metro (en una terminal separada):" -ForegroundColor Yellow
Write-Host "   npx react-native start" -ForegroundColor White
Write-Host ""
Write-Host "2. Inicia las apps en los emuladores:" -ForegroundColor Yellow
Write-Host "   .\scripts\iniciar-apps-en-dispositivos.ps1" -ForegroundColor White
Write-Host ""
Write-Host "O manualmente:" -ForegroundColor Yellow
foreach ($device in $devices) {
    Write-Host "   adb -s $device shell am start -n com.clinicamovil/.MainActivity" -ForegroundColor White
}
Write-Host ""
Write-Host "3. Prueba diferentes usuarios:" -ForegroundColor Yellow
Write-Host "   - Dispositivo 1: Doctor o Administrador" -ForegroundColor White
Write-Host "   - Dispositivo 2: Paciente" -ForegroundColor White
Write-Host ""
Write-Host "Nota: Funciona con cualquier combinacion de emuladores y dispositivos fisicos" -ForegroundColor Gray
Write-Host ""

