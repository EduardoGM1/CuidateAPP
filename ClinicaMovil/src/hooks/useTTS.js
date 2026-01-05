/**
 * Hook personalizado para usar TTS (Text-to-Speech)
 * 
 * Facilita el uso de TTS en componentes React con cleanup automático
 */

import { useEffect, useCallback, useRef } from 'react';
import ttsService from '../services/ttsService';

/**
 * Hook para usar TTS en componentes
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.autoInitialize - Inicializar automáticamente
 * @param {boolean} options.enabled - Habilitar TTS por defecto
 * @param {boolean} options.autoCleanup - Limpiar TTS automáticamente al desmontar (default: true)
 */
const useTTS = (options = {}) => {
  const { autoInitialize = true, enabled = true, autoCleanup = true } = options;
  const isInitializedRef = useRef(false);
  const timeoutsRef = useRef([]); // Almacenar timeouts para poder cancelarlos

  // Inicializar TTS
  useEffect(() => {
    if (autoInitialize && !isInitializedRef.current) {
      ttsService.initialize();
      isInitializedRef.current = true;
    }
  }, [autoInitialize]);

  // Cleanup automático: detener TTS y limpiar cola al desmontar
  useEffect(() => {
    if (!autoCleanup) return;

    return () => {
      // Detener audio actual
      ttsService.stop().catch(err => {
        console.warn('Error al detener TTS en cleanup:', err);
      });
      
      // Limpiar toda la cola
      ttsService.clearQueue();
      
      // Cancelar todos los timeouts pendientes
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = [];
    };
  }, [autoCleanup]);

  // Hablar texto
  const speak = useCallback(async (text, options = {}) => {
    if (!enabled) return;
    await ttsService.speak(text, options);
  }, [enabled]);

  // Detener habla
  const stop = useCallback(async () => {
    await ttsService.stop();
  }, []);

  // Detener habla y limpiar cola completamente
  const stopAndClear = useCallback(async () => {
    await ttsService.stop();
    ttsService.clearQueue();
  }, []);

  // Función helper para crear timeouts que se cancelan automáticamente
  const createTimeout = useCallback((callback, delay) => {
    const timeoutId = setTimeout(() => {
      callback();
      // Remover del array cuando se ejecuta
      timeoutsRef.current = timeoutsRef.current.filter(id => id !== timeoutId);
    }, delay);
    timeoutsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

  // Hablar con pausa
  const speakWithPause = useCallback(async (texts, pauseMs = 1000) => {
    if (!enabled) return;
    await ttsService.speakWithPause(texts, pauseMs);
  }, [enabled]);

  // Hablar número
  const speakNumber = useCallback(async (number) => {
    if (!enabled) return;
    await ttsService.speakNumber(number);
  }, [enabled]);

  // Hablar fecha
  const speakDate = useCallback(async (date) => {
    if (!enabled) return;
    await ttsService.speakDate(date);
  }, [enabled]);

  // Hablar hora
  const speakTime = useCallback(async (time) => {
    if (!enabled) return;
    await ttsService.speakTime(time);
  }, [enabled]);

  // Hablar instrucción
  const speakInstruction = useCallback(async (instruction) => {
    if (!enabled) return;
    await ttsService.speakInstruction(instruction);
  }, [enabled]);

  // Hablar confirmación
  const speakConfirmation = useCallback(async (message) => {
    if (!enabled) return;
    await ttsService.speakConfirmation(message);
  }, [enabled]);

  // Hablar error
  const speakError = useCallback(async (message) => {
    if (!enabled) return;
    await ttsService.speakError(message);
  }, [enabled]);

  // Activar/desactivar TTS
  const setEnabled = useCallback((enabled) => {
    ttsService.setEnabled(enabled);
  }, []);

  return {
    speak,
    stop,
    stopAndClear,
    speakWithPause,
    speakNumber,
    speakDate,
    speakTime,
    speakInstruction,
    speakConfirmation,
    speakError,
    setEnabled,
    isEnabled: enabled,
    createTimeout, // Para usar timeouts que se cancelen automáticamente
  };
};

export default useTTS;




