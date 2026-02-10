import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pacienteEditSchema } from '../../lib/validations/pacienteSchema';
import { getPacienteById, updatePaciente } from '../../api/pacientes';
import { getModulos } from '../../api/modulos';
import { getDoctores } from '../../api/doctores';
import { createPacienteRedApoyo } from '../../api/pacienteMedicalData';
import { getComorbilidades } from '../../api/comorbilidades';
import { registerInitialMedicalData } from '../../utils/registerInitialMedicalData';
import { useAuthStore } from '../../stores/authStore';
import { estadosMexico } from '../../data/estadosMexico';
import { getMunicipiosByEstado } from '../../data/municipiosMexico';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input, Select, LoadingSpinner } from '../../components/ui';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';

const OPCIONES_SEXO = [{ value: '', label: '—' }, { value: 'Hombre', label: 'Hombre' }, { value: 'Mujer', label: 'Mujer' }, { value: 'Otro', label: 'Otro' }];
const OPCIONES_INSTITUCION = ['IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro'];

/** Convierte fecha del backend a YYYY-MM-DD para input type="date" */
function toInputDate(value) {
  if (value == null) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

export default function EditarPaciente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const parsedId = parsePositiveInt(id, 0);
  const [paciente, setPaciente] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [doctores, setDoctores] = useState([]);
  const [loadingDoctores, setLoadingDoctores] = useState(false);
  const [redApoyo, setRedApoyo] = useState({
    nombre_contacto: '',
    numero_celular: '',
    parentesco: '',
  });
  const [primeraConsultaEnabled, setPrimeraConsultaEnabled] = useState(false);
  const [primeraConsulta, setPrimeraConsulta] = useState({
    id_doctor: '',
    fecha_cita: '',
    motivo: '',
    diagnostico: '',
    peso_kg: '',
    talla_m: '',
    presion_sistolica: '',
    presion_diastolica: '',
    glucosa_mg_dl: '',
  });
  const [enfermedadesCronicas, setEnfermedadesCronicas] = useState({
    diabetes: false,
    hipertension: false,
    obesidad: false,
  });
  const [tratamientoNoFarmaco, setTratamientoNoFarmaco] = useState(false);
  const [tratamientoFarmaco, setTratamientoFarmaco] = useState(false);
  const [anioDiagnostico, setAnioDiagnostico] = useState('');
  const [catalogoComorbilidades, setCatalogoComorbilidades] = useState([]);
  const [comorbilidadIds, setComorbilidadIds] = useState({
    diabetes: null,
    hipertension: null,
    obesidad: null,
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(pacienteEditSchema),
    defaultValues: {
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      fecha_nacimiento: '',
      curp: '',
      numero_celular: '',
      direccion: '',
      estado: '',
      localidad: '',
      sexo: '',
      institucion_salud: '',
      id_modulo: '',
      activo: true,
    },
  });

  const estadoWatch = watch('estado');
  const municipiosOpciones = useMemo(() => getMunicipiosByEstado(estadoWatch || ''), [estadoWatch]);

  const load = useCallback(async () => {
    if (parsedId === 0) return;
    setLoading(true);
    try {
      const [p, mods] = await Promise.all([getPacienteById(parsedId), getModulos()]);
      setPaciente(p);
      setModulos(Array.isArray(mods) ? mods : []);
      const tel = p.numero_celular ?? p.telefono ?? '';
      reset({
        nombre: p.nombre ?? '',
        apellido_paterno: p.apellido_paterno ?? '',
        apellido_materno: p.apellido_materno ?? '',
        fecha_nacimiento: toInputDate(p.fecha_nacimiento),
        curp: p.curp ?? '',
        numero_celular: tel,
        direccion: p.direccion ?? '',
        estado: p.estado ?? '',
        localidad: p.localidad ?? '',
        sexo: p.sexo ?? '',
        institucion_salud: p.institucion_salud ?? '',
        id_modulo: p.id_modulo ?? '',
        activo: p.activo !== false,
      });
    } catch {
      setPaciente(null);
    } finally {
      setLoading(false);
    }
  }, [parsedId, reset]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setLoadingDoctores(true);
    getDoctores({ estado: 'activos', limit: 200 })
      .then((data) => setDoctores(Array.isArray(data) ? data : []))
      .catch(() => setDoctores([]))
      .finally(() => setLoadingDoctores(false));
    getComorbilidades()
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setCatalogoComorbilidades(arr);
        const findByKeyword = (keyword) => {
          const k = keyword.toLowerCase();
          const item = arr.find((c) => {
            const nombre = (c.nombre_comorbilidad || c.nombre || '').toLowerCase();
            return nombre.includes(k);
          });
          return item?.id_comorbilidad ?? item?.id ?? null;
        };
        setComorbilidadIds({
          diabetes: findByKeyword('diab'),
          hipertension: findByKeyword('hipertens'),
          obesidad: findByKeyword('obes'),
        });
      })
      .catch(() => {
        setCatalogoComorbilidades([]);
      });
  }, []);

  async function onSubmit(data) {
    setSubmitError('');
    try {
      const payload = {
        nombre: data.nombre.trim(),
        apellido_paterno: data.apellido_paterno.trim(),
        apellido_materno: data.apellido_materno?.trim() || null,
        fecha_nacimiento: data.fecha_nacimiento.trim(),
        curp: data.curp?.trim() ? data.curp.trim().toUpperCase() : null,
        numero_celular: data.numero_celular?.trim() || null,
        direccion: data.direccion?.trim() || null,
        estado: data.estado?.trim() || null,
        localidad: data.localidad?.trim() || null,
        sexo: data.sexo?.trim() || null,
        institucion_salud: data.institucion_salud?.trim() || null,
        id_modulo: data.id_modulo ?? null,
      };
      if (isAdmin() && typeof data.activo === 'boolean') payload.activo = data.activo;
      await updatePaciente(parsedId, payload);

      // Red de apoyo básica adicional (opcional)
      const nombreRed = redApoyo.nombre_contacto.trim();
      const telRed = redApoyo.numero_celular.trim();
      if (parsedId > 0 && (nombreRed || telRed)) {
        try {
          await createPacienteRedApoyo(parsedId, {
            nombre_contacto: nombreRed || 'Contacto principal',
            numero_celular: telRed || undefined,
            parentesco: redApoyo.parentesco.trim() || undefined,
          });
        } catch (e) {
          console.error('Error al crear red de apoyo en edición', e);
        }
      }

      // Primera consulta + comorbilidades iniciales (opcional)
      const hasEnfermedadesCronicas = Object.values(enfermedadesCronicas).some(Boolean);
      if (primeraConsultaEnabled || hasEnfermedadesCronicas) {
        const doctorId = parseInt(primeraConsulta.id_doctor, 10) || undefined;
        const fecha = (primeraConsulta.fecha_cita || '').trim() || undefined;

        const selectedComorbilidadIds = [];
        if (enfermedadesCronicas.diabetes && comorbilidadIds.diabetes) {
          selectedComorbilidadIds.push(comorbilidadIds.diabetes);
        }
        if (enfermedadesCronicas.hipertension && comorbilidadIds.hipertension) {
          selectedComorbilidadIds.push(comorbilidadIds.hipertension);
        }
        if (enfermedadesCronicas.obesidad && comorbilidadIds.obesidad) {
          selectedComorbilidadIds.push(comorbilidadIds.obesidad);
        }

        try {
          await registerInitialMedicalData({
            pacienteId: parsedId,
            doctorId,
            fechaCita: fecha,
            motivo: primeraConsulta.motivo,
            diagnosticoTexto: primeraConsulta.diagnostico,
            signos: {
              peso_kg: primeraConsulta.peso_kg,
              talla_m: primeraConsulta.talla_m,
              presion_sistolica: primeraConsulta.presion_sistolica,
              presion_diastolica: primeraConsulta.presion_diastolica,
              glucosa_mg_dl: primeraConsulta.glucosa_mg_dl,
            },
            comorbilidadIds: selectedComorbilidadIds,
            tratamientoNoFarmaco,
            tratamientoFarmaco,
            anioDiagnostico,
          });
        } catch (e) {
          console.error('Error al registrar datos médicos iniciales en edición', e);
        }
      }

      navigate(`/pacientes/${parsedId}`, { replace: true });
    } catch (err) {
      setSubmitError(
        err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Error al actualizar'
      );
    }
  }

  if (parsedId === 0) {
    return (
      <div>
        <PageHeader title="Editar paciente" showBack backTo="/pacientes" />
        <p style={{ color: 'var(--color-error)' }}>Paciente no encontrado.</p>
      </div>
    );
  }

  if (loading || !paciente) {
    return (
      <div>
        <PageHeader title="Editar paciente" showBack backTo="/pacientes" />
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Editar paciente" showBack backTo={`/pacientes/${parsedId}`} />
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {submitError && (
            <p style={{ margin: '0 0 1rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>{submitError}</p>
          )}
          <Input label="Nombre" error={errors.nombre?.message} {...register('nombre')} required />
          <Input
            label="Apellido paterno"
            error={errors.apellido_paterno?.message}
            {...register('apellido_paterno')}
            required
          />
          <Input
            label="Apellido materno"
            error={errors.apellido_materno?.message}
            {...register('apellido_materno')}
          />
          <Input
            label="Fecha de nacimiento"
            type="date"
            error={errors.fecha_nacimiento?.message}
            {...register('fecha_nacimiento')}
            required
          />
          <Input label="CURP" error={errors.curp?.message} {...register('curp')} />
          <Input
            label="Teléfono / Celular"
            type="tel"
            error={errors.numero_celular?.message}
            {...register('numero_celular')}
          />
          <Input
            label="Dirección"
            error={errors.direccion?.message}
            {...register('direccion')}
          />
          <Controller
            name="estado"
            control={control}
            render={({ field }) => (
              <Select
                label="Estado (entidad federativa)"
                placeholder="— Seleccionar estado —"
                value={field.value || ''}
                onChange={(v) => field.onChange(v || '')}
                options={[
                  { value: '', label: '— Seleccionar estado —' },
                  ...(estadosMexico || []).map((e) => ({
                    value: e.nombre,
                    label: sanitizeForDisplay(e.nombre) || '—',
                  })),
                ]}
                error={errors.estado?.message}
              />
            )}
          />
          <Controller
            name="localidad"
            control={control}
            render={({ field }) => (
              <Select
                label="Municipio / Ciudad"
                placeholder="— Seleccionar municipio —"
                value={field.value || ''}
                onChange={(v) => field.onChange(v || '')}
                options={[
                  { value: '', label: '— Seleccionar municipio —' },
                  ...(municipiosOpciones || []).map((mun) => ({
                    value: mun,
                    label: sanitizeForDisplay(mun) || '—',
                  })),
                ]}
                disabled={!estadoWatch}
                error={errors.localidad?.message}
              />
            )}
          />
          <Controller
            name="sexo"
            control={control}
            render={({ field }) => (
              <Select
                label="Sexo"
                placeholder="Seleccionar sexo"
                value={field.value || ''}
                onChange={(v) => field.onChange(v || '')}
                options={OPCIONES_SEXO}
              />
            )}
          />
          <Controller
            name="institucion_salud"
            control={control}
            render={({ field }) => (
              <Select
                label="Institución de salud"
                placeholder="— Seleccionar —"
                value={field.value || ''}
                onChange={(v) => field.onChange(v || '')}
                options={[
                  { value: '', label: '— Seleccionar —' },
                  ...OPCIONES_INSTITUCION.map((inst) => ({
                    value: inst,
                    label: inst,
                  })),
                ]}
              />
            )}
          />
          <Controller
            name="id_modulo"
            control={control}
            render={({ field }) => (
              <Select
                label="Módulo"
                placeholder="— Sin módulo —"
                value={field.value ?? ''}
                onChange={(v) => field.onChange(v || '')}
                options={[
                  { value: '', label: '— Sin módulo —' },
                  ...modulos.map((m) => ({
                    value: String(m.id_modulo ?? m.id),
                    label:
                      sanitizeForDisplay(m.nombre_modulo ?? m.nombre) || '—',
                  })),
                ]}
              />
            )}
          />
          {isAdmin() && (
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="activo" {...register('activo')} />
              <label htmlFor="activo" style={{ fontWeight: 500, color: 'var(--color-texto-primario)' }}>
                Paciente activo
              </label>
            </div>
          )}
          {/* Red de apoyo básica en edición */}
          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--color-borde-claro)' }} />
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-primario)' }}>
            Red de apoyo (opcional)
          </h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
            Puedes agregar un nuevo contacto principal de red de apoyo para este paciente.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <Input
              label="Nombre del contacto"
              value={redApoyo.nombre_contacto}
              onChange={(e) => setRedApoyo((prev) => ({ ...prev, nombre_contacto: e.target.value }))}
            />
            <Input
              label="Teléfono del contacto"
              value={redApoyo.numero_celular}
              onChange={(e) => setRedApoyo((prev) => ({ ...prev, numero_celular: e.target.value }))}
            />
            <Input
              label="Parentesco"
              value={redApoyo.parentesco}
              onChange={(e) => setRedApoyo((prev) => ({ ...prev, parentesco: e.target.value }))}
            />
          </div>

          {/* Primera consulta rápida en edición */}
          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--color-borde-claro)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              id="primera-consulta-enabled-edit"
              type="checkbox"
              checked={primeraConsultaEnabled}
              onChange={(e) => setPrimeraConsultaEnabled(e.target.checked)}
            />
            <label htmlFor="primera-consulta-enabled-edit" style={{ fontWeight: 600, cursor: 'pointer' }}>
              Registrar primera consulta / consulta inicial desde esta edición
            </label>
          </div>
          {primeraConsultaEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <Select
                  label="Doctor de la consulta"
                  placeholder="— Seleccionar doctor —"
                  value={primeraConsulta.id_doctor || ''}
                  onChange={(v) =>
                    setPrimeraConsulta((prev) => ({
                      ...prev,
                      id_doctor: v || '',
                    }))
                  }
                  disabled={loadingDoctores}
                  options={[
                    { value: '', label: '— Seleccionar doctor —' },
                    ...doctores.map((d) => ({
                      value: String(d.id_doctor ?? d.id),
                      label:
                        sanitizeForDisplay(
                          [d.nombre, d.apellido_paterno, d.apellido_materno]
                            .filter(Boolean)
                            .join(' '),
                        ) || '—',
                    })),
                  ]}
                />
              </div>
              <Input
                label="Fecha y hora de la consulta"
                type="datetime-local"
                value={primeraConsulta.fecha_cita}
                onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, fecha_cita: e.target.value }))}
              />
              <Input
                label="Motivo de la consulta"
                value={primeraConsulta.motivo}
                onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, motivo: e.target.value }))}
              />
              <Input
                label="Diagnóstico inicial (opcional)"
                value={primeraConsulta.diagnostico}
                onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, diagnostico: e.target.value }))}
              />
            </div>
          )}
          {primeraConsultaEnabled && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
                Signos vitales básicos de la consulta (opcionales):
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '0.75rem' }}>
                <Input
                  label="Peso (kg)"
                  type="number"
                  value={primeraConsulta.peso_kg}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, peso_kg: e.target.value }))}
                />
                <Input
                  label="Talla (m)"
                  type="number"
                  step="0.01"
                  value={primeraConsulta.talla_m}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, talla_m: e.target.value }))}
                />
                <Input
                  label="PA sistólica"
                  type="number"
                  value={primeraConsulta.presion_sistolica}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, presion_sistolica: e.target.value }))}
                />
                <Input
                  label="PA diastólica"
                  type="number"
                  value={primeraConsulta.presion_diastolica}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, presion_diastolica: e.target.value }))}
                />
                <Input
                  label="Glucosa (mg/dL)"
                  type="number"
                  step="0.1"
                  value={primeraConsulta.glucosa_mg_dl}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, glucosa_mg_dl: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Enfermedades crónicas y tratamiento en edición */}
          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--color-borde-claro)' }} />
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-primario)' }}>
            Enfermedades crónicas (opcional)
          </h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
            Marca las enfermedades crónicas principales para registrar comorbilidades adicionales de este paciente.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enfermedadesCronicas.diabetes}
                onChange={(e) => setEnfermedadesCronicas((prev) => ({ ...prev, diabetes: e.target.checked }))}
              />
              <span>Diabetes</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enfermedadesCronicas.hipertension}
                onChange={(e) => setEnfermedadesCronicas((prev) => ({ ...prev, hipertension: e.target.checked }))}
              />
              <span>Hipertensión</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enfermedadesCronicas.obesidad}
                onChange={(e) => setEnfermedadesCronicas((prev) => ({ ...prev, obesidad: e.target.checked }))}
              />
              <span>Obesidad</span>
            </label>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={tratamientoNoFarmaco}
                onChange={(e) => setTratamientoNoFarmaco(e.target.checked)}
              />
              <span>Tratamiento no farmacológico</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={tratamientoFarmaco}
                onChange={(e) => setTratamientoFarmaco(e.target.checked)}
              />
              <span>Tratamiento farmacológico</span>
            </label>
          </div>
          <div style={{ maxWidth: 220, marginBottom: '1rem' }}>
            <Input
              label="Año de diagnóstico (opcional)"
              type="number"
              value={anioDiagnostico}
              onChange={(e) => setAnioDiagnostico(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(`/pacientes/${parsedId}`)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
