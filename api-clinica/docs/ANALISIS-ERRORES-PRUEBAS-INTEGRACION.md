# 🔍 Análisis de Errores en Pruebas de Integración Frontend->Backend

**Fecha**: 2025-11-06  
**Script de Pruebas**: `ClinicaMovil/scripts/test-frontend-backend-integration.js`

---

## 📊 Resumen de Resultados

- **Tasa de Éxito**: 50% (5 pasadas / 10 totales)
- **Pruebas Pasadas**: 5
- **Pruebas Fallidas**: 5
- **Advertencias**: 0

---

## ❌ Problemas Identificados

### 1. **Autenticación Fallida**

**Síntoma**: No se pudo autenticar como doctor ni admin  
**Causa Probable**: 
- Credenciales incorrectas en el script de pruebas
- El endpoint `/api/auth-unified/login-doctor-admin` requiere credenciales válidas

**Solución**:
- Verificar credenciales en la base de datos
- Ajustar `TEST_CREDENTIALS` en el script según el entorno

**Impacto**: ⚠️ **MEDIO** - Las pruebas continúan sin token, pero fallan por falta de autorización

---

### 2. **Error 500: Signos Vitales**

**Síntoma**: `Error interno del servidor` al intentar crear signos vitales  
**Endpoint**: `POST /api/pacientes/:id/signos-vitales`

**Causas Posibles**:
1. **Middleware de encriptación**: `autoEncryptRequest('signos_vitales')` podría estar fallando
2. **Validación de base de datos**: Campos requeridos no presentes
3. **Error en el cálculo de IMC**: División por cero o valores inválidos
4. **Problema con `alertService.verificarSignosVitales`**: Podría estar causando un error no capturado

**Ubicación del Error**:
```javascript
// api-clinica/controllers/pacienteMedicalData.js:914-921
catch (error) {
  logger.error('Error creando signos vitales:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: error.message
  });
}
```

**Recomendaciones**:
1. Revisar logs del backend para ver el error específico
2. Verificar que el middleware de encriptación no esté causando problemas
3. Validar que los datos enviados cumplen con las restricciones de la BD

---

### 3. **Error 500: Citas Médicas**

**Síntoma**: `Error interno del servidor` al intentar crear cita  
**Endpoint**: `POST /api/citas`

**Causas Posibles**:
1. **Controlador demasiado simple**: `createCita` solo hace `Cita.create(req.body)` sin validaciones
2. **Campos requeridos faltantes**: La BD podría requerir campos que no se están enviando
3. **Problemas con relaciones**: `id_paciente` o `id_doctor` podrían no existir

**Ubicación del Error**:
```javascript
// api-clinica/controllers/cita.js:185-192
export const createCita = async (req, res) => {
  try {
    const cita = await Cita.create(req.body);
    res.json(cita);
  } catch (error) {
    res.status(400).json({ error: error.message }); // ⚠️ Debería ser 500 para errores de BD
  }
};
```

**Problema**: El controlador devuelve 400 para cualquier error, incluyendo errores de BD que deberían ser 500.

**Recomendaciones**:
1. Agregar validaciones antes de crear la cita
2. Manejar errores de BD (500) vs errores de validación (400)
3. Verificar que `id_paciente` y `id_doctor` existan

---

### 4. **Error 500: Plan de Medicación**

**Síntoma**: `Error interno del servidor` al intentar crear plan de medicación  
**Endpoint**: `POST /api/pacientes/:id/planes-medicacion`

**Causas Posibles**:
1. **Estructura del array `medicamentos`**: El backend espera una estructura específica
2. **ID de medicamento inválido**: El medicamento con `id_medicamento: 1` podría no existir
3. **Problemas con transacciones**: La creación podría estar fallando en algún punto

**Recomendaciones**:
1. Verificar que el medicamento exista en la BD antes de usarlo en las pruebas
2. Revisar la estructura esperada del array `medicamentos`
3. Agregar validaciones más robustas

---

### 5. **Error 500: Esquema de Vacunación**

**Síntoma**: `Error interno del servidor` al intentar crear esquema de vacunación  
**Endpoint**: `POST /api/pacientes/:id/esquema-vacunacion`

**Causas Posibles**:
1. **ID de vacuna inválido**: La vacuna con `id_vacuna: 1` podría no existir
2. **Validaciones de fecha**: La fecha podría no cumplir con alguna validación

**Recomendaciones**:
1. Verificar que la vacuna exista en la BD
2. Revisar validaciones de fecha

---

### 6. **Bug: Diagnóstico requiere ID de Cita**

**Síntoma**: Error `"ID de cita es requerido"` al crear diagnóstico sin `id_cita`  
**Endpoint**: `POST /api/pacientes/:id/diagnosticos`

**Problema**: Según la documentación, `id_cita` debería ser **opcional**, pero el backend lo está requiriendo.

**Ubicación**: `api-clinica/controllers/pacienteMedicalData.js` - función `createPacienteDiagnostico`

**Recomendación**: 
- Revisar la validación en el controlador
- Hacer `id_cita` verdaderamente opcional

---

### 7. **Error en ReminderService (No relacionado con pruebas directas)**

**Síntoma**: `Unknown column 'PlanDetalles->Medicamento.nombre' in 'field list'`  
**Ubicación**: `api-clinica/services/reminderService.js:180`

**Problema**: El servicio está intentando acceder a `Medicamento.nombre`, pero el modelo tiene `nombre_medicamento`.

**Impacto**: ⚠️ **BAJO** - Este error ocurre en un cron job, no afecta directamente las pruebas, pero indica un problema en el código.

---

## 🔧 Soluciones Recomendadas

### 1. **Mejorar Manejo de Errores en Controladores**

Agregar más detalles en los errores 500 para facilitar el debugging:

```javascript
catch (error) {
  logger.error('Error creando signos vitales:', {
    error: error.message,
    stack: error.stack,
    pacienteId: req.params.id,
    datos: req.body
  });
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    requestId: req.id // Si se está usando request ID
  });
}
```

### 2. **Validar Datos Antes de Enviar**

El script de pruebas debería:
- Verificar que los IDs de paciente, doctor, medicamento, vacuna existan
- Validar formatos de datos antes de enviar
- Usar datos reales de la BD en lugar de valores hardcodeados

### 3. **Agregar Validaciones en Backend**

Los controladores deberían validar:
- Existencia de entidades relacionadas (paciente, doctor, medicamento, vacuna)
- Tipos de datos correctos
- Campos requeridos vs opcionales

### 4. **Corregir Bug en Diagnóstico**

Hacer `id_cita` verdaderamente opcional en `createPacienteDiagnostico`.

### 5. **Corregir Error en ReminderService**

Cambiar `Medicamento.nombre` por `Medicamento.nombre_medicamento` en `reminderService.js`.

---

## 📝 Próximos Pasos

1. ✅ **Revisar logs del servidor** cuando se ejecuten las pruebas nuevamente
2. ✅ **Corregir el bug en diagnóstico** (hacer `id_cita` opcional)
3. ✅ **Mejorar manejo de errores** para obtener más detalles
4. ✅ **Validar IDs en script de pruebas** antes de enviar datos
5. ✅ **Corregir error en ReminderService** (nombre vs nombre_medicamento)

---

## 🧪 Cómo Ejecutar las Pruebas Nuevamente

```bash
cd ClinicaMovil
# Ajustar credenciales y IDs en el script primero
npm run test:integration
```

**Requisitos**:
- Backend corriendo
- Credenciales válidas en `TEST_CREDENTIALS`
- IDs válidos en `TEST_PACIENTE_ID`, `TEST_DOCTOR_ID`, etc.

---

**Última actualización**: 2025-11-06


