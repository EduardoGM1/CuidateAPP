import { useState, useEffect, useCallback } from 'react';
import { Tabs } from 'antd';
import { PageHeader } from '../../components/shared';
import { Card, Button, LoadingSpinner, Select } from '../../components/ui';
import { getAdminSystemStatus, downloadPacientesAnonimosCsv, getDataAccessLogs } from '../../api/adminOperations';
import { getModulos } from '../../api/modulos';
import { Table } from '../../components/ui';
import { downloadBlob } from '../../utils/reportUtils';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

export default function AdminOperacionesPage() {
  const [tab, setTab] = useState('sistema');
  const [status, setStatus] = useState(null);
  const [statusErr, setStatusErr] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [modulos, setModulos] = useState([]);
  const [moduloFiltro, setModuloFiltro] = useState('');
  const [exporting, setExporting] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsLoading, setLogsLoading] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setStatusErr(null);
    try {
      const s = await getAdminSystemStatus();
      setStatus(s);
    } catch (e) {
      setStatusErr(e?.response?.data?.error || e?.message || 'Error');
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await getDataAccessLogs({ limit: 100, offset: 0 });
      setLogs(res?.items ?? []);
      setLogsTotal(res?.total ?? 0);
    } catch {
      setLogs([]);
      setLogsTotal(0);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (tab === 'export') {
      getModulos().then((m) => setModulos(Array.isArray(m) ? m : [])).catch(() => setModulos([]));
    }
    if (tab === 'accesos') loadLogs();
  }, [tab, loadLogs]);

  useOnboardingPageReady(!loadingStatus);

  const handlePacientesAnon = async () => {
    setExporting(true);
    try {
      const blob = await downloadPacientesAnonimosCsv({
        id_modulo: moduloFiltro || undefined,
      });
      downloadBlob(blob, `pacientes-anonimos-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      window.alert(e?.response?.data?.error || e?.message || 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const logColumns = [
    { key: 'created_at', label: 'Fecha', render: (r) => formatDateTime(r.created_at) },
    { key: 'usuario_email', label: 'Usuario', render: (r) => sanitizeForDisplay(r.usuario_email) || '—' },
    { key: 'accion', label: 'Acción', render: (r) => sanitizeForDisplay(r.accion) },
    { key: 'recurso_tipo', label: 'Recurso', render: (r) => sanitizeForDisplay(r.recurso_tipo) },
    { key: 'id_recurso', label: 'ID', render: (r) => (r.id_recurso != null ? r.id_recurso : '—') },
    { key: 'ip_address', label: 'IP', render: (r) => sanitizeForDisplay(r.ip_address) || '—' },
  ];

  return (
    <div>
      <PageHeader title="Operaciones (admin)" />
      <Tabs activeKey={tab} onChange={setTab} items={[
        {
          key: 'sistema',
          label: 'Sistema',
          children: (
            <Card>
              {loadingStatus && <LoadingSpinner />}
              {statusErr && <p style={{ color: 'var(--color-error)' }}>{statusErr}</p>}
              {status && !loadingStatus && (
                <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.7 }}>
                  <li>Estado: <strong>{status.status}</strong></li>
                  <li>Versión API: {sanitizeForDisplay(status.version)}</li>
                  {status.gitSha && <li>Git SHA: {sanitizeForDisplay(status.gitSha)}</li>}
                  <li>Node: {sanitizeForDisplay(status.node)}</li>
                  <li>Uptime (s): {status.uptimeSec}</li>
                  <li>Base de datos: {status.database?.ok ? 'OK' : 'Error'} {status.database?.latencyMs != null ? `(${status.database.latencyMs} ms)` : ''}</li>
                  <li>Marca de tiempo: {formatDateTime(status.timestamp)}</li>
                </ul>
              )}
              <Button type="button" variant="outline" style={{ marginTop: '1rem' }} onClick={loadStatus}>
                Actualizar
              </Button>
            </Card>
          ),
        },
        {
          key: 'export',
          label: 'Exportaciones',
          children: (
            <Card>
              <p style={{ color: 'var(--color-texto-secundario)', marginTop: 0 }}>
                Listado de pacientes sin nombres ni datos de contacto (referencia anónima, módulo y metadatos).
                La auditoría completa con filtros está en <strong>Auditoría</strong> (exportación CSV en servidor desde esa pantalla).
              </p>
              <div style={{ maxWidth: 360, marginBottom: '1rem' }}>
                <Select
                  label="Filtrar por módulo (opcional)"
                  value={moduloFiltro || undefined}
                  onChange={(v) => setModuloFiltro(v ?? '')}
                  options={[
                    { value: '', label: 'Todos los módulos' },
                    ...modulos.map((m) => ({ value: String(m.id_modulo), label: m.nombre_modulo || `Módulo ${m.id_modulo}` })),
                  ]}
                />
              </div>
              <Button type="button" variant="primary" onClick={handlePacientesAnon} disabled={exporting}>
                {exporting ? 'Generando…' : 'Descargar CSV pacientes (anonimizado)'}
              </Button>
            </Card>
          ),
        },
        {
          key: 'accesos',
          label: 'Accesos a datos sensibles',
          children: (
            <Card>
              <p style={{ color: 'var(--color-texto-secundario)', marginTop: 0 }}>
                Registro de lecturas de ficha de paciente por doctores y administradores (vía API).
              </p>
              <Table columns={logColumns} data={logs} loading={logsLoading} emptyMessage="Sin registros" />
              {!logsLoading && logsTotal > 0 && (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>Mostrando {logs.length} de {logsTotal}</p>
              )}
            </Card>
          ),
        },
      ]} />
    </div>
  );
}
