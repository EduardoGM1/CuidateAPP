import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { getPacientes, updatePaciente } from '../../api/pacientes';
import { getComorbilidades } from '../../api/comorbilidades';
import { getModulos } from '../../api/modulos';
import { connect, on, off } from '../../api/socket';
import { useAuthStore } from '../../stores/authStore';
import { STORAGE_KEYS, PAGE_SIZE_DEFAULT } from '../../utils/constants';
import { Table, Button } from '../../components/ui';
import { PageHeader, SearchFilterBar, Pagination } from '../../components/shared';
import { Badge } from '../../components/ui';
import PacienteDarBajaModal from '../../components/pacientes/PacienteDarBajaModal';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatNombreCompleto } from '../../utils/format';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

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
  const canGestionPaciente = useAuthStore((s) => s.isDoctor());
  const [bajaModal, setBajaModal] = useState({ open: false, idPaciente: null, nombre: '' });
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

  const openDarBaja = useCallback((row) => {
    const id = row.id_paciente ?? row.id;
    if (!id) return;
    const nombre = sanitizeForDisplay(formatNombreCompleto(row) || row.nombre_completo) || 'Paciente';
    setBajaModal({ open: true, idPaciente: id, nombre });
  }, []);

  const closeBajaModal = useCallback(() => {
    setBajaModal({ open: false, idPaciente: null, nombre: '' });
  }, []);

  const handleReactivarPaciente = useCallback(
    async (row) => {
      const id = row.id_paciente ?? row.id;
      if (!id) return;
      if (
        !window.confirm(
          '¿Reactivar a este paciente en el programa? Se limpiarán fecha y motivo de baja registrados en el GAM.'
        )
      ) {
        return;
      }
      try {
        await updatePaciente(id, { activo: true });
        message.success('Paciente reactivado en el programa');
        load();
      } catch (err) {
        message.error(err?.response?.data?.error || err?.message || 'No se pudo reactivar');
      }
    },
    [load]
  );

  const columns = useMemo(() => {
    const base = [
      {
        key: 'nombre_completo',
        label: 'Nombre',
        render: (row) => sanitizeForDisplay(formatNombreCompleto(row) || row.nombre_completo) || '—',
      },
      { key: 'doctor_nombre', label: 'Doctor', render: (row) => sanitizeForDisplay(row.doctor_nombre ?? '—') },
      { key: 'edad', label: 'Edad', render: (row) => (row.edad != null ? String(row.edad) : '—') },
      {
        key: 'estado',
        label: 'Estado',
        render: (row) => (
          <Badge variant={row.activo !== false ? 'success' : 'neutral'}>
            {row.activo !== false ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
    ];
    if (canGestionPaciente) {
      base.push({
        key: '_acciones',
        label: 'Acciones',
        render: (row) => (
          <span
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}
          >
            {row.activo !== false ? (
              <Button type="button" variant="outline" size="small" onClick={() => openDarBaja(row)}>
                Dar de baja
              </Button>
            ) : (
              <Button type="button" variant="primary" size="small" onClick={() => handleReactivarPaciente(row)}>
                Reactivar
              </Button>
            )}
          </span>
        ),
      });
    }
    return base;
  }, [canGestionPaciente, openDarBaja, handleReactivarPaciente]);

  const emptyMessage = params.search
    ? `No se encontraron pacientes para "${params.search}".`
    : 'No hay pacientes';

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
        columns={columns}
        data={list}
        loading={loading}
        emptyMessage={emptyMessage}
        onRowClick={handleRowClick}
      />
      </div>
      <PacienteDarBajaModal
        open={bajaModal.open}
        onClose={closeBajaModal}
        idPaciente={bajaModal.idPaciente}
        nombrePaciente={bajaModal.nombre}
        onCompleted={load}
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
