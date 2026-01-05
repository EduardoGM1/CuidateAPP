# Script para verificar la configuración de emuladores para notificaciones push
# Verifica: Google Play Services, permisos, Firebase, etc.

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN DE CONFIGURACIÓN DE EMULADORES" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Obtener lista de emuladores
$devices = adb devices | Select-String "emulator" | ForEach-Object { ($_ -split "\s+")[0] }

if ($devices.Count -eq 0) {
    Write-Host "❌ No se encontraron emuladores conectados" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, inicia al menos un emulador y vuelve a ejecutar este script." -ForegroundColor Yellow
    exit 1
}

Write-Host "📱 Emuladores encontrados: $($devices.Count)" -ForegroundColor Green
Write-Host ""

foreach ($device in $devices) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "EMULADOR: $device" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # 1. Verificar versión de Android
    Write-Host "1️⃣ Verificando versión de Android..." -ForegroundColor Cyan
    $androidVersion = adb -s $device shell getprop ro.build.version.release
    Write-Host "   ✅ Android $androidVersion" -ForegroundColor Green
    Write-Host ""
    
    # 2. Verificar Google Play Services
    Write-Host "2️⃣ Verificando Google Play Services..." -ForegroundColor Cyan
    $gmsInstalled = adb -s $device shell pm list packages | Select-String -Pattern "com.google.android.gms"
    
    if ($gmsInstalled) {
        Write-Host "   ✅ Google Play Services instalado" -ForegroundColor Green
        
        # Obtener versión de Google Play Services
        $gmsVersion = adb -s $device shell dumpsys package com.google.android.gms | Select-String -Pattern "versionName" | Select-Object -First 1
        if ($gmsVersion) {
            Write-Host "   Version: $gmsVersion" -ForegroundColor Gray
        }
    } else {
        Write-Host "   Google Play Services NO instalado" -ForegroundColor Red
        Write-Host "   Este emulador NO puede recibir notificaciones push" -ForegroundColor Yellow
        Write-Host "   Solucion: Usa un emulador con Google Play en el nombre" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 3. Verificar si la app esta instalada
    Write-Host "3. Verificando si la app esta instalada..." -ForegroundColor Cyan
    $appInstalled = adb -s $device shell pm list packages | Select-String -Pattern "com.clinicamovil"
    
    if ($appInstalled) {
        Write-Host "   App Clinica Movil instalada" -ForegroundColor Green
        
        # Obtener version de la app
        $appVersion = adb -s $device shell dumpsys package com.clinicamovil | Select-String -Pattern "versionName" | Select-Object -First 1
        if ($appVersion) {
            Write-Host "   Version: $appVersion" -ForegroundColor Gray
        }
    } else {
        Write-Host "   App NO instalada" -ForegroundColor Red
        Write-Host "   Solucion: Instala la app con: npx react-native run-android --deviceId=$device" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 4. Verificar permisos de notificacion
    Write-Host "4. Verificando permisos de notificacion..." -ForegroundColor Cyan
    if ($appInstalled) {
        $permissions = adb -s $device shell dumpsys package com.clinicamovil | Select-String -Pattern "POST_NOTIFICATIONS"
        
        if ($permissions) {
            $permissionStatus = $permissions | Select-String -Pattern "granted=true"
            if ($permissionStatus) {
                Write-Host "   Permisos de notificacion OTORGADOS" -ForegroundColor Green
            } else {
                Write-Host "   Permisos de notificacion NO otorgados" -ForegroundColor Yellow
                Write-Host "   Solucion: Abre la app y otorga permisos cuando se soliciten" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   No se encontro informacion de permisos" -ForegroundColor Yellow
        }
    } else {
        Write-Host '   No se puede verificar (aplicacion no instalada)' -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 5. Verificar conexion a internet
    Write-Host "5. Verificando conexion a internet..." -ForegroundColor Cyan
    $pingResult = adb -s $device shell ping -c 1 8.8.8.8 2>&1
    if ($pingResult -match "1 received" -or $pingResult -match "1 packets transmitted") {
        Write-Host "   Conexion a internet activa" -ForegroundColor Green
    } else {
        Write-Host "   No se pudo verificar conexion a internet" -ForegroundColor Yellow
        Write-Host "   Asegurate de que el emulador tenga conexion a internet" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 6. Verificar Google Services Framework
    Write-Host "6. Verificando Google Services Framework..." -ForegroundColor Cyan
    $gsfInstalled = adb -s $device shell pm list packages | Select-String -Pattern "com.google.android.gsf"
    
    if ($gsfInstalled) {
        Write-Host "   Google Services Framework instalado" -ForegroundColor Green
    } else {
        Write-Host "   Google Services Framework NO instalado" -ForegroundColor Yellow
        Write-Host "   Esto puede afectar la inicializacion de Firebase" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 7. Resumen de compatibilidad
    Write-Host "RESUMEN DE COMPATIBILIDAD:" -ForegroundColor Cyan
    Write-Host ""
    
    $compatible = $true
    
    if (-not $gmsInstalled) {
        $compatible = $false
        Write-Host "   NO COMPATIBLE: Google Play Services faltante" -ForegroundColor Red
    } else {
        Write-Host "   Google Play Services: OK" -ForegroundColor Green
    }
    
    if (-not $appInstalled) {
        Write-Host '   App no instalada (no critico para verificacion)' -ForegroundColor Yellow
    } else {
        Write-Host '   App instalada: OK' -ForegroundColor Green
    }
    
    if ($compatible) {
        Write-Host ""
        Write-Host "   ESTE EMULADOR ES COMPATIBLE CON NOTIFICACIONES PUSH" -ForegroundColor Green
        Write-Host "   Puede recibir notificaciones push de Firebase" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "   ESTE EMULADOR NO ES COMPATIBLE CON NOTIFICACIONES PUSH" -ForegroundColor Red
        Write-Host "   Solucion: Usa un emulador con Google Play en el nombre" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN COMPLETA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Si algun emulador NO es compatible:" -ForegroundColor White
Write-Host "   - Crea un nuevo emulador con Google Play en Android Studio" -ForegroundColor Gray
Write-Host "   - Ejemplo: Pixel 5 API 33 (Google Play)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Si la app no esta instalada:" -ForegroundColor White
Write-Host "   - Ejecuta: npx react-native run-android --deviceId=<DEVICE_ID>" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Para verificar tokens FCM:" -ForegroundColor White
Write-Host "   - Inicia sesion en la app" -ForegroundColor Gray
Write-Host "   - Revisa los logs en React Native DevTools" -ForegroundColor Gray
Write-Host "   - Busca: Token FCM REAL obtenido exitosamente" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Para probar notificaciones:" -ForegroundColor White
Write-Host "   - Inicia sesion como paciente en un emulador" -ForegroundColor Gray
Write-Host "   - Inicia sesion como doctor en otro emulador" -ForegroundColor Gray
Write-Host "   - Crea una cita desde el doctor" -ForegroundColor Gray
Write-Host "   - El paciente deberia recibir la notificacion" -ForegroundColor Gray
Write-Host ""



Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN DE CONFIGURACIÓN DE EMULADORES" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Obtener lista de emuladores
$devices = adb devices | Select-String "emulator" | ForEach-Object { ($_ -split "\s+")[0] }

if ($devices.Count -eq 0) {
    Write-Host "❌ No se encontraron emuladores conectados" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, inicia al menos un emulador y vuelve a ejecutar este script." -ForegroundColor Yellow
    exit 1
}

Write-Host "📱 Emuladores encontrados: $($devices.Count)" -ForegroundColor Green
Write-Host ""

foreach ($device in $devices) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "EMULADOR: $device" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # 1. Verificar versión de Android
    Write-Host "1️⃣ Verificando versión de Android..." -ForegroundColor Cyan
    $androidVersion = adb -s $device shell getprop ro.build.version.release
    Write-Host "   ✅ Android $androidVersion" -ForegroundColor Green
    Write-Host ""
    
    # 2. Verificar Google Play Services
    Write-Host "2️⃣ Verificando Google Play Services..." -ForegroundColor Cyan
    $gmsInstalled = adb -s $device shell pm list packages | Select-String -Pattern "com.google.android.gms"
    
    if ($gmsInstalled) {
        Write-Host "   ✅ Google Play Services instalado" -ForegroundColor Green
        
        # Obtener versión de Google Play Services
        $gmsVersion = adb -s $device shell dumpsys package com.google.android.gms | Select-String -Pattern "versionName" | Select-Object -First 1
        if ($gmsVersion) {
            Write-Host "   Version: $gmsVersion" -ForegroundColor Gray
        }
    } else {
        Write-Host "   Google Play Services NO instalado" -ForegroundColor Red
        Write-Host "   Este emulador NO puede recibir notificaciones push" -ForegroundColor Yellow
        Write-Host "   Solucion: Usa un emulador con Google Play en el nombre" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 3. Verificar si la app esta instalada
    Write-Host "3. Verificando si la app esta instalada..." -ForegroundColor Cyan
    $appInstalled = adb -s $device shell pm list packages | Select-String -Pattern "com.clinicamovil"
    
    if ($appInstalled) {
        Write-Host "   App Clinica Movil instalada" -ForegroundColor Green
        
        # Obtener version de la app
        $appVersion = adb -s $device shell dumpsys package com.clinicamovil | Select-String -Pattern "versionName" | Select-Object -First 1
        if ($appVersion) {
            Write-Host "   Version: $appVersion" -ForegroundColor Gray
        }
    } else {
        Write-Host "   App NO instalada" -ForegroundColor Red
        Write-Host "   Solucion: Instala la app con: npx react-native run-android --deviceId=$device" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 4. Verificar permisos de notificacion
    Write-Host "4. Verificando permisos de notificacion..." -ForegroundColor Cyan
    if ($appInstalled) {
        $permissions = adb -s $device shell dumpsys package com.clinicamovil | Select-String -Pattern "POST_NOTIFICATIONS"
        
        if ($permissions) {
            $permissionStatus = $permissions | Select-String -Pattern "granted=true"
            if ($permissionStatus) {
                Write-Host "   Permisos de notificacion OTORGADOS" -ForegroundColor Green
            } else {
                Write-Host "   Permisos de notificacion NO otorgados" -ForegroundColor Yellow
                Write-Host "   Solucion: Abre la app y otorga permisos cuando se soliciten" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   No se encontro informacion de permisos" -ForegroundColor Yellow
        }
    } else {
        Write-Host '   No se puede verificar (aplicacion no instalada)' -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 5. Verificar conexion a internet
    Write-Host "5. Verificando conexion a internet..." -ForegroundColor Cyan
    $pingResult = adb -s $device shell ping -c 1 8.8.8.8 2>&1
    if ($pingResult -match "1 received" -or $pingResult -match "1 packets transmitted") {
        Write-Host "   Conexion a internet activa" -ForegroundColor Green
    } else {
        Write-Host "   No se pudo verificar conexion a internet" -ForegroundColor Yellow
        Write-Host "   Asegurate de que el emulador tenga conexion a internet" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 6. Verificar Google Services Framework
    Write-Host "6. Verificando Google Services Framework..." -ForegroundColor Cyan
    $gsfInstalled = adb -s $device shell pm list packages | Select-String -Pattern "com.google.android.gsf"
    
    if ($gsfInstalled) {
        Write-Host "   Google Services Framework instalado" -ForegroundColor Green
    } else {
        Write-Host "   Google Services Framework NO instalado" -ForegroundColor Yellow
        Write-Host "   Esto puede afectar la inicializacion de Firebase" -ForegroundColor Yellow
    }
    Write-Host ""
    
    # 7. Resumen de compatibilidad
    Write-Host "RESUMEN DE COMPATIBILIDAD:" -ForegroundColor Cyan
    Write-Host ""
    
    $compatible = $true
    
    if (-not $gmsInstalled) {
        $compatible = $false
        Write-Host "   NO COMPATIBLE: Google Play Services faltante" -ForegroundColor Red
    } else {
        Write-Host "   Google Play Services: OK" -ForegroundColor Green
    }
    
    if (-not $appInstalled) {
        Write-Host '   App no instalada (no critico para verificacion)' -ForegroundColor Yellow
    } else {
        Write-Host '   App instalada: OK' -ForegroundColor Green
    }
    
    if ($compatible) {
        Write-Host ""
        Write-Host "   ESTE EMULADOR ES COMPATIBLE CON NOTIFICACIONES PUSH" -ForegroundColor Green
        Write-Host "   Puede recibir notificaciones push de Firebase" -ForegroundColor Gray
    } else {
        Write-Host ""
        Write-Host "   ESTE EMULADOR NO ES COMPATIBLE CON NOTIFICACIONES PUSH" -ForegroundColor Red
        Write-Host "   Solucion: Usa un emulador con Google Play en el nombre" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VERIFICACIÓN COMPLETA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PROXIMOS PASOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Si algun emulador NO es compatible:" -ForegroundColor White
Write-Host "   - Crea un nuevo emulador con Google Play en Android Studio" -ForegroundColor Gray
Write-Host "   - Ejemplo: Pixel 5 API 33 (Google Play)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Si la app no esta instalada:" -ForegroundColor White
Write-Host "   - Ejecuta: npx react-native run-android --deviceId=<DEVICE_ID>" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Para verificar tokens FCM:" -ForegroundColor White
Write-Host "   - Inicia sesion en la app" -ForegroundColor Gray
Write-Host "   - Revisa los logs en React Native DevTools" -ForegroundColor Gray
Write-Host "   - Busca: Token FCM REAL obtenido exitosamente" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Para probar notificaciones:" -ForegroundColor White
Write-Host "   - Inicia sesion como paciente en un emulador" -ForegroundColor Gray
Write-Host "   - Inicia sesion como doctor en otro emulador" -ForegroundColor Gray
Write-Host "   - Crea una cita desde el doctor" -ForegroundColor Gray
Write-Host "   - El paciente deberia recibir la notificacion" -ForegroundColor Gray
Write-Host ""









