// Middleware para detectar y manejar dispositivos móviles
import { Usuario } from '../models/associations.js';

export const mobileDeviceHandler = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Mobile|Android|iPhone|iPad|ReactNative|Expo/.test(userAgent);
  const isTablet = /iPad|Android.*Tablet/.test(userAgent);
  
  // Detectar plataforma
  let platform = 'unknown';
  if (userAgent.includes('Android')) platform = 'android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) platform = 'ios';
  else if (userAgent.includes('ReactNative')) platform = 'react-native';
  else if (userAgent.includes('Expo')) platform = 'expo';
  
  // Detectar tipo de cliente
  let clientType = 'web';
  if (isMobile && !isTablet) clientType = 'mobile';
  else if (isTablet) clientType = 'tablet';
  else if (userAgent.includes('ReactNative') || userAgent.includes('Expo')) clientType = 'app';
  
  req.device = {
    isMobile,
    isTablet,
    platform,
    clientType,
    deviceId: req.headers['x-device-id'],
    appVersion: req.headers['x-app-version'],
    pushToken: req.headers['x-push-token'],
    deviceInfo: req.headers['x-device-info'],
    userAgent: userAgent.substring(0, 200) // Limitar tamaño
  };
  
  // Log para debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`📱 Device detected: ${clientType} - ${platform} - ${req.device.deviceId || 'no-id'}`);
  }
  
  next();
};

// Middleware para validar información de dispositivo móvil
export const validateMobileDevice = (req, res, next) => {
  // Si es un dispositivo móvil, requerir device-id
  if (req.device.isMobile && !req.device.deviceId) {
    return res.status(400).json({
      error: 'Device ID requerido para dispositivos móviles',
      code: 'MISSING_DEVICE_ID'
    });
  }
  
  next();
};

// Middleware para registrar actividad de dispositivo
export const trackDeviceActivity = async (req, res, next) => {
  try {
    // Solo trackear si hay usuario autenticado y device info
    if (req.user && req.device.deviceId) {
      const deviceData = {
        device_id: req.device.deviceId,
        platform: req.device.platform,
        client_type: req.device.clientType,
        app_version: req.device.appVersion,
        push_token: req.device.pushToken,
        last_activity: new Date(),
        ip_address: req.ip,
        user_agent: req.device.userAgent
      };
      
      // Aquí podrías guardar en una tabla de device_activity
      // Por ahora solo logueamos
      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 Device activity: ${req.user.email} - ${req.device.platform}`);
      }
    }
  } catch (error) {
    // No fallar la request por errores de tracking
    console.error('Error tracking device activity:', error.message);
  }
  
  next();
};

// Middleware para optimizar respuestas para móviles
export const optimizeForMobile = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Si es dispositivo móvil, optimizar respuesta
    if (req.device.isMobile) {
      // Reducir tamaño de respuesta
      if (typeof data === 'object' && data !== null) {
        // Remover campos innecesarios para móviles
        if (data.usuario) {
          delete data.usuario.password_hash;
          delete data.usuario.fecha_creacion;
        }
        
        // Agregar metadatos móviles
        data._mobile = {
          optimized: true,
          timestamp: new Date().toISOString(),
          client_type: req.device.clientType
        };
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Middleware para manejar errores específicos de móviles
export const mobileErrorHandler = (err, req, res, next) => {
  if (req.device.isMobile) {
    // Personalizar errores para móviles
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Datos inválidos',
        details: err.errors.map(e => ({
          field: e.path,
          message: e.message
        })),
        _mobile: {
          error_type: 'validation',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Sesión expirada',
        code: 'TOKEN_EXPIRED',
        _mobile: {
          error_type: 'auth',
          action: 'login_required'
        }
      });
    }
  }
  
  next(err);
};
