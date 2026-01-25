# Script para limpiar cache de React Native
# Ejecutar con: .\limpiar-cache.ps1

Write-Host "🧹 Limpiando cache de React Native..." -ForegroundColor Cyan
Write-Host ""

# Detener procesos de Node/Metro
Write-Host "1. Deteniendo procesos de Metro..." -ForegroundColor Yellow
taskkill /F /IM node.exe 2>$null
Start-Sleep -Seconds 2

# Limpiar cache de Metro
Write-Host "2. Limpiando cache de Metro..." -ForegroundColor Yellow
if (Test-Path ".metro") {
    Remove-Item -Recurse -Force ".metro" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Cache .metro eliminado" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ Cache .metro no existe" -ForegroundColor Gray
}

# Limpiar cache temporal de Metro
$tempMetro = "$env:LOCALAPPDATA\Temp\metro-*"
if (Test-Path $tempMetro) {
    Remove-Item -Recurse -Force $tempMetro -ErrorAction SilentlyContinue
    Write-Host "   ✅ Cache temporal de Metro eliminado" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ Cache temporal de Metro no existe" -ForegroundColor Gray
}

# Limpiar build de Android
Write-Host "3. Limpiando build de Android..." -ForegroundColor Yellow
if (Test-Path "android\app\build") {
    Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
    Write-Host "   ✅ Build de Android eliminado" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ Build de Android no existe" -ForegroundColor Gray
}

# Limpiar cache de Gradle (opcional, comentado por defecto)
# Write-Host "4. Limpiando cache de Gradle..." -ForegroundColor Yellow
# if (Test-Path "android\.gradle") {
#     Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue
#     Write-Host "   ✅ Cache .gradle eliminado" -ForegroundColor Green
# }

Write-Host ""
Write-Host "✅ Cache limpiado exitosamente" -ForegroundColor Green
Write-Host ""
Write-Host "Para compilar, ejecuta:" -ForegroundColor Cyan
Write-Host "  npx react-native run-android" -ForegroundColor White
Write-Host ""
