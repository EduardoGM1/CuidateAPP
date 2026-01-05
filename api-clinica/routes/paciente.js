import { Router } from 'express';
import { 
  getPacientes, 
  getPacienteById, 
  createPaciente, 
  createPacienteCompleto, 
  updatePaciente, 
  deletePaciente,
  getPacienteDoctores,
  assignDoctorToPaciente,
  unassignDoctorFromPaciente,
  replacePacienteDoctor
} from '../controllers/paciente.js';
import { SecurityValidator } from '../middlewares/securityValidator.js';
import MassAssignmentProtection from '../middlewares/massAssignmentProtection.js';
import AdvancedRateLimiting from '../middlewares/advancedRateLimiting.js';
import { authenticateToken, authorizeRoles, authorizePatientAccess } from '../middlewares/auth.js';
import { handleValidationErrors } from '../middlewares/errorHandler.js';
import { searchRateLimit, writeRateLimit } from '../middlewares/rateLimiting.js';
import { autoEncryptRequest, autoDecryptResponse } from '../middlewares/autoDecryption.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Solo Admin y Doctor pueden listar todos los pacientes
router.get('/', 
  authorizeRoles('Admin', 'Doctor'), 
  searchRateLimit, 
  getPacientes,
  autoDecryptResponse('pacientes')
);

// Solo Admin y Doctor pueden crear pacientes completos (con usuario y PIN)
// Esta ruta debe estar ANTES de la ruta genérica '/' para que tenga prioridad
// IMPORTANTE: Las validaciones deben ejecutarse ANTES de autoEncryptRequest
// porque las validaciones necesitan los valores originales, no los encriptados
router.post('/completo', 
  authorizeRoles('Admin', 'Doctor'), 
  AdvancedRateLimiting.crudLimiter(),
  writeRateLimit,
  MassAssignmentProtection.validateOperation('patientRegistration'),
  // Validaciones de formato (antes de encriptar)
  SecurityValidator.validateName(),
  SecurityValidator.validateCURP(),
  SecurityValidator.validateDate('fecha_nacimiento'),
  SecurityValidator.validateEmail(),
  SecurityValidator.handleValidationErrors,
  // Encriptar campos sensibles DESPUÉS de las validaciones
  autoEncryptRequest('pacientes'),
  createPacienteCompleto,
  autoDecryptResponse('pacientes')
);

// Solo Admin y Doctor pueden crear pacientes
router.post('/', 
  authorizeRoles('Admin', 'Doctor'), 
  AdvancedRateLimiting.crudLimiter(),
  MassAssignmentProtection.validateOperation('patientRegistration'),
  SecurityValidator.validateName(),
  SecurityValidator.validateCURP(),
  SecurityValidator.validateDate('fecha_nacimiento'),
  SecurityValidator.validateEmail(),
  SecurityValidator.handleValidationErrors,
  writeRateLimit,
  autoEncryptRequest('pacientes'),
  createPaciente,
  autoDecryptResponse('pacientes')
);

// Endpoint público para desarrollo - crear paciente (solo si ALLOW_DEV_ENDPOINTS=true)
// ⚠️ IMPORTANTE: Este endpoint solo está disponible en desarrollo
// En producción, todos los endpoints requieren autenticación y autorización
if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_ENDPOINTS === 'true') {
  router.post('/public', 
    autoEncryptRequest('pacientes'),
    createPaciente,
    autoDecryptResponse('pacientes')
  );
} else if (process.env.NODE_ENV === 'development') {
  // En desarrollo sin ALLOW_DEV_ENDPOINTS, retornar error informativo
  router.post('/public', (req, res) => {
    res.status(403).json({
      success: false,
      error: 'Endpoint deshabilitado por seguridad',
      message: 'Para habilitar este endpoint en desarrollo, configure ALLOW_DEV_ENDPOINTS=true'
    });
  });
}

// =====================================================
// RUTAS DE GESTIÓN DE DOCTORES DESDE PERSPECTIVA PACIENTE
// ⚠️ IMPORTANTE: Estas rutas deben estar ANTES de las rutas genéricas /:id
// =====================================================

/**
 * Obtener todos los doctores asignados a un paciente
 * GET /api/pacientes/:id/doctores
 */
router.get('/:id/doctores',
  authorizeRoles('Admin', 'Doctor'),
  authorizePatientAccess,
  searchRateLimit,
  getPacienteDoctores
);

/**
 * Asignar un doctor a un paciente
 * POST /api/pacientes/:id/doctores
 */
router.post('/:id/doctores',
  authorizeRoles('Admin', 'Doctor'),
  authorizePatientAccess,
  AdvancedRateLimiting.crudLimiter(),
  writeRateLimit,
  assignDoctorToPaciente
);

/**
 * Desasignar un doctor de un paciente
 * DELETE /api/pacientes/:id/doctores/:doctorId
 */
router.delete('/:id/doctores/:doctorId',
  authorizeRoles('Admin', 'Doctor'),
  authorizePatientAccess,
  AdvancedRateLimiting.crudLimiter(),
  writeRateLimit,
  unassignDoctorFromPaciente
);

/**
 * Reemplazar un doctor por otro en un paciente
 * PUT /api/pacientes/:id/doctores/:doctorIdAntiguo
 */
router.put('/:id/doctores/:doctorIdAntiguo',
  authorizeRoles('Admin', 'Doctor'),
  authorizePatientAccess,
  AdvancedRateLimiting.crudLimiter(),
  writeRateLimit,
  replacePacienteDoctor
);

// =====================================================
// RUTAS GENÉRICAS (después de las rutas específicas)
// =====================================================

// Pacientes pueden ver sus propios datos, Admin/Doctor pueden ver cualquier paciente
router.get('/:id', 
  authorizePatientAccess, 
  getPacienteById,
  autoDecryptResponse('pacientes')
);

router.put('/:id', 
  authorizeRoles('Admin', 'Doctor'), 
  AdvancedRateLimiting.crudLimiter(),
  MassAssignmentProtection.validateOperation('patientUpdate'),
  SecurityValidator.validateName(),
  SecurityValidator.validateCURP(),
  SecurityValidator.validateDate('fecha_nacimiento'),
  SecurityValidator.validateEmail(),
  SecurityValidator.handleValidationErrors,
  writeRateLimit,
  autoEncryptRequest('pacientes'),
  updatePaciente,
  autoDecryptResponse('pacientes')
);

// Admin y Doctor pueden eliminar pacientes (Doctor solo pacientes asignados)
router.delete('/:id', 
  authorizeRoles('Admin', 'Doctor'), 
  authorizePatientAccess,
  writeRateLimit, 
  deletePaciente
);

export default router;