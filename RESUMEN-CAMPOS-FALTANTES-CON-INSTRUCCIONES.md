# 📊 RESUMEN EJECUTIVO: CAMPOS FALTANTES CON INSTRUCCIONES DETALLADAS

**Fecha:** 29 de diciembre de 2025  
**Documento completo:** `CAMPOS-FALTANTES-CON-INSTRUCCIONES-DETALLADAS.md`

---

## 🎯 RESUMEN RÁPIDO

**Total de campos faltantes:** 25+ campos  
**Tablas a modificar:** 4 tablas existentes  
**Tablas nuevas a crear:** 3 tablas  
**Prioridad alta:** 3 campos críticos (con asterisco *)

---

## 📋 CAMPOS FALTANTES CON SUS INSTRUCCIONES

### **🔴 ALTA PRIORIDAD (Criterios de Acreditación - Campos con *)**

#### **1. HbA1c (%) - "*HbA1c (%)"**
- **Instrucción:** Campo marcado con asterisco = Criterio de Acreditación obligatorio
- **Rangos según edad:**
  - **20 a 59 años:** Rango objetivo <7%
  - **60 años y más:** Rango objetivo <8%
- **Tabla:** `signos_vitales`
- **Campos:** `hba1c_porcentaje` (DECIMAL), `edad_paciente_en_medicion` (INT)

#### **2. Microalbuminuria - "Cobertura Microalbuminuria ⑥"**
- **Instrucción ⑥:** Debe realizarse anualmente en pacientes con diabetes
- **Resultado:** Valores normales <30 mg/g de creatinina
- **Tabla:** `deteccion_complicaciones`
- **Campos:** `microalbuminuria_realizada` (BOOLEAN), `microalbuminuria_resultado` (DECIMAL)

#### **3. Tratamiento - "No Farmacológico ②" y "Farmacológico ③"**
- **Instrucción ②:** Tratamiento no farmacológico (dieta, ejercicio, cambios de estilo de vida)
- **Instrucción ③:** Tratamiento farmacológico (medicamentos prescritos)
- **Tabla:** `paciente_comorbilidad` o nueva tabla `paciente_tratamiento`
- **Campos:** `recibe_tratamiento_no_farmacologico`, `recibe_tratamiento_farmacologico`

---

### **🟡 MEDIA PRIORIDAD**

#### **4. Sesiones Educativas**
- **Instrucción:** "Asistió a sesión educativa (1=SI, 0=NO)"
- **Instrucción:** "Anote el N° de intervenciones en el mes por integrante"
- **Tipos:** Nutricional, Actividad Física, Médico-preventiva, Trabajo Social, Psicológica, Odontológica
- **Tabla:** Nueva `sesiones_educativas`

#### **5. Diagnóstico Basal - "Basal del paciente ①"**
- **Instrucción ①:** Identifica el diagnóstico basal (inicial) del paciente
- **Instrucción:** "Dx. (s) Agregados posterior al Basal"
- **Tabla:** `paciente_comorbilidad`
- **Campos:** `es_diagnostico_basal`, `año_diagnostico`, `es_agregado_posterior`

#### **6. Referencia - "Referencia ⑪"**
- **Instrucción ⑪:** Indica si el paciente fue referido a otro nivel de atención
- **Tabla:** `deteccion_complicaciones`
- **Campos:** `fue_referido`, `referencia_observaciones`

---

### **🟢 BAJA PRIORIDAD**

#### **7. Salud Bucal - "¿Presenta enfermedades odontológicas? ⑫"**
- **Instrucción ⑫:** Registro de enfermedades odontológicas
- **Instrucción:** "¿Recibió tratamiento odontológico?**"
- **Tabla:** Nueva `salud_bucal`

#### **8. Tuberculosis**
- **Instrucción:** "Aplicación de ENCUESTA de Tuberculosis**"
- **Instrucción ⑬:** "En caso de Baciloscopia anote el resultado"
- **Instrucción:** "¿Ingresó a tratamiento?"
- **Tabla:** Nueva `deteccion_tuberculosis`

#### **9. Baja - "Baja ⑭"**
- **Instrucción ⑭:** Fecha y motivo de baja del GAM
- **Tabla:** `pacientes`
- **Campos:** `fecha_baja`, `motivo_baja`

#### **10. Número GAM**
- **Instrucción:** "Anote 1 en la casilla de cada integrante, la suma final está vinculada a las fórmulas"
- **Tabla:** `pacientes`
- **Campo:** `numero_gam`

---

## 📝 LEGENDA DE INSTRUCCIONES

### **Campos con asterisco (*) = Criterios de Acreditación:**
- *Peso, *Talla, *IMC, *Circunf. cintura, *Presión Arterial, *HbA1c, *Colesterol Total, *TRIGLICERIDOS

### **Campos con números ①-⑭ = Instrucciones específicas:**
- ① Basal del paciente
- ② No Farmacológico
- ③ Farmacológico
- ④ Institución de salud ✅ (YA IMPLEMENTADO)
- ⑥ Cobertura Microalbuminuria
- ⑦ Exploración de pies ✅ (YA IMPLEMENTADO)
- ⑧ Exploración de Fondo de Ojo ✅ (YA IMPLEMENTADO)
- 9 Realiza Auto-monitoreo ✅ (YA IMPLEMENTADO)
- ⑩ Tipo ✅ (YA IMPLEMENTADO)
- ⑪ Referencia
- ⑫ ¿Presenta enfermedades odontológicas?
- ⑬ Baciloscopia resultado
- ⑭ Baja

### **Campos con doble asterisco (**) = Datos complementarios:**
- **¿Recibió tratamiento odontológico?**
- **Aplicación de ENCUESTA de Tuberculosis**

---

## 🔧 VALIDACIONES REQUERIDAS

### **HbA1c:**
- Validar según edad: 20-59 años vs 60+ años
- Rangos diferentes para cada grupo de edad

### **Microalbuminuria:**
- Debe realizarse anualmente en pacientes con diabetes
- Resultado en mg/L o mg/g de creatinina

### **Tratamiento:**
- No Farmacológico: dieta, ejercicio, cambios de estilo de vida
- Farmacológico: medicamentos prescritos

---

**Ver documento completo con SQL y detalles:** `CAMPOS-FALTANTES-CON-INSTRUCCIONES-DETALLADAS.md`

