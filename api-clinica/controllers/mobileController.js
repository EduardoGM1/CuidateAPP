// Controladores específicos para dispositivos móviles
import { Usuario, Paciente } from '../models/associations.js';
import pushNotificationService from '../services/pushNotificationService.js';
import realtimeService from '../services/realtimeService.js';
import { generateTestToken } from '../utils/mobileAuth.js';
import logger from '../utils/logger.js';

// Registrar dispositivo móvil
export const registerMobileDevice = async (req, res) => {
  try {
    const { device_token, platform, device_info } = req.body;
    
    // Log inicial para diagnóstico
    logger.info('📱 Intento de registro de dispositivo', {
      hasToken: !!device_token,
      tokenLength: device_token?.length || 0,
      platform,
      userRole: req.user?.rol,
      userType: req.user?.user_type,
      userId: req.user?.id,
      idPaciente: req.user?.id_paciente,
      idUsuario: req.user?.id_usuario
    });
    
    if (!device_token || !platform) {
      logger.warn('⚠️ Registro de dispositivo fallido: datos faltantes', {
        hasToken: !!device_token,
        hasPlatform: !!platform
      });
      return res.status(400).json({
        error: 'Token de dispositivo y plataforma requeridos',
        code: 'MISSING_DEVICE_DATA'
      });
    }

    // Obtener id_usuario correcto según el tipo de usuario
    let userId = req.user.id_usuario || req.user.id;
    
    // Si es un paciente, obtener su id_usuario de la tabla Paciente
    if (req.user.rol === 'Paciente' || req.user.user_type === 'Paciente') {
      logger.info('🔍 Detectado paciente, buscando id_usuario...', {
        id_paciente: req.user.id_paciente || req.user.id
      });
      
      const paciente = await Paciente.findByPk(req.user.id_paciente || req.user.id, {
        attributes: ['id_paciente', 'id_usuario']
      });
      
      if (!paciente) {
        logger.error('❌ Paciente no encontrado en registro de token', {
          id_paciente: req.user.id_paciente || req.user.id
        });
        return res.status(404).json({
          error: 'Paciente no encontrado',
          code: 'PATIENT_NOT_FOUND'
        });
      }
      
      if (!paciente.id_usuario) {
        logger.error('❌ Paciente sin id_usuario asociado', {
          id_paciente: paciente.id_paciente
        });
        return res.status(400).json({
          error: 'El paciente no tiene un usuario asociado. Las notificaciones push requieren un usuario.',
          code: 'PATIENT_NO_USER'
        });
      }
      
      userId = paciente.id_usuario;
      logger.info('✅ Registrando token para paciente', {
        id_paciente: paciente.id_paciente,
        id_usuario: userId,
        platform,
        tokenPreview: device_token?.substring(0, 30) + '...'
      });
    } else {
      logger.info('✅ Registrando token para usuario no-paciente', {
        id_usuario: userId,
        platform,
        rol: req.user.rol
      });
    }

    const result = await pushNotificationService.registerDeviceToken(
      userId,
      device_token,
      platform,
      device_info
    );

    logger.info('✅ Token registrado exitosamente', {
      id_usuario: userId,
      platform,
      success: result.success
    });

    res.json({
      message: 'Dispositivo registrado exitosamente',
      ...result
    });
  } catch (error) {
    logger.error('❌ Error registrando dispositivo:', {
      message: error.message,
      stack: error.stack,
      userRole: req.user?.rol,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Error registrando dispositivo',
      details: error.message
    });
  }
};

// Desregistrar dispositivo móvil
export const unregisterMobileDevice = async (req, res) => {
  try {
    const { device_token } = req.body;
    
    // Obtener id_usuario correcto según el tipo de usuario
    let userId = req.user.id_usuario || req.user.id;
    
    // Si es un paciente, obtener su id_usuario de la tabla Paciente
    if (req.user.rol === 'Paciente' || req.user.user_type === 'Paciente') {
      const paciente = await Paciente.findByPk(req.user.id_paciente || req.user.id, {
        attributes: ['id_paciente', 'id_usuario']
      });
      
      if (!paciente || !paciente.id_usuario) {
        return res.status(404).json({
          error: 'Paciente no encontrado o sin usuario asociado',
          code: 'PATIENT_NOT_FOUND'
        });
      }
      
      userId = paciente.id_usuario;
    }

    const result = await pushNotificationService.unregisterDeviceToken(userId, device_token);

    res.json(result);
  } catch (error) {
    logger.error('Error desregistrando dispositivo:', error.message);
    res.status(500).json({
      error: 'Error desregistrando dispositivo',
      details: error.message
    });
  }
};

// Login optimizado para móviles (Doctor/Admin - usado por la app)
export const mobileLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const deviceInfo = req.device || { platform: 'unknown', clientType: 'app', deviceId: 'unknown' };

    const emailNorm = (email || '').trim().toLowerCase();
    const passwordStr = typeof password === 'string' ? password : (password != null ? String(password) : '');

    const usuario = await Usuario.findOne({
      where: { email: emailNorm, activo: true }
    });

    if (!usuario) {
      logger.info('Mobile login 401: usuario no encontrado', { email: emailNorm });
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Solo Doctor y Admin pueden usar este endpoint
    if (!['Doctor', 'Admin'].includes(usuario.rol)) {
      return res.status(403).json({
        success: false,
        error: 'Este login es solo para personal médico',
        code: 'FORBIDDEN_ROLE'
      });
    }

    // Misma lógica que auth.js: 1) auth_credentials (rol o Usuario), 2) fallback usuarios.password_hash
    const UnifiedAuthService = (await import('../services/unifiedAuthService.js')).default;
    let passwordValid = false;
    let authAttempts = [];

    const tryUnified = async (userType) => {
      await UnifiedAuthService.authenticate(
        userType,
        usuario.id_usuario,
        { method: 'password', credential: passwordStr }
      );
    };

    try {
      await tryUnified(usuario.rol);
      passwordValid = true;
      authAttempts.push(`unified:${usuario.rol}:ok`);
    } catch (authError1) {
      authAttempts.push(`unified:${usuario.rol}:${authError1.message}`);
      if (authError1.message && authError1.message.includes('Credencial no encontrada') && (usuario.rol === 'Doctor' || usuario.rol === 'Admin')) {
        try {
          await tryUnified('Usuario');
          passwordValid = true;
          authAttempts.push('unified:Usuario:ok');
        } catch (authError2) {
          authAttempts.push(`unified:Usuario:${authError2.message}`);
        }
      }
    }

    if (!passwordValid && usuario.password_hash) {
      const bcrypt = await import('bcryptjs');
      try {
        passwordValid = await bcrypt.compare(passwordStr, usuario.password_hash);
        authAttempts.push(passwordValid ? 'password_hash:ok' : 'password_hash:no_match');
      } catch (_) {
        authAttempts.push('password_hash:error');
      }
    } else if (!passwordValid) {
      authAttempts.push('password_hash:empty');
    }

    if (!passwordValid) {
      logger.info('Mobile login 401: contraseña inválida', { email: usuario.email, attempts: authAttempts.join(', ') });
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    await usuario.update({
      last_mobile_login: new Date(),
      ultimo_login: new Date()
    });

    let id_doctor = null;
    if (usuario.rol === 'Doctor') {
      const { Doctor } = await import('../models/associations.js');
      const doctor = await Doctor.findOne({
        where: { id_usuario: usuario.id_usuario },
        attributes: ['id_doctor']
      });
      if (doctor) id_doctor = doctor.id_doctor;
    }

    // Usar RefreshTokenService para tokens con expiración según rol (Admin/Doctor: 10h)
    const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
    const tokenPair = await RefreshTokenService.generateTokenPair({
      id: usuario.id_usuario,
      email: usuario.email,
      rol: usuario.rol
    }, usuario.rol);

    res.json({
      success: true,
      message: 'Login exitoso',
      token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      refreshToken: tokenPair.refreshToken,
      expires_in: tokenPair.expiresIn,
      refresh_token_expires_in: tokenPair.refreshTokenExpiresIn,
      usuario: {
        id: usuario.id_usuario,
        id_usuario: usuario.id_usuario,
        email: usuario.email,
        rol: usuario.rol,
        ...(id_doctor != null && { id_doctor }),
        last_mobile_login: usuario.last_mobile_login
      },
      device_info: {
        platform: deviceInfo.platform,
        client_type: deviceInfo.clientType,
        device_id: deviceInfo.deviceId
      }
    });
  } catch (error) {
    console.error('Error en mobile login:', error.message);
    res.status(500).json({
      success: false,
      error: 'Error en el login',
      details: error.message
    });
  }
};

// Renovar token
export const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token requerido',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    logger.info('🔄 [MOBILE REFRESH] Renovando token desde endpoint móvil', {
      hasRefreshToken: !!refresh_token,
      refreshTokenLength: refresh_token?.length || 0
    });

    // ✅ Usar RefreshTokenService unificado en lugar del sistema antiguo
    const RefreshTokenService = (await import('../services/refreshTokenService.js')).default;
    const tokenPair = await RefreshTokenService.refreshAccessToken(refresh_token);
    
    logger.info('✅ [MOBILE REFRESH] Token renovado exitosamente desde endpoint móvil', {
      expiresIn: tokenPair.expiresIn,
      refreshTokenExpiresIn: tokenPair.refreshTokenExpiresIn
    });

    // Formato de respuesta consistente con el endpoint /api/auth/refresh-token
    res.json({
      success: true,
      message: 'Token renovado exitosamente',
      token: tokenPair.accessToken,
      refresh_token: tokenPair.refreshToken,
      expires_in: tokenPair.expiresIn,
      refresh_token_expires_in: tokenPair.refreshTokenExpiresIn
    });
  } catch (error) {
    logger.warn('Error renovando token desde endpoint móvil', {
      error: error.message,
      stack: error.stack
    });
    
    // Determinar código de error apropiado
    let errorCode = 'REFRESH_TOKEN_ERROR';
    if (error.message?.includes('expirado') || error.message?.includes('expired')) {
      errorCode = 'REFRESH_TOKEN_EXPIRED';
    } else if (error.message?.includes('inválido') || error.message?.includes('invalid')) {
      errorCode = 'INVALID_REFRESH_TOKEN';
    }
    
    res.status(401).json({
      success: false,
      error: error.message || 'Error renovando token',
      code: errorCode
    });
  }
};

// Obtener información del dispositivo
export const getDeviceInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    const usuario = await Usuario.findByPk(userId);

    if (!usuario || !usuario.device_tokens) {
      return res.json({
        registered_devices: [],
        total_devices: 0
      });
    }

    const devices = usuario.device_tokens.map(token => ({
      platform: token.platform,
      registered_at: token.registered_at,
      last_used: token.last_used,
      active: token.active,
      device_info: token.device_info
    }));

    res.json({
      registered_devices: devices,
      total_devices: devices.length,
      current_device: {
        platform: req.device.platform,
        device_id: req.device.deviceId,
        client_type: req.device.clientType
      }
    });
  } catch (error) {
    console.error('Error obteniendo info del dispositivo:', error.message);
    res.status(500).json({
      error: 'Error obteniendo información del dispositivo',
      details: error.message
    });
  }
};

// Enviar notificación de prueba
export const sendTestNotification = async (req, res) => {
  try {
    const { message, type = 'test', delay_seconds = 0, title } = req.body;
    const userId = req.user.id;

    const notification = {
      type,
      title: title || 'Notificación de Prueba',
      message: message || 'Esta es una notificación de prueba desde la API',
      data: {
        test: true,
        timestamp: Date.now(),
        app_closed_test: true
      }
    };

    // Si hay delay, programar la notificación para después
    if (delay_seconds > 0) {
      // Programar notificación para después usando setTimeout
      setTimeout(async () => {
        try {
          logger.info('⏰ Ejecutando notificación programada...', { userId, delay_seconds });
          const result = await pushNotificationService.sendPushNotification(userId, notification);
          logger.info('✅ Notificación de prueba programada enviada', { 
            userId, 
            delay_seconds,
            result: result
          });
        } catch (error) {
          logger.error('❌ Error enviando notificación programada:', {
            userId,
            delay_seconds,
            error: error.message,
            code: error.code
          });
        }
      }, delay_seconds * 1000);

      res.json({
        message: `Notificación de prueba programada para ${delay_seconds} segundos`,
        scheduled: true,
        delay_seconds,
        will_send_at: new Date(Date.now() + delay_seconds * 1000).toISOString(),
        timestamp: new Date().toISOString()
      });
    } else {
      // Enviar inmediatamente
      logger.info('📤 Enviando notificación de prueba inmediatamente...', { userId });
      const result = await pushNotificationService.sendPushNotification(userId, notification);

      logger.info('✅ Resultado de notificación de prueba:', {
        userId,
        success: result.success,
        sent_to: result.sent_to,
        results: result.results
      });

      res.json({
        message: 'Notificación de prueba enviada',
        timestamp: new Date().toISOString(),
        ...result
      });
    }
  } catch (error) {
    console.error('Error enviando notificación de prueba:', error.message);
    res.status(500).json({
      error: 'Error enviando notificación',
      details: error.message
    });
  }
};

// Obtener estadísticas de WebSocket
export const getRealtimeStats = async (req, res) => {
  try {
    const stats = realtimeService.getConnectionStats();
    
    res.json({
      websocket_stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error obteniendo stats de tiempo real:', error.message);
    res.status(500).json({
      error: 'Error obteniendo estadísticas',
      details: error.message
    });
  }
};

/**
 * Origen público https://host (o http en local) para la app móvil y Socket.IO.
 * Detrás de Nginx usar X-Forwarded-Proto / X-Forwarded-Host.
 * Override: PUBLIC_SOCKET_URL en .env (ej. https://cuidateapp.com.mx).
 */
function resolvePublicApiOrigin(req) {
  const override = process.env.PUBLIC_SOCKET_URL?.trim();
  if (override) {
    return override.replace(/\/$/, '');
  }
  const forwardedProto = (req.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  const proto =
    forwardedProto === 'https' || forwardedProto === 'http'
      ? forwardedProto
      : req.secure
        ? 'https'
        : 'http';
  const host = (req.get('x-forwarded-host') || req.get('host') || '').trim();
  if (!host) {
    return `http://127.0.0.1:${process.env.PORT || 3000}`;
  }
  return `${proto}://${host}`;
}

// Obtener configuración de la app móvil
export const getMobileConfig = async (req, res) => {
  try {
    const publicOrigin = resolvePublicApiOrigin(req);
    const config = {
      api_version: '1.0.0',
      min_app_version: '1.0.0',
      features: {
        biometric_auth: true,
        push_notifications: true,
        realtime_updates: true,
        offline_sync: true,
        dark_mode: true
      },
      endpoints: {
        // Socket.IO-client acepta el mismo origen que REST (https://…)
        websocket_url: publicOrigin,
        api_base_url: `${publicOrigin}/api`,
        push_service_url: `${publicOrigin}/api/mobile/push`
      },
      limits: {
        max_file_size: '10MB',
        max_requests_per_minute: 100,
        token_expiry_hours: 2
      },
      timestamp: new Date().toISOString()
    };

    res.json(config);
  } catch (error) {
    console.error('Error obteniendo configuración móvil:', error.message);
    res.status(500).json({
      error: 'Error obteniendo configuración',
      details: error.message
    });
  }
};

// Generar token de prueba para desarrollo
export const generateTestTokenEndpoint = async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        error: 'Solo disponible en desarrollo',
        code: 'DEVELOPMENT_ONLY'
      });
    }

    const { user_type = 'patient', platform = 'test' } = req.query;
    const deviceInfo = {
      device_id: req.device.deviceId || 'test-device-123',
      platform,
      client_type: 'app'
    };

    const token = generateTestToken(user_type, deviceInfo);

    res.json({
      message: 'Token de prueba generado',
      token,
      expires_in: 86400, // 24 horas para testing
      user_type,
      platform,
      device_info: deviceInfo
    });
  } catch (error) {
    console.error('Error generando token de prueba:', error.message);
    res.status(500).json({
      error: 'Error generando token de prueba',
      details: error.message
    });
  }
};

// Sincronización de datos para modo offline
export const syncOfflineData = async (req, res) => {
  try {
    const { last_sync, data } = req.body;
    const userId = req.user.id;

    // Aquí implementarías la lógica de sincronización
    const syncResult = {
      sync_id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      conflicts: [],
      updated_records: [],
      deleted_records: []
    };

    // Simular procesamiento de datos offline
    if (data && data.length > 0) {
      syncResult.updated_records = data.map(record => ({
        id: record.id,
        type: record.type,
        status: 'synced',
        server_timestamp: new Date().toISOString()
      }));
    }

    res.json({
      message: 'Sincronización completada',
      sync_result: syncResult
    });
  } catch (error) {
    console.error('Error en sincronización offline:', error.message);
    res.status(500).json({
      error: 'Error en sincronización',
      details: error.message
    });
  }
};

