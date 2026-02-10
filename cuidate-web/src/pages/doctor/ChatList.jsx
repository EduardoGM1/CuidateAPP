import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentDoctorId } from '../../hooks/useCurrentDoctorId';
import { getConversacionesDoctor } from '../../api/mensajesChat';
import { PageHeader } from '../../components/shared';
import { Card, LoadingSpinner, EmptyState, Badge } from '../../components/ui';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';

export default function ChatList() {
  const navigate = useNavigate();
  const { idDoctor, loading: loadingDoctor, error: errorDoctor } = useCurrentDoctorId();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!idDoctor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getConversacionesDoctor(idDoctor);
      setList(res.conversaciones ?? []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar conversaciones');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [idDoctor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = (conv) => {
    const pid = conv.id_paciente ?? conv.paciente_id;
    if (pid) navigate(`/chat/${pid}`);
  };

  if (loadingDoctor || errorDoctor) {
    return (
      <div>
        <PageHeader title="Chat" showBack backTo="/" />
        {errorDoctor ? <p style={{ color: 'var(--color-error)' }}>{errorDoctor}</p> : <LoadingSpinner />}
      </div>
    );
  }

  if (!idDoctor) {
    return (
      <div>
        <PageHeader title="Chat" showBack backTo="/" />
        <p style={{ color: 'var(--color-texto-secundario)' }}>Solo los doctores pueden acceder al chat.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Conversaciones" showBack backTo="/" />
      {error && (
        <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>
          {error} <button type="button" onClick={load} style={{ marginLeft: '0.5rem', textDecoration: 'underline' }}>Reintentar</button>
        </p>
      )}
      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <EmptyState message="No hay conversaciones. Los mensajes aparecerán cuando un paciente te escriba." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {list.map((c) => {
            const pid = c.id_paciente ?? c.paciente_id;
            const nombre = (c.paciente?.nombre_completo ?? c.paciente_nombre ?? [c.nombre, c.apellido_paterno, c.apellido_materno].filter(Boolean).join(' ')) || 'Paciente';
            const preview = c.ultimo_mensaje?.preview ?? c.preview_mensaje;
            const fecha = c.ultimo_mensaje?.fecha_envio ?? c.ultima_fecha ?? c.ultimo_mensaje_fecha;
            return (
              <Card
                key={pid}
                style={{ cursor: 'pointer', marginBottom: 0 }}
                onClick={() => handleSelect(c)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <strong>{sanitizeForDisplay(nombre)}</strong>
                    {(c.mensajes_no_leidos ?? 0) > 0 && (
                      <Badge variant="primary" style={{ marginLeft: '0.5rem' }}>{c.mensajes_no_leidos}</Badge>
                    )}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
                    {fecha ? formatDateTime(fecha) : ''}
                  </span>
                </div>
                {preview && (
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: 'var(--color-texto-secundario)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sanitizeForDisplay(preview)}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
