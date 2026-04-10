import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPacienteById } from '../../api/pacientes';
import { getPacienteSignosVitales } from '../../api/pacienteMedicalData';
import PacienteEvolucionCharts from '../../components/pacientes/evolucion/PacienteEvolucionCharts';
import { parsePositiveInt } from '../../utils/params';
import { formatNombreCompleto } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { LoadingSpinner } from '../../components/ui';

/**
 * Vista a pantalla completa: evolución de signos vitales (gráficos, referencias, exportación).
 */
export default function PacienteEvolucion() {
  const { id } = useParams();
  const parsedId = parsePositiveInt(id, 0);
  const [paciente, setPaciente] = useState(null);
  const [pacienteLoading, setPacienteLoading] = useState(true);
  const [signos, setSignos] = useState([]);
  const [signosLoading, setSignosLoading] = useState(true);

  const loadSignos = useCallback(async () => {
    if (parsedId === 0) return;
    setSignosLoading(true);
    try {
      const res = await getPacienteSignosVitales(parsedId, { limit: 500 });
      setSignos(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setSignos([]);
    } finally {
      setSignosLoading(false);
    }
  }, [parsedId]);

  useEffect(() => {
    if (parsedId === 0) return;
    setPacienteLoading(true);
    getPacienteById(parsedId)
      .then(setPaciente)
      .catch(() => setPaciente(null))
      .finally(() => setPacienteLoading(false));
  }, [parsedId]);

  useEffect(() => {
    loadSignos();
  }, [loadSignos]);

  const comorbilidadLabels = useMemo(() => {
    const raw = paciente?.comorbilidades;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((c) => (typeof c === 'object' && c != null ? c.nombre || c.nombre_comorbilidad : String(c)))
      .filter(Boolean);
  }, [paciente]);

  const nombre = paciente ? sanitizeForDisplay(formatNombreCompleto(paciente) || 'Paciente') : '';

  if (parsedId === 0) {
    return (
      <div className="saas-page" style={{ padding: '2rem' }}>
        <p>ID de paciente no válido.</p>
        <Link to="/pacientes">Volver a pacientes</Link>
      </div>
    );
  }

  return (
    <div className="saas-page patient-evolucion-page" style={{ padding: 'clamp(1rem, 3vw, 2rem)', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link to={`/pacientes/${parsedId}`} style={{ color: 'var(--color-primario)', fontWeight: 600 }}>
          ← Volver a la ficha del paciente
        </Link>
      </div>

      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.25rem, 3vw, 1.75rem)' }}>
          Evolución clínica
          {nombre && (
            <span style={{ color: 'var(--color-texto-secundario)', fontWeight: 500 }}> — {nombre}</span>
          )}
        </h1>
        {pacienteLoading ? (
          <p style={{ color: 'var(--color-texto-secundario)', margin: 0 }}>Cargando datos del paciente…</p>
        ) : comorbilidadLabels.length > 0 ? (
          <p style={{ color: 'var(--color-texto-secundario)', margin: 0, fontSize: 'var(--text-sm)' }}>
            Comorbilidades: {comorbilidadLabels.map((n) => sanitizeForDisplay(n)).join(', ')}
          </p>
        ) : null}
      </header>

      {pacienteLoading && !paciente ? (
        <LoadingSpinner />
      ) : (
        <PacienteEvolucionCharts
          pacienteId={parsedId}
          comorbilidadLabels={comorbilidadLabels}
          signosData={signos}
          loadSignos={loadSignos}
          signosLoading={signosLoading}
        />
      )}
    </div>
  );
}
