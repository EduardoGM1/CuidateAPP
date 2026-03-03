import { Card, LoadingSpinner, EmptyState, Button } from '../ui';
import { formatDate } from '../../utils/format';
import { getPresionValueStyle, getVitalSignValueStyle } from '../../utils/vitalSignsRanges';

/**
 * Resumen de la última medición de signos vitales (monitoreo continuo).
 * Reutilizable en modal Monitoreo continuo y donde se necesite el mismo bloque.
 *
 * @param {{ loading?: boolean, ultimoSigno?: object | null, onVerHistorial?: () => void, hideTitle?: boolean }} props
 */
export default function MonitoreoContinuoSummary({ loading = false, ultimoSigno = null, onVerHistorial, hideTitle = false }) {
  const titleBlock = !hideTitle && <h2 className="patient-section-title">Monitoreo continuo</h2>;

  if (loading) {
    return (
      <Card className="patient-section-card">
        {titleBlock}
        <LoadingSpinner />
      </Card>
    );
  }

  if (!ultimoSigno) {
    return (
      <Card className="patient-section-card">
        {titleBlock}
        <EmptyState message="Aún no hay registros de signos vitales" />
        {typeof onVerHistorial === 'function' && (
          <div style={{ marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={onVerHistorial}>
              Ver signos vitales
            </Button>
          </div>
        )}
      </Card>
    );
  }

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '0.75rem',
    fontSize: '0.95rem',
  };
  const labelStyle = {
    fontSize: '0.8rem',
    color: 'var(--color-texto-secundario)',
    marginBottom: '0.25rem',
  };
  const valueStyle = { fontWeight: 600 };
  const paStyle = getPresionValueStyle(ultimoSigno.presion_sistolica, ultimoSigno.presion_diastolica);
  const glucosaStyle = getVitalSignValueStyle('glucosa_mg_dl', ultimoSigno.glucosa_mg_dl);
  const hba1cStyle = getVitalSignValueStyle('hba1c_porcentaje', ultimoSigno.hba1c_porcentaje);

  return (
    <Card className="patient-section-card">
      {titleBlock}
      <div style={gridStyle}>
        <div>
          <div style={labelStyle}>Fecha última medición</div>
          <div style={valueStyle}>{formatDate(ultimoSigno.fecha_medicion)}</div>
        </div>
        <div>
          <div style={labelStyle}>Peso</div>
          <div style={valueStyle}>{ultimoSigno.peso_kg != null ? `${ultimoSigno.peso_kg} kg` : '—'}</div>
        </div>
        <div>
          <div style={labelStyle}>PA</div>
          <div style={{ ...valueStyle, ...paStyle }}>
            {ultimoSigno.presion_sistolica != null && ultimoSigno.presion_diastolica != null
              ? `${ultimoSigno.presion_sistolica}/${ultimoSigno.presion_diastolica} mmHg`
              : '—'}
          </div>
        </div>
        <div>
          <div style={labelStyle}>Glucosa</div>
          <div style={{ ...valueStyle, ...glucosaStyle }}>
            {ultimoSigno.glucosa_mg_dl != null ? `${ultimoSigno.glucosa_mg_dl} mg/dL` : '—'}
          </div>
        </div>
        <div>
          <div style={labelStyle}>HbA1c</div>
          <div style={{ ...valueStyle, ...hba1cStyle }}>
            {ultimoSigno.hba1c_porcentaje != null ? `${ultimoSigno.hba1c_porcentaje}%` : '—'}
          </div>
        </div>
      </div>
      {typeof onVerHistorial === 'function' && (
        <div style={{ marginTop: '1rem' }}>
          <Button type="button" variant="outline" onClick={onVerHistorial}>
            Ver historial de signos vitales
          </Button>
        </div>
      )}
    </Card>
  );
}
