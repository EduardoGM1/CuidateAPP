import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { message } from 'antd';
import { Modal, Button } from '../ui';
import { createPacienteSeguimientoClinicoSchema } from '../../lib/validations/pacienteSchema';
import { buildPacienteBajaApiPatchForAdmin, parseMotivoBajaForForm } from '../../constants/pacienteBaja';
import PacienteBajaFormFields from './PacienteBajaFormFields';
import { getPacienteById, updatePaciente } from '../../api/pacientes';

function toInputDate(value) {
  if (value == null) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/**
 * Modal admin: seguimiento GAM (paciente activo / baja con fecha y motivo).
 * Reutiliza `PacienteBajaFormFields` y `buildPacienteBajaApiPatchForAdmin` (paridad con API).
 */
export default function PacienteSeguimientoClinicoModal({
  open,
  onClose,
  idPaciente,
  userEmail,
  onSaved,
}) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createPacienteSeguimientoClinicoSchema()),
    defaultValues: {
      activo: true,
      fecha_baja: '',
      motivo_baja_tipo: '',
      motivo_baja_detalle: '',
    },
  });

  const activoWatch = watch('activo');

  useEffect(() => {
    if (activoWatch !== true) return;
    setValue('fecha_baja', '');
    setValue('motivo_baja_tipo', '');
    setValue('motivo_baja_detalle', '');
  }, [activoWatch, setValue]);

  useEffect(() => {
    if (!open || !idPaciente) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getPacienteById(idPaciente);
        if (cancelled || !p) return;
        const { tipo, detalleOtros } = parseMotivoBajaForForm(p.motivo_baja);
        reset({
          activo: p.activo !== false,
          fecha_baja: toInputDate(p.fecha_baja),
          motivo_baja_tipo: tipo,
          motivo_baja_detalle: detalleOtros,
        });
      } catch {
        message.error('No se pudieron cargar los datos del paciente');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, idPaciente, reset]);

  async function onSubmit(data) {
    if (!idPaciente) return;
    try {
      await updatePaciente(
        idPaciente,
        buildPacienteBajaApiPatchForAdmin({
          activo: data.activo,
          fecha_baja: data.fecha_baja,
          motivo_baja_tipo: data.motivo_baja_tipo,
          motivo_baja_detalle: data.motivo_baja_detalle,
        })
      );
      message.success('Seguimiento clínico actualizado');
      onSaved?.();
      onClose();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al guardar');
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Seguimiento clínico (GAM)"
      width={520}
      footer={null}
    >
      {!idPaciente ? (
        <p style={{ margin: 0, color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>
          No hay expediente de paciente vinculado a esta cuenta.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {userEmail ? (
            <p
              style={{
                margin: '0 0 1rem',
                fontSize: '0.9rem',
                color: 'var(--color-texto-secundario)',
              }}
            >
              Cuenta: <strong>{userEmail}</strong>
            </p>
          ) : null}
          <Controller
            name="activo"
            control={control}
            render={({ field }) => (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                <input
                  type="checkbox"
                  id="seguimiento-paciente-activo"
                  checked={!!field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  disabled={isSubmitting}
                />
                <label htmlFor="seguimiento-paciente-activo" style={{ fontWeight: 500, color: 'var(--color-texto-primario)' }}>
                  Paciente activo en el programa
                </label>
              </div>
            )}
          />
          {activoWatch === false ? (
            <>
              <p
                style={{
                  margin: '0 0 0.75rem',
                  fontSize: '0.875rem',
                  color: 'var(--color-texto-secundario)',
                  lineHeight: 1.45,
                }}
              >
                Indica fecha y motivo de baja. Si reactivas al paciente, estos datos se borrarán al guardar.
              </p>
              <PacienteBajaFormFields control={control} errors={errors} disabled={isSubmitting} />
            </>
          ) : null}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
