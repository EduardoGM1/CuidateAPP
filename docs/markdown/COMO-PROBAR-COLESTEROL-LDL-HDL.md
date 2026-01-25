# 🧪 CÓMO PROBAR: COLESTEROL LDL Y HDL

**Guía rápida para probar la funcionalidad de Colesterol LDL y HDL**

---

## 📋 OPCIONES DE PRUEBA

Tienes **3 formas** de probar la funcionalidad:

1. **✅ Verificación SQL** (Más rápido - Solo base de datos)
2. **✅ Script automatizado** (Pruebas de API)
3. **✅ Pruebas manuales** (Frontend completo)

---

## 🚀 OPCIÓN 1: VERIFICACIÓN SQL (5 minutos)

### **Paso 1: Ejecutar script SQL**

```bash
# Desde la terminal, conectarte a MySQL y ejecutar:
mysql -u root -p < api-clinica/scripts/verificar-colesterol-ldl-hdl.sql
```

O desde MySQL Workbench / DBeaver:
- Abrir el archivo: `api-clinica/scripts/verificar-colesterol-ldl-hdl.sql`
- Ejecutar todo el script

### **Paso 2: Verificar resultados**

El script mostrará:
- ✅ Estructura de columnas (deben existir `colesterol_ldl` y `colesterol_hdl`)
- ✅ Índices creados
- ✅ Datos existentes
- ✅ Pacientes con diagnóstico
- ✅ Casos problemáticos (si existen)

**✅ Si todo está bien:** Verás las columnas y datos correctamente.

**❌ Si hay problemas:** Revisa los mensajes de error.

---

## 🚀 OPCIÓN 2: SCRIPT AUTOMATIZADO (10 minutos)

### **Paso 1: Configurar variables**

Editar archivo `.env` en `api-clinica/`:

```env
API_URL=http://localhost:3000/api
TEST_AUTH_TOKEN=tu_token_de_autenticacion_aqui
TEST_PACIENTE_CON_DIAGNOSTICO=1
TEST_PACIENTE_SIN_DIAGNOSTICO=2
```

**O modificar directamente en el script:**
```javascript
const AUTH_TOKEN = 'tu_token_aqui';
const PACIENTE_CON_DIAGNOSTICO = 1; // ID de paciente CON Dislipidemia
const PACIENTE_SIN_DIAGNOSTICO = 2; // ID de paciente SIN Dislipidemia
```

### **Paso 2: Obtener token de autenticación**

1. Iniciar sesión en la aplicación
2. Obtener el token JWT del header de las peticiones
3. Copiarlo al `.env` o al script

### **Paso 3: Identificar pacientes de prueba**

**Paciente CON diagnóstico:**
```sql
SELECT p.id_paciente, p.nombre, c.nombre_comorbilidad
FROM pacientes p
INNER JOIN paciente_comorbilidad pc ON p.id_paciente = pc.id_paciente
INNER JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
WHERE c.nombre_comorbilidad LIKE '%Dislipidemia%';
```

**Paciente SIN diagnóstico:**
```sql
SELECT p.id_paciente, p.nombre
FROM pacientes p
WHERE p.id_paciente NOT IN (
    SELECT DISTINCT id_paciente 
    FROM paciente_comorbilidad pc
    INNER JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
    WHERE c.nombre_comorbilidad LIKE '%Dislipidemia%'
)
LIMIT 1;
```

### **Paso 4: Ejecutar script**

```bash
cd api-clinica
node scripts/test-colesterol-ldl-hdl.js
```

### **Paso 5: Revisar resultados**

El script mostrará:
- ✅ Pruebas exitosas
- ❌ Pruebas fallidas
- 📊 Resumen con tasa de éxito

---

## 🚀 OPCIÓN 3: PRUEBAS MANUALES (15 minutos)

### **Prueba 1: Verificar campos en formulario**

1. **Iniciar aplicación móvil**
2. **Iniciar sesión como Admin/Doctor**
3. **Abrir paciente CON diagnóstico de Dislipidemia**
4. **Abrir modal "Signos Vitales"**
5. **Buscar sección "Exámenes de Laboratorio"**

**✅ Resultado esperado:**
- Se muestran campos: "Colesterol Total", "Colesterol LDL", "Colesterol HDL"

---

### **Prueba 2: Verificar que campos NO aparecen sin diagnóstico**

1. **Abrir paciente SIN diagnóstico de Dislipidemia**
2. **Abrir modal "Signos Vitales"**
3. **Buscar sección "Exámenes de Laboratorio"**

**✅ Resultado esperado:**
- Solo se muestra "Colesterol Total"
- NO se muestran campos LDL y HDL

---

### **Prueba 3: Crear signo vital con LDL/HDL**

1. **Abrir paciente CON diagnóstico**
2. **Abrir modal "Signos Vitales"**
3. **Llenar formulario:**
   - Colesterol Total: `200`
   - Colesterol LDL: `130`
   - Colesterol HDL: `50`
   - Otros campos requeridos
4. **Guardar**

**✅ Resultado esperado:**
- Se guarda exitosamente
- Mensaje de éxito
- Valores aparecen en historial

---

### **Prueba 4: Intentar crear sin diagnóstico (debe fallar)**

1. **Abrir paciente SIN diagnóstico**
2. **Si los campos LDL/HDL aparecen (bug), intentar llenarlos**
3. **Guardar**

**✅ Resultado esperado:**
- Backend rechaza con error 400
- Mensaje: "No se puede registrar Colesterol LDL/HDL sin diagnóstico..."

---

### **Prueba 5: Validación de rangos**

1. **Abrir formulario de signos vitales**
2. **Intentar ingresar:**
   - LDL: `600` (debe rechazar - máximo 500)
   - HDL: `250` (debe rechazar - máximo 200)
   - LDL: `-10` (debe rechazar - mínimo 0)

**✅ Resultado esperado:**
- Validación rechaza valores fuera de rango
- Mensaje de error claro

---

### **Prueba 6: Visualización en historial**

1. **Abrir paciente con signos vitales que incluyen LDL/HDL**
2. **Abrir modal "Historial de Signos Vitales"**
3. **Buscar registro con LDL/HDL**

**✅ Resultado esperado:**
- Se muestran los 3 valores:
  - Colesterol Total: 200 mg/dL
  - Colesterol LDL: 130 mg/dL
  - Colesterol HDL: 50 mg/dL

---

## 🔍 VERIFICACIÓN RÁPIDA (2 minutos)

### **Checklist mínimo:**

- [ ] Campos `colesterol_ldl` y `colesterol_hdl` existen en BD
- [ ] Campos aparecen en formulario (paciente CON diagnóstico)
- [ ] Campos NO aparecen (paciente SIN diagnóstico)
- [ ] Se puede guardar con LDL/HDL (paciente CON diagnóstico)
- [ ] Backend rechaza sin diagnóstico
- [ ] Validación de rangos funciona
- [ ] Se visualiza en historial

---

## 🐛 PROBLEMAS COMUNES

### **Problema: Campos no aparecen en frontend**

**Solución:**
1. Verificar que el paciente tiene comorbilidad "Dislipidemia"
2. Verificar función `tieneHipercolesterolemia()` en frontend
3. Revisar logs de la aplicación

---

### **Problema: Backend rechaza incluso con diagnóstico**

**Solución:**
1. Verificar nombre exacto de la comorbilidad en BD
2. Verificar función `tieneHipercolesterolemia()` en backend
3. Revisar logs del servidor

---

### **Problema: Valores no se guardan**

**Solución:**
1. Verificar que el modelo incluye los campos
2. Verificar que el controlador acepta los campos
3. Revisar logs de la base de datos

---

## 📚 DOCUMENTACIÓN COMPLETA

Para más detalles, consulta:
- **Guía completa:** `GUIA-PRUEBAS-COLESTEROL-LDL-HDL.md`
- **Script SQL:** `api-clinica/scripts/verificar-colesterol-ldl-hdl.sql`
- **Script Node.js:** `api-clinica/scripts/test-colesterol-ldl-hdl.js`

---

## ✅ CRITERIOS DE ÉXITO

La implementación está **correcta** si:

1. ✅ Campos existen en base de datos
2. ✅ Backend valida correctamente (diagnóstico y rangos)
3. ✅ Frontend muestra/oculta campos según diagnóstico
4. ✅ Datos se guardan y recuperan correctamente
5. ✅ Visualización en historial funciona
6. ✅ Validaciones rechazan casos inválidos

---

**Última actualización:** 28 de diciembre de 2025

