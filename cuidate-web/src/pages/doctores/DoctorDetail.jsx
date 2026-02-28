import { useState, useEffect, useCallback } from 'react';
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
import { getCitaById } from '../../api/citas';
import { reprogramarCita, updateCitaEstado } from '../../api/citas';
import { adminChangePassword } from '../../api/auth';
import { PageHeader, DataCard } from '../../components/shared';
import { LoadingSpinner, Button, Card, Badge, Modal, Input, Select } from '../../components/ui';
import DetalleCitaModal from '../../components/pacientes/DetalleCitaModal';
import CompletarCitaModal from '../../components/citas/CompletarCitaModal';
import { useAuthStore } from '../../stores/authStore';
import { useCurrentDoctorId } from '../../hooks/useCurrentDoctorId';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatDate, formatDateTime } from '../../utils/format';

const ESTADOS_CITA = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'atendida', label: 'Atendida' },
  { value: 'no_asistida', label: 'No asistida' },
  { value: 'reprogramada', label: 'Reprogramada' },
  { value: 'cancelada', label: 'Cancelada' },
];

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Modales
  const [detalleCitaOpen, setDetalleCitaOpen] = useState(false);
  const [citaDetalle, setCitaDetalle] = useState(null);
  const [loadingCitaDetalle, setLoadingCitaDetalle] = useState(false);
  const [completarCitaId, setCompletarCitaId] = useState(null);
  const [reprogramarOpen, setReprogramarOpen] = useState(false);
  const [reprogramarCitaSel, setReprogramarCitaSel] = useState(null);
  const [reprogramarFecha, setReprogramarFecha] = useState('');
  const [reprogramarMotivo, setReprogramarMotivo] = useState('');
  const [reprogramarSaving, setReprogramarSaving] = useState(false);
  const [estadoOpen, setEstadoOpen] = useState(false);
  const [estadoCitaSel, setEstadoCitaSel] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [estadoSaving, setEstadoSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [availablePatients, setAvailablePatients] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [searchPacientes, setSearchPacientes] = useState('');
  const [unassigningId, setUnassigningId] = useState(null);

  const parsedId = parsePositiveInt(id, 0);
  const isAdminFn = useAuthStore((s) => s.isAdmin);
  const isAdmin = typeof isAdminFn === 'function' ? isAdminFn() : false;
  const { idDoctor } = useCurrentDoctorId();

  if (!isAdmin && idDoctor != null && parsedId > 0 && parsedId !== idDoctor) {
    return <Navigate to="/doctores" replace />;
  }

  const canEdit = isAdmin || (idDoctor != null && idDoctor === parsedId);

  const loadDoctor = useCallback(async () => {
    if (parsedId === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDoctorById(parsedId);
      setDoctor(data);
    } catch (err) {
      setError(err?.response?.status === 404
        ? 'Doctor no encontrado'
        : err?.response?.data?.error || err?.message || 'Error al cargar el doctor');
    } finally {
      setLoading(false);
    }
  }, [parsedId]);

  const loadDashboard = useCallback(async () => {
    if (!isAdmin || parsedId === 0) return;
    setDashboardLoading(true);
    try {
      const data = await getDoctorDashboard(parsedId);
      setDashboardData(data);
    } catch {
      setDashboardData(null);
    } finally {
      setDashboardLoading(false);
    }
  }, [isAdmin, parsedId]);

  useEffect(() => {
    loadDoctor();
  }, [loadDoctor]);

  useEffect(() => {
    if (isAdmin && parsedId > 0 && doctor) loadDashboard();
  }, [isAdmin, parsedId, doctor, loadDashboard]);

  const refetchAll = useCallback(() => {
    loadDoctor();
    if (isAdmin) loadDashboard();
  }, [loadDoctor, loadDashboard, isAdmin]);

  const handleDelete = async () => {
    if (!confirmDelete || parsedId === 0) return;
    setDeleting(true);
    try {
      await deleteDoctor(parsedId);
      message.success('Doctor desactivado');
      navigate('/doctores', { replace: true });
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al desactivar');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleReactivate = async () => {
    if (parsedId === 0) return;
    setDeleting(true);
    try {
      await reactivateDoctor(parsedId);
      message.success('Doctor reactivado');
      refetchAll();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al reactivar');
    } finally {
      setDeleting(false);
    }
  };

  const handleHardDelete = async () => {
    if (parsedId === 0) return;
    if (!window.confirm('¿Eliminar permanentemente a este doctor? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      await hardDeleteDoctor(parsedId);
      message.success('Doctor eliminado');
      navigate('/doctores', { replace: true });
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const openDetalleCita = useCallback(async (cita) => {
    const citaId = cita?.id ?? cita?.id_cita;
    if (!citaId) return;
    setLoadingCitaDetalle(true);
    setCitaDetalle(null);
    setDetalleCitaOpen(true);
    try {
      const data = await getCitaById(citaId);
      setCitaDetalle(data);
    } catch {
      message.error('No se pudo cargar el detalle de la cita');
      setDetalleCitaOpen(false);
    } finally {
      setLoadingCitaDetalle(false);
    }
  }, []);

  const openCompletar = useCallback((cita) => {
    const citaId = cita?.id ?? cita?.id_cita;
    if (citaId) setCompletarCitaId(citaId);
  }, []);

  const openReprogramar = useCallback((cita) => {
    setReprogramarCitaSel(cita);
    setReprogramarFecha('');
    setReprogramarMotivo('');
    setReprogramarOpen(true);
  }, []);

  const submitReprogramar = async () => {
    const cita = reprogramarCitaSel;
    const citaId = cita?.id ?? cita?.id_cita;
    if (!citaId || !reprogramarFecha?.trim()) {
      message.warning('Indica la nueva fecha y hora');
      return;
    }
    setReprogramarSaving(true);
    try {
      const fechaVal = reprogramarFecha.trim();
      const fechaISO = fechaVal.includes('T') ? new Date(fechaVal).toISOString() : fechaVal;
      await reprogramarCita(citaId, {
        fecha_reprogramada: fechaISO,
        motivo_reprogramacion: reprogramarMotivo.trim() || undefined,
      });
      message.success('Cita reprogramada');
      setReprogramarOpen(false);
      setReprogramarCitaSel(null);
      refetchAll();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al reprogramar');
    } finally {
      setReprogramarSaving(false);
    }
  };

  const openEstado = useCallback((cita) => {
    setEstadoCitaSel(cita);
    setNuevoEstado((cita?.estado || 'pendiente').toLowerCase());
    setEstadoOpen(true);
  }, []);

  const submitEstado = async () => {
    const cita = estadoCitaSel;
    const citaId = cita?.id ?? cita?.id_cita;
    if (!citaId || !nuevoEstado) return;
    setEstadoSaving(true);
    try {
      await updateCitaEstado(citaId, { estado: nuevoEstado });
      message.success('Estado actualizado');
      setEstadoOpen(false);
      setEstadoCitaSel(null);
      refetchAll();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al actualizar estado');
    } finally {
      setEstadoSaving(false);
    }
  };

  const submitPassword = async () => {
    const idUsuario = doctor?.id_usuario ?? doctor?.Usuario?.id_usuario;
    if (!idUsuario) {
      message.error('No se puede cambiar la contraseña: usuario no vinculado');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      message.warning('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      message.warning('Las contraseñas no coinciden');
      return;
    }
    setPasswordSaving(true);
    try {
      await adminChangePassword({ userId: idUsuario, newPassword });
      message.success('Contraseña actualizada');
      setPasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al cambiar contraseña');
    } finally {
      setPasswordSaving(false);
    }
  };

  const openAssign = useCallback(async () => {
    setAssignOpen(true);
    setAssignLoading(true);
    try {
      const list = await getAvailablePatientsForDoctor(parsedId);
      setAvailablePatients(Array.isArray(list) ? list : []);
    } catch {
      message.error('Error al cargar pacientes disponibles');
      setAvailablePatients([]);
    } finally {
      setAssignLoading(false);
    }
  }, [parsedId]);

  const handleAssign = async (paciente) => {
    const pid = paciente?.id_paciente ?? paciente?.id;
    if (!pid) return;
    setAssigningId(pid);
    try {
      await assignPatientToDoctor(parsedId, pid);
      message.success(`${paciente?.nombre ?? 'Paciente'} asignado`);
      setAvailablePatients((prev) => prev.filter((p) => (p.id_paciente ?? p.id) !== pid));
      refetchAll();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al asignar');
    } finally {
      setAssigningId(null);
    }
  };

  const handleUnassign = async (paciente) => {
    const pid = paciente?.id ?? paciente?.id_paciente;
    if (!pid || !window.confirm(`¿Desasignar a ${paciente?.nombre ?? 'este paciente'} de este doctor?`)) return;
    setUnassigningId(pid);
    try {
      await unassignPatientFromDoctor(parsedId, pid);
      message.success('Paciente desasignado');
      refetchAll();
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error al desasignar');
    } finally {
      setUnassigningId(null);
    }
  };

  const pacientesAsignados = dashboardData?.pacientesAsignados ?? [];
  const citasHoy = dashboardData?.citasHoy ?? [];
  const citasRecientes = dashboardData?.citasRecientes ?? [];
  const filteredAvailable = searchPacientes.trim()
    ? availablePatients.filter((p) => {
        const n = `${p.nombre ?? ''} ${p.apellido_paterno ?? ''} ${p.apellido_materno ?? ''}`.toLowerCase();
        return n.includes(searchPacientes.toLowerCase());
      })
    : availablePatients;

  const getEstadoBadge = (estado) => {
    const v = (estado || 'pendiente').toLowerCase();
    const variant = { atendida: 'success', pendiente: 'neutral', no_asistida: 'error', reprogramada: 'neutral', cancelada: 'error' }[v] || 'neutral';
    const label = ESTADOS_CITA.find((e) => e.value === v)?.label || estado || 'Pendiente';
    return <Badge variant={variant}>{label}</Badge>;
  };

  const nombrePaciente = (p) => {
    if (!p) return '—';
    if (p.paciente) return `${p.paciente.nombre ?? ''} ${p.paciente.apellido ?? ''}`.trim() || 'Paciente';
    return `${p.nombre ?? ''} ${p.apellido_paterno ?? p.apellido ?? ''}`.trim() || 'Paciente';
  };

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
  const nombreCompleto = [d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' ') || '—';
  const gradoEstudio = d.grado_estudio || dashboardData?.doctor?.grado_estudio || dashboardData?.doctor?.especialidad;
  const institucion = d.institucion_hospitalaria ?? dashboardData?.doctor?.institucion_hospitalaria;
  const anosServicio = d.anos_servicio ?? dashboardData?.doctor?.anos_servicio;
  const fechaRegistro = d.fecha_registro ?? d.createdAt;

  const items = [
    { label: 'Nombre', value: sanitizeForDisplay(nombreCompleto) },
    { label: 'Email', value: sanitizeForDisplay(d.email) || '—' },
    { label: 'Módulo', value: sanitizeForDisplay(d.modulo_nombre ?? dashboardData?.doctor?.modulo) || '—' },
    { label: 'Teléfono', value: sanitizeForDisplay(d.telefono) || '—' },
    ...(gradoEstudio ? [{ label: 'Grado de estudio', value: sanitizeForDisplay(gradoEstudio) }] : []),
    ...(institucion ? [{ label: 'Institución', value: sanitizeForDisplay(institucion) }] : []),
    ...(anosServicio != null ? [{ label: 'Años de servicio', value: String(anosServicio) }] : []),
    { label: 'Pacientes asignados', value: (dashboardData?.pacientesAsignados?.length ?? d.pacientes_asignados) != null ? String(dashboardData?.pacientesAsignados?.length ?? d.pacientes_asignados) : '—' },
    { label: 'Estado', value: d.activo ? 'Activo' : 'Inactivo' },
    ...(fechaRegistro ? [{ label: 'Fecha de registro', value: formatDate(fechaRegistro) }] : []),
  ];

  return (
    <div>
      <PageHeader title="Detalle de doctor" showBack backTo="/doctores" />
      <DataCard title="Datos del doctor" items={items} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
        {canEdit && (
          <Button variant="primary" type="button" onClick={() => navigate(`/doctores/${parsedId}/editar`)}>
            Editar
          </Button>
        )}
        {isAdmin && (
          <>
            {d.activo ? (
              <>
                {!confirmDelete ? (
                  <Button variant="danger" type="button" onClick={() => setConfirmDelete(true)} disabled={deleting}>
                    Desactivar
                  </Button>
                ) : (
                  <>
                    <span style={{ color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>¿Desactivar este doctor?</span>
                    <Button variant="danger" type="button" onClick={handleDelete} disabled={deleting}>
                      {deleting ? 'Desactivando…' : 'Sí, desactivar'}
                    </Button>
                    <Button variant="outline" type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                      Cancelar
                    </Button>
                  </>
                )}
                {d.id_usuario != null && (
                  <Button variant="outline" type="button" onClick={() => setPasswordOpen(true)}>
                    Cambiar contraseña
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="primary" type="button" onClick={handleReactivate} disabled={deleting}>
                  {deleting ? 'Reactivando…' : 'Reactivar'}
                </Button>
                <Button variant="danger" type="button" onClick={handleHardDelete} disabled={deleting}>
                  {deleting ? 'Eliminando…' : 'Eliminar permanentemente'}
                </Button>
              </>
            )}
          </>
        )}
      </div>

      {isAdmin && (
        <>
          {/* Citas de hoy */}
          <Card style={{ marginTop: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Citas de hoy</h3>
            {dashboardLoading ? (
              <LoadingSpinner />
            ) : citasHoy.length === 0 ? (
              <p style={{ color: 'var(--color-texto-secundario)', margin: 0 }}>No hay citas programadas para hoy.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {citasHoy.map((cita) => (
                  <li
                    key={cita.id ?? cita.id_cita}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      background: 'var(--color-fondo-card)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--color-borde-claro)',
                    }}
                  >
                    <div>
                      <strong>{nombrePaciente(cita)}</strong>
                      <span style={{ marginLeft: '0.5rem', color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>
                        {formatDateTime(cita.fecha_cita)}
                      </span>
                      {cita.motivo && <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{sanitizeForDisplay(cita.motivo)}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {getEstadoBadge(cita.estado)}
                      <Button variant="outline" size="small" onClick={() => openDetalleCita(cita)}>
                        Ver detalle
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Pacientes asignados */}
          <Card style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Pacientes asignados ({pacientesAsignados.length})</h3>
              <Button variant="primary" size="small" onClick={openAssign} disabled={assignLoading}>
                {assignLoading ? 'Cargando…' : 'Asignar paciente'}
              </Button>
            </div>
            {dashboardLoading ? (
              <LoadingSpinner />
            ) : pacientesAsignados.length === 0 ? (
              <p style={{ color: 'var(--color-texto-secundario)', margin: 0 }}>No hay pacientes asignados.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pacientesAsignados.map((p) => {
                  const pid = p.id ?? p.id_paciente;
                  return (
                    <li
                      key={pid}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--color-fondo-card)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--color-borde-claro)',
                      }}
                    >
                      <div>
                        <strong>{p.nombre ?? ''} {p.apellido ?? p.apellido_paterno ?? ''}</strong>
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
                          {p.edad != null ? `${p.edad} años` : ''} {p.telefono ?? p.numero_celular ? ` · ${p.telefono ?? p.numero_celular}` : ''}
                        </span>
                        {Array.isArray(p.comorbilidades) && p.comorbilidades.length > 0 && (
                          <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--color-texto-secundario)' }}>
                            {p.comorbilidades.join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button variant="outline" size="small" onClick={() => navigate(`/pacientes/${pid}`)}>
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => handleUnassign(p)}
                          disabled={unassigningId === pid}
                        >
                          {unassigningId === pid ? 'Desasignando…' : 'Desasignar'}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Citas recientes */}
          <Card style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Citas recientes</h3>
              <Button variant="outline" size="small" onClick={() => navigate('/citas', { state: { doctorId: parsedId } })}>
                Ver historial completo
              </Button>
            </div>
            {dashboardLoading ? (
              <LoadingSpinner />
            ) : citasRecientes.length === 0 ? (
              <p style={{ color: 'var(--color-texto-secundario)', margin: 0 }}>No hay citas recientes.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(citasRecientes.slice(0, 5)).map((cita) => (
                  <li
                    key={cita.id ?? cita.id_cita}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: 'var(--color-fondo-card)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--color-borde-claro)',
                    }}
                  >
                    <div>
                      <strong>{nombrePaciente(cita)}</strong>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
                        {formatDateTime(cita.fecha_cita)}
                      </span>
                      {cita.motivo && <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{sanitizeForDisplay(cita.motivo)}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {getEstadoBadge(cita.estado)}
                      <Button variant="outline" size="small" onClick={() => openDetalleCita(cita)}>Ver detalle</Button>
                      {(cita.estado === 'pendiente' || (cita.estado && cita.estado.toLowerCase() === 'pendiente')) && (
                        <>
                          <Button variant="outline" size="small" onClick={() => openCompletar(cita)}>Completar</Button>
                          <Button variant="outline" size="small" onClick={() => openReprogramar(cita)}>Reprogramar</Button>
                        </>
                      )}
                      <Button variant="outline" size="small" onClick={() => openEstado(cita)}>Cambiar estado</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* Modal detalle cita */}
      <DetalleCitaModal
        open={detalleCitaOpen}
        onClose={() => { setDetalleCitaOpen(false); setCitaDetalle(null); }}
        citaDetalle={citaDetalle}
        loading={loadingCitaDetalle}
        canEditMedical={isAdmin}
        onVerEnPagina={citaDetalle ? () => { setDetalleCitaOpen(false); navigate(`/citas/${citaDetalle.id_cita ?? citaDetalle.id}`); } : undefined}
        onCompletarWizard={citaDetalle && (citaDetalle.estado === 'pendiente' || citaDetalle.estado === 'no_asistida') ? () => { setDetalleCitaOpen(false); setCompletarCitaId(citaDetalle.id_cita ?? citaDetalle.id); } : undefined}
      />

      {/* Modal completar cita */}
      <CompletarCitaModal
        open={Boolean(completarCitaId)}
        onClose={() => setCompletarCitaId(null)}
        citaId={completarCitaId}
        onSuccess={() => { setCompletarCitaId(null); refetchAll(); }}
      />

      {/* Modal reprogramar */}
      <Modal
        open={reprogramarOpen}
        onClose={() => { if (!reprogramarSaving) { setReprogramarOpen(false); setReprogramarCitaSel(null); } }}
        title="Reprogramar cita"
        width={420}
        footer={null}
      >
        {reprogramarCitaSel && (
          <div>
            <p style={{ marginBottom: '1rem' }}>{nombrePaciente(reprogramarCitaSel)} · {formatDateTime(reprogramarCitaSel.fecha_cita)}</p>
            <Input
              label="Nueva fecha y hora"
              type="datetime-local"
              value={reprogramarFecha}
              onChange={(e) => setReprogramarFecha(e.target.value)}
            />
            <Input
              label="Motivo (opcional)"
              value={reprogramarMotivo}
              onChange={(e) => setReprogramarMotivo(e.target.value)}
              style={{ marginTop: '0.75rem' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <Button variant="primary" onClick={submitReprogramar} disabled={reprogramarSaving || !reprogramarFecha?.trim()}>
                {reprogramarSaving ? 'Guardando…' : 'Reprogramar'}
              </Button>
              <Button variant="outline" onClick={() => { setReprogramarOpen(false); setReprogramarCitaSel(null); }} disabled={reprogramarSaving}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal cambiar estado */}
      <Modal
        open={estadoOpen}
        onClose={() => { if (!estadoSaving) { setEstadoOpen(false); setEstadoCitaSel(null); } }}
        title="Cambiar estado de la cita"
        width={360}
        footer={null}
      >
        {estadoCitaSel && (
          <div>
            <p style={{ marginBottom: '1rem' }}>{nombrePaciente(estadoCitaSel)} · {formatDateTime(estadoCitaSel.fecha_cita)}</p>
            <Select
              label="Nuevo estado"
              value={nuevoEstado}
              onChange={(v) => setNuevoEstado(v ?? '')}
              options={ESTADOS_CITA.map((e) => ({ value: e.value, label: e.label }))}
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <Button variant="primary" onClick={submitEstado} disabled={estadoSaving || !nuevoEstado}>
                {estadoSaving ? 'Guardando…' : 'Actualizar'}
              </Button>
              <Button variant="outline" onClick={() => { setEstadoOpen(false); setEstadoCitaSel(null); }} disabled={estadoSaving}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal cambiar contraseña */}
      <Modal
        open={passwordOpen}
        onClose={() => { if (!passwordSaving) { setPasswordOpen(false); setNewPassword(''); setConfirmPassword(''); } }}
        title="Cambiar contraseña del doctor"
        width={400}
        footer={null}
      >
        <p style={{ marginBottom: '1rem', color: 'var(--color-texto-secundario)' }}>
          Nueva contraseña para {nombreCompleto}. Mínimo 8 caracteres.
        </p>
        <Input
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
        />
        <Input
          label="Confirmar contraseña"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{ marginTop: '0.75rem' }}
        />
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <Button variant="primary" onClick={submitPassword} disabled={passwordSaving || !newPassword || newPassword !== confirmPassword || newPassword.length < 8}>
            {passwordSaving ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
          <Button variant="outline" onClick={() => { setPasswordOpen(false); setNewPassword(''); setConfirmPassword(''); }} disabled={passwordSaving}>
            Cancelar
          </Button>
        </div>
      </Modal>

      {/* Modal asignar paciente */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Asignar paciente al doctor"
        width={520}
        footer={null}
      >
        <Input
          placeholder="Buscar por nombre..."
          value={searchPacientes}
          onChange={(e) => setSearchPacientes(e.target.value)}
          style={{ marginBottom: '1rem' }}
        />
        {assignLoading ? (
          <LoadingSpinner />
        ) : filteredAvailable.length === 0 ? (
          <p style={{ color: 'var(--color-texto-secundario)' }}>{searchPacientes ? 'No hay coincidencias.' : 'No hay pacientes disponibles para asignar.'}</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 320, overflowY: 'auto' }}>
            {filteredAvailable.map((p) => {
              const pid = p.id_paciente ?? p.id;
              const loadingThis = assigningId === pid;
              return (
                <li
                  key={pid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid var(--color-borde-claro)',
                  }}
                >
                  <div>
                    <strong>{p.nombre ?? ''} {p.apellido_paterno ?? ''} {p.apellido_materno ?? ''}</strong>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
                      {p.edad != null ? `${p.edad} años` : ''} {p.numero_celular ?? p.telefono ? ` · ${p.numero_celular ?? p.telefono}` : ''}
                    </span>
                  </div>
                  <Button variant="primary" size="small" onClick={() => handleAssign(p)} disabled={loadingThis}>
                    {loadingThis ? 'Asignando…' : 'Asignar'}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Modal>
    </div>
  );
}
