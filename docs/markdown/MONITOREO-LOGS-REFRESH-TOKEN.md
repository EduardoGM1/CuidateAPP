# 🔍 Guía Completa de Monitoreo de Logs - Refresh Token

Esta guía te ayudará a monitorear los logs del sistema de refresh token en tiempo real.

## 📋 Requisitos Previos

1. **Backend corriendo** en una terminal
2. **Frontend corriendo** (Metro bundler) en otra terminal
3. **Aplicación móvil conectada** y con sesión iniciada

## 🖥️ Backend - Monitoreo de Logs

### Opción 1: Script de Node.js (Recomendado)

```bash
# En la terminal del backend
cd api-clinica
node scripts/monitor-refresh-token-logs.js
```

Este script:
- ✅ Monitorea los archivos de log en tiempo real
- ✅ Filtra solo mensajes relevantes de refresh token
- ✅ Colorea los mensajes según su tipo
- ✅ Muestra las últimas líneas relevantes al iniciar

### Opción 2: Script de PowerShell (Windows)

```powershell
# En PowerShell, desde la raíz del proyecto
cd api-clinica
.\scripts\monitor-logs.ps1
```

### Opción 3: Monitoreo Manual en Consola

Si el backend está imprimiendo logs en la consola, busca estos mensajes:

**Buscar:**
```
🔄 [MOBILE REFRESH]
🔄 [REFRESH TOKEN]
✅ [REFRESH TOKEN]
✅ [MOBILE REFRESH]
```

**Filtrar en PowerShell:**
```powershell
# Si el servidor está corriendo, los logs aparecen directamente
# Busca líneas que contengan "REFRESH" o "TOKEN"
```

**Filtrar en Bash:**
```bash
# Si el servidor está corriendo, los logs aparecen directamente
# Busca líneas que contengan "REFRESH" o "TOKEN"
```

### Opción 4: Monitorear Archivos de Log Directamente

Los logs se guardan en:
- `api-clinica/logs/combined.log` - Todos los logs
- `api-clinica/logs/error.log` - Solo errores

**Windows (PowerShell):**
```powershell
Get-Content api-clinica\logs\combined.log -Wait -Tail 50 | 
    Select-String -Pattern "REFRESH|TOKEN|401"
```

**Linux/Mac (Bash):**
```bash
tail -f api-clinica/logs/combined.log | grep -E "REFRESH|TOKEN|401"
```

## 📱 Frontend - Monitoreo de Logs

### Opción 1: Metro Bundler (Consola)

Los logs aparecen directamente en la terminal donde corre Metro.

**Filtrar en PowerShell:**
```powershell
# Ejecuta Metro y filtra
npx react-native start | Select-String -Pattern "REFRESH TOKEN|INTERCEPTOR|TOKEN CHECK"
```

**Filtrar en Bash:**
```bash
# Ejecuta Metro y filtra
npx react-native start | grep -E "REFRESH TOKEN|INTERCEPTOR|TOKEN CHECK"
```

### Opción 2: React Native Debugger

1. Abre React Native Debugger
2. Ve a la pestaña "Console"
3. Filtra por: `REFRESH TOKEN` o `INTERCEPTOR`

### Opción 3: Flipper (Si está configurado)

1. Abre Flipper
2. Ve a "Logs"
3. Filtra por: `refresh` o `token`

## 🎯 Qué Buscar Después de 2 Minutos

### Secuencia Esperada de Logs

#### 1. **Detección de Expiración (Frontend)**
```
⚠️ [TOKEN CHECK] Token ya expirado, renovando inmediatamente...
```
O si se detecta antes:
```
🔄 [TOKEN CHECK] Token próximo a expirar, renovando proactivamente...
```

#### 2. **Inicio de Renovación (Frontend)**
```
🔄 [REFRESH TOKEN] Iniciando renovación automática de token...
🔄 [REFRESH TOKEN] Refresh token encontrado, enviando solicitud al servidor...
```

#### 3. **Recepción en Backend**
```
🔄 [MOBILE REFRESH] Renovando token desde endpoint móvil
🔄 [REFRESH TOKEN] Generando nuevo par de tokens
```

#### 4. **Generación Exitosa (Backend)**
```
✅ [REFRESH TOKEN] Nuevo par de tokens generado exitosamente
✅ [MOBILE REFRESH] Token renovado exitosamente desde endpoint móvil
```

#### 5. **Confirmación en Frontend**
```
✅ [REFRESH TOKEN] Respuesta del servidor recibida
✅ [REFRESH TOKEN] Nuevo access token guardado en storage
✅ [REFRESH TOKEN] Nuevo refresh token guardado en storage
✅ [REFRESH TOKEN] Token renovado exitosamente
```

#### 6. **Si hay Request en Curso (Frontend)**
```
🔄 [INTERCEPTOR] Token expirado (401), intentando renovar automáticamente...
✅ [INTERCEPTOR] Token renovado exitosamente, reintentando request original
```

## ✅ Señales de Funcionamiento Correcto

**El sistema funciona bien si:**
- ✅ Ves mensajes con ✅ (verde) en ambos frontend y backend
- ✅ No aparecen múltiples errores 401 después de la renovación
- ✅ Los requests continúan funcionando sin interrupciones
- ✅ No se cierra la sesión del usuario automáticamente
- ✅ El usuario no nota ninguna interrupción

## ❌ Señales de Problemas

**Hay un problema si:**
- ❌ Aparecen múltiples mensajes con ❌ (rojo)
- ❌ El mensaje "No se pudo renovar el token, sesión expirada" aparece
- ❌ La aplicación redirige al login automáticamente
- ❌ Los requests fallan después de la renovación
- ❌ Errores 401 continuos después de intentar renovar

## 🔧 Troubleshooting

### Problema: No veo logs en el backend

**Solución:**
1. Verifica que el servidor esté corriendo
2. Verifica que el directorio `api-clinica/logs` exista
3. Verifica que el logger esté configurado para escribir en archivos
4. Revisa la consola del servidor directamente

### Problema: No veo logs en el frontend

**Solución:**
1. Verifica que Metro bundler esté corriendo
2. Verifica que la aplicación esté conectada
3. Revisa la consola de React Native Debugger
4. Verifica que `__DEV__` esté habilitado

### Problema: Los logs no se filtran correctamente

**Solución:**
1. Usa los scripts proporcionados que filtran automáticamente
2. Ajusta las palabras clave en los scripts si es necesario
3. Verifica que los emojis y prefijos estén presentes en los logs

## 📊 Resumen de Comandos Rápidos

### Backend
```bash
# Node.js script
node api-clinica/scripts/monitor-refresh-token-logs.js

# PowerShell (Windows)
.\api-clinica\scripts\monitor-logs.ps1

# Tail directo (Linux/Mac)
tail -f api-clinica/logs/combined.log | grep -E "REFRESH|TOKEN"
```

### Frontend
```bash
# Metro con filtro (PowerShell)
npx react-native start | Select-String -Pattern "REFRESH TOKEN|INTERCEPTOR"

# Metro con filtro (Bash)
npx react-native start | grep -E "REFRESH TOKEN|INTERCEPTOR"
```

## 💡 Tips Adicionales

1. **Abre dos terminales:** Una para backend, otra para frontend
2. **Usa los scripts:** Son más fáciles y muestran colores
3. **Espera 2 minutos:** El token expira después de 2 minutos
4. **Haz un request:** Después de que expire, haz cualquier acción en la app para forzar la renovación
5. **Observa ambos logs:** Compara los tiempos entre frontend y backend

## 🎬 Próximos Pasos

1. Ejecuta los scripts de monitoreo
2. Inicia sesión en la aplicación
3. Espera 2 minutos
4. Observa los logs en ambas consolas
5. Verifica que aparezcan los mensajes de éxito
6. Confirma que no hay errores

¡Listo para monitorear! 🚀
