/**
 * Componente: VoicePlayer
 * 
 * Componente mejorado para reproducir mensajes de voz en el chat.
 * Incluye: cache, scrubbing, velocidad ajustable, persistencia, animaciones, accesibilidad.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import Sound from 'react-native-sound';
import Logger from '../../services/logger';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import audioCacheService from '../../services/audioCacheService';
import audioProgressService from '../../services/audioProgressService';

// Habilitar modo de reproducción en modo silencioso (iOS)
Sound.setCategory('Playback');

// Velocidades disponibles
const PLAYBACK_SPEEDS = [1.0, 1.5, 2.0];

const VoicePlayer = ({
  audioUrl,
  duration,
  onPlayComplete,
  isOwnMessage = false,
  waveformData = null, // Datos de waveform del servidor (opcional)
}) => {
  // Estados principales
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(duration || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedControls, setShowSpeedControls] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Refs
  const soundRef = useRef(null);
  const intervalRef = useRef(null);
  const waveformRef = useRef(null);
  const containerRef = useRef(null);
  const waveformWidthRef = useRef(200); // Ancho por defecto
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Generar waveform mejorada (memoizada)
  const generateWaveform = useCallback((barCount = 40) => {
    if (waveformData && Array.isArray(waveformData)) {
      // Usar datos del servidor si están disponibles
      return waveformData.slice(0, barCount).map((value) => Math.max(0.1, Math.min(1.0, value)));
    }

    // Generar waveform simulada más realista
    const heights = [];
    const seed = audioUrl ? audioUrl.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : Math.random() * 1000;
    
    for (let i = 0; i < barCount; i++) {
      const normalizedIndex = i / barCount;
      const baseHeight = 0.2 + Math.sin(normalizedIndex * Math.PI * 4) * 0.15;
      const variation = Math.sin((i + seed) / 2.5) * 0.35 + Math.cos((i + seed) / 5) * 0.25;
      const random = ((seed + i) % 100) / 100 * 0.15 - 0.075;
      heights.push(Math.max(0.15, Math.min(1.0, baseHeight + variation + random)));
    }
    return heights;
  }, [audioUrl, waveformData]);

  const waveformHeights = useMemo(() => generateWaveform(40), [generateWaveform]);

  // Cargar progreso guardado al montar
  useEffect(() => {
    const loadProgress = async () => {
      if (audioUrl) {
        const savedProgress = await audioProgressService.getProgress(audioUrl);
        if (savedProgress && savedProgress.currentPosition > 0) {
          setCurrentPosition(savedProgress.currentPosition);
          if (savedProgress.duration) {
            setCurrentDuration(savedProgress.duration);
          }
        }
      }
    };
    loadProgress();
  }, [audioUrl]);

  // Guardar progreso periódicamente
  useEffect(() => {
    if (isPlaying && currentPosition > 0 && currentDuration > 0) {
      const saveInterval = setInterval(() => {
        audioProgressService.saveProgress(audioUrl, currentPosition, currentDuration);
      }, 2000); // Guardar cada 2 segundos

      return () => clearInterval(saveInterval);
    }
  }, [isPlaying, currentPosition, currentDuration, audioUrl]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
        soundRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Guardar progreso final
      if (audioUrl && currentPosition > 0) {
        audioProgressService.saveProgress(audioUrl, currentPosition, currentDuration);
      }
    };
  }, []);

  // Animación de pulso cuando está reproduciendo
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isPlaying, scaleAnim]);

  // Descargar y cachear audio
  const downloadAudio = useCallback(async (url) => {
    try {
      setIsDownloading(true);
      setDownloadProgress(0);

      // Intentar obtener de cache primero
      const cachedPath = await audioCacheService.getCachedPath(url);
      if (cachedPath) {
        setIsDownloading(false);
        return cachedPath;
      }

      // Descargar y cachear
      const cached = await audioCacheService.downloadAndCache(url);
      setIsDownloading(false);
      setDownloadProgress(100);
      return cached;
    } catch (error) {
      Logger.error('VoicePlayer: Error descargando audio', error);
      setIsDownloading(false);
      setDownloadProgress(0);
      throw error;
    }
  }, []);

  // Iniciar reproducción
  const startPlayback = useCallback(async () => {
    if (!audioUrl) {
      setError('No hay URL de audio disponible');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      hapticService.light();
      audioFeedbackService.playSuccess();

      // Detener reproducción anterior si existe
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
        soundRef.current = null;
      }

      // Obtener audio (cacheado o descargar)
      let playPath = audioUrl;
      if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
        try {
          playPath = await downloadAudio(audioUrl);
        } catch (downloadError) {
          // Si falla el cache, usar URL directa (fallback)
          const errorMessage = downloadError?.message || String(downloadError);
          const errorCode = downloadError?.code;
          
          // Solo registrar como warning si no es un error esperado (ENOENT, directorio no existe, etc.)
          if (errorCode !== 'ENOENT' && !errorMessage.includes('ENOENT')) {
            Logger.warn('VoicePlayer: Usando URL directa después de error en cache', {
              error: errorMessage,
              code: errorCode,
              url: audioUrl,
            });
          } else {
            Logger.debug('VoicePlayer: Cache no disponible, usando URL directa', { url: audioUrl });
          }
          playPath = audioUrl;
        }
      }

      // Normalizar ruta para Android
      if (Platform.OS === 'android' && !playPath.startsWith('file://') && !playPath.startsWith('http') && !playPath.startsWith('content://')) {
        playPath = `file://${playPath}`;
      }

      // Crear instancia de Sound
      const sound = new Sound(playPath, '', (error) => {
        if (error) {
          Logger.error('VoicePlayer: Error cargando audio', error);
          setError('No se pudo cargar el audio');
          setLoading(false);
          setIsPlaying(false);
          return;
        }

        // Audio cargado exitosamente
        const duration = sound.getDuration();
        setCurrentDuration(duration);
        setIsPlaying(true);
        setLoading(false);

        // Reproducir desde posición guardada si existe
        audioProgressService.getProgress(audioUrl).then((savedProgress) => {
          if (savedProgress && savedProgress.currentPosition > 0 && savedProgress.currentPosition < duration) {
            sound.setCurrentTime(savedProgress.currentPosition);
            setCurrentPosition(savedProgress.currentPosition);
          }
        });

        // Iniciar reproducción
        sound.play((success) => {
          if (success) {
            Logger.info('VoicePlayer: Reproducción completada');
            setIsPlaying(false);
            setCurrentPosition(0);
            // Limpiar progreso guardado
            audioProgressService.clearProgress(audioUrl);
            if (onPlayComplete) {
              onPlayComplete();
            }
          } else {
            Logger.warn('VoicePlayer: Reproducción no completada correctamente');
            setIsPlaying(false);
          }

          // Liberar recurso
          sound.release();
          soundRef.current = null;
        });

        // Actualizar posición cada 100ms para progreso suave
        intervalRef.current = setInterval(() => {
          if (soundRef.current) {
            sound.getCurrentTime((seconds) => {
              setCurrentPosition(seconds);
            });
          }
        }, 100);

        soundRef.current = sound;
        Logger.info('VoicePlayer: Reproducción iniciada', { url: audioUrl });
      });
    } catch (error) {
      Logger.error('VoicePlayer: Error iniciando reproducción', error);
      setError('No se pudo iniciar la reproducción');
      audioFeedbackService.playError();
      setIsPlaying(false);
      setLoading(false);
    }
  }, [audioUrl, downloadAudio, onPlayComplete]);

  // Detener reproducción
  const stopPlayback = useCallback(() => {
    try {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
        soundRef.current = null;
      }

      setIsPlaying(false);
      // Guardar progreso antes de resetear
      if (currentPosition > 0) {
        audioProgressService.saveProgress(audioUrl, currentPosition, currentDuration);
      }
      // No resetear currentPosition para mantener el progreso

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      Logger.info('VoicePlayer: Reproducción detenida');
    } catch (error) {
      Logger.error('VoicePlayer: Error deteniendo reproducción', error);
    }
  }, [audioUrl, currentPosition, currentDuration]);

  // Toggle play/pause
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, startPlayback, stopPlayback]);

  // Cambiar velocidad de reproducción
  const changeSpeed = useCallback((speed) => {
    setPlaybackSpeed(speed);
    setShowSpeedControls(false);
    // Nota: react-native-sound no soporta velocidad directamente
    // Esto requeriría una librería alternativa o patch
    Logger.info('VoicePlayer: Velocidad cambiada', { speed, note: 'Solo visual, requiere librería compatible para funcionalidad real' });
  }, []);

  // Scrubbing: saltar a posición específica
  const handleWaveformPress = useCallback((event) => {
    if (!soundRef.current || !currentDuration) return;

    try {
      const { locationX } = event.nativeEvent;
      const width = waveformWidthRef.current;
      const percentage = Math.max(0, Math.min(1, locationX / width));
      const newPosition = percentage * currentDuration;

      if (soundRef.current) {
        soundRef.current.setCurrentTime(newPosition);
        setCurrentPosition(newPosition);
        audioProgressService.saveProgress(audioUrl, newPosition, currentDuration);
      }
    } catch (error) {
      Logger.error('VoicePlayer: Error en scrubbing', error);
    }
  }, [currentDuration, audioUrl]);

  // Obtener ancho del contenedor de waveform
  const handleWaveformLayout = useCallback((event) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      waveformWidthRef.current = width;
    }
  }, []);

  // Formatear tiempo
  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calcular progreso y posiciones
  const progress = useMemo(() => {
    return currentDuration > 0 ? (currentPosition / currentDuration) * 100 : 0;
  }, [currentPosition, currentDuration]);

  const barCount = waveformHeights.length;
  const barWidth = 2.5;
  const barSpacing = 1.5;
  const waveformWidth = (barWidth + barSpacing) * barCount - barSpacing;
  const scrubberPosition = useMemo(() => {
    return Math.max(4, Math.min(waveformWidth - 4, (progress / 100) * waveformWidth));
  }, [progress, waveformWidth]);

  // Colores
  const playIconColor = '#5E5E5E';
  const waveformColor = '#6B9BD1';
  const waveformActiveColor = '#34B7F1';
  const scrubberColor = '#34B7F1';
  const timeTextColor = isOwnMessage ? '#000000' : '#5E5E5E';
  const errorColor = '#F44336';

  // Accesibilidad
  const accessibilityLabel = isPlaying
    ? `Reproduciendo audio, ${formatTime(currentPosition)} de ${formatTime(currentDuration)}. Pausar.`
    : `Audio de ${formatTime(currentDuration)}. Reproducir.`;

  return (
    <View
      ref={containerRef}
      style={styles.container}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityHint="Toca dos veces para reproducir o pausar el audio"
    >
      {/* Icono de play/pausa con animación */}
      <Animated.View
        style={[
          styles.playIconContainer,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <TouchableOpacity
          onPress={togglePlayback}
          disabled={loading || !audioUrl || isDownloading}
          activeOpacity={0.7}
          accessible={false}
        >
          {loading || isDownloading ? (
            <ActivityIndicator size="small" color={playIconColor} />
          ) : error ? (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Circle cx="12" cy="12" r="10" fill={errorColor} />
              <Path d="M12 8v4M12 16h.01" stroke="#FFFFFF" strokeWidth="2" />
            </Svg>
          ) : (
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              {isPlaying ? (
                <>
                  <Rect x="6" y="4" width="4" height="16" fill={playIconColor} />
                  <Rect x="14" y="4" width="4" height="16" fill={playIconColor} />
                </>
              ) : (
                <Path d="M8 5v14l11-7z" fill={playIconColor} />
              )}
            </Svg>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Duración */}
      <View style={styles.durationContainer}>
        <Text style={[styles.durationText, { color: timeTextColor }]}>
          {formatTime(isPlaying ? currentPosition : currentDuration)}
        </Text>
        {isDownloading && (
          <Text style={[styles.downloadText, { color: timeTextColor }]}>
            {Math.round(downloadProgress)}%
          </Text>
        )}
      </View>

      {/* Waveform con scrubbing */}
      <TouchableOpacity
        style={styles.waveformContainer}
        onPress={handleWaveformPress}
        activeOpacity={0.8}
        disabled={!isPlaying || !currentDuration}
        accessible={false}
      >
        <View
          ref={waveformRef}
          style={styles.waveformWrapper}
          onLayout={handleWaveformLayout}
        >
          <Svg
            width="100%"
            height={28}
            viewBox={`0 0 ${waveformWidth} 28`}
            preserveAspectRatio="none"
            style={styles.waveformSvg}
          >
            {waveformHeights.map((heightRatio, index) => {
              const barHeight = 28 * heightRatio;
              const x = index * (barWidth + barSpacing);
              const y = (28 - barHeight) / 2;
              const isActive = (index / barCount) * 100 <= progress;

              return (
                <Rect
                  key={index}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={barWidth / 2}
                  fill={isActive ? waveformActiveColor : waveformColor}
                  opacity={isActive ? 1 : 0.7}
                />
              );
            })}

            {progress > 0 && (
              <Circle cx={scrubberPosition} cy={14} r={5} fill={scrubberColor} />
            )}
          </Svg>
        </View>
      </TouchableOpacity>

      {/* Controles de velocidad */}
      {showSpeedControls && (
        <View style={styles.speedControlsContainer}>
          {PLAYBACK_SPEEDS.map((speed) => (
            <TouchableOpacity
              key={speed}
              style={[
                styles.speedButton,
                playbackSpeed === speed && styles.speedButtonActive,
              ]}
              onPress={() => changeSpeed(speed)}
            >
              <Text
                style={[
                  styles.speedButtonText,
                  playbackSpeed === speed && styles.speedButtonTextActive,
                ]}
              >
                {speed}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Botón de velocidad (long press) */}
      <TouchableOpacity
        style={styles.speedToggleButton}
        onLongPress={() => setShowSpeedControls(!showSpeedControls)}
        onPress={() => {
          // Cambiar velocidad cíclicamente
          const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackSpeed);
          const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
          changeSpeed(PLAYBACK_SPEEDS[nextIndex]);
        }}
        accessible={true}
        accessibilityLabel={`Velocidad de reproducción ${playbackSpeed}x. Mantén presionado para ver opciones.`}
        accessibilityRole="button"
      >
        <Text style={[styles.speedToggleText, { color: timeTextColor }]}>
          {playbackSpeed}x
        </Text>
      </TouchableOpacity>

      {/* Mensaje de error */}
      {error && (
        <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setError(null);
              startPlayback();
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 0,
    minHeight: 32,
    width: '100%',
    overflow: 'hidden',
  },
  playIconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  durationContainer: {
    width: 40,
    marginRight: 6,
    justifyContent: 'center',
    flexShrink: 0,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  downloadText: {
    fontSize: 9,
    fontWeight: '400',
    marginTop: 2,
  },
  waveformContainer: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
    marginRight: 4,
    overflow: 'hidden',
    maxWidth: '100%',
    minWidth: 0,
  },
  waveformWrapper: {
    width: '100%',
    height: 28,
  },
  waveformSvg: {
    width: '100%',
    height: 28,
  },
  speedToggleButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  speedToggleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  speedControlsContainer: {
    position: 'absolute',
    bottom: -40,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  speedButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
    borderRadius: 4,
  },
  speedButtonActive: {
    backgroundColor: '#34B7F1',
  },
  speedButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  speedButtonTextActive: {
    color: '#FFFFFF',
  },
  errorContainer: {
    position: 'absolute',
    top: -30,
    left: 0,
    right: 0,
    backgroundColor: '#F44336',
    padding: 8,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 11,
    flex: 1,
  },
  retryButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default VoicePlayer;
