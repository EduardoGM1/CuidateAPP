import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { searchRateLimit, writeRateLimit } from '../middlewares/rateLimiting.js';
import * as medicamentoTomaController from '../controllers/medicamentoToma.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Registrar toma de medicamento
router.post('/', writeRateLimit, medicamentoTomaController.registrarToma);

// Obtener tomas de un paciente
router.get('/paciente/:idPaciente', searchRateLimit, medicamentoTomaController.getTomasByPaciente);

// Obtener tomas de un plan específico
router.get('/plan/:idPlan', searchRateLimit, medicamentoTomaController.getTomasByPlan);

// Eliminar toma (solo Admin/Doctor)
router.delete('/:id', writeRateLimit, authorizeRoles('Admin', 'Doctor'), medicamentoTomaController.deleteToma);

export default router;


