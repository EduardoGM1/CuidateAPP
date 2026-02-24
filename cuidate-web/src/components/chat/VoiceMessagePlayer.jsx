import { useState, useRef, useEffect, useCallback } from 'react';
import { getAudioFullUrl } from '../../utils/audioUrl';

const EVENT_PLAY_STARTED = 'voice-message-play-started';

/**
 * Reproductor de mensajes de voz para la web.
 * Usa HTML5 Audio; un solo audio activo a la vez (escucha evento global).
 *
 * @param {string} audioUrl - URL del audio (relativa o absoluta)
 * @param {number} durationSeconds - Duración en segundos (opcional, para mostrar hasta que el audio cargue)
 * @param {string} transcription - Transcripción opcional (se muestra debajo)
 * @param {boolean} isOwnMessage - Si el mensaje es del usuario actual (estilo)
 */
export default function VoiceMessagePlayer({
  audioUrl,
  durationSeconds = 0,
  transcription = '',
  isOwnMessage = false,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  const fullUrl = getAudioFullUrl(audioUrl);

  const formatTime = (seconds) => {
    const s = Math.floor(Number(seconds) || 0);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback(() => {
    if (!fullUrl || !audioRef.current) return;
    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      return;
    }

    // Un solo audio a la vez: notificar a otros reproductores
    window.dispatchEvent(new CustomEvent(EVENT_PLAY_STARTED, { detail: { source: audio } }));

    setLoading(true);
    setError(null);
    audio.play().catch((err) => {
      setError(err?.message || 'No se pudo reproducir');
      setLoading(false);
    });
  }, [fullUrl, isPlaying]);

  // Pausar si otro reproductor empieza
  useEffect(() => {
    const handler = (e) => {
      if (audioRef.current && e.detail?.source !== audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener(EVENT_PLAY_STARTED, handler);
    return () => window.removeEventListener(EVENT_PLAY_STARTED, handler);
  }, []);

  // Eventos del elemento <audio>
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      setIsPlaying(true);
      setLoading(false);
    };
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setError('Formato no soportado o URL no accesible');
      setLoading(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [fullUrl]);

  if (!fullUrl) return null;

  const displayDuration = duration > 0 ? duration : durationSeconds;
  const progress = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;

  return (
    <div
      className="voice-message-player"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        minWidth: '180px',
        padding: '0.25rem 0',
      }}
      role="region"
      aria-label="Reproducir mensaje de voz"
    >
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous">
        <source src={fullUrl} type={fullUrl.toLowerCase().endsWith('.m4a') ? 'audio/mp4' : undefined} />
      </audio>
      <button
        type="button"
        onClick={handlePlayPause}
        disabled={loading}
        aria-label={isPlaying ? 'Pausar' : 'Reproducir mensaje de voz'}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: 'none',
          background: isOwnMessage ? 'rgba(255,255,255,0.3)' : 'var(--color-borde-claro, #e0e0e0)',
          color: isOwnMessage ? 'inherit' : 'var(--color-texto-primario, #333)',
          cursor: loading ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '1rem',
        }}
      >
        {loading ? (
          <span aria-hidden>⏳</span>
        ) : isPlaying ? (
          <span aria-hidden>⏸</span>
        ) : (
          <span aria-hidden>▶</span>
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            height: '6px',
            borderRadius: 3,
            background: isOwnMessage ? 'rgba(255,255,255,0.3)' : 'var(--color-borde-claro, #e0e0e0)',
            overflow: 'hidden',
            marginBottom: '2px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: isOwnMessage ? 'rgba(255,255,255,0.9)' : 'var(--color-primario, #2196F3)',
              transition: 'width 0.15s ease',
            }}
          />
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            opacity: 0.9,
          }}
        >
          {formatTime(currentTime)} / {formatTime(displayDuration)}
        </span>
      </div>
      {error && (
        <span style={{ fontSize: '0.75rem', color: 'var(--color-error, #c62828)' }}>{error}</span>
      )}
      {transcription && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {transcription}
        </p>
      )}
    </div>
  );
}
