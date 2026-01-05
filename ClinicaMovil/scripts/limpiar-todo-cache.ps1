# Script completo para limpiar TODOS los cachés y builds antiguos
Write-Host "🧹 Limpiando TODOS los cachés y builds..." -ForegroundColor Cyan
Write-Host ""

# 1. Detener procesos de Metro y Node
Write-Host "1. Deteniendo procesos de Metro y Node..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*Metro*" -or $_.CommandLine -like "*react-native*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# 2. Limpiar caché de Metro
Write-Host "2. Limpiando caché de Metro..." -ForegroundColor Yellow
if (Test-Path "$env:TEMP\metro-*") {
    Remove-Item -Recurse -Force "$env:TEMP\metro-*" -ErrorAction SilentlyContinue
}
if (Test-Path "$env:TEMP\haste-map-*") {
    Remove-Item -Recurse -Force "$env:TEMP\haste-map-*" -ErrorAction SilentlyContinue
}
if (Test-Path ".metro") {
    Remove-Item -Recurse -Force ".metro" -ErrorAction SilentlyContinue
}
if (Test-Path ".metro-health-check*") {
    Remove-Item -Force ".metro-health-check*" -ErrorAction SilentlyContinue
}

# 3. Limpiar watchman (si está instalado)
Write-Host "3. Limpiando watchman..." -ForegroundColor Yellow
if (Get-Command watchman -ErrorAction SilentlyContinue) {
    watchman watch-del-all 2>&1 | Out-Null
    watchman shutdown-server 2>&1 | Out-Null
}

# 4. Limpiar node_modules/.cache
Write-Host "4. Eliminando node_modules/.cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
}

# 5. Limpiar build de Android
Write-Host "5. Limpiando build de Android..." -ForegroundColor Yellow
if (Test-Path "android\app\build") {
    Remove-Item -Recurse -Force "android\app\build" -ErrorAction SilentlyContinue
}
if (Test-Path "android\build") {
    Remove-Item -Recurse -Force "android\build" -ErrorAction SilentlyContinue
}
if (Test-Path "android\.gradle") {
    Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue
}
Push-Location android -ErrorAction SilentlyContinue
if ($?) {
    .\gradlew clean 2>&1 | Out-Null
    Pop-Location
}

# 6. Limpiar build de iOS
Write-Host "6. Limpiando build de iOS..." -ForegroundColor Yellow
if (Test-Path "ios\build") {
    Remove-Item -Recurse -Force "ios\build" -ErrorAction SilentlyContinue
}
if (Test-Path "ios\Pods") {
    Remove-Item -Recurse -Force "ios\Pods" -ErrorAction SilentlyContinue
}
if (Test-Path "ios\Podfile.lock") {
    Remove-Item -Force "ios\Podfile.lock" -ErrorAction SilentlyContinue
}

# 7. Limpiar archivos temporales de React Native
Write-Host "7. Limpiando archivos temporales..." -ForegroundColor Yellow
if (Test-Path "*.jsbundle") {
    Remove-Item -Force "*.jsbundle" -ErrorAction SilentlyContinue
}
if (Test-Path ".buckconfig") {
    # No eliminar, solo limpiar caché relacionado
}

# 8. Limpiar caché de npm/yarn
Write-Host "8. Limpiando caché de npm..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null

# 9. Verificar que los archivos nuevos existen
Write-Host "9. Verificando archivos refactorizados..." -ForegroundColor Yellow
$archivos = @(
    "src\hooks\useChat.js",
    "src\components\chat\MessageBubble.js"
)

$todosExisten = $true
foreach ($archivo in $archivos) {
    if (Test-Path $archivo) {
        Write-Host "   ✅ $archivo existe" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $archivo NO existe" -ForegroundColor Red
        $todosExisten = $false
    }
}

Write-Host ""
if ($todosExisten) {
    Write-Host "✅ Todos los archivos refactorizados están presentes" -ForegroundColor Green
} else {
    Write-Host "⚠️ Algunos archivos refactorizados no existen" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Limpieza completa. Siguientes pasos:" -ForegroundColor Green
Write-Host "   1. Reinicia Metro con: npm start -- --reset-cache" -ForegroundColor Cyan
Write-Host "   2. O ejecuta: npx react-native start --reset-cache" -ForegroundColor Cyan
Write-Host "   3. Recompila la app: npx react-native run-android o run-ios" -ForegroundColor Cyan
Write-Host ""



