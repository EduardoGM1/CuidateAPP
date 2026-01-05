# 🔍 COMPARACIÓN DE FORMULARIOS DE SIGNOS VITALES

**Fecha:** 30 de Diciembre, 2025  
**Objetivo:** Comparar los formularios de signos vitales para identificar campos faltantes

---

## 📋 FORMULARIOS COMPARADOS

1. **CompletarCitaWizard.js** - Wizard para completar citas (paso de signos vitales)
2. **DetallePaciente.js** - Modal "Registrar Signos Vitales" (Admin/Doctor)
3. **RegistrarSignosVitales.js** - Pantalla completa para pacientes

---

## 📊 COMPARACIÓN DETALLADA DE CAMPOS

### **Campos Básicos (Comunes en todos)**

| Campo | Wizard | DetallePaciente | RegistrarSignosVitales | Estado |
|-------|--------|-----------------|-------------------------|--------|
| `peso_kg` | ✅ | ✅ | ✅ | ✅ Completo |
| `talla_m` | ✅ | ✅ | ✅ | ✅ Completo |
| `medida_cintura_cm` | ✅ | ✅ | ✅ | ✅ Completo |
| `presion_sistolica` | ✅ | ✅ | ✅ | ✅ Completo |
| `presion_diastolica` | ✅ | ✅ | ✅ | ✅ Completo |
| `glucosa_mg_dl` | ✅ | ✅ | ✅ | ✅ Completo |
| `colesterol_mg_dl` | ✅ | ✅ | ✅ | ✅ Completo |
| `trigliceridos_mg_dl` | ✅ | ✅ | ✅ | ✅ Completo |
| `observaciones` | ✅ | ✅ | ✅ | ✅ Completo |

---

### **Campos Nuevos (Formato GAM)**

| Campo | Wizard | DetallePaciente | RegistrarSignosVitales | Estado |
|-------|--------|-----------------|-------------------------|--------|
| `colesterol_ldl` | ❌ **FALTA** | ✅ (Condicional) | ❌ **FALTA** | ⚠️ Faltante en Wizard y Pantalla Paciente |
| `colesterol_hdl` | ❌ **FALTA** | ✅ (Condicional) | ❌ **FALTA** | ⚠️ Faltante en Wizard y Pantalla Paciente |
| `hba1c_porcentaje` | ❌ **FALTA** | ✅ | ✅ | ⚠️ Faltante en Wizard |
| `edad_paciente_en_medicion` | ❌ **FALTA** | ✅ | ✅ | ⚠️ Faltante en Wizard |

---

## 🔍 ANÁLISIS DETALLADO

### **1. CompletarCitaWizard.js (Wizard)**

**Ubicación:** `ClinicaMovil/src/components/CompletarCitaWizard.js`

**Campos Actuales:**
```javascript
const [signosVitales, setSignosVitales] = useState({
  peso_kg: '',
  talla_m: '',
  medida_cintura_cm: '',
  presion_sistolica: '',
  presion_diastolica: '',
  glucosa_mg_dl: '',
  colesterol_mg_dl: '',
  trigliceridos_mg_dl: '',
  observaciones: ''
});
```

**Campos Faltantes:**
- ❌ `colesterol_ldl` - Colesterol LDL (solo para pacientes con Hipercolesterolemia)
- ❌ `colesterol_hdl` - Colesterol HDL (solo para pacientes con Hipercolesterolemia)
- ❌ `hba1c_porcentaje` - HbA1c (%) - **Campo obligatorio para criterios de acreditación**
- ❌ `edad_paciente_en_medicion` - Edad en medición (para validar rangos de HbA1c)

**Líneas del código:** 41-51 (estado inicial), 367-485 (render del formulario)

---

### **2. DetallePaciente.js (Modal Admin/Doctor)**

**Ubicación:** `ClinicaMovil/src/screens/admin/DetallePaciente.js`

**Campos Actuales:**
```javascript
const { formData: formDataSignosVitales, updateField: updateFormField, resetForm: resetFormSignosVitalesBase } = useFormState({
  id_cita: '',
  peso_kg: '',
  talla_m: '',
  medida_cintura_cm: '',
  presion_sistolica: '',
  presion_diastolica: '',
  glucosa_mg_dl: '',
  colesterol_mg_dl: '',
  colesterol_ldl: '', // ✅ Colesterol LDL - Solo para pacientes con diagnóstico
  colesterol_hdl: '', // ✅ Colesterol HDL - Solo para pacientes con diagnóstico
  trigliceridos_mg_dl: '',
  hba1c_porcentaje: '', // ✅ HbA1c (%) - Campo obligatorio para criterios de acreditación
  edad_paciente_en_medicion: '', // ✅ Edad en medición (para validar rangos de HbA1c)
  observaciones: ''
});
```

**Estado:** ✅ **COMPLETO** - Tiene todos los campos nuevos

**Características:**
- ✅ Campos LDL/HDL aparecen condicionalmente si el paciente tiene Hipercolesterolemia
- ✅ Validación visual de HbA1c según edad
- ✅ Cálculo automático de edad si no se proporciona

**Líneas del código:** 319-325 (estado), 4654-4751 (render del formulario)

---

### **3. RegistrarSignosVitales.js (Pantalla Paciente)**

**Ubicación:** `ClinicaMovil/src/screens/paciente/RegistrarSignosVitales.js`

**Campos Actuales:**
```javascript
const formFields = [
  { key: 'peso_kg', ... },
  { key: 'talla_m', ... },
  { key: 'presion_sistolica', ... },
  { key: 'presion_diastolica', ... },
  { key: 'glucosa_mg_dl', ... },
  { key: 'colesterol_mg_dl', ... },
  { key: 'trigliceridos_mg_dl', ... },
  { key: 'hba1c_porcentaje', ... }, // ✅ Tiene
  { key: 'edad_paciente_en_medicion', ... }, // ✅ Tiene
  { key: 'medida_cintura_cm', ... },
  { key: 'observaciones', ... }
];
```

**Campos Faltantes:**
- ❌ `colesterol_ldl` - Colesterol LDL (solo para pacientes con Hipercolesterolemia)
- ❌ `colesterol_hdl` - Colesterol HDL (solo para pacientes con Hipercolesterolemia)

**Estado:** ⚠️ **PARCIAL** - Tiene HbA1c y edad, pero falta LDL/HDL

**Líneas del código:** 133-245 (definición de campos), 308-332 (manejo en handleSubmit)

---

## 📊 RESUMEN DE ESTADO

### **✅ Formulario Completo:**
- **DetallePaciente.js (Modal Admin/Doctor)** - Tiene todos los campos nuevos

### **⚠️ Formularios con Campos Faltantes:**

#### **1. CompletarCitaWizard.js (Wizard)**
**Faltan 4 campos:**
- ❌ `colesterol_ldl`
- ❌ `colesterol_hdl`
- ❌ `hba1c_porcentaje` ⚠️ **CRÍTICO** (obligatorio para acreditación)
- ❌ `edad_paciente_en_medicion`

**Prioridad:** 🔴 **ALTA** - El wizard es usado por doctores para completar citas

---

#### **2. RegistrarSignosVitales.js (Pantalla Paciente)**
**Faltan 2 campos:**
- ❌ `colesterol_ldl`
- ❌ `colesterol_hdl`

**Prioridad:** 🟡 **MEDIA** - Solo para pacientes con diagnóstico de Hipercolesterolemia

**Nota:** Estos campos deberían aparecer condicionalmente si el paciente tiene el diagnóstico, similar a como funciona en `DetallePaciente.js`.

---

## 🎯 RECOMENDACIONES

### **1. Actualizar CompletarCitaWizard.js (ALTA PRIORIDAD)**

**Agregar:**
1. ✅ `hba1c_porcentaje` - Campo obligatorio para criterios de acreditación
2. ✅ `edad_paciente_en_medicion` - Para validar rangos de HbA1c
3. ✅ `colesterol_ldl` - Condicional (solo si paciente tiene Hipercolesterolemia)
4. ✅ `colesterol_hdl` - Condicional (solo si paciente tiene Hipercolesterolemia)

**Implementación sugerida:**
- Agregar campos al estado `signosVitales`
- Agregar campos al formulario en `renderPasoSignosVitales()`
- Agregar validación de LDL/HDL condicional (similar a DetallePaciente.js)
- Agregar validación visual de HbA1c según edad

---

### **2. Actualizar RegistrarSignosVitales.js (MEDIA PRIORIDAD)**

**Agregar:**
1. ✅ `colesterol_ldl` - Condicional (solo si paciente tiene Hipercolesterolemia)
2. ✅ `colesterol_hdl` - Condicional (solo si paciente tiene Hipercolesterolemia)

**Implementación sugerida:**
- Verificar si el paciente tiene comorbilidad de Hipercolesterolemia/Dislipidemia
- Agregar campos condicionalmente al array `formFields`
- Agregar validaciones apropiadas
- Incluir en `handleSubmit` con validación

---

## 📝 DETALLES TÉCNICOS

### **Validaciones Requeridas:**

#### **Colesterol LDL/HDL:**
- Solo se pueden registrar si el paciente tiene diagnóstico de Hipercolesterolemia o Dislipidemia
- Validación de rangos:
  - LDL: 0-500 mg/dL
  - HDL: 0-200 mg/dL

#### **HbA1c:**
- Rango general: 3.0% - 15.0%
- Objetivos según edad:
  - 20-59 años: <7% (genera warning si >7%)
  - 60+ años: <8% (genera warning si >8%)

#### **Edad en Medición:**
- Rango: 0-150 años
- Se puede calcular automáticamente desde `fecha_nacimiento` si no se proporciona

---

## 🔄 CONSISTENCIA ENTRE FORMULARIOS

### **Problema Actual:**
- Los 3 formularios tienen campos diferentes
- El wizard no tiene los campos nuevos del formato GAM
- La pantalla de paciente no tiene LDL/HDL

### **Solución:**
- Unificar todos los formularios para que tengan los mismos campos
- Implementar lógica condicional consistente para LDL/HDL
- Asegurar que todas las validaciones sean iguales

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **CompletarCitaWizard.js:**
- [ ] Agregar `hba1c_porcentaje` al estado
- [ ] Agregar `edad_paciente_en_medicion` al estado
- [ ] Agregar `colesterol_ldl` al estado (condicional)
- [ ] Agregar `colesterol_hdl` al estado (condicional)
- [ ] Agregar campos al formulario en `renderPasoSignosVitales()`
- [ ] Implementar verificación de Hipercolesterolemia
- [ ] Agregar validación visual de HbA1c según edad
- [ ] Incluir campos en `handleSiguiente()` y `handleFinalizar()`

### **RegistrarSignosVitales.js:**
- [ ] Verificar comorbilidades del paciente al cargar
- [ ] Agregar `colesterol_ldl` condicionalmente a `formFields`
- [ ] Agregar `colesterol_hdl` condicionalmente a `formFields`
- [ ] Agregar validaciones para LDL/HDL
- [ ] Incluir en `handleSubmit` con validación

---

## 📊 ESTADÍSTICAS

- **Total de campos en DetallePaciente:** 13 campos ✅
- **Total de campos en Wizard:** 9 campos ⚠️ (faltan 4)
- **Total de campos en RegistrarSignosVitales:** 11 campos ⚠️ (faltan 2)
- **Campos comunes:** 9 campos
- **Campos faltantes en Wizard:** 4 campos
- **Campos faltantes en Pantalla Paciente:** 2 campos

---

**Última Actualización:** 30 de Diciembre, 2025

