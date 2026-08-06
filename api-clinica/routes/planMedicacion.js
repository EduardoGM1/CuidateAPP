import { Router } from 'express';
import {
  getPlanesMedicacion,
  getPlanMedicacion,
  getPlanesByDiagnostico,
  createPlanMedicacion,
  updatePlanMedicacion,
  deletePlanMedicacion,
} from '../controllers/planMedicacion.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { searchRateLimit, writeRateLimit } from '../middlewares/rateLimiting.js';

const router = Router();

router.use(authenticateToken);

router.get('/', authorizeRoles('Admin', 'Doctor'), searchRateLimit, getPlanesMedicacion);
router.get('/diagnostico/:diagnosticoId', authorizeRoles('Admin', 'Doctor'), searchRateLimit, getPlanesByDiagnostico);
router.get('/:id', authorizeRoles('Admin', 'Doctor'), searchRateLimit, getPlanMedicacion);
router.post('/', authorizeRoles('Admin', 'Doctor'), writeRateLimit, createPlanMedicacion);
router.put('/:id', authorizeRoles('Admin', 'Doctor'), writeRateLimit, updatePlanMedicacion);
router.delete('/:id', authorizeRoles('Admin'), writeRateLimit, deletePlanMedicacion);

export default router;
