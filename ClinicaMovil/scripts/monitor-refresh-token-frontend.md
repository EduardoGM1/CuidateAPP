# 🔍 Guía para Monitorear Logs de Refresh Token en Frontend

## Método 1: Metro Bundler (Recomendado)

### Paso 1: Abre la consola de Metro
Cuando ejecutas `npm start` o `npx react-native start`, Metro muestra los logs en la terminal.

### Paso 2: Filtra los logs
En la terminal de Metro, busca estos mensajes:

**Mensajes de Éxito (Buscar):**
```
✅ [REFRESH TOKEN]
✅ [INTERCEPTOR]
```

**Mensajes de Proceso (Buscar):**
```
🔄 [REFRESH TOKEN]
🔄 [TOKEN CHECK]
🔄 [INTERCEPTOR]
```

**Mensajes de Error (Buscar):**
```
❌ [REFRESH TOKEN]
⚠️ [TOKEN CHECK]
```

### Paso 3: Usar filtros en la terminal
Si usas PowerShell (Windows):
```powershell
# Filtrar solo mensajes de refresh token
npx react-native start | Select-String -Pattern "REFRESH TOKEN|INTERCEPTOR|TOKEN CHECK"
```

Si usas Bash/Linux/Mac:
```bash
# Filtrar solo mensajes de refresh token
npx react-native start | grep -E "REFRESH TOKEN|INTERCEPTOR|TOKEN CHECK"
```

## Método 2: React Native Debugger

1. Abre React Native Debugger
2. Ve a la pestaña "Console"
3. Filtra por: `REFRESH TOKEN` o `INTERCEPTOR`

## Método 3: Flipper (Si está configurado)

1. Abre Flipper
2. Ve a "Logs"
3. Filtra por: `refresh` o `token`

## Método 4: Script de PowerShell (Windows)

Crea un archivo `monitor-logs.ps1`:

```powershell
# Monitor de logs de React Native
$process = Start-Process -FilePath "npx" -ArgumentList "react-native", "start" -NoNewWindow -PassThru -RedirectStandardOutput "metro-output.log"

Write-Host "Monitoreando logs de Metro..." -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
Write-Host ""

Get-Content "metro-output.log" -Wait -Tail 50 | Where-Object {
    $_ -match "REFRESH TOKEN|INTERCEPTOR|TOKEN CHECK|401|expirado|renovado"
} | ForEach-Object {
    if ($_ -match "✅") {
        Write-Host $_ -ForegroundColor Green
    } elseif ($_ -match "⚠️|❌") {
        Write-Host $_ -ForegroundColor Red
    } elseif ($_ -match "🔄") {
        Write-Host $_ -ForegroundColor Cyan
    } else {
        Write-Host $_
    }
}
```

Ejecuta:
```powershell
.\monitor-logs.ps1
```

## Qué buscar después de 2 minutos

Cuando el token expire, deberías ver esta secuencia:

1. **Detección:**
   ```
   ⚠️ [TOKEN CHECK] Token ya expirado, renovando inmediatamente...
   ```

2. **Inicio de renovación:**
   ```
   🔄 [REFRESH TOKEN] Iniciando renovación automática de token...
   🔄 [REFRESH TOKEN] Refresh token encontrado, enviando solicitud al servidor...
   ```

3. **Respuesta del servidor:**
   ```
   ✅ [REFRESH TOKEN] Respuesta del servidor recibida
   ✅ [REFRESH TOKEN] Nuevo access token guardado en storage
   ✅ [REFRESH TOKEN] Nuevo refresh token guardado en storage
   ```

4. **Éxito:**
   ```
   ✅ [REFRESH TOKEN] Token renovado exitosamente
   ```

5. **Si hay un request en curso:**
   ```
   🔄 [INTERCEPTOR] Token expirado (401), intentando renovar automáticamente...
   ✅ [INTERCEPTOR] Token renovado exitosamente, reintentando request original
   ```

## Señales de que funciona correctamente

✅ **Funciona bien si:**
- Ves mensajes con ✅ (verde)
- No aparecen múltiples errores 401
- Los requests continúan funcionando
- No se cierra la sesión

❌ **Hay problema si:**
- Aparecen múltiples ❌ (rojos)
- Mensaje "No se pudo renovar el token"
- La app redirige al login
- Errores 401 continuos
