# ✅ Implementación: Recuperación y Cambio Seguro de Contraseñas

**Fecha:** 2025-01-01  
**Versión:** 1.0  
**Estado:** ✅ Completado

---

## 📋 Resumen

Se ha implementado un sistema completo y seguro para cambio y recuperación de contraseñas para doctores y administradores, corrigiendo las vulnerabilidades críticas identificadas.

---

## ✅ Funcionalidades Implementadas

### 1. Cambio de Contraseña Seguro

**Endpoint:** `PUT /api/auth/change-password`

**Características:**
- ✅ Requiere autenticación JWT (usuario debe estar logueado)
- ✅ Valida contraseña actual antes de cambiar
- ✅ Solo permite cambiar la contraseña propia
- ✅ Admin puede cambiar contraseña de otros usuarios (si especifica `userId`)
- ✅ Valida fortaleza de nueva contraseña (mínimo 8 caracteres)
- ✅ Valida que nueva contraseña sea diferente a la actual
- ✅ Invalida todos los refresh tokens después del cambio (forzar re-login)
- ✅ Rate limiting aplicado

**Parámetros:**
```json
{
  "currentPassword": "ContraseñaActual123!",
  "newPassword": "NuevaContraseña456!",
  "userId": 123  // Opcional, solo para Admin
}
```

**Ejemplo de uso:**
```bash
curl -X PUT http://api/api/auth/change-password \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "ContraseñaActual123!",
    "newPassword": "NuevaContraseña456!"
  }'
```

---

### 2. Recuperación de Contraseña (Forgot Password)

**Endpoint:** `POST /api/auth/forgot-password`

**Características:**
- ✅ Endpoint público (no requiere autenticación)
- ✅ Genera token único de recuperación
- ✅ Token expira en 1 hora
- ✅ Invalida tokens anteriores no usados del usuario
- ✅ Envía email con link de recuperación
- ✅ Rate limiting estricto (previene enumeración de emails)
- ✅ No revela si el email existe o no (seguridad)

**Parámetros:**
```json
{
  "email": "doctor@clinica.com"
}
```

**Ejemplo de uso:**
```bash
curl -X POST http://api/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor@clinica.com"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Si el email existe en nuestro sistema, recibirás un enlace para recuperar tu contraseña."
}
```

**Flujo:**
1. Usuario solicita recuperación con su email
2. Sistema genera token único con expiración (1 hora)
3. Guarda token en tabla `password_reset_tokens`
4. Envía email con link: `https://app.com/reset-password?token=xxx`
5. Responde siempre igual (prevenir enumeración de emails)

---

### 3. Reset de Contraseña con Token

**Endpoint:** `POST /api/auth/reset-password`

**Características:**
- ✅ Endpoint público (no requiere autenticación)
- ✅ Valida token (existencia, expiración, uso)
- ✅ Actualiza contraseña
- ✅ Marca token como usado
- ✅ Invalida todos los refresh tokens del usuario
- ✅ Envía notificación por email
- ✅ Rate limiting estricto
- ✅ Valida fortaleza de contraseña

**Parámetros:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "NuevaContraseña456!"
}
```

**Ejemplo de uso:**
```bash
curl -X POST http://api/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123...",
    "newPassword": "NuevaContraseña456!"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Contraseña restablecida exitosamente. Por favor, inicia sesión con tu nueva contraseña."
}
```

---

## 🗄️ Base de Datos

### Nueva Tabla: `password_reset_tokens`

**Estructura:**
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
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
```

**Índices:**
- `idx_token` - Búsqueda rápida por token
- `idx_usuario` - Búsqueda por usuario
- `idx_expiracion` - Limpieza de tokens expirados
- `idx_usado_expiracion` - Búsqueda de tokens válidos

**Estado de migración:** ✅ Ejecutada exitosamente

---

## 📦 Archivos Creados/Modificados

### Nuevos Archivos

1. **`api-clinica/migrations/create-password-reset-tokens.sql`**
   - Migración SQL para crear la tabla

2. **`api-clinica/scripts/ejecutar-migracion-password-reset-tokens.js`**
   - Script para ejecutar la migración

3. **`api-clinica/models/PasswordResetToken.js`**
   - Modelo Sequelize para `password_reset_tokens`
   - Métodos: `isValid()`, `markAsUsed()`

4. **`api-clinica/services/emailService.js`**
   - Servicio de email para recuperación
   - Templates HTML para emails
   - En desarrollo: solo loguea (no envía emails reales)

### Archivos Modificados

1. **`api-clinica/controllers/auth.js`**
   - ✅ `changePassword()` - Nuevo endpoint seguro
   - ✅ `updatePassword()` - Marcado como deprecated
   - ✅ `forgotPassword()` - Nuevo endpoint
   - ✅ `resetPassword()` - Nuevo endpoint

2. **`api-clinica/routes/auth.js`**
   - ✅ Agregada ruta `PUT /api/auth/change-password` (requiere autenticación)
   - ✅ Agregada ruta `POST /api/auth/forgot-password` (pública)
   - ✅ Agregada ruta `POST /api/auth/reset-password` (pública)
   - ✅ Ruta `PUT /api/auth/update-password` mantenida como deprecated

3. **`api-clinica/models/associations.js`**
   - ✅ Agregada asociación `Usuario.hasMany(PasswordResetToken)`
   - ✅ Agregado `PasswordResetToken` al export

---

## 🔒 Mejoras de Seguridad Implementadas

### 1. Cambio de Contraseña

| Antes | Después |
|------|---------|
| ❌ No requiere autenticación | ✅ Requiere JWT |
| ❌ No valida contraseña actual | ✅ Valida contraseña actual |
| ❌ Cualquiera puede cambiar cualquier contraseña | ✅ Solo propia (o Admin) |
| ❌ No invalida sesiones | ✅ Invalida refresh tokens |

### 2. Recuperación de Contraseña

| Característica | Estado |
|---------------|--------|
| ✅ Tokens únicos y seguros | Implementado |
| ✅ Expiración de 1 hora | Implementado |
| ✅ Tokens de un solo uso | Implementado |
| ✅ Prevención de enumeración de emails | Implementado |
| ✅ Rate limiting estricto | Implementado |
| ✅ Invalidación de sesiones después de reset | Implementado |

---

## 📧 Servicio de Email

### Estado Actual

**Desarrollo:**
- ✅ Loguea emails en consola
- ✅ Muestra URL de recuperación en logs
- ✅ No requiere configuración de SMTP

**Producción:**
- ⚠️ Requiere configuración de servicio de email
- ⚠️ Variables de entorno necesarias:
  ```env
  EMAIL_SERVICE_ENABLED=true
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_USER=user@example.com
  SMTP_PASS=password
  EMAIL_FROM=noreply@clinica.com
  FRONTEND_URL=https://app.clinica.com
  ```

### Integración Futura

El servicio está preparado para integrar con:
- SendGrid
- AWS SES
- Nodemailer (SMTP)
- Otros servicios de email

**Archivo:** `api-clinica/services/emailService.js`

---

## 🔄 Endpoint Legacy (Deprecated)

### `PUT /api/auth/update-password`

**Estado:** ⚠️ DEPRECATED

**Comportamiento:**
- Retorna error 410 (Gone)
- Incluye mensaje informativo
- Sugiere usar nuevo endpoint `change-password`

**Razón:** Vulnerabilidad crítica de seguridad (no requiere autenticación)

**Migración recomendada:**
- Frontend debe migrar a `PUT /api/auth/change-password`
- Mantener endpoint legacy temporalmente para compatibilidad
- Eliminar después de migración completa

---

## 🧪 Pruebas Recomendadas

### 1. Cambio de Contraseña

```bash
# 1. Login
TOKEN=$(curl -X POST http://api/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@clinica.com","password":"OldPass123!"}' \
  | jq -r '.accessToken')

# 2. Cambiar contraseña
curl -X PUT http://api/api/auth/change-password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123!",
    "newPassword": "NewPass456!"
  }'

# 3. Intentar login con nueva contraseña
curl -X POST http://api/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@clinica.com","password":"NewPass456!"}'
```

### 2. Recuperación de Contraseña

```bash
# 1. Solicitar recuperación
curl -X POST http://api/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@clinica.com"}'

# 2. Obtener token de logs/email
# 3. Resetear contraseña
curl -X POST http://api/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_DE_EMAIL",
    "newPassword": "NewPass789!"
  }'
```

### 3. Validaciones de Seguridad

- ✅ Intentar cambiar contraseña sin autenticación (debe fallar)
- ✅ Intentar cambiar con contraseña actual incorrecta (debe fallar)
- ✅ Intentar usar token expirado (debe fallar)
- ✅ Intentar usar token ya usado (debe fallar)
- ✅ Intentar cambiar a misma contraseña (debe fallar)

---

## 📝 Configuración Requerida

### Variables de Entorno

```env
# URL del frontend (para links de recuperación)
FRONTEND_URL=https://app.clinica.com

# Email (opcional, solo producción)
EMAIL_SERVICE_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
EMAIL_FROM=noreply@clinica.com
```

---

## ✅ Checklist de Implementación

- [x] Migración de base de datos creada y ejecutada
- [x] Modelo PasswordResetToken creado
- [x] Endpoint change-password implementado (seguro)
- [x] Endpoint forgot-password implementado
- [x] Endpoint reset-password implementado
- [x] Servicio de email creado
- [x] Rutas agregadas
- [x] Asociaciones de modelos actualizadas
- [x] Endpoint legacy marcado como deprecated
- [x] Rate limiting aplicado
- [x] Validaciones de seguridad implementadas
- [x] Invalidación de refresh tokens implementada
- [x] Logging de seguridad agregado

---

## 🎯 Próximos Pasos

### Prioridad ALTA

1. **Configurar servicio de email en producción:**
   - Elegir proveedor (SendGrid, AWS SES, etc.)
   - Configurar variables de entorno
   - Probar envío de emails

2. **Migrar frontend:**
   - Actualizar llamadas de `update-password` a `change-password`
   - Implementar UI de recuperación de contraseña
   - Implementar pantalla de reset con token

### Prioridad MEDIA

3. **Mejoras adicionales:**
   - Agregar notificaciones push de cambio de contraseña
   - Implementar historial de cambios de contraseña
   - Agregar validación de contraseñas comunes/comprometidas
   - Implementar expiración de contraseñas (opcional)

---

## 📊 Resumen de Seguridad

| Aspecto | Antes | Después |
|---------|-------|---------|
| Autenticación requerida | ❌ | ✅ |
| Validación contraseña actual | ❌ | ✅ |
| Recuperación de contraseña | ❌ | ✅ |
| Tokens seguros | ❌ | ✅ |
| Invalidación de sesiones | ❌ | ✅ |
| Rate limiting | ⚠️ Parcial | ✅ Completo |
| Prevención enumeración | ❌ | ✅ |

---

## 🎉 Conclusión

Se ha implementado un sistema completo y seguro para cambio y recuperación de contraseñas, corrigiendo todas las vulnerabilidades críticas identificadas. El sistema está listo para uso en desarrollo y requiere solo configuración de email para producción.

---

**Documento generado:** 2025-01-01  
**Última actualización:** 2025-01-01  
**Estado:** ✅ Implementación Completa

