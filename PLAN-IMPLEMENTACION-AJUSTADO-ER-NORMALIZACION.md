# 📋 PLAN DE IMPLEMENTACIÓN AJUSTADO - CON ANÁLISIS ER Y NORMALIZACIÓN

**Fecha:** 29 de diciembre de 2025  
**Basado en:** `ANALISIS-ER-NORMALIZACION-CAMPOS-FALTANTES.md`  
**Objetivo:** Implementar campos faltantes asegurando normalización y buenas prácticas de BD

---

## 📊 RESUMEN DEL ANÁLISIS

### **✅ Verificación de Duplicados:**
- ✅ **NO HAY DUPLICADOS REALES** - Todos los campos propuestos son válidos
- ✅ **Campos calculables justificados** - Almacenados por rendimiento y precisión histórica
- ✅ **Redundancias controladas** - Con sincronizaciones apropiadas

### **✅ Normalización:**
- ✅ **1NF, 2NF, 3NF verificadas** - Todas las tablas cumplen normalización
- ✅ **Relaciones correctas** - Foreign keys y relaciones bien definidas

---

## 🔧 AJUSTES AL PLAN ORIGINAL

### **1. Constraints y Validaciones Adicionales**

#### **En Migraciones SQL:**
- Agregar CHECK constraints donde sea posible
- Validar rangos de valores
- Validar dependencias entre campos

#### **En Lógica de Aplicación:**
- Sincronizar `recibe_tratamiento_farmacologico` con `PlanMedicacion`
- Sincronizar `fecha_baja` con `activo = FALSE`
- Validar `es_diagnostico_basal` vs `es_agregado_posterior`

### **2. Índices Adicionales**

- `idx_hba1c` en `signos_vitales(hba1c_porcentaje)`
- `idx_edad_medicion` en `signos_vitales(edad_paciente_en_medicion)`
- `idx_año_diagnostico` en `paciente_comorbilidad(año_diagnostico)`
- `idx_numero_gam` único compuesto en `pacientes(id_modulo, numero_gam)`

### **3. Sincronizaciones Requeridas**

- **Tratamiento Farmacológico:** Trigger o lógica para mantener `recibe_tratamiento_farmacologico` sincronizado con `PlanMedicacion`
- **Baja de Paciente:** Trigger o lógica para mantener `fecha_baja` sincronizado con `activo`

---

## 📋 PLAN DE IMPLEMENTACIÓN DETALLADO (AJUSTADO)

### **PASO 0: PREPARACIÓN Y BACKUP**

#### **0.1 Crear Backup Completo**
```bash
# Script: api-clinica/scripts/crear-backup-antes-campos-faltantes.js
# Usar mysqldump o herramienta similar
# Guardar en: api-clinica/backups/backup-antes-campos-faltantes-YYYY-MM-DD_HH-MM-SS.sql
```

#### **0.2 Verificar Estado Actual**
- Verificar estructura actual de tablas
- Verificar índices existentes
- Verificar constraints existentes

---

### **PASO 1: FASE 1 - ALTA PRIORIDAD**

#### **1.1 Implementar HbA1c en Signos Vitales**

**1.1.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-hba1c-to-signos-vitales.sql`
- **Contenido:**
```sql
-- Verificar si columnas ya existen
SELECT COUNT(*) INTO @col_hba1c_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'signos_vitales'
AND COLUMN_NAME = 'hba1c_porcentaje';

SELECT COUNT(*) INTO @col_edad_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'signos_vitales'
AND COLUMN_NAME = 'edad_paciente_en_medicion';

START TRANSACTION;

-- Agregar hba1c_porcentaje
SET @sql_hba1c = IF(@col_hba1c_exists = 0,
    'ALTER TABLE signos_vitales ADD COLUMN hba1c_porcentaje DECIMAL(5,2) NULL COMMENT ''*HbA1c (%) - Campo obligatorio para criterios de acreditación. Rangos: 20-59 años <7%, 60+ años <8%'';',
    'SELECT ''Columna hba1c_porcentaje ya existe'' AS message;'
);
PREPARE stmt_hba1c FROM @sql_hba1c;
EXECUTE stmt_hba1c;
DEALLOCATE PREPARE stmt_hba1c;

-- Agregar edad_paciente_en_medicion
SET @sql_edad = IF(@col_edad_exists = 0,
    'ALTER TABLE signos_vitales ADD COLUMN edad_paciente_en_medicion INT NULL COMMENT ''Edad del paciente al momento de la medición (para clasificar rangos de HbA1c: 20-59 años vs 60+ años)'';',
    'SELECT ''Columna edad_paciente_en_medicion ya existe'' AS message;'
);
PREPARE stmt_edad FROM @sql_edad;
EXECUTE stmt_edad;
DEALLOCATE PREPARE stmt_edad;

-- Agregar índices
CREATE INDEX IF NOT EXISTS idx_hba1c ON signos_vitales (hba1c_porcentaje);
CREATE INDEX IF NOT EXISTS idx_edad_medicion ON signos_vitales (edad_paciente_en_medicion);

COMMIT;
```

**1.1.2 Crear Script de Ejecución**
- **Archivo:** `api-clinica/scripts/ejecutar-migracion-hba1c.js`
- Similar estructura a `ejecutar-migracion-colesterol-ldl-hdl.js`

**1.1.3 Actualizar Modelo Sequelize**
- **Archivo:** `api-clinica/models/SignoVital.js`
- Agregar campos con comentarios

**1.1.4 Actualizar Controller**
- **Archivo:** `api-clinica/controllers/pacienteMedicalData.js`
- Incluir campos en create/update/get
- **Validación:** Validar rangos según edad (20-59: <7%, 60+: <8%)

---

#### **1.2 Implementar Microalbuminuria**

**1.2.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-microalbuminuria-to-deteccion-complicaciones.sql`
- **Contenido:**
```sql
START TRANSACTION;

-- Agregar microalbuminuria_realizada
ALTER TABLE deteccion_complicaciones 
ADD COLUMN IF NOT EXISTS microalbuminuria_realizada BOOLEAN DEFAULT FALSE 
COMMENT '⑥ Indica si se realizó examen de microalbuminuria';

-- Agregar microalbuminuria_resultado
ALTER TABLE deteccion_complicaciones 
ADD COLUMN IF NOT EXISTS microalbuminuria_resultado DECIMAL(10,2) NULL 
COMMENT 'Resultado del examen de microalbuminuria (mg/L o mg/g de creatinina). Valores normales <30 mg/g';

COMMIT;
```

**1.2.2 Actualizar Modelo y Controller**
- Similar proceso a HbA1c

---

#### **1.3 Implementar Tratamiento**

**1.3.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-tratamiento-to-paciente-comorbilidad.sql`
- **Contenido:**
```sql
START TRANSACTION;

-- Agregar recibe_tratamiento_no_farmacologico (instrucción ②)
ALTER TABLE paciente_comorbilidad 
ADD COLUMN IF NOT EXISTS recibe_tratamiento_no_farmacologico BOOLEAN DEFAULT FALSE 
COMMENT '② Indica si el paciente recibe tratamiento no farmacológico (dieta, ejercicio, cambios de estilo de vida)';

-- Agregar recibe_tratamiento_farmacologico (instrucción ③)
ALTER TABLE paciente_comorbilidad 
ADD COLUMN IF NOT EXISTS recibe_tratamiento_farmacologico BOOLEAN DEFAULT FALSE 
COMMENT '③ Indica si el paciente recibe tratamiento farmacológico. Debe sincronizarse con PlanMedicacion activo';

COMMIT;
```

**1.3.2 Implementar Sincronización**
- **Archivo:** `api-clinica/services/sincronizar-tratamiento-farmacologico.js`
- Función para mantener `recibe_tratamiento_farmacologico` sincronizado con `PlanMedicacion`
- Llamar después de crear/actualizar/eliminar `PlanMedicacion`

**1.3.3 Actualizar Modelo y Controller**

---

### **PASO 2: FASE 2 - MEDIA PRIORIDAD**

#### **2.1 Implementar Diagnóstico Basal**

**2.1.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-diagnostico-basal-to-paciente-comorbilidad.sql`
- **Contenido:**
```sql
START TRANSACTION;

-- Agregar es_diagnostico_basal (instrucción ①)
ALTER TABLE paciente_comorbilidad 
ADD COLUMN IF NOT EXISTS es_diagnostico_basal BOOLEAN DEFAULT FALSE 
COMMENT '① Indica si es el diagnóstico basal (inicial) del paciente';

-- Agregar año_diagnostico
ALTER TABLE paciente_comorbilidad 
ADD COLUMN IF NOT EXISTS año_diagnostico INTEGER NULL 
COMMENT 'Año en que se diagnosticó la comorbilidad (YYYY). Rango válido: 1900 - año actual';

-- Agregar es_agregado_posterior
ALTER TABLE paciente_comorbilidad 
ADD COLUMN IF NOT EXISTS es_agregado_posterior BOOLEAN DEFAULT FALSE 
COMMENT 'Indica si el diagnóstico fue agregado después del diagnóstico basal';

-- Agregar índice
CREATE INDEX IF NOT EXISTS idx_año_diagnostico ON paciente_comorbilidad (año_diagnostico);

COMMIT;
```

**2.1.2 Implementar Validación en Controller**
- Validar que `es_diagnostico_basal` y `es_agregado_posterior` sean mutuamente excluyentes
- Validar rango de `año_diagnostico`

---

#### **2.2 Implementar Sesiones Educativas (Nueva Tabla)**

**2.2.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/create-sesiones-educativas.sql`
- **Contenido:**
```sql
CREATE TABLE IF NOT EXISTS sesiones_educativas (
  id_sesion INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_cita INT NULL,
  fecha_sesion DATE NOT NULL,
  asistio BOOLEAN DEFAULT FALSE COMMENT 'Asistió a sesión educativa (1=SI, 0=NO)',
  tipo_sesion ENUM(
    'nutricional', 
    'actividad_fisica', 
    'medico_preventiva', 
    'trabajo_social', 
    'psicologica', 
    'odontologica'
  ) NOT NULL COMMENT 'Tipo de intervención educativa',
  numero_intervenciones INT DEFAULT 1 COMMENT 'N° de intervenciones en el mes por integrante',
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
  
  -- Índices
  INDEX idx_paciente (id_paciente),
  INDEX idx_cita (id_cita),
  INDEX idx_fecha_sesion (fecha_sesion),
  INDEX idx_tipo_sesion (tipo_sesion),
  INDEX idx_paciente_fecha (id_paciente, fecha_sesion),
  INDEX idx_mes (YEAR(fecha_sesion), MONTH(fecha_sesion))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT 'Registro de sesiones e intervenciones educativas para la salud';
```

**2.2.2 Crear Modelo, Controller, Routes**
- Similar proceso a otras tablas nuevas

---

#### **2.3 Implementar Referencia**

**2.3.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-referencia-to-deteccion-complicaciones.sql`
- **Contenido:**
```sql
START TRANSACTION;

-- Agregar fue_referido (instrucción ⑪)
ALTER TABLE deteccion_complicaciones 
ADD COLUMN IF NOT EXISTS fue_referido BOOLEAN DEFAULT FALSE 
COMMENT '⑪ Indica si el paciente fue referido a otro nivel de atención';

-- Agregar referencia_observaciones
ALTER TABLE deteccion_complicaciones 
ADD COLUMN IF NOT EXISTS referencia_observaciones TEXT NULL 
COMMENT 'Detalles de la referencia (especialidad, institución, motivo)';

COMMIT;
```

---

### **PASO 3: FASE 3 - BAJA PRIORIDAD**

#### **3.1 Implementar Salud Bucal (Nueva Tabla)**

**3.1.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/create-salud-bucal.sql`
- Similar estructura a sesiones educativas

---

#### **3.2 Implementar Tuberculosis (Nueva Tabla)**

**3.2.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/create-deteccion-tuberculosis.sql`
- Similar estructura a sesiones educativas

---

#### **3.3 Implementar Baja y Número GAM**

**3.3.1 Crear Migración SQL**
- **Archivo:** `api-clinica/migrations/add-baja-numero-gam-to-pacientes.sql`
- **Contenido:**
```sql
START TRANSACTION;

-- Agregar fecha_baja (instrucción ⑭)
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS fecha_baja DATE NULL 
COMMENT '⑭ Fecha en que el paciente fue dado de baja del GAM. Debe ser >= fecha_registro';

-- Agregar motivo_baja
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS motivo_baja TEXT NULL 
COMMENT 'Motivo de la baja del paciente del GAM';

-- Agregar numero_gam
ALTER TABLE pacientes 
ADD COLUMN IF NOT EXISTS numero_gam INT NULL 
COMMENT 'Número de integrante en el GAM (para fórmulas y reportes). Debe ser único por módulo';

-- Agregar índice único compuesto
CREATE UNIQUE INDEX IF NOT EXISTS idx_modulo_numero_gam ON pacientes (id_modulo, numero_gam);

COMMIT;
```

**3.3.2 Implementar Sincronización**
- **Archivo:** `api-clinica/services/sincronizar-baja-paciente.js`
- Función para mantener `fecha_baja` sincronizado con `activo = FALSE`

---

## 🔒 VALIDACIONES Y CONSTRAINTS

### **Validaciones en Controller (Lógica de Aplicación):**

#### **HbA1c:**
```javascript
// Validar rango según edad
if (hba1c_porcentaje !== undefined && hba1c_porcentaje !== null) {
  if (hba1c_porcentaje < 3.0 || hba1c_porcentaje > 15.0) {
    return res.status(400).json({ error: 'HbA1c debe estar entre 3.0% y 15.0%' });
  }
  
  // Validar según edad
  const edad = edad_paciente_en_medicion || calcularEdad(fecha_nacimiento);
  if (edad >= 20 && edad < 60) {
    if (hba1c_porcentaje > 7.0) {
      // Advertencia: objetivo <7% para 20-59 años
    }
  } else if (edad >= 60) {
    if (hba1c_porcentaje > 8.0) {
      // Advertencia: objetivo <8% para 60+ años
    }
  }
}
```

#### **Microalbuminuria:**
```javascript
// Validar que resultado solo existe si se realizó
if (microalbuminuria_resultado !== null && !microalbuminuria_realizada) {
  return res.status(400).json({ 
    error: 'No se puede registrar resultado sin haber realizado el examen' 
  });
}

// Validar rango
if (microalbuminuria_resultado !== null) {
  if (microalbuminuria_resultado < 0 || microalbuminuria_resultado > 1000) {
    return res.status(400).json({ 
      error: 'Resultado de microalbuminuria debe estar entre 0 y 1000 mg/g' 
    });
  }
}
```

#### **Diagnóstico Basal:**
```javascript
// Validar mutuamente excluyentes
if (es_diagnostico_basal && es_agregado_posterior) {
  return res.status(400).json({ 
    error: 'Un diagnóstico no puede ser basal y agregado posterior al mismo tiempo' 
  });
}

// Validar año
if (año_diagnostico !== null) {
  const añoActual = new Date().getFullYear();
  if (año_diagnostico < 1900 || año_diagnostico > añoActual) {
    return res.status(400).json({ 
      error: `Año de diagnóstico debe estar entre 1900 y ${añoActual}` 
    });
  }
}
```

#### **Baja:**
```javascript
// Validar fecha_baja >= fecha_registro
if (fecha_baja !== null && fecha_baja < paciente.fecha_registro) {
  return res.status(400).json({ 
    error: 'Fecha de baja no puede ser anterior a fecha de registro' 
  });
}

// Sincronizar con activo
if (fecha_baja !== null) {
  activo = false;
} else if (activo === false && fecha_baja === null) {
  // Si se desactiva sin fecha_baja, establecer fecha actual
  fecha_baja = new Date();
}
```

---

## 📊 ÍNDICES A CREAR

### **Signos Vitales:**
- `idx_hba1c` en `hba1c_porcentaje`
- `idx_edad_medicion` en `edad_paciente_en_medicion`

### **Paciente Comorbilidad:**
- `idx_año_diagnostico` en `año_diagnostico`

### **Pacientes:**
- `idx_modulo_numero_gam` único compuesto en `(id_modulo, numero_gam)`

### **Nuevas Tablas:**
- Índices según estructura definida en migraciones

---

## 🔄 SERVICIOS DE SINCRONIZACIÓN

### **1. Sincronizar Tratamiento Farmacológico**

**Archivo:** `api-clinica/services/sincronizar-tratamiento-farmacologico.js`

```javascript
export async function sincronizarTratamientoFarmacologico(pacienteId, comorbilidadId) {
  // Verificar si existe PlanMedicacion activo para este paciente y comorbilidad
  const planActivo = await PlanMedicacion.findOne({
    where: {
      id_paciente: pacienteId,
      activo: true
    },
    include: [{
      model: PlanDetalle,
      include: [{
        model: Medicamento
      }]
    }]
  });

  // Actualizar recibe_tratamiento_farmacologico
  await PacienteComorbilidad.update(
    { recibe_tratamiento_farmacologico: planActivo !== null },
    { where: { id_paciente: pacienteId, id_comorbilidad: comorbilidadId } }
  );
}
```

### **2. Sincronizar Baja de Paciente**

**Archivo:** `api-clinica/services/sincronizar-baja-paciente.js`

```javascript
export async function sincronizarBajaPaciente(pacienteId, fechaBaja, motivoBaja) {
  const updateData = {};
  
  if (fechaBaja !== null) {
    updateData.fecha_baja = fechaBaja;
    updateData.activo = false;
  }
  
  if (motivoBaja !== null) {
    updateData.motivo_baja = motivoBaja;
  }
  
  await Paciente.update(updateData, { where: { id_paciente: pacienteId } });
}
```

---

## ✅ CHECKLIST FINAL

### **Antes de Implementar:**
- [ ] Backup completo creado
- [ ] Análisis ER y normalización completado
- [ ] Plan ajustado revisado

### **Durante Implementación:**
- [ ] Cada migración ejecutada exitosamente
- [ ] Constraints y validaciones implementadas
- [ ] Índices creados
- [ ] Sincronizaciones implementadas
- [ ] Modelos actualizados
- [ ] Controllers actualizados/creados
- [ ] Routes registrados (si aplica)

### **Después de Implementar:**
- [ ] Verificar columnas en base de datos
- [ ] Probar validaciones
- [ ] Probar sincronizaciones
- [ ] Probar endpoints
- [ ] Verificar que datos existentes no se afectaron
- [ ] Documentar cambios

---

**Conclusión:** Plan ajustado con análisis ER, normalización verificada, sin duplicados, con constraints y sincronizaciones apropiadas.

