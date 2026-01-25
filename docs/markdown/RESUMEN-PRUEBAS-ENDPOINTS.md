# 🧪 RESUMEN: PRUEBAS DE ENDPOINTS - FORMATO FRONTEND

**Fecha:** 29 de diciembre de 2025  
**Script:** `api-clinica/scripts/test-all-endpoints-frontend-format.js`

---

## 📋 DESCRIPCIÓN

Script de pruebas completo que simula **exactamente** cómo el frontend envía datos a los endpoints del backend, incluyendo:

- ✅ Headers idénticos al frontend
- ✅ Formato de datos JSON igual
- ✅ Estructura de peticiones igual
- ✅ Validaciones de negocio (colesterol LDL/HDL)

---

## 🔧 CONFIGURACIÓN

### **Headers que usa el frontend:**
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {token}',
  'X-Device-ID': '{deviceId}',
  'X-Platform': 'android',
  'X-App-Version': '1.0.0',
  'X-Client-Type': 'mobile'
}
```

### **Formato de datos:**
- Todos los datos se envían como JSON
- Números se parsean antes de enviar (parseFloat, parseInt)
- Strings se envían directamente

---

## 🧪 PRUEBAS IMPLEMENTADAS

### **1. Autenticación** ✅
- Prueba `/auth/login` y `/mobile/login`
- Múltiples combinaciones de credenciales
- Manejo de errores de conexión

### **2. Signos Vitales (con Colesterol LDL/HDL)** ✅
- ✅ Crear signos vitales básicos (sin LDL/HDL)
- ✅ Intentar crear con LDL/HDL SIN diagnóstico (debe fallar)
- ✅ Agregar comorbilidad de Hipercolesterolemia
- ✅ Crear signos vitales CON LDL/HDL (con diagnóstico)
- ✅ Actualizar signos vitales con LDL/HDL
- ✅ Validar rangos (LDL fuera de rango debe fallar)

### **3. Pacientes** ✅
- Obtener lista de pacientes
- Obtener detalle de paciente
- Crear paciente de prueba si no existe

### **4. Citas** ✅
- Obtener doctores disponibles
- Crear cita
- Obtener citas del paciente

### **5. Diagnósticos** ✅
- Crear diagnóstico
- Obtener diagnósticos del paciente

### **6. Comorbilidades** ✅
- Obtener comorbilidades del paciente
- Agregar comorbilidad (para prueba de LDL/HDL)

### **7. Planes de Medicación** ✅
- Obtener medicamentos disponibles
- Crear plan de medicación
- Obtener planes del paciente

### **8. Resumen Médico** ✅
- Obtener resumen médico completo del paciente

---

## 🚀 CÓMO EJECUTAR

### **1. Asegúrate de que el servidor esté corriendo:**
```bash
cd api-clinica
npm start
# O
node index.js
```

### **2. Configura las credenciales (opcional):**
```bash
# En .env o como variables de entorno
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=admin123
```

### **3. Ejecuta las pruebas:**
```bash
cd api-clinica
node scripts/test-all-endpoints-frontend-format.js
```

---

## 📊 FORMATO DE DATOS - SIGNOS VITALES

### **Frontend envía:**
```javascript
{
  peso_kg: 75.5,              // parseFloat
  talla_m: 1.75,              // parseFloat
  medida_cintura_cm: 90,      // parseFloat
  presion_sistolica: 120,     // parseInt
  presion_diastolica: 80,     // parseInt
  glucosa_mg_dl: 95,          // parseFloat
  colesterol_mg_dl: 180,     // parseFloat
  colesterol_ldl: 150,       // parseFloat (solo si tiene diagnóstico)
  colesterol_hdl: 45,         // parseFloat (solo si tiene diagnóstico)
  trigliceridos_mg_dl: 120,  // parseFloat
  observaciones: 'Texto...',  // string.trim().substring(0, 500)
  id_cita: 123                // parseInt (opcional)
}
```

### **Validaciones del frontend:**
- `peso_kg`: 0 < peso <= 500
- `talla_m`: 0 < talla <= 3
- `medida_cintura_cm`: 0 < cintura <= 200
- `presion_sistolica`: 50 <= sist <= 250, sist > dias
- `presion_diastolica`: 30 <= dias <= 150
- `glucosa_mg_dl`: 30 <= glucosa <= 600
- `colesterol_mg_dl`: 0 <= col <= 500
- `colesterol_ldl`: 0 <= ldl <= 500 (solo si tiene diagnóstico)
- `colesterol_hdl`: 0 <= hdl <= 200 (solo si tiene diagnóstico)
- `trigliceridos_mg_dl`: 0 <= trigs <= 1000

---

## ✅ VALIDACIONES PROBADAS

### **Backend - Colesterol LDL/HDL:**
1. ✅ Rechaza LDL/HDL si paciente NO tiene diagnóstico de Hipercolesterolemia/Dislipidemia
2. ✅ Acepta LDL/HDL si paciente SÍ tiene diagnóstico
3. ✅ Valida rangos: LDL (0-500), HDL (0-200)
4. ✅ Sanitiza valores numéricos
5. ✅ Guarda correctamente en BD

### **Frontend - Colesterol LDL/HDL:**
1. ✅ Campos solo visibles si paciente tiene diagnóstico
2. ✅ Envía datos correctamente al backend
3. ✅ Muestra valores en historial

---

## 📝 NOTAS IMPORTANTES

1. **El script requiere que el servidor esté corriendo**
2. **Las credenciales deben existir en la BD o configurarse en TEST_CONFIG**
3. **El script crea datos de prueba si no existen**
4. **Todos los datos se envían exactamente como el frontend**

---

## 🔍 TROUBLESHOOTING

### **Error: "No se puede conectar al servidor"**
- Verifica que el servidor esté corriendo: `npm start`
- Verifica que el puerto 3000 esté disponible
- Verifica la variable `API_URL` en `.env`

### **Error: "No se pudo autenticar"**
- Verifica que exista un usuario admin en la BD
- Crea uno con: `POST /api/auth/register`
- O ajusta `TEST_CONFIG.adminCredentials`

### **Error: "Paciente sin diagnóstico"**
- El script automáticamente agrega la comorbilidad necesaria
- Si falla, verifica que existan comorbilidades en la BD

---

**Script creado el:** 29 de diciembre de 2025

