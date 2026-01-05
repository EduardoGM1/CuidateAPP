/**
 * Servicio para registrar token de dispositivo para notificaciones push
 * 
 * SOLUCIÓN PARA TODOS LOS DISPOSITIVOS ANDROID:
 * - Registra automáticamente el token al iniciar sesión
 * - Funciona con notificaciones push desde el servidor
 * - Más confiable que notificaciones locales programadas
 */

import PushNotification from 'react-native-push-notification';
import { Platform, NativeEventEmitter, DeviceEventEmitter } from 'react-native';
import Logger from './logger';
import servicioApi from '../api/servicioApi';
import AsyncStorage from '@react-native-async-storage/async-storage';


class PushTokenService {
  constructor() {
    this.tokenRegistrado = false;
    this.currentToken = null;
    this.userId = null;
    this.isConfiguring = false;
    this.tokenRefreshListener = null;
    this.messageListener = null;
    this.notificationOpenedListener = null;
    
    // Configurar listener para tokens desde CustomFirebaseMessagingService nativo
    // Según documentación oficial: onNewToken() se activa cuando el token cambia
    this.setupNativeTokenListener();
    
    // Configurar listeners para notificaciones push (con delay para que Firebase se inicialice)
    // Firebase puede tardar unos segundos en inicializarse completamente
    // Intentar configurar inmediatamente y luego con delay como fallback
    // Intentar configurar inmediatamente
    this.setupPushNotificationListeners().catch(error => {
      Logger.warn('⚠️ Configuración inmediata falló, reintentando con delay...', { error: error.message });
    });
    
    // También intentar con delay como fallback
    setTimeout(async () => {
      await this.setupPushNotificationListeners();
      
      // Verificar estado después de 5 segundos
      setTimeout(() => {
        this.verificarEstadoListeners();
      }, 5000);
    }, 3000); // Esperar 3 segundos antes de reconfigurar listeners
  }

  /**
   * Configurar listener para recibir tokens desde el servicio nativo de Firebase
   * 
   * Según la documentación oficial de Firebase:
   * - onNewToken() se activa cuando se genera un token nuevo o cuando cambia
   * - El token puede cambiar cuando: app se restablece, usuario reinstala, usuario borra datos
   * 
   * Este listener captura esos eventos y registra el token automáticamente
   */
  setupNativeTokenListener() {
    try {
      // Usar DeviceEventEmitter para escuchar eventos desde el servicio nativo
      // El servicio nativo CustomFirebaseMessagingService envía eventos 'FCMTokenReceived'
      this.tokenRefreshListener = DeviceEventEmitter.addListener('FCMTokenReceived', async (data) => {
        const token = data.token;
        Logger.info('🔄 Token FCM recibido desde servicio nativo (onNewToken)', {
          tokenPreview: token?.substring(0, 30) + '...',
          tokenLength: token?.length || 0,
          note: 'Token generado o actualizado según documentación oficial de Firebase'
        });
        
        if (token) {
          Logger.info(`🔑 Token FCM obtenido (${token.length} caracteres)`);
        }

        // Si hay un usuario logueado, registrar el token automáticamente
        try {
          const userId = await AsyncStorage.getItem('user_id');
          if (userId && data.token) {
            Logger.info('📱 Registrando token actualizado en el servidor (onNewToken)...');
            await this.registrarToken(parseInt(userId), data.token);
          } else {
            // Guardar como token pendiente si no hay usuario logueado
            await AsyncStorage.setItem('pending_push_token', data.token);
            Logger.info('💾 Token pendiente guardado, se registrará al iniciar sesión');
          }
        } catch (error) {
          Logger.error('Error registrando token desde onNewToken:', error);
        }
      });

      Logger.info('✅ Listener de tokens FCM nativos configurado (onNewToken callback)');
    } catch (error) {
      Logger.warn('⚠️ No se pudo configurar listener de tokens nativos:', error.message);
      // Esto es normal si el servicio nativo no está disponible aún
    }
  }

  /**
   * Configurar listeners para notificaciones push de Firebase
   * Según documentación oficial: https://rnfirebase.io/messaging/usage
   */
  async setupPushNotificationListeners() {
    // Evitar configurar múltiples veces
    if (this.messageListener && this.notificationOpenedListener) {
      Logger.warn('⚠️ Listeners ya están configurados, omitiendo configuración duplicada');
      return;
    }
    
    try {
      // Importar messaging dinámicamente
      const messagingModule = await import('@react-native-firebase/messaging');
      const messaging = messagingModule.default;
      
      if (!messaging || typeof messaging !== 'function') {
        Logger.error('❌ Firebase Messaging no está disponible');
        return;
      }
      
      const messagingInstance = messaging();
      
      if (!messagingInstance) {
        Logger.error('❌ No se pudo obtener instancia de messaging');
        return;
      }
      
      // Verificar que el listener se pueda configurar
      if (typeof messagingInstance.onMessage !== 'function') {
        throw new Error('onMessage no está disponible');
      }
      
      // LISTENER 1: Notificaciones recibidas cuando la app está en FOREGROUND (primer plano)
      this.messageListener = messagingInstance.onMessage(async (remoteMessage) => {
        const notificationTitle = remoteMessage.notification?.title || remoteMessage.data?.title || 'Nueva notificación';
        const notificationBody = remoteMessage.notification?.body || remoteMessage.data?.message || remoteMessage.data?.body || '';
        
        Logger.info(`📬 Notificación push recibida: ${notificationTitle}`);
        
        // ========== ACTUALIZAR CHAT SI ES NOTIFICACIÓN DE MENSAJE ==========
        try {
          const chatNotificationService = (await import('./chatNotificationService.js')).default;
          const rawData = remoteMessage.data || {};
          
          Logger.debug('📦 Datos de notificación push recibidos:', {
            keys: Object.keys(rawData),
            type: rawData.type,
            hasData: !!rawData.data,
            rawData: rawData
          });
          
          // Firebase puede enviar los datos como strings, necesitamos parsearlos
          let data = rawData;
          
          // Si hay un campo 'data' que es un string JSON, parsearlo
          if (rawData.data && typeof rawData.data === 'string') {
            try {
              const parsedData = JSON.parse(rawData.data);
              data = { ...rawData, ...parsedData };
              Logger.debug('✅ Datos JSON parseados correctamente', { parsedData });
            } catch (parseError) {
              Logger.warn('⚠️ Error parseando JSON de data:', parseError);
              // Continuar con los datos originales
            }
          }
          
          // Verificar si es una notificación de nuevo mensaje
          const isNuevoMensaje = data.type === 'nuevo_mensaje' || data.mensaje_id || 
                                 (rawData.type === 'nuevo_mensaje' || rawData.mensaje_id);
          
          if (isNuevoMensaje) {
            Logger.info('💬 Notificación de nuevo mensaje detectada, actualizando chat...', {
              type: data.type || rawData.type,
              mensaje_id: data.mensaje_id || rawData.mensaje_id,
              id_paciente: data.id_paciente || rawData.id_paciente,
              id_doctor: data.id_doctor || rawData.id_doctor,
              remitente: data.remitente || rawData.remitente
            });
            chatNotificationService.emitNuevoMensaje({ data: data, ...rawData });
          } else {
            Logger.debug('ℹ️ Notificación no es de tipo nuevo_mensaje', {
              type: data.type || rawData.type,
              hasMensajeId: !!(data.mensaje_id || rawData.mensaje_id)
            });
          }
        } catch (chatError) {
          Logger.error('❌ Error procesando notificación de chat:', {
            error: chatError.message,
            stack: chatError.stack
          });
        }
        
        // ========== MOSTRAR NOTIFICACIÓN VISUALMENTE ==========
        try {
          // Usar localNotificationService para asegurar que el canal existe y está configurado
          const localNotificationService = (await import('./localNotificationService.js')).default;
          
          const notificationOptions = {
            title: notificationTitle,
            message: notificationBody,
            channelId: 'clinica-movil-reminders',
            data: remoteMessage.data || {},
            tag: remoteMessage.messageId || `notif-${Date.now()}`,
              soundName: 'default',
            playSound: true,
              vibrate: true,
            priority: 'high',
            importance: 4,
          };
          
          await localNotificationService.showNotification(notificationOptions);
          Logger.success('✅ Notificación mostrada visualmente');
          } catch (notificationError) {
          Logger.error('❌ Error mostrando notificación en foreground:', {
            error: notificationError.message
          });
        }
      });
      
      // LISTENER 2: Notificaciones recibidas cuando la app se abre desde una notificación
      this.notificationOpenedListener = messagingInstance.onNotificationOpenedApp((remoteMessage) => {
        const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Notificación';
        Logger.info(`📱 App abierta desde notificación: ${title}`);
      });
      
      // LISTENER 3: Verificar si la app se abrió desde una notificación (cuando estaba cerrada)
      messagingInstance.getInitialNotification().then((remoteMessage) => {
        if (remoteMessage) {
          const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Notificación';
          Logger.info(`🚀 App abierta desde notificación (estaba cerrada): ${title}`);
        }
      });
      
      // LISTENER 4: Escuchar eventos desde el servicio nativo (para notificaciones en background)
      DeviceEventEmitter.addListener('FCMessageReceived', async (data) => {
        const title = data.title || 'Notificación';
        Logger.info(`📨 Notificación recibida (background): ${title}`);
        
        // Si es una notificación de nuevo mensaje, emitir evento para actualizar el chat
        try {
          const chatNotificationService = (await import('./chatNotificationService.js')).default;
          const rawData = data.data || data;
          
          Logger.debug('📦 Datos de notificación (background):', {
            keys: Object.keys(rawData || {}),
            rawData: rawData
          });
          
          // Parsear JSON si viene como string
          let notificationData = rawData;
          if (rawData && typeof rawData === 'object' && rawData.data && typeof rawData.data === 'string') {
            try {
              notificationData = { ...rawData, ...JSON.parse(rawData.data) };
              Logger.debug('✅ Datos JSON parseados (background)');
            } catch (e) {
              Logger.warn('⚠️ Error parseando JSON (background):', e);
            }
          }
          
          const isNuevoMensaje = notificationData?.type === 'nuevo_mensaje' || 
                                 notificationData?.mensaje_id ||
                                 (rawData?.type === 'nuevo_mensaje' || rawData?.mensaje_id);
          
          if (isNuevoMensaje) {
            Logger.info('💬 Notificación de nuevo mensaje detectada (background), actualizando chat...');
            chatNotificationService.emitNuevoMensaje(notificationData || rawData);
          }
        } catch (chatError) {
          Logger.error('❌ Error procesando notificación de chat (background):', {
            error: chatError.message,
            stack: chatError.stack
          });
        }
      });
      
      Logger.info('✅ Listeners de notificaciones push configurados correctamente');
    } catch (error) {
      Logger.error('❌ Error configurando listeners:', {
        error: error.message,
        stack: error.stack
      });
      
      Logger.warn('⚠️ Error configurando listeners de notificaciones push:', error.message);
      Logger.warn('   Esto es normal si Firebase aún no está completamente inicializado');
      Logger.warn('   Los listeners se reconfigurarán automáticamente cuando Firebase esté listo');
    }
  }
  
  /**
   * Verificar estado de los listeners
   */
  verificarEstadoListeners() {
    Logger.debug('🔍 Estado de listeners:', {
      onMessage: !!this.messageListener,
      onNotificationOpenedApp: !!this.notificationOpenedListener,
      FCMessageReceived: !!this.tokenRefreshListener
    });
  }
  
  /**
   * Reconfigurar listeners (útil si Firebase se inicializa después)
   */
  async reconfigurarListeners() {
    Logger.info('🔄 Reconfigurando listeners de notificaciones push...');
    
    // Limpiar listeners existentes
    if (this.messageListener) {
      try {
        this.messageListener();
      } catch (e) {
        // Ignorar errores al limpiar
      }
      this.messageListener = null;
    }
    if (this.notificationOpenedListener) {
      try {
        this.notificationOpenedListener();
      } catch (e) {
        // Ignorar errores al limpiar
      }
      this.notificationOpenedListener = null;
    }
    
    // Reconfigurar
    await this.setupPushNotificationListeners();
  }
  
  /**
   * Probar que los listeners funcionan (método de diagnóstico)
   */
  async probarListeners() {
    Logger.info('🧪 Verificando estado de listeners...');
    this.verificarEstadoListeners();
    
    // Verificar que Firebase esté disponible
    try {
      const messagingModule = await import('@react-native-firebase/messaging');
      const messaging = messagingModule.default;
      
      if (messaging && typeof messaging === 'function') {
        const messagingInstance = messaging();
        Logger.info('✅ Firebase Messaging disponible', {
          onMessage: typeof messagingInstance.onMessage === 'function',
          getToken: typeof messagingInstance.getToken === 'function'
        });
      } else {
        Logger.error('❌ Firebase Messaging NO está disponible');
      }
    } catch (error) {
      Logger.error('❌ Error verificando Firebase Messaging:', { error: error.message });
    }
  }

  /**
   * Limpiar listeners cuando se destruye el servicio
   */
  cleanup() {
    if (this.tokenRefreshListener) {
      this.tokenRefreshListener.remove();
      this.tokenRefreshListener = null;
      Logger.info('🧹 Listener de tokens FCM nativos limpiado');
    }
    
    if (this.messageListener) {
      this.messageListener();
      this.messageListener = null;
      Logger.info('🧹 Listener de mensajes en foreground limpiado');
    }
    
    if (this.notificationOpenedListener) {
      this.notificationOpenedListener();
      this.notificationOpenedListener = null;
      Logger.info('🧹 Listener de notificaciones abiertas limpiado');
    }
  }

  /**
   * Configurar y obtener token de dispositivo
   * Se llama automáticamente cuando se configura PushNotification
   */
  async configurar(onTokenReceived) {
    if (this.isConfiguring) return;
    this.isConfiguring = true;

    try {
      // Solicitar permisos
      await PushNotification.requestPermissions();
      
      // El token se obtendrá en el callback onRegister de PushNotification.configure
      // que está en localNotificationService.js
      if (onTokenReceived) {
        this.onTokenReceivedCallback = onTokenReceived;
      }
    } catch (error) {
      Logger.error('Error configurando push token service:', error);
      this.isConfiguring = false;
    }
  }

  /**
   * Registrar token en el servidor
   * Se llama cuando se recibe el token de PushNotification
   */
  async registrarToken(userId, deviceToken) {
    try {
      if (!userId || !deviceToken) {
        Logger.warn('No se puede registrar token: falta userId o deviceToken', { userId: !!userId, token: !!deviceToken });
        return;
      }

      this.currentToken = deviceToken;
      this.userId = userId;

      // Verificar si ya está registrado
      const tokenGuardado = await AsyncStorage.getItem(`push_token_${userId}`);
      if (tokenGuardado === deviceToken && this.tokenRegistrado) {
        Logger.info('Token ya registrado, no es necesario volver a registrar');
        return;
      }

      // Obtener información del dispositivo
      const deviceInfo = {
        manufacturer: Platform.constants?.Manufacturer || 'Unknown',
        brand: Platform.constants?.Brand || 'Unknown',
        model: Platform.constants?.Model || 'Unknown',
        os_version: Platform.Version?.toString() || 'Unknown',
        platform: Platform.OS,
      };

      Logger.info('Registrando token en el servidor', { 
        userId, 
        platform: Platform.OS,
        manufacturer: deviceInfo.manufacturer,
        tokenLength: deviceToken?.length || 0
      });

      // Validar que el token tenga la longitud correcta (50-500 caracteres)
      if (!deviceToken || deviceToken.length < 50 || deviceToken.length > 500) {
        Logger.error('❌ Token inválido: longitud incorrecta', {
          tokenLength: deviceToken?.length || 0,
          token: deviceToken?.substring(0, 20) + '...',
          tokenType: deviceToken?.startsWith('fcm_temp_') ? 'alternativo_antiguo (NO PERMITIDO)' : 'otro'
        });
        Logger.error('   NO se generarán tokens alternativos - el problema debe resolverse');
        Logger.error('   Si el token es alternativo antiguo, elimínalo y obtén un token FCM real');
        throw new Error(`Token inválido: longitud ${deviceToken?.length || 0} (requerido: 50-500). Token alternativo no permitido.`);
      }

      // Registrar token en el servidor
      // Nota: servicioApi ya tiene baseURL con /api, así que solo usamos /mobile/device/register
      const response = await servicioApi.post('/mobile/device/register', {
        device_token: deviceToken,
        platform: Platform.OS,
        device_info: deviceInfo,
      });

      // Guardar token localmente
      await AsyncStorage.setItem(`push_token_${userId}`, deviceToken);
      this.tokenRegistrado = true;

      Logger.success('Token registrado exitosamente en el servidor', { 
        userId,
        platform: Platform.OS,
        manufacturer: deviceInfo.manufacturer 
      });

      return response;
    } catch (error) {
      // Mejorar el logging del error para diagnóstico
      if (error.response) {
        // El servidor respondió con un código de estado fuera del rango 2xx
        Logger.error('Error registrando token en servidor:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          tokenLength: deviceToken?.length || 0,
          platform: Platform.OS
        });
        
        // Si es un error de validación, mostrar detalles
        if (error.response.status === 400 && error.response.data?.details) {
          Logger.error('Errores de validación:', error.response.data.details);
        }
      } else if (error.request) {
        // La solicitud fue hecha pero no se recibió respuesta
        Logger.error('Error de red al registrar token:', {
          message: error.message,
          tokenLength: deviceToken?.length || 0
        });
      } else {
        // Algo más causó el error
        Logger.error('Error inesperado al registrar token:', {
          message: error.message,
          stack: error.stack,
          tokenLength: deviceToken?.length || 0
        });
      }
      
      this.tokenRegistrado = false;
      throw error;
    }
  }

  /**
   * Registrar token automáticamente al iniciar sesión
   */
  async registrarTokenAlIniciarSesion(userId, deviceToken) {
    try {
      await this.registrarToken(userId, deviceToken);
    } catch (error) {
      Logger.error('Error registrando token al iniciar sesión:', error);
      // No lanzar error para no bloquear el login
    }
  }

  /**
   * Obtener token actual
   */
  getToken() {
    return this.currentToken;
  }

  /**
   * Verificar si el token está registrado
   * También verifica en AsyncStorage si el token está guardado
   */
  async isTokenRegistrado() {
    // Si ya está registrado en memoria, retornar true
    if (this.tokenRegistrado && this.currentToken !== null) {
      return true;
    }
    
    // Si hay userId, verificar en AsyncStorage
    if (this.userId) {
      try {
        const tokenGuardado = await AsyncStorage.getItem(`push_token_${this.userId}`);
        if (tokenGuardado) {
          this.currentToken = tokenGuardado;
          this.tokenRegistrado = true;
          return true;
        }
      } catch (error) {
        Logger.error('Error verificando token en AsyncStorage:', error);
      }
    }
    
    return false;
  }

  /**
   * Forzar obtención del token de PushNotification
   * 
   * MÉTODO PRINCIPAL: Firebase Messaging (FCM real)
   * MÉTODO FALLBACK: react-native-push-notification (callback onRegister)
   */
  async forzarObtencionToken() {
    try {
      Logger.info('🔍 Forzando obtención de token...');
      
      // Paso 1: Intentar obtener token con Firebase Messaging (MÉTODO PRINCIPAL)
      Logger.info('🔥 Paso 1: Intentando obtener token FCM con Firebase Messaging...');
      const tokenFCM = await this.obtenerTokenFirebaseMessaging();
      if (tokenFCM) {
        Logger.success('✅ Token FCM REAL obtenido con Firebase Messaging');
        this.currentToken = tokenFCM;
        
        // Guardar token pendiente para que se registre al iniciar sesión
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem('pending_push_token', tokenFCM);
        
        return true;
      }
      
      // Si Firebase falla, NO usar token alternativo - el error debe ser resuelto
      Logger.error('❌ Firebase Messaging no pudo obtener token');
      Logger.error('   NO se generará token alternativo - el problema debe resolverse');
      Logger.error('   Revisa los logs anteriores para ver el error específico');
      Logger.info('   Para obtener tokens FCM reales, recompila: cd android && ./gradlew clean && cd .. && npm run android');
      
      // Paso 2: Solicitar permisos para react-native-push-notification
      Logger.info('📱 Intentando obtener token con react-native-push-notification...');
      
      try {
        const permissions = PushNotification.requestPermissions();
        
        // Verificar si retorna Promise
        if (permissions && typeof permissions.then === 'function') {
          await permissions;
        }
        
        Logger.info('Permisos solicitados');
      } catch (permError) {
        Logger.warn('Error solicitando permisos:', permError);
      }
      
      // Verificar permisos
      return new Promise((resolve) => {
        PushNotification.checkPermissions((checkResult) => {
          Logger.info('Estado de permisos:', checkResult);
          
          if (checkResult.alert) {
            Logger.info('✅ Permisos básicos otorgados, esperando token en onRegister...');
            
            // Esperar un poco para que onRegister se ejecute
            setTimeout(async () => {
              // Verificar si se obtuvo el token
              const tokenDespues = await this.obtenerTokenDirecto();
              
              if (tokenDespues) {
                Logger.success('✅ Token obtenido después de solicitar permisos');
                resolve(true);
              } else {
                // NO generar token alternativo - el problema debe resolverse
                Logger.error('❌ Token FCM no obtenido después de todos los intentos');
                Logger.error('   NO se generará token alternativo - el problema debe resolverse');
                Logger.error('   Revisa los logs anteriores para ver el error específico de Firebase');
                Logger.error('   Soluciones posibles:');
                Logger.error('   1. Verifica que google-services.json esté en android/app/');
                Logger.error('   2. Verifica que el plugin de Google Services esté aplicado');
                Logger.error('   3. Recompila la app: cd android && ./gradlew clean && cd .. && npm run android');
                resolve(false);
              }
            }, 3000);
          } else {
            Logger.warn('⚠️ Permisos no otorgados:', checkResult);
            resolve(false);
          }
        });
      });
    } catch (error) {
      Logger.error('Error forzando obtención de token:', error);
      return false;
    }
  }

  /**
   * Obtener token directamente si está disponible
   * Nota: react-native-push-notification no tiene un método directo para obtener el token
   * El token solo se obtiene en el callback onRegister
   * 
   * IMPORTANTE: Valida que el token tenga la longitud correcta (50-500 caracteres)
   */
  async obtenerTokenDirecto() {
    try {
      // Verificar si hay un token guardado
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const userId = await AsyncStorage.getItem('user_id');
      
      if (userId) {
        const tokenGuardado = await AsyncStorage.getItem(`push_token_${userId}`);
        if (tokenGuardado) {
          // Validar que el token tenga la longitud correcta
          if (tokenGuardado.length >= 50 && tokenGuardado.length <= 500) {
            Logger.info('Token encontrado en almacenamiento local', {
              tokenLength: tokenGuardado.length
            });
            this.currentToken = tokenGuardado;
            this.tokenRegistrado = true;
            return tokenGuardado;
          } else {
            Logger.warn('Token guardado tiene longitud inválida, limpiándolo', {
              tokenLength: tokenGuardado.length,
              token: tokenGuardado.substring(0, 20) + '...'
            });
            // Limpiar token inválido
            await AsyncStorage.removeItem(`push_token_${userId}`);
          }
        }
      }
      
      // Verificar token pendiente
      const pendingToken = await AsyncStorage.getItem('pending_push_token');
      if (pendingToken) {
        // Validar que el token pendiente tenga la longitud correcta
        if (pendingToken.length >= 50 && pendingToken.length <= 500) {
          Logger.info('Token pendiente encontrado', {
            tokenLength: pendingToken.length
          });
          return pendingToken;
        } else {
          Logger.warn('Token pendiente tiene longitud inválida, limpiándolo', {
            tokenLength: pendingToken.length
          });
          await AsyncStorage.removeItem('pending_push_token');
        }
      }
      
      Logger.warn('No se encontró token válido en almacenamiento');
      return null;
    } catch (error) {
      Logger.error('Error obteniendo token directo:', error);
      return null;
    }
  }

  /**
   * MÉTODO PRINCIPAL: Usar Firebase Messaging para obtener token FCM real
   * Este es el método preferido y más confiable para obtener tokens FCM
   * 
   * IMPORTANTE: Requiere que @react-native-firebase/messaging esté instalado
   * y que google-services.json esté en android/app/
   * 
   * SEGÚN DOCUMENTACIÓN OFICIAL (https://rnfirebase.io/messaging/usage):
   * - Usar messaging() directamente (API namespaced)
   * - messaging().requestPermission() para solicitar permisos
   * - messaging().getToken() para obtener el token
   * - Firebase se inicializa automáticamente si está bien configurado
   * 
   */
  async obtenerTokenFirebaseMessaging() {
    try {
      Logger.info('🔥 Intentando obtener token FCM usando Firebase Messaging (según documentación oficial)...');
      
      // PASO 1: Importar messaging según documentación oficial
      let messaging;
      try {
        const messagingModule = await import('@react-native-firebase/messaging');
        messaging = messagingModule.default;
        
        if (!messaging || typeof messaging !== 'function') {
          throw new Error('Firebase Messaging no está disponible o no es una función');
        }
        
        Logger.info('✅ Firebase Messaging importado correctamente');
        Logger.debug('   Tipo de messaging:', typeof messaging);
      } catch (importError) {
        Logger.error('❌ Error importando Firebase Messaging:', importError.message);
        Logger.error('   Stack:', importError.stack);
        Logger.error('   Verifica que @react-native-firebase/messaging esté instalado:');
        Logger.error('   npm install @react-native-firebase/messaging');
        Logger.error('   Luego recompila: cd android && ./gradlew clean && cd .. && npm run android');
        return null;
      }
      
      // PASO 2: Verificar que Firebase App esté disponible
      // Intentar obtener la instancia de messaging para verificar que Firebase esté inicializado
      Logger.info('📱 Verificando que Firebase App esté inicializado...');
      let messagingInstance;
      try {
        messagingInstance = messaging();
        if (!messagingInstance) {
          throw new Error('No se pudo obtener instancia de messaging()');
        }
        Logger.info('✅ Firebase App está inicializado');
      } catch (appError) {
        Logger.error('❌ Error obteniendo instancia de Firebase App:', appError.message);
        Logger.error('   Esto indica que Firebase no está completamente inicializado');
        Logger.error('   Verifica que google-services.json esté en android/app/');
        Logger.error('   Verifica que el plugin de Google Services esté aplicado');
        return null;
      }
      
      // PASO 3: Esperar a que Firebase se inicialice completamente
      // El error MISSING_INSTANCEID_SERVICE indica que Firebase no está listo
      Logger.info('⏳ Esperando a que Firebase se inicialice completamente (hasta 15 segundos)...');
      const firebaseInitService = (await import('./firebaseInitService')).default;
      const isReady = await firebaseInitService.waitUntilReady(15000); // Aumentar a 15 segundos
      
      if (!isReady) {
        Logger.warn('⚠️ Firebase no está completamente listo después de esperar, pero continuando...');
        Logger.warn('   Esto puede causar MISSING_INSTANCEID_SERVICE');
      } else {
        Logger.info('✅ Firebase está completamente inicializado');
      }
      
      // PASO 4: Solicitar permisos de notificación según documentación oficial
      Logger.info('📱 Solicitando permisos de notificación...');
      
      let authStatus;
      try {
        authStatus = await messagingInstance.requestPermission();
        Logger.info('📱 Estado de permisos:', { authStatus });
        
        // Verificar permisos según documentación oficial
        // 0 = denied, 1 = authorized, 2 = provisional (iOS)
        const enabled = 
          authStatus === 1 || // AUTHORIZED
          authStatus === 2;   // PROVISIONAL (iOS)

        if (!enabled) {
          Logger.warn('⚠️ Permisos de notificación no otorgados', { authStatus });
          Logger.warn('   El usuario debe otorgar permisos en la configuración del dispositivo');
          return null;
        }
      } catch (permError) {
        Logger.warn('⚠️ Error solicitando permisos:', permError.message);
        Logger.warn('   Continuando de todas formas (en Android puede no ser necesario)...');
      }

      Logger.info('✅ Permisos verificados o no requeridos');

      // PASO 5: Intentar obtener token desde el servicio nativo primero
      // El servicio nativo CustomFirebaseMessagingService puede tener el token ya generado
      Logger.info('🔑 Intentando obtener token FCM...');
      Logger.info('   Primero intentaremos obtenerlo desde el servicio nativo...');
      
      // Esperar un poco más para que el servicio nativo genere el token
      // El servicio nativo se activa cuando Firebase se inicializa completamente
      Logger.info('   Esperando 5 segundos para que el servicio nativo genere el token...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      let fcmToken;
      let attempts = 0;
      const maxAttempts = 10; // Aumentar a 10 intentos
      
      while (attempts < maxAttempts && !fcmToken) {
        try {
          Logger.debug(`   Intento ${attempts + 1}/${maxAttempts} de obtener token...`);
          
          // Intentar obtener el token usando el método nativo directamente
          // Esto puede funcionar mejor que el método JavaScript
          try {
            // Primero intentar con el método estándar
            fcmToken = await messagingInstance.getToken();
          } catch (directError) {
            // Si falla, puede ser que necesitemos usar el servicio nativo
            Logger.debug('   Método directo falló, intentando alternativa...');
            // Esperar un poco más y reintentar
            await new Promise(resolve => setTimeout(resolve, 2000));
            fcmToken = await messagingInstance.getToken();
          }
          
          if (fcmToken && fcmToken.length > 0) {
            // Prefijar con "FCM:" para que el backend sepa que es un token de Firebase
            const prefixedToken = `FCM:${fcmToken}`;
            
            Logger.success('✅ Token FCM REAL obtenido exitosamente', {
              tokenLength: fcmToken.length,
              tokenPreview: fcmToken.substring(0, 30) + '...',
              tokenType: 'FCM_REAL',
              isFCM: true,
              apiVersion: 'namespaced_official',
              attempt: attempts + 1
            });
            
            Logger.info(`🔑 Token FCM obtenido (${fcmToken.length} caracteres)`);
            
            return prefixedToken;
          } else {
            throw new Error('Token vacío o inválido');
          }
        } catch (tokenError) {
          attempts++;
          
          const errorMessage = tokenError.message || '';
          const errorCode = tokenError.code || '';
          
          Logger.warn(`⚠️ Intento ${attempts}/${maxAttempts} fallido:`, {
            message: errorMessage,
            code: errorCode
          });
          
          // Si es MISSING_INSTANCEID_SERVICE, el problema es más profundo
          if (errorMessage.includes('MISSING_INSTANCEID_SERVICE') || 
              errorMessage.includes('InstanceID') ||
              errorCode === 'messaging/unknown') {
            
            Logger.warn(`⚠️ MISSING_INSTANCEID_SERVICE detectado (intento ${attempts}/${maxAttempts})`);
            Logger.warn('   Este error generalmente indica uno de estos problemas:');
            Logger.warn('   1. Google Play Services no está disponible en el dispositivo/emulador');
            Logger.warn('   2. Firebase Installations API no está habilitada en Google Cloud Console');
            Logger.warn('   3. La clave de API está restringida y no incluye Firebase Installations API');
            Logger.warn('   4. El dispositivo/emulador no tiene conexión a internet');
            
            if (attempts < maxAttempts) {
              // Esperar progresivamente más tiempo en cada intento
              // El servicio puede tardar más en inicializarse
              const waitTime = Math.min(5000 * attempts, 15000); // 5s, 10s, 15s, 15s...
              Logger.info(`   Esperando ${waitTime}ms antes de reintentar...`);
              Logger.info('   Firebase puede tardar más en inicializarse completamente');
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            } else {
              // Último intento falló - proporcionar solución detallada
              Logger.error('❌ ERROR: MISSING_INSTANCEID_SERVICE después de múltiples intentos');
              Logger.error('');
              Logger.error('🔍 SOLUCIONES DETALLADAS:');
              Logger.error('');
              Logger.error('1. VERIFICAR GOOGLE PLAY SERVICES:');
              Logger.error('   - Si usas emulador: Asegúrate de usar un emulador con Google Play Services');
              Logger.error('   - Si usas dispositivo: Verifica que Google Play Services esté actualizado');
              Logger.error('   - Comando: Ir a Configuración > Apps > Google Play Services > Actualizar');
              Logger.error('');
              Logger.error('2. VERIFICAR FIREBASE INSTALLATIONS API:');
              Logger.error('   - Ve a Google Cloud Console: https://console.cloud.google.com/');
              Logger.error('   - Selecciona tu proyecto: clinicamovil-f70e0');
              Logger.error('   - Ve a "APIs y servicios" > "Biblioteca"');
              Logger.error('   - Busca "Firebase Installations API" y habilítala');
              Logger.error('   - Si tu clave de API está restringida, añade esta API a las restricciones');
              Logger.error('');
              Logger.error('3. VERIFICAR CLAVE DE API:');
              Logger.error('   - Ve a "APIs y servicios" > "Credenciales"');
              Logger.error('   - Encuentra tu clave: AIzaSyDyJZfvW7GiTC_WXYlS-uTc0AQUYbmJiqY');
              Logger.error('   - Si está restringida, añade "Firebase Installations API" a las restricciones');
              Logger.error('');
              Logger.error('4. VERIFICAR CONEXIÓN:');
              Logger.error('   - Asegúrate de que el dispositivo/emulador tenga conexión a internet');
              Logger.error('   - Verifica que pueda acceder a servicios de Google');
              Logger.error('');
              Logger.error('5. REINICIAR Y REINTENTAR:');
              Logger.error('   - Cierra completamente la app');
              Logger.error('   - Reinicia el dispositivo/emulador');
              Logger.error('   - Espera 30 segundos después de abrir la app');
              Logger.error('   - Intenta iniciar sesión nuevamente');
              Logger.error('');
              Logger.error('Error completo:', errorMessage);
              Logger.error('Error code:', errorCode);
              
              // No lanzar error inmediatamente, dar oportunidad de que el servicio nativo lo genere
              Logger.warn('');
              Logger.warn('⚠️ Intentando obtener token desde servicio nativo (puede tardar más)...');
              Logger.warn('   El servicio nativo puede generar el token automáticamente');
              Logger.warn('   Si el token se genera, se registrará automáticamente cuando cambie');
              
              // Retornar null pero no lanzar error - el servicio nativo puede manejar esto
              return null;
            }
          }
          
          // Otros errores
          if (attempts < maxAttempts) {
            Logger.warn('   Reintentando...');
            await new Promise(resolve => setTimeout(resolve, Math.min(3000 * attempts, 12000)));
          } else {
            Logger.error('❌ Error obteniendo token FCM después de múltiples intentos:', errorMessage);
            Logger.error('   Error code:', errorCode);
            throw tokenError;
          }
        }
      }
      
      if (!fcmToken) {
        Logger.error('❌ No se pudo obtener token FCM después de múltiples intentos');
        return null;
      }
      
      return fcmToken;
    } catch (error) {
      // Manejar errores generales
      const errorMessage = error.message || '';
      if (errorMessage.includes('MISSING_INSTANCEID_SERVICE') || 
          errorMessage.includes('InstanceID')) {
        Logger.error('❌ Firebase no se puede inicializar correctamente');
        Logger.error('   Revisa la configuración de Firebase y recompila la app');
        throw error;
      } else {
        Logger.error('❌ Error obteniendo token FCM:', errorMessage);
        Logger.error('   Stack:', error.stack);
        throw error;
      }
    }
  }

  /**
   * DEPRECADO: Este método ya no se usa
   * NO generar tokens alternativos - el problema de Firebase debe resolverse
   * 
   * Si llegas aquí, significa que Firebase no está configurado correctamente.
   * Revisa los logs anteriores para ver el error específico.
   */
  async obtenerTokenAlternativo() {
    Logger.error('❌ obtenerTokenAlternativo() llamado - esto NO debería suceder');
    Logger.error('   Los tokens alternativos están DESHABILITADOS');
    Logger.error('   El problema de Firebase debe resolverse antes de continuar');
    Logger.error('   Revisa los logs anteriores para ver el error específico de Firebase');
    throw new Error('Tokens alternativos deshabilitados - Firebase debe estar configurado correctamente');
  }

  /**
   * Limpiar token al cerrar sesión
   */
  async limpiarToken() {
    try {
      if (this.userId && this.currentToken) {
        // Desregistrar token del servidor
        await servicioApi.post('/mobile/device/unregister', {
          device_token: this.currentToken,
        });
      }

      // Limpiar datos locales
      if (this.userId) {
        await AsyncStorage.removeItem(`push_token_${this.userId}`);
      }

      this.currentToken = null;
      this.userId = null;
      this.tokenRegistrado = false;

      Logger.info('Token limpiado exitosamente');
    } catch (error) {
      Logger.error('Error limpiando token:', error);
    }
  }
}

// Singleton
const pushTokenService = new PushTokenService();

export default pushTokenService;

