import jwt from 'jsonwebtoken';
import { Usuario, Paciente } from '../models/associations.js';
import logger from '../utils/logger.js';

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // El token puede contener user_type o rol para identificar el tipo de usuario
    const userType = decoded.user_type || decoded.tipo;
    const userId = decoded.id || decoded.id_paciente || decoded.id_usuario;
    
    // Verificar según el tipo de usuario
    if (userType === 'Paciente' || decoded.rol === 'Paciente' || decoded.rol === 'paciente') {
      // Para pacientes, buscar en la tabla Paciente
      const paciente = await Paciente.findByPk(userId || decoded.id_paciente);
      
      if (!paciente || !paciente.activo) {
        logger.warn('Token de paciente inválido o inactivo', { 
          userId, 
          id_paciente: decoded.id_paciente,
          pacienteExists: !!paciente,
          pacienteActivo: paciente?.activo 
        });
        return res.status(401).json({ error: 'Token inválido o paciente inactivo' });
      }
      
      // Agregar información del paciente al request
      req.user = {
        ...decoded,
        id: paciente.id_paciente,
        id_paciente: paciente.id_paciente,
        rol: 'Paciente',
        user_type: 'Paciente'
      };
    } else {
      // Para Admin/Doctor, buscar en la tabla Usuario
      const usuario = await Usuario.findByPk(userId || decoded.id_usuario);
      
      if (!usuario || !usuario.activo) {
        logger.warn('Token de usuario inválido o inactivo', { 
          userId, 
          usuarioExists: !!usuario,
          usuarioActivo: usuario?.activo 
        });
        return res.status(401).json({ error: 'Token inválido' });
      }
      
      req.user = {
        ...decoded,
        id: usuario.id_usuario,
        id_usuario: usuario.id_usuario,
        rol: usuario.rol,
        user_type: usuario.rol
      };
    }

    logger.debug('Usuario autenticado', { 
      userId: req.user.id, 
      rol: req.user.rol,
      userType: req.user.user_type 
    });
    
    next();
  } catch (error) {
    logger.error('Error verificando token', { error: error.message });
    return res.status(403).json({ error: 'Token inválido' });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Aplanar el array de roles si viene como array de arrays
    const flatRoles = roles.flat();
    
    // Normalizar rol para comparación (case-insensitive)
    const userRol = req.user.rol?.toLowerCase();
    const hasPermission = flatRoles.some(role => 
      role?.toLowerCase() === userRol || 
      role?.toLowerCase() === req.user.user_type?.toLowerCase()
    );
    
    if (!hasPermission) {
      logger.warn('Acceso denegado por rol', { 
        userRol: req.user.rol, 
        userType: req.user.user_type,
        requiredRoles: flatRoles 
      });
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }

    next();
  };
};

/**
 * Middleware para permitir que los pacientes accedan solo a sus propios datos
 * O que Admin/Doctor accedan a cualquier paciente
 */
export const authorizePatientAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const userRol = req.user.rol?.toLowerCase();
  const userType = req.user.user_type?.toLowerCase();
  const pacienteId = parseInt(req.params.id) || parseInt(req.params.pacienteId);
  const userId = req.user.id_paciente || req.user.id;

  // Admin y Doctor pueden acceder a cualquier paciente
  if (userRol === 'admin' || userRol === 'doctor') {
    return next();
  }

  // Pacientes solo pueden acceder a sus propios datos
  if (userRol === 'paciente' || userType === 'paciente') {
    if (pacienteId && pacienteId !== userId) {
      logger.warn('Paciente intentando acceder a datos de otro paciente', {
        pacienteIdSolicitado: pacienteId,
        pacienteIdAutenticado: userId
      });
      return res.status(403).json({ error: 'Solo puedes acceder a tus propios datos' });
    }
    return next();
  }

  // Si no coincide ningún caso, denegar acceso
  logger.warn('Acceso denegado - rol no reconocido', { 
    userRol, 
    userType,
    pacienteId,
    userId 
  });
  return res.status(403).json({ error: 'Acceso denegado' });
};