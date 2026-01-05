# 🔐 PROPUESTA DE MEJORA: SISTEMA DE AUTENTICACIÓN UNIFICADO

## 📊 ANÁLISIS DE LA SITUACIÓN ACTUAL

### Problemas Identificados

1. **Redundancia de Datos**
   - Los pacientes tienen registro en `Usuario` con email/password que **NUNCA se usan**
   - Los pacientes solo usan PIN/biometría desde `PacienteAuth`

2. **Complejidad Estructural**
   - 4 tablas relacionadas para autenticación de pacientes
   - Sistema completamente separado por tipo de usuario
   - Device ID almacenado en múltiples lugares

3. **Inconsistencia**
   - Doctores/Admin: `Usuario.email` + `Usuario.password_hash`
   - Pacientes: Sistema completamente diferente con tablas separadas

4. **Mantenibilidad**
   - Código duplicado en controladores
   - Difícil agregar nuevos métodos de autenticación
   - Lógica de seguridad dispersa

---

## 🎯 SOLUCIÓN PROPUESTA: Modelo Unificado

### Arquitectura Nueva

#### 1. **Tabla `auth_credentials` (Reemplaza todo el sistema actual)**

```sql
CREATE TABLE `auth_credentials` (
  `id_credential` INT NOT NULL AUTO_INCREMENT,
  `user_type` ENUM('Usuario', 'Paciente', 'Doctor', 'Admin') NOT NULL,
  `user_id` INT NOT NULL, -- FK flexible a cualquier tipo de usuario
  `auth_method` ENUM('password', 'pin', 'biometric', 'totp') NOT NULL,
  `credential_value` TEXT NOT NULL, -- Hash/Hash PIN/Public Key según método
  `credential_salt` VARCHAR(64) NULL, -- Solo para PIN/password
  `device_id` VARCHAR(128) NULL, -- Para PIN/biometric
  `device_name` VARCHAR(100) NULL,
  `device_type` ENUM('mobile', 'tablet', 'web', 'desktop') NULL,
  `credential_metadata` JSON NULL, -- Para datos adicionales (biometric_type, etc.)
  `is_primary` BOOLEAN NOT NULL DEFAULT FALSE,
  `failed_attempts` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` DATETIME NULL,
  `last_used` DATETIME NULL,
  `expires_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id_credential`),
  INDEX `idx_user_lookup` (`user_type`, `user_id`, `auth_method`),
  INDEX `idx_device_lookup` (`device_id`, `activo`),
  INDEX `idx_credential_value` (`credential_value`(255))
) ENGINE=InnoDB;
```

**Ventajas:**
- ✅ Una sola tabla para todos los métodos de autenticación
- ✅ Soporte para múltiples métodos por usuario
- ✅ Flexible para agregar nuevos métodos (TOTP, OAuth, etc.)
- ✅ Normalizado y eficiente
- ✅ Elimina redundancia de `Usuario` para pacientes

#### 2. **Eliminar Tablas Obsoletas**
- ❌ `paciente_auth` → Reemplazada por `auth_credentials`
- ❌ `paciente_auth_pin` → Reemplazada por `auth_credentials`
- ❌ `paciente_auth_biometric` → Reemplazada por `auth_credentials`
- ❌ `usuarios.password_hash` → Movido a `auth_credentials` (opcional, para backward compatibility)

#### 3. **Simplificar Modelo Usuario**

**Opción A (Recomendada): Separar Usuario solo para Doctores/Admin**
```sql
-- Solo para roles que usan email/password
CREATE TABLE `system_users` (
  `id_user` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `rol` ENUM('Doctor', 'Admin') NOT NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ultimo_login` DATETIME NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (`id_user`)
) ENGINE=InnoDB;
```

**Opción B (Menos disruptiva): Mantener Usuario pero hacerlo opcional**
- `Usuario` se vuelve opcional para pacientes
- Solo se crea si realmente se necesita email/password
- Para pacientes, se autentica directamente con `auth_credentials`

---

## 🔄 MIGRACIÓN DE DATOS

### Paso 1: Migrar Doctores/Admin
```sql
-- Migrar passwords existentes de Usuario a auth_credentials
INSERT INTO auth_credentials (
  user_type, user_id, auth_method, 
  credential_value, credential_salt,
  is_primary, created_at, activo
)
SELECT 
  'Usuario', id_usuario, 'password',
  password_hash, NULL,
  TRUE, fecha_creacion, activo
FROM usuarios
WHERE rol IN ('Doctor', 'Admin');
```

### Paso 2: Migrar PINs de Pacientes
```sql
INSERT INTO auth_credentials (
  user_type, user_id, auth_method,
  credential_value, credential_salt, device_id,
  is_primary, failed_attempts, locked_until,
  created_at, activo
)
SELECT 
  'Paciente', pa.id_paciente, 'pin',
  pap.pin_hash, pap.pin_salt, pa.device_id,
  pa.is_primary_device, pa.failed_attempts, pa.locked_until,
  pap.created_at, pap.activo AND pa.activo
FROM paciente_auth_pin pap
JOIN paciente_auth pa ON pap.id_auth = pa.id_auth
WHERE pap.activo = TRUE AND pa.activo = TRUE;
```

### Paso 3: Migrar Biométricas
```sql
INSERT INTO auth_credentials (
  user_type, user_id, auth_method,
  credential_value, device_id, credential_metadata,
  is_primary, last_used, created_at, activo
)
SELECT 
  'Paciente', pa.id_paciente, 'biometric',
  pab.public_key, pab.credential_id,
  JSON_OBJECT('biometric_type', pab.biometric_type),
  pa.is_primary_device, pab.last_used,
  pab.created_at, pab.activo AND pa.activo
FROM paciente_auth_biometric pab
JOIN paciente_auth pa ON pab.id_auth = pa.id_auth
WHERE pab.activo = TRUE AND pa.activo = TRUE;
```

---

## 💻 IMPLEMENTACIÓN DEL CÓDIGO

### Nuevo Modelo Sequelize

```javascript
// models/AuthCredential.js
const AuthCredential = sequelize.define('AuthCredential', {
  id_credential: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_type: {
    type: DataTypes.ENUM('Usuario', 'Paciente', 'Doctor', 'Admin'),
    allowNull: false
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  auth_method: {
    type: DataTypes.ENUM('password', 'pin', 'biometric', 'totp'),
    allowNull: false
  },
  credential_value: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  credential_salt: DataTypes.STRING(64),
  device_id: DataTypes.STRING(128),
  device_name: DataTypes.STRING(100),
  device_type: DataTypes.ENUM('mobile', 'tablet', 'web', 'desktop'),
  credential_metadata: DataTypes.JSON,
  is_primary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  failed_attempts: {
    type: DataTypes.SMALLINT.UNSIGNED,
    defaultValue: 0
  },
  locked_until: DataTypes.DATE,
  last_used: DataTypes.DATE,
  expires_at: DataTypes.DATE,
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'auth_credentials',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['user_type', 'user_id', 'auth_method'] },
    { fields: ['device_id', 'activo'] },
    { fields: ['credential_value'], length: 255 }
  ]
});
```

### Servicio de Autenticación Unificado

```javascript
// services/authService.js
export class UnifiedAuthService {
  
  // Login unificado - detecta automáticamente el método
  static async authenticate(userType, userId, authData) {
    const { method, credential, deviceId } = authData;
    
    // Buscar credencial activa
    const authRecord = await AuthCredential.findOne({
      where: {
        user_type: userType,
        user_id: userId,
        auth_method: method,
        device_id: deviceId || { [Op.is]: null },
        activo: true
      }
    });
    
    if (!authRecord) {
      throw new Error('Credencial no encontrada');
    }
    
    // Verificar bloqueo
    if (authRecord.locked_until && new Date() < authRecord.locked_until) {
      throw new Error('Cuenta bloqueada');
    }
    
    // Validar según método
    let isValid = false;
    switch (method) {
      case 'password':
        isValid = await bcrypt.compare(credential, authRecord.credential_value);
        break;
      case 'pin':
        isValid = await bcrypt.compare(credential, authRecord.credential_value);
        break;
      case 'biometric':
        isValid = await this.verifyBiometricSignature(credential, authRecord);
        break;
    }
    
    if (!isValid) {
      await this.handleFailedAttempt(authRecord);
      throw new Error('Credencial inválida');
    }
    
    // Actualizar último uso
    await authRecord.update({
      last_used: new Date(),
      failed_attempts: 0,
      locked_until: null
    });
    
    return this.generateToken(userType, userId);
  }
  
  // Setup de credenciales
  static async setupCredential(userType, userId, method, credential, options = {}) {
    // Validaciones según método
    // Crear registro en auth_credentials
    // Retornar resultado
  }
}
```

### Controladores Simplificados

```javascript
// controllers/unifiedAuth.js

// Login para Doctor/Admin (email/password)
export const loginDoctorAdmin = async (req, res) => {
  const { email, password } = req.body;
  
  // Buscar usuario
  const user = await SystemUser.findOne({ where: { email, activo: true } });
  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  
  // Autenticar usando servicio unificado
  const result = await UnifiedAuthService.authenticate(
    user.rol,
    user.id_user,
    { method: 'password', credential: password }
  );
  
  res.json(result);
};

// Login para Paciente (PIN o biométrico)
export const loginPaciente = async (req, res) => {
  const { id_paciente, pin, device_id, signature, challenge, credential_id } = req.body;
  
  let method, credential;
  
  if (pin) {
    method = 'pin';
    credential = pin;
  } else if (signature) {
    method = 'biometric';
    credential = { signature, challenge, credential_id };
  } else {
    return res.status(400).json({ error: 'Método de autenticación requerido' });
  }
  
  const result = await UnifiedAuthService.authenticate(
    'Paciente',
    id_paciente,
    { method, credential, device_id }
  );
  
  res.json(result);
};
```

---

## ✅ BENEFICIOS DE LA SOLUCIÓN

### 1. **Simplificación**
- ✅ De 4 tablas a 1 tabla unificada
- ✅ Código más simple y mantenible
- ✅ Menos complejidad en consultas

### 2. **Escalabilidad**
- ✅ Fácil agregar nuevos métodos (TOTP, OAuth, etc.)
- ✅ Soporte para múltiples dispositivos por usuario
- ✅ Preparado para autenticación multi-factor

### 3. **Normalización**
- ✅ Un solo sistema para todos los tipos de usuarios
- ✅ Consistencia en la estructura de datos
- ✅ Menos redundancia

### 4. **Seguridad**
- ✅ Rate limiting unificado
- ✅ Bloqueo de cuenta centralizado
- ✅ Auditoría simplificada

### 5. **Mantenibilidad**
- ✅ Un solo lugar para lógica de autenticación
- ✅ Más fácil de testear
- ✅ Documentación más clara

---

## 🚀 PLAN DE MIGRACIÓN

### Fase 1: Preparación (Sin impacto)
1. Crear nueva tabla `auth_credentials`
2. Crear modelos y servicios nuevos
3. Escribir tests unitarios

### Fase 2: Migración de Datos
1. Migrar datos existentes (scripts SQL)
2. Validar integridad de datos migrados
3. Verificar que todos los usuarios pueden autenticarse

### Fase 3: Actualización de Código
1. Actualizar controladores para usar nuevo servicio
2. Actualizar frontend para usar nuevas rutas (si es necesario)
3. Mantener endpoints antiguos como deprecados

### Fase 4: Limpieza
1. Eliminar tablas obsoletas (después de período de prueba)
2. Eliminar código legacy
3. Actualizar documentación

---

## 📝 CONSIDERACIONES

### Compatibilidad hacia atrás
- Mantener endpoints antiguos activos durante transición
- Logs de deprecación para identificar uso legacy
- Período de gracia antes de eliminar código antiguo

### Validaciones Específicas
- PIN: 4 dígitos, unicidad global, validación de PINs débiles
- Biometric: Verificación de firma RSA, validación de challenge
- Password: Longitud mínima, complejidad para Admin

### Índices de Rendimiento
- `(user_type, user_id, auth_method)` - Para búsquedas rápidas
- `(device_id, activo)` - Para lookup por dispositivo
- `(credential_value)` - Para verificación de unicidad PIN

---

## 🎯 CONCLUSIÓN

Esta solución:
- ✅ **Simplifica** enormemente la arquitectura
- ✅ **Normaliza** el sistema de autenticación
- ✅ **Escala** para futuros métodos de autenticación
- ✅ **Reduce** redundancia y complejidad
- ✅ **Mejora** mantenibilidad y testabilidad

**Próximo paso:** Revisar esta propuesta y decidir si procedemos con la implementación.



