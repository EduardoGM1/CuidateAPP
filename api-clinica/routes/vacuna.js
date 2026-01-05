import express from 'express';
import { 
  getVacunas, 
  getVacunaById, 
  createVacuna, 
  updateVacuna, 
  deleteVacuna 
} from '../controllers/vacuna.js';
import { authenticateToken } from '../middlewares/auth.js';
import { generalRateLimit } from '../middlewares/rateLimiting.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @route GET /api/vacunas
 * @desc Obtener todas las vacunas del catálogo
 * @access Public (para formularios de registro) y Authenticated
 */
router.get('/', generalRateLimit, getVacunas);

/**
 * @route GET /api/vacunas/:id
 * @desc Obtener una vacuna por ID
 * @access Public
 */
router.get('/:id', generalRateLimit, getVacunaById);

/**
 * @route POST /api/vacunas
 * @desc Crear nueva vacuna en el catálogo
 * @access Admin only
 */
router.post('/', authenticateToken, (req, res, next) => {
  // Verificar que sea administrador
  if (req.user.rol !== 'Admin') {
    logger.warn(`VacunaRoutes: Usuario ${req.user.email} intentó crear vacuna sin permisos`);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden crear vacunas.'
    });
  }
  next();
}, createVacuna);

/**
 * @route PUT /api/vacunas/:id
 * @desc Actualizar vacuna
 * @access Admin only
 */
router.put('/:id', authenticateToken, (req, res, next) => {
  // Verificar que sea administrador
  if (req.user.rol !== 'Admin') {
    logger.warn(`VacunaRoutes: Usuario ${req.user.email} intentó actualizar vacuna sin permisos`);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden actualizar vacunas.'
    });
  }
  next();
}, updateVacuna);

/**
 * @route DELETE /api/vacunas/:id
 * @desc Eliminar vacuna
 * @access Admin only
 */
router.delete('/:id', authenticateToken, (req, res, next) => {
  // Verificar que sea administrador
  if (req.user.rol !== 'Admin') {
    logger.warn(`VacunaRoutes: Usuario ${req.user.email} intentó eliminar vacuna sin permisos`);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden eliminar vacunas.'
    });
  }
  next();
}, deleteVacuna);

export default router;


