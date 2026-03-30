import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getUsuarios, updateUsuario, deleteUsuario, createUsuario } from '../../api/auth';
import { createDoctor } from '../../api/doctores';
import { getModulos } from '../../api/modulos';
import { PageHeader } from '../../components/shared';
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
  const [formEmail, setFormEmail] = useState('');
  const [formRol, setFormRol] = useState('');
  const [formActivo, setFormActivo] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [modulos, setModulos] = useState([]);

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
      const data = await getUsuarios();
      setList(data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar usuarios');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (showNewUserModal && newUserRol === ROLES.DOCTOR) {
      getModulos().then((data) => setModulos(Array.isArray(data) ? data : [])).catch(() => setModulos([]));
    } else {
      setModulos([]);
    }
  }, [showNewUserModal, newUserRol]);

  const handleEdit = (row) => {
    setEditingId(row.id_usuario ?? row.id);
    setFormEmail(row.email ?? '');
    setFormRol(row.rol ?? '');
    setFormActivo(row.activo !== false);
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
        activo: formActivo,
      });
      setEditingId(null);
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

  const handleDesactivar = async (row) => {
    const id = row.id_usuario ?? row.id;
    if (!id) return;
    if (!window.confirm('¿Desactivar este usuario? No podrá iniciar sesión.')) return;
    try {
      await deleteUsuario(id);
      load();
      if (editingId === id) setEditingId(null);
      message.success('Usuario desactivado');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error al desactivar';
      setSubmitError(msg);
      message.error(msg);
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

  const columns = [
    { key: 'email', label: 'Correo', render: (row) => sanitizeForDisplay(row.email) || '—' },
    { key: 'rol', label: 'Rol', render: (row) => sanitizeForDisplay(row.rol) || '—' },
    {
      key: 'activo',
      label: 'Estado',
      render: (row) => <Badge variant={row.activo !== false ? 'success' : 'neutral'}>{row.activo !== false ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      key: '_actions',
      label: 'Acciones',
      render: (row) => (
        <span style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => handleEdit(row)} style={{ background: 'none', border: 'none', color: 'var(--color-primario)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>Editar</button>
          {row.activo !== false && (
            <button type="button" onClick={() => handleDesactivar(row)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>Desactivar</button>
          )}
        </span>
      ),
    },
  ];

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
        onClose={() => { if (!submitting) setEditingId(null); }}
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
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="activo-u" checked={formActivo} onChange={(e) => setFormActivo(e.target.checked)} />
              <label htmlFor="activo-u">Usuario activo</label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar'}</Button>
              <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancelar</Button>
            </div>
          </form>
        )}
      </Modal>
      {error && <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error} <button type="button" onClick={load} style={{ marginLeft: '0.5rem', textDecoration: 'underline' }}>Reintentar</button></p>}
      <div data-tour="section-usuarios-table">
      {loading ? <LoadingSpinner /> : list.length === 0 ? <EmptyState message="No hay usuarios" /> : <Table columns={columns} data={list} emptyMessage="No hay usuarios" />}
      </div>
    </div>
  );
}
