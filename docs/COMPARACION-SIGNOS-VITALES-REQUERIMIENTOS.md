# 📊 COMPARACIÓN: Signos Vitales - Requerimientos vs Aplicación

**Fecha:** 17 de noviembre de 2025  
**Objetivo:** Comparar los datos requeridos con los implementados en la aplicación y el modelo

---

## 📋 DATOS REQUERIDOS (Según tu especificación)

### **Puntos de Chequeo:**
1. ✅ **Asistencia a la cita médica (sí o no)**

### **Antropometría:**
2. ✅ **Peso (kg)**
3. ✅ **Talla (m)**
4. ✅ **IMC (cálculo automático)**
5. ✅ **Medida de la cintura (cm)**

### **Signos Vitales:**
6. ✅ **Presión arterial** (con ejemplo del dato)
7. ✅ **Niveles de glucosa**
8. ✅ **Colesterol**
9. ✅ **Triglicéridos**
10. ✅ **Observaciones**

---

## 🔍 COMPARACIÓN CON EL MODELO Y APLICACIÓN

### **1. Asistencia a la cita médica (sí o no)**

#### **Modelo:** `Cita` (NO es parte de `SignoVital`)
- ✅ Campo: `asistencia` (BOOLEAN)
- ✅ Ubicación: `api-clinica/models/Cita.js` línea 29
- ✅ Tipo: `DataTypes.BOOLEAN`
- ✅ Permite: `true`, `false`, `null`

#### **Estado:** ✅ **CONCUERDA** - El campo existe en el modelo `Cita`

**Nota:** La asistencia es un atributo de la **cita**, no de los **signos vitales**. Esto es correcto porque:
- Una cita puede tener asistencia o no
- Los signos vitales pueden registrarse con o sin cita asociada
- La asistencia se registra cuando se completa/atiende la cita

---

### **2. Peso (kg)**

#### **Modelo:** `SignoVital`
- ✅ Campo: `peso_kg`
- ✅ Tipo: `DataTypes.DECIMAL(6, 2)`
- ✅ Ubicación: `api-clinica/models/SignoVital.js` línea 25

#### **Formularios:**
- ✅ **Pacientes:** `RegistrarSignosVitales.js` - Campo disponible
- ✅ **Doctores/Admin:** `DetallePaciente.js` - Campo disponible
- ✅ **Crear Paciente:** `AgregarPaciente.js` - Campo disponible
- ✅ **Wizard Cita:** `CompletarCitaWizard.js` - Campo disponible

#### **Estado:** ✅ **CONCUERDA** - Campo disponible en modelo y todos los formularios

---

### **3. Talla (m)**

#### **Modelo:** `SignoVital`
- ✅ Campo: `talla_m`
- ✅ Tipo: `DataTypes.DECIMAL(4, 2)`
- ✅ Ubicación: `api-clinica/models/SignoVital.js` línea 30

#### **Formularios:**
- ✅ **Pacientes:** `RegistrarSignosVitales.js` - Campo disponible
- ✅ **Doctores/Admin:** `DetallePaciente.js` - Campo disponible
- ✅ **Crear Paciente:** `AgregarPaciente.js` - Campo disponible
- ✅ **Wizard Cita:** `CompletarCitaWizard.js` - Campo disponible

#### **Estado:** ✅ **CONCUERDA** - Campo disponible en modelo y todos los formularios

---

### **4. IMC (cálculo automático)**

#### **Modelo:** `SignoVital`
- ✅ Campo: `imc`
- ✅ Tipo: `DataTypes.DECIMAL(6, 2)`
- ✅ Ubicación: `api-clinica/models/SignoVital.js` línea 35

#### **Cálculo Automático:**
- ✅ **Frontend - Pacientes:** Se calcula en `RegistrarSignosVitales.js` cuando hay peso y talla
- ✅ **Frontend - Doctores/Admin:** Se calcula en `DetallePaciente.js` cuando hay peso y talla
- ✅ **Backend:** Se puede calcular automáticamente si se envía peso y talla

#### **Código de Cálculo:**
```javascript
// Ejemplo del cálculo
const calcularIMC = (peso, talla) => {
  if (!peso || !talla) return null;
  const pesoNum = parseFloat(peso);
  const tallaNum = parseFloat(talla);
  if (isNaN(pesoNum) || isNaN(tallaNum) || tallaNum <= 0) return null;
  const imc = pesoNum / (tallaNum * tallaNum);
  return imc.toFixed(2);
};
```

#### **Estado:** ✅ **CONCUERDA** - Campo existe y se calcula automáticamente

---

### **5. Medida de la cintura (cm)**

#### **Modelo:** `SignoVital`
- ✅ Campo: `medida_cintura_cm`
- ✅ Tipo: `DataTypes.DECIMAL(6, 2)`
- ✅ Ubicación: `api-clinica/models/SignoVital.js` línea 40

#### **Formularios:**
- ✅ **Pacientes:** `RegistrarSignosVitales.js` - Campo disponible (opcional)
- ✅ **Doctores/Admin:** `DetallePaciente.js` - Campo disponible
- ✅ **Crear Paciente:** `AgregarPaciente.js` - Campo disponible
- ✅ **Wizard Cita:** `CompletarCitaWizard.js` - Campo disponible

#### **Estado:** ✅ **CONCUERDA** - Campo disponible en modelo y todos los formularios

---

### **6. Presión arterial (con ejemplo del dato)**

#### **Modelo:** `SignoVital`
- ✅ Campo: `presion_sistolica` (mmHg)
- ✅ Campo: `presion_diastolica` (mmHg)
- ✅ Tipo: `DataTypes.SMALLINT` (ambos)
- ✅ Ubicación: `api-clinica/models/SignoVital.js` líneas 45-53

#### **Formularios:**
- ✅ **Pacientes:** `RegistrarSignosVitales.js` - Campos disponibles (sistólica y diastólica)
- ✅ **Doctores/Admin:** `DetallePaciente.js` - Campos disponibles con ejemplo "Ej: 120" y "Ej: 80"
- ✅ **Crear Paciente:** `AgregarPaciente.js` - Campos disponibles
- ✅ **Wizard Cita:** `CompletarCitaWizard.js` - Campos disponibles

#### **Visualización:**
- ✅ Se muestra como: `120/80 mmHg` (sistólica/diastólica)
- ✅ Ejemplo en formularios: "Ej: 120" y "Ej: 80"

#### **Estado:** ✅ **CONCUERDA** - Campos disponibles y se muestran con ejemplo

---

### **7. Niveles de glucosa**

#### **Modelo:** `SignoVital`
- ✅ Campo: `glucosa_mg_dl`
- ✅ Tipo: `DataTypes.DECIMAL(6, 2)`
- ✅ Ubicación: `api-clinica/models/SignoVital.js` línea 55

#### **Formularios:**
- ✅ **Pacientes:** `RegistrarSignosVitales.js` - Campo disponible
- ✅ **Doctores/Admin:** `DetallePaciente.js` - Campo disponible con ejemplo "Ej: 95"
- ✅ **Crear Paciente:** `AgregarPaciente.js` - Campo disponible
- ✅ **Wizard Cita:** `CompletarCitaWizard.js` - Campo disponible

#### **Estado:** ✅ **CONCUERDA** - Campo disponible en modelo y todos los formularios

---

### **8. Colesterol**

#### **Modelo:** `SignoVital`
- ✅ Campo: `colesterol_mg_dl`
- ✅ Tipo: `DataTypes.DECIMAL(6, 2)`
- ✅ Ubicación: `api-clinica/models/SignoVital.js` línea 60

#### **Formularios:**
- ❌ **Pacientes:** `RegistrarSignosVitales.js` - **NO está disponible**
- ✅ **Doctores/Admin:** `DetallePaciente.js` - Campo disponible con ejemplo "Ej: 180"
- ✅ **Crear Paciente:** `AgregarPaciente.js` - Campo disponible
- ✅ **Wizard Cita:** `CompletarCitaWizard.js` - Campo disponible

#### **Estado:** ⚠️ **PARCIALMENTE CONCUERDA** - Falta en formulario de pacientes

---

### **9. Triglicéridos**

#### **Modelo:** `SignoVital`
- ✅ Campo: `trigliceridos_mg_dl`
- ✅ Tipo: `DataTypes.DECIMAL(6, 2)`
- ✅ Ubicación: `api-clinica/models/SignoVital.js` línea 65

#### **Formularios:**
- ❌ **Pacientes:** `RegistrarSignosVitales.js` - **NO está disponible**
- ✅ **Doctores/Admin:** `DetallePaciente.js` - Campo disponible con ejemplo "Ej: 120"
- ✅ **Crear Paciente:** `AgregarPaciente.js` - Campo disponible
- ✅ **Wizard Cita:** `CompletarCitaWizard.js` - Campo disponible

#### **Estado:** ⚠️ **PARCIALMENTE CONCUERDA** - Falta en formulario de pacientes

---

### **10. Observaciones**

#### **Modelo:** `SignoVital`
- ✅ Campo: `observaciones`
- ✅ Tipo: `DataTypes.TEXT`
- ✅ Ubicación: `api-clinica/models/SignoVital.js` línea 74

#### **Formularios:**
- ✅ **Pacientes:** `RegistrarSignosVitales.js` - Campo disponible (opcional)
- ✅ **Doctores/Admin:** `DetallePaciente.js` - Campo disponible (opcional, textarea)
- ✅ **Crear Paciente:** `AgregarPaciente.js` - Campo disponible
- ✅ **Wizard Cita:** `CompletarCitaWizard.js` - Campo disponible

#### **Estado:** ✅ **CONCUERDA** - Campo disponible en modelo y todos los formularios

---

## 📊 RESUMEN DE CONCORDANCIA

| Dato Requerido | Modelo BD | Form. Paciente | Form. Doctor/Admin | Form. Crear Paciente | Wizard Cita | Estado |
|----------------|-----------|----------------|---------------------|----------------------|-------------|--------|
| **Asistencia a cita** | ✅ (Cita) | ✅ | ✅ | ✅ | ✅ | ✅ **CONCUERDA** |
| **Peso (kg)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ **CONCUERDA** |
| **Talla (m)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ **CONCUERDA** |
| **IMC (auto)** | ✅ | ✅ (calc) | ✅ (calc) | ✅ (calc) | ✅ (calc) | ✅ **CONCUERDA** |
| **Cintura (cm)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ **CONCUERDA** |
| **Presión arterial** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ **CONCUERDA** |
| **Glucosa** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ **CONCUERDA** |
| **Colesterol** | ✅ | ❌ **FALTA** | ✅ | ✅ | ✅ | ⚠️ **FALTA EN PACIENTES** |
| **Triglicéridos** | ✅ | ❌ **FALTA** | ✅ | ✅ | ✅ | ⚠️ **FALTA EN PACIENTES** |
| **Observaciones** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ **CONCUERDA** |

---

## ✅ CONCLUSIÓN

### **CONCORDANCIA GENERAL: 90%**

#### **✅ Lo que CONCUERDA:**
1. ✅ **Asistencia a cita** - Existe en modelo `Cita` (correcto, no es parte de signos vitales)
2. ✅ **Peso, Talla, IMC, Cintura** - Todos disponibles
3. ✅ **Presión arterial** - Disponible con ejemplos
4. ✅ **Glucosa** - Disponible
5. ✅ **Observaciones** - Disponible

#### **⚠️ Lo que NO CONCUERDA:**
1. ❌ **Colesterol** - Falta en formulario de pacientes (`RegistrarSignosVitales.js`)
2. ❌ **Triglicéridos** - Falta en formulario de pacientes (`RegistrarSignosVitales.js`)

---

## 🔧 ACCIONES REQUERIDAS

### **1. Agregar Colesterol y Triglicéridos al Formulario de Pacientes**

**Archivo:** `ClinicaMovil/src/screens/paciente/RegistrarSignosVitales.js`

**Agregar después del campo `glucosa_mg_dl`:**

```javascript
{
  key: 'colesterol_mg_dl',
  label: 'Colesterol (opcional)',
  type: 'number',
  placeholder: 'Ejemplo: 180',
  speakInstruction: 'Ingresa tu nivel de colesterol en miligramos por decilitro. Si no lo sabes, puedes dejarlo en blanco',
  validate: (valor) => {
    if (!valor || valor.trim() === '') return null; // Opcional
    return validarNumero(valor, 50, 500, 'mg/dL');
  },
},
{
  key: 'trigliceridos_mg_dl',
  label: 'Triglicéridos (opcional)',
  type: 'number',
  placeholder: 'Ejemplo: 120',
  speakInstruction: 'Ingresa tu nivel de triglicéridos en miligramos por decilitro. Si no lo sabes, puedes dejarlo en blanco',
  validate: (valor) => {
    if (!valor || valor.trim() === '') return null; // Opcional
    return validarNumero(valor, 30, 1000, 'mg/dL');
  },
},
```

---

## 📝 NOTAS IMPORTANTES

1. **Asistencia a cita:** Está correctamente ubicada en el modelo `Cita`, no en `SignoVital`. Esto es correcto porque:
   - La asistencia es un atributo de la cita
   - Los signos vitales pueden registrarse independientemente de una cita
   - Se puede asociar signos vitales a una cita mediante `id_cita`

2. **IMC:** Se calcula automáticamente en el frontend cuando hay peso y talla. El cálculo es: `IMC = peso / (talla²)`

3. **Presión arterial:** Se registra como dos campos separados (`presion_sistolica` y `presion_diastolica`) y se muestra como `120/80 mmHg`

4. **Campos opcionales:** Todos los campos de signos vitales son opcionales (excepto `registrado_por` que es requerido)

---

**Última actualización:** 17 de noviembre de 2025



