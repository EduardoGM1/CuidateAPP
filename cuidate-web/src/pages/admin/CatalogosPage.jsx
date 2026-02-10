import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input, Table, Tabs, LoadingSpinner, EmptyState } from '../../components/ui';
import { getModulos, createModulo, updateModulo, deleteModulo } from '../../api/modulos';
import { getComorbilidades, createComorbilidad, updateComorbilidad, deleteComorbilidad } from '../../api/comorbilidades';
import { getMedicamentos, createMedicamento, updateMedicamento, deleteMedicamento } from '../../api/medicamentos';
import { getVacunas, createVacuna, updateVacuna, deleteVacuna } from '../../api/vacunas';
import { sanitizeForDisplay } from '../../utils/sanitize';

const TABS = [
  { id: 'modulos', label: 'Módulos' },
  { id: 'comorbilidades', label: 'Comorbilidades' },
  { id: 'medicamentos', label: 'Medicamentos' },
  { id: 'vacunas', label: 'Vacunas' },
];

export default function CatalogosPage() {
  const [activeTab, setActiveTab] = useState('modulos');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formNombre, setFormNombre] = useState('');
  const [formExtra, setFormExtra] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'modulos') setList(await getModulos());
      else if (activeTab === 'comorbilidades') setList(await getComorbilidades());
      else if (activeTab === 'medicamentos') setList(await getMedicamentos());
      else if (activeTab === 'vacunas') setList(await getVacunas());
      else setList([]);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Error al cargar');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setEditingId(null);
    setFormNombre('');
    setFormExtra('');
    setSubmitError('');
  }, [activeTab]);

  const getNombreKey = () => {
    if (activeTab === 'modulos') return 'nombre_modulo';
    if (activeTab === 'comorbilidades') return 'nombre_comorbilidad';
    if (activeTab === 'medicamentos') return 'nombre_medicamento';
    if (activeTab === 'vacunas') return 'nombre_vacuna';
    return 'nombre';
  };

  const getIdKey = () => {
    if (activeTab === 'modulos') return 'id_modulo';
    if (activeTab === 'comorbilidades') return 'id_comorbilidad';
    if (activeTab === 'medicamentos') return 'id_medicamento';
    if (activeTab === 'vacunas') return 'id_vacuna';
    return 'id';
  };

  const handleNew = () => {
    setEditingId('new');
    setFormNombre('');
    setFormExtra('');
    setSubmitError('');
  };

  const handleEdit = (row) => {
    const idKey = getIdKey();
    const nomKey = getNombreKey();
    setEditingId(row[idKey] ?? row.id);
    setFormNombre(row[nomKey] ?? row.nombre ?? '');
    setFormExtra(row.descripcion ?? row.tipo ?? '');
    setSubmitError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const nombre = formNombre?.trim();
    if (!nombre) {
      setSubmitError('El nombre es obligatorio');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId === 'new') {
        if (activeTab === 'modulos') await createModulo({ nombre_modulo: nombre });
        else if (activeTab === 'comorbilidades') await createComorbilidad({ nombre_comorbilidad: nombre, descripcion: formExtra?.trim() || null });
        else if (activeTab === 'medicamentos') await createMedicamento({ nombre_medicamento: nombre, descripcion: formExtra?.trim() || null });
        else if (activeTab === 'vacunas') await createVacuna({ nombre_vacuna: nombre, descripcion: formExtra?.trim() || null, tipo: formExtra?.trim() || null });
      } else {
        const id = Number(editingId);
        if (activeTab === 'modulos') await updateModulo(id, { nombre_modulo: nombre });
        else if (activeTab === 'comorbilidades') await updateComorbilidad(id, { nombre_comorbilidad: nombre, descripcion: formExtra?.trim() || null });
        else if (activeTab === 'medicamentos') await updateMedicamento(id, { nombre_medicamento: nombre, descripcion: formExtra?.trim() || null });
        else if (activeTab === 'vacunas') await updateVacuna(id, { nombre_vacuna: nombre, descripcion: formExtra?.trim() || null, tipo: formExtra?.trim() || null });
      }
      setEditingId(null);
      setFormNombre('');
      setFormExtra('');
      load();
    } catch (err) {
      setSubmitError(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (row) => {
    const idKey = getIdKey();
    const id = row[idKey] ?? row.id;
    if (!id) return;
    if (!window.confirm('¿Eliminar este registro?')) return;
    setDeletingId(id);
    try {
      if (activeTab === 'modulos') await deleteModulo(id);
      else if (activeTab === 'comorbilidades') await deleteComorbilidad(id);
      else if (activeTab === 'medicamentos') await deleteMedicamento(id);
      else if (activeTab === 'vacunas') await deleteVacuna(id);
      load();
      if (editingId === id || editingId === 'new') setEditingId(null);
    } catch (err) {
      setSubmitError(err?.response?.data?.error || err?.message || 'Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const nomKey = getNombreKey();
  const idKey = getIdKey();
  const columns = [
    { key: nomKey, label: 'Nombre', render: (row) => sanitizeForDisplay(row[nomKey] ?? row.nombre) || '—' },
    ...(activeTab !== 'modulos' ? [{ key: 'descripcion', label: 'Descripción', render: (row) => sanitizeForDisplay(row.descripcion) || '—' }] : []),
    {
      key: '_actions',
      label: 'Acciones',
      render: (row) => (
        <span style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => handleEdit(row)} style={{ background: 'none', border: 'none', color: 'var(--color-primario)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>Editar</button>
          <button type="button" onClick={() => handleDelete(row)} disabled={deletingId === (row[idKey] ?? row.id)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>Eliminar</button>
        </span>
      ),
    },
  ];

  const formLabel = activeTab === 'modulos' ? 'Nombre del módulo' : activeTab === 'comorbilidades' ? 'Nombre de la comorbilidad' : activeTab === 'medicamentos' ? 'Nombre del medicamento' : 'Nombre de la vacuna';
  const showExtraField = activeTab !== 'modulos';

  return (
    <div>
      <PageHeader title="Catálogos (Admin)" />
      <Tabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
      {editingId && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>{editingId === 'new' ? 'Nuevo' : 'Editar'}</h3>
          <form onSubmit={handleSubmit}>
            {submitError && <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>{submitError}</p>}
            <Input label={formLabel} value={formNombre} onChange={(e) => setFormNombre(e.target.value)} required maxLength={activeTab === 'modulos' ? 50 : 150} />
            {showExtraField && <Input label="Descripción (opcional)" value={formExtra} onChange={(e) => setFormExtra(e.target.value)} />}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <Button type="submit" variant="primary" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar'}</Button>
              <Button type="button" variant="outline" onClick={() => { setEditingId(null); setSubmitError(''); }}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-primario)' }}>{TABS.find((t) => t.id === activeTab)?.label}</h2>
        {!editingId && <Button variant="primary" onClick={handleNew}>Nuevo</Button>}
      </div>
      {error && <p style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>{error} <button type="button" onClick={load} style={{ marginLeft: '0.5rem', textDecoration: 'underline' }}>Reintentar</button></p>}
      {loading ? <LoadingSpinner /> : list.length === 0 ? <EmptyState message="No hay registros" /> : <Table columns={columns} data={list} emptyMessage="No hay registros" />}
    </div>
  );
}
