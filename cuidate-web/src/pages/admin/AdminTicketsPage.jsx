import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/shared';
import { Table, Button, Select, LoadingSpinner } from '../../components/ui';
import { getAdminTickets } from '../../api/tickets';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';
import { TicketEstadoBadge, TicketPrioridadBadge } from '../../components/tickets/TicketFieldBadge';

export default function AdminTicketsPage() {
  const [estado, setEstado] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminTickets(estado ? { estado } : {});
      setList(res?.tickets ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [estado]);

  useEffect(() => {
    load();
  }, [load]);

  useOnboardingPageReady(!loading);

  const columns = [
    { key: 'id_ticket', label: 'ID', render: (r) => r.id_ticket },
    { key: 'asunto', label: 'Asunto', render: (r) => sanitizeForDisplay(r.asunto) },
    {
      key: 'creador_nombre',
      label: 'Doctor',
      render: (r) => sanitizeForDisplay(r.creador_nombre || r.creador_email) || '—',
    },
    { key: 'estado', label: 'Estado', render: (r) => <TicketEstadoBadge estado={r.estado} /> },
    { key: 'prioridad', label: 'Prioridad', render: (r) => <TicketPrioridadBadge prioridad={r.prioridad} /> },
    { key: 'updated_at', label: 'Actualizado', render: (r) => formatDateTime(r.updated_at) },
    {
      key: '_a',
      label: '',
      render: (r) => (
        <Link to={`/admin/tickets/${r.id_ticket}`} style={{ fontWeight: 600, color: 'var(--color-primario)' }}>
          Abrir
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Tickets de soporte" />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div style={{ minWidth: 200 }}>
          <Select
            label="Estado"
            value={estado || undefined}
            onChange={(v) => setEstado(v ?? '')}
            options={[
              { value: '', label: 'Todos' },
              { value: 'abierto', label: 'Abierto' },
              { value: 'en_curso', label: 'En curso' },
              { value: 'resuelto', label: 'Resuelto' },
              { value: 'cerrado', label: 'Cerrado' },
            ]}
          />
        </div>
        <Button type="button" variant="outline" onClick={load}>
          Refrescar
        </Button>
      </div>
      {loading ? <LoadingSpinner /> : <Table columns={columns} data={list} emptyMessage="No hay tickets" />}
    </div>
  );
}
