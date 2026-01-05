# Script para ejecutar tests del chat
# Uso: .\scripts\test-chat.ps1 [--watch] [--coverage]

param(
    [switch]$Watch,
    [switch]$Coverage,
    [switch]$All
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EJECUTANDO TESTS DEL CHAT" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$testFiles = @(
    "src/utils/__tests__/chatUtils.test.js",
    "src/__tests__/ChatWebSocket.test.js"
)

if ($All) {
    $testFiles += @(
        "src/__tests__/ChatPaciente.test.js"
    )
}

$testPattern = $testFiles -join "|"

if ($Coverage) {
    Write-Host "Ejecutando tests con cobertura..." -ForegroundColor Yellow
    npm test -- --coverage --testPathPattern="$testPattern"
} elseif ($Watch) {
    Write-Host "Ejecutando tests en modo watch..." -ForegroundColor Yellow
    npm test -- --watch --testPathPattern="$testPattern"
} else {
    Write-Host "Ejecutando tests..." -ForegroundColor Yellow
    npm test -- --testPathPattern="$testPattern"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTS COMPLETADOS" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""


