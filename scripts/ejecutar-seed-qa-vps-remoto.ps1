# Ejecuta deploy/ejecutar-seed-qa-paciente-vps.sh en el VPS por SSH.
# Uso:
#   $env:VPS_SSH_PASSWORD = 'tu-password-root'
#   .\scripts\ejecutar-seed-qa-vps-remoto.ps1
# Opcional: $env:VPS_HOST = '187.77.14.148'  $env:VPS_USER = 'root'

$ErrorActionPreference = 'Stop'
$HostName = if ($env:VPS_HOST) { $env:VPS_HOST } else { '187.77.14.148' }
$User = if ($env:VPS_USER) { $env:VPS_USER } else { 'root' }
$PacienteId = if ($env:PACIENTE_ID) { $env:PACIENTE_ID } else { '1123' }

$remoteCmd = "cd /var/www/CuidateAPP 2>/dev/null || cd /var/www/cuidateapp/CuidateAPP; PACIENTE_ID=$PacienteId bash deploy/ejecutar-seed-qa-paciente-vps.sh"

if ($env:VPS_SSH_PASSWORD) {
  if (-not (Get-Module -ListAvailable -Name Posh-SSH)) {
    Install-Module Posh-SSH -Force -Scope CurrentUser -AllowClobber
  }
  Import-Module Posh-SSH -ErrorAction Stop
  $sec = ConvertTo-SecureString $env:VPS_SSH_PASSWORD -AsPlainText -Force
  $cred = New-Object System.Management.Automation.PSCredential($User, $sec)
  $session = New-SSHSession -ComputerName $HostName -Credential $cred -AcceptKey -Force
  try {
    $r = Invoke-SSHCommand -SessionId $session.SessionId -Command $remoteCmd -TimeOut 600
    Write-Host $r.Output
    if ($r.Error) { Write-Host $r.Error -ForegroundColor Yellow }
    if ($r.ExitStatus -ne 0) { exit $r.ExitStatus }
  } finally {
    Remove-SSHSession -SessionId $session.SessionId | Out-Null
  }
} else {
  Write-Host "Conectando a ${User}@${HostName} (pedira contraseña)..."
  ssh -o StrictHostKeyChecking=accept-new "${User}@${HostName}" $remoteCmd
}
