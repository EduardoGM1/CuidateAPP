# Eliminar archivos .md con mas de 1 mes de antiguedad
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$cutoff = (Get-Date).AddDays(-31)
$count = 0
Get-ChildItem -Path $root -Recurse -Filter "*.md" -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt $cutoff } | ForEach-Object {
    Write-Host $_.FullName
    Remove-Item $_.FullName -Force
    $count++
}
Write-Host "Eliminados: $count archivos .md"
