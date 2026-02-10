import { useState } from 'react';
import { Card, Button, LoadingSpinner, EmptyState, Input, Modal } from '../ui';
import { sanitizeForDisplay } from '../../utils/sanitize';

/**
 * Card reutilizable para mostrar y gestionar la Red de apoyo de un paciente.
 * Formulario de crear/editar dentro de un modal (paridad con app móvil).
 *
 * @param {Object} props
 * @param {Array<Object>} props.items - Lista de contactos de red de apoyo.
 * @param {boolean} props.loading - Estado de carga.
 * @param {function(Object): Promise<void>} [props.onCreate] - Handler para crear contacto.
 * @param {function(number, Object): Promise<void>} [props.onUpdate] - Handler para actualizar contacto.
 * @param {function(number): Promise<void>} [props.onDelete] - Handler para eliminar contacto.
 * @param {boolean} [props.canEdit=true] - Controla si se muestran acciones de edición.
 */
export default function RedApoyoCard({ items = [], loading, onCreate, onUpdate, onDelete, canEdit = true }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    id: null,
    nombre_contacto: '',
    parentesco: '',
    numero_celular: '',
    email: '',
    direccion: '',
    localidad: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = form.id != null;

  const resetForm = () => {
    setForm({
      id: null,
      nombre_contacto: '',
      parentesco: '',
      numero_celular: '',
      email: '',
      direccion: '',
      localidad: '',
    });
    setError('');
  };

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleEdit = (contact) => {
    setForm({
      id: contact.id_red_apoyo ?? contact.id_contacto ?? contact.id ?? null,
      nombre_contacto: contact.nombre_contacto ?? contact.nombre ?? '',
      parentesco: contact.parentesco ?? '',
      numero_celular: contact.numero_celular ?? contact.telefono ?? '',
      email: contact.email ?? '',
      direccion: contact.direccion ?? '',
      localidad: contact.localidad ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    const nombre = form.nombre_contacto.trim();
    if (!nombre) {
      setError('El nombre del contacto es obligatorio.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        nombre_contacto: nombre,
        parentesco: form.parentesco.trim() || undefined,
        numero_celular: form.numero_celular.trim() || undefined,
        email: form.email.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        localidad: form.localidad.trim() || undefined,
      };
      if (isEditing) {
        const id = form.id;
        if (onUpdate) await onUpdate(id, payload);
      } else if (onCreate) {
        await onCreate(payload);
      }
      resetForm();
      setModalOpen(false);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Error al guardar contacto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!onDelete || !canEdit) return;
    if (!window.confirm('¿Eliminar este contacto de red de apoyo?')) return;
    try {
      await onDelete(id);
      if (form.id === id) {
        resetForm();
        setModalOpen(false);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Error al eliminar contacto.');
    }
  };

  return (
    <Card className="patient-section-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <h2 className="patient-section-title" style={{ margin: 0 }}>Red de apoyo</h2>
        {canEdit && (
          <Button variant="primary" onClick={openAdd}>
            Agregar contacto
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState message="No hay contactos de red de apoyo" />
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((r, i) => {
            const id = r.id_red_apoyo ?? r.id_contacto ?? r.id ?? i;
            return (
              <li
                key={id}
                style={{
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--color-borde-claro)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{sanitizeForDisplay(r.nombre_contacto ?? r.nombre) || '—'}</strong>
                  {r.parentesco && (
                    <span style={{ color: 'var(--color-texto-secundario)', marginLeft: '0.5rem' }}>
                      ({sanitizeForDisplay(r.parentesco)})
                    </span>
                  )}
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.25rem' }}>
                    Tel: {sanitizeForDisplay(r.telefono ?? r.numero_celular) || '—'}
                    {r.email && <> · {sanitizeForDisplay(r.email)}</>}
                    {(r.direccion || r.localidad) && (
                      <>
                        <br />
                        {r.direccion && sanitizeForDisplay(r.direccion)}
                        {r.localidad && `, ${sanitizeForDisplay(r.localidad)}`}
                      </>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <Button variant="secondary" size="small" type="button" onClick={() => handleEdit(r)}>
                      Editar
                    </Button>
                    <Button variant="danger" size="small" type="button" onClick={() => handleDelete(id)}>
                      Eliminar
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <Modal
          open={modalOpen}
          onClose={() => { if (!submitting) { setModalOpen(false); resetForm(); } }}
          title={isEditing ? 'Editar contacto' : 'Agregar contacto'}
          okText={submitting ? 'Guardando…' : isEditing ? 'Actualizar contacto' : 'Agregar contacto'}
          confirmLoading={submitting}
          onOk={handleSubmit}
          width={520}
        >
          {error && (
            <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>{error}</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <Input
              label="Nombre *"
              value={form.nombre_contacto}
              onChange={(e) => setForm((f) => ({ ...f, nombre_contacto: e.target.value }))}
            />
            <Input
              label="Parentesco"
              value={form.parentesco}
              onChange={(e) => setForm((f) => ({ ...f, parentesco: e.target.value }))}
            />
            <Input
              label="Teléfono"
              value={form.numero_celular}
              onChange={(e) => setForm((f) => ({ ...f, numero_celular: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Dirección"
              value={form.direccion}
              onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            />
            <Input
              label="Localidad"
              value={form.localidad}
              onChange={(e) => setForm((f) => ({ ...f, localidad: e.target.value }))}
            />
          </div>
        </Modal>
      )}
    </Card>
  );
}
