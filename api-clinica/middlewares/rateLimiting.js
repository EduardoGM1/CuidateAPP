import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { shouldSkipAuthRateLimit } from '../utils/rateLimitConfig.js';

// Rate limiting general para API - MEJORADO PARA DESARROLLO
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'test' ? 1000 : 100, // Más permisivo en tests
  message: {
    error: 'Demasiadas solicitudes, intenta de nuevo más tarde',
    retryAfter: '15 minutos',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Función segura para IPv6 con mejor identificación
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const userId = req.user?.id || 'anonymous';
    const userAgent = req.get('User-Agent')?.substring(0, 50) || 'unknown';
    return `${ip}:${userId}:${Buffer.from(userAgent).toString('base64').substring(0, 10)}`;
  },
  // Skip para tests y health checks
  skip: (req) => {
    return req.path === '/health' || 
           req.path === '/api/health' ||
           process.env.NODE_ENV === 'test' ||
           (process.env.NODE_ENV === 'development' && req.get('X-Test-Mode') === 'true');
  }
});

// Rate limiting estricto para autenticación - MEJORADO PARA DESARROLLO
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'test' ? 100 : Number(process.env.AUTH_RATE_LIMIT_MAX || 5),
  message: {
    error: 'Demasiados intentos de autenticación, cuenta bloqueada temporalmente',
    retryAfter: '15 minutos',
    lockoutTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar requests exitosos
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const email = req.body?.email || 'unknown';
    return `auth:${ip}:${Buffer.from(email).toString('base64').substring(0, 10)}`;
  },
  // Skip para tests y desarrollo
  skip: (req) => shouldSkipAuthRateLimit(req),
  // Handler personalizado para logging (v7 compatible)
  handler: (req, res, next, options) => {
    console.warn('Auth rate limit reached:', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      email: req.body?.email || 'unknown',
      userAgent: req.get('User-Agent')
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Rate limiting específico para login PIN (más estricto para prevenir fuerza bruta)
export const pinLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'test' ? 100 : 5, // Máximo 5 intentos por IP
  message: {
    error: 'Demasiados intentos de login con PIN. Intenta de nuevo en 15 minutos',
    retryAfter: '15 minutos',
    lockoutTime: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar requests exitosos
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const pin = req.body?.pin || 'unknown';
    // Incluir PIN en la clave para detectar intentos repetidos del mismo PIN
    return `pin-auth:${ip}:${pin}`;
  },
  // Skip para tests y desarrollo
  skip: (req) => {
    return process.env.NODE_ENV === 'test' || 
           (process.env.NODE_ENV === 'development' && req.get('X-Test-Mode') === 'true');
  },
  // Handler personalizado para logging
  handler: (req, res, next, options) => {
    console.warn('🚨 PIN login rate limit reached:', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      pinLength: req.body?.pin?.length || 0,
      userAgent: req.get('User-Agent'),
      hasDeviceId: !!req.body?.device_id
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Rate limiting para búsquedas (prevenir scraping) - MEJORADO PARA DESARROLLO
// 100 búsquedas/minuto por usuario (detalle paciente = muchas GET en paralelo)
export const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: process.env.NODE_ENV === 'test' ? 1000 : 100,
  message: {
    error: 'Demasiadas búsquedas, espera un momento',
    retryAfter: '1 minuto'
  },
  keyGenerator: (req) => {
    return ipKeyGenerator(req) + ':search:' + (req.user?.id || 'anonymous');
  },
  // Skip para tests y desarrollo
  skip: (req) => {
    return process.env.NODE_ENV === 'test' || 
           (process.env.NODE_ENV === 'development' && req.get('X-Test-Mode') === 'true');
  }
});

// Rate limiting para operaciones de escritura - MEJORADO PARA DESARROLLO
export const writeRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: process.env.NODE_ENV === 'development' ? 200 : 30, // Más permisivo en desarrollo
  message: {
    error: 'Demasiadas operaciones de escritura, espera un momento',
    retryAfter: '5 minutos'
  },
  keyGenerator: (req) => {
    return ipKeyGenerator(req) + ':write:' + (req.user?.id || 'anonymous');
  },
  // Skip para tests y desarrollo
  skip: (req) => {
    return process.env.NODE_ENV === 'test' || 
           (process.env.NODE_ENV === 'development' && req.get('X-Test-Mode') === 'true');
  }
});

// Middleware para detectar comportamiento sospechoso - MEJORADO PARA DESARROLLO
export const suspiciousActivityDetector = (req, res, next) => {
  // Skip para tests y desarrollo
  if (process.env.NODE_ENV === 'test' || 
      (process.env.NODE_ENV === 'development' && req.get('X-Test-Mode') === 'true')) {
    return next();
  }

  const suspiciousPatterns = [
    // Patrones de SQL injection optimizados
    /\b(union|select|insert|delete|update|drop|create|alter|exec|execute|truncate|grant|revoke)\b/i,
    // Patrones de XSS optimizados
    /<script[^>]{0,50}>|javascript:|on\w{1,20}\s*=|<iframe|<object|<embed/i,
    // Patrones de path traversal
    /\.\.[/\\]|\.\.(\%2f|\%5c)/i,
    // Patrones de command injection
    /[;&|`$(){}]|(\%3b|\%26|\%7c)/i,
    // Patrones de LDAP injection
    /[()=*!&|]{1,3}/,
    // Patrones de NoSQL injection
    /\$(where|ne|gt|lt|regex)/i
  ];

  const checkValue = (value, depth = 0) => {
    if (depth > 5) return false; // Prevenir recursión profunda
    
    if (typeof value === 'string') {
      // Decodificar URL para detectar patrones ocultos
      const decoded = decodeURIComponent(value).toLowerCase();
      return suspiciousPatterns.some(pattern => pattern.test(decoded));
    }
    return false;
  };

  const checkObject = (obj, depth = 0) => {
    if (depth > 3) return false; // Limitar profundidad
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (checkObject(obj[key], depth + 1)) return true;
        } else if (checkValue(obj[key], depth) || checkValue(key, depth)) {
          return true;
        }
      }
    }
    return false;
  };

  // Verificar headers sospechosos
  const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip'];
  for (const header of suspiciousHeaders) {
    const value = req.get(header);
    if (value && checkValue(value)) {
      logSuspiciousActivity(req, 'suspicious_header', { header, value });
      return res.status(400).json({
        error: 'Solicitud rechazada por motivos de seguridad',
        code: 'SUSPICIOUS_HEADER'
      });
    }
  }

  // Verificar URL, query params, body
  if (checkValue(req.url) || checkObject(req.query) || checkObject(req.body)) {
    logSuspiciousActivity(req, 'suspicious_content');
    return res.status(400).json({
      error: 'Solicitud rechazada por motivos de seguridad',
      code: 'SUSPICIOUS_CONTENT'
    });
  }

  next();
};

// Función auxiliar para logging mejorado
function logSuspiciousActivity(req, type, extra = {}) {
  const logData = {
    timestamp: new Date().toISOString(),
    type,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.url,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    headers: {
      'content-type': req.get('content-type'),
      'accept': req.get('accept'),
      'referer': req.get('referer')
    },
    ...extra
  };
  
  console.warn('🚨 Actividad sospechosa detectada:', logData);
  
  // En producción, enviar a sistema de monitoreo
  if (process.env.NODE_ENV === 'production') {
    // Aquí se podría integrar con servicios como Sentry, DataDog, etc.
  }
}