# 🔍 ANÁLISIS ENTIDAD-RELACIÓN Y NORMALIZACIÓN - CAMPOS FALTANTES

**Fecha:** 29 de diciembre de 2025  
**Objetivo:** Analizar el modelo ER actual, verificar duplicados y asegurar normalización antes de implementar

---

## 📊 ANÁLISIS DEL MODELO ENTIDAD-RELACIÓN ACTUAL

### **Relaciones Principales Identificadas:**

```
Paciente (1) ──< (N) SignoVital
Paciente (1) ──< (N) Cita
Paciente (1) ──< (N) PlanMedicacion
Paciente (N) ──< (M) Comorbilidad [a través de PacienteComorbilidad]
Paciente (1) ──< (N) DeteccionComplicacion
Paciente (1) ──< (N) EsquemaVacunacion
Paciente (1) ──< (N) RedApoyo
Paciente (1) ──< (N) MensajeChat

Cita (1) ──< (N) SignoVital
Cita (1) ──< (N) Diagnostico
Cita (1) ──< (N) PlanMedicacion
Cita (1) ──< (N) DeteccionComplicacion

PlanMedicacion (1) ──< (N) PlanDetalle
PlanDetalle (N) ──> (1) Medicamento
```

---

## 🔍 VERIFICACIÓN DE DUPLICADOS Y REDUNDANCIAS

### **1. ANÁLISIS: Año del Diagnóstico**

#### **Campo propuesto:** `año_diagnostico` en `paciente_comorbilidad`

#### **Campo existente:** `fecha_deteccion` (DATEONLY) en `paciente_comorbilidad`

#### **Análisis:**
- ✅ **NO ES DUPLICADO** - `fecha_deteccion` almacena fecha completa (YYYY-MM-DD)
- ✅ **JUSTIFICACIÓN:** El formato GAM requiere año específico (YYYY) para reportes
- ⚠️ **NORMALIZACIÓN:** Podría calcularse con `YEAR(fecha_deteccion)`, pero:
  - El formato puede requerir año diferente al de fecha_deteccion
  - Almacenar año mejora rendimiento en consultas de reportes
  - Facilita filtros por año sin funciones de fecha

#### **Decisión:** ✅ **AGREGAR** `año_diagnostico INTEGER`
- **Razón:** Requerido por formato, mejora rendimiento, permite años históricos

---

### **2. ANÁLISIS: Edad en Medición**

#### **Campo propuesto:** `edad_paciente_en_medicion` en `signos_vitales`

#### **Campo existente:** `fecha_nacimiento` en `pacientes`

#### **Análisis:**
- ✅ **NO ES DUPLICADO** - `fecha_nacimiento` es fecha de nacimiento
- ⚠️ **NORMALIZACIÓN:** Podría calcularse: `YEAR(CURDATE()) - YEAR(fecha_nacimiento)`
- ✅ **JUSTIFICACIÓN:** 
  - Necesario para validación de rangos de HbA1c (20-59 vs 60+)
  - Evita cálculos repetidos en consultas
  - Captura edad exacta al momento de medición (importante para reportes históricos)

#### **Decisión:** ✅ **AGREGAR** `edad_paciente_en_medicion INT`
- **Razón:** Validación crítica, rendimiento, precisión histórica

---

### **3. ANÁLISIS: Tratamiento Farmacológico**

#### **Campo propuesto:** `recibe_tratamiento_farmacologico` en `paciente_comorbilidad`

#### **Campo existente:** `PlanMedicacion` (tabla completa con `id_paciente`, `fecha_inicio`, `fecha_fin`, `activo`)

#### **Análisis:**
- ⚠️ **POSIBLE REDUNDANCIA** - `PlanMedicacion` ya indica tratamiento farmacológico
- ✅ **DIFERENCIA:** 
  - `PlanMedicacion` = Plan detallado con medicamentos, dosis, horarios
  - `recibe_tratamiento_farmacologico` = Indicador booleano simple para formato GAM
- ✅ **JUSTIFICACIÓN:**
  - Formato GAM requiere campo booleano simple (1=SI, 0=NO)
  - `PlanMedicacion` puede estar inactivo pero paciente aún recibe tratamiento
  - Consultas más rápidas para reportes del formato

#### **Decisión:** ✅ **AGREGAR** `recibe_tratamiento_farmacologico BOOLEAN`
- **Razón:** Requerido por formato, simplifica reportes, independiente de planes activos
- **NOTA:** Debe sincronizarse con `PlanMedicacion` (trigger o lógica de aplicación)

---

### **4. ANÁLISIS: Tratamiento No Farmacológico**

#### **Campo propuesto:** `recibe_tratamiento_no_farmacologico` en `paciente_comorbilidad`

#### **Campo existente:** ❌ **NO EXISTE** - No hay tabla/modelo para tratamiento no farmacológico

#### **Análisis:**
- ✅ **NO ES DUPLICADO** - Campo nuevo necesario
- ✅ **NORMALIZACIÓN:** Correcto en `paciente_comorbilidad` (relacionado con comorbilidad específica)

#### **Decisión:** ✅ **AGREGAR** `recibe_tratamiento_no_farmacologico BOOLEAN`

---

### **5. ANÁLISIS: Diagnóstico Basal**

#### **Campo propuesto:** `es_diagnostico_basal` y `es_agregado_posterior` en `paciente_comorbilidad`

#### **Campo existente:** `fecha_deteccion` en `paciente_comorbilidad`

#### **Análisis:**
- ✅ **NO ES DUPLICADO** - Son campos diferentes
- ⚠️ **NORMALIZACIÓN:** `es_agregado_posterior` podría derivarse de `es_diagnostico_basal`:
  - Si `es_diagnostico_basal = TRUE` → `es_agregado_posterior = FALSE`
  - Si `es_diagnostico_basal = FALSE` → `es_agregado_posterior = TRUE`
- ✅ **JUSTIFICACIÓN:** 
  - Ambos campos mejoran claridad y rendimiento
  - Permiten consultas más simples
  - Formato GAM requiere ambos conceptos

#### **Decisión:** ✅ **AGREGAR AMBOS**
- **NOTA:** Implementar constraint: `es_diagnostico_basal XOR es_agregado_posterior` (o lógica de aplicación)

---

### **6. ANÁLISIS: HbA1c**

#### **Campo propuesto:** `hba1c_porcentaje` en `signos_vitales`

#### **Campo existente:** ❌ **NO EXISTE**

#### **Análisis:**
- ✅ **NO ES DUPLICADO** - Campo nuevo crítico
- ✅ **NORMALIZACIÓN:** Correcto en `signos_vitales` (es un signo vital)

#### **Decisión:** ✅ **AGREGAR** `hba1c_porcentaje DECIMAL(5,2)`

---

### **7. ANÁLISIS: Microalbuminuria**

#### **Campo propuesto:** `microalbuminuria_realizada` y `microalbuminuria_resultado` en `deteccion_complicaciones`

#### **Campo existente:** ❌ **NO EXISTE**

#### **Análisis:**
- ✅ **NO ES DUPLICADO** - Campos nuevos
- ✅ **NORMALIZACIÓN:** Correcto en `deteccion_complicaciones` (es una detección de complicación)

#### **Decisión:** ✅ **AGREGAR AMBOS**

---

### **8. ANÁLISIS: Referencia**

#### **Campo propuesto:** `fue_referido` y `referencia_observaciones` en `deteccion_complicaciones`

#### **Campo existente:** ❌ **NO EXISTE**

#### **Análisis:**
- ✅ **NO ES DUPLICADO** - Campos nuevos
- ✅ **NORMALIZACIÓN:** Correcto en `deteccion_complicaciones` (la referencia es resultado de detección)

#### **Decisión:** ✅ **AGREGAR AMBOS**

---

### **9. ANÁLISIS: Sesiones Educativas**

#### **Tabla propuesta:** `sesiones_educativas` (nueva)

#### **Tabla existente:** ❌ **NO EXISTE**

#### **Análisis:**
- ✅ **NO ES DUPLICADO** - Tabla nueva necesaria
- ✅ **NORMALIZACIÓN:** 
  - Tabla separada correcta (3NF)
  - Relación 1:N con Paciente
  - Permite múltiples sesiones por paciente

#### **Decisión:** ✅ **CREAR TABLA** `sesiones_educativas`

---

### **10. ANÁLISIS: Salud Bucal**

#### **Tabla propuesta:** `salud_bucal` (nueva)

#### **Tabla existente:** ❌ **NO EXISTE**

#### **Análisis:**
- ✅ **NO ES DUPLICADO** - Tabla nueva
- ✅ **NORMALIZACIÓN:** 
  - Tabla separada correcta (3NF)
  - Relación 1:N con Paciente
  - Permite historial de salud bucal

#### **Decisión:** ✅ **CREAR TABLA** `salud_bucal`

---

### **11. ANÁLISIS: Tuberculosis**

#### **Tabla propuesta:** `deteccion_tuberculosis` (nueva)

#### **Tabla existente:** ❌ **NO EXISTE**

#### **Análisis:**
- ✅ **NO ES DUPLICADO** - Tabla nueva
- ⚠️ **POSIBLE REDUNDANCIA:** Similar a `deteccion_complicaciones`
- ✅ **JUSTIFICACIÓN:**
  - Tuberculosis tiene proceso específico (encuesta, baciloscopia, tratamiento)
  - Diferente de otras complicaciones
  - Formato GAM requiere sección separada

#### **Decisión:** ✅ **CREAR TABLA** `deteccion_tuberculosis`
- **Razón:** Proceso específico, formato requiere sección separada

---

### **12. ANÁLISIS: Baja y Número GAM**

#### **Campos propuestos:** `fecha_baja`, `motivo_baja`, `numero_gam` en `pacientes`

#### **Campo existente:** `activo BOOLEAN` en `pacientes`

#### **Análisis:**
- ⚠️ **POSIBLE REDUNDANCIA:** `fecha_baja` vs `activo`
- ✅ **DIFERENCIA:**
  - `activo` = Estado actual (booleano)
  - `fecha_baja` = Cuándo se dio de baja (fecha específica)
- ✅ **JUSTIFICACIÓN:**
  - `fecha_baja` permite reportes históricos
  - `motivo_baja` = Información adicional requerida
  - `numero_gam` = Identificador en el grupo (diferente de `id_paciente`)

#### **Decisión:** ✅ **AGREGAR LOS TRES CAMPOS**
- **NOTA:** `fecha_baja` debe sincronizarse con `activo = FALSE` (trigger o lógica)

---

## 📐 ANÁLISIS DE NORMALIZACIÓN

### **NORMALIZACIÓN ACTUAL (Verificada):**

#### **1NF (Primera Forma Normal):** ✅
- Todos los campos son atómicos
- No hay grupos repetitivos
- Cada fila es única

#### **2NF (Segunda Forma Normal):** ✅
- Todas las tablas tienen clave primaria
- Campos no clave dependen completamente de la clave primaria
- Tablas intermedias (N:M) correctamente implementadas

#### **3NF (Tercera Forma Normal):** ✅
- No hay dependencias transitivas
- Tablas separadas para entidades independientes
- Relaciones correctamente normalizadas

### **NUEVOS CAMPOS - VERIFICACIÓN DE NORMALIZACIÓN:**

#### **✅ Campos en tablas existentes:**
- `hba1c_porcentaje` en `signos_vitales` → ✅ Correcto (es signo vital)
- `edad_paciente_en_medicion` en `signos_vitales` → ✅ Correcto (edad al momento de medición)
- `año_diagnostico` en `paciente_comorbilidad` → ✅ Correcto (año de diagnóstico de comorbilidad)
- `es_diagnostico_basal` en `paciente_comorbilidad` → ✅ Correcto (atributo de relación paciente-comorbilidad)
- `recibe_tratamiento_*` en `paciente_comorbilidad` → ✅ Correcto (tratamiento por comorbilidad)
- `microalbuminuria_*` en `deteccion_complicaciones` → ✅ Correcto (detección de complicación)
- `fue_referido` en `deteccion_complicaciones` → ✅ Correcto (resultado de detección)
- `fecha_baja`, `motivo_baja`, `numero_gam` en `pacientes` → ✅ Correcto (atributos del paciente)

#### **✅ Nuevas tablas:**
- `sesiones_educativas` → ✅ 3NF (tabla independiente, relación 1:N con Paciente)
- `salud_bucal` → ✅ 3NF (tabla independiente, relación 1:N con Paciente)
- `deteccion_tuberculosis` → ✅ 3NF (tabla independiente, relación 1:N con Paciente)

---

## 🔗 ANÁLISIS DE RELACIONES

### **Relaciones a Agregar:**

#### **1. Sesiones Educativas:**
```sql
Paciente (1) ──< (N) SesionEducativa
```
- **Foreign Key:** `id_paciente` → `pacientes(id_paciente)`
- **Opcional:** `id_cita` → `citas(id_cita)` (si la sesión está relacionada con una cita)

#### **2. Salud Bucal:**
```sql
Paciente (1) ──< (N) SaludBucal
Cita (1) ──< (N) SaludBucal [opcional]
```
- **Foreign Key:** `id_paciente` → `pacientes(id_paciente)`
- **Foreign Key:** `id_cita` → `citas(id_cita)` (opcional)

#### **3. Detección Tuberculosis:**
```sql
Paciente (1) ──< (N) DeteccionTuberculosis
Cita (1) ──< (N) DeteccionTuberculosis [opcional]
```
- **Foreign Key:** `id_paciente` → `pacientes(id_paciente)`
- **Foreign Key:** `id_cita` → `citas(id_cita)` (opcional)

---

## ⚠️ CONSTRAINTS Y VALIDACIONES A IMPLEMENTAR

### **1. Constraints de Integridad:**

#### **PacienteComorbilidad:**
```sql
-- Constraint: es_diagnostico_basal y es_agregado_posterior son mutuamente excluyentes
-- (Implementar en lógica de aplicación o trigger)
CHECK (NOT (es_diagnostico_basal = TRUE AND es_agregado_posterior = TRUE))

-- Constraint: año_diagnostico debe ser válido
CHECK (año_diagnostico IS NULL OR (año_diagnostico >= 1900 AND año_diagnostico <= YEAR(CURDATE())))
```

#### **SignosVitales:**
```sql
-- Constraint: hba1c_porcentaje rango válido
CHECK (hba1c_porcentaje IS NULL OR (hba1c_porcentaje >= 3.0 AND hba1c_porcentaje <= 15.0))

-- Constraint: edad_paciente_en_medicion rango válido
CHECK (edad_paciente_en_medicion IS NULL OR (edad_paciente_en_medicion >= 0 AND edad_paciente_en_medicion <= 150))
```

#### **DeteccionComplicaciones:**
```sql
-- Constraint: microalbuminuria_resultado solo si microalbuminuria_realizada = TRUE
CHECK (microalbuminuria_resultado IS NULL OR microalbuminuria_realizada = TRUE)

-- Constraint: microalbuminuria_resultado rango válido
CHECK (microalbuminuria_resultado IS NULL OR (microalbuminuria_resultado >= 0 AND microalbuminuria_resultado <= 1000))
```

#### **Pacientes:**
```sql
-- Constraint: fecha_baja debe ser >= fecha_registro
CHECK (fecha_baja IS NULL OR fecha_baja >= fecha_registro)

-- Constraint: numero_gam debe ser único por módulo (implementar en lógica o índice único compuesto)
-- UNIQUE KEY idx_modulo_numero_gam (id_modulo, numero_gam)
```

---

## 📋 RESUMEN DE DECISIONES

### **✅ CAMPOS A AGREGAR (Sin duplicados):**

1. ✅ `hba1c_porcentaje` en `signos_vitales`
2. ✅ `edad_paciente_en_medicion` en `signos_vitales`
3. ✅ `año_diagnostico` en `paciente_comorbilidad`
4. ✅ `es_diagnostico_basal` en `paciente_comorbilidad`
5. ✅ `es_agregado_posterior` en `paciente_comorbilidad`
6. ✅ `recibe_tratamiento_no_farmacologico` en `paciente_comorbilidad`
7. ✅ `recibe_tratamiento_farmacologico` en `paciente_comorbilidad`
8. ✅ `microalbuminuria_realizada` en `deteccion_complicaciones`
9. ✅ `microalbuminuria_resultado` en `deteccion_complicaciones`
10. ✅ `fue_referido` en `deteccion_complicaciones`
11. ✅ `referencia_observaciones` en `deteccion_complicaciones`
12. ✅ `fecha_baja` en `pacientes`
13. ✅ `motivo_baja` en `pacientes`
14. ✅ `numero_gam` en `pacientes`

### **✅ TABLAS NUEVAS A CREAR:**

1. ✅ `sesiones_educativas`
2. ✅ `salud_bucal`
3. ✅ `deteccion_tuberculosis`

### **⚠️ SINCRONIZACIONES REQUERIDAS:**

1. **Tratamiento Farmacológico:**
   - `recibe_tratamiento_farmacologico` debe sincronizarse con existencia de `PlanMedicacion` activo
   - Implementar en lógica de aplicación o trigger

2. **Baja de Paciente:**
   - `fecha_baja` debe sincronizarse con `activo = FALSE`
   - Implementar en lógica de aplicación o trigger

3. **Diagnóstico Basal:**
   - `es_diagnostico_basal` y `es_agregado_posterior` deben ser mutuamente excluyentes
   - Implementar en lógica de aplicación

---

## 🎯 PLAN DE IMPLEMENTACIÓN AJUSTADO

### **Cambios al plan original:**

1. ✅ **Mantener todos los campos propuestos** (ninguno es duplicado real)
2. ✅ **Agregar constraints de validación** en migraciones SQL
3. ✅ **Implementar sincronizaciones** en lógica de aplicación
4. ✅ **Agregar índices** para optimización:
   - `idx_hba1c` en `signos_vitales(hba1c_porcentaje)`
   - `idx_edad_medicion` en `signos_vitales(edad_paciente_en_medicion)`
   - `idx_año_diagnostico` en `paciente_comorbilidad(año_diagnostico)`
   - `idx_numero_gam` en `pacientes(id_modulo, numero_gam)` (único compuesto)

---

**Conclusión:** ✅ Todos los campos propuestos son válidos, no hay duplicados reales, y la normalización se mantiene correcta.

