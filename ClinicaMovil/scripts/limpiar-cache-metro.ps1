# Script para limpiar completamente el caché de Metro
Write-Host "🧹 Limpiando caché de Metro..." -ForegroundColor Cyan

# Limpiar caché de Metro
Write-Host "1. Limpiando caché de Metro..." -ForegroundColor Yellow
npx react-native start --reset-cache 2>&1 | Out-Null

# Limpiar watchman (si está instalado)
if (Get-Command watchman -ErrorAction SilentlyContinue) {
    Write-Host "2. Limpiando watchman..." -ForegroundColor Yellow
    watchman watch-del-all 2>&1 | Out-Null
}

# Limpiar node_modules/.cache
if (Test-Path "node_modules\.cache") {
    Write-Host "3. Eliminando node_modules/.cache..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
}

# Limpiar build de Android
if (Test-Path "android\app\build") {
    Write-Host "4. Limpiando build de Android..." -ForegroundColor Yellow
    Push-Location android
    .\gradlew clean 2>&1 | Out-Null
    Pop-Location
}

Write-Host ""
Write-Host "✅ Caché limpiado. Reinicia Metro con: npm start" -ForegroundColor Green


