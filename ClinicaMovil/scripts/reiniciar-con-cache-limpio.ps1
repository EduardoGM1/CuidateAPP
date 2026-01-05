# Script para reiniciar Metro con caché completamente limpio
Write-Host "🔄 Reiniciando Metro con caché limpio..." -ForegroundColor Cyan
Write-Host ""

# 1. Detener todos los procesos de Metro y Node relacionados
Write-Host "1. Deteniendo procesos..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
    $_.Path -like "*ClinicaMovil*" -or 
    $_.CommandLine -like "*react-native*" -or 
    $_.CommandLine -like "*metro*" 
} | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# 2. Limpiar caché de Metro
Write-Host "2. Limpiando caché de Metro..." -ForegroundColor Yellow
if (Test-Path "$env:TEMP\metro-*") {
    Get-ChildItem "$env:TEMP\metro-*" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path "$env:TEMP\haste-map-*") {
    Get-ChildItem "$env:TEMP\haste-map-*" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path ".metro") {
    Remove-Item -Recurse -Force ".metro" -ErrorAction SilentlyContinue
}

# 3. Limpiar watchman
Write-Host "3. Limpiando watchman..." -ForegroundColor Yellow
if (Get-Command watchman -ErrorAction SilentlyContinue) {
    watchman watch-del-all 2>&1 | Out-Null
    watchman shutdown-server 2>&1 | Out-Null
}

# 4. Limpiar node_modules/.cache
Write-Host "4. Limpiando node_modules/.cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
}

# 5. Verificar archivos
Write-Host "5. Verificando archivos..." -ForegroundColor Yellow
$archivos = @(
    "src\hooks\useChat.js",
    "src\components\chat\MessageBubble.js",
    "src\screens\paciente\ChatDoctor.js",
    "src\screens\doctor\ChatPaciente.js"
)

foreach ($archivo in $archivos) {
    if (Test-Path $archivo) {
        $info = Get-Item $archivo
        Write-Host "   ✅ $archivo (Última modificación: $($info.LastWriteTime))" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $archivo NO existe" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "✅ Limpieza completada. Iniciando Metro con caché limpio..." -ForegroundColor Green
Write-Host ""
Write-Host "Iniciando Metro Bundler..." -ForegroundColor Cyan
Write-Host ""

# Iniciar Metro con reset-cache
npx react-native start --reset-cache



