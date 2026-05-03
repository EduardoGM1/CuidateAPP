import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCitaById, updateCitaEstado, updateCita, completarCitaWizard } from '../../api/citas';
import { message } from 'antd';
import { connect, on, off } from '../../api/socket';
import { PageHeader, DataCard } from '../../components/shared';
import { LoadingSpinner, Button, Card, Badge, Input, Select, Modal } from '../../components/ui';
import CompletarCitaModal from '../../components/citas/CompletarCitaModal';
import CitaConsultaResumen from '../../components/citas/CitaConsultaResumen';
import SignosVitalesForm, { INITIAL_SIGNOS_VITALES, signosVitalesToPayload } from '../../components/signos/SignosVitalesForm';
import { useAuthStore } from '../../stores/authStore';
import { STORAGE_KEYS } from '../../utils/constants';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatDateTime, formatNombreCompleto } from '../../utils/format';
import { fechaCitaDatetimeLocalToApi, fechaCitaApiToDatetimeLocalInput } from '../../utils/fechaCita';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

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
  const [soloSignosOpen, setSoloSignosOpen] = useState(false);
  const [soloSignosForm, setSoloSignosForm] = useState(INITIAL_SIGNOS_VITALES);
  const [soloSignosSaving, setSoloSignosSaving] = useState(false);
  const [soloSignosError, setSoloSignosError] = useState('');
  const [reprogramarOpen, setReprogramarOpen] = useState(false);
  const [reprogramarFecha, setReprogramarFecha] = useState('');
  const [reprogramarMotivo, setReprogramarMotivo] = useState('');
  const [reprogramarSaving, setReprogramarSaving] = useState(false);

  const parsedId = parsePositiveInt(id, 0);
  const canEditCita = isDoctor() || isAdmin();

  useOnboardingPageReady(parsedId > 0 && !loading && !!cita && !error);

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

  const fechaNacimientoPaciente = cita?.Paciente?.fecha_nacimiento ?? cita?.paciente?.fecha_nacimiento ?? cita?.fecha_nacimiento ?? null;

  const handleSoloSignosVitales = async () => {
    const payload = signosVitalesToPayload(soloSignosForm, fechaNacimientoPaciente);
    setSoloSignosError('');
    setSoloSignosSaving(true);
    try {
      await completarCitaWizard(parsedId, { paso: 'signos_vitales', signos_vitales: payload });
      message.success('Signos vitales registrados');
      setSoloSignosForm(INITIAL_SIGNOS_VITALES);
      setSoloSignosOpen(false);
      load();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error al guardar';
      setSoloSignosError(msg);
      message.error(msg);
    } finally {
      setSoloSignosSaving(false);
    }
  };

  const handleReprogramar = async () => {
    if (!reprogramarFecha?.trim()) {
      message.warning('Indica la nueva fecha y hora');
      return;
    }
    setReprogramarSaving(true);
    try {
      const fechaLocal = reprogramarFecha.length <= 10 ? `${reprogramarFecha}T12:00:00` : reprogramarFecha;
      await updateCita(parsedId, { fecha_cita: fechaCitaDatetimeLocalToApi(fechaLocal), motivo_reprogramacion: reprogramarMotivo?.trim() || undefined });
      message.success('Cita reprogramada');
      setReprogramarOpen(false);
      setReprogramarFecha('');
      setReprogramarMotivo('');
      load();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al reprogramar');
    } finally {
      setReprogramarSaving(false);
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
  /** Cita cerrada: no reprogramar ni cambiar estado desde esta pantalla. */
  const citaCerradaParaAcciones = ['atendida', 'cancelada'].includes(String(c.estado ?? '').toLowerCase());
  const pacienteNombre = c.Paciente ? (formatNombreCompleto(c.Paciente) || c.paciente_nombre) : c.paciente_nombre ?? '—';
  const doctorNombre = c.Doctor ? (formatNombreCompleto(c.Doctor) || c.doctor_nombre) : c.doctor_nombre ?? '—';

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

      {c.estado === 'atendida' && <CitaConsultaResumen cita={c} />}

      {canEditCita && !citaCerradaParaAcciones && (
        <DataCard title="Cambiar estado">
          {saveError && (
            <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>
              {saveError}
            </p>
          )}
          <div className="form-row-inline">
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
            Registrar datos de la cita
          </h2>
          <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
            Flujo guiado paso a paso con guardado progresivo.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <Button variant="primary" type="button" onClick={() => setWizardModalOpen(true)}>
              Registrar datos de la cita
            </Button>
            <Button variant="outline" type="button" onClick={() => { setSoloSignosError(''); setSoloSignosForm(INITIAL_SIGNOS_VITALES); setSoloSignosOpen(true); }}>
              Solo Agregar Signos Vitales
            </Button>
          </div>
        </Card>
      )}

      {canEditCita && !citaCerradaParaAcciones && (
        <Card style={{ marginTop: '1rem' }}>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setReprogramarFecha(cita?.fecha_cita ? fechaCitaApiToDatetimeLocalInput(cita.fecha_cita) : '');
              setReprogramarMotivo('');
              setReprogramarOpen(true);
            }}
          >
            Reprogramar cita
          </Button>
        </Card>
      )}

      <Modal open={reprogramarOpen} onClose={() => { if (!reprogramarSaving) { setReprogramarOpen(false); setReprogramarFecha(''); setReprogramarMotivo(''); } }} title="Reprogramar cita" footer={null} width={420}>
        <Input label="Nueva fecha y hora" type="datetime-local" value={reprogramarFecha} onChange={(e) => setReprogramarFecha(e.target.value)} />
        <Input label="Motivo (opcional)" value={reprogramarMotivo} onChange={(e) => setReprogramarMotivo(e.target.value)} placeholder="Ej: Cambio de horario..." />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <Button variant="primary" onClick={handleReprogramar} disabled={reprogramarSaving || !reprogramarFecha?.trim()}>
            {reprogramarSaving ? 'Reprogramando…' : 'Reprogramar'}
          </Button>
          <Button variant="outline" onClick={() => { setReprogramarOpen(false); setReprogramarFecha(''); setReprogramarMotivo(''); }}>Cancelar</Button>
        </div>
      </Modal>

      <CompletarCitaModal
        open={wizardModalOpen}
        onClose={() => setWizardModalOpen(false)}
        citaId={parsedId}
        cita={cita}
        onSuccess={() => { load(); setWizardModalOpen(false); }}
      />

      <Modal
        open={soloSignosOpen}
        onClose={() => { if (!soloSignosSaving) setSoloSignosOpen(false); }}
        title="Solo Agregar Signos Vitales"
        footer={null}
        width={720}
      >
        {soloSignosError && (
          <p style={{ color: 'var(--color-error)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{soloSignosError}</p>
        )}
        <SignosVitalesForm
          value={soloSignosForm}
          onChange={setSoloSignosForm}
          showImc
          fechaNacimientoPaciente={fechaNacimientoPaciente}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <Button variant="primary" onClick={handleSoloSignosVitales} disabled={soloSignosSaving}>
            {soloSignosSaving ? 'Guardando…' : 'Guardar signos vitales'}
          </Button>
          <Button variant="outline" onClick={() => setSoloSignosOpen(false)}>Cancelar</Button>
        </div>
      </Modal>
    </div>
  );
}
