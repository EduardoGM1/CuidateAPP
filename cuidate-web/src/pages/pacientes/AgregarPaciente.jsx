import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pacienteCreateSchema } from '../../lib/validations/pacienteSchema';
import { createPaciente } from '../../api/pacientes';
import { getDoctores } from '../../api/doctores';
import { createPacienteRedApoyo } from '../../api/pacienteMedicalData';
import { createCita } from '../../api/citas';
import { createSignosVitales, createDiagnostico } from '../../api/pacienteMedicalData';
import { getModulos } from '../../api/modulos';
import { estadosMexico } from '../../data/estadosMexico';
import { getMunicipiosByEstado } from '../../data/municipiosMexico';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input } from '../../components/ui';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { getComorbilidades } from '../../api/comorbilidades';
import { registerInitialMedicalData } from '../../utils/registerInitialMedicalData';

const OPCIONES_SEXO = [{ value: '', label: '—' }, { value: 'Hombre', label: 'Hombre' }, { value: 'Mujer', label: 'Mujer' }, { value: 'Otro', label: 'Otro' }];
const OPCIONES_INSTITUCION = ['IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro'];

export default function AgregarPaciente() {
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [submitError, setSubmitError] = useState('');
  const [doctores, setDoctores] = useState([]);
  const [loadingDoctores, setLoadingDoctores] = useState(false);

  // Datos adicionales: red de apoyo básica y primera consulta opcional
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
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(pacienteCreateSchema),
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
    },
  });

  const estadoWatch = watch('estado');
  const municipiosOpciones = useMemo(() => getMunicipiosByEstado(estadoWatch || ''), [estadoWatch]);

  useEffect(() => {
    getModulos()
      .then((data) => setModulos(Array.isArray(data) ? data : []))
      .catch(() => setModulos([]));
    setLoadingDoctores(true);
    getDoctores({ estado: 'activos', limit: 200 })
      .then((data) => setDoctores(Array.isArray(data) ? data : []))
      .catch(() => setDoctores([]))
      .finally(() => setLoadingDoctores(false));
    // Cargar catálogo de comorbilidades para mapear enfermedades crónicas a IDs reales
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
      const created = await createPaciente(payload);
      const id = created?.id_paciente ?? created?.id;

      if (id) {
        // 1) Red de apoyo básica (si se capturó nombre o teléfono)
        const nombreRed = redApoyo.nombre_contacto.trim();
        const telRed = redApoyo.numero_celular.trim();
        if (nombreRed || telRed) {
          try {
            await createPacienteRedApoyo(id, {
              nombre_contacto: nombreRed || 'Contacto principal',
              numero_celular: telRed || undefined,
              parentesco: redApoyo.parentesco.trim() || undefined,
            });
          } catch (e) {
            // No frenamos el alta del paciente; solo dejamos constancia en el error general
            console.error('Error al crear red de apoyo inicial', e);
          }
        }

        // 2) Primera consulta + comorbilidades iniciales (opcional)
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
              pacienteId: id,
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
            console.error('Error al registrar datos médicos iniciales', e);
          }
        }

        navigate(`/pacientes/${id}`, { replace: true });
      } else {
        navigate('/pacientes', { replace: true });
      }
    } catch (err) {
      setSubmitError(
        err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Error al crear el paciente'
      );
    }
  }

  return (
    <div>
      <PageHeader title="Nuevo paciente" showBack backTo="/pacientes" />
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
          <Input label="Dirección" error={errors.direccion?.message} {...register('direccion')} />
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>Estado (entidad federativa)</label>
            <select
              {...register('estado')}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--color-borde-claro)', borderRadius: 'var(--radius)', backgroundColor: 'var(--color-fondo-card)' }}
            >
              <option value="">— Seleccionar estado —</option>
              {(estadosMexico || []).map((e) => (
                <option key={e.clave} value={e.nombre}>{sanitizeForDisplay(e.nombre)}</option>
              ))}
            </select>
            {errors.estado?.message && <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-error)' }}>{errors.estado.message}</p>}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>Municipio / Ciudad</label>
            <select
              {...register('localidad')}
              disabled={!estadoWatch}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--color-borde-claro)', borderRadius: 'var(--radius)', backgroundColor: 'var(--color-fondo-card)' }}
            >
              <option value="">— Seleccionar municipio —</option>
              {(municipiosOpciones || []).map((mun) => (
                <option key={mun} value={mun}>{sanitizeForDisplay(mun)}</option>
              ))}
            </select>
            {errors.localidad?.message && <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-error)' }}>{errors.localidad.message}</p>}
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>Sexo</label>
            <select
              {...register('sexo')}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--color-borde-claro)', borderRadius: 'var(--radius)', backgroundColor: 'var(--color-fondo-card)' }}
            >
              {OPCIONES_SEXO.map((o) => (
                <option key={o.value || 'v'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>Institución de salud</label>
            <select
              {...register('institucion_salud')}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--color-borde-claro)', borderRadius: 'var(--radius)', backgroundColor: 'var(--color-fondo-card)' }}
            >
              <option value="">— Seleccionar —</option>
              {OPCIONES_INSTITUCION.map((inst) => (
                <option key={inst} value={inst}>{inst}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>Módulo</label>
            <select
              {...register('id_modulo')}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--color-borde-claro)', borderRadius: 'var(--radius)', backgroundColor: 'var(--color-fondo-card)' }}
            >
              <option value="">— Sin módulo —</option>
              {modulos.map((m) => (
                <option key={m.id_modulo ?? m.id} value={m.id_modulo ?? m.id}>
                  {sanitizeForDisplay(m.nombre_modulo ?? m.nombre) || '—'}
                </option>
              ))}
            </select>
          </div>
          {/* Sección opcional: Red de apoyo básica */}
          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--color-borde-claro)' }} />
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-primario)' }}>
            Red de apoyo (opcional)
          </h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
            Puedes registrar un contacto principal de red de apoyo para este paciente. Podrás agregar más contactos
            después desde el detalle del paciente.
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

          {/* Sección opcional: Primera consulta rápida */}
          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--color-borde-claro)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              id="primera-consulta-enabled"
              type="checkbox"
              checked={primeraConsultaEnabled}
              onChange={(e) => setPrimeraConsultaEnabled(e.target.checked)}
            />
            <label htmlFor="primera-consulta-enabled" style={{ fontWeight: 600, cursor: 'pointer' }}>
              Registrar primera consulta al crear el paciente
            </label>
          </div>
          {primeraConsultaEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>
                  Doctor de la primera consulta
                </label>
                <select
                  value={primeraConsulta.id_doctor}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, id_doctor: e.target.value }))}
                  disabled={loadingDoctores}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-borde-claro)', backgroundColor: 'var(--color-fondo-card)' }}
                >
                  <option value="">— Seleccionar doctor —</option>
                  {doctores.map((d) => (
                    <option key={d.id_doctor ?? d.id} value={d.id_doctor ?? d.id}>
                      {sanitizeForDisplay([d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' ')) || '—'}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Fecha y hora de la primera consulta"
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
                Signos vitales básicos de la primera consulta (opcionales):
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

          {/* Sección: Enfermedades crónicas y tratamiento (comorbilidades iniciales) */}
          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--color-borde-claro)' }} />
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-primario)' }}>
            Enfermedades crónicas (opcional)
          </h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
            Marca las enfermedades crónicas principales para registrar comorbilidades iniciales del paciente.
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
              {isSubmitting ? 'Creando…' : 'Crear paciente'}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/pacientes')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
