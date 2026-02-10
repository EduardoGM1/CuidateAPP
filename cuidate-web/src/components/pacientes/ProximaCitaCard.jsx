import { Card, Button, Badge } from '../ui';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';

/**
 * Card para mostrar la próxima o última cita de un paciente.
 *
 * @param {Object} props
 * @param {Array<Object>} props.citas - Lista de citas (como en getPacienteCitas).
 * @param {(id: number) => void} props.onVerCita - Callback para abrir detalle de cita.
 * @param {() => void} [props.onVerTodas] - Callback para ver todas las citas del paciente.
 */
export default function ProximaCitaCard({ citas = [], onVerCita, onVerTodas }) {
  if (!Array.isArray(citas) || citas.length === 0) return null;

  const now = new Date();
  const parsed = citas
    .map((c) => ({
      ...c,
      _fecha: new Date(c.fecha_cita),
      _id: c.id_cita ?? c.id,
    }))
    .filter((c) => !Number.isNaN(c._fecha.getTime()) && c._id != null)
    .sort((a, b) => a._fecha - b._fecha);

  if (!parsed.length) return null;

  const futuras = parsed.filter((c) => c._fecha >= now);
  const seleccionada = futuras[0] || parsed[parsed.length - 1];
  const esFutura = seleccionada._fecha >= now;
  const titulo = esFutura ? 'Próxima cita' : 'Última cita';

  const doctorNombre =
    seleccionada.doctor_nombre ||
    sanitizeForDisplay(
      [seleccionada.Doctor?.nombre, seleccionada.Doctor?.apellido_paterno, seleccionada.Doctor?.apellido_materno]
        .filter(Boolean)
        .join(' ')
    ) ||
    '—';

  const estado = (seleccionada.estado || '').toLowerCase();
  let estadoVariant = 'neutral';
  if (estado === 'atendida') estadoVariant = 'success';
  else if (estado === 'cancelada' || estado === 'no_asistida') estadoVariant = 'error';
  else if (estado === 'reprogramada') estadoVariant = 'warning';

  return (
    <Card className="patient-section-card">
      <h2 className="patient-section-title">{titulo}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.95rem', color: 'var(--color-texto-secundario)' }}>
          <strong>{formatDateTime(seleccionada.fecha_cita)}</strong>
        </div>
        <div style={{ fontSize: '0.95rem' }}>
          <span style={{ color: 'var(--color-texto-secundario)' }}>Doctor: </span>
          <span>{doctorNombre}</span>
        </div>
        <div style={{ fontSize: '0.95rem' }}>
          <span style={{ color: 'var(--color-texto-secundario)' }}>Motivo: </span>
          <span>{sanitizeForDisplay(seleccionada.motivo) || '—'}</span>
        </div>
        <div>
          <Badge variant={estadoVariant}>{seleccionada.estado || '—'}</Badge>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Button
          type="button"
          variant="primary"
          size="small"
          onClick={() => onVerCita && onVerCita(seleccionada._id)}
        >
          Ver cita
        </Button>
        {onVerTodas && (
          <Button type="button" variant="secondary" size="small" onClick={onVerTodas}>
            Ver todas las citas
          </Button>
        )}
      </div>
    </Card>
  );
}

