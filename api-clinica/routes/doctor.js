import { Router } from 'express';
import { getDoctores, getDoctorById, createDoctor, updateDoctor, deleteDoctor, reactivateDoctor, hardDeleteDoctor, getDoctorDashboard, assignPatientToDoctor, unassignPatientFromDoctor, getAvailablePatients } from '../controllers/doctor.js';
import { SecurityValidator } from '../middlewares/securityValidator.js';
import MassAssignmentProtection from '../middlewares/massAssignmentProtection.js';
import AdvancedRateLimiting from '../middlewares/advancedRateLimiting.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { handleValidationErrors } from '../middlewares/errorHandler.js';
import { searchRateLimit, writeRateLimit } from '../middlewares/rateLimiting.js';
import { autoEncryptRequest, autoDecryptResponse } from '../middlewares/autoDecryption.js';
import { Doctor } from '../models/associations.js';

const router = Router();

// Endpoint público para desarrollo - crear doctor (ANTES del middleware de auth)
// ⚠️ IMPORTANTE: Este endpoint solo está disponible en desarrollo
// En producción, todos los endpoints requieren autenticación y autorización
if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_ENDPOINTS === 'true') {
  router.post('/public', 
    autoEncryptRequest('doctores'),
    createDoctor,
    autoDecryptResponse('doctores')
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

// Todas las demás rutas requieren autenticación
router.use(authenticateToken);

// Admin puede ver todos los doctores, Doctor solo puede ver su propio perfil
router.get('/', 
  authorizeRoles('Admin', 'Doctor'), 
  searchRateLimit, 
  getDoctores,
  autoDecryptResponse('doctores')
);

// Rutas específicas ANTES de las genéricas
router.get('/:id/dashboard', authorizeRoles('Admin'), searchRateLimit, getDoctorDashboard);
router.get('/:id/available-patients', 
  authorizeRoles('Admin'), 
  searchRateLimit, 
  getAvailablePatients
);

// Rutas genéricas
// Admin puede ver cualquier doctor, Doctor solo puede ver su propio perfil
router.get('/:id', 
  authorizeRoles('Admin', 'Doctor'), 
  async (req, res, next) => {
    // Si es Doctor, verificar que está accediendo a su propio perfil
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ where: { id_usuario: req.user.id } });
      if (!doctor || doctor.id_doctor !== parseInt(req.params.id)) {
        return res.status(403).json({ 
          success: false,
          error: 'Solo puedes ver tu propio perfil' 
        });
      }
    }
    next();
  },
  getDoctorById,
  autoDecryptResponse('doctores')
);

// Solo Admin puede crear y actualizar doctores
router.post('/', 
  authorizeRoles('Admin'), 
  AdvancedRateLimiting.crudLimiter(),
  MassAssignmentProtection.validateOperation('doctorRegistration'),
  SecurityValidator.validateDoctorCreateFields(),
  SecurityValidator.handleValidationErrors,
  writeRateLimit,
  autoEncryptRequest('doctores'),
  createDoctor,
  autoDecryptResponse('doctores')
);

router.put('/:id', 
  authorizeRoles('Admin'), 
  AdvancedRateLimiting.crudLimiter(),
  MassAssignmentProtection.validateOperation('doctorUpdate'),
  SecurityValidator.validateDoctorNameUpdate(),
  ...SecurityValidator.validateDoctorUpdateFields(),
  SecurityValidator.handleValidationErrors,
  writeRateLimit,
  autoEncryptRequest('doctores'),
  updateDoctor,
  autoDecryptResponse('doctores')
);

// Solo Admin puede eliminar doctores (soft delete)
router.delete('/:id', authorizeRoles('Admin'), writeRateLimit, deleteDoctor);

// Solo Admin puede reactivar doctores
router.post('/:id/reactivar', authorizeRoles('Admin'), writeRateLimit, reactivateDoctor);

// Solo Admin puede eliminar permanentemente doctores
router.delete('/:id/permanente', authorizeRoles('Admin'), writeRateLimit, hardDeleteDoctor);

// =====================================================
// RUTAS DE ASIGNACIÓN DE PACIENTES
// =====================================================

// Asignar paciente a doctor
router.post('/:id/assign-patient', 
  authorizeRoles('Admin'), 
  AdvancedRateLimiting.crudLimiter(),
  writeRateLimit, 
  assignPatientToDoctor
);

// Desasignar paciente de doctor
router.delete('/:id/assign-patient/:pacienteId', 
  authorizeRoles('Admin'), 
  AdvancedRateLimiting.crudLimiter(),
  writeRateLimit, 
  unassignPatientFromDoctor
);


export default router;