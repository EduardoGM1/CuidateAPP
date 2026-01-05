# 📊 Comparación de Formularios de Signos Vitales

**Fecha:** 2025-11-16  
**Objetivo:** Verificar que los campos y datos enviados coincidan entre los diferentes formularios

---

## 🔍 FORMULARIOS COMPARADOS

### 1. **Wizard de Completar Cita** (`CompletarCitaWizard.js`)
### 2. **Formulario "Agregar Signos Vitales"** (`DetallePaciente.js`)
### 3. **Formulario "Completar Consulta Completa"** (`DetallePaciente.js`)

---

## 📋 CAMPOS DE SIGNOS VITALES

| Campo | Wizard | Agregar Signos Vitales | Completar Consulta Completa | Backend Espera |
|-------|--------|------------------------|----------------------------|----------------|
| `peso_kg` | ✅ | ✅ | ✅ | ✅ |
| `talla_m` | ✅ | ✅ | ✅ | ✅ |
| `medida_cintura_cm` | ✅ | ✅ | ❌ | ✅ |
| `presion_sistolica` | ✅ | ✅ | ✅ | ✅ |
| `presion_diastolica` | ✅ | ✅ | ✅ | ✅ |
| `glucosa_mg_dl` | ✅ | ✅ | ✅ | ✅ |
| `colesterol_mg_dl` | ✅ | ✅ | ❌ | ✅ |
| `trigliceridos_mg_dl` | ✅ | ✅ | ❌ | ✅ |
| `observaciones` | ✅ | ✅ | ❌ | ✅ |
| `id_cita` | ✅ (automático) | ✅ (opcional) | ✅ (automático) | ✅ |

---

## ⚠️ DIFERENCIAS ENCONTRADAS

### **Formulario "Completar Consulta Completa" - FALTAN CAMPOS:**

El formulario de "Completar Consulta Completa" **NO incluye**:
- ❌ `medida_cintura_cm` (Cintura)
- ❌ `colesterol_mg_dl` (Colesterol)
- ❌ `trigliceridos_mg_dl` (Triglicéridos)
- ❌ `observaciones` (Observaciones de signos vitales)

**Solo incluye:**
- ✅ `peso_kg`
- ✅ `talla_m`
- ✅ `presion_sistolica`
- ✅ `presion_diastolica`
- ✅ `glucosa_mg_dl`

---

## 🔧 CORRECCIONES NECESARIAS

### **1. Agregar campos faltantes al Wizard**

El wizard ya tiene todos los campos, pero necesita mostrar los campos de colesterol y triglicéridos en el formulario.

### **2. Agregar campos faltantes a "Completar Consulta Completa"**

El formulario de "Completar Consulta Completa" necesita incluir:
- `medida_cintura_cm`
- `colesterol_mg_dl`
- `trigliceridos_mg_dl`
- `observaciones` (para signos vitales)

---

## ✅ ESTADO ACTUAL

### **Wizard:**
- ✅ Tiene todos los campos en el estado
- ⚠️ **NO muestra** colesterol y triglicéridos en el formulario (solo en el estado)

### **Agregar Signos Vitales:**
- ✅ Tiene todos los campos
- ✅ Funciona correctamente

### **Completar Consulta Completa:**
- ⚠️ **FALTAN** 4 campos importantes

---

## 📝 RECOMENDACIONES

1. **Agregar campos faltantes al Wizard** para que se muestren en el formulario
2. **Agregar campos faltantes a "Completar Consulta Completa"** para mantener consistencia
3. **Verificar que el backend acepte todos los campos** correctamente

