# 🗑️ TABLAS ELIMINADAS - REPORTE

## 📋 Resumen

Se han eliminado **4 tablas legacy** de autenticación que fueron reemplazadas por el sistema unificado `auth_credentials`.

---

## ✅ Tablas Eliminadas

### 1. `paciente_auth`
- **Propósito**: Dispositivos autorizados para pacientes
- **Reemplazada por**: `auth_credentials` (campos `device_id`, `device_name`, `device_type`)
- **Estado**: ✅ Eliminada

### 2. `paciente_auth_pin`
- **Propósito**: Almacenamiento de PINs hasheados
- **Reemplazada por**: `auth_credentials` (campo `credential_value` con `auth_method='pin'`)
- **Estado**: ✅ Eliminada

### 3. `paciente_auth_biometric`
- **Propósito**: Claves públicas biométricas
- **Reemplazada por**: `auth_credentials` (campo `credential_value` con `auth_method='biometric'`)
- **Estado**: ✅ Eliminada

### 4. `paciente_auth_log`
- **Propósito**: Logs de auditoría de autenticación
- **Reemplazada por**: Sistema de logging puede implementarse usando `last_used` y logs de aplicación
- **Estado**: ✅ Eliminada

---

## 🔄 Código Actualizado

### Modelos
- ✅ `api-clinica/models/associations.js` - Asociaciones comentadas
- ✅ `api-clinica/models/index.js` - Exports comentados
- ⚠️ `api-clinica/models/PacienteAuth.js` - Modelo mantiene definición (solo para referencia)

### Controladores
- ⚠️ `api-clinica/controllers/pacienteAuth.js` - Marcado como DEPRECATED
  - Imports comentados
  - Código funcional pero no puede ejecutarse (tablas eliminadas)
  - TODO: Migrar a `unifiedAuthController.js`

### Rutas
- ⚠️ `api-clinica/routes/pacienteAuth.js` - Rutas deshabilitadas
  - Todas las rutas comentadas
  - Retorna 410 (Gone) con mensaje informativo
  - Indica migración a `/api/auth-unified/*`

---

## 📊 Estado de la Base de Datos

### Tablas de Autenticación Restantes
- ✅ `auth_credentials` - Sistema unificado (NUEVO)
- ❌ `paciente_auth` - ELIMINADA
- ❌ `paciente_auth_pin` - ELIMINADA
- ❌ `paciente_auth_biometric` - ELIMINADA
- ❌ `paciente_auth_log` - ELIMINADA

---

## 🚨 Acciones Requeridas

### Backend
1. ✅ **Completado**: Tablas eliminadas de la BD
2. ✅ **Completado**: Asociaciones comentadas
3. ✅ **Completado**: Rutas legacy deshabilitadas
4. ⚠️ **Pendiente**: Migrar `pacienteAuth.js` controller (opcional, ya no se usa)

### Frontend
1. ⚠️ **URGENTE**: Migrar llamadas de `/api/paciente-auth/*` a `/api/auth-unified/*`
   - `ClinicaMovil/src/api/authService.js` usa rutas legacy
   - Actualizar endpoints:
     - `/api/paciente-auth/setup-pin` → `/api/auth-unified/setup-pin`
     - `/api/paciente-auth/login-pin` → `/api/auth-unified/login-paciente-unified`
     - `/api/paciente-auth/setup-biometric` → `/api/auth-unified/setup-biometric`
     - `/api/paciente-auth/login-biometric` → `/api/auth-unified/login-paciente-unified`

---

## 📝 Endpoints de Migración

### Nuevos Endpoints (usar estos)

#### Autenticación de Pacientes
- `POST /api/auth-unified/login-paciente-unified` - Login con PIN o biométrica
- `POST /api/auth-unified/setup-pin` - Configurar PIN
- `POST /api/auth-unified/setup-biometric` - Configurar biométrica

#### Autenticación de Doctores/Admins
- `POST /api/auth-unified/login-doctor-admin` - Login con password

#### Gestión de Credenciales
- `GET /api/auth-unified/credentials` - Ver credenciales del usuario
- `DELETE /api/auth-unified/credentials/:id` - Eliminar credencial
- `PUT /api/auth-unified/update-password` - Actualizar password

---

## 🔍 Verificación

Ejecutar para verificar tablas restantes:
```bash
node scripts/eliminar-tablas-legacy-auth.js
```

Resultado esperado:
- Solo `auth_credentials` debe aparecer en tablas de autenticación

---

## 📅 Fecha de Eliminación

**2025-11-03** - Todas las tablas legacy fueron eliminadas exitosamente.

---

## ⚠️ NOTA IMPORTANTE

El frontend **debe actualizarse inmediatamente** para usar las nuevas rutas, ya que:
- Las rutas legacy retornan 410 (Gone)
- Las tablas legacy ya no existen
- El sistema unificado es la única forma de autenticación disponible

---

**Estado**: ✅ Eliminación completada exitosamente



