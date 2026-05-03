import { Input } from '../ui';
import {
  ENFERMEDADES_CRONICAS_KEYS,
  ENFERMEDADES_CRONICAS_LABELS,
} from '../../constants/enfermedadesCronicas';

/**
 * Bloque reutilizable: checkboxes de enfermedades crónicas, año opcional por cada una marcada,
 * y tratamiento no farmacológico / farmacológico.
 */
export default function EnfermedadesCronicasFormBlock({
  introText,
  enfermedadesCronicas,
  onEnfermedadChange,
  aniosDiagnosticoPorEnfermedad,
  onAnioDiagnosticoChange,
  tratamientoNoFarmaco,
  tratamientoFarmaco,
  onTratamientoNoFarmacoChange,
  onTratamientoFarmacoChange,
}) {
  return (
    <>
      {introText ? (
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
          {introText}
        </p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', marginBottom: '1rem' }}>
        {ENFERMEDADES_CRONICAS_KEYS.map((key) => (
          <div key={key} style={{ flex: '1 1 200px', minWidth: 160 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                cursor: 'pointer',
                marginBottom: enfermedadesCronicas[key] ? '0.4rem' : 0,
              }}
            >
              <input
                type="checkbox"
                checked={!!enfermedadesCronicas[key]}
                onChange={(e) => onEnfermedadChange(key, e.target.checked)}
              />
              <span>{ENFERMEDADES_CRONICAS_LABELS[key] ?? key}</span>
            </label>
            {enfermedadesCronicas[key] ? (
              <div style={{ paddingLeft: '1.35rem', maxWidth: 200 }}>
                <Input
                  label="Año de diagnóstico (opcional)"
                  type="number"
                  placeholder="Ej. 2020"
                  value={aniosDiagnosticoPorEnfermedad[key] ?? ''}
                  onChange={(e) => onAnioDiagnosticoChange(key, e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!tratamientoNoFarmaco}
            onChange={(e) => onTratamientoNoFarmacoChange(e.target.checked)}
          />
          <span>Tratamiento no farmacológico</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!tratamientoFarmaco}
            onChange={(e) => onTratamientoFarmacoChange(e.target.checked)}
          />
          <span>Tratamiento farmacológico</span>
        </label>
      </div>
    </>
  );
}
