import { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
    control,
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
      const rawDoc = await getDoctorById(idDoctor);
      const doc = rawDoc && typeof rawDoc === 'object' ? rawDoc : {};
      const email = doc.email ?? doc.Usuario?.email ?? user?.email ?? '';
      const nombre = doc.nombre ?? user?.nombre ?? '';
      const apellido_paterno = doc.apellido_paterno ?? user?.apellido_paterno ?? '';
      const apellido_materno = doc.apellido_materno ?? '';
      const telefono = doc.telefono ?? '';

      setDoctor({ ...doc, email, nombre, apellido_paterno, apellido_materno, telefono });

      perfilForm.reset({
        email: String(email ?? ''),
        nombre: String(nombre ?? ''),
        apellido_paterno: String(apellido_paterno ?? ''),
        apellido_materno: String(apellido_materno ?? ''),
        telefono: String(telefono ?? ''),
      });
    } catch {
      setDoctor(null);
    } finally {
      setLoadingDoctor(false);
    }
  }, [idDoctor, perfilForm, user?.email, user?.nombre, user?.apellido_paterno]);

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
              <Controller
                name="email"
                control={perfilForm.control}
                render={({ field }) => (
                  <Input
                    label="Correo electrónico"
                    type="email"
                    placeholder={doctor?.email ?? user?.email ?? 'Correo (API o usuario logueado)'}
                    error={perfilForm.formState.errors.email?.message}
                    {...field}
                    required
                  />
                )}
              />
              <Controller
                name="apellido_paterno"
                control={perfilForm.control}
                render={({ field }) => (
                  <Input
                    label="Apellido paterno"
                    placeholder={doctor?.apellido_paterno ?? user?.apellido_paterno ?? 'Ej. González'}
                    error={perfilForm.formState.errors.apellido_paterno?.message}
                    {...field}
                    required
                  />
                )}
              />
              <Controller
                name="apellido_materno"
                control={perfilForm.control}
                render={({ field }) => (
                  <Input
                    label="Apellido materno"
                    placeholder={doctor?.apellido_materno ?? 'Ej. Morales'}
                    error={perfilForm.formState.errors.apellido_materno?.message}
                    {...field}
                  />
                )}
              />
              <Controller
                name="nombre"
                control={perfilForm.control}
                render={({ field }) => (
                  <Input
                    label="Nombre"
                    placeholder={doctor?.nombre ?? user?.nombre ?? 'Ej. José'}
                    error={perfilForm.formState.errors.nombre?.message}
                    {...field}
                    required
                  />
                )}
              />
              <Controller
                name="telefono"
                control={perfilForm.control}
                render={({ field }) => (
                  <Input
                    label="Teléfono"
                    type="tel"
                    placeholder={doctor?.telefono ?? 'Teléfono (API)'}
                    error={perfilForm.formState.errors.telefono?.message}
                    {...field}
                  />
                )}
              />
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
          <Controller
            name="currentPassword"
            control={control}
            render={({ field }) => (
              <Input label="Contraseña actual" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...field} />
            )}
          />
          <Controller
            name="newPassword"
            control={control}
            render={({ field }) => (
              <Input label="Nueva contraseña" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...field} />
            )}
          />
          <Controller
            name="confirmNewPassword"
            control={control}
            render={({ field }) => (
              <Input label="Confirmar nueva contraseña" type="password" autoComplete="new-password" error={errors.confirmNewPassword?.message} {...field} />
            )}
          />
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
