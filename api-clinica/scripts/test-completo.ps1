# Script completo para probar todos los endpoints
$baseUrl = "http://localhost:3000"
$email = "Doctor@clinica.com"
$password = "Doctor123!"

Write-Host "`n=== PRUEBAS DE ENDPOINTS ===" -ForegroundColor Cyan
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
        }
        
        $endpoints = @(
            @{Name="Listar Usuarios"; Path="/api/auth/usuarios"},
            @{Name="Listar Pacientes"; Path="/api/pacientes"},
            @{Name="Listar Pacientes (paginado)"; Path="/api/pacientes?limit=10&offset=0"},
            @{Name="Listar Doctores"; Path="/api/doctores"},
            @{Name="Perfil Doctor"; Path="/api/doctores/perfil"},
            @{Name="Listar Citas"; Path="/api/citas"},
            @{Name="Listar Citas (paginado)"; Path="/api/citas?limit=10"},
            @{Name="Dashboard Doctor"; Path="/api/dashboard/doctor"},
            @{Name="Stats Doctor"; Path="/api/dashboard/doctor/stats"},
            @{Name="Listar Signos Vitales"; Path="/api/signos-vitales"},
            @{Name="Listar Comorbilidades"; Path="/api/comorbilidades"},
            @{Name="Listar Medicamentos"; Path="/api/medicamentos"},
            @{Name="Listar Diagnosticos"; Path="/api/diagnosticos"},
            @{Name="Listar Notificaciones"; Path="/api/notificaciones"},
            @{Name="Listar Modulos"; Path="/api/modulos"}
        )
        
        foreach ($ep in $endpoints) {
            $results.total++
            Write-Host "[GET] $($ep.Name)" -ForegroundColor Blue
            Write-Host "   Path: $($ep.Path)" -ForegroundColor Cyan
            
            try {
                $response = Invoke-RestMethod -Uri "$baseUrl$($ep.Path)" `
                    -Method GET `
                    -Headers $headers `
                    -ErrorAction Stop
                
                Write-Host "   OK" -ForegroundColor Green
                if ($response.data -and $response.data.Count) {
                    Write-Host "   Encontrados: $($response.data.Count) registros" -ForegroundColor Blue
                }
                $results.passed++
            } catch {
                $statusCode = $_.Exception.Response.StatusCode.value__
                $errorMsg = $_.Exception.Message
                Write-Host "   ERROR $statusCode - $errorMsg" -ForegroundColor Red
                
                if ($_.ErrorDetails.Message) {
                    try {
                        $errorData = $_.ErrorDetails.Message | ConvertFrom-Json
                        if ($errorData.error) {
                            Write-Host "   Detalles: $($errorData.error)" -ForegroundColor Yellow
                        }
                    } catch {
                        Write-Host "   Detalles: $($_.ErrorDetails.Message.Substring(0, [Math]::Min(100, $_.ErrorDetails.Message.Length)))" -ForegroundColor Yellow
                    }
                }
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
        
        if ($results.failed -eq 0) {
            Write-Host "`nTodos los endpoints funcionan correctamente!" -ForegroundColor Green
        } else {
            Write-Host "`nAlgunos endpoints fallaron. Revisa los detalles arriba." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Login fallo: No se recibio token" -ForegroundColor Red
    }
} catch {
    Write-Host "Login fallo: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status Code: $statusCode" -ForegroundColor Yellow
    }
}
