import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCitaById, updateCitaEstado, completarCitaWizard } from '../../api/citas';
import { message } from 'antd';
import { PageHeader, DataCard } from '../../components/shared';
import { LoadingSpinner, Button, Card, Badge, Input, Select, TextArea } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatDateTime } from '../../utils/format';

const WIZARD_STEPS = [
  { id: 'asistencia', label: 'Asistencia' },
  { id: 'signos_vitales', label: 'Signos vitales' },
  { id: 'observaciones', label: 'Observaciones' },
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'plan_medicacion', label: 'Plan de medicación' },
  { id: 'finalizar', label: 'Finalizar' },
];

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

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStepIndex, setWizardStepIndex] = useState(0);
  const [wizardAsistencia, setWizardAsistencia] = useState(true);
  const [wizardMotivoNoAsistencia, setWizardMotivoNoAsistencia] = useState('');
  const [wizardSignos, setWizardSignos] = useState({ peso_kg: '', talla_m: '', presion_sistolica: '', presion_diastolica: '', glucosa_mg_dl: '', observaciones: '' });
  const [wizardObservaciones, setWizardObservaciones] = useState('');
  const [wizardDiagnostico, setWizardDiagnostico] = useState('');
  const [wizardPlanObs, setWizardPlanObs] = useState('');
  const [wizardSaving, setWizardSaving] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [wizardDone, setWizardDone] = useState(false);

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

  const pasoActual = WIZARD_STEPS[wizardStepIndex]?.id ?? 'asistencia';
  const isLastStep = wizardStepIndex >= WIZARD_STEPS.length - 1;

  const handleWizardNext = async (skipCurrent) => {
    setWizardError('');
    setWizardSaving(true);
    try {
      let body = { paso: pasoActual };
      if (pasoActual === 'asistencia') {
        body.asistencia = wizardAsistencia;
        body.motivo_no_asistencia = wizardMotivoNoAsistencia.trim() || undefined;
      } else if (pasoActual === 'signos_vitales' && !skipCurrent) {
        const sv = wizardSignos;
        const signos = {};
        if (sv.peso_kg?.trim()) signos.peso_kg = parseFloat(sv.peso_kg);
        if (sv.talla_m?.trim()) signos.talla_m = parseFloat(sv.talla_m);
        if (sv.presion_sistolica?.trim()) signos.presion_sistolica = parseInt(sv.presion_sistolica, 10);
        if (sv.presion_diastolica?.trim()) signos.presion_diastolica = parseInt(sv.presion_diastolica, 10);
        if (sv.glucosa_mg_dl?.trim()) signos.glucosa_mg_dl = parseFloat(sv.glucosa_mg_dl);
        if (sv.observaciones?.trim()) signos.observaciones = sv.observaciones;
        if (Object.keys(signos).length) body.signos_vitales = signos;
      } else if (pasoActual === 'observaciones') {
        body.observaciones = wizardObservaciones.trim() || '';
      } else if (pasoActual === 'diagnostico' && !skipCurrent && wizardDiagnostico.trim().length >= 10) {
        body.diagnostico = { descripcion: wizardDiagnostico.trim() };
      } else if (pasoActual === 'plan_medicacion' && !skipCurrent && wizardPlanObs.trim()) {
        body.plan_medicacion = { observaciones: wizardPlanObs.trim(), medicamentos: [] };
      } else if (pasoActual === 'finalizar') {
        body = {
          paso: 'finalizar',
          asistencia: wizardAsistencia,
          motivo_no_asistencia: wizardMotivoNoAsistencia.trim() || undefined,
          observaciones: wizardObservaciones.trim() || undefined,
          marcar_como_atendida: true,
        };
        const sv = wizardSignos;
        const signos = {};
        if (sv.peso_kg?.trim()) signos.peso_kg = parseFloat(sv.peso_kg);
        if (sv.talla_m?.trim()) signos.talla_m = parseFloat(sv.talla_m);
        if (sv.presion_sistolica?.trim()) signos.presion_sistolica = parseInt(sv.presion_sistolica, 10);
        if (sv.presion_diastolica?.trim()) signos.presion_diastolica = parseInt(sv.presion_diastolica, 10);
        if (sv.glucosa_mg_dl?.trim()) signos.glucosa_mg_dl = parseFloat(sv.glucosa_mg_dl);
        if (sv.observaciones?.trim()) signos.observaciones = sv.observaciones;
        if (Object.keys(signos).length) body.signos_vitales = signos;
        if (wizardDiagnostico.trim().length >= 10) body.diagnostico = { descripcion: wizardDiagnostico.trim() };
        if (wizardPlanObs.trim()) body.plan_medicacion = { observaciones: wizardPlanObs.trim(), medicamentos: [] };
      }
      await completarCitaWizard(parsedId, body);
      if (isLastStep) {
        setWizardDone(true);
        load();
        message.success('Cita completada correctamente');
      } else {
        setWizardStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error al guardar';
      setWizardError(msg);
      message.error(msg);
    } finally {
      setWizardSaving(false);
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
          {wizardDone ? (
            <p style={{ color: 'var(--color-primario)' }}>Cita completada correctamente. Estado actualizado.</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {WIZARD_STEPS.map((step, i) => (
                  <span
                    key={step.id}
                    style={{
                      padding: '0.35rem 0.6rem',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.85rem',
                      backgroundColor: i === wizardStepIndex ? 'var(--color-primario)' : 'var(--color-borde-claro)',
                      color: i === wizardStepIndex ? '#fff' : 'var(--color-texto-secundario)',
                    }}
                  >
                    {step.label}
                  </span>
                ))}
              </div>
              {wizardError && <p style={{ color: 'var(--color-error)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{wizardError}</p>}
              {pasoActual === 'asistencia' && (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="radio" checked={wizardAsistencia} onChange={() => setWizardAsistencia(true)} /> Asistió
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="radio" checked={!wizardAsistencia} onChange={() => setWizardAsistencia(false)} /> No asistió
                  </label>
                  {!wizardAsistencia && (
                    <Input placeholder="Motivo de no asistencia" value={wizardMotivoNoAsistencia} onChange={(e) => setWizardMotivoNoAsistencia(e.target.value.slice(0, 500))} maxLength={500} style={{ marginTop: '0.25rem' }} />
                  )}
                </div>
              )}
              {pasoActual === 'signos_vitales' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Input type="number" placeholder="Peso (kg)" value={wizardSignos.peso_kg} onChange={(e) => setWizardSignos((s) => ({ ...s, peso_kg: e.target.value }))} style={{ marginBottom: 0 }} />
                  <Input type="number" placeholder="Talla (m)" value={wizardSignos.talla_m} onChange={(e) => setWizardSignos((s) => ({ ...s, talla_m: e.target.value }))} style={{ marginBottom: 0 }} />
                  <Input type="number" placeholder="PA sist." value={wizardSignos.presion_sistolica} onChange={(e) => setWizardSignos((s) => ({ ...s, presion_sistolica: e.target.value }))} style={{ marginBottom: 0 }} />
                  <Input type="number" placeholder="PA diast." value={wizardSignos.presion_diastolica} onChange={(e) => setWizardSignos((s) => ({ ...s, presion_diastolica: e.target.value }))} style={{ marginBottom: 0 }} />
                  <Input type="number" placeholder="Glucosa" value={wizardSignos.glucosa_mg_dl} onChange={(e) => setWizardSignos((s) => ({ ...s, glucosa_mg_dl: e.target.value }))} style={{ marginBottom: 0 }} />
                  <Input placeholder="Observaciones" value={wizardSignos.observaciones} onChange={(e) => setWizardSignos((s) => ({ ...s, observaciones: e.target.value }))} style={{ marginBottom: 0, gridColumn: '1 / -1' }} />
                </div>
              )}
              {pasoActual === 'observaciones' && (
                <TextArea placeholder="Observaciones de la consulta" value={wizardObservaciones} onChange={(e) => setWizardObservaciones(e.target.value.slice(0, 2000))} rows={3} maxLength={2000} style={{ marginBottom: '1rem' }} />
              )}
              {pasoActual === 'diagnostico' && (
                <TextArea placeholder="Descripción del diagnóstico (mín. 10 caracteres)" value={wizardDiagnostico} onChange={(e) => setWizardDiagnostico(e.target.value)} rows={3} style={{ marginBottom: '1rem' }} />
              )}
              {pasoActual === 'plan_medicacion' && (
                <TextArea placeholder="Observaciones del plan de medicación (opcional)" value={wizardPlanObs} onChange={(e) => setWizardPlanObs(e.target.value)} rows={2} style={{ marginBottom: '1rem' }} />
              )}
              {pasoActual === 'finalizar' && (
                <p style={{ marginBottom: '1rem', color: 'var(--color-texto-secundario)' }}>Al guardar se marcará la cita como atendida con los datos ingresados.</p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button variant="primary" onClick={() => handleWizardNext(false)} disabled={wizardSaving}>
                  {wizardSaving ? 'Guardando…' : isLastStep ? 'Completar cita' : 'Siguiente'}
                </Button>
                {!isLastStep && pasoActual !== 'asistencia' && (
                  <Button variant="secondary" onClick={() => handleWizardNext(true)} disabled={wizardSaving}>Omitir</Button>
                )}
                {wizardStepIndex > 0 && (
                  <Button variant="secondary" onClick={() => setWizardStepIndex((i) => Math.max(0, i - 1))} disabled={wizardSaving}>Atrás</Button>
                )}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
