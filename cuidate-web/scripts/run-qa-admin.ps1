# Pruebas QA con cuenta Admin contra producción (requiere rate limit off en VPS).
param(
  [string]$ApiBase = "https://cuidateapp.com.mx",
  [string]$Email = "admin@clinica.com",
  [string]$Password = "Admin123!"
)

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$web = Join-Path $root "cuidate-web"

$env:API_BASE_URL = $ApiBase
$env:TEST_EMAIL = $Email
$env:TEST_PASSWORD = $Password
$env:E2E_EMAIL = $Email
$env:E2E_PASSWORD = $Password

Write-Host "`n=== API completa (Admin) ===" -ForegroundColor Cyan
Push-Location $web
node tests/funcionalidad-completa.mjs
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }

Write-Host "`n=== Vitest ===" -ForegroundColor Cyan
npm run test
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }

Write-Host "`n=== Playwright E2E ===" -ForegroundColor Cyan
$env:PLAYWRIGHT_BASE_URL = $ApiBase
npx playwright test tests/e2e/full-navigation.spec.js tests/e2e/smoke.spec.js --reporter=list
$e2e = $LASTEXITCODE
Pop-Location
exit $e2e
