import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getAuditoriaById } from '../../api/auditoria';
import { PageHeader, DataCard } from '../../components/shared';
import { LoadingSpinner } from '../../components/ui';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatDateTime } from '../../utils/format';

export default function AuditoriaDetail() {
  const { id } = useParams();
  const [registro, setRegistro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const parsedId = parsePositiveInt(id, 0);

  useEffect(() => {
    if (parsedId === 0) {
      setError('Registro no encontrado');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAuditoriaById(parsedId)
      .then((data) => {
        if (!cancelled) setRegistro(data?.registro ?? data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.response?.status === 404
              ? 'Registro no encontrado'
              : err?.response?.data?.error || err?.message || 'Error al cargar el registro'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [parsedId]);

  if (parsedId === 0) {
    return (
      <div>
        <PageHeader title="Detalle de auditoría" showBack backTo="/admin/auditoria" />
        <p style={{ color: 'var(--color-error)' }}>Registro no encontrado.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Detalle de auditoría" showBack backTo="/admin/auditoria" />
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Detalle de auditoría" showBack backTo="/admin/auditoria" />
        <p style={{ color: 'var(--color-error)' }}>{error}</p>
      </div>
    );
  }

  const r = registro;
  const items = [
    { label: 'Fecha', value: formatDateTime(r.fecha_creacion) },
    { label: 'Tipo de acción', value: sanitizeForDisplay(r.tipo_accion) || '—' },
    { label: 'Entidad afectada', value: sanitizeForDisplay(r.entidad_afectada) || '—' },
    { label: 'Usuario', value: sanitizeForDisplay(r.usuario_nombre ?? r.Usuario?.email) || '—' },
    { label: 'Severidad', value: sanitizeForDisplay(r.severidad) || '—' },
    { label: 'IP', value: sanitizeForDisplay(r.ip_address) || '—' },
    { label: 'Descripción', value: sanitizeForDisplay(r.descripcion) || '—' },
  ];

  return (
    <div>
      <PageHeader title="Detalle de auditoría" showBack backTo="/admin/auditoria" />
      <DataCard title="Registro" items={items} />
    </div>
  );
}
