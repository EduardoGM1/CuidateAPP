// Rutas específicas para dispositivos móviles
import { Router } from 'express';
import { 
  registerMobileDevice, 
  unregisterMobileDevice,
  mobileLogin,
  refreshToken,
  getDeviceInfo,
  sendTestNotification,
  getRealtimeStats,
  getMobileConfig,
  generateTestTokenEndpoint,
  syncOfflineData
} from '../controllers/mobileController.js';

import { 
  mobileDeviceHandler, 
  validateMobileDevice, 
  trackDeviceActivity, 
  optimizeForMobile,
  mobileErrorHandler 
} from '../middlewares/mobileDevice.js';

import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { body, validationResult } from 'express-validator';
import { writeRateLimit, generalRateLimit } from '../middlewares/rateLimiting.js';

const router = Router();

// Aplicar middlewares específicos para móviles a todas las rutas
router.use(mobileDeviceHandler);
router.use(trackDeviceActivity);
router.use(optimizeForMobile);

// Validaciones específicas para móviles
const validateDeviceRegistration = [
  body('device_token')
    .isLength({ min: 50, max: 500 })
    .withMessage('Token de dispositivo inválido'),
  body('platform')
    .isIn(['android', 'ios', 'web'])
    .withMessage('Plataforma debe ser android, ios o web'),
  body('device_info')
    .optional()
    .isObject()
    .withMessage('Información del dispositivo debe ser un objeto')
];

const validateMobileLogin = [
  body('email')
    .isEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password debe tener al menos 6 caracteres')
];

const validateRefreshToken = [
  body('refresh_token')
    .notEmpty()
    .withMessage('Refresh token requerido')
];

const validateTestNotification = [
  body('message')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Mensaje demasiado largo'),
  body('type')
    .optional()
    .isIn(['test', 'info', 'warning', 'error'])
    .withMessage('Tipo de notificación inválido'),
  body('delay_seconds')
    .optional()
    .isInt({ min: 0, max: 3600 })
    .withMessage('Delay debe ser un número entre 0 y 3600 segundos'),
  body('title')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Título demasiado largo')
];

// Middleware de validación personalizado
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Datos de validación incorrectos',
      details: errors.array(),
      _mobile: {
        error_type: 'validation',
        timestamp: new Date().toISOString()
      }
    });
  }
  next();
};

// ========================================
// RUTAS PÚBLICAS (sin autenticación)
// ========================================

// Login optimizado para móviles
router.post('/login', 
  validateMobileLogin, 
  handleValidationErrors,
  // Rate limiting - DESHABILITADO EN DESARROLLO PARA POSTMAN
  ...(process.env.NODE_ENV === 'production' ? [generalRateLimit] : []),
  mobileLogin
);

// Renovar token
router.post('/refresh-token', 
  validateRefreshToken, 
  handleValidationErrors,
  // Rate limiting - DESHABILITADO EN DESARROLLO PARA POSTMAN
  ...(process.env.NODE_ENV === 'production' ? [generalRateLimit] : []),
  refreshToken
);

// Obtener configuración de la app móvil
router.get('/config', generalRateLimit, getMobileConfig);

// Generar token de prueba (solo desarrollo)
if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_ENDPOINTS === 'true') {
  router.get('/test-token', generateTestTokenEndpoint);
} else {
  router.get('/test-token', (req, res) => {
    res.status(403).json({
      success: false,
      error: 'Endpoint deshabilitado por seguridad',
      message: 'Este endpoint solo está disponible en desarrollo con ALLOW_DEV_ENDPOINTS=true'
    });
  });
}

// ========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ========================================

// Aplicar autenticación a todas las rutas siguientes
router.use(authenticateToken);

// Registrar dispositivo móvil
router.post('/device/register', 
  validateDeviceRegistration, 
  handleValidationErrors,
  writeRateLimit,
  registerMobileDevice
);

// Desregistrar dispositivo móvil
router.post('/device/unregister', 
  body('device_token').notEmpty().withMessage('Token de dispositivo requerido'),
  handleValidationErrors,
  writeRateLimit,
  unregisterMobileDevice
);

// Obtener información de dispositivos registrados
router.get('/device/info', getDeviceInfo);

// Enviar notificación de prueba (requiere autenticación)
router.post('/notification/test', 
  authenticateToken, // Requiere autenticación
  validateTestNotification, 
  handleValidationErrors,
  writeRateLimit,
  sendTestNotification
);

// Obtener estadísticas de WebSocket
router.get('/realtime/stats', getRealtimeStats);

// Sincronización offline
router.post('/sync/offline', 
  body('last_sync').optional().isISO8601().withMessage('Fecha de última sincronización inválida'),
  body('data').optional().isArray().withMessage('Datos debe ser un array'),
  handleValidationErrors,
  writeRateLimit,
  syncOfflineData
);

// ========================================
// RUTAS ESPECÍFICAS POR ROL
// ========================================

// Rutas específicas para pacientes
router.get('/patient/dashboard', 
  authorizeRoles('Paciente'),
  async (req, res) => {
    try {
      // Dashboard específico para pacientes móviles
      const dashboard = {
        upcoming_appointments: [],
        medication_reminders: [],
        recent_test_results: [],
        notifications: [],
        quick_actions: [
          { id: 'book_appointment', title: 'Agendar Cita', icon: 'calendar' },
          { id: 'view_results', title: 'Ver Resultados', icon: 'document' },
          { id: 'contact_doctor', title: 'Contactar Doctor', icon: 'message' },
          { id: 'emergency', title: 'Emergencia', icon: 'phone', urgent: true }
        ]
      };

      res.json({
        dashboard,
        last_updated: new Date().toISOString(),
        _mobile: {
          optimized: true,
          version: '1.0.0'
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Error obteniendo dashboard',
        details: error.message
      });
    }
  }
);

// Rutas específicas para doctores
router.get('/doctor/dashboard', 
  authorizeRoles('Doctor'),
  async (req, res) => {
    try {
      // Dashboard específico para doctores móviles
      const dashboard = {
        waiting_patients: [],
        today_appointments: [],
        pending_reports: [],
        notifications: [],
        quick_actions: [
          { id: 'view_patients', title: 'Ver Pacientes', icon: 'people' },
          { id: 'write_report', title: 'Escribir Reporte', icon: 'document' },
          { id: 'schedule', title: 'Horario', icon: 'calendar' },
          { id: 'emergency', title: 'Emergencia', icon: 'phone', urgent: true }
        ]
      };

      res.json({
        dashboard,
        last_updated: new Date().toISOString(),
        _mobile: {
          optimized: true,
          version: '1.0.0'
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Error obteniendo dashboard',
        details: error.message
      });
    }
  }
);

// ========================================
// RUTAS DE ADMINISTRACIÓN MÓVIL
// ========================================

// Obtener estadísticas de notificaciones push
router.get('/admin/push-stats', 
  authorizeRoles('Admin'),
  async (req, res) => {
    try {
      const pushNotificationService = await import('../services/pushNotificationService.js');
      const stats = await pushNotificationService.default.getNotificationStats();
      
      res.json({
        push_notification_stats: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Error obteniendo estadísticas de push',
        details: error.message
      });
    }
  }
);

// Limpiar tokens inactivos
router.post('/admin/cleanup-tokens', 
  authorizeRoles('Admin'),
  async (req, res) => {
    try {
      const pushNotificationService = await import('../services/pushNotificationService.js');
      const result = await pushNotificationService.default.cleanupInactiveTokens();
      
      res.json({
        message: 'Limpieza de tokens completada',
        result
      });
    } catch (error) {
      res.status(500).json({
        error: 'Error en limpieza de tokens',
        details: error.message
      });
    }
  }
);

// ========================================
// MANEJO DE ERRORES ESPECÍFICOS PARA MÓVILES
// ========================================

router.use(mobileErrorHandler);

export default router;
