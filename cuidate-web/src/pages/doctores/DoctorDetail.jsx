import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDoctorById, deleteDoctor } from '../../api/doctores';
import { PageHeader, DataCard } from '../../components/shared';
import { LoadingSpinner, Button } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const parsedId = parsePositiveInt(id, 0);
  const isAdmin = useAuthStore((s) => s.isAdmin());

  const load = useCallback(async () => {
    if (parsedId === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDoctorById(parsedId);
      setDoctor(data);
    } catch (err) {
      setError(err?.response?.status === 404
        ? 'Doctor no encontrado'
        : err?.response?.data?.error || err?.message || 'Error al cargar el doctor');
    } finally {
      setLoading(false);
    }
  }, [parsedId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!confirmDelete || parsedId === 0) return;
    setDeleting(true);
    try {
      await deleteDoctor(parsedId);
      navigate('/doctores', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (parsedId === 0) {
    return (
      <div>
        <PageHeader title="Detalle de doctor" showBack backTo="/doctores" />
        <p style={{ color: 'var(--color-error)' }}>Doctor no encontrado.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Detalle de doctor" showBack backTo="/doctores" />
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error && !doctor) {
    return (
      <div>
        <PageHeader title="Detalle de doctor" showBack backTo="/doctores" />
        <p style={{ color: 'var(--color-error)' }}>{error}</p>
      </div>
    );
  }

  const d = doctor;
  const nombreCompleto = [d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' ') || '—';

  const items = [
    { label: 'Nombre', value: sanitizeForDisplay(nombreCompleto) },
    { label: 'Email', value: sanitizeForDisplay(d.email) || '—' },
    { label: 'Módulo', value: sanitizeForDisplay(d.modulo_nombre) || '—' },
    { label: 'Teléfono', value: sanitizeForDisplay(d.telefono) || '—' },
    { label: 'Pacientes asignados', value: d.pacientes_asignados != null ? String(d.pacientes_asignados) : '—' },
    { label: 'Estado', value: d.activo ? 'Activo' : 'Inactivo' },
  ];

  return (
    <div>
      <PageHeader title="Detalle de doctor" showBack backTo="/doctores" />
      <DataCard title="Datos del doctor" items={items} />
      {isAdmin && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
        <Button variant="primary" type="button" onClick={() => navigate(`/doctores/${parsedId}/editar`)}>
          Editar
        </Button>
        {!confirmDelete ? (
          <Button variant="danger" type="button" onClick={() => setConfirmDelete(true)} disabled={deleting}>
            Eliminar
          </Button>
        ) : (
          <>
            <span style={{ color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>¿Eliminar este doctor?</span>
            <Button variant="danger" type="button" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
            <Button variant="outline" type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancelar
            </Button>
          </>
        )}
      </div>
      )}
    </div>
  );
}
