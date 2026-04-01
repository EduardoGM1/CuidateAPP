import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPacientes } from '../../api/pacientes';
import { getComorbilidades } from '../../api/comorbilidades';
import { getModulos } from '../../api/modulos';
import { connect, on, off } from '../../api/socket';
import { useAuthStore } from '../../stores/authStore';
import { STORAGE_KEYS, PAGE_SIZE_DEFAULT } from '../../utils/constants';
import { Table, Button } from '../../components/ui';
import { PageHeader, SearchFilterBar, Pagination } from '../../components/shared';
import { Badge } from '../../components/ui';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatNombreCompleto } from '../../utils/format';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

const COLUMNS = [
  { key: 'nombre_completo', label: 'Nombre', render: (row) => sanitizeForDisplay(formatNombreCompleto(row) || row.nombre_completo) || '—' },
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
    sort: 'recent',
    estado: 'activos',
    comorbilidad: '',
    modulo: '',
    search: '',
  });
  const [comorbilidades, setComorbilidades] = useState([]);
  const [modulos, setModulos] = useState([]);

  useOnboardingPageReady(!loading);

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
        search: params.search || undefined,
      });
      setList(res.pacientes ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  }, [params.page, params.limit, params.sort, params.estado, params.comorbilidad, params.modulo, params.search]);

  useEffect(() => {
    load();
  }, [load]);

  // Tiempo real: actualizar lista al crear/asignar/desasignar pacientes
  const token = useAuthStore((s) => s.token ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null));
  useEffect(() => {
    if (!token) return;
    connect(token);
    const refresh = () => load();
    on('patient_created', refresh);
    on('patient_assigned', refresh);
    on('patient_unassigned', refresh);
    on('doctor_replaced', refresh);
    return () => {
      off('patient_created', refresh);
      off('patient_assigned', refresh);
      off('patient_unassigned', refresh);
      off('doctor_replaced', refresh);
    };
  }, [token, load]);

  const handleSearch = (searchParams) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      sort: searchParams.sort ?? prev.sort,
      estado: searchParams.estado ?? prev.estado,
      comorbilidad: searchParams.comorbilidad ?? prev.comorbilidad,
      modulo: searchParams.modulo ?? prev.modulo,
      search: searchParams.search !== undefined ? searchParams.search : prev.search,
    }));
  };

  const handlePageChange = useCallback((page) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  const filterOptions = [
    FILTER_ESTADO,
    {
      key: 'sort',
      label: 'Orden',
      options: [
        { value: 'recent', label: 'Más recientes primero' },
        { value: 'oldest', label: 'Más antiguos primero' },
      ],
    },
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
    <div data-tour="section-pacientes-root">
      <PageHeader
        title="Pacientes"
        action={
          <span data-tour="section-pacientes-new" style={{ display: 'inline-block' }}>
            <Button variant="primary" onClick={() => navigate('/pacientes/nuevo')}>
              Nuevo paciente
            </Button>
          </span>
        }
      />
      <div data-tour="section-pacientes-filters">
      <SearchFilterBar
        placeholder="Buscar por nombre..."
        filterOptions={filterOptions}
        initialSearch={params.search || ''}
        initialFilters={{
          estado: params.estado,
          sort: params.sort || 'recent',
          comorbilidad: params.comorbilidad || '',
          modulo: params.modulo ? String(params.modulo) : '',
        }}
        onSearch={handleSearch}
      />
      </div>
      {error && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--color-fondo-error-claro)', color: 'var(--color-error)', borderRadius: 'var(--radius)' }}>
          {error}
          <Button variant="outline" type="button" style={{ marginLeft: '1rem' }} onClick={load}>
            Reintentar
          </Button>
        </div>
      )}
      <div data-tour="section-pacientes-table">
      <Table
        columns={COLUMNS}
        data={list}
        loading={loading}
        emptyMessage="No hay pacientes"
        onRowClick={handleRowClick}
      />
      </div>
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
