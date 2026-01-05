# 🔍 REVISIÓN FUNCIONAL: FORMULARIOS vs FORMA_2022_OFICIAL

**Fecha:** 4 de enero de 2026  
**Objetivo:** Verificar que los campos de los formularios cumplan FUNCIONALMENTE con las instrucciones del FORMA_2022_OFICIAL (sin mostrar números de instrucción en la UI)

---

## 📋 INSTRUCCIONES DEL FORMA_2022_OFICIAL

### **Instrucciones Numeradas (para referencia del formato):**
- ① Basal del paciente
- ② No Farmacológico
- ③ Farmacológico
- ④ INSABI U OTRA INSTITUCIÓN DE SALUD
- ⑥ Cobertura Microalbuminuria
- ⑦ Exploración de pies
- ⑧ Exploración de Fondo de Ojo
- 9 Realiza Auto-monitoreo
- ⑩ Tipo
- ⑪ Referencia
- ⑫ ¿Presenta enfermedades odontológicas?
- ⑬ Baciloscopia resultado
- ⑭ Baja

**Nota:** Los números son para referencia del formato oficial, NO se muestran en la UI de la aplicación.

---

## ✅ REVISIÓN FUNCIONAL POR INSTRUCCIÓN

### **① Basal del paciente**

#### **Instrucción del Formato:**
- Identifica si un diagnóstico es el diagnóstico basal (inicial) del paciente
- Incluye: "Año del Dx" y "Dx. (s) Agregados posterior al Basal"

#### **Implementación Funcional:**

**✅ AgregarPaciente.js:**
- Campo: `es_basal` (boolean)
- Campo: `año_diagnostico` (string/number)
- Campo: `es_agregado_posterior` (boolean)
- UI: Checkbox "Es diagnóstico basal (inicial)"
- UI: Campo "Año del Diagnóstico" (condicional si es basal)
- UI: Checkbox "Dx. (s) Agregados posterior al Basal"
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**✅ DetallePaciente.js:**
- Campo: `es_diagnostico_basal` (boolean)
- Campo: `año_diagnostico` (string/number)
- Campo: `es_agregado_posterior` (boolean)
- UI: Switch "Es diagnóstico basal (inicial)"
- UI: Campo "Año de diagnóstico"
- UI: Switch "Dx. Agregado posterior al Basal"
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**Conclusión:** ✅ **CUMPLE** - Los campos funcionan según la instrucción ①

---

### **② No Farmacológico**

#### **Instrucción del Formato:**
- Indica si el paciente recibe tratamiento no farmacológico (dieta, ejercicio, cambios de estilo de vida)

#### **Implementación Funcional:**

**✅ AgregarPaciente.js:**
- Campo: `recibe_tratamiento_no_farmacologico` (boolean)
- UI: Checkbox "No Farmacológico (dieta, ejercicio, cambios de estilo de vida)"
- Se actualiza automáticamente cuando se selecciona "sin medicamento"
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**✅ DetallePaciente.js:**
- Campo: `recibe_tratamiento_no_farmacologico` (boolean)
- UI: Switch "Recibe tratamiento no farmacológico"
- Descripción: "(dieta, ejercicio, cambios de estilo de vida)"
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**Conclusión:** ✅ **CUMPLE** - El campo funciona según la instrucción ②

---

### **③ Farmacológico**

#### **Instrucción del Formato:**
- Indica si el paciente recibe tratamiento farmacológico

#### **Implementación Funcional:**

**✅ AgregarPaciente.js:**
- Campo: `recibe_tratamiento_farmacologico` (boolean)
- UI: Checkbox "Farmacológico (medicamentos)"
- Se actualiza automáticamente cuando se selecciona "con medicamento"
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**✅ DetallePaciente.js:**
- Campo: `recibe_tratamiento_farmacologico` (boolean)
- UI: Switch "Recibe tratamiento farmacológico"
- Descripción: "(Se sincroniza automáticamente con Plan de Medicación activo)"
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**Conclusión:** ✅ **CUMPLE** - El campo funciona según la instrucción ③

---

### **④ INSABI U OTRA INSTITUCIÓN DE SALUD**

#### **Instrucción del Formato:**
- Campo para registrar la institución de salud del paciente

#### **Implementación Funcional:**

**✅ AgregarPaciente.js:**
- Campo: `institucion_salud` (string/enum)
- UI: Selector con opciones: IMSS, Bienestar, ISSSTE, Particular, Otro
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**✅ PacienteForm.js:**
- Campo: `institucionSalud` (string)
- UI: Selector de institución de salud
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**Conclusión:** ✅ **CUMPLE** - El campo funciona según la instrucción ④

---

### **⑥ Cobertura Microalbuminuria**

#### **Instrucción del Formato:**
- Indica si se realizó el examen de microalbuminuria
- Incluye campo de resultado

#### **Implementación Funcional:**

**✅ DetallePaciente.js:**
- Campo: `microalbuminuria_realizada` (boolean)
- Campo: `microalbuminuria_resultado` (string/number)
- UI: Switch "Microalbuminuria realizada"
- UI: Campo "Resultado de Microalbuminuria (mg/L o mg/g)" (condicional)
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**❌ AgregarPaciente.js:**
- **Estado:** ❌ **NO ESTÁ** - No se captura en primera consulta
- **Justificación:** La microalbuminuria se captura cuando se detectan complicaciones, no en primera consulta

**Conclusión:** ✅ **CUMPLE** - Funciona correctamente donde aplica (detección de complicaciones)

---

### **⑦ Exploración de pies**

#### **Instrucción del Formato:**
- Indica si se realizó exploración de pies

#### **Implementación Funcional:**

**✅ DetallePaciente.js:**
- Campo: `exploracion_pies` (boolean)
- UI: Switch "Exploración de pies"
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**Conclusión:** ✅ **CUMPLE** - El campo funciona según la instrucción ⑦

---

### **⑧ Exploración de Fondo de Ojo**

#### **Instrucción del Formato:**
- Indica si se realizó exploración de fondo de ojo

#### **Implementación Funcional:**

**✅ DetallePaciente.js:**
- Campo: `exploracion_fondo_ojo` (boolean)
- UI: Switch "Exploración de Fondo de Ojo"
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**Conclusión:** ✅ **CUMPLE** - El campo funciona según la instrucción ⑧

---

### **9 Realiza Auto-monitoreo**

#### **Instrucción del Formato:**
- Indica si el paciente realiza auto-monitoreo
- Puede incluir: glucosa, presión arterial

#### **Implementación Funcional:**

**✅ DetallePaciente.js:**
- Campo: `realiza_auto_monitoreo` (boolean)
- Campo: `auto_monitoreo_glucosa` (boolean)
- Campo: `auto_monitoreo_presion` (boolean)
- UI: Switch "Realiza auto-monitoreo"
- UI: Switch "Auto-monitoreo glucosa" (condicional)
- UI: Switch "Auto-monitoreo presión" (condicional)
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**Conclusión:** ✅ **CUMPLE** - Los campos funcionan según la instrucción 9

---

### **⑩ Tipo**

#### **Instrucción del Formato:**
- Tipo de complicación detectada

#### **Implementación Funcional:**

**✅ DetallePaciente.js:**
- Campo: `tipo_complicacion` (string)
- UI: Campo de texto/selector para tipo de complicación
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**Conclusión:** ✅ **CUMPLE** - El campo funciona según la instrucción ⑩

---

### **⑪ Referencia**

#### **Instrucción del Formato:**
- Indica si el paciente fue referido a otro nivel de atención
- Incluye observaciones de la referencia

#### **Implementación Funcional:**

**✅ DetallePaciente.js:**
- Campo: `fue_referido` (boolean)
- Campo: `referencia_observaciones` (string)
- UI: Switch "Fue referido a otro nivel"
- UI: Campo "Observaciones de Referencia" (condicional)
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**Conclusión:** ✅ **CUMPLE** - Los campos funcionan según la instrucción ⑪

---

### **⑫ ¿Presenta enfermedades odontológicas?**

#### **Instrucción del Formato:**
- Indica si el paciente presenta enfermedades odontológicas
- Incluye: "¿Recibió tratamiento odontológico?**"

#### **Implementación Funcional:**

**❌ DetallePaciente.js:**
- **Estado:** ❌ **NO IMPLEMENTADO**
- **Campos requeridos:**
  - `presenta_enfermedades_odontologicas` (boolean)
  - `recibio_tratamiento_odontologico` (boolean)

**Conclusión:** ❌ **FALTA** - No está implementado

---

### **⑬ Baciloscopia resultado**

#### **Instrucción del Formato:**
- Resultado de baciloscopia para detección de tuberculosis
- Incluye: "Aplicación de ENCUESTA de Tuberculosis**"
- Incluye: "¿Ingresó a tratamiento?**"

#### **Implementación Funcional:**

**❌ DetallePaciente.js:**
- **Estado:** ❌ **NO IMPLEMENTADO**
- **Campos requeridos:**
  - `encuesta_tuberculosis_aplicada` (boolean)
  - `baciloscopia_realizada` (boolean)
  - `baciloscopia_resultado` (string/enum)
  - `ingreso_tratamiento_tuberculosis` (boolean)

**Conclusión:** ❌ **FALTA** - No está implementado

---

### **⑭ Baja**

#### **Instrucción del Formato:**
- Fecha de baja del paciente del GAM
- Motivo de baja

#### **Implementación Funcional:**

**✅ PacienteForm.js:**
- Campo: `fechaBaja` (date)
- Campo: `motivoBaja` (string)
- UI: Campo "Fecha de Baja (opcional)"
- UI: Campo "Motivo de Baja (opcional)"
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE**

**Conclusión:** ✅ **CUMPLE** - Los campos funcionan según la instrucción ⑭

---

## 📊 CAMPOS CON ASTERISCO (*) - CRITERIOS DE ACREDITACIÓN

### **Revisión Funcional:**

| Campo | Estado Funcional | Ubicación |
|-------|-----------------|-----------|
| *Peso (Kg) | ✅ CUMPLE | Todos los formularios |
| *Talla (m) | ✅ CUMPLE | Todos los formularios |
| *IMC | ✅ CUMPLE | Calculado automáticamente |
| *Circunf. de cintura (cm) | ✅ CUMPLE | Todos los formularios |
| *Presión Arterial mmHg | ✅ CUMPLE | Todos los formularios |
| *HbA1c (%) | ✅ CUMPLE | Todos los formularios |
| *Colesterol Total (mg/dl) | ✅ CUMPLE | Todos los formularios |
| *TRIGLICERIDOS | ✅ CUMPLE | Condicional según diagnóstico |

**Conclusión:** ✅ **TODOS CUMPLEN** funcionalmente

---

## 📋 RESUMEN EJECUTIVO

### **Campos que CUMPLEN FUNCIONALMENTE:**
- ✅ ① Basal del paciente
- ✅ ② No Farmacológico
- ✅ ③ Farmacológico
- ✅ ④ INSABI U OTRA INSTITUCIÓN DE SALUD
- ✅ ⑥ Cobertura Microalbuminuria
- ✅ ⑦ Exploración de pies
- ✅ ⑧ Exploración de Fondo de Ojo
- ✅ 9 Realiza Auto-monitoreo
- ✅ ⑩ Tipo
- ✅ ⑪ Referencia
- ✅ ⑭ Baja
- ✅ Todos los campos con asterisco (*) - Criterios de Acreditación

### **Campos que NO ESTÁN IMPLEMENTADOS:**
- ❌ ⑫ ¿Presenta enfermedades odontológicas?
- ❌ ⑬ Baciloscopia resultado

---

## 🎯 CONCLUSIÓN

**Estado General:** ✅ **85% de cumplimiento funcional**

Los formularios actuales cumplen FUNCIONALMENTE con las instrucciones del FORMA_2022_OFICIAL para la mayoría de los campos. Los números de instrucción NO se muestran en la UI (solo en comentarios del código para referencia).

**Pendiente:** Implementar Salud Bucal (⑫) y Tuberculosis (⑬) según las instrucciones del formato oficial.

---

**Documento creado el:** 4 de enero de 2026

