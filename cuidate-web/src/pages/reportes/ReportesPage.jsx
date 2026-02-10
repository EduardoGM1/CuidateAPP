import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getReporteEstadisticasHTML } from '../../api/reportes';
import { getModulos } from '../../api/modulos';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input, Select } from '../../components/ui';
import { openHTMLInNewWindow, downloadAsFile } from '../../utils/reportUtils';
import { useAuthStore } from '../../stores/authStore';
import { sanitizeForDisplay } from '../../utils/sanitize';

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
  const queryClient = useQueryClient();
  const [modulos, setModulos] = useState([]);
  const [filtroModulo, setFiltroModulo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleFetch = useCallback(
    async (mode) => {
      setLoading(true);
      setError(null);
      try {
        const html = await queryClient.fetchQuery({
          queryKey: [
            'reporteEstadisticas',
            params.modulo || null,
            params.fechaInicio || null,
            params.fechaFin || null,
          ],
          queryFn: () => getReporteEstadisticasHTML(params),
        });
        if (mode === 'view') {
          openHTMLInNewWindow(html, 'Reporte de estadísticas');
        } else {
          const filename = `reporte-estadisticas-${new Date()
            .toISOString()
            .slice(0, 10)}.html`;
          downloadAsFile(html, filename);
        }
      } catch (err) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Error al cargar el reporte de estadísticas'
        );
      } finally {
        setLoading(false);
      }
    },
    [params.modulo, params.fechaInicio, params.fechaFin, queryClient]
  );

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
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1rem',
            alignItems: 'flex-end',
          }}
        >
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
          variant="primary"
          type="button"
          disabled={loading}
          onClick={() => handleFetch('view')}
        >
          {loading ? 'Cargando…' : 'Ver en nueva pestaña'}
        </Button>
        <Button
          variant="outline"
          type="button"
          disabled={loading}
          onClick={() => handleFetch('download')}
        >
          Descargar HTML
        </Button>
      </div>
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

export default function ReportesPage() {
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isDoctor = useAuthStore((s) => s.isDoctor);

  return (
    <div>
      <PageHeader title="Reportes" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        {(isAdmin() || isDoctor()) && <ReporteEstadisticasCard />}
        {isAdmin() && <ReportePacientesActivosCard />}
        {(isAdmin() || isDoctor()) && <ReporteCitasPorEstadoCard />}
      </div>
    </div>
  );
}
