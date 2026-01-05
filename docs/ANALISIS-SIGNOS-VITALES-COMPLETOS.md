# 📊 ANÁLISIS: Signos Vitales Completos - Campos Disponibles y Faltantes

**Fecha:** 17 de noviembre de 2025  
**Objetivo:** Analizar qué campos de signos vitales están disponibles en formularios y cuáles faltan

---

## 📋 CAMPOS DEL MODELO `SignoVital` (Backend)

### ✅ **Campos Disponibles en la Base de Datos:**

1. ✅ `peso_kg` - Peso en kilogramos
2. ✅ `talla_m` - Talla en metros
3. ✅ `imc` - Índice de Masa Corporal (calculado automáticamente)
4. ✅ `medida_cintura_cm` - Medida de cintura en centímetros
5. ✅ `presion_sistolica` - Presión sistólica (mmHg)
6. ✅ `presion_diastolica` - Presión diastólica (mmHg)
7. ✅ `glucosa_mg_dl` - Glucosa en mg/dL
8. ✅ `colesterol_mg_dl` - Colesterol en mg/dL
9. ✅ `trigliceridos_mg_dl` - Triglicéridos en mg/dL
10. ✅ `observaciones` - Observaciones adicionales
11. ✅ `fecha_medicion` - Fecha de medición
12. ✅ `id_cita` - ID de cita asociada (opcional)
13. ✅ `registrado_por` - Quién registró ('paciente' o 'doctor')

### ❌ **Campos que NO existen en el modelo:**
- ❌ `frecuencia_cardiaca` - **NO EXISTE en el modelo**
- ❌ `temperatura` - **NO EXISTE en el modelo**
- ❌ `saturacion_oxigeno` - **NO EXISTE en el modelo**

**⚠️ PROBLEMA:** El código en `HistorialMedico.js` intenta mostrar estos campos que no existen en el modelo.

---

## 📝 ANÁLISIS DE FORMULARIOS

### 1. ✅ **Formulario de Pacientes** (`RegistrarSignosVitales.js`)

#### **Campos Disponibles:**
- ✅ `peso_kg`
- ✅ `talla_m`
- ✅ `presion_sistolica`
- ✅ `presion_diastolica`
- ✅ `glucosa_mg_dl`
- ✅ `medida_cintura_cm` (opcional)
- ✅ `observaciones` (opcional)

#### **❌ Campos FALTANTES:**
- ❌ `colesterol_mg_dl` - **NO está en el formulario**
- ❌ `trigliceridos_mg_dl` - **NO está en el formulario**

**Impacto:** Los pacientes NO pueden registrar colesterol ni triglicéridos desde su interfaz.

---

### 2. ✅ **Formulario de Doctores/Administradores** (`DetallePaciente.js`)

#### **Campos Disponibles:**
- ✅ `peso_kg`
- ✅ `talla_m`
- ✅ `medida_cintura_cm`
- ✅ `presion_sistolica`
- ✅ `presion_diastolica`
- ✅ `glucosa_mg_dl`
- ✅ `colesterol_mg_dl` ✅
- ✅ `trigliceridos_mg_dl` ✅
- ✅ `observaciones`

#### **Estado:** ✅ **COMPLETO** - Todos los campos del modelo están disponibles

---

### 3. ✅ **Formulario de Crear Paciente** (`AgregarPaciente.js`)

#### **Campos Disponibles en `signos_vitales`:**
- ✅ `peso_kg`
- ✅ `talla_m`
- ✅ `imc` (calculado)
- ✅ `medida_cintura_cm`
- ✅ `presion_sistolica`
- ✅ `presion_diastolica`
- ✅ `glucosa_mg_dl`
- ✅ `colesterol_mg_dl` ✅
- ✅ `trigliceridos_mg_dl` ✅
- ✅ `observaciones`

#### **Estado:** ✅ **COMPLETO** - Todos los campos del modelo están disponibles

---

### 4. ✅ **Wizard de Completar Cita** (`CompletarCitaWizard.js`)

#### **Campos Disponibles en `signos_vitales`:**
- ✅ `peso_kg`
- ✅ `talla_m`
- ✅ `medida_cintura_cm`
- ✅ `presion_sistolica`
- ✅ `presion_diastolica`
- ✅ `glucosa_mg_dl`
- ✅ `colesterol_mg_dl` ✅
- ✅ `trigliceridos_mg_dl` ✅
- ✅ `observaciones`

#### **Estado:** ✅ **COMPLETO** - Todos los campos del modelo están disponibles

---

## 🔍 PROBLEMAS IDENTIFICADOS

### **Problema 1: Formulario de Pacientes Incompleto**

**Ubicación:** `ClinicaMovil/src/screens/paciente/RegistrarSignosVitales.js`

**Campos faltantes:**
- ❌ `colesterol_mg_dl`
- ❌ `trigliceridos_mg_dl`

**Impacto:**
- Los pacientes NO pueden registrar colesterol ni triglicéridos
- Estos datos solo pueden ser registrados por doctores/administradores
- Si un paciente necesita registrar estos valores, debe pedirle al doctor que lo haga

---

### **Problema 2: Campos Inexistentes en HistorialMedico**

**Ubicación:** `ClinicaMovil/src/screens/paciente/HistorialMedico.js`

**Campos que se intentan mostrar pero NO existen en el modelo:**
- ❌ `frecuencia_cardiaca` - Líneas 805, 1126
- ❌ `temperatura` - Líneas 816, 1132
- ❌ `saturacion_oxigeno` - Líneas 827, 1137

**Impacto:**
- Estos campos NUNCA se mostrarán porque no existen en la base de datos
- El código está intentando acceder a campos que nunca se guardan
- Puede causar confusión al usuario

**Solución:**
- Remover estos campos del código de visualización
- O agregarlos al modelo si son necesarios (requiere migración de BD)

---

### **Problema 3: Visualización Condicional**

**Ubicación:** `ClinicaMovil/src/screens/paciente/HistorialMedico.js`

**Problema actual:**
- Los campos solo se muestran si tienen valor (`{ultimosSignos.peso_kg && ...}`)
- Si un campo está vacío, no se muestra nada
- El usuario no sabe si el campo no se registró o si simplemente no se muestra

**Solución solicitada:**
- Mostrar TODOS los campos siempre
- Si un campo está vacío, mostrar texto "Sin datos" o "No registrado"
- Esto permite al usuario ver qué campos están disponibles y cuáles faltan

---

## 📊 RESUMEN COMPARATIVO

| Campo | Modelo BD | Form. Paciente | Form. Doctor/Admin | Form. Crear Paciente | Wizard Cita | HistorialMedico |
|-------|-----------|----------------|---------------------|----------------------|-------------|-----------------|
| `peso_kg` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `talla_m` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `imc` | ✅ | ✅ (calc) | ✅ (calc) | ✅ (calc) | ✅ (calc) | ✅ |
| `medida_cintura_cm` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `presion_sistolica` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `presion_diastolica` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `glucosa_mg_dl` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `colesterol_mg_dl` | ✅ | ❌ **FALTA** | ✅ | ✅ | ✅ | ✅ |
| `trigliceridos_mg_dl` | ✅ | ❌ **FALTA** | ✅ | ✅ | ✅ | ✅ |
| `observaciones` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `frecuencia_cardiaca` | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ **NO EXISTE** |
| `temperatura` | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ **NO EXISTE** |
| `saturacion_oxigeno` | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ **NO EXISTE** |

---

## 🎯 ACCIONES REQUERIDAS

### **1. Agregar campos faltantes al formulario de pacientes**

**Archivo:** `ClinicaMovil/src/screens/paciente/RegistrarSignosVitales.js`

**Agregar:**
- Campo `colesterol_mg_dl` (opcional)
- Campo `trigliceridos_mg_dl` (opcional)

**Ubicación:** Después del campo `glucosa_mg_dl` y antes de `medida_cintura_cm`

---

### **2. Remover campos inexistentes de HistorialMedico**

**Archivo:** `ClinicaMovil/src/screens/paciente/HistorialMedico.js`

**Remover:**
- Referencias a `frecuencia_cardiaca`
- Referencias a `temperatura`
- Referencias a `saturacion_oxigeno`

**O alternativamente:** Agregar estos campos al modelo (requiere migración de BD)

---

### **3. Mostrar todos los campos siempre (incluso si están vacíos)**

**Archivo:** `ClinicaMovil/src/screens/paciente/HistorialMedico.js`

**Cambios:**
- En Tab "Resumen" - Últimos Signos Vitales
- En Tab "Citas" - Signos Vitales de la cita

**Implementación:**
- Mostrar todos los campos del modelo siempre
- Si el campo está vacío/null, mostrar texto "Sin datos" o "No registrado"
- Usar un estilo diferente (gris, itálico) para indicar que está vacío

---

## 📝 CAMPOS A MOSTRAR SIEMPRE (Según Modelo)

1. Peso (kg)
2. Talla (m)
3. IMC
4. Medida de Cintura (cm)
5. Presión Sistólica/Diastólica (mmHg)
6. Glucosa (mg/dL)
7. Colesterol (mg/dL)
8. Triglicéridos (mg/dL)
9. Observaciones

**Total: 9 campos principales + observaciones**

---

## ⚠️ DECISIÓN REQUERIDA

### **¿Agregar campos al modelo o remover del código?**

**Opción A: Remover del código (Recomendado)**
- Remover `frecuencia_cardiaca`, `temperatura`, `saturacion_oxigeno` de `HistorialMedico.js`
- Estos campos no existen en el modelo actual
- No se pueden guardar ni mostrar

**Opción B: Agregar al modelo (Requiere migración)**
- Agregar estos 3 campos al modelo `SignoVital`
- Crear migración de base de datos
- Agregar campos a todos los formularios
- Más trabajo pero más completo

**Recomendación:** Opción A (remover del código) porque:
- No están en el modelo actual
- No se están guardando
- Agregar al modelo requiere migración de BD
- Si se necesitan en el futuro, se pueden agregar entonces

---

**Última actualización:** 17 de noviembre de 2025



