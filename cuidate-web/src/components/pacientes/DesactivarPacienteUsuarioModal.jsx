import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { message } from 'antd';
import { Modal, Button } from '../ui';
import { createPacienteBajaGAMDesactivarSchema } from '../../lib/validations/pacienteSchema';
import { buildPacienteBajaApiPatchForAdmin, parseMotivoBajaForForm } from '../../constants/pacienteBaja';
import PacienteBajaFormFields from './PacienteBajaFormFields';
import { getPacienteById, updatePaciente } from '../../api/pacientes';
import { deleteUsuario } from '../../api/auth';

function toInputDate(value) {
  if (value == null) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/**
 * Al desactivar un usuario con rol Paciente: registra baja GAM y luego desactiva la cuenta.
 */
export default function DesactivarPacienteUsuarioModal({
  open,
  onClose,
  idPaciente,
  idUsuario,
  userEmail,
  onCompleted,
}) {
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
    if (!idPaciente || !idUsuario) return;
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
      await deleteUsuario(idUsuario);
      message.success('Baja registrada y cuenta desactivada');
      onCompleted?.();
      onClose();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al desactivar');
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Desactivar usuario"
      width={520}
      footer={null}
    >
      {!idPaciente || !idUsuario ? (
        <p style={{ margin: 0, color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>
          Datos incompletos para desactivar esta cuenta.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {userEmail ? (
            <p
              style={{
                margin: '0 0 1rem',
                fontSize: '0.9rem',
                color: 'var(--color-texto-secundario)',
                lineHeight: 1.45,
              }}
            >
              Cuenta: <strong>{userEmail}</strong>
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
            Indica la <strong>baja del programa (GAM)</strong>. Después se desactivará la cuenta: el usuario no podrá
            iniciar sesión.
          </p>
          <PacienteBajaFormFields control={control} errors={errors} disabled={isSubmitting} />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="submit" variant="danger" disabled={isSubmitting}>
              {isSubmitting ? 'Procesando…' : 'Confirmar desactivación'}
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
