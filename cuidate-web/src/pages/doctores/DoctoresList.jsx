import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDoctores } from '../../api/doctores';
import { getModulos } from '../../api/modulos';
import { Table, Button } from '../../components/ui';
import { PageHeader, SearchFilterBar } from '../../components/shared';
import { Badge } from '../../components/ui';
import { useAuthStore } from '../../stores/authStore';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { PAGE_SIZE_DEFAULT } from '../../utils/constants';

const COLUMNS = [
  {
    key: 'nombre_completo',
    label: 'Nombre',
    render: (row) => sanitizeForDisplay(
      [row.nombre, row.apellido_paterno, row.apellido_materno].filter(Boolean).join(' ')
    ) || '—',
  },
  { key: 'email', label: 'Email', render: (row) => sanitizeForDisplay(row.email) || '—' },
  { key: 'modulo_nombre', label: 'Módulo', render: (row) => sanitizeForDisplay(row.modulo_nombre) || '—' },
  {
    key: 'pacientes_asignados',
    label: 'Pacientes',
    render: (row) => row.pacientes_asignados != null ? String(row.pacientes_asignados) : '—',
  },
  {
    key: 'estado',
    label: 'Estado',
    render: (row) => (
      <Badge variant={row.activo ? 'success' : 'neutral'}>
        {row.activo ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
  },
];

export default function DoctoresList() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const [list, setList] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({
    page: 1,
    limit: PAGE_SIZE_DEFAULT,
    estado: 'activos',
  });

  const loadModulos = useCallback(async () => {
    try {
      const data = await getModulos();
      setModulos(Array.isArray(data) ? data : []);
    } catch {
      setModulos([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDoctores({
        page: params.page,
        limit: params.limit,
        sort: params.sort || 'recent',
        estado: params.estado || 'activos',
        modulo: params.modulo,
      });
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar doctores');
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.sort, params.estado, params.modulo]);

  useEffect(() => {
    loadModulos();
  }, [loadModulos]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (searchParams) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      estado: searchParams.estado ?? prev.estado,
      modulo: searchParams.modulo ? Number(searchParams.modulo) : undefined,
    }));
  }

  const filterOptions = [
    {
      key: 'estado',
      label: 'Estado',
      options: [
        { value: 'activos', label: 'Activos' },
        { value: 'inactivos', label: 'Inactivos' },
        { value: 'todos', label: 'Todos' },
      ],
    },
  ];
  if (modulos.length > 0) {
    filterOptions.push({
      key: 'modulo',
      label: 'Módulo',
      options: [
        { value: '', label: 'Todos' },
        ...modulos.map((m) => ({ value: String(m.id_modulo ?? m.id), label: sanitizeForDisplay(m.nombre_modulo ?? m.nombre) || '—' })),
      ],
    });
  }

  const handleRowClick = (row) => {
    const id = row.id_doctor ?? row.id;
    if (id) navigate(`/doctores/${id}`);
  };

  return (
    <div>
      <PageHeader title="Doctores" />
      {isAdmin && (
        <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <Button variant="primary" type="button" onClick={() => navigate('/doctores/nuevo')}>
            Nuevo doctor
          </Button>
        </div>
      )}
      <SearchFilterBar
        placeholder="Buscar por nombre o email..."
        filterOptions={filterOptions}
        initialFilters={{ estado: params.estado, modulo: params.modulo ? String(params.modulo) : '' }}
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
        emptyMessage="No hay doctores"
        onRowClick={handleRowClick}
      />
      {!loading && list.length > 0 && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
          Mostrando {list.length} resultado(s)
        </p>
      )}
    </div>
  );
}
