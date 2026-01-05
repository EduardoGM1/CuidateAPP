/**
 * Logger especializado para WebSocket
 * Proporciona logs con emojis y formato distintivo para facilitar la identificación
 */

import Logger from './logger';

// Emojis para diferentes tipos de eventos
const EMOJIS = {
  // Estados de conexión
  CONNECTED: '🟢',
  DISCONNECTED: '🔴',
  CONNECTING: '🟡',
  ERROR: '❌',
  WARNING: '⚠️',
  
  // Eventos de citas
  CITA_CREADA: '📅',
  CITA_ACTUALIZADA: '🔄',
  CITA_REPROGRAMADA: '📝',
  SOLICITUD_REPROGRAMACION: '✉️',
  
  // Eventos de signos vitales
  SIGNOS_VITALES: '💓',
  ALERTA_CRITICA: '🚨',
  ALERTA_MODERADA: '⚠️',
  
  // Eventos de notificaciones
  NOTIFICACION: '🔔',
  
  // Eventos de pacientes/doctores
  PACIENTE_ASIGNADO: '👤',
  PACIENTE_DESASIGNADO: '👋',
  DOCTOR_CREADO: '👨‍⚕️',
  
  // General
  INFO: 'ℹ️',
  DEBUG: '🔍',
  SUCCESS: '✅',
  RECEIVED: '📥',
  SENT: '📤',
  SUBSCRIBE: '📡',
  UNSUBSCRIBE: '📴'
};

// Colores para consola (solo en desarrollo)
const COLORS = {
  WEBSOCKET: '\x1b[36m', // Cyan
  EVENT: '\x1b[33m',     // Yellow
  ERROR: '\x1b[31m',      // Red
  SUCCESS: '\x1b[32m',    // Green
  WARNING: '\x1b[93m',    // Bright Yellow
  INFO: '\x1b[34m',       // Blue
  RESET: '\x1b[0m'        // Reset
};

class WSLogger {
  /**
   * Log de conexión WebSocket
   */
  static connection(message, data = {}) {
    const logMessage = `${EMOJIS.CONNECTED} [WS-CONNECTION] ${message}`;
    if (__DEV__) {
      console.log(`${COLORS.WEBSOCKET}${logMessage}${COLORS.RESET}`, data);
    }
    Logger.info(logMessage, data);
  }

  /**
   * Log de desconexión WebSocket
   */
  static disconnection(message, data = {}) {
    const logMessage = `${EMOJIS.DISCONNECTED} [WS-DISCONNECTION] ${message}`;
    if (__DEV__) {
      console.log(`${COLORS.WEBSOCKET}${logMessage}${COLORS.RESET}`, data);
    }
    Logger.warn(logMessage, data);
  }

  /**
   * Log de evento recibido
   */
  static eventReceived(eventName, data = {}) {
    const emoji = this.getEmojiForEvent(eventName);
    const logMessage = `${emoji} [WS-RECEIVED] ${eventName}`;
    if (__DEV__) {
      console.log(`${COLORS.EVENT}${logMessage}${COLORS.RESET}`, data);
    }
    Logger.info(logMessage, data);
  }

  /**
   * Log de evento enviado
   */
  static eventSent(eventName, data = {}) {
    const emoji = this.getEmojiForEvent(eventName);
    const logMessage = `${emoji} [WS-SENT] ${eventName}`;
    if (__DEV__) {
      console.log(`${COLORS.EVENT}${logMessage}${COLORS.RESET}`, data);
    }
    Logger.debug(logMessage, data);
  }

  /**
   * Log de suscripción a evento
   */
  static subscribed(eventName, details = {}) {
    const logMessage = `${EMOJIS.SUBSCRIBE} [WS-SUBSCRIBE] ${eventName}`;
    if (__DEV__) {
      console.log(`${COLORS.INFO}${logMessage}${COLORS.RESET}`, details);
    }
    Logger.info(logMessage, details);
  }

  /**
   * Log de desuscripción de evento
   */
  static unsubscribed(eventName) {
    const logMessage = `${EMOJIS.UNSUBSCRIBE} [WS-UNSUBSCRIBE] ${eventName}`;
    if (__DEV__) {
      console.log(`${COLORS.INFO}${logMessage}${COLORS.RESET}`);
    }
    Logger.debug(logMessage);
  }

  /**
   * Log de error WebSocket
   */
  static error(message, error = {}) {
    const logMessage = `${EMOJIS.ERROR} [WS-ERROR] ${message}`;
    if (__DEV__) {
      console.error(`${COLORS.ERROR}${logMessage}${COLORS.RESET}`, error);
    }
    Logger.error(logMessage, error);
  }

  /**
   * Log de advertencia WebSocket
   */
  static warning(message, data = {}) {
    const logMessage = `${EMOJIS.WARNING} [WS-WARNING] ${message}`;
    if (__DEV__) {
      console.warn(`${COLORS.WARNING}${logMessage}${COLORS.RESET}`, data);
    }
    Logger.warn(logMessage, data);
  }

  /**
   * Log de información WebSocket
   */
  static info(message, data = {}) {
    const logMessage = `${EMOJIS.INFO} [WS-INFO] ${message}`;
    if (__DEV__) {
      console.log(`${COLORS.INFO}${logMessage}${COLORS.RESET}`, data);
    }
    Logger.info(logMessage, data);
  }

  /**
   * Log de éxito WebSocket
   */
  static success(message, data = {}) {
    const logMessage = `${EMOJIS.SUCCESS} [WS-SUCCESS] ${message}`;
    if (__DEV__) {
      console.log(`${COLORS.SUCCESS}${logMessage}${COLORS.RESET}`, data);
    }
    Logger.info(logMessage, data);
  }

  /**
   * Log de debug WebSocket
   */
  static debug(message, data = {}) {
    const logMessage = `${EMOJIS.DEBUG} [WS-DEBUG] ${message}`;
    if (__DEV__) {
      console.log(`${COLORS.INFO}${logMessage}${COLORS.RESET}`, data);
    }
    Logger.debug(logMessage, data);
  }

  /**
   * Log de evento procesado (con detalles de coincidencia de IDs)
   */
  static eventProcessed(eventName, processed, details = {}) {
    const emoji = processed ? EMOJIS.SUCCESS : EMOJIS.WARNING;
    const status = processed ? 'PROCESSED' : 'IGNORED';
    const logMessage = `${emoji} [WS-${status}] ${eventName}`;
    
    if (__DEV__) {
      const color = processed ? COLORS.SUCCESS : COLORS.WARNING;
      console.log(`${color}${logMessage}${COLORS.RESET}`, details);
    }
    
    if (processed) {
      Logger.info(logMessage, details);
    } else {
      Logger.warn(logMessage, details);
    }
  }

  /**
   * Obtener emoji para un evento específico
   */
  static getEmojiForEvent(eventName) {
    const eventMap = {
      'cita_creada': EMOJIS.CITA_CREADA,
      'cita_actualizada': EMOJIS.CITA_ACTUALIZADA,
      'cita_reprogramada': EMOJIS.CITA_REPROGRAMADA,
      'solicitud_reprogramacion': EMOJIS.SOLICITUD_REPROGRAMACION,
      'signos_vitales_registrados': EMOJIS.SIGNOS_VITALES,
      'alerta_signos_vitales_critica': EMOJIS.ALERTA_CRITICA,
      'alerta_signos_vitales_moderada': EMOJIS.ALERTA_MODERADA,
      'notificacion_doctor': EMOJIS.NOTIFICACION,
      'patient_assigned': EMOJIS.PACIENTE_ASIGNADO,
      'patient_unassigned': EMOJIS.PACIENTE_DESASIGNADO,
      'doctor_created': EMOJIS.DOCTOR_CREADO,
      'ping': '🏓',
      'pong': '🏓',
      'connect': EMOJIS.CONNECTED,
      'disconnect': EMOJIS.DISCONNECTED,
      'connect_error': EMOJIS.ERROR
    };
    
    return eventMap[eventName] || EMOJIS.INFO;
  }

  /**
   * Separador visual para agrupar logs relacionados
   */
  static separator(message = '') {
    if (__DEV__) {
      const separator = '═'.repeat(50);
      console.log(`${COLORS.WEBSOCKET}${separator}${COLORS.RESET}`);
      if (message) {
        console.log(`${COLORS.WEBSOCKET}  ${message}${COLORS.RESET}`);
        console.log(`${COLORS.WEBSOCKET}${separator}${COLORS.RESET}`);
      }
    }
  }
}

export default WSLogger;


