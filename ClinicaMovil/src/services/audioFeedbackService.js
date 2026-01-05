/**
 * Servicio de Feedback Auditivo
 * 
 * Proporciona sonidos de feedback para acciones del usuario.
 * Complementa TTS y haptic para una experiencia completa.
 * 
 * Nota: Para React Native 0.82.0, usaremos Alert.alert para sonidos nativos
 * ya que react-native-sound puede tener problemas de compatibilidad.
 * Alternativamente, podemos usar TTS para generar sonidos de feedback.
 */

import { Alert, Platform } from 'react-native';
import ttsService from './ttsService';
import hapticService from './hapticService';
import Logger from './logger';

class AudioFeedbackService {
  constructor() {
    this.isEnabled = true;
    this.soundEffects = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️',
    };
  }

  /**
   * Reproducir sonido de éxito (junto con haptic)
   */
  playSuccess() {
    if (!this.isEnabled) return;
    
    hapticService.success();
    // Solo haptic feedback, sin TTS
  }

  /**
   * Reproducir sonido de error (junto con haptic)
   */
  playError() {
    if (!this.isEnabled) return;
    
    hapticService.error();
    // Usar TTS para feedback auditivo verbal
    ttsService.speak('Error', { rate: 0.9, pitch: 0.9, volume: 0.8 }).catch(() => {
      // Si TTS falla, solo haptic
    });
  }

  /**
   * Reproducir sonido de información
   */
  playInfo() {
    if (!this.isEnabled) return;
    
    hapticService.light();
  }

  /**
   * Reproducir sonido de advertencia
   */
  playWarning() {
    if (!this.isEnabled) return;
    
    hapticService.warning();
    ttsService.speak('Atención', { rate: 0.95, volume: 0.75 }).catch(() => {});
  }

  /**
   * Reproducir sonido de click/tap
   */
  playTap() {
    if (!this.isEnabled) return;
    
    hapticService.selection();
  }

  /**
   * Feedback completo (visual + auditivo + háptico) para acción exitosa
   * @param {string} message - Mensaje a pronunciar
   */
  async feedbackSuccess(message) {
    if (!this.isEnabled) return;
    
    hapticService.success();
    if (message) {
      await ttsService.speakConfirmation(message);
    }
  }

  /**
   * Feedback completo para error
   * @param {string} message - Mensaje de error a pronunciar
   */
  async feedbackError(message) {
    if (!this.isEnabled) return;
    
    hapticService.error();
    if (message) {
      await ttsService.speakError(message);
    }
  }

  /**
   * Activar/desactivar feedback auditivo
   * @param {boolean} enabled - Estado del servicio
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    Logger.info('Audio Feedback:', enabled ? 'Activado' : 'Desactivado');
  }

  /**
   * Verificar si está disponible
   */
  isAvailable() {
    return true; // Siempre disponible (usa TTS y haptic)
  }
}

// Singleton
const audioFeedbackService = new AudioFeedbackService();

export default audioFeedbackService;




