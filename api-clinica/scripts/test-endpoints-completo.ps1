# Script completo para probar todos los endpoints

# ============================================
# CONFIGURACIÓN TLS/SSL (REQUERIDO)
# Soluciona error: System.Net.ServicePointManager
# ============================================
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

$baseUrl = "http://localhost:3000"
$email = "Doctor@clinica.com"
$password = "Doctor123!"

Write-Host "`n=== PRUEBAS COMPLETAS DE ENDPOINTS ===" -ForegroundColor Cyan
Write-Host "`nProbando login..." -ForegroundColor Yellow
Write-Host "Email: $email" -ForegroundColor Blue

$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    if ($loginResponse.token) {
        $token = $loginResponse.token
        Write-Host "Login exitoso!" -ForegroundColor Green
        Write-Host "Token: $($token.Substring(0,30))..." -ForegroundColor Blue
        
        $headers = @{
            Authorization = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        Write-Host "`nProbando endpoints...`n" -ForegroundColor Cyan
        
        $results = @{
            passed = 0
            failed = 0
            total = 0
            errors = @()
        }
        
        $endpoints = @(
            @{Name="Health Check"; Path="/health"; Auth=$false},
            @{Name="Listar Usuarios"; Path="/api/auth/usuarios"; Auth=$true},
            @{Name="Listar Pacientes"; Path="/api/pacientes"; Auth=$true},
            @{Name="Listar Pacientes (paginado)"; Path="/api/pacientes?limit=10&offset=0"; Auth=$true},
            @{Name="Listar Doctores"; Path="/api/doctores"; Auth=$true},
            @{Name="Perfil Doctor"; Path="/api/doctores/perfil"; Auth=$true},
            @{Name="Listar Citas"; Path="/api/citas"; Auth=$true},
            @{Name="Listar Citas (paginado)"; Path="/api/citas?limit=10"; Auth=$true},
            @{Name="Dashboard Doctor"; Path="/api/dashboard/doctor"; Auth=$true},
            @{Name="Stats Doctor"; Path="/api/dashboard/doctor/stats"; Auth=$true},
            @{Name="Listar Signos Vitales"; Path="/api/signos-vitales"; Auth=$true},
            @{Name="Listar Comorbilidades"; Path="/api/comorbilidades"; Auth=$true},
            @{Name="Listar Medicamentos"; Path="/api/medicamentos"; Auth=$true},
            @{Name="Listar Diagnosticos"; Path="/api/diagnosticos"; Auth=$true},
            @{Name="Listar Notificaciones"; Path="/api/notificaciones"; Auth=$true},
            @{Name="Listar Modulos"; Path="/api/modulos"; Auth=$true}
        )
        
        foreach ($ep in $endpoints) {
            $results.total++
            Write-Host "[GET] $($ep.Name)" -ForegroundColor Blue
            Write-Host "   Path: $($ep.Path)" -ForegroundColor Cyan
            
            try {
                $useHeaders = if ($ep.Auth) { $headers } else { @{"Content-Type" = "application/json"} }
                $response = Invoke-RestMethod -Uri "$baseUrl$($ep.Path)" `
                    -Method GET `
                    -Headers $useHeaders `
                    -ErrorAction Stop
                
                Write-Host "   OK" -ForegroundColor Green
                if ($response.data -and $response.data.Count) {
                    Write-Host "   Encontrados: $($response.data.Count) registros" -ForegroundColor Blue
                } elseif ($response.status) {
                    Write-Host "   Status: $($response.status)" -ForegroundColor Blue
                }
                $results.passed++
            } catch {
                $statusCode = $_.Exception.Response.StatusCode.value__
                $errorMsg = $_.Exception.Message
                Write-Host "   ERROR $statusCode - $errorMsg" -ForegroundColor Red
                
                $errorDetails = @{
                    endpoint = $ep.Name
                    path = $ep.Path
                    status = $statusCode
                    message = $errorMsg
                }
                
                if ($_.ErrorDetails.Message) {
                    try {
                        $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
                        if ($errorData.error) {
                            Write-Host "   Detalles: $($errorData.error)" -ForegroundColor Yellow
                            $errorDetails.details = $errorData.error
                        }
                    } catch {
                        $errorDetails.details = $_.ErrorDetails.Message.Substring(0, [Math]::Min(100, $_.ErrorDetails.Message.Length))
                    }
                }
                
                $results.errors += $errorDetails
                $results.failed++
            }
            
            Start-Sleep -Milliseconds 150
        }
        
        Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
        Write-Host "`nRESUMEN DE PRUEBAS`n" -ForegroundColor Cyan
        Write-Host "Total: $($results.total)" -ForegroundColor Blue
        Write-Host "Exitosos: $($results.passed)" -ForegroundColor Green
        Write-Host "Fallidos: $($results.failed)" -ForegroundColor Red
        
        if ($results.total -gt 0) {
            $successRate = [math]::Round(($results.passed / $results.total) * 100, 1)
            $color = if ($results.passed -eq $results.total) { "Green" } else { "Yellow" }
            Write-Host "Porcentaje de exito: $successRate%" -ForegroundColor $color
        }
        
        if ($results.failed -gt 0) {
            Write-Host "`nErrores encontrados:" -ForegroundColor Yellow
            foreach ($err in $results.errors) {
                Write-Host "  - $($err.endpoint): $($err.status) - $($err.message)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "`nTodos los endpoints funcionan correctamente!" -ForegroundColor Green
        }
        
        # Guardar resultados en archivo
        $results | ConvertTo-Json -Depth 10 | Out-File -FilePath "resultados-pruebas.json" -Encoding UTF8
        Write-Host "`nResultados guardados en: resultados-pruebas.json" -ForegroundColor Blue
        
    } else {
        Write-Host "Login fallo: No se recibio token" -ForegroundColor Red
    }
} catch {
    Write-Host "Login fallo: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}
