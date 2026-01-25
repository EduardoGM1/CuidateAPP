/**
 * Componente: VoiceRecorder
 * 
 * Componente para grabar mensajes de voz y enviarlos al chat.
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import audioService from '../../services/audioService';
import Logger from '../../services/logger';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import { uploadAudioFile } from '../../api/chatService';

const VoiceRecorder = ({ onRecordingComplete, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioFilePath, setAudioFilePath] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!isUploading) {
        await audioService.cleanup();
      }
    } catch (error) {
      Logger.error('VoiceRecorder: Error en cleanup', error);
    }
  };

  const startRecording = async () => {
    try {
      setRecordingTime(0);
      setAudioFilePath(null);
      setAudioDuration(0);
      setCurrentPosition(0);

      await audioService.startRecording({
        onProgress: ({ currentPosition }) => {
          setRecordingTime(currentPosition);
        },
      });

      setIsRecording(true);
      audioFeedbackService.playSuccess();
      hapticService.medium();

      // Timer para mostrar tiempo transcurrido
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      Logger.error('VoiceRecorder: Error iniciando grabación', error);
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

      const result = await audioService.stopRecording();
      const fileExists = await audioService.fileExists(result.path);
      
      if (!fileExists) {
        throw new Error('El archivo de audio no se encontró');
      }

      setIsRecording(false);
      setAudioFilePath(result.path);
      setAudioDuration(recordingTime);
      audioFeedbackService.playSuccess();
      hapticService.medium();
    } catch (error) {
      Logger.error('VoiceRecorder: Error deteniendo grabación', error);
      audioFeedbackService.playError();
      setIsRecording(false);
    }
  };

  const playPreview = async () => {
    if (!audioFilePath) return;

    try {
      setIsPlayingPreview(true);
      audioFeedbackService.playSuccess();
      hapticService.light();

      const fileExists = await audioService.fileExists(audioFilePath);
      if (!fileExists) {
        throw new Error('El archivo de audio no existe');
      }

      await audioService.playAudio(audioFilePath, {
        onProgress: ({ currentPosition }) => {
          setCurrentPosition(Math.floor(currentPosition));
        },
        onComplete: () => {
          stopPreview();
        },
      });
    } catch (error) {
      Logger.error('VoiceRecorder: Error reproduciendo preview', error);
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
      Logger.error('VoiceRecorder: Error deteniendo preview', error);
      setIsPlayingPreview(false);
    }
  };

  const cancelRecording = async () => {
    try {
      if (isRecording) {
        await audioService.cancelRecording();
      }
      if (isPlayingPreview) {
        await audioService.stopPlayback();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (audioFilePath) {
        await audioService.deleteFile(audioFilePath);
      }

      setIsRecording(false);
      setIsPlayingPreview(false);
      setRecordingTime(0);
      setAudioFilePath(null);
      setAudioDuration(0);
      setCurrentPosition(0);

      if (onCancel) {
        onCancel();
      }
    } catch (error) {
      Logger.error('VoiceRecorder: Error cancelando', error);
    }
  };

  const handleSend = async () => {
    if (!audioFilePath) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);
      hapticService.medium();

      // Subir archivo
      const audioUrl = await uploadAudioFile(audioFilePath, {
        onProgress: ({ percent }) => {
          setUploadProgress(percent || 0);
        },
      });

      // Pasar al callback
      if (onRecordingComplete) {
        await onRecordingComplete({
          audioFilePath,
          audioUrl,
          duration: audioDuration,
        });
      }

      setIsUploading(false);
      setUploadProgress(0);
    } catch (error) {
      Logger.error('VoiceRecorder: Error enviando audio', error);
      audioFeedbackService.playError();
      setIsUploading(false);
      setUploadProgress(0);
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
        <View style={styles.recordingContainer}>
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
          </View>
          <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
            <Text style={styles.stopButtonText}>⏹️ Detener</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Estado: Preview
  if (audioFilePath) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Text style={styles.previewTitle}>Audio grabado</Text>
          <Text style={styles.previewDuration}>Duración: {formatTime(audioDuration)}</Text>

          {isPlayingPreview ? (
            <View style={styles.playbackContainer}>
              <Text style={styles.playbackTime}>
                {formatTime(currentPosition)} / {formatTime(audioDuration)}
              </Text>
              <TouchableOpacity style={styles.pauseButton} onPress={stopPreview}>
                <Text style={styles.pauseButtonText}>⏸️ Pausar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.playButton} onPress={playPreview}>
              <Text style={styles.playButtonText}>▶️ Escuchar</Text>
            </TouchableOpacity>
          )}

          {isUploading && (
            <View style={styles.uploadContainer}>
              <Text style={styles.uploadText}>Subiendo... {uploadProgress}%</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${uploadProgress}%` }]} />
              </View>
            </View>
          )}

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={cancelRecording}
              disabled={isUploading}
            >
              <Text style={styles.cancelButtonText}>✗ Cancelar</Text>
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
      <View style={styles.initialContainer}>
        <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
          <Text style={styles.recordButtonText}>🎤 Grabar</Text>
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
    backgroundColor: '#F44336',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    minWidth: 150,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 300,
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#F44336',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
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
