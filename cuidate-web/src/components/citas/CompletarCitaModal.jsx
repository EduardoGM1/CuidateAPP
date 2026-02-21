import { useState, useEffect } from 'react';
import { completarCitaWizard } from '../../api/citas';
import { message } from 'antd';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';

const WIZARD_STEPS = [
  { id: 'asistencia', label: 'Asistencia' },
  { id: 'signos_vitales', label: 'Signos vitales' },
  { id: 'observaciones', label: 'Observaciones' },
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'plan_medicacion', label: 'Plan de medicación' },
  { id: 'finalizar', label: 'Finalizar' },
];

const initialSignos = {
  peso_kg: '',
  talla_m: '',
  presion_sistolica: '',
  presion_diastolica: '',
  glucosa_mg_dl: '',
  observaciones: '',
};

/**
 * Modal para completar una cita (flujo paso a paso).
 * Pasos: asistencia → signos vitales → observaciones → diagnóstico → plan medicación → finalizar.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {number|string} citaId - ID de la cita a completar
 * @param {() => void} [onSuccess] - Llamado al completar correctamente el último paso
 */
export default function CompletarCitaModal({ open, onClose, citaId, onSuccess }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [asistencia, setAsistencia] = useState(true);
  const [motivoNoAsistencia, setMotivoNoAsistencia] = useState('');
  const [signos, setSignos] = useState(initialSignos);
  const [observaciones, setObservaciones] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [planObs, setPlanObs] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const pasoActual = WIZARD_STEPS[stepIndex]?.id ?? 'asistencia';
  const isLastStep = stepIndex >= WIZARD_STEPS.length - 1;

  useEffect(() => {
    if (open) {
      setStepIndex(0);
      setAsistencia(true);
      setMotivoNoAsistencia('');
      setSignos(initialSignos);
      setObservaciones('');
      setDiagnostico('');
      setPlanObs('');
      setError('');
      setDone(false);
    }
  }, [open]);

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
        const signosObj = {};
        if (signos.peso_kg?.trim()) signosObj.peso_kg = parseFloat(signos.peso_kg);
        if (signos.talla_m?.trim()) signosObj.talla_m = parseFloat(signos.talla_m);
        if (signos.presion_sistolica?.trim()) signosObj.presion_sistolica = parseInt(signos.presion_sistolica, 10);
        if (signos.presion_diastolica?.trim()) signosObj.presion_diastolica = parseInt(signos.presion_diastolica, 10);
        if (signos.glucosa_mg_dl?.trim()) signosObj.glucosa_mg_dl = parseFloat(signos.glucosa_mg_dl);
        if (signos.observaciones?.trim()) signosObj.observaciones = signos.observaciones;
        if (Object.keys(signosObj).length) body.signos_vitales = signosObj;
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
        const signosObj = {};
        if (signos.peso_kg?.trim()) signosObj.peso_kg = parseFloat(signos.peso_kg);
        if (signos.talla_m?.trim()) signosObj.talla_m = parseFloat(signos.talla_m);
        if (signos.presion_sistolica?.trim()) signosObj.presion_sistolica = parseInt(signos.presion_sistolica, 10);
        if (signos.presion_diastolica?.trim()) signosObj.presion_diastolica = parseInt(signos.presion_diastolica, 10);
        if (signos.glucosa_mg_dl?.trim()) signosObj.glucosa_mg_dl = parseFloat(signos.glucosa_mg_dl);
        if (signos.observaciones?.trim()) signosObj.observaciones = signos.observaciones;
        if (Object.keys(signosObj).length) body.signos_vitales = signosObj;
        if (diagnostico.trim().length >= 10) body.diagnostico = { descripcion: diagnostico.trim() };
        if (planObs.trim()) body.plan_medicacion = { observaciones: planObs.trim(), medicamentos: [] };
      }
      await completarCitaWizard(citaId, body);
      if (isLastStep) {
        setDone(true);
        message.success('Cita completada correctamente');
        onSuccess?.();
        onClose();
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
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="radio" checked={asistencia} onChange={() => setAsistencia(true)} /> Asistió
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '0.5rem',
                marginBottom: '1rem',
              }}
            >
              <Input
                type="number"
                placeholder="Peso (kg)"
                value={signos.peso_kg}
                onChange={(e) => setSignos((s) => ({ ...s, peso_kg: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
              <Input
                type="number"
                placeholder="Talla (m)"
                value={signos.talla_m}
                onChange={(e) => setSignos((s) => ({ ...s, talla_m: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
              <Input
                type="number"
                placeholder="PA sist."
                value={signos.presion_sistolica}
                onChange={(e) => setSignos((s) => ({ ...s, presion_sistolica: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
              <Input
                type="number"
                placeholder="PA diast."
                value={signos.presion_diastolica}
                onChange={(e) => setSignos((s) => ({ ...s, presion_diastolica: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
              <Input
                type="number"
                placeholder="Glucosa"
                value={signos.glucosa_mg_dl}
                onChange={(e) => setSignos((s) => ({ ...s, glucosa_mg_dl: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
              <Input
                placeholder="Observaciones"
                value={signos.observaciones}
                onChange={(e) => setSignos((s) => ({ ...s, observaciones: e.target.value }))}
                style={{ marginBottom: 0, gridColumn: '1 / -1' }}
              />
            </div>
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
