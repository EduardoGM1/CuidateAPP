# Habilitar rutas largas en Windows (mas de 260 caracteres)
# Requiere ejecutar PowerShell como Administrador.
# Despues de ejecutar, reinicia el equipo para que surta efecto.

$regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem"
$name = "LongPathsEnabled"
$value = 1

if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Este script debe ejecutarse como Administrador." -ForegroundColor Red
    Write-Host "Clic derecho en PowerShell -> Ejecutar como administrador" -ForegroundColor Yellow
    exit 1
}

try {
    if (Get-ItemProperty -Path $regPath -Name $name -ErrorAction SilentlyContinue) {
        Set-ItemProperty -Path $regPath -Name $name -Value $value -Type DWORD -Force
    } else {
        New-ItemProperty -Path $regPath -Name $name -Value $value -PropertyType DWORD -Force
    }
    Write-Host "Rutas largas habilitadas correctamente (LongPathsEnabled = 1)" -ForegroundColor Green
    Write-Host "Reinicia el equipo para que el cambio se aplique por completo." -ForegroundColor Yellow
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
