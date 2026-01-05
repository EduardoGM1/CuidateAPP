# Script para corregir código duplicado en archivos JavaScript/TypeScript
Write-Host "🔍 Buscando archivos con código duplicado..." -ForegroundColor Cyan
Write-Host ""

$archivos = @(
    "src\api\gestionService.js",
    "src\components\paciente\MedicationCard.js",
    "src\config\apiConfig.js",
    "src\hooks\useWebSocket.js",
    "src\screens\admin\DetallePaciente.js",
    "src\screens\doctor\DashboardDoctor.js",
    "src\screens\paciente\MisCitas.js",
    "src\services\localNotificationService.js",
    "src\services\pushTokenService.js"
)

$corregidos = 0
$revisados = 0

foreach ($archivo in $archivos) {
    if (Test-Path $archivo) {
        $revisados++
        Write-Host "Revisando: $archivo" -ForegroundColor Yellow
        
        $contenido = Get-Content $archivo -Raw
        $lineas = Get-Content $archivo
        
        # Buscar múltiples export default
        $exports = ($contenido -split 'export default').Count - 1
        
        if ($exports -gt 1) {
            Write-Host "  ⚠️  Encontrado $exports export default" -ForegroundColor Red
            
            # Encontrar la primera ocurrencia de export default
            $primerExport = -1
            for ($i = 0; $i -lt $lineas.Count; $i++) {
                if ($lineas[$i] -match '^export default') {
                    $primerExport = $i
                    break
                }
            }
            
            if ($primerExport -ge 0) {
                # Guardar solo hasta el primer export default (incluyéndolo)
                $nuevoContenido = $lineas[0..$primerExport] -join "`n"
                $nuevoContenido | Set-Content $archivo -NoNewline
                Write-Host "  ✅ Corregido" -ForegroundColor Green
                $corregidos++
            }
        } else {
            Write-Host "  ✅ OK" -ForegroundColor Green
        }
    } else {
        Write-Host "  ⚠️  No encontrado: $archivo" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Resumen:" -ForegroundColor Cyan
Write-Host "  Archivos revisados: $revisados" -ForegroundColor Cyan
Write-Host "  Archivos corregidos: $corregidos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

