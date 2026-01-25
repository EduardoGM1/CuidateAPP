# ✅ Implementación Completa: Recuperación de Contraseñas y PINs

**Fecha:** 2025-01-01  
**Estado:** ✅ Completado

---

## 📋 Resumen

Se ha implementado un sistema completo y seguro para cambio y recuperación de contraseñas (Doctores/Admin) y PINs (Pacientes), incluyendo integración con Resend para envío de emails.

---

## ✅ Funcionalidades Implementadas

### 1. Recuperación de Contraseña (Doctores/Admin) ✅

#### Backend
- ✅ Endpoint `POST /api/auth/forgot-password`
- ✅ Endpoint `POST /api/auth/reset-password`
- ✅ Tabla `password_reset_tokens`
- ✅ Integración con Resend para envío de emails
- ✅ Tokens con expiración de 1 hora
- ✅ Prevención de enumeración de emails
- ✅ Rate limiting estricto

#### Frontend
- ✅ Pantalla `ForgotPasswordScreen.js`
- ✅ Pantalla `ResetPasswordScreen.js`
- ✅ Métodos en `authService.js`
- ✅ Integración en `LoginDoctor.js`
- ✅ Rutas en `NavegacionAuth.js`

---

### 2. Cambio de Contraseña (Doctores/Admin) ✅

#### Backend
- ✅ Endpoint `PUT /api/auth/change-password` (ya existía, mejorado)
- ✅ Requiere autenticación JWT
- ✅ Valida contraseña actual
- ✅ Invalida refresh tokens después del cambio

#### Frontend
- ✅ Pantalla `ChangePasswordScreen.js`
- ✅ Método `changePassword()` en `authService.js`
- ✅ Lista para integrar en pantalla de perfil/configuración

---

### 3. Cambio de PIN (Pacientes) ✅

#### Backend
- ✅ Endpoint `PUT /api/auth-unified/change-pin` (NUEVO)
- ✅ Requiere autenticación JWT
- ✅ Valida PIN actual
- ✅ Valida unicidad del nuevo PIN
- ✅ Valida PINs débiles
- ✅ Método `changePIN()` en `unifiedAuthService.js`

#### Frontend
- ✅ Pantalla `ChangePINScreen.js`
- ✅ Método `changePIN()` en `authService.js`
- ✅ Lista para integrar en pantalla de perfil/configuración

---

### 4. Recuperación de PIN (Pacientes) ✅

#### Backend
- ✅ Opción asistida (contactar médico)
- ✅ No requiere endpoint adicional (se maneja por personal)

#### Frontend
- ✅ Pantalla `ForgotPINScreen.js`
- ✅ Integración en `LoginPIN.js` (botón "Olvidé mi PIN")
- ✅ Rutas en `NavegacionAuth.js`

---

## 📦 Archivos Creados/Modificados

### Backend

**Nuevos:**
- Ninguno (se reutilizaron archivos existentes)

**Modificados:**
- `api-clinica/services/emailService.js` - Integración con Resend
- `api-clinica/services/unifiedAuthService.js` - Método `changePIN()`
- `api-clinica/controllers/unifiedAuthController.js` - Función `changePIN()`
- `api-clinica/routes/unifiedAuth.js` - Ruta `PUT /api/auth-unified/change-pin`

### Frontend

**Nuevos:**
- `ClinicaMovil/src/screens/auth/ForgotPasswordScreen.js`
- `ClinicaMovil/src/screens/auth/ResetPasswordScreen.js`
- `ClinicaMovil/src/screens/settings/ChangePasswordScreen.js`
- `ClinicaMovil/src/screens/settings/ChangePINScreen.js`
- `ClinicaMovil/src/screens/auth/ForgotPINScreen.js`

**Modificados:**
- `ClinicaMovil/src/api/authService.js` - Métodos: `forgotPassword()`, `resetPassword()`, `changePassword()`, `changePIN()`
- `ClinicaMovil/src/screens/auth/LoginDoctor.js` - Actualizado `handleForgotPassword()`
- `ClinicaMovil/src/screens/auth/LoginPIN.js` - Agregado botón "Olvidé mi PIN"
- `ClinicaMovil/src/navigation/NavegacionAuth.js` - Agregadas rutas nuevas

---

## 🔧 Configuración Requerida

### Variables de Entorno

Agregar al archivo `.env`:

```env
# Resend API Key
RESEND_API_KEY=re_LUbEi5vh_9R5MCK43ctrJDfJ5h7ZUewUu

# Email From (opcional, por defecto usa onboarding@resend.dev)
EMAIL_FROM=onboarding@resend.dev

# Frontend URL (para links de recuperación)
FRONTEND_URL=http://localhost:3000
# O en producción:
# FRONTEND_URL=https://app.clinica.com
```

---

## 📧 Integración con Resend

### Configuración

El servicio de email está configurado para usar Resend automáticamente. En desarrollo, también loguea los emails en consola para facilitar pruebas.

### Templates HTML

- ✅ Template de recuperación de contraseña
- ✅ Template de notificación de cambio de contraseña
- ✅ Diseño responsive y profesional

### Envío de Emails

```javascript
// Ejemplo de uso (ya implementado en emailService.js)
const { data, error } = await resend.emails.send({
  from: EMAIL_FROM,
  to: usuario.email,
  subject: 'Recuperación de Contraseña - Clínica',
  html: templateHTML,
  text: templateText
});
```

---

## 🎯 Endpoints Disponibles

### Doctores/Admin

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| POST | `/api/auth/forgot-password` | Solicitar recuperación | No |
| POST | `/api/auth/reset-password` | Resetear con token | No |
| PUT | `/api/auth/change-password` | Cambiar contraseña | Sí (JWT) |

### Pacientes

| Método | Endpoint | Descripción | Autenticación |
|--------|----------|-------------|---------------|
| PUT | `/api/auth-unified/change-pin` | Cambiar PIN | Sí (JWT) |

---

## 📱 Pantallas del Frontend

### Doctores/Admin

1. **ForgotPasswordScreen**
   - Formulario con campo de email
   - Validación de email
   - Mensaje de confirmación

2. **ResetPasswordScreen**
   - Recibe token de URL
   - Formulario: nueva contraseña, confirmar
   - Validación de fortaleza

3. **ChangePasswordScreen**
   - Formulario: contraseña actual, nueva, confirmar
   - Validación completa
   - Manejo de errores

### Pacientes

1. **ChangePINScreen**
   - Formulario: PIN actual, nuevo PIN, confirmar
   - Validación de formato (4 dígitos)
   - Validación de PINs débiles

2. **ForgotPINScreen**
   - Información sobre recuperación asistida
   - Instrucciones para contactar médico
   - Diseño accesible

---

## 🔒 Seguridad Implementada

### Recuperación de Contraseña
- ✅ Tokens únicos y seguros (crypto.randomBytes)
- ✅ Expiración de 1 hora
- ✅ Tokens de un solo uso
- ✅ Prevención de enumeración de emails
- ✅ Rate limiting estricto
- ✅ Invalidación de sesiones después de reset

### Cambio de Contraseña
- ✅ Requiere autenticación JWT
- ✅ Valida contraseña actual
- ✅ Valida fortaleza (mínimo 8 caracteres)
- ✅ Invalida refresh tokens

### Cambio de PIN
- ✅ Requiere autenticación JWT
- ✅ Valida PIN actual
- ✅ Valida unicidad del nuevo PIN
- ✅ Valida PINs débiles
- ✅ Formato estricto (4 dígitos)

---

## 🧪 Pruebas Recomendadas

### 1. Recuperación de Contraseña

```bash
# 1. Solicitar recuperación
curl -X POST http://api/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@clinica.com"}'

# 2. Verificar email recibido (en logs o bandeja)
# 3. Resetear contraseña con token
curl -X POST http://api/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_DE_EMAIL",
    "newPassword": "NuevaPass123!"
  }'
```

### 2. Cambio de Contraseña

```bash
# Requiere token JWT
curl -X PUT http://api/api/auth/change-password \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "PassActual123!",
    "newPassword": "NuevaPass456!"
  }'
```

### 3. Cambio de PIN

```bash
# Requiere token JWT de paciente
curl -X PUT http://api/api/auth-unified/change-pin \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPin": "1234",
    "newPin": "5678",
    "device_id": "device-123"
  }'
```

---

## 📝 Próximos Pasos (Opcional)

### Integración en Pantallas de Perfil

1. **Para Doctores/Admin:**
   - Agregar botón "Cambiar Contraseña" en pantalla de perfil/configuración
   - Navegar a `ChangePasswordScreen`

2. **Para Pacientes:**
   - Agregar botón "Cambiar PIN" en pantalla de perfil/configuración
   - Navegar a `ChangePINScreen`

### Mejoras Futuras

1. **Validación de contraseñas comunes:**
   - Integrar con Have I Been Pwned API
   - Lista de contraseñas débiles

2. **Historial de cambios:**
   - Registrar cambios de contraseña/PIN
   - Prevenir reutilización de últimas N contraseñas

3. **Notificaciones push:**
   - Notificar cambios de contraseña/PIN
   - Alertas de seguridad

---

## ✅ Checklist de Implementación

- [x] Instalar Resend
- [x] Actualizar emailService.js con Resend
- [x] Crear ForgotPasswordScreen
- [x] Crear ResetPasswordScreen
- [x] Crear ChangePasswordScreen
- [x] Agregar métodos en authService.js (doctores)
- [x] Actualizar LoginDoctor.js
- [x] Agregar rutas en NavegacionAuth.js
- [x] Implementar endpoint change-pin (backend)
- [x] Crear ChangePINScreen
- [x] Agregar método changePIN en authService.js (pacientes)
- [x] Crear ForgotPINScreen
- [x] Agregar botón en LoginPIN.js
- [x] Agregar rutas en NavegacionAuth.js
- [x] Documentación completa

---

## 🎉 Conclusión

Se ha implementado un sistema completo y seguro para cambio y recuperación de contraseñas y PINs, con integración de Resend para envío de emails. Todas las funcionalidades están listas para uso en desarrollo y producción.

**Estado:** ✅ **IMPLEMENTACIÓN COMPLETA**

---

**Documento generado:** 2025-01-01  
**Última actualización:** 2025-01-01

