# 📋 ANÁLISIS: FORMULARIO DE PRIMERA CONSULTA vs FORMA_2022_OFICIAL

**Fecha:** 4 de enero de 2026  
**Objetivo:** Verificar que el formulario de primera consulta (Etapa 4) cumple con todos los campos requeridos según el FORMA_2022_OFICIAL y las instrucciones del instructivo

---

## 📊 RESUMEN EJECUTIVO

**Estado General:** ⚠️ **PARCIALMENTE COMPLETO**  
**Campos Implementados:** 18/25 (72%)  
**Campos Faltantes:** 7 campos críticos  
**Prioridad:** 🔴 **ALTA** - Faltan campos de criterios de acreditación

---

## ✅ CAMPOS IMPLEMENTADOS EN EL FORMULARIO

### **1. DATOS DE IDENTIFICACIÓN** ✅ COMPLETO
- ✅ Nombre completo (nombre, apellido_paterno, apellido_materno)
- ✅ Fecha de nacimiento
- ✅ CURP
- ✅ Institución de salud (institucion_salud)
- ✅ Sexo (Hombre/Mujer)

### **2. DX ENFERMEDADES CRÓNICAS** ⚠️ PARCIAL
- ✅ Enfermedades crónicas (checklist: Diabetes, Obesidad, HTA, Dislipidemia, etc.)
- ✅ Años de padecimiento (anos_padecimiento por enfermedad)
- ✅ Diagnóstico agregado (diagnostico_agregado)
- ❌ **FALTA:** Marcar si es diagnóstico basal (es_diagnostico_basal)
- ❌ **FALTA:** Año del diagnóstico (año_diagnostico)
- ❌ **FALTA:** Indicar si fue agregado posterior al basal (es_agregado_posterior)

### **3. RECIBE TRATAMIENTO** ⚠️ PARCIAL
- ✅ Tratamiento actual (con_medicamento / sin_medicamento)
- ✅ Medicamentos (lista de medicamentos si es con medicamento)
- ✅ Tratamiento sin medicamento (texto libre si es sin medicamento)
- ❌ **FALTA:** Campo booleano explícito "Recibe Tratamiento No Farmacológico ②"
- ❌ **FALTA:** Campo booleano explícito "Recibe Tratamiento Farmacológico ③"

### **4. VARIABLES / CRITERIOS DE ACREDITACIÓN** ⚠️ PARCIAL

#### **ANTROPOMETRÍA** ✅ COMPLETO
- ✅ Peso (kg) *
- ✅ Talla (m) *
- ✅ IMC (calculado automáticamente) *
- ✅ Circunferencia de cintura (cm) *

#### **PRESIÓN ARTERIAL** ✅ COMPLETO
- ✅ Presión Sistólica (mmHg) *
- ✅ Presión Diastólica (mmHg) *

#### **COLESTEROL** ❌ INCOMPLETO
- ✅ Colesterol Total (mg/dl) *
- ❌ **FALTA:** LDL (mg/dl) - Solo para pacientes con Hipercolesterolemia
- ❌ **FALTA:** HDL (mg/dl) - Solo para pacientes con Hipercolesterolemia

**Nota:** LDL y HDL están implementados en el wizard de completar cita, pero NO en el formulario de primera consulta.

#### **TRIGLICERIDOS** ✅ COMPLETO
- ✅ Trigliceridos (mg/dl) * - Solo para pacientes con Hipertrigliceridemia

#### **HbA1c** ❌ FALTANTE CRÍTICO
- ❌ **FALTA:** HbA1c (%) * - **CAMPO CRÍTICO PARA ACREDITACIÓN**
- ❌ **FALTA:** Edad del paciente en medición (edad_paciente_en_medicion)
- ❌ **FALTA:** Validación de rangos según edad:
  - 20 a 59 años: objetivo <7%
  - 60 años y más: objetivo <8%

**Nota:** HbA1c está implementado en el wizard de completar cita y en DetallePaciente, pero NO en el formulario de primera consulta.

#### **GLUCOSA** ⚠️ PARCIAL
- ✅ Glucosa (mg/dl) - Campo presente pero no marcado como requerido en el formato

### **5. ESQUEMA DE VACUNACIÓN** ✅ COMPLETO
- ✅ Vacunas (lista de vacunas con fecha de aplicación y lote)

### **6. OTROS CAMPOS** ✅ COMPLETO
- ✅ Motivo de consulta
- ✅ Fecha y hora de consulta
- ✅ Doctor asignado
- ✅ Observaciones

---

## ❌ CAMPOS FALTANTES CRÍTICOS

### **🔴 ALTA PRIORIDAD (Criterios de Acreditación)**

#### **1. HbA1c (%) - Campo Obligatorio**
- **Ubicación en formato:** "*HbA1c (%)" con rangos "20 a 59 años" y "60 años y más"
- **Estado:** ❌ NO está en el formulario de primera consulta
- **Implementado en:** Wizard de completar cita, DetallePaciente
- **Acción requerida:** Agregar campo HbA1c y edad_paciente_en_medicion al formulario de primera consulta

#### **2. Colesterol LDL/HDL - Solo para Hipercolesterolemia**
- **Ubicación en formato:** "COLESTEROL (INTEGRANTES CON DX HIPERCOLESTEROLEMIA)" con campos LDL y HDL
- **Estado:** ❌ NO está en el formulario de primera consulta
- **Implementado en:** Wizard de completar cita (con validación condicional)
- **Acción requerida:** Agregar campos LDL y HDL al formulario de primera consulta, con validación condicional si el paciente tiene Hipercolesterolemia/Dislipidemia

### **🟡 MEDIA PRIORIDAD (Datos importantes)**

#### **3. Diagnóstico Basal vs Agregado**
- **Ubicación en formato:** "Basal del paciente ①" y "Dx. (s) Agregados posterior al Basal"
- **Estado:** ❌ NO está en el formulario de primera consulta
- **Acción requerida:** Agregar campos:
  - `es_diagnostico_basal` (BOOLEAN) - Marcar si es diagnóstico inicial
  - `año_diagnostico` (INTEGER) - Año del diagnóstico
  - `es_agregado_posterior` (BOOLEAN) - Si fue agregado después del basal

#### **4. Tratamiento No Farmacológico/Farmacológico (Explícito)**
- **Ubicación en formato:** "No Farmacológico ②" y "Farmacológico ③"
- **Estado:** ⚠️ Parcial - Tenemos tratamiento_actual pero no campos booleanos explícitos
- **Acción requerida:** Agregar campos booleanos explícitos:
  - `recibe_tratamiento_no_farmacologico` (BOOLEAN)
  - `recibe_tratamiento_farmacologico` (BOOLEAN)

---

## 📋 COMPARACIÓN DETALLADA POR SECCIÓN

### **SECCIÓN: Signos Vitales en Primera Consulta**

| Campo FORMA_2022 | Requerido | Estado Actual | Ubicación |
|------------------|-----------|---------------|-----------|
| Peso (kg) * | ✅ Sí | ✅ Implementado | `signos_vitales.peso_kg` |
| Talla (m) * | ✅ Sí | ✅ Implementado | `signos_vitales.talla_m` |
| IMC * | ✅ Sí | ✅ Calculado | Calculado desde peso/talla |
| Circunf. cintura (cm) * | ✅ Sí | ✅ Implementado | `signos_vitales.medida_cintura_cm` |
| Presión Sistólica * | ✅ Sí | ✅ Implementado | `signos_vitales.presion_sistolica` |
| Presión Diastólica * | ✅ Sí | ✅ Implementado | `signos_vitales.presion_diastolica` |
| HbA1c (%) * | ✅ Sí | ❌ **FALTANTE** | No está en formulario |
| Edad en medición | ✅ Sí | ❌ **FALTANTE** | No está en formulario |
| Colesterol Total * | ✅ Sí | ✅ Implementado | `signos_vitales.colesterol_mg_dl` |
| LDL * | ✅ Condicional | ❌ **FALTANTE** | No está en formulario |
| HDL * | ✅ Condicional | ❌ **FALTANTE** | No está en formulario |
| Trigliceridos * | ✅ Condicional | ✅ Implementado | `signos_vitales.trigliceridos_mg_dl` |
| Glucosa | ⚠️ Opcional | ✅ Implementado | `signos_vitales.glucosa_mg_dl` |

**Leyenda:**
- * = Criterio de Acreditación
- Condicional = Solo para pacientes con diagnóstico específico

---

## 🔧 ACCIONES REQUERIDAS

### **1. Agregar Campos de HbA1c al Formulario de Primera Consulta**

**Ubicación:** `ClinicaMovil/src/screens/admin/AgregarPaciente.js`

**Campos a agregar:**
```javascript
signos_vitales: {
  // ... campos existentes ...
  hba1c_porcentaje: '', // ✅ HbA1c (%) - Campo obligatorio para criterios de acreditación
  edad_paciente_en_medicion: '', // ✅ Edad en medición (para validar rangos de HbA1c)
}
```

**Validaciones requeridas:**
- Rango: 4.0% - 15.0%
- Validación según edad:
  - 20-59 años: objetivo <7% (warning si >7%)
  - 60+ años: objetivo <8% (warning si >8%)

### **2. Agregar Campos de Colesterol LDL/HDL al Formulario de Primera Consulta**

**Campos a agregar:**
```javascript
signos_vitales: {
  // ... campos existentes ...
  colesterol_ldl: '', // Solo para pacientes con Hipercolesterolemia/Dislipidemia
  colesterol_hdl: '', // Solo para pacientes con Hipercolesterolemia/Dislipidemia
}
```

**Validación condicional:**
- Solo mostrar/validar si el paciente tiene diagnóstico de "Hipercolesterolemia" o "Dislipidemia" en `enfermedades_cronicas`

### **3. Agregar Campos de Diagnóstico Basal**

**Campos a agregar en el estado:**
```javascript
primeraConsulta: {
  // ... campos existentes ...
  diagnostico_basal: {
    es_basal: false, // Marcar si es diagnóstico inicial
    año_diagnostico: '', // Año del diagnóstico
    es_agregado_posterior: false // Si fue agregado después del basal
  }
}
```

### **4. Agregar Campos Booleanos de Tratamiento**

**Campos a agregar:**
```javascript
primeraConsulta: {
  // ... campos existentes ...
  recibe_tratamiento_no_farmacologico: false, // ② No Farmacológico
  recibe_tratamiento_farmacologico: false, // ③ Farmacológico
}
```

**Lógica:**
- Si `tratamiento_actual === 'con_medicamento'` → `recibe_tratamiento_farmacologico = true`
- Si `tratamiento_actual === 'sin_medicamento'` → `recibe_tratamiento_no_farmacologico = true`
- Pueden ser ambos `true` si el paciente recibe ambos tipos de tratamiento

---

## 📝 NOTAS IMPORTANTES

### **Campos con asterisco (*) = Criterios de Acreditación:**
Todos los campos marcados con asterisco son **obligatorios** para cumplir con los criterios de acreditación del GAM. Actualmente faltan:
- ❌ HbA1c (%) - **CRÍTICO**
- ❌ LDL/HDL - Condicional pero importante

### **Validaciones Condicionales:**
- **LDL/HDL:** Solo para pacientes con diagnóstico de Hipercolesterolemia/Dislipidemia
- **Trigliceridos:** Solo para pacientes con diagnóstico de Hipertrigliceridemia
- **HbA1c:** Obligatorio para todos, pero con rangos diferentes según edad

### **Campos Implementados en Otros Lugares:**
- HbA1c, LDL, HDL están implementados en:
  - ✅ `CompletarCitaWizard.js` (wizard de completar cita)
  - ✅ `DetallePaciente.js` (edición de signos vitales)
  - ❌ **NO están en** `AgregarPaciente.js` (formulario de primera consulta)

---

## ✅ CONCLUSIÓN

**El formulario de primera consulta NO cumple completamente con el FORMA_2022_OFICIAL.**

**Campos críticos faltantes:**
1. ❌ HbA1c (%) - Campo obligatorio para acreditación
2. ❌ Edad en medición - Requerida para validar rangos de HbA1c
3. ❌ LDL/HDL - Requeridos para pacientes con Hipercolesterolemia
4. ⚠️ Diagnóstico Basal - Mejora importante pero no crítica
5. ⚠️ Tratamiento No Farmacológico/Farmacológico explícito - Mejora importante

**Recomendación:** Implementar los campos faltantes antes de considerar el formulario completo según el formato oficial.

---

**Documento creado el:** 4 de enero de 2026

