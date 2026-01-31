# ============================================
# CONFIGURACIÓN TLS/SSL PARA POWERSHELL
# Soluciona error: System.Net.ServicePointManager
# ============================================
# Este script debe ser incluido al inicio de todos los scripts PowerShell
# que realicen llamadas HTTP/HTTPS

function Initialize-TLS {
    <#
    .SYNOPSIS
    Configura TLS 1.2 y 1.3 para PowerShell para evitar errores de ServicePointManager
    
    .DESCRIPTION
    Establece el protocolo de seguridad TLS necesario para que PowerShell pueda realizar
    conexiones HTTP/HTTPS sin errores de inicialización de ServicePointManager.
    
    .EXAMPLE
    Initialize-TLS
    #>
    
    try {
        # Configurar TLS 1.2 y 1.3
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
        
        Write-Verbose "✅ TLS configurado: TLS 1.2 y 1.3" -Verbose:$false
        
        return $true
    } catch {
        Write-Warning "⚠️ No se pudo configurar TLS: $($_.Exception.Message)"
        Write-Warning "   Intentando solo TLS 1.2..."
        
        try {
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Write-Verbose "✅ TLS configurado: TLS 1.2" -Verbose:$false
            return $true
        } catch {
            Write-Error "❌ Error crítico configurando TLS: $($_.Exception.Message)"
            return $false
        }
    }
}

# Ejecutar automáticamente al importar el script
Initialize-TLS | Out-Null
