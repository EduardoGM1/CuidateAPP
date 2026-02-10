import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doctorEditSchema } from '../../lib/validations/doctorSchema';
import { getDoctorById, updateDoctor } from '../../api/doctores';
import { getModulos } from '../../api/modulos';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input } from '../../components/ui';
import { LoadingSpinner } from '../../components/ui';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';

export default function EditarDoctor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const parsedId = parsePositiveInt(id, 0);
  const [doctor, setDoctor] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
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

  const load = useCallback(async () => {
    if (parsedId === 0) return;
    setLoading(true);
    try {
      const [doc, mods] = await Promise.all([getDoctorById(parsedId), getModulos()]);
      setDoctor(doc);
      setModulos(Array.isArray(mods) ? mods : []);
      reset({
        email: doc.email ?? '',
        nombre: doc.nombre ?? '',
        apellido_paterno: doc.apellido_paterno ?? '',
        apellido_materno: doc.apellido_materno ?? '',
        id_modulo: doc.id_modulo ?? '',
        telefono: doc.telefono ?? '',
      });
    } catch {
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  }, [parsedId, reset]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(data) {
    setSubmitError('');
    try {
      await updateDoctor(parsedId, {
        email: data.email.trim(),
        nombre: data.nombre.trim(),
        apellido_paterno: data.apellido_paterno.trim(),
        apellido_materno: data.apellido_materno?.trim() || null,
        id_modulo: data.id_modulo ?? null,
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
          <Input label="Correo electrónico" type="email" error={errors.email?.message} {...register('email')} required />
          <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} required />
          <Input label="Apellido paterno" error={errors.apellido_paterno?.message} {...register('apellido_paterno')} required />
          <Input label="Apellido materno" error={errors.apellido_materno?.message} {...register('apellido_materno')} />
          <Input label="Teléfono" type="tel" error={errors.telefono?.message} {...register('telefono')} />
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
