// Servicio de logging para React Native DevTools
class Logger {
  static log(level, message, data = null) {
    // No loggear en producción a menos que sea error
    if (!__DEV__ && level !== 'error') {
      return;
    }

    const timestamp = new Date().toISOString();
    
    // Sanitizar datos sensibles antes de loggear
    const sanitizedData = this._sanitizeData(data);
    
    const logEntry = {
      timestamp,
      level,
      message,
      data: sanitizedData,
      platform: 'mobile'
    };

    // Log en consola de React Native solo en desarrollo
    if (__DEV__) {
      console.log(`[${level.toUpperCase()}] ${timestamp}: ${message}`, sanitizedData || '');
      
      // Log específico por nivel
      switch (level) {
        case 'error':
          console.error(`[ERROR] ${message}`, sanitizedData);
          break;
        case 'warn':
          console.warn(`[WARN] ${message}`, sanitizedData);
          break;
        case 'info':
          console.info(`[INFO] ${message}`, sanitizedData);
          break;
        case 'debug':
          console.debug(`[DEBUG] ${message}`, sanitizedData);
          break;
        default:
          console.log(`[LOG] ${message}`, sanitizedData);
      }
    } else {
      // En producción, solo loggear errores críticos
      if (level === 'error') {
        console.error(`[ERROR] ${timestamp}: ${message}`);
      }
    }
  }

  /**
   * Sanitiza datos sensibles antes de loggear
   * Cumple con normas de protección de datos (LGPD, NOM)
   * @private
   */
  static _sanitizeData(data) {
    if (!data) return data;
    
    // Importar utilidad de seguridad para sanitización mejorada
    try {
      const { sanitizeForLogging } = require('../utils/securityUtils');
      return sanitizeForLogging(data);
    } catch (error) {
      // Fallback a sanitización básica si no se puede importar
    }
    
    if (typeof data === 'object') {
      // Detectar eventos de React Native (synthetic events)
      if (data && (data.nativeEvent || data._targetInst || data.dispatchConfig)) {
        return '[React Native Event]';
      }
      
      // Detectar objetos de error de axios
      if (data && data.isAxiosError) {
        return {
          message: data.message,
          code: data.code,
          status: data.response?.status,
          statusText: data.response?.statusText,
          url: data.config?.url
        };
      }
      
      const sanitized = { ...data };
      const sensitiveKeys = [
        'password', 'token', 'secret', 'apiKey', 'api_key', 'authorization', 'auth', 
        'refreshToken', 'accessToken', 'pin', 'curp', 'fecha_nacimiento', 'fechaNacimiento',
        'direccion', 'dirección', 'telefono', 'teléfono', 'numero_celular', 'numeroCelular',
        'diagnostico', 'diagnóstico', 'medicamento', 'medicamentos', 'signos_vitales',
        'presion_arterial', 'glucosa', 'historial_medico'
      ];
      
      for (const key in sanitized) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
          sanitized[key] = '***REDACTED***';
        } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          // Evitar serializar eventos de React
          if (sanitized[key].nativeEvent || sanitized[key]._targetInst || sanitized[key].dispatchConfig) {
            sanitized[key] = '[React Native Event]';
          } else {
            sanitized[key] = this._sanitizeData(sanitized[key]);
          }
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  static error(message, data = null) {
    this.log('error', message, data);
  }

  static warn(message, data = null) {
    this.log('warn', message, data);
  }

  static info(message, data = null) {
    this.log('info', message, data);
  }

  static debug(message, data = null) {
    this.log('debug', message, data);
  }

  static success(message, data = null) {
    this.log('info', `✅ ${message}`, data);
  }

  static apiCall(method, url, data = null) {
    this.log('info', `🌐 API ${method.toUpperCase()} ${url}`, data);
  }

  static apiResponse(url, status, data = null) {
    const level = status >= 400 ? 'error' : 'info';
    this.log(level, `📡 API Response ${status} ${url}`, data);
  }

  static navigation(from, to) {
    this.log('info', `🧭 Navigation: ${from} → ${to}`);
  }

  static auth(action, userType = null) {
    this.log('info', `🔐 Auth ${action}${userType ? ` (${userType})` : ''}`);
  }

  static storage(action, key = null) {
    this.log('debug', `💾 Storage ${action}${key ? `: ${key}` : ''}`);
  }
}

export default Logger;

