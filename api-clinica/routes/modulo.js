import express from 'express';
import { 
  getModulos, 
  getModuloById, 
  createModulo, 
  updateModulo, 
  deleteModulo 
} from '../controllers/modulo.js';
import { authenticateToken } from '../middlewares/auth.js';
import { generalRateLimit } from '../middlewares/rateLimiting.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @route GET /api/modulos
 * @desc Obtener todos los módulos
 * @access Public (para formularios de registro)
 */
router.get('/', generalRateLimit, getModulos);

/**
 * @route GET /api/modulos/:id
 * @desc Obtener un módulo por ID
 * @access Public
 */
router.get('/:id', generalRateLimit, getModuloById);

/**
 * @route POST /api/modulos
 * @desc Crear nuevo módulo
 * @access Admin only
 */
router.post('/', authenticateToken, (req, res, next) => {
  // Verificar que sea administrador
  if (req.user.rol !== 'Admin') {
    logger.warn(`ModuloRoutes: Usuario ${req.user.email} intentó crear módulo sin permisos`);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden crear módulos.'
    });
  }
  next();
}, createModulo);

/**
 * @route PUT /api/modulos/:id
 * @desc Actualizar módulo
 * @access Admin only
 */
router.put('/:id', authenticateToken, (req, res, next) => {
  // Verificar que sea administrador
  if (req.user.rol !== 'Admin') {
    logger.warn(`ModuloRoutes: Usuario ${req.user.email} intentó actualizar módulo sin permisos`);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden actualizar módulos.'
    });
  }
  next();
}, updateModulo);

/**
 * @route DELETE /api/modulos/:id
 * @desc Eliminar módulo
 * @access Admin only
 */
router.delete('/:id', authenticateToken, (req, res, next) => {
  // Verificar que sea administrador
  if (req.user.rol !== 'Admin') {
    logger.warn(`ModuloRoutes: Usuario ${req.user.email} intentó eliminar módulo sin permisos`);
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo administradores pueden eliminar módulos.'
    });
  }
  next();
}, deleteModulo);

export default router;



