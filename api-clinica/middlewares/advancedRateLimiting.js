import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';

/**
 * Sistema de Rate Limiting avanzado con protección contra ataques
 */
class AdvancedRateLimiting {
  
  /**
   * Rate limiter general para endpoints públicos
   */
  static generalLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // máximo 100 requests por IP por ventana
      message: {
        error: 'Demasiadas solicitudes desde esta IP',
        retryAfter: '15 minutos',
        code: 'RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Demasiadas solicitudes desde esta IP',
          retryAfter: '15 minutos',
          code: 'RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          ip: req.ip
        });
      },
      skip: (req) => {
        // Saltar rate limiting para IPs de confianza
        const trustedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
        return trustedIPs.includes(req.ip);
      }
    });
  }

  /**
   * Rate limiter estricto para autenticación - MEJORADO PARA DESARROLLO
   */
  static authLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: process.env.NODE_ENV === 'test' ? 100 : 5, // Más permisivo en tests
      message: {
        error: 'Demasiados intentos de autenticación',
        retryAfter: '15 minutos',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Demasiados intentos de autenticación',
          retryAfter: '15 minutos',
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      },
      // Skip para tests y desarrollo
      skip: (req) => {
        return process.env.NODE_ENV === 'test' || 
               (process.env.NODE_ENV === 'development' && req.get('X-Test-Mode') === 'true');
      },
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    });
  }

  /**
   * Rate limiter para registro de usuarios
   */
  static registrationLimiter() {
    return rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hora
      max: 3, // máximo 3 registros por IP por hora
      message: {
        error: 'Demasiados intentos de registro',
        retryAfter: '1 hora',
        code: 'REGISTRATION_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Demasiados intentos de registro',
          retryAfter: '1 hora',
          code: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          ip: req.ip
        });
      }
    });
  }

  /**
   * Rate limiter para operaciones CRUD
   */
  static crudLimiter() {
    return rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutos
      max: 50, // máximo 50 operaciones CRUD por IP por 5 minutos
      message: {
        error: 'Demasiadas operaciones CRUD',
        retryAfter: '5 minutos',
        code: 'CRUD_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Demasiadas operaciones CRUD',
          retryAfter: '5 minutos',
          code: 'CRUD_RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          ip: req.ip,
          endpoint: req.path,
          method: req.method
        });
      }
    });
  }

  /**
   * Rate limiter para endpoints de API móvil
   */
  static mobileLimiter() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 30, // máximo 30 requests por dispositivo por minuto
      message: {
        error: 'Demasiadas solicitudes desde dispositivo móvil',
        retryAfter: '1 minuto',
        code: 'MOBILE_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Demasiadas solicitudes desde dispositivo móvil',
          retryAfter: '1 minuto',
          code: 'MOBILE_RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          deviceId: req.headers['x-device-id'] || 'unknown',
          platform: req.headers['x-platform'] || 'unknown'
        });
      },
      keyGenerator: (req) => {
        // Usar device ID si está disponible, sino IP
        const deviceId = req.headers['x-device-id'];
        return deviceId ? `mobile-${deviceId}` : `mobile-${req.ip}`;
      }
    });
  }

  /**
   * Rate limiter para WebSockets
   */
  static websocketLimiter() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 100, // máximo 100 mensajes por conexión por minuto
      message: {
        error: 'Demasiados mensajes WebSocket',
        retryAfter: '1 minuto',
        code: 'WEBSOCKET_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Demasiados mensajes WebSocket',
          retryAfter: '1 minuto',
          code: 'WEBSOCKET_RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          socketId: req.headers['x-socket-id'] || 'unknown'
        });
      },
      keyGenerator: (req) => {
        const socketId = req.headers['x-socket-id'];
        return socketId ? `ws-${socketId}` : `ws-${req.ip}`;
      }
    });
  }

  /**
   * Rate limiter para búsquedas
   */
  static searchLimiter() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 20, // máximo 20 búsquedas por IP por minuto
      message: {
        error: 'Demasiadas búsquedas',
        retryAfter: '1 minuto',
        code: 'SEARCH_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Demasiadas búsquedas',
          retryAfter: '1 minuto',
          code: 'SEARCH_RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          ip: req.ip,
          searchQuery: req.query.q ? req.query.q.substring(0, 50) : 'unknown'
        });
      }
    });
  }

  /**
   * Rate limiter para subida de archivos
   */
  static uploadLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 10, // máximo 10 subidas por IP por 15 minutos
      message: {
        error: 'Demasiadas subidas de archivos',
        retryAfter: '15 minutos',
        code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Demasiadas subidas de archivos',
          retryAfter: '15 minutos',
          code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          ip: req.ip
        });
      }
    });
  }

  /**
   * Rate limiter para notificaciones push
   */
  static notificationLimiter() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 5, // máximo 5 notificaciones por usuario por minuto
      message: {
        error: 'Demasiadas notificaciones',
        retryAfter: '1 minuto',
        code: 'NOTIFICATION_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Demasiadas notificaciones',
          retryAfter: '1 minuto',
          code: 'NOTIFICATION_RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          userId: req.user?.id || 'unknown'
        });
      },
      keyGenerator: (req) => {
        const userId = req.user?.id;
        return userId ? `notification-${userId}` : `notification-${req.ip}`;
      }
    });
  }

  /**
   * Rate limiter dinámico basado en el tipo de usuario
   */
  static dynamicLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: (req) => {
        // Límites diferentes según el rol del usuario
        const userRole = req.user?.rol;
        switch (userRole) {
          case 'Admin':
            return 1000; // Admins tienen límites más altos
          case 'Doctor':
            return 500; // Doctores tienen límites medios
          case 'Paciente':
            return 100; // Pacientes tienen límites normales
          default:
            return 50; // Usuarios no autenticados tienen límites bajos
        }
      },
      message: {
        error: 'Límite de solicitudes excedido para tu rol',
        retryAfter: '15 minutos',
        code: 'DYNAMIC_RATE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Límite de solicitudes excedido para tu rol',
          retryAfter: '15 minutos',
          code: 'DYNAMIC_RATE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          userRole: req.user?.rol || 'unauthenticated',
          userId: req.user?.id || 'unknown'
        });
      }
    });
  }

  /**
   * Rate limiter para prevenir ataques de fuerza bruta - MEJORADO PARA DESARROLLO
   */
  static bruteForceLimiter() {
    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: process.env.NODE_ENV === 'test' ? 100 : 3, // Más permisivo en tests
      message: {
        error: 'Demasiados intentos fallidos',
        retryAfter: '15 minutos',
        code: 'BRUTE_FORCE_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Demasiados intentos fallidos',
          retryAfter: '15 minutos',
          code: 'BRUTE_FORCE_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path
        });
      },
      // Skip para tests y desarrollo
      skip: (req) => {
        return process.env.NODE_ENV === 'test' || 
               (process.env.NODE_ENV === 'development' && req.get('X-Test-Mode') === 'true');
      },
      skipSuccessfulRequests: true, // Solo contar requests fallidos
      skipFailedRequests: false
    });
  }

  /**
   * Rate limiter para prevenir ataques DDoS
   */
  static ddosLimiter() {
    return rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minuto
      max: 200, // máximo 200 requests por IP por minuto
      message: {
        error: 'Actividad sospechosa detectada',
        retryAfter: '1 minuto',
        code: 'DDOS_LIMIT_EXCEEDED'
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        res.status(429).json({
          error: 'Actividad sospechosa detectada',
          retryAfter: '1 minuto',
          code: 'DDOS_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }
    });
  }
}

export default AdvancedRateLimiting;
