# Diagnosticar por que ADB no detecta un dispositivo fisico
# Uso: .\scripts\diagnosticar-dispositivo-no-detectado.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTICO: Dispositivo no detectado" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar ADB
$adbPath = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbPath) {
    Write-Host "[X] ADB no encontrado en PATH" -ForegroundColor Red
    Write-Host "    Instala Android SDK Platform-Tools o anade adb al PATH" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] ADB encontrado: $($adbPath.Source)" -ForegroundColor Green

# 2. Reiniciar daemon ADB
Write-Host ""
Write-Host "Reiniciando daemon ADB..." -ForegroundColor Yellow
adb kill-server 2>$null
Start-Sleep -Seconds 2
adb start-server 2>$null
Start-Sleep -Seconds 1

# 3. Listar dispositivos
Write-Host ""
Write-Host "Dispositivos detectados por ADB:" -ForegroundColor Yellow
$out = adb devices -l
Write-Host $out
$count = ($out | Select-String "device$").Count

if ($count -eq 0) {
    Write-Host ""
    Write-Host "--- EL DISPOSITIVO NO APARECE ---" -ForegroundColor Red
    Write-Host ""
    Write-Host "Sigue estos pasos EN ORDEN:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. CABLE USB" -ForegroundColor White
    Write-Host "   - Usa un cable que transmita datos (no solo carga)" -ForegroundColor Gray
    Write-Host "   - Prueba otro puerto USB (mejor USB 2.0 que 3.0)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. EN EL TELEFONO" -ForegroundColor White
    Write-Host "   - Desbloquea la pantalla" -ForegroundColor Gray
    Write-Host "   - Cuando conectes, debe salir 'Permitir depuracion USB?' -> ACEPTAR" -ForegroundColor Gray
    Write-Host "   - Marca 'Confiar en este equipo' si aparece" -ForegroundColor Gray
    Write-Host "   - Ajustes > Opciones de desarrollador > Depuracion USB = ON" -ForegroundColor Gray
    Write-Host "   - Modo USB: elige 'Transferencia de archivos' o 'MTP'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. DRIVERS EN WINDOWS" -ForegroundColor White
    Write-Host "   - Abre Administrador de dispositivos (Win+X -> Administrador de dispositivos)" -ForegroundColor Gray
    Write-Host "   - Conecta el telefono y busca:" -ForegroundColor Gray
    Write-Host "     * 'Android Phone' o 'ADB Interface'" -ForegroundColor Gray
    Write-Host "     * O en 'Otros dispositivos' un elemento con icono amarillo" -ForegroundColor Gray
    Write-Host "   - Si hay icono amarillo: clic derecho -> Actualizar controlador" -ForegroundColor Gray
    Write-Host "     -> Buscar en el equipo -> Elegir 'Android ADB Interface' o instalar:" -ForegroundColor Gray
    Write-Host "     https://developer.android.com/studio/run/oem-usb" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. DISPOSITIVOS USB EN WINDOWS (resumen):" -ForegroundColor White
    $usbDevices = Get-PnpDevice -Class USB -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "OK" }
    $androidRelated = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object {
        $_.FriendlyName -match "Android|ADB|Composite|adb"
    }
    if ($androidRelated) {
        $androidRelated | ForEach-Object { Write-Host "   - $($_.FriendlyName) [$($_.Status)]" -ForegroundColor Gray }
    } else {
        Write-Host "   No se detectaron dispositivos Android/ADB en Windows" -ForegroundColor Yellow
        Write-Host "   Instala el driver del fabricante (Samsung, Xiaomi, etc.) o USB driver generico" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "5. DESCONECTAR Y RECONECTAR" -ForegroundColor White
    Write-Host "   - Desconecta el USB, espera 5 segundos, conecta de nuevo" -ForegroundColor Gray
    Write-Host "   - Acepta el dialogo en el telefono si aparece" -ForegroundColor Gray
    Write-Host "   - Luego ejecuta de nuevo: adb devices" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "[OK] Se detecto $count dispositivo(s)" -ForegroundColor Green
Write-Host ""
