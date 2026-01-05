# 🔍 Análisis Completo: Recuperación de Contraseñas y PIN

**Fecha:** 2025-01-01  
**Objetivo:** Analizar estado actual y determinar qué implementar/reutilizar

---

## 📊 RESUMEN EJECUTIVO

### ✅ Lo que YA EXISTE (Backend)

1. **Cambio de contraseña para Doctores/Admin** ✅
   - Endpoint: `PUT /api/auth/change-password` (NUEVO, seguro)
   - Requiere autenticación JWT
   - Valida contraseña actual
   - **Estado:** ✅ Implementado y funcional

2. **Recuperación de contraseña para Doctores/Admin** ✅
   - Endpoint: `POST /api/auth/forgot-password` (NUEVO)
   - Endpoint: `POST /api/auth/reset-password` (NUEVO)
   - Tabla: `password_reset_tokens` ✅
   - Servicio de email: `emailService.js` ✅
   - **Estado:** ✅ Implementado (backend completo)

3. **Cambio de PIN para Pacientes** ⚠️
   - **NO EXISTE endpoint específico**
   - El endpoint `setupPIN` puede actualizar PIN si ya existe
   - **Estado:** ⚠️ Funcionalidad parcial (setup puede usarse como update)

4. **Recuperación de PIN para Pacientes** ❌
   - **NO EXISTE**
   - **Estado:** ❌ No implementado

### ❌ Lo que FALTA (Frontend)

1. **UI de "Olvidé mi contraseña" para Doctores/Admin** ❌
   - Existe botón en `LoginDoctor.js` pero solo muestra alerta
   - **Estado:** ❌ No implementado

2. **UI de "Reset de contraseña" para Doctores/Admin** ❌
   - No existe pantalla para reset con token
   - **Estado:** ❌ No implementado

3. **UI de cambio de contraseña para Doctores/Admin** ❌
   - No existe pantalla para cambiar contraseña desde perfil
   - **Estado:** ❌ No implementado

4. **UI de "Olvidé mi PIN" para Pacientes** ❌
   - No existe funcionalidad
   - **Estado:** ❌ No implementado

5. **UI de cambio de PIN para Pacientes** ❌
   - No existe pantalla para cambiar PIN desde perfil
   - **Estado:** ❌ No implementado

---

## 🔍 ANÁLISIS DETALLADO POR FUNCIONALIDAD

### 1. CAMBIO DE CONTRASEÑA (Doctores/Admin)

#### Backend ✅

**Archivos existentes:**
- `api-clinica/controllers/auth.js` - Función `changePassword()` ✅
- `api-clinica/routes/auth.js` - Ruta `PUT /api/auth/change-password` ✅

**Características:**
- ✅ Requiere autenticación JWT
- ✅ Valida contraseña actual
- ✅ Valida fortaleza de nueva contraseña
- ✅ Invalida refresh tokens después del cambio
- ✅ Rate limiting aplicado

**Estado:** ✅ **COMPLETO Y FUNCIONAL**

#### Frontend ❌

**Archivos a revisar:**
- `ClinicaMovil/src/screens/auth/LoginDoctor.js` - Solo tiene login
- `ClinicaMovil/src/api/authService.js` - No tiene método `changePassword()`

**Lo que falta:**
1. Método en `authService.js`:
   ```javascript
   async changePassword(currentPassword, newPassword) {
     // Llamar a PUT /api/auth/change-password
   }
   ```

2. Pantalla `ChangePasswordScreen.js`:
   - Formulario con campos: contraseña actual, nueva contraseña, confirmar nueva
   - Validación de fortaleza
   - Manejo de errores

3. Integración en perfil/configuración:
   - Botón "Cambiar contraseña" en perfil de doctor/admin

**Estado:** ❌ **NO IMPLEMENTADO**

---

### 2. RECUPERACIÓN DE CONTRASEÑA (Doctores/Admin)

#### Backend ✅

**Archivos existentes:**
- `api-clinica/controllers/auth.js` - Funciones `forgotPassword()` y `resetPassword()` ✅
- `api-clinica/routes/auth.js` - Rutas `POST /api/auth/forgot-password` y `POST /api/auth/reset-password` ✅
- `api-clinica/models/PasswordResetToken.js` - Modelo ✅
- `api-clinica/services/emailService.js` - Servicio de email ✅
- `api-clinica/migrations/create-password-reset-tokens.sql` - Migración ✅

**Características:**
- ✅ Genera tokens únicos con expiración (1 hora)
- ✅ Invalida tokens anteriores no usados
- ✅ Envía email con link de recuperación
- ✅ Valida token antes de reset
- ✅ Marca token como usado
- ✅ Invalida sesiones después de reset
- ✅ Rate limiting estricto
- ✅ Prevención de enumeración de emails

**Estado:** ✅ **COMPLETO Y FUNCIONAL**

#### Frontend ❌

**Archivos existentes:**
- `ClinicaMovil/src/screens/auth/LoginDoctor.js` - Tiene función `handleForgotPassword()` pero solo muestra alerta

**Lo que falta:**
1. Pantalla `ForgotPasswordScreen.js`:
   - Formulario con campo de email
   - Validación de email
   - Mensaje de confirmación (sin revelar si email existe)
   - Link a "Volver a login"

2. Pantalla `ResetPasswordScreen.js`:
   - Recibir token de URL (`/reset-password?token=xxx`)
   - Formulario con: nueva contraseña, confirmar contraseña
   - Validación de fortaleza
   - Manejo de errores (token inválido, expirado, etc.)

3. Métodos en `authService.js`:
   ```javascript
   async forgotPassword(email) {
     // Llamar a POST /api/auth/forgot-password
   }
   
   async resetPassword(token, newPassword) {
     // Llamar a POST /api/auth/reset-password
   }
   ```

4. Actualizar `LoginDoctor.js`:
   - Reemplazar `handleForgotPassword()` para navegar a `ForgotPasswordScreen`
   - Agregar link "¿Olvidaste tu contraseña?"

5. Navegación:
   - Agregar rutas en `AuthNavigator.js`

**Estado:** ❌ **NO IMPLEMENTADO**

---

### 3. CAMBIO DE PIN (Pacientes)

#### Backend ⚠️

**Archivos existentes:**
- `api-clinica/controllers/unifiedAuthController.js` - Función `setupPIN()` ✅
- `api-clinica/services/unifiedAuthService.js` - Servicio unificado ✅
- `api-clinica/models/AuthCredential.js` - Modelo unificado ✅

**Análisis del código:**
- El endpoint `POST /api/auth-unified/setup-pin` puede **actualizar** PIN si ya existe
- Verifica si el PIN es el mismo antes de actualizar
- Si es diferente, actualiza el hash
- **NO requiere PIN actual** para cambiar (vulnerabilidad potencial)

**Problema identificado:**
- ⚠️ No valida PIN actual antes de cambiar
- ⚠️ Cualquiera con acceso al dispositivo puede cambiar el PIN
- ⚠️ No hay endpoint específico para "cambiar PIN" que requiera validación

**Recomendación:**
- Crear endpoint `PUT /api/auth-unified/change-pin` que:
  - Requiera autenticación (JWT de paciente)
  - Valide PIN actual
  - Permita cambiar a nuevo PIN
  - O reutilizar `setupPIN` pero agregar validación de PIN actual si ya existe

**Estado:** ⚠️ **FUNCIONALIDAD PARCIAL (insegura)**

#### Frontend ❌

**Archivos a revisar:**
- `ClinicaMovil/src/api/authService.js` - Tiene `setupPIN()` pero no `changePIN()`
- No existe pantalla para cambiar PIN

**Lo que falta:**
1. Método en `authService.js`:
   ```javascript
   async changePIN(currentPin, newPin, deviceId) {
     // Llamar a PUT /api/auth-unified/change-pin (nuevo endpoint)
     // O usar setupPIN si se mejora la seguridad
   }
   ```

2. Pantalla `ChangePINScreen.js`:
   - Formulario con: PIN actual, nuevo PIN, confirmar nuevo PIN
   - Validación de formato (4 dígitos)
   - Validación de PINs débiles
   - Manejo de errores

3. Integración en perfil/configuración:
   - Botón "Cambiar PIN" en perfil de paciente

**Estado:** ❌ **NO IMPLEMENTADO**

---

### 4. RECUPERACIÓN DE PIN (Pacientes)

#### Backend ❌

**Archivos existentes:**
- Ninguno específico para recuperación de PIN

**Análisis:**
- Los pacientes usan PIN de 4 dígitos (muy simple)
- No tienen email asociado directamente (está encriptado)
- El PIN está asociado a `device_id` y `id_paciente`
- **Problema:** ¿Cómo identificar al paciente sin PIN?

**Opciones de diseño:**

**Opción A: Recuperación con datos personales**
- Solicitar: CURP, fecha de nacimiento, número de celular
- Validar datos encriptados
- Generar token de recuperación
- Permitir reset de PIN con token
- **Ventaja:** Seguro, no requiere email
- **Desventaja:** Más complejo, requiere validación de datos encriptados

**Opción B: Recuperación asistida por personal**
- Paciente contacta a clínica
- Personal valida identidad
- Personal resetea PIN desde admin
- **Ventaja:** Simple, seguro
- **Desventaja:** Requiere intervención humana

**Opción C: Recuperación con SMS (si tienen celular)**
- Solicitar número de celular
- Enviar código OTP por SMS
- Validar OTP y permitir reset
- **Ventaja:** Automático, seguro
- **Desventaja:** Requiere servicio SMS, número debe estar desencriptado para envío

**Recomendación:** 
- **Fase 1:** Implementar Opción B (recuperación asistida) - más simple y segura
- **Fase 2:** Implementar Opción A si hay necesidad de automatización

**Estado:** ❌ **NO IMPLEMENTADO**

#### Frontend ❌

**No existe funcionalidad**

**Lo que falta:**
1. Pantalla `ForgotPINScreen.js`:
   - Formulario con datos personales (CURP, fecha nacimiento, celular)
   - O botón "Contactar a clínica"
   - Mensaje informativo

2. Pantalla `ResetPINScreen.js` (si se implementa Opción A):
   - Recibir token de URL
   - Formulario para nuevo PIN
   - Validación

3. Métodos en `authService.js`:
   ```javascript
   async forgotPIN(curp, fechaNacimiento, numeroCelular) {
     // Llamar a POST /api/auth-unified/forgot-pin
   }
   
   async resetPIN(token, newPin, deviceId) {
     // Llamar a POST /api/auth-unified/reset-pin
   }
   ```

**Estado:** ❌ **NO IMPLEMENTADO**

---

## 📁 ARCHIVOS A REUTILIZAR

### Backend ✅

1. **`api-clinica/services/emailService.js`** ✅
   - Ya tiene templates HTML
   - Ya tiene lógica de envío (simulado en dev)
   - **Reutilizable:** ✅ SÍ (para recuperación de contraseña)

2. **`api-clinica/models/PasswordResetToken.js`** ✅
   - Modelo completo con validaciones
   - Métodos `isValid()`, `markAsUsed()`
   - **Reutilizable:** ⚠️ Solo para contraseñas (no PINs)
   - **Recomendación:** Crear modelo similar `PINResetToken` o tabla unificada

3. **`api-clinica/controllers/auth.js`** ✅
   - Funciones `forgotPassword()` y `resetPassword()` bien implementadas
   - **Reutilizable:** ⚠️ Solo para contraseñas
   - **Recomendación:** Crear funciones similares para PIN

4. **`api-clinica/services/unifiedAuthService.js`** ✅
   - Servicio unificado de autenticación
   - Maneja PIN, password, biometric
   - **Reutilizable:** ✅ SÍ (para validar PIN actual en cambio)

### Frontend ⚠️

1. **`ClinicaMovil/src/api/authService.js`** ⚠️
   - Tiene estructura de servicios
   - Tiene `doctorAuthService` y `pacienteAuthService`
   - **Reutilizable:** ✅ SÍ (agregar métodos nuevos)

2. **`ClinicaMovil/src/screens/auth/LoginDoctor.js`** ⚠️
   - Tiene función `handleForgotPassword()` pero solo alerta
   - **Reutilizable:** ⚠️ Necesita modificación

3. **Componentes de formulario existentes** ✅
   - Buscar componentes de input, botones, validación
   - **Reutilizable:** ✅ SÍ (si existen)

---

## 🎯 PLAN DE IMPLEMENTACIÓN RECOMENDADO

### FASE 1: Completar Frontend de Recuperación de Contraseña (Doctores/Admin)

**Prioridad:** 🔴 ALTA

**Tareas:**
1. Crear `ForgotPasswordScreen.js`
2. Crear `ResetPasswordScreen.js`
3. Agregar métodos en `authService.js`
4. Actualizar `LoginDoctor.js`
5. Agregar rutas en navegación

**Archivos a crear:**
- `ClinicaMovil/src/screens/auth/ForgotPasswordScreen.js` (nuevo)
- `ClinicaMovil/src/screens/auth/ResetPasswordScreen.js` (nuevo)

**Archivos a modificar:**
- `ClinicaMovil/src/api/authService.js` (agregar métodos)
- `ClinicaMovil/src/screens/auth/LoginDoctor.js` (actualizar función)
- `ClinicaMovil/src/navigation/AuthNavigator.js` (agregar rutas)

**Reutilización:**
- ✅ Usar `emailService.js` del backend (ya existe)
- ✅ Usar endpoints existentes `/api/auth/forgot-password` y `/api/auth/reset-password`
- ✅ Reutilizar componentes de formulario existentes

---

### FASE 2: Implementar Cambio de Contraseña en Frontend (Doctores/Admin)

**Prioridad:** 🟡 MEDIA

**Tareas:**
1. Crear `ChangePasswordScreen.js`
2. Agregar método `changePassword()` en `authService.js`
3. Integrar en pantalla de perfil/configuración

**Archivos a crear:**
- `ClinicaMovil/src/screens/settings/ChangePasswordScreen.js` (nuevo)

**Archivos a modificar:**
- `ClinicaMovil/src/api/authService.js` (agregar método)
- Pantalla de perfil/configuración (agregar botón)

**Reutilización:**
- ✅ Usar endpoint existente `/api/auth/change-password`
- ✅ Reutilizar componentes de formulario

---

### FASE 3: Mejorar Seguridad de Cambio de PIN (Pacientes)

**Prioridad:** 🟡 MEDIA

**Tareas:**
1. Crear endpoint `PUT /api/auth-unified/change-pin` que requiera:
   - Autenticación JWT
   - Validación de PIN actual
   - Nuevo PIN
2. O mejorar `setupPIN` para validar PIN actual si ya existe

**Archivos a crear:**
- Ninguno (modificar existente)

**Archivos a modificar:**
- `api-clinica/controllers/unifiedAuthController.js` (agregar función `changePIN`)
- `api-clinica/routes/unifiedAuth.js` (agregar ruta)

**Reutilización:**
- ✅ Usar `unifiedAuthService.js` para validar PIN actual
- ✅ Reutilizar lógica de validación de PINs débiles

---

### FASE 4: Implementar Cambio de PIN en Frontend (Pacientes)

**Prioridad:** 🟢 BAJA

**Tareas:**
1. Crear `ChangePINScreen.js`
2. Agregar método `changePIN()` en `authService.js`
3. Integrar en pantalla de perfil/configuración

**Archivos a crear:**
- `ClinicaMovil/src/screens/settings/ChangePINScreen.js` (nuevo)

**Archivos a modificar:**
- `ClinicaMovil/src/api/authService.js` (agregar método)
- Pantalla de perfil de paciente (agregar botón)

**Reutilización:**
- ✅ Usar endpoint de Fase 3
- ✅ Reutilizar componentes de formulario

---

### FASE 5: Implementar Recuperación de PIN (Pacientes)

**Prioridad:** 🟢 BAJA (Opción B: Asistida)

**Tareas:**
1. Crear endpoint para reset de PIN por admin
2. Crear pantalla informativa "Olvidé mi PIN"
3. Agregar funcionalidad en admin para resetear PIN

**Archivos a crear:**
- `ClinicaMovil/src/screens/auth/ForgotPINScreen.js` (nuevo, informativo)
- `api-clinica/controllers/unifiedAuthController.js` (función `resetPINByAdmin`)

**Archivos a modificar:**
- `api-clinica/routes/unifiedAuth.js` (agregar ruta protegida)
- Pantalla de admin (agregar opción de resetear PIN de paciente)

**Reutilización:**
- ✅ Usar `unifiedAuthService.js` para resetear PIN
- ✅ Reutilizar lógica de validación

---

## 📋 CHECKLIST DE ARCHIVOS

### Backend

| Archivo | Estado | Acción |
|---------|--------|--------|
| `api-clinica/controllers/auth.js` | ✅ Completo | Reutilizar |
| `api-clinica/routes/auth.js` | ✅ Completo | Reutilizar |
| `api-clinica/models/PasswordResetToken.js` | ✅ Completo | Reutilizar |
| `api-clinica/services/emailService.js` | ✅ Completo | Reutilizar |
| `api-clinica/controllers/unifiedAuthController.js` | ⚠️ Parcial | Modificar (agregar `changePIN`) |
| `api-clinica/routes/unifiedAuth.js` | ⚠️ Parcial | Modificar (agregar ruta) |
| `api-clinica/services/unifiedAuthService.js` | ✅ Completo | Reutilizar |

### Frontend

| Archivo | Estado | Acción |
|---------|--------|--------|
| `ClinicaMovil/src/api/authService.js` | ⚠️ Parcial | Modificar (agregar métodos) |
| `ClinicaMovil/src/screens/auth/LoginDoctor.js` | ⚠️ Parcial | Modificar (actualizar función) |
| `ClinicaMovil/src/screens/auth/ForgotPasswordScreen.js` | ❌ No existe | Crear |
| `ClinicaMovil/src/screens/auth/ResetPasswordScreen.js` | ❌ No existe | Crear |
| `ClinicaMovil/src/screens/settings/ChangePasswordScreen.js` | ❌ No existe | Crear |
| `ClinicaMovil/src/screens/auth/ForgotPINScreen.js` | ❌ No existe | Crear |
| `ClinicaMovil/src/screens/settings/ChangePINScreen.js` | ❌ No existe | Crear |
| `ClinicaMovil/src/navigation/AuthNavigator.js` | ⚠️ Desconocido | Modificar (agregar rutas) |

---

## 🎯 CONCLUSIÓN

### Lo que SÍ podemos reutilizar:

1. ✅ **Backend completo de recuperación de contraseña** (Doctores/Admin)
   - Endpoints, modelos, servicios, email
   - Solo falta frontend

2. ✅ **Estructura de servicios** (Frontend)
   - `authService.js` tiene buena estructura
   - Solo agregar métodos nuevos

3. ✅ **Lógica de validación** (Backend)
   - Validación de PINs débiles
   - Validación de fortaleza de contraseña
   - Rate limiting

### Lo que NO existe y debemos crear:

1. ❌ **Frontend completo de recuperación de contraseña**
   - Pantallas `ForgotPasswordScreen` y `ResetPasswordScreen`
   - Métodos en `authService.js`

2. ❌ **Frontend de cambio de contraseña**
   - Pantalla `ChangePasswordScreen`
   - Método en `authService.js`

3. ⚠️ **Backend seguro de cambio de PIN**
   - Endpoint que valide PIN actual
   - O mejorar `setupPIN` existente

4. ❌ **Frontend de cambio de PIN**
   - Pantalla `ChangePINScreen`
   - Método en `authService.js`

5. ❌ **Recuperación de PIN**
   - Backend y frontend completos
   - Recomendación: Opción B (asistida por personal)

### Priorización recomendada:

1. **🔴 ALTA:** Frontend de recuperación de contraseña (Doctores/Admin)
2. **🟡 MEDIA:** Frontend de cambio de contraseña (Doctores/Admin)
3. **🟡 MEDIA:** Backend seguro de cambio de PIN (Pacientes)
4. **🟢 BAJA:** Frontend de cambio de PIN (Pacientes)
5. **🟢 BAJA:** Recuperación de PIN (Pacientes)

---

**Documento generado:** 2025-01-01  
**Última actualización:** 2025-01-01

