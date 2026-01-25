# 🔄 Verificación de Renovación de Tokens

## Estado Actual

El servidor backend necesita estar corriendo para probar la renovación de tokens.

## Pasos para Verificar

### 1. Iniciar el Servidor Backend

**En una terminal separada:**
```bash
cd api-clinica
npm start
```

Espera a ver el mensaje:
```
✅ Servidor corriendo en puerto 3000
```

### 2. Ejecutar Prueba de Refresh Token

**En otra terminal:**
```bash
cd api-clinica
node scripts/test-refresh-token.js Doctor@clinica.com Doctor123!
```

### 3. Qué Esperar

El script debería mostrar:

1. **Login exitoso:**
   ```
   ✅ Login exitoso
   Access Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Access Token expira en: 2m
   ```

2. **Refresh token exitoso:**
   ```
   ✅ Refresh token exitoso!
   Nuevo Access Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ✅ Los tokens fueron rotados correctamente
   ```

3. **Verificación del nuevo token:**
   ```
   ✅ El nuevo token funciona correctamente!
   ```

## Verificación Manual

### Opción 1: Usar el Script de Prueba

```bash
cd api-clinica
node scripts/test-refresh-token.js Doctor@clinica.com Doctor123!
```

### Opción 2: Prueba Manual con cURL/PowerShell

**1. Login:**
```powershell
$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body (@{email="Doctor@clinica.com"; password="Doctor123!"} | ConvertTo-Json) -ContentType "application/json"
$accessToken = $loginResponse.token
$refreshToken = $loginResponse.refresh_token
Write-Host "Access Token: $($accessToken.Substring(0, 20))..."
```

**2. Refresh Token:**
```powershell
$refreshResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/mobile/refresh-token" -Method POST -Body (@{refresh_token=$refreshToken} | ConvertTo-Json) -ContentType "application/json" -Headers @{"X-Device-ID"="test-device"}
Write-Host "Nuevo Access Token: $($refreshResponse.token.Substring(0, 20))..."
```

### Opción 3: Monitorear Logs en Tiempo Real

**Terminal 1 - Backend:**
```bash
cd api-clinica
npm start
```

**Terminal 2 - Monitor:**
```bash
cd api-clinica
node scripts/monitor-refresh-token-logs.js
```

**Terminal 3 - Frontend (si quieres probar desde la app):**
```bash
cd ClinicaMovil
npx react-native start
```

## Verificación desde la Aplicación Móvil

1. **Inicia sesión** en la aplicación
2. **Espera 2 minutos** (el token expira después de 2 minutos)
3. **Haz cualquier acción** en la app (navegar, refrescar datos, etc.)
4. **Observa los logs** en Metro bundler y en el monitor del backend

Deberías ver:
- `🔄 [REFRESH TOKEN] Iniciando renovación automática de token...`
- `✅ [REFRESH TOKEN] Token renovado exitosamente`

## Troubleshooting

### Error: "No se pudo conectar al servidor"

**Solución:**
1. Verifica que el servidor esté corriendo: `npm start` en `api-clinica`
2. Verifica que el puerto 3000 esté disponible: `netstat -ano | findstr :3000`
3. Verifica que no haya errores en la consola del servidor

### Error: "Refresh token inválido o expirado"

**Solución:**
1. Verifica que el refresh token no haya expirado (dura 7 días)
2. Verifica que el refresh token esté en la base de datos
3. Revisa los logs del backend para ver el error específico

### Error: "401 Unauthorized"

**Solución:**
1. Verifica que el access token sea válido
2. Verifica que el refresh token sea válido
3. Revisa que el endpoint `/api/mobile/refresh-token` esté funcionando

## Estado de la Configuración

- ✅ Access Token: **2 minutos** (temporal para pruebas)
- ✅ Refresh Token: **7 días**
- ✅ Endpoint de refresh: `/api/mobile/refresh-token`
- ✅ Rotación de tokens: **Habilitada**
- ✅ Logs mejorados: **Con emojis y prefijos**

## Próximos Pasos

1. ✅ Iniciar servidor backend
2. ✅ Ejecutar script de prueba
3. ⏳ Verificar que el refresh funcione
4. ⏳ Probar desde la aplicación móvil
5. ⏳ Cambiar tiempo del token de vuelta a 7 horas después de pruebas
