import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doctorEditSchema } from '../../lib/validations/doctorSchema';
import { getDoctorById, updateDoctor } from '../../api/doctores';
import { getModulos } from '../../api/modulos';
import { getInstitucionesSalud } from '../../api/institucionesSalud';
import { useAuthStore } from '../../stores/authStore';
import { useCurrentDoctorId } from '../../hooks/useCurrentDoctorId';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input } from '../../components/ui';
import { LoadingSpinner } from '../../components/ui';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

export default function EditarDoctor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const parsedId = parsePositiveInt(id, 0);
  const isAdmin = useAuthStore((s) => s.isAdmin)?.() ?? false;
  const { idDoctor } = useCurrentDoctorId();
  const isSelfEdit = !isAdmin && parsedId > 0 && idDoctor != null && parsedId === idDoctor;

  const [doctor, setDoctor] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [institucionesSalud, setInstitucionesSalud] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');

  useOnboardingPageReady(parsedId > 0 && !loading && !!doctor);

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
      institucion_hospitalaria: '',
      grado_estudio: '',
      anos_servicio: '',
      activo: true,
    },
  });

  const authUser = useAuthStore((s) => s.user);

  const load = useCallback(async () => {
    if (parsedId === 0) return;
    setLoading(true);
    try {
      const [rawDoc, mods, insts] = await Promise.all([
        getDoctorById(parsedId),
        getModulos(),
        getInstitucionesSalud(),
      ]);
      const doc = rawDoc && typeof rawDoc === 'object' ? rawDoc : {};
      const email = doc.email ?? doc.Usuario?.email ?? (isSelfEdit ? authUser?.email : null) ?? '';
      const nombre = doc.nombre ?? (isSelfEdit ? authUser?.nombre : null) ?? '';
      const apellido_paterno = doc.apellido_paterno ?? (isSelfEdit ? authUser?.apellido_paterno : null) ?? '';
      const apellido_materno = doc.apellido_materno ?? '';
      const id_modulo = doc.id_modulo != null ? String(doc.id_modulo) : '';
      const telefono = doc.telefono ?? '';
      const institucion_hospitalaria = doc.institucion_hospitalaria ?? '';
      const grado_estudio = doc.grado_estudio ?? '';
      const anos_servicio = doc.anos_servicio != null ? String(doc.anos_servicio) : '';
      const activo = doc.activo !== false;

      setDoctor({ ...doc, email, nombre, apellido_paterno, apellido_materno, id_modulo: doc.id_modulo, telefono, institucion_hospitalaria, grado_estudio, anos_servicio, activo });
      setModulos(Array.isArray(mods) ? mods : []);
      setInstitucionesSalud(Array.isArray(insts) ? insts : []);

      reset({
        email: String(email ?? ''),
        nombre: String(nombre ?? ''),
        apellido_paterno: String(apellido_paterno ?? ''),
        apellido_materno: String(apellido_materno ?? ''),
        id_modulo,
        telefono: String(telefono ?? ''),
        institucion_hospitalaria: String(institucion_hospitalaria ?? ''),
        grado_estudio: String(grado_estudio ?? ''),
        anos_servicio: String(anos_servicio ?? ''),
        activo,
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
        institucion_hospitalaria: data.institucion_hospitalaria?.trim() || null,
        grado_estudio: data.grado_estudio?.trim() || null,
        anos_servicio: data.anos_servicio != null && String(data.anos_servicio).trim() !== '' ? parseInt(String(data.anos_servicio), 10) : null,
        activo: isAdmin() && data.activo !== undefined ? Boolean(data.activo) : undefined,
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
            name="apellido_paterno"
            control={control}
            render={({ field }) => (
              <Input
                label="Apellido paterno"
                placeholder={doctor?.apellido_paterno ?? authUser?.apellido_paterno ?? 'Ej. González'}
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
                placeholder={doctor?.apellido_materno ?? 'Ej. Morales'}
                error={errors.apellido_materno?.message}
                {...field}
              />
            )}
          />
          <Controller
            name="nombre"
            control={control}
            render={({ field }) => (
              <Input
                label="Nombre"
                placeholder={doctor?.nombre ?? authUser?.nombre ?? 'Ej. José'}
                error={errors.nombre?.message}
                {...field}
                required
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
          <Controller
            name="institucion_hospitalaria"
            control={control}
            render={({ field }) => {
              const valorActual = String(field.value ?? '').trim();
              const enCatalogo = institucionesSalud.some((i) => i.nombre === valorActual);
              const mostrarLegacy = valorActual && !enCatalogo;
              return (
                <div style={{ marginBottom: '1rem' }}>
                  <label
                    style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}
                    htmlFor="editar-doctor-institucion"
                  >
                    Institución hospitalaria
                  </label>
                  <select
                    id="editar-doctor-institucion"
                    {...field}
                    value={field.value ?? ''}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      border: errors.institucion_hospitalaria ? '1px solid var(--color-error)' : '1px solid var(--color-borde-claro)',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'var(--color-fondo-card)',
                    }}
                  >
                    <option value="">— Seleccionar institución —</option>
                    {mostrarLegacy ? (
                      <option value={valorActual}>
                        {sanitizeForDisplay(valorActual)} (texto previo, no en catálogo)
                      </option>
                    ) : null}
                    {institucionesSalud.map((inst) => (
                      <option key={inst.id_institucion_salud ?? inst.nombre} value={inst.nombre}>
                        {sanitizeForDisplay(inst.nombre) || '—'}
                      </option>
                    ))}
                  </select>
                  {errors.institucion_hospitalaria?.message ? (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--color-error)' }}>
                      {errors.institucion_hospitalaria.message}
                    </p>
                  ) : null}
                  {mostrarLegacy ? (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
                      Puedes elegir una institución del catálogo para alinear el registro.
                    </p>
                  ) : (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--color-texto-secundario)' }}>
                      Catálogo en Administración → Catálogos.
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Controller
            name="grado_estudio"
            control={control}
            render={({ field }) => (
              <Input
                label="Grado de estudio"
                placeholder="Ej. Licenciatura en Medicina"
                error={errors.grado_estudio?.message}
                {...field}
              />
            )}
          />
          <Controller
            name="anos_servicio"
            control={control}
            render={({ field }) => (
              <Input
                label="Años de servicio"
                type="number"
                min={0}
                placeholder="Ej. 5"
                error={errors.anos_servicio?.message}
                {...field}
              />
            )}
          />
          {isAdmin() && (
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="activo-edit" {...register('activo')} />
              <label htmlFor="activo-edit" style={{ fontWeight: 500, color: 'var(--color-texto-primario)' }}>
                Doctor activo
              </label>
            </div>
          )}
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
