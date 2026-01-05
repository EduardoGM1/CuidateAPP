/**
 * Utilidad de diagnóstico para TTS
 * 
 * Ejecutar en la consola para diagnosticar problemas con TTS:
 * 
 * import ttsDiagnostic from './utils/ttsDiagnostic';
 * ttsDiagnostic.runDiagnostic();
 */

import Tts from 'react-native-tts';
import { Platform } from 'react-native';
import Logger from '../services/logger';

class TTSDiagnostic {
  async runDiagnostic() {
    Logger.info('🔍 TTS Diagnostic: Iniciando diagnóstico completo...');
    
    try {
      // 1. Verificar motores TTS
      Logger.info('📋 Paso 1: Verificando motores TTS...');
      const engines = await Tts.engines();
      Logger.info('Motores encontrados:', {
        count: engines?.length || 0,
        engines: engines?.map(e => ({
          name: e.name,
          package: e.package,
          default: e.default,
          label: e.label
        })) || []
      });

      if (!engines || engines.length === 0) {
        Logger.error('❌ CRÍTICO: No hay motores TTS instalados. El usuario debe instalar un motor TTS desde Google Play Store.');
        return { success: false, reason: 'No engines available' };
      }

      // 2. Verificar voces disponibles
      Logger.info('📋 Paso 2: Verificando voces disponibles...');
      const voices = await Tts.voices();
      Logger.info('Voces encontradas:', {
        count: voices?.length || 0,
        spanishVoices: voices?.filter(v => v.language?.startsWith('es')).map(v => ({
          name: v.name,
          language: v.language,
          quality: v.quality,
          networkConnectionRequired: v.networkConnectionRequired
        })) || [],
        allVoices: voices?.slice(0, 10).map(v => ({
          name: v.name,
          language: v.language
        })) || []
      });

      if (!voices || voices.length === 0) {
        Logger.error('❌ CRÍTICO: No hay voces instaladas. El usuario debe instalar voces desde Configuración > Sistema > Accesibilidad > Texto a voz.');
        return { success: false, reason: 'No voices available' };
      }

      const hasSpanishVoices = voices.some(v => v.language?.startsWith('es'));
      if (!hasSpanishVoices) {
        Logger.warn('⚠️ ADVERTENCIA: No hay voces en español. El sistema usará la voz por defecto.');
      }

      // 3. Verificar idioma actual
      Logger.info('📋 Paso 3: Verificando configuración de idioma...');
      try {
        const currentLanguage = await Tts.getInitStatus();
        Logger.info('Idioma actual:', currentLanguage);
      } catch (e) {
        Logger.warn('getInitStatus() no disponible:', e);
      }

      // 4. Intentar configurar idioma
      Logger.info('📋 Paso 4: Configurando idioma...');
      const languagesToTry = ['es-MX', 'es-ES', 'es'];
      let languageSet = false;
      
      for (const lang of languagesToTry) {
        try {
          const result = await Tts.setDefaultLanguage(lang);
          Logger.info(`✅ Idioma configurado: ${lang}`, { result });
          languageSet = true;
          break;
        } catch (error) {
          Logger.warn(`❌ No se pudo configurar ${lang}:`, error.message);
        }
      }

      if (!languageSet) {
        Logger.warn('⚠️ No se pudo configurar ningún idioma español. Usando idioma por defecto.');
      }

      // 5. Verificar configuración de rate y pitch
      Logger.info('📋 Paso 5: Verificando configuración de rate y pitch...');
      try {
        await Tts.setDefaultRate(0.9);
        await Tts.setDefaultPitch(1.0);
        Logger.info('✅ Rate y pitch configurados');
      } catch (error) {
        Logger.warn('⚠️ Error configurando rate/pitch:', error);
      }

      // 6. Probar hablar texto de prueba
      Logger.info('📋 Paso 6: Probando hablar texto de prueba...');
      
      // Registrar listeners temporalmente
      let startReceived = false;
      let finishReceived = false;
      let errorReceived = null;

      const startListener = Tts.addEventListener('tts-start', () => {
        startReceived = true;
        Logger.info('✅ Evento tts-start recibido');
      });

      const finishListener = Tts.addEventListener('tts-finish', () => {
        finishReceived = true;
        Logger.info('✅ Evento tts-finish recibido');
      });

      const errorListener = Tts.addEventListener('tts-error', (error) => {
        errorReceived = error;
        Logger.error('❌ Evento tts-error recibido:', error);
      });

      // Intentar hablar
      const testText = 'Prueba de texto a voz';
      Logger.info(`Hablando: "${testText}"...`);
      
      if (Platform.OS === 'android') {
        Tts.speak(testText);
      } else {
        await Tts.speak(testText);
      }

      // Esperar eventos (máximo 5 segundos)
      let waited = 0;
      const maxWait = 5000;
      const checkInterval = 100;

      while (waited < maxWait && !startReceived && !errorReceived) {
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
      }

      // Limpiar listeners
      startListener.remove();
      finishListener.remove();
      errorListener.remove();

      // Resultados
      Logger.info('📋 Resultados de la prueba:', {
        startReceived,
        finishReceived,
        errorReceived: !!errorReceived,
        error: errorReceived,
        waitedMs: waited
      });

      if (errorReceived) {
        Logger.error('❌ FALLO: Error al intentar hablar:', errorReceived);
        return { success: false, reason: 'Error during speak', error: errorReceived };
      }

      if (!startReceived) {
        Logger.error('❌ FALLO: No se recibió evento tts-start. Posibles causas:');
        Logger.error('  1. El motor TTS no está completamente inicializado');
        Logger.error('  2. No hay voces instaladas');
        Logger.error('  3. Permisos de audio faltantes');
        Logger.error('  4. El dispositivo está en modo silencioso');
        return { success: false, reason: 'No tts-start event received' };
      }

      if (!finishReceived) {
        Logger.warn('⚠️ ADVERTENCIA: No se recibió evento tts-finish (pero tts-start sí). Puede estar funcionando.');
      }

      Logger.info('✅ DIAGNÓSTICO COMPLETO: TTS parece estar funcionando correctamente');
      return { success: true };

    } catch (error) {
      Logger.error('❌ ERROR CRÍTICO en diagnóstico:', error);
      return { success: false, reason: 'Diagnostic error', error };
    }
  }

  async checkDeviceSettings() {
    Logger.info('📱 Verificando configuración del dispositivo...');
    Logger.info('Por favor, verifica manualmente:');
    Logger.info('1. Configuración > Sistema > Accesibilidad > Texto a voz');
    Logger.info('   - Motor seleccionado: Google Text-to-Speech');
    Logger.info('   - Idioma: Español (México) o Español (España)');
    Logger.info('   - Preferencias de motor > Instalar datos de voz');
    Logger.info('');
    Logger.info('2. Volumen del dispositivo');
    Logger.info('   - Asegúrate de que el volumen multimedia esté activado');
    Logger.info('   - Verifica que no esté en modo silencioso');
    Logger.info('');
    Logger.info('3. Configuración de la app');
    Logger.info('   - Configuración > Apps > Clínica Móvil > Permisos');
    Logger.info('   - Verifica que los permisos de audio estén concedidos');
  }
}

const ttsDiagnostic = new TTSDiagnostic();
export default ttsDiagnostic;



