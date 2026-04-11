import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Input, message } from 'antd';
import { PageHeader } from '../../components/shared';
import { Card, Button, Select } from '../../components/ui';
import { createTicket } from '../../api/tickets';
import { useAuthStore } from '../../stores/authStore';

function useStrictDoctor() {
  const user = useAuthStore((s) => s.user);
  return user && String(user.rol || '').toLowerCase() === 'doctor';
}

export default function TicketNuevoPage() {
  const navigate = useNavigate();
  const strictDoctor = useStrictDoctor();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isAdminFn = typeof isAdmin === 'function' ? isAdmin : () => false;

  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [categoria, setCategoria] = useState('otro');
  const [prioridad, setPrioridad] = useState('media');
  const [saving, setSaving] = useState(false);

  if (isAdminFn() && !strictDoctor) {
    return <Navigate to="/admin/tickets" replace />;
  }

  if (!strictDoctor) {
    return <Navigate to="/" replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!asunto.trim() || !cuerpo.trim()) {
      message.warning('Completa asunto y descripción');
      return;
    }
    setSaving(true);
    try {
      const res = await createTicket({
        asunto: asunto.trim(),
        cuerpo: cuerpo.trim(),
        categoria,
        prioridad,
      });
      const id = res?.ticket?.id_ticket;
      message.success('Ticket creado');
      if (id) navigate(`/soporte/tickets/${id}`);
      else navigate('/soporte/tickets');
    } catch (err) {
      message.error(err?.response?.data?.error || err?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Nuevo ticket de soporte" />
      <Card>
        <form onSubmit={submit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Asunto</label>
            <Input value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={200} placeholder="Resumen breve" />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ minWidth: 200 }}>
              <Select
                label="Categoría"
                value={categoria}
                onChange={(v) => setCategoria(v || 'otro')}
                options={[
                  { value: 'tecnico', label: 'Técnico' },
                  { value: 'cita_paciente', label: 'Cita / paciente' },
                  { value: 'acceso', label: 'Acceso' },
                  { value: 'otro', label: 'Otro' },
                ]}
              />
            </div>
            <div style={{ minWidth: 160 }}>
              <Select
                label="Prioridad"
                value={prioridad}
                onChange={(v) => setPrioridad(v || 'media')}
                options={[
                  { value: 'baja', label: 'Baja' },
                  { value: 'media', label: 'Media' },
                  { value: 'alta', label: 'Alta' },
                ]}
              />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Descripción</label>
            <Input.TextArea value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={6} maxLength={8000} placeholder="Describe el problema o la solicitud" />
          </div>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Enviando…' : 'Enviar ticket'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
