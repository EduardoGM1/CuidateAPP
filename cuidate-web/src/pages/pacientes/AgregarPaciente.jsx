import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pacienteCreateSchema } from '../../lib/validations/pacienteSchema';
import { createPaciente } from '../../api/pacientes';
import { getDoctores } from '../../api/doctores';
import { createPacienteRedApoyo } from '../../api/pacienteMedicalData';
import { createCita } from '../../api/citas';
import { createSignosVitales, createDiagnostico } from '../../api/pacienteMedicalData';
import { getModulos } from '../../api/modulos';
import { getInstitucionesSalud } from '../../api/institucionesSalud';
import { estadosMexico } from '../../data/estadosMexico';
import { getMunicipiosByEstado } from '../../data/municipiosMexico';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input } from '../../components/ui';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { getComorbilidades } from '../../api/comorbilidades';
import { registerInitialMedicalData } from '../../utils/registerInitialMedicalData';
import {
  ENFERMEDADES_CRONICAS_KEYS,
  ENFERMEDADES_CRONICAS_LABELS,
  getInitialEnfermedadesCronicas,
  getInitialComorbilidadIds,
} from '../../constants/enfermedadesCronicas';
import { createEmptyRedApoyoItem } from '../../constants/redApoyo';
import RedApoyoFormFields from '../../components/pacientes/RedApoyoFormFields';

const OPCIONES_SEXO = [{ value: '', label: '—' }, { value: 'Hombre', label: 'Hombre' }, { value: 'Mujer', label: 'Mujer' }, { value: 'Otro', label: 'Otro' }];

export default function AgregarPaciente() {
  const navigate = useNavigate();
  const [modulos, setModulos] = useState([]);
  const [institucionesSalud, setInstitucionesSalud] = useState([]);
  const [submitError, setSubmitError] = useState('');
  const [doctores, setDoctores] = useState([]);
  const [loadingDoctores, setLoadingDoctores] = useState(false);

  const [redApoyoList, setRedApoyoList] = useState([createEmptyRedApoyoItem()]);
  const addRedApoyo = () => setRedApoyoList((prev) => [...prev, createEmptyRedApoyoItem()]);
  const removeRedApoyo = (index) => {
    if (redApoyoList.length <= 1) return;
    setRedApoyoList((prev) => prev.filter((_, i) => i !== index));
  };
  const updateRedApoyo = (index, field, value) => {
    setRedApoyoList((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };
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
    colesterol_mg_dl: '',
    colesterol_ldl: '',
    colesterol_hdl: '',
    trigliceridos_mg_dl: '',
    hba1c_porcentaje: '',
    edad_paciente_en_medicion: '',
    medida_cintura_cm: '',
    observaciones: '',
  });
  const [enfermedadesCronicas, setEnfermedadesCronicas] = useState(getInitialEnfermedadesCronicas);
  const [tratamientoNoFarmaco, setTratamientoNoFarmaco] = useState(false);
  const [tratamientoFarmaco, setTratamientoFarmaco] = useState(false);
  const [anioDiagnostico, setAnioDiagnostico] = useState('');
  const [catalogoComorbilidades, setCatalogoComorbilidades] = useState([]);
  const [comorbilidadIds, setComorbilidadIds] = useState(getInitialComorbilidadIds);

  const {
    control,
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
    getInstitucionesSalud()
      .then((data) => setInstitucionesSalud(Array.isArray(data) ? data : []))
      .catch(() => setInstitucionesSalud([]));
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
          dislipidemia: findByKeyword('dislipid') || findByKeyword('colesterol'),
          enfermedad_renal_cronica: findByKeyword('renal') || findByKeyword('erc'),
          epoc: findByKeyword('epoc'),
          enfermedad_cardiovascular: findByKeyword('cardiovascular') || findByKeyword('corazón'),
          tuberculosis: findByKeyword('tubercul'),
          asma: findByKeyword('asma'),
          tabaquismo: findByKeyword('tabaqu'),
          otro: null,
        });
      })
      .catch(() => {
        setCatalogoComorbilidades([]);
      });
  }, []);

  // Calcular edad en medición desde fecha de nacimiento al activar primera consulta (paridad con app móvil)
  const fechaNacimientoWatch = watch('fecha_nacimiento');
  useEffect(() => {
    if (!fechaNacimientoWatch || !primeraConsultaEnabled) return;
    const d = new Date(fechaNacimientoWatch);
    if (Number.isNaN(d.getTime())) return;
    const hoy = new Date();
    let edad = hoy.getFullYear() - d.getFullYear();
    const m = hoy.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < d.getDate())) edad--;
    if (edad >= 0 && edad <= 120) {
      setPrimeraConsulta((prev) => ({
        ...prev,
        edad_paciente_en_medicion: String(edad),
      }));
    }
  }, [fechaNacimientoWatch, primeraConsultaEnabled]);

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
        // 1) Red de apoyo: crear cada contacto que tenga al menos nombre (paridad con app móvil)
        for (const contacto of redApoyoList) {
          const nombreRed = (contacto.nombre_contacto || '').trim();
          if (!nombreRed) continue;
          try {
            await createPacienteRedApoyo(id, {
              nombre_contacto: nombreRed,
              numero_celular: (contacto.numero_celular || '').trim() || undefined,
              email: (contacto.email || '').trim() || undefined,
              direccion: (contacto.direccion || '').trim() || undefined,
              localidad: (contacto.localidad || '').trim() || undefined,
              parentesco: (contacto.parentesco || '').trim() || undefined,
            });
          } catch (e) {
            console.error('Error al crear contacto de red de apoyo', e);
          }
        }

        // 2) Primera consulta + comorbilidades iniciales (opcional)
        const hasEnfermedadesCronicas = Object.values(enfermedadesCronicas).some(Boolean);
        if (primeraConsultaEnabled || hasEnfermedadesCronicas) {
          const doctorId = parseInt(primeraConsulta.id_doctor, 10) || undefined;
          const fecha = (primeraConsulta.fecha_cita || '').trim() || undefined;

          const selectedComorbilidadIds = [];
          ENFERMEDADES_CRONICAS_KEYS.forEach((key) => {
            if (enfermedadesCronicas[key] && comorbilidadIds[key]) {
              selectedComorbilidadIds.push(comorbilidadIds[key]);
            }
          });

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
                colesterol_mg_dl: primeraConsulta.colesterol_mg_dl,
                colesterol_ldl: primeraConsulta.colesterol_ldl,
                colesterol_hdl: primeraConsulta.colesterol_hdl,
                trigliceridos_mg_dl: primeraConsulta.trigliceridos_mg_dl,
                hba1c_porcentaje: primeraConsulta.hba1c_porcentaje,
                edad_paciente_en_medicion: primeraConsulta.edad_paciente_en_medicion,
                medida_cintura_cm: primeraConsulta.medida_cintura_cm,
                observaciones: primeraConsulta.observaciones,
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
          <Controller
            name="nombre"
            control={control}
            render={({ field }) => (
              <Input label="Nombre" error={errors.nombre?.message} {...field} required />
            )}
          />
          <Controller
            name="apellido_paterno"
            control={control}
            render={({ field }) => (
              <Input label="Apellido paterno" error={errors.apellido_paterno?.message} {...field} required />
            )}
          />
          <Controller
            name="apellido_materno"
            control={control}
            render={({ field }) => (
              <Input label="Apellido materno" error={errors.apellido_materno?.message} {...field} />
            )}
          />
          <Controller
            name="fecha_nacimiento"
            control={control}
            render={({ field }) => (
              <Input label="Fecha de nacimiento" type="date" error={errors.fecha_nacimiento?.message} {...field} required />
            )}
          />
          <Controller
            name="curp"
            control={control}
            render={({ field }) => (
              <Input label="CURP" error={errors.curp?.message} {...field} required placeholder="18 caracteres, formato oficial" />
            )}
          />
          <Controller
            name="numero_celular"
            control={control}
            render={({ field }) => (
              <Input label="Teléfono / Celular" type="tel" error={errors.numero_celular?.message} {...field} />
            )}
          />
          <Controller
            name="direccion"
            control={control}
            render={({ field }) => (
              <Input label="Dirección" error={errors.direccion?.message} {...field} />
            )}
          />
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
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>Institución de salud *</label>
            <select
              {...register('institucion_salud')}
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--color-borde-claro)', borderRadius: 'var(--radius)', backgroundColor: 'var(--color-fondo-card)' }}
            >
              <option value="">— Seleccionar —</option>
              {institucionesSalud.map((inst) => (
                <option key={inst.id_institucion_salud ?? inst.nombre} value={inst.nombre}>{sanitizeForDisplay(inst.nombre) || inst.nombre}</option>
              ))}
            </select>
            {errors.institucion_salud?.message && <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-error)' }}>{errors.institucion_salud.message}</p>}
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
          {/* Red de apoyo: componente reutilizable (paridad con app móvil) */}
          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--color-borde-claro)' }} />
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: 'var(--color-primario)' }}>
            Red de apoyo (opcional)
          </h3>
          <RedApoyoFormFields
            list={redApoyoList}
            onAdd={addRedApoyo}
            onRemove={removeRedApoyo}
            onUpdate={updateRedApoyo}
            disabled={isSubmitting}
          />

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
                Signos vitales de la primera consulta (opcionales):
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Input label="Peso (kg)" type="number" value={primeraConsulta.peso_kg} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, peso_kg: e.target.value }))} />
                <Input label="Talla (m)" type="number" step="0.01" value={primeraConsulta.talla_m} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, talla_m: e.target.value }))} />
                <Input label="Circunf. cintura (cm)" type="number" step="0.1" value={primeraConsulta.medida_cintura_cm} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, medida_cintura_cm: e.target.value }))} />
                <Input label="PA sistólica" type="number" value={primeraConsulta.presion_sistolica} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, presion_sistolica: e.target.value }))} />
                <Input label="PA diastólica" type="number" value={primeraConsulta.presion_diastolica} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, presion_diastolica: e.target.value }))} />
                <Input label="Glucosa (mg/dL)" type="number" step="0.1" value={primeraConsulta.glucosa_mg_dl} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, glucosa_mg_dl: e.target.value }))} />
                <Input label="HbA1c (%)" type="number" step="0.1" value={primeraConsulta.hba1c_porcentaje} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, hba1c_porcentaje: e.target.value }))} placeholder="Criterios acreditación" />
                <Input label="Edad en medición (años)" type="number" value={primeraConsulta.edad_paciente_en_medicion} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, edad_paciente_en_medicion: e.target.value }))} placeholder="Ej: 45" />
                <Input label="Colesterol total (mg/dL)" type="number" value={primeraConsulta.colesterol_mg_dl} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, colesterol_mg_dl: e.target.value }))} />
                <Input label="Colesterol LDL (mg/dL)" type="number" value={primeraConsulta.colesterol_ldl} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, colesterol_ldl: e.target.value }))} />
                <Input label="Colesterol HDL (mg/dL)" type="number" value={primeraConsulta.colesterol_hdl} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, colesterol_hdl: e.target.value }))} />
                <Input label="Triglicéridos (mg/dL)" type="number" value={primeraConsulta.trigliceridos_mg_dl} onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, trigliceridos_mg_dl: e.target.value }))} />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, color: 'var(--color-texto-primario)' }}>Observaciones</label>
                <textarea
                  value={primeraConsulta.observaciones}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Observaciones adicionales de la primera consulta..."
                  rows={3}
                  style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid var(--color-borde-claro)', borderRadius: 'var(--radius)', backgroundColor: 'var(--color-fondo-card)', resize: 'vertical' }}
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', marginBottom: '0.75rem' }}>
            {[
              { key: 'diabetes', label: 'Diabetes' },
              { key: 'hipertension', label: 'Hipertensión' },
              { key: 'obesidad', label: 'Obesidad' },
              { key: 'dislipidemia', label: 'Dislipidemia' },
              { key: 'enfermedad_renal_cronica', label: 'Enfermedad renal crónica' },
              { key: 'epoc', label: 'EPOC' },
              { key: 'enfermedad_cardiovascular', label: 'Enfermedad cardiovascular' },
              { key: 'tuberculosis', label: 'Tuberculosis' },
              { key: 'asma', label: 'Asma' },
              { key: 'tabaquismo', label: 'Tabaquismo' },
              { key: 'otro', label: 'Otro' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!!enfermedadesCronicas[key]}
                  onChange={(e) => setEnfermedadesCronicas((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}
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
