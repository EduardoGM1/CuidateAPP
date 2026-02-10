import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { getPacienteById } from '../../api/pacientes';
import { getDoctores } from '../../api/doctores';
import { createCita } from '../../api/citas';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input } from '../../components/ui';
import { LoadingSpinner } from '../../components/ui';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';

export default function AgendarCita() {
  const { id } = useParams();
  const navigate = useNavigate();
  const parsedId = parsePositiveInt(id, 0);

  const [paciente, setPaciente] = useState(null);
  const [doctores, setDoctores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { id_doctor: '', fecha_cita: '', motivo: '' },
  });

  useEffect(() => {
    if (parsedId === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getPacienteById(parsedId), getDoctores({ estado: 'activos', limit: 200 })])
      .then(([p, list]) => {
        if (cancelled) return;
        setPaciente(p);
        setDoctores(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setPaciente(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [parsedId]);

  async function onSubmit(data) {
    setSubmitError('');
    const idDoctor = parsePositiveInt(data.id_doctor, 0);
    if (idDoctor === 0) {
      setSubmitError('Selecciona un doctor');
      return;
    }
    const fecha = (data.fecha_cita || '').trim();
    if (!fecha) {
      setSubmitError('La fecha y hora son obligatorias');
      return;
    }
    try {
      const payload = {
        id_paciente: parsedId,
        id_doctor: idDoctor,
        fecha_cita: fecha.length <= 10 ? `${fecha}T12:00:00` : fecha,
        motivo: data.motivo?.trim() || undefined,
      };
      await createCita(payload);
      navigate(`/pacientes/${parsedId}`, { replace: true });
    } catch (err) {
      setSubmitError(err?.response?.data?.error || err?.message || 'Error al agendar la cita');
    }
  }

  if (parsedId === 0) {
    return (
      <div>
        <PageHeader title="Agendar cita" showBack backTo="/pacientes" />
        <p style={{ color: 'var(--color-error)' }}>Paciente no encontrado.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Agendar cita" showBack backTo={`/pacientes/${parsedId}`} />
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!paciente) {
    return (
      <div>
        <PageHeader title="Agendar cita" showBack backTo="/pacientes" />
        <p style={{ color: 'var(--color-error)' }}>No se pudo cargar el paciente.</p>
      </div>
    );
  }

  const nombrePaciente = [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno].filter(Boolean).join(' ');

  return (
    <div>
      <PageHeader title="Agendar cita" showBack backTo={`/pacientes/${parsedId}`} />
      <Card>
        <p style={{ margin: '0 0 1rem', color: 'var(--color-texto-secundario)' }}>
          Paciente: <strong>{sanitizeForDisplay(nombrePaciente)}</strong>
        </p>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {submitError && (
            <p style={{ margin: '0 0 1rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>{submitError}</p>
          )}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>
              Doctor *
            </label>
            <select
              {...register('id_doctor', { required: 'Selecciona un doctor' })}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                border: '1px solid var(--color-borde-claro)',
                borderRadius: 'var(--radius)',
                backgroundColor: 'var(--color-fondo-card)',
              }}
            >
              <option value="">— Seleccionar doctor —</option>
              {doctores.map((d) => (
                <option key={d.id_doctor ?? d.id} value={d.id_doctor ?? d.id}>
                  {sanitizeForDisplay([d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' ')) || '—'}
                </option>
              ))}
            </select>
            {errors.id_doctor?.message && (
              <p style={{ margin: '0.25rem 0 0', color: 'var(--color-error)', fontSize: '0.85rem' }}>{errors.id_doctor.message}</p>
            )}
          </div>
          <Input
            label="Fecha y hora"
            type="datetime-local"
            error={errors.fecha_cita?.message}
            {...register('fecha_cita', { required: 'La fecha y hora son obligatorias' })}
            required
          />
          <Input
            label="Motivo (opcional)"
            error={errors.motivo?.message}
            {...register('motivo')}
          />
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Agendando…' : 'Agendar cita'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(`/pacientes/${parsedId}`)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
