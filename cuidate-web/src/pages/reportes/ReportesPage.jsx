import { useState, useCallback, useEffect } from 'react';
import { openReporteEstadisticasPDF } from '../../api/reportes';
import { getPacientes } from '../../api/pacientes';
import { getModulos } from '../../api/modulos';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input, Select } from '../../components/ui';
import { LoadingSpinner } from '../../components/ui';
import ComorbilidadesHeatmap from '../../components/reportes/ComorbilidadesHeatmap';
import { ReportesBarChart, ReportesPieChart, ReportesHorizontalBarChart } from '../../components/reportes/ReportesCharts';
import { IconAlertTriangle } from '../../components/dashboard/StatCard';
import { useAuthStore } from '../../stores/authStore';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { PAGE_SIZE_MAX } from '../../utils/constants';
import { useReportesSummary } from '../../hooks/useReportesSummary';
import { useReportesDetalle } from '../../hooks/useReportesDetalle';

function ReporteCardWrapper({ title, description, children }) {
  return (
    <Card>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: 'var(--color-primario)' }}>
        {title}
      </h2>
      <p
        style={{
          margin: '0 0 1rem',
          color: 'var(--color-texto-secundario)',
          fontSize: '0.95rem',
        }}
      >
        {description}
      </p>
      {children}
    </Card>
  );
}

function ReporteEstadisticasCard() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isDoctor = useAuthStore((s) => s.isDoctor);
  const [modulos, setModulos] = useState([]);
  const [filtroModulo, setFiltroModulo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAdmin()) {
      getModulos()
        .then((list) => setModulos(Array.isArray(list) ? list : []))
        .catch(() => setModulos([]));
    }
  }, [isAdmin]);

  const params = {};
  if (filtroModulo && parseInt(filtroModulo, 10) > 0) params.modulo = parseInt(filtroModulo, 10);
  if (fechaInicio) params.fechaInicio = fechaInicio;
  if (fechaFin) params.fechaFin = fechaFin;

  const handleDescargarPDF = useCallback(async () => {
    setPdfLoading(true);
    setError(null);
    try {
      await openReporteEstadisticasPDF(params);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'Error al generar el reporte para PDF'
      );
    } finally {
      setPdfLoading(false);
    }
  }, [params.modulo, params.fechaInicio, params.fechaFin]);

  const canFilterByModulo = isAdmin() && modulos.length > 0;

  return (
    <ReporteCardWrapper
      title="Estadísticas generales"
      description={
        isAdmin()
          ? 'Resumen global de pacientes, citas y actividad por módulo. Puedes filtrar por módulo y rango de fechas.'
          : 'Resumen de tus pacientes y citas atendidas, por rango de fechas.'
      }
    >
      {(canFilterByModulo || isDoctor()) && (
        <div className="form-row-inline" style={{ marginBottom: '1rem' }}>
          {canFilterByModulo && (
            <Select
              label="Módulo"
              placeholder="Todos"
              value={filtroModulo || undefined}
              onChange={(v) => setFiltroModulo(v ?? '')}
              options={[
                { value: '', label: 'Todos' },
                ...modulos.map((m) => ({
                  value: String(m.id_modulo ?? m.id),
                  label: sanitizeForDisplay(m.nombre_modulo ?? m.nombre) || '—',
                })),
              ]}
              style={{ marginBottom: 0, minWidth: 160 }}
            />
          )}
          <Input
            label="Desde"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            style={{ marginBottom: 0 }}
          />
          <Input
            label="Hasta"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>
      )}
      {error && (
        <p
          style={{
            margin: '0 0 0.75rem',
            color: 'var(--color-error)',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </p>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        <Button
          variant="outline"
          type="button"
          disabled={pdfLoading}
          onClick={handleDescargarPDF}
        >
          {pdfLoading ? 'Cargando…' : 'Descargar PDF'}
        </Button>
      </div>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
        Para guardar como PDF: al abrirse el reporte, usa Imprimir → Guardar como PDF.
      </p>
    </ReporteCardWrapper>
  );
}

function ReportePacientesActivosCard() {
  // Reutilizamos el mismo reporte de estadísticas, pero semánticamente
  // esta card se orienta a pacientes activos/seguimiento.
  return (
    <ReporteCardWrapper
      title="Pacientes activos y seguimiento"
      description="Distribución de pacientes activos, nuevos ingresos y seguimiento clínico en el periodo seleccionado."
    >
      <p
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.9rem',
          color: 'var(--color-texto-secundario)',
        }}
      >
        Usa el reporte de estadísticas generales para analizar pacientes activos y
        su evolución. Para cortes más finos (por módulo, doctor o fecha), ajusta los filtros en la tarjeta de
        estadísticas generales.
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '0.85rem',
          color: 'var(--color-texto-secundario)',
        }}
      >
        Nota: Este reporte se basa en la misma fuente de datos que el reporte de
        estadísticas generales. Los filtros aplicados allí afectarán los datos de
        pacientes activos.
      </p>
    </ReporteCardWrapper>
  );
}

function ReporteCitasPorEstadoCard() {
  return (
    <ReporteCardWrapper
      title="Citas por estado"
      description="Análisis de citas programadas, atendidas, canceladas y no asistidas."
    >
      <p
        style={{
          margin: '0 0 0.75rem',
          fontSize: '0.9rem',
          color: 'var(--color-texto-secundario)',
        }}
      >
        Para ver el detalle por estado de las citas usa el reporte de estadísticas
        generales filtrando por rango de fechas y, si aplica, por módulo. El
        backend consolida los conteos por estado según el diseño definido en los
        documentos de reportes.
      </p>
      <p
        style={{
          margin: 0,
          fontSize: '0.85rem',
          color: 'var(--color-texto-secundario)',
        }}
      >
        Si necesitas una vista diaria, también puedes usar la agenda de citas en
        el módulo de Citas para validar los estados a nivel de cita individual.
      </p>
    </ReporteCardWrapper>
  );
}

/**
 * Tarjeta con heatmap de comorbilidades más frecuentes (en la propia pantalla).
 * Carga pacientes y calcula frecuencias; opcional filtro por módulo (solo Admin).
 */
function ReporteComorbilidadesHeatmapCard() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [modulos, setModulos] = useState([]);
  const [filtroModulo, setFiltroModulo] = useState('');
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAdmin()) {
      getModulos()
        .then((list) => setModulos(Array.isArray(list) ? list : []))
        .catch(() => setModulos([]));
    }
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: PAGE_SIZE_MAX, estado: 'activos' };
      if (filtroModulo && parseInt(filtroModulo, 10) > 0) {
        params.modulo = parseInt(filtroModulo, 10);
      }
      const res = await getPacientes(params);
      const pacientes = res?.pacientes ?? (Array.isArray(res) ? res : []);
      const freq = {};
      (pacientes || []).forEach((p) => {
        const coms = p.comorbilidades ?? [];
        if (!Array.isArray(coms)) return;
        coms.forEach((c) => {
          const nombre = c?.nombre ?? c?.nombre_comorbilidad ?? (typeof c === 'string' ? c : '');
          if (nombre) freq[nombre] = (freq[nombre] || 0) + 1;
        });
      });
      const list = Object.entries(freq)
        .map(([nombre, frecuencia]) => ({ nombre, frecuencia }))
        .sort((a, b) => b.frecuencia - a.frecuencia);
      setDatos(list);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar datos');
      setDatos([]);
    } finally {
      setLoading(false);
    }
  }, [filtroModulo]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ReporteCardWrapper
      title="Comorbilidades más frecuentes"
      description="Heatmap de comorbilidades según frecuencia en pacientes activos. Puedes filtrar por módulo (solo Admin)."
    >
      {isAdmin() && modulos.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <Select
            label="Módulo"
            placeholder="Todos"
            value={filtroModulo || undefined}
            onChange={(v) => setFiltroModulo(v ?? '')}
            options={[
              { value: '', label: 'Todos' },
              ...modulos.map((m) => ({
                value: String(m.id_modulo ?? m.id),
                label: sanitizeForDisplay(m.nombre_modulo ?? m.nombre) || '—',
              })),
            ]}
            style={{ marginBottom: 0, minWidth: 200 }}
          />
        </div>
      )}
      {error && (
        <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.875rem' }}>
          {error}
        </p>
      )}
      {loading ? (
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      ) : (
        <ComorbilidadesHeatmap datos={datos} />
      )}
    </ReporteCardWrapper>
  );
}

export default function ReportesPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isDoctor = useAuthStore((s) => s.isDoctor);
  const admin = isAdmin();
  const { summary, loading: loadingSummary, error: errorSummary, refresh: refreshSummary } = useReportesSummary({ isAdmin: admin });
  const detalle = useReportesDetalle();
  const showDetalle = admin && !detalle.loading;

  const chartData = summary?.chartData ?? {};
  const charts = summary?.charts ?? {};

  const citasPorEstadoPie = charts.citasPorEstado && typeof charts.citasPorEstado === 'object'
    ? Object.entries(charts.citasPorEstado)
        .filter(([, v]) => Number(v) > 0)
        .map(([name, value]) => ({ name, value: Number(value) }))
    : [];

  return (
    <div>
      <PageHeader title="Reportes" />

      {/* Gráficos (citas 7 días, pacientes nuevos, etc.) */}
      {(admin || isDoctor()) && (
        <section className="saas-section" aria-labelledby="reportes-graficos-title" style={{ marginBottom: '1.5rem' }}>
          <h2 id="reportes-graficos-title" className="saas-section-title">
            Gráficos
          </h2>
          {loadingSummary && (
            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <LoadingSpinner />
            </div>
          )}
          {errorSummary && (
            <Card style={{ marginBottom: '1rem', backgroundColor: 'var(--color-fondo-error-claro)', borderColor: 'var(--color-error)' }}>
              <p style={{ margin: 0, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconAlertTriangle />
                {errorSummary}
              </p>
              <Button variant="outline" type="button" style={{ marginTop: '0.75rem' }} onClick={refreshSummary}>
                Reintentar
              </Button>
            </Card>
          )}
          {!loadingSummary && !errorSummary && summary && (
          <div className="saas-charts-grid">
            {Array.isArray(chartData.citasUltimos7Dias) && chartData.citasUltimos7Dias.length > 0 && (
              <ReportesBarChart
                title={admin ? 'Citas últimos 7 días' : 'Mis citas últimos 7 días'}
                data={chartData.citasUltimos7Dias}
                dataKey="citas"
                nameKey="dia"
                barName="Citas"
              />
            )}
            {admin && Array.isArray(chartData.pacientesNuevos) && chartData.pacientesNuevos.length > 0 && (
              <ReportesBarChart
                title="Pacientes nuevos (últimos 7 días)"
                data={chartData.pacientesNuevos}
                dataKey="pacientes"
                nameKey="dia"
                barName="Pacientes"
                color="#94a3b8"
              />
            )}
            {citasPorEstadoPie.length > 0 && (
              <ReportesPieChart title="Citas por estado" data={citasPorEstadoPie} nameKey="name" valueKey="value" />
            )}
            {admin && Array.isArray(charts.doctoresActivos) && charts.doctoresActivos.length > 0 && (
              <ReportesHorizontalBarChart
                title="Doctores más activos (por citas)"
                data={charts.doctoresActivos}
                dataKey="total_citas"
                nameKey="nombre"
                barName="Citas"
              />
            )}
          </div>
          )}
        </section>
      )}

      {/* Análisis detallado (solo Admin) */}
      {admin && (
        <section className="saas-section" aria-labelledby="reportes-detalle-title" style={{ marginBottom: '1.5rem' }}>
          <h2 id="reportes-detalle-title" className="saas-section-title">
            Análisis detallado
          </h2>
          {detalle.loading && (
            <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <LoadingSpinner />
            </div>
          )}
          {detalle.error && (
            <Card style={{ marginBottom: '1rem', backgroundColor: 'var(--color-fondo-error-claro)', borderColor: 'var(--color-error)' }}>
              <p style={{ margin: 0, color: 'var(--color-error)' }}>{detalle.error}</p>
              <Button variant="outline" type="button" style={{ marginTop: '0.75rem' }} onClick={detalle.refresh}>
                Reintentar
              </Button>
            </Card>
          )}
          {showDetalle && !detalle.error && (
            <div className="saas-charts-grid">
              {detalle.pacientesPorDoctor.length > 0 && (
                <ReportesHorizontalBarChart
                  title="Distribución de pacientes por doctor"
                  data={detalle.pacientesPorDoctor}
                  dataKey="total"
                  nameKey="nombre"
                  barName="Pacientes"
                />
              )}
              {detalle.citasPorDiaSemana.some((d) => d.citas > 0) && (
                <ReportesBarChart
                  title="Citas por día de la semana"
                  data={detalle.citasPorDiaSemana}
                  dataKey="citas"
                  nameKey="dia"
                  barName="Citas"
                />
              )}
              {detalle.distribucionEdad.length > 0 && (
                <ReportesPieChart
                  title="Distribución por edad"
                  data={detalle.distribucionEdad}
                  nameKey="name"
                  valueKey="value"
                />
              )}
              {detalle.distribucionGenero.length > 0 && (
                <ReportesPieChart
                  title="Distribución por género"
                  data={detalle.distribucionGenero}
                  nameKey="name"
                  valueKey="value"
                />
              )}
            </div>
          )}
        </section>
      )}

      {/* Tarjetas: Comorbilidades primero, luego Estadísticas, Pacientes activos, Citas por estado */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        {(admin || isDoctor()) && <ReporteComorbilidadesHeatmapCard />}
        {(admin || isDoctor()) && <ReporteEstadisticasCard />}
        {admin && <ReportePacientesActivosCard />}
        {(admin || isDoctor()) && <ReporteCitasPorEstadoCard />}
      </div>
    </div>
  );
}
