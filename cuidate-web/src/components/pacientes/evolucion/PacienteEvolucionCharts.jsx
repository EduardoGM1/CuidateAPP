import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Tabs } from 'antd';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import Modal from '../../ui/Modal';
import { Button, Select } from '../../ui';
import TimeRangeFilter, { filterSignosByTimeRange, FILTROS_TIEMPO } from '../../charts/TimeRangeFilter';
import { aggregateSignosByMonth } from '../../charts/monthlyChartUtils';
import { formatDate, formatDateTime, formatNombreCompleto } from '../../../utils/format';
import { sanitizeForDisplay } from '../../../utils/sanitize';
import ComparativaEvolucionSignos from '../ComparativaEvolucionSignos';
import {
  REF_RANGES,
  computeTrend,
  trendArrow,
  trendAriaLabel,
  inferComorbidityFocus,
} from '../../../utils/evolucionSignosUtils';

const CHART_COLORS = {
  primary: '#004B87',
  secondary: '#BC955C',
  grid: '#E8F0EE',
  paSistolica: '#c62828',
  paDiastolica: '#1565c0',
  colesterolTotal: '#6a1b9a',
  colesterolLdl: '#d84315',
  colesterolHdl: '#00838f',
  hba1c: '#2e7d32',
  glucosa: '#00695c',
  cintura: '#5d4037',
  muted: '#94a3b8',
};

const tooltipStyle = {
  fontSize: 'var(--text-sm)',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--color-borde-claro)',
  backgroundColor: 'var(--color-fondo-card)',
  boxShadow: 'var(--shadow-md)',
  maxWidth: 320,
};

function calcIMC(pesoKg, tallaM) {
  if (pesoKg == null || tallaM == null || Number(tallaM) === 0) return null;
  const imc = Number(pesoKg) / (Number(tallaM) * Number(tallaM));
  return Number.isNaN(imc) ? null : parseFloat(imc.toFixed(1));
}

function getSignoValores(signo) {
  const items = [];
  if (signo.presion_sistolica != null || signo.presion_diastolica != null) {
    items.push({ label: 'Presión arterial', value: `${signo.presion_sistolica ?? '—'}/${signo.presion_diastolica ?? '—'} mmHg` });
  }
  if (signo.glucosa_mg_dl != null) items.push({ label: 'Glucosa', value: `${signo.glucosa_mg_dl} mg/dL` });
  if (signo.peso_kg != null) items.push({ label: 'Peso', value: `${signo.peso_kg} kg` });
  if (signo.talla_m != null) items.push({ label: 'Talla', value: `${signo.talla_m} m` });
  const imc = signo.imc ?? calcIMC(signo.peso_kg, signo.talla_m);
  if (imc != null) items.push({ label: 'IMC', value: `${imc} kg/m²` });
  if (signo.medida_cintura_cm != null) items.push({ label: 'Cintura', value: `${signo.medida_cintura_cm} cm` });
  if (signo.colesterol_mg_dl != null) items.push({ label: 'Colesterol total', value: `${signo.colesterol_mg_dl} mg/dL` });
  if (signo.colesterol_ldl != null) items.push({ label: 'Colesterol LDL', value: `${signo.colesterol_ldl} mg/dL` });
  if (signo.colesterol_hdl != null) items.push({ label: 'Colesterol HDL', value: `${signo.colesterol_hdl} mg/dL` });
  if (signo.trigliceridos_mg_dl != null) items.push({ label: 'Triglicéridos', value: `${signo.trigliceridos_mg_dl} mg/dL` });
  if (signo.hba1c_porcentaje != null) items.push({ label: 'HbA1c', value: `${signo.hba1c_porcentaje}%` });
  if (signo.observaciones) items.push({ label: 'Observaciones', value: sanitizeForDisplay(signo.observaciones) });
  const doc = signo.Doctor || signo.doctor;
  if (doc) {
    const nombre = formatNombreCompleto(doc) || doc.nombre || doc.email;
    if (nombre) items.push({ label: 'Registrado por', value: sanitizeForDisplay(nombre) });
  }
  if (signo.id_cita != null) items.push({ label: 'Cita', value: `ID ${signo.id_cita}` });
  return items;
}

function RichTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const fechaHora = row.fechaRaw ? formatDateTime(row.fechaRaw) : label;
  const extras = getSignoValores(row).slice(0, 8);
  return (
    <div style={tooltipStyle} role="tooltip">
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{fechaHora}</div>
      {payload.map((p) => (
        <div key={p.dataKey || p.name} style={{ fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--color-texto-secundario)' }}>{p.name}: </span>
          <strong>{p.value != null ? String(p.value) : '—'}</strong>
        </div>
      ))}
      {extras.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-borde-claro)' }}>
          {extras.map((e) => (
            <div key={e.label} style={{ fontSize: '0.8rem', marginTop: 4 }}>
              <span style={{ color: 'var(--color-texto-secundario)' }}>{e.label}: </span>
              {e.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const chartBlockStyle = { minWidth: 280, marginBottom: 'var(--space-8)', minHeight: 280 };
const titleStyle = { fontSize: 'var(--text-base)', color: 'var(--color-texto-secundario)', marginBottom: 'var(--space-2)', fontWeight: 'var(--font-semibold)' };

/**
 * Vista ampliada de evolución (signos vitales en el tiempo).
 * @param {object} props
 * @param {number} props.pacienteId
 * @param {string} [props.nombrePaciente]
 * @param {string[]} [props.comorbilidadLabels]
 * @param {Array} props.signosData
 * @param {() => Promise<void>} [props.loadSignos]
 * @param {boolean} props.signosLoading
 */
export default function PacienteEvolucionCharts({
  pacienteId,
  comorbilidadLabels = [],
  signosData,
  loadSignos,
  signosLoading,
}) {
  const printRef = useRef(null);
  const [filtroTiempo, setFiltroTiempo] = useState(FILTROS_TIEMPO.COMPLETO);
  const [activeTab, setActiveTab] = useState('resumen');
  const [detalleMesOpen, setDetalleMesOpen] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState(null);
  const [diaFiltro, setDiaFiltro] = useState('todos');
  const [registroDetalleOpen, setRegistroDetalleOpen] = useState(false);
  const [registroDetalle, setRegistroDetalle] = useState(null);
  const [monthFocusIndex, setMonthFocusIndex] = useState(0);

  useEffect(() => {
    if (pacienteId && (!signosData || signosData.length === 0)) loadSignos?.();
  }, [pacienteId, signosData?.length, loadSignos]);

  useEffect(() => {
    setDiaFiltro('todos');
  }, [mesSeleccionado]);

  const focus = useMemo(() => inferComorbidityFocus(comorbilidadLabels), [comorbilidadLabels]);

  const signosFiltrados = useMemo(
    () => filterSignosByTimeRange(signosData || [], filtroTiempo),
    [signosData, filtroTiempo]
  );

  const sorted = useMemo(
    () => [...signosFiltrados].sort((a, b) => new Date(a.fecha_medicion || a.fecha_registro) - new Date(b.fecha_medicion || b.fecha_registro)),
    [signosFiltrados]
  );

  const chartData = useMemo(
    () =>
      sorted.map((s) => {
        const imc = s.imc ?? calcIMC(s.peso_kg, s.talla_m);
        return {
          ...s,
          fecha: formatDate(s.fecha_medicion || s.fecha_registro || s.fecha_creacion),
          fechaRaw: s.fecha_medicion || s.fecha_registro || s.fecha_creacion,
          peso_kg: s.peso_kg != null ? Number(s.peso_kg) : null,
          medida_cintura_cm: s.medida_cintura_cm != null ? Number(s.medida_cintura_cm) : null,
          glucosa_mg_dl: s.glucosa_mg_dl != null ? Number(s.glucosa_mg_dl) : null,
          presion_sistolica: s.presion_sistolica != null ? Number(s.presion_sistolica) : null,
          presion_diastolica: s.presion_diastolica != null ? Number(s.presion_diastolica) : null,
          imc: imc != null ? Number(imc) : null,
          colesterol_mg_dl: s.colesterol_mg_dl != null ? Number(s.colesterol_mg_dl) : null,
          colesterol_ldl: s.colesterol_ldl != null ? Number(s.colesterol_ldl) : null,
          colesterol_hdl: s.colesterol_hdl != null ? Number(s.colesterol_hdl) : null,
          hba1c_porcentaje: s.hba1c_porcentaje != null ? Number(s.hba1c_porcentaje) : null,
        };
      }),
    [sorted]
  );

  const monthlyData = useMemo(() => aggregateSignosByMonth(signosFiltrados).map((m) => ({ ...m, registros: m.totalRegistros })), [signosFiltrados]);

  useEffect(() => {
    if (monthlyData.length === 0) return;
    setMonthFocusIndex(monthlyData.length - 1);
  }, [filtroTiempo, monthlyData.length]);

  const pesoTrend = useMemo(() => computeTrend(chartData, 'peso_kg'), [chartData]);
  const glucTrend = useMemo(() => computeTrend(chartData, 'glucosa_mg_dl'), [chartData]);
  const paTrend = useMemo(() => computeTrend(chartData, 'presion_sistolica'), [chartData]);

  const hasPeso = chartData.some((d) => d.peso_kg != null);
  const hasGlucosa = chartData.some((d) => d.glucosa_mg_dl != null);
  const hasPA = chartData.some((d) => d.presion_sistolica != null || d.presion_diastolica != null);
  const hasIMC = chartData.some((d) => d.imc != null);
  const hasCintura = chartData.some((d) => d.medida_cintura_cm != null);
  const hasColesterol = chartData.some((d) => d.colesterol_mg_dl != null || d.colesterol_ldl != null || d.colesterol_hdl != null);
  const hasHbA1c = chartData.some((d) => d.hba1c_porcentaje != null);
  const hasAnyChart = hasPeso || hasGlucosa || hasPA || hasIMC || hasColesterol || hasHbA1c;

  const lastPesoDate = useMemo(() => {
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i].peso_kg != null) return chartData[i].fechaRaw;
    }
    return null;
  }, [chartData]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (signosLoading && (!signosData || signosData.length === 0)) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-texto-secundario)' }}>Cargando signos vitales…</p>
      </div>
    );
  }

  if (!signosLoading && (!signosData || signosData.length === 0)) {
    return (
      <div style={{ padding: 'var(--space-6)', maxWidth: 560 }}>
        <p style={{ marginBottom: 'var(--space-3)' }}>No hay registros de signos vitales. Agrega mediciones en la sección Signos vitales de la ficha.</p>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>
          Si acabas de acotar el período, prueba <strong>Completo</strong> o un rango más amplio.
        </p>
      </div>
    );
  }

  if (!signosLoading && signosFiltrados.length === 0) {
    return (
      <div style={{ padding: 'var(--space-6)' }}>
        <TimeRangeFilter value={filtroTiempo} onChange={setFiltroTiempo} />
        <p style={{ color: 'var(--color-texto-secundario)' }}>
          No hay datos en el período seleccionado. Elige <strong>Completo</strong> o amplía el rango temporal.
        </p>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'resumen',
      label: 'Resumen',
      children: (
        <div>
          {monthlyData.length > 0 && (
            <div style={chartBlockStyle}>
              <h3 style={titleStyle}>Registros por mes</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginBottom: 'var(--space-2)' }}>
                Cada barra cuenta los <strong>registros de signos vitales</strong> del paciente en ese mes calendario (cualquier campo medido).
              </p>
              <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>Mes destacado:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  disabled={monthFocusIndex <= 0}
                  onClick={() => setMonthFocusIndex((i) => Math.max(0, i - 1))}
                >
                  Mes anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  disabled={monthFocusIndex >= monthlyData.length - 1}
                  onClick={() => setMonthFocusIndex((i) => Math.min(monthlyData.length - 1, i + 1))}
                >
                  Mes siguiente
                </Button>
                <span style={{ fontWeight: 600 }}>{monthlyData[monthFocusIndex]?.mesLabel ?? '—'}</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
                  <YAxis domain={[0, 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [`${value} registro(s)`, 'Signos vitales']}
                    labelFormatter={(label) => label}
                  />
                  <Bar
                    dataKey="registros"
                    radius={[4, 4, 0, 0]}
                    name="Registros"
                    onClick={(data) => {
                      const payload = data?.payload ?? data;
                      if (payload && (payload.signos || payload.mesKey)) {
                        const idx = monthlyData.findIndex((m) => m.mesKey === payload.mesKey);
                        if (idx >= 0) setMonthFocusIndex(idx);
                        setMesSeleccionado(payload);
                        setDetalleMesOpen(true);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {monthlyData.map((entry, index) => (
                      <Cell
                        key={entry.mesKey || index}
                        fill={index === monthFocusIndex ? CHART_COLORS.primary : CHART_COLORS.glucosa}
                        opacity={index === monthFocusIndex ? 1 : 0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-texto-secundario)', marginTop: '0.5rem' }}>
                Clic en una barra para ver el desglose del mes. También puedes usar el tooltip al pasar el ratón.
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'antropometria',
      label: 'Antropometría',
      disabled: !hasPeso && !hasIMC && !hasCintura,
      children: (
        <div>
          {hasPeso && (
            <div style={chartBlockStyle}>
              <h3 style={titleStyle}>Peso (kg)</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>
                Última medición: {lastPesoDate ? formatDateTime(lastPesoDate) : '—'}. Clic en un punto para el detalle.
              </p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="fecha"
                    height={chartData.length > 8 ? 50 : 30}
                    tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }}
                    angle={chartData.length > 8 ? -30 : 0}
                    textAnchor={chartData.length > 8 ? 'end' : 'middle'}
                  />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
                  <Tooltip content={(props) => <RichTooltip {...props} />} />
                  <Line
                    type="monotone"
                    dataKey="peso_kg"
                    name="Peso"
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    dot={(dotProps) => {
                      const { cx, cy, payload } = dotProps;
                      if (payload == null) return null;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={CHART_COLORS.primary}
                          stroke="#fff"
                          strokeWidth={2}
                          style={{ cursor: 'pointer' }}
                          onClick={() => {
                            if (payload.fechaRaw) {
                              setRegistroDetalle(payload);
                              setRegistroDetalleOpen(true);
                            }
                          }}
                        />
                      );
                    }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {hasPeso && hasCintura && (
            <div style={chartBlockStyle}>
              <h3 style={titleStyle}>Peso y circunferencia de cintura</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>
                Dos ejes: kg (izquierda) y cm (derecha). Leyenda diferenciada por forma de punto.
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} angle={chartData.length > 8 ? -30 : 0} textAnchor={chartData.length > 8 ? 'end' : 'middle'} height={chartData.length > 8 ? 50 : 30} />
                  <YAxis yAxisId="peso" domain={['auto', 'auto']} tick={{ fontSize: 11 }} label={{ value: 'kg', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="cint" orientation="right" domain={['auto', 'auto']} tick={{ fontSize: 11 }} label={{ value: 'cm', angle: 90, position: 'insideRight' }} />
                  <Tooltip content={(props) => <RichTooltip {...props} />} />
                  <Legend />
                  <Line yAxisId="peso" type="monotone" dataKey="peso_kg" name="Peso (kg)" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  <Line
                    yAxisId="cint"
                    type="monotone"
                    dataKey="medida_cintura_cm"
                    name="Cintura (cm)"
                    stroke={CHART_COLORS.cintura}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ r: 4, stroke: CHART_COLORS.cintura, fill: '#fff' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {hasIMC && (
            <div style={chartBlockStyle}>
              <h3 style={titleStyle}>IMC (kg/m²)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <ReferenceArea y1={REF_RANGES.imcNormal.y1} y2={REF_RANGES.imcNormal.y2} fill="#00843d" fillOpacity={0.08} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} angle={chartData.length > 8 ? -30 : 0} textAnchor={chartData.length > 8 ? 'end' : 'middle'} height={chartData.length > 8 ? 50 : 30} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip content={(props) => <RichTooltip {...props} />} />
                  <Line type="monotone" dataKey="imc" name="IMC" stroke={CHART_COLORS.hba1c} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-texto-secundario)', marginTop: 6 }}>
                Banda verde suave: rango IMC normal orientativo (18,5–24,9). Ajustar según criterio clínico.
              </p>
            </div>
          )}
          {!hasPeso && !hasIMC && !hasCintura && (
            <p style={{ color: 'var(--color-texto-secundario)' }}>No hay peso, IMC ni cintura en este período.</p>
          )}
        </div>
      ),
    },
    {
      key: 'glucosa',
      label: 'Glucosa / HbA1c',
      disabled: !hasGlucosa && !hasHbA1c,
      children: (
        <div>
          {hasGlucosa && (
            <div style={chartBlockStyle}>
              <h3 style={titleStyle}>Glucosa (mg/dL)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <ReferenceArea y1={REF_RANGES.glucosaAyunas.y1} y2={REF_RANGES.glucosaPostprandial.y2} fill="#004B87" fillOpacity={0.06} />
                  <ReferenceLine y={180} stroke={CHART_COLORS.paSistolica} strokeDasharray="3 3" label={{ value: '180', position: 'right', fill: CHART_COLORS.paSistolica, fontSize: 10 }} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} angle={chartData.length > 8 ? -30 : 0} textAnchor={chartData.length > 8 ? 'end' : 'middle'} height={chartData.length > 8 ? 50 : 30} />
                  <YAxis domain={[0, 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip content={(props) => <RichTooltip {...props} />} />
                  <Bar dataKey="glucosa_mg_dl" name="Glucosa" fill={CHART_COLORS.glucosa} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-texto-secundario)', marginTop: 6 }}>
                Área sombreada: referencia visual amplia; línea punteada 180 mg/dL como recordatorio de vigilancia. No sustituye metas individuales.
              </p>
            </div>
          )}
          {hasHbA1c && (
            <div style={chartBlockStyle}>
              <h3 style={titleStyle}>HbA1c (%)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} angle={chartData.length > 8 ? -30 : 0} textAnchor={chartData.length > 8 ? 'end' : 'middle'} height={chartData.length > 8 ? 50 : 30} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip content={(props) => <RichTooltip {...props} />} />
                  <Line type="monotone" dataKey="hba1c_porcentaje" name="HbA1c %" stroke={CHART_COLORS.hba1c} strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'presion',
      label: 'Presión arterial',
      disabled: !hasPA,
      children: hasPA ? (
        <div style={chartBlockStyle}>
          <h3 style={titleStyle}>TA (mmHg)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <ReferenceLine y={REF_RANGES.paSistolicaObjetivo} stroke={CHART_COLORS.paSistolica} strokeDasharray="4 4" label={{ value: `${REF_RANGES.paSistolicaObjetivo} sist.`, fontSize: 10 }} />
              <ReferenceLine y={REF_RANGES.paDiastolicaObjetivo} stroke={CHART_COLORS.paDiastolica} strokeDasharray="4 4" label={{ value: `${REF_RANGES.paDiastolicaObjetivo} diast.`, fontSize: 10 }} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} angle={chartData.length > 8 ? -30 : 0} textAnchor={chartData.length > 8 ? 'end' : 'middle'} height={chartData.length > 8 ? 50 : 30} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
              <Tooltip content={(props) => <RichTooltip {...props} />} />
              <Legend />
              <Line type="monotone" dataKey="presion_sistolica" name="Sistólica" stroke={CHART_COLORS.paSistolica} strokeWidth={2} dot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="presion_diastolica" name="Diastólica" stroke={CHART_COLORS.paDiastolica} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 4, fill: '#fff' }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-texto-secundario)', marginTop: 6 }}>
            Líneas de referencia 130/80 mmHg orientativas; objetivos según guía e individualización.
          </p>
        </div>
      ) : null,
    },
    {
      key: 'lipidos',
      label: 'Lípidos',
      disabled: !hasColesterol,
      children: hasColesterol ? (
        <div style={chartBlockStyle}>
          <h3 style={titleStyle}>Colesterol (mg/dL)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 12, right: 12, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} angle={chartData.length > 8 ? -30 : 0} textAnchor={chartData.length > 8 ? 'end' : 'middle'} height={chartData.length > 8 ? 50 : 30} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
              <Tooltip content={(props) => <RichTooltip {...props} />} />
              <Legend />
              <Line type="monotone" dataKey="colesterol_mg_dl" name="Total" stroke={CHART_COLORS.colesterolTotal} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="colesterol_ldl" name="LDL" stroke={CHART_COLORS.colesterolLdl} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="colesterol_hdl" name="HDL" stroke={CHART_COLORS.colesterolHdl} strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3, fill: '#fff' }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null,
    },
  ];

  return (
    <div ref={printRef} id="print-evolucion-zone" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <Link to={`/pacientes/${pacienteId}`} style={{ color: 'var(--color-primario)', fontWeight: 600 }}>
          ← Ver tabla de signos vitales en la ficha
        </Link>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Button type="button" variant="outline" onClick={handlePrint}>
            Imprimir / guardar PDF
          </Button>
        </div>
      </div>

      <div style={{ position: 'sticky', top: 0, zIndex: 2, background: 'var(--color-fondo)', paddingBottom: 'var(--space-2)' }}>
        <TimeRangeFilter value={filtroTiempo} onChange={setFiltroTiempo} />
        <div
          role="region"
          aria-label="Resumen de últimos valores en el período filtrado"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: 'var(--color-fondo-card)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--color-borde-claro)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-texto-secundario)' }}>Peso</div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }} aria-label={trendAriaLabel(pesoTrend.trend, 'Peso')}>
              {pesoTrend.last != null ? `${pesoTrend.last} kg ${trendArrow(pesoTrend.trend)}` : '—'}
            </div>
            {lastPesoDate && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-texto-secundario)' }}>Última: {formatDateTime(lastPesoDate)}</div>}
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-texto-secundario)' }}>Glucosa</div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }} aria-label={trendAriaLabel(glucTrend.trend, 'Glucosa')}>
              {glucTrend.last != null ? `${glucTrend.last} mg/dL ${trendArrow(glucTrend.trend)}` : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-texto-secundario)' }}>PA sistólica</div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }} aria-label={trendAriaLabel(paTrend.trend, 'Presión sistólica')}>
              {paTrend.last != null ? `${paTrend.last} mmHg ${trendArrow(paTrend.trend)}` : '—'}
            </div>
          </div>
        </div>

        {(focus.diabetes || focus.hipertension) && (
          <div style={{ marginBottom: 'var(--space-3)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>Atajos:</span>
            {focus.diabetes && (
              <Button type="button" size="small" variant="outline" onClick={() => setActiveTab('glucosa')}>
                Glucosa (DM2)
              </Button>
            )}
            {focus.hipertension && (
              <Button type="button" size="small" variant="outline" onClick={() => setActiveTab('presion')}>
                Presión (HTA)
              </Button>
            )}
            {(focus.diabetes || focus.hipertension) && hasPeso && (
              <Button type="button" size="small" variant="outline" onClick={() => setActiveTab('antropometria')}>
                Peso / antropometría
              </Button>
            )}
          </div>
        )}
      </div>

      {!hasAnyChart && (
        <p style={{ color: 'var(--color-texto-secundario)', padding: 'var(--space-4)' }}>
          No hay series numéricas en este período. Registra al menos peso, glucosa, presión o analíticas en Signos vitales.
        </p>
      )}

      {hasAnyChart && (
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} destroyInactiveTabPane />
      )}

      <Modal
        open={detalleMesOpen}
        onClose={() => {
          setDetalleMesOpen(false);
          setMesSeleccionado(null);
        }}
        title={mesSeleccionado ? `Desglose: ${mesSeleccionado.mesLabel}` : 'Desglose'}
        footer={null}
        width={560}
        destroyOnClose
      >
        {mesSeleccionado && (() => {
          const signosMes = mesSeleccionado.signos || [];
          const diasUnicos = [];
          const seen = new Set();
          signosMes.forEach((s) => {
            const raw = s.fecha_medicion || s.fecha_registro || s.fecha_creacion;
            if (raw) {
              const d = new Date(raw);
              if (!Number.isNaN(d.getTime())) {
                const key = d.toISOString().slice(0, 10);
                if (!seen.has(key)) {
                  seen.add(key);
                  diasUnicos.push({ key, label: formatDate(raw) });
                }
              }
            }
          });
          diasUnicos.sort((a, b) => b.key.localeCompare(a.key));
          const registrosFiltrados =
            diaFiltro === 'todos'
              ? [...signosMes].sort((a, b) => new Date(b.fecha_medicion || b.fecha_registro) - new Date(a.fecha_medicion || a.fecha_registro))
              : signosMes
                  .filter((s) => {
                    const raw = s.fecha_medicion || s.fecha_registro || s.fecha_creacion;
                    return raw && raw.slice(0, 10) === diaFiltro;
                  })
                  .sort((a, b) => new Date(b.fecha_medicion || b.fecha_registro) - new Date(a.fecha_medicion || a.fecha_registro));
          return (
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-fondo-secundario)', borderRadius: 'var(--radius)' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-texto-secundario)' }}>Total mediciones: </span>
                <span style={{ fontWeight: 700 }}>{mesSeleccionado.totalRegistros ?? signosMes.length}</span>
              </div>
              {diasUnicos.length > 1 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 'var(--text-sm)' }}>Filtrar por día</label>
                  <Select
                    options={[{ value: 'todos', label: 'Todos los días' }, ...diasUnicos.map((d) => ({ value: d.key, label: d.label }))]}
                    value={diaFiltro}
                    onChange={(val) => setDiaFiltro(val ?? 'todos')}
                    placeholder="Todos los días"
                  />
                </div>
              )}
              <h4 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-base)' }}>Registros ({registrosFiltrados.length})</h4>
              {registrosFiltrados.length === 0 ? (
                <p style={{ color: 'var(--color-texto-secundario)' }}>No hay registros para el filtro seleccionado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {registrosFiltrados.map((signo, idx) => {
                    const fechaRaw = signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion;
                    const valores = getSignoValores(signo);
                    return (
                      <div
                        key={signo.id_signo_vital ?? `${fechaRaw}-${idx}`}
                        style={{
                          border: '1px solid var(--color-borde-claro)',
                          borderRadius: 'var(--radius)',
                          overflow: 'hidden',
                          background: 'var(--color-fondo-card)',
                        }}
                      >
                        <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--color-fondo-secundario)', borderBottom: '1px solid var(--color-borde-claro)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                          {formatDateTime(fechaRaw)}
                        </div>
                        <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          {valores.length === 0 ? (
                            <span style={{ color: 'var(--color-texto-secundario)', fontSize: 'var(--text-sm)' }}>Sin valores registrados</span>
                          ) : (
                            valores.map((item) => (
                              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <span style={{ color: 'var(--color-texto-secundario)', fontSize: 'var(--text-sm)' }}>{item.label}</span>
                                <span style={{ fontWeight: 600 }}>{item.value}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal
        open={registroDetalleOpen}
        onClose={() => {
          setRegistroDetalleOpen(false);
          setRegistroDetalle(null);
        }}
        title={registroDetalle ? `Registro: ${formatDateTime(registroDetalle.fechaRaw)}` : 'Registro'}
        footer={null}
        width={480}
        destroyOnClose
      >
        {registroDetalle && (() => {
          const valores = getSignoValores(registroDetalle);
          return (
            <div style={{ padding: 'var(--space-2) 0' }}>
              {valores.length === 0 ? (
                <p style={{ color: 'var(--color-texto-secundario)' }}>Sin valores registrados para esta fecha.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {valores.map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-borde-claro)' }}>
                      <span style={{ color: 'var(--color-texto-secundario)' }}>{item.label}</span>
                      <span style={{ fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <div style={{ marginTop: 'var(--space-8)' }}>
        <ComparativaEvolucionSignos signosVitales={signosData} />
      </div>
    </div>
  );
}
