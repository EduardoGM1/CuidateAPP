import express from 'express';
import { 
  getComorbilidades,
  getComorbilidadById,
  createComorbilidad,
  updateComorbilidad,
  deleteComorbilidad
} from '../controllers/comorbilidad.js';
import { authenticateToken } from '../middlewares/auth.js';
import { generalRateLimit } from '../middlewares/rateLimiting.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @route GET /api/comorbilidades
 * @desc Obtener todas las comorbilidades
 * @access Public (para formularios de registro) y Authenticated
 */
router.get('/', generalRateLimit, getComorbilidades);

/**
 * @route GET /api/comorbilidades/:id
 * @desc Obtener una comorbilidad por ID
 * @access Public
 */
router.get('/:id', generalRateLimit, getComorbilidadById);

/**
 * @route POST /api/comorbilidades
 * @desc Crear nueva comorbilidad
 * @access Admin only
 */
router.post('/', authenticateToken, (req, res, next) => {
  // Verificar que sea administrador
  if (req.user.rol !== 'Admin') {
    logger.warn(`ComorbilidadRoutes: Usuario ${req.user.email} intentó crear comorbilidad sin permisos`);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden crear comorbilidades.'
    });
  }
  next();
}, createComorbilidad);

/**
 * @route PUT /api/comorbilidades/:id
 * @desc Actualizar comorbilidad
 * @access Admin only
 */
router.put('/:id', authenticateToken, (req, res, next) => {
  // Verificar que sea administrador
  if (req.user.rol !== 'Admin') {
    logger.warn(`ComorbilidadRoutes: Usuario ${req.user.email} intentó actualizar comorbilidad sin permisos`);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden actualizar comorbilidades.'
    });
  }
  next();
}, updateComorbilidad);

/**
 * @route DELETE /api/comorbilidades/:id
 * @desc Eliminar comorbilidad
 * @access Admin only
 */
router.delete('/:id', authenticateToken, (req, res, next) => {
  // Verificar que sea administrador
  if (req.user.rol !== 'Admin') {
    logger.warn(`ComorbilidadRoutes: Usuario ${req.user.email} intentó eliminar comorbilidad sin permisos`);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden eliminar comorbilidades.'
    });
  }
  next();
}, deleteComorbilidad);

export default router;
