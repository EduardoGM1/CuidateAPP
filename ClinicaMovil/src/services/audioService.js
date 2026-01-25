/**
 * Servicio: Audio
 * 
 * Servicio centralizado para grabación y reproducción de audio.
 * Flujo: grabar → enviar → reproducir
 */

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';
import Logger from './logger';
import permissionsService from './permissionsService';

// Configurar Sound para reproducción
if (Sound && typeof Sound.setCategory === 'function') {
  try {
    Sound.setCategory('Playback');
  } catch (error) {
    Logger.warn('AudioService: No se pudo configurar categoría de Sound', error);
  }
}

// Lazy import de AudioRecorderPlayer
let AudioRecorderPlayerModule = null;

class AudioService {
  constructor() {
    this.recorderPlayer = null;
    this.currentRecordingPath = null;
    this.currentSound = null;
    this.recordingListeners = [];
  }

  /**
   * Inicializar AudioRecorderPlayer
   */
  _initializeRecorder() {
    if (this.recorderPlayer) {
      return this.recorderPlayer;
    }

    try {
      if (!AudioRecorderPlayerModule) {
        AudioRecorderPlayerModule = require('react-native-audio-recorder-player');
      }

      // Intentar diferentes formas de obtener la instancia
      if (AudioRecorderPlayerModule && typeof AudioRecorderPlayerModule.startRecorder === 'function') {
        this.recorderPlayer = AudioRecorderPlayerModule;
      } else if (AudioRecorderPlayerModule?.default && typeof AudioRecorderPlayerModule.default.startRecorder === 'function') {
        this.recorderPlayer = AudioRecorderPlayerModule.default;
      } else if (AudioRecorderPlayerModule?.default && typeof AudioRecorderPlayerModule.default === 'function') {
        this.recorderPlayer = new AudioRecorderPlayerModule.default();
      } else if (AudioRecorderPlayerModule?.AudioRecorderPlayer && typeof AudioRecorderPlayerModule.AudioRecorderPlayer === 'function') {
        this.recorderPlayer = new AudioRecorderPlayerModule.AudioRecorderPlayer();
      } else {
        throw new Error('No se pudo inicializar AudioRecorderPlayer');
      }

      Logger.info('AudioService: AudioRecorderPlayer inicializado');
      return this.recorderPlayer;
    } catch (error) {
      Logger.error('AudioService: Error inicializando AudioRecorderPlayer', error);
      throw new Error('No se pudo inicializar el grabador de audio');
    }
  }

  /**
   * Iniciar grabación
   */
  async startRecording(options = {}) {
    try {
      // Verificar permisos
      const hasPermission = await permissionsService.requestMicrophonePermission();
      if (!hasPermission) {
        throw new Error('Se requiere permiso de micrófono');
      }

      // Generar ruta del archivo
      const timestamp = Date.now();
      const basePath = Platform.select({
        ios: RNFS.DocumentDirectoryPath,
        android: RNFS.CacheDirectoryPath || RNFS.DocumentDirectoryPath,
      });

      if (!basePath) {
        throw new Error('No se pudo obtener la ruta del directorio');
      }

      // Asegurar que el directorio existe
      const dirExists = await RNFS.exists(basePath);
      if (!dirExists) {
        await RNFS.mkdir(basePath);
      }

      const audioPath = `${basePath}/audio_${timestamp}.m4a`;
      this.currentRecordingPath = audioPath;

      // Inicializar y empezar grabación
      const recorder = this._initializeRecorder();
      const recordingPath = await recorder.startRecorder(audioPath);
      this.currentRecordingPath = recordingPath || audioPath;

      // Configurar listener de progreso
      if (options.onProgress) {
        const listener = recorder.addRecordBackListener((e) => {
          options.onProgress({
            currentPosition: Math.floor(e.currentPosition / 1000),
            duration: Math.floor(e.duration / 1000),
          });
        });
        this.recordingListeners.push(listener);
      }

      Logger.info('AudioService: Grabación iniciada', { path: this.currentRecordingPath });
      return { path: this.currentRecordingPath, duration: 0 };
    } catch (error) {
      Logger.error('AudioService: Error iniciando grabación', error);
      this.currentRecordingPath = null;
      throw error;
    }
  }

  /**
   * Detener grabación
   */
  async stopRecording() {
    try {
      if (!this.currentRecordingPath) {
        throw new Error('No hay grabación activa');
      }

      const recorder = this._initializeRecorder();

      // Remover listeners
      this.recordingListeners.forEach(() => {
        if (recorder.removeRecordBackListener) {
          recorder.removeRecordBackListener();
        }
      });
      this.recordingListeners = [];

      // Detener grabación
      await recorder.stopRecorder();

      const path = this.currentRecordingPath;
      this.currentRecordingPath = null;

      Logger.info('AudioService: Grabación detenida', { path });
      return { path, duration: 0 };
    } catch (error) {
      Logger.error('AudioService: Error deteniendo grabación', error);
      this.currentRecordingPath = null;
      throw error;
    }
  }

  /**
   * Cancelar grabación
   */
  async cancelRecording() {
    try {
      if (this.currentRecordingPath) {
        const recorder = this._initializeRecorder();
        
        // Detener grabación
        try {
          await recorder.stopRecorder();
        } catch (e) {
          Logger.warn('AudioService: Error deteniendo grabación al cancelar', e);
        }

        // Remover listeners
        this.recordingListeners.forEach(() => {
          if (recorder.removeRecordBackListener) {
            recorder.removeRecordBackListener();
          }
        });
        this.recordingListeners = [];

        // Eliminar archivo
        try {
          const exists = await RNFS.exists(this.currentRecordingPath);
          if (exists) {
            await RNFS.unlink(this.currentRecordingPath);
          }
        } catch (e) {
          Logger.warn('AudioService: Error eliminando archivo', e);
        }

        this.currentRecordingPath = null;
      }
    } catch (error) {
      Logger.error('AudioService: Error cancelando grabación', error);
    }
  }

  /**
   * Reproducir audio
   */
  async playAudio(audioPath, options = {}) {
    try {
      // Detener reproducción anterior
      await this.stopPlayback();

      // Normalizar ruta para Android
      let playPath = audioPath;
      if (Platform.OS === 'android' && !playPath.startsWith('file://') && !playPath.startsWith('http') && !playPath.startsWith('content://')) {
        playPath = `file://${playPath}`;
      }

      Logger.info('AudioService: Reproduciendo audio', { path: playPath });

      return new Promise((resolve, reject) => {
        const sound = new Sound(playPath, '', (error) => {
          if (error) {
            Logger.error('AudioService: Error cargando audio', error);
            reject(new Error('No se pudo cargar el audio'));
            return;
          }

          this.currentSound = sound;
          const duration = sound.getDuration();

          // Configurar callback de progreso
          if (options.onProgress) {
            const progressInterval = setInterval(() => {
              if (this.currentSound === sound) {
                sound.getCurrentTime((seconds) => {
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

          // Reproducir
          sound.play((success) => {
            if (this.currentSound === sound) {
              this.currentSound = null;
            }

            if (success) {
              if (options.onComplete) {
                options.onComplete();
              }
              sound.release();
              resolve();
            } else {
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
   * Detener reproducción
   */
  async stopPlayback() {
    try {
      if (this.currentSound) {
        this.currentSound.stop();
        this.currentSound.release();
        this.currentSound = null;
      }
    } catch (error) {
      Logger.error('AudioService: Error deteniendo reproducción', error);
    }
  }

  /**
   * Verificar si archivo existe
   */
  async fileExists(filePath) {
    try {
      const normalizedPath = filePath.replace(/^file:\/\/+/, '');
      return await RNFS.exists(normalizedPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Eliminar archivo
   */
  async deleteFile(filePath) {
    try {
      const normalizedPath = filePath.replace(/^file:\/\/+/, '');
      const exists = await RNFS.exists(normalizedPath);
      if (exists) {
        await RNFS.unlink(normalizedPath);
      }
    } catch (error) {
      Logger.error('AudioService: Error eliminando archivo', error);
      throw error;
    }
  }

  /**
   * Limpiar recursos
   */
  async cleanup() {
    try {
      await this.cancelRecording();
      await this.stopPlayback();
    } catch (error) {
      Logger.error('AudioService: Error en cleanup', error);
    }
  }
}

// Singleton
const audioService = new AudioService();
export default audioService;
