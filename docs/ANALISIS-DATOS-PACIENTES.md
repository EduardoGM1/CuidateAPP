# 📊 ANÁLISIS COMPLETO: DATOS ALMACENADOS DE PACIENTES

**Fecha:** Diciembre 2024  
**Proyecto:** Sistema Clínica Móvil

---

## 📋 RESUMEN EJECUTIVO

El sistema almacena información completa de los pacientes organizada en **10 categorías principales**, distribuidas en **15 tablas de base de datos**. La información se captura a través de un formulario multi-paso y se relaciona con otras entidades del sistema (doctores, módulos, citas, etc.).

---

## 🔐 1. DATOS DE AUTENTICACIÓN Y ACCESO

### Tabla: `usuarios`
**Relación:** 1:1 con Paciente (opcional)
- `id_usuario` (PK, auto-increment)
- `email` ✅ **OBLIGATORIO** - Email único del usuario
- `password_hash` ✅ **OBLIGATORIO** - Hash de la contraseña
- `rol` ✅ **OBLIGATORIO** - ENUM('Paciente', 'Doctor', 'Admin')
- `fecha_creacion` ✅ **OBLIGATORIO** - Fecha de creación (auto-generada)
- `activo` ✅ **OBLIGATORIO** - Estado activo (default: true)
- `ultimo_login` (opcional) - Último inicio de sesión

### Tabla: `paciente_auth`
**Relación:** 1:N con Paciente (múltiples dispositivos)
- `id_auth` (PK, auto-increment)
- `id_paciente` ✅ **OBLIGATORIO** - FK a pacientes
- `device_id` ✅ **OBLIGATORIO** - Identificador único del dispositivo
- `device_name` (opcional) - Nombre del dispositivo
- `auth_method` ✅ **OBLIGATORIO** - ENUM('pin', 'biometric', 'password')
- `failed_attempts` ✅ **OBLIGATORIO** - Intentos fallidos (default: 0)
- `locked_until` (opcional) - Fecha de bloqueo temporal
- `last_activity` (opcional) - Última actividad
- `created_at` ✅ **OBLIGATORIO** - Fecha de creación
- `activo` ✅ **OBLIGATORIO** - Estado activo (default: true)

### Tabla: `paciente_auth_pin`
**Relación:** 1:1 con PacienteAuth
- `id_pin_auth` (PK, auto-increment)
- `id_auth` ✅ **OBLIGATORIO** - FK a paciente_auth
- `pin_hash` ✅ **OBLIGATORIO** - Hash del PIN de 4 dígitos
- `pin_salt` ✅ **OBLIGATORIO** - Salt del PIN
- `created_at` ✅ **OBLIGATORIO** - Fecha de creación
- `activo` ✅ **OBLIGATORIO** - Estado activo
- `expires_at` (opcional) - Fecha de expiración

### Tabla: `paciente_auth_log`
**Relación:** 1:N con Paciente (historial de autenticación)
- `id_log` (PK, auto-increment)
- `id_paciente` ✅ **OBLIGATORIO** - FK a pacientes
- `id_auth` (opcional) - FK a paciente_auth
- `auth_method` ✅ **OBLIGATORIO** - Método de autenticación usado
- `resultado` ✅ **OBLIGATORIO** - ENUM('exitoso', 'fallido', 'bloqueado')
- `device_id` (opcional) - ID del dispositivo
- `ip_address` (opcional) - Dirección IP
- `user_agent` (opcional) - User agent del dispositivo
- `created_at` ✅ **OBLIGATORIO** - Fecha y hora del intento

---

## 👤 2. DATOS PERSONALES BÁSICOS

### Tabla: `pacientes`
**Tabla principal del paciente**

#### Campos Obligatorios ✅:
- `id_paciente` (PK, auto-increment)
- `nombre` ✅ **OBLIGATORIO** - STRING(100) - Nombre del paciente
- `apellido_paterno` ✅ **OBLIGATORIO** - STRING(100) - Apellido paterno
- `fecha_nacimiento` ✅ **OBLIGATORIO** - DATEONLY - Fecha de nacimiento
- `estado` ✅ **OBLIGATORIO** - STRING(100) - Estado de México

#### Campos Opcionales:
- `id_usuario` (opcional) - FK a usuarios (si tiene cuenta)
- `apellido_materno` (opcional) - STRING(100) - Apellido materno
- `curp` (opcional, único) - STRING(18) - CURP del paciente
- `institucion_salud` (opcional) - ENUM('IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro')
- `sexo` (opcional) - ENUM('Hombre', 'Mujer')
- `direccion` (opcional) - STRING(255) - Dirección completa
- `localidad` (opcional) - STRING(100) - Municipio/Ciudad
- `numero_celular` (opcional) - STRING(20) - Número de teléfono
- `id_modulo` (opcional) - FK a modulos - Módulo asignado (1-5)
- `fecha_registro` (auto-generada) - DATE - Fecha de registro
- `activo` (default: true) - BOOLEAN - Estado activo/inactivo

---

## 👨‍👩‍👧‍👦 3. RED DE APOYO (CONTACTOS DE EMERGENCIA)

### Tabla: `red_apoyo`
**Relación:** 1:N con Paciente (múltiples contactos)

#### Campos Obligatorios ✅:
- `id_red_apoyo` (PK, auto-increment)
- `id_paciente` ✅ **OBLIGATORIO** - FK a pacientes
- `nombre_contacto` ✅ **OBLIGATORIO** - STRING(150) - Nombre del contacto

#### Campos Opcionales:
- `numero_celular` (opcional) - STRING(20) - Teléfono del contacto
- `email` (opcional) - STRING(150) - Email del contacto
- `direccion` (opcional) - STRING(255) - Dirección del contacto
- `localidad` (opcional) - STRING(100) - Localidad del contacto
- `parentesco` (opcional) - STRING(100) - Parentesco con el paciente
- `fecha_creacion` (auto-generada) - DATE - Fecha de creación

**Nota:** Al menos un contacto es obligatorio durante el registro.

---

## 💉 4. ESQUEMA DE VACUNACIÓN

### Tabla: `esquema_vacunacion`
**Relación:** 1:N con Paciente (múltiples vacunas)

#### Campos Obligatorios ✅:
- `id_esquema` (PK, auto-increment)
- `id_paciente` ✅ **OBLIGATORIO** - FK a pacientes
- `vacuna` ✅ **OBLIGATORIO** - STRING(150) - Nombre de la vacuna (referencia a tabla `vacunas`)
- `fecha_aplicacion` ✅ **OBLIGATORIO** - DATEONLY - Fecha de aplicación

#### Campos Opcionales:
- `lote` (opcional) - STRING(100) - Número de lote de la vacuna
- `observaciones` (opcional) - TEXT - Observaciones adicionales
- `fecha_creacion` (auto-generada) - DATE - Fecha de registro

**Relación con catálogo:**
- La tabla `vacunas` contiene el catálogo de vacunas disponibles
- El campo `vacuna` en `esquema_vacunacion` almacena el nombre de la vacuna

---

## 🏥 5. COMORBILIDADES (ENFERMEDADES CRÓNICAS)

### Tabla: `comorbilidades`
**Catálogo de comorbilidades disponibles**
- `id_comorbilidad` (PK, auto-increment)
- `nombre_comorbilidad` ✅ **OBLIGATORIO** - STRING(150) - Nombre único

**Comorbilidades comunes:**
- Diabetes
- Hipertensión
- Obesidad
- Dislipidemia
- Asma
- EPOC
- Enfermedad Cardiovascular
- Enfermedad Renal Crónica
- Síndrome Metabólico
- Tabaquismo
- Tuberculosis

### Tabla: `paciente_comorbilidad`
**Relación:** N:M entre Paciente y Comorbilidad

#### Campos Obligatorios ✅:
- `id_paciente` ✅ **OBLIGATORIO** (PK, FK a pacientes)
- `id_comorbilidad` ✅ **OBLIGATORIO** (PK, FK a comorbilidades)

#### Campos Opcionales:
- `fecha_deteccion` (opcional) - DATEONLY - Fecha de detección/diagnóstico
- `anos_padecimiento` (opcional) - INTEGER - Años que el paciente ha tenido esta comorbilidad
- `observaciones` (opcional) - TEXT - Observaciones adicionales

**Uso:** Permite análisis estadísticos de comorbilidades por periodo, estado, doctor, etc.

---

## 💊 6. PLANES DE MEDICACIÓN

### Tabla: `planes_medicacion`
**Relación:** 1:N con Paciente (múltiples planes)

#### Campos Obligatorios ✅:
- `id_plan` (PK, auto-increment)
- `id_paciente` ✅ **OBLIGATORIO** - FK a pacientes

#### Campos Opcionales:
- `id_doctor` (opcional) - FK a doctores - Doctor que prescribió
- `id_cita` (opcional) - FK a citas - Cita asociada
- `fecha_inicio` (opcional) - DATEONLY - Fecha de inicio del tratamiento
- `fecha_fin` (opcional) - DATEONLY - Fecha de finalización
- `observaciones` (opcional) - TEXT - Observaciones generales
- `activo` (default: true) - BOOLEAN - Estado activo
- `fecha_creacion` (auto-generada) - DATE - Fecha de creación

### Tabla: `plan_detalle`
**Relación:** 1:N con PlanMedicacion (múltiples medicamentos por plan)

#### Campos Obligatorios ✅:
- `id_detalle` (PK, auto-increment)
- `id_plan` ✅ **OBLIGATORIO** - FK a planes_medicacion
- `id_medicamento` ✅ **OBLIGATORIO** - FK a medicamentos

#### Campos Opcionales:
- `dosis` (opcional) - STRING(100) - Dosis del medicamento
- `frecuencia` (opcional) - STRING(100) - Frecuencia de administración
- `horario` (opcional) - STRING(100) - Horario único (compatibilidad hacia atrás)
- `horarios` (opcional) - JSON - Array de horarios: ["HH:MM", "HH:MM"]
- `via_administracion` (opcional) - STRING(50) - Vía de administración
- `observaciones` (opcional) - TEXT - Observaciones específicas

### Tabla: `medicamentos`
**Catálogo de medicamentos disponibles**
- `id_medicamento` (PK, auto-increment)
- `nombre_medicamento` ✅ **OBLIGATORIO** - STRING(150) - Nombre único
- `descripcion` (opcional) - TEXT - Descripción del medicamento

### Tabla: `medicamento_toma`
**Relación:** 1:N con PlanMedicacion (historial de tomas)

#### Campos Obligatorios ✅:
- `id_toma` (PK, auto-increment)
- `id_plan_medicacion` ✅ **OBLIGATORIO** - FK a planes_medicacion
- `fecha_toma` ✅ **OBLIGATORIO** - DATE - Fecha de la toma
- `confirmado_por` ✅ **OBLIGATORIO** - ENUM('Paciente', 'Doctor', 'Familiar')

#### Campos Opcionales:
- `id_plan_detalle` (opcional) - FK a plan_detalle
- `hora_toma` (opcional) - TIME - Hora exacta de la toma
- `observaciones` (opcional) - TEXT - Observaciones
- `fecha_creacion` (auto-generada) - DATE - Fecha de registro

---

## 💓 7. SIGNOS VITALES Y PARÁMETROS CLÍNICOS

### Tabla: `signos_vitales`
**Relación:** 1:N con Paciente (historial de mediciones)

#### Campos Obligatorios ✅:
- `id_signo` (PK, auto-increment)
- `id_paciente` ✅ **OBLIGATORIO** - FK a pacientes
- `registrado_por` ✅ **OBLIGATORIO** - ENUM('paciente', 'doctor')

#### Campos Opcionales:
- `id_cita` (opcional) - FK a citas - Cita asociada
- `fecha_medicion` (auto-generada) - DATE - Fecha de medición
- `peso_kg` (opcional) - DECIMAL(6,2) - Peso en kilogramos
- `talla_m` (opcional) - DECIMAL(4,2) - Talla en metros
- `imc` (opcional) - DECIMAL(6,2) - Índice de Masa Corporal (calculado)
- `medida_cintura_cm` (opcional) - DECIMAL(6,2) - Circunferencia de cintura
- `presion_sistolica` (opcional) - SMALLINT - Presión arterial sistólica
- `presion_diastolica` (opcional) - SMALLINT - Presión arterial diastólica
- `glucosa_mg_dl` (opcional) - DECIMAL(6,2) - Glucosa en mg/dL
- `colesterol_mg_dl` (opcional) - DECIMAL(6,2) - Colesterol total
- `trigliceridos_mg_dl` (opcional) - DECIMAL(6,2) - Triglicéridos
- `observaciones` (opcional) - TEXT - Observaciones adicionales
- `fecha_creacion` (auto-generada) - DATE - Fecha de registro

**Uso:** Permite seguimiento temporal de parámetros clínicos y detección de valores críticos.

---

## 📅 8. CITAS MÉDICAS

### Tabla: `citas`
**Relación:** 1:N con Paciente (múltiples citas)

#### Campos Obligatorios ✅:
- `id_cita` (PK, auto-increment)
- `id_paciente` ✅ **OBLIGATORIO** - FK a pacientes
- `fecha_cita` ✅ **OBLIGATORIO** - DATE - Fecha y hora de la cita

#### Campos Opcionales:
- `id_doctor` (opcional) - FK a doctores - Doctor asignado
- `asistencia` (opcional) - BOOLEAN - Si el paciente asistió
- `motivo` (opcional) - STRING(255) - Motivo de la consulta
- `es_primera_consulta` (default: false) - BOOLEAN - Si es primera consulta
- `observaciones` (opcional) - TEXT - Observaciones
- `estado` (opcional) - STRING(50) - Estado de la cita (pendiente, confirmada, cancelada, etc.)
- `fecha_creacion` (auto-generada) - DATE - Fecha de creación

**Nota:** La primera consulta es obligatoria durante el registro del paciente.

---

## 🩺 9. DIAGNÓSTICOS

### Tabla: `diagnosticos`
**Relación:** 1:N con Cita (múltiples diagnósticos por cita)

#### Campos Obligatorios ✅:
- `id_diagnostico` (PK, auto-increment)

#### Campos Opcionales:
- `id_cita` (opcional) - FK a citas - Cita asociada
- `descripcion` (opcional) - TEXT - Descripción del diagnóstico
- `fecha_registro` (auto-generada) - DATE - Fecha de registro

---

## 👨‍⚕️ 10. ASIGNACIÓN A DOCTORES

### Tabla: `doctor_paciente`
**Relación:** N:M entre Doctor y Paciente

#### Campos Obligatorios ✅:
- `id_doctor` ✅ **OBLIGATORIO** (PK, FK a doctores)
- `id_paciente` ✅ **OBLIGATORIO** (PK, FK a pacientes)
- `fecha_asignacion` ✅ **OBLIGATORIO** - DATEONLY - Fecha de asignación

#### Campos Opcionales:
- `observaciones` (opcional) - TEXT - Observaciones de la asignación

**Uso:** Permite que múltiples doctores atiendan al mismo paciente y viceversa.

---

## 📊 FLUJO DE REGISTRO DE PACIENTE

### Paso 1: Configuración de PIN ✅ OBLIGATORIO
1. Se genera un `device_id` único
2. Se captura PIN de 4 dígitos y confirmación
3. Se crea registro en `paciente_auth` y `paciente_auth_pin`

### Paso 2: Datos Personales ✅ OBLIGATORIO
1. Se capturan datos básicos del paciente
2. Se crea registro en `pacientes`
3. Campos mínimos: `nombre`, `apellido_paterno`, `fecha_nacimiento`, `estado`

### Paso 3: Red de Apoyo ✅ OBLIGATORIO
1. Se captura al menos un contacto de emergencia
2. Se crean registros en `red_apoyo`
3. Campo mínimo: `nombre_contacto`

### Paso 4: Primera Consulta ✅ OBLIGATORIO
1. Se capturan datos de la primera consulta:
   - **Signos vitales** → `signos_vitales`
   - **Comorbilidades** → `paciente_comorbilidad`
   - **Vacunas** → `esquema_vacunacion`
   - **Medicamentos** → `planes_medicacion` + `plan_detalle`
   - **Diagnóstico** → `diagnosticos`
2. Se crea registro en `citas` con `es_primera_consulta = true`
3. Se asigna doctor → `doctor_paciente`

---

## 🔄 DATOS QUE SE ACTUALIZAN POST-REGISTRO

### Actualizaciones Frecuentes:
1. **Signos Vitales:** Cada vez que el paciente o doctor registra mediciones
2. **Citas:** Nuevas citas programadas y actualización de asistencia
3. **Medicamentos:** Nuevos planes de medicación y registro de tomas
4. **Vacunas:** Nuevas vacunas aplicadas
5. **Comorbilidades:** Nuevas comorbilidades detectadas
6. **Diagnósticos:** Nuevos diagnósticos en consultas subsecuentes
7. **Red de Apoyo:** Actualización de contactos
8. **Datos Personales:** Actualización de dirección, teléfono, etc.

---

## 📈 DATOS PARA ANÁLISIS Y REPORTES

### Estadísticas Disponibles:
1. **Comorbilidades:**
   - Más frecuentes por doctor
   - Distribución por estado
   - Crecimiento por periodo (semestral, anual, mensual)

2. **Signos Vitales:**
   - Valores críticos (glucosa, presión arterial)
   - Tendencias temporales
   - Alertas automáticas

3. **Citas:**
   - Asistencia vs. no asistencia
   - Citas por día/semana/mes
   - Motivos más frecuentes

4. **Medicamentos:**
   - Adherencia al tratamiento
   - Medicamentos más prescritos

5. **Vacunas:**
   - Cobertura vacunal
   - Vacunas aplicadas por periodo

---

## 🔐 SEGURIDAD Y PRIVACIDAD

### Datos Sensibles:
- **PIN:** Almacenado como hash con salt
- **Password:** Almacenado como hash (si tiene cuenta de usuario)
- **CURP:** Identificador único, debe ser validado
- **Datos Médicos:** Acceso restringido por rol (Doctor, Admin)

### Auditoría:
- Tabla `sistema_auditoria` registra acciones importantes
- Tabla `paciente_auth_log` registra intentos de autenticación

---

## 📝 NOTAS IMPORTANTES

1. **Soft Delete:** Los pacientes no se eliminan físicamente, se marcan como `activo = false`
2. **Relaciones:** Muchas tablas tienen relaciones opcionales con `citas` para mantener historial incluso si se elimina una cita
3. **Temporalidad:** Las fechas son críticas para análisis estadísticos (comorbilidades, signos vitales, citas)
4. **Catálogos:** Vacunas y medicamentos tienen tablas de catálogo para mantener consistencia
5. **Múltiples Doctores:** Un paciente puede ser atendido por múltiples doctores simultáneamente

---

## 🎯 CONCLUSIÓN

El sistema almacena información **completa y estructurada** de los pacientes, permitiendo:
- ✅ Seguimiento médico completo
- ✅ Análisis estadísticos avanzados
- ✅ Historial clínico detallado
- ✅ Gestión de tratamientos
- ✅ Monitoreo de signos vitales
- ✅ Control de vacunación
- ✅ Gestión de citas y diagnósticos

**Total de tablas relacionadas con pacientes:** 15  
**Total de campos almacenados:** ~80+ campos  
**Categorías de datos:** 10 principales

