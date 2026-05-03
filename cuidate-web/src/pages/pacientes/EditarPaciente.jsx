import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPacienteEditSchema } from '../../lib/validations/pacienteSchema';
import { getPacienteById, updatePaciente } from '../../api/pacientes';
import { getModulos } from '../../api/modulos';
import { getInstitucionesSalud } from '../../api/institucionesSalud';
import { getDoctores } from '../../api/doctores';
import {
  getPacienteRedApoyo,
  createPacienteRedApoyo,
  updatePacienteRedApoyo,
  deletePacienteRedApoyo,
  getPacienteComorbilidades,
} from '../../api/pacienteMedicalData';
import { getComorbilidades } from '../../api/comorbilidades';
import {
  ENFERMEDADES_CRONICAS_KEYS,
  getInitialEnfermedadesCronicas,
  getInitialComorbilidadIds,
  getInitialAniosDiagnosticoPorEnfermedad,
} from '../../constants/enfermedadesCronicas';
import { buildComorbilidadIdsFromCatalog } from '../../utils/comorbilidadesCatalogMap';
import { buildComorbilidadesInicialesPayload } from '../../utils/enfermedadesCronicasPayload';
import { hydrateEnfermedadesCronicasFromPacienteRows } from '../../utils/hydrateEnfermedadesCronicasForm';
import { createEmptyRedApoyoItem } from '../../constants/redApoyo';
import RedApoyoFormFields from '../../components/pacientes/RedApoyoFormFields';
import PacienteEditSection from '../../components/pacientes/edit/PacienteEditSection';
import EnfermedadesCronicasFormBlock from '../../components/pacientes/EnfermedadesCronicasFormBlock';
import { registerInitialMedicalData } from '../../utils/registerInitialMedicalData';
import { adminResetPatientPin } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import { estadosMexico } from '../../data/estadosMexico';
import { getMunicipiosByEstado } from '../../data/municipiosMexico';
import { PageHeader } from '../../components/shared';
import { Card, Button, Input, Select, LoadingSpinner } from '../../components/ui';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatNombreCompleto } from '../../utils/format';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';

const OPCIONES_SEXO = [{ value: '', label: '—' }, { value: 'Hombre', label: 'Hombre' }, { value: 'Mujer', label: 'Mujer' }, { value: 'Otro', label: 'Otro' }];
const PERSONAL_FIELDS = [
  'nombre',
  'apellido_paterno',
  'apellido_materno',
  'fecha_nacimiento',
  'curp',
  'numero_expediente',
  'numero_celular',
  'direccion',
  'estado',
  'localidad',
  'sexo',
  'institucion_salud',
  'id_modulo',
];
const SECTION_KEYS = {
  GENERAL: 'general',
  RED_APOYO: 'redApoyo',
  PRIMERA_CONSULTA: 'primeraConsulta',
  CRONICAS: 'cronicas',
  PIN: 'pin',
};

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
  const isStaff = useAuthStore((s) => s.isDoctor);
  const pacienteEditResolverSchema = useMemo(() => createPacienteEditSchema(), []);
  const parsedId = parsePositiveInt(id, 0);
  const [paciente, setPaciente] = useState(null);
  const [modulos, setModulos] = useState([]);
  const [institucionesSalud, setInstitucionesSalud] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [doctores, setDoctores] = useState([]);
  const [loadingDoctores, setLoadingDoctores] = useState(false);
  const [redApoyoList, setRedApoyoList] = useState([createEmptyRedApoyoItem()]);
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
  const [enfermedadesCronicas, setEnfermedadesCronicas] = useState(getInitialEnfermedadesCronicas);
  const [tratamientoNoFarmaco, setTratamientoNoFarmaco] = useState(false);
  const [tratamientoFarmaco, setTratamientoFarmaco] = useState(false);
  const [aniosDiagnosticoPorEnfermedad, setAniosDiagnosticoPorEnfermedad] = useState(
    getInitialAniosDiagnosticoPorEnfermedad
  );
  const [comorbilidadIds, setComorbilidadIds] = useState(getInitialComorbilidadIds);

  const [staffPinNew, setStaffPinNew] = useState('');
  const [staffPinConfirm, setStaffPinConfirm] = useState('');
  const [staffPinLoading, setStaffPinLoading] = useState(false);
  const [staffPinMessage, setStaffPinMessage] = useState('');
  const [staffPinError, setStaffPinError] = useState('');
  const [sectionOpen, setSectionOpen] = useState({
    [SECTION_KEYS.GENERAL]: true,
    [SECTION_KEYS.RED_APOYO]: false,
    [SECTION_KEYS.PRIMERA_CONSULTA]: false,
    [SECTION_KEYS.CRONICAS]: false,
    [SECTION_KEYS.PIN]: false,
  });
  const [sectionStatus, setSectionStatus] = useState({
    [SECTION_KEYS.GENERAL]: 'clean',
    [SECTION_KEYS.RED_APOYO]: 'clean',
    [SECTION_KEYS.PRIMERA_CONSULTA]: 'clean',
    [SECTION_KEYS.CRONICAS]: 'clean',
    [SECTION_KEYS.PIN]: 'clean',
  });
  const [redApoyoDeletedIds, setRedApoyoDeletedIds] = useState([]);
  const initializedRef = useRef(false);
  const skipAutosaveRef = useRef({ general: true, redApoyo: true, primeraConsulta: true, cronicas: true });
  const generalLastSavedRef = useRef('');
  const redApoyoLastSavedRef = useRef('');
  const primeraConsultaLastSavedRef = useRef('');
  const cronicasLastSavedRef = useRef('');

  useOnboardingPageReady(parsedId > 0 && !loading && !!paciente);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(pacienteEditResolverSchema),
    defaultValues: {
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      fecha_nacimiento: '',
      curp: '',
      numero_expediente: '',
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
  const watchedPersonalFields = watch(PERSONAL_FIELDS);
  const municipiosOpciones = useMemo(() => getMunicipiosByEstado(estadoWatch || ''), [estadoWatch]);
  const personalSnapshot = useMemo(() => JSON.stringify(watchedPersonalFields), [watchedPersonalFields]);
  const redApoyoSnapshot = useMemo(() => JSON.stringify(redApoyoList), [redApoyoList]);
  const primeraConsultaSnapshot = useMemo(
    () => JSON.stringify({ enabled: primeraConsultaEnabled, data: primeraConsulta }),
    [primeraConsultaEnabled, primeraConsulta]
  );
  const cronicasSnapshot = useMemo(
    () =>
      JSON.stringify({
        enfermedadesCronicas,
        tratamientoNoFarmaco,
        tratamientoFarmaco,
        aniosDiagnosticoPorEnfermedad,
      }),
    [enfermedadesCronicas, tratamientoNoFarmaco, tratamientoFarmaco, aniosDiagnosticoPorEnfermedad]
  );

  const load = useCallback(async () => {
    if (parsedId === 0) return;
    setLoading(true);
    try {
      const [p, mods, insts, redRes, catalogList, comRes] = await Promise.all([
        getPacienteById(parsedId),
        getModulos(),
        getInstitucionesSalud(),
        getPacienteRedApoyo(parsedId, { limit: 50 }).catch(() => ({ data: [], total: 0 })),
        getComorbilidades().catch(() => []),
        getPacienteComorbilidades(parsedId, { limit: 100 }).catch(() => ({ data: [], total: 0 })),
      ]);
      if (!p || typeof p !== 'object') {
        setPaciente(null);
        return;
      }
      setPaciente(p);
      setModulos(Array.isArray(mods) ? mods : []);
      setInstitucionesSalud(Array.isArray(insts) ? insts : []);

      const redList = Array.isArray(redRes?.data) ? redRes.data : [];
      const normalizedRedList =
        redList.length > 0
          ? redList.map((c) => ({
              id_contacto: c.id_contacto ?? c.id,
              nombre_contacto: String(c.nombre_contacto ?? '').trim(),
              numero_celular: String(c.numero_celular ?? '').trim(),
              email: String(c.email ?? '').trim(),
              direccion: String(c.direccion ?? '').trim(),
              localidad: String(c.localidad ?? '').trim(),
              parentesco: String(c.parentesco ?? '').trim(),
            }))
          : [createEmptyRedApoyoItem()];
      setRedApoyoList(normalizedRedList);

      const catalogArr = Array.isArray(catalogList) ? catalogList : [];
      const idMap = buildComorbilidadIdsFromCatalog(catalogArr);
      setComorbilidadIds(idMap);

      const comRows = Array.isArray(comRes?.data) ? comRes.data : [];
      const hydrated = hydrateEnfermedadesCronicasFromPacienteRows(comRows, idMap);
      setEnfermedadesCronicas(hydrated.enfermedadesCronicas);
      setAniosDiagnosticoPorEnfermedad(hydrated.aniosDiagnosticoPorEnfermedad);
      setTratamientoNoFarmaco(hydrated.tratamientoNoFarmaco);
      setTratamientoFarmaco(hydrated.tratamientoFarmaco);

      const tel = p.numero_celular ?? p.telefono ?? '';
      const formValues = {
        nombre: String(p.nombre ?? '').trim(),
        apellido_paterno: String(p.apellido_paterno ?? '').trim(),
        apellido_materno: String(p.apellido_materno ?? '').trim(),
        fecha_nacimiento: toInputDate(p.fecha_nacimiento),
        curp: String(p.curp ?? '').trim(),
        numero_expediente: String(p.numero_expediente ?? '').trim(),
        numero_celular: String(tel).trim(),
        direccion: String(p.direccion ?? '').trim(),
        estado: String(p.estado ?? '').trim(),
        localidad: String(p.localidad ?? '').trim(),
        sexo: String(p.sexo ?? '').trim(),
        institucion_salud: String(p.institucion_salud ?? '').trim(),
        id_modulo: p.id_modulo != null ? String(p.id_modulo) : '',
      };
      reset(formValues);
      generalLastSavedRef.current = JSON.stringify(PERSONAL_FIELDS.map((key) => formValues[key] ?? ''));
      redApoyoLastSavedRef.current = JSON.stringify(normalizedRedList);
      primeraConsultaLastSavedRef.current = JSON.stringify({ enabled: false, data: primeraConsulta });
      cronicasLastSavedRef.current = JSON.stringify({
        enfermedadesCronicas: hydrated.enfermedadesCronicas,
        tratamientoNoFarmaco: hydrated.tratamientoNoFarmaco,
        tratamientoFarmaco: hydrated.tratamientoFarmaco,
        aniosDiagnosticoPorEnfermedad: hydrated.aniosDiagnosticoPorEnfermedad,
      });
      skipAutosaveRef.current = { general: true, redApoyo: true, primeraConsulta: true, cronicas: true };
      initializedRef.current = true;
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
  }, []);

  const setSectionStatusValue = useCallback((section, status) => {
    setSectionStatus((prev) => (prev[section] === status ? prev : { ...prev, [section]: status }));
  }, []);

  const toggleSection = useCallback((section) => {
    setSectionOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleEnfermedadCronicaChange = useCallback((key, checked) => {
    setEnfermedadesCronicas((prev) => ({ ...prev, [key]: checked }));
    if (!checked) {
      setAniosDiagnosticoPorEnfermedad((prev) => ({ ...prev, [key]: '' }));
    }
  }, []);

  const handleAnioDiagnosticoChange = useCallback((key, value) => {
    setAniosDiagnosticoPorEnfermedad((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveGeneralSection = useCallback(async () => {
    const data = getValues();
    const payload = {
      nombre: data.nombre?.trim() || '',
      apellido_paterno: data.apellido_paterno?.trim() || '',
      apellido_materno: data.apellido_materno?.trim() || null,
      fecha_nacimiento: data.fecha_nacimiento?.trim() || '',
      curp: data.curp?.trim() ? data.curp.trim().toUpperCase() : null,
      numero_expediente: data.numero_expediente?.trim() ? data.numero_expediente.trim().toUpperCase() : null,
      numero_celular: data.numero_celular?.trim() || null,
      direccion: data.direccion?.trim() || null,
      estado: data.estado?.trim() || null,
      localidad: data.localidad?.trim() || null,
      sexo: data.sexo?.trim() || null,
      institucion_salud: data.institucion_salud?.trim() || null,
      id_modulo: data.id_modulo ?? null,
    };
    setSectionStatusValue(SECTION_KEYS.GENERAL, 'saving');
    await updatePaciente(parsedId, payload);
    generalLastSavedRef.current = JSON.stringify(PERSONAL_FIELDS.map((key) => data[key] ?? ''));
    setSectionStatusValue(SECTION_KEYS.GENERAL, 'saved');
  }, [getValues, parsedId, setSectionStatusValue]);

  const saveRedApoyoSection = useCallback(async () => {
    setSectionStatusValue(SECTION_KEYS.RED_APOYO, 'saving');
    for (const deletedId of redApoyoDeletedIds) {
      try {
        await deletePacienteRedApoyo(parsedId, deletedId);
      } catch (e) {
        console.error('Error al eliminar contacto de red de apoyo', e);
      }
    }
    for (const contacto of redApoyoList) {
      const nombreRed = (contacto.nombre_contacto ?? '').trim();
      const telRed = (contacto.numero_celular ?? '').trim();
      if (!nombreRed && !telRed) continue;
      const body = {
        nombre_contacto: nombreRed || 'Contacto',
        numero_celular: telRed || undefined,
        email: (contacto.email ?? '').trim() || undefined,
        direccion: (contacto.direccion ?? '').trim() || undefined,
        localidad: (contacto.localidad ?? '').trim() || undefined,
        parentesco: (contacto.parentesco ?? '').trim() || undefined,
      };
      if (contacto.id_contacto != null) {
        await updatePacienteRedApoyo(parsedId, contacto.id_contacto, body);
      } else {
        await createPacienteRedApoyo(parsedId, body);
      }
    }
    const refreshed = await getPacienteRedApoyo(parsedId, { limit: 50 }).catch(() => ({ data: [] }));
    const normalized = Array.isArray(refreshed?.data) && refreshed.data.length > 0
      ? refreshed.data.map((c) => ({
          id_contacto: c.id_contacto ?? c.id,
          nombre_contacto: String(c.nombre_contacto ?? '').trim(),
          numero_celular: String(c.numero_celular ?? '').trim(),
          email: String(c.email ?? '').trim(),
          direccion: String(c.direccion ?? '').trim(),
          localidad: String(c.localidad ?? '').trim(),
          parentesco: String(c.parentesco ?? '').trim(),
        }))
      : [createEmptyRedApoyoItem()];
    skipAutosaveRef.current.redApoyo = true;
    setRedApoyoList(normalized);
    setRedApoyoDeletedIds([]);
    redApoyoLastSavedRef.current = JSON.stringify(normalized);
    setSectionStatusValue(SECTION_KEYS.RED_APOYO, 'saved');
  }, [parsedId, redApoyoDeletedIds, redApoyoList, setSectionStatusValue]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipAutosaveRef.current.general) {
      skipAutosaveRef.current.general = false;
      return;
    }
    if (personalSnapshot === generalLastSavedRef.current) return;
    setSectionStatusValue(SECTION_KEYS.GENERAL, 'pending');
    const t = setTimeout(async () => {
      try {
        await saveGeneralSection();
      } catch (err) {
        setSectionStatusValue(SECTION_KEYS.GENERAL, 'error');
      }
    }, 900);
    return () => clearTimeout(t);
  }, [personalSnapshot, saveGeneralSection, setSectionStatusValue]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipAutosaveRef.current.redApoyo) {
      skipAutosaveRef.current.redApoyo = false;
      return;
    }
    if (redApoyoSnapshot === redApoyoLastSavedRef.current && redApoyoDeletedIds.length === 0) return;
    setSectionStatusValue(SECTION_KEYS.RED_APOYO, 'pending');
    const t = setTimeout(async () => {
      try {
        await saveRedApoyoSection();
      } catch (err) {
        setSectionStatusValue(SECTION_KEYS.RED_APOYO, 'error');
      }
    }, 1100);
    return () => clearTimeout(t);
  }, [redApoyoSnapshot, redApoyoDeletedIds.length, saveRedApoyoSection, setSectionStatusValue]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipAutosaveRef.current.primeraConsulta) {
      skipAutosaveRef.current.primeraConsulta = false;
      return;
    }
    if (primeraConsultaSnapshot === primeraConsultaLastSavedRef.current) return;
    setSectionStatusValue(SECTION_KEYS.PRIMERA_CONSULTA, 'pending');
    const t = setTimeout(() => {
      try {
        localStorage.setItem(`paciente:${parsedId}:primera-consulta-draft`, primeraConsultaSnapshot);
        primeraConsultaLastSavedRef.current = primeraConsultaSnapshot;
        setSectionStatusValue(SECTION_KEYS.PRIMERA_CONSULTA, 'saved');
      } catch {
        setSectionStatusValue(SECTION_KEYS.PRIMERA_CONSULTA, 'error');
      }
    }, 700);
    return () => clearTimeout(t);
  }, [parsedId, primeraConsultaSnapshot, setSectionStatusValue]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (skipAutosaveRef.current.cronicas) {
      skipAutosaveRef.current.cronicas = false;
      return;
    }
    if (cronicasSnapshot === cronicasLastSavedRef.current) return;
    setSectionStatusValue(SECTION_KEYS.CRONICAS, 'pending');
    const t = setTimeout(() => {
      try {
        localStorage.setItem(`paciente:${parsedId}:cronicas-draft`, cronicasSnapshot);
        cronicasLastSavedRef.current = cronicasSnapshot;
        setSectionStatusValue(SECTION_KEYS.CRONICAS, 'saved');
      } catch {
        setSectionStatusValue(SECTION_KEYS.CRONICAS, 'error');
      }
    }, 700);
    return () => clearTimeout(t);
  }, [parsedId, cronicasSnapshot, setSectionStatusValue]);

  async function onSubmit(data) {
    setSubmitError('');
    try {
      const payload = {
        nombre: data.nombre.trim(),
        apellido_paterno: data.apellido_paterno.trim(),
        apellido_materno: data.apellido_materno?.trim() || null,
        fecha_nacimiento: data.fecha_nacimiento.trim(),
        curp: data.curp?.trim() ? data.curp.trim().toUpperCase() : null,
        numero_expediente: data.numero_expediente?.trim() ? data.numero_expediente.trim().toUpperCase() : null,
        numero_celular: data.numero_celular?.trim() || null,
        direccion: data.direccion?.trim() || null,
        estado: data.estado?.trim() || null,
        localidad: data.localidad?.trim() || null,
        sexo: data.sexo?.trim() || null,
        institucion_salud: data.institucion_salud?.trim() || null,
        id_modulo: data.id_modulo ?? null,
      };
      await updatePaciente(parsedId, payload);

      // Red de apoyo: actualizar existentes y crear nuevos (paridad con app móvil)
      for (const contacto of redApoyoList) {
        const nombreRed = (contacto.nombre_contacto ?? '').trim();
        const telRed = (contacto.numero_celular ?? '').trim();
        if (!nombreRed && !telRed) continue;
        const body = {
          nombre_contacto: nombreRed || 'Contacto',
          numero_celular: telRed || undefined,
          email: (contacto.email ?? '').trim() || undefined,
          direccion: (contacto.direccion ?? '').trim() || undefined,
          localidad: (contacto.localidad ?? '').trim() || undefined,
          parentesco: (contacto.parentesco ?? '').trim() || undefined,
        };
        try {
          if (contacto.id_contacto != null) {
            await updatePacienteRedApoyo(parsedId, contacto.id_contacto, body);
          } else {
            await createPacienteRedApoyo(parsedId, body);
          }
        } catch (e) {
          console.error('Error al guardar contacto de red de apoyo', e);
        }
      }

      // Primera consulta + comorbilidades iniciales (opcional)
      const hasEnfermedadesCronicas = ENFERMEDADES_CRONICAS_KEYS.some((k) => enfermedadesCronicas[k]);
      if (primeraConsultaEnabled || hasEnfermedadesCronicas) {
        const doctorId = parseInt(primeraConsulta.id_doctor, 10) || undefined;
        const fecha = (primeraConsulta.fecha_cita || '').trim() || undefined;

        const comorbilidadesIniciales = buildComorbilidadesInicialesPayload(
          enfermedadesCronicas,
          comorbilidadIds,
          aniosDiagnosticoPorEnfermedad
        );

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
            comorbilidadesIniciales,
            tratamientoNoFarmaco,
            tratamientoFarmaco,
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

  const handleStaffPinReset = async () => {
    setStaffPinError('');
    setStaffPinMessage('');
    setSectionStatusValue(SECTION_KEYS.PIN, 'saving');
    if (staffPinNew !== staffPinConfirm) {
      setStaffPinError('Los PIN no coinciden');
      setSectionStatusValue(SECTION_KEYS.PIN, 'error');
      return;
    }
    setStaffPinLoading(true);
    try {
      await adminResetPatientPin({ id_paciente: parsedId, newPin: staffPinNew });
      setStaffPinMessage(
        'PIN actualizado. Informa al paciente su nuevo PIN por un canal seguro (no uses el mismo medio que contraseñas de terceros).'
      );
      setSectionStatusValue(SECTION_KEYS.PIN, 'saved');
      setStaffPinNew('');
      setStaffPinConfirm('');
    } catch (err) {
      setStaffPinError(err?.response?.data?.error || err?.message || 'No se pudo actualizar el PIN');
      setSectionStatusValue(SECTION_KEYS.PIN, 'error');
    } finally {
      setStaffPinLoading(false);
    }
  };

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
          <PacienteEditSection
            id={SECTION_KEYS.GENERAL}
            title="Datos generales"
            description="Información principal del paciente para expediente y contacto."
            status={sectionStatus[SECTION_KEYS.GENERAL]}
            open={sectionOpen[SECTION_KEYS.GENERAL]}
            onToggle={toggleSection}
          >
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
            name="fecha_nacimiento"
            control={control}
            render={({ field }) => (
              <Input label="Fecha de nacimiento" type="date" placeholder="dd/mm/aaaa" error={errors.fecha_nacimiento?.message} {...field} required />
            )}
          />
          <Controller
            name="curp"
            control={control}
            render={({ field }) => (
              <Input label="CURP" placeholder="Ej. XXXX000000HDFXXX00" error={errors.curp?.message} {...field} />
            )}
          />
          <Controller
            name="numero_expediente"
            control={control}
            render={({ field }) => (
              <Input label="Número de expediente" error={errors.numero_expediente?.message} {...field} />
            )}
          />
          <Controller
            name="numero_celular"
            control={control}
            render={({ field }) => (
              <Input label="Teléfono / Celular" type="tel" placeholder="Ej. 55 1234 5678" error={errors.numero_celular?.message} {...field} />
            )}
          />
          <Controller
            name="direccion"
            control={control}
            render={({ field }) => (
              <Input label="Dirección" placeholder="Ej. Calle, número, colonia, CP" error={errors.direccion?.message} {...field} />
            )}
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
                  ...institucionesSalud.map((inst) => ({
                    value: inst.nombre,
                    label: sanitizeForDisplay(inst.nombre) || inst.nombre,
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
          </PacienteEditSection>
          <PacienteEditSection
            id={SECTION_KEYS.RED_APOYO}
            title="Red de apoyo"
            description="Contactos de apoyo del paciente."
            status={sectionStatus[SECTION_KEYS.RED_APOYO]}
            open={sectionOpen[SECTION_KEYS.RED_APOYO]}
            onToggle={toggleSection}
          >
            <RedApoyoFormFields
              list={redApoyoList}
              onAdd={() => setRedApoyoList((prev) => [...prev, createEmptyRedApoyoItem()])}
              onRemove={(index) =>
                setRedApoyoList((prev) => {
                  const current = prev[index];
                  if (current?.id_contacto != null) {
                    setRedApoyoDeletedIds((ids) => [...ids, current.id_contacto]);
                  }
                  return prev.length <= 1 ? prev : prev.filter((_, i) => i !== index);
                })
              }
              onUpdate={(index, field, value) =>
                setRedApoyoList((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
              }
              disabled={isSubmitting}
            />
          </PacienteEditSection>

          <PacienteEditSection
            id={SECTION_KEYS.PRIMERA_CONSULTA}
            title="Primera consulta"
            description="Captura rápida opcional de primera consulta y signos iniciales."
            status={sectionStatus[SECTION_KEYS.PRIMERA_CONSULTA]}
            open={sectionOpen[SECTION_KEYS.PRIMERA_CONSULTA]}
            onToggle={toggleSection}
          >
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
                      label: sanitizeForDisplay(formatNombreCompleto(d)) || '—',
                    })),
                  ]}
                />
              </div>
              <Input
                label="Fecha y hora de la consulta"
                type="datetime-local"
                placeholder="dd/mm/aaaa hh:mm"
                value={primeraConsulta.fecha_cita}
                onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, fecha_cita: e.target.value }))}
              />
              <Input
                label="Motivo de la consulta"
                placeholder="Ej. Control de diabetes, revisión"
                value={primeraConsulta.motivo}
                onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, motivo: e.target.value }))}
              />
              <Input
                label="Diagnóstico inicial (opcional)"
                placeholder="Ej. Diabetes tipo 2, Hipertensión"
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
                  placeholder="Ej. 70"
                  value={primeraConsulta.peso_kg}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, peso_kg: e.target.value }))}
                />
                <Input
                  label="Talla (m)"
                  type="number"
                  step="0.01"
                  placeholder="Ej. 1.65"
                  value={primeraConsulta.talla_m}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, talla_m: e.target.value }))}
                />
                <Input
                  label="PA sistólica"
                  type="number"
                  placeholder="Ej. 120"
                  value={primeraConsulta.presion_sistolica}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, presion_sistolica: e.target.value }))}
                />
                <Input
                  label="PA diastólica"
                  type="number"
                  placeholder="Ej. 80"
                  value={primeraConsulta.presion_diastolica}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, presion_diastolica: e.target.value }))}
                />
                <Input
                  label="Glucosa (mg/dL)"
                  type="number"
                  step="0.1"
                  placeholder="Ej. 100"
                  value={primeraConsulta.glucosa_mg_dl}
                  onChange={(e) => setPrimeraConsulta((prev) => ({ ...prev, glucosa_mg_dl: e.target.value }))}
                />
              </div>
            </div>
          )}
          </PacienteEditSection>

          <PacienteEditSection
            id={SECTION_KEYS.CRONICAS}
            title="Enfermedades crónicas"
            description="Selección rápida de crónicas y tratamiento."
            status={sectionStatus[SECTION_KEYS.CRONICAS]}
            open={sectionOpen[SECTION_KEYS.CRONICAS]}
            onToggle={toggleSection}
          >
            <EnfermedadesCronicasFormBlock
              introText="Marca las enfermedades crónicas principales para registrar comorbilidades adicionales de este paciente. Puedes indicar un año de diagnóstico distinto para cada una."
              enfermedadesCronicas={enfermedadesCronicas}
              onEnfermedadChange={handleEnfermedadCronicaChange}
              aniosDiagnosticoPorEnfermedad={aniosDiagnosticoPorEnfermedad}
              onAnioDiagnosticoChange={handleAnioDiagnosticoChange}
              tratamientoNoFarmaco={tratamientoNoFarmaco}
              tratamientoFarmaco={tratamientoFarmaco}
              onTratamientoNoFarmacoChange={setTratamientoNoFarmaco}
              onTratamientoFarmacoChange={setTratamientoFarmaco}
            />
          </PacienteEditSection>

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

      {isStaff && (
        <PacienteEditSection
          id={SECTION_KEYS.PIN}
          title="PIN de acceso"
          description="Recuperación o reasignación de PIN para app móvil del paciente."
          status={sectionStatus[SECTION_KEYS.PIN]}
          open={sectionOpen[SECTION_KEYS.PIN]}
          onToggle={toggleSection}
        >
          {staffPinError ? (
            <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>{staffPinError}</p>
          ) : null}
          {staffPinMessage ? (
            <p style={{ margin: '0 0 0.75rem', color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>
              {staffPinMessage}
            </p>
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 280 }}>
            <Input
              label="Nuevo PIN (4 dígitos)"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={4}
              value={staffPinNew}
              onChange={(e) => setStaffPinNew(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            <Input
              label="Confirmar PIN"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={4}
              value={staffPinConfirm}
              onChange={(e) => setStaffPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
            <Button type="button" variant="primary" disabled={staffPinLoading} onClick={handleStaffPinReset}>
              {staffPinLoading ? 'Guardando…' : 'Guardar nuevo PIN'}
            </Button>
          </div>
        </PacienteEditSection>
      )}
    </div>
  );
}
