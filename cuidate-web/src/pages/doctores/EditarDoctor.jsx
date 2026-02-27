import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doctorEditSchema } from '../../lib/validations/doctorSchema';
import { getDoctorById, updateDoctor } from '../../api/doctores';
import { getModulos } from '../../api/modulos';
import { useAuthStore } from '../../stores/authStore';
import { useCurrentDoctorId } from '../../hooks/useCurrentDoctorId';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input } from '../../components/ui';
import { LoadingSpinner } from '../../components/ui';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';

export default function EditarDoctor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const parsedId = parsePositiveInt(id, 0);
  const isAdmin = useAuthStore((s) => s.isAdmin)?.() ?? false;
  const { idDoctor } = useCurrentDoctorId();
  const isSelfEdit = !isAdmin && parsedId > 0 && idDoctor != null && parsedId === idDoctor;

  const [doctor, setDoctor] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(doctorEditSchema),
    defaultValues: {
      email: '',
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      id_modulo: '',
      telefono: '',
    },
  });

  const authUser = useAuthStore((s) => s.user);

  const load = useCallback(async () => {
    if (parsedId === 0) return;
    setLoading(true);
    try {
      const [rawDoc, mods] = await Promise.all([getDoctorById(parsedId), getModulos()]);
      const doc = rawDoc && typeof rawDoc === 'object' ? rawDoc : {};
      const email = doc.email ?? doc.Usuario?.email ?? (isSelfEdit ? authUser?.email : null) ?? '';
      const nombre = doc.nombre ?? (isSelfEdit ? authUser?.nombre : null) ?? '';
      const apellido_paterno = doc.apellido_paterno ?? (isSelfEdit ? authUser?.apellido_paterno : null) ?? '';
      const apellido_materno = doc.apellido_materno ?? '';
      const id_modulo = doc.id_modulo != null ? String(doc.id_modulo) : '';
      const telefono = doc.telefono ?? '';

      setDoctor({ ...doc, email, nombre, apellido_paterno, apellido_materno, id_modulo: doc.id_modulo, telefono });
      setModulos(Array.isArray(mods) ? mods : []);

      reset({
        email: String(email ?? ''),
        nombre: String(nombre ?? ''),
        apellido_paterno: String(apellido_paterno ?? ''),
        apellido_materno: String(apellido_materno ?? ''),
        id_modulo,
        telefono: String(telefono ?? ''),
      });
    } catch {
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  }, [parsedId, reset, isSelfEdit, authUser?.email, authUser?.nombre, authUser?.apellido_paterno]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(data) {
    setSubmitError('');
    try {
      const idModulo = isSelfEdit ? (doctor?.id_modulo ?? null) : (data.id_modulo ?? null);
      await updateDoctor(parsedId, {
        email: data.email.trim(),
        nombre: data.nombre.trim(),
        apellido_paterno: data.apellido_paterno.trim(),
        apellido_materno: data.apellido_materno?.trim() || null,
        id_modulo: idModulo != null && idModulo !== '' ? Number(idModulo) : null,
        telefono: data.telefono?.trim() || null,
      });
      navigate(`/doctores/${parsedId}`, { replace: true });
    } catch (err) {
      setSubmitError(
        err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Error al actualizar'
      );
    }
  }

  if (parsedId === 0) {
    return (
      <div>
        <PageHeader title="Editar doctor" showBack backTo="/doctores" />
        <p style={{ color: 'var(--color-error)' }}>Doctor no encontrado.</p>
      </div>
    );
  }

  if (loading || !doctor) {
    return (
      <div>
        <PageHeader title="Editar doctor" showBack backTo="/doctores" />
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Editar doctor" showBack backTo={`/doctores/${parsedId}`} />
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
                placeholder={doctor?.email ?? authUser?.email ?? 'Correo (API o usuario logueado)'}
                error={errors.email?.message}
                {...field}
                required
              />
            )}
          />
          <Controller
            name="nombre"
            control={control}
            render={({ field }) => (
              <Input
                label="Nombre"
                placeholder={doctor?.nombre ?? authUser?.nombre ?? 'Nombre (API o usuario logueado)'}
                error={errors.nombre?.message}
                {...field}
                required
              />
            )}
          />
          <Controller
            name="apellido_paterno"
            control={control}
            render={({ field }) => (
              <Input
                label="Apellido paterno"
                placeholder={doctor?.apellido_paterno ?? authUser?.apellido_paterno ?? 'Apellido paterno (API o usuario logueado)'}
                error={errors.apellido_paterno?.message}
                {...field}
                required
              />
            )}
          />
          <Controller
            name="apellido_materno"
            control={control}
            render={({ field }) => (
              <Input
                label="Apellido materno"
                placeholder={doctor?.apellido_materno ?? 'Apellido materno (API)'}
                error={errors.apellido_materno?.message}
                {...field}
              />
            )}
          />
          <Controller
            name="telefono"
            control={control}
            render={({ field }) => (
              <Input
                label="Teléfono"
                type="tel"
                placeholder={doctor?.telefono ?? 'Teléfono (API)'}
                error={errors.telefono?.message}
                {...field}
              />
            )}
          />
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>
              Módulo
            </label>
            <select
              {...register('id_modulo')}
              disabled={isSelfEdit}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                border: '1px solid var(--color-borde-claro)',
                borderRadius: 'var(--radius)',
                backgroundColor: isSelfEdit ? 'var(--color-fondo-secundario)' : 'var(--color-fondo-card)',
                cursor: isSelfEdit ? 'not-allowed' : undefined,
              }}
            >
              <option value="">— Sin módulo —</option>
              {modulos.map((m) => (
                <option key={m.id_modulo ?? m.id} value={String(m.id_modulo ?? m.id)}>
                  {sanitizeForDisplay(m.nombre_modulo ?? m.nombre) || '—'}
                </option>
              ))}
            </select>
            {isSelfEdit && (
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
                No puedes cambiar tu módulo asignado.
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(`/doctores/${parsedId}`)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
