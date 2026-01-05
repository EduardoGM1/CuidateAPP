/**
 * Servicio: Audio
 * 
 * Servicio centralizado para grabación y reproducción de audio.
 * Abstrae la complejidad de las librerías nativas y proporciona una API simple y robusta.
 * 
 * Funcionalidades:
 * - Grabación de audio con manejo de permisos
 * - Reproducción de audio
 * - Gestión de archivos temporales
 * - Limpieza automática de recursos
 */

import { Platform } from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';
import Logger from './logger';
import permissionsService from './permissionsService';

// Habilitar modo de reproducción en modo silencioso (iOS)
Sound.setCategory('Playback');

class AudioService {
  constructor() {
    this.recorderPlayer = new AudioRecorderPlayer();
    this.currentRecordingPath = null;
    this.currentSound = null;
    this.recordingListeners = [];
  }

  /**
   * Iniciar grabación de audio
   * @param {Object} options - Opciones de grabación
   * @param {string} options.path - Ruta opcional para el archivo (se genera automáticamente si no se proporciona)
   * @param {Function} options.onProgress - Callback para actualizar progreso (recibe {currentPosition, duration})
   * @returns {Promise<{path: string, duration: number}>} Información del archivo grabado
   */
  async startRecording(options = {}) {
    try {
      // Verificar permisos
      const hasPermission = await permissionsService.requestMicrophonePermission();
      if (!hasPermission) {
        throw new Error('Se requiere permiso de micrófono para grabar audio');
      }

      // Generar ruta si no se proporciona
      let audioPath = options.path;
      if (!audioPath) {
        const timestamp = Date.now();
        const basePath = Platform.select({
          ios: RNFS.DocumentDirectoryPath,
          android: RNFS.CacheDirectoryPath || RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath,
        });

        if (!basePath) {
          throw new Error('No se pudo obtener la ruta del directorio para guardar el audio');
        }

        // Asegurar que el directorio existe
        const dirExists = await RNFS.exists(basePath);
        if (!dirExists) {
          await RNFS.mkdir(basePath);
        }

        audioPath = `${basePath}/audio_${timestamp}.m4a`;
      }

      this.currentRecordingPath = audioPath;

      Logger.info('AudioService: Iniciando grabación', { path: audioPath });

      // Iniciar grabación
      let recordingPath;
      try {
        recordingPath = await this.recorderPlayer.startRecorder(audioPath);
      } catch (error) {
        // Si falla con ruta personalizada, intentar sin ruta (usará ruta por defecto)
        Logger.warn('AudioService: Error con ruta personalizada, usando ruta por defecto', error);
        recordingPath = await this.recorderPlayer.startRecorder();
        this.currentRecordingPath = recordingPath;
      }

      // Configurar listener para progreso si se proporciona
      if (options.onProgress) {
        const listener = this.recorderPlayer.addRecordBackListener((e) => {
          options.onProgress({
            currentPosition: Math.floor(e.currentPosition / 1000),
            duration: Math.floor(e.duration / 1000),
          });
        });
        this.recordingListeners.push(listener);
      }

      Logger.info('AudioService: Grabación iniciada', { path: recordingPath });

      return {
        path: recordingPath,
        duration: 0, // Se actualizará cuando se detenga
      };
    } catch (error) {
      Logger.error('AudioService: Error iniciando grabación', error);
      this.currentRecordingPath = null;
      throw error;
    }
  }

  /**
   * Detener grabación de audio
   * @returns {Promise<{path: string, duration: number}>} Información del archivo grabado
   */
  async stopRecording() {
    try {
      if (!this.currentRecordingPath) {
        throw new Error('No hay grabación activa');
      }

      // Remover listeners
      this.recordingListeners.forEach(() => {
        this.recorderPlayer.removeRecordBackListener();
      });
      this.recordingListeners = [];

      // Detener grabación
      const result = await this.recorderPlayer.stopRecorder();
      const finalPath = result || this.currentRecordingPath;

      // Obtener duración del archivo
      let duration = 0;
      try {
        const fileInfo = await RNFS.stat(finalPath);
        // La duración se obtiene del listener o se calcula después
        // Por ahora, retornamos 0 y se actualizará en el componente
      } catch (e) {
        Logger.warn('AudioService: No se pudo obtener información del archivo', e);
      }

      Logger.info('AudioService: Grabación detenida', { path: finalPath, duration });

      const recordingInfo = {
        path: finalPath,
        duration,
      };

      this.currentRecordingPath = null;
      return recordingInfo;
    } catch (error) {
      Logger.error('AudioService: Error deteniendo grabación', error);
      this.currentRecordingPath = null;
      throw error;
    }
  }

  /**
   * Cancelar grabación actual
   */
  async cancelRecording() {
    try {
      if (this.currentRecordingPath) {
        // Detener grabación si está activa
        try {
          await this.recorderPlayer.stopRecorder();
          this.recorderPlayer.removeRecordBackListener();
        } catch (e) {
          Logger.warn('AudioService: Error deteniendo grabación al cancelar', e);
        }

        // Eliminar archivo
        try {
          const exists = await RNFS.exists(this.currentRecordingPath);
          if (exists) {
            await RNFS.unlink(this.currentRecordingPath);
            Logger.info('AudioService: Archivo de grabación eliminado', { path: this.currentRecordingPath });
          }
        } catch (e) {
          Logger.warn('AudioService: Error eliminando archivo al cancelar', e);
        }

        this.currentRecordingPath = null;
      }

      // Limpiar listeners
      this.recordingListeners.forEach(() => {
        this.recorderPlayer.removeRecordBackListener();
      });
      this.recordingListeners = [];
    } catch (error) {
      Logger.error('AudioService: Error cancelando grabación', error);
    }
  }

  /**
   * Reproducir audio
   * @param {string} audioUrl - URL o ruta del archivo de audio
   * @param {Object} options - Opciones de reproducción
   * @param {Function} options.onProgress - Callback para actualizar progreso
   * @param {Function} options.onComplete - Callback cuando termine la reproducción
   * @param {number} options.speed - Velocidad de reproducción (0.5, 1.0, 1.5, 2.0) - default: 1.0
   * @returns {Promise<void>}
   */
  async playAudio(audioUrl, options = {}) {
    const { speed = 1.0 } = options;
    try {
      // Detener reproducción anterior si existe
      await this.stopPlayback();

      Logger.info('AudioService: Iniciando reproducción', { url: audioUrl });

      // Preparar ruta para reproducción
      let playPath = audioUrl;
      if (Platform.OS === 'android' && !playPath.startsWith('file://') && !playPath.startsWith('http') && !playPath.startsWith('content://')) {
        playPath = `file://${playPath}`;
      }

      // Crear instancia de Sound
      return new Promise((resolve, reject) => {
        const sound = new Sound(playPath, '', (error) => {
          if (error) {
            Logger.error('AudioService: Error cargando audio', error);
            reject(new Error('No se pudo cargar el audio'));
            return;
          }

          this.currentSound = sound;
          const duration = sound.getDuration();

          Logger.info('AudioService: Audio cargado', { duration });

          // Configurar velocidad de reproducción si se proporciona (solo Android)
          if (Platform.OS === 'android' && speed !== 1.0) {
            try {
              // react-native-sound no soporta velocidad directamente
              // Usar setSpeed si está disponible (requiere patch o librería alternativa)
              // Por ahora, solo loguear
              Logger.info('AudioService: Velocidad solicitada', { speed, note: 'Solo disponible en Android con librería compatible' });
            } catch (e) {
              Logger.warn('AudioService: No se pudo configurar velocidad', e);
            }
          }

          // Configurar callback de progreso si se proporciona
          if (options.onProgress) {
            const progressInterval = setInterval(() => {
              if (this.currentSound) {
                this.currentSound.getCurrentTime((seconds) => {
                  options.onProgress({
                    currentPosition: seconds,
                    duration,
                  });
                });
              } else {
                clearInterval(progressInterval);
              }
            }, 100);
          }

          // Iniciar reproducción
          sound.play((success) => {
            if (this.currentSound === sound) {
              this.currentSound = null;
            }

            if (success) {
              Logger.info('AudioService: Reproducción completada');
              if (options.onComplete) {
                options.onComplete();
              }
              sound.release();
              resolve();
            } else {
              Logger.warn('AudioService: Reproducción no completada correctamente');
              sound.release();
              reject(new Error('Error en la reproducción'));
            }
          });
        });
      });
    } catch (error) {
      Logger.error('AudioService: Error reproduciendo audio', error);
      throw error;
    }
  }

  /**
   * Detener reproducción actual
   */
  async stopPlayback() {
    try {
      if (this.currentSound) {
        this.currentSound.stop();
        this.currentSound.release();
        this.currentSound = null;
        Logger.info('AudioService: Reproducción detenida');
      }
    } catch (error) {
      Logger.error('AudioService: Error deteniendo reproducción', error);
    }
  }

  /**
   * Verificar si un archivo de audio existe
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<boolean>}
   */
  async fileExists(filePath) {
    try {
      const normalizedPath = filePath.replace(/^file:\/\/+/, '');
      return await RNFS.exists(normalizedPath);
    } catch (error) {
      Logger.error('AudioService: Error verificando existencia de archivo', error);
      return false;
    }
  }

  /**
   * Eliminar archivo de audio
   * @param {string} filePath - Ruta del archivo
   * @returns {Promise<void>}
   */
  async deleteFile(filePath) {
    try {
      const normalizedPath = filePath.replace(/^file:\/\/+/, '');
      const exists = await RNFS.exists(normalizedPath);
      if (exists) {
        await RNFS.unlink(normalizedPath);
        Logger.info('AudioService: Archivo eliminado', { path: normalizedPath });
      }
    } catch (error) {
      Logger.error('AudioService: Error eliminando archivo', error);
      throw error;
    }
  }

  /**
   * Limpiar todos los recursos (grabación y reproducción)
   */
  async cleanup() {
    try {
      await this.cancelRecording();
      await this.stopPlayback();
      Logger.info('AudioService: Recursos limpiados');
    } catch (error) {
      Logger.error('AudioService: Error en cleanup', error);
    }
  }
}

// Singleton
const audioService = new AudioService();

export default audioService;

