import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { searchRateLimit, writeRateLimit } from '../middlewares/rateLimiting.js';
import { 
  getMedicamentos, 
  getMedicamento, 
  createMedicamento,
  findOrCreateMedicamento,
  updateMedicamento, 
  deleteMedicamento 
} from '../controllers/medicamento.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los medicamentos disponibles
router.get('/', authorizeRoles(['Admin', 'Doctor']), searchRateLimit, getMedicamentos);

// Buscar o crear medicamento por nombre (Doctor al prescribir fuera de catálogo)
router.post('/find-or-create', authorizeRoles(['Admin', 'Doctor']), writeRateLimit, findOrCreateMedicamento);

// Crear nuevo medicamento (solo Admin)
router.post('/', authorizeRoles(['Admin']), writeRateLimit, createMedicamento);

// Obtener un medicamento específico
router.get('/:id', authorizeRoles(['Admin', 'Doctor']), searchRateLimit, getMedicamento);

// Actualizar medicamento (solo Admin)
router.put('/:id', authorizeRoles(['Admin']), writeRateLimit, updateMedicamento);

// Eliminar medicamento (solo Admin)
router.delete('/:id', authorizeRoles(['Admin']), writeRateLimit, deleteMedicamento);

export default router;