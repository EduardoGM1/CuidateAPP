# Script de PowerShell para monitorear logs del backend
# Uso: .\scripts\monitor-logs.ps1

$logsDir = Join-Path $PSScriptRoot "..\logs"
$combinedLog = Join-Path $logsDir "combined.log"
$errorLog = Join-Path $logsDir "error.log"

# Crear directorio de logs si no existe
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    Write-Host "📁 Directorio de logs creado: $logsDir" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     🔍 Monitor de Refresh Token Logs - Backend              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "ℹ️  Monitoreando logs relacionados con refresh tokens" -ForegroundColor Blue
Write-Host "ℹ️  Presiona Ctrl+C para detener" -ForegroundColor Blue
Write-Host ""

# Palabras clave para filtrar
$keywords = @(
    "refresh token",
    "refresh-token",
    "REFRESH TOKEN",
    "MOBILE REFRESH",
    "token renovado",
    "token expirado",
    "401",
    "expires",
    "expiresIn"
)

# Función para colorear mensajes
function Colorize-Message {
    param([string]$message)
    
    if ($message -match "✅|exitosamente|success") {
        Write-Host $message -ForegroundColor Green
    }
    elseif ($message -match "⚠️|warn|advertencia") {
        Write-Host $message -ForegroundColor Yellow
    }
    elseif ($message -match "❌|error|fallo") {
        Write-Host $message -ForegroundColor Red
    }
    elseif ($message -match "🔄|renovando|refresh") {
        Write-Host $message -ForegroundColor Cyan
    }
    else {
        Write-Host $message
    }
}

# Función para verificar si es relevante
function Is-Relevant {
    param([string]$line)
    
    $lowerLine = $line.ToLower()
    foreach ($keyword in $keywords) {
        if ($lowerLine -like "*$keyword*") {
            return $true
        }
    }
    return $false
}

# Monitorear archivos de log
$watchers = @()

foreach ($logFile in @($combinedLog, $errorLog)) {
    if (Test-Path $logFile) {
        Write-Host "📂 Monitoreando: $logFile" -ForegroundColor Blue
        Write-Host ""
        
        # Leer últimas líneas relevantes
        $content = Get-Content $logFile -Tail 100 -ErrorAction SilentlyContinue
        $relevantLines = $content | Where-Object { Is-Relevant $_ } | Select-Object -Last 10
        
        if ($relevantLines) {
            Write-Host "📋 Últimas líneas relevantes:" -ForegroundColor Cyan
            $relevantLines | ForEach-Object { Colorize-Message $_ }
            Write-Host ""
        }
        
        # Crear FileSystemWatcher
        $watcher = New-Object System.IO.FileSystemWatcher
        $watcher.Path = $logsDir
        $watcher.Filter = Split-Path $logFile -Leaf
        $watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite
        $watcher.EnableRaisingEvents = $true
        
        $action = {
            $content = Get-Content $eventArgs.FullPath -Tail 5 -ErrorAction SilentlyContinue
            $content | Where-Object { Is-Relevant $_ } | ForEach-Object {
                $timestamp = Get-Date -Format "HH:mm:ss"
                Write-Host "[$timestamp] " -NoNewline -ForegroundColor Magenta
                Colorize-Message $_
            }
        }
        
        Register-ObjectEvent -InputObject $watcher -EventName "Changed" -Action $action | Out-Null
        $watchers += $watcher
    }
    else {
        Write-Host "⚠️  Archivo de log no existe: $logFile" -ForegroundColor Yellow
        Write-Host "📝 Los logs aparecerán aquí cuando se generen..." -ForegroundColor Cyan
        Write-Host ""
    }
}

Write-Host "💡 Tip: Los logs también aparecen en la consola del servidor" -ForegroundColor Cyan
Write-Host "💡 Tip: Busca mensajes con prefijos [REFRESH TOKEN] o [MOBILE REFRESH]" -ForegroundColor Cyan
Write-Host ""
Write-Host "Esperando nuevos logs..." -ForegroundColor Green
Write-Host ""

# Mantener el script corriendo
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    # Limpiar watchers
    $watchers | ForEach-Object {
        $_.Dispose()
    }
    Write-Host "`n👋 Monitoreo detenido" -ForegroundColor Yellow
}
