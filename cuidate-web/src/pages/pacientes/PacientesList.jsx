import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPacientes } from '../../api/pacientes';
import { getComorbilidades } from '../../api/comorbilidades';
import { getModulos } from '../../api/modulos';
import { Table, Button } from '../../components/ui';
import { PageHeader, SearchFilterBar, Pagination } from '../../components/shared';
import { Badge } from '../../components/ui';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { PAGE_SIZE_DEFAULT } from '../../utils/constants';

const COLUMNS = [
  { key: 'nombre_completo', label: 'Nombre', render: (row) => sanitizeForDisplay(row.nombre_completo) },
  { key: 'doctor_nombre', label: 'Doctor', render: (row) => sanitizeForDisplay(row.doctor_nombre ?? '—') },
  { key: 'edad', label: 'Edad', render: (row) => row.edad != null ? String(row.edad) : '—' },
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

const FILTER_ESTADO = {
  key: 'estado',
  label: 'Estado',
  options: [
    { value: 'activos', label: 'Activos' },
    { value: 'inactivos', label: 'Inactivos' },
    { value: 'todos', label: 'Todos' },
  ],
};

export default function PacientesList() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({
    page: 1,
    limit: PAGE_SIZE_DEFAULT,
    estado: 'activos',
    comorbilidad: '',
    modulo: '',
  });
  const [comorbilidades, setComorbilidades] = useState([]);
  const [modulos, setModulos] = useState([]);

  const loadModulos = useCallback(async () => {
    try {
      const data = await getModulos();
      setModulos(Array.isArray(data) ? data : []);
    } catch {
      setModulos([]);
    }
  }, []);

  useEffect(() => {
    getComorbilidades()
      .then((list) => setComorbilidades(Array.isArray(list) ? list : []))
      .catch(() => setComorbilidades([]));
  }, []);

  useEffect(() => {
    loadModulos();
  }, [loadModulos]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPacientes({
        page: params.page,
        limit: params.limit,
        sort: params.sort || 'recent',
        estado: params.estado || 'activos',
        comorbilidad: params.comorbilidad || undefined,
        modulo: params.modulo ? Number(params.modulo) : undefined,
      });
      setList(res.pacientes ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.sort, params.estado, params.comorbilidad, params.modulo]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (searchParams) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      estado: searchParams.estado ?? prev.estado,
      comorbilidad: searchParams.comorbilidad ?? prev.comorbilidad,
      modulo: searchParams.modulo ?? prev.modulo,
    }));
  };

  const handlePageChange = useCallback((page) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  const filterOptions = [
    FILTER_ESTADO,
    ...(comorbilidades.length > 0
      ? [
          {
            key: 'comorbilidad',
            label: 'Comorbilidad',
            options: [
              { value: '', label: 'Todas' },
              ...comorbilidades.map((c) => ({
                value: String(c.id_comorbilidad ?? c.id ?? ''),
                label: sanitizeForDisplay(c.nombre_comorbilidad ?? c.nombre) || '—',
              })),
            ],
          },
        ]
      : []),
    ...(modulos.length > 0
      ? [
          {
            key: 'modulo',
            label: 'Módulo',
            options: [
              { value: '', label: 'Todos' },
              ...modulos.map((m) => ({
                value: String(m.id_modulo ?? m.id ?? ''),
                label: sanitizeForDisplay(m.nombre_modulo ?? m.nombre) || '—',
              })),
            ],
          },
        ]
      : []),
  ];

  const handleRowClick = (row) => {
    const id = row.id_paciente ?? row.id;
    if (id) navigate(`/pacientes/${id}`);
  };

  return (
    <div>
      <PageHeader
        title="Pacientes"
        action={
          <Button variant="primary" onClick={() => navigate('/pacientes/nuevo')}>
            Nuevo paciente
          </Button>
        }
      />
      <SearchFilterBar
        placeholder="Buscar por nombre..."
        filterOptions={filterOptions}
        initialFilters={{
          estado: params.estado,
          comorbilidad: params.comorbilidad || '',
          modulo: params.modulo ? String(params.modulo) : '',
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
        emptyMessage="No hay pacientes"
        onRowClick={handleRowClick}
      />
      {!loading && (
        <Pagination
          currentPage={params.page}
          totalItems={total}
          pageSize={params.limit}
          onPageChange={handlePageChange}
          ariaLabel="Paginación de pacientes"
        />
      )}
    </div>
  );
}
