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
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

export default function AgregarDoctor() {
  useOnboardingPageReady(true);
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [submitError, setSubmitError] = useState('');

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(doctorCreateSchema),
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
      usePassword: false,
      password: '',
      confirmPassword: '',
    },
  });

  const usePassword = watch('usePassword');

  useEffect(() => {
    getModulos().then((data) => setModulos(Array.isArray(data) ? data : [])).catch(() => setModulos([]));
  }, []);

  async function onSubmit(data) {
    setSubmitError('');
    try {
      const invite = !data.usePassword;
      let usuario;
      try {
        const payload = {
          email: data.email,
          rol: 'Doctor',
          ...(invite ? { invite: true } : { password: (data.password || '').trim() }),
        };
        const res = await createUsuario(payload);
        usuario = res?.usuario;
      } catch (err) {
        if (err?.response?.status === 409) {
          setSubmitError('El correo ya está registrado. Si es un usuario existente, puedes asignarle el perfil de doctor desde la lista de usuarios.');
          return;
        }
        throw err;
      }

      const id_usuario = usuario?.id_usuario != null ? Number(usuario.id_usuario) : null;
      if (!id_usuario || !Number.isInteger(id_usuario) || id_usuario < 1) {
        throw new Error('No se obtuvo un ID de usuario válido del servidor');
      }

      const idModuloRaw = data.id_modulo;
      const id_modulo =
        idModuloRaw != null && String(idModuloRaw).trim() !== ''
          ? (Number(idModuloRaw) || null)
          : null;

      await createDoctor({
        nombre: (data.nombre || '').trim(),
        apellido_paterno: (data.apellido_paterno || '').trim(),
        apellido_materno: (data.apellido_materno || '').trim() || null,
        id_usuario,
        id_modulo,
        telefono: (data.telefono || '').trim() || null,
        institucion_hospitalaria: (data.institucion_hospitalaria || '').trim() || null,
        grado_estudio: (data.grado_estudio || '').trim() || null,
        anos_servicio: data.anos_servicio != null && String(data.anos_servicio).trim() !== '' ? parseInt(String(data.anos_servicio), 10) : null,
        activo: data.activo !== undefined ? Boolean(data.activo) : true,
      });
      const emailDisplay = invite && (data.email || '').trim() ? ` Se envió un correo a ${data.email.trim()} para que confirme su cuenta y cree su contraseña.` : '';
      message.success(`Doctor creado correctamente.${emailDisplay}`);
      navigate('/doctores', { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const resData = err?.response?.data;
      let msg = resData?.error || resData?.message || err?.message || 'Error al crear el doctor';
      if (status === 400 && Array.isArray(resData?.details) && resData.details.length > 0) {
        const first = resData.details[0];
        const fieldMsg = first.msg || first.message;
        if (fieldMsg) msg = fieldMsg;
      }
      setSubmitError(msg);
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
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="usePassword" {...register('usePassword')} />
            <label htmlFor="usePassword" style={{ fontWeight: 500, color: 'var(--color-texto-primario)' }}>
              Establecer contraseña ahora (si no, se enviará invitación por correo)
            </label>
          </div>
          {usePassword && (
            <>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Contraseña"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    error={errors.password?.message}
                    {...field}
                  />
                )}
              />
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <Input
                    label="Confirmar contraseña"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repetir contraseña"
                    error={errors.confirmPassword?.message}
                    {...field}
                  />
                )}
              />
            </>
          )}
          {!usePassword && (
            <p style={{ margin: '-0.5rem 0 1rem', fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
              Se enviará un correo al doctor para que confirme su cuenta y cree su propia contraseña.
            </p>
          )}
          <Controller
            name="apellido_paterno"
            control={control}
            render={({ field }) => (
              <Input label="Apellido paterno" placeholder="Ej. González" error={errors.apellido_paterno?.message} {...field} required />
            )}
          />
          <Controller
            name="apellido_materno"
            control={control}
            render={({ field }) => (
              <Input label="Apellido materno" placeholder="Ej. Morales" error={errors.apellido_materno?.message} {...field} />
            )}
          />
          <Controller
            name="nombre"
            control={control}
            render={({ field }) => (
              <Input label="Nombre" placeholder="Ej. José" error={errors.nombre?.message} {...field} required />
            )}
          />
          <Controller
            name="telefono"
            control={control}
            render={({ field }) => (
              <Input label="Teléfono" type="tel" placeholder="Ej. 55 1234 5678" error={errors.telefono?.message} {...field} />
            )}
          />
          <Controller
            name="institucion_hospitalaria"
            control={control}
            render={({ field }) => (
              <Input label="Institución hospitalaria" placeholder="Ej. IMSS Bienestar" error={errors.institucion_hospitalaria?.message} {...field} />
            )}
          />
          <Controller
            name="grado_estudio"
            control={control}
            render={({ field }) => (
              <Input label="Grado de estudio" placeholder="Ej. Licenciatura en Medicina" error={errors.grado_estudio?.message} {...field} />
            )}
          />
          <Controller
            name="anos_servicio"
            control={control}
            render={({ field }) => (
              <Input label="Años de servicio" type="number" min={0} placeholder="Ej. 5" error={errors.anos_servicio?.message} {...field} />
            )}
          />
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="activo" {...register('activo')} />
            <label htmlFor="activo" style={{ fontWeight: 500, color: 'var(--color-texto-primario)' }}>
              Doctor activo
            </label>
          </div>
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
