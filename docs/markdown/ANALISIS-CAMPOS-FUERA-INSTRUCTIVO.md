# 📋 ANÁLISIS: CAMPOS SOLICITADOS vs INSTRUCTIVO FORMA_2022_OFICIAL

**Fecha:** 4 de enero de 2026  
**Objetivo:** Identificar qué campos estamos solicitando que NO están en el instructivo del FORMA_2022_OFICIAL

---

## 📊 RESUMEN EJECUTIVO

**Campos según instructivo:** ~20 campos  
**Campos que solicitamos:** ~55 campos  
**Campos adicionales (fuera del instructivo):** ~35 campos  
**Estado:** ⚠️ Estamos solicitando campos adicionales que NO están en el instructivo

---

## ✅ CAMPOS QUE SÍ ESTÁN EN EL INSTRUCTIVO

### **DATOS DE IDENTIFICACIÓN (según instructivo):**
- ✅ NOMBRE (nombre, apellido_paterno, apellido_materno)
- ✅ Fecha de nacimiento
- ✅ Edad (calculada)
- ✅ CURP
- ✅ INSABI U OTRA INSTITUCIÓN DE SALUD (instrucción ④)
- ✅ Sexo (F/M) - "Anote 1, según corresponda"

### **DX ENFERMEDADES CRÓNICAS (según instructivo):**
- ✅ Diagnósticos (Diabetes, Obesidad, HTA, Dislipidemia)
- ✅ Basal del paciente ①
- ✅ Año del Dx
- ✅ Dx. (s) Agregados posterior al Basal

### **RECIBE TRATAMIENTO (según instructivo):**
- ✅ No Farmacológico ②
- ✅ Farmacológico ③

### **VARIABLES / CRITERIOS DE ACREDITACIÓN (según instructivo):**
- ✅ *Asistencia a la evaluación clínica (1=SI, 0=NO)
- ✅ ANTROPOMETRÍA:
  - ✅ *Peso (Kg)
  - ✅ *Talla (m)
  - ✅ *IMC
  - ✅ *Circunf. de cintura (cm)
- ✅ *Presión Arterial mmHg (Sistólica, Diastólica)
- ✅ *HbA1c (%) (20 a 59 años, 60 años y más)
- ✅ COLESTEROL (INTEGRANTES CON DX HIPERCOLESTEROLEMIA):
  - ✅ *Colesterol Total (mg/dl)
  - ✅ LDL
  - ✅ HDL
- ✅ *TRIGLICERIDOS (INTEGRANTES CON DX HIPERTRIGLICERIDEMIA)

---

## ❌ CAMPOS QUE SOLICITAMOS PERO NO ESTÁN EN EL INSTRUCTIVO

### **PASO 1: CONFIGURACIÓN DE PIN**
**Estado:** ❌ **NO está en el instructivo**

| Campo | Justificación |
|-------|---------------|
| PIN de 4 dígitos | Campo del sistema para acceso del paciente (no es parte del formato GAM) |
| Confirmar PIN | Validación del PIN (no es parte del formato GAM) |

**Nota:** Estos campos son necesarios para el funcionamiento del sistema, pero NO son parte del formato oficial GAM.

---

### **PASO 2: DATOS DEL PACIENTE**

#### **Campos que NO están en el instructivo:**

| Campo | Estado en Instructivo | Justificación |
|-------|----------------------|---------------|
| **Dirección** | ❌ NO está | Campo adicional para contacto/ubicación del paciente |
| **Estado** | ❌ NO está | Campo adicional para ubicación geográfica |
| **Municipio / Ciudad** | ❌ NO está | Campo adicional para ubicación geográfica |
| **Número Celular** | ❌ NO está | Campo adicional para contacto del paciente |
| **Módulo** | ❌ NO está | Campo del sistema para organización interna (no es parte del formato GAM) |

**Campos que SÍ están:**
- ✅ Nombre, Apellido Paterno, Apellido Materno
- ✅ Fecha de Nacimiento
- ✅ CURP
- ✅ Institución de Salud (④)
- ✅ Sexo (F/M)

---

### **PASO 3: RED DE APOYO**
**Estado:** ❌ **NO está en el instructivo**

**Todos los campos de Red de Apoyo NO están en el FORMA_2022_OFICIAL:**
- ❌ Nombre del Contacto
- ❌ Número Celular
- ❌ Email
- ❌ Dirección
- ❌ Localidad
- ❌ Parentesco

**Justificación:** La Red de Apoyo es una funcionalidad adicional del sistema para gestión de contactos de emergencia, pero NO es parte del formato oficial GAM.

---

### **PASO 4: PRIMERA CONSULTA MÉDICA**

#### **Campos que NO están explícitamente en el instructivo:**

| Campo | Estado en Instructivo | Justificación |
|-------|----------------------|---------------|
| **Motivo de Consulta** | ❌ NO está explícitamente | Campo adicional para contexto de la consulta |
| **Diagnóstico Agregado** | ⚠️ Parcial | El instructivo menciona "Dx. (s) Agregados posterior al Basal" pero no un campo de texto libre |
| **Años con [Enfermedad]** | ❌ NO está explícitamente | Campo adicional para contexto temporal |
| **Fecha y Hora de Consulta** | ❌ NO está | Campo del sistema para programación (no es parte del formato GAM) |
| **Doctor Asignado** | ❌ NO está | Campo del sistema para organización (no es parte del formato GAM) |
| **Observaciones** | ❌ NO está explícitamente | Campo adicional para notas |
| **Glucosa (mg/dl)** | ⚠️ Parcial | Está en el formato pero NO marcado como requerido (*) |
| **Vacunas** | ❌ NO está | Campo adicional para esquema de vacunación |

**Campos que SÍ están:**
- ✅ Enfermedades Crónicas (Diagnósticos)
- ✅ Basal del paciente ①
- ✅ Año del Dx
- ✅ Dx. (s) Agregados posterior al Basal
- ✅ No Farmacológico ②
- ✅ Farmacológico ③
- ✅ *Peso, *Talla, *IMC, *Circunf. cintura
- ✅ *Presión Arterial
- ✅ *HbA1c (%)
- ✅ *Colesterol Total, LDL, HDL
- ✅ *Trigliceridos

---

## 📋 COMPARACIÓN DETALLADA

### **Campos del Instructivo que NO estamos solicitando en el registro inicial:**

#### **1. N° (Número de integrante en el GAM)**
- **Instrucción:** "Anote 1 en la casilla de cada integrante, la suma final está vinculada a las fórmulas"
- **Estado:** ❌ NO lo solicitamos en el registro
- **Nota:** Este campo se asigna después del registro, cuando el paciente se integra a un GAM específico

#### **2. Educación para la Salud**
- **Campos faltantes:**
  - ❌ Asistió a sesión educativa (1=SI, 0=NO)
  - ❌ N° de intervenciones en el mes por integrante (Nutricional, Actividad Física, Médico-preventiva, Trabajo Social, Psicológica, Odontológica)
- **Estado:** ❌ NO lo solicitamos en el registro inicial
- **Nota:** Estos campos se registran durante el seguimiento mensual, no en el registro inicial

#### **3. Detección de Complicaciones (completo)**
- **Campos faltantes:**
  - ❌ Cobertura Microalbuminuria ⑥
  - ❌ Resultado de Microalbuminuria
  - ❌ Exploración de pies ⑦ (tenemos el campo pero no lo solicitamos en primera consulta)
  - ❌ Exploración de Fondo de Ojo ⑧ (tenemos el campo pero no lo solicitamos en primera consulta)
  - ❌ Realiza Auto-monitoreo 9 (tenemos el campo pero no lo solicitamos en primera consulta)
  - ❌ Tipo ⑩ (tenemos el campo pero no lo solicitamos en primera consulta)
  - ❌ Fecha de diagnóstico
  - ❌ Referencia ⑪
- **Estado:** ⚠️ Parcial - Tenemos los campos pero NO los solicitamos en el registro inicial
- **Nota:** Estos campos se registran cuando se detectan complicaciones, no necesariamente en la primera consulta

#### **4. Otras Acciones de Prevención y Control**
- **Salud Bucal:**
  - ❌ ¿Presenta enfermedades odontológicas? ⑫
  - ❌ ¿Recibió tratamiento odontológico?**
- **Tuberculosis:**
  - ❌ Aplicación de ENCUESTA de Tuberculosis**
  - ❌ En caso de Baciloscopia, anote el resultado ⑬
  - ❌ ¿Ingresó a tratamiento?**
- **Estado:** ❌ NO lo solicitamos en el registro inicial
- **Nota:** Estos campos se registran durante evaluaciones específicas, no en el registro inicial

#### **5. Baja ⑭**
- **Campos faltantes:**
  - ❌ Fecha de baja
  - ❌ Motivo de baja
- **Estado:** ❌ NO lo solicitamos en el registro (es lógico, se registra cuando se da de baja)
- **Nota:** Este campo se usa cuando el paciente es dado de baja del GAM

---

## 🎯 CONCLUSIÓN

### **Campos que solicitamos FUERA del instructivo:**

**Total:** ~35 campos adicionales

**Categorías:**
1. **Campos del sistema (necesarios para funcionamiento):**
   - PIN (2 campos)
   - Módulo (1 campo)
   - Fecha y Hora de Consulta (1 campo)
   - Doctor Asignado (1 campo)

2. **Campos adicionales de contacto/ubicación:**
   - Dirección, Estado, Localidad, Número Celular (4 campos)
   - Red de Apoyo completa (6 campos por contacto)

3. **Campos adicionales de contexto médico:**
   - Motivo de Consulta (1 campo)
   - Diagnóstico Agregado (1 campo)
   - Años con [Enfermedad] (1 campo por enfermedad)
   - Observaciones (1 campo)
   - Glucosa (1 campo - está en formato pero no marcado como requerido)
   - Vacunas (3 campos por vacuna)

**Total aproximado:** ~35 campos adicionales

---

## ✅ RECOMENDACIÓN

### **Campos que DEBEN mantenerse (aunque no estén en el instructivo):**

1. **PIN** - Necesario para acceso del paciente al sistema
2. **Módulo** - Necesario para organización interna
3. **Fecha y Hora de Consulta** - Necesario para programación
4. **Doctor Asignado** - Necesario para asignación de responsabilidades
5. **Red de Apoyo** - Funcionalidad adicional valiosa para contacto de emergencia
6. **Dirección, Estado, Localidad, Número Celular** - Útiles para contacto y ubicación

### **Campos que PODRÍAN ser opcionales (no están en instructivo):**

1. **Motivo de Consulta** - Podría ser opcional
2. **Diagnóstico Agregado** - Podría ser opcional o más específico
3. **Años con [Enfermedad]** - Podría calcularse desde fecha de detección
4. **Observaciones** - Podría ser opcional
5. **Glucosa** - Ya es opcional, está bien
6. **Vacunas** - Podría ser opcional o moverse a otra sección

---

## 📝 NOTAS IMPORTANTES

1. **El FORMA_2022_OFICIAL es un formato de REPORTE MENSUAL**, no un formato de registro inicial completo.

2. **Muchos campos del instructivo se registran durante el seguimiento**, no en el registro inicial:
   - Educación para la Salud
   - Detección de Complicaciones (completo)
   - Otras Acciones de Prevención y Control

3. **Los campos adicionales que solicitamos son necesarios para:**
   - Funcionamiento del sistema (PIN, Módulo, Doctor, Fecha)
   - Contacto y ubicación (Dirección, Teléfono, Red de Apoyo)
   - Contexto médico adicional (Motivo, Observaciones)

4. **El instructivo se enfoca en datos para REPORTES MENSUALES**, mientras que nuestro formulario es para REGISTRO INICIAL COMPLETO.

---

**Documento creado el:** 4 de enero de 2026

