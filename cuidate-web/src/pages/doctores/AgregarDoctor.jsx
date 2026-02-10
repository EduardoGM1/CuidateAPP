import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doctorCreateSchema } from '../../lib/validations/doctorSchema';
import { createUsuario } from '../../api/auth';
import { createDoctor } from '../../api/doctores';
import { getModulos } from '../../api/modulos';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input } from '../../components/ui';
import { sanitizeForDisplay } from '../../utils/sanitize';

export default function AgregarDoctor() {
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(doctorCreateSchema),
    defaultValues: {
      email: '',
      password: '',
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
        password: data.password,
        rol: 'Doctor',
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
          <Input
            label="Correo electrónico"
            type="email"
            error={errors.email?.message}
            {...register('email')}
            required
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
            required
          />
          <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} required />
          <Input label="Apellido paterno" error={errors.apellido_paterno?.message} {...register('apellido_paterno')} required />
          <Input label="Apellido materno" error={errors.apellido_materno?.message} {...register('apellido_materno')} />
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
