# Script para compilar React Native
# Ejecutar con: .\compilar.ps1

Write-Host "🚀 Iniciando compilación de React Native..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encontró package.json. Ejecuta este script desde la carpeta ClinicaMovil" -ForegroundColor Red
    exit 1
}

# Limpiar cache primero
Write-Host "1. Limpiando cache..." -ForegroundColor Yellow
& ".\limpiar-cache.ps1"
Write-Host ""

# Verificar dependencias
Write-Host "2. Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "   📦 Instalando dependencias..." -ForegroundColor Cyan
    npm install
} else {
    Write-Host "   ✅ node_modules existe" -ForegroundColor Green
}
Write-Host ""

# Iniciar Metro en segundo plano
Write-Host "3. Iniciando Metro Bundler..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npx react-native start --reset-cache" -WindowStyle Minimized
Write-Host "   ✅ Metro iniciado en segundo plano" -ForegroundColor Green
Write-Host "   ⏳ Esperando 5 segundos para que Metro inicie..." -ForegroundColor Gray
Start-Sleep -Seconds 5
Write-Host ""

# Compilar y ejecutar
Write-Host "4. Compilando y ejecutando aplicación..." -ForegroundColor Yellow
Write-Host "   Esto puede tardar varios minutos en la primera compilación..." -ForegroundColor Gray
Write-Host ""

npx react-native run-android

Write-Host ""
Write-Host "✅ Compilación completada" -ForegroundColor Green
Write-Host ""
Write-Host "Notas:" -ForegroundColor Cyan
Write-Host "  - Metro Bundler está corriendo en segundo plano" -ForegroundColor White
Write-Host "  - Para detener Metro, cierra la ventana de PowerShell minimizada" -ForegroundColor White
Write-Host ""
