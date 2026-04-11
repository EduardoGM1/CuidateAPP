import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { Input, message } from 'antd';
import { PageHeader } from '../../components/shared';
import { Card, Button, Select, LoadingSpinner } from '../../components/ui';
import { getTicket, postTicketMessage, patchTicket } from '../../api/tickets';
import { useAuthStore } from '../../stores/authStore';
import { formatDateTime } from '../../utils/format';
import { sanitizeForDisplay } from '../../utils/sanitize';

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isAdminFn = typeof isAdmin === 'function' ? isAdmin : () => false;

  const adminPath = location.pathname.startsWith('/admin/tickets');
  const listHref = adminPath ? '/admin/tickets' : '/soporte/tickets';
  const canAdminPatch = adminPath && isAdminFn();

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id || id === 'nuevo') return;
    setLoading(true);
    try {
      const res = await getTicket(id);
      setTicket(res?.ticket ?? null);
    } catch {
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const sendMessage = async () => {
    const cuerpo = msg.trim();
    if (!cuerpo || !id || id === 'nuevo') return;
    setSaving(true);
    try {
      await postTicketMessage(id, cuerpo);
      setMsg('');
      message.success('Mensaje enviado');
      load();
    } catch (e) {
      message.error(e?.response?.data?.error || e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const patchEstado = async (estado) => {
    if (!canAdminPatch || !id) return;
    setSaving(true);
    try {
      await patchTicket(id, { estado });
      message.success('Estado actualizado');
      load();
    } catch (e) {
      message.error(e?.response?.data?.error || e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const patchPrioridad = async (prioridad) => {
    if (!canAdminPatch || !id) return;
    setSaving(true);
    try {
      await patchTicket(id, { prioridad });
      message.success('Prioridad actualizada');
      load();
    } catch (e) {
      message.error(e?.response?.data?.error || e?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (!id || id === 'nuevo') {
    return null;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!ticket) {
    return (
      <div>
        <PageHeader title="Ticket" />
        <p>No se encontró el ticket o no tienes permiso.</p>
        <Link to={listHref}>Volver</Link>
      </div>
    );
  }

  const cerrado = ticket.estado === 'cerrado';

  return (
    <div>
      <PageHeader
        title={`Ticket #${ticket.id_ticket}`}
        action={
          <Button type="button" variant="outline" onClick={() => navigate(listHref)}>
            Volver a la lista
          </Button>
        }
      />
      <Card style={{ marginBottom: '1rem' }}>
        <p style={{ margin: '0 0 0.5rem' }}><strong>Asunto:</strong> {sanitizeForDisplay(ticket.asunto)}</p>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
          Estado: {ticket.estado} · Prioridad: {ticket.prioridad} · Categoría: {ticket.categoria}
        </p>
        {ticket.creador_email && (
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
            Doctor: {sanitizeForDisplay(ticket.creador_email)}
          </p>
        )}
      </Card>

      {canAdminPatch && (
        <Card style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Administración</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ minWidth: 160 }}>
              <Select
                label="Estado"
                value={ticket.estado}
                onChange={(v) => patchEstado(v)}
                options={[
                  { value: 'abierto', label: 'Abierto' },
                  { value: 'en_curso', label: 'En curso' },
                  { value: 'resuelto', label: 'Resuelto' },
                  { value: 'cerrado', label: 'Cerrado' },
                ]}
              />
            </div>
            <div style={{ minWidth: 140 }}>
              <Select
                label="Prioridad"
                value={ticket.prioridad}
                onChange={(v) => patchPrioridad(v)}
                options={[
                  { value: 'baja', label: 'Baja' },
                  { value: 'media', label: 'Media' },
                  { value: 'alta', label: 'Alta' },
                ]}
              />
            </div>
          </div>
        </Card>
      )}

      <h2 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Mensajes</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        {(ticket.mensajes || []).map((m) => (
          <Card key={m.id_mensaje}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-texto-secundario)', marginBottom: '0.35rem' }}>
              {sanitizeForDisplay(m.autor_email)} · {formatDateTime(m.created_at)}
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{sanitizeForDisplay(m.cuerpo)}</div>
          </Card>
        ))}
      </div>

      {!cerrado && (
        <Card>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Nuevo mensaje</label>
          <Input.TextArea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} maxLength={8000} placeholder="Escribe tu mensaje…" />
          <Button type="button" variant="primary" style={{ marginTop: '0.75rem' }} onClick={sendMessage} disabled={saving || !msg.trim()}>
            Enviar
          </Button>
        </Card>
      )}
    </div>
  );
}
