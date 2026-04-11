import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import {
  getSystemStatus,
  exportPacientesAnonimizado,
  listDataAccessLogs,
  revokeUserSessions,
} from '../controllers/adminOperationsController.js';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles(['admin', 'Admin']));

router.get('/system/status', getSystemStatus);
router.get('/export/pacientes-anonimo', exportPacientesAnonimizado);
router.get('/data-access-logs', listDataAccessLogs);
router.post('/users/:id_usuario/revoke-sessions', revokeUserSessions);

export default router;
