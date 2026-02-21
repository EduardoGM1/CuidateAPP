import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCitaById, updateCitaEstado } from '../../api/citas';
import { message } from 'antd';
import { connect, on, off } from '../../api/socket';
import { PageHeader, DataCard } from '../../components/shared';
import { LoadingSpinner, Button, Card, Badge, Input, Select } from '../../components/ui';
import CompletarCitaWizardModal from '../../components/citas/CompletarCitaWizardModal';
import { useAuthStore } from '../../stores/authStore';
import { STORAGE_KEYS } from '../../utils/constants';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatDateTime } from '../../utils/format';

const ESTADOS_OPCIONES = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'atendida', label: 'Atendida' },
  { value: 'no_asistida', label: 'No asistida' },
  { value: 'reprogramada', label: 'Reprogramada' },
  { value: 'cancelada', label: 'Cancelada' },
];

export default function CitaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isDoctor = useAuthStore((s) => s.isDoctor);
  const [cita, setCita] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [estadoSelected, setEstadoSelected] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [wizardModalOpen, setWizardModalOpen] = useState(false);

  const parsedId = parsePositiveInt(id, 0);
  const canEditCita = isDoctor() || isAdmin();

  const load = useCallback(async () => {
    if (parsedId === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCitaById(parsedId);
      setCita(data);
      setEstadoSelected(data?.estado ?? 'pendiente');
      setObservaciones(data?.observaciones ?? '');
    } catch (err) {
      setError(
        err?.response?.status === 404
          ? 'Cita no encontrada'
          : err?.response?.data?.error || err?.message || 'Error al cargar la cita'
      );
    } finally {
      setLoading(false);
    }
  }, [parsedId]);

  useEffect(() => {
    load();
  }, [load]);

  // Tiempo real: actualizar detalle si esta cita fue actualizada o reprogramada
  const token = useAuthStore((s) => s.token ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null));
  useEffect(() => {
    if (!token || parsedId === 0) return;
    connect(token);
    const refreshIfThisCita = (data) => {
      const idCita = data?.id_cita ?? data?.cita?.id_cita ?? data?.cita?.id;
      if (idCita == null || Number(idCita) === parsedId) load();
    };
    on('cita_actualizada', refreshIfThisCita);
    on('cita_reprogramada', refreshIfThisCita);
    on('solicitud_reprogramacion_procesada', refreshIfThisCita);
    return () => {
      off('cita_actualizada', refreshIfThisCita);
      off('cita_reprogramada', refreshIfThisCita);
      off('solicitud_reprogramacion_procesada', refreshIfThisCita);
    };
  }, [token, parsedId, load]);

  const handleCambiarEstado = async () => {
    if (!estadoSelected || estadoSelected === (cita?.estado ?? '')) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateCitaEstado(parsedId, {
        estado: estadoSelected,
        observaciones: observaciones || undefined,
      });
      setCita((prev) => (prev ? { ...prev, ...updated, estado: estadoSelected, observaciones } : prev));
      message.success('Estado de la cita actualizado');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error al actualizar el estado';
      setSaveError(msg);
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (parsedId === 0) {
    return (
      <div>
        <PageHeader title="Detalle de cita" showBack backTo="/citas" />
        <p style={{ color: 'var(--color-error)' }}>Cita no encontrada.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Detalle de cita" showBack backTo="/citas" />
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error && !cita) {
    return (
      <div>
        <PageHeader title="Detalle de cita" showBack backTo="/citas" />
        <p style={{ color: 'var(--color-error)' }}>{error}</p>
      </div>
    );
  }

  const c = cita;
  const pacienteNombre =
    c.Paciente
      ? [c.Paciente.nombre, c.Paciente.apellido_paterno, c.Paciente.apellido_materno].filter(Boolean).join(' ')
      : c.paciente_nombre ?? '—';
  const doctorNombre =
    c.Doctor
      ? [c.Doctor.nombre, c.Doctor.apellido_paterno, c.Doctor.apellido_materno].filter(Boolean).join(' ')
      : c.doctor_nombre ?? '—';

  const items = [
    { label: 'Fecha y hora', value: formatDateTime(c.fecha_cita) },
    { label: 'Paciente', value: sanitizeForDisplay(pacienteNombre) },
    { label: 'Doctor', value: sanitizeForDisplay(doctorNombre) },
    { label: 'Motivo', value: sanitizeForDisplay(c.motivo) || '—' },
    {
      label: 'Estado actual',
      value: (
        <Badge
          variant={
            c.estado === 'atendida'
              ? 'success'
              : c.estado === 'cancelada' || c.estado === 'no_asistida'
              ? 'error'
              : c.estado === 'reprogramada'
              ? 'warning'
              : 'neutral'
          }
        >
          {ESTADOS_OPCIONES.find((e) => e.value === c.estado)?.label || sanitizeForDisplay(c.estado) || '—'}
        </Badge>
      ),
    },
    { label: 'Observaciones', value: sanitizeForDisplay(c.observaciones) || '—' },
  ];

  return (
    <div>
      <PageHeader title="Detalle de cita" showBack backTo="/citas" />
      <DataCard title="Datos de la cita" items={items} />
      {c.id_paciente && (
        <div
          style={{
            margin: '0.75rem 0 1.25rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/pacientes/${c.id_paciente}`)}
          >
            Ver paciente
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(`/citas?paciente=${c.id_paciente}`)}
          >
            Ver citas del paciente
          </Button>
        </div>
      )}

      {canEditCita && (
        <DataCard title="Cambiar estado">
          {saveError && (
            <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>
              {saveError}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ minWidth: 180 }}>
              <Select
                label="Nuevo estado"
                value={estadoSelected}
                onChange={setEstadoSelected}
                options={ESTADOS_OPCIONES}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div style={{ flex: '1 1 200px', minWidth: 180 }}>
              <Input
                label="Observaciones (opcional)"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value.slice(0, 2000))}
                placeholder="Observaciones"
                maxLength={2000}
                style={{ marginBottom: 0 }}
              />
            </div>
            <Button
              variant="primary"
              type="button"
              disabled={saving || estadoSelected === (c.estado ?? '')}
              onClick={handleCambiarEstado}
            >
              {saving ? 'Guardando…' : 'Actualizar estado'}
            </Button>
          </div>
        </DataCard>
      )}

      {canEditCita && (c.estado === 'pendiente' || c.estado === 'no_asistida') && (
        <Card style={{ marginTop: '1.5rem' }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: 'var(--color-primario)' }}>
            Completar cita (wizard)
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
            Flujo guiado paso a paso con guardado progresivo.
          </p>
          <Button variant="primary" type="button" onClick={() => setWizardModalOpen(true)}>
            Abrir wizard
          </Button>
        </Card>
      )}

      <CompletarCitaWizardModal
        open={wizardModalOpen}
        onClose={() => setWizardModalOpen(false)}
        citaId={parsedId}
        onSuccess={() => { load(); setWizardModalOpen(false); }}
      />
    </div>
  );
}
