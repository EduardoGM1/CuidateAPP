import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { searchRateLimit, writeRateLimit } from '../middlewares/rateLimiting.js';
import { 
  getMedicamentos, 
  getMedicamento, 
  createMedicamento, 
  updateMedicamento, 
  deleteMedicamento 
} from '../controllers/medicamento.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener todos los medicamentos disponibles
router.get('/', authorizeRoles(['Admin', 'Doctor']), searchRateLimit, getMedicamentos);

// Obtener un medicamento específico
router.get('/:id', authorizeRoles(['Admin', 'Doctor']), searchRateLimit, getMedicamento);

// Crear nuevo medicamento (solo Admin)
router.post('/', authorizeRoles(['Admin']), writeRateLimit, createMedicamento);

// Actualizar medicamento (solo Admin)
router.put('/:id', authorizeRoles(['Admin']), writeRateLimit, updateMedicamento);

// Eliminar medicamento (solo Admin)
router.delete('/:id', authorizeRoles(['Admin']), writeRateLimit, deleteMedicamento);

export default router;