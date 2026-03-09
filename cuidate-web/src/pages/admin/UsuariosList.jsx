import { useState, useEffect, useCallback } from 'react';
import { getUsuarios, updateUsuario, deleteUsuario, createUsuario } from '../../api/auth';
import { createDoctor } from '../../api/doctores';
import { getModulos } from '../../api/modulos';
import { PageHeader } from '../../components/shared';
import { message } from 'antd';
import { Button, Input, Select, Table, LoadingSpinner, EmptyState, Badge, Modal } from '../../components/ui';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { ROLES } from '../../utils/constants';

const MODO_CREAR = { PASSWORD: 'password', INVITE: 'invite' };

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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createRol, setCreateRol] = useState(ROLES.ADMIN);
  const [createModo, setCreateModo] = useState(MODO_CREAR.INVITE);
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPassword, setCreateConfirmPassword] = useState('');
  const [createNombre, setCreateNombre] = useState('');
  const [createApellidoPaterno, setCreateApellidoPaterno] = useState('');
  const [createApellidoMaterno, setCreateApellidoMaterno] = useState('');
  const [createIdModulo, setCreateIdModulo] = useState('');
  const [modulos, setModulos] = useState([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

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

  const openCreateModal = () => {
    setCreateEmail('');
    setCreateRol(ROLES.ADMIN);
    setCreateModo(MODO_CREAR.INVITE);
    setCreatePassword('');
    setCreateConfirmPassword('');
    setCreateNombre('');
    setCreateApellidoPaterno('');
    setCreateApellidoMaterno('');
    setCreateIdModulo('');
    setCreateError('');
    setShowCreateModal(true);
    getModulos().then((data) => setModulos(Array.isArray(data) ? data : [])).catch(() => setModulos([]));
  };

  const handleCreateUser = async (e) => {
    e?.preventDefault?.();
    setCreateError('');
    const email = (createEmail || '').trim();
    if (!email) {
      setCreateError('El correo es obligatorio.');
      return;
    }
    if (createModo === MODO_CREAR.PASSWORD) {
      if (!createPassword || createPassword.length < 6) {
        setCreateError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (createPassword !== createConfirmPassword) {
        setCreateError('Las contraseñas no coinciden.');
        return;
      }
    }
    const isDoctor = createRol === ROLES.DOCTOR;
    if (isDoctor && (createNombre?.trim() || createApellidoPaterno?.trim() || createApellidoMaterno?.trim())) {
      if (!createNombre?.trim()) {
        setCreateError('Si indica datos de doctor, el nombre es obligatorio.');
        return;
      }
      if (!createApellidoPaterno?.trim()) {
        setCreateError('Si indica datos de doctor, el apellido paterno es obligatorio.');
        return;
      }
    }
    setCreateSubmitting(true);
    try {
      const payload = createModo === MODO_CREAR.INVITE
        ? { email, rol: createRol, invite: true }
        : { email, rol: createRol, password: createPassword };
      const created = await createUsuario(payload);
      const idUsuario = created?.usuario?.id_usuario ?? created?.id ?? created?.id_usuario;
      if (isDoctor && idUsuario && createNombre?.trim() && createApellidoPaterno?.trim()) {
        await createDoctor({
          nombre: createNombre.trim(),
          apellido_paterno: createApellidoPaterno.trim(),
          apellido_materno: (createApellidoMaterno || '').trim(),
          id_usuario: idUsuario,
          id_modulo: createIdModulo ? Number(createIdModulo) : undefined,
        });
      }
      message.success(createModo === MODO_CREAR.INVITE ? 'Invitación enviada por correo.' : 'Usuario creado correctamente.');
      setShowCreateModal(false);
      load();
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? err?.message ?? 'Error al crear usuario';
      setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

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
    <div>
      <PageHeader
        title="Usuarios (Admin)"
        action={
          <Button type="button" variant="primary" onClick={openCreateModal}>
            Crear usuario
          </Button>
        }
      />
      <Modal
        open={showCreateModal}
        onClose={() => { if (!createSubmitting) setShowCreateModal(false); }}
        title="Crear usuario"
        width={520}
        footer={null}
      >
        <form onSubmit={handleCreateUser}>
          {createError && <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>{createError}</p>}
          <Input
            label="Correo electrónico"
            type="email"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            placeholder="ejemplo@correo.com"
            required
          />
          <Select
            label="Rol"
            value={createRol}
            onChange={(v) => setCreateRol(v ?? ROLES.ADMIN)}
            options={[
              { value: ROLES.ADMIN, label: 'Admin' },
              { value: ROLES.DOCTOR, label: 'Doctor' },
            ]}
          />
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Acceso</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name="createModo" checked={createModo === MODO_CREAR.INVITE} onChange={() => setCreateModo(MODO_CREAR.INVITE)} />
                Enviar invitación por correo (la persona creará su contraseña al confirmar)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="radio" name="createModo" checked={createModo === MODO_CREAR.PASSWORD} onChange={() => setCreateModo(MODO_CREAR.PASSWORD)} />
                Establecer contraseña ahora
              </label>
            </div>
          </div>
          {createModo === MODO_CREAR.PASSWORD && (
            <>
              <Input
                label="Contraseña"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
              <Input
                label="Confirmar contraseña"
                type="password"
                value={createConfirmPassword}
                onChange={(e) => setCreateConfirmPassword(e.target.value)}
                placeholder="Repetir contraseña"
                autoComplete="new-password"
              />
            </>
          )}
          {createRol === ROLES.DOCTOR && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-borde, #eee)' }}>
              <p style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
                Opcional: complete los datos del doctor para crear también su perfil.
              </p>
              <Input label="Nombre" value={createNombre} onChange={(e) => setCreateNombre(e.target.value)} placeholder="Nombre" />
              <Input label="Apellido paterno" value={createApellidoPaterno} onChange={(e) => setCreateApellidoPaterno(e.target.value)} placeholder="Apellido paterno" />
              <Input label="Apellido materno" value={createApellidoMaterno} onChange={(e) => setCreateApellidoMaterno(e.target.value)} placeholder="Apellido materno" />
              <Select
                label="Módulo"
                placeholder="— Seleccionar —"
                value={createIdModulo || undefined}
                onChange={(v) => setCreateIdModulo(v ?? '')}
                options={[{ value: '', label: '— Ninguno —' }, ...modulos.map((m) => ({ value: String(m.id_modulo ?? m.id), label: m.nombre ?? m.name ?? `Módulo ${m.id_modulo ?? m.id}` }))]}
              />
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="submit" variant="primary" disabled={createSubmitting}>
              {createSubmitting ? 'Creando…' : createModo === MODO_CREAR.INVITE ? 'Enviar invitación' : 'Crear usuario'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} disabled={createSubmitting}>
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
      {loading ? <LoadingSpinner /> : list.length === 0 ? <EmptyState message="No hay usuarios" /> : <Table columns={columns} data={list} emptyMessage="No hay usuarios" />}
    </div>
  );
}
