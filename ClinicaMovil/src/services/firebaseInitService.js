/**
 * Servicio para inicializar Firebase explícitamente
 * 
 * SEGÚN DOCUMENTACIÓN OFICIAL:
 * - Firebase se inicializa automáticamente si está bien configurado
 * - No necesitamos inicializar manualmente si google-services.json está correcto
 * - Este servicio solo verifica que Firebase esté listo antes de obtener tokens
 */

import { Platform } from 'react-native';
import Logger from './logger';

class FirebaseInitService {
  constructor() {
    this.isInitialized = false;
    this.initializationPromise = null;
  }

  /**
   * Verificar que Firebase esté listo
   * Según documentación oficial, Firebase se inicializa automáticamente
   * Solo necesitamos verificar que esté disponible
   */
  async initialize() {
    // Si ya está inicializado, retornar
    if (this.isInitialized) {
      Logger.info('✅ Firebase ya está verificado');
      return true;
    }

    // Si ya hay una verificación en progreso, esperar
    if (this.initializationPromise) {
      Logger.info('⏳ Firebase se está verificando, esperando...');
      return await this.initializationPromise;
    }

    // Iniciar proceso de verificación
    this.initializationPromise = this._doInitialize();
    
    try {
      const result = await this.initializationPromise;
      this.isInitialized = result;
      if (result) {
        Logger.success('✅ Firebase está listo');
      }
      return result;
    } catch (error) {
      Logger.error('❌ Error verificando Firebase:', error);
      this.initializationPromise = null;
      return false;
    }
  }

  /**
   * Verificar que Firebase esté disponible
   * Según documentación oficial: Usar messaging() directamente
   */
  async _doInitialize() {
    try {
      Logger.info('🔥 Verificando que Firebase esté disponible...');

      // Intentar importar messaging según documentación oficial
      try {
        const messagingModule = await import('@react-native-firebase/messaging');
        const messaging = messagingModule.default;
        
        if (messaging && typeof messaging === 'function') {
          Logger.success('✅ Firebase Messaging está disponible');
          return true;
        }
      } catch (importError) {
        Logger.warn('⚠️ Firebase no está disponible aún (puede estar inicializándose):', importError.message);
        // No es un error fatal, Firebase puede estar inicializándose
        return false;
      }
      
      return false;
    } catch (error) {
      Logger.error('❌ Error en _doInitialize:', error);
      return false;
    }
  }

  /**
   * Verificar si Firebase está listo
   * Según documentación oficial: Usar messaging() directamente
   */
  async isReady() {
    try {
      const messagingModule = await import('@react-native-firebase/messaging');
      const messaging = messagingModule.default;
      return !!messaging && typeof messaging === 'function';
    } catch (error) {
      return false;
    }
  }

  /**
   * Esperar a que Firebase esté completamente listo
   * Según documentación: Firebase se inicializa automáticamente, solo necesitamos esperar
   * 
   * Este método intenta obtener una instancia de messaging para verificar que Firebase esté realmente listo
   */
  async waitUntilReady(maxWaitTime = 15000) {
    const startTime = Date.now();
    const checkInterval = 1000; // Verificar cada segundo
    
    Logger.info(`⏳ Esperando a que Firebase esté completamente listo (máximo ${maxWaitTime}ms)...`);
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // No solo verificar que el módulo esté disponible, sino intentar obtener una instancia
        const messagingModule = await import('@react-native-firebase/messaging');
        const messaging = messagingModule.default;
        
        if (messaging && typeof messaging === 'function') {
          // Intentar obtener una instancia para verificar que Firebase esté realmente inicializado
          try {
            const instance = messaging();
            if (instance) {
              Logger.info('✅ Firebase está completamente listo');
              return true;
            }
          } catch (instanceError) {
            // Si falla obtener la instancia, Firebase aún no está listo
            Logger.debug(`   Firebase aún no está listo (intento ${Math.floor((Date.now() - startTime) / checkInterval)})...`);
          }
        }
      } catch (error) {
        Logger.debug(`   Error verificando Firebase: ${error.message}`);
      }
      
      // Esperar antes de verificar nuevamente
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    const elapsed = Date.now() - startTime;
    Logger.warn('⚠️ Firebase no está completamente listo después de esperar', {
      maxWaitTime,
      elapsed
    });
    
    // Intentar verificar una última vez
    try {
      const messagingModule = await import('@react-native-firebase/messaging');
      const messaging = messagingModule.default;
      if (messaging && typeof messaging === 'function') {
        const instance = messaging();
        if (instance) {
          Logger.info('✅ Firebase está listo en el último intento');
          return true;
        }
      }
    } catch (error) {
      Logger.debug('   Último intento falló:', error.message);
    }
    
    return false;
  }
}

// Singleton
const firebaseInitService = new FirebaseInitService();

export default firebaseInitService;


