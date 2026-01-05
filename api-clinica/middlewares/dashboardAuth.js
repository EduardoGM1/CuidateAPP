import jwt from 'jsonwebtoken';
import { Usuario, DoctorPaciente } from '../models/index.js';
import logger from '../utils/logger.js';

// Middleware para autenticar usuarios
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuario en la base de datos
    const usuario = await Usuario.findByPk(decoded.id);
    
    if (!usuario || !usuario.activo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido o inactivo'
      });
    }

    // Agregar información del usuario al request
    req.user = {
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol
    };

    logger.info('Usuario autenticado', {
      userId: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol,
      ip: req.ip
    });

    next();
  } catch (error) {
    logger.error('Error en autenticación', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno de autenticación'
    });
  }
};

// Middleware para requerir rol específico
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.rol;
      
      if (!userRole) {
        return res.status(401).json({
          success: false,
          message: 'Información de usuario no disponible'
        });
      }

      // Verificar si el rol del usuario está permitido
      const isAllowed = allowedRoles.includes(userRole);
      
      if (!isAllowed) {
        logger.warn('Acceso denegado por rol', {
          userId: req.user.id_usuario,
          userRole,
          allowedRoles,
          ip: req.ip,
          endpoint: req.path
        });

        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. Rol insuficiente.',
          requiredRoles: allowedRoles,
          currentRole: userRole
        });
      }

      logger.info('Acceso autorizado', {
        userId: req.user.id_usuario,
        userRole,
        endpoint: req.path
      });

      next();
    } catch (error) {
      logger.error('Error en autorización', error);
      return res.status(500).json({
        success: false,
        message: 'Error interno de autorización'
      });
    }
  };
};

// Middleware específico para administradores
export const requireAdmin = requireRole(['Admin']);

// Middleware específico para doctores
export const requireDoctor = requireRole(['Doctor']);

// Middleware para administradores o doctores
export const requireAdminOrDoctor = requireRole(['Admin', 'Doctor']);

// Middleware para validar acceso a paciente específico
export const validatePatientAccess = async (req, res, next) => {
  try {
    const { pacienteId } = req.params;
    const userId = req.user.id_usuario;
    const userRole = req.user.rol;

    // Los administradores tienen acceso a todos los pacientes
    if (userRole === 'Admin') {
      return next();
    }

    // Para doctores, verificar si tienen acceso al paciente
    if (userRole === 'Doctor') {
      const hasAccess = await DoctorPaciente.findOne({
        where: {
          id_doctor: userId,
          id_paciente: pacienteId
        }
      });

      if (!hasAccess) {
        logger.warn('Doctor sin acceso al paciente', {
          doctorId: userId,
          pacienteId,
          ip: req.ip
        });

        return res.status(403).json({
          success: false,
          message: 'No tiene acceso a este paciente'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Error validando acceso al paciente', error);
    return res.status(500).json({
      success: false,
      message: 'Error validando acceso'
    });
  }
};

// Middleware para rate limiting por usuario
export const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const userId = req.user?.id_usuario;
    
    if (!userId) {
      return next();
    }

    const now = Date.now();
    const userRequests = requests.get(userId) || { count: 0, resetTime: now + windowMs };

    // Resetear contador si la ventana de tiempo ha expirado
    if (now > userRequests.resetTime) {
      userRequests.count = 0;
      userRequests.resetTime = now + windowMs;
    }

    // Incrementar contador
    userRequests.count++;
    requests.set(userId, userRequests);

    // Verificar límite
    if (userRequests.count > maxRequests) {
      logger.warn('Rate limit excedido', {
        userId,
        count: userRequests.count,
        maxRequests,
        ip: req.ip
      });

      return res.status(429).json({
        success: false,
        message: 'Demasiadas solicitudes. Intente más tarde.',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    }

    // Agregar headers informativos
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': maxRequests - userRequests.count,
      'X-RateLimit-Reset': new Date(userRequests.resetTime).toISOString()
    });

    next();
  };
};

export default {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireDoctor,
  requireAdminOrDoctor,
  validatePatientAccess,
  userRateLimit
};
