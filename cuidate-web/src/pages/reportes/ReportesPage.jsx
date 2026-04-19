import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { openReporteEstadisticasPDF } from '../../api/reportes';
import { getPacientes } from '../../api/pacientes';
import { getModulos } from '../../api/modulos';
import { getDoctorSummary } from '../../api/dashboard';
import { getFormaListaPacientes } from '../../api/reportes';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input, Select } from '../../components/ui';
import { LoadingSpinner } from '../../components/ui';
import ComorbilidadesHeatmap from '../../components/reportes/ComorbilidadesHeatmap';
import { ReportesBarChart, ReportesPieChart, ReportesHorizontalBarChart } from '../../components/reportes/ReportesCharts';
import { downloadFormaExcel } from '../../utils/formaExcelUtils';
import StatCard, { IconUsers, IconUser, IconCalendar, IconTrendingUp, IconMessageCircle, IconAlertTriangle } from '../../components/dashboard/StatCard';
import { useAuthStore } from '../../stores/authStore';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { PAGE_SIZE_MAX } from '../../utils/constants';
import { useReportesSummary } from '../../hooks/useReportesSummary';
import { useReportesDetalle } from '../../hooks/useReportesDetalle';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

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

function ReporteFormaExcelCard() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [modulos, setModulos] = useState([]);
  const [filtroModulo, setFiltroModulo] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modoFecha, setModoFecha] = useState('mes');
  const [mesSeleccionado, setMesSeleccionado] = useState(String(new Date().getMonth() + 1));
  const [anioSeleccionado, setAnioSeleccionado] = useState(String(new Date().getFullYear()));
  const [fechaDia, setFechaDia] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    if (!isAdmin()) return;
    getModulos()
      .then((list) => setModulos(Array.isArray(list) ? list : []))
      .catch(() => setModulos([]));
  }, [isAdmin]);

  const handleDescargar = useCallback(async () => {
    setError(null);
    const apiParams = {};
    if (isAdmin() && filtroModulo && parseInt(filtroModulo, 10) > 0) {
      apiParams.modulo = parseInt(filtroModulo, 10);
    }

    let filename = 'forma-pacientes.xlsx';

    if (modoFecha === 'rango') {
      if (!fechaInicio || !fechaFin) {
        const msg = 'Indica fecha de inicio y fecha de fin del rango';
        setError(msg);
        message.error(msg);
        return;
      }
      apiParams.fechaInicio = fechaInicio;
      apiParams.fechaFin = fechaFin;
      const a = fechaInicio.replace(/-/g, '');
      const b = fechaFin.replace(/-/g, '');
      filename = `forma-pacientes-${a}-${b}.xlsx`;
    } else {
      let mes = parseInt(mesSeleccionado, 10);
      let anio = parseInt(anioSeleccionado, 10);
      let dia = null;
      if (modoFecha === 'dia') {
        if (!fechaDia) {
          const msg = 'Selecciona una fecha (día)';
          setError(msg);
          message.error(msg);
          return;
        }
        const [anioStr, mesStr, diaStr] = fechaDia.split('-');
        anio = parseInt(anioStr, 10);
        mes = parseInt(mesStr, 10);
        dia = parseInt(diaStr, 10);
      }
      if (!mes || mes < 1 || mes > 12 || !anio || anio < 2000 || anio > 2100) {
        const msg = 'Mes o año inválido';
        setError(msg);
        message.error(msg);
        return;
      }
      apiParams.mes = mes;
      apiParams.anio = anio;
      if (dia != null) apiParams.dia = dia;
      const fileNameBase = `forma-pacientes-${anio}-${String(mes).padStart(2, '0')}`;
      filename = dia != null ? `${fileNameBase}-${String(dia).padStart(2, '0')}.xlsx` : `${fileNameBase}.xlsx`;
    }

    setLoading(true);
    try {
      const data = await getFormaListaPacientes(apiParams);
      const { truncado, ...excelPayload } = data;
      await downloadFormaExcel(excelPayload, filename);
      if (truncado) {
        message.warning(
          'La lista supera el límite de exportación: se incluyen los primeros pacientes según el orden del sistema.',
        );
      }
      message.success('Descarga iniciada');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error al descargar FORMA';
      setError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [
    isAdmin,
    filtroModulo,
    modoFecha,
    mesSeleccionado,
    anioSeleccionado,
    fechaDia,
    fechaInicio,
    fechaFin,
  ]);

  const canFilterByModulo = isAdmin() && modulos.length > 0;

  return (
    <ReporteCardWrapper
      title="FORMA Excel (listado de pacientes)"
      description={
        isAdmin()
          ? 'Exporta un Excel con el FORMA de todos los pacientes activos (opcional: filtra por módulo). Puedes elegir mes completo, un día o un rango de fechas (máx. 370 días).'
          : 'Exporta un Excel con el FORMA de tus pacientes asignados. Elige mes completo, un día o un rango de fechas (máx. 370 días).'
      }
    >
      {error && (
        <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.875rem' }}>
          {error}
        </p>
      )}
      <div className="form-row-inline" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
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
        <Select
          label="Filtrar por"
          value={modoFecha}
          onChange={(v) => setModoFecha(v || 'mes')}
          options={[
            { value: 'mes', label: 'Mes' },
            { value: 'dia', label: 'Día' },
            { value: 'rango', label: 'Rango de fechas' },
          ]}
          style={{ marginBottom: 0, minWidth: 160 }}
        />
        {modoFecha === 'mes' ? (
          <>
            <Select
              label="Mes"
              value={mesSeleccionado}
              onChange={(v) => setMesSeleccionado(v ?? '')}
              options={MESES.map((m) => ({ value: String(m.value), label: m.label }))}
              style={{ marginBottom: 0, minWidth: 140 }}
            />
            <Input
              label="Año"
              type="number"
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(e.target.value)}
              style={{ marginBottom: 0, width: 110 }}
            />
          </>
        ) : modoFecha === 'dia' ? (
          <Input
            label="Fecha (día)"
            type="date"
            value={fechaDia}
            onChange={(e) => setFechaDia(e.target.value)}
            style={{ marginBottom: 0, minWidth: 180 }}
          />
        ) : (
          <>
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
          </>
        )}
      </div>
      <Button variant="outline" type="button" disabled={loading} onClick={handleDescargar}>
        {loading ? 'Generando…' : 'Descargar Excel'}
      </Button>
    </ReporteCardWrapper>
  );
}

const PERIODO_OPCIONES = [
  { value: '', label: 'Sin agrupar' },
  { value: 'semestre', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'mensual', label: 'Rango de meses' },
];
const MESES = [
  { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
];

/**
 * Tarjeta con heatmap de comorbilidades más frecuentes.
 * Admin: carga pacientes con filtro por módulo. Doctor: usa getDoctorSummary con estado, periodo y rango de meses.
 * Si summaryFromParent está disponible y es Doctor con filtros por defecto, reutiliza esos datos para evitar una segunda petición y timeouts.
 */
function ReporteComorbilidadesHeatmapCard({ summaryFromParent }) {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isDoctor = useAuthStore((s) => s.isDoctor);
  const [modulos, setModulos] = useState([]);
  const [filtroModulo, setFiltroModulo] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [periodoFiltro, setPeriodoFiltro] = useState('');
  const [rangoMeses, setRangoMeses] = useState({ mesInicio: '', mesFin: '', año: new Date().getFullYear() });
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filtrosPorDefecto = !estadoFiltro && !periodoFiltro;
  const puedeUsarSummaryPadre = isDoctor() && summaryFromParent?.chartData && filtrosPorDefecto;

  useEffect(() => {
    if (isAdmin()) {
      getModulos()
        .then((list) => setModulos(Array.isArray(list) ? list : []))
        .catch(() => setModulos([]));
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!puedeUsarSummaryPadre) return;
    const chartData = summaryFromParent.chartData;
    let list = [];
    if (Array.isArray(chartData.comorbilidadesMasFrecuentes)) {
      list = chartData.comorbilidadesMasFrecuentes.map((c) => ({
        nombre: c.nombre ?? c.nombre_comorbilidad ?? '—',
        frecuencia: c.frecuencia ?? c.pacientes_afectados ?? 0,
      }));
    }
    setDatos(list);
    setLoading(false);
    setError(null);
  }, [puedeUsarSummaryPadre, summaryFromParent]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDoctor()) {
        const params = {};
        if (estadoFiltro) params.estado = estadoFiltro;
        if (periodoFiltro) params.periodo = periodoFiltro;
        if (periodoFiltro === 'mensual' && rangoMeses.mesInicio && rangoMeses.mesFin && rangoMeses.año) {
          params.mesInicio = Number(rangoMeses.mesInicio);
          params.mesFin = Number(rangoMeses.mesFin);
          params.año = Number(rangoMeses.año);
        }
        const summary = await getDoctorSummary(params);
        const chartData = summary?.chartData ?? {};
        let list = [];
        if (params.periodo && Array.isArray(chartData.comorbilidadesPorPeriodo) && chartData.comorbilidadesPorPeriodo.length > 0) {
          const first = chartData.comorbilidadesPorPeriodo[0];
          list = (first?.comorbilidades ?? []).map((c) => ({
            nombre: c.nombre ?? c.nombre_comorbilidad ?? '—',
            frecuencia: c.frecuencia ?? c.pacientes_afectados ?? 0,
          }));
        } else if (Array.isArray(chartData.comorbilidadesMasFrecuentes)) {
          list = chartData.comorbilidadesMasFrecuentes.map((c) => ({
            nombre: c.nombre ?? c.nombre_comorbilidad ?? '—',
            frecuencia: c.frecuencia ?? c.pacientes_afectados ?? 0,
          }));
        }
        setDatos(list);
        return;
      }
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
  }, [isDoctor, filtroModulo, estadoFiltro, periodoFiltro, rangoMeses.mesInicio, rangoMeses.mesFin, rangoMeses.año]);

  const skipLoadParaEsperarSummary = isDoctor() && filtrosPorDefecto && (summaryFromParent == null || summaryFromParent?.chartData != null);
  useEffect(() => {
    if (skipLoadParaEsperarSummary) return;
    load();
  }, [load, skipLoadParaEsperarSummary]);

  const descripcion = isAdmin()
    ? 'Heatmap de comorbilidades según frecuencia en pacientes activos. Filtro por módulo.'
    : 'Heatmap de comorbilidades según frecuencia en tus pacientes. Filtra por estado y agrupa por periodo.';

  return (
    <ReporteCardWrapper title="Comorbilidades más frecuentes" description={descripcion}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
        {isAdmin() && modulos.length > 0 && (
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
            style={{ marginBottom: 0, minWidth: 180 }}
          />
        )}
        {isDoctor() && (
          <>
            <Select
              label="Estado"
              placeholder="Todos"
              value={estadoFiltro || undefined}
              onChange={(v) => setEstadoFiltro(v ?? '')}
              options={[
                { value: '', label: 'Todos' },
                { value: 'activos', label: 'Activos' },
                { value: 'inactivos', label: 'Inactivos' },
              ]}
              style={{ marginBottom: 0, minWidth: 120 }}
            />
            <Select
              label="Agrupar por periodo"
              placeholder="Sin agrupar"
              value={periodoFiltro || undefined}
              onChange={(v) => setPeriodoFiltro(v ?? '')}
              options={PERIODO_OPCIONES}
              style={{ marginBottom: 0, minWidth: 160 }}
            />
            {periodoFiltro === 'mensual' && (
              <>
                <Select
                  label="Mes inicio"
                  value={rangoMeses.mesInicio ? String(rangoMeses.mesInicio) : undefined}
                  onChange={(v) => setRangoMeses((prev) => ({ ...prev, mesInicio: v ? Number(v) : '' }))}
                  options={[{ value: '', label: '—' }, ...MESES.map((m) => ({ value: String(m.value), label: m.label }))]}
                  style={{ marginBottom: 0, minWidth: 130 }}
                />
                <Select
                  label="Mes fin"
                  value={rangoMeses.mesFin ? String(rangoMeses.mesFin) : undefined}
                  onChange={(v) => setRangoMeses((prev) => ({ ...prev, mesFin: v ? Number(v) : '' }))}
                  options={[{ value: '', label: '—' }, ...MESES.map((m) => ({ value: String(m.value), label: m.label }))]}
                  style={{ marginBottom: 0, minWidth: 130 }}
                />
                <Input
                  label="Año"
                  type="number"
                  value={rangoMeses.año || ''}
                  onChange={(e) => setRangoMeses((prev) => ({ ...prev, año: e.target.value ? Number(e.target.value) : '' }))}
                  style={{ marginBottom: 0, width: 100 }}
                />
              </>
            )}
          </>
        )}
      </div>
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
  const puedeVerDetalle = admin || isDoctor();
  const detalle = useReportesDetalle({
    enabled: puedeVerDetalle && !loadingSummary && summary != null,
  });
  const showDetalle = puedeVerDetalle && !detalle.loading;

  const reportesListos = !loadingSummary && (!puedeVerDetalle || !detalle.loading);
  useOnboardingPageReady(reportesListos);

  const chartData = summary?.chartData ?? {};
  const charts = summary?.charts ?? {};

  const citasPorEstadoPie = charts.citasPorEstado && typeof charts.citasPorEstado === 'object'
    ? Object.entries(charts.citasPorEstado)
        .filter(([, v]) => Number(v) > 0)
        .map(([name, value]) => ({ name, value: Number(value) }))
    : [];

  const m = summary?.metrics ?? {};

  return (
    <div data-tour="section-reportes-root">
      <PageHeader title="Reportes" />

      {/* Resumen (métricas) - paridad con app móvil */}
      {(admin || isDoctor()) && (
        <section className="saas-section" aria-label="Resumen" style={{ marginBottom: '1.5rem' }} data-tour="section-reportes-summary">
          <h2 className="saas-section-title">Resumen</h2>
          {loadingSummary && (
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
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
            <div className="saas-stats">
              {admin ? (
                <>
                  <StatCard icon={IconUsers} label="Pacientes totales" value={m.totalPacientes} />
                  <StatCard icon={IconUser} label="Doctores activos" value={m.totalDoctores} />
                  <StatCard
                    icon={IconCalendar}
                    label="Citas hoy"
                    value={m.citasHoy?.total != null ? m.citasHoy.total : m.citasHoy}
                    sublabel={m.citasHoy?.completadas != null ? `Completadas: ${m.citasHoy.completadas}` : ''}
                  />
                  <StatCard
                    icon={IconTrendingUp}
                    label="Tasa de asistencia"
                    value={
                      m.tasaAsistencia?.tasa_asistencia != null
                        ? `${Number(m.tasaAsistencia.tasa_asistencia).toFixed(1)}%`
                        : (m.tasaAsistencia ?? '—')
                    }
                  />
                </>
              ) : (
                <>
                  <StatCard icon={IconUsers} label="Pacientes asignados" value={m.pacientesAsignados} />
                  <StatCard icon={IconCalendar} label="Citas hoy" value={m.citasHoy} />
                  <StatCard
                    icon={IconTrendingUp}
                    label="Tasa activos"
                    value={m.tasaAsistencia != null ? `${Number(m.tasaAsistencia).toFixed(1)}%` : (m.tasaAsistencia ?? '—')}
                  />
                </>
              )}
            </div>
          )}
        </section>
      )}

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
            {puedeVerDetalle && Array.isArray(chartData.pacientesNuevos) && chartData.pacientesNuevos.length > 0 && (
              <ReportesBarChart
                title={admin ? 'Pacientes nuevos (últimos 7 días)' : 'Pacientes nuevos asignados a ti (últimos 7 días)'}
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

      {/* Análisis detallado (Admin y Doctor; sin ranking de doctores más activos arriba) */}
      {puedeVerDetalle && (
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
                  title={admin ? 'Distribución de pacientes por doctor' : 'Pacientes por doctor (tu cartera)'}
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

      {/* Tarjetas: Comorbilidades y Estadísticas generales */}
      <div
        data-tour="section-reportes-detail"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        {(admin || isDoctor()) && <ReporteComorbilidadesHeatmapCard summaryFromParent={summary} />}
        {(admin || isDoctor()) && <ReporteEstadisticasCard />}
        {(admin || isDoctor()) && <ReporteFormaExcelCard />}
      </div>
    </div>
  );
}
