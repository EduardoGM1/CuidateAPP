import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useCurrentDoctorId } from '../../hooks/useCurrentDoctorId';
import { getPacienteById } from '../../api/pacientes';
import { getConversacion, createMensaje, marcarConversacionLeida, marcarMensajeComoLeido } from '../../api/mensajesChat';
import { useSocketEvent } from '../../contexts/SocketContext';
import { PageHeader } from '../../components/shared';
import { Button, Input, LoadingSpinner, EmptyState } from '../../components/ui';
import { formatDateTime, formatNombreCompleto } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { parsePositiveInt } from '../../utils/params';
import VoiceMessagePlayer from '../../components/chat/VoiceMessagePlayer';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

export default function ChatConversacion() {
  const { id: pacienteIdParam } = useParams();
  const pacienteId = parsePositiveInt(pacienteIdParam, 0);
  const { idDoctor, loading: loadingDoctor, error: errorDoctor } = useCurrentDoctorId();

  const [paciente, setPaciente] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useOnboardingPageReady(
    !loadingDoctor &&
      !errorDoctor &&
      idDoctor != null &&
      pacienteId > 0 &&
      !loading &&
      !error
  );

  const load = useCallback(async () => {
    if (!idDoctor || pacienteId === 0) return;
    setLoading(true);
    setError(null);
    try {
      const [pac, msgs] = await Promise.all([
        getPacienteById(pacienteId).catch(() => null),
        getConversacion(pacienteId, idDoctor),
      ]);
      setPaciente(pac);
      setMensajes(Array.isArray(msgs) ? msgs : []);
      try {
        await marcarConversacionLeida(pacienteId, idDoctor);
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar la conversación');
      setMensajes([]);
    } finally {
      setLoading(false);
    }
  }, [idDoctor, pacienteId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensajes]);

  const matchesConversacion = useCallback(
    (data) => {
      const pid = Number(data?.id_paciente);
      const did = Number(data?.id_doctor);
      return pid === pacienteId && did === idDoctor;
    },
    [pacienteId, idDoctor]
  );

  const onNuevoMensaje = useCallback(
    (data) => {
      if (!matchesConversacion(data) || !data?.mensaje) return;
      const msg = data.mensaje;
      setMensajes((prev) => {
        const exists = prev.some((m) => (m.id_mensaje ?? m.id) === (msg.id_mensaje ?? msg.id));
        if (exists) return prev;
        return [...prev, msg].sort((a, b) => new Date(a.fecha_envio || 0) - new Date(b.fecha_envio || 0));
      });
    },
    [matchesConversacion]
  );

  const onMensajeActualizado = useCallback(
    (data) => {
      if (!matchesConversacion(data)) return;
      const msg = data?.mensaje;
      if (msg && (msg.id_mensaje ?? msg.id)) {
        setMensajes((prev) =>
          prev.map((m) =>
            (m.id_mensaje ?? m.id) === (msg.id_mensaje ?? msg.id)
              ? { ...m, leido: msg.leido ?? true }
              : m
          )
        );
      }
    },
    [matchesConversacion]
  );

  const onMensajesMarcadosLeidos = useCallback(
    (data) => {
      if (!matchesConversacion(data)) return;
      setMensajes((prev) =>
        prev.map((m) =>
          (m.remitente || '').toLowerCase() === 'doctor' ? { ...m, leido: true } : m
        )
      );
    },
    [matchesConversacion]
  );

  useSocketEvent('nuevo_mensaje', onNuevoMensaje, Boolean(idDoctor) && pacienteId > 0);
  useSocketEvent('mensaje_actualizado', onMensajeActualizado, Boolean(idDoctor) && pacienteId > 0);
  useSocketEvent('mensajes_marcados_leidos', onMensajesMarcadosLeidos, Boolean(idDoctor) && pacienteId > 0);

  const sortMensajes = useCallback((list) => {
    return [...list].sort((a, b) => new Date(a.fecha_envio || 0) - new Date(b.fecha_envio || 0));
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    const t = texto?.trim();
    if (!t || !idDoctor || pacienteId === 0 || sending) return;
    setSending(true);
    setTexto('');
    try {
      const created = await createMensaje({
        id_paciente: pacienteId,
        id_doctor: idDoctor,
        remitente: 'Doctor',
        mensaje_texto: t,
      });
      const newMsg = created && typeof created === 'object' ? {
        ...created,
        id_mensaje: created.id_mensaje ?? created.id,
        remitente: 'Doctor',
        mensaje_texto: t,
        fecha_envio: created.fecha_envio || new Date().toISOString(),
      } : null;
      if (newMsg) {
        setMensajes((prev) => {
          const exists = prev.some((m) => (m.id_mensaje ?? m.id) === (newMsg.id_mensaje ?? newMsg.id));
          if (exists) return prev;
          return sortMensajes([...prev, newMsg]);
        });
      } else {
        load();
      }
    } catch (err) {
      setTexto(t);
      setError(err?.response?.data?.error || err?.message || 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  if (loadingDoctor || errorDoctor) {
    return (
      <div>
        <PageHeader title="Chat" showBack backTo="/chat" />
        {errorDoctor ? <p style={{ color: 'var(--color-error)' }}>{errorDoctor}</p> : <LoadingSpinner />}
      </div>
    );
  }

  if (!idDoctor || pacienteId === 0) {
    return (
      <div>
        <PageHeader title="Chat" showBack backTo="/chat" />
        <p style={{ color: 'var(--color-error)' }}>Conversación no válida.</p>
      </div>
    );
  }

  const nombrePaciente = paciente ? (formatNombreCompleto(paciente) || `Paciente #${pacienteId}`) : `Paciente #${pacienteId}`;

  return (
    <div className="chat-conversacion">
      <PageHeader
        title={sanitizeForDisplay(nombrePaciente)}
        showBack
        backTo="/chat"
      />
      {error && (
        <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
          {error}
        </p>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div ref={scrollRef} className="chat-messages">
            {mensajes.length === 0 ? (
              <EmptyState message="No hay mensajes. Escribe uno para iniciar." />
            ) : (
              mensajes.map((m) => {
                const esDoctor = (m.remitente || '').toLowerCase() === 'doctor';
                const leido = m.leido === true;
                const readIcon = esDoctor ? (leido ? '✓✓' : '✓') : null;
                const readColor = esDoctor
                  ? (leido ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)')
                  : (leido ? 'var(--color-primario, #2196F3)' : 'var(--color-texto-secundario, #999)');
                return (
                  <div
                    key={m.id_mensaje ?? m.id ?? `msg-${m.fecha_envio}-${m.mensaje_texto?.slice(0, 8)}`}
                    className={`chat-bubble ${esDoctor ? 'is-own' : ''}`}
                  >
                    {m.mensaje_audio_url ? (
                      <VoiceMessagePlayer
                        audioUrl={m.mensaje_audio_url}
                        durationSeconds={m.mensaje_audio_duracion ? Number(m.mensaje_audio_duracion) : 0}
                        transcription={m.mensaje_audio_transcripcion ? sanitizeForDisplay(m.mensaje_audio_transcripcion) : ''}
                        isOwnMessage={esDoctor}
                        onPlayComplete={
                          !esDoctor && !leido && (m.id_mensaje ?? m.id)
                            ? () => marcarMensajeComoLeido(m.id_mensaje ?? m.id).catch(() => {})
                            : undefined
                        }
                      />
                    ) : (
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {sanitizeForDisplay(m.mensaje_texto) || '[mensaje]'}
                      </p>
                    )}
                    <div className="chat-bubble-footer">
                      <span className="chat-bubble-time">{formatDateTime(m.fecha_envio)}</span>
                      {readIcon != null && (
                        <span className="chat-bubble-read-status" style={{ color: readColor }} aria-label={leido ? 'Visto' : 'Enviado'}>
                          {readIcon}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={handleSend} className="chat-form">
            <div className="chat-input-wrap">
              <Input
                label=""
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (texto?.trim() && !sending) handleSend(e);
                  }
                }}
                placeholder="Escribe un mensaje..."
                maxLength={4000}
              />
            </div>
            <Button type="submit" variant="primary" disabled={sending || !texto?.trim()} className="chat-send-btn">
              {sending ? 'Enviando…' : 'Enviar'}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
