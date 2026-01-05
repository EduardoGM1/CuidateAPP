# 📋 CAMPOS FALTANTES - FORMA 2022 OFICIAL (CON INSTRUCCIONES DETALLADAS)

**Fecha:** 29 de diciembre de 2025  
**Análisis:** Comparación del formato GAM con modelos actuales de BD  
**Incluye:** Instrucciones específicas del instructivo para cada campo

---

## 📊 RESUMEN EJECUTIVO

**Total de campos faltantes identificados:** 25+ campos  
**Categorías afectadas:** 7 áreas principales  
**Prioridad:** Alta (campos requeridos para cumplimiento del formato oficial)

---

## 🔍 CAMPOS FALTANTES POR APARTADO (CON INSTRUCCIONES)

### **1. DATOS DE IDENTIFICACIÓN** ✅ (Mayormente completo)

#### **Campos que YA tenemos:**
- ✅ NOMBRE (nombre, apellido_paterno, apellido_materno)
- ✅ Fecha de nacimiento (fecha_nacimiento)
- ✅ Edad (calculada desde fecha_nacimiento)
- ✅ CURP
- ✅ Institución de salud (institucion_salud) - **Instrucción ④ aplicada**
- ✅ Sexo (sexo: Hombre/Mujer) - "Anote 1, según corresponda" (F/M)

#### **Campos FALTANTES:**

##### **❌ N° (Número de integrante en el GAM)**
- **Instrucción del formato:** "Anote 1 en la casilla de cada integrante, la suma final está vinculada a las fórmulas"
- **Descripción:** Número de orden del paciente en el grupo de ayuda mutua
- **Uso:** Para cálculos y reportes del GAM
- **Tabla:** `pacientes`
- **Tipo:** INTEGER
- **SQL:**
```sql
ALTER TABLE pacientes 
ADD COLUMN numero_gam INT NULL COMMENT 'Número de integrante en el GAM (para fórmulas y reportes)';
```

---

### **2. DX ENFERMEDADES CRÓNICAS** ⚠️ (Parcialmente completo)

#### **Campos que YA tenemos:**
- ✅ Diagnósticos (tabla `comorbilidades` y `paciente_comorbilidad`)
- ✅ Fecha de detección (fecha_deteccion en `paciente_comorbilidad`)
- ✅ Tipos: Diabetes, Obesidad, HTA, Dislipidemia

#### **Campos FALTANTES:**

##### **❌ Basal del paciente ①**
- **Instrucción del formato:** "Basal del paciente ①"
- **Descripción:** Identifica si un diagnóstico es el diagnóstico basal (inicial) del paciente
- **Uso:** Diferenciar diagnósticos iniciales de agregados posteriormente
- **Tabla:** `paciente_comorbilidad`
- **Tipo:** BOOLEAN
- **SQL:**
```sql
ALTER TABLE paciente_comorbilidad 
ADD COLUMN es_diagnostico_basal BOOLEAN DEFAULT FALSE 
COMMENT '① Indica si es el diagnóstico basal (inicial) del paciente';
```

##### **❌ Año del Dx (Año del diagnóstico)**
- **Instrucción del formato:** "Año del Dx"
- **Descripción:** Año específico en que se diagnosticó la comorbilidad
- **Uso:** Reportes y seguimiento temporal
- **Tabla:** `paciente_comorbilidad`
- **Tipo:** INTEGER (año: YYYY)
- **SQL:**
```sql
ALTER TABLE paciente_comorbilidad 
ADD COLUMN año_diagnostico INTEGER NULL 
COMMENT 'Año en que se diagnosticó la comorbilidad (YYYY)';
```

##### **❌ Dx. (s) Agregados posterior al Basal**
- **Instrucción del formato:** "Dx. (s) Agregados posterior al Basal"
- **Descripción:** Indica si el diagnóstico fue agregado después del diagnóstico basal
- **Uso:** Diferenciar diagnósticos iniciales de agregados
- **Tabla:** `paciente_comorbilidad`
- **Tipo:** BOOLEAN
- **SQL:**
```sql
ALTER TABLE paciente_comorbilidad 
ADD COLUMN es_agregado_posterior BOOLEAN DEFAULT FALSE 
COMMENT 'Indica si el diagnóstico fue agregado después del diagnóstico basal';
```

---

### **3. RECIBE TRATAMIENTO** ❌ (NO IMPLEMENTADO)

#### **Campos FALTANTES:**

##### **❌ No Farmacológico ②**
- **Instrucción del formato:** "No Farmacológico ②"
- **Descripción:** Indica si el paciente recibe tratamiento no farmacológico para su comorbilidad
- **Uso:** Reportes de cobertura de tratamiento
- **Tabla:** `paciente_comorbilidad` o nueva tabla `paciente_tratamiento`
- **Tipo:** BOOLEAN
- **SQL (Opción 1 - Agregar a paciente_comorbilidad):**
```sql
ALTER TABLE paciente_comorbilidad 
ADD COLUMN recibe_tratamiento_no_farmacologico BOOLEAN DEFAULT FALSE 
COMMENT '② Indica si el paciente recibe tratamiento no farmacológico';
```

##### **❌ Farmacológico ③**
- **Instrucción del formato:** "Farmacológico ③"
- **Descripción:** Indica si el paciente recibe tratamiento farmacológico para su comorbilidad
- **Uso:** Reportes de cobertura de tratamiento
- **Nota:** Aunque tenemos planes de medicación, no tenemos un campo booleano específico que indique si recibe tratamiento farmacológico
- **Tabla:** `paciente_comorbilidad` o nueva tabla `paciente_tratamiento`
- **Tipo:** BOOLEAN
- **SQL (Opción 1 - Agregar a paciente_comorbilidad):**
```sql
ALTER TABLE paciente_comorbilidad 
ADD COLUMN recibe_tratamiento_farmacologico BOOLEAN DEFAULT FALSE 
COMMENT '③ Indica si el paciente recibe tratamiento farmacológico';
```

**SQL (Opción 2 - Nueva tabla):**
```sql
CREATE TABLE paciente_tratamiento (
  id_tratamiento INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_comorbilidad INT,
  recibe_tratamiento_no_farmacologico BOOLEAN DEFAULT FALSE COMMENT '②',
  recibe_tratamiento_farmacologico BOOLEAN DEFAULT FALSE COMMENT '③',
  fecha_registro DATE,
  observaciones TEXT,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  FOREIGN KEY (id_comorbilidad) REFERENCES comorbilidades(id_comorbilidad),
  INDEX idx_paciente (id_paciente)
);
```

---

### **4. EDUCACIÓN PARA LA SALUD** ❌ (NO IMPLEMENTADO)

#### **Campos FALTANTES:**

##### **❌ Asistió a sesión educativa (1=SI, 0=NO)**
- **Instrucción del formato:** "Asistió a sesión educativa (1=SI, 0=NO)"
- **Descripción:** Registra si el paciente asistió a una sesión educativa
- **Uso:** Reportes de participación en educación para la salud
- **Tabla:** Nueva tabla `sesiones_educativas`
- **Tipo:** BOOLEAN

##### **❌ N° de intervenciones en el mes por integrante**
- **Instrucción del formato:** "Anote el N° de intervenciones en el mes por integrante"
- **Descripción:** Número de intervenciones educativas recibidas por tipo en el mes
- **Tipos de intervención:**
  - Nutricional
  - Actividad Física
  - Médico-preventiva
  - Trabajo Social
  - Psicológica
  - Odontológica
- **Uso:** Reportes mensuales de intervenciones educativas
- **Tabla:** Nueva tabla `sesiones_educativas`
- **Tipo:** INTEGER (contador)

**SQL - Nueva tabla:**
```sql
CREATE TABLE sesiones_educativas (
  id_sesion INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
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
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  INDEX idx_paciente_fecha (id_paciente, fecha_sesion),
  INDEX idx_tipo_sesion (tipo_sesion),
  INDEX idx_mes (YEAR(fecha_sesion), MONTH(fecha_sesion))
) COMMENT 'Registro de sesiones e intervenciones educativas para la salud';
```

---

### **5. VARIABLES / CRITERIOS DE ACREDITACIÓN** ⚠️ (Parcialmente completo)

#### **Campos que YA tenemos:**
- ✅ Asistencia a evaluación clínica (implícito en citas con estado 'atendida')
- ✅ ANTROPOMETRÍA:
  - ✅ Peso (peso_kg) - "*Peso (Kg)"
  - ✅ Talla (talla_m) - "*Talla (m)"
  - ✅ IMC (imc - calculado) - "*IMC"
  - ✅ Circunf. de cintura (medida_cintura_cm) - "*Circunf. de cintura (cm)"
- ✅ Presión Arterial (presion_sistolica, presion_diastolica) - "*Presión Arterial mmHg"
- ✅ COLESTEROL:
  - ✅ Colesterol Total (colesterol_mg_dl) - "*Colesterol Total (mg/dl)"
  - ✅ LDL (colesterol_ldl) ✅ RECIÉN AGREGADO - "LDL"
  - ✅ HDL (colesterol_hdl) ✅ RECIÉN AGREGADO - "HDL"
- ✅ TRIGLICERIDOS (trigliceridos_mg_dl) - "*TRIGLICERIDOS (INTEGRANTES CON DX HIPERTRIGLICERIDEMIA)"

#### **Campos FALTANTES:**

##### **❌ HbA1c (%) - Hemoglobina glucosilada**
- **Instrucción del formato:** "*HbA1c (%)" - Campo marcado con asterisco (*) = Criterio de Acreditación
- **Descripción:** Hemoglobina glucosilada, medida en porcentaje
- **Rangos según edad:**
  - **20 a 59 años:** Rango específico (típicamente <7%)
  - **60 años y más:** Rango específico (típicamente <8%)
- **Uso:** Criterio obligatorio para acreditación del GAM
- **Tabla:** `signos_vitales`
- **Tipo:** DECIMAL(5,2) - Porcentaje (ej: 6.5, 7.2)
- **Validación requerida:** Diferentes rangos según edad del paciente
- **SQL:**
```sql
ALTER TABLE signos_vitales 
ADD COLUMN hba1c_porcentaje DECIMAL(5,2) NULL 
COMMENT '*HbA1c (%) - Campo obligatorio para criterios de acreditación. Rangos: 20-59 años vs 60+ años';

ALTER TABLE signos_vitales 
ADD COLUMN edad_paciente_en_medicion INT NULL 
COMMENT 'Edad del paciente al momento de la medición (para clasificar rangos de HbA1c: 20-59 años vs 60+ años)';

-- Índice para búsquedas por HbA1c
CREATE INDEX idx_hba1c ON signos_vitales (hba1c_porcentaje);
```

---

### **6. DETECCIÓN DE COMPLICACIONES** ⚠️ (Parcialmente completo)

#### **Campos que YA tenemos:**
- ✅ Exploración de pies (exploracion_pies) - **Instrucción ⑦**
- ✅ Exploración de Fondo de Ojo (exploracion_fondo_ojo) - **Instrucción ⑧**
- ✅ Realiza Auto-monitoreo (realiza_auto_monitoreo) - **Instrucción 9**
- ✅ Tipo de complicación (tipo_complicacion) - **Instrucción ⑩**
- ✅ Fecha de diagnóstico (fecha_diagnostico)

#### **Campos FALTANTES:**

##### **❌ Cobertura Microalbuminuria ⑥**
- **Instrucción del formato:** "Cobertura Microalbuminuria ⑥"
- **Descripción:** Indica si se realizó el examen de microalbuminuria al paciente
- **Uso:** Reportes de cobertura de detección de complicaciones
- **Tabla:** `deteccion_complicaciones`
- **Tipo:** BOOLEAN
- **SQL:**
```sql
ALTER TABLE deteccion_complicaciones 
ADD COLUMN microalbuminuria_realizada BOOLEAN DEFAULT FALSE 
COMMENT '⑥ Indica si se realizó examen de microalbuminuria';
```

##### **❌ Resultado de Microalbuminuria**
- **Instrucción del formato:** "Resultado" (en columna de Microalbuminuria)
- **Descripción:** Resultado numérico del examen de microalbuminuria
- **Unidades:** mg/L o mg/g de creatinina
- **Uso:** Seguimiento de nefropatía diabética
- **Tabla:** `deteccion_complicaciones`
- **Tipo:** DECIMAL(10,2)
- **SQL:**
```sql
ALTER TABLE deteccion_complicaciones 
ADD COLUMN microalbuminuria_resultado DECIMAL(10,2) NULL 
COMMENT 'Resultado del examen de microalbuminuria (mg/L o mg/g de creatinina)';
```

##### **❌ Referencia ⑪**
- **Instrucción del formato:** "Referencia ⑪"
- **Descripción:** Indica si el paciente fue referido a otro nivel de atención
- **Uso:** Seguimiento de pacientes referidos a especialistas
- **Tabla:** `deteccion_complicaciones`
- **Tipo:** BOOLEAN + TEXT (observaciones)
- **SQL:**
```sql
ALTER TABLE deteccion_complicaciones 
ADD COLUMN fue_referido BOOLEAN DEFAULT FALSE 
COMMENT '⑪ Indica si el paciente fue referido a otro nivel de atención';

ALTER TABLE deteccion_complicaciones 
ADD COLUMN referencia_observaciones TEXT NULL 
COMMENT 'Detalles de la referencia (especialidad, institución, motivo)';
```

---

### **7. OTRAS ACCIONES DE PREVENCIÓN Y CONTROL** ❌ (NO IMPLEMENTADO)

#### **A) SALUD BUCAL** ❌

##### **❌ ¿Presenta enfermedades odontológicas? ⑫**
- **Instrucción del formato:** "¿Presenta enfermedades odontológicas? ⑫"
- **Descripción:** Indica si el paciente presenta enfermedades odontológicas
- **Uso:** Reportes de salud bucal
- **Tabla:** Nueva tabla `salud_bucal`
- **Tipo:** BOOLEAN

##### **❌ ¿Recibió tratamiento odontológico?**
- **Instrucción del formato:** "¿Recibió tratamiento odontológico?**"
- **Descripción:** Indica si el paciente recibió tratamiento odontológico
- **Uso:** Reportes de cobertura de tratamiento odontológico
- **Tabla:** Nueva tabla `salud_bucal`
- **Tipo:** BOOLEAN

**SQL - Nueva tabla:**
```sql
CREATE TABLE salud_bucal (
  id_registro INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_cita INT,
  fecha_registro DATE NOT NULL,
  presenta_enfermedades_odontologicas BOOLEAN DEFAULT FALSE 
    COMMENT '⑫ ¿Presenta enfermedades odontológicas?',
  recibio_tratamiento_odontologico BOOLEAN DEFAULT FALSE 
    COMMENT '¿Recibió tratamiento odontológico?',
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita),
  INDEX idx_paciente (id_paciente),
  INDEX idx_fecha (fecha_registro)
) COMMENT 'Registro de salud bucal del paciente';
```

#### **B) TUBERCULOSIS** ❌

##### **❌ Aplicación de ENCUESTA de Tuberculosis**
- **Instrucción del formato:** "Aplicación de ENCUESTA de Tuberculosis**"
- **Descripción:** Indica si se aplicó la encuesta de detección de tuberculosis
- **Uso:** Reportes de detección de tuberculosis
- **Tabla:** Nueva tabla `deteccion_tuberculosis`
- **Tipo:** BOOLEAN

##### **❌ En caso de Baciloscopia, anote el resultado ⑬**
- **Instrucción del formato:** "En caso de Baciloscopia anote el resultado ⑬"
- **Descripción:** Resultado de la baciloscopia si se realizó
- **Valores posibles:** Positivo, Negativo, Indeterminado, Pendiente
- **Uso:** Seguimiento de casos de tuberculosis
- **Tabla:** Nueva tabla `deteccion_tuberculosis`
- **Tipo:** ENUM

##### **❌ ¿Ingresó a tratamiento?**
- **Instrucción del formato:** "**¿Ingresó a tratamiento?"
- **Descripción:** Indica si el paciente ingresó a tratamiento para tuberculosis
- **Uso:** Reportes de cobertura de tratamiento de tuberculosis
- **Tabla:** Nueva tabla `deteccion_tuberculosis`
- **Tipo:** BOOLEAN

**SQL - Nueva tabla:**
```sql
CREATE TABLE deteccion_tuberculosis (
  id_deteccion INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,
  id_cita INT,
  fecha_deteccion DATE NOT NULL,
  encuesta_aplicada BOOLEAN DEFAULT FALSE 
    COMMENT 'Aplicación de ENCUESTA de Tuberculosis',
  fecha_encuesta DATE NULL,
  baciloscopia_realizada BOOLEAN DEFAULT FALSE 
    COMMENT 'Indica si se realizó baciloscopia',
  baciloscopia_resultado ENUM('positivo', 'negativo', 'indeterminado', 'pendiente') NULL 
    COMMENT '⑬ En caso de Baciloscopia anote el resultado',
  fecha_baciloscopia DATE NULL,
  ingreso_tratamiento BOOLEAN DEFAULT FALSE 
    COMMENT '¿Ingresó a tratamiento?',
  fecha_inicio_tratamiento DATE NULL,
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente),
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita),
  INDEX idx_paciente (id_paciente),
  INDEX idx_fecha (fecha_deteccion)
) COMMENT 'Registro de detección y seguimiento de tuberculosis';
```

---

### **8. BAJA** ⚠️ (Parcialmente implementado)

#### **Campos que YA tenemos:**
- ✅ activo (BOOLEAN) - Podemos marcar pacientes como inactivos

#### **Campos FALTANTES:**

##### **❌ Fecha de baja ⑭**
- **Instrucción del formato:** "Baja ⑭"
- **Descripción:** Fecha en que el paciente fue dado de baja del GAM
- **Uso:** Reportes de bajas del grupo
- **Tabla:** `pacientes`
- **Tipo:** DATE
- **SQL:**
```sql
ALTER TABLE pacientes 
ADD COLUMN fecha_baja DATE NULL 
COMMENT '⑭ Fecha en que el paciente fue dado de baja del GAM';
```

##### **❌ Motivo de baja**
- **Instrucción del formato:** Implícito en "Baja ⑭"
- **Descripción:** Motivo por el cual el paciente fue dado de baja del GAM
- **Uso:** Análisis de causas de baja
- **Tabla:** `pacientes`
- **Tipo:** TEXT
- **SQL:**
```sql
ALTER TABLE pacientes 
ADD COLUMN motivo_baja TEXT NULL 
COMMENT 'Motivo de la baja del paciente del GAM';
```

---

## 📋 RESUMEN DE CAMPOS FALTANTES POR TABLA (CON INSTRUCCIONES)

### **Tabla: `signos_vitales`**

#### **❌ hba1c_porcentaje**
- **Instrucción:** "*HbA1c (%)" - Campo con asterisco = Criterio de Acreditación
- **Tipo:** DECIMAL(5,2)
- **Validación:** Rangos diferentes según edad (20-59 años vs 60+ años)
- **Prioridad:** 🔴 ALTA

#### **❌ edad_paciente_en_medicion**
- **Instrucción:** Requerido para clasificar rangos de HbA1c
- **Tipo:** INT
- **Uso:** Clasificar en rangos "20 a 59 años" vs "60 años y más"
- **Prioridad:** 🔴 ALTA

---

### **Tabla: `paciente_comorbilidad`**

#### **❌ es_diagnostico_basal**
- **Instrucción:** "Basal del paciente ①"
- **Tipo:** BOOLEAN
- **Prioridad:** 🟡 MEDIA

#### **❌ año_diagnostico**
- **Instrucción:** "Año del Dx"
- **Tipo:** INTEGER (YYYY)
- **Prioridad:** 🟡 MEDIA

#### **❌ es_agregado_posterior**
- **Instrucción:** "Dx. (s) Agregados posterior al Basal"
- **Tipo:** BOOLEAN
- **Prioridad:** 🟡 MEDIA

#### **❌ recibe_tratamiento_no_farmacologico**
- **Instrucción:** "No Farmacológico ②"
- **Tipo:** BOOLEAN
- **Prioridad:** 🔴 ALTA

#### **❌ recibe_tratamiento_farmacologico**
- **Instrucción:** "Farmacológico ③"
- **Tipo:** BOOLEAN
- **Prioridad:** 🔴 ALTA

---

### **Tabla: `deteccion_complicaciones`**

#### **❌ microalbuminuria_realizada**
- **Instrucción:** "Cobertura Microalbuminuria ⑥"
- **Tipo:** BOOLEAN
- **Prioridad:** 🔴 ALTA

#### **❌ microalbuminuria_resultado**
- **Instrucción:** "Resultado" (columna de Microalbuminuria)
- **Tipo:** DECIMAL(10,2)
- **Unidades:** mg/L o mg/g de creatinina
- **Prioridad:** 🔴 ALTA

#### **❌ fue_referido**
- **Instrucción:** "Referencia ⑪"
- **Tipo:** BOOLEAN
- **Prioridad:** 🟡 MEDIA

#### **❌ referencia_observaciones**
- **Instrucción:** "Referencia ⑪" (detalles)
- **Tipo:** TEXT
- **Prioridad:** 🟡 MEDIA

---

### **Tabla: `pacientes`**

#### **❌ numero_gam**
- **Instrucción:** "Anote 1 en la casilla de cada integrante, la suma final está vinculada a las fórmulas"
- **Tipo:** INTEGER
- **Uso:** Número de orden en el GAM para fórmulas
- **Prioridad:** 🟢 BAJA

#### **❌ fecha_baja**
- **Instrucción:** "Baja ⑭"
- **Tipo:** DATE
- **Prioridad:** 🟢 BAJA

#### **❌ motivo_baja**
- **Instrucción:** Implícito en "Baja ⑭"
- **Tipo:** TEXT
- **Prioridad:** 🟢 BAJA

---

### **Tablas NUEVAS a crear:**

#### **1. `sesiones_educativas`**
- **Instrucción:** "Asistió a sesión educativa (1=SI, 0=NO)" y "Anote el N° de intervenciones en el mes por integrante"
- **Tipos:** Nutricional, Actividad Física, Médico-preventiva, Trabajo Social, Psicológica, Odontológica
- **Prioridad:** 🟡 MEDIA

#### **2. `salud_bucal`**
- **Instrucción:** "¿Presenta enfermedades odontológicas? ⑫" y "¿Recibió tratamiento odontológico?**"
- **Prioridad:** 🟢 BAJA

#### **3. `deteccion_tuberculosis`**
- **Instrucción:** "Aplicación de ENCUESTA de Tuberculosis**", "En caso de Baciloscopia anote el resultado ⑬", "¿Ingresó a tratamiento?"
- **Prioridad:** 🟢 BAJA

---

## 🎯 PRIORIZACIÓN CON INSTRUCCIONES

### **🔴 ALTA PRIORIDAD (Criterios de Acreditación - Campos con asterisco *)**

1. **HbA1c (%)** - "*HbA1c (%)" - Campo obligatorio para acreditación
2. **Microalbuminuria** - "Cobertura Microalbuminuria ⑥" - Criterio de acreditación
3. **Tratamiento** - "No Farmacológico ②" y "Farmacológico ③" - Requerido en formato

### **🟡 MEDIA PRIORIDAD (Datos importantes con instrucciones)**

4. **Sesiones Educativas** - "Asistió a sesión educativa (1=SI, 0=NO)" y "N° de intervenciones"
5. **Diagnóstico Basal** - "Basal del paciente ①" y "Dx. Agregados posterior al Basal"
6. **Referencia** - "Referencia ⑪"

### **🟢 BAJA PRIORIDAD (Datos complementarios)**

7. **Salud Bucal** - "¿Presenta enfermedades odontológicas? ⑫"
8. **Tuberculosis** - "Encuesta de Tuberculosis" y "Baciloscopia ⑬"
9. **Baja** - "Baja ⑭"
10. **Número GAM** - "Anote 1 en la casilla de cada integrante"

---

## 📝 NOTAS SOBRE INSTRUCCIONES

### **Campos con asterisco (*) = Criterios de Acreditación:**
- *Peso (Kg)
- *Talla (m)
- *IMC
- *Circunf. de cintura (cm)
- *Presión Arterial mmHg
- *HbA1c (%) ⚠️ **FALTANTE**
- *Colesterol Total (mg/dl)
- *TRIGLICERIDOS (solo para pacientes con Hipertrigliceridemia)

### **Campos con doble asterisco (**) = Datos complementarios:**
- **¿Recibió tratamiento odontológico?**
- **Aplicación de ENCUESTA de Tuberculosis**

### **Campos con números ①-⑭ = Instrucciones específicas:**
- ① Basal del paciente
- ② No Farmacológico
- ③ Farmacológico
- ④ Institución de salud (YA IMPLEMENTADO)
- ⑥ Cobertura Microalbuminuria
- ⑦ Exploración de pies (YA IMPLEMENTADO)
- ⑧ Exploración de Fondo de Ojo (YA IMPLEMENTADO)
- 9 Realiza Auto-monitoreo (YA IMPLEMENTADO)
- ⑩ Tipo (YA IMPLEMENTADO)
- ⑪ Referencia
- ⑫ ¿Presenta enfermedades odontológicas?
- ⑬ Baciloscopia resultado
- ⑭ Baja

---

## 🔧 VALIDACIONES REQUERIDAS SEGÚN INSTRUCCIONES

### **HbA1c - Rangos según edad:**
- **20 a 59 años:** Rango objetivo típicamente <7%
- **60 años y más:** Rango objetivo típicamente <8%
- **Validación:** Debe validarse según la edad del paciente al momento de la medición

### **Tratamiento:**
- **No Farmacológico ②:** Incluye dieta, ejercicio, cambios de estilo de vida
- **Farmacológico ③:** Incluye medicamentos prescritos

### **Microalbuminuria:**
- **Cobertura ⑥:** Debe realizarse anualmente en pacientes con diabetes
- **Resultado:** Valores normales <30 mg/g de creatinina

---

**Documento creado el:** 29 de diciembre de 2025  
**Incluye:** Instrucciones específicas del formato oficial para cada campo

