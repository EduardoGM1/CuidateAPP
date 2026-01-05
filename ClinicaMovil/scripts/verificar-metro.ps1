# Script para verificar y reiniciar Metro Bundler desde la carpeta correcta
# Uso: .\scripts\verificar-metro.ps1

Write-Host "🔍 Verificando configuración de Metro..." -ForegroundColor Cyan

# Verificar que estamos en la carpeta correcta
$currentDir = Get-Location
$expectedDir = Join-Path $PSScriptRoot ".."
$expectedDir = Resolve-Path $expectedDir

Write-Host "📁 Directorio actual: $currentDir" -ForegroundColor Yellow
Write-Host "📁 Directorio esperado: $expectedDir" -ForegroundColor Yellow

if ($currentDir -ne $expectedDir) {
    Write-Host "⚠️  ADVERTENCIA: No estás en la carpeta correcta del proyecto" -ForegroundColor Red
    Write-Host "   Cambiando a: $expectedDir" -ForegroundColor Yellow
    Set-Location $expectedDir
}

# Verificar archivos necesarios
$requiredFiles = @(
    "package.json",
    "index.js",
    "App.tsx",
    "app.json",
    "metro.config.js"
)

Write-Host "`n📋 Verificando archivos necesarios..." -ForegroundColor Cyan
$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file (NO ENCONTRADO)" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`n❌ ERROR: Faltan archivos necesarios" -ForegroundColor Red
    exit 1
}

# Verificar app.json
Write-Host "`n📱 Verificando app.json..." -ForegroundColor Cyan
try {
    $appJson = Get-Content "app.json" | ConvertFrom-Json
    Write-Host "   ✅ Nombre de app: $($appJson.name)" -ForegroundColor Green
    Write-Host "   ✅ Display name: $($appJson.displayName)" -ForegroundColor Green
    
    if ($appJson.name -ne "CuidateApp") {
        Write-Host "   ⚠️  ADVERTENCIA: El nombre de la app no es 'CuidateApp'" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ ERROR al leer app.json: $_" -ForegroundColor Red
    exit 1
}

# Verificar que node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "`n⚠️  ADVERTENCIA: node_modules no existe. Ejecuta 'npm install'" -ForegroundColor Yellow
}

# Verificar procesos de Metro corriendo
Write-Host "`n🔍 Verificando procesos de Metro..." -ForegroundColor Cyan
$metroProcesses = Get-Process | Where-Object {
    $_.ProcessName -like "*node*" -and 
    $_.Path -like "*ClinicaMovil*"
}

if ($metroProcesses) {
    Write-Host "   ⚠️  Se encontraron procesos de Node.js relacionados:" -ForegroundColor Yellow
    foreach ($proc in $metroProcesses) {
        Write-Host "      - PID: $($proc.Id) | $($proc.ProcessName)" -ForegroundColor Yellow
    }
    Write-Host "`n   💡 Para detener Metro, ejecuta:" -ForegroundColor Cyan
    Write-Host "      Get-Process | Where-Object {`$_.ProcessName -like '*node*'} | Stop-Process -Force" -ForegroundColor Gray
} else {
    Write-Host "   ✅ No hay procesos de Metro corriendo" -ForegroundColor Green
}

# Verificar MainActivity.kt
Write-Host "`n📱 Verificando MainActivity.kt..." -ForegroundColor Cyan
$mainActivityPath = "android\app\src\main\java\com\clinicamovil\MainActivity.kt"
if (Test-Path $mainActivityPath) {
    $mainActivityContent = Get-Content $mainActivityPath -Raw
    if ($mainActivityContent -match 'getMainComponentName.*:.*String.*=.*"CuidateApp"') {
        Write-Host "   ✅ MainActivity.kt está configurado correctamente" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  ADVERTENCIA: MainActivity.kt no tiene 'CuidateApp' configurado" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  ADVERTENCIA: MainActivity.kt no encontrado" -ForegroundColor Yellow
}

Write-Host "`n✅ Verificación completada" -ForegroundColor Green
Write-Host "`nPara iniciar Metro desde la carpeta correcta:" -ForegroundColor Cyan
Write-Host "   npm start" -ForegroundColor White
Write-Host "   o" -ForegroundColor Gray
Write-Host "   npx react-native start" -ForegroundColor White

