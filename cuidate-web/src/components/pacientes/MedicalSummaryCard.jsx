import { Card } from '../ui';

/**
 * Card de resumen médico similar a la app móvil.
 * Muestra totales de citas, signos vitales, diagnósticos y medicamentos.
 *
 * @param {{ resumen: { total_citas?: number, total_signos_vitales?: number, total_diagnosticos?: number, total_medicamentos?: number } }} props
 */
export default function MedicalSummaryCard({ resumen }) {
  const r = resumen?.resumen || resumen || {};
  const items = [
    { key: 'total_citas', label: 'Citas', value: r.total_citas ?? 0 },
    { key: 'total_signos_vitales', label: 'Signos vitales', value: r.total_signos_vitales ?? 0 },
    { key: 'total_diagnosticos', label: 'Diagnósticos', value: r.total_diagnosticos ?? 0 },
    { key: 'total_medicamentos', label: 'Medicamentos', value: r.total_medicamentos ?? 0 },
  ].filter((i) => i.value != null);

  if (!items.length) return null;

  return (
    <Card className="patient-section-card">
      <h2 className="patient-section-title">Resumen médico</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              padding: '0.85rem 0.75rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-fondo-secundario)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '1.4rem',
                fontWeight: 'var(--font-bold)',
                color: 'var(--color-primario)',
                marginBottom: '0.15rem',
              }}
            >
              {item.value}
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                color: 'var(--color-texto-secundario)',
                textTransform: 'uppercase',
                letterSpacing: 0.3,
              }}
            >
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

