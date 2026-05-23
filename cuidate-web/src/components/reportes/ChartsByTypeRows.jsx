/**
 * Agrupa gráficos en filas: primero barras (vertical/horizontal), luego pastel.
 */
export default function ChartsByTypeRows({ bars = [], pies = [] }) {
  const barItems = bars.filter(Boolean);
  const pieItems = pies.filter(Boolean);
  if (barItems.length === 0 && pieItems.length === 0) return null;

  return (
    <div className="saas-charts-rows">
      {barItems.length > 0 && (
        <div className="saas-charts-grid" data-chart-type="bar" aria-label="Gráficos de barras">
          {barItems}
        </div>
      )}
      {pieItems.length > 0 && (
        <div className="saas-charts-grid" data-chart-type="pie" aria-label="Gráficos de pastel">
          {pieItems}
        </div>
      )}
    </div>
  );
}
