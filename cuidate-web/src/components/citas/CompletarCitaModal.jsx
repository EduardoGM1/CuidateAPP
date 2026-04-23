import { useState, useEffect } from 'react';
import { completarCitaWizard } from '../../api/citas';
import { message } from 'antd';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import SignosVitalesForm, { INITIAL_SIGNOS_VITALES, signosVitalesToPayload } from '../signos/SignosVitalesForm';

const WIZARD_STEPS = [
  { id: 'asistencia', label: 'Asistencia' },
  { id: 'signos_vitales', label: 'Signos vitales' },
  { id: 'observaciones', label: 'Observaciones' },
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'plan_medicacion', label: 'Plan de medicación' },
  { id: 'finalizar', label: 'Finalizar' },
];

/** Convierte un registro SignoVital de la API al objeto del formulario (todos string). */
function signoVitalToForm(signo) {
  if (!signo || typeof signo !== 'object') return INITIAL_SIGNOS_VITALES;
  const v = (val) => (val != null && val !== '') ? String(val).trim() : '';
  return {
    peso_kg: v(signo.peso_kg),
    talla_m: v(signo.talla_m),
    medida_cintura_cm: v(signo.medida_cintura_cm),
    presion_sistolica: v(signo.presion_sistolica),
    presion_diastolica: v(signo.presion_diastolica),
    glucosa_mg_dl: v(signo.glucosa_mg_dl),
    colesterol_mg_dl: v(signo.colesterol_mg_dl),
    colesterol_ldl: v(signo.colesterol_ldl),
    colesterol_hdl: v(signo.colesterol_hdl),
    trigliceridos_mg_dl: v(signo.trigliceridos_mg_dl),
    hba1c_porcentaje: v(signo.hba1c_porcentaje),
    edad_paciente_en_medicion: v(signo.edad_paciente_en_medicion),
    observaciones: v(signo.observaciones),
  };
}

/**
 * Modal para completar una cita (flujo paso a paso).
 * Pasos: asistencia → signos vitales → observaciones → diagnóstico → plan medicación → finalizar.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {number|string} citaId - ID de la cita a completar
 * @param {() => void} [onSuccess] - Llamado al completar correctamente el último paso
 * @param {object} [cita] - Cita (opcional) para obtener fecha_nacimiento del paciente y calcular edad en signos vitales
 */
export default function CompletarCitaModal({ open, onClose, citaId, onSuccess, cita }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [asistencia, setAsistencia] = useState(true);
  const [motivoNoAsistencia, setMotivoNoAsistencia] = useState('');
  const [signos, setSignos] = useState(INITIAL_SIGNOS_VITALES);
  const [observaciones, setObservaciones] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [planObs, setPlanObs] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const pasoActual = WIZARD_STEPS[stepIndex]?.id ?? 'asistencia';
  const isLastStep = stepIndex >= WIZARD_STEPS.length - 1;

  const fechaNacimientoPaciente = cita?.Paciente?.fecha_nacimiento ?? cita?.paciente?.fecha_nacimiento ?? cita?.fecha_nacimiento ?? null;

  useEffect(() => {
    if (open) {
      setStepIndex(0);
      setError('');
      setDone(false);

      if (cita && typeof cita === 'object') {
        setAsistencia(cita.estado !== 'no_asistida');
        setMotivoNoAsistencia(cita.motivo_no_asistencia ?? '');
        setObservaciones(cita.observaciones ?? '');
        setDiagnostico(
          Array.isArray(cita.Diagnosticos) && cita.Diagnosticos.length > 0
            ? cita.Diagnosticos.map((d) => (d.descripcion ?? '').trim()).filter(Boolean).join('\n') || ''
            : ''
        );
        const planes = (Array.isArray(cita.PlanMedicacions) && cita.PlanMedicacions.length > 0)
          ? cita.PlanMedicacions
          : (cita.PlanMedicacion ? [cita.PlanMedicacion] : cita.plan_medicacion ? [cita.plan_medicacion] : []);
        const plan = planes.length > 0 ? planes[0] : null;
        setPlanObs(plan?.observaciones ?? '');

        if (Array.isArray(cita.SignosVitales) && cita.SignosVitales.length > 0) {
          const ultimo = cita.SignosVitales.length === 1
            ? cita.SignosVitales[0]
            : [...cita.SignosVitales].sort((a, b) => {
                const da = a.fecha_medicion || a.createdAt || a.created_at || '';
                const db = b.fecha_medicion || b.createdAt || b.created_at || '';
                return String(db).localeCompare(String(da));
              })[0];
          setSignos(signoVitalToForm(ultimo));
        } else {
          setSignos(INITIAL_SIGNOS_VITALES);
        }
      } else {
        setAsistencia(true);
        setMotivoNoAsistencia('');
        setSignos(INITIAL_SIGNOS_VITALES);
        setObservaciones('');
        setDiagnostico('');
        setPlanObs('');
      }
    }
  }, [open, cita]);

  const handleNext = async (skipCurrent) => {
    if (!citaId) return;
    setError('');
    setSaving(true);
    try {
      let body = { paso: pasoActual };
      if (pasoActual === 'asistencia') {
        body.asistencia = asistencia;
        body.motivo_no_asistencia = motivoNoAsistencia.trim() || undefined;
      } else if (pasoActual === 'signos_vitales' && !skipCurrent) {
        const signosObj = signosVitalesToPayload(signos, fechaNacimientoPaciente);
        body.signos_vitales = signosObj;
      } else if (pasoActual === 'observaciones') {
        body.observaciones = observaciones.trim() || '';
      } else if (pasoActual === 'diagnostico' && !skipCurrent && diagnostico.trim().length >= 10) {
        body.diagnostico = { descripcion: diagnostico.trim() };
      } else if (pasoActual === 'plan_medicacion' && !skipCurrent && planObs.trim()) {
        body.plan_medicacion = { observaciones: planObs.trim(), medicamentos: [] };
      } else if (pasoActual === 'finalizar') {
        body = {
          paso: 'finalizar',
          asistencia,
          motivo_no_asistencia: motivoNoAsistencia.trim() || undefined,
          observaciones: observaciones.trim() || undefined,
          marcar_como_atendida: true,
        };
        const signosObj = signosVitalesToPayload(signos, fechaNacimientoPaciente);
        body.signos_vitales = signosObj;
        if (diagnostico.trim().length >= 10) body.diagnostico = { descripcion: diagnostico.trim() };
        if (planObs.trim()) body.plan_medicacion = { observaciones: planObs.trim(), medicamentos: [] };
      }
      await completarCitaWizard(citaId, body);
      if (isLastStep) {
        setDone(true);
        message.success('Cita completada correctamente');
        onSuccess?.();
        if (typeof onClose === 'function') onClose();
      } else {
        setStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error al guardar';
      setError(msg);
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const canClose = !saving;
  const id = Number(citaId);

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={canClose ? onClose : undefined}
      title="Registrar datos de la cita"
      footer={null}
      width={560}
      destroyOnClose
    >
      {!id ? (
        <p style={{ color: 'var(--color-texto-secundario)' }}>No se especificó la cita.</p>
      ) : (
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
            Flujo guiado paso a paso con guardado progresivo.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {WIZARD_STEPS.map((step, i) => (
              <span
                key={step.id}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.85rem',
                  backgroundColor: i === stepIndex ? 'var(--color-primario)' : 'var(--color-borde-claro)',
                  color: i === stepIndex ? '#fff' : 'var(--color-texto-secundario)',
                }}
              >
                {step.label}
              </span>
            ))}
          </div>
          {error && (
            <p style={{ color: 'var(--color-error)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>{error}</p>
          )}

          {pasoActual === 'asistencia' && (
            <div style={{ marginBottom: '1rem', color: 'var(--color-texto-primario)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-texto-primario)', cursor: 'pointer' }}>
                <input type="radio" checked={asistencia} onChange={() => setAsistencia(true)} /> Asistió
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-texto-primario)', cursor: 'pointer' }}>
                <input type="radio" checked={!asistencia} onChange={() => setAsistencia(false)} /> No asistió
              </label>
              {!asistencia && (
                <Input
                  placeholder="Motivo de no asistencia"
                  value={motivoNoAsistencia}
                  onChange={(e) => setMotivoNoAsistencia(e.target.value.slice(0, 500))}
                  maxLength={500}
                  style={{ marginTop: '0.25rem' }}
                />
              )}
            </div>
          )}
          {pasoActual === 'signos_vitales' && (
            <SignosVitalesForm
              value={signos}
              onChange={setSignos}
              showImc
              fechaNacimientoPaciente={fechaNacimientoPaciente}
            />
          )}
          {pasoActual === 'observaciones' && (
            <TextArea
              placeholder="Observaciones de la consulta"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value.slice(0, 2000))}
              rows={3}
              maxLength={2000}
              style={{ marginBottom: '1rem' }}
            />
          )}
          {pasoActual === 'diagnostico' && (
            <TextArea
              placeholder="Descripción del diagnóstico (mín. 10 caracteres)"
              value={diagnostico}
              onChange={(e) => setDiagnostico(e.target.value)}
              rows={3}
              style={{ marginBottom: '1rem' }}
            />
          )}
          {pasoActual === 'plan_medicacion' && (
            <TextArea
              placeholder="Observaciones del plan de medicación (opcional)"
              value={planObs}
              onChange={(e) => setPlanObs(e.target.value)}
              rows={2}
              style={{ marginBottom: '1rem' }}
            />
          )}
          {pasoActual === 'finalizar' && (
            <p style={{ marginBottom: '1rem', color: 'var(--color-texto-secundario)' }}>
              Al guardar se marcará la cita como atendida con los datos ingresados.
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Button
              variant="primary"
              onClick={() => handleNext(false)}
              disabled={saving}
            >
              {saving ? 'Guardando…' : isLastStep ? 'Completar cita' : 'Siguiente'}
            </Button>
            {!isLastStep && pasoActual !== 'asistencia' && (
              <Button variant="secondary" onClick={() => handleNext(true)} disabled={saving}>
                Omitir
              </Button>
            )}
            {stepIndex > 0 && (
              <Button
                variant="secondary"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={saving}
              >
                Atrás
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
