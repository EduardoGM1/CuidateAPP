# Conexion SSH interactiva al VPS CuidateAPP
# Uso: .\scripts\ssh-vps.ps1
# La contrasena se pide en pantalla (no se guarda en el script).

$Host = "187.77.14.148"
$user = "root"
Write-Host "Conectando a ${user}@${Host} ..."
ssh "${user}@${Host}"
