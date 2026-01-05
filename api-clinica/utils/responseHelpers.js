import logger from './logger.js';

// Response helpers para reducir código repetitivo
export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data
  });
};

export const sendError = (res, message, statusCode = 400, details = null) => {
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details })
  });
};

export const sendNotFound = (res, resource = 'Recurso') => {
  sendError(res, `${resource} no encontrado`, 404);
};

export const sendUnauthorized = (res, message = 'No autorizado') => {
  sendError(res, message, 403);
};

export const sendServerError = (res, errorOrMessage) => {
  if (errorOrMessage instanceof Error) {
    logger.error('Server Error:', { 
      error: errorOrMessage.message, 
      stack: errorOrMessage.stack,
      name: errorOrMessage.name,
      originalError: errorOrMessage.original?.message || errorOrMessage.original,
      sql: errorOrMessage.sql || errorOrMessage.original?.sql
    });
    
    // En desarrollo, incluir más detalles en la respuesta
    const errorResponse = {
      success: false,
      error: 'Error interno del servidor',
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          message: errorOrMessage.message,
          name: errorOrMessage.name
        }
      })
    };
    
    res.status(500).json(errorResponse);
  } else {
    logger.error('Server Error:', { message: errorOrMessage });
    sendError(res, errorOrMessage || 'Error interno del servidor', 500);
  }
};