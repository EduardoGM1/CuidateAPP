/**
 * Componente: VoicePlayer
 * 
 * Componente para reproducir mensajes de voz en el chat.
 * SOLUCIÓN ALTERNATIVA: Usa react-native-audio-recorder-player para reproducir
 * directamente desde URLs HTTP, eliminando la necesidad de descargar archivos.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Logger from '../../services/logger';
import hapticService from '../../services/hapticService';

// Lazy import de AudioRecorderPlayer (puede reproducir desde URLs HTTP directamente)
let AudioRecorderPlayerModule = null;

const VoicePlayer = ({ audioUrl, duration, onPlayComplete, isOwnMessage = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(duration || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  /**
   * Inicializar AudioRecorderPlayer (puede reproducir desde URLs HTTP)
   */
  const getPlayer = useCallback(() => {
    if (playerRef.current) {
      return playerRef.current;
    }

    try {
      if (!AudioRecorderPlayerModule) {
        AudioRecorderPlayerModule = require('react-native-audio-recorder-player');
      }

      // Intentar obtener la instancia
      let player = null;
      if (AudioRecorderPlayerModule && typeof AudioRecorderPlayerModule.startPlayer === 'function') {
        player = AudioRecorderPlayerModule;
      } else if (AudioRecorderPlayerModule?.default && typeof AudioRecorderPlayerModule.default.startPlayer === 'function') {
        player = AudioRecorderPlayerModule.default;
      } else if (AudioRecorderPlayerModule?.default && typeof AudioRecorderPlayerModule.default === 'function') {
        player = new AudioRecorderPlayerModule.default();
      } else if (AudioRecorderPlayerModule?.AudioRecorderPlayer && typeof AudioRecorderPlayerModule.AudioRecorderPlayer === 'function') {
        player = new AudioRecorderPlayerModule.AudioRecorderPlayer();
      }

      if (!player) {
        throw new Error('No se pudo inicializar AudioRecorderPlayer');
      }

      playerRef.current = player;
      Logger.info('VoicePlayer: AudioRecorderPlayer inicializado para reproducción');
      return player;
    } catch (error) {
      Logger.error('VoicePlayer: Error inicializando AudioRecorderPlayer', error);
      throw error;
    }
  }, []);

  /**
   * Detener reproducción (definido antes para poder usarlo en useEffect)
   */
  const stopPlayback = useCallback(async () => {
    try {
      if (playerRef.current) {
        await playerRef.current.stopPlayer();
        playerRef.current.removePlayBackListener();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentPosition(0);
      setIsPlaying(false);
      setLoading(false);
    } catch (error) {
      Logger.error('VoicePlayer: Error deteniendo reproducción', error);
      setIsPlaying(false);
      setLoading(false);
    }
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopPlayback();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stopPlayback]);

  /**
   * Normalizar URL: convertir relativa a absoluta y reemplazar localhost
   * CRÍTICO: En Android, localhost no funciona, debe ser IP de red
   */
  const normalizeAudioUrl = useCallback(async (url) => {
    if (!url) return null;

    try {
      // Decodificar HTML entities si están presentes (ej: &#x2F; -> /)
      let decodedUrl = url;
      try {
        // Crear un elemento temporal para decodificar HTML entities
        if (typeof document !== 'undefined') {
          const txt = document.createElement('textarea');
          txt.innerHTML = url;
          decodedUrl = txt.value;
        } else {
          // Fallback para React Native: reemplazar entidades comunes
          decodedUrl = url
            .replace(/&#x2F;/g, '/')
            .replace(/&#x3A;/g, ':')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
        }
      } catch (e) {
        // Si falla la decodificación, usar la URL original
        decodedUrl = url;
      }

      Logger.info('VoicePlayer: Normalizando URL', { original: url, decoded: decodedUrl });

      // Importar configuración
      const { getApiConfigWithFallback } = await import('../../config/apiConfig');
      const { PRODUCTION_API_BASE_URL } = await import('../../config/apiEndpoints');
      const apiConfig = await getApiConfigWithFallback();
      
      // Determinar baseURL: usar la configuración de API actualizada
      let baseURL = null;
      if (apiConfig?.baseURL) {
        baseURL = apiConfig.baseURL.replace(/\/$/, '');
        // Si el baseURL es localhost, reemplazarlo con VPS
        if (baseURL.includes('localhost') || baseURL.includes('127.0.0.1') || baseURL.includes('10.0.2.2')) {
          baseURL = PRODUCTION_API_BASE_URL.replace(/\/$/, '');
          Logger.warn('VoicePlayer: Reemplazando localhost con VPS', { newBaseURL: baseURL });
        }
        Logger.info('VoicePlayer: Usando baseURL de configuración', { baseURL });
      } else {
        // Fallback: usar VPS directamente
        baseURL = PRODUCTION_API_BASE_URL.replace(/\/$/, '');
        Logger.warn('VoicePlayer: Usando VPS por defecto', { baseURL });
      }

      // Si ya es URL absoluta HTTP/HTTPS
      if (decodedUrl.startsWith('http://') || decodedUrl.startsWith('https://')) {
        // Reemplazar localhost/127.0.0.1/10.0.2.2 con IP de red SIEMPRE
        const localhostPattern = /localhost|127\.0\.0\.1|10\.0\.2\.2/i;
        if (localhostPattern.test(decodedUrl)) {
          // Extraer el path (todo después del dominio y puerto)
          const pathMatch = decodedUrl.match(/https?:\/\/[^\/]+(\/.*)?$/);
          const path = pathMatch ? (pathMatch[1] || '') : '';
          
          // Construir nueva URL con IP de red
          const newUrl = baseURL + path;
          Logger.info('VoicePlayer: Reemplazando localhost con IP de red', { 
            original: url, 
            decoded: decodedUrl,
            new: newUrl,
            baseURL,
            path
          });
          return newUrl;
        }
        // Si no tiene localhost, verificar que sea accesible
        Logger.info('VoicePlayer: URL ya es absoluta sin localhost', { url: decodedUrl });
        return decodedUrl;
      }

      // Si es ruta relativa, convertir a absoluta
      if (decodedUrl.startsWith('/')) {
        const fullUrl = `${baseURL}${decodedUrl}`;
        Logger.info('VoicePlayer: URL relativa convertida', { original: url, decoded: decodedUrl, full: fullUrl });
        return fullUrl;
      }

      Logger.warn('VoicePlayer: URL no reconocida, retornando original', { url, decoded: decodedUrl });
      return decodedUrl;
    } catch (error) {
      Logger.error('VoicePlayer: Error normalizando URL', error);
      // Fallback agresivo: reemplazar localhost manualmente
      let fallbackUrl = url;
      // Decodificar HTML entities primero
      fallbackUrl = fallbackUrl
        .replace(/&#x2F;/g, '/')
        .replace(/&#x3A;/g, ':');
      
      // Reemplazar localhost con VPS
      if (fallbackUrl.includes('localhost') || fallbackUrl.includes('127.0.0.1') || fallbackUrl.includes('10.0.2.2')) {
        const { PRODUCTION_API_BASE_URL } = await import('../../config/apiEndpoints');
        fallbackUrl = fallbackUrl.replace(/https?:\/\/[^\/]+/i, PRODUCTION_API_BASE_URL.replace(/\/$/, ''));
        Logger.warn('VoicePlayer: Usando fallback manual con VPS', { original: url, fallback: fallbackUrl });
      }
      return fallbackUrl;
    }
  }, []);

  /**
   * Obtener URL normalizada para reproducción
   * SOLUCIÓN ALTERNATIVA: AudioRecorderPlayer puede reproducir directamente desde URLs HTTP
   * No necesitamos descargar el archivo, solo normalizar la URL
   */
  const getPlaybackUrl = useCallback(async (url) => {
    if (!url) {
      throw new Error('URL de audio no proporcionada');
    }

    // Normalizar URL (convertir relativa a absoluta y reemplazar localhost)
    let normalizedUrl = await normalizeAudioUrl(url);
    
    if (!normalizedUrl) {
      throw new Error('URL de audio no válida');
    }

    // Verificación final CRÍTICA: asegurar que NO tenga localhost
    const localhostPattern = /localhost|127\.0\.0\.1|10\.0\.2\.2/i;
    if (localhostPattern.test(normalizedUrl)) {
      Logger.warn('VoicePlayer: URL normalizada aún contiene localhost, aplicando corrección forzada', { 
        normalized: normalizedUrl 
      });
      // Extraer path
      const pathMatch = normalizedUrl.match(/https?:\/\/[^\/]+(\/.*)?$/);
      const path = pathMatch ? (pathMatch[1] || '') : '';
      // Forzar VPS
      const { PRODUCTION_API_BASE_URL } = await import('../../config/apiEndpoints');
      normalizedUrl = `${PRODUCTION_API_BASE_URL.replace(/\/$/, '')}${path}`;
      Logger.info('VoicePlayer: URL corregida forzadamente con VPS', { newUrl: normalizedUrl });
    }

    Logger.info('VoicePlayer: URL normalizada para reproducción', { 
      original: url, 
      normalized: normalizedUrl,
      hasLocalhost: localhostPattern.test(normalizedUrl)
    });

    return normalizedUrl;
  }, [normalizeAudioUrl]);

  /**
   * Iniciar reproducción
   * SOLUCIÓN ALTERNATIVA: Usa AudioRecorderPlayer que puede reproducir directamente desde URLs HTTP
   */
  const startPlayback = useCallback(async () => {
    if (!audioUrl) return;

    try {
      setLoading(true);
      setError(null);
      setIsPlaying(true);
      hapticService.light();

      // Detener reproducción anterior
      await stopPlayback();

      // Obtener URL normalizada (puede ser HTTP o local)
      let playbackUrl = await getPlaybackUrl(audioUrl);

      // Verificación final CRÍTICA antes de reproducir
      const localhostPattern = /localhost|127\.0\.0\.1|10\.0\.2\.2/i;
      if (localhostPattern.test(playbackUrl)) {
        Logger.error('VoicePlayer: ERROR CRÍTICO - playbackUrl aún contiene localhost después de normalización', { 
          originalUrl: audioUrl,
          playbackUrl 
        });
        // Forzar corrección de emergencia con VPS
        const pathMatch = playbackUrl.match(/https?:\/\/[^\/]+(\/.*)?$/);
        const path = pathMatch ? (pathMatch[1] || '') : '';
        const { PRODUCTION_API_BASE_URL } = await import('../../config/apiEndpoints');
        playbackUrl = `${PRODUCTION_API_BASE_URL.replace(/\/$/, '')}${path}`;
        Logger.warn('VoicePlayer: Corrección de emergencia aplicada con VPS', { newPlaybackUrl: playbackUrl });
      }

      Logger.info('VoicePlayer: Iniciando reproducción', { 
        originalUrl: audioUrl, 
        playbackUrl,
        hasLocalhost: localhostPattern.test(playbackUrl)
      });

      // Obtener instancia del player
      const player = getPlayer();

      // Reproducir directamente desde la URL (HTTP o local)
      Logger.info('VoicePlayer: Llamando startPlayer', { playbackUrl, playerType: typeof player });
      
      let msg;
      try {
        msg = await player.startPlayer(playbackUrl);
        Logger.info('VoicePlayer: startPlayer exitoso', { msg });
      } catch (startError) {
        Logger.error('VoicePlayer: Error en startPlayer', { 
          error: startError?.message || String(startError),
          stack: startError?.stack,
          playbackUrl,
          originalUrl: audioUrl,
          hasLocalhost: localhostPattern.test(playbackUrl)
        });
        throw new Error(`Error iniciando reproducción: ${startError?.message || String(startError)}`);
      }

      // Obtener duración si está disponible
      if (msg && msg.duration) {
        setCurrentDuration(Math.floor(msg.duration / 1000));
      } else if (duration) {
        setCurrentDuration(duration);
      }

      // Configurar listener para actualizar posición
      const playbackListener = player.addPlayBackListener((e) => {
        if (e.currentPosition !== undefined) {
          const seconds = Math.floor(e.currentPosition / 1000);
          setCurrentPosition(seconds);
          
          if (e.duration !== undefined && e.duration > 0) {
            const durationSeconds = Math.floor(e.duration / 1000);
            setCurrentDuration(durationSeconds);
          }
        }

        // Verificar si terminó la reproducción
        if (e.currentPosition >= e.duration && e.duration > 0) {
          stopPlayback();
          if (onPlayComplete) {
            onPlayComplete();
          }
        }
      });

      // Actualizar posición periódicamente
      intervalRef.current = setInterval(() => {
        if (playerRef.current && isPlaying) {
          try {
            player.getCurrentTime().then((time) => {
              if (time && time.currentPosition !== undefined) {
                setCurrentPosition(Math.floor(time.currentPosition / 1000));
              }
              if (time && time.duration !== undefined && time.duration > 0) {
                setCurrentDuration(Math.floor(time.duration / 1000));
              }
            }).catch(() => {
              // Ignorar errores de getCurrentTime
            });
          } catch (e) {
            // Ignorar errores
          }
        }
      }, 250);

      setLoading(false);
    } catch (error) {
      Logger.error('VoicePlayer: Error iniciando reproducción', error);
      setError(error.message || 'No se pudo reproducir el audio');
      setLoading(false);
      setIsPlaying(false);
    }
  }, [audioUrl, getPlaybackUrl, getPlayer, stopPlayback, onPlayComplete, isPlaying]);


  /**
   * Alternar reproducción
   */
  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, startPlayback, stopPlayback]);

  /**
   * Formatear tiempo
   */
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.playButton}
        onPress={togglePlayback}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={isOwnMessage ? '#FFFFFF' : '#2196F3'} />
        ) : isPlaying ? (
          <Text style={[styles.playIcon, isOwnMessage && styles.playIconOwn]}>⏸️</Text>
        ) : (
          <Text style={[styles.playIcon, isOwnMessage && styles.playIconOwn]}>▶️</Text>
        )}
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, isOwnMessage && styles.timeTextOwn]}>
            {formatTime(currentPosition || 0)} / {formatTime(currentDuration || duration || 0)}
          </Text>
        </View>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    minWidth: 150,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playIcon: {
    fontSize: 20,
  },
  playIconOwn: {
    color: '#FFFFFF',
  },
  infoContainer: {
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  timeTextOwn: {
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
});

export default VoicePlayer;
