import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditoria, getAuditoriaUsuarios } from '../../api/auditoria';
import { Table, Button } from '../../components/ui';
import { PageHeader, SearchFilterBar } from '../../components/shared';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatDateTime } from '../../utils/format';
import { PAGE_SIZE_DEFAULT } from '../../utils/constants';

const COLUMNS = [
  {
    key: 'fecha_creacion',
    label: 'Fecha',
    render: (row) => formatDateTime(row.fecha_creacion),
  },
  { key: 'tipo_accion', label: 'Tipo', render: (row) => sanitizeForDisplay(row.tipo_accion) || '—' },
  { key: 'entidad_afectada', label: 'Entidad', render: (row) => sanitizeForDisplay(row.entidad_afectada) || '—' },
  { key: 'usuario_nombre', label: 'Usuario', render: (row) => sanitizeForDisplay(row.usuario_nombre) || '—' },
  {
    key: 'descripcion',
    label: 'Descripción',
    render: (row) => {
      const d = row.descripcion;
      if (!d) return '—';
      const s = String(d).slice(0, 80);
      return sanitizeForDisplay(s) + (String(d).length > 80 ? '…' : '');
    },
  },
  { key: 'severidad', label: 'Severidad', render: (row) => sanitizeForDisplay(row.severidad) || '—' },
];

export default function AuditoriaList() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({
    page: 1,
    limit: PAGE_SIZE_DEFAULT,
  });

  const loadUsuarios = useCallback(async () => {
    try {
      const data = await getAuditoriaUsuarios();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch {
      setUsuarios([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditoria({
        page: params.page,
        limit: params.limit,
        tipo_accion: params.tipo_accion,
        fecha_desde: params.fecha_desde,
        fecha_hasta: params.fecha_hasta,
        id_usuario: params.id_usuario,
        search: params.search,
        severidad: params.severidad,
      });
      setList(res?.auditoria ?? []);
      setTotal(res?.total ?? 0);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar auditoría');
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.tipo_accion, params.fecha_desde, params.fecha_hasta, params.id_usuario, params.search, params.severidad]);

  useEffect(() => {
    loadUsuarios();
  }, [loadUsuarios]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (searchParams) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      tipo_accion: searchParams.tipo_accion,
      fecha_desde: searchParams.fecha_desde,
      fecha_hasta: searchParams.fecha_hasta,
      id_usuario: searchParams.id_usuario ? Number(searchParams.id_usuario) : undefined,
      search: searchParams.search,
      severidad: searchParams.severidad,
    }));
  };

  const filterOptions = [
    {
      key: 'tipo_accion',
      label: 'Tipo',
      options: [
        { value: '', label: 'Todos' },
        { value: 'login', label: 'Login' },
        { value: 'logout', label: 'Logout' },
        { value: 'create', label: 'Crear' },
        { value: 'update', label: 'Actualizar' },
        { value: 'delete', label: 'Eliminar' },
      ],
    },
    {
      key: 'severidad',
      label: 'Severidad',
      options: [
        { value: '', label: 'Todas' },
        { value: 'info', label: 'Info' },
        { value: 'warning', label: 'Advertencia' },
        { value: 'error', label: 'Error' },
      ],
    },
  ];
  if (usuarios.length > 0) {
    filterOptions.push({
      key: 'id_usuario',
      label: 'Usuario',
      options: [
        { value: '', label: 'Todos' },
        ...usuarios.map((u) => ({ value: String(u.id_usuario), label: sanitizeForDisplay(u.email) || '—' })),
      ],
    });
  }

  const handleRowClick = (row) => {
    const id = row.id_auditoria ?? row.id;
    if (id) navigate(`/admin/auditoria/${id}`);
  };

  const applyFechas = () => {
    setParams((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div>
      <PageHeader title="Auditoría" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div style={{ minWidth: 140 }}>
          <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-texto-secundario)' }}>Desde</label>
          <input
            type="date"
            value={params.fecha_desde || ''}
            onChange={(e) => setParams((p) => ({ ...p, page: 1, fecha_desde: e.target.value || undefined }))}
            style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-borde-claro)', backgroundColor: 'var(--color-fondo-card)', minWidth: 140 }}
          />
        </div>
        <div style={{ minWidth: 140 }}>
          <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-texto-secundario)' }}>Hasta</label>
          <input
            type="date"
            value={params.fecha_hasta || ''}
            onChange={(e) => setParams((p) => ({ ...p, page: 1, fecha_hasta: e.target.value || undefined }))}
            style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-borde-claro)', backgroundColor: 'var(--color-fondo-card)', minWidth: 140 }}
          />
        </div>
        <Button type="button" variant="secondary" onClick={applyFechas}>Aplicar fechas</Button>
      </div>
      <SearchFilterBar
        placeholder="Buscar en descripción..."
        filterOptions={filterOptions}
        initialFilters={{
          tipo_accion: params.tipo_accion || '',
          severidad: params.severidad || '',
          id_usuario: params.id_usuario ? String(params.id_usuario) : '',
        }}
        onSearch={handleSearch}
      />
      {error && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--color-fondo-error-claro)', color: 'var(--color-error)', borderRadius: 'var(--radius)' }}>
          {error}
          <Button variant="outline" type="button" style={{ marginLeft: '1rem' }} onClick={load}>
            Reintentar
          </Button>
        </div>
      )}
      <Table
        columns={COLUMNS}
        data={list}
        loading={loading}
        emptyMessage="No hay registros de auditoría"
        onRowClick={handleRowClick}
      />
      {!loading && list.length > 0 && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
          Total: {total}
        </p>
      )}
    </div>
  );
}
