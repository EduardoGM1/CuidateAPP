# ============================================
# SOLUCIÓN RÁPIDA: Error ServicePointManager
# ============================================
# Ejecuta este script para solucionar el error inmediatamente

Write-Host "🔧 Solucionando error de ServicePointManager..." -ForegroundColor Cyan
Write-Host ""

# Configurar TLS 1.2 y 1.3
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    Write-Host "✅ TLS configurado correctamente" -ForegroundColor Green
    Write-Host "   Protocolos habilitados: TLS 1.2 y TLS 1.3" -ForegroundColor Blue
} catch {
    Write-Host "⚠️ Error configurando TLS: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Intentando solo TLS 1.2..." -ForegroundColor Yellow
    
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Write-Host "✅ TLS 1.2 configurado" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error crítico: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Verificar configuración
Write-Host ""
Write-Host "📋 Configuración actual:" -ForegroundColor Cyan
Write-Host "   SecurityProtocol: $([Net.ServicePointManager]::SecurityProtocol)" -ForegroundColor Blue

# Probar conexión (opcional)
Write-Host ""
$testConnection = Read-Host "¿Deseas probar una conexión HTTP? (S/N)"
if ($testConnection -eq "S" -or $testConnection -eq "s") {
    $testUrl = Read-Host "Ingresa la URL a probar (ej: http://localhost:3000/health)"
    
    try {
        Write-Host "🔍 Probando conexión a $testUrl..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri $testUrl -Method GET -TimeoutSec 5
        Write-Host "✅ Conexión exitosa!" -ForegroundColor Green
        Write-Host "   Respuesta: $($response | ConvertTo-Json -Depth 2)" -ForegroundColor Blue
    } catch {
        Write-Host "❌ Error en la conexión: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Esto puede ser normal si el servidor no está ejecutándose" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Configuración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 NOTA: Esta configuración solo aplica a esta sesión de PowerShell." -ForegroundColor Yellow
Write-Host "   Para hacerla permanente, ejecuta:" -ForegroundColor Yellow
Write-Host "   .\scripts\configurar-perfil-powershell.ps1" -ForegroundColor Cyan
Write-Host ""
