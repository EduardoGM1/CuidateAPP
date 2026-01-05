/**
 * Routes para Auditoría del Sistema
 * Solo accesible para administradores
 */

import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { 
  getAuditoria, 
  getAuditoriaById, 
  getUsuariosAuditoria,
  getEstadisticasAuditoria,
  exportarAuditoria
} from '../controllers/auditoriaController.js';

const router = Router();

// Todas las rutas requieren autenticación y rol admin
router.use(authenticateToken);
router.use(authorizeRoles(['admin']));

/**
 * @route GET /api/admin/auditoria
 * @desc Obtener historial de auditoría con filtros
 * @access Admin
 */
router.get('/', getAuditoria);

/**
 * @route GET /api/admin/auditoria/usuarios
 * @desc Obtener lista de usuarios para filtro
 * @access Admin
 */
router.get('/usuarios', getUsuariosAuditoria);

/**
 * @route GET /api/admin/auditoria/estadisticas
 * @desc Obtener estadísticas básicas de auditoría
 * @access Admin
 */
router.get('/estadisticas', getEstadisticasAuditoria);

/**
 * @route POST /api/admin/auditoria/exportar
 * @desc Exportar auditoría a CSV o Excel
 * @access Admin
 */
router.post('/exportar', exportarAuditoria);

/**
 * @route GET /api/admin/auditoria/:id
 * @desc Obtener detalle de un registro de auditoría
 * @access Admin
 */
router.get('/:id', getAuditoriaById);

export default router;

