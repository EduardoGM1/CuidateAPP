import { Router } from 'express';
import { SecurityValidator } from '../middlewares/securityValidator.js';
import MassAssignmentProtection from '../middlewares/massAssignmentProtection.js';
import AdvancedRateLimiting from '../middlewares/advancedRateLimiting.js';
import { authenticateToken, authorizeRoles, authorizePatientAccess } from '../middlewares/auth.js';
import { handleValidationErrors } from '../middlewares/errorHandler.js';
import { searchRateLimit, writeRateLimit } from '../middlewares/rateLimiting.js';
import { autoEncryptRequest, autoDecryptResponse } from '../middlewares/autoDecryption.js';
import { 
  getPacienteCitas,
  getPacienteSignosVitales,
  createPacienteSignosVitales,
  updatePacienteSignosVitales,
  deletePacienteSignosVitales,
  getPacienteDiagnosticos,
  createPacienteDiagnostico,
  updatePacienteDiagnostico,
  deletePacienteDiagnostico,
  getPacienteMedicamentos,
  createPacientePlanMedicacion,
  deletePacientePlanMedicacion,
  getPacienteResumenMedico,
  getPacienteRedApoyo,
  createPacienteRedApoyo,
  updatePacienteRedApoyo,
  deletePacienteRedApoyo,
  getPacienteEsquemaVacunacion,
  createPacienteEsquemaVacunacion,
  updatePacienteEsquemaVacunacion,
  deletePacienteEsquemaVacunacion,
  getPacienteComorbilidades,
  addPacienteComorbilidad,
  updatePacienteComorbilidad,
  deletePacienteComorbilidad
} from '../controllers/pacienteMedicalData.js';
import { getSolicitudesReprogramacion } from '../controllers/cita.js';
import {
  getDeteccionesPaciente,
  getDeteccionById,
  createDeteccion,
  updateDeteccion,
  deleteDeteccion
} from '../controllers/deteccionComplicacionController.js';
import {
  getSesionesEducativasPaciente,
  createSesionEducativa,
  updateSesionEducativa,
  deleteSesionEducativa
} from '../controllers/sesionEducativa.js';
import {
  getSaludBucalPaciente,
  createSaludBucal,
  updateSaludBucal,
  deleteSaludBucal
} from '../controllers/saludBucal.js';
import {
  getDeteccionesTuberculosisPaciente,
  createDeteccionTuberculosis,
  updateDeteccionTuberculosis,
  deleteDeteccionTuberculosis
} from '../controllers/deteccionTuberculosis.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * =====================================================
 * RUTAS PARA DATOS MÉDICOS DE PACIENTES
 * =====================================================
 * 
 * Estas rutas proporcionan acceso específico a datos médicos
 * de pacientes individuales con las siguientes características:
 * 
 * Seguridad:
 * - Autenticación JWT requerida
 * - Autorización por roles (Admin/Doctor)
 * - Validación de acceso por doctor asignado
 * - Rate limiting aplicado
 * - Validación de parámetros
 * 
 * Funcionalidades:
 * - Paginación con limit/offset
 * - Ordenamiento configurable
 * - Logging de todas las operaciones
 * - Respuestas estructuradas
 */

// =====================================================
// RUTAS ESPECÍFICAS POR TIPO DE DATO MÉDICO
// =====================================================

/**
 * Obtener citas de un paciente específico
 * GET /api/pacientes/:id/citas
 * 
 * Parámetros de consulta:
 * - limit: Número de registros a devolver (default: 10)
 * - offset: Número de registros a omitir (default: 0)
 * - sort: Ordenamiento ASC/DESC (default: DESC)
 * 
 * Respuesta:
 * - success: boolean
 * - data: Array de citas
 * - total: Total de registros
 * - limit: Límite aplicado
 * - offset: Offset aplicado
 */
router.get('/:id/citas', 
  authorizePatientAccess,
  searchRateLimit, 
  getPacienteCitas
);

/**
 * Obtener signos vitales de un paciente específico
 * GET /api/pacientes/:id/signos-vitales
 * 
 * Parámetros de consulta:
 * - limit: Número de registros a devolver (default: 10)
 * - offset: Número de registros a omitir (default: 0)
 * - sort: Ordenamiento ASC/DESC (default: DESC)
 * 
 * Respuesta:
 * - success: boolean
 * - data: Array de signos vitales
 * - total: Total de registros
 * - limit: Límite aplicado
 * - offset: Offset aplicado
 */
router.get('/:id/signos-vitales', 
  authorizePatientAccess,
  searchRateLimit,
  getPacienteSignosVitales,
  autoDecryptResponse('signos_vitales')
);

/**
 * Crear signos vitales para un paciente específico
 * POST /api/pacientes/:id/signos-vitales
 * 
 * Parámetros de body:
 * - peso_kg, talla_m, medida_cintura_cm
 * - presion_sistolica, presion_diastolica
 * - glucosa_mg_dl, colesterol_mg_dl, trigliceridos_mg_dl
 * - id_cita (opcional)
 * - observaciones (opcional)
 * 
 * Respuesta:
 * - success: boolean
 * - message: Mensaje de éxito
 * - data: Signos vitales creados
 */
router.post('/:id/signos-vitales',
  authorizePatientAccess,
  writeRateLimit,
  autoEncryptRequest('signos_vitales'),
  createPacienteSignosVitales,
  autoDecryptResponse('signos_vitales')
);

/**
 * Actualizar signos vitales de un paciente
 * PUT /api/pacientes/:id/signos-vitales/:signoId
 */
router.put('/:id/signos-vitales/:signoId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  autoEncryptRequest('signos_vitales'),
  updatePacienteSignosVitales,
  autoDecryptResponse('signos_vitales')
);

/**
 * Eliminar signos vitales de un paciente (Admin y Doctor - solo pacientes asignados)
 * DELETE /api/pacientes/:id/signos-vitales/:signoId
 */
router.delete('/:id/signos-vitales/:signoId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  deletePacienteSignosVitales
);

/**
 * Obtener diagnósticos de un paciente específico
 * GET /api/pacientes/:id/diagnosticos
 * 
 * Parámetros de consulta:
 * - limit: Número de registros a devolver (default: 10)
 * - offset: Número de registros a omitir (default: 0)
 * - sort: Ordenamiento ASC/DESC (default: DESC)
 * 
 * Respuesta:
 * - success: boolean
 * - data: Array de diagnósticos
 * - total: Total de registros
 * - limit: Límite aplicado
 * - offset: Offset aplicado
 */
router.get('/:id/diagnosticos', 
  authorizePatientAccess,
  searchRateLimit,
  getPacienteDiagnosticos,
  autoDecryptResponse('diagnosticos') // Desencriptar campo descripcion
);

/**
 * Crear un nuevo diagnóstico para un paciente específico
 * POST /api/pacientes/:id/diagnosticos
 * 
 * Parámetros de body:
 * - id_cita: ID de la cita asociada (requerido)
 * - descripcion: Descripción del diagnóstico (requerido)
 * 
 * Respuesta:
 * - success: boolean
 * - message: Mensaje de éxito
 * - data: Diagnóstico creado
 */
router.post('/:id/diagnosticos',
  authorizeRoles(['Admin', 'Doctor']),
  writeRateLimit,
  createPacienteDiagnostico
);

/**
 * Actualizar diagnóstico de un paciente
 * PUT /api/pacientes/:id/diagnosticos/:diagnosticoId
 */
router.put('/:id/diagnosticos/:diagnosticoId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  updatePacienteDiagnostico
);

/**
 * Eliminar diagnóstico de un paciente (Admin y Doctor - solo pacientes asignados)
 * DELETE /api/pacientes/:id/diagnosticos/:diagnosticoId
 */
router.delete('/:id/diagnosticos/:diagnosticoId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  deletePacienteDiagnostico
);

/**
 * Obtener medicamentos de un paciente específico
 * GET /api/pacientes/:id/medicamentos
 * 
 * Parámetros de consulta:
 * - limit: Número de registros a devolver (default: 10)
 * - offset: Número de registros a omitir (default: 0)
 * - sort: Ordenamiento ASC/DESC (default: DESC)
 * 
 * Respuesta:
 * - success: boolean
 * - data: Array de medicamentos
 * - total: Total de registros
 * - limit: Límite aplicado
 * - offset: Offset aplicado
 */
router.get('/:id/medicamentos', 
  authorizePatientAccess,
  searchRateLimit,
  getPacienteMedicamentos,
  autoDecryptResponse('planes_medicacion') // Desencriptar campos observaciones
);

/**
 * Crear un nuevo plan de medicación para un paciente específico
 * POST /api/pacientes/:id/planes-medicacion
 * 
 * Parámetros de body:
 * - id_cita (opcional)
 * - fecha_inicio (opcional)
 * - fecha_fin (opcional)
 * - observaciones (opcional)
 * - medicamentos: Array de { id_medicamento, dosis, frecuencia, horario, via_administracion, observaciones }
 * 
 * Respuesta:
 * - success: boolean
 * - message: Mensaje de éxito
 * - data: Plan de medicación creado con detalles
 */
router.post('/:id/planes-medicacion',
  authorizeRoles(['Admin', 'Doctor']),
  writeRateLimit,
  autoEncryptRequest('planes_medicacion'),
  createPacientePlanMedicacion,
  autoDecryptResponse('planes_medicacion')
);

/**
 * Eliminar plan de medicación de un paciente (Admin y Doctor - solo pacientes asignados)
 * DELETE /api/pacientes/:id/planes-medicacion/:planId
 */
router.delete('/:id/planes-medicacion/:planId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  deletePacientePlanMedicacion
);

/**
 * Obtener resumen médico completo de un paciente
 * GET /api/pacientes/:id/resumen-medico
 * 
 * Respuesta:
 * - success: boolean
 * - data: Objeto con resumen y últimos registros
 *   - resumen: Conteos totales por tipo
 *   - ultimos_registros: Último registro de cada tipo
 */
router.get('/:id/resumen-medico', 
  authorizePatientAccess,
  searchRateLimit, 
  getPacienteResumenMedico
);

/**
 * Red de Apoyo - Obtener contactos de un paciente
 * GET /api/pacientes/:id/red-apoyo
 */
router.get('/:id/red-apoyo',
  authorizeRoles(['Admin', 'Doctor']),
  searchRateLimit,
  getPacienteRedApoyo,
  autoDecryptResponse('red_apoyo') // Desencriptar campos numero_celular, email, direccion
);

/**
 * Red de Apoyo - Crear contacto para un paciente
 * POST /api/pacientes/:id/red-apoyo
 */
router.post('/:id/red-apoyo',
  authorizeRoles(['Admin', 'Doctor']),
  writeRateLimit,
  createPacienteRedApoyo
);

/**
 * Actualizar contacto de red de apoyo
 * PUT /api/pacientes/:id/red-apoyo/:contactoId
 */
router.put('/:id/red-apoyo/:contactoId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  updatePacienteRedApoyo
);

/**
 * Eliminar contacto de red de apoyo (Admin y Doctor - solo pacientes asignados)
 * DELETE /api/pacientes/:id/red-apoyo/:contactoId
 */
router.delete('/:id/red-apoyo/:contactoId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  deletePacienteRedApoyo
);

/**
 * Esquema de Vacunación - Obtener vacunas de un paciente
 * GET /api/pacientes/:id/esquema-vacunacion
 */
router.get('/:id/esquema-vacunacion',
  authorizeRoles(['Admin', 'Doctor']),
  searchRateLimit,
  getPacienteEsquemaVacunacion,
  autoDecryptResponse('esquema_vacunacion')
);

/**
 * Esquema de Vacunación - Crear registro de vacuna
 * POST /api/pacientes/:id/esquema-vacunacion
 */
router.post('/:id/esquema-vacunacion',
  authorizeRoles(['Admin', 'Doctor']),
  writeRateLimit,
  autoEncryptRequest('esquema_vacunacion'),
  createPacienteEsquemaVacunacion,
  autoDecryptResponse('esquema_vacunacion')
);

/**
 * Actualizar registro de esquema de vacunación
 * PUT /api/pacientes/:id/esquema-vacunacion/:esquemaId
 */
router.put('/:id/esquema-vacunacion/:esquemaId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  autoEncryptRequest('esquema_vacunacion'),
  updatePacienteEsquemaVacunacion,
  autoDecryptResponse('esquema_vacunacion')
);

/**
 * Eliminar registro de esquema de vacunación (Admin y Doctor - solo pacientes asignados)
 * DELETE /api/pacientes/:id/esquema-vacunacion/:esquemaId
 */
router.delete('/:id/esquema-vacunacion/:esquemaId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  deletePacienteEsquemaVacunacion
);

/**
 * Solicitudes de Reprogramación - Obtener solicitudes de un paciente
 * GET /api/pacientes/:id/solicitudes-reprogramacion
 */
router.get('/:id/solicitudes-reprogramacion',
  authorizePatientAccess,
  searchRateLimit,
  getSolicitudesReprogramacion
);

/**
 * Comorbilidades - Obtener comorbilidades de un paciente
 * GET /api/pacientes/:id/comorbilidades
 * 
 * Parámetros de consulta:
 * - limit: Número de registros a devolver (default: 100)
 * - offset: Número de registros a omitir (default: 0)
 * 
 * Respuesta:
 * - success: boolean
 * - data: Array de comorbilidades con fecha_deteccion y observaciones
 * - total: Total de registros
 * - limit: Límite aplicado
 * - offset: Offset aplicado
 */
router.get('/:id/comorbilidades',
  authorizePatientAccess,
  searchRateLimit,
  getPacienteComorbilidades
);

/**
 * Comorbilidades - Agregar comorbilidad a un paciente
 * POST /api/pacientes/:id/comorbilidades
 * 
 * Parámetros de body:
 * - id_comorbilidad: ID de la comorbilidad (requerido)
 * - fecha_deteccion: Fecha de detección (opcional, default: hoy)
 * - observaciones: Observaciones adicionales (opcional)
 * 
 * Respuesta:
 * - success: boolean
 * - message: Mensaje de éxito
 * - data: Comorbilidad agregada con detalles
 */
router.post('/:id/comorbilidades',
  authorizeRoles(['Admin', 'Doctor']),
  writeRateLimit,
  addPacienteComorbilidad
);

/**
 * Comorbilidades - Actualizar comorbilidad de un paciente
 * PUT /api/pacientes/:id/comorbilidades/:comorbilidadId
 * 
 * Parámetros de body:
 * - fecha_deteccion: Nueva fecha de detección (opcional)
 * - observaciones: Nuevas observaciones (opcional)
 * 
 * Respuesta:
 * - success: boolean
 * - message: Mensaje de éxito
 * - data: Comorbilidad actualizada
 */
router.put('/:id/comorbilidades/:comorbilidadId',
  authorizeRoles(['Admin', 'Doctor']),
  writeRateLimit,
  updatePacienteComorbilidad
);

/**
 * Comorbilidades - Eliminar comorbilidad de un paciente
 * DELETE /api/pacientes/:id/comorbilidades/:comorbilidadId
 * 
 * Respuesta:
 * - success: boolean
 * - message: Mensaje de éxito
 */
router.delete('/:id/comorbilidades/:comorbilidadId',
  authorizeRoles(['Admin', 'Doctor']),
  writeRateLimit,
  deletePacienteComorbilidad
);

/**
 * =====================================================
 * RUTAS PARA DETECCIÓN DE COMPLICACIONES
 * =====================================================
 */

/**
 * Obtener todas las detecciones de complicaciones de un paciente
 * GET /api/pacientes/:id/detecciones-complicaciones
 * 
 * Parámetros de consulta:
 * - limit: Número de registros a devolver (default: 100)
 * - offset: Número de registros a omitir (default: 0)
 * - sort: Ordenamiento ASC/DESC (default: DESC)
 * 
 * Respuesta:
 * - success: boolean
 * - data: Array de detecciones
 * - total: Total de registros
 * - limit: Límite aplicado
 * - offset: Offset aplicado
 */
router.get('/:id/detecciones-complicaciones',
  authorizePatientAccess,
  authorizeRoles(['Admin', 'Doctor', 'Paciente']),
  searchRateLimit,
  getDeteccionesPaciente
);

/**
 * Crear una nueva detección de complicación
 * POST /api/pacientes/:id/detecciones-complicaciones
 * 
 * Parámetros de body:
 * - id_comorbilidad (opcional)
 * - id_cita (opcional)
 * - id_doctor (opcional)
 * - exploracion_pies (BOOLEAN, default: false)
 * - exploracion_fondo_ojo (BOOLEAN, default: false)
 * - realiza_auto_monitoreo (BOOLEAN, default: false)
 * - auto_monitoreo_glucosa (BOOLEAN, default: false)
 * - auto_monitoreo_presion (BOOLEAN, default: false)
 * - tipo_complicacion (STRING 100, opcional)
 * - fecha_deteccion (DATE, obligatorio)
 * - fecha_diagnostico (DATE, opcional)
 * - observaciones (TEXT, opcional)
 * 
 * Respuesta:
 * - success: boolean
 * - message: Mensaje de éxito
 * - data: Detección creada
 */
router.post('/:id/detecciones-complicaciones',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  createDeteccion
);

/**
 * Obtener una detección específica por ID
 * GET /api/pacientes/:pacienteId/detecciones-complicaciones/:id
 * 
 * Respuesta:
 * - success: boolean
 * - data: Detección encontrada
 */
router.get('/:pacienteId/detecciones-complicaciones/:id',
  authorizePatientAccess,
  authorizeRoles(['Admin', 'Doctor', 'Paciente']),
  searchRateLimit,
  getDeteccionById
);

/**
 * Actualizar una detección de complicación
 * PUT /api/pacientes/:pacienteId/detecciones-complicaciones/:id
 * 
 * Parámetros de body:
 * - Todos los campos son opcionales (solo enviar los que se desean actualizar)
 * 
 * Respuesta:
 * - success: boolean
 * - message: Mensaje de éxito
 * - data: Detección actualizada
 */
router.put('/:pacienteId/detecciones-complicaciones/:id',
  authorizePatientAccess,
  authorizeRoles(['Admin', 'Doctor']),
  writeRateLimit,
  updateDeteccion
);

/**
 * Eliminar una detección de complicación
 * DELETE /api/pacientes/:pacienteId/detecciones-complicaciones/:id
 * 
 * Respuesta:
 * - success: boolean
 * - message: Mensaje de éxito
 */
router.delete('/:pacienteId/detecciones-complicaciones/:id',
  authorizePatientAccess,
  authorizeRoles(['Admin']),
  writeRateLimit,
  deleteDeteccion
);

/**
 * =====================================================
 * RUTAS PARA SESIONES EDUCATIVAS
 * =====================================================
 */

/**
 * Obtener todas las sesiones educativas de un paciente
 * GET /api/pacientes/:id/sesiones-educativas
 */
router.get('/:id/sesiones-educativas',
  authorizePatientAccess,
  authorizeRoles(['Admin', 'Doctor', 'Paciente']),
  searchRateLimit,
  getSesionesEducativasPaciente
);

/**
 * Crear una nueva sesión educativa
 * POST /api/pacientes/:id/sesiones-educativas
 */
router.post('/:id/sesiones-educativas',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  createSesionEducativa
);

/**
 * Actualizar una sesión educativa
 * PUT /api/pacientes/:id/sesiones-educativas/:sesionId
 */
router.put('/:id/sesiones-educativas/:sesionId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  updateSesionEducativa
);

/**
 * Eliminar una sesión educativa
 * DELETE /api/pacientes/:id/sesiones-educativas/:sesionId
 */
router.delete('/:id/sesiones-educativas/:sesionId',
  authorizeRoles(['Admin']),
  authorizePatientAccess,
  writeRateLimit,
  deleteSesionEducativa
);

/**
 * =====================================================
 * RUTAS PARA SALUD BUCAL
 * =====================================================
 */

/**
 * Obtener todos los registros de salud bucal de un paciente
 * GET /api/pacientes/:id/salud-bucal
 */
router.get('/:id/salud-bucal',
  authorizePatientAccess,
  authorizeRoles(['Admin', 'Doctor', 'Paciente']),
  searchRateLimit,
  getSaludBucalPaciente
);

/**
 * Crear un nuevo registro de salud bucal
 * POST /api/pacientes/:id/salud-bucal
 */
router.post('/:id/salud-bucal',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  createSaludBucal
);

/**
 * Actualizar un registro de salud bucal
 * PUT /api/pacientes/:id/salud-bucal/:registroId
 */
router.put('/:id/salud-bucal/:registroId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  updateSaludBucal
);

/**
 * Eliminar un registro de salud bucal
 * DELETE /api/pacientes/:id/salud-bucal/:registroId
 */
router.delete('/:id/salud-bucal/:registroId',
  authorizeRoles(['Admin']),
  authorizePatientAccess,
  writeRateLimit,
  deleteSaludBucal
);

/**
 * =====================================================
 * RUTAS PARA DETECCIÓN DE TUBERCULOSIS
 * =====================================================
 */

/**
 * Obtener todas las detecciones de tuberculosis de un paciente
 * GET /api/pacientes/:id/detecciones-tuberculosis
 */
router.get('/:id/detecciones-tuberculosis',
  authorizePatientAccess,
  authorizeRoles(['Admin', 'Doctor', 'Paciente']),
  searchRateLimit,
  getDeteccionesTuberculosisPaciente
);

/**
 * Crear una nueva detección de tuberculosis
 * POST /api/pacientes/:id/detecciones-tuberculosis
 */
router.post('/:id/detecciones-tuberculosis',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  createDeteccionTuberculosis
);

/**
 * Actualizar una detección de tuberculosis
 * PUT /api/pacientes/:id/detecciones-tuberculosis/:deteccionId
 */
router.put('/:id/detecciones-tuberculosis/:deteccionId',
  authorizeRoles(['Admin', 'Doctor']),
  authorizePatientAccess,
  writeRateLimit,
  updateDeteccionTuberculosis
);

/**
 * Eliminar una detección de tuberculosis
 * DELETE /api/pacientes/:id/detecciones-tuberculosis/:deteccionId
 */
router.delete('/:id/detecciones-tuberculosis/:deteccionId',
  authorizeRoles(['Admin']),
  authorizePatientAccess,
  writeRateLimit,
  deleteDeteccionTuberculosis
);

export default router;

