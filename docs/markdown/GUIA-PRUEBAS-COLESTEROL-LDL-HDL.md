# 🧪 GUÍA DE PRUEBAS: COLESTEROL LDL Y HDL

**Fecha:** 28 de diciembre de 2025  
**Funcionalidad:** Campos de Colesterol LDL y HDL en Signos Vitales

---

## 📋 ÍNDICE

1. [Verificación de Base de Datos](#1-verificación-de-base-de-datos)
2. [Pruebas del Backend (API)](#2-pruebas-del-backend-api)
3. [Pruebas del Frontend](#3-pruebas-del-frontend)
4. [Casos de Prueba Específicos](#4-casos-de-prueba-específicos)
5. [Scripts de Prueba Automatizados](#5-scripts-de-prueba-automatizados)

---

## 1. VERIFICACIÓN DE BASE DE DATOS

### **1.1 Verificar que los campos existen en la tabla**

**Comando SQL:**
```sql
DESCRIBE signos_vitales;
```

**Resultado esperado:**
- ✅ `colesterol_mg_dl` - DECIMAL(6,2) - "Colesterol Total (mg/dl)"
- ✅ `colesterol_ldl` - DECIMAL(6,2) - "Colesterol LDL (mg/dl)"
- ✅ `colesterol_hdl` - DECIMAL(6,2) - "Colesterol HDL (mg/dl)"

### **1.2 Verificar índices creados**

**Comando SQL:**
```sql
SHOW INDEXES FROM signos_vitales WHERE Column_name IN ('colesterol_ldl', 'colesterol_hdl');
```

**Resultado esperado:**
- ✅ Índice `idx_colesterol_ldl` en columna `colesterol_ldl`
- ✅ Índice `idx_colesterol_hdl` en columna `colesterol_hdl`

### **1.3 Verificar comentarios de columnas**

**Comando SQL:**
```sql
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'signos_vitales' 
AND COLUMN_NAME LIKE 'colesterol%'
ORDER BY COLUMN_NAME;
```

**Resultado esperado:**
- ✅ `colesterol_mg_dl`: "Colesterol Total (mg/dl) - Campo obligatorio para criterios de acreditación"
- ✅ `colesterol_ldl`: "Colesterol LDL (mg/dl) - Solo para pacientes con diagnóstico de Hipercolesterolemia"
- ✅ `colesterol_hdl`: "Colesterol HDL (mg/dl) - Solo para pacientes con diagnóstico de Hipercolesterolemia"

---

## 2. PRUEBAS DEL BACKEND (API)

### **2.1 Preparar datos de prueba**

**Paso 1: Crear o identificar un paciente CON diagnóstico de Dislipidemia/Hipercolesterolemia**

```sql
-- Buscar comorbilidad "Dislipidemia"
SELECT id_comorbilidad, nombre_comorbilidad 
FROM comorbilidades 
WHERE nombre_comorbilidad LIKE '%Dislipidemia%' 
   OR nombre_comorbilidad LIKE '%Hipercolesterolemia%';

-- Asignar comorbilidad a un paciente (reemplazar ID_PACIENTE y ID_COMORBILIDAD)
INSERT INTO paciente_comorbilidad (id_paciente, id_comorbilidad, fecha_deteccion)
VALUES (ID_PACIENTE, ID_COMORBILIDAD, CURDATE());
```

**Paso 2: Crear o identificar un paciente SIN diagnóstico de Dislipidemia/Hipercolesterolemia**

```sql
-- Verificar que el paciente NO tiene la comorbilidad
SELECT * FROM paciente_comorbilidad 
WHERE id_paciente = ID_PACIENTE 
AND id_comorbilidad IN (
    SELECT id_comorbilidad FROM comorbilidades 
    WHERE nombre_comorbilidad LIKE '%Dislipidemia%' 
       OR nombre_comorbilidad LIKE '%Hipercolesterolemia%'
);
-- Debe retornar 0 filas
```

---

### **2.2 Prueba 1: Crear Signo Vital CON LDL/HDL (Paciente CON diagnóstico) ✅**

**Endpoint:** `POST /api/signos-vitales`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer TOKEN_ADMIN_O_DOCTOR
```

**Body:**
```json
{
  "id_paciente": ID_PACIENTE_CON_DIAGNOSTICO,
  "colesterol_mg_dl": 200,
  "colesterol_ldl": 130,
  "colesterol_hdl": 50,
  "glucosa_mg_dl": 95,
  "peso_kg": 70,
  "talla_m": 1.70,
  "presion_sistolica": 120,
  "presion_diastolica": 80,
  "registrado_por": "doctor"
}
```

**Resultado esperado:**
- ✅ Status: `201 Created`
- ✅ Response incluye `colesterol_ldl: 130` y `colesterol_hdl: 50`
- ✅ No hay errores de validación

---

### **2.3 Prueba 2: Crear Signo Vital CON LDL/HDL (Paciente SIN diagnóstico) ❌**

**Endpoint:** `POST /api/signos-vitales`

**Body:**
```json
{
  "id_paciente": ID_PACIENTE_SIN_DIAGNOSTICO,
  "colesterol_mg_dl": 200,
  "colesterol_ldl": 130,
  "colesterol_hdl": 50,
  "glucosa_mg_dl": 95,
  "peso_kg": 70,
  "talla_m": 1.70,
  "presion_sistolica": 120,
  "presion_diastolica": 80,
  "registrado_por": "doctor"
}
```

**Resultado esperado:**
- ✅ Status: `400 Bad Request`
- ✅ Error message: `"No se puede registrar Colesterol LDL/HDL sin diagnóstico de Hipercolesterolemia o Dislipidemia."`
- ✅ No se crea el registro

---

### **2.4 Prueba 3: Crear Signo Vital SIN LDL/HDL (Cualquier paciente) ✅**

**Endpoint:** `POST /api/signos-vitales`

**Body:**
```json
{
  "id_paciente": ID_PACIENTE_CUALQUIERA,
  "colesterol_mg_dl": 200,
  "glucosa_mg_dl": 95,
  "peso_kg": 70,
  "talla_m": 1.70,
  "presion_sistolica": 120,
  "presion_diastolica": 80,
  "registrado_por": "doctor"
}
```

**Resultado esperado:**
- ✅ Status: `201 Created`
- ✅ Se crea el registro sin problemas
- ✅ `colesterol_ldl` y `colesterol_hdl` son `null`

---

### **2.5 Prueba 4: Validación de Rangos - LDL fuera de rango ❌**

**Endpoint:** `POST /api/signos-vitales`

**Body:**
```json
{
  "id_paciente": ID_PACIENTE_CON_DIAGNOSTICO,
  "colesterol_mg_dl": 200,
  "colesterol_ldl": 600,
  "colesterol_hdl": 50,
  "registrado_por": "doctor"
}
```

**Resultado esperado:**
- ✅ Status: `400 Bad Request`
- ✅ Error message: `"Colesterol LDL debe estar entre 0 y 500 mg/dL"`

---

### **2.6 Prueba 5: Validación de Rangos - HDL fuera de rango ❌**

**Endpoint:** `POST /api/signos-vitales`

**Body:**
```json
{
  "id_paciente": ID_PACIENTE_CON_DIAGNOSTICO,
  "colesterol_mg_dl": 200,
  "colesterol_ldl": 130,
  "colesterol_hdl": 250,
  "registrado_por": "doctor"
}
```

**Resultado esperado:**
- ✅ Status: `400 Bad Request`
- ✅ Error message: `"Colesterol HDL debe estar entre 0 y 200 mg/dL"`

---

### **2.7 Prueba 6: Actualizar Signo Vital - Agregar LDL/HDL ✅**

**Endpoint:** `PUT /api/signos-vitales/:id`

**Body:**
```json
{
  "colesterol_ldl": 120,
  "colesterol_hdl": 45
}
```

**Resultado esperado:**
- ✅ Status: `200 OK`
- ✅ Se actualiza correctamente
- ✅ Validación de diagnóstico se ejecuta

---

### **2.8 Prueba 7: Obtener Signo Vital con LDL/HDL ✅**

**Endpoint:** `GET /api/signos-vitales/:id`

**Resultado esperado:**
- ✅ Status: `200 OK`
- ✅ Response incluye `colesterol_ldl` y `colesterol_hdl`
- ✅ Valores son correctos

---

### **2.9 Prueba 8: Obtener Signos Vitales por Paciente ✅**

**Endpoint:** `GET /api/signos-vitales/paciente/:pacienteId`

**Resultado esperado:**
- ✅ Status: `200 OK`
- ✅ Array de signos vitales
- ✅ Cada signo incluye `colesterol_ldl` y `colesterol_hdl` (pueden ser `null`)

---

## 3. PRUEBAS DEL FRONTEND

### **3.1 Preparación**

1. **Iniciar la aplicación móvil**
2. **Iniciar sesión como Administrador o Doctor**
3. **Navegar a la lista de pacientes**

---

### **3.2 Prueba 1: Verificar campos en formulario (Paciente CON diagnóstico) ✅**

**Pasos:**
1. Abrir detalle de un paciente **CON** diagnóstico de Dislipidemia/Hipercolesterolemia
2. Abrir modal "Signos Vitales" o "Agregar Signo Vital"
3. Buscar sección "Exámenes de Laboratorio" o "Perfil Lipídico"

**Resultado esperado:**
- ✅ Se muestra campo "Colesterol Total (mg/dL)" con asterisco (*)
- ✅ Se muestra campo "Colesterol LDL (mg/dL)"
- ✅ Se muestra campo "Colesterol HDL (mg/dL)"
- ✅ Campos LDL y HDL están visibles y editables

---

### **3.3 Prueba 2: Verificar campos en formulario (Paciente SIN diagnóstico) ✅**

**Pasos:**
1. Abrir detalle de un paciente **SIN** diagnóstico de Dislipidemia/Hipercolesterolemia
2. Abrir modal "Signos Vitales"
3. Buscar sección "Exámenes de Laboratorio"

**Resultado esperado:**
- ✅ Se muestra campo "Colesterol Total (mg/dL)"
- ❌ **NO** se muestran campos "Colesterol LDL" y "Colesterol HDL"
- ✅ Solo se puede registrar Colesterol Total

---

### **3.4 Prueba 3: Crear Signo Vital con LDL/HDL (Paciente CON diagnóstico) ✅**

**Pasos:**
1. Abrir detalle de paciente CON diagnóstico
2. Abrir modal "Signos Vitales"
3. Llenar formulario:
   - Colesterol Total: `200`
   - Colesterol LDL: `130`
   - Colesterol HDL: `50`
   - Otros campos requeridos
4. Guardar

**Resultado esperado:**
- ✅ Se guarda exitosamente
- ✅ Mensaje de éxito
- ✅ Los valores se muestran en el historial

---

### **3.5 Prueba 4: Intentar crear Signo Vital con LDL/HDL (Paciente SIN diagnóstico) ❌**

**Pasos:**
1. Abrir detalle de paciente SIN diagnóstico
2. Si los campos LDL/HDL aparecen (bug), intentar llenarlos
3. Guardar

**Resultado esperado:**
- ❌ Backend rechaza con error 400
- ✅ Mensaje de error claro: "No se puede registrar Colesterol LDL/HDL sin diagnóstico..."
- ✅ No se guarda el registro

---

### **3.6 Prueba 5: Validación de rangos en frontend ✅**

**Pasos:**
1. Abrir formulario de signos vitales
2. Intentar ingresar LDL > 500 o < 0
3. Intentar ingresar HDL > 200 o < 0

**Resultado esperado:**
- ✅ Validación en tiempo real (si está implementada)
- ✅ Mensaje de error claro
- ✅ No permite guardar valores inválidos

---

### **3.7 Prueba 6: Visualización en historial ✅**

**Pasos:**
1. Abrir detalle de paciente CON signos vitales que incluyen LDL/HDL
2. Abrir modal "Historial de Signos Vitales" o "Todos los Signos Vitales"
3. Buscar registro con LDL/HDL

**Resultado esperado:**
- ✅ Se muestra "Colesterol Total: 200 mg/dL"
- ✅ Se muestra "Colesterol LDL: 130 mg/dL"
- ✅ Se muestra "Colesterol HDL: 50 mg/dL"
- ✅ Formato claro y legible

---

### **3.8 Prueba 7: Editar Signo Vital existente ✅**

**Pasos:**
1. Abrir historial de signos vitales
2. Seleccionar un registro que tenga LDL/HDL
3. Editar valores
4. Guardar

**Resultado esperado:**
- ✅ Se cargan los valores actuales en el formulario
- ✅ Se pueden modificar
- ✅ Se guarda correctamente

---

### **3.9 Prueba 8: Agregar LDL/HDL a registro existente ✅**

**Pasos:**
1. Abrir registro de signo vital que solo tiene Colesterol Total
2. Si el paciente tiene diagnóstico, editar y agregar LDL/HDL
3. Guardar

**Resultado esperado:**
- ✅ Se pueden agregar los campos
- ✅ Se guarda correctamente
- ✅ Se muestra en el historial

---

## 4. CASOS DE PRUEBA ESPECÍFICOS

### **4.1 Caso 1: Paciente con Dislipidemia**

**Escenario:**
- Paciente tiene comorbilidad "Dislipidemia"
- Intenta registrar signo vital con LDL y HDL

**Resultado esperado:**
- ✅ Permite registrar LDL y HDL
- ✅ Validación pasa

---

### **4.2 Caso 2: Paciente con Hipercolesterolemia (si existe)**

**Escenario:**
- Paciente tiene comorbilidad "Hipercolesterolemia"
- Intenta registrar signo vital con LDL y HDL

**Resultado esperado:**
- ✅ Permite registrar LDL y HDL
- ✅ Validación pasa

---

### **4.3 Caso 3: Paciente con Síndrome Metabólico**

**Escenario:**
- Paciente tiene "Síndrome Metabólico" (que incluye dislipidemia)
- Intenta registrar signo vital con LDL y HDL

**Resultado esperado:**
- ⚠️ **Depende de la implementación**
- Si el sistema verifica "Síndrome Metabólico" como válido: ✅ Permite
- Si solo verifica "Dislipidemia" o "Hipercolesterolemia": ❌ Rechaza

---

### **4.4 Caso 4: Valores límite**

**Escenarios:**
- LDL = 0 (mínimo)
- LDL = 500 (máximo)
- HDL = 0 (mínimo)
- HDL = 200 (máximo)
- LDL = 500.01 (fuera de rango)
- HDL = 200.01 (fuera de rango)

**Resultado esperado:**
- ✅ Valores límite (0, 500, 200) se aceptan
- ❌ Valores fuera de rango se rechazan

---

### **4.5 Caso 5: Valores decimales**

**Escenarios:**
- LDL = 130.5
- HDL = 45.75

**Resultado esperado:**
- ✅ Se aceptan valores decimales
- ✅ Se guardan con precisión de 2 decimales

---

### **4.6 Caso 6: Solo LDL o solo HDL**

**Escenarios:**
- Solo se proporciona LDL (HDL = null)
- Solo se proporciona HDL (LDL = null)

**Resultado esperado:**
- ✅ Se permite proporcionar solo uno de los dos
- ✅ No se requiere que ambos estén presentes

---

## 5. SCRIPTS DE PRUEBA AUTOMATIZADOS

### **5.1 Script de Prueba Backend (Node.js)**

Crear archivo: `api-clinica/scripts/test-colesterol-ldl-hdl.js`

```javascript
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// Configurar token de autenticación
const AUTH_TOKEN = 'TU_TOKEN_AQUI'; // Reemplazar con token real

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

// IDs de prueba (reemplazar con IDs reales)
const PACIENTE_CON_DIAGNOSTICO = 1;
const PACIENTE_SIN_DIAGNOSTICO = 2;

async function testCrearSignoVitalConLDLHDL() {
  console.log('\n🧪 PRUEBA 1: Crear Signo Vital CON LDL/HDL (Paciente CON diagnóstico)');
  
  try {
    const response = await axios.post(
      `${API_URL}/signos-vitales`,
      {
        id_paciente: PACIENTE_CON_DIAGNOSTICO,
        colesterol_mg_dl: 200,
        colesterol_ldl: 130,
        colesterol_hdl: 50,
        glucosa_mg_dl: 95,
        peso_kg: 70,
        talla_m: 1.70,
        presion_sistolica: 120,
        presion_diastolica: 80,
        registrado_por: 'doctor'
      },
      { headers }
    );
    
    console.log('✅ ÉXITO:', response.status);
    console.log('   Datos:', {
      colesterol_ldl: response.data.colesterol_ldl,
      colesterol_hdl: response.data.colesterol_hdl
    });
    return response.data.id_signo;
  } catch (error) {
    console.log('❌ ERROR:', error.response?.status, error.response?.data);
    return null;
  }
}

async function testCrearSignoVitalSinLDLHDL() {
  console.log('\n🧪 PRUEBA 2: Crear Signo Vital SIN LDL/HDL (Paciente SIN diagnóstico)');
  
  try {
    const response = await axios.post(
      `${API_URL}/signos-vitales`,
      {
        id_paciente: PACIENTE_SIN_DIAGNOSTICO,
        colesterol_mg_dl: 200,
        glucosa_mg_dl: 95,
        peso_kg: 70,
        talla_m: 1.70,
        presion_sistolica: 120,
        presion_diastolica: 80,
        registrado_por: 'doctor'
      },
      { headers }
    );
    
    console.log('✅ ÉXITO:', response.status);
    return response.data.id_signo;
  } catch (error) {
    console.log('❌ ERROR:', error.response?.status, error.response?.data);
    return null;
  }
}

async function testCrearSignoVitalConLDLHDLSinDiagnostico() {
  console.log('\n🧪 PRUEBA 3: Crear Signo Vital CON LDL/HDL (Paciente SIN diagnóstico) - DEBE FALLAR');
  
  try {
    const response = await axios.post(
      `${API_URL}/signos-vitales`,
      {
        id_paciente: PACIENTE_SIN_DIAGNOSTICO,
        colesterol_mg_dl: 200,
        colesterol_ldl: 130,
        colesterol_hdl: 50,
        glucosa_mg_dl: 95,
        peso_kg: 70,
        talla_m: 1.70,
        presion_sistolica: 120,
        presion_diastolica: 80,
        registrado_por: 'doctor'
      },
      { headers }
    );
    
    console.log('❌ ERROR: Debería haber fallado pero no falló');
    console.log('   Response:', response.data);
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ ÉXITO: Rechazado correctamente');
      console.log('   Error:', error.response.data.error);
    } else {
      console.log('❌ ERROR INESPERADO:', error.response?.status, error.response?.data);
    }
  }
}

async function testValidacionRangos() {
  console.log('\n🧪 PRUEBA 4: Validación de Rangos');
  
  // LDL fuera de rango
  try {
    await axios.post(
      `${API_URL}/signos-vitales`,
      {
        id_paciente: PACIENTE_CON_DIAGNOSTICO,
        colesterol_mg_dl: 200,
        colesterol_ldl: 600,
        colesterol_hdl: 50,
        registrado_por: 'doctor'
      },
      { headers }
    );
    console.log('❌ ERROR: Debería haber rechazado LDL = 600');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ LDL fuera de rango rechazado correctamente');
    }
  }
  
  // HDL fuera de rango
  try {
    await axios.post(
      `${API_URL}/signos-vitales`,
      {
        id_paciente: PACIENTE_CON_DIAGNOSTICO,
        colesterol_mg_dl: 200,
        colesterol_ldl: 130,
        colesterol_hdl: 250,
        registrado_por: 'doctor'
      },
      { headers }
    );
    console.log('❌ ERROR: Debería haber rechazado HDL = 250');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ HDL fuera de rango rechazado correctamente');
    }
  }
}

async function testObtenerSignoVital(idSigno) {
  console.log('\n🧪 PRUEBA 5: Obtener Signo Vital');
  
  if (!idSigno) {
    console.log('⚠️  Saltando prueba: No hay ID de signo vital');
    return;
  }
  
  try {
    const response = await axios.get(
      `${API_URL}/signos-vitales/${idSigno}`,
      { headers }
    );
    
    console.log('✅ ÉXITO:', response.status);
    console.log('   Datos:', {
      colesterol_mg_dl: response.data.colesterol_mg_dl,
      colesterol_ldl: response.data.colesterol_ldl,
      colesterol_hdl: response.data.colesterol_hdl
    });
  } catch (error) {
    console.log('❌ ERROR:', error.response?.status, error.response?.data);
  }
}

// Ejecutar todas las pruebas
async function ejecutarPruebas() {
  console.log('🚀 INICIANDO PRUEBAS DE COLESTEROL LDL Y HDL\n');
  console.log('='.repeat(60));
  
  const idSigno1 = await testCrearSignoVitalConLDLHDL();
  const idSigno2 = await testCrearSignoVitalSinLDLHDL();
  await testCrearSignoVitalConLDLHDLSinDiagnostico();
  await testValidacionRangos();
  await testObtenerSignoVital(idSigno1);
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ PRUEBAS COMPLETADAS');
}

ejecutarPruebas().catch(console.error);
```

---

### **5.2 Script de Verificación SQL**

Crear archivo: `api-clinica/scripts/verificar-colesterol-ldl-hdl.sql`

```sql
-- Verificar estructura de la tabla
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'signos_vitales' 
AND COLUMN_NAME LIKE 'colesterol%'
ORDER BY COLUMN_NAME;

-- Verificar índices
SHOW INDEXES FROM signos_vitales WHERE Column_name IN ('colesterol_ldl', 'colesterol_hdl');

-- Verificar datos existentes
SELECT 
    id_signo,
    id_paciente,
    colesterol_mg_dl,
    colesterol_ldl,
    colesterol_hdl,
    fecha_medicion
FROM signos_vitales
WHERE colesterol_ldl IS NOT NULL OR colesterol_hdl IS NOT NULL
ORDER BY fecha_medicion DESC
LIMIT 10;

-- Verificar pacientes con diagnóstico de Dislipidemia/Hipercolesterolemia
SELECT 
    p.id_paciente,
    p.nombre,
    p.apellido_paterno,
    c.nombre_comorbilidad,
    pc.fecha_deteccion
FROM pacientes p
INNER JOIN paciente_comorbilidad pc ON p.id_paciente = pc.id_paciente
INNER JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
WHERE c.nombre_comorbilidad LIKE '%Dislipidemia%' 
   OR c.nombre_comorbilidad LIKE '%Hipercolesterolemia%'
LIMIT 10;
```

---

## 📝 CHECKLIST DE PRUEBAS

### **Base de Datos**
- [ ] Campos `colesterol_ldl` y `colesterol_hdl` existen
- [ ] Índices creados correctamente
- [ ] Comentarios de columnas correctos
- [ ] Tipos de datos correctos (DECIMAL(6,2))

### **Backend - API**
- [ ] Crear signo vital CON LDL/HDL (paciente CON diagnóstico) ✅
- [ ] Crear signo vital CON LDL/HDL (paciente SIN diagnóstico) ❌
- [ ] Crear signo vital SIN LDL/HDL (cualquier paciente) ✅
- [ ] Validación de rangos (LDL: 0-500, HDL: 0-200) ❌
- [ ] Actualizar signo vital con LDL/HDL ✅
- [ ] Obtener signo vital con LDL/HDL ✅
- [ ] Obtener signos vitales por paciente ✅

### **Frontend**
- [ ] Campos visibles para paciente CON diagnóstico ✅
- [ ] Campos NO visibles para paciente SIN diagnóstico ✅
- [ ] Crear signo vital con LDL/HDL ✅
- [ ] Validación de rangos en frontend ✅
- [ ] Visualización en historial ✅
- [ ] Editar signo vital existente ✅

---

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### **Problema 1: Campos no aparecen en el frontend**

**Solución:**
- Verificar que el paciente tiene la comorbilidad correcta
- Verificar la función `tieneHipercolesterolemia()` en el frontend
- Verificar que los campos están en el estado del formulario

---

### **Problema 2: Backend rechaza incluso con diagnóstico**

**Solución:**
- Verificar que la comorbilidad se llama exactamente "Dislipidemia" o "Hipercolesterolemia"
- Verificar la función `tieneHipercolesterolemia()` en el backend
- Revisar logs del servidor para ver el error exacto

---

### **Problema 3: Valores no se guardan**

**Solución:**
- Verificar que el modelo `SignoVital` incluye los campos
- Verificar que el controlador incluye los campos en `create` y `update`
- Revisar logs de la base de datos

---

## ✅ CRITERIOS DE ÉXITO

La implementación se considera **EXITOSA** si:

1. ✅ Los campos existen en la base de datos
2. ✅ El backend valida correctamente (diagnóstico y rangos)
3. ✅ El frontend muestra/oculta campos según diagnóstico
4. ✅ Los datos se guardan y recuperan correctamente
5. ✅ La visualización en historial funciona
6. ✅ Las validaciones rechazan casos inválidos

---

**Última actualización:** 28 de diciembre de 2025

