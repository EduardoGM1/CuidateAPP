import logger from '../utils/logger.js';

// Middleware para auditoría de acciones sensibles
export const auditLogger = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log de auditoría
      logger.info('Security Audit', {
        action,
        user: req.user?.id || 'anonymous',
        role: req.user?.rol || 'none',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date().toISOString(),
        statusCode: res.statusCode,
        success: res.statusCode < 400
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Detectar intentos de acceso no autorizado
export const securityMonitor = (req, res, next) => {
  const suspiciousPatterns = [
    /(\.\.|\/etc\/|\/proc\/|\/sys\/)/i,
    /(union|select|insert|delete|drop|create|alter)/i,
    /(<script|javascript:|vbscript:|onload=|onerror=)/i
  ];
  
  const requestData = JSON.stringify({
    url: req.originalUrl,
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(requestData)
  );
  
  if (isSuspicious) {
    logger.warn('Suspicious Activity Detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method,
      data: requestData,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};