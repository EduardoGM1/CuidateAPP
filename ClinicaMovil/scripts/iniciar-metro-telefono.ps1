# Script para iniciar Metro Bundler desde la carpeta correcta
# Uso: .\scripts\iniciar-metro-telefono.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Iniciando Metro Bundler" -ForegroundColor Cyan
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

# Verificar que existe package.json
if (-not (Test-Path "package.json")) {
    Write-Host "❌ ERROR: No se encontró package.json" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en la carpeta ClinicaMovil" -ForegroundColor Red
    exit 1
}

# Verificar que existe index.js
if (-not (Test-Path "index.js")) {
    Write-Host "❌ ERROR: No se encontró index.js" -ForegroundColor Red
    Write-Host "   Asegúrate de estar en la carpeta ClinicaMovil" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Directorio de trabajo: $(Get-Location)" -ForegroundColor Green
Write-Host "📦 Verificando node_modules..." -ForegroundColor Yellow

# Verificar node_modules
if (-not (Test-Path "node_modules")) {
    Write-Host "⚠️  node_modules no encontrado. Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Iniciando Metro Bundler..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Consejos:" -ForegroundColor Yellow
Write-Host "   - Asegúrate de que tu teléfono esté conectado por USB" -ForegroundColor Yellow
Write-Host "   - O que ambos (PC y teléfono) estén en la misma red WiFi" -ForegroundColor Yellow
Write-Host "   - En otra terminal, ejecuta: npx react-native run-android" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Iniciar Metro
npm start


