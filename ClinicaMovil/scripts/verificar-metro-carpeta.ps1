# Script para verificar que Metro está corriendo desde la carpeta correcta

Write-Host "`n🔍 VERIFICANDO CONFIGURACIÓN DE METRO`n" -ForegroundColor Cyan

# Verificar que estamos en la carpeta correcta
$currentDir = Get-Location
Write-Host "📁 Directorio actual: $currentDir" -ForegroundColor Yellow

# Verificar archivos necesarios
$requiredFiles = @(
    "package.json",
    "app.json",
    "index.js",
    "metro.config.js",
    "App.js"
)

Write-Host "`n📋 Verificando archivos necesarios:" -ForegroundColor Cyan
$allFilesExist = $true
foreach ($file in $requiredFiles) {
    $exists = Test-Path $file
    if ($exists) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file (NO ENCONTRADO)" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`n❌ ERROR: Faltan archivos necesarios. Asegúrate de estar en la carpeta ClinicaMovil" -ForegroundColor Red
    exit 1
}

# Verificar package.json
Write-Host "`n📦 Verificando package.json:" -ForegroundColor Cyan
$packageJson = Get-Content "package.json" | ConvertFrom-Json
Write-Host "   Nombre del proyecto: $($packageJson.name)" -ForegroundColor Yellow

# Verificar app.json
Write-Host "`n📱 Verificando app.json:" -ForegroundColor Cyan
$appJson = Get-Content "app.json" | ConvertFrom-Json
Write-Host "   Nombre de la app: $($appJson.name)" -ForegroundColor Yellow
Write-Host "   Display name: $($appJson.displayName)" -ForegroundColor Yellow

# Verificar que coincidan
if ($packageJson.name -ne $appJson.name) {
    Write-Host "`n⚠️  ADVERTENCIA: Los nombres no coinciden" -ForegroundColor Yellow
    Write-Host "   package.json: $($packageJson.name)" -ForegroundColor Yellow
    Write-Host "   app.json: $($appJson.name)" -ForegroundColor Yellow
}

# Verificar index.js
Write-Host "`n📄 Verificando index.js:" -ForegroundColor Cyan
$indexContent = Get-Content "index.js" -Raw
if ($indexContent -match "AppRegistry\.registerComponent") {
    Write-Host "   ✅ AppRegistry.registerComponent encontrado" -ForegroundColor Green
    if ($indexContent -match "appName") {
        Write-Host "   ✅ Usa appName desde app.json" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ AppRegistry.registerComponent NO encontrado" -ForegroundColor Red
}

# Verificar procesos de Metro
Write-Host "`n🔄 Verificando procesos de Metro:" -ForegroundColor Cyan
$metroProcesses = Get-Process | Where-Object { 
    $_.ProcessName -like "*node*" -and 
    $_.Path -like "*nodejs*"
}

if ($metroProcesses) {
    Write-Host "   ✅ Procesos Node encontrados:" -ForegroundColor Green
    foreach ($proc in $metroProcesses) {
        Write-Host "      - PID: $($proc.Id) - $($proc.ProcessName)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  No se encontraron procesos Node corriendo" -ForegroundColor Yellow
}

# Verificar puerto 8081
Write-Host "`n🌐 Verificando puerto 8081:" -ForegroundColor Cyan
$port8081 = netstat -ano | findstr ":8081"
if ($port8081) {
    Write-Host "   ✅ Puerto 8081 en uso:" -ForegroundColor Green
    Write-Host "   $port8081" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  Puerto 8081 no está en uso (Metro no está corriendo)" -ForegroundColor Yellow
}

# Verificar metro.config.js
Write-Host "`n⚙️  Verificando metro.config.js:" -ForegroundColor Cyan
$metroConfig = Get-Content "metro.config.js" -Raw
if ($metroConfig -match "projectRoot.*__dirname") {
    Write-Host "   ✅ projectRoot configurado correctamente" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  projectRoot podría no estar configurado" -ForegroundColor Yellow
}

Write-Host "`n✅ Verificación completada`n" -ForegroundColor Green

Write-Host "💡 SOLUCIÓN SI METRO NO ESTÁ CORRIENDO:" -ForegroundColor Cyan
Write-Host '   1. Asegúrate de estar en: C:\Users\eduar\Desktop\Backend\ClinicaMovil' -ForegroundColor Yellow
Write-Host '   2. Detén cualquier proceso de Metro anterior' -ForegroundColor Yellow
Write-Host '   3. Ejecuta: npm run start:multi' -ForegroundColor Yellow
Write-Host '   4. O ejecuta: npx react-native start --host 0.0.0.0' -ForegroundColor Yellow
Write-Host ""

