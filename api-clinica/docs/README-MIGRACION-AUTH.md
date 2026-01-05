# 🔐 GUÍA DE MIGRACIÓN: Sistema de Autenticación Unificado

## 📋 Resumen

Se ha implementado un nuevo sistema unificado de autenticación que reemplaza las múltiples tablas y controladores separados con una solución más simple, escalable y mantenible.

### Cambios Principales

- ✅ **Nueva tabla**: `auth_credentials` - Una sola tabla para todos los métodos de autenticación
- ✅ **Nuevo servicio**: `UnifiedAuthService` - Lógica centralizada
- ✅ **Nuevos controladores**: `unifiedAuthController.js` - Endpoints unificados
- ✅ **Nuevas rutas**: `/api/auth-unified/*` - Sistema nuevo (legacy mantenido)

---

## 🚀 Pasos de Migración

### Paso 1: Crear la tabla en la base de datos

Ejecutar el script SQL:

```bash
mysql -u [usuario] -p [nombre_db] < migrations/create-auth-credentials-table.sql
```

O ejecutar manualmente:

```sql
SOURCE migrations/create-auth-credentials-table.sql;
```

### Paso 2: Ejecutar migración de datos

Migrar datos existentes a la nueva tabla:

```bash
cd api-clinica
node scripts/migrar-auth-credentials.js
```

Este script:
- Migra passwords de Doctores/Admins
- Migra PINs de Pacientes
- Migra credenciales biométricas de Pacientes

### Paso 3: Verificar migración

```bash
# Verificar datos migrados
mysql -u [usuario] -p [nombre_db] -e "SELECT user_type, auth_method, COUNT(*) as total FROM auth_credentials WHERE activo = 1 GROUP BY user_type, auth_method;"
```

### Paso 4: Probar nuevos endpoints

**Login Doctor/Admin:**
```bash
POST /api/auth-unified/login-doctor-admin
{
  "email": "doctor@example.com",
  "password": "password123"
}
```

**Login Paciente (PIN):**
```bash
POST /api/auth-unified/login-paciente
{
  "id_paciente": 1,
  "pin": "1234",
  "device_id": "device_xxx"
}
```

**Login Paciente (Biométrico):**
```bash
POST /api/auth-unified/login-paciente
{
  "id_paciente": 1,
  "signature": "base64_signature",
  "challenge": "challenge_string",
  "credential_id": "device_xxx"
}
```

---

## 🔄 Compatibilidad hacia Atrás

Los endpoints legacy siguen funcionando:

- ✅ `/api/auth/login` - Login Doctor/Admin (legacy)
- ✅ `/api/paciente-auth/login-pin` - Login PIN (legacy)
- ✅ `/api/paciente-auth/login-biometric` - Login biométrico (legacy)

**Recomendación**: Migrar gradualmente al nuevo sistema. Los endpoints legacy pueden desactivarse después de un período de prueba.

---

## 📊 Estructura Nueva vs Antigua

### Antes (4 tablas):
```
Usuario (password_hash)
PacienteAuth (device_id, failed_attempts, etc.)
PacienteAuthPIN (pin_hash, pin_salt)
PacienteAuthBiometric (public_key, credential_id)
```

### Ahora (1 tabla):
```
auth_credentials (
  user_type, user_id, auth_method,
  credential_value, device_id,
  failed_attempts, locked_until, etc.
)
```

---

## 🔐 Nuevos Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth-unified/login-doctor-admin` | Login Doctor/Admin |
| POST | `/api/auth-unified/login-paciente` | Login Paciente (PIN/biométrico) |

### Configuración (solo desarrollo)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth-unified/setup-pin` | Configurar PIN |
| POST | `/api/auth-unified/setup-biometric` | Configurar biometría |
| POST | `/api/auth-unified/setup-password` | Configurar password |

### Gestión (protegido)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/auth-unified/credentials/:userType/:userId` | Obtener credenciales |
| DELETE | `/api/auth-unified/credentials/:credentialId` | Eliminar credencial |

---

## ⚙️ Configuración del Frontend

### Actualizar servicios de autenticación

**Para Doctores/Admins:**
```javascript
// Cambiar de:
POST /api/auth/login

// A:
POST /api/auth-unified/login-doctor-admin
```

**Para Pacientes:**
```javascript
// Cambiar de:
POST /api/paciente-auth/login-pin
POST /api/paciente-auth/login-biometric

// A:
POST /api/auth-unified/login-paciente
// Con body que incluye pin O signature+challenge
```

---

## 🧪 Testing

### Pruebas Recomendadas

1. ✅ Login Doctor con nuevo endpoint
2. ✅ Login Admin con nuevo endpoint
3. ✅ Login Paciente con PIN (nuevo endpoint)
4. ✅ Login Paciente con biométrico (nuevo endpoint)
5. ✅ Verificar que endpoints legacy siguen funcionando
6. ✅ Validar unicidad de PIN
7. ✅ Validar bloqueo de cuenta tras intentos fallidos
8. ✅ Verificar migración de datos (todos los usuarios pueden autenticarse)

---

## 📝 Notas Importantes

### Validaciones Específicas

- **PIN**: 4 dígitos, unicidad global entre pacientes, validación de PINs débiles
- **Biométrico**: Verificación RSA, validación de challenge
- **Password**: Mínimo 6 caracteres para Doctor/Admin

### Bloqueo de Cuenta

Actualmente **DESHABILITADO** para pruebas. Para habilitarlo:

1. Editar `services/unifiedAuthService.js`
2. Descomentar lógica de bloqueo en `handleFailedAttempt()`
3. Descomentar verificación de bloqueo en `authenticate()`

### Índices de Rendimiento

La tabla incluye índices optimizados para:
- Búsquedas por usuario y método
- Búsquedas por device_id
- Búsquedas de cuentas bloqueadas
- Búsquedas de credenciales primarias

---

## 🐛 Troubleshooting

### Error: "Tabla auth_credentials no existe"
**Solución**: Ejecutar el script SQL de creación de tabla primero.

### Error: "Credencial no encontrada"
**Solución**: Verificar que los datos fueron migrados correctamente. Re-ejecutar script de migración.

### Error: "PIN ya está en uso"
**Solución**: Esto es correcto - los PINs deben ser únicos globalmente entre pacientes.

### Los endpoints legacy no funcionan
**Solución**: Verificar que las rutas legacy están registradas en `index.js`. Deben estar antes de las nuevas rutas.

---

## 📚 Documentación Adicional

- Ver `PROPUESTA-MEJORA-AUTENTICACION.md` para diseño completo
- Ver `services/unifiedAuthService.js` para documentación del servicio
- Ver `controllers/unifiedAuthController.js` para ejemplos de uso

---

## ✅ Checklist de Migración

- [ ] Tabla `auth_credentials` creada
- [ ] Datos migrados exitosamente
- [ ] Endpoints nuevos probados
- [ ] Frontend actualizado (opcional - puede usar legacy)
- [ ] Endpoints legacy verificados
- [ ] Logs revisados para errores
- [ ] Performance verificado
- [ ] Documentación del equipo actualizada

---

**Fecha de implementación**: $(date)
**Versión**: 1.0.0



