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
  return (
    <Card className="saas-chart-card">
      <h3 className="saas-chart-title">{title}</h3>
      <div className="saas-chart-inner">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 36, left: 60, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-borde-claro)" />
            <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
            <YAxis type="category" dataKey={nameKey} width={55} tick={{ fontSize: 11 }} />
            <Tooltip />
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
