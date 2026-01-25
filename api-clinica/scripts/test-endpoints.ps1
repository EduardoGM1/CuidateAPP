# Script de PowerShell para probar todos los endpoints
# Usuario: Doctor@clinica.com

$baseUrl = "http://localhost:3000"
$email = "Doctor@clinica.com"
$password = "Doctor123"

Write-Host "`nPRUEBAS DE ENDPOINTS`n" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

# 1. Health Check
Write-Host "`nProbando Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "✅ Health Check: OK" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Blue
} catch {
    Write-Host "❌ Health Check falló: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Login
Write-Host "`nIniciando sesion..." -ForegroundColor Yellow
Write-Host "   Email: $email" -ForegroundColor Blue

$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"
    
    if ($loginResponse.token) {
        $token = $loginResponse.token
        Write-Host "✅ Login exitoso" -ForegroundColor Green
        Write-Host "   Token: $($token.Substring(0,30))..." -ForegroundColor Blue
    } else {
        Write-Host "❌ No se recibió token en la respuesta" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Login falló: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Respuesta: $responseBody" -ForegroundColor Yellow
    }
    exit 1
}

# 3. Configurar headers con token
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`nProbando endpoints...`n" -ForegroundColor Cyan

$results = @{
    passed = 0
    failed = 0
    total = 0
}

# Función para probar un endpoint
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Path,
        [string]$Name,
        [hashtable]$Headers,
        [object]$Body = $null
    )
    
    $results.total++
    Write-Host "[$Method] $Name" -ForegroundColor Blue
    Write-Host "   Path: $Path" -ForegroundColor Cyan
    
    try {
        $params = @{
            Uri = "$baseUrl$Path"
            Method = $Method
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        
        Write-Host "   ✅ OK" -ForegroundColor Green
        if ($response -is [PSCustomObject] -or $response -is [System.Array]) {
            $keys = if ($response -is [System.Array]) {
                if ($response.Count -gt 0) { $response[0].PSObject.Properties.Name } else { @() }
            } else {
                $response.PSObject.Properties.Name
            }
            
            if ($keys.Count -gt 0 -and $keys.Count -lt 10) {
                Write-Host "   Datos: $($keys -join ', ')" -ForegroundColor Blue
            } elseif ($keys.Count -ge 10) {
                $count = $keys.Count
                Write-Host "   Datos: $($keys[0..4] -join ', ')... ($count campos)" -ForegroundColor Blue
            }
        }
        
        $script:results.passed++
        return $true
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.Exception.Message
        
        Write-Host "   ERROR $statusCode - $errorMessage" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $responseBody = $reader.ReadToEnd()
                $errorData = $responseBody | ConvertFrom-Json -ErrorAction SilentlyContinue
                
                if ($errorData) {
                    $errorMsg = if ($errorData.error) { $errorData.error } 
                               elseif ($errorData.message) { $errorData.message }
                               else { $responseBody.Substring(0, [Math]::Min(150, $responseBody.Length)) }
                    Write-Host "   Detalles: $errorMsg" -ForegroundColor Yellow
                } else {
                    Write-Host "   Detalles: $($responseBody.Substring(0, [Math]::Min(150, $responseBody.Length)))" -ForegroundColor Yellow
                }
            } catch {
                # Ignorar errores al leer la respuesta
            }
        }
        
        $script:results.failed++
        return $false
    }
}

# Probar endpoints
Test-Endpoint -Method "GET" -Path "/api/auth/usuarios" -Name "Listar Usuarios" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/pacientes" -Name "Listar Pacientes" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/pacientes?limit=10`&offset=0" -Name "Listar Pacientes (paginado)" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/doctores" -Name "Listar Doctores" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/doctores/perfil" -Name "Perfil Doctor" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/citas" -Name "Listar Citas" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/citas?limit=10" -Name "Listar Citas (paginado)" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/signos-vitales" -Name "Listar Signos Vitales" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/comorbilidades" -Name "Listar Comorbilidades" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/medicamentos" -Name "Listar Medicamentos" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/diagnosticos" -Name "Listar Diagnosticos" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/dashboard/doctor" -Name "Dashboard Doctor" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/dashboard/doctor/stats" -Name "Stats Doctor" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/notificaciones" -Name "Listar Notificaciones" -Headers $headers
Start-Sleep -Milliseconds 200

Test-Endpoint -Method "GET" -Path "/api/modulos" -Name "Listar Modulos" -Headers $headers
Start-Sleep -Milliseconds 200

# Resumen
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "`nRESUMEN DE PRUEBAS`n" -ForegroundColor Cyan
Write-Host "Total: $($results.total)" -ForegroundColor Blue
Write-Host "✅ Exitosos: $($results.passed)" -ForegroundColor Green
Write-Host "❌ Fallidos: $($results.failed)" -ForegroundColor Red

$successRate = [math]::Round(($results.passed / $results.total) * 100, 1)
$color = if ($results.passed -eq $results.total) { "Green" } else { "Yellow" }
Write-Host "Porcentaje de éxito: $successRate%" -ForegroundColor $color

if ($results.failed -gt 0) {
    Write-Host "`nATENCION: Algunos endpoints fallaron. Revisa los detalles arriba." -ForegroundColor Yellow
} else {
    Write-Host "`nEXITO: Todos los endpoints funcionan correctamente!" -ForegroundColor Green
}
