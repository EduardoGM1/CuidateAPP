# 📊 COMPARACIÓN: CAMPOS DEL INSTRUCTIVO vs FORMULARIO ACTUAL

**Fecha:** 4 de enero de 2026  
**Objetivo:** Comparar exactamente qué campos están en el instructivo del FORMA_2022_OFICIAL vs qué campos estamos solicitando

---

## 📋 CAMPOS SEGÚN EL INSTRUCTIVO FORMA_2022_OFICIAL

### **Según el CSV del formato oficial (líneas 11-14):**

#### **1. DATOS DE IDENTIFICACIÓN:**
- N° (Número de integrante en el GAM)
- NOMBRE
- Fecha de nacimiento
- Edad (años cumplidos)
- CURP
- INSABI U OTRA INSTITUCIÓN DE SALUD (instrucción ④)
- Sexo (F/M) - "Anote 1, según corresponda"

#### **2. DX ENFERMEDADES CRÓNICAS:**
- Diagnósticos (Diabetes, Obesidad, HTA, Dislipidemia)
- Basal del paciente ①
- Año del Dx
- Dx. (s) Agregados posterior al Basal

#### **3. RECIBE TRATAMIENTO:**
- No Farmacológico ②
- Farmacológico ③

#### **4. EDUCACIÓN PARA LA SALUD:**
- Asistió a sesión educativa (1=SI, 0=NO)
- N° de intervenciones en el mes por integrante:
  - Nutricional
  - Actividad Física
  - Médico-preventiva
  - Trabajo Social
  - Psicológica
  - Odontológica

#### **5. VARIABLES / CRITERIOS DE ACREDITACIÓN:**
- *Asistencia a la evaluación clínica (1=SI, 0=NO)
- ANTROPOMETRÍA:
  - *Peso (Kg)
  - *Talla (m)
  - *IMC
  - *Circunf. de cintura (cm)
- *Presión Arterial mmHg:
  - Sistólica
  - Diastólica
- *HbA1c (%):
  - 20 a 59 años
  - 60 años y más
- COLESTEROL (INTEGRANTES CON DX HIPERCOLESTEROLEMIA):
  - *Colesterol Total (mg/dl)
  - LDL
  - HDL
- *TRIGLICERIDOS (INTEGRANTES CON DX HIPERTRIGLICERIDEMIA)
- Glucosa (NO marcado con asterisco, aparece en el formato)

#### **6. DETECCIÓN DE COMPLICACIONES:**
- Cobertura Microalbuminuria ⑥
- Resultado (de Microalbuminuria)
- Exploración de pies ⑦
- Exploración de Fondo de Ojo ⑧
- Realiza Auto-monitoreo 9
- Tipo ⑩
- Fecha de diagnóstico
- Referencia ⑪

#### **7. OTRAS ACCIONES DE PREVENCIÓN Y CONTROL:**
- Salud Bucal:
  - ¿Presenta enfermedades odontológicas? ⑫
  - ¿Recibió tratamiento odontológico?** (doble asterisco = complementario)
- Tuberculosis:
  - Aplicación de ENCUESTA de Tuberculosis** (doble asterisco = complementario)
  - En caso de Baciloscopia, anote el resultado ⑬
  - ¿Ingresó a tratamiento?** (doble asterisco = complementario)

#### **8. BAJA:**
- Baja ⑭ (Fecha de baja, Motivo de baja)

---

## 🔍 COMPARACIÓN: INSTRUCTIVO vs FORMULARIO ACTUAL

### **✅ CAMPOS QUE SÍ ESTÁN EN EL INSTRUCTIVO Y LOS SOLICITAMOS:**

#### **PASO 2: Datos del Paciente**
- ✅ NOMBRE (nombre, apellido_paterno, apellido_materno)
- ✅ Fecha de nacimiento
- ✅ CURP
- ✅ Institución de Salud (④)
- ✅ Sexo (F/M)

#### **PASO 4: Primera Consulta**
- ✅ Diagnósticos (Enfermedades Crónicas)
- ✅ Basal del paciente ①
- ✅ Año del Dx
- ✅ Dx. (s) Agregados posterior al Basal
- ✅ No Farmacológico ②
- ✅ Farmacológico ③
- ✅ *Peso (Kg)
- ✅ *Talla (m)
- ✅ *IMC (calculado)
- ✅ *Circunf. de cintura (cm)
- ✅ *Presión Arterial (Sistólica, Diastólica)
- ✅ *HbA1c (%) con rangos según edad
- ✅ *Colesterol Total (mg/dl)
- ✅ LDL (condicional)
- ✅ HDL (condicional)
- ✅ *Trigliceridos (condicional)
- ✅ Glucosa (está en formato pero no marcado como requerido)

---

### **❌ CAMPOS QUE SOLICITAMOS PERO NO ESTÁN EN EL INSTRUCTIVO:**

#### **PASO 1: Configuración de PIN**
- ❌ PIN de 4 dígitos
- ❌ Confirmar PIN
- **Justificación:** Campos del sistema para acceso, no son parte del formato GAM

#### **PASO 2: Datos del Paciente**
- ❌ Dirección
- ❌ Estado
- ❌ Municipio / Ciudad
- ❌ Número Celular
- ❌ Módulo
- **Justificación:** Campos adicionales para contacto/ubicación y organización interna

#### **PASO 3: Red de Apoyo**
- ❌ Nombre del Contacto
- ❌ Número Celular
- ❌ Email
- ❌ Dirección
- ❌ Localidad
- ❌ Parentesco
- **Justificación:** Funcionalidad adicional para contactos de emergencia

#### **PASO 4: Primera Consulta**
- ❌ Motivo de Consulta
- ❌ Diagnóstico Agregado (texto libre) - El instructivo menciona "Dx. Agregados posterior al Basal" pero como checkbox, no como texto libre
- ❌ Años con [Enfermedad] - No está explícitamente en el instructivo
- ❌ Fecha y Hora de Consulta
- ❌ Doctor Asignado
- ❌ Observaciones
- ❌ Vacunas (completo)
- **Justificación:** Campos adicionales para contexto médico y organización del sistema

---

### **⚠️ CAMPOS QUE ESTÁN EN EL INSTRUCTIVO PERO NO LOS SOLICITAMOS EN EL REGISTRO INICIAL:**

#### **1. N° (Número de integrante en el GAM)**
- **Instrucción:** "Anote 1 en la casilla de cada integrante, la suma final está vinculada a las fórmulas"
- **Estado:** ❌ NO lo solicitamos en el registro inicial
- **Razón:** Se asigna cuando el paciente se integra a un GAM específico (después del registro)

#### **2. Educación para la Salud (completo)**
- ❌ Asistió a sesión educativa (1=SI, 0=NO)
- ❌ N° de intervenciones en el mes por integrante (6 tipos)
- **Estado:** ❌ NO lo solicitamos en el registro inicial
- **Razón:** Se registra durante el seguimiento mensual, no en el registro inicial

#### **3. Detección de Complicaciones (completo)**
- ❌ Cobertura Microalbuminuria ⑥
- ❌ Resultado de Microalbuminuria
- ❌ Exploración de pies ⑦
- ❌ Exploración de Fondo de Ojo ⑧
- ❌ Realiza Auto-monitoreo 9
- ❌ Tipo ⑩
- ❌ Fecha de diagnóstico
- ❌ Referencia ⑪
- **Estado:** ❌ NO lo solicitamos en el registro inicial
- **Razón:** Se registra cuando se detectan complicaciones, no necesariamente en la primera consulta

#### **4. Otras Acciones de Prevención y Control (completo)**
- ❌ Salud Bucal (⑫)
- ❌ Tuberculosis (⑬)
- **Estado:** ❌ NO lo solicitamos en el registro inicial
- **Razón:** Se registra durante evaluaciones específicas, no en el registro inicial

#### **5. Baja ⑭**
- ❌ Fecha de baja
- ❌ Motivo de baja
- **Estado:** ❌ NO lo solicitamos en el registro (es lógico)
- **Razón:** Se usa cuando el paciente es dado de baja del GAM

---

## 📊 RESUMEN COMPARATIVO

### **Campos del Instructivo:**
- **Total:** ~25 campos principales
- **Solicitamos:** ~15 campos (60%)
- **No solicitamos en registro inicial:** ~10 campos (40%)

### **Campos que Solicitamos:**
- **Total:** ~55 campos
- **Están en instructivo:** ~15 campos (27%)
- **NO están en instructivo:** ~40 campos (73%)

---

## 🎯 CONCLUSIÓN

### **Respuesta a la pregunta:**

**NO, no todos los campos que solicitamos siguen estrictamente los parámetros del instructivo.**

**Razones:**

1. **El FORMA_2022_OFICIAL es un formato de REPORTE MENSUAL**, no un formato de registro inicial completo.

2. **Solicitamos campos adicionales necesarios para:**
   - Funcionamiento del sistema (PIN, Módulo, Doctor, Fecha de consulta)
   - Contacto y ubicación (Dirección, Teléfono, Red de Apoyo)
   - Contexto médico adicional (Motivo, Observaciones, Vacunas)

3. **NO solicitamos campos del instructivo que se registran durante el seguimiento:**
   - Educación para la Salud
   - Detección de Complicaciones (completo)
   - Otras Acciones de Prevención y Control

4. **El instructivo se enfoca en datos para REPORTES MENSUALES**, mientras que nuestro formulario es para **REGISTRO INICIAL COMPLETO**.

---

## ✅ RECOMENDACIÓN

### **Campos que DEBEN mantenerse (aunque no estén en el instructivo):**
- ✅ PIN (necesario para acceso)
- ✅ Módulo (necesario para organización)
- ✅ Fecha y Hora de Consulta (necesario para programación)
- ✅ Doctor Asignado (necesario para asignación)
- ✅ Red de Apoyo (funcionalidad valiosa)
- ✅ Dirección, Estado, Localidad, Número Celular (útil para contacto)

### **Campos que PODRÍAN hacerse opcionales:**
- ⚠️ Motivo de Consulta (no está en instructivo)
- ⚠️ Observaciones (no está explícitamente en instructivo)
- ⚠️ Vacunas (no está en instructivo, podría moverse a otra sección)

### **Campos del instructivo que DEBERÍAN agregarse en seguimientos (no en registro inicial):**
- 📋 Educación para la Salud
- 📋 Detección de Complicaciones (completo)
- 📋 Otras Acciones de Prevención y Control

---

**Documento creado el:** 4 de enero de 2026

