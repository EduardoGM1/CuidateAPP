import { useState, useEffect, useCallback } from 'react';
import { getUsuarios, updateUsuario, deleteUsuario, createUsuario } from '../../api/auth';
import { PageHeader } from '../../components/shared';
import { message } from 'antd';
import { Button, Input, Select, Table, LoadingSpinner, EmptyState, Badge, Modal } from '../../components/ui';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { ROLES } from '../../utils/constants';

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

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');

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

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError('');
    const email = inviteEmail?.trim();
    if (!email) {
      setInviteError('El correo es obligatorio');
      return;
    }
    setInviteSubmitting(true);
    try {
      await createUsuario({ email, rol: ROLES.ADMIN, invite: true });
      setShowInviteModal(false);
      setInviteEmail('');
      load();
      message.success(`Se envió un correo a ${email} para que confirme su cuenta y cree su contraseña.`);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error al invitar usuario';
      setInviteError(msg);
      message.error(msg);
    } finally {
      setInviteSubmitting(false);
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
          <Button type="button" variant="primary" onClick={() => { setShowInviteModal(true); setInviteError(''); setInviteEmail(''); }}>
            Invitar administrador
          </Button>
        }
      />
      <Modal
        open={showInviteModal}
        onClose={() => { if (!inviteSubmitting) setShowInviteModal(false); }}
        title="Invitar administrador"
        width={480}
        footer={null}
      >
        <form onSubmit={handleInviteSubmit}>
          <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
            Se enviará un correo para que la persona confirme su cuenta y cree su propia contraseña. Para invitar a un doctor, usa Doctores → Nuevo doctor.
          </p>
          {inviteError && <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>{inviteError}</p>}
          <Input
            label="Correo electrónico"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="ejemplo@correo.com"
            required
          />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="submit" variant="primary" disabled={inviteSubmitting}>
              {inviteSubmitting ? 'Enviando…' : 'Enviar invitación'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowInviteModal(false)} disabled={inviteSubmitting}>
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
