# 🧪 GUÍA COMPLETA DE PRUEBAS - IMPLEMENTACIONES NUEVAS

**Fecha:** 29 de Diciembre, 2025  
**Objetivo:** Probar todas las implementaciones nuevas del formato GAM

---

## 📋 ÍNDICE

1. [Preparación del Entorno](#preparación-del-entorno)
2. [Pruebas de Signos Vitales](#pruebas-de-signos-vitales)
3. [Pruebas de Comorbilidades](#pruebas-de-comorbilidades)
4. [Pruebas de Detecciones de Complicaciones](#pruebas-de-detecciones-de-complicaciones)
5. [Pruebas de Sesiones Educativas](#pruebas-de-sesiones-educativas)
6. [Pruebas de Campos de Baja del Paciente](#pruebas-de-campos-de-baja-del-paciente)
7. [Pruebas Automatizadas](#pruebas-automatizadas)

---

## 🔧 PREPARACIÓN DEL ENTORNO

### **Paso 1: Iniciar el Servidor Backend**

```bash
cd api-clinica
npm start
```

**Verificar que el servidor esté funcionando:**
- Debería mostrar: "Servidor escuchando en puerto 3000" (o el puerto configurado)
- No debería haber errores de conexión a la base de datos

---

### **Paso 2: Preparar Datos de Prueba**

Necesitarás:
- ✅ Un usuario administrador o doctor autenticado
- ✅ Al menos un paciente creado
- ✅ Una comorbilidad de tipo "Hipercolesterolemia" o "Dislipidemia" (para pruebas de colesterol LDL/HDL)

---

## 🩺 PRUEBAS DE SIGNOS VITALES

### **1. Prueba: HbA1c con Validación de Edad**

#### **Caso 1: HbA1c Válido para Paciente 20-59 años**

**Pasos:**
1. Ir a la pantalla de **Detalle del Paciente**
2. Buscar un paciente de entre 20-59 años
3. Abrir el modal "Registrar Signos Vitales"
4. Llenar los campos:
   - **HbA1c (%):** `6.5`
   - **Edad del Paciente en Medición:** `45` (o dejar vacío para calcular automáticamente)
5. Guardar

**Resultado Esperado:**
- ✅ Se guarda correctamente
- ✅ No hay errores
- ✅ El valor aparece en el historial de signos vitales

---

#### **Caso 2: HbA1c Fuera de Rango Objetivo (Warning)**

**Pasos:**
1. Mismo paciente (20-59 años)
2. Abrir modal "Registrar Signos Vitales"
3. Llenar:
   - **HbA1c (%):** `8.5` (por encima del objetivo <7%)
   - **Edad:** `45`
4. Guardar

**Resultado Esperado:**
- ✅ Se guarda (no bloquea, solo genera warning)
- ⚠️ Verificar en logs del servidor que aparece un warning:
  ```
  HbA1c por encima del objetivo para 20-59 años
  ```

---

#### **Caso 3: HbA1c Fuera de Rango General (Error)**

**Pasos:**
1. Abrir modal "Registrar Signos Vitales"
2. Llenar:
   - **HbA1c (%):** `20.0` (fuera del rango 3.0% - 15.0%)
3. Intentar guardar

**Resultado Esperado:**
- ❌ Error: "HbA1c debe estar entre 3.0% y 15.0%"
- ❌ No se guarda el registro

---

#### **Caso 4: Edad Inválida**

**Pasos:**
1. Abrir modal "Registrar Signos Vitales"
2. Llenar:
   - **Edad del Paciente en Medición:** `200` (fuera del rango 0-150)
3. Intentar guardar

**Resultado Esperado:**
- ❌ Error: "La edad debe estar entre 0 y 150 años"
- ❌ No se guarda el registro

---

### **2. Prueba: Colesterol LDL/HDL**

#### **Caso 1: LDL/HDL con Diagnóstico de Hipercolesterolemia**

**Preparación:**
1. Asegúrate de que el paciente tenga una comorbilidad de tipo "Hipercolesterolemia" o "Dislipidemia"

**Pasos:**
1. Ir a **Detalle del Paciente**
2. Abrir modal "Registrar Signos Vitales"
3. Llenar:
   - **Colesterol LDL:** `120`
   - **Colesterol HDL:** `50`
4. Guardar

**Resultado Esperado:**
- ✅ Se guarda correctamente
- ✅ Los valores aparecen en el historial

---

#### **Caso 2: LDL/HDL SIN Diagnóstico (Error)**

**Pasos:**
1. Usar un paciente **SIN** diagnóstico de Hipercolesterolemia/Dislipidemia
2. Abrir modal "Registrar Signos Vitales"
3. Intentar llenar:
   - **Colesterol LDL:** `120`
   - **Colesterol HDL:** `50`
4. Guardar

**Resultado Esperado:**
- ❌ Error: "No se puede registrar Colesterol LDL/HDL sin diagnóstico de Hipercolesterolemia o Dislipidemia."
- ❌ No se guarda

---

#### **Caso 3: LDL/HDL con Valores Fuera de Rango**

**Pasos:**
1. Paciente con diagnóstico de Hipercolesterolemia
2. Abrir modal "Registrar Signos Vitales"
3. Llenar:
   - **Colesterol LDL:** `600` (fuera del rango 0-500)
   - **Colesterol HDL:** `250` (fuera del rango 0-200)
4. Guardar

**Resultado Esperado:**
- ❌ Error: "Colesterol LDL debe estar entre 0 y 500 mg/dL" o "Colesterol HDL debe estar entre 0 y 200 mg/dL"
- ❌ No se guarda

---

### **3. Prueba: Desde Pantalla de Paciente (RegistrarSignosVitales.js)**

**Pasos:**
1. Iniciar sesión como **Paciente**
2. Ir a la pantalla "Registrar Signos Vitales"
3. Verificar que aparezcan los campos:
   - ✅ HbA1c (%)
   - ✅ Edad en Medición
   - ✅ Colesterol LDL (si tiene diagnóstico)
   - ✅ Colesterol HDL (si tiene diagnóstico)
4. Llenar y guardar

**Resultado Esperado:**
- ✅ Los campos se muestran correctamente
- ✅ Se guarda correctamente
- ✅ Aparece confirmación visual/auditiva

---

## 🏥 PRUEBAS DE COMORBILIDADES

### **1. Prueba: Crear Comorbilidad con Nuevos Campos**

**Pasos:**
1. Ir a **Detalle del Paciente**
2. Abrir modal "Agregar Comorbilidad"
3. Seleccionar una comorbilidad (ej: "Diabetes Tipo 2")
4. Llenar los nuevos campos:
   - ✅ **Es Diagnóstico Basal:** `ON` (Switch activado)
   - ✅ **Año del Diagnóstico:** `2020`
   - ✅ **Es Agregado Posterior:** `OFF` (Switch desactivado)
   - ✅ **Recibe Tratamiento No Farmacológico:** `ON`
   - ✅ **Recibe Tratamiento Farmacológico:** `ON`
5. Guardar

**Resultado Esperado:**
- ✅ Se guarda correctamente
- ✅ Todos los campos se guardan con los valores correctos
- ✅ La comorbilidad aparece en la lista con los nuevos datos

---

### **2. Prueba: Editar Comorbilidad Existente**

**Pasos:**
1. En la lista de comorbilidades, hacer clic en "Editar"
2. Modificar los campos:
   - Cambiar **Año del Diagnóstico** a `2021`
   - Cambiar **Recibe Tratamiento No Farmacológico** a `OFF`
3. Guardar

**Resultado Esperado:**
- ✅ Se actualiza correctamente
- ✅ Los cambios se reflejan en la lista

---

### **3. Prueba: Validación de Año de Diagnóstico**

**Pasos:**
1. Abrir modal "Agregar Comorbilidad"
2. Llenar:
   - **Año del Diagnóstico:** `2050` (año futuro)
3. Guardar

**Resultado Esperado:**
- ⚠️ Actualmente no valida año futuro (problema menor pendiente)
- ✅ Se guarda (pero debería validarse)

---

## 🔍 PRUEBAS DE DETECCIONES DE COMPLICACIONES

### **1. Prueba: Crear Detección con Microalbuminuria**

**Pasos:**
1. Ir a **Detalle del Paciente**
2. Abrir modal "Agregar Detección de Complicación"
3. Llenar campos básicos:
   - **Fecha de Detección:** `2025-12-29`
   - **Exploración de Pies:** `ON`
4. Llenar nuevos campos:
   - ✅ **Microalbuminuria Realizada:** `ON` (Switch activado)
   - ✅ **Resultado Microalbuminuria:** `30 mg/L` (aparece cuando el switch está ON)
   - ✅ **Fue Referido:** `ON`
   - ✅ **Observaciones de Referencia:** `Referido a nefrología` (aparece cuando fue referido)
5. Guardar

**Resultado Esperado:**
- ✅ Se guarda correctamente
- ✅ Los campos condicionales aparecen/desaparecen según los switches
- ✅ Los valores se guardan correctamente

---

### **2. Prueba: Campos Condicionales**

**Pasos:**
1. Abrir modal "Agregar Detección"
2. Activar **Microalbuminuria Realizada**
3. Verificar que aparece el campo **Resultado Microalbuminuria**
4. Desactivar **Microalbuminuria Realizada**
5. Verificar que el campo desaparece

**Resultado Esperado:**
- ✅ Los campos aparecen/desaparecen correctamente
- ✅ La UI es intuitiva

---

## 📚 PRUEBAS DE SESIONES EDUCATIVAS

### **1. Prueba: Crear Sesión Educativa**

**Pasos:**
1. Ir a **Detalle del Paciente**
2. Ir a la sección "Sesiones Educativas"
3. Hacer clic en "Opciones" → "Agregar"
4. Llenar el formulario:
   - ✅ **Tipo de Sesión:** Seleccionar de la lista (ej: "Nutricional")
   - ✅ **Fecha de Sesión:** `2025-12-29`
   - ✅ **Asistió:** `ON`
   - ✅ **Número de Intervenciones:** `2`
   - ✅ **Observaciones:** `Sesión sobre alimentación saludable`
5. Guardar

**Resultado Esperado:**
- ✅ Se guarda correctamente
- ✅ Aparece en la lista de sesiones educativas
- ✅ Muestra el tipo de sesión con emoji correspondiente

---

### **2. Prueba: Validación de Tipo de Sesión**

**Pasos:**
1. Abrir modal "Agregar Sesión Educativa"
2. Intentar enviar sin seleccionar tipo de sesión
3. Guardar

**Resultado Esperado:**
- ❌ Error: "Tipo de sesión es requerido"
- ❌ No se guarda

---

#### **Caso: Tipo de Sesión Inválido (Prueba con API directamente)**

**Usando Postman o curl:**
```bash
POST /api/pacientes/1/sesiones-educativas
{
  "tipo_sesion": "tipo_invalido",
  "fecha_sesion": "2025-12-29",
  "asistio": true
}
```

**Resultado Esperado:**
- ❌ Error 400: "Tipo de sesión inválido. Valores permitidos: nutricional, actividad_fisica, ..."
- ❌ No se guarda

---

### **3. Prueba: Editar Sesión Educativa**

**Pasos:**
1. En la lista de sesiones, hacer clic en una sesión
2. Hacer clic en "Editar"
3. Modificar:
   - **Tipo de Sesión:** Cambiar a otro tipo
   - **Asistió:** Cambiar a `OFF`
4. Guardar

**Resultado Esperado:**
- ✅ Se actualiza correctamente
- ✅ Los cambios se reflejan en la lista

---

### **4. Prueba: Eliminar Sesión Educativa**

**Pasos:**
1. En la lista de sesiones, hacer clic en una sesión
2. Hacer clic en "Eliminar"
3. Confirmar eliminación

**Resultado Esperado:**
- ✅ Se elimina correctamente
- ✅ Desaparece de la lista

---

### **5. Prueba: Ver Todas las Sesiones**

**Pasos:**
1. En la sección "Sesiones Educativas"
2. Hacer clic en "Opciones" → "Ver todas"

**Resultado Esperado:**
- ✅ Se muestra una lista completa de todas las sesiones
- ✅ Se puede filtrar por tipo, fecha, etc.

---

## 👤 PRUEBAS DE CAMPOS DE BAJA DEL PACIENTE

### **1. Prueba: Editar Paciente con Campos de Baja**

**Pasos:**
1. Ir a **Detalle del Paciente**
2. Hacer clic en "Editar Paciente"
3. Ir a la sección "Datos del Sistema"
4. Llenar los nuevos campos:
   - ✅ **Número GAM:** `12345`
   - ✅ **Fecha de Baja:** `2025-12-29`
   - ✅ **Motivo de Baja:** `Paciente se mudó a otra ciudad`
5. Guardar

**Resultado Esperado:**
- ✅ Se guarda correctamente
- ✅ Los campos aparecen al editar nuevamente
- ✅ Los campos solo aparecen en modo edición (no en creación)

---

### **2. Prueba: Validación de Número GAM**

**Pasos:**
1. Editar paciente
2. Llenar:
   - **Número GAM:** `abc` (no numérico)
3. Guardar

**Resultado Esperado:**
- ⚠️ Actualmente acepta cualquier valor (problema menor pendiente)
- ✅ Se guarda (pero debería validarse que sea numérico)

---

### **3. Prueba: Campos Solo en Modo Edición**

**Pasos:**
1. Ir a "Agregar Nuevo Paciente"
2. Verificar que NO aparecen los campos:
   - ❌ Número GAM
   - ❌ Fecha de Baja
   - ❌ Motivo de Baja

**Resultado Esperado:**
- ✅ Los campos NO aparecen en creación
- ✅ Solo aparecen en edición

---

## 🤖 PRUEBAS AUTOMATIZADAS

### **Ejecutar Script de Pruebas Automatizadas**

**Pasos:**
1. Asegúrate de que el servidor esté ejecutándose
2. En una terminal, ejecuta:

```bash
cd api-clinica
node scripts/test-frontend-campos-faltantes.js
```

**Resultado Esperado:**
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

## 📊 CHECKLIST DE PRUEBAS

### **Signos Vitales:**
- [ ] HbA1c válido se guarda correctamente
- [ ] HbA1c fuera de rango objetivo genera warning pero se guarda
- [ ] HbA1c fuera de rango general (3-15%) genera error
- [ ] Edad inválida (<0 o >150) genera error
- [ ] Colesterol LDL/HDL con diagnóstico se guarda
- [ ] Colesterol LDL/HDL sin diagnóstico genera error
- [ ] Colesterol LDL/HDL fuera de rango genera error
- [ ] Campos aparecen en pantalla de paciente

### **Comorbilidades:**
- [ ] Crear comorbilidad con todos los nuevos campos
- [ ] Editar comorbilidad y actualizar campos
- [ ] Campos se guardan correctamente
- [ ] Campos aparecen al editar

### **Detecciones:**
- [ ] Crear detección con microalbuminuria
- [ ] Crear detección con referencia
- [ ] Campos condicionales aparecen/desaparecen
- [ ] Campos se guardan correctamente

### **Sesiones Educativas:**
- [ ] Crear sesión educativa
- [ ] Validar tipo de sesión (requerido)
- [ ] Validar tipo de sesión inválido (error)
- [ ] Editar sesión educativa
- [ ] Eliminar sesión educativa
- [ ] Ver todas las sesiones

### **Campos de Baja:**
- [ ] Editar paciente con campos de baja
- [ ] Campos solo aparecen en edición
- [ ] Campos se guardan correctamente
- [ ] Campos aparecen al editar nuevamente

---

## 🔧 HERRAMIENTAS ÚTILES

### **Postman/Insomnia:**
- Para probar endpoints directamente
- Verificar respuestas JSON
- Probar casos edge

### **Logs del Servidor:**
- Verificar warnings de HbA1c
- Verificar errores de validación
- Debugging de problemas

### **Base de Datos:**
- Verificar que los datos se guardan correctamente
- Verificar tipos de datos
- Verificar constraints

---

## ❌ PROBLEMAS COMUNES Y SOLUCIONES

### **Error: "No se puede conectar al servidor"**
- ✅ Verificar que el servidor esté ejecutándose
- ✅ Verificar el puerto (por defecto 3000)
- ✅ Verificar firewall

### **Error: "No se puede registrar Colesterol LDL/HDL"**
- ✅ Verificar que el paciente tenga comorbilidad de Hipercolesterolemia/Dislipidemia
- ✅ Agregar la comorbilidad primero

### **Error: "Tipo de sesión inválido"**
- ✅ Usar solo valores del ENUM: nutricional, actividad_fisica, medico_preventiva, trabajo_social, psicologica, odontologica

### **Campos no aparecen:**
- ✅ Verificar que estás en modo edición (para campos de baja)
- ✅ Verificar que el paciente tiene diagnóstico (para colesterol LDL/HDL)
- ✅ Refrescar la pantalla

---

## 📝 NOTAS FINALES

- ✅ Todas las validaciones están implementadas
- ✅ Los mensajes de error son descriptivos
- ✅ Los campos condicionales funcionan correctamente
- ⚠️ Algunas validaciones menores están pendientes (año de diagnóstico, número GAM)

---

**Última Actualización:** 29 de Diciembre, 2025

