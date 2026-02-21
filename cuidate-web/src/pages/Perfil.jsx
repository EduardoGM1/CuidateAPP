import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema } from '../lib/validations/changePasswordSchema';
import { doctorEditSchema } from '../lib/validations/doctorSchema';
import { useAuthStore } from '../stores/authStore';
import { changePassword } from '../api/auth';
import { getDoctorById, updateDoctor } from '../api/doctores';
import { useCurrentDoctorId } from '../hooks/useCurrentDoctorId';
import { PageHeader } from '../components/shared';
import { Card, Button, Input } from '../components/ui';
import { LoadingSpinner } from '../components/ui';
import { sanitizeForDisplay } from '../utils/sanitize';

export default function Perfil() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const getDisplayName = useAuthStore((s) => s.getDisplayName);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const { idDoctor } = useCurrentDoctorId();

  const [successMessage, setSuccessMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [doctor, setDoctor] = useState(null);
  const [loadingDoctor, setLoadingDoctor] = useState(false);
  const [perfilError, setPerfilError] = useState('');
  const [perfilSuccess, setPerfilSuccess] = useState('');

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

  const perfilForm = useForm({
    resolver: zodResolver(doctorEditSchema),
    defaultValues: {
      email: '',
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      telefono: '',
    },
  });

  const loadDoctor = useCallback(async () => {
    if (!idDoctor) return;
    setLoadingDoctor(true);
    try {
      const doc = await getDoctorById(idDoctor);
      setDoctor(doc);
      perfilForm.reset({
        email: doc.email ?? '',
        nombre: doc.nombre ?? '',
        apellido_paterno: doc.apellido_paterno ?? '',
        apellido_materno: doc.apellido_materno ?? '',
        telefono: doc.telefono ?? '',
      });
    } catch {
      setDoctor(null);
    } finally {
      setLoadingDoctor(false);
    }
  }, [idDoctor, perfilForm]);

  useEffect(() => {
    loadDoctor();
  }, [loadDoctor]);

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

  async function onSubmitPerfil(data) {
    if (!idDoctor || !doctor) return;
    setPerfilError('');
    setPerfilSuccess('');
    try {
      await updateDoctor(idDoctor, {
        email: data.email.trim(),
        nombre: data.nombre.trim(),
        apellido_paterno: data.apellido_paterno.trim(),
        apellido_materno: data.apellido_materno?.trim() || null,
        telefono: data.telefono?.trim() || null,
        id_modulo: doctor.id_modulo ?? null,
      });
      const currentToken = useAuthStore.getState().token ?? token;
      const currentUser = useAuthStore.getState().user ?? user;
      if (currentUser && setAuth) {
        setAuth(currentToken, {
          ...currentUser,
          nombre: data.nombre.trim(),
          apellido_paterno: data.apellido_paterno.trim(),
          apellido_materno: data.apellido_materno?.trim() || null,
        });
      }
      setPerfilSuccess('Datos actualizados correctamente.');
      setDoctor((prev) => prev ? { ...prev, ...data } : null);
    } catch (err) {
      setPerfilError(
        err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Error al actualizar'
      );
    }
  }

  const email = user?.email ?? '';
  const rol = user?.rol ?? (isAdmin() ? 'Admin' : 'Doctor');
  const showEditarMisDatos = Boolean(idDoctor) && (doctor || loadingDoctor);

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

      {showEditarMisDatos && (
        <Card style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--color-primario)' }}>
            Editar mis datos
          </h2>
          {loadingDoctor ? (
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
              <LoadingSpinner />
            </div>
          ) : doctor ? (
            <form onSubmit={perfilForm.handleSubmit(onSubmitPerfil)} noValidate>
              {perfilSuccess && (
                <p style={{ margin: '0 0 1rem', color: 'var(--color-primario)', fontWeight: 600 }}>{perfilSuccess}</p>
              )}
              {perfilError && (
                <p style={{ margin: '0 0 1rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>{perfilError}</p>
              )}
              <Input label="Correo electrónico" type="email" error={perfilForm.formState.errors.email?.message} {...perfilForm.register('email')} required />
              <Input label="Nombre" error={perfilForm.formState.errors.nombre?.message} {...perfilForm.register('nombre')} required />
              <Input label="Apellido paterno" error={perfilForm.formState.errors.apellido_paterno?.message} {...perfilForm.register('apellido_paterno')} required />
              <Input label="Apellido materno" error={perfilForm.formState.errors.apellido_materno?.message} {...perfilForm.register('apellido_materno')} />
              <Input label="Teléfono" type="tel" error={perfilForm.formState.errors.telefono?.message} {...perfilForm.register('telefono')} />
              <div style={{ marginTop: '1rem' }}>
                <Button type="submit" variant="primary" disabled={perfilForm.formState.isSubmitting}>
                  {perfilForm.formState.isSubmitting ? 'Guardando…' : 'Guardar datos'}
                </Button>
              </div>
            </form>
          ) : null}
        </Card>
      )}

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
