/**
 * Servicio de Notificaciones Locales
 * 
 * Gestiona notificaciones locales en el dispositivo,
 * sincronizadas con las notificaciones push del backend.
 */

import PushNotification from 'react-native-push-notification';
import { Platform, Alert } from 'react-native';
import Logger from './logger';

class LocalNotificationService {
  constructor() {
    this.isConfigured = false;
    this.configured = false;
  }

  /**
   * Configurar el servicio de notificaciones
   */
  configure() {
    if (this.configured) {
      Logger.warn('LocalNotificationService: Ya está configurado');
      return;
    }

    try {
      PushNotification.configure({
        // Funciones callback
        onRegister: async function (token) {
          Logger.info('🔔 LocalNotificationService: onRegister CALLBACK EJECUTADO', { 
            token: token ? 'presente' : 'ausente',
            tokenObject: JSON.stringify(token),
            tokenValue: token?.token,
            tokenType: token?.type || 'unknown',
            os: Platform.OS
          });
          
          if (!token) {
            Logger.error('❌ Token recibido es null o undefined', { token });
            return;
          }
          
          if (!token.token) {
            Logger.error('❌ Token recibido pero token.token está vacío', { 
              token,
              tokenKeys: Object.keys(token || {}),
              fullToken: JSON.stringify(token)
            });
            return;
          }
          
          Logger.info('✅ Token válido recibido:', {
            tokenLength: token.token.length,
            tokenPreview: token.token.substring(0, 20) + '...',
            tokenType: token.type || 'unknown'
          });
          
          // Registrar token automáticamente si hay un usuario logueado
          // SOLUCIÓN PARA TODOS LOS DISPOSITIVOS ANDROID:
          // Las notificaciones push desde el servidor funcionan mejor que las locales programadas
          // Esto es especialmente importante para Huawei, Xiaomi, Samsung y otros con optimización agresiva
          try {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            const userId = await AsyncStorage.getItem('user_id');
            
            Logger.info('Verificando usuario para registro de token', { 
              userId: userId || 'no encontrado',
              hasToken: !!token?.token 
            });
            
            if (userId && token?.token) {
              // Importar pushTokenService dinámicamente para evitar dependencias circulares
              const pushTokenService = (await import('./pushTokenService.js')).default;
              
              Logger.info('Registrando token en el servidor', { 
                userId: parseInt(userId),
                tokenLength: token.token.length 
              });
              
              await pushTokenService.registrarToken(parseInt(userId), token.token);
              Logger.success('Token registrado automáticamente para notificaciones push', { 
                userId: parseInt(userId),
                platform: Platform.OS 
              });
            } else {
              Logger.info('Usuario no encontrado o token inválido, guardando token pendiente', { 
                hasUserId: !!userId,
                hasToken: !!token?.token 
              });
              // Guardar token temporalmente para registrarlo cuando el usuario inicie sesión
              await AsyncStorage.setItem('pending_push_token', token.token);
              Logger.info('Token pendiente guardado, se registrará al iniciar sesión');
            }
          } catch (error) {
            Logger.error('Error registrando token automáticamente:', error);
            // No bloquear la configuración si falla, pero guardar el token pendiente
            try {
              const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
              await AsyncStorage.setItem('pending_push_token', token.token);
              Logger.info('Token guardado como pendiente debido a error');
            } catch (saveError) {
              Logger.error('Error guardando token pendiente:', saveError);
            }
          }
        },

        onNotification: function (notification) {
          Logger.info('LocalNotificationService: Notificación recibida', notification);
          // Manejar la notificación recibida
          if (notification.userInteraction) {
            // Usuario tocó la notificación
            Logger.info('Usuario interactuó con la notificación', notification);
          }
        },

        // Permisos (Android)
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },

        // Pop initial notification
        popInitialNotification: true,
        requestPermissions: Platform.OS === 'ios',
        
        // Configuración para que funcione con app cerrada
        ...(Platform.OS === 'android' && {
          // Habilitar notificaciones en segundo plano
          smallIcon: 'ic_notification',
          // IMPORTANTE: En Android, el token puede no obtenerse automáticamente
          // Necesitamos solicitar permisos explícitamente
        }),
      });

      Logger.info('✅ PushNotification.configure ejecutado. Esperando callback onRegister...');
      
      // Solicitar permisos explícitamente en Android para obtener el token
      // El callback onRegister se ejecutará cuando se obtengan los permisos
      if (Platform.OS === 'android') {
        Logger.info('📱 Android: Solicitando permisos para activar callback onRegister...');
        
        // Esperar un momento antes de solicitar permisos para asegurar que configure() se complete
        setTimeout(() => {
          try {
            // Verificar si requestPermissions existe y es una función
            if (typeof PushNotification.requestPermissions === 'function') {
              const permissionsResult = PushNotification.requestPermissions();
              
              // Verificar si retorna una Promise
              if (permissionsResult && typeof permissionsResult.then === 'function') {
                permissionsResult
                  .then((permissions) => {
                    Logger.info('✅ Permisos de notificación obtenidos:', permissions);
                    Logger.info('⏳ Esperando que callback onRegister se ejecute con el token...');
                    
                    // El callback onRegister debería ejecutarse después de obtener permisos
                    // Verificar después de 3 segundos si se ejecutó
                    setTimeout(() => {
                      Logger.info('🔍 Verificando si onRegister se ejecutó después de obtener permisos...');
                    }, 3000);
                  })
                  .catch((error) => {
                    Logger.error('❌ Error solicitando permisos:', error);
                  });
              } else {
                // Si no retorna Promise, usar checkPermissions
                Logger.info('⚠️ requestPermissions no retorna Promise, usando checkPermissions');
                PushNotification.checkPermissions((checkResult) => {
                  Logger.info('✅ Estado de permisos:', checkResult);
                });
              }
            } else {
              Logger.warn('⚠️ PushNotification.requestPermissions no está disponible');
              // Usar checkPermissions como alternativa
              PushNotification.checkPermissions((checkResult) => {
                Logger.info('✅ Estado de permisos (check):', checkResult);
              });
            }
          } catch (error) {
            Logger.error('❌ Error solicitando permisos:', error);
          }
        }, 500);
      }

      // Configurar canal para Android
      if (Platform.OS === 'android') {
        PushNotification.createChannel(
          {
            channelId: 'clinica-movil-alerts',
            channelName: 'Alertas de Salud',
            channelDescription: 'Notificaciones de alertas médicas',
            playSound: true,
            soundName: 'default',
            importance: 4, // Alta importancia
            vibrate: true,
          },
          (created) => {
            Logger.info('Canal de notificaciones creado', { created });
          }
        );

        // Canal para recordatorios - IMPORTANCIA ALTA para que funcione con app cerrada
        PushNotification.createChannel(
          {
            channelId: 'clinica-movil-reminders',
            channelName: 'Recordatorios',
            channelDescription: 'Recordatorios de citas y medicamentos',
            playSound: true,
            soundName: 'default',
            importance: 4, // IMPORTANCIA ALTA (antes era 3) - necesario para app cerrada
            vibrate: true,
            enableVibration: true,
            enableLights: true,
            enableVibrate: true,
          },
          (created) => {
            Logger.info('Canal de recordatorios creado', { created });
          }
        );
      }

      this.configured = true;
      Logger.success('✅ LocalNotificationService configurado correctamente');
      
      // IMPORTANTE: En Android, react-native-push-notification puede no proporcionar el token FCM
      // inmediatamente. El callback onRegister puede no ejecutarse hasta que se solicite explícitamente.
      // Por eso solicitamos permisos después de configurar.
      
      Logger.info('📱 Sistema de notificaciones listo. Esperando token en callback onRegister...');
    } catch (error) {
      Logger.error('❌ Error configurando LocalNotificationService:', error);
    }
  }

  /**
   * Verificar y crear canal de notificaciones si no existe
   * @param {string} channelId - ID del canal a verificar/crear
   * @returns {Promise<boolean>} - true si el canal existe o fue creado
   */
  async ensureChannelExists(channelId) {
    if (Platform.OS !== 'android') {
      return true; // iOS no usa canales
    }

    try {
      if (!this.configured) {
        this.configure();
      }

      // Verificar si el canal existe usando checkPermissions
      // Si no existe, crearlo
      const channelConfig = this.getChannelConfig(channelId);
      if (!channelConfig) {
        Logger.warn(`⚠️ Canal ${channelId} no está configurado, creándolo...`);
        this.createChannel(channelId);
        return true;
      }

      // Crear el canal (si ya existe, no hace nada)
      this.createChannel(channelId);
      return true;
    } catch (error) {
      Logger.error(`Error verificando/creando canal ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Obtener configuración del canal
   * @param {string} channelId - ID del canal
   * @returns {Object|null} - Configuración del canal o null
   */
  getChannelConfig(channelId) {
    const channels = {
      'clinica-movil-alerts': {
        channelName: 'Alertas de Salud',
        channelDescription: 'Notificaciones de alertas médicas',
        importance: 4,
      },
      'clinica-movil-reminders': {
        channelName: 'Recordatorios',
        channelDescription: 'Recordatorios de citas y medicamentos',
        importance: 4,
      },
    };
    return channels[channelId] || null;
  }

  /**
   * Crear canal de notificaciones
   * @param {string} channelId - ID del canal
   */
  createChannel(channelId) {
    if (Platform.OS !== 'android') {
      return;
    }

    const channelConfig = this.getChannelConfig(channelId);
    if (!channelConfig) {
      Logger.warn(`⚠️ No hay configuración para el canal ${channelId}`);
      return;
    }

    PushNotification.createChannel(
      {
        channelId,
        channelName: channelConfig.channelName,
        channelDescription: channelConfig.channelDescription,
        playSound: true,
        soundName: 'default',
        importance: channelConfig.importance,
        vibrate: true,
        enableVibration: true,
        enableLights: true,
        enableVibrate: true,
      },
      (created) => {
        if (created) {
          Logger.info(`✅ Canal ${channelId} creado exitosamente`);
        } else {
          Logger.info(`ℹ️ Canal ${channelId} ya existe`);
        }
      }
    );
  }

  /**
   * Mostrar notificación local
   * @param {Object} options - Opciones de la notificación
   */
  async showNotification(options) {
    try {
      if (!this.configured) {
        this.configure();
      }

      const {
        title,
        message,
        channelId = Platform.OS === 'android' ? 'clinica-movil-reminders' : undefined,
        soundName = 'default',
        playSound = true,
        vibrate = true,
        priority = 'high',
        importance = 4,
        data = {},
        tag,
      } = options;

      // Asegurar que el canal existe antes de mostrar la notificación
      if (Platform.OS === 'android' && channelId) {
        await this.ensureChannelExists(channelId);
      }

      // Verificar permisos antes de mostrar (solo en Android)
      if (Platform.OS === 'android') {
        const permisosOtorgados = await new Promise((resolve) => {
          PushNotification.checkPermissions((permissions) => {
            resolve(permissions.alert === true);
          });
        });

        if (!permisosOtorgados) {
          Logger.warn('⚠️ Permisos de notificación no otorgados, solicitando...');
          try {
            await PushNotification.requestPermissions();
            Logger.info('✅ Permisos de notificación solicitados');
          } catch (permError) {
            Logger.error('❌ Error solicitando permisos:', permError);
            throw new Error('Permisos de notificación no otorgados');
          }
        }
      }

      // Mostrar notificación
      PushNotification.localNotification({
        title,
        message,
        channelId, // Android
        soundName,
        playSound,
        vibrate,
        priority, // Android
        importance, // Android
        userInfo: data,
        tag, // Evitar duplicados
        actions: Platform.OS === 'android' ? ['OK'] : undefined,
      });

      Logger.info(`✅ Notificación local mostrada: ${title}`);
      
      Logger.success('✅ Notificación local mostrada', { 
        title, 
        message: message?.substring(0, 50) + '...',
        channelId 
      });
    } catch (error) {
      Logger.error('❌ Error mostrando notificación local:', error);
      throw error;
    }
  }

  /**
   * Programar notificación local
   * @param {Object} options - Opciones de la notificación
   * @param {Date} date - Fecha y hora de la notificación
   */
  scheduleNotification(options, date) {
    try {
      if (!this.configured) {
        this.configure();
      }

      const {
        title,
        message,
        channelId = Platform.OS === 'android' ? 'clinica-movil-reminders' : undefined,
        soundName = 'default',
        playSound = true,
        vibrate = true,
        data = {},
      } = options;

      // Verificar que la fecha sea futura
      const now = new Date();
      const tiempoRestante = date.getTime() - now.getTime();
      
      if (tiempoRestante <= 0) {
        Logger.warn('LocalNotificationService: Fecha de notificación es en el pasado, no se programará', {
          date,
          now,
        });
        return;
      }

      const notificationConfig = {
        title,
        message,
        date,
        channelId,
        soundName,
        playSound,
        vibrate,
        userInfo: data,
        // Configuración para que funcione con la app cerrada
        wakeUp: true, // iOS: despertar dispositivo si está dormido
        // Configuración específica para Android
        ...(Platform.OS === 'android' && {
          // allowWhileIdle: permite que la notificación se active incluso en modo Doze
          // Esto es CRÍTICO para que funcione cuando la app está cerrada
          allowWhileIdle: true,
          // No usar repeatType para evitar problemas con exact alarms
          repeatType: undefined,
          // Importancia y prioridad alta para que se muestre incluso con la app cerrada
          importance: 'high',
          priority: 'max', // Cambiado a 'max' para máxima prioridad
          // Número de notificación único para evitar conflictos
          number: Math.floor(Math.random() * 10000),
          // Vibrar por más tiempo
          vibration: 300,
          // Mostrar en pantalla bloqueada
          visibility: 'public',
        }),
      };

      try {
        PushNotification.localNotificationSchedule(notificationConfig);
        Logger.info('Notificación programada', { title, message, date, platform: Platform.OS });
      } catch (scheduleError) {
        // Si falla por permisos de exact alarm, el sistema usará alarmas aproximadas automáticamente
        // Solo logueamos el error pero no bloqueamos la funcionalidad
        if (scheduleError.message && scheduleError.message.includes('SCHEDULE_EXACT_ALARM')) {
          Logger.warn('Permiso SCHEDULE_EXACT_ALARM no disponible, el sistema usará alarmas aproximadas', {
            error: scheduleError.message,
          });
          // El sistema Android usará alarmas inexactas automáticamente
          // No necesitamos hacer nada adicional
        } else {
          Logger.error('Error programando notificación:', scheduleError);
          // Para notificaciones muy urgentes (menos de 1 hora), mostrar inmediatamente
          if (data.urgent && tiempoRestante < 60 * 60 * 1000) {
            Logger.warn('Mostrando notificación inmediata para recordatorio urgente');
            this.showNotification({
              ...options,
              title: `⚠️ ${options.title}`,
              message: `${options.message} (Recordatorio urgente)`,
            });
          }
        }
      }
    } catch (error) {
      Logger.error('Error general programando notificación:', error);
    }
  }

  /**
   * Cancelar todas las notificaciones programadas
   */
  cancelAllNotifications() {
    try {
      PushNotification.cancelAllLocalNotifications();
      Logger.info('Todas las notificaciones canceladas');
    } catch (error) {
      Logger.error('Error cancelando notificaciones:', error);
    }
  }

  /**
   * Cancelar notificación específica por ID
   */
  cancelNotification(notificationId) {
    try {
      PushNotification.cancelLocalNotifications({ id: notificationId });
      Logger.info('Notificación cancelada', { notificationId });
    } catch (error) {
      Logger.error('Error cancelando notificación:', error);
    }
  }

  /**
   * Obtener notificaciones programadas
   */
  getScheduledNotifications() {
    return new Promise((resolve) => {
      PushNotification.getScheduledLocalNotifications((notifications) => {
        Logger.info('Notificaciones programadas obtenidas', { count: notifications.length });
        // Formatear fechas para mejor legibilidad
        const notificacionesFormateadas = notifications.map(notif => ({
          ...notif,
          fechaFormateada: notif.date ? new Date(notif.date).toLocaleString('es-MX') : 'N/A',
          tiempoRestante: notif.date ? Math.max(0, Math.round((new Date(notif.date).getTime() - new Date().getTime()) / 1000 / 60)) : null,
        }));
        resolve(notificacionesFormateadas);
      });
    });
  }

  /**
   * Mostrar alerta crítica
   */
  showCriticalAlert(title, message, data = {}) {
    this.showNotification({
      title: `🚨 ${title}`,
      message,
      channelId: Platform.OS === 'android' ? 'clinica-movil-alerts' : undefined,
      soundName: Platform.OS === 'android' ? 'alarm' : 'default',
      playSound: true,
      vibrate: true,
      priority: 'high',
      importance: 4,
      data: {
        type: 'critical_alert',
        ...data,
      },
    });
  }

  /**
   * Mostrar recordatorio
   */
  showReminder(title, message, data = {}) {
    this.showNotification({
      title: `📅 ${title}`,
      message,
      channelId: Platform.OS === 'android' ? 'clinica-movil-reminders' : undefined,
      soundName: 'default',
      playSound: true,
      vibrate: true,
      priority: 'default',
      importance: 3,
      data: {
        type: 'reminder',
        ...data,
      },
    });
  }
}

// Singleton
const localNotificationService = new LocalNotificationService();

// Configurar automáticamente al importar
if (typeof window !== 'undefined' || Platform.OS !== 'web') {
  Logger.info('🔧 Inicializando LocalNotificationService...', { platform: Platform.OS });
  localNotificationService.configure();
  
  // En Android, solicitar permisos inmediatamente para obtener el token
  // El callback onRegister se ejecutará cuando PushNotification obtenga el token
  if (Platform.OS === 'android') {
    Logger.info('📱 Android detectado, solicitando permisos para obtener token FCM...');
    setTimeout(() => {
      try {
        // Verificar si requestPermissions existe y es una función
        if (typeof PushNotification.requestPermissions === 'function') {
          const permissionsResult = PushNotification.requestPermissions();
          
          // Verificar si retorna una Promise
          if (permissionsResult && typeof permissionsResult.then === 'function') {
            permissionsResult
              .then((permissions) => {
                Logger.info('✅ Permisos obtenidos:', permissions);
                Logger.info('⏳ Esperando callback onRegister con el token FCM...');
                
                // Verificar si el callback se ejecutó después de 5 segundos
                setTimeout(() => {
                  Logger.info('🔍 Verificando si el token se obtuvo después de 5 segundos...');
                }, 5000);
              })
              .catch((error) => {
                Logger.error('❌ Error solicitando permisos al iniciar:', error);
              });
          } else {
            // Si no retorna Promise, solo verificar permisos
            Logger.info('⚠️ requestPermissions no retorna Promise, verificando permisos existentes');
            PushNotification.checkPermissions((checkResult) => {
              Logger.info('✅ Estado de permisos:', checkResult);
            });
          }
        } else {
          Logger.warn('⚠️ PushNotification.requestPermissions no está disponible');
          // Usar checkPermissions como alternativa
          PushNotification.checkPermissions((checkResult) => {
            Logger.info('✅ Estado de permisos (check):', checkResult);
          });
        }
      } catch (error) {
        Logger.error('❌ Error solicitando permisos al iniciar:', error);
      }
    }, 1000);
  }
}

export default localNotificationService;

