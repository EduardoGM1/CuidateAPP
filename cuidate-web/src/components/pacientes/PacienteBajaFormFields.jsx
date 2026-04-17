import { Controller, useWatch } from 'react-hook-form';
import { Input, Select } from '../ui';
import { getMotivoBajaSelectOptions, MOTIVO_BAJA_VALUE } from '../../constants/pacienteBaja';

/**
 * Campos de baja (GAM ⑭) cuando el paciente está marcado como inactivo.
 * Requiere nombres de campo: `fecha_baja`, `motivo_baja_tipo`, `motivo_baja_detalle`.
 */
export default function PacienteBajaFormFields({ control, errors, disabled }) {
  const motivoTipo = useWatch({ control, name: 'motivo_baja_tipo', defaultValue: '' });
  const showOtrosDetalle = motivoTipo === MOTIVO_BAJA_VALUE.OTROS;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1rem',
      }}
    >
      <Controller
        name="fecha_baja"
        control={control}
        render={({ field }) => (
          <Input
            label="Fecha de baja"
            type="date"
            placeholder="dd/mm/aaaa"
            error={errors.fecha_baja?.message}
            disabled={disabled}
            {...field}
          />
        )}
      />
      <Controller
        name="motivo_baja_tipo"
        control={control}
        render={({ field }) => (
          <Select
            label="Motivo de baja"
            placeholder="— Seleccionar —"
            value={field.value || ''}
            onChange={(v) => field.onChange(v || '')}
            options={getMotivoBajaSelectOptions()}
            error={errors.motivo_baja_tipo?.message}
            disabled={disabled}
          />
        )}
      />
      {showOtrosDetalle ? (
        <Controller
          name="motivo_baja_detalle"
          control={control}
          render={({ field }) => (
            <Input
              label="Especificar motivo (Otros)"
              placeholder="Describe el motivo de la baja"
              error={errors.motivo_baja_detalle?.message}
              disabled={disabled}
              {...field}
            />
          )}
        />
      ) : null}
    </div>
  );
}
