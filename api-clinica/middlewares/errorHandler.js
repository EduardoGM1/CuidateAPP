import { validationResult } from 'express-validator';
import auditoriaService from '../services/auditoriaService.js';

// Middleware para manejar errores de validación
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log del error para auditoría (sin datos sensibles)
    console.log(`Validation error for ${req.method} ${req.path}:`, {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      errors: errors.array().map(err => ({ field: err.param, message: err.msg }))
    });

    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Middleware global para manejo de errores
export const globalErrorHandler = (err, req, res, next) => {
  // Log completo del error para debugging (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.error('Error completo:', err);
  }

  // Log seguro para producción (incluye mensaje para depuración)
  console.log(`Error en ${req.method} ${req.path}:`, {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    errorType: err.name,
    errorMessage: err.message,
    userId: req.user?.id || 'anonymous'
  });

  // Respuestas de error seguras (sin información sensible)
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Error de validación de datos',
      details: err.errors.map(e => ({
        field: e.path,
        message: 'Valor no válido'
      }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: 'El registro ya existe',
      field: err.errors[0]?.path || 'unknown'
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Referencia inválida a otro registro'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token de autenticación inválido'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token de autenticación expirado'
    });
  }

  // Determinar si es un error crítico que debe registrarse en auditoría
  const esErrorCritico = 
    !err.statusCode || 
    err.statusCode >= 500 || 
    err.name === 'SequelizeDatabaseError' ||
    err.name === 'SequelizeConnectionError' ||
    err.name === 'SequelizeTimeoutError';

  // Registrar errores críticos en auditoría (asíncrono, no bloquea)
  if (esErrorCritico) {
    const ip_address = req.ip || req.connection.remoteAddress || null;
    const user_agent = req.get('User-Agent') || null;
    const severidad = err.statusCode >= 500 ? 'critical' : 'error';
    
    auditoriaService.registrarErrorSistema(err, {
      method: req.method,
      path: req.path,
      id_usuario: req.user?.id_usuario || null,
      ip_address,
      user_agent,
      requestId: req.id
    }, severidad).catch(auditError => {
      // No fallar si la auditoría falla
      console.error('Error registrando en auditoría:', auditError.message);
    });
  }

  // Error genérico para producción
  res.status(500).json({
    error: 'Error interno del servidor',
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown'
  });
};

// Middleware para generar ID único por request
export const generateRequestId = (req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
};