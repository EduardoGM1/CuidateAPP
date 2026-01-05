/**
 * Servicio de Texto a Voz (TTS)
 * 
 * Proporciona funcionalidad de síntesis de voz para pacientes
 * con limitaciones de lectura o visuales.
 * 
 * Idioma: Español mexicano
 */

import Tts from 'react-native-tts';
import { Platform } from 'react-native';
import Logger from './logger';

class TTSService {
  constructor() {
    this.isInitialized = false;
    this.isEnabled = true; // Puede desactivarse por el usuario
    this.speaking = false;
    this.isEmulator = false; // Detectar si es emulador
    
    // Sistema de cola inteligente
    this.queue = {
      high: [],    // Urgente (alertas, errores)
      medium: [],  // Importante (confirmaciones, recordatorios)
      low: []      // General (información, navegación)
    };
    this.processingQueue = false;
    
    // Cache de mensajes recientes (evita repetición)
    this.messageCache = [];
    this.cacheMaxSize = 5;
    this.cacheMaxAge = 10000; // 10 segundos
    
    // Configuración adaptativa
    // NOTA: Los emuladores suelen reproducir TTS más rápido, usar velocidad más lenta
    this.defaultRate = 0.9;
    this.emulatorRate = 0.6; // Velocidad más lenta para emuladores
    this.defaultVolume = 1.0; // Volumen por defecto (0.0-1.0)
    this.adaptiveRates = {
      instruction: 0.85,    // Instrucciones: más lento
      confirmation: 0.9,    // Confirmaciones: normal
      information: 0.9,     // Información: normal
      alert: 0.95,          // Alertas: más rápido pero claro
      error: 0.85,          // Errores: más lento para claridad
    };
    // Velocidades adaptativas para emuladores (más lentas)
    this.emulatorAdaptiveRates = {
      instruction: 0.5,    // Instrucciones: muy lento en emulador
      confirmation: 0.6,   // Confirmaciones: lento en emulador
      information: 0.6,     // Información: lento en emulador
      alert: 0.65,          // Alertas: lento pero claro en emulador
      error: 0.5,           // Errores: muy lento para claridad en emulador
    };
  }

  /**
   * Detectar si estamos en un emulador Android
   */
  async detectEmulator() {
    if (Platform.OS !== 'android') {
      this.isEmulator = false;
      return false;
    }

    try {
      const { NativeModules } = require('react-native');
      const DeviceInfo = NativeModules?.DeviceInfo || NativeModules?.RNDeviceInfo;
      
      if (DeviceInfo) {
        // Método 1: Verificar modelo
        if (DeviceInfo.getModel) {
          const model = DeviceInfo.getModel();
          if (model && (
            model.toLowerCase().includes('sdk') || 
            model.toLowerCase().includes('emulator') ||
            model.toLowerCase().includes('generic') ||
            model === 'Android SDK built for x86' ||
            model === 'sdk_gphone64_arm64'
          )) {
            this.isEmulator = true;
            Logger.info('TTS: Emulador detectado por modelo', { model });
            return true;
          }
        }
        
        // Método 2: Verificar fingerprint
        if (DeviceInfo.getFingerprint) {
          const fingerprint = DeviceInfo.getFingerprint();
          if (fingerprint && (
            fingerprint.includes('generic') || 
            fingerprint.includes('unknown') ||
            fingerprint.includes('test-keys')
          )) {
            this.isEmulator = true;
            Logger.info('TTS: Emulador detectado por fingerprint', { fingerprint });
            return true;
          }
        }
      }
      
      // Método 3: Verificar build info (común en emuladores)
      if (DeviceInfo?.getBuildNumber) {
        const buildNumber = DeviceInfo.getBuildNumber();
        if (buildNumber && buildNumber.includes('test')) {
          this.isEmulator = true;
          Logger.info('TTS: Emulador detectado por build number', { buildNumber });
          return true;
        }
      }
    } catch (error) {
      Logger.warn('TTS: Error detectando emulador, asumiendo dispositivo físico', error);
    }

    this.isEmulator = false;
    return false;
  }

  /**
   * Establecer volumen por defecto
   * @param {number} volume - Volumen (0.0-1.0)
   */
  setDefaultVolume(volume) {
    this.defaultVolume = Math.max(0, Math.min(1, volume)); // Clamp entre 0 y 1
    Logger.debug('TTS: Volumen por defecto actualizado', { volume: this.defaultVolume });
  }

  /**
   * Obtener volumen por defecto
   * @returns {number} Volumen actual (0.0-1.0)
   */
  getDefaultVolume() {
    return this.defaultVolume;
  }

  /**
   * Inicializar el servicio TTS
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        Logger.debug('TTS: Ya está inicializado');
        return;
      }

      Logger.debug('TTS: Iniciando inicialización...');

      // Verificar disponibilidad
      let engines = [];
      try {
        engines = await Tts.engines();
        Logger.debug('TTS: Motores disponibles', { 
          count: engines?.length || 0, 
          engines: engines?.map(e => ({ name: e.name, package: e.package })) || [] 
        });
      } catch (enginesError) {
        Logger.error('TTS: Error obteniendo motores', enginesError);
      }

      if (!engines || engines.length === 0) {
        Logger.warn('TTS: No hay motores de TTS disponibles. Verifica que el dispositivo tenga voces instaladas.');
        this.isInitialized = false;
        return;
      }

      // Verificar voces disponibles
      try {
        const voices = await Tts.voices();
        Logger.debug('TTS: Voces disponibles', { 
          count: voices?.length || 0,
          voices: voices?.slice(0, 5).map(v => ({ name: v.name, language: v.language })) || []
        });
      } catch (voicesError) {
        Logger.warn('TTS: Error obteniendo voces', voicesError);
      }

      // Configurar idioma español mexicano (con fallback)
      let languageSet = false;
      try {
        const result = await Tts.setDefaultLanguage('es-MX');
        Logger.debug('TTS: Idioma configurado a es-MX', { result });
        languageSet = true;
      } catch (langError) {
        Logger.warn('TTS: No se pudo configurar es-MX, intentando es-ES', langError);
        try {
          const result = await Tts.setDefaultLanguage('es-ES');
          Logger.debug('TTS: Idioma configurado a es-ES', { result });
          languageSet = true;
        } catch (fallbackError) {
          Logger.warn('TTS: No se pudo configurar es-ES, intentando español genérico', fallbackError);
          try {
            const result = await Tts.setDefaultLanguage('es');
            Logger.debug('TTS: Idioma configurado a es', { result });
            languageSet = true;
          } catch (finalError) {
            Logger.warn('TTS: Usando idioma por defecto del sistema', finalError);
          }
        }
      }
      
      // Verificar que el idioma se configuró correctamente
      if (!languageSet) {
        Logger.warn('TTS: No se pudo configurar ningún idioma español. El sistema usará el idioma por defecto.');
      }
      
      // Detectar si es emulador antes de configurar velocidad
      await this.detectEmulator();
      
      // Configurar velocidad de habla según el dispositivo
      // Los emuladores suelen reproducir TTS más rápido, usar velocidad más lenta
      const rateToUse = this.isEmulator ? this.emulatorRate : this.defaultRate;
      await Tts.setDefaultRate(rateToUse);
      
      Logger.info('TTS: Velocidad configurada', {
        rate: rateToUse,
        isEmulator: this.isEmulator,
        reason: this.isEmulator ? 'Emulador detectado - usando velocidad más lenta' : 'Dispositivo físico - velocidad normal'
      });
      
      // Configurar pitch (0.5 a 2.0, 1.0 = normal)
      await Tts.setDefaultPitch(1.0);

      // Nota: setDefaultVolume() no existe en react-native-tts
      // El volumen se controla por utterance usando androidParams en speak()
      // El volumen por defecto de Android es 1.0 (máximo)

      // Remover listeners anteriores si existen (para evitar duplicados)
      Tts.removeAllListeners('tts-start');
      Tts.removeAllListeners('tts-finish');
      Tts.removeAllListeners('tts-cancel');
      Tts.removeAllListeners('tts-error');

      // Event listeners
      Tts.addEventListener('tts-start', (event) => {
        this.speaking = true;
        Logger.debug('TTS: Inició habla', { event });
      });

      Tts.addEventListener('tts-finish', (event) => {
        this.speaking = false;
        Logger.debug('TTS: Finalizó habla', { event });
      });

      Tts.addEventListener('tts-cancel', (event) => {
        this.speaking = false;
        Logger.debug('TTS: Cancelado', { event });
      });

      Tts.addEventListener('tts-error', (error) => {
        this.speaking = false;
        Logger.error('TTS: Error durante habla', { error, errorMessage: error?.message, errorCode: error?.code });
      });

      Logger.debug('TTS: Event listeners registrados correctamente');

      this.isInitialized = true;
      Logger.info('TTS Service inicializado correctamente');
    } catch (error) {
      Logger.error('Error inicializando TTS:', error);
      this.isInitialized = false;
      throw error; // Re-lanzar para que el llamador sepa que falló
    }
  }

  /**
   * Verificar si el mensaje está en cache (evita repetición inmediata)
   * @param {string} text - Texto a verificar
   * @returns {boolean} - True si está en cache reciente
   */
  _isInCache(text) {
    const now = Date.now();
    const trimmedText = text.trim();
    
    // Limpiar cache viejo
    this.messageCache = this.messageCache.filter(
      item => now - item.timestamp < this.cacheMaxAge
    );
    
    // Verificar si el texto está en cache
    const cached = this.messageCache.find(
      item => item.text === trimmedText && (now - item.timestamp) < this.cacheMaxAge
    );
    
    if (cached) {
      Logger.debug('TTS: Mensaje encontrado en cache (evitando repetición)', {
        text: trimmedText.substring(0, 30),
        age: now - cached.timestamp
      });
      return true;
    }
    
    // Agregar a cache
    this.messageCache.push({
      text: trimmedText,
      timestamp: now
    });
    
    // Limitar tamaño del cache
    if (this.messageCache.length > this.cacheMaxSize) {
      this.messageCache.shift();
    }
    
    return false;
  }

  /**
   * Determinar prioridad del mensaje basado en contenido y opciones
   * @param {string} text - Texto del mensaje
   * @param {Object} options - Opciones del mensaje
   * @returns {string} - 'high', 'medium', o 'low'
   */
  _determinePriority(text, options) {
    // Si se especifica explícitamente
    if (options.priority) {
      return options.priority;
    }
    
    // Determinar por contenido
    const lowerText = text.toLowerCase();
    
    // Alta prioridad: alertas, errores, urgencias
    if (
      lowerText.includes('🚨') ||
      lowerText.includes('urgente') ||
      lowerText.includes('error') ||
      lowerText.includes('crítico') ||
      options.variant === 'urgent' ||
      options.variant === 'error'
    ) {
      return 'high';
    }
    
    // Media prioridad: confirmaciones, recordatorios importantes
    if (
      lowerText.includes('✅') ||
      lowerText.includes('recordatorio') ||
      lowerText.includes('importante') ||
      options.variant === 'warning' ||
      options.variant === 'confirmation'
    ) {
      return 'medium';
    }
    
    // Baja prioridad: información general, navegación
    return 'low';
  }

  /**
   * Procesar cola de mensajes
   */
  async _processQueue() {
    if (this.processingQueue || this.speaking) {
      return;
    }

    this.processingQueue = true;

    try {
      // Procesar en orden de prioridad: high -> medium -> low
      let nextMessage = null;
      
      if (this.queue.high.length > 0) {
        nextMessage = this.queue.high.shift();
      } else if (this.queue.medium.length > 0) {
        nextMessage = this.queue.medium.shift();
      } else if (this.queue.low.length > 0) {
        nextMessage = this.queue.low.shift();
      }

      if (nextMessage) {
        await this._speakInternal(nextMessage.text, nextMessage.options);
        
        // Continuar procesando cola
        setTimeout(() => {
          this.processingQueue = false;
          this._processQueue();
        }, 100);
      } else {
        this.processingQueue = false;
      }
    } catch (error) {
      Logger.error('TTS: Error procesando cola', error);
      this.processingQueue = false;
      // Intentar procesar siguiente mensaje
      setTimeout(() => this._processQueue(), 500);
    }
  }

  /**
   * Hablar un texto (método público con cola inteligente)
   * @param {string} text - Texto a pronunciar
   * @param {Object} options - Opciones adicionales
   * @param {number} options.rate - Velocidad (0.5-2.0)
   * @param {number} options.pitch - Tono (0.5-2.0)
   * @param {number} options.volume - Volumen (0.0-1.0)
   * @param {string} options.priority - Prioridad: 'high', 'medium', 'low'
   * @param {string} options.variant - Variante: 'instruction', 'confirmation', 'information', 'alert', 'error'
   * @param {boolean} options.skipCache - Si true, ignora el cache
   * @param {boolean} options.queue - Si true, agrega a cola; si false, interrumpe y habla inmediatamente
   */
  async speak(text, options = {}) {
    if (!this.isEnabled) {
      Logger.debug('TTS: Deshabilitado, no se reproduce');
      return;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      Logger.warn('TTS: Texto vacío o inválido', { text });
      return;
    }

    // Verificar cache (evitar repetición inmediata)
    if (!options.skipCache && this._isInCache(text)) {
      Logger.debug('TTS: Mensaje en cache, omitiendo repetición');
      return;
    }

    // Determinar prioridad
    const priority = this._determinePriority(text, options);

    // Aplicar velocidad adaptativa según variant
    // Ajustar velocidad según dispositivo y variante
    if (!options.rate && options.variant) {
      // Usar velocidades adaptativas según si es emulador o no
      const adaptiveRates = this.isEmulator ? this.emulatorAdaptiveRates : this.adaptiveRates;
      options.rate = adaptiveRates[options.variant] || (this.isEmulator ? this.emulatorRate : this.defaultRate);
    } else if (!options.rate) {
      // Usar velocidad por defecto según dispositivo
      options.rate = this.isEmulator ? this.emulatorRate : this.defaultRate;
    }

    // Aplicar volumen por defecto si no se especifica
    if (options.volume === undefined) {
      options.volume = this.defaultVolume;
    }

    // Si es alta prioridad o se especifica queue=false, interrumpir y hablar inmediatamente
    if (priority === 'high' || options.queue === false) {
      Logger.debug('TTS: Mensaje de alta prioridad, interrumpiendo y hablando inmediatamente');
      await this.stop(); // Detener cualquier mensaje actual
      await this._speakInternal(text, { ...options, priority });
      return;
    }

    // Agregar a cola
    this.queue[priority].push({
      text,
      options: { ...options, priority },
      timestamp: Date.now()
    });

    Logger.debug('TTS: Mensaje agregado a cola', {
      priority,
      queueSize: {
        high: this.queue.high.length,
        medium: this.queue.medium.length,
        low: this.queue.low.length
      }
    });

    // Procesar cola
    this._processQueue();
  }

  /**
   * Hablar texto (método interno, sin cola)
   * @private
   */
  async _speakInternal(text, options = {}) {
    if (!this.isEnabled) {
      Logger.debug('TTS: Deshabilitado, no se reproduce');
      return;
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      Logger.warn('TTS: Texto vacío o inválido', { text });
      return;
    }

    try {
      // Inicializar si no está inicializado (con timeout de seguridad)
      if (!this.isInitialized) {
        Logger.debug('TTS: No inicializado, inicializando...');
        try {
          await Promise.race([
            this.initialize(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('TTS initialization timeout')), 5000)
            )
          ]);
        } catch (initError) {
          Logger.error('TTS: Error en inicialización, no se puede hablar', initError);
          return; // No intentar hablar si no se puede inicializar
        }
      }

      // Verificar que está inicializado después del intento
      if (!this.isInitialized) {
        Logger.error('TTS: No se pudo inicializar, no se puede hablar');
        return;
      }

      // Detener cualquier habla anterior
      try {
        await this.stop();
      } catch (stopError) {
        Logger.debug('TTS: Error al detener habla anterior (puede estar bien)', stopError);
      }

      // Aplicar opciones - pero solo si no causan problemas
      try {
        if (options.rate) {
          await Tts.setDefaultRate(options.rate);
        }
        if (options.pitch) {
          await Tts.setDefaultPitch(options.pitch);
        }
      } catch (optionsError) {
        Logger.warn('TTS: Error configurando rate/pitch, continuando con valores por defecto', optionsError);
      }

      // Preparar opciones para speak()
      const speakOptions = {};
      
      // Control de volumen (solo en Android via androidParams)
      if (Platform.OS === 'android' && options.volume !== undefined) {
        speakOptions.androidParams = {
          KEY_PARAM_VOLUME: Math.max(0, Math.min(1, options.volume)), // Clamp entre 0 y 1
        };
      }

      // Verificar que los event listeners están registrados
      Logger.debug('TTS: Estado antes de hablar', {
        isInitialized: this.isInitialized,
        isEnabled: this.isEnabled,
        speaking: this.speaking,
        textLength: text.trim().length,
        hasOptions: Object.keys(speakOptions).length > 0
      });

      // IMPORTANTE: react-native-tts requiere que se llame speak() de forma síncrona
      // pero puede necesitar un pequeño delay después de la inicialización
      try {
        // Método 1: Intentar hablar directamente (método más simple y confiable)
        Logger.debug('TTS: Intentando hablar (método directo)...');
        
        // En Android, Tts.speak() puede no devolver una promesa
        // Llamarlo directamente y esperar eventos
        if (Platform.OS === 'android') {
          // En Android, llamar directamente sin await
          Tts.speak(text.trim(), speakOptions.androidParams ? {
            androidParams: speakOptions.androidParams
          } : undefined);
          
          Logger.debug('TTS: Llamada a speak() realizada (Android)', { 
            text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            length: text.length,
            hasAndroidParams: !!speakOptions.androidParams
          });
        } else {
          // iOS
          const speakResult = Tts.speak(text.trim());
          if (speakResult && typeof speakResult.then === 'function') {
            await speakResult;
          }
          Logger.debug('TTS: Llamada a speak() realizada (iOS)', { 
            text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
            length: text.length
          });
        }

        // Esperar eventos (máximo 2 segundos)
        let eventReceived = false;
        const maxWaitTime = 2000;
        const checkInterval = 100;
        const startTime = Date.now();
        
        while (!eventReceived && (Date.now() - startTime) < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          if (this.speaking) {
            eventReceived = true;
            Logger.debug('TTS: Evento tts-start detectado');
            break;
          }
        }

        if (!eventReceived && !this.speaking) {
          Logger.warn('TTS: speak() llamado pero no se detectó tts-start después de 2 segundos', {
            isInitialized: this.isInitialized,
            isEnabled: this.isEnabled,
            textLength: text.trim().length,
            waitedMs: Date.now() - startTime
          });
          
          // Diagnóstico adicional
          try {
            const engines = await Tts.engines();
            const voices = await Tts.voices();
            Logger.debug('TTS: Diagnóstico de disponibilidad', {
              enginesCount: engines?.length || 0,
              voicesCount: voices?.length || 0,
              engines: engines?.slice(0, 3).map(e => ({ name: e.name, default: e.default })) || [],
              spanishVoices: voices?.filter(v => v.language?.startsWith('es')).slice(0, 3).map(v => ({ 
                name: v.name, 
                language: v.language 
              })) || []
            });

            // Sugerencia para el usuario
            if (!voices || voices.length === 0) {
              Logger.error('TTS: CRÍTICO - No hay voces instaladas en el dispositivo. El usuario debe instalar voces desde Configuración > Sistema > Accesibilidad > Texto a voz.');
            } else if (!voices.some(v => v.language?.startsWith('es'))) {
              Logger.warn('TTS: No hay voces en español instaladas. El usuario puede instalar voces desde Configuración > Sistema > Accesibilidad > Texto a voz.');
            }
          } catch (checkError) {
            Logger.error('TTS: Error en diagnóstico', checkError);
          }
        }
      } catch (speakError) {
        Logger.error('TTS: Error al llamar speak()', {
          error: speakError?.message,
          stack: speakError?.stack,
          errorCode: speakError?.code,
          errorName: speakError?.name
        });
        throw speakError;
      }
    } catch (error) {
      Logger.error('Error en TTS speak:', error);
      // Re-lanzar para que el llamador sepa que falló
      throw error;
    }
  }

  /**
   * Detener el habla actual y limpiar cola
   */
  async stop() {
    try {
      if (this.speaking) {
        await Tts.stop();
        this.speaking = false;
        Logger.debug('TTS: Detenido');
      }
      
      // Limpiar cola de baja prioridad (mantener alta y media)
      this.queue.low = [];
      Logger.debug('TTS: Cola de baja prioridad limpiada');
    } catch (error) {
      Logger.error('Error deteniendo TTS:', error);
    }
  }

  /**
   * Limpiar toda la cola
   */
  clearQueue() {
    this.queue.high = [];
    this.queue.medium = [];
    this.queue.low = [];
    this.processingQueue = false;
    Logger.debug('TTS: Cola limpiada completamente');
  }

  /**
   * Adaptar texto según longitud (textos largos se resumen)
   * @param {string} text - Texto a adaptar
   * @param {number} maxLength - Longitud máxima en palabras (default: 50)
   * @returns {Object} - { text: string, isSummary: boolean, hasMore: boolean }
   */
  _adaptTextLength(text, maxLength = 50) {
    const words = text.trim().split(/\s+/);
    
    if (words.length <= maxLength) {
      return {
        text: text.trim(),
        isSummary: false,
        hasMore: false
      };
    }

    // Texto largo: extraer lo esencial
    const essentialWords = words.slice(0, maxLength);
    const essentialText = essentialWords.join(' ');
    
    // Detectar si termina en punto, si no, agregar "..."
    const endsWithPunctuation = /[.!?]$/.test(essentialText);
    
    return {
      text: essentialText + (endsWithPunctuation ? '' : '...'),
      isSummary: true,
      hasMore: true,
      fullText: text.trim()
    };
  }

  /**
   * Hablar texto con adaptación inteligente de longitud
   * @param {string} text - Texto a pronunciar
   * @param {Object} options - Opciones adicionales
   * @param {boolean} options.adaptLength - Si true, adapta textos largos (default: true)
   */
  async speakAdaptive(text, options = {}) {
    const { adaptLength = true, ...otherOptions } = options;
    
    if (adaptLength) {
      const adapted = this._adaptTextLength(text);
      
      if (adapted.isSummary && adapted.hasMore) {
        // Texto largo: hablar resumen + ofrecer más detalles
        await this.speak(adapted.text, {
          ...otherOptions,
          variant: 'information'
        });
        
        // Pausa antes de ofrecer más detalles
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Opcional: preguntar si quiere más detalles (esto sería para una implementación futura con interacción)
        // Por ahora, solo hablamos el resumen
        Logger.debug('TTS: Texto largo adaptado', {
          originalLength: text.split(/\s+/).length,
          adaptedLength: adapted.text.split(/\s+/).length
        });
        
        return;
      }
    }
    
    // Texto normal o adaptLength=false
    await this.speak(text, otherOptions);
  }

  /**
   * Hablar con pausa (para instrucciones paso a paso)
   * @param {string[]} texts - Array de textos a pronunciar con pausa
   * @param {number} pauseMs - Milisegundos de pausa entre textos
   */
  async speakWithPause(texts, pauseMs = 1000) {
    for (let i = 0; i < texts.length; i++) {
      await this.speak(texts[i]);
      // Esperar a que termine de hablar
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.speaking) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);

        // Timeout de seguridad (5 segundos máximo por texto)
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });

      // Pausa entre textos (excepto en el último)
      if (i < texts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, pauseMs));
      }
    }
  }

  /**
   * Hablar números de forma clara (para pesos, fechas, etc.)
   * @param {number|string} number - Número a pronunciar
   */
  async speakNumber(number) {
    const numberStr = String(number);
    const spoken = numberStr.replace(/\d/g, (digit) => {
      const numbers = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
      return numbers[parseInt(digit)] + ' ';
    }).trim();
    
    await this.speak(spoken);
  }

  /**
   * Hablar fecha de forma clara
   * @param {Date|string} date - Fecha a pronunciar
   */
  async speakDate(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString('es-MX', { month: 'long' });
    const year = dateObj.getFullYear();
    
    const spoken = `${day} de ${month} de ${year}`;
    await this.speak(spoken);
  }

  /**
   * Convertir hora a texto para TTS con formato natural (de la mañana/tarde/noche)
   * @param {Date|string} time - Hora a convertir
   * @returns {string} - Texto formateado para TTS
   */
  formatTimeForTTS(time) {
    const timeObj = time instanceof Date ? time : new Date(time);
    const hours = timeObj.getHours();
    const minutes = timeObj.getMinutes();
    
    // Casos especiales: medianoche y mediodía
    if (hours === 0 && minutes === 0) {
      return 'medianoche';
    }
    if (hours === 12 && minutes === 0) {
      return 'mediodía';
    }
    
    // Determinar hora en formato 12 horas
    let hour12;
    if (hours === 0) {
      hour12 = 12; // Medianoche con minutos
    } else if (hours <= 12) {
      hour12 = hours;
    } else {
      hour12 = hours - 12;
    }
    
    // Determinar período del día
    let periodText = '';
    if (hours < 12) {
      // AM (mañana)
      periodText = 'de la mañana';
    } else {
      // PM
      // Después de las 7 PM (19:00) es "de la noche", antes es "de la tarde"
      if (hours >= 19) {
        periodText = 'de la noche';
      } else {
        periodText = 'de la tarde';
      }
    }
    
    // Construir texto de la hora
    let spoken = `${hour12}`;
    
    // Agregar minutos si existen
    if (minutes > 0) {
      const minutesText = minutes === 1 ? 'minuto' : 'minutos';
      spoken += ` y ${minutes} ${minutesText}`;
    }
    
    // Agregar período del día
    spoken += ` ${periodText}`;
    
    return spoken;
  }

  /**
   * Hablar hora de forma clara con formato natural (de la mañana/tarde/noche)
   * @param {Date|string} time - Hora a pronunciar
   */
  async speakTime(time) {
    const spoken = this.formatTimeForTTS(time);
    await this.speak(spoken);
  }

  /**
   * Hablar instrucciones de forma clara y pausada
   * @param {string} instruction - Instrucción a pronunciar
   */
  async speakInstruction(instruction) {
    const adaptiveRates = this.isEmulator ? this.emulatorAdaptiveRates : this.adaptiveRates;
    await this.speak(instruction, { 
      variant: 'instruction',
      rate: adaptiveRates.instruction,
      priority: 'high' // Alta prioridad para que se reproduzca inmediatamente
    });
  }

  /**
   * Hablar confirmación (feedback positivo)
   * @param {string} message - Mensaje de confirmación
   */
  async speakConfirmation(message) {
    const adaptiveRates = this.isEmulator ? this.emulatorAdaptiveRates : this.adaptiveRates;
    await this.speak(`✅ ${message}`, { 
      variant: 'confirmation',
      priority: 'medium',
      rate: adaptiveRates.confirmation 
    });
  }

  /**
   * Hablar error o advertencia
   * @param {string} message - Mensaje de error
   */
  async speakError(message) {
    const adaptiveRates = this.isEmulator ? this.emulatorAdaptiveRates : this.adaptiveRates;
    await this.speak(`⚠️ ${message}`, { 
      variant: 'error',
      priority: 'high',
      rate: adaptiveRates.error,
      pitch: 0.9 
    });
  }

  /**
   * Activar/desactivar TTS
   * @param {boolean} enabled - Estado del TTS
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
    Logger.info('TTS:', enabled ? 'Activado' : 'Desactivado');
  }

  /**
   * Verificar si TTS está disponible
   */
  async isAvailable() {
    try {
      const engines = await Tts.engines();
      return engines.length > 0;
    } catch (error) {
      Logger.error('Error verificando disponibilidad TTS:', error);
      return false;
    }
  }

  /**
   * Obtener idiomas disponibles
   */
  async getAvailableLanguages() {
    try {
      const languages = await Tts.voices();
      return languages || [];
    } catch (error) {
      Logger.error('Error obteniendo idiomas TTS:', error);
      return [];
    }
  }
}

// Singleton
const ttsService = new TTSService();

// Inicializar automáticamente al cargar el módulo
// IMPORTANTE: En algunos dispositivos, TTS puede necesitar tiempo para inicializarse
// También puede requerir que el usuario tenga voces instaladas
if (typeof window !== 'undefined' || Platform.OS !== 'web') {
  ttsService.initialize()
    .then(() => {
      Logger.info('TTS: Inicialización automática completada exitosamente');
    })
    .catch((error) => {
      Logger.warn('TTS: Error en inicialización automática (se reintentará al usar)', {
        error: error?.message,
        stack: error?.stack
      });
    });
}

export default ttsService;

