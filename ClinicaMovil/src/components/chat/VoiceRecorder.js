/**
 * Componente: VoiceRecorder
 * 
 * Componente para grabar mensajes de voz y permitir preview antes de enviar.
 * Usa audioService para toda la lógica de grabación y reproducción.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import audioService from '../../services/audioService';
import Logger from '../../services/logger';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import AudioWaveform from './AudioWaveform';
import { uploadAudioFile } from '../../api/chatService';

const VoiceRecorder = ({ onRecordingComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioFilePath, setAudioFilePath] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const timerRef = useRef(null);

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    try {
      // Limpiar timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Limpiar recursos de audio (solo si no estamos subiendo)
      if (!isUploading) {
        await audioService.cleanup();
      }
    } catch (error) {
      Logger.error('VoiceRecorder: Error en cleanup', error);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      setRecordingTime(0);
      setAudioFilePath(null);
      setAudioDuration(0);
      setCurrentPosition(0);

      Logger.info('VoiceRecorder: Iniciando grabación');

      // Iniciar grabación usando el servicio
      await audioService.startRecording({
        onProgress: ({ currentPosition, duration }) => {
          setRecordingTime(currentPosition);
        },
      });

      setIsRecording(true);
      audioFeedbackService.playSuccess();
      hapticService.medium();

      // Iniciar timer para mostrar tiempo transcurrido
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      Logger.error('VoiceRecorder: Error iniciando grabación', {
        error: error.message,
        code: error.code,
        stack: error.stack,
      });
      setError(error.message || 'No se pudo iniciar la grabación. Verifica los permisos.');
      audioFeedbackService.playError();
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      Logger.info('VoiceRecorder: Deteniendo grabación');

      // Detener grabación usando el servicio
      const result = await audioService.stopRecording();

      // Validar que el archivo existe
      const fileExists = await audioService.fileExists(result.path);
      if (!fileExists) {
        throw new Error('El archivo de audio no se encontró después de la grabación');
      }

      Logger.info('VoiceRecorder: Grabación detenida', {
        path: result.path,
        duration: recordingTime,
        fileExists,
      });

      setIsRecording(false);
      setAudioFilePath(result.path);
      setAudioDuration(recordingTime);
      audioFeedbackService.playSuccess();
      hapticService.medium();
    } catch (error) {
      Logger.error('VoiceRecorder: Error deteniendo grabación', {
        error: error.message,
        code: error.code,
        stack: error.stack,
      });
      setError(error.message || 'No se pudo detener la grabación');
      audioFeedbackService.playError();
      setIsRecording(false);
    }
  };

  const playPreview = async () => {
    if (!audioFilePath) {
      setError('No hay audio para reproducir');
      return;
    }

    try {
      // Actualizar UI inmediatamente para feedback instantáneo
      setIsPlayingPreview(true);
      setError(null);
      audioFeedbackService.playSuccess();
      hapticService.light();

      // Validar que el archivo existe
      const fileExists = await audioService.fileExists(audioFilePath);
      if (!fileExists) {
        throw new Error('El archivo de audio no existe');
      }

      Logger.info('VoiceRecorder: Iniciando reproducción de preview', { path: audioFilePath });

      // Reproducir usando el servicio (no await para no bloquear UI)
      // El estado ya está actualizado, así que la UI se muestra inmediatamente
      audioService.playAudio(audioFilePath, {
        onProgress: ({ currentPosition, duration }) => {
          setCurrentPosition(Math.floor(currentPosition));
          // Si llegó al final, se detendrá automáticamente
        },
        onComplete: () => {
          stopPreview();
        },
      }).catch((error) => {
        // Si hay error después de iniciar, resetear estado
        Logger.error('VoiceRecorder: Error reproduciendo preview', {
          error: error.message,
          code: error.code,
          path: audioFilePath,
          stack: error.stack,
        });
        setError(error.message || 'No se pudo reproducir el audio');
        audioFeedbackService.playError();
        setIsPlayingPreview(false);
      });
    } catch (error) {
      Logger.error('VoiceRecorder: Error iniciando reproducción', {
        error: error.message,
        code: error.code,
        path: audioFilePath,
        stack: error.stack,
      });
      setError(error.message || 'No se pudo reproducir el audio');
      audioFeedbackService.playError();
      setIsPlayingPreview(false);
    }
  };

  const stopPreview = async () => {
    try {
      await audioService.stopPlayback();
      setIsPlayingPreview(false);
      setCurrentPosition(0);
    } catch (error) {
      Logger.error('VoiceRecorder: Error deteniendo reproducción', error);
      setIsPlayingPreview(false);
    }
  };

  const cancelRecording = async () => {
    try {
      // Detener grabación si está activa
      if (isRecording) {
        await audioService.cancelRecording();
      }

      // Detener reproducción si está activa
      if (isPlayingPreview) {
        await audioService.stopPlayback();
      }

      // Limpiar timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Eliminar archivo temporal si existe
      if (audioFilePath) {
        try {
          await audioService.deleteFile(audioFilePath);
          Logger.info('VoiceRecorder: Archivo temporal eliminado al cancelar');
        } catch (e) {
          Logger.warn('VoiceRecorder: Error eliminando archivo al cancelar', e);
        }
      }

      // Resetear estados
      setIsRecording(false);
      setIsPlayingPreview(false);
      setRecordingTime(0);
      setAudioFilePath(null);
      setAudioDuration(0);
      setCurrentPosition(0);
      setError(null);

      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      Logger.error('VoiceRecorder: Error cancelando grabación', error);
    }
  };

  const handleSend = async () => {
    if (!audioFilePath) {
      setError('No hay audio para enviar');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      hapticService.medium();

      // Subir archivo con indicador de progreso
      const audioUrl = await uploadAudioFile(audioFilePath, {
        onProgress: ({ percent, loaded, total }) => {
          Logger.debug('VoiceRecorder: Progreso de upload recibido', { percent, loaded, total });
          setUploadProgress(percent || 0);
        },
      });

      // Pasar URL del servidor y duración al callback
      if (onRecordingComplete) {
        await onRecordingComplete({
          audioFilePath,
          audioUrl, // URL del servidor
          duration: audioDuration,
        });
      }

      // Limpiar después de éxito
      setIsUploading(false);
      setUploadProgress(0);
    } catch (error) {
      Logger.error('VoiceRecorder: Error enviando audio', error);
      setError(error.message || 'No se pudo enviar el audio');
      setIsUploading(false);
      setUploadProgress(0);
      audioFeedbackService.playError();
      // NO eliminar el archivo si hay error - permitir reintento
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Estado: Grabando
  if (isRecording) {
    return (
      <View style={styles.container}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        <View style={styles.recordingContainer}>
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
          </View>
          
          {/* Waveform visual durante grabación */}
          <View style={styles.waveformContainer}>
            <AudioWaveform 
              isActive={isRecording} 
              height={50}
              color="#F44336"
              barCount={25}
            />
          </View>

          <TouchableOpacity
            style={styles.pauseButton}
            onPress={stopRecording}
          >
            <Text style={styles.pauseButtonText}>⏸️ Pausar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Estado: Preview (después de grabar)
  if (audioFilePath) {
    return (
      <View style={styles.container}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Audio grabado</Text>
          <Text style={styles.previewDuration}>
            Duración: {formatTime(audioDuration)}
          </Text>

          {/* Waveform visual durante preview */}
          <View style={styles.waveformContainer}>
            <AudioWaveform 
              isActive={isPlayingPreview} 
              height={50}
              color="#2196F3"
              barCount={25}
            />
          </View>

          {isPlayingPreview ? (
            <View style={styles.playbackContainer}>
              <Text style={styles.playbackTime}>
                {formatTime(currentPosition)} / {formatTime(audioDuration)}
              </Text>

              <TouchableOpacity
                style={styles.pauseButton}
                onPress={stopPreview}
              >
                <Text style={styles.pauseButtonText}>⏸️ Pausar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.playButton}
              onPress={playPreview}
            >
              <Text style={styles.playButtonText}>▶️ Escuchar</Text>
            </TouchableOpacity>
          )}

          {/* Indicador de progreso de upload */}
          {isUploading && (
            <View style={styles.uploadContainer}>
              <Text style={styles.uploadText}>
                Subiendo audio... {uploadProgress}%
              </Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${Math.max(0, Math.min(100, uploadProgress))}%` }
                  ]} 
                />
              </View>
            </View>
          )}

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.cancelPreviewButton}
              onPress={cancelRecording}
              disabled={isUploading}
            >
              <Text style={styles.cancelPreviewButtonText}>✗ Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendButton, isUploading && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendButtonText}>✓ Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Estado: Inicial
  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <View style={styles.initialContainer}>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={startRecording}
        >
          <Text style={styles.recordButtonText}>🎤 Iniciar grabación</Text>
        </TouchableOpacity>
        <Text style={styles.helpText}>Presiona para comenzar a grabar</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 8,
    minHeight: 200,
    justifyContent: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    textAlign: 'center',
  },
  initialContainer: {
    alignItems: 'center',
  },
  recordButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  helpText: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  recordingContainer: {
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  recordingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F44336',
    marginRight: 12,
  },
  recordingTime: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  stopButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    minWidth: 180,
    marginBottom: 12,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  waveformContainer: {
    width: '100%',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  pauseButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    minWidth: 150,
    marginTop: 12,
  },
  pauseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  previewDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  playbackContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  playbackTime: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '600',
  },
  playButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    minWidth: 150,
    marginBottom: 20,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  pauseButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    minWidth: 150,
  },
  pauseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
  },
  cancelPreviewButton: {
    backgroundColor: '#F44336',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelPreviewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadContainer: {
    width: '100%',
    marginTop: 16,
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
});

export default VoiceRecorder;
