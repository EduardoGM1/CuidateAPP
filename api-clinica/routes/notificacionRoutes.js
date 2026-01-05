/**
 * Routes para Notificaciones de Doctores
 */

import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.js';
import {
  getNotificacionesDoctor,
  marcarNotificacionLeida,
  marcarNotificacionMensajeLeida,
  archivarNotificacion,
  getContadorNotificaciones
} from '../controllers/notificacionController.js';
import { Doctor } from '../models/associations.js';
import logger from '../utils/logger.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * Middleware para validar acceso a notificaciones de doctor
 * Solo el doctor propietario o Admin pueden acceder
 */
const validateDoctorNotificationsAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id_usuario || req.user?.id;
    const userRole = req.user?.rol;

    // Admin tiene acceso completo
    if (userRole === 'Admin' || userRole === 'admin') {
      return next();
    }

    // Si es doctor, verificar que el id corresponde al usuario autenticado
    if (userRole === 'Doctor' || userRole === 'doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: userId },
        attributes: ['id_doctor']
      });
      
      if (doctor && doctor.id_doctor === parseInt(id)) {
        return next();
      }
      
      logger.warn('Intento de acceso no autorizado a notificaciones de doctor', {
        userId,
        idDoctorSolicitado: id,
        idDoctorAutenticado: doctor?.id_doctor
      });
      
      return res.status(403).json({ 
        success: false, 
        error: 'No tienes permiso para acceder a estas notificaciones' 
      });
    }

    return res.status(403).json({ 
      success: false, 
      error: 'Acceso denegado' 
    });
  } catch (error) {
    logger.error('Error validando acceso a notificaciones de doctor', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * @route GET /api/doctores/:id/notificaciones
 * @desc Obtener notificaciones de un doctor
 * @access Doctor (propio) o Admin
 */
router.get('/:id/notificaciones', 
  validateDoctorNotificationsAccess,
  getNotificacionesDoctor
);

/**
 * @route GET /api/doctores/:id/notificaciones/contador
 * @desc Obtener contador de notificaciones no leídas
 * @access Doctor (propio) o Admin
 */
router.get('/:id/notificaciones/contador', 
  validateDoctorNotificationsAccess,
  getContadorNotificaciones
);

/**
 * @route PUT /api/doctores/:id/notificaciones/:notificacionId/leida
 * @desc Marcar notificación como leída
 * @access Doctor (propio) o Admin
 */
router.put('/:id/notificaciones/:notificacionId/leida', 
  validateDoctorNotificationsAccess,
  marcarNotificacionLeida
);

/**
 * @route PUT /api/doctores/:id/notificaciones/mensaje/:pacienteId/leida
 * @desc Marcar notificación de mensaje como leída por pacienteId
 * @access Doctor (propio) o Admin
 */
router.put('/:id/notificaciones/mensaje/:pacienteId/leida', 
  validateDoctorNotificationsAccess,
  marcarNotificacionMensajeLeida
);

/**
 * @route PUT /api/doctores/:id/notificaciones/:notificacionId/archivar
 * @desc Archivar notificación
 * @access Doctor (propio) o Admin
 */
router.put('/:id/notificaciones/:notificacionId/archivar', 
  validateDoctorNotificationsAccess,
  archivarNotificacion
);

export default router;

