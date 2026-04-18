import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getUsuarios, updateUsuario, deleteUsuario, createUsuario } from '../../api/auth';
import { revokeUserSessions } from '../../api/adminOperations';
import { createDoctor } from '../../api/doctores';
import { getModulos } from '../../api/modulos';
import { PageHeader, SearchFilterBar } from '../../components/shared';
import DesactivarPacienteUsuarioModal from '../../components/pacientes/DesactivarPacienteUsuarioModal';
import { message } from 'antd';
import { Button, Input, Select, Table, LoadingSpinner, EmptyState, Badge, Modal } from '../../components/ui';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { ROLES } from '../../utils/constants';
import { nuevoUsuarioSchema } from '../../lib/validations/usuarioSchema';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

export default function UsuariosList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  /** Fila completa al abrir «Editar» (estado de cuenta solo lectura; desactivar solo desde la tabla). */
  const [editingRow, setEditingRow] = useState(null);
  const [formEmail, setFormEmail] = useState('');
  const [formRol, setFormRol] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  const [desactivarPacModal, setDesactivarPacModal] = useState({
    open: false,
    idUsuario: null,
    idPaciente: null,
    email: '',
  });

  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [modulos, setModulos] = useState([]);
  const [params, setParams] = useState({
    estado: 'activos',
    search: '',
    rol: '',
    modulo: '',
  });

  const {
    control: newUserControl,
    handleSubmit: handleNewUserSubmit,
    watch: watchNewUser,
    reset: resetNewUser,
    formState: { errors: newUserErrors, isSubmitting: newUserSubmitting },
    setError: setNewUserError,
    clearErrors: clearNewUserErrors,
  } = useForm({
    resolver: zodResolver(nuevoUsuarioSchema),
    defaultValues: {
      email: '',
      rol: ROLES.ADMIN,
      modo: 'invite',
      password: '',
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      id_modulo: '',
    },
  });

  const newUserRol = watchNewUser('rol');
  const newUserModo = watchNewUser('modo');

  useOnboardingPageReady(!loading);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsuarios({
        estado: params.estado || 'activos',
        search: (params.search || '').trim() || undefined,
        rol: (params.rol || '').trim() || undefined,
        modulo: params.modulo != null && String(params.modulo).trim() !== '' ? params.modulo : undefined,
      });
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar usuarios');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [params.estado, params.search, params.rol, params.modulo]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getModulos().then((data) => setModulos(Array.isArray(data) ? data : [])).catch(() => setModulos([]));
  }, []);

  const handleSearch = (searchParams) => {
    setParams((prev) => ({
      ...prev,
      estado: searchParams.estado ?? prev.estado,
      modulo:
        searchParams.modulo !== undefined && searchParams.modulo !== ''
          ? searchParams.modulo
          : '',
      rol: searchParams.rol !== undefined ? searchParams.rol || '' : prev.rol,
      search: searchParams.search !== undefined ? searchParams.search : prev.search,
    }));
  };

  const filterOptions = useMemo(() => {
    const opts = [
      {
        key: 'estado',
        label: 'Estado',
        options: [
          { value: 'activos', label: 'Activos' },
          { value: 'inactivos', label: 'Inactivos' },
          { value: 'todos', label: 'Todos' },
        ],
      },
      {
        key: 'rol',
        label: 'Rol',
        options: [
          { value: '', label: 'Todos' },
          { value: 'Admin', label: 'Admin' },
          { value: 'Doctor', label: 'Doctor' },
          { value: 'Paciente', label: 'Paciente' },
        ],
      },
    ];
    if (modulos.length > 0) {
      opts.push({
        key: 'modulo',
        label: 'Módulo',
        options: [
          { value: '', label: 'Todos' },
          ...modulos.map((m) => ({
            value: String(m.id_modulo ?? m.id),
            label: sanitizeForDisplay(m.nombre_modulo ?? m.nombre) || '—',
          })),
        ],
      });
    }
    return opts;
  }, [modulos]);

  const handleEdit = (row) => {
    setEditingId(row.id_usuario ?? row.id);
    setEditingRow(row);
    setFormEmail(row.email ?? '');
    setFormRol(row.rol ?? '');
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const email = formEmail?.trim();
    if (!email) {
      setSubmitError('El correo es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      await updateUsuario(editingId, {
        email,
        rol: formRol || undefined,
      });
      setEditingId(null);
      setEditingRow(null);
      load();
      message.success('Usuario actualizado correctamente');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error al actualizar';
      setSubmitError(msg);
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeSessions = async (row) => {
    const id = row.id_usuario ?? row.id;
    if (!id) return;
    if (!window.confirm('¿Revocar todas las sesiones (refresh tokens) de este usuario? Deberá volver a iniciar sesión.')) return;
    try {
      await revokeUserSessions(id);
      message.success('Sesiones revocadas');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error';
      message.error(msg);
    }
  };

  const handleReactivarUsuario = async () => {
    if (!editingId) return;
    if (
      !window.confirm(
        '¿Reactivar esta cuenta? El usuario podrá volver a iniciar sesión. Si tiene perfil de doctor o paciente asociado, también se reactivará.'
      )
    ) {
      return;
    }
    setReactivating(true);
    setSubmitError('');
    try {
      await updateUsuario(editingId, { activo: true });
      setEditingId(null);
      setEditingRow(null);
      load();
      message.success('Usuario reactivado correctamente');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error al reactivar';
      setSubmitError(msg);
      message.error(msg);
    } finally {
      setReactivating(false);
    }
  };

  const handleDesactivar = async (row) => {
    const id = row.id_usuario ?? row.id;
    if (!id) return;

    const idPaciente = row.paciente_perfil?.id_paciente;
    if (row.rol === 'Paciente' && idPaciente) {
      setDesactivarPacModal({
        open: true,
        idUsuario: id,
        idPaciente,
        email: String(row.email ?? '').trim(),
      });
      return;
    }

    if (!window.confirm('¿Desactivar este usuario? No podrá iniciar sesión.')) return;
    try {
      await deleteUsuario(id);
      load();
      if (editingId === id) {
        setEditingId(null);
        setEditingRow(null);
      }
      message.success('Usuario desactivado');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error al desactivar';
      setSubmitError(msg);
      message.error(msg);
    }
  };

  const closeDesactivarPacModal = () => {
    setDesactivarPacModal({ open: false, idUsuario: null, idPaciente: null, email: '' });
  };

  const onDesactivarPacienteCompletado = () => {
    load();
    const uid = desactivarPacModal.idUsuario;
    if (uid != null && editingId === uid) {
      setEditingId(null);
      setEditingRow(null);
    }
  };

  const onSubmitNewUser = async (data) => {
    clearNewUserErrors();
    const email = (data.email || '').trim();
    const rol = data.rol === ROLES.DOCTOR ? ROLES.DOCTOR : ROLES.ADMIN;
    const useInvite = data.modo === 'invite';

    try {
      const payload = { email, rol };
      if (useInvite) {
        payload.invite = true;
      } else {
        payload.password = (data.password || '').trim();
      }
      const res = await createUsuario(payload);
      const usuario = res?.usuario;
      const id_usuario = usuario?.id_usuario != null ? Number(usuario.id_usuario) : null;

      if (rol === ROLES.DOCTOR && id_usuario) {
        const idModuloRaw = data.id_modulo;
        const id_modulo = idModuloRaw != null && String(idModuloRaw).trim() !== '' ? (Number(idModuloRaw) || null) : null;
        await createDoctor({
          nombre: (data.nombre || '').trim(),
          apellido_paterno: (data.apellido_paterno || '').trim(),
          apellido_materno: (data.apellido_materno || '').trim() || null,
          id_usuario,
          id_modulo,
        });
      }

      setShowNewUserModal(false);
      resetNewUser();
      load();
      if (useInvite) {
        message.success(`Se envió un correo a ${email} para que confirme su cuenta y cree su contraseña.`);
      } else {
        message.success(rol === ROLES.DOCTOR ? 'Usuario y perfil de doctor creados correctamente.' : 'Usuario creado correctamente.');
      }
    } catch (err) {
      const status = err?.response?.status;
      const resData = err?.response?.data;
      let msg = resData?.error || resData?.message || err?.message || 'Error al crear usuario';
      if (status === 409) msg = 'El correo ya está registrado.';
      if (status === 400 && Array.isArray(resData?.details) && resData.details.length > 0) {
        const first = resData.details[0];
        if (first.msg || first.message) msg = first.msg || first.message;
      }
      setNewUserError('root', { type: 'server', message: msg });
      message.error(msg);
    }
  };

  const columns = useMemo(() => {
    const motivoBajaCol = {
      key: 'motivo_baja',
      label: 'Motivo de baja',
      render: (row) => {
        const rol = (row.rol || '').toString();
        const motivoPaciente = row.paciente_perfil?.motivo_baja;
        if (rol === 'Paciente') {
          const t = motivoPaciente != null ? String(motivoPaciente).trim() : '';
          if (t) {
            return (
              <span
                style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  display: 'inline-block',
                  maxWidth: 'min(28rem, 100%)',
                }}
              >
                {sanitizeForDisplay(t)}
              </span>
            );
          }
          return (
            <span style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }} title="Sin motivo GAM en expediente">
              —
            </span>
          );
        }
        if (rol === 'Doctor') {
          return (
            <span
              style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}
              title="No hay campo de motivo de baja para doctores; solo se desactiva la cuenta."
            >
              —
            </span>
          );
        }
        return (
          <span
            style={{ fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}
            title="Cuenta administrativa desactivada."
          >
            —
          </span>
        );
      },
    };

    const base = [
      { key: 'email', label: 'Correo', render: (row) => sanitizeForDisplay(row.email) || '—' },
      { key: 'rol', label: 'Rol', render: (row) => sanitizeForDisplay(row.rol) || '—' },
      {
        key: 'activo',
        label: 'Estado',
        render: (row) => (
          <Badge variant={row.activo !== false ? 'success' : 'neutral'}>{row.activo !== false ? 'Activo' : 'Inactivo'}</Badge>
        ),
      },
    ];

    if ((params.estado || '').toString().toLowerCase() === 'inactivos') {
      base.push(motivoBajaCol);
    }

    base.push({
      key: '_actions',
      label: 'Acciones',
      render: (row) => (
        <span style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => handleEdit(row)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primario)',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontSize: '0.9rem',
            }}
          >
            Editar
          </button>
          {row.activo !== false && (
            <button
              type="button"
              onClick={() => handleRevokeSessions(row)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-texto-secundario)',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.9rem',
              }}
            >
              Cerrar sesiones
            </button>
          )}
          {row.activo !== false && (
            <button
              type="button"
              onClick={() => handleDesactivar(row)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-error)',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.9rem',
              }}
            >
              Desactivar
            </button>
          )}
        </span>
      ),
    });

    return base;
  }, [params.estado]);

  const emptyUsersMessage = (params.search || '').trim()
    ? `No se encontraron usuarios para "${(params.search || '').trim()}".`
    : 'No hay usuarios';

  return (
    <div data-tour="section-usuarios-root">
      <PageHeader
        title="Usuarios (Admin)"
        action={
          <span data-tour="section-usuarios-new" style={{ display: 'inline-block' }}>
            <Button type="button" variant="primary" onClick={() => { setShowNewUserModal(true); clearNewUserErrors(); resetNewUser(); }}>
              Nuevo usuario
            </Button>
          </span>
        }
      />
      <div data-tour="section-usuarios-filters" style={{ marginBottom: '1rem' }}>
        <SearchFilterBar
          placeholder="Buscar por correo…"
          filterOptions={filterOptions}
          initialSearch={params.search || ''}
          initialFilters={{
            estado: params.estado,
            modulo: params.modulo ? String(params.modulo) : '',
            rol: params.rol || '',
          }}
          onSearch={handleSearch}
        />
      </div>
      <Modal
        open={showNewUserModal}
        onClose={() => { if (!newUserSubmitting) { setShowNewUserModal(false); resetNewUser(); } }}
        title="Nuevo usuario"
        width={520}
        footer={null}
      >
        <form onSubmit={handleNewUserSubmit(onSubmitNewUser)} noValidate>
          {newUserErrors?.root?.message && (
            <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>{newUserErrors.root.message}</p>
          )}
          <Controller
            name="email"
            control={newUserControl}
            render={({ field }) => (
              <Input label="Correo electrónico" type="email" error={newUserErrors.email?.message} {...field} placeholder="ejemplo@correo.com" required />
            )}
          />
          <Controller
            name="rol"
            control={newUserControl}
            render={({ field }) => (
              <Select
                label="Rol"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: ROLES.ADMIN, label: 'Admin' },
                  { value: ROLES.DOCTOR, label: 'Doctor' },
                ]}
              />
            )}
          />
          {newUserRol === ROLES.DOCTOR && (
            <>
              <Controller
                name="apellido_paterno"
                control={newUserControl}
                render={({ field }) => (
                  <Input label="Apellido paterno" placeholder="Ej. González" error={newUserErrors.apellido_paterno?.message} {...field} required />
                )}
              />
              <Controller
                name="apellido_materno"
                control={newUserControl}
                render={({ field }) => (
                  <Input label="Apellido materno" placeholder="Ej. Morales" error={newUserErrors.apellido_materno?.message} {...field} />
                )}
              />
              <Controller
                name="nombre"
                control={newUserControl}
                render={({ field }) => (
                  <Input label="Nombre" placeholder="Ej. José" error={newUserErrors.nombre?.message} {...field} required />
                )}
              />
              <Controller
                name="id_modulo"
                control={newUserControl}
                render={({ field }) => (
                  <Select
                    label="Módulo"
                    placeholder="Seleccionar módulo"
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    options={[{ value: '', label: '— Sin módulo —' }, ...modulos.map((m) => ({ value: String(m.id_modulo ?? m.id), label: m.nombre || String(m.id_modulo ?? m.id) }))]}
                  />
                )}
              />
            </>
          )}
          <div style={{ marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Acceso</div>
          <Controller
            name="modo"
            control={newUserControl}
            render={({ field }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'invite', label: 'Enviar invitación por correo (creará su contraseña en el enlace)' },
                  { value: 'password', label: 'Establecer contraseña ahora' },
                ]}
              />
            )}
          />
          {newUserModo === 'invite' && (
            <p style={{ margin: '0.25rem 0 0.75rem', fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
              Se enviará un correo para que confirme su cuenta y cree su propia contraseña.
            </p>
          )}
          {newUserModo === 'password' && (
            <Controller
              name="password"
              control={newUserControl}
              render={({ field }) => (
                <Input
                  label="Contraseña"
                  type="password"
                  error={newUserErrors.password?.message}
                  {...field}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
              )}
            />
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="submit" variant="primary" disabled={newUserSubmitting}>
              {newUserSubmitting ? 'Creando…' : 'Crear usuario'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setShowNewUserModal(false); resetNewUser(); }} disabled={newUserSubmitting}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={Boolean(editingId)}
        onClose={() => {
          if (!submitting && !reactivating) {
            setEditingId(null);
            setEditingRow(null);
          }
        }}
        title="Editar usuario"
        width={480}
        footer={null}
      >
        {editingId && (
          <form onSubmit={handleSubmit}>
            {submitError && <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>{submitError}</p>}
            <Input label="Correo" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
            <Select
              label="Rol"
              placeholder="— Sin cambiar —"
              value={formRol || undefined}
              onChange={(v) => setFormRol(v ?? '')}
              options={[
                { value: '', label: '— Sin cambiar —' },
                { value: ROLES.ADMIN, label: 'Admin' },
                { value: ROLES.DOCTOR, label: 'Doctor' },
                { value: 'Paciente', label: 'Paciente' },
              ]}
            />
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--color-texto-primario)' }}>Estado de la cuenta</div>
              <Badge variant={editingRow?.activo !== false ? 'success' : 'neutral'}>
                {editingRow?.activo !== false ? 'Activo' : 'Inactivo'}
              </Badge>
              {editingRow?.activo !== false ? (
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-texto-secundario)', lineHeight: 1.45 }}>
                  Para <strong>desactivar</strong> la cuenta usa «Desactivar» en la tabla.
                  {editingRow?.rol === 'Paciente' && editingRow?.paciente_perfil?.id_paciente
                    ? ' Si es paciente con expediente, se pedirá primero la baja del programa (GAM) y luego se desactivará el acceso.'
                    : ' La cuenta no se borra; solo se desactiva.'}
                </p>
              ) : (
                <>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-texto-secundario)', lineHeight: 1.45 }}>
                    Esta cuenta está <strong>inactiva</strong> y no puede iniciar sesión. Puedes reactivarla aquí: volverá a
                    estar operativa y, si tiene perfil de doctor o paciente vinculado, ese perfil también se reactivará.
                  </p>
                  <div style={{ marginTop: '0.75rem' }}>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleReactivarUsuario}
                      disabled={submitting || reactivating}
                      loading={reactivating}
                    >
                      Reactivar usuario
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button type="submit" variant="primary" disabled={submitting || reactivating}>
                {submitting ? 'Guardando…' : 'Guardar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={reactivating}
                onClick={() => {
                  setEditingId(null);
                  setEditingRow(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <DesactivarPacienteUsuarioModal
        open={desactivarPacModal.open}
        onClose={closeDesactivarPacModal}
        idPaciente={desactivarPacModal.idPaciente}
        idUsuario={desactivarPacModal.idUsuario}
        userEmail={desactivarPacModal.email}
        onCompleted={onDesactivarPacienteCompletado}
      />
      {error && <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error} <button type="button" onClick={load} style={{ marginLeft: '0.5rem', textDecoration: 'underline' }}>Reintentar</button></p>}
      <div data-tour="section-usuarios-table">
      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <EmptyState message={emptyUsersMessage} />
      ) : (
        <Table columns={columns} data={list} emptyMessage={emptyUsersMessage} />
      )}
      </div>
    </div>
  );
}
