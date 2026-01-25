# 🧪 INSTRUCCIONES PARA EJECUTAR PRUEBAS

**Fecha:** 29 de Diciembre, 2025

---

## ⚠️ REQUISITO PREVIO

**El servidor backend debe estar ejecutándose antes de ejecutar las pruebas.**

---

## 📋 PASOS PARA EJECUTAR LAS PRUEBAS

### 1. **Iniciar el Servidor Backend**

Abre una terminal en la carpeta `api-clinica` y ejecuta:

```bash
cd api-clinica
npm start
```

O si usas Node.js directamente:

```bash
cd api-clinica
node server.js
```

El servidor debería iniciarse en `http://localhost:3000` (o el puerto configurado en `.env`).

---

### 2. **Verificar que el Servidor Esté Funcionando**

En otra terminal, verifica que el servidor responda:

```bash
# Opción 1: Verificar con curl (si está disponible)
curl http://localhost:3000/api/pacientes

# Opción 2: Abrir en navegador
# http://localhost:3000/api/pacientes
# Debería retornar un error de autenticación (lo cual es normal, significa que el servidor está funcionando)
```

---

### 3. **Ejecutar las Pruebas**

En una nueva terminal, ejecuta:

```bash
cd api-clinica
node scripts/test-frontend-campos-faltantes.js
```

---

## 🧪 QUÉ PRUEBA EL SCRIPT

El script `test-frontend-campos-faltantes.js` prueba:

1. ✅ **Signos Vitales - HbA1c y Edad en Medición**
   - Crear signos vitales con HbA1c válido
   - Validar que se rechacen valores fuera de rango
   - Validar que se rechacen edades inválidas

2. ✅ **Signos Vitales - Colesterol LDL/HDL**
   - Crear signos vitales con LDL/HDL (requiere comorbilidad)
   - Validar que se rechacen sin diagnóstico de Hipercolesterolemia

3. ✅ **Comorbilidades - Nuevos Campos**
   - Crear comorbilidad con campos nuevos:
     - `es_diagnostico_basal`
     - `año_diagnostico`
     - `es_agregado_posterior`
     - `recibe_tratamiento_no_farmacologico`
     - `recibe_tratamiento_farmacologico`

4. ✅ **Detecciones de Complicaciones - Nuevos Campos**
   - Crear detección con campos nuevos:
     - `microalbuminuria_realizada`
     - `microalbuminuria_resultado`
     - `fue_referido`
     - `referencia_observaciones`

5. ✅ **Sesiones Educativas**
   - Crear sesión educativa
   - Validar tipo de sesión contra ENUM
   - Actualizar sesión educativa
   - Eliminar sesión educativa

6. ✅ **Campos de Baja del Paciente**
   - Actualizar paciente con:
     - `numero_gam`
     - `fecha_baja`
     - `motivo_baja`

---

## 📊 RESULTADOS ESPERADOS

Al ejecutar las pruebas, deberías ver:

```
🚀 ========================================
🚀 PRUEBAS DE FUNCIONALIDAD FRONTEND
🚀 Campos Faltantes - Formato GAM
🚀 ========================================

✅ Servidor conectado
✅ Autenticación exitosa
✅ Paciente de prueba creado
✅ Comorbilidad de prueba creada

🧪 Ejecutando pruebas...

✅ signosVitalesHbA1c: PASÓ
✅ signosVitalesLDLHDL: PASÓ
✅ comorbilidades: PASÓ
✅ detecciones: PASÓ
✅ sesionesEducativas: PASÓ
✅ camposBaja: PASÓ

📊 ========================================
📊 RESUMEN DE PRUEBAS
📊 ========================================

✅ Pruebas pasadas: 6/6

🎉 ¡Todas las pruebas pasaron exitosamente!
```

---

## 🔧 CONFIGURACIÓN

El script usa las siguientes variables de entorno (desde `.env`):

- `API_URL` o `http://localhost:3000/api` (por defecto)
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (para conexión a base de datos)

---

## ❌ PROBLEMAS COMUNES

### **Error: "No se pudo conectar al servidor"**

**Solución:**
1. Verifica que el servidor esté ejecutándose
2. Verifica que el puerto sea el correcto (por defecto 3000)
3. Verifica que no haya firewall bloqueando la conexión

### **Error: "No se pudo autenticar"**

**Solución:**
1. El script intentará crear un usuario de prueba automáticamente
2. Si falla, verifica que la base de datos esté accesible
3. Verifica que las tablas de usuarios existan

### **Error: "No se pudo crear paciente de prueba"**

**Solución:**
1. Verifica que la base de datos esté accesible
2. Verifica que las tablas de pacientes existan
3. Verifica que el usuario tenga permisos para crear registros

---

## 📝 NOTAS

- El script crea datos de prueba que se pueden eliminar después
- Las pruebas no modifican datos existentes (solo crean nuevos)
- El script incluye manejo de errores y logging detallado
- Todas las pruebas validan tanto éxito como casos de error

---

**Última Actualización:** 29 de Diciembre, 2025

