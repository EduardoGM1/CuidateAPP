# 📊 RESUMEN DE MODIFICACIONES EN LA BASE DE DATOS

## 🔄 Proceso Realizado

1. **Eliminación completa** de todas las tablas existentes (23 tablas)
2. **Recreación** de todas las tablas usando Sequelize sync
3. **Nueva tabla agregada**: `auth_credentials` (sistema unificado de autenticación)
4. **Población inicial** de datos maestros

---

## ✨ CAMBIOS PRINCIPALES

### 1. NUEVA TABLA: `auth_credentials`

**Propósito**: Sistema unificado de autenticación que reemplaza las tablas separadas

**Estructura**:
```sql
auth_credentials (
  id_credential INT PRIMARY KEY AUTO_INCREMENT,
  user_type ENUM('Usuario', 'Paciente', 'Doctor', 'Admin'),
  user_id INT NOT NULL,
  auth_method ENUM('password', 'pin', 'biometric', 'totp'),
  credential_value TEXT,              -- Hash/PIN hash/Public key
  credential_salt VARCHAR(64),        -- Para PINs legacy
  device_id VARCHAR(128),             -- ID del dispositivo
  device_name VARCHAR(100),
  device_type ENUM('mobile', 'tablet', 'web', 'desktop'),
  credential_metadata JSON,           -- Datos adicionales (biometric_type, etc.)
  is_primary BOOLEAN,
  failed_attempts SMALLINT UNSIGNED,
  locked_until DATETIME,
  last_used DATETIME,
  expires_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME,
  activo BOOLEAN
)
```

**Índices optimizados**:
- `idx_user_lookup`: Búsqueda por usuario y método
- `idx_device_lookup`: Búsqueda por dispositivo
- `idx_locked_until`: Cuentas bloqueadas
- `idx_primary_credential`: Credenciales primarias

**Ventajas**:
- ✅ Una sola tabla para todos los métodos de autenticación
- ✅ Soporta múltiples métodos por usuario
- ✅ Escalable para agregar TOTP, OAuth, etc.
- ✅ Normalizado y consistente

---

### 2. TABLAS LEGACY MANTENIDAS (para compatibilidad)

Aunque se creó `auth_credentials`, las siguientes tablas siguen existiendo para compatibilidad hacia atrás:

- ✅ `paciente_auth` - Dispositivos autorizados (legacy)
- ✅ `paciente_auth_pin` - PINs de pacientes (legacy)
- ✅ `paciente_auth_biometric` - Biométricas (legacy)
- ✅ `paciente_auth_log` - Logs de auditoría

**Nota**: Estas tablas pueden eliminarse en el futuro una vez que el sistema unificado esté completamente migrado.

---

### 3. TABLAS RECREADAS (Sin cambios estructurales)

Todas las tablas fueron recreadas manteniendo su estructura original:

- `usuarios` - Sistema de usuarios (Doctor, Admin, Paciente)
- `modulos` - Módulos de consulta (1-5)
- `pacientes` - Datos de pacientes
- `doctores` - Datos de doctores
- `comorbilidades` - Catálogo de comorbilidades
- `medicamentos` - Catálogo de medicamentos
- `vacunas` - Catálogo de vacunas
- `citas` - Citas médicas
- `signos_vitales` - Signos vitales de pacientes
- `diagnosticos` - Diagnósticos médicos
- `planes_medicacion` - Planes de medicación
- `plan_detalle` - Detalle de medicamentos en planes
- `red_apoyo` - Red de apoyo de pacientes
- `mensajes_chat` - Mensajes entre paciente y doctor
- `doctor_paciente` - Asignación de pacientes a doctores
- `esquema_vacunacion` - Esquema de vacunación
- `paciente_comorbilidad` - Comorbilidades por paciente
- `puntos_chequeo` - Puntos de control de asistencia

---

## 📦 DATOS INICIALES AGREGADOS

### Módulos (5 registros)
```
Módulo 1
Módulo 2
Módulo 3
Módulo 4
Módulo 5
```

### Comorbilidades (20 registros)
```
1. Diabetes Mellitus Tipo 2
2. Hipertensión Arterial
3. Obesidad
4. EPOC (Enfermedad Pulmonar Obstructiva Crónica)
5. Asma
6. Artritis Reumatoide
7. Osteoartritis
8. Enfermedad Renal Crónica
9. Insuficiencia Cardíaca
10. Enfermedad Coronaria
11. Accidente Cerebrovascular (ACV)
12. Enfermedad de Alzheimer
13. Depresión Mayor
14. Ansiedad Generalizada
15. Hipotiroidismo
16. Hipertiroidismo
17. Osteoporosis
18. Anemia
19. Cáncer
20. VIH/SIDA
```

### Medicamentos (30 registros)
```
1. Paracetamol
2. Ibuprofeno
3. Aspirina
4. Metformina
5. Insulina
6. Losartán
7. Amlodipino
8. Atorvastatina
9. Omeprazol
10. Amoxicilina
... (y 20 más)
```

### Vacunas (20 registros)
```
1. BCG
2. Hepatitis B
3. DTP (Difteria, Tétanos, Tosferina)
4. Hib
5. Polio (OPV)
6. Neumococo Conjugada (PCV)
7. Rotavirus
8. MMR (Sarampión, Paperas, Rubéola)
9. Varicela
10. Hepatitis A
... (y 10 más, incluyendo COVID-19, Influenza, etc.)
```

---

## 🔄 COMPARACIÓN: ANTES vs DESPUÉS

### Sistema de Autenticación

**ANTES** (Sistema Separado):
```
Usuario (password_hash)           → Solo Doctor/Admin
PacienteAuth (device info)        → Solo Pacientes
PacienteAuthPIN (pin_hash)        → Solo Pacientes
PacienteAuthBiometric (public_key) → Solo Pacientes
```

**DESPUÉS** (Sistema Unificado):
```
auth_credentials (todos los métodos y tipos de usuario)
  ├── password (Doctor/Admin)
  ├── pin (Paciente)
  └── biometric (Paciente)
```

---

## 📋 TABLAS POR CATEGORÍA

### Tablas de Autenticación (4 → 1)
- ❌ **Eliminadas conceptualmente** (reemplazadas por `auth_credentials`):
  - Funcionalidad migrada a `auth_credentials`
- ✅ **Mantenidas** (para compatibilidad legacy):
  - `paciente_auth`
  - `paciente_auth_pin`
  - `paciente_auth_biometric`
  - `paciente_auth_log`
- ✅ **Nueva**:
  - `auth_credentials` ⭐

### Tablas de Usuarios (Sin cambios)
- `usuarios` - Sistema de usuarios
- `pacientes` - Datos de pacientes
- `doctores` - Datos de doctores

### Tablas Maestras (Pobladas con datos)
- `modulos` - 5 módulos
- `comorbilidades` - 20 comorbilidades
- `medicamentos` - 30 medicamentos
- `vacunas` - 20 vacunas

### Tablas de Datos Médicos (Vacías, listas para usar)
- `citas`
- `signos_vitales`
- `diagnosticos`
- `planes_medicacion`
- `plan_detalle`
- `esquema_vacunacion`
- `puntos_chequeo`

### Tablas de Relaciones (Vacías)
- `doctor_paciente` - N:M
- `paciente_comorbilidad` - N:M
- `red_apoyo`
- `mensajes_chat`

---

## 🔑 CAMBIOS EN ÍNDICES

### Nuevos Índices en `auth_credentials`
- `idx_user_lookup` - Búsqueda rápida por usuario y método
- `idx_device_lookup` - Búsqueda por dispositivo
- `idx_locked_until` - Cuentas bloqueadas
- `idx_primary_credential` - Credenciales primarias

### Índices Mantenidos (en otras tablas)
- Todos los índices originales se mantuvieron
- Foreign keys preservadas
- Unique constraints mantenidos

---

## 📊 ESTADÍSTICAS

### Total de Tablas
- **Antes**: 23 tablas
- **Después**: 24 tablas (+1 nueva: `auth_credentials`)

### Datos Insertados
- **Módulos**: 5 registros
- **Comorbilidades**: 20 registros
- **Medicamentos**: 30 registros
- **Vacunas**: 20 registros
- **Total**: 75 registros en tablas maestras

### ID Auto-increment Reseteados
- Todos los IDs comenzaron desde 1 nuevamente
- `TRUNCATE` implícito en recreación de tablas

---

## 🎯 OBJETIVOS CUMPLIDOS

✅ **Base de datos completamente limpia**
- Todas las tablas eliminadas y recreadas
- IDs reseteados a 1
- Sin datos residuales

✅ **Sistema unificado de autenticación**
- Nueva tabla `auth_credentials` creada
- Preparado para migración gradual
- Compatibilidad hacia atrás mantenida

✅ **Datos maestros listos**
- Módulos 1-5 creados
- 20 comorbilidades comunes
- 30 medicamentos esenciales
- 20 vacunas estándar

✅ **Estructura normalizada**
- Relaciones preservadas
- Foreign keys mantenidas
- Índices optimizados

---

## 📝 NOTAS IMPORTANTES

### Compatibilidad
- Los endpoints legacy (`/api/paciente-auth/*`) siguen funcionando
- Los datos antiguos pueden migrarse usando el script `migrar-auth-credentials.js`
- No hay breaking changes en las tablas existentes

### Migración Futura
- Una vez que el sistema unificado esté completamente adoptado, las tablas legacy pueden eliminarse
- Script de migración disponible en `scripts/migrar-auth-credentials.js`

### Próximos Pasos Recomendados
1. Crear usuarios de prueba (Doctor, Admin)
2. Crear pacientes de prueba
3. Probar autenticación con nuevo sistema (`/api/auth-unified/*`)
4. Migrar datos existentes (si los hay) usando script de migración

---

**Fecha de ejecución**: 2025-11-03
**Script ejecutado**: `scripts/recrear-db-completa.js`
**Estado**: ✅ Completado exitosamente



