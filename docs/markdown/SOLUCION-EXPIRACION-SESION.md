# 🔐 Solución para Manejo de Expiración de Sesión

## 🎯 Problema Identificado

Cuando el token está expirado o la sesión del usuario ha caducado:
- ❌ Las interfaces permanecen abiertas aunque no se extraen datos de la API
- ❌ El usuario no sabe que su sesión ha caducado
- ❌ No hay indicación clara de que necesita volver a iniciar sesión
- ❌ No hay intento automático de renovar el token

---

## ✅ Solución Implementada

Se implementó una solución completa basada en **mejores prácticas** que incluye:

### 1. **Renovación Automática de Tokens**
   - ✅ Intento automático de renovar el token cuando expira
   - ✅ Usa el refresh token para obtener un nuevo access token
   - ✅ Reintenta automáticamente el request original después de renovar

### 2. **Notificación Clara al Usuario**
   - ✅ Alert nativo cuando la sesión expira
   - ✅ Mensaje claro explicando que la sesión ha caducado
   - ✅ Redirección automática al login

### 3. **Limpieza de Datos**
   - ✅ Limpieza automática de datos de autenticación
   - ✅ Cierre de sesión en el contexto de autenticación
   - ✅ Reset del stack de navegación

### 4. **Verificación Proactiva**
   - ✅ Verificación periódica del token (cada 5 minutos)
   - ✅ Renovación proactiva si el token está próximo a expirar (< 5 minutos)

---

## 📋 Archivos Creados/Modificados

### Nuevos Archivos:

1. **`ClinicaMovil/src/services/sessionService.js`**
   - Servicio centralizado para manejo de sesión
   - Renovación automática de tokens
   - Manejo de expiración de sesión
   - Verificación proactiva de tokens

2. **`ClinicaMovil/src/hooks/useSessionManager.js`**
   - Hook React para integrar sessionService con AuthContext
   - Configuración de callbacks
   - Verificación periódica de tokens
   - Integración con navegación

3. **`ClinicaMovil/src/components/common/SessionExpiredModal.js`**
   - Modal para mostrar cuando la sesión expira
   - Diseño claro y profesional
   - Botón para redirigir al login

### Archivos Modificados:

1. **`ClinicaMovil/src/api/gestionService.js`**
   - Interceptor mejorado para manejar 401
   - Intento automático de renovación de token
   - Reintento de request original después de renovar

2. **`ClinicaMovil/src/api/dashboardService.js`**
   - Interceptor mejorado para manejar 401
   - Misma lógica de renovación automática

3. **`ClinicaMovil/App.tsx`**
   - Integración del hook `useSessionManager`
   - Gestión automática de sesión en toda la app

---

## 🔧 Cómo Funciona

### Flujo de Renovación Automática:

```
1. Usuario hace request → API devuelve 401 (Token expirado)
   ↓
2. Interceptor detecta 401 → Intenta renovar token automáticamente
   ↓
3. Si hay refresh token → Renueva token exitosamente
   ↓
4. Reintenta request original con nuevo token → ✅ Éxito
   ↓
5. Si no hay refresh token o falla → Sesión expirada
   ↓
6. Limpia datos de autenticación
   ↓
7. Muestra alerta al usuario
   ↓
8. Redirige al login automáticamente
```

### Verificación Proactiva:

```
1. Usuario autenticado → Hook verifica token cada 5 minutos
   ↓
2. Si token está próximo a expirar (< 5 min) → Renueva proactivamente
   ↓
3. Usuario no nota interrupción → Experiencia fluida
```

---

## 🎨 Características Implementadas

### ✅ Renovación Automática
- Intento automático de renovar token cuando expira
- Cola de requests esperando renovación
- Reintento automático de requests fallidos

### ✅ Notificación al Usuario
- Alert nativo de React Native
- Mensaje claro: "Tu sesión ha caducado por seguridad"
- Botón para redirigir al login

### ✅ Limpieza Automática
- Limpieza de tokens y datos de autenticación
- Cierre de sesión en AuthContext
- Reset del stack de navegación

### ✅ Verificación Proactiva
- Verificación periódica cada 5 minutos
- Renovación proactiva si está próximo a expirar
- Sin interrupciones para el usuario

### ✅ Manejo de Errores
- Manejo robusto de errores en renovación
- Fallback a limpieza de sesión si falla
- Logging detallado para debugging

---

## 📝 Mejores Prácticas Implementadas

### 1. **Patrón Singleton**
   - `sessionService` es una instancia única
   - Evita múltiples intentos simultáneos de renovación

### 2. **Cola de Requests**
   - Requests esperando renovación se encolan
   - Se procesan todos después de renovar exitosamente

### 3. **Callbacks Configurables**
   - `setOnSessionExpired()` - Para manejar expiración
   - `setOnTokenRefreshed()` - Para manejar renovación exitosa

### 4. **Separación de Responsabilidades**
   - `sessionService` - Lógica de negocio
   - `useSessionManager` - Integración con React
   - Interceptores - Manejo de HTTP

### 5. **Experiencia de Usuario**
   - Renovación transparente (sin interrupciones)
   - Notificación clara cuando es necesario
   - Redirección automática al login

---

## 🧪 Cómo Probar

### Escenario 1: Token Expira Durante Uso
1. Iniciar sesión
2. Esperar a que el token expire (o simularlo)
3. Hacer cualquier request a la API
4. **Resultado esperado:**
   - Intento automático de renovar token
   - Si hay refresh token: Request se completa exitosamente
   - Si no hay refresh token: Alerta y redirección al login

### Escenario 2: Token Próximo a Expirar
1. Iniciar sesión
2. Esperar 5 minutos (verificación periódica)
3. **Resultado esperado:**
   - Token se renueva proactivamente
   - Usuario no nota interrupción

### Escenario 3: Sesión Expirada al Abrir App
1. Cerrar sesión o dejar que expire
2. Abrir la app
3. **Resultado esperado:**
   - Si hay datos de autenticación pero token inválido: Alerta y redirección
   - Si no hay datos: Pantalla de login normal

---

## 🔍 Detalles Técnicos

### Interceptores de Axios

Los interceptores ahora:
1. Detectan errores 401 (Unauthorized)
2. Intentan renovar el token automáticamente
3. Reintentan el request original con el nuevo token
4. Si falla, manejan la expiración de sesión

### Verificación de Expiración

El token JWT se decodifica para leer el campo `exp`:
- Si `exp - now < 5 minutos` → Se renueva proactivamente
- Si `exp - now < 0` → Token expirado, se maneja como 401

### Manejo de Errores

- Errores de renovación se capturan y manejan
- Fallback a limpieza de sesión si todo falla
- Logging detallado para debugging

---

## 📊 Beneficios

### Para el Usuario:
- ✅ Experiencia fluida (renovación transparente)
- ✅ Notificación clara cuando es necesario
- ✅ Redirección automática al login
- ✅ Sin pérdida de datos o estado

### Para el Desarrollo:
- ✅ Código centralizado y reutilizable
- ✅ Fácil de mantener y extender
- ✅ Logging detallado para debugging
- ✅ Separación de responsabilidades

### Para la Seguridad:
- ✅ Tokens se renuevan automáticamente
- ✅ Limpieza automática de datos expirados
- ✅ Prevención de sesiones huérfanas
- ✅ Cumplimiento de mejores prácticas

---

## 🚀 Próximos Pasos (Opcionales)

1. **Modal Personalizado:** Reemplazar Alert nativo con modal personalizado
2. **Contador de Tiempo:** Mostrar tiempo restante de sesión
3. **Renovación Silenciosa:** Renovar token en background sin notificar
4. **Múltiples Dispositivos:** Manejar sesiones en múltiples dispositivos
5. **Analytics:** Registrar eventos de expiración de sesión

---

**Fecha:** 2026-01-03
**Versión:** 1.0.0
**Estado:** ✅ Implementado

