import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doctorCreateSchema } from '../../lib/validations/doctorSchema';
import { createUsuario } from '../../api/auth';
import { createDoctor } from '../../api/doctores';
import { getModulos } from '../../api/modulos';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input } from '../../components/ui';
import { message } from 'antd';
import { sanitizeForDisplay } from '../../utils/sanitize';

export default function AgregarDoctor() {
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [submitError, setSubmitError] = useState('');

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(doctorCreateSchema),
    defaultValues: {
      email: '',
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      id_modulo: '',
    },
  });

  useEffect(() => {
    getModulos().then((data) => setModulos(Array.isArray(data) ? data : [])).catch(() => setModulos([]));
  }, []);

  async function onSubmit(data) {
    setSubmitError('');
    try {
      const { usuario } = await createUsuario({
        email: data.email,
        rol: 'Doctor',
        invite: true,
      });
      const id_usuario = usuario?.id_usuario;
      if (!id_usuario) throw new Error('No se obtuvo el ID del usuario');

      await createDoctor({
        nombre: data.nombre.trim(),
        apellido_paterno: data.apellido_paterno.trim(),
        apellido_materno: data.apellido_materno?.trim() || null,
        id_usuario,
        id_modulo: data.id_modulo ?? null,
      });
      const emailDisplay = (data.email || '').trim() ? ` Se envió un correo a ${data.email.trim()} para que confirme su cuenta y cree su contraseña.` : '';
      message.success(`Doctor creado correctamente.${emailDisplay}`);
      navigate('/doctores', { replace: true });
    } catch (err) {
      setSubmitError(
        err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Error al crear el doctor'
      );
    }
  }

  return (
    <div>
      <PageHeader title="Nuevo doctor" showBack backTo="/doctores" />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {submitError && (
            <p style={{ margin: '0 0 1rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>{submitError}</p>
          )}
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <Input
                label="Correo electrónico"
                type="email"
                error={errors.email?.message}
                {...field}
                required
              />
            )}
          />
          <p style={{ margin: '-0.5rem 0 1rem', fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
            Se enviará un correo al doctor para que confirme su cuenta y cree su propia contraseña.
          </p>
          <Controller
            name="nombre"
            control={control}
            render={({ field }) => (
              <Input label="Nombre" error={errors.nombre?.message} {...field} required />
            )}
          />
          <Controller
            name="apellido_paterno"
            control={control}
            render={({ field }) => (
              <Input label="Apellido paterno" error={errors.apellido_paterno?.message} {...field} required />
            )}
          />
          <Controller
            name="apellido_materno"
            control={control}
            render={({ field }) => (
              <Input label="Apellido materno" error={errors.apellido_materno?.message} {...field} />
            )}
          />
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>
              Módulo
            </label>
            <select
              {...register('id_modulo')}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                border: '1px solid var(--color-borde-claro)',
                borderRadius: 'var(--radius)',
                backgroundColor: 'var(--color-fondo-card)',
              }}
            >
              <option value="">— Sin módulo —</option>
              {modulos.map((m) => (
                <option key={m.id_modulo ?? m.id} value={m.id_modulo ?? m.id}>
                  {sanitizeForDisplay(m.nombre_modulo ?? m.nombre) || '—'}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Creando…' : 'Crear doctor'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/doctores')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
