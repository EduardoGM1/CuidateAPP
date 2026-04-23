import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { message } from 'antd';
import {
  getDoctorById,
  deleteDoctor,
  reactivateDoctor,
  hardDeleteDoctor,
  getDoctorDashboard,
  getAvailablePatientsForDoctor,
  assignPatientToDoctor,
  unassignPatientFromDoctor,
} from '../../api/doctores';
import { getCitaById, updateCitaEstado, updateCita } from '../../api/citas';
import { adminChangePassword } from '../../api/auth';
import { PageHeader, DataCard } from '../../components/shared';
import {
  LoadingSpinner,
  Button,
  Card,
  Badge,
  Modal,
  Input,
  Select,
  EmptyState,
} from '../../components/ui';
import DetalleCitaModal from '../../components/pacientes/DetalleCitaModal';
import CompletarCitaModal from '../../components/citas/CompletarCitaModal';
import { useAuthStore } from '../../stores/authStore';
import { useCurrentDoctorId } from '../../hooks/useCurrentDoctorId';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatDate, formatDateTime, formatNombreCompleto } from '../../utils/format';
import { fechaCitaDatetimeLocalToApi, fechaCitaApiToDatetimeLocalInput } from '../../utils/fechaCita';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

const ESTADO_CITA = {
  pendiente: 'Pendiente',
  atendida: 'Atendida',
  no_asistida: 'No asistida',
  reprogramada: 'Reprogramada',
  cancelada: 'Cancelada',
};

const BADGE_ESTADO = {
  atendida: 'success',
  pendiente: 'neutral',
  no_asistida: 'error',
  reprogramada: 'neutral',
  cancelada: 'error',
};

function getNombrePaciente(paciente) {
  if (!paciente) return 'Paciente';
  return formatNombreCompleto(paciente) || 'Paciente';
}

function getNombreCita(cita) {
  const p = cita?.paciente ?? cita?.Paciente;
  return getNombrePaciente(p) || cita?.paciente_nombre || 'Paciente';
}

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const parsedId = parsePositiveInt(id, 0);
  const isAdminFn = useAuthStore((s) => s.isAdmin);
  const isAdmin = typeof isAdminFn === 'function' ? isAdminFn() : false;
  const { idDoctor } = useCurrentDoctorId();

  const [doctor, setDoctor] = useState(null);
  const [pacientesAsignados, setPacientesAsignados] = useState([]);
  const [citasHoy, setCitasHoy] = useState([]);
  const [citasRecientes, setCitasRecientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // 'desactivar' | 'reactivar' | 'permanente' | null

  // Modales
  const [detalleCitaOpen, setDetalleCitaOpen] = useState(false);
  const [citaDetalle, setCitaDetalle] = useState(null);
  const [citaDetalleLoading, setCitaDetalleLoading] = useState(false);
  const [completarCitaId, setCompletarCitaId] = useState(null);
  const [estadoModal, setEstadoModal] = useState({ open: false, cita: null, nuevoEstado: '' });
  const [reprogramarModal, setReprogramarModal] = useState({ open: false, cita: null, fecha: '', motivo: '' });
  const [passwordModal, setPasswordModal] = useState({ open: false, newPassword: '', confirmPassword: '' });
  const [asignarModalOpen, setAsignarModalOpen] = useState(false);
  const [asignarModalSearch, setAsignarModalSearch] = useState('');
  const [availablePatients, setAvailablePatients] = useState([]);
  const [asignarLoading, setAsignarLoading] = useState(false);
  const [searchPacientesQuery, setSearchPacientesQuery] = useState('');
  const [unassigningId, setUnassigningId] = useState(null);
  const [updatingEstado, setUpdatingEstado] = useState(false);
  const [updatingReprogramar, setUpdatingReprogramar] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const canEdit = isAdmin || (idDoctor != null && idDoctor === parsedId);

  useOnboardingPageReady(parsedId > 0 && !loading && !!doctor && !(error && !doctor));

  const load = useCallback(async () => {
    if (parsedId === 0) return;
    setLoading(true);
    setError(null);
    try {
      const [detailData, dashboardData] = await Promise.all([
        getDoctorById(parsedId),
        isAdmin ? getDoctorDashboard(parsedId).catch(() => null) : Promise.resolve(null),
      ]);
      const merged = { ...(dashboardData?.doctor ?? {}), ...detailData };
      setDoctor(merged);
      if (dashboardData) {
        setPacientesAsignados(Array.isArray(dashboardData.pacientesAsignados) ? dashboardData.pacientesAsignados : []);
        setCitasHoy(Array.isArray(dashboardData.citasHoy) ? dashboardData.citasHoy : []);
        setCitasRecientes(Array.isArray(dashboardData.citasRecientes) ? dashboardData.citasRecientes : []);
      } else {
        setPacientesAsignados([]);
        setCitasHoy([]);
        setCitasRecientes([]);
      }
    } catch (err) {
      setError(
        err?.response?.status === 404
          ? 'Doctor no encontrado'
          : err?.response?.data?.error || err?.message || 'Error al cargar el doctor'
      );
    } finally {
      setLoading(false);
    }
  }, [parsedId, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isAdmin && idDoctor != null && parsedId > 0 && parsedId !== idDoctor) {
    return <Navigate to="/doctores" replace />;
  }

  const handleDesactivar = async () => {
    if (confirmDelete !== 'desactivar' || !parsedId) return;
    setDeleting(true);
    try {
      await deleteDoctor(parsedId);
      message.success('Doctor desactivado');
      setConfirmDelete(null);
      navigate('/doctores', { replace: true });
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al desactivar');
    } finally {
      setDeleting(false);
    }
  };

  const handleReactivar = async () => {
    if (confirmDelete !== 'reactivar' || !parsedId) return;
    setDeleting(true);
    try {
      await reactivateDoctor(parsedId);
      message.success('Doctor reactivado');
      setConfirmDelete(null);
      load();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al reactivar');
    } finally {
      setDeleting(false);
    }
  };

  const handleHardDelete = async () => {
    if (confirmDelete !== 'permanente' || !parsedId) return;
    setDeleting(true);
    try {
      await hardDeleteDoctor(parsedId);
      message.success('Doctor eliminado permanentemente');
      setConfirmDelete(null);
      navigate('/doctores', { replace: true });
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const openDetalleCita = useCallback(async (cita) => {
    const citaId = cita?.id_cita ?? cita?.id;
    if (!citaId) return;
    setCitaDetalle(null);
    setCitaDetalleLoading(true);
    setDetalleCitaOpen(true);
    try {
      const data = await getCitaById(citaId);
      setCitaDetalle(data);
    } catch {
      message.error('No se pudo cargar el detalle de la cita');
      setDetalleCitaOpen(false);
    } finally {
      setCitaDetalleLoading(false);
    }
  }, []);

  const openCompletarCita = useCallback((cita) => {
    const citaId = cita?.id_cita ?? cita?.id;
    if (citaId) setCompletarCitaId(citaId);
  }, []);

  const handleCompletarSuccess = useCallback(() => {
    setCompletarCitaId(null);
    load();
  }, [load]);

  const openEstadoModal = (cita) => {
    setEstadoModal({
      open: true,
      cita,
      nuevoEstado: (cita?.estado || 'pendiente').toLowerCase(),
    });
  };

  const handleActualizarEstado = async () => {
    const { cita, nuevoEstado } = estadoModal;
    if (!cita || !nuevoEstado) return;
    const citaId = cita.id_cita ?? cita.id;
    setUpdatingEstado(true);
    try {
      await updateCitaEstado(citaId, { estado: nuevoEstado });
      message.success('Estado actualizado');
      setEstadoModal({ open: false, cita: null, nuevoEstado: '' });
      load();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al actualizar estado');
    } finally {
      setUpdatingEstado(false);
    }
  };

  const openReprogramarModal = (cita) => {
    const fechaStr = cita?.fecha_cita ? fechaCitaApiToDatetimeLocalInput(cita.fecha_cita) : '';
    setReprogramarModal({ open: true, cita, fecha: fechaStr, motivo: '' });
  };

  const handleReprogramar = async () => {
    const { cita, fecha } = reprogramarModal;
    if (!cita || !fecha?.trim()) {
      message.warning('Selecciona una fecha');
      return;
    }
    const citaId = cita.id_cita ?? cita.id;
    setUpdatingReprogramar(true);
    try {
      const fechaLocal = fecha.length <= 10 ? `${fecha}T12:00:00` : fecha;
      await updateCita(citaId, { fecha_cita: fechaCitaDatetimeLocalToApi(fechaLocal), motivo_reprogramacion: reprogramarModal.motivo?.trim() || undefined });
      message.success('Cita reprogramada');
      setReprogramarModal({ open: false, cita: null, fecha: '', motivo: '' });
      load();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al reprogramar');
    } finally {
      setUpdatingReprogramar(false);
    }
  };

  const handleCambiarPassword = async () => {
    const { newPassword, confirmPassword } = passwordModal;
    if (!newPassword || newPassword.length < 8) {
      message.warning('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      message.warning('Las contraseñas no coinciden');
      return;
    }
    if (!doctor?.email && !doctor?.id_usuario) {
      message.error('No se puede cambiar la contraseña: falta email o usuario del doctor');
      return;
    }
    setPasswordSaving(true);
    try {
      await adminChangePassword({
        email: doctor.email,
        newPassword,
      });
      message.success('Contraseña actualizada');
      setPasswordModal({ open: false, newPassword: '', confirmPassword: '' });
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al cambiar contraseña');
    } finally {
      setPasswordSaving(false);
    }
  };

  const openAsignarModal = useCallback(async () => {
    setAsignarModalOpen(true);
    setAsignarLoading(true);
    try {
      const list = await getAvailablePatientsForDoctor(parsedId);
      setAvailablePatients(Array.isArray(list) ? list : []);
    } catch {
      message.error('No se pudieron cargar los pacientes disponibles');
      setAvailablePatients([]);
    } finally {
      setAsignarLoading(false);
    }
  }, [parsedId]);

  const handleAssignPatient = async (paciente) => {
    const pid = paciente?.id_paciente ?? paciente?.id;
    if (!pid) return;
    setAsignarLoading(true);
    try {
      await assignPatientToDoctor(parsedId, pid);
      message.success('Paciente asignado');
      setAvailablePatients((prev) => prev.filter((p) => (p.id_paciente ?? p.id) !== pid));
      load();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al asignar');
    } finally {
      setAsignarLoading(false);
    }
  };

  const handleUnassignPatient = async (paciente) => {
    const pid = paciente?.id_paciente ?? paciente?.id;
    if (!pid) return;
    if (!window.confirm('¿Desasignar a este paciente del doctor?')) return;
    setUnassigningId(pid);
    try {
      await unassignPatientFromDoctor(parsedId, pid);
      message.success('Paciente desasignado');
      load();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al desasignar');
    } finally {
      setUnassigningId(null);
    }
  };

  const filteredPacientes = useMemo(() => {
    if (!searchPacientesQuery?.trim()) return pacientesAsignados;
    const q = searchPacientesQuery.toLowerCase();
    return pacientesAsignados.filter((p) => {
      const nombre = formatNombreCompleto(p).toLowerCase();
      return nombre.includes(q);
    });
  }, [pacientesAsignados, searchPacientesQuery]);

  if (parsedId === 0) {
    return (
      <div>
        <PageHeader title="Detalle de doctor" showBack backTo="/doctores" />
        <p style={{ color: 'var(--color-error)' }}>Doctor no encontrado.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Detalle de doctor" showBack backTo="/doctores" />
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error && !doctor) {
    return (
      <div>
        <PageHeader title="Detalle de doctor" showBack backTo="/doctores" />
        <p style={{ color: 'var(--color-error)' }}>{error}</p>
      </div>
    );
  }

  const d = doctor;
  const nombreCompleto = formatNombreCompleto(d) || '—';
  const activo = d.activo !== false;

  const infoItems = [
    { label: 'Nombre', value: sanitizeForDisplay(nombreCompleto) },
    { label: 'Email', value: sanitizeForDisplay(d.email) || '—' },
    { label: 'Módulo', value: sanitizeForDisplay(d.modulo_nombre ?? d.modulo) || '—' },
    { label: 'Teléfono', value: sanitizeForDisplay(d.telefono) || '—' },
    { label: 'Grado de estudio', value: sanitizeForDisplay(d.grado_estudio) || '—' },
    { label: 'Institución', value: sanitizeForDisplay(d.institucion_hospitalaria) || '—' },
    { label: 'Años de servicio', value: d.anos_servicio != null ? String(d.anos_servicio) : '—' },
    { label: 'Pacientes asignados', value: pacientesAsignados.length },
    { label: 'Fecha de registro', value: d.fecha_registro ? formatDate(d.fecha_registro) : '—' },
    { label: 'Estado', value: activo ? 'Activo' : 'Inactivo' },
  ];

  const citasRecientesSlice = citasRecientes.slice(0, 5);

  return (
    <div>
      <PageHeader title="Detalle de doctor" showBack backTo="/doctores" />

      {/* Header con nombre y subtítulo */}
      <div
        style={{
          background: 'var(--color-primario)',
          color: 'var(--color-texto-en-primario, #fff)',
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius)',
          marginBottom: '1.5rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{nombreCompleto}</h2>
        <p style={{ margin: '0.25rem 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
          {sanitizeForDisplay(d.grado_estudio) || 'Doctor'} • {sanitizeForDisplay(d.modulo_nombre ?? d.modulo) || 'Sin módulo'}
        </p>
      </div>

      {/* Acciones */}
      {(canEdit || isAdmin) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {canEdit && (
            <Button variant="primary" type="button" onClick={() => navigate(`/doctores/${parsedId}/editar`)}>
              Editar
            </Button>
          )}
          {isAdmin && activo && (
            <>
              <Button variant="outline" type="button" onClick={() => setPasswordModal((m) => ({ ...m, open: true }))}>
                Cambiar contraseña
              </Button>
              {!confirmDelete ? (
                <Button variant="danger" type="button" onClick={() => setConfirmDelete('desactivar')} disabled={deleting}>
                  Desactivar
                </Button>
              ) : confirmDelete === 'desactivar' ? (
                <>
                  <span style={{ color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>¿Desactivar este doctor?</span>
                  <Button variant="danger" onClick={handleDesactivar} disabled={deleting}>{deleting ? 'Desactivando…' : 'Sí, desactivar'}</Button>
                  <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancelar</Button>
                </>
              ) : null}
            </>
          )}
          {isAdmin && !activo && (
            <>
              {!confirmDelete ? (
                <>
                  <Button variant="primary" onClick={() => setConfirmDelete('reactivar')} disabled={deleting}>Reactivar</Button>
                  <Button variant="danger" onClick={() => setConfirmDelete('permanente')} disabled={deleting}>Eliminar permanentemente</Button>
                </>
              ) : confirmDelete === 'reactivar' ? (
                <>
                  <span style={{ color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>¿Reactivar?</span>
                  <Button variant="primary" onClick={handleReactivar} disabled={deleting}>{deleting ? 'Reactivando…' : 'Sí, reactivar'}</Button>
                  <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                </>
              ) : confirmDelete === 'permanente' ? (
                <>
                  <span style={{ color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>¿Eliminar para siempre? No se puede deshacer.</span>
                  <Button variant="danger" onClick={handleHardDelete} disabled={deleting}>{deleting ? 'Eliminando…' : 'Sí, eliminar'}</Button>
                  <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
                </>
              ) : null}
            </>
          )}
        </div>
      )}

      <DataCard title="Información general" items={infoItems} />

      {/* Citas de hoy (solo admin con dashboard) */}
      {isAdmin && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>📅 Citas de hoy</h3>
          {citasHoy.length === 0 ? (
            <EmptyState message="No hay citas programadas para hoy" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {citasHoy.map((cita) => (
                <div
                  key={cita.id_cita ?? cita.id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--color-fondo-verde-suave, #f0f9f0)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--color-borde-claro)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <strong>{getNombreCita(cita)}</strong>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--color-texto-secundario)' }}>
                        {formatDateTime(cita.fecha_cita)}
                      </span>
                      {cita.motivo && <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{cita.motivo}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Badge variant={BADGE_ESTADO[(cita.estado || 'pendiente').toLowerCase()] || 'neutral'}>
                        {ESTADO_CITA[(cita.estado || 'pendiente').toLowerCase()] || cita.estado}
                      </Badge>
                      <Button variant="outline" size="small" onClick={() => openDetalleCita(cita)}>Ver detalle</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Pacientes asignados (solo admin con dashboard) */}
      {isAdmin && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>👥 Pacientes asignados ({pacientesAsignados.length})</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Input
                placeholder="Buscar por nombre..."
                value={searchPacientesQuery}
                onChange={(e) => setSearchPacientesQuery(e.target.value)}
                style={{ width: 200 }}
              />
              <Button variant="primary" onClick={openAsignarModal} loading={asignarLoading && !asignarModalOpen}>
                Asignar
              </Button>
            </div>
          </div>
          {filteredPacientes.length === 0 ? (
            <EmptyState message={pacientesAsignados.length === 0 ? 'No hay pacientes asignados' : 'No hay resultados para la búsqueda'} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredPacientes.map((p) => {
                const pid = p.id_paciente ?? p.id;
                const nombre = formatNombreCompleto(p);
                return (
                  <div
                    key={pid}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      background: 'var(--color-fondo-card)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--color-borde-claro)',
                    }}
                  >
                    <div>
                      <strong>{sanitizeForDisplay(nombre)}</strong>
                      {(p.edad != null || p.telefono || p.numero_celular) && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>
                          {p.edad != null ? `${p.edad} años` : ''} {p.telefono || p.numero_celular ? `• ${p.telefono || p.numero_celular}` : ''}
                        </span>
                      )}
                      {Array.isArray(p.comorbilidades) && p.comorbilidades.length > 0 && (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
                          {p.comorbilidades.join(', ')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button variant="outline" size="small" onClick={() => navigate(`/pacientes/${pid}`)}>Ver</Button>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => handleUnassignPatient(p)}
                        disabled={unassigningId === pid}
                      >
                        Desasignar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Citas recientes (solo admin con dashboard) */}
      {isAdmin && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>📅 Citas recientes ({citasRecientes.length})</h3>
            {citasRecientes.length > 0 && (
              <Button variant="outline" size="small" onClick={() => navigate(`/citas?doctor=${parsedId}`)}>
                Ver todas
              </Button>
            )}
          </div>
          {citasRecientesSlice.length === 0 ? (
            <EmptyState message="No hay citas recientes" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {citasRecientesSlice.map((cita) => {
                const estado = (cita.estado || 'pendiente').toLowerCase();
                return (
                  <div
                    key={cita.id_cita ?? cita.id}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--color-fondo-card)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--color-borde-claro)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <strong>{getNombreCita(cita)}</strong>
                        <span style={{ marginLeft: '0.5rem', color: 'var(--color-texto-secundario)' }}>
                          {formatDateTime(cita.fecha_cita)}
                        </span>
                        {cita.motivo && <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{cita.motivo}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Badge variant={BADGE_ESTADO[estado] || 'neutral'}>{ESTADO_CITA[estado] || cita.estado}</Badge>
                        <Button variant="outline" size="small" onClick={() => openDetalleCita(cita)}>Ver detalle</Button>
                        {estado === 'pendiente' && (
                          <>
                            <Button variant="primary" size="small" onClick={() => openCompletarCita(cita)}>Completar</Button>
                            <Button variant="outline" size="small" onClick={() => openReprogramarModal(cita)}>Reprogramar</Button>
                            <Button variant="outline" size="small" onClick={() => openEstadoModal(cita)}>Cambiar estado</Button>
                          </>
                        )}
                        {estado === 'reprogramada' && (
                          <Button variant="outline" size="small" onClick={() => openReprogramarModal(cita)}>Reprogramar</Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {citasRecientes.length > 5 && (
                <p style={{ fontSize: '0.9rem', color: 'var(--color-texto-secundario)', margin: '0.5rem 0 0' }}>
                  Mostrando 5 de {citasRecientes.length}. <button type="button" onClick={() => navigate(`/citas?doctor=${parsedId}`)} style={{ background: 'none', border: 'none', color: 'var(--color-primario)', cursor: 'pointer', textDecoration: 'underline' }}>Ver todas</button>
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Modal Detalle Cita */}
      <DetalleCitaModal
        open={detalleCitaOpen}
        onClose={() => { setDetalleCitaOpen(false); setCitaDetalle(null); }}
        citaDetalle={citaDetalle}
        loading={citaDetalleLoading}
        canEditMedical={isAdmin}
        onCompletarWizard={(citaId) => {
          setDetalleCitaOpen(false);
          setCitaDetalle(null);
          setCompletarCitaId(citaId);
        }}
        onVerEnPagina={(citaId) => navigate(`/citas/${citaId}`)}
      />

      {/* Modal Completar Cita */}
      <CompletarCitaModal
        open={!!completarCitaId}
        onClose={() => setCompletarCitaId(null)}
        citaId={completarCitaId}
        onSuccess={handleCompletarSuccess}
      />

      {/* Modal Cambiar estado */}
      <Modal
        open={estadoModal.open}
        onClose={() => setEstadoModal({ open: false, cita: null, nuevoEstado: '' })}
        title="Cambiar estado de la cita"
        footer={null}
        width={400}
      >
        {estadoModal.cita && (
          <div>
            <p style={{ marginBottom: '1rem' }}>
              {getNombreCita(estadoModal.cita)} — {formatDateTime(estadoModal.cita.fecha_cita)}
            </p>
            <Select
              label="Nuevo estado"
              value={estadoModal.nuevoEstado}
              onChange={(v) => setEstadoModal((m) => ({ ...m, nuevoEstado: v }))}
              options={Object.entries(ESTADO_CITA).map(([k, label]) => ({ value: k, label }))}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="primary" onClick={handleActualizarEstado} disabled={updatingEstado || !estadoModal.nuevoEstado}>
                {updatingEstado ? 'Actualizando…' : 'Actualizar'}
              </Button>
              <Button variant="outline" onClick={() => setEstadoModal({ open: false, cita: null, nuevoEstado: '' })}>Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Reprogramar */}
      <Modal
        open={reprogramarModal.open}
        onClose={() => setReprogramarModal({ open: false, cita: null, fecha: '', motivo: '' })}
        title="Reprogramar cita"
        footer={null}
        width={420}
      >
        {reprogramarModal.cita && (
          <div>
            <p style={{ marginBottom: '1rem' }}>
              {getNombreCita(reprogramarModal.cita)} — {formatDateTime(reprogramarModal.cita.fecha_cita)}
            </p>
            <Input
              label="Nueva fecha y hora"
              type="datetime-local"
              value={reprogramarModal.fecha}
              onChange={(e) => setReprogramarModal((m) => ({ ...m, fecha: e.target.value }))}
            />
            <Input
              label="Motivo (opcional)"
              value={reprogramarModal.motivo}
              onChange={(e) => setReprogramarModal((m) => ({ ...m, motivo: e.target.value }))}
              placeholder="Ej: Cambio de horario..."
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <Button variant="primary" onClick={handleReprogramar} disabled={updatingReprogramar || !reprogramarModal.fecha?.trim()}>
                {updatingReprogramar ? 'Reprogramando…' : 'Reprogramar'}
              </Button>
              <Button variant="outline" onClick={() => setReprogramarModal({ open: false, cita: null, fecha: '', motivo: '' })}>Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Cambiar contraseña */}
      <Modal
        open={passwordModal.open}
        onClose={() => setPasswordModal({ open: false, newPassword: '', confirmPassword: '' })}
        title="Cambiar contraseña del doctor"
        footer={null}
        width={400}
      >
        <p style={{ marginBottom: '1rem', color: 'var(--color-texto-secundario)' }}>
          Para: {doctor?.email}
        </p>
        <Input
          label="Nueva contraseña"
          type="password"
          value={passwordModal.newPassword}
          onChange={(e) => setPasswordModal((m) => ({ ...m, newPassword: e.target.value }))}
          placeholder="Mínimo 8 caracteres"
        />
        <Input
          label="Confirmar contraseña"
          type="password"
          value={passwordModal.confirmPassword}
          onChange={(e) => setPasswordModal((m) => ({ ...m, confirmPassword: e.target.value }))}
        />
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <Button variant="primary" onClick={handleCambiarPassword} disabled={passwordSaving}>Cambiar contraseña</Button>
          <Button variant="outline" onClick={() => setPasswordModal({ open: false, newPassword: '', confirmPassword: '' })}>Cancelar</Button>
        </div>
      </Modal>

      {/* Modal Asignar paciente */}
      <Modal
        open={asignarModalOpen}
        onClose={() => { setAsignarModalOpen(false); setAsignarModalSearch(''); }}
        title="Asignar paciente al doctor"
        footer={null}
        width={520}
      >
        <p style={{ marginBottom: '0.5rem', color: 'var(--color-texto-secundario)' }}>
          Selecciona un paciente para asignar a {nombreCompleto}
        </p>
        <Input
          placeholder="Buscar por nombre o edad..."
          value={asignarModalSearch}
          onChange={(e) => setAsignarModalSearch(e.target.value)}
          style={{ marginBottom: '1rem' }}
        />
        {asignarLoading && availablePatients.length === 0 ? (
          <LoadingSpinner />
        ) : availablePatients.length === 0 ? (
          <EmptyState message="No hay pacientes disponibles para asignar (todos están asignados o no hay pacientes)" />
        ) : (() => {
          const q = asignarModalSearch?.trim().toLowerCase() || '';
          const filtered = q
            ? availablePatients.filter((p) => {
                const nombre = formatNombreCompleto(p).toLowerCase();
                const edadStr = p.edad != null ? String(p.edad) : '';
                return nombre.includes(q) || edadStr.includes(q);
              })
            : availablePatients;
          return filtered.length === 0 ? (
            <EmptyState message="No hay resultados para la búsqueda" />
          ) : (
          <div style={{ maxHeight: 360, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((p) => {
              const pid = p.id_paciente ?? p.id;
              const nombre = formatNombreCompleto(p);
              return (
                <div
                  key={pid}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    background: 'var(--color-fondo-card)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--color-borde-claro)',
                  }}
                >
                  <span>{sanitizeForDisplay(nombre)} {p.edad != null && `(${p.edad} años)`}</span>
                  <Button variant="primary" size="small" onClick={() => handleAssignPatient(p)} disabled={asignarLoading}>
                    Asignar
                  </Button>
                </div>
              );
            })}
          </div>
          );
        })()}
      </Modal>
    </div>
  );
}
