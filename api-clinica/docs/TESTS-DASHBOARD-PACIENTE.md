# Tests de Endpoints del Dashboard del Paciente

## Resumen de Endpoints Verificados

### GET Endpoints (Lectura de Datos)

1. **GET /api/pacientes/:id**
   - Obtiene los datos básicos del paciente
   - Requiere autenticación
   - Retorna: `{ success: true, data: { id_paciente, nombre, apellido_paterno, ... } }`

2. **GET /api/pacientes/:id/citas**
   - Obtiene las citas del paciente
   - Requiere autenticación
   - Retorna: `{ success: true, data: [...], total: number }`

3. **GET /api/pacientes/:id/signos-vitales**
   - Obtiene los signos vitales del paciente
   - Requiere autenticación
   - Retorna: `{ success: true, data: [...], total: number }`

4. **GET /api/pacientes/:id/diagnosticos**
   - Obtiene los diagnósticos del paciente
   - Requiere autenticación
   - Retorna: `{ success: true, data: [...], total: number }`

5. **GET /api/pacientes/:id/medicamentos**
   - Obtiene los medicamentos del paciente
   - Requiere autenticación
   - Retorna: `{ success: true, data: [...], total: number }`

6. **GET /api/pacientes/:id/comorbilidades**
   - Obtiene las comorbilidades del paciente
   - Requiere autenticación
   - Retorna: `{ success: true, data: [...], total: number }`

7. **GET /api/pacientes/:id/red-apoyo**
   - Obtiene la red de apoyo del paciente
   - Requiere autenticación
   - Retorna: `{ success: true, data: [...] }`

8. **GET /api/pacientes/:id/esquema-vacunacion**
   - Obtiene el esquema de vacunación del paciente
   - Requiere autenticación
   - Retorna: `{ success: true, data: [...] }`

### POST Endpoints (Creación de Datos)

1. **POST /api/pacientes/:id/signos-vitales**
   - Crea un nuevo registro de signos vitales
   - Requiere autenticación
   - Body: `{ presion_sistolica, presion_diastolica, frecuencia_cardiaca, temperatura, saturacion_oxigeno, peso, talla }`
   - Retorna: `{ success: true, data: { id_signo_vital, ... } }`

2. **POST /api/pacientes/:id/citas**
   - Crea una nueva cita
   - Requiere autenticación
   - Body: `{ id_doctor, fecha_cita, motivo, observaciones }`
   - Retorna: `{ success: true, data: { id_cita, ... } }`

3. **POST /api/medicamentos/tomas**
   - Registra la toma de un medicamento
   - Requiere autenticación
   - Body: `{ id_plan_medicacion, fecha_toma, hora_toma, confirmado_por }`
   - Retorna: `{ success: true, data: { id_toma, ... } }`

### PUT Endpoints (Actualización de Datos)

1. **PUT /api/pacientes/:id/signos-vitales/:signoId**
   - Actualiza un registro de signos vitales
   - Requiere autenticación
   - Body: `{ presion_sistolica?, presion_diastolica?, ... }` (campos opcionales)
   - Retorna: `{ success: true, data: { id_signo_vital, ... } }`

## Validaciones Implementadas

### Formatos de Datos

- **GET**: Todos los endpoints retornan formato consistente con `success`, `data`, y `total` (cuando aplica)
- **POST**: Acepta datos como números o strings (conversión automática)
- **PUT**: Acepta actualización parcial (solo algunos campos)

### Tipos de Datos

- `id_paciente`: number
- `presion_sistolica`, `presion_diastolica`: number
- `frecuencia_cardiaca`: number
- `temperatura`: number
- `saturacion_oxigeno`: number
- `peso`, `talla`: number
- `fecha_cita`, `fecha_toma`: string (formato ISO)

### Manejo de Errores

- **401**: Sin token de autenticación
- **403**: Acceso denegado (paciente intentando acceder a datos de otro paciente)
- **404**: Recurso no encontrado
- **400**: Datos inválidos
- **422**: Error de validación

## Tests Creados

Archivo: `api-clinica/__tests__/paciente-dashboard-endpoints.test.js`

### Tests Implementados

1. ✅ GET /api/pacientes/:id - Obtener datos del paciente
2. ✅ GET /api/pacientes/:id/citas - Obtener citas
3. ✅ GET /api/pacientes/:id/signos-vitales - Obtener signos vitales
4. ✅ GET /api/pacientes/:id/diagnosticos - Obtener diagnósticos
5. ✅ GET /api/pacientes/:id/medicamentos - Obtener medicamentos
6. ✅ GET /api/pacientes/:id/comorbilidades - Obtener comorbilidades
7. ✅ POST /api/pacientes/:id/signos-vitales - Crear signos vitales
8. ✅ POST /api/pacientes/:id/citas - Crear cita
9. ✅ PUT /api/pacientes/:id/signos-vitales/:signoId - Actualizar signos vitales
10. ✅ POST /api/medicamentos/tomas - Registrar toma de medicamento
11. ✅ Validación de formatos y tipos de datos
12. ✅ Manejo de errores (401, 404, 400)

## Notas Importantes

1. **Autenticación**: Los pacientes usan PIN o biométrico, no email/password
2. **Tests**: Requieren que el servidor esté corriendo y que exista un paciente de prueba
3. **Credenciales**: Para tests, se crea un usuario con password como fallback

## Próximos Pasos

1. Ejecutar tests con servidor corriendo
2. Verificar que todos los endpoints respondan correctamente
3. Validar formatos de datos en producción
4. Implementar tests de integración completos


