# 📋 CAMPOS FALTANTES - FORMA 2022 OFICIAL

**Fecha:** 29 de diciembre de 2025  
**Análisis:** Comparación del formato GAM con modelos actuales de BD

---

## 📊 RESUMEN EJECUTIVO

**Total de campos faltantes identificados:** 25+ campos  
**Categorías afectadas:** 7 áreas principales  
**Prioridad:** Alta (campos requeridos para cumplimiento del formato oficial)

---

## 🔍 CAMPOS FALTANTES POR APARTADO

### **1. DATOS DE IDENTIFICACIÓN** ✅ (Mayormente completo)

#### **Campos que YA tenemos:**
- ✅ NOMBRE (nombre, apellido_paterno, apellido_materno)
- ✅ Fecha de nacimiento (fecha_nacimiento)
- ✅ Edad (calculada)
- ✅ CURP
- ✅ Institución de salud (institucion_salud)
- ✅ Sexo (sexo: Hombre/Mujer)

#### **Campos FALTANTES:**
- ❌ **N° (Número de integrante en el GAM)** - No almacenamos el número de orden del paciente en el grupo

---

### **2. DX ENFERMEDADES CRÓNICAS** ⚠️ (Parcialmente completo)

#### **Campos que YA tenemos:**
- ✅ Diagnósticos (tabla `comorbilidades` y `paciente_comorbilidad`)
- ✅ Fecha de detección (fecha_deteccion en `paciente_comorbilidad`)

#### **Campos FALTANTES:**
- ❌ **Basal del paciente ①** - No identificamos si un diagnóstico es "basal" (inicial) o agregado posteriormente
- ❌ **Año del Dx (Año del diagnóstico)** - Solo tenemos fecha_deteccion, no el año específico
- ❌ **Dx. (s) Agregados posterior al Basal** - No diferenciamos diagnósticos basales de agregados

**Tabla afectada:** `paciente_comorbilidad`

**Campos a agregar:**
```sql
-- En tabla paciente_comorbilidad
es_diagnostico_basal BOOLEAN DEFAULT FALSE COMMENT 'Indica si es el diagnóstico basal (inicial)',
año_diagnostico INTEGER COMMENT 'Año en que se diagnosticó la comorbilidad',
es_agregado_posterior BOOLEAN DEFAULT FALSE COMMENT 'Indica si fue agregado después del diagnóstico basal'
```

---

### **3. RECIBE TRATAMIENTO** ❌ (NO IMPLEMENTADO)

#### **Campos FALTANTES:**
- ❌ **No Farmacológico ②** - No almacenamos si el paciente recibe tratamiento no farmacológico
- ❌ **Farmacológico ③** - No almacenamos si el paciente recibe tratamiento farmacológico (aunque tenemos planes de medicación, no tenemos un campo booleano específico)

**Tabla a crear/modificar:** 
- Opción 1: Agregar a tabla `paciente_comorbilidad`
- Opción 2: Crear tabla `paciente_tratamiento`

**Campos a agregar:**
```sql
-- Opción 1: En paciente_comorbilidad
recibe_tratamiento_no_farmacologico BOOLEAN DEFAULT FALSE,
recibe_tratamiento_farmacologico BOOLEAN DEFAULT FALSE,

-- Opción 2: Nueva tabla paciente_tratamiento
CREATE TABLE paciente_tratamiento (
  id_tratamiento INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_comorbilidad INT,
  recibe_tratamiento_no_farmacologico BOOLEAN DEFAULT FALSE,
  recibe_tratamiento_farmacologico BOOLEAN DEFAULT FALSE,
  fecha_registro DATE,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  FOREIGN KEY (id_comorbilidad) REFERENCES comorbilidades(id_comorbilidad)
);
```

---

### **4. EDUCACIÓN PARA LA SALUD** ❌ (NO IMPLEMENTADO)

#### **Campos FALTANTES:**
- ❌ **Asistió a sesión educativa (1=SI, 0=NO)** - No registramos asistencia a sesiones educativas
- ❌ **N° de intervenciones en el mes por integrante:**
  - ❌ Nutricional
  - ❌ Actividad Física
  - ❌ Médico-preventiva
  - ❌ Trabajo Social
  - ❌ Psicológica
  - ❌ Odontológica

**Tabla a crear:** `sesiones_educativas` o `intervenciones_educativas`

**Estructura propuesta:**
```sql
CREATE TABLE sesiones_educativas (
  id_sesion INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  fecha_sesion DATE NOT NULL,
  asistio BOOLEAN DEFAULT FALSE,
  tipo_sesion ENUM('nutricional', 'actividad_fisica', 'medico_preventiva', 'trabajo_social', 'psicologica', 'odontologica') NOT NULL,
  numero_intervenciones INT DEFAULT 1 COMMENT 'Número de intervenciones en el mes',
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente)
);
```

---

### **5. VARIABLES / CRITERIOS DE ACREDITACIÓN** ⚠️ (Parcialmente completo)

#### **Campos que YA tenemos:**
- ✅ Asistencia a evaluación clínica (implícito en citas con estado 'atendida')
- ✅ ANTROPOMETRÍA:
  - ✅ Peso (peso_kg)
  - ✅ Talla (talla_m)
  - ✅ IMC (imc - calculado)
  - ✅ Circunf. de cintura (medida_cintura_cm)
- ✅ Presión Arterial (presion_sistolica, presion_diastolica)
- ✅ COLESTEROL:
  - ✅ Colesterol Total (colesterol_mg_dl)
  - ✅ LDL (colesterol_ldl) ✅ RECIÉN AGREGADO
  - ✅ HDL (colesterol_hdl) ✅ RECIÉN AGREGADO
- ✅ TRIGLICERIDOS (trigliceridos_mg_dl)

#### **Campos FALTANTES:**
- ❌ **HbA1c (%)** - Hemoglobina glucosilada - NO almacenamos este valor crítico
- ❌ **Rangos de edad para HbA1c:**
  - ❌ 20 a 59 años
  - ❌ 60 años y más

**Tabla afectada:** `signos_vitales`

**Campos a agregar:**
```sql
-- En tabla signos_vitales
hba1c_porcentaje DECIMAL(5,2) NULL COMMENT 'Hemoglobina glucosilada (%) - Campo obligatorio para criterios de acreditación',
edad_paciente_en_medicion INT NULL COMMENT 'Edad del paciente al momento de la medición (para clasificar rangos)'
```

---

### **6. DETECCIÓN DE COMPLICACIONES** ⚠️ (Parcialmente completo)

#### **Campos que YA tenemos:**
- ✅ Exploración de pies (exploracion_pies)
- ✅ Exploración de Fondo de Ojo (exploracion_fondo_ojo)
- ✅ Realiza Auto-monitoreo (realiza_auto_monitoreo)
- ✅ Tipo de complicación (tipo_complicacion)
- ✅ Fecha de diagnóstico (fecha_diagnostico)

#### **Campos FALTANTES:**
- ❌ **Cobertura Microalbuminuria ⑥** - No almacenamos si se realizó el examen de microalbuminuria
- ❌ **Resultado de Microalbuminuria** - No almacenamos el resultado del examen
- ❌ **Referencia ⑪** - No almacenamos si el paciente fue referido a otro nivel de atención

**Tabla afectada:** `deteccion_complicaciones`

**Campos a agregar:**
```sql
-- En tabla deteccion_complicaciones
microalbuminuria_realizada BOOLEAN DEFAULT FALSE COMMENT 'Indica si se realizó examen de microalbuminuria',
microalbuminuria_resultado DECIMAL(10,2) NULL COMMENT 'Resultado del examen de microalbuminuria (mg/L o mg/g)',
fue_referido BOOLEAN DEFAULT FALSE COMMENT 'Indica si el paciente fue referido a otro nivel de atención',
referencia_observaciones TEXT COMMENT 'Detalles de la referencia (especialidad, institución, motivo)'
```

---

### **7. OTRAS ACCIONES DE PREVENCIÓN Y CONTROL** ❌ (NO IMPLEMENTADO)

#### **A) SALUD BUCAL** ❌
- ❌ **¿Presenta enfermedades odontológicas? ⑫** - No almacenamos
- ❌ **¿Recibió tratamiento odontológico?** - No almacenamos

**Tabla a crear:** `salud_bucal` o agregar a `deteccion_complicaciones`

**Estructura propuesta:**
```sql
CREATE TABLE salud_bucal (
  id_registro INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_cita INT,
  fecha_registro DATE NOT NULL,
  presenta_enfermedades_odontologicas BOOLEAN DEFAULT FALSE,
  recibio_tratamiento_odontologico BOOLEAN DEFAULT FALSE,
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita)
);
```

#### **B) TUBERCULOSIS** ❌
- ❌ **Aplicación de ENCUESTA de Tuberculosis** - No almacenamos
- ❌ **En caso de Baciloscopia, anote el resultado ⑬** - No almacenamos
- ❌ **¿Ingresó a tratamiento?** - No almacenamos

**Tabla a crear:** `deteccion_tuberculosis`

**Estructura propuesta:**
```sql
CREATE TABLE deteccion_tuberculosis (
  id_deteccion INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_cita INT,
  fecha_deteccion DATE NOT NULL,
  encuesta_aplicada BOOLEAN DEFAULT FALSE,
  fecha_encuesta DATE,
  baciloscopia_realizada BOOLEAN DEFAULT FALSE,
  baciloscopia_resultado ENUM('positivo', 'negativo', 'indeterminado', 'pendiente') NULL,
  fecha_baciloscopia DATE,
  ingreso_tratamiento BOOLEAN DEFAULT FALSE,
  fecha_inicio_tratamiento DATE,
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita)
);
```

---

### **8. BAJA** ⚠️ (Parcialmente implementado)

#### **Campos que YA tenemos:**
- ✅ activo (BOOLEAN) - Podemos marcar pacientes como inactivos

#### **Campos FALTANTES:**
- ❌ **Fecha de baja ⑭** - No almacenamos la fecha específica de baja
- ❌ **Motivo de baja** - No almacenamos el motivo de la baja del GAM

**Tabla afectada:** `pacientes`

**Campos a agregar:**
```sql
-- En tabla pacientes
fecha_baja DATE NULL COMMENT 'Fecha en que el paciente fue dado de baja del GAM',
motivo_baja TEXT COMMENT 'Motivo de la baja del paciente del GAM',
activo BOOLEAN DEFAULT TRUE -- Ya existe, pero podemos mejorarlo
```

---

## 📋 RESUMEN DE CAMPOS FALTANTES POR TABLA

### **Tabla: `signos_vitales`**
- ❌ `hba1c_porcentaje` (DECIMAL(5,2)) - Hemoglobina glucosilada (%) - Campo obligatorio para criterios de acreditación
- ❌ `edad_paciente_en_medicion` (INT) - Edad del paciente al momento de la medición (para clasificar rangos de HbA1c: 20-59 años vs 60+ años)

### **Tabla: `paciente_comorbilidad`**
- ❌ `es_diagnostico_basal` (BOOLEAN) - Diagnóstico inicial
- ❌ `año_diagnostico` (INTEGER) - Año del diagnóstico
- ❌ `es_agregado_posterior` (BOOLEAN) - Agregado después del basal
- ❌ `recibe_tratamiento_no_farmacologico` (BOOLEAN)
- ❌ `recibe_tratamiento_farmacologico` (BOOLEAN)

### **Tabla: `deteccion_complicaciones`**
- ❌ `microalbuminuria_realizada` (BOOLEAN)
- ❌ `microalbuminuria_resultado` (DECIMAL)
- ❌ `fue_referido` (BOOLEAN)
- ❌ `referencia_observaciones` (TEXT)

### **Tabla: `pacientes`**
- ❌ `numero_gam` (INTEGER) - Número de integrante en el GAM (N° en el formato)
- ❌ `fecha_baja` (DATE) - Fecha de baja del GAM
- ❌ `motivo_baja` (TEXT) - Motivo de la baja del paciente del GAM

### **Tablas NUEVAS a crear:**

#### **1. `sesiones_educativas`**
```sql
CREATE TABLE sesiones_educativas (
  id_sesion INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  fecha_sesion DATE NOT NULL,
  asistio BOOLEAN DEFAULT FALSE,
  tipo_sesion ENUM('nutricional', 'actividad_fisica', 'medico_preventiva', 'trabajo_social', 'psicologica', 'odontologica') NOT NULL,
  numero_intervenciones INT DEFAULT 1,
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  INDEX idx_paciente_fecha (id_paciente, fecha_sesion),
  INDEX idx_tipo_sesion (tipo_sesion)
);
```

#### **2. `salud_bucal`**
```sql
CREATE TABLE salud_bucal (
  id_registro INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_cita INT,
  fecha_registro DATE NOT NULL,
  presenta_enfermedades_odontologicas BOOLEAN DEFAULT FALSE,
  recibio_tratamiento_odontologico BOOLEAN DEFAULT FALSE,
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita),
  INDEX idx_paciente (id_paciente)
);
```

#### **3. `deteccion_tuberculosis`**
```sql
CREATE TABLE deteccion_tuberculosis (
  id_deteccion INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_cita INT,
  fecha_deteccion DATE NOT NULL,
  encuesta_aplicada BOOLEAN DEFAULT FALSE,
  fecha_encuesta DATE,
  baciloscopia_realizada BOOLEAN DEFAULT FALSE,
  baciloscopia_resultado ENUM('positivo', 'negativo', 'indeterminado', 'pendiente') NULL,
  fecha_baciloscopia DATE,
  ingreso_tratamiento BOOLEAN DEFAULT FALSE,
  fecha_inicio_tratamiento DATE,
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita),
  INDEX idx_paciente (id_paciente),
  INDEX idx_fecha (fecha_deteccion)
);
```

---

## 🎯 PRIORIZACIÓN DE IMPLEMENTACIÓN

### **🔴 ALTA PRIORIDAD (Criterios de Acreditación)**
1. ✅ **HbA1c (%)** - Campo crítico para acreditación
2. ✅ **Microalbuminuria** - Cobertura y resultado
3. ✅ **Tratamiento (Farmacológico/No Farmacológico)** - Requerido en formato

### **🟡 MEDIA PRIORIDAD (Datos importantes)**
4. ✅ **Sesiones Educativas** - Intervenciones del mes
5. ✅ **Diagnóstico Basal vs Agregado** - Diferenciación importante
6. ✅ **Referencia** - Seguimiento de pacientes referidos

### **🟢 BAJA PRIORIDAD (Datos complementarios)**
7. ✅ **Salud Bucal** - Datos complementarios
8. ✅ **Tuberculosis** - Datos complementarios
9. ✅ **Baja (fecha y motivo)** - Mejora de funcionalidad existente

---

## 📝 NOTAS IMPORTANTES

1. **Campos recientemente agregados:**
   - ✅ Colesterol LDL/HDL (ya implementado)
   - ✅ Trigliceridos (ya existe)

2. **Campos que pueden calcularse:**
   - Edad (se calcula desde fecha_nacimiento)
   - IMC (se calcula desde peso y talla)

3. **Campos que requieren validación:**
   - HbA1c: Rangos diferentes según edad (20-59 años vs 60+ años)
   - Trigliceridos: Solo para pacientes con Hipertrigliceridemia (similar a colesterol LDL/HDL)

---

**Documento creado el:** 29 de diciembre de 2025

