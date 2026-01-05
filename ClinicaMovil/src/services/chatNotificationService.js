/**
 * Servicio para manejar notificaciones push relacionadas con chat
 * Emite eventos globales que las pantallas de chat pueden escuchar
 */

import { DeviceEventEmitter } from 'react-native';
import Logger from './logger';

class ChatNotificationService {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Emitir evento cuando llega una notificación push de nuevo mensaje
   * @param {Object} notificationData - Datos de la notificación push
   */
  emitNuevoMensaje(notificationData) {
    try {
      Logger.debug('🔍 chatNotificationService.emitNuevoMensaje llamado', {
        notificationDataKeys: Object.keys(notificationData || {}),
        hasData: !!notificationData?.data,
        notificationData: notificationData
      });
      
      // Extraer datos - pueden venir en diferentes formatos
      let data = notificationData?.data || notificationData || {};
      
      // Si data es un string JSON, parsearlo
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
          Logger.debug('✅ Datos parseados desde string JSON');
        } catch (e) {
          Logger.warn('⚠️ Error parseando data como JSON string:', e);
        }
      }
      
      // Verificar que sea una notificación de chat
      const isNuevoMensaje = data.type === 'nuevo_mensaje' || data.mensaje_id || 
                            notificationData?.type === 'nuevo_mensaje' || 
                            notificationData?.mensaje_id;
      
      if (isNuevoMensaje) {
        // Normalizar IDs (pueden venir como string o número)
        const idPaciente = data.id_paciente || notificationData?.id_paciente;
        const idDoctor = data.id_doctor || notificationData?.id_doctor;
        const mensajeId = data.mensaje_id || notificationData?.mensaje_id;
        const remitente = data.remitente || notificationData?.remitente;
        
        Logger.info('📬 Emitiendo evento de nuevo mensaje desde notificación push', {
          mensaje_id: mensajeId,
          id_paciente: idPaciente,
          id_doctor: idDoctor,
          remitente: remitente,
          tipo: data.tipo || notificationData?.tipo
        });

        // Emitir evento global usando DeviceEventEmitter
        const eventData = {
          id_paciente: idPaciente ? String(idPaciente) : undefined,
          id_doctor: idDoctor ? String(idDoctor) : undefined,
          mensaje_id: mensajeId,
          remitente: remitente,
          tipo: data.tipo || notificationData?.tipo,
          fecha_envio: data.fecha_envio || notificationData?.fecha_envio,
          source: 'push_notification' // Indicar que viene de push notification
        };
        
        Logger.debug('📤 Emitiendo evento chat:nuevo_mensaje con datos:', eventData);
        DeviceEventEmitter.emit('chat:nuevo_mensaje', eventData);

        Logger.success('✅ Evento de nuevo mensaje emitido');
      } else {
        Logger.warn('⚠️ No se emite evento: no es notificación de nuevo mensaje', {
          dataType: data.type,
          notificationDataType: notificationData?.type,
          hasMensajeId: !!(data.mensaje_id || notificationData?.mensaje_id)
        });
      }
    } catch (error) {
      Logger.error('❌ Error emitiendo evento de nuevo mensaje:', {
        error: error.message,
        stack: error.stack,
        notificationData: notificationData
      });
    }
  }

  /**
   * Suscribirse a eventos de nuevo mensaje
   * @param {Function} callback - Función a ejecutar cuando llega un nuevo mensaje
   * @returns {Function} Función para desuscribirse
   */
  onNuevoMensaje(callback) {
    if (typeof callback !== 'function') {
      Logger.error('onNuevoMensaje: callback debe ser una función');
      return () => {};
    }

    Logger.debug('🔔 chatNotificationService.onNuevoMensaje: Creando listener...');
    
    // Crear wrapper para el callback que agregue logs
    const wrappedCallback = (data) => {
      Logger.debug('🔔 chatNotificationService: Evento chat:nuevo_mensaje recibido en listener', {
        data,
        timestamp: new Date().toISOString()
      });
      try {
        callback(data);
      } catch (error) {
        Logger.error('❌ Error en callback de onNuevoMensaje:', {
          error: error.message,
          stack: error.stack
        });
      }
    };

    const listener = DeviceEventEmitter.addListener('chat:nuevo_mensaje', wrappedCallback);
    const listenerId = `listener_${Date.now()}_${Math.random()}`;
    this.listeners.set(listenerId, listener);

    Logger.info('✅ Suscrito a eventos de nuevo mensaje', { 
      listenerId,
      totalListeners: this.listeners.size
    });

    // Retornar función para desuscribirse
    return () => {
      Logger.debug('🧹 Desuscribiéndose de eventos de nuevo mensaje', { listenerId });
      listener.remove();
      this.listeners.delete(listenerId);
      Logger.debug('🧹 Desuscrito de eventos de nuevo mensaje', { 
        listenerId,
        remainingListeners: this.listeners.size
      });
    };
  }

  /**
   * Limpiar todos los listeners
   */
  cleanup() {
    this.listeners.forEach((listener, id) => {
      try {
        listener.remove();
        Logger.debug('🧹 Listener removido', { id });
      } catch (error) {
        Logger.error('Error removiendo listener:', error);
      }
    });
    this.listeners.clear();
    Logger.info('🧹 Todos los listeners de chatNotificationService limpiados');
  }
}

// Singleton
const chatNotificationService = new ChatNotificationService();

export default chatNotificationService;

