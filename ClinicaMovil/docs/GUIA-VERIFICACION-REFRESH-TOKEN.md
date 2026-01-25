# 🔍 Guía de Verificación de Refresh Token

Esta guía te ayudará a verificar que el sistema de refresh token está funcionando correctamente cuando el access token expira (configurado a 10 minutos para pruebas).

## 📋 Pasos para Verificar

### 1. **Preparación**
- Asegúrate de que el servidor backend esté corriendo
- Asegúrate de que la aplicación móvil esté conectada y funcionando
- Inicia sesión en la aplicación

### 2. **Monitoreo de Logs**

#### **Frontend (React Native - Metro/Consola)**

Abre la consola de React Native (Metro bundler) y busca estos mensajes:

##### ✅ **Mensajes de Éxito (Verde/Info)**
```
🔄 [REFRESH TOKEN] Iniciando renovación automática de token...
✅ [REFRESH TOKEN] Respuesta del servidor recibida
✅ [REFRESH TOKEN] Nuevo access token guardado en storage
✅ [REFRESH TOKEN] Nuevo refresh token guardado en storage
✅ [REFRESH TOKEN] Token renovado exitosamente
✅ [INTERCEPTOR] Token renovado exitosamente, reintentando request original
```

##### ⚠️ **Mensajes de Advertencia (Amarillo)**
```
⚠️ [TOKEN CHECK] Token ya expirado, renovando inmediatamente...
🔄 [TOKEN CHECK] Token próximo a expirar, renovando proactivamente...
🔄 [INTERCEPTOR] Token expirado (401), intentando renovar automáticamente...
```

##### ❌ **Mensajes de Error (Rojo)**
```
❌ [REFRESH TOKEN] No hay refresh token disponible
❌ [REFRESH TOKEN] No se recibió respuesta del servidor al renovar token
❌ [REFRESH TOKEN] Respuesta de refresh token inválida
⚠️ [INTERCEPTOR] No se pudo renovar el token, sesión expirada
```

#### **Backend (Terminal del Servidor)**

Busca estos mensajes en la consola del servidor:

##### ✅ **Mensajes de Éxito**
```
🔄 [MOBILE REFRESH] Renovando token desde endpoint móvil
🔄 [REFRESH TOKEN] Generando nuevo par de tokens
✅ [REFRESH TOKEN] Nuevo par de tokens generado exitosamente
✅ [MOBILE REFRESH] Token renovado exitosamente desde endpoint móvil
```

##### ❌ **Mensajes de Error**
```
❌ [REFRESH TOKEN] Error renovando refresh token
```

### 3. **Flujo Esperado**

Cuando el access token expire (después de 10 minutos), deberías ver este flujo:

1. **Detección de expiración:**
   ```
   ⚠️ [TOKEN CHECK] Token ya expirado, renovando inmediatamente...
   ```
   O si se detecta antes de expirar:
   ```
   🔄 [TOKEN CHECK] Token próximo a expirar, renovando proactivamente...
   ```

2. **Inicio de renovación:**
   ```
   🔄 [REFRESH TOKEN] Iniciando renovación automática de token...
   🔄 [REFRESH TOKEN] Refresh token encontrado, enviando solicitud al servidor...
   ```

3. **En el backend:**
   ```
   🔄 [MOBILE REFRESH] Renovando token desde endpoint móvil
   🔄 [REFRESH TOKEN] Generando nuevo par de tokens
   ✅ [REFRESH TOKEN] Nuevo par de tokens generado exitosamente
   ✅ [MOBILE REFRESH] Token renovado exitosamente desde endpoint móvil
   ```

4. **En el frontend:**
   ```
   ✅ [REFRESH TOKEN] Respuesta del servidor recibida
   ✅ [REFRESH TOKEN] Nuevo access token guardado en storage
   ✅ [REFRESH TOKEN] Nuevo refresh token guardado en storage
   ✅ [REFRESH TOKEN] Token renovado exitosamente
   ```

5. **Si hay un request en curso:**
   ```
   🔄 [INTERCEPTOR] Token expirado (401), intentando renovar automáticamente...
   ✅ [INTERCEPTOR] Token renovado exitosamente, reintentando request original
   ```

### 4. **Verificación de Funcionamiento Correcto**

✅ **El sistema funciona correctamente si:**
- Ves los mensajes de éxito (✅) en ambos frontend y backend
- No aparecen errores 401 después de la renovación
- Los requests continúan funcionando sin interrupciones
- No se cierra la sesión del usuario
- El usuario no nota ninguna interrupción

❌ **Hay un problema si:**
- Aparecen múltiples errores 401 consecutivos
- El mensaje "No se pudo renovar el token, sesión expirada" aparece
- La aplicación redirige al login automáticamente
- Los requests fallan después de la renovación

### 5. **Cómo Forzar la Expiración para Pruebas**

Si no quieres esperar 10 minutos, puedes:

1. **Modificar temporalmente el token en storage** (solo para pruebas):
   - Usar un token expirado manualmente
   - O esperar los 10 minutos naturales

2. **Verificar que el refresh funcione:**
   - Hacer cualquier request después de que expire el token
   - Debería renovarse automáticamente

### 6. **Logs Adicionales para Debug**

Si necesitas más información, los logs incluyen:
- `expiresIn`: Duración del nuevo access token (debería ser "10m")
- `refreshTokenExpiresIn`: Duración del refresh token (debería ser "7d")
- `url`: URL del request que activó la renovación
- `method`: Método HTTP del request

### 7. **Restaurar Configuración Original**

Después de las pruebas, recuerda cambiar el tiempo del access token de vuelta a 7 horas:

**Archivo:** `api-clinica/services/refreshTokenService.js`
```javascript
const accessTokenExpiresIn = process.env.ACCESS_TOKEN_EXPIRES_IN || '7h';
```

O configura la variable de entorno:
```env
ACCESS_TOKEN_EXPIRES_IN=7h
```

## 🔧 Troubleshooting

### Problema: No se renueva el token
- Verifica que el refresh token esté guardado en storage
- Verifica que el backend esté respondiendo correctamente
- Revisa los logs de error en ambos frontend y backend

### Problema: Se cierra la sesión
- Verifica que el refresh token no haya expirado (dura 7 días)
- Verifica que el refresh token esté en la base de datos
- Revisa los logs para ver el error específico

### Problema: Múltiples renovaciones
- Esto es normal si hay múltiples requests simultáneos
- El sistema previene renovaciones duplicadas con una cola

## 📝 Notas

- Los emojis en los logs facilitan la identificación rápida
- Los prefijos `[REFRESH TOKEN]`, `[INTERCEPTOR]`, `[TOKEN CHECK]` ayudan a filtrar logs
- Los logs están sanitizados para no exponer tokens completos
