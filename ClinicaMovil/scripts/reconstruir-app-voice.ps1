# Script para reconstruir la app después de instalar @react-native-voice/voice
# Este script limpia y reconstruye la app para asegurar que el módulo nativo esté correctamente vinculado

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Reconstruccion de App para Voice Module" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Limpiar caché de Metro
Write-Host "[1/6] Limpiando caché de Metro..." -ForegroundColor Yellow
npx react-native start --reset-cache --no-interactive 2>&1 | Out-Null
Start-Sleep -Seconds 2
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*react-native*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "✓ Caché de Metro limpiada" -ForegroundColor Green
Write-Host ""

# 2. Limpiar build de Android
Write-Host "[2/6] Limpiando build de Android..." -ForegroundColor Yellow
Set-Location android
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue
}
if (Test-Path "app\build") {
    Remove-Item -Recurse -Force "app\build" -ErrorAction SilentlyContinue
}
./gradlew clean 2>&1 | Out-Null
Set-Location ..
Write-Host "✓ Build de Android limpiado" -ForegroundColor Green
Write-Host ""

# 3. Verificar que el patch esté aplicado
Write-Host "[3/6] Verificando patch de @react-native-voice/voice..." -ForegroundColor Yellow
if (Test-Path "patches\@react-native-voice+voice+3.2.4.patch") {
    Write-Host "✓ Patch encontrado" -ForegroundColor Green
    npx patch-package @react-native-voice/voice 2>&1 | Out-Null
    Write-Host "✓ Patch aplicado" -ForegroundColor Green
} else {
    Write-Host "⚠ Patch no encontrado, continuando..." -ForegroundColor Yellow
}
Write-Host ""

# 4. Verificar autolinking
Write-Host "[4/6] Verificando autolinking de módulos nativos..." -ForegroundColor Yellow
$config = npx react-native config 2>&1 | ConvertFrom-Json
$voiceModule = $config.dependencies.'@react-native-voice/voice'
if ($voiceModule) {
    Write-Host "✓ @react-native-voice/voice detectado en autolinking" -ForegroundColor Green
    Write-Host "  - Android: $($voiceModule.platforms.android.sourceDir)" -ForegroundColor Gray
} else {
    Write-Host "⚠ @react-native-voice/voice no detectado en autolinking" -ForegroundColor Red
}
Write-Host ""

# 5. Reconstruir la app
Write-Host "[5/6] Reconstruyendo la app..." -ForegroundColor Yellow
Write-Host "  Esto puede tardar varios minutos..." -ForegroundColor Gray
Write-Host ""

# 6. Instrucciones finales
Write-Host "[6/6] Instrucciones finales:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para completar la reconstrucción, ejecuta:" -ForegroundColor Cyan
Write-Host "  npx react-native run-android" -ForegroundColor White
Write-Host ""
Write-Host "Si el problema persiste:" -ForegroundColor Yellow
Write-Host "  1. Desinstala la app del dispositivo:" -ForegroundColor White
Write-Host "     adb uninstall com.clinicamovil" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Reinstala completamente:" -ForegroundColor White
Write-Host "     npx react-native run-android" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Si aún falla, verifica los logs de Android:" -ForegroundColor White
Write-Host "     adb logcat | Select-String -Pattern 'Voice|SpeechRecognition'" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Reconstrucción preparada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

