# 🔍 ANÁLISIS MODELO ENTIDAD-RELACIÓN Y NORMALIZACIÓN

**Fecha:** 29 de diciembre de 2025  
**Objetivo:** Analizar el modelo actual y optimizar la implementación de campos faltantes

---

## 📊 ANÁLISIS DEL MODELO ACTUAL

### **Entidades Principales Identificadas:**

1. **Paciente** (tabla: `pacientes`)
2. **SignoVital** (tabla: `signos_vitales`) - 1:N con Paciente
3. **PacienteComorbilidad** (tabla: `paciente_comorbilidad`) - N:M entre Paciente y Comorbilidad
4. **DeteccionComplicacion** (tabla: `deteccion_complicaciones`) - 1:N con Paciente
5. **Cita** (tabla: `citas`) - 1:N con Paciente
6. **PlanMedicacion** (tabla: `planes_medicacion`) - 1:N con Paciente
7. **Diagnostico** (tabla: `diagnosticos`) - 1:N con Cita

---

## ⚠️ CAMPOS REDUNDANTES/DUPLICADOS DETECTADOS

### **1. ❌ `edad_paciente_en_medicion` - NO NECESARIO**

**Análisis:**
- La edad se puede calcular desde `fecha_nacimiento` (en `pacientes`) y `fecha_medicion` (en `signos_vitales`)
- Almacenar edad viola la normalización (datos derivados)
- La edad cambia con el tiempo, almacenarla puede causar inconsistencias

**Decisión:** ✅ **NO almacenar** - Calcular en tiempo de ejecución

**Implementación:**
```sql
-- NO agregar este campo
-- Calcular en el controller:
-- edad = YEAR(fecha_medicion) - YEAR(fecha_nacimiento) - 
--        (DATE_FORMAT(fecha_medicion, '%m%d') < DATE_FORMAT(fecha_nacimiento, '%m%d'))
```

---

### **2. ⚠️ `año_diagnostico` - REDUNDANTE PERO ÚTIL**

**Análisis:**
- Ya existe `fecha_deteccion` en `paciente_comorbilidad`
- El año se puede extraer de la fecha: `YEAR(fecha_deteccion)`
- **PERO:** El formato GAM requiere específicamente el año como campo separado
- Puede ser útil para reportes y filtros

**Decisión:** ✅ **SÍ almacenar** - Campo requerido por formato, útil para consultas

**Justificación:**
- Facilita reportes por año
- Mejora rendimiento en consultas por año
- Cumple con formato oficial

---

### **3. ⚠️ Tratamiento Farmacológico - RELACIÓN CON `PlanMedicacion`**

**Análisis:**
- Ya existe tabla `planes_medicacion` que indica tratamiento farmacológico
- Un paciente con `PlanMedicacion.activo = true` tiene tratamiento farmacológico
- **PERO:** El formato requiere un booleano simple por comorbilidad

**Decisión:** ✅ **SÍ almacenar** - Campo booleano en `paciente_comorbilidad`

**Justificación:**
- El formato requiere respuesta directa por comorbilidad
- `PlanMedicacion` puede tener múltiples planes
- Simplifica consultas y reportes del formato GAM
- Puede sincronizarse con `PlanMedicacion` si es necesario

---

### **4. ✅ Asistencia a Evaluación Clínica - YA EXISTE**

**Análisis:**
- `Cita.asistencia` (BOOLEAN) ya existe
- `Cita.estado = 'atendida'` también indica asistencia
- `PuntoChequeo.asistencia` también existe

**Decisión:** ✅ **NO agregar campo nuevo** - Usar campos existentes

**Implementación:**
- Usar `Cita.asistencia` o `Cita.estado = 'atendida'` para reportes
- Documentar que este campo ya está implementado

---

## 📐 ANÁLISIS DE NORMALIZACIÓN (3NF)

### **Tablas Existentes - Estado de Normalización:**

#### **✅ `signos_vitales` - BIEN NORMALIZADA**
- Todos los campos son atómicos
- No hay dependencias transitivas
- `id_paciente` y `id_cita` son foreign keys correctas
- **Acción:** Agregar `hba1c_porcentaje` (campo atómico, no viola normalización)

#### **✅ `paciente_comorbilidad` - BIEN NORMALIZADA**
- Tabla intermedia N:M correcta
- Campos atómicos
- **Acción:** Agregar campos de tratamiento y diagnóstico basal (no violan normalización)

#### **✅ `deteccion_complicaciones` - BIEN NORMALIZADA**
- Relaciones correctas
- Campos atómicos
- **Acción:** Agregar microalbuminuria y referencia (no violan normalización)

#### **✅ `pacientes` - BIEN NORMALIZADA**
- Campos atómicos
- **Acción:** Agregar `fecha_baja`, `motivo_baja`, `numero_gam` (no violan normalización)

---

### **Nuevas Tablas Propuestas - Análisis de Normalización:**

#### **✅ `sesiones_educativas` - CORRECTA**
**Justificación:**
- 1:N con Paciente (correcto)
- Campos atómicos
- `tipo_sesion` como ENUM (normalizado)
- `numero_intervenciones` es atómico
- **Cumple 3NF**

**Estructura propuesta:**
```sql
CREATE TABLE sesiones_educativas (
  id_sesion INT PRIMARY KEY AUTO_INCREMENT,
  id_paciente INT NOT NULL,  -- FK a pacientes
  fecha_sesion DATE NOT NULL,
  asistio BOOLEAN DEFAULT FALSE,
  tipo_sesion ENUM(...) NOT NULL,  -- Normalizado
  numero_intervenciones INT DEFAULT 1,
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente)
);
```

#### **✅ `salud_bucal` - CORRECTA**
**Justificación:**
- 1:N con Paciente (correcto)
- Campos atómicos
- Relación opcional con Cita (correcto)
- **Cumple 3NF**

#### **✅ `deteccion_tuberculosis` - CORRECTA**
**Justificación:**
- 1:N con Paciente (correcto)
- Campos atómicos
- `baciloscopia_resultado` como ENUM (normalizado)
- **Cumple 3NF**

---

## 🔗 ANÁLISIS DE RELACIONES

### **Relaciones Actuales Relevantes:**

```
Paciente (1) ──< (N) SignoVital
Paciente (1) ──< (N) DeteccionComplicacion
Paciente (1) ──< (N) Cita
Paciente (1) ──< (N) PlanMedicacion
Paciente (N) >──< (N) Comorbilidad [a través de PacienteComorbilidad]
```

### **Nuevas Relaciones Propuestas:**

```
Paciente (1) ──< (N) SesionEducativa
Paciente (1) ──< (N) SaludBucal
Paciente (1) ──< (N) DeteccionTuberculosis
Cita (1) ──< (0..1) SaludBucal [opcional]
Cita (1) ──< (0..1) DeteccionTuberculosis [opcional]
```

**✅ Todas las relaciones propuestas son correctas y no violan normalización**

---

## 🎯 OPTIMIZACIONES Y MEJORES PRÁCTICAS

### **1. Índices Recomendados:**

#### **`signos_vitales`:**
```sql
-- Ya existe: idx_paciente (id_paciente)
-- Agregar si no existe:
CREATE INDEX idx_hba1c ON signos_vitales (hba1c_porcentaje) WHERE hba1c_porcentaje IS NOT NULL;
CREATE INDEX idx_fecha_medicion ON signos_vitales (fecha_medicion);
```

#### **`paciente_comorbilidad`:**
```sql
-- Ya existe: PRIMARY KEY (id_paciente, id_comorbilidad)
-- Agregar:
CREATE INDEX idx_diagnostico_basal ON paciente_comorbilidad (es_diagnostico_basal) WHERE es_diagnostico_basal = TRUE;
CREATE INDEX idx_año_diagnostico ON paciente_comorbilidad (año_diagnostico);
```

#### **`deteccion_complicaciones`:**
```sql
-- Ya existen índices básicos
-- Agregar:
CREATE INDEX idx_microalbuminuria ON deteccion_complicaciones (microalbuminuria_realizada) WHERE microalbuminuria_realizada = TRUE;
CREATE INDEX idx_referido ON deteccion_complicaciones (fue_referido) WHERE fue_referido = TRUE;
```

#### **`sesiones_educativas` (nueva):**
```sql
CREATE INDEX idx_paciente_fecha ON sesiones_educativas (id_paciente, fecha_sesion);
CREATE INDEX idx_tipo_sesion ON sesiones_educativas (tipo_sesion);
CREATE INDEX idx_mes ON sesiones_educativas (YEAR(fecha_sesion), MONTH(fecha_sesion));
```

---

### **2. Constraints y Validaciones:**

#### **Validaciones de Negocio:**
- `hba1c_porcentaje`: 3.0 - 15.0
- `microalbuminuria_resultado`: 0 - 1000 mg/g
- `año_diagnostico`: 1900 - año actual
- `numero_gam`: Entero positivo, único por módulo

#### **Constraints de Integridad:**
- Foreign keys con `ON DELETE CASCADE` o `ON DELETE SET NULL` según corresponda
- CHECK constraints para rangos válidos (si MySQL lo soporta)

---

### **3. Campos Calculados (NO almacenar):**

#### **Edad:**
- ❌ NO almacenar `edad_paciente_en_medicion`
- ✅ Calcular desde `fecha_nacimiento` y `fecha_medicion`

#### **IMC:**
- ✅ Ya se calcula correctamente (no se almacena redundante)

---

## 📋 DECISIONES FINALES SOBRE CAMPOS

### **Campos a AGREGAR:**

#### **`signos_vitales`:**
- ✅ `hba1c_porcentaje` DECIMAL(5,2) NULL
- ❌ `edad_paciente_en_medicion` - **NO AGREGAR** (calcular)

#### **`paciente_comorbilidad`:**
- ✅ `es_diagnostico_basal` BOOLEAN DEFAULT FALSE
- ✅ `año_diagnostico` INTEGER NULL
- ✅ `es_agregado_posterior` BOOLEAN DEFAULT FALSE
- ✅ `recibe_tratamiento_no_farmacologico` BOOLEAN DEFAULT FALSE
- ✅ `recibe_tratamiento_farmacologico` BOOLEAN DEFAULT FALSE

#### **`deteccion_complicaciones`:**
- ✅ `microalbuminuria_realizada` BOOLEAN DEFAULT FALSE
- ✅ `microalbuminuria_resultado` DECIMAL(10,2) NULL
- ✅ `fue_referido` BOOLEAN DEFAULT FALSE
- ✅ `referencia_observaciones` TEXT NULL

#### **`pacientes`:**
- ✅ `fecha_baja` DATE NULL
- ✅ `motivo_baja` TEXT NULL
- ✅ `numero_gam` INT NULL

### **Tablas NUEVAS a crear:**
- ✅ `sesiones_educativas`
- ✅ `salud_bucal`
- ✅ `deteccion_tuberculosis`

### **Campos que YA EXISTEN (no agregar):**
- ✅ Asistencia a evaluación clínica → `Cita.asistencia` o `Cita.estado = 'atendida'`

---

## 🔒 CONSIDERACIONES DE SEGURIDAD

### **1. Validación de Datos:**
- Todos los campos numéricos deben validarse en backend
- Rangos válidos según instrucciones del formato
- Sanitización de texto (TEXT fields)

### **2. Integridad Referencial:**
- Foreign keys con acciones apropiadas
- No permitir eliminación de pacientes con datos relacionados (CASCADE o RESTRICT según caso)

### **3. Transacciones:**
- Todas las migraciones en transacciones
- Rollback automático en caso de error

---

## 📊 RESUMEN DE CAMBIOS AL PLAN ORIGINAL

### **Cambios Aplicados:**

1. ❌ **Eliminado:** `edad_paciente_en_medicion` - Se calculará en tiempo de ejecución
2. ✅ **Mantenido:** `año_diagnostico` - Útil para reportes y formato
3. ✅ **Mantenido:** Campos de tratamiento - Necesarios para formato GAM
4. ✅ **Documentado:** Asistencia a evaluación clínica ya existe

### **Optimizaciones Aplicadas:**

1. Índices optimizados para consultas frecuentes
2. Campos calculados no almacenados
3. Relaciones normalizadas correctamente
4. Validaciones de negocio documentadas

---

**Análisis completado:** ✅  
**Normalización verificada:** ✅  
**Sin redundancias detectadas:** ✅

