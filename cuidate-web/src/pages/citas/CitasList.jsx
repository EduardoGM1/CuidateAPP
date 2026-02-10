import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCitas, updateCitaEstado } from '../../api/citas';
import { getDoctores } from '../../api/doctores';
import { Table, Button, Badge } from '../../components/ui';
import { PageHeader, SearchFilterBar, Pagination } from '../../components/shared';
import { useAuthStore } from '../../stores/authStore';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatDateTime } from '../../utils/format';
import { PAGE_SIZE_DEFAULT } from '../../utils/constants';

const ESTADO_LABELS = {
  pendiente: 'Pendiente',
  atendida: 'Atendida',
  no_asistida: 'No asistida',
  reprogramada: 'Reprogramada',
  cancelada: 'Cancelada',
};

const COLUMNS = [
  {
    key: 'fecha_cita',
    label: 'Fecha',
    render: (row) => formatDateTime(row.fecha_cita),
  },
  {
    key: 'paciente_nombre',
    label: 'Paciente',
    render: (row) => sanitizeForDisplay(row.paciente_nombre) || '—',
  },
  {
    key: 'doctor_nombre',
    label: 'Doctor',
    render: (row) => sanitizeForDisplay(row.doctor_nombre) || '—',
  },
  {
    key: 'motivo',
    label: 'Motivo',
    render: (row) => sanitizeForDisplay(row.motivo) || '—',
  },
  {
    key: 'estado',
    label: 'Estado',
    render: (row) => {
      const est = (row.estado || '').toLowerCase();
      const variant = est === 'atendida' ? 'success' : est === 'cancelada' || est === 'no_asistida' ? 'error' : est === 'reprogramada' ? 'warning' : 'neutral';
      return <Badge variant={variant}>{ESTADO_LABELS[est] || row.estado || '—'}</Badge>;
    },
  },
];

const FILTER_ESTADO = {
  key: 'estado',
  label: 'Estado',
  options: [
    { value: 'todas', label: 'Todas' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'atendida', label: 'Atendida' },
    { value: 'no_asistida', label: 'No asistida' },
    { value: 'reprogramada', label: 'Reprogramada' },
    { value: 'cancelada', label: 'Cancelada' },
  ],
};

export default function CitasList() {
  const navigate = useNavigate();
  const isAdminFn = useAuthStore((s) => s.isAdmin);
  const isDoctorFn = useAuthStore((s) => s.isDoctor);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const pacienteFromUrl = searchParams.get('paciente');
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateError, setUpdateError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [doctores, setDoctores] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'agenda'
  const [agendaSpan, setAgendaSpan] = useState('day'); // 'day' | 'week'
  const [params, setParams] = useState({
    page: 1,
    limit: PAGE_SIZE_DEFAULT,
    estado: 'todas',
    paciente: pacienteFromUrl ? parseInt(pacienteFromUrl, 10) : undefined,
    doctor: undefined,
    fecha_desde: '',
    fecha_hasta: '',
  });

  const canEditCitas = isDoctorFn() || isAdminFn();

  const loadDoctores = useCallback(async () => {
    if (!isAdminFn()) return;
    try {
      const data = await getDoctores({ limit: 200, estado: 'activos' });
      setDoctores(Array.isArray(data) ? data : []);
    } catch {
      setDoctores([]);
    }
  }, [isAdminFn]);

  useEffect(() => {
    loadDoctores();
  }, [loadDoctores]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setUpdateError('');
    try {
      const res = await queryClient.fetchQuery({
        queryKey: ['citas', params],
        queryFn: () =>
          getCitas({
            page: params.page,
            limit: params.limit,
            estado: params.estado,
            search: params.search,
            fecha_desde: params.fecha_desde || undefined,
            fecha_hasta: params.fecha_hasta || undefined,
            paciente: params.paciente,
            doctor: params.doctor,
          }),
      });
      setList(res.citas ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar citas');
    } finally {
      setLoading(false);
    }
  }, [
    params.page,
    params.limit,
    params.estado,
    params.search,
    params.fecha_desde,
    params.fecha_hasta,
    params.paciente,
    params.doctor,
    queryClient,
  ]);

  useEffect(() => {
    const p = searchParams.get('paciente');
    if (p) setParams((prev) => ({ ...prev, paciente: parseInt(p, 10) || undefined, page: 1 }));
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRowClick = (row) => {
    const id = row.id_cita ?? row.id;
    if (id) navigate(`/citas/${id}`);
  };

  const handleSearch = (searchParams) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      estado: searchParams.estado ?? prev.estado,
      search: searchParams.search ?? prev.search,
      doctor: searchParams.doctor ? Number(searchParams.doctor) : undefined,
    }));
  };

  const handleDateChange = (field, value) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      [field]: value && value.trim ? value.trim() : '',
    }));
  };

  const handlePageChange = useCallback((page) => {
    setParams((prev) => ({ ...prev, page }));
  }, []);

  const doctoresList = Array.isArray(doctores) ? doctores : [];
  const showDoctorFilter = Boolean(isAdminFn() && doctoresList.length > 0);
  const filterOptions = [
    FILTER_ESTADO,
    ...(showDoctorFilter
      ? [
          {
            key: 'doctor',
            label: 'Doctor',
            options: [
              { value: '', label: 'Todos' },
              ...doctoresList.map((d) => ({
                value: String(d.id_doctor ?? d.id ?? ''),
                label: sanitizeForDisplay(
                  [d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' ')
                ) || '—',
              })),
            ],
          },
        ]
      : []),
  ];

  const columns = canEditCitas
    ? [
        ...COLUMNS,
        {
          key: 'acciones',
          label: 'Acciones',
          render: (row) => {
            const id = row.id_cita ?? row.id;
            const est = (row.estado || '').toLowerCase();
            const isPendingLike = est === 'pendiente' || est === 'reprogramada';
            if (!id || !isPendingLike) {
              return (
                <span style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
                  —
                </span>
              );
            }
            const disabled = updatingId === id;
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                <Button
                  type="button"
                  size="small"
                  variant="primary"
                  disabled={disabled}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (row.estado === 'atendida') return;
                    setUpdateError('');
                    setUpdatingId(id);
                    try {
                      const updated = await updateCitaEstado(id, { estado: 'atendida' });
                      setList((prev) =>
                        prev.map((cita) =>
                          (cita.id_cita ?? cita.id) === id ? { ...cita, ...updated, estado: 'atendida' } : cita
                        )
                      );
                    } catch (err) {
                      setUpdateError(
                        err?.response?.data?.error || err?.message || 'Error al marcar como atendida'
                      );
                    } finally {
                      setUpdatingId(null);
                    }
                  }}
                >
                  Atendida
                </Button>
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  disabled={disabled}
                  onClick={async (e) => {
                    e.stopPropagation();
                    setUpdateError('');
                    setUpdatingId(id);
                    try {
                      const updated = await updateCitaEstado(id, { estado: 'no_asistida' });
                      setList((prev) =>
                        prev.map((cita) =>
                          (cita.id_cita ?? cita.id) === id ? { ...cita, ...updated, estado: 'no_asistida' } : cita
                        )
                      );
                    } catch (err) {
                      setUpdateError(
                        err?.response?.data?.error || err?.message || 'Error al marcar como no asistida'
                      );
                    } finally {
                      setUpdatingId(null);
                    }
                  }}
                >
                  No asistió
                </Button>
                <Button
                  type="button"
                  size="small"
                  variant="outline"
                  disabled={disabled}
                  onClick={async (e) => {
                    e.stopPropagation();
                    // eslint-disable-next-line no-alert
                    if (!window.confirm('¿Cancelar esta cita?')) return;
                    setUpdateError('');
                    setUpdatingId(id);
                    try {
                      const updated = await updateCitaEstado(id, { estado: 'cancelada' });
                      setList((prev) =>
                        prev.map((cita) =>
                          (cita.id_cita ?? cita.id) === id ? { ...cita, ...updated, estado: 'cancelada' } : cita
                        )
                      );
                    } catch (err) {
                      setUpdateError(
                        err?.response?.data?.error || err?.message || 'Error al cancelar la cita'
                      );
                    } finally {
                      setUpdatingId(null);
                    }
                  }}
                >
                  Cancelar
                </Button>
              </div>
            );
          },
        },
      ]
    : COLUMNS;

  return (
    <div>
      <PageHeader title="Citas" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
        <div
          style={{
            display: 'inline-flex',
            borderRadius: '999px',
            border: '1px solid var(--color-borde-claro)',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode('list')}
            style={{
              padding: '0.35rem 0.9rem',
              border: 'none',
              backgroundColor: viewMode === 'list' ? 'var(--color-primario)' : 'transparent',
              color: viewMode === 'list' ? '#fff' : 'var(--color-texto-secundario)',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            style={{
              padding: '0.35rem 0.9rem',
              border: 'none',
              borderLeft: '1px solid var(--color-borde-claro)',
              backgroundColor: viewMode === 'agenda' ? 'var(--color-primario)' : 'transparent',
              color: viewMode === 'agenda' ? '#fff' : 'var(--color-texto-secundario)',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Agenda
          </button>
        </div>
      </div>
      <SearchFilterBar
        placeholder="Buscar por motivo..."
        filterOptions={filterOptions}
        initialFilters={{
          estado: params.estado,
          doctor: params.doctor ? String(params.doctor) : '',
        }}
        onSearch={handleSearch}
      />
      <div className="search-filter-bar" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="filter-cell" style={{ minWidth: 160 }}>
          <label className="filter-label" htmlFor="citas-fecha-desde">
            Fecha desde
          </label>
          <input
            id="citas-fecha-desde"
            type="date"
            value={params.fecha_desde || ''}
            onChange={(e) => handleDateChange('fecha_desde', e.target.value)}
            max={params.fecha_hasta || undefined}
            style={{
              width: '100%',
              minHeight: 40,
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-borde-claro)',
              background: 'var(--color-fondo-card)',
              color: 'var(--color-texto-primario)',
              fontSize: 'var(--text-base)',
            }}
          />
        </div>
        <div className="filter-cell" style={{ minWidth: 160 }}>
          <label className="filter-label" htmlFor="citas-fecha-hasta">
            Fecha hasta
          </label>
          <input
            id="citas-fecha-hasta"
            type="date"
            value={params.fecha_hasta || ''}
            onChange={(e) => handleDateChange('fecha_hasta', e.target.value)}
            min={params.fecha_desde || undefined}
            style={{
              width: '100%',
              minHeight: 40,
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-borde-claro)',
              background: 'var(--color-fondo-card)',
              color: 'var(--color-texto-primario)',
              fontSize: 'var(--text-base)',
            }}
          />
        </div>
      </div>
      {(error || updateError) && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: 'var(--color-fondo-error-claro)',
            color: 'var(--color-error)',
            borderRadius: 'var(--radius)',
          }}
        >
          {error && <div>{error}</div>}
          {updateError && <div>{updateError}</div>}
          {error && (
            <Button
              variant="outline"
              type="button"
              style={{ marginLeft: '1rem', marginTop: '0.5rem' }}
              onClick={load}
            >
              Reintentar
            </Button>
          )}
        </div>
      )}
      {viewMode === 'list' ? (
        <Table
          columns={columns}
          data={list}
          loading={loading}
          emptyMessage="No hay citas"
          onRowClick={handleRowClick}
        />
      ) : (
        <div>
          {viewMode === 'agenda' && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  borderRadius: '999px',
                  border: '1px solid var(--color-borde-claro)',
                  overflow: 'hidden',
                }}
              >
                <button
                  type="button"
                  onClick={() => setAgendaSpan('day')}
                  style={{
                    padding: '0.25rem 0.75rem',
                    border: 'none',
                    backgroundColor:
                      agendaSpan === 'day' ? 'var(--color-primario)' : 'transparent',
                    color: agendaSpan === 'day' ? '#fff' : 'var(--color-texto-secundario)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Día
                </button>
                <button
                  type="button"
                  onClick={() => setAgendaSpan('week')}
                  style={{
                    padding: '0.25rem 0.75rem',
                    border: 'none',
                    borderLeft: '1px solid var(--color-borde-claro)',
                    backgroundColor:
                      agendaSpan === 'week' ? 'var(--color-primario)' : 'transparent',
                    color: agendaSpan === 'week' ? '#fff' : 'var(--color-texto-secundario)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Semana
                </button>
              </div>
            </div>
          )}
          {(() => {
            const today = new Date();
            const defaultDate = today.toISOString().slice(0, 10);
            const baseDateStr = (params.fecha_desde || defaultDate).slice(0, 10);
            const baseDate = new Date(baseDateStr);

            let agendaItems = list || [];
            if (agendaSpan === 'day') {
              agendaItems = agendaItems
                .filter((row) => {
                  const fecha = (row.fecha_cita || '').slice(0, 10);
                  return fecha === baseDateStr;
                })
                .sort((a, b) => new Date(a.fecha_cita) - new Date(b.fecha_cita));
            } else {
              const start = new Date(baseDate);
              const end = new Date(baseDate);
              end.setDate(start.getDate() + 6);
              agendaItems = agendaItems
                .filter((row) => {
                  const fechaStr = (row.fecha_cita || '').slice(0, 10);
                  if (!fechaStr) return false;
                  const d = new Date(fechaStr);
                  return d >= start && d <= end;
                })
                .sort((a, b) => new Date(a.fecha_cita) - new Date(b.fecha_cita));
            }

            if (loading) {
              return (
                <Table
                  columns={columns}
                  data={[]}
                  loading={loading}
                  emptyMessage="Cargando agenda…"
                  onRowClick={handleRowClick}
                />
              );
            }

            if (agendaItems.length === 0) {
              return (
                <p style={{ marginTop: '1rem', color: 'var(--color-texto-secundario)' }}>
                  No hay citas para el periodo seleccionado.
                </p>
              );
            }

            return (
              <div style={{ marginTop: '0.5rem' }}>
                <h2
                  style={{
                    margin: '0 0 0.75rem',
                    fontSize: '1rem',
                    color: 'var(--color-texto-secundario)',
                  }}
                >
                  {agendaSpan === 'day'
                    ? `Agenda del día ${baseDateStr}`
                    : `Agenda de la semana a partir de ${baseDateStr}`}
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  {agendaItems.map((row) => {
                    const id = row.id_cita ?? row.id;
                    const est = (row.estado || '').toLowerCase();
                    const variant =
                      est === 'atendida'
                        ? 'success'
                        : est === 'cancelada' || est === 'no_asistida'
                        ? 'error'
                        : est === 'reprogramada'
                        ? 'warning'
                        : 'neutral';
                    const isPendingLike = est === 'pendiente' || est === 'reprogramada';
                    const disabled = updatingId === id;
                    return (
                      <div
                        key={id}
                        onClick={() => handleRowClick(row)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRowClick(row);
                          }
                        }}
                        style={{
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--color-borde-claro)',
                          padding: '0.75rem 0.9rem',
                          backgroundColor: 'var(--color-fondo-card)',
                          boxShadow: 'var(--shadow-sm)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: '0.95rem',
                            }}
                          >
                            {formatDateTime(row.fecha_cita)}
                          </span>
                          <Badge variant={variant}>
                            {ESTADO_LABELS[est] || row.estado || '—'}
                          </Badge>
                        </div>
                        <div
                          style={{
                            fontSize: '0.9rem',
                            color: 'var(--color-texto-primario)',
                          }}
                        >
                          <div>
                            <strong>Paciente:</strong>{' '}
                            {sanitizeForDisplay(row.paciente_nombre) || '—'}
                          </div>
                          <div>
                            <strong>Doctor:</strong>{' '}
                            {sanitizeForDisplay(row.doctor_nombre) || '—'}
                          </div>
                          {row.motivo && (
                            <div
                              style={{
                                marginTop: '0.15rem',
                                color: 'var(--color-texto-secundario)',
                              }}
                            >
                              {sanitizeForDisplay(row.motivo)}
                            </div>
                          )}
                        </div>
                        {canEditCitas && isPendingLike && id && (
                          <div
                            style={{
                              marginTop: '0.4rem',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '0.25rem',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              size="small"
                              variant="primary"
                              disabled={disabled}
                              onClick={async () => {
                                setUpdateError('');
                                setUpdatingId(id);
                                try {
                                  const updated = await updateCitaEstado(id, { estado: 'atendida' });
                                  setList((prev) =>
                                    prev.map((cita) =>
                                      (cita.id_cita ?? cita.id) === id
                                        ? { ...cita, ...updated, estado: 'atendida' }
                                        : cita
                                    )
                                  );
                                } catch (err) {
                                  setUpdateError(
                                    err?.response?.data?.error ||
                                      err?.message ||
                                      'Error al marcar como atendida'
                                  );
                                } finally {
                                  setUpdatingId(null);
                                }
                              }}
                            >
                              Atendida
                            </Button>
                            <Button
                              type="button"
                              size="small"
                              variant="secondary"
                              disabled={disabled}
                              onClick={async () => {
                                setUpdateError('');
                                setUpdatingId(id);
                                try {
                                  const updated = await updateCitaEstado(id, {
                                    estado: 'no_asistida',
                                  });
                                  setList((prev) =>
                                    prev.map((cita) =>
                                      (cita.id_cita ?? cita.id) === id
                                        ? { ...cita, ...updated, estado: 'no_asistida' }
                                        : cita
                                    )
                                  );
                                } catch (err) {
                                  setUpdateError(
                                    err?.response?.data?.error ||
                                      err?.message ||
                                      'Error al marcar como no asistida'
                                  );
                                } finally {
                                  setUpdatingId(null);
                                }
                              }}
                            >
                              No asistió
                            </Button>
                            <Button
                              type="button"
                              size="small"
                              variant="outline"
                              disabled={disabled}
                              onClick={async () => {
                                // eslint-disable-next-line no-alert
                                if (!window.confirm('¿Cancelar esta cita?')) return;
                                setUpdateError('');
                                setUpdatingId(id);
                                try {
                                  const updated = await updateCitaEstado(id, {
                                    estado: 'cancelada',
                                  });
                                  setList((prev) =>
                                    prev.map((cita) =>
                                      (cita.id_cita ?? cita.id) === id
                                        ? { ...cita, ...updated, estado: 'cancelada' }
                                        : cita
                                    )
                                  );
                                } catch (err) {
                                  setUpdateError(
                                    err?.response?.data?.error ||
                                      err?.message ||
                                      'Error al cancelar la cita'
                                  );
                                } finally {
                                  setUpdatingId(null);
                                }
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {!loading && (
        <Pagination
          currentPage={params.page}
          totalItems={total}
          pageSize={params.limit}
          onPageChange={handlePageChange}
          ariaLabel="Paginación de citas"
        />
      )}
    </div>
  );
}
