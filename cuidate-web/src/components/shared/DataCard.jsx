import Card from '../ui/Card';

/**
 * Card con etiqueta(s) y valor(es). Para bloques de datos en detalle.
 * @param {{ title?: string, items?: Array<{ label: string, value: React.ReactNode }>, children?: React.ReactNode }} props
 */
export default function DataCard({ title, items = [], children }) {
  return (
    <Card style={{ marginBottom: 'var(--space-4)' }}>
      {title && <h3 className="data-card-title">{title}</h3>}
      {items.length > 0 && (
        <dl className="data-card-dl">
          {items.map((item, i) => (
            <div key={i} className="data-card-row">
              <dt className="data-card-dt">{item.label}:</dt>
              <dd className="data-card-dd">{item.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
    </Card>
  );
}
