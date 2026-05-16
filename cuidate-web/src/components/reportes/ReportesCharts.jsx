import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from 'recharts';
import { Card } from '../ui';
import { CHART_COLORS, PIE_COLORS } from './chartConfig';

const CHART_HEIGHT = 220;
const HORIZONTAL_BAR_ROW_HEIGHT = 44;

/** Recorta etiqueta larga (eje Y) manteniendo el nombre completo en el tooltip. */
function shortenCategoryLabel(value, maxLen = 34) {
  const text = String(value ?? '').trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

/** Ancho del eje Y según el nombre más largo. */
function yAxisWidthForNames(data, nameKey, min = 120, max = 220) {
  if (!Array.isArray(data) || data.length === 0) return min;
  const longest = data.reduce(
    (maxChars, row) => Math.max(maxChars, String(row[nameKey] ?? '').trim().length),
    0
  );
  return Math.min(max, Math.max(min, Math.ceil(longest * 6.5) + 20));
}

function horizontalBarChartMetrics(data, nameKey = 'nombre') {
  const count = Array.isArray(data) ? data.length : 0;
  const height = Math.max(CHART_HEIGHT, count * HORIZONTAL_BAR_ROW_HEIGHT + 24);
  // Ancho del eje Y (no duplicar en margin.left: eso vaciaba el área del gráfico en cards estrechas)
  const yAxisWidth = yAxisWidthForNames(data, nameKey, 96, 150);
  return {
    height,
    yAxisWidth,
    margin: { top: 8, right: 44, left: 4, bottom: 8 },
  };
}

/**
 * Gráfico de barras verticales (ej: citas por día, pacientes nuevos).
 */
export function ReportesBarChart({ title, data = [], dataKey = 'citas', nameKey = 'dia', barName = 'Citas', color = CHART_COLORS.primary }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  return (
    <Card className="saas-chart-card">
      <h3 className="saas-chart-title">{title}</h3>
      <div className="saas-chart-inner">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde-claro)" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey={dataKey} name={barName} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/**
 * Gráfico de torta (ej: citas por estado, distribución por género).
 */
export function ReportesPieChart({ title, data = [], nameKey = 'name', valueKey = 'value' }) {
  const list = Array.isArray(data) ? data.filter((d) => Number(d[valueKey]) > 0) : [];
  if (list.length === 0) return null;
  return (
    <Card className="saas-chart-card">
      <h3 className="saas-chart-title">{title}</h3>
      <div className="saas-chart-inner">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={list}
              dataKey={valueKey}
              nameKey={nameKey}
              cx="50%"
              cy="45%"
              outerRadius={65}
              label={false}
            >
              {list.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/**
 * Gráfico de barras horizontales (ej: pacientes por doctor, doctores más activos).
 */
export function ReportesHorizontalBarChart({
  title,
  data = [],
  dataKey = 'total_citas',
  nameKey = 'nombre',
  barName = 'Citas',
  color = CHART_COLORS.primary,
}) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const { height, yAxisWidth, margin } = horizontalBarChartMetrics(data, nameKey);

  return (
    <Card className="saas-chart-card">
      <h3 className="saas-chart-title">{title}</h3>
      <div className="saas-chart-inner saas-chart-inner--horizontal-bar" style={{ minHeight: height }}>
        <ResponsiveContainer width="100%" height={height} minWidth={200}>
          <BarChart data={data} layout="vertical" margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde-claro)" />
            <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey={nameKey}
              width={yAxisWidth}
              interval={0}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }}
              tickFormatter={(value) => shortenCategoryLabel(value)}
            />
            <Tooltip
              formatter={(value) => [value, barName]}
              labelFormatter={(label) => String(label ?? '')}
            />
            <Bar dataKey={dataKey} name={barName} fill={color} radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey={dataKey}
                position="right"
                style={{ fill: 'var(--color-texto-primario)', fontSize: 12, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
