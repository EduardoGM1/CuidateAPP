import logger from '../utils/logger.js';

// Contador de intentos fallidos por IP
const failedAttempts = new Map();
const FAILED_ATTEMPTS_LIMIT = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos

// Middleware para detectar ataques de fuerza bruta
export const bruteForceProtection = (req, res, next) => {
  const clientIP = req.ip;
  const now = Date.now();
  
  if (failedAttempts.has(clientIP)) {
    const attempts = failedAttempts.get(clientIP);
    
    // Limpiar intentos antiguos
    attempts.timestamps = attempts.timestamps.filter(
      timestamp => now - timestamp < BLOCK_DURATION
    );
    
    if (attempts.timestamps.length >= FAILED_ATTEMPTS_LIMIT) {
      logger.warn('Brute Force Attack Detected', {
        ip: clientIP,
        attempts: attempts.timestamps.length,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl
      });
      
      return res.status(429).json({
        error: 'Demasiados intentos fallidos. Intente más tarde.',
        retryAfter: Math.ceil(BLOCK_DURATION / 1000)
      });
    }
  }
  
  // Interceptar respuestas de error de autenticación
  const originalSend = res.send;
  res.send = function(data) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      if (!failedAttempts.has(clientIP)) {
        failedAttempts.set(clientIP, { timestamps: [] });
      }
      failedAttempts.get(clientIP).timestamps.push(now);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Detector de patrones de ataque
export const attackPatternDetector = (req, res, next) => {
  const suspiciousPatterns = {
    sqlInjection: /(\b(union|select|insert|delete|drop|create|alter|exec|execute)\b|['";\-\|\*])/gi,
    xss: /(<script|javascript:|vbscript:|onload=|onerror=|onclick=)/gi,
    pathTraversal: /(\.\.|\/etc\/|\/proc\/|\/sys\/|\\windows\\|\\system32\\)/gi,
    commandInjection: /(\||&|;|`|\$\(|\${)/g
  };
  
  const requestData = JSON.stringify({
    url: req.originalUrl,
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers
  });
  
  for (const [attackType, pattern] of Object.entries(suspiciousPatterns)) {
    if (pattern.test(requestData)) {
      logger.error('Attack Pattern Detected', {
        attackType,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        pattern: pattern.toString(),
        timestamp: new Date().toISOString()
      });
      
      // En producción, podrías bloquear la request aquí
      if (process.env.NODE_ENV === 'production' && attackType === 'sqlInjection') {
        return res.status(400).json({
          error: 'Request bloqueada por razones de seguridad'
        });
      }
    }
  }
  
  next();
};

// Monitor de acceso a datos sensibles
export const sensitiveDataMonitor = (req, res, next) => {
  const sensitiveEndpoints = [
    '/api/pacientes',
    '/api/doctores',
    '/api/diagnosticos',
    '/api/signos-vitales'
  ];
  
  const isSensitive = sensitiveEndpoints.some(endpoint => 
    req.originalUrl.startsWith(endpoint)
  );
  
  if (isSensitive) {
    logger.info('Sensitive Data Access', {
      user: req.user?.id || 'anonymous',
      role: req.user?.rol || 'none',
      ip: req.ip,
      endpoint: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};