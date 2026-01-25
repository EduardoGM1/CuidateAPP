# 📋 DATOS SOLICITADOS EN EL REGISTRO DE NUEVO PACIENTE

**Fecha:** 4 de enero de 2026  
**Formulario:** `AgregarPaciente.js`  
**Total de pasos:** 4 pasos

---

## 📊 RESUMEN EJECUTIVO

**Paso 1:** Configuración de PIN (2 campos)  
**Paso 2:** Datos del Paciente (12 campos)  
**Paso 3:** Red de Apoyo (6 campos por contacto, mínimo 1 contacto)  
**Paso 4:** Primera Consulta Médica (30+ campos, OBLIGATORIO)

---

## 🔐 PASO 1: CONFIGURACIÓN DE PIN

**Título:** 🔐 Configurar PIN  
**Descripción:** Configura un PIN de 4 dígitos para el acceso del paciente

### Campos solicitados:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **PIN de 4 dígitos** | String (numérico) | ✅ Sí | PIN de acceso del paciente (máximo 4 caracteres) |
| **Confirmar PIN** | String (numérico) | ✅ Sí | Confirmación del PIN (debe coincidir) |

**Total:** 2 campos requeridos

---

## 🏥 PASO 2: DATOS DEL PACIENTE

**Título:** 🏥 Datos del Paciente  
**Descripción:** Completa la información médica y personal del paciente

### Campos solicitados:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Nombre** | String | ✅ Sí | Nombre del paciente |
| **Apellido Paterno** | String | ✅ Sí | Apellido paterno del paciente |
| **Apellido Materno** | String | ⚠️ Opcional | Apellido materno del paciente |
| **Fecha de Nacimiento** | Date | ✅ Sí | Fecha de nacimiento (no puede ser futura) |
| **CURP** | String | ✅ Sí | CURP del paciente (se convierte a mayúsculas automáticamente) |
| **Institución de Salud** | Enum | ✅ Sí | Opciones: IMSS, Bienestar, ISSSTE, Particular, Otro |
| **Sexo** | Enum | ✅ Sí | Opciones: Hombre, Mujer |
| **Dirección** | String | ✅ Sí | Dirección completa del paciente |
| **Estado** | String | ✅ Sí | Estado de la República (selector) |
| **Municipio / Ciudad** | String | ✅ Sí | Municipio o ciudad (selector, depende del estado) |
| **Número Celular** | String | ✅ Sí | Número de celular del paciente |
| **Módulo** | Integer | ✅ Sí | Módulo/consultorio asignado (selector de módulos disponibles) |

**Total:** 12 campos (11 requeridos, 1 opcional)

**Nota:** El campo `activo` se establece automáticamente como `true`.

---

## 👥 PASO 3: RED DE APOYO

**Título:** 👥 Red de Apoyo  
**Descripción:** Agrega contactos de emergencia y personas de apoyo para el paciente

**Mínimo:** 1 contacto requerido  
**Máximo:** Sin límite (se pueden agregar múltiples contactos)

### Campos solicitados por contacto:

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Nombre del Contacto** | String | ✅ Sí | Nombre completo del contacto |
| **Número Celular** | String | ✅ Sí | Número de celular del contacto |
| **Email** | String | ⚠️ Opcional | Email del contacto |
| **Dirección** | String | ⚠️ Opcional | Dirección del contacto |
| **Localidad** | String | ⚠️ Opcional | Localidad o municipio del contacto |
| **Parentesco** | String | ✅ Sí | Relación con el paciente (Ej: Padre, Madre, Hijo, Hermano, etc.) |

**Total por contacto:** 6 campos (3 requeridos, 3 opcionales)  
**Total mínimo:** 6 campos (1 contacto con campos requeridos)

---

## 🏥 PASO 4: PRIMERA CONSULTA MÉDICA (OBLIGATORIO)

**Título:** 🏥 Primera Consulta Médica  
**Descripción:** Información médica inicial del paciente (OBLIGATORIO)

### 4.1. Enfermedades Crónicas

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Enfermedades Crónicas** | Array (checklist) | ✅ Sí | Selección múltiple de enfermedades: Diabetes, Hipertensión, Obesidad, Dislipidemia, Enfermedad renal crónica, etc. |
| **Años con [Enfermedad]** | Integer | ✅ Sí | Años que el paciente ha tenido cada enfermedad seleccionada (un campo por cada enfermedad) |

### 4.2. Motivo de Consulta

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Motivo de Consulta** | Enum | ✅ Sí | Opciones: Control, Revisión, Urgencia, Otro |

### 4.3. Diagnóstico

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Diagnóstico Agregado** | String (multilínea) | ✅ Sí | Diagnósticos adicionales o descripción del diagnóstico |

### 4.4. Diagnóstico Basal (según FORMA_2022_OFICIAL ①)

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Es diagnóstico basal (inicial)** | Boolean | ✅ Sí | Checkbox para marcar si es el diagnóstico inicial del paciente |
| **Año del Diagnóstico** | Integer | ✅ Condicional* | Año en que se diagnosticó (requerido si es diagnóstico basal) |
| **Dx. (s) Agregados posterior al Basal** | Boolean | ⚠️ Opcional | Checkbox para marcar si fue agregado después del diagnóstico basal |

*Requerido solo si está marcado como diagnóstico basal

### 4.5. Tratamiento Actual

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Tratamiento Actual** | Enum | ✅ Sí | Opciones: "Con medicamento" o "Sin medicamento" |

**Si es "Con medicamento":**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Medicamentos** | Array | ✅ Sí | Lista de medicamentos (selector de catálogo, mínimo 1) |

**Si es "Sin medicamento":**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Tratamiento Sin Medicamento** | String (multilínea) | ✅ Sí | Descripción del tratamiento no farmacológico (Ej: Alimentación saludable, ejercicio...) |

**Nota:** Los campos `recibe_tratamiento_no_farmacologico` (②) y `recibe_tratamiento_farmacologico` (③) se actualizan automáticamente según la selección.

### 4.6. Fecha y Doctor

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Fecha y Hora de Consulta** | DateTime | ✅ Sí | Fecha y hora programada para la primera consulta (no puede ser pasada) |
| **Doctor Asignado** | Integer | ✅ Sí | Doctor que atenderá la consulta (selector de doctores activos) |

### 4.7. Signos Vitales

#### Antropometría:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Peso (kg)** | Decimal | ✅ Sí | Peso del paciente en kilogramos |
| **Talla (m)** | Decimal | ✅ Sí | Estatura del paciente en metros |
| **IMC** | Decimal | ✅ Calculado | Índice de Masa Corporal (calculado automáticamente) |
| **Circunferencia de cintura (cm)** | Decimal | ✅ Sí | Medida de cintura en centímetros |

#### Presión Arterial:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Presión Sistólica (mmHg)** | Integer | ✅ Sí | Presión arterial sistólica |
| **Presión Diastólica (mmHg)** | Integer | ✅ Sí | Presión arterial diastólica |

#### HbA1c (según FORMA_2022_OFICIAL):
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **HbA1c (%)** | Decimal | ✅ Sí | Hemoglobina glucosilada (Campo obligatorio para criterios de acreditación) |
| **Edad en Medición (años)** | Integer | ✅ Sí | Edad del paciente al momento de la medición (para validar rangos: 20-59 años <7%, 60+ años <8%) |

**Validación automática:** Muestra advertencia si HbA1c está por encima del objetivo según edad.

#### Colesterol:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Colesterol Total (mg/dl)** | Decimal | ✅ Sí | Colesterol total |
| **Colesterol LDL (mg/dl)** | Decimal | ✅ Condicional* | Colesterol LDL (solo si tiene Dislipidemia/Hipercolesterolemia) |
| **Colesterol HDL (mg/dl)** | Decimal | ✅ Condicional* | Colesterol HDL (solo si tiene Dislipidemia/Hipercolesterolemia) |

*Requerido solo si el paciente tiene "Dislipidemia" en enfermedades crónicas

#### Trigliceridos:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Trigliceridos (mg/dl)** | Decimal | ✅ Condicional* | Trigliceridos (solo si tiene Dislipidemia/Hipertrigliceridemia) |

*Requerido solo si el paciente tiene "Dislipidemia" o enfermedad relacionada con trigliceridos

#### Otros:
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Glucosa (mg/dl)** | Decimal | ⚠️ Opcional | Glucosa en sangre |
| **Observaciones** | String (multilínea) | ⚠️ Opcional | Observaciones adicionales sobre los signos vitales |

### 4.8. Esquema de Vacunación

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Vacunas** | Array | ⚠️ Opcional | Lista de vacunas aplicadas (puede agregar múltiples) |
| - **Vacuna** | String | ⚠️ Opcional | Nombre de la vacuna (selector de catálogo) |
| - **Fecha de Aplicación** | Date | ⚠️ Opcional | Fecha en que se aplicó la vacuna |
| - **Lote de Vacuna** | String | ⚠️ Opcional | Lote de la vacuna |

### 4.9. Observaciones

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| **Observaciones** | String (multilínea) | ✅ Sí | Observaciones generales de la primera consulta |

---

## 📊 RESUMEN POR PASO

### **Paso 1: PIN**
- **Total campos:** 2
- **Campos requeridos:** 2
- **Campos opcionales:** 0

### **Paso 2: Datos del Paciente**
- **Total campos:** 12
- **Campos requeridos:** 11
- **Campos opcionales:** 1 (Apellido Materno)

### **Paso 3: Red de Apoyo**
- **Total campos por contacto:** 6
- **Campos requeridos por contacto:** 3 (Nombre, Número Celular, Parentesco)
- **Campos opcionales por contacto:** 3 (Email, Dirección, Localidad)
- **Mínimo de contactos:** 1

### **Paso 4: Primera Consulta**
- **Total campos:** ~35 campos
- **Campos requeridos:** ~25 campos
- **Campos opcionales:** ~10 campos
- **Campos condicionales:** LDL/HDL (si tiene Dislipidemia), Trigliceridos (si tiene Hipertrigliceridemia)

---

## ✅ CAMPOS SEGÚN FORMA_2022_OFICIAL

### **Campos con asterisco (*) = Criterios de Acreditación:**
- ✅ Peso (kg) *
- ✅ Talla (m) *
- ✅ IMC * (calculado)
- ✅ Circunf. de cintura (cm) *
- ✅ Presión Arterial (Sistólica/Diastólica) *
- ✅ **HbA1c (%) *** - ✅ IMPLEMENTADO
- ✅ Colesterol Total *
- ✅ **LDL/HDL *** - ✅ IMPLEMENTADO (condicional)
- ✅ Trigliceridos * (condicional)

### **Campos con números ①-⑭ = Instrucciones específicas:**
- ✅ **① Basal del paciente** - ✅ IMPLEMENTADO
- ✅ **② No Farmacológico** - ✅ IMPLEMENTADO
- ✅ **③ Farmacológico** - ✅ IMPLEMENTADO

---

## 📝 NOTAS IMPORTANTES

1. **Paso 4 es OBLIGATORIO:** No se puede crear un paciente sin completar la primera consulta médica.

2. **Validaciones condicionales:**
   - LDL/HDL solo se muestran/validan si el paciente tiene "Dislipidemia"
   - Trigliceridos solo se muestran/validan si el paciente tiene "Dislipidemia" o enfermedad relacionada
   - Año del diagnóstico solo se valida si está marcado como diagnóstico basal

3. **Cálculos automáticos:**
   - IMC se calcula automáticamente desde peso y talla
   - Edad en medición se puede calcular automáticamente desde fecha de nacimiento
   - HbA1c muestra validación según edad (20-59 años: <7%, 60+ años: <8%)

4. **Campos encriptados:**
   - CURP, Número Celular, Dirección, Fecha de Nacimiento (Paciente)
   - Número Celular, Email, Dirección (Red de Apoyo)
   - Presión Arterial, Glucosa, Colesterol, LDL, HDL, Trigliceridos, HbA1c, Observaciones (Signos Vitales)

---

**Documento creado el:** 4 de enero de 2026

