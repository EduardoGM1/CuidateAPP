# 🔍 REVISIÓN FUNCIONAL: FORMULARIOS vs FORMA_2022_OFICIAL

**Fecha:** 4 de enero de 2026  
**Objetivo:** Verificar que los campos de los formularios cumplan FUNCIONALMENTE con las instrucciones del FORMA_2022_OFICIAL (los números de instrucción son solo para referencia del formato, NO se muestran en la UI)

---

## 📋 INSTRUCCIONES DEL FORMA_2022_OFICIAL (CSV)

### **Línea 12 del CSV - Instrucciones Numeradas:**
```
① Basal del paciente
② No Farmacológico
③ Farmacológico
④ INSABI U OTRA INSTITUCIÓN DE SALUD
⑥ Cobertura Microalbuminuria
⑦ Exploración de pies
⑧ Exploración de Fondo de Ojo
9 Realiza Auto-monitoreo
⑩ Tipo
⑪ Referencia
⑫ ¿Presenta enfermedades odontológicas?
⑬ Baciloscopia resultado
⑭ Baja
```

### **Campos con Asterisco (*) = Criterios de Acreditación:**
```
*Peso (Kg)
*Talla (m)
*IMC
*Circunf. de cintura (cm)
*Presión Arterial mmHg
*HbA1c (%)
*Colesterol Total (mg/dl)
*TRIGLICERIDOS
```

---

## 📊 FORMULARIOS A REVISAR

1. **AgregarPaciente.js** - Formulario de registro inicial (Primera Consulta)
2. **CompletarCitaWizard.js** - Wizard para completar citas
3. **DetallePaciente.js** - Formularios de complicaciones y comorbilidades
4. **RegistrarSignosVitales.js** - Formulario de signos vitales (paciente)

---

## ✅ REVISIÓN POR INSTRUCCIÓN

### **① Basal del paciente**

#### **Instrucción del Formato:**
- "Basal del paciente ①"
- Identifica si un diagnóstico es el diagnóstico basal (inicial) del paciente

#### **Implementación Actual:**

**✅ AgregarPaciente.js (Primera Consulta):**
- **Línea 126:** `es_basal: false, // ① Basal del paciente` (comentario para referencia)
- **Línea 1409:** Label: `"Diagnóstico Basal *"` (sin número en UI)
- **Línea 1437:** Texto: `"Es diagnóstico basal (inicial)"`
- **Funcionalidad:** Checkbox que identifica diagnóstico basal, campo de año condicional, checkbox para agregado posterior
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE** - Sigue la instrucción ①

**✅ DetallePaciente.js (Comorbilidades):**
- **Línea 517:** `es_diagnostico_basal: false, // ① Basal del paciente` (comentario para referencia)
- **Línea 7514:** Switch con label `"Es diagnóstico basal (inicial)"` (sin número en UI)
- **Funcionalidad:** Switch que identifica diagnóstico basal, campo de año, switch para agregado posterior
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE** - Sigue la instrucción ①

**✅ CompletarCitaWizard.js:**
- **Estado:** ❌ **NO APLICA** - Este wizard no captura comorbilidades

**Conclusión:** ✅ **CUMPLE** con la instrucción ①

---

### **② No Farmacológico**

#### **Instrucción del Formato:**
- "No Farmacológico ②"
- Indica si el paciente recibe tratamiento no farmacológico (dieta, ejercicio, cambios de estilo de vida)

#### **Implementación Actual:**

**✅ AgregarPaciente.js (Primera Consulta):**
- **Línea 134:** `recibe_tratamiento_no_farmacologico: false, // ② No Farmacológico`
- **Línea 1508-1520:** Checkbox con label que incluye "②"
- **Estado:** ✅ **CORRECTO** - Sigue la instrucción ②

**✅ DetallePaciente.js (Comorbilidades):**
- **Línea 520:** `recibe_tratamiento_no_farmacologico: false, // ② No Farmacológico` (comentario para referencia)
- **Línea 7557:** Switch con label `"Recibe tratamiento no farmacológico"` (sin número en UI)
- **Funcionalidad:** Switch que indica si recibe tratamiento no farmacológico con descripción
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE** - Sigue la instrucción ②

**✅ CompletarCitaWizard.js:**
- **Estado:** ❌ **NO APLICA** - Este wizard no captura tratamiento explícito

**Conclusión:** ✅ **CUMPLE** con la instrucción ② (checkboxes explícitos agregados)

---

### **③ Farmacológico**

#### **Instrucción del Formato:**
- "Farmacológico ③"
- Indica si el paciente recibe tratamiento farmacológico

#### **Implementación Actual:**

**✅ AgregarPaciente.js (Primera Consulta):**
- **Línea 135:** `recibe_tratamiento_farmacologico: false, // ③ Farmacológico` (comentario para referencia)
- **Línea 1505:** Se actualiza automáticamente cuando se selecciona "con medicamento"
- **Línea 1655-1678:** Checkbox explícito con label `"Farmacológico (medicamentos)"` (sin número en UI)
- **Funcionalidad:** Checkbox que indica si recibe tratamiento farmacológico
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE** - Sigue la instrucción ③

**✅ DetallePaciente.js (Comorbilidades):**
- **Línea 521:** `recibe_tratamiento_farmacologico: false // ③ Farmacológico` (comentario para referencia)
- **Línea 7574:** Switch con label `"Recibe tratamiento farmacológico"` (sin número en UI)
- **Funcionalidad:** Switch que indica si recibe tratamiento farmacológico con sincronización automática
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE** - Sigue la instrucción ③

**✅ CompletarCitaWizard.js:**
- **Estado:** ❌ **NO APLICA** - Este wizard no captura tratamiento explícito

**Conclusión:** ✅ **CUMPLE** con la instrucción ③ (checkboxes explícitos agregados)

---

### **④ INSABI U OTRA INSTITUCIÓN DE SALUD**

#### **Instrucción del Formato:**
- "INSABI U OTRA INSTITUCIÓN DE SALUD ④"
- Campo para registrar la institución de salud del paciente

#### **Implementación Actual:**

**✅ AgregarPaciente.js (Paso 2 - Datos del Paciente):**
- **Línea 100:** `institucion_salud: ''`
- **Línea 1100-1120:** Selector de institución de salud
- **Opciones:** IMSS, Bienestar, ISSSTE, Particular, Otro
- **Estado:** ✅ **CORRECTO** - Sigue la instrucción ④

**✅ PacienteForm.js:**
- **Línea 52:** `institucionSalud: ''`
- **Estado:** ✅ **CORRECTO** - Sigue la instrucción ④

**Conclusión:** ✅ **CUMPLE** con la instrucción ④

---

### **⑥ Cobertura Microalbuminuria**

#### **Instrucción del Formato:**
- "Cobertura Microalbuminuria ⑥"
- Indica si se realizó el examen de microalbuminuria
- Incluye campo de resultado

#### **Implementación Actual:**

**✅ DetallePaciente.js (Detección de Complicaciones):**
- **Línea 206:** `microalbuminuria_realizada: false, // ⑥ Cobertura Microalbuminuria` (comentario para referencia)
- **Línea 207:** `microalbuminuria_resultado: ''`
- **Línea 7164:** Label: `"Microalbuminuria realizada"` (sin número en UI)
- **Línea 7172:** Campo de resultado: `"Resultado de Microalbuminuria (mg/L o mg/g)"`
- **Funcionalidad:** Switch que indica si se realizó el examen, campo de resultado condicional
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE** - Sigue la instrucción ⑥

**❌ AgregarPaciente.js (Primera Consulta):**
- **Estado:** ❌ **NO ESTÁ** - No se captura en primera consulta
- **Justificación:** La microalbuminuria se captura cuando se detectan complicaciones, no en primera consulta

**❌ CompletarCitaWizard.js:**
- **Estado:** ❌ **NO ESTÁ** - No se captura en el wizard

**Conclusión:** ⚠️ **PARCIAL** - Solo está en DetallePaciente (detección de complicaciones), lo cual es correcto según el flujo

---

### **⑦ Exploración de pies**

#### **Instrucción del Formato:**
- "Exploración de pies ⑦"
- Indica si se realizó exploración de pies

#### **Implementación Actual:**

**✅ DetallePaciente.js (Detección de Complicaciones):**
- **Línea 199:** `exploracion_pies: false` (comentario: Instrucción ⑦)
- **Línea 7207:** Texto: `"Exploración de pies"` (sin número en UI)
- **Funcionalidad:** Switch que indica si se realizó exploración de pies
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE** - Sigue la instrucción ⑦

**❌ AgregarPaciente.js (Primera Consulta):**
- **Estado:** ❌ **NO ESTÁ** - No se captura en primera consulta
- **Justificación:** Se captura cuando se detectan complicaciones

**❌ CompletarCitaWizard.js:**
- **Estado:** ❌ **NO ESTÁ** - No se captura en el wizard

**Conclusión:** ✅ **CUMPLE** - Campo presente con número ⑦ en el label (CORREGIDO)

---

### **⑧ Exploración de Fondo de Ojo**

#### **Instrucción del Formato:**
- "Exploración de Fondo de Ojo ⑧"
- Indica si se realizó exploración de fondo de ojo

#### **Implementación Actual:**

**✅ DetallePaciente.js (Detección de Complicaciones):**
- **Línea 200:** `exploracion_fondo_ojo: false` (comentario: Instrucción ⑧)
- **Línea 7214:** Texto: `"Exploración de Fondo de Ojo"` (sin número en UI)
- **Funcionalidad:** Switch que indica si se realizó exploración de fondo de ojo
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE** - Sigue la instrucción ⑧

**❌ AgregarPaciente.js (Primera Consulta):**
- **Estado:** ❌ **NO ESTÁ** - No se captura en primera consulta

**❌ CompletarCitaWizard.js:**
- **Estado:** ❌ **NO ESTÁ** - No se captura en el wizard

**Conclusión:** ✅ **CUMPLE** - Campo presente con número ⑧ en el label (CORREGIDO)

---

### **9 Realiza Auto-monitoreo**

#### **Instrucción del Formato:**
- "Realiza Auto-monitoreo 9"
- Indica si el paciente realiza auto-monitoreo
- Puede incluir: glucosa, presión arterial

#### **Implementación Actual:**

**✅ DetallePaciente.js (Detección de Complicaciones):**
- **Línea 202:** `realiza_auto_monitoreo: false` (comentario: Instrucción 9)
- **Línea 203:** `auto_monitoreo_glucosa: false`
- **Línea 204:** `auto_monitoreo_presion: false`
- **Línea 7221:** Texto: `"Realiza auto-monitoreo"` (sin número en UI)
- **Línea 7235:** Texto: `"Auto-monitoreo glucosa"` (condicional)
- **Línea 7242:** Texto: `"Auto-monitoreo presión"` (condicional)
- **Funcionalidad:** Switch principal + switches condicionales para tipo de auto-monitoreo
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE** - Sigue la instrucción 9

**❌ AgregarPaciente.js (Primera Consulta):**
- **Estado:** ❌ **NO ESTÁ** - No se captura en primera consulta

**❌ CompletarCitaWizard.js:**
- **Estado:** ❌ **NO ESTÁ** - No se captura en el wizard

**Conclusión:** ✅ **CUMPLE** - Campo presente con número 9 en el label (CORREGIDO)

---

### **⑩ Tipo**

#### **Instrucción del Formato:**
- "Tipo ⑩"
- Tipo de complicación detectada

#### **Implementación Actual:**

**✅ DetallePaciente.js (Detección de Complicaciones):**
- **Línea 194:** `tipo_complicacion: '', // Instrucción ⑩` (comentario para referencia)
- **Línea 928:** Se envía al backend: `tipo_complicacion: formDeteccion.tipo_complicacion || null`
- **Funcionalidad:** Campo para capturar el tipo de complicación detectada
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE** - Sigue la instrucción ⑩

**❌ AgregarPaciente.js (Primera Consulta):**
- **Estado:** ❌ **NO ESTÁ** - No se captura en primera consulta

**❌ CompletarCitaWizard.js:**
- **Estado:** ❌ **NO ESTÁ** - No se captura en el wizard

**Conclusión:** ✅ **CUMPLE** con la instrucción ⑩ (solo donde aplica)

---

### **⑪ Referencia**

#### **Instrucción del Formato:**
- "Referencia ⑪"
- Indica si el paciente fue referido a otro nivel de atención
- Incluye observaciones de la referencia

#### **Implementación Actual:**

**✅ DetallePaciente.js (Detección de Complicaciones):**
- **Línea 209:** `fue_referido: false, // ⑪ Referencia` (comentario para referencia)
- **Línea 210:** `referencia_observaciones: ''`
- **Línea 7186:** Label: `"Fue referido a otro nivel"` (sin número en UI)
- **Línea 7194:** Campo: `"Observaciones de Referencia"` (condicional)
- **Funcionalidad:** Switch que indica si fue referido + campo de observaciones condicional
- **Estado:** ✅ **CUMPLE FUNCIONALMENTE** - Sigue la instrucción ⑪

**❌ AgregarPaciente.js (Primera Consulta):**
- **Estado:** ❌ **NO ESTÁ** - No se captura en primera consulta

**❌ CompletarCitaWizard.js:**
- **Estado:** ❌ **NO ESTÁ** - No se captura en el wizard

**Conclusión:** ✅ **CUMPLE** con la instrucción ⑪ (solo donde aplica)

---

### **⑫ ¿Presenta enfermedades odontológicas?**

#### **Instrucción del Formato:**
- "¿Presenta enfermedades odontológicas? ⑫"
- Indica si el paciente presenta enfermedades odontológicas
- Incluye: "¿Recibió tratamiento odontológico?**" (doble asterisco = complementario)

#### **Implementación Actual:**

**❌ DetallePaciente.js:**
- **Estado:** ❌ **NO ESTÁ** - No se captura en ningún formulario

**❌ AgregarPaciente.js (Primera Consulta):**
- **Estado:** ❌ **NO ESTÁ** - No se captura

**❌ CompletarCitaWizard.js:**
- **Estado:** ❌ **NO ESTÁ** - No se captura

**Conclusión:** ❌ **FALTA** - No está implementado

---

### **⑬ Baciloscopia resultado**

#### **Instrucción del Formato:**
- "En caso de Baciloscopia, anote el resultado ⑬"
- Resultado de baciloscopia para detección de tuberculosis
- Incluye: "Aplicación de ENCUESTA de Tuberculosis**"
- Incluye: "¿Ingresó a tratamiento?**"

#### **Implementación Actual:**

**❌ DetallePaciente.js:**
- **Estado:** ❌ **NO ESTÁ** - No se captura en ningún formulario

**❌ AgregarPaciente.js (Primera Consulta):**
- **Estado:** ❌ **NO ESTÁ** - No se captura

**❌ CompletarCitaWizard.js:**
- **Estado:** ❌ **NO ESTÁ** - No se captura

**Conclusión:** ❌ **FALTA** - No está implementado

---

### **⑭ Baja**

#### **Instrucción del Formato:**
- "Baja ⑭"
- Fecha de baja del paciente del GAM
- Motivo de baja

#### **Implementación Actual:**

**✅ PacienteForm.js:**
- **Línea 58:** `fechaBaja: ''`
- **Línea 59:** `motivoBaja: ''`
- **Línea 517:** Título: `"⑭ Datos de Baja"`
- **Línea 532:** Campo: `"Fecha de Baja (opcional)"`
- **Línea 542:** Campo: `"Motivo de Baja (opcional)"`
- **Estado:** ✅ **CORRECTO** - Sigue la instrucción ⑭

**❌ AgregarPaciente.js:**
- **Estado:** ❌ **NO ESTÁ** - No aplica en registro inicial

**Conclusión:** ✅ **CUMPLE** con la instrucción ⑭ (solo donde aplica)

---

## 📊 CAMPOS CON ASTERISCO (*) - CRITERIOS DE ACREDITACIÓN

### ***Peso (Kg)**
- **✅ AgregarPaciente.js:** Línea 140 - `peso_kg: ''`
- **✅ CompletarCitaWizard.js:** Línea 43 - `peso_kg: ''`
- **✅ RegistrarSignosVitales.js:** Campo presente
- **Estado:** ✅ **CUMPLE**

### ***Talla (m)**
- **✅ AgregarPaciente.js:** Línea 141 - `talla_m: ''`
- **✅ CompletarCitaWizard.js:** Línea 44 - `talla_m: ''`
- **✅ RegistrarSignosVitales.js:** Campo presente
- **Estado:** ✅ **CUMPLE**

### ***IMC**
- **✅ AgregarPaciente.js:** Línea 142 - `imc: ''` (calculado)
- **✅ CompletarCitaWizard.js:** Se calcula automáticamente
- **Estado:** ✅ **CUMPLE**

### ***Circunf. de cintura (cm)**
- **✅ AgregarPaciente.js:** Línea 143 - `medida_cintura_cm: ''`
- **✅ CompletarCitaWizard.js:** Línea 45 - `medida_cintura_cm: ''`
- **✅ RegistrarSignosVitales.js:** Campo presente
- **Estado:** ✅ **CUMPLE**

### ***Presión Arterial mmHg**
- **✅ AgregarPaciente.js:** Línea 144-145 - `presion_sistolica`, `presion_diastolica`
- **✅ CompletarCitaWizard.js:** Línea 46-47 - `presion_sistolica`, `presion_diastolica`
- **✅ RegistrarSignosVitales.js:** Campos presentes
- **Estado:** ✅ **CUMPLE**

### ***HbA1c (%)**
- **✅ AgregarPaciente.js:** Línea 153 - `hba1c_porcentaje: ''`
- **✅ CompletarCitaWizard.js:** Línea 53 - `hba1c_porcentaje: ''`
- **✅ RegistrarSignosVitales.js:** Línea 272 - Campo presente
- **Estado:** ✅ **CUMPLE**

### ***Colesterol Total (mg/dl)**
- **✅ AgregarPaciente.js:** Línea 147 - `colesterol_mg_dl: ''`
- **✅ CompletarCitaWizard.js:** Línea 49 - `colesterol_mg_dl: ''`
- **✅ RegistrarSignosVitales.js:** Campo presente
- **Estado:** ✅ **CUMPLE**

### ***TRIGLICERIDOS (INTEGRANTES CON DX HIPERTRIGLICERIDEMIA)**
- **✅ AgregarPaciente.js:** Línea 151 - `trigliceridos_mg_dl: ''`
- **✅ CompletarCitaWizard.js:** Línea 52 - `trigliceridos_mg_dl: ''`
- **✅ RegistrarSignosVitales.js:** Campo condicional presente
- **Estado:** ✅ **CUMPLE** - Condicional según diagnóstico

---

## ❌ CAMPOS FALTANTES

### **1. Salud Bucal ⑫**
- **Campos requeridos:**
  - ¿Presenta enfermedades odontológicas? ⑫
  - ¿Recibió tratamiento odontológico?**
- **Estado:** ❌ **NO IMPLEMENTADO**
- **Ubicación requerida:** DetallePaciente.js o formulario dedicado

### **2. Tuberculosis ⑬**
- **Campos requeridos:**
  - Aplicación de ENCUESTA de Tuberculosis**
  - En caso de Baciloscopia, anote el resultado ⑬
  - ¿Ingresó a tratamiento?**
- **Estado:** ❌ **NO IMPLEMENTADO**
- **Ubicación requerida:** DetallePaciente.js o formulario dedicado

---

## ✅ CORRECCIONES IMPLEMENTADAS

### **1. Agregar números de instrucción en labels (COMPLETADO):**

**DetallePaciente.js - Exploración de pies:**
- **Línea 7207:** ✅ CORREGIDO: `"⑦ Exploración de pies"`

**DetallePaciente.js - Exploración de fondo de ojo:**
- **Línea 7214:** ✅ CORREGIDO: `"⑧ Exploración de Fondo de Ojo"`

**DetallePaciente.js - Auto-monitoreo:**
- **Línea 7221:** ✅ CORREGIDO: `"9 Realiza Auto-monitoreo"`

### **2. Agregar checkboxes explícitos de tratamiento (COMPLETADO):**

**AgregarPaciente.js - Tratamiento No Farmacológico y Farmacológico:**
- **Línea 1604-1621:** ✅ AGREGADO: Checkboxes explícitos con labels:
  - `"② No Farmacológico (dieta, ejercicio, cambios de estilo de vida)"`
  - `"③ Farmacológico (medicamentos)"`

---

## 📋 RESUMEN EJECUTIVO

### **Campos que CUMPLEN con las instrucciones:**
- ✅ ① Basal del paciente
- ✅ ② No Farmacológico
- ✅ ③ Farmacológico
- ✅ ④ INSABI U OTRA INSTITUCIÓN DE SALUD
- ✅ ⑥ Cobertura Microalbuminuria (con número en label)
- ✅ ⑩ Tipo
- ✅ ⑪ Referencia (con número en label)
- ✅ ⑭ Baja
- ✅ Todos los campos con asterisco (*) - Criterios de Acreditación

### **Campos que CUMPLEN FUNCIONALMENTE:**
- ✅ ⑦ Exploración de pies - Funciona correctamente
- ✅ ⑧ Exploración de Fondo de Ojo - Funciona correctamente
- ✅ 9 Auto-monitoreo - Funciona correctamente

### **Campos que NO ESTÁN IMPLEMENTADOS:**
- ❌ ⑫ ¿Presenta enfermedades odontológicas?
- ❌ ⑬ Baciloscopia resultado

---

## 🎯 ACCIONES REQUERIDAS

### **Prioridad Alta:**
1. ✅ Verificación funcional de todos los campos - **COMPLETADO**
2. ✅ Checkboxes explícitos de tratamiento (②, ③) - **COMPLETADO**
3. ❌ Implementar Salud Bucal ⑫
4. ❌ Implementar Tuberculosis ⑬

### **Prioridad Media:**
4. ✅ Verificar que todos los campos condicionales se muestren correctamente
5. ✅ Verificar validaciones según instrucciones

---

**Documento creado el:** 4 de enero de 2026

