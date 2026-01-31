# ============================================
# Configurar Perfil de PowerShell
# Hace permanente la configuración TLS
# ============================================

Write-Host "🔧 Configurando perfil de PowerShell..." -ForegroundColor Cyan
Write-Host ""

# Verificar si existe el perfil
$profilePath = $PROFILE.CurrentUserAllHosts

if (-not (Test-Path $profilePath)) {
    Write-Host "📝 Creando perfil de PowerShell..." -ForegroundColor Yellow
    
    # Crear directorio si no existe
    $profileDir = Split-Path -Parent $profilePath
    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    }
    
    # Crear archivo de perfil
    New-Item -ItemType File -Path $profilePath -Force | Out-Null
    Write-Host "✅ Perfil creado: $profilePath" -ForegroundColor Green
} else {
    Write-Host "📝 Perfil existente encontrado: $profilePath" -ForegroundColor Yellow
}

# Verificar si ya tiene la configuración TLS
$profileContent = Get-Content $profilePath -ErrorAction SilentlyContinue
$hasTLSConfig = $profileContent | Select-String -Pattern "ServicePointManager" -Quiet

if ($hasTLSConfig) {
    Write-Host "⚠️  El perfil ya contiene configuración TLS" -ForegroundColor Yellow
    $overwrite = Read-Host "¿Deseas actualizarla? (S/N)"
    
    if ($overwrite -ne "S" -and $overwrite -ne "s") {
        Write-Host "❌ Operación cancelada" -ForegroundColor Red
        exit 0
    }
    
    # Remover configuración TLS existente
    $newContent = $profileContent | Where-Object { $_ -notmatch "ServicePointManager" -and $_ -notmatch "TLS" -and $_ -notmatch "SecurityProtocol" }
    $newContent | Set-Content $profilePath
}

# Agregar configuración TLS
Write-Host "📝 Agregando configuración TLS al perfil..." -ForegroundColor Yellow

$tlsConfig = @"

# ============================================
# CONFIGURACIÓN TLS/SSL
# Soluciona error: System.Net.ServicePointManager
# Agregado automáticamente por configurar-perfil-powershell.ps1
# ============================================
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

"@

Add-Content -Path $profilePath -Value $tlsConfig

Write-Host "✅ Configuración TLS agregada al perfil" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Ubicación del perfil:" -ForegroundColor Cyan
Write-Host "   $profilePath" -ForegroundColor Blue
Write-Host ""
Write-Host "💡 La configuración se aplicará automáticamente en nuevas sesiones de PowerShell" -ForegroundColor Yellow
Write-Host "   Para aplicarla en esta sesión, ejecuta:" -ForegroundColor Yellow
Write-Host "   . $profilePath" -ForegroundColor Cyan
Write-Host ""
