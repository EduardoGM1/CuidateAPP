/**
 * Servicio: AudioProgress
 * 
 * Servicio para persistir el progreso de reproducción de audios.
 * Permite que el usuario continúe desde donde dejó.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from './logger';

const PROGRESS_KEY_PREFIX = '@audio_progress:';

class AudioProgressService {
  /**
   * Guardar progreso de reproducción
   */
  async saveProgress(audioUrl, currentPosition, duration) {
    try {
      const key = `${PROGRESS_KEY_PREFIX}${audioUrl}`;
      const progress = {
        currentPosition,
        duration,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(progress));
    } catch (error) {
      Logger.error('AudioProgressService: Error guardando progreso', error);
    }
  }

  /**
   * Obtener progreso guardado
   */
  async getProgress(audioUrl) {
    try {
      const key = `${PROGRESS_KEY_PREFIX}${audioUrl}`;
      const progressStr = await AsyncStorage.getItem(key);
      if (progressStr) {
        const progress = JSON.parse(progressStr);
        // Solo retornar si tiene menos de 24 horas
        const maxAge = 24 * 60 * 60 * 1000;
        if (Date.now() - progress.timestamp < maxAge) {
          return progress;
        } else {
          // Eliminar progreso antiguo
          await this.clearProgress(audioUrl);
        }
      }
      return null;
    } catch (error) {
      Logger.error('AudioProgressService: Error obteniendo progreso', error);
      return null;
    }
  }

  /**
   * Limpiar progreso guardado
   */
  async clearProgress(audioUrl) {
    try {
      const key = `${PROGRESS_KEY_PREFIX}${audioUrl}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      Logger.error('AudioProgressService: Error limpiando progreso', error);
    }
  }

  /**
   * Limpiar todo el progreso guardado
   */
  async clearAllProgress() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter((key) => key.startsWith(PROGRESS_KEY_PREFIX));
      await AsyncStorage.multiRemove(progressKeys);
      Logger.info('AudioProgressService: Todo el progreso limpiado');
    } catch (error) {
      Logger.error('AudioProgressService: Error limpiando todo el progreso', error);
    }
  }
}

// Singleton
const audioProgressService = new AudioProgressService();

export default audioProgressService;

