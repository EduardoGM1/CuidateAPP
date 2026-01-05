// Servicio de notificaciones push para dispositivos móviles
import admin from 'firebase-admin';
import push from 'node-pushnotifications';
import { Usuario, Doctor, NotificacionDoctor } from '../models/associations.js';
import logger from '../utils/logger.js';
import realtimeService from './realtimeService.js';

class PushNotificationService {
  constructor() {
    this.fcmInitialized = false;
    this.apnsInitialized = false;
    this.pushService = null;
  }

  // Inicializar Firebase Cloud Messaging (FCM)
  async initializeFCM() {
    try {
      // Verificar si ya está inicializado
      if (admin.apps.length > 0) {
        this.fcmInitialized = true;
        console.log('✅ Firebase ya está inicializado');
        return;
      }

      // Verificar que las variables de entorno estén disponibles
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const projectId = process.env.FIREBASE_PROJECT_ID;

      if (!serviceAccountKey) {
        console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY no está definido en .env');
        return;
      }

      if (!projectId) {
        console.warn('⚠️ FIREBASE_PROJECT_ID no está definido en .env');
        return;
      }

      console.log('🔧 Intentando inicializar Firebase...');
      console.log('   Project ID:', projectId);
      console.log('   Service Account Key length:', serviceAccountKey.length);

      // Parsear el JSON
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountKey);
        console.log('   ✅ JSON parseado correctamente');
        console.log('   Client Email:', serviceAccount.client_email);
      } catch (parseError) {
        console.error('❌ Error parseando FIREBASE_SERVICE_ACCOUNT_KEY:', parseError.message);
        return;
      }

      // Inicializar Firebase
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
      });

      this.fcmInitialized = true;
      console.log('✅ Firebase Cloud Messaging inicializado exitosamente');
    } catch (error) {
      console.error('❌ Error inicializando FCM:', error.message);
      console.error('   Stack:', error.stack);
      this.fcmInitialized = false;
    }
  }

  // Inicializar servicio de push notifications
  async initializePushService() {
    try {
      this.pushService = new push({
        gcm: {
          id: process.env.FCM_SERVER_KEY
        },
        apn: {
          token: {
            key: process.env.APNS_KEY_PATH,
            keyId: process.env.APNS_KEY_ID,
            teamId: process.env.APNS_TEAM_ID
          },
          production: process.env.NODE_ENV === 'production'
        }
      });
      console.log('✅ Push notification service inicializado');
    } catch (error) {
      console.error('❌ Error inicializando push service:', error.message);
    }
  }

  // Registrar token de dispositivo
  async registerDeviceToken(userId, deviceToken, platform, deviceInfo = {}) {
    try {
      // Remover prefijo "FCM:" si existe (el frontend lo agrega pero Firebase no lo acepta)
      const cleanToken = deviceToken?.startsWith('FCM:') 
        ? deviceToken.substring(4) 
        : deviceToken;

      logger.info(`📝 Iniciando registro de token`, {
        userId,
        platform,
        tokenPreview: cleanToken?.substring(0, 30) + '...',
        tokenLength: cleanToken?.length || 0,
        hadPrefix: deviceToken?.startsWith('FCM:')
      });

      const user = await Usuario.findByPk(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Obtener tokens existentes o inicializar array
      let deviceTokens = user.device_tokens || [];
      
      logger.debug(`📋 Tokens existentes antes: ${deviceTokens.length}`, {
        existingTokens: deviceTokens.map(t => ({
          tokenPreview: t.token?.substring(0, 30) + '...',
          platform: t.platform,
          active: t.active
        }))
      });
      
      // Verificar si el token ya existe (comparar con token limpio)
      const existingTokenIndex = deviceTokens.findIndex(
        token => {
          const storedToken = token.token?.startsWith('FCM:') 
            ? token.token.substring(4) 
            : token.token;
          return storedToken === cleanToken;
        }
      );

      if (existingTokenIndex >= 0) {
        // Actualizar información del token existente
        logger.debug(`🔄 Actualizando token existente en índice ${existingTokenIndex}`);
        deviceTokens[existingTokenIndex] = {
          ...deviceTokens[existingTokenIndex],
          token: cleanToken, // Asegurar que se guarde sin prefijo
          ...deviceInfo,
          last_used: new Date(),
          platform,
          active: true
        };
      } else {
        // Agregar nuevo token (sin prefijo)
        logger.debug(`➕ Agregando nuevo token`);
        const newToken = {
          token: cleanToken, // Guardar sin prefijo "FCM:"
          platform,
          registered_at: new Date(),
          last_used: new Date(),
          active: true,
          device_info: deviceInfo
        };
        deviceTokens.push(newToken);
      }

      logger.debug(`📋 Tokens después de modificación: ${deviceTokens.length}`, {
        tokens: deviceTokens.map(t => ({
          tokenPreview: t.token?.substring(0, 30) + '...',
          platform: t.platform,
          active: t.active
        }))
      });

      // Guardar en base de datos usando actualización directa con SQL
      // Sequelize a veces tiene problemas detectando cambios en campos JSON
      const sequelize = Usuario.sequelize;
      const { QueryTypes } = await import('sequelize');
      await sequelize.query(
        'UPDATE usuarios SET device_tokens = CAST(:tokens AS JSON) WHERE id_usuario = :userId',
        {
          replacements: {
            tokens: JSON.stringify(deviceTokens),
            userId: userId
          },
          type: QueryTypes.UPDATE
        }
      );

      // Verificar que se guardó correctamente
      await user.reload({ attributes: ['device_tokens'] });
      const savedTokens = user.device_tokens || [];
      
      logger.info(`📱 Token registrado para usuario ${userId} - ${platform}`, {
        tokensCount: savedTokens.length,
        tokenSaved: savedTokens.some(t => {
          const storedToken = t.token?.startsWith('FCM:') 
            ? t.token.substring(4) 
            : t.token;
          return storedToken === cleanToken;
        })
      });

      if (!savedTokens.some(t => {
        const storedToken = t.token?.startsWith('FCM:') 
          ? t.token.substring(4) 
          : t.token;
        return storedToken === cleanToken;
      })) {
        logger.error(`❌ Token no se guardó correctamente en la BD`, {
          expectedToken: cleanToken?.substring(0, 30) + '...',
          savedTokensCount: savedTokens.length
        });
        throw new Error('Token no se guardó correctamente en la base de datos');
      }

      return { success: true, message: 'Token registrado exitosamente' };
    } catch (error) {
      logger.error('❌ Error registrando token:', {
        error: error.message,
        stack: error.stack,
        userId,
        platform
      });
      throw error;
    }
  }

  // Desregistrar token de dispositivo
  async unregisterDeviceToken(userId, deviceToken) {
    try {
      const user = await Usuario.findByPk(userId);
      if (!user || !user.device_tokens) {
        return { success: false, message: 'Usuario no encontrado' };
      }

      // Filtrar el token a remover
      const updatedTokens = user.device_tokens.filter(
        token => token.token !== deviceToken
      );

      await user.update({ device_tokens: updatedTokens });

      console.log(`📱 Token desregistrado para usuario ${userId}`);
      return { success: true, message: 'Token desregistrado exitosamente' };
    } catch (error) {
      console.error('Error desregistrando token:', error.message);
      throw error;
    }
  }

  // Enviar notificación push
  async sendPushNotification(userId, notification) {
    // Log básico de notificación push
    logger.info(`📤 Enviando notificación push: ${notification.title || 'Sin título'} a usuario ${userId}`);
    try {
      const user = await Usuario.findByPk(userId);
      if (!user || !user.device_tokens || user.device_tokens.length === 0) {
        return { success: false, message: 'No hay tokens registrados' };
      }

      const activeTokens = user.device_tokens.filter(token => token.active);
      if (activeTokens.length === 0) {
        return { success: false, message: 'No hay tokens activos' };
      }

      const results = [];

      // Log básico de inicio de envío

      // Enviar a cada token activo
      for (const deviceToken of activeTokens) {
        try {
          let result;
          const tokenPreview = deviceToken.token?.substring(0, 30) + '...';
          
          // Procesar token silenciosamente
          
          if (deviceToken.platform === 'android' && this.fcmInitialized) {
            // Verificar si es un token FCM real o alternativo
            if (deviceToken.token?.startsWith('fcm_temp_')) {
              result = await this.sendGenericNotification(deviceToken, notification);
            } else {
              // Intentar enviar via FCM para Android (token FCM real)
              try {
                result = await this.sendFCMNotification(deviceToken.token, notification);
              } catch (fcmError) {
                // Si FCM falla, usar fallback genérico
                logger.warn(`⚠️ FCM falló, usando fallback genérico: ${fcmError.message}`);
                result = await this.sendGenericNotification(deviceToken, notification);
              }
            }
          } else if (deviceToken.platform === 'ios' && this.pushService) {
            // Enviar via APNs para iOS
            result = await this.sendAPNsNotification(deviceToken.token, notification);
          } else {
            // Fallback: usar servicio genérico (no requiere Firebase)
            result = await this.sendGenericNotification(deviceToken, notification);
          }

          results.push({ 
            token: deviceToken.token, 
            tokenPreview,
            result,
            method: result?.method || 'unknown',
            success: !!result?.success || !!result?.messageId
          });

          // Actualizar último uso del token
          await this.updateTokenLastUsed(userId, deviceToken.token);
        } catch (tokenError) {
          logger.error(`❌ Error enviando notificación a token ${deviceToken.platform}: ${tokenError.message}`);
          results.push({ 
            token: deviceToken.token,
            tokenPreview: deviceToken.token?.substring(0, 30) + '...',
            error: tokenError.message,
            code: tokenError.code
          });
        }
      }

      // Resumen básico del envío
      const successful = results.filter(r => r.success || r.result?.messageId).length;
      const failed = results.filter(r => r.error).length;
      
      if (successful > 0) {
        logger.info(`✅ Notificación push enviada: ${successful}/${activeTokens.length} dispositivo(s) exitoso(s)`);
      }
      if (failed > 0) {
        logger.warn(`⚠️ Notificación push: ${failed} dispositivo(s) fallido(s)`);
      }

      // Guardar notificación en BD si es para un doctor
      await this.guardarNotificacionDoctor(userId, notification, results);

      return {
        success: successful > 0,
        devices: successful,
        sent_to: results.length,
        results
      };
    } catch (error) {
      logger.error(`❌ Error enviando push notification: ${error.message}`);
      throw error;
    }
  }

  // Enviar notificación FCM (Android)
  async sendFCMNotification(deviceToken, notification) {
    // Verificar que Firebase esté inicializado
    if (!this.fcmInitialized || !admin.apps.length) {
      console.warn('⚠️ Firebase no está inicializado, usando notificación genérica como fallback');
      throw new Error('Firebase no inicializado');
    }

    try {
      // Remover prefijo "FCM:" si existe (por si acaso ya está guardado con prefijo)
      const cleanToken = deviceToken?.startsWith('FCM:') 
        ? deviceToken.substring(4) 
        : deviceToken;

      console.log('🔥 Enviando notificación FCM a Firebase...', {
        tokenPreview: cleanToken ? `${cleanToken.substring(0, 30)}...` : 'no token',
        tokenLength: cleanToken?.length || 0,
        hadPrefix: deviceToken?.startsWith('FCM:'),
        title: notification.title,
        message: notification.message?.substring(0, 50) + '...',
        type: notification.type
      });

      const message = {
        token: cleanToken, // Usar token sin prefijo
        notification: {
          title: notification.title,
          body: notification.message
        },
        data: {
          type: notification.type || 'general',
          data: JSON.stringify(notification.data || {}),
          timestamp: Date.now().toString()
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: 'clinica-movil-reminders', // Usar el canal de recordatorios
            visibility: 'public', // Mostrar en pantalla bloqueada
          },
          // Configuración para Huawei y otros dispositivos restrictivos
          ttl: 3600000, // 1 hora de validez
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'content-available': 1,
            }
          }
        }
      };

      console.log('📤 Mensaje preparado para Firebase:', {
        hasToken: !!message.token,
        hasNotification: !!message.notification,
        hasData: !!message.data,
        androidConfig: !!message.android,
        timestamp: new Date().toISOString()
      });

      // Enviar a Firebase y capturar respuesta
      console.log('📡 [FIREBASE] Enviando mensaje a Firebase Cloud Messaging...');
      const startTime = Date.now();
      const response = await admin.messaging().send(message);
      const duration = Date.now() - startTime;
      
      // Log detallado de la respuesta de Firebase
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('🔥 [FIREBASE PUSH NOTIFICATION] RESPUESTA RECIBIDA');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ Estado: EXITOSO');
      console.log('📱 Message ID:', response);
      console.log('⏱️  Tiempo de respuesta:', `${duration}ms`);
      console.log('🕐 Timestamp:', new Date().toISOString());
      console.log('📋 Detalles del mensaje enviado:');
      console.log('   - Título:', notification.title);
      console.log('   - Mensaje:', notification.message);
      console.log('   - Tipo:', notification.type || 'general');
      console.log('   - Token (preview):', deviceToken ? `${deviceToken.substring(0, 30)}...` : 'no token');
      console.log('   - Token length:', deviceToken?.length || 0);
      console.log('   - Plataforma: Android');
      console.log('   - Prioridad: high');
      console.log('   - Canal:', message.android?.notification?.channel_id || 'default');
      if (notification.data) {
        console.log('   - Datos adicionales:', JSON.stringify(notification.data, null, 2));
      }
      console.log('═══════════════════════════════════════════════════════════\n');

      return {
        success: true,
        messageId: response,
        method: 'FCM',
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`
      };
    } catch (error) {
      // Log detallado del error de Firebase
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('❌ [FIREBASE PUSH NOTIFICATION] ERROR');
      console.log('═══════════════════════════════════════════════════════════');
      console.error('❌ Estado: FALLIDO');
      console.error('📛 Mensaje de error:', error.message);
      console.error('🔢 Código de error:', error.code || 'N/A');
      console.error('🕐 Timestamp:', new Date().toISOString());
      console.error('📋 Detalles del intento:');
      console.error('   - Título:', notification.title);
      console.error('   - Mensaje:', notification.message);
      console.error('   - Tipo:', notification.type || 'general');
      console.error('   - Token (preview):', deviceToken ? `${deviceToken.substring(0, 30)}...` : 'no token');
      console.error('   - Token length:', deviceToken?.length || 0);
      if (error.errorInfo) {
        console.error('   - Error Info:', JSON.stringify(error.errorInfo, null, 2));
      }
      if (error.stack) {
        console.error('   - Stack trace:', error.stack);
      }
      console.log('═══════════════════════════════════════════════════════════\n');

      // Detectar errores específicos de Firebase
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        console.warn('⚠️ Token FCM inválido o no registrado, puede ser un token alternativo');
        throw new Error('Token FCM inválido - puede ser token alternativo (no es FCM real)');
      }

      throw error;
    }
  }

  // Enviar notificación APNs (iOS)
  async sendAPNsNotification(deviceToken, notification) {
    const payload = {
      token: [deviceToken],
      notification: {
        title: notification.title,
        body: notification.message,
        sound: 'default',
        badge: 1
      },
      payload: {
        aps: {
          alert: {
            title: notification.title,
            body: notification.message
          },
          sound: 'default',
          badge: 1,
          'content-available': 1
        },
        data: notification.data || {},
        type: notification.type || 'general'
      }
    };

    return await this.pushService.send(payload);
  }

  // Enviar notificación genérica (fallback)
  async sendGenericNotification(deviceToken, notification) {
    const payload = {
      token: [deviceToken.token],
      platform: deviceToken.platform,
      notification: {
        title: notification.title,
        message: notification.message,
        sound: 'default'
      },
      data: notification.data || {}
    };

    return await this.pushService.send(payload);
  }

  // Actualizar último uso del token
  async updateTokenLastUsed(userId, deviceToken) {
    try {
      const user = await Usuario.findByPk(userId);
      if (user && user.device_tokens) {
        const updatedTokens = user.device_tokens.map(token => {
          if (token.token === deviceToken) {
            return { ...token, last_used: new Date() };
          }
          return token;
        });
        await user.update({ device_tokens: updatedTokens });
      }
    } catch (error) {
      console.error('Error actualizando último uso:', error.message);
    }
  }

  // Notificaciones específicas para la clínica
  async sendAppointmentReminder(userId, appointment) {
    // Determinar título y mensaje según el tiempo restante
    const tiempoRestante = appointment.tiempo_restante || (appointment.urgent ? '5 horas' : '24 horas');
    const esUrgente = appointment.urgent === true || 
                      tiempoRestante === '30 minutos' || 
                      tiempoRestante === '1 hora' || 
                      tiempoRestante === '2 horas' || 
                      tiempoRestante === '5 horas';
    
    let titulo, mensaje;
    
    if (tiempoRestante === '30 minutos') {
      titulo = '🚨 Cita en 30 Minutos';
      mensaje = `Tu cita médica es en ${tiempoRestante}: ${appointment.motivo || appointment.location || 'Consulta médica'}`;
    } else if (tiempoRestante === '1 hora') {
      titulo = '⏰ Cita en 1 Hora';
      mensaje = `Tu cita médica es en ${tiempoRestante}: ${appointment.motivo || appointment.location || 'Consulta médica'}`;
    } else if (tiempoRestante === '2 horas') {
      titulo = '⏰ Cita en 2 Horas';
      mensaje = `Tu cita médica es en ${tiempoRestante}: ${appointment.motivo || appointment.location || 'Consulta médica'}`;
    } else if (tiempoRestante === '5 horas') {
      titulo = '⏰ Cita Muy Próxima';
      mensaje = `Tu cita médica es en ${tiempoRestante}: ${appointment.motivo || appointment.location || 'Consulta médica'}`;
    } else {
      titulo = '📅 Recordatorio de Cita';
      mensaje = `Tienes una cita mañana: ${appointment.motivo || appointment.location || 'Consulta médica'}`;
    }

    // Agregar información del doctor si está disponible
    if (appointment.doctor_name) {
      mensaje += ` con ${appointment.doctor_name}`;
    }

    // Agregar fecha y hora si está disponible
    if (appointment.time) {
      mensaje += ` - ${appointment.time}`;
    }

    const notification = {
      type: 'appointment_reminder',
      title: titulo,
      message: mensaje,
      data: {
        appointment_id: appointment.id,
        doctor_name: appointment.doctor_name || '',
        time: appointment.time || '',
        location: appointment.location || appointment.motivo || '',
        fecha_cita: appointment.fecha_cita || '',
        motivo: appointment.motivo || '',
        urgent: esUrgente,
        tiempo_restante: tiempoRestante
      }
    };

    return await this.sendPushNotification(userId, notification);
  }

  async sendMedicationReminder(userId, medication) {
    // Construir mensaje con información completa
    let mensaje = `💊 Es hora de tomar: ${medication.name}`;
    
    if (medication.dosage) {
      mensaje += `\nDosis: ${medication.dosage}`;
    }
    
    if (medication.instructions) {
      mensaje += `\n${medication.instructions}`;
    }

    const notification = {
      type: 'medication_reminder',
      title: '💊 Recordatorio de Medicamento',
      message: mensaje,
      data: {
        medication_id: medication.id,
        medication_name: medication.name,
        dosage: medication.dosage || '',
        instructions: medication.instructions || '',
        timestamp: new Date().toISOString()
      }
    };

    return await this.sendPushNotification(userId, notification);
  }

  async sendTestResult(userId, result) {
    const notification = {
      type: 'test_result',
      title: 'Resultado de Examen',
      message: 'Tus resultados de laboratorio están listos',
      data: {
        test_id: result.id,
        test_type: result.type,
        result_status: result.status,
        doctor_notes: result.doctor_notes
      }
    };

    return await this.sendPushNotification(userId, notification);
  }

  /**
   * Guardar notificación en BD para doctores
   * @param {number} userId - ID del usuario
   * @param {Object} notification - Objeto de notificación
   * @param {Array} results - Resultados del envío
   */
  async guardarNotificacionDoctor(userId, notification, results = []) {
    try {
      // Verificar si el usuario es un doctor
      const usuario = await Usuario.findByPk(userId, {
        include: [
          {
            model: Doctor,
            attributes: ['id_doctor'],
            required: false
          }
        ]
      });

      if (!usuario || !usuario.Doctor) {
        // No es un doctor, no guardar
        return;
      }

      const id_doctor = usuario.Doctor.id_doctor;

      // Determinar tipo de notificación basado en notification.type
      const tipoMap = {
        'alerta_paciente': 'alerta_signos_vitales',
        'alerta_salud': 'alerta_signos_vitales',
        'citas_actualizadas': 'cita_actualizada',
        'cita_reprogramada': 'cita_reprogramada',
        'cita_cancelada': 'cita_cancelada',
        'nuevo_mensaje': 'nuevo_mensaje',
        'paciente_registro_signos': 'paciente_registro_signos'
      };

      const tipo = tipoMap[notification.type] || 'alerta_signos_vitales';

      // Extraer IDs relacionados de notification.data
      const datos = notification.data || {};
      const id_paciente = datos.pacienteId || null;
      const id_cita = datos.citaId || datos.id_cita || null;
      const id_mensaje = datos.mensajeId || datos.id_mensaje || null;

      // Guardar notificación
      const notificacionGuardada = await NotificacionDoctor.create({
        id_doctor,
        id_paciente,
        id_cita,
        id_mensaje,
        tipo,
        titulo: notification.title,
        mensaje: notification.message,
        datos_adicionales: {
          ...datos,
          resultado_envio: {
            total: results.length,
            successful: results.filter(r => r.success || r.result?.messageId).length,
            failed: results.filter(r => r.error).length
          }
        },
        estado: 'enviada'
      });

      logger.info('Notificación guardada para doctor', {
        id_doctor,
        tipo,
        titulo: notification.title
      });

      // Emitir evento WebSocket: notificacion_doctor
      const notificacionData = {
        id_notificacion: notificacionGuardada.id_notificacion,
        id_doctor,
        id_paciente,
        id_cita,
        id_mensaje,
        tipo,
        titulo: notification.title,
        mensaje: notification.message,
        estado: 'enviada',
        fecha_envio: notificacionGuardada.fecha_envio
      };

      // Notificar al doctor específico
      realtimeService.sendToUser(userId, 'notificacion_doctor', notificacionData);
    } catch (error) {
      logger.error('Error guardando notificación de doctor', {
        error: error.message,
        userId,
        notificationType: notification.type
      });
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  async sendEmergencyAlert(userId, alert) {
    const notification = {
      type: 'emergency_alert',
      title: '🚨 Alerta Médica',
      message: alert.message,
      data: {
        alert_id: alert.id,
        severity: alert.severity,
        action_required: alert.action_required
      }
    };

    return await this.sendPushNotification(userId, notification);
  }

  // Enviar notificación a múltiples usuarios
  async sendBulkNotification(userIds, notification) {
    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendPushNotification(userId, notification);
        results.push({ userId, ...result });
      } catch (error) {
        results.push({ userId, error: error.message });
      }
    }

    return results;
  }

  // Limpiar tokens inactivos
  async cleanupInactiveTokens() {
    try {
      const users = await Usuario.findAll({
        where: {
          device_tokens: {
            [require('sequelize').Op.ne]: null
          }
        }
      });

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const user of users) {
        if (user.device_tokens) {
          const activeTokens = user.device_tokens.filter(token => {
            const lastUsed = new Date(token.last_used);
            return lastUsed > thirtyDaysAgo;
          });

          if (activeTokens.length !== user.device_tokens.length) {
            await user.update({ device_tokens: activeTokens });
            cleanedCount += (user.device_tokens.length - activeTokens.length);
          }
        }
      }

      console.log(`🧹 Limpieza completada: ${cleanedCount} tokens inactivos removidos`);
      return { cleaned_tokens: cleanedCount };
    } catch (error) {
      console.error('Error en limpieza de tokens:', error.message);
      throw error;
    }
  }

  // Obtener estadísticas de notificaciones
  async getNotificationStats() {
    try {
      const users = await Usuario.findAll({
        where: {
          device_tokens: {
            [require('sequelize').Op.ne]: null
          }
        }
      });

      let totalTokens = 0;
      let activeTokens = 0;
      const platforms = {};

      users.forEach(user => {
        if (user.device_tokens) {
          user.device_tokens.forEach(token => {
            totalTokens++;
            if (token.active) {
              activeTokens++;
              platforms[token.platform] = (platforms[token.platform] || 0) + 1;
            }
          });
        }
      });

      return {
        total_users_with_tokens: users.length,
        total_tokens: totalTokens,
        active_tokens: activeTokens,
        platforms
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error.message);
      throw error;
    }
  }
}

// Instancia singleton
const pushNotificationService = new PushNotificationService();

// Inicializar automáticamente al importar el módulo
// Esto intenta inicializar Firebase si las credenciales están disponibles
// Si no están disponibles, usará el servicio genérico como fallback
pushNotificationService.initializeFCM().catch(err => {
  console.warn('⚠️ No se pudo inicializar FCM (esto es normal si no hay credenciales):', err.message);
});

pushNotificationService.initializePushService().catch(err => {
  console.warn('⚠️ No se pudo inicializar push service (esto es normal si no hay credenciales):', err.message);
});

export default pushNotificationService;
