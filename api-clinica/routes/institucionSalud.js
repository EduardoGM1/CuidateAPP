import express from 'express';
import {
  getInstitucionesSalud,
  getInstitucionSaludById,
  createInstitucionSalud,
  updateInstitucionSalud,
  deleteInstitucionSalud
} from '../controllers/institucionSalud.js';
import { authenticateToken } from '../middlewares/auth.js';
import { generalRateLimit } from '../middlewares/rateLimiting.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/', generalRateLimit, getInstitucionesSalud);
router.get('/:id', generalRateLimit, getInstitucionSaludById);

router.post('/', authenticateToken, (req, res, next) => {
  if (req.user.rol !== 'Admin') {
    logger.warn(`InstitucionSaludRoutes: ${req.user.email} intentó crear sin ser Admin`);
    return res.status(403).json({ success: false, message: 'Solo administradores pueden crear instituciones.' });
  }
  next();
}, createInstitucionSalud);

router.put('/:id', authenticateToken, (req, res, next) => {
  if (req.user.rol !== 'Admin') {
    logger.warn(`InstitucionSaludRoutes: ${req.user.email} intentó actualizar sin ser Admin`);
    return res.status(403).json({ success: false, message: 'Solo administradores pueden actualizar instituciones.' });
  }
  next();
}, updateInstitucionSalud);

router.delete('/:id', authenticateToken, (req, res, next) => {
  if (req.user.rol !== 'Admin') {
    logger.warn(`InstitucionSaludRoutes: ${req.user.email} intentó eliminar sin ser Admin`);
    return res.status(403).json({ success: false, message: 'Solo administradores pueden eliminar instituciones.' });
  }
  next();
}, deleteInstitucionSalud);

export default router;
