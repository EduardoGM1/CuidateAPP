import { Router } from 'express';
import { authenticateToken, authorizeRoles, authorizePatientAccess } from '../middlewares/auth.js';
import { searchRateLimit, writeRateLimit } from '../middlewares/rateLimiting.js';
import * as mensajeChatController from '../controllers/mensajeChat.js';
import { Doctor, DoctorPaciente } from '../models/associations.js';
import logger from '../utils/logger.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * Middleware para validar acceso a conversaciones de doctor
 * Solo el doctor propietario o Admin pueden acceder
 */
const validateDoctorAccess = async (req, res, next) => {
  try {
    const { idDoctor } = req.params;
    const userId = req.user?.id_usuario || req.user?.id;
    const userRole = req.user?.rol;

    // Admin tiene acceso completo
    if (userRole === 'Admin' || userRole === 'admin') {
      return next();
    }

    // Si es doctor, verificar que el idDoctor corresponde al usuario autenticado
    if (userRole === 'Doctor' || userRole === 'doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: userId },
        attributes: ['id_doctor']
      });
      
      if (doctor && doctor.id_doctor === parseInt(idDoctor)) {
        return next();
      }
      
      logger.warn('Intento de acceso no autorizado a conversaciones de doctor', {
        userId,
        idDoctorSolicitado: idDoctor,
        idDoctorAutenticado: doctor?.id_doctor
      });
      
      return res.status(403).json({ 
        success: false, 
        error: 'No tienes permiso para acceder a estas conversaciones' 
      });
    }

    return res.status(403).json({ 
      success: false, 
      error: 'Acceso denegado' 
    });
  } catch (error) {
    logger.error('Error validando acceso a conversaciones de doctor', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

/**
 * Middleware para validar acceso a conversación específica
 * Paciente solo puede ver sus propias conversaciones
 * Doctor solo puede ver conversaciones con pacientes asignados
 * Admin tiene acceso completo
 */
const validateConversationAccess = async (req, res, next) => {
  try {
    const { idPaciente, idDoctor } = req.params;
    const userId = req.user?.id_usuario || req.user?.id;
    const userRole = req.user?.rol;
    const pacienteId = req.user?.id_paciente || req.user?.id;

    // Admin tiene acceso completo
    if (userRole === 'Admin' || userRole === 'admin') {
      return next();
    }

    // Si es paciente, verificar que es su propia conversación
    if (userRole === 'Paciente' || userRole === 'paciente') {
      if (parseInt(idPaciente) === pacienteId) {
        return next();
      }
      
      logger.warn('Paciente intentando acceder a conversación de otro paciente', {
        pacienteIdAutenticado: pacienteId,
        pacienteIdSolicitado: idPaciente
      });
      
      return res.status(403).json({ 
        success: false, 
        error: 'Solo puedes acceder a tus propias conversaciones' 
      });
    }

    // Si es doctor, verificar que tiene acceso al paciente
    if (userRole === 'Doctor' || userRole === 'doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: userId },
        attributes: ['id_doctor']
      });
      
      if (!doctor) {
        return res.status(403).json({ 
          success: false, 
          error: 'Doctor no encontrado' 
        });
      }

      // Verificar que el idDoctor corresponde al doctor autenticado
      if (idDoctor && parseInt(idDoctor) !== doctor.id_doctor) {
        logger.warn('Doctor intentando acceder a conversación de otro doctor', {
          doctorIdAutenticado: doctor.id_doctor,
          doctorIdSolicitado: idDoctor
        });
        return res.status(403).json({ 
          success: false, 
          error: 'No tienes permiso para acceder a esta conversación' 
        });
      }

      // Verificar que el doctor tiene acceso al paciente
      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: parseInt(idPaciente)
        }
      });

      if (!asignacion) {
        logger.warn('Doctor intentando acceder a conversación con paciente no asignado', {
          doctorId: doctor.id_doctor,
          pacienteId: idPaciente
        });
        return res.status(403).json({ 
          success: false, 
          error: 'No tienes acceso a este paciente' 
        });
      }

      return next();
    }

    return res.status(403).json({ 
      success: false, 
      error: 'Acceso denegado' 
    });
  } catch (error) {
    logger.error('Error validando acceso a conversación', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

// Obtener lista de conversaciones de un doctor (debe ir antes de rutas dinámicas)
router.get('/doctor/:idDoctor/conversaciones', 
  validateDoctorAccess,
  searchRateLimit, 
  mensajeChatController.getConversacionesDoctor
);

// Obtener conversación entre paciente y doctor
router.get('/paciente/:idPaciente/doctor/:idDoctor', 
  validateConversationAccess,
  searchRateLimit, 
  mensajeChatController.getConversacion
);

// Obtener mensajes de un paciente
router.get('/paciente/:idPaciente', 
  authorizePatientAccess,
  searchRateLimit, 
  mensajeChatController.getMensajesPaciente
);

// Obtener mensajes no leídos de un paciente
router.get('/paciente/:idPaciente/no-leidos', searchRateLimit, mensajeChatController.getMensajesNoLeidos);

/**
 * Middleware para validar que el usuario puede enviar mensaje
 * Paciente solo puede enviar como paciente a sus doctores asignados
 * Doctor solo puede enviar como doctor a pacientes asignados
 */
const validateMessageCreation = async (req, res, next) => {
  try {
    const { id_paciente, remitente } = req.body;
    const userId = req.user?.id_usuario || req.user?.id;
    const userRole = req.user?.rol;
    const pacienteId = req.user?.id_paciente || req.user?.id;

    // Admin puede enviar como cualquier rol
    if (userRole === 'Admin' || userRole === 'admin') {
      return next();
    }

    // Validar que el remitente coincide con el rol del usuario
    if (remitente === 'Paciente') {
      if (userRole !== 'Paciente' && userRole !== 'paciente') {
        return res.status(403).json({ 
          success: false, 
          error: 'No autorizado para enviar como paciente' 
        });
      }
      
      // Verificar que el paciente es el usuario autenticado
      if (parseInt(id_paciente) !== pacienteId) {
        logger.warn('Paciente intentando enviar mensaje como otro paciente', {
          pacienteIdAutenticado: pacienteId,
          pacienteIdSolicitado: id_paciente
        });
        return res.status(403).json({ 
          success: false, 
          error: 'Solo puedes enviar mensajes desde tu propia cuenta' 
        });
      }
    } else if (remitente === 'Doctor') {
      if (userRole !== 'Doctor' && userRole !== 'doctor' && userRole !== 'Admin') {
        return res.status(403).json({ 
          success: false, 
          error: 'No autorizado para enviar como doctor' 
        });
      }

      // Verificar que el doctor tiene acceso al paciente
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: userId },
        attributes: ['id_doctor']
      });

      if (!doctor) {
        return res.status(403).json({ 
          success: false, 
          error: 'Doctor no encontrado' 
        });
      }

      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: parseInt(id_paciente)
        }
      });

      if (!asignacion) {
        logger.warn('Doctor intentando enviar mensaje a paciente no asignado', {
          doctorId: doctor.id_doctor,
          pacienteId: id_paciente
        });
        return res.status(403).json({ 
          success: false, 
          error: 'No tienes acceso a este paciente' 
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Error validando creación de mensaje', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor' 
    });
  }
};

// Crear nuevo mensaje
router.post('/', 
  validateMessageCreation,
  writeRateLimit, 
  mensajeChatController.createMensaje
);

// Marcar mensaje como leído
router.put('/:id/leido', writeRateLimit, mensajeChatController.marcarComoLeido);

// Actualizar mensaje
router.put('/:id', writeRateLimit, authorizeRoles('Admin', 'Doctor', 'Paciente'), mensajeChatController.updateMensaje);

// Marcar todos los mensajes de una conversación como leídos
router.put('/paciente/:idPaciente/doctor/:idDoctor/leer-todos', 
  validateConversationAccess,
  writeRateLimit, 
  mensajeChatController.marcarTodosComoLeidos
);

// Eliminar mensaje
router.delete('/:id', writeRateLimit, authorizeRoles('Admin', 'Doctor', 'Paciente'), mensajeChatController.deleteMensaje);

// Subir archivo de audio
router.post('/upload-audio', writeRateLimit, mensajeChatController.uploadAudioMiddleware, mensajeChatController.uploadAudio);

export default router;