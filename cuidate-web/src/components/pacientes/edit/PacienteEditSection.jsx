import { Button, Card } from '../../ui';

const STATUS_MAP = {
  clean: { label: 'Sin cambios', color: 'var(--color-texto-secundario)' },
  pending: { label: 'Cambios pendientes', color: 'var(--color-warning)' },
  saving: { label: 'Guardando…', color: 'var(--color-primario)' },
  saved: { label: 'Guardado', color: 'var(--color-exito)' },
  error: { label: 'Error al guardar', color: 'var(--color-error)' },
};

export default function PacienteEditSection({
  id,
  title,
  description,
  status = 'clean',
  open = false,
  onToggle,
  children,
}) {
  const statusUi = STATUS_MAP[status] ?? STATUS_MAP.clean;
  return (
    <Card style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-primario)' }}>{title}</h3>
          {description ? (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>{description}</p>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: statusUi.color,
              border: `1px solid ${statusUi.color}`,
              borderRadius: 999,
              padding: '0.2rem 0.55rem',
              whiteSpace: 'nowrap',
            }}
          >
            {statusUi.label}
          </span>
          <Button type="button" variant="outline" size="small" onClick={() => onToggle(id)}>
            {open ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>
      </div>
      {open ? <div style={{ marginTop: '1rem' }}>{children}</div> : null}
    </Card>
  );
}
