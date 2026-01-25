# 🔐 Análisis: Cambio y Recuperación de Contraseñas

**Fecha:** 2025-01-01  
**Versión:** 1.0

---

## 📋 Estado Actual

### ✅ Funcionalidad Existente

#### 1. Cambio de Contraseña (Parcial)

**Endpoint:** `PUT /api/auth/update-password`

**Características actuales:**
- ✅ Permite cambiar contraseña para Doctores y Administradores
- ✅ Valida que el usuario sea Doctor o Admin
- ✅ Hashea la nueva contraseña con bcrypt
- ✅ Valida formato de email y contraseña (en producción)
- ✅ Rate limiting aplicado (en producción)

**Parámetros requeridos:**
```json
{
  "email": "doctor@clinica.com",
  "newPassword": "NuevaContraseña123!"
}
```

---

## 🚨 Vulnerabilidades Críticas Identificadas

### 1. 🔴 CRÍTICA: Endpoint Sin Autenticación

**Problema:** El endpoint `PUT /api/auth/update-password` **NO requiere autenticación**.

**Impacto:**
- ❌ Cualquier persona puede cambiar la contraseña de cualquier doctor/admin
- ❌ Solo necesita conocer el email del usuario
- ❌ No valida la contraseña actual
- ❌ No requiere token JWT

**Ejemplo de ataque:**
```bash
# Cualquiera puede ejecutar esto sin autenticación:
curl -X PUT http://api/api/auth/update-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@clinica.com",
    "newPassword": "Hacker123!"
  }'
```

**Riesgo:** 🔴 **CRÍTICO** - Permite tomar control de cuentas de doctores y administradores

---

### 2. 🔴 CRÍTICA: No Valida Contraseña Actual

**Problema:** El endpoint no requiere la contraseña actual para cambiarla.

**Impacto:**
- ❌ No verifica que el usuario conoce la contraseña actual
- ❌ Permite cambio sin confirmación de identidad
- ❌ Vulnerable a ataques si alguien obtiene acceso temporal

**Riesgo:** 🔴 **CRÍTICO** - Falta de verificación de identidad

---

### 3. ❌ Funcionalidad Faltante: Recuperación de Contraseña

**Estado:** **NO IMPLEMENTADO**

**Funcionalidades faltantes:**
- ❌ No existe endpoint para solicitar recuperación de contraseña
- ❌ No existe sistema de tokens de recuperación
- ❌ No existe envío de emails con links de recuperación
- ❌ No existe validación de tokens de recuperación
- ❌ No existe reset de contraseña con token

**Impacto:**
- ❌ Usuarios no pueden recuperar contraseñas olvidadas
- ❌ Requiere intervención manual del administrador
- ❌ Mala experiencia de usuario

**Riesgo:** 🟡 **MEDIO** - Problema de usabilidad y soporte

---

## 📊 Resumen de Estado

| Funcionalidad | Estado | Seguridad | Comentarios |
|--------------|--------|-----------|-------------|
| Cambio de contraseña | ⚠️ Parcial | 🔴 Inseguro | No requiere autenticación |
| Validación contraseña actual | ❌ No existe | 🔴 Crítico | Falta verificación |
| Recuperación de contraseña | ❌ No existe | 🟡 Medio | Funcionalidad faltante |
| Tokens de recuperación | ❌ No existe | 🟡 Medio | Funcionalidad faltante |
| Envío de emails | ❌ No existe | 🟡 Medio | Funcionalidad faltante |

---

## ✅ Solución Recomendada

### 1. Cambio de Contraseña Seguro

**Endpoint:** `PUT /api/auth/change-password` (requiere autenticación)

**Características:**
- ✅ Requiere token JWT (usuario autenticado)
- ✅ Valida contraseña actual antes de cambiar
- ✅ Solo permite cambiar la contraseña propia (o Admin puede cambiar de otros)
- ✅ Valida fortaleza de nueva contraseña
- ✅ Rate limiting estricto

**Parámetros:**
```json
{
  "currentPassword": "ContraseñaActual123!",
  "newPassword": "NuevaContraseña456!"
}
```

**Flujo:**
1. Usuario autenticado envía contraseña actual y nueva
2. Sistema verifica contraseña actual
3. Si es correcta, actualiza a nueva contraseña
4. Opcionalmente, invalida todos los refresh tokens (forzar re-login)

---

### 2. Recuperación de Contraseña (Forgot Password)

**Endpoint 1:** `POST /api/auth/forgot-password` (público)

**Características:**
- ✅ Recibe email del usuario
- ✅ Genera token de recuperación (JWT con expiración corta, ej: 1 hora)
- ✅ Guarda token en base de datos con expiración
- ✅ Envía email con link de recuperación
- ✅ Rate limiting estricto (prevenir enumeración de emails)

**Parámetros:**
```json
{
  "email": "doctor@clinica.com"
}
```

**Flujo:**
1. Usuario solicita recuperación con su email
2. Sistema genera token único con expiración (1 hora)
3. Guarda token en tabla `password_reset_tokens`
4. Envía email con link: `https://app.com/reset-password?token=xxx`
5. Responde siempre igual (prevenir enumeración de emails)

---

**Endpoint 2:** `POST /api/auth/reset-password` (público)

**Características:**
- ✅ Recibe token de recuperación y nueva contraseña
- ✅ Valida token (existencia, expiración, uso)
- ✅ Actualiza contraseña
- ✅ Marca token como usado
- ✅ Invalida todos los refresh tokens del usuario

**Parámetros:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NuevaContraseña456!"
}
```

**Flujo:**
1. Usuario hace clic en link del email
2. Frontend extrae token de URL
3. Usuario ingresa nueva contraseña
4. Sistema valida token
5. Si es válido, actualiza contraseña
6. Marca token como usado
7. Invalida sesiones existentes

---

### 3. Estructura de Base de Datos

**Nueva tabla:** `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
  id_token INT PRIMARY KEY AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion DATETIME NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  fecha_uso DATETIME NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_usuario (id_usuario),
  INDEX idx_expiracion (fecha_expiracion)
);
```

---

## 🔧 Implementación Recomendada

### Prioridad ALTA 🔴

1. **Corregir endpoint de cambio de contraseña:**
   - Agregar autenticación requerida
   - Agregar validación de contraseña actual
   - Restringir a cambio de contraseña propia (o Admin)

2. **Implementar recuperación de contraseña:**
   - Crear tabla `password_reset_tokens`
   - Implementar `forgot-password` endpoint
   - Implementar `reset-password` endpoint
   - Integrar servicio de email

### Prioridad MEDIA 🟡

3. **Mejoras de seguridad:**
   - Invalidar refresh tokens después de cambio de contraseña
   - Agregar logging de cambios de contraseña
   - Implementar notificaciones por email de cambios de contraseña
   - Agregar validación de fortaleza de contraseña

---

## 📝 Notas Adicionales

### Endpoint Actual (Inseguro)

El endpoint actual `PUT /api/auth/update-password` debería:
- ❌ **DESHABILITARSE** o
- ✅ **REEMPLAZARSE** por el nuevo endpoint seguro

### Compatibilidad

Si hay frontend usando el endpoint actual:
- Mantener endpoint actual con deprecation warning
- Agregar nuevo endpoint seguro
- Migrar frontend gradualmente
- Eliminar endpoint antiguo después de migración

---

## 🎯 Conclusión

**Estado Actual:**
- ⚠️ Cambio de contraseña existe pero es **INSEGURO**
- ❌ Recuperación de contraseña **NO EXISTE**

**Recomendación:**
- 🔴 **URGENTE:** Corregir endpoint de cambio de contraseña
- 🔴 **URGENTE:** Implementar recuperación de contraseña
- 🟡 **IMPORTANTE:** Agregar mejoras de seguridad adicionales

---

**Documento generado:** 2025-01-01  
**Última actualización:** 2025-01-01

