import { Router } from 'express';
import { SecurityValidator } from '../middlewares/securityValidator.js';
import MassAssignmentProtection from '../middlewares/massAssignmentProtection.js';
import AdvancedRateLimiting from '../middlewares/advancedRateLimiting.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { handleValidationErrors } from '../middlewares/errorHandler.js';
import { searchRateLimit, writeRateLimit } from '../middlewares/rateLimiting.js';
import { autoEncryptRequest, autoDecryptResponse } from '../middlewares/autoDecryption.js';
import { 
  getCitas, 
  getCita, 
  getCitasByPaciente, 
  getCitasByDoctor, 
  createCita, 
  createPrimeraConsulta,
  createConsultaCompleta,
  updateCita,
  updateEstadoCita,
  reprogramarCita,
  solicitarReprogramacion,
  getSolicitudesReprogramacion,
  getAllSolicitudesReprogramacion,
  responderSolicitudReprogramacion,
  cancelarSolicitudReprogramacion,
  deleteCita,
  completarCitaWizard
} from '../controllers/cita.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de citas
// IMPORTANTE: autoDecryptResponse debe ir ANTES del controlador para interceptar res.json()
router.get('/', 
  authorizeRoles(['Admin', 'Doctor']), 
  searchRateLimit, 
  autoDecryptResponse('citas'),
  getCitas
);
// Obtener todas las solicitudes de reprogramación (admin/doctor) - DEBE IR ANTES DE /:id
router.get('/solicitudes-reprogramacion',
  authorizeRoles(['Admin', 'Doctor']),
  searchRateLimit,
  getAllSolicitudesReprogramacion
);
router.get('/paciente/:pacienteId', 
  authorizeRoles(['Admin', 'Doctor']), 
  searchRateLimit, 
  autoDecryptResponse('citas'),
  getCitasByPaciente
);
router.get('/doctor/:doctorId', 
  authorizeRoles(['Admin', 'Doctor']), 
  searchRateLimit, 
  autoDecryptResponse('citas'),
  getCitasByDoctor
);
router.get('/:id', 
  authorizeRoles(['Admin', 'Doctor']), 
  searchRateLimit, 
  autoDecryptResponse('citas'),
  getCita
);

// Crear cita simple
router.post('/', 
  authorizeRoles(['Admin', 'Doctor']), 
  writeRateLimit,
  autoEncryptRequest('citas'),
  createCita,
  autoDecryptResponse('citas')
);

// Crear primera consulta completa
router.post('/primera-consulta', 
  authorizeRoles(['Admin', 'Doctor']), 
  writeRateLimit,
  autoEncryptRequest('citas'),
  createPrimeraConsulta,
  autoDecryptResponse('citas')
);

// Crear consulta completa (nueva cita + datos médicos) o completar cita existente
router.post('/consulta-completa', 
  authorizeRoles(['Admin', 'Doctor']), 
  writeRateLimit,
  autoEncryptRequest('citas'),
  createConsultaCompleta,
  autoDecryptResponse('citas')
);

// Actualizar y eliminar citas
router.put('/:id', 
  authorizeRoles(['Admin', 'Doctor']), 
  writeRateLimit,
  autoEncryptRequest('citas'),
  updateCita,
  autoDecryptResponse('citas')
);

// Gestión de estados de citas
router.put('/:id/estado', 
  authorizeRoles(['Admin', 'Doctor']), 
  writeRateLimit,
  updateEstadoCita
);

// Completar cita con wizard paso a paso
router.post('/:id/completar-wizard',
  authorizeRoles(['Admin', 'Doctor']),
  writeRateLimit,
  autoEncryptRequest('citas'),
  completarCitaWizard,
  autoDecryptResponse('citas')
);

// Reprogramar cita (doctor/admin)
router.put('/:id/reprogramar', 
  authorizeRoles(['Admin', 'Doctor']), 
  writeRateLimit,
  reprogramarCita
);

// Solicitar reprogramación (paciente)
router.post('/:id/solicitar-reprogramacion',
  authorizeRoles(['Paciente', 'Admin', 'Doctor']),
  writeRateLimit,
  solicitarReprogramacion
);

// Responder solicitud de reprogramación (doctor/admin)
router.put('/:id/solicitud-reprogramacion/:solicitudId',
  authorizeRoles(['Admin', 'Doctor']),
  writeRateLimit,
  responderSolicitudReprogramacion
);

// Cancelar solicitud de reprogramación (paciente)
router.delete('/:id/solicitud-reprogramacion/:solicitudId',
  authorizeRoles(['Paciente', 'Admin', 'Doctor']),
  writeRateLimit,
  cancelarSolicitudReprogramacion
);

router.delete('/:id', authorizeRoles(['Admin']), writeRateLimit, deleteCita);

export default router;