/**
 * Servicio de Feedback Háptico
 * 
 * Proporciona vibración táctil para feedback en interacciones,
 * especialmente útil para pacientes con limitaciones visuales.
 */

import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { Platform } from 'react-native';
import Logger from './logger';

class HapticService {
  constructor() {
    this.isEnabled = true;
    this.options = {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    };
  }

  /**
   * Configuración de tipos de haptic disponibles
   */
  get HapticTypes() {
    if (Platform.OS === 'ios') {
      return {
        impactLight: 'impactLight',
        impactMedium: 'impactMedium',
        impactHeavy: 'impactHeavy',
        rigid: 'rigid',
        soft: 'soft',
        selection: 'selection',
        success: 'success',
        warning: 'warning',
        error: 'error',
      };
    } else {
      // Android
      return {
        impactLight: 'impactLight',
        impactMedium: 'impactMedium',
        impactHeavy: 'impactHeavy',
        rigid: 'rigid',
        soft: 'soft',
      };
    }
  }

  /**
   * Vibrar con tipo específico
   * @param {string} type - Tipo de vibración
   */
  trigger(type = 'impactMedium') {
    if (!this.isEnabled) return;

    try {
      ReactNativeHapticFeedback.trigger(type, this.options);
      Logger.debug('Haptic:', type);
    } catch (error) {
      Logger.error('Error en haptic trigger:', error);
    }
  }

  /**
   * Feedback suave (para selecciones)
   */
  light() {
    this.trigger(this.HapticTypes.impactLight || 'impactLight');
  }

  /**
   * Feedback medio (para acciones normales)
   */
  medium() {
    this.trigger(this.HapticTypes.impactMedium || 'impactMedium');
  }

  /**
   * Feedback fuerte (para acciones importantes)
   */
  heavy() {
    this.trigger(this.HapticTypes.impactHeavy || 'impactHeavy');
  }

  /**
   * Feedback de éxito
   */
  success() {
    if (Platform.OS === 'ios') {
      this.trigger(this.HapticTypes.success || 'impactMedium');
    } else {
      this.trigger('impactMedium');
    }
  }

  /**
   * Feedback de error
   */
  error() {
    if (Platform.OS === 'ios') {
      this.trigger(this.HapticTypes.error || 'impactHeavy');
    } else {
      this.trigger('impactHeavy');
    }
  }

  /**
   * Feedback de advertencia
   */
  warning() {
    if (Platform.OS === 'ios') {
      this.trigger(this.HapticTypes.warning || 'impactMedium');
    } else {
      this.trigger('impactMedium');
    }
  }

  /**
   * Feedback de selección (para navegación)
   */
  selection() {
    if (Platform.OS === 'ios') {
      this.trigger(this.HapticTypes.selection || 'impactLight');
    } else {
      this.trigger('impactLight');
    }
  }

  /**
   * Activar/desactivar haptic
   * @param {boolean} enabled - Estado del haptic
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    Logger.info('Haptic:', enabled ? 'Activado' : 'Desactivado');
  }

  /**
   * Verificar si haptic está disponible
   */
  isAvailable() {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }
}

// Singleton
const hapticService = new HapticService();

export default hapticService;




