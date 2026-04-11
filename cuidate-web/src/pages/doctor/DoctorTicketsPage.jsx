import { useEffect, useState, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared';
import { Table, Button, LoadingSpinner } from '../../components/ui';
import { getMyTickets } from '../../api/tickets';
import { useAuthStore } from '../../stores/authStore';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

function useStrictDoctor() {
  const user = useAuthStore((s) => s.user);
  return Boolean(user && String(user.rol || '').toLowerCase() === 'doctor');
}

export default function DoctorTicketsPage() {
  const strictDoctor = useStrictDoctor();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isAdminFn = typeof isAdmin === 'function' ? isAdmin : () => false;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyTickets();
      setList(res?.tickets ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (strictDoctor) load();
  }, [load, strictDoctor]);

  useOnboardingPageReady(!loading);

  if (isAdminFn() && !strictDoctor) {
    return <Navigate to="/admin/tickets" replace />;
  }

  if (!strictDoctor) {
    return <Navigate to="/" replace />;
  }

  const columns = [
    { key: 'id_ticket', label: 'ID', render: (r) => r.id_ticket },
    { key: 'asunto', label: 'Asunto', render: (r) => sanitizeForDisplay(r.asunto) },
    { key: 'estado', label: 'Estado', render: (r) => sanitizeForDisplay(r.estado) },
    { key: 'updated_at', label: 'Actualizado', render: (r) => formatDateTime(r.updated_at) },
    {
      key: '_a',
      label: '',
      render: (r) => (
        <Link to={`/soporte/tickets/${r.id_ticket}`} style={{ fontWeight: 600, color: 'var(--color-primario)' }}>
          Abrir
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Mis tickets de soporte"
        action={
          <Link to="/soporte/tickets/nuevo">
            <Button type="button" variant="primary">
              Nuevo ticket
            </Button>
          </Link>
        }
      />
      <p style={{ color: 'var(--color-texto-secundario)', marginBottom: '1rem' }}>
        Envía incidencias o consultas al equipo de administración. Recibirás respuesta por correo cuando un administrador conteste.
      </p>
      {loading ? <LoadingSpinner /> : <Table columns={columns} data={list} emptyMessage="Aún no tienes tickets" />}
      {!loading && (
        <Button type="button" variant="outline" style={{ marginTop: '1rem' }} onClick={load}>
          Refrescar
        </Button>
      )}
    </div>
  );
}
