import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { message } from 'antd';
import { Modal, Button } from '../ui';
import { createPacienteBajaGAMDesactivarSchema } from '../../lib/validations/pacienteSchema';
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
 * Registro de baja GAM (fecha y motivo) sin tocar la cuenta de usuario.
 * Usado por doctores/admins desde la lista de pacientes.
 */
export default function PacienteDarBajaModal({ open, onClose, idPaciente, nombrePaciente, onCompleted }) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createPacienteBajaGAMDesactivarSchema()),
    defaultValues: {
      fecha_baja: '',
      motivo_baja_tipo: '',
      motivo_baja_detalle: '',
    },
  });

  useEffect(() => {
    if (!open || !idPaciente) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getPacienteById(idPaciente);
        if (cancelled || !p) return;
        const { tipo, detalleOtros } = parseMotivoBajaForForm(p.motivo_baja);
        reset({
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
          activo: false,
          fecha_baja: data.fecha_baja,
          motivo_baja_tipo: data.motivo_baja_tipo,
          motivo_baja_detalle: data.motivo_baja_detalle,
        })
      );
      message.success('Baja del programa registrada');
      onCompleted?.();
      onClose();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al registrar la baja');
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Dar de baja del programa (GAM)"
      width={520}
      footer={null}
    >
      {!idPaciente ? (
        <p style={{ margin: 0, color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>Paciente no válido.</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {nombrePaciente ? (
            <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
              Paciente: <strong>{nombrePaciente}</strong>
            </p>
          ) : null}
          <p
            style={{
              margin: '0 0 0.75rem',
              fontSize: '0.875rem',
              color: 'var(--color-texto-secundario)',
              lineHeight: 1.45,
            }}
          >
            El paciente quedará inactivo en el programa. La cuenta de acceso (si existe) no se modifica aquí.
          </p>
          <PacienteBajaFormFields control={control} errors={errors} disabled={isSubmitting} />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="submit" variant="danger" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Confirmar baja'}
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
