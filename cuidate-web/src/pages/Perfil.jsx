import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema } from '../lib/validations/changePasswordSchema';
import { useAuthStore } from '../stores/authStore';
import { changePassword } from '../api/auth';
import { PageHeader } from '../components/shared';
import { Card, Button, Input } from '../components/ui';
import { sanitizeForDisplay } from '../utils/sanitize';

export default function Perfil() {
  const user = useAuthStore((s) => s.user);
  const getDisplayName = useAuthStore((s) => s.getDisplayName);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const [successMessage, setSuccessMessage] = useState('');
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  async function onSubmit(data) {
    setSubmitError('');
    setSuccessMessage('');
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccessMessage('Contraseña actualizada correctamente.');
      reset();
    } catch (err) {
      setSubmitError(
        err?.response?.data?.error || err?.message || 'Error al cambiar la contraseña'
      );
    }
  }

  const email = user?.email ?? '';
  const rol = user?.rol ?? (isAdmin() ? 'Admin' : 'Doctor');

  return (
    <div>
      <PageHeader title="Perfil" />
      <Card style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--color-primario)' }}>
          Datos del usuario
        </h2>
        <dl style={{ margin: 0, display: 'grid', gap: '0.5rem' }}>
          <div>
            <dt style={{ margin: 0, fontWeight: 600, color: 'var(--color-texto-secundario)', fontSize: '0.875rem' }}>
              Nombre
            </dt>
            <dd style={{ margin: '0.2rem 0 0', color: 'var(--color-texto-primario)' }}>
              {sanitizeForDisplay(getDisplayName()) || '—'}
            </dd>
          </div>
          <div>
            <dt style={{ margin: 0, fontWeight: 600, color: 'var(--color-texto-secundario)', fontSize: '0.875rem' }}>
              Correo
            </dt>
            <dd style={{ margin: '0.2rem 0 0', color: 'var(--color-texto-primario)' }}>
              {sanitizeForDisplay(email) || '—'}
            </dd>
          </div>
          <div>
            <dt style={{ margin: 0, fontWeight: 600, color: 'var(--color-texto-secundario)', fontSize: '0.875rem' }}>
              Rol
            </dt>
            <dd style={{ margin: '0.2rem 0 0', color: 'var(--color-texto-primario)' }}>
              {sanitizeForDisplay(rol)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--color-primario)' }}>
          Cambiar contraseña
        </h2>
        {successMessage && (
          <p style={{ margin: '0 0 1rem', color: 'var(--color-primario)', fontWeight: 600 }}>
            {successMessage}
          </p>
        )}
        {submitError && (
          <p style={{ margin: '0 0 1rem', color: 'var(--color-error)' }}>{submitError}</p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            label="Contraseña actual"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <Input
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            autoComplete="new-password"
            error={errors.confirmNewPassword?.message}
            {...register('confirmNewPassword')}
          />
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
