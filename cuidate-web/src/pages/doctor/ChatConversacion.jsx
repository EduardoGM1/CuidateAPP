import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCurrentDoctorId } from '../../hooks/useCurrentDoctorId';
import { getPacienteById } from '../../api/pacientes';
import { getConversacion, createMensaje, marcarConversacionLeida } from '../../api/mensajesChat';
import { PageHeader } from '../../components/shared';
import { Button, Input, LoadingSpinner, EmptyState } from '../../components/ui';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { parsePositiveInt } from '../../utils/params';

export default function ChatConversacion() {
  const { id: pacienteIdParam } = useParams();
  const navigate = useNavigate();
  const pacienteId = parsePositiveInt(pacienteIdParam, 0);
  const { idDoctor, loading: loadingDoctor, error: errorDoctor } = useCurrentDoctorId();

  const [paciente, setPaciente] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [texto, setTexto] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

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

  const handleSend = async (e) => {
    e.preventDefault();
    const t = texto?.trim();
    if (!t || !idDoctor || pacienteId === 0 || sending) return;
    setSending(true);
    setTexto('');
    try {
      await createMensaje({
        id_paciente: pacienteId,
        id_doctor: idDoctor,
        remitente: 'Doctor',
        mensaje_texto: t,
      });
      load();
    } catch (err) {
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

  const nombrePaciente = paciente
    ? [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno].filter(Boolean).join(' ')
    : `Paciente #${pacienteId}`;

  return (
    <div>
      <PageHeader
        title={sanitizeForDisplay(nombrePaciente)}
        showBack
        backTo="/chat"
      />
      {error && <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error}</p>}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div
            ref={scrollRef}
            style={{
              maxHeight: '60vh',
              overflowY: 'auto',
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: 'var(--color-fondo-card)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-borde-claro)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {mensajes.length === 0 ? (
              <EmptyState message="No hay mensajes. Escribe uno para iniciar." />
            ) : (
              mensajes.map((m) => {
                const esDoctor = (m.remitente || '').toLowerCase() === 'doctor';
                return (
                  <div
                    key={m.id_mensaje ?? m.id}
                    style={{
                      alignSelf: esDoctor ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius)',
                      backgroundColor: esDoctor ? 'var(--color-primario)' : 'var(--color-fondo-card)',
                      color: esDoctor ? 'var(--color-texto-en-primario)' : 'var(--color-texto-primario)',
                      border: `1px solid ${esDoctor ? 'transparent' : 'var(--color-borde-claro)'}`,
                    }}
                  >
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {sanitizeForDisplay(m.mensaje_texto || m.mensaje_audio_transcripcion) || '[mensaje]'}
                    </p>
                    <span style={{ fontSize: '0.75rem', opacity: 0.9, display: 'block', marginTop: '0.25rem' }}>
                      {formatDateTime(m.fecha_envio)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <Input
              label=""
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe un mensaje..."
              maxLength={4000}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <Button type="submit" variant="primary" disabled={sending || !texto?.trim()}>
              {sending ? 'Enviando…' : 'Enviar'}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
