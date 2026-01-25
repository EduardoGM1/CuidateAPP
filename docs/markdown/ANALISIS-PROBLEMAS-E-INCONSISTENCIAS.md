# 🔍 ANÁLISIS DE PROBLEMAS E INCONSISTENCIAS

**Fecha:** 29 de Diciembre, 2025  
**Objetivo:** Detectar problemas, inconsistencias y detalles que requieren corrección en la implementación de campos faltantes del formato GAM.

---

## 📋 RESUMEN EJECUTIVO

Se realizó un análisis exhaustivo del código para detectar problemas e inconsistencias. Se encontraron varios problemas que requieren corrección antes de ejecutar las pruebas funcionales.

---

## ❌ PROBLEMAS CRÍTICOS DETECTADOS

### 1. **Validación de HbA1c Incompleta en Create**

**Ubicación:** `api-clinica/controllers/pacienteMedicalData.js` - Función `createPacienteSignosVitales`

**Problema:**
- El campo `hba1c_porcentaje` se acepta sin validación de rangos según la edad del paciente en CREATE
- En UPDATE sí existe validación (líneas 2035-2083), pero solo genera warnings, no bloquea
- Según el formato GAM, los rangos deben ser:
  - **20-59 años:** <7%
  - **60+ años:** <8%

**Código Actual (CREATE):**
```javascript
hba1c_porcentaje: hba1c_porcentaje !== undefined && hba1c_porcentaje !== null && hba1c_porcentaje !== '' 
  ? parseFloat(hba1c_porcentaje) 
  : null,
```

**Solución Requerida:**
- Implementar función `validarHbA1c(edad, valor)` similar a `validarColesterol`
- Aplicar validación en CREATE (similar a la que existe en UPDATE)
- Considerar si debe bloquear o solo advertir cuando está fuera de rango objetivo

---

### 2. **Validación de Edad en Medición Inconsistente**

**Ubicación:** `api-clinica/controllers/pacienteMedicalData.js`

**Problema:**
- El campo `edad_paciente_en_medicion` se acepta sin validación de rango razonable
- No se valida que la edad sea coherente con la fecha de nacimiento del paciente
- No se valida que la edad sea un número positivo y razonable (0-150 años)

**Código Actual:**
```javascript
edad_paciente_en_medicion: edad_paciente_en_medicion !== undefined && edad_paciente_en_medicion !== null && edad_paciente_en_medicion !== '' 
  ? parseInt(edad_paciente_en_medicion, 10) 
  : null,
```

**Solución Requerida:**
- Validar que la edad esté entre 0 y 150 años
- Opcionalmente, comparar con la edad calculada desde fecha_nacimiento del paciente
- Retornar error si está fuera de rango

---

### 3. **✅ RESUELTO - Validación de Colesterol LDL/HDL en Update**

**Ubicación:** `api-clinica/controllers/pacienteMedicalData.js` - Función `updatePacienteSignosVitales`

**Estado:**
- ✅ La validación de colesterol LDL/HDL SÍ existe en UPDATE (líneas 2026-2033)
- ✅ Se valida tanto en CREATE como en UPDATE
- ✅ Se verifica que el paciente tenga diagnóstico de Hipercolesterolemia antes de permitir LDL/HDL

---

### 4. **⚠️ Validación de HbA1c en Update - Solo Advertencias**

**Ubicación:** `api-clinica/controllers/pacienteMedicalData.js` - Función `updatePacienteSignosVitales`

**Estado:**
- ✅ Existe validación de rango general (3.0% - 15.0%) en UPDATE (líneas 2036-2045)
- ⚠️ La validación según edad solo genera WARNINGS, no bloquea (líneas 2064-2081)
- ⚠️ No valida rangos objetivo (<7% para 20-59 años, <8% para 60+ años) de forma estricta

**Solución Requerida:**
- Decidir si debe bloquear o solo advertir cuando está fuera de rango objetivo
- Implementar la misma lógica en CREATE

---

### 5. **Campos de Sesiones Educativas - Validación de Tipo de Sesión**

**Ubicación:** `api-clinica/controllers/sesionEducativa.js`

**Problema:**
- El frontend envía `tipo_sesion` pero no se valida explícitamente contra el ENUM del modelo
- Si se envía un valor inválido, Sequelize lanzará error genérico

**Código Actual:**
```javascript
tipo_sesion: {
  type: DataTypes.ENUM(
    'nutricional',
    'actividad_fisica',
    'medico_preventiva',
    'trabajo_social',
    'psicologica',
    'odontologica'
  ),
  allowNull: false,
}
```

**Solución Requerida:**
- Validar explícitamente en el controlador antes de crear/actualizar
- Retornar error descriptivo si el valor no está en el ENUM
- Mejorar experiencia de usuario con mensaje claro

---

### 6. **Campos de Comorbilidades - Validación de Año de Diagnóstico**

**Ubicación:** `api-clinica/controllers/pacienteMedicalData.js` - Funciones de comorbilidades

**Problema:**
- El campo `año_diagnostico` se acepta sin validación de rango razonable
- No se valida que el año sea coherente (ej: no puede ser futuro, no puede ser antes de 1900)

**Solución Requerida:**
- Validar que el año esté entre 1900 y el año actual
- Retornar error si está fuera de rango

---

### 7. **✅ RESUELTO - Conversión de Nombres de Campos Frontend-Backend**

**Ubicación:** `ClinicaMovil/src/components/forms/PacienteForm.js` y `ClinicaMovil/src/hooks/usePacienteForm.js`

**Estado:**
- ✅ `usePacienteForm.js` convierte correctamente camelCase a snake_case (líneas 400-402)
- ✅ Los campos `fechaBaja`, `motivoBaja`, `numeroGam` se convierten a `fecha_baja`, `motivo_baja`, `numero_gam`
- ✅ La conversión se realiza en `updatePaciente` antes de enviar al backend
- ✅ El backend espera y maneja correctamente los campos en snake_case

---

### 8. **Falta Validación de Número GAM**

**Ubicación:** `api-clinica/controllers/paciente.js` y `api-clinica/models/Paciente.js`

**Problema:**
- El campo `numero_gam` no tiene validación de formato
- No se valida que sea único (si es requerido por el formato GAM)

**Solución Requerida:**
- Validar formato del número GAM (si hay un formato específico)
- Considerar agregar índice único si debe ser único

---

## ⚠️ PROBLEMAS MENORES

### 9. **Mensajes de Error Genéricos**

**Ubicación:** Múltiples controladores

**Problema:**
- Algunos errores retornan mensajes genéricos como "Error interno del servidor"
- No se proporciona información suficiente para debugging

**Solución Requerida:**
- Mejorar mensajes de error para incluir contexto
- En desarrollo, incluir detalles del error
- En producción, mantener mensajes seguros pero informativos

---

### 10. **Falta Logging en Validaciones**

**Ubicación:** `api-clinica/controllers/pacienteMedicalData.js`

**Problema:**
- Las validaciones de colesterol y HbA1c no registran logs cuando fallan
- Dificulta el debugging y monitoreo

**Solución Requerida:**
- Agregar logging cuando las validaciones fallan
- Incluir información del paciente y valores recibidos

---

### 11. **Campos Opcionales sin Validación de Formato**

**Ubicación:** Múltiples controladores

**Problema:**
- Campos como `observaciones` y `referencia_observaciones` no tienen límite de longitud
- Podrían causar problemas de rendimiento si se envían textos muy largos

**Solución Requerida:**
- Agregar validación de longitud máxima (ej: 5000 caracteres)
- Retornar error si excede el límite

---

## 🔄 INCONSISTENCIAS DE DATOS

### 12. **Sincronización de Tratamiento Farmacológico**

**Ubicación:** `api-clinica/controllers/pacienteMedicalData.js` - Comorbilidades

**Problema:**
- El campo `recibe_tratamiento_farmacologico` debería sincronizarse automáticamente con `PlanMedicacion`
- Actualmente se actualiza manualmente, lo que puede causar inconsistencias

**Solución Requerida:**
- Implementar servicio de sincronización automática
- Actualizar `recibe_tratamiento_farmacologico` cuando se crea/elimina un plan de medicación

---

### 13. **Validación de Microalbuminuria**

**Ubicación:** `api-clinica/controllers/deteccionComplicacionController.js`

**Problema:**
- El campo `microalbuminuria_resultado` se acepta sin validación de formato
- No se valida que sea un número o texto válido según el formato esperado

**Solución Requerida:**
- Validar formato del resultado (número, texto, o formato específico)
- Retornar error si el formato es inválido

---

## 📝 RECOMENDACIONES ADICIONALES

### 14. **Documentación de Validaciones**

**Recomendación:**
- Documentar todas las validaciones en un archivo centralizado
- Incluir rangos permitidos, formatos esperados, y reglas de negocio

---

### 15. **Tests Unitarios de Validaciones**

**Recomendación:**
- Crear tests unitarios para cada función de validación
- Asegurar cobertura completa de casos edge

---

### 16. **Mejora de Mensajes de Error al Usuario**

**Recomendación:**
- Traducir mensajes de error a lenguaje más amigable
- Proporcionar sugerencias cuando sea posible

---

## ✅ VERIFICACIONES REALIZADAS (SIN PROBLEMAS)

1. ✅ **Rutas de Sesiones Educativas:** Correctamente registradas en `pacienteMedicalData.js`
2. ✅ **Modelos de Salud Bucal y Detección Tuberculosis:** Existen y están correctamente definidos
3. ✅ **Asociaciones de Sequelize:** Correctamente configuradas en `associations.js`
4. ✅ **Frontend - Servicios API:** Métodos correctamente implementados en `gestionService.js`
5. ✅ **Frontend - Hooks:** `usePacienteSesionesEducativas` correctamente implementado
6. ✅ **Frontend - Formularios:** Campos correctamente agregados en `DetallePaciente.js`
7. ✅ **Modelo SignoVital:** Campos `colesterol_ldl`, `colesterol_hdl`, `hba1c_porcentaje`, `edad_paciente_en_medicion` correctamente definidos

---

## 🎯 PRIORIZACIÓN DE CORRECCIONES

### **ALTA PRIORIDAD (Antes de pruebas funcionales):**
1. Validación de HbA1c según edad en CREATE (similar a UPDATE)
2. Validación de edad en medición (Create y Update)
3. Validación de tipo de sesión educativa
4. Decidir si HbA1c debe bloquear o solo advertir cuando está fuera de rango objetivo

### **MEDIA PRIORIDAD (Mejoras importantes):**
5. Validación de año de diagnóstico
6. Validación de número GAM
7. Sincronización automática de tratamiento farmacológico
8. Validación de microalbuminuria

### **BAJA PRIORIDAD (Mejoras de calidad):**
9. Mejora de mensajes de error
10. Logging en validaciones
11. Validación de longitud de campos de texto
12. Documentación de validaciones
13. Tests unitarios

---

## 📊 ESTADÍSTICAS

- **Problemas Críticos:** 5 (2 resueltos, 3 pendientes)
- **Problemas Menores:** 4
- **Inconsistencias:** 2
- **Recomendaciones:** 3
- **Verificaciones Exitosas:** 9

**Total de Problemas a Corregir:** 11 (2 ya resueltos)

---

## 🔧 PRÓXIMOS PASOS

1. Corregir problemas de ALTA PRIORIDAD
2. Ejecutar pruebas funcionales
3. Corregir problemas de MEDIA PRIORIDAD
4. Implementar mejoras de BAJA PRIORIDAD
5. Documentar todas las validaciones

---

**Última Actualización:** 29 de Diciembre, 2025

