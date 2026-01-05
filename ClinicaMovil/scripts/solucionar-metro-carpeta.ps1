# Script para solucionar el error "cuidateapp no ha sido registrada"

Write-Host ""
Write-Host "VERIFICANDO CONFIGURACION DE METRO" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en la carpeta correcta
$currentDir = Get-Location
Write-Host "Directorio actual: $currentDir" -ForegroundColor Yellow

# Verificar que estamos en ClinicaMovil
if (-not $currentDir.Path.EndsWith("ClinicaMovil")) {
    Write-Host "ERROR: Debes estar en la carpeta ClinicaMovil" -ForegroundColor Red
    Write-Host "Ejecuta: cd ClinicaMovil" -ForegroundColor Yellow
    exit 1
}

# Verificar archivos necesarios
Write-Host ""
Write-Host "Verificando archivos necesarios:" -ForegroundColor Cyan
$requiredFiles = @("package.json", "app.json", "index.js", "metro.config.js", "App.js")
$allFilesExist = $true
foreach ($file in $requiredFiles) {
    $exists = Test-Path $file
    if ($exists) {
        Write-Host "  OK: $file" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: $file NO ENCONTRADO" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "ERROR: Faltan archivos necesarios" -ForegroundColor Red
    exit 1
}

# Verificar app.json
Write-Host ""
Write-Host "Verificando app.json:" -ForegroundColor Cyan
$appJson = Get-Content "app.json" | ConvertFrom-Json
Write-Host "  Nombre de la app: $($appJson.name)" -ForegroundColor Yellow

if ($appJson.name -ne "CuidateApp") {
    Write-Host "  ADVERTENCIA: El nombre debe ser 'CuidateApp'" -ForegroundColor Yellow
}

# Verificar procesos de Metro
Write-Host ""
Write-Host "Verificando procesos de Metro:" -ForegroundColor Cyan
$nodeProcesses = Get-Process | Where-Object { $_.ProcessName -eq "node" }
if ($nodeProcesses) {
    Write-Host "  Procesos Node encontrados: $($nodeProcesses.Count)" -ForegroundColor Yellow
    Write-Host "  Deteniendo procesos Node..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "  Procesos detenidos" -ForegroundColor Green
} else {
    Write-Host "  No hay procesos Node corriendo" -ForegroundColor Green
}

# Verificar puerto 8081
Write-Host ""
Write-Host "Verificando puerto 8081:" -ForegroundColor Cyan
$port8081 = netstat -ano | findstr ":8081"
if ($port8081) {
    Write-Host "  Puerto 8081 en uso" -ForegroundColor Yellow
} else {
    Write-Host "  Puerto 8081 libre" -ForegroundColor Green
}

Write-Host ""
Write-Host "SOLUCION:" -ForegroundColor Cyan
Write-Host "  1. Asegurate de estar en: C:\Users\eduar\Desktop\Backend\ClinicaMovil" -ForegroundColor Yellow
Write-Host "  2. Ejecuta: npm run start:multi" -ForegroundColor Yellow
Write-Host "  3. O ejecuta: npx react-native start --host 0.0.0.0" -ForegroundColor Yellow
Write-Host ""

