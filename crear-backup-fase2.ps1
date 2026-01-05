# Script de backup para Fase 2
$timestamp = "2025-11-02_20-07-33"
$backupDir = "nuevos backups\backup_before_fase2_alertas_$timestamp"

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Copiar código fuente
$clinicaSrc = @(
    "ClinicaMovil\src",
    "ClinicaMovil\package.json",
    "ClinicaMovil\App.tsx",
    "ClinicaMovil\index.js"
)
foreach ($src in $clinicaSrc) {
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination "$backupDir\ClinicaMovil" -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$apiSrc = @(
    "api-clinica\services",
    "api-clinica\routes",
    "api-clinica\controllers",
    "api-clinica\models",
    "api-clinica\middlewares",
    "api-clinica\config",
    "api-clinica\package.json",
    "api-clinica\index.js"
)
foreach ($src in $apiSrc) {
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination "$backupDir\api-clinica" -Recurse -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "Backup completado en: $backupDir"
