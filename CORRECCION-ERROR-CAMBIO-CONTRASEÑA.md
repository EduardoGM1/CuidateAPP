# 🔧 Corrección de Error en Cambio de Contraseña

## 🐛 Problema Identificado

Al intentar cambiar la contraseña desde el usuario doctor, se producía el siguiente error:

```
Error: storageService.getToken is not a function (it is undefined)
```

**Ubicación del error:**
- `ClinicaMovil/src/api/authService.js` - Línea 353 (método `changePassword`)
- `ClinicaMovil/src/api/authService.js` - Línea 81 (método `changePIN`)

---

## 🔍 Causa Raíz

El problema era que se estaba llamando a `storageService.getToken()`, pero el método correcto en `storageService` es `getAuthToken()`, no `getToken()`.

**Archivo afectado:** `ClinicaMovil/src/api/authService.js`

**Métodos afectados:**
1. `doctorAuthService.changePassword()` - Línea 353
2. `pacienteAuthService.changePIN()` - Línea 81

---

## ✅ Solución Implementada

### Cambio Realizado:

**ANTES:**
```javascript
const token = await storageService.getToken(); // ❌ Método no existe
```

**DESPUÉS:**
```javascript
const token = await storageService.getAuthToken(); // ✅ Método correcto

if (!token) {
  throw new Error('No hay token de autenticación disponible. Por favor, inicia sesión nuevamente.');
}
```

### Mejoras Adicionales:

1. **Validación de token:** Se agregó validación para verificar que el token existe antes de usarlo
2. **Mensaje de error mejorado:** Si no hay token, se muestra un mensaje claro al usuario
3. **Aplicado en ambos métodos:** Tanto `changePassword` como `changePIN` fueron corregidos

---

## 📋 Archivos Modificados

### `ClinicaMovil/src/api/authService.js`

**Cambios:**
1. Línea 81: `storageService.getToken()` → `storageService.getAuthToken()`
2. Línea 353: `storageService.getToken()` → `storageService.getAuthToken()`
3. Agregada validación de token en ambos métodos

---

## 🧪 Pruebas Realizadas

### Escenarios Probados:
1. ✅ Cambio de contraseña con token válido
2. ✅ Cambio de contraseña sin token (error manejado correctamente)
3. ✅ Cambio de PIN con token válido
4. ✅ Cambio de PIN sin token (error manejado correctamente)

---

## 🚀 Resultado

**Antes:**
- ❌ Error: `storageService.getToken is not a function`
- ❌ No se podía cambiar la contraseña
- ❌ No se podía cambiar el PIN

**Después:**
- ✅ Método correcto utilizado: `getAuthToken()`
- ✅ Validación de token implementada
- ✅ Mensajes de error claros para el usuario
- ✅ Cambio de contraseña funcionando correctamente
- ✅ Cambio de PIN funcionando correctamente

---

## 📝 Notas Importantes

1. **Métodos disponibles en `storageService`:**
   - ✅ `getAuthToken()` - Obtener token de autenticación
   - ✅ `saveAuthToken(token)` - Guardar token de autenticación
   - ✅ `getRefreshToken()` - Obtener refresh token
   - ✅ `saveRefreshToken(token)` - Guardar refresh token
   - ❌ `getToken()` - **NO EXISTE** (este era el problema)

2. **Validación de token:**
   - Ahora se valida que el token exista antes de hacer la petición
   - Si no hay token, se muestra un mensaje claro al usuario
   - Esto previene errores 401 (Unauthorized) innecesarios

3. **Compatibilidad:**
   - Los cambios son compatibles con el código existente
   - No se requieren cambios en otros archivos
   - El comportamiento es el mismo, solo se corrigió el nombre del método

---

## 🔍 Cómo Verificar

1. **Iniciar sesión como doctor:**
   - Login con email y contraseña

2. **Intentar cambiar contraseña:**
   - Ir a Configuración → Cambiar Contraseña
   - Ingresar contraseña actual y nueva
   - Verificar que funciona sin errores

3. **Verificar logs:**
   - No deberían aparecer errores de `getToken is not a function`
   - El cambio de contraseña debería completarse exitosamente

---

**Fecha:** 2026-01-03
**Versión:** 1.0.0
**Estado:** ✅ Corregido

