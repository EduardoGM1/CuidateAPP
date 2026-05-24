import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { getPacienteById, getPacienteDoctores, assignDoctorToPaciente, unassignDoctorFromPaciente } from '../../api/pacientes';
import { getDoctores } from '../../api/doctores';
import { createCita, getCitaById } from '../../api/citas';
import { getMedicamentos } from '../../api/medicamentos';
import { useAuthStore } from '../../stores/authStore';
import { getExpedienteHTML, getFormaData, getFormaMesesDisponibles, openNotasMedicasPDF } from '../../api/reportes';
import {
  downloadFormaExcel,
  EXCEL_FORMATO_REGISTRO_MENSUAL_FILE_PREFIX,
  EXCEL_FORMATO_REGISTRO_MENSUAL_LABEL,
} from '../../utils/formaExcelUtils';
import {
  getPacienteCitas,
  getPacienteSignosVitales,
  getPacienteDiagnosticos,
  getPacienteMedicamentos,
  getPacienteTomasMedicamento,
  getPacienteRedApoyo,
  getPacienteEsquemaVacunacion,
  getPacienteComorbilidades,
  getPacienteDeteccionesComplicaciones,
  getPacienteSesionesEducativas,
  getPacienteSaludBucal,
  getPacienteDeteccionesTuberculosis,
  getPacienteResumenMedico,
  createSignosVitales as apiCreateSignosVitales,
  updateSignosVitales as apiUpdateSignosVitales,
  deleteSignosVitales as apiDeleteSignosVitales,
  createDiagnostico as apiCreateDiagnostico,
  updateDiagnostico as apiUpdateDiagnostico,
  deleteDiagnostico as apiDeleteDiagnostico,
  createPacienteRedApoyo as apiCreateRedApoyo,
  updatePacienteRedApoyo as apiUpdateRedApoyo,
  deletePacienteRedApoyo as apiDeleteRedApoyo,
  createPacienteEsquemaVacunacion as apiCreateEsquemaVacunacion,
  updatePacienteEsquemaVacunacion as apiUpdateEsquemaVacunacion,
  deletePacienteEsquemaVacunacion as apiDeleteEsquemaVacunacion,
  addPacienteComorbilidad as apiAddComorbilidad,
  updatePacienteComorbilidad as apiUpdateComorbilidad,
  deletePacienteComorbilidad as apiDeleteComorbilidad,
  createSesionEducativa as apiCreateSesionEducativa,
  updateSesionEducativa as apiUpdateSesionEducativa,
  deleteSesionEducativa as apiDeleteSesionEducativa,
  createSaludBucal as apiCreateSaludBucal,
  updateSaludBucal as apiUpdateSaludBucal,
  deleteSaludBucal as apiDeleteSaludBucal,
  createDeteccionTuberculosis as apiCreateDeteccionTb,
  updateDeteccionTuberculosis as apiUpdateDeteccionTb,
  deleteDeteccionTuberculosis as apiDeleteDeteccionTb,
  createPacientePlanMedicacion as apiCreatePlanMedicacion,
  updatePacientePlanMedicacion as apiUpdatePlanMedicacion,
  deletePacientePlanMedicacion as apiDeletePlanMedicacion,
  createDeteccionComplicacion as apiCreateDeteccionComplicacion,
  updateDeteccionComplicacion as apiUpdateDeteccionComplicacion,
  deleteDeteccionComplicacion as apiDeleteDeteccionComplicacion,
} from '../../api/pacienteMedicalData';
import { PageHeader, DataCard } from '../../components/shared';
import { LoadingSpinner, Button, Card, Badge, EmptyState, Input, Select, TextArea, Modal } from '../../components/ui';
import RedApoyoCard from '../../components/pacientes/RedApoyoCard';
import MedicalSummaryCard from '../../components/pacientes/MedicalSummaryCard';
import MonitoreoContinuoSummary from '../../components/pacientes/MonitoreoContinuoSummary';
import ProximaCitaCard from '../../components/pacientes/ProximaCitaCard';
import SectionCard from '../../components/pacientes/SectionCard';
import PatientSectionModal from '../../components/pacientes/PatientSectionModal';
import DetalleCitaModal from '../../components/pacientes/DetalleCitaModal';
import CompletarCitaModal from '../../components/citas/CompletarCitaModal';
import SignosVitalesForm, { INITIAL_SIGNOS_VITALES, signosVitalesToPayload } from '../../components/signos/SignosVitalesForm';
import DetalleSignoVitalModal from '../../components/pacientes/DetalleSignoVitalModal';
import ComparativaEvolucionSignos from '../../components/pacientes/ComparativaEvolucionSignos';
import { PATIENT_DETAIL_SECTIONS } from '../../constants/patientDetailSections';
import {
  LUGARES_APLICACION_VACUNA_OPTIONS,
  LUGAR_APLICACION_OTRO,
  parseLugarAplicacionVacunaForm,
  buildLugarAplicacionPayload,
} from '../../constants/lugaresAplicacionVacuna';
import { getVacunas } from '../../api/vacunas';
import { getComorbilidades } from '../../api/comorbilidades';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';
import {
  formatDate,
  formatDateTime,
  formatDateTimeAmPm,
  parseApiDate,
  formatNombreCompleto,
  formatHorarioPrescriptoMedicamento,
  formatHoraAdministracionRegistrada,
} from '../../utils/format';
import { fechaCitaDatetimeLocalToApi } from '../../utils/fechaCita';
import { openHTMLInNewWindow } from '../../utils/reportUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import TimeRangeFilter, {
  filterSignosByTimeRange,
  FILTROS_TIEMPO,
  FILTRO_LABELS,
  getDateRangeForFilter,
  formatYmdLocal,
} from '../../components/charts/TimeRangeFilter';
import { aggregateSignosByMonth } from '../../components/charts/monthlyChartUtils';
import { useOnboardingPageReady } from '../../onboarding/useOnboardingPageReady';
import { createJoyrideStyles, JOYRIDE_LOCALE } from '../../onboarding/joyrideTheme';
import { getPatientModalSectionSteps } from '../../onboarding/patientDetailSectionTourSteps';
import { filterExistingTargets } from '../../onboarding/tourSteps';
import {
  isShellComplete,
  isSectionComplete,
  isPatientModalSectionComplete,
  markPatientModalSectionComplete,
} from '../../onboarding/storage';

const patientModalJoyrideStyles = createJoyrideStyles(10100);

const ESTADO_CITA = {
  pendiente: 'Pendiente',
  atendida: 'Atendida',
  no_asistida: 'No asistida',
  reprogramada: 'Reprogramada',
  cancelada: 'Cancelada',
};

const ANIO_DIAGNOSTICO_FIELD = 'año_diagnostico';

const COMORBILIDAD_FORM_INITIAL = {
  id_comorbilidad: '',
  fecha_deteccion: '',
  observaciones: '',
  anos_padecimiento: '',
  es_diagnostico_basal: false,
  [ANIO_DIAGNOSTICO_FIELD]: '',
  es_agregado_posterior: false,
  recibe_tratamiento_no_farmacologico: false,
  recibe_tratamiento_farmacologico: false,
};

const DETECCION_FORM_INITIAL = {
  tipo_complicacion: '',
  fecha_deteccion: '',
  fecha_diagnostico: '',
  observaciones: '',
  exploracion_pies: false,
  exploracion_fondo_ojo: false,
  realiza_auto_monitoreo: false,
  auto_monitoreo_glucosa: false,
  auto_monitoreo_presion: false,
  microalbuminuria_realizada: false,
  microalbuminuria_resultado: '',
  fue_referido: false,
  referencia_observaciones: '',
};

export default function PacienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const parsedId = parsePositiveInt(id, 0);
  const queryClient = useQueryClient();

  const [paciente, setPaciente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalSection, setModalSection] = useState(null);
  const [expedienteLoading, setExpedienteLoading] = useState(false);
  const [expedienteError, setExpedienteError] = useState(null);
  const [formaModalOpen, setFormaModalOpen] = useState(false);
  const [formaLoading, setFormaLoading] = useState(false);
  const [formaError, setFormaError] = useState(null);
  const [periodosDisponibles, setPeriodosDisponibles] = useState([]);
  const [periodosLoading, setPeriodosLoading] = useState(false);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('');
  const [notasMedicasLoading, setNotasMedicasLoading] = useState(false);

  const [citas, setCitas] = useState({ data: [], total: 0 });
  const [citasLoading, setCitasLoading] = useState(false);
  const [signos, setSignos] = useState({ data: [], total: 0 });
  const [signosLoading, setSignosLoading] = useState(false);
  const [chartSignos, setChartSignos] = useState({ data: [], total: 0 });
  const [chartSignosLoading, setChartSignosLoading] = useState(false);
  const [chartSignosError, setChartSignosError] = useState(null);
  const chartSignosAbortRef = useRef(null);
  const [diagnosticos, setDiagnosticos] = useState({ data: [], total: 0 });
  const [diagnosticosLoading, setDiagnosticosLoading] = useState(false);
  const [medicamentos, setMedicamentos] = useState({ data: [], total: 0 });
  const [medicamentosLoading, setMedicamentosLoading] = useState(false);
  const [tomasMedicamento, setTomasMedicamento] = useState({ data: [], total: 0 });
  const [tomasMedicamentoLoading, setTomasMedicamentoLoading] = useState(false);
  const [tomasMedicamentoRango, setTomasMedicamentoRango] = useState('30'); // días: 7, 30, 90
  const [resumenMedico, setResumenMedico] = useState(null);
  const [resumenMedicoLoading, setResumenMedicoLoading] = useState(false);
  const [redApoyo, setRedApoyo] = useState({ data: [], total: 0 });
  const [redApoyoLoading, setRedApoyoLoading] = useState(false);
  const [vacunacion, setVacunacion] = useState({ data: [], total: 0 });
  const [vacunacionLoading, setVacunacionLoading] = useState(false);
  const [comorbilidades, setComorbilidades] = useState({ data: [], total: 0 });
  const [comorbilidadesLoading, setComorbilidadesLoading] = useState(false);
  const [deteccionesComplicaciones, setDeteccionesComplicaciones] = useState({ data: [], total: 0 });
  const [deteccionesComplicacionesLoading, setDeteccionesComplicacionesLoading] = useState(false);
  const [sesionesEducativas, setSesionesEducativas] = useState({ data: [], total: 0 });
  const [sesionesEducativasLoading, setSesionesEducativasLoading] = useState(false);
  const [saludBucal, setSaludBucal] = useState({ data: [], total: 0 });
  const [saludBucalLoading, setSaludBucalLoading] = useState(false);
  const [deteccionesTuberculosis, setDeteccionesTuberculosis] = useState({ data: [], total: 0 });
  const [deteccionesTuberculosisLoading, setDeteccionesTuberculosisLoading] = useState(false);
  const [vacunasCatalog, setVacunasCatalog] = useState([]);
  const [comorbilidadesCatalog, setComorbilidadesCatalog] = useState([]);
  const [vacunaForm, setVacunaForm] = useState({
    id_vacuna: '',
    fecha_aplicacion: '',
    lote: '',
    lugar_aplicacion: '',
    lugar_aplicacion_otro: '',
    observaciones: '',
  });
  const [vacunaSubmitting, setVacunaSubmitting] = useState(false);
  const [vacunaError, setVacunaError] = useState('');
  const [comorbilidadForm, setComorbilidadForm] = useState(COMORBILIDAD_FORM_INITIAL);
  const [comorbilidadSubmitting, setComorbilidadSubmitting] = useState(false);
  const [comorbilidadError, setComorbilidadError] = useState('');
  const [sesionForm, setSesionForm] = useState({
    fecha_sesion: '',
    tipo_sesion: '',
    asistio: false,
    numero_intervenciones: '1',
    id_cita: '',
    observaciones: '',
  });
  const [sesionModalOpen, setSesionModalOpen] = useState(false);
  const [sesionCitasOpciones, setSesionCitasOpciones] = useState([]);
  const [sesionCitasLoading, setSesionCitasLoading] = useState(false);
  const [editingSesion, setEditingSesion] = useState(null);
  const [sesionSubmitting, setSesionSubmitting] = useState(false);
  const [sesionError, setSesionError] = useState('');
  const [saludForm, setSaludForm] = useState({
    fecha_registro: '',
    presenta_enfermedades_odontologicas: false,
    recibio_tratamiento_odontologico: false,
    observaciones: '',
  });
  const [saludSubmitting, setSaludSubmitting] = useState(false);
  const [saludError, setSaludError] = useState('');
  const [tbForm, setTbForm] = useState({
    fecha_deteccion: '',
    aplicacion_encuesta: false,
    baciloscopia_realizada: false,
    baciloscopia_resultado: '',
    ingreso_tratamiento: false,
    observaciones: '',
  });
  const [tbSubmitting, setTbSubmitting] = useState(false);
  const [tbError, setTbError] = useState('');
  const [doctoresAsignados, setDoctoresAsignados] = useState([]);
  const [doctoresAsignadosLoading, setDoctoresAsignadosLoading] = useState(false);
  const [listaDoctores, setListaDoctores] = useState([]);
  const [assignDoctorId, setAssignDoctorId] = useState('');
  const [assignError, setAssignError] = useState('');
  const [assigning, setAssigning] = useState(false);
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const isDoctor = useAuthStore((s) => s.isDoctor);
  const canEditMedical = isDoctor() || isAdmin();

  useOnboardingPageReady(parsedId > 0 && !loading && !!paciente && !error);

  const [patientModalTourRun, setPatientModalTourRun] = useState(false);
  const [patientModalTourSteps, setPatientModalTourSteps] = useState([]);
  const patientModalTourSectionRef = useRef(null);

  const closePatientSectionModal = useCallback(() => {
    setPatientModalTourRun(false);
    setPatientModalTourSteps([]);
    patientModalTourSectionRef.current = null;
    setModalSection(null);
  }, []);

  useEffect(() => {
    if (!modalSection) {
      setPatientModalTourRun(false);
      setPatientModalTourSteps([]);
      patientModalTourSectionRef.current = null;
      return undefined;
    }

    if (!isShellComplete() || !isSectionComplete('pacientes-detalle')) {
      return undefined;
    }
    if (isPatientModalSectionComplete(modalSection)) {
      return undefined;
    }

    const sectionId = modalSection;
    patientModalTourSectionRef.current = sectionId;

    const timer = window.setTimeout(() => {
      if (patientModalTourSectionRef.current !== sectionId) return;
      const raw = getPatientModalSectionSteps(sectionId);
      const filtered = filterExistingTargets(raw);
      if (filtered.length === 0) {
        markPatientModalSectionComplete(sectionId);
        return;
      }
      if (patientModalTourSectionRef.current !== sectionId) return;
      setPatientModalTourSteps(filtered);
      setPatientModalTourRun(true);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [modalSection]);

  const handlePatientModalTourCallback = useCallback((data) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      const sid = patientModalTourSectionRef.current;
      if (sid) markPatientModalSectionComplete(sid);
      setPatientModalTourRun(false);
      setPatientModalTourSteps([]);
      patientModalTourSectionRef.current = null;
    }
  }, []);

  const [signosForm, setSignosForm] = useState(INITIAL_SIGNOS_VITALES);
  const [signosSubmitError, setSignosSubmitError] = useState('');
  const [signosSubmitting, setSignosSubmitting] = useState(false);
  const [editingSignoId, setEditingSignoId] = useState(null);
  const [newDiagnosticoDescripcion, setNewDiagnosticoDescripcion] = useState('');
  const [newDiagnosticoCitaId, setNewDiagnosticoCitaId] = useState('');
  const [diagnosticoSubmitError, setDiagnosticoSubmitError] = useState('');
  const [diagnosticoSubmitting, setDiagnosticoSubmitting] = useState(false);
  const [editingDiagnostico, setEditingDiagnostico] = useState(null);
  const [detalleDiagnosticoSeleccionado, setDetalleDiagnosticoSeleccionado] = useState(null);
  const [signosModalOpen, setSignosModalOpen] = useState(false);
  const [signosCitaId, setSignosCitaId] = useState(null);
  const [diagnosticoModalOpen, setDiagnosticoModalOpen] = useState(false);
  const [vacunaModalOpen, setVacunaModalOpen] = useState(false);
  const [editingVacuna, setEditingVacuna] = useState(null);
  const [comorbilidadModalOpen, setComorbilidadModalOpen] = useState(false);
  const [editingComorbilidad, setEditingComorbilidad] = useState(null);
  const [editingDeteccion, setEditingDeteccion] = useState(null);
  const [deteccionCreating, setDeteccionCreating] = useState(false);
  const [deteccionEditForm, setDeteccionEditForm] = useState(DETECCION_FORM_INITIAL);
  const [saludModalOpen, setSaludModalOpen] = useState(false);
  const [editingSalud, setEditingSalud] = useState(null);
  const [tbModalOpen, setTbModalOpen] = useState(false);
  const [editingTb, setEditingTb] = useState(null);
  const [assignDoctorModalOpen, setAssignDoctorModalOpen] = useState(false);

  const [citaModalOpen, setCitaModalOpen] = useState(false);
  const [citaForm, setCitaForm] = useState({ id_doctor: '', fecha_cita: '', motivo: '' });
  const [citaDoctores, setCitaDoctores] = useState([]);
  const [citaSubmitting, setCitaSubmitting] = useState(false);
  const [citaError, setCitaError] = useState('');

  const [medicacionModalOpen, setMedicacionModalOpen] = useState(false);
  const [planDetalleSeleccionado, setPlanDetalleSeleccionado] = useState(null);
  const [editingPlanMedicacion, setEditingPlanMedicacion] = useState(null);
  const [medicacionForm, setMedicacionForm] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '',
    medicamentos: [{ id_medicamento: '', dosis: '', frecuencia: '', horarios: [], via_administracion: '', observaciones: '' }],
  });
  const [medicamentosCatalog, setMedicamentosCatalog] = useState([]);
  const [medicacionSubmitting, setMedicacionSubmitting] = useState(false);
  const [medicacionError, setMedicacionError] = useState('');

  const [showAllSignosOpen, setShowAllSignosOpen] = useState(false);
  const [showAllCitasOpen, setShowAllCitasOpen] = useState(false);
  const [showAllComorbilidadesOpen, setShowAllComorbilidadesOpen] = useState(false);
  const [showAllDoctoresOpen, setShowAllDoctoresOpen] = useState(false);
  const [allSignosData, setAllSignosData] = useState([]);
  const [allSignosLoading, setAllSignosLoading] = useState(false);
  const [allCitasData, setAllCitasData] = useState([]);
  const [allCitasLoading, setAllCitasLoading] = useState(false);
  const [detalleCitaId, setDetalleCitaId] = useState(null);
  const [citaDetalle, setCitaDetalle] = useState(null);
  const [citaDetalleLoading, setCitaDetalleLoading] = useState(false);
  const [wizardCitaId, setWizardCitaId] = useState(null);
  const [wizardCita, setWizardCita] = useState(null);
  const [wizardCitaModalOpen, setWizardCitaModalOpen] = useState(false);
  const [signoDetalleSeleccionado, setSignoDetalleSeleccionado] = useState(null);
  const [allComorbilidadesData, setAllComorbilidadesData] = useState([]);
  const [allComorbilidadesLoading, setAllComorbilidadesLoading] = useState(false);

  const loadResumenMedico = useCallback(async () => {
    if (parsedId === 0) return;
    setResumenMedicoLoading(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['pacienteResumenMedico', parsedId],
        queryFn: () => getPacienteResumenMedico(parsedId),
      });
      setResumenMedico(data);
    } catch (e) {
      setResumenMedico(null);
    } finally {
      setResumenMedicoLoading(false);
    }
  }, [parsedId, queryClient]);

  const loadPaciente = useCallback(async () => {
    if (parsedId === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ['paciente', parsedId],
        queryFn: () => getPacienteById(parsedId),
      });
      setPaciente(data);
      loadResumenMedico();
    } catch (err) {
      setError(
        err?.response?.status === 404
          ? 'Paciente no encontrado'
          : err?.response?.data?.error || err?.message || 'Error al cargar el paciente'
      );
    } finally {
      setLoading(false);
    }
  }, [parsedId, queryClient, loadResumenMedico]);

  // Catálogos para formularios de vacunación y comorbilidades
  useEffect(() => {
    getVacunas()
      .then((list) => setVacunasCatalog(Array.isArray(list) ? list : []))
      .catch(() => setVacunasCatalog([]));
    getComorbilidades()
      .then((list) => setComorbilidadesCatalog(Array.isArray(list) ? list : []))
      .catch(() => setComorbilidadesCatalog([]));
  }, []);

  useEffect(() => {
    if (citaModalOpen && canEditMedical) {
      getDoctores({ estado: 'activos', limit: 200 })
        .then((l) => setCitaDoctores(Array.isArray(l) ? l : []))
        .catch(() => setCitaDoctores([]));
    }
  }, [citaModalOpen, canEditMedical]);

  useEffect(() => {
    if (medicacionModalOpen) {
      getMedicamentos()
        .then((list) => setMedicamentosCatalog(Array.isArray(list) ? list : []))
        .catch(() => setMedicamentosCatalog([]));
    }
  }, [medicacionModalOpen]);

  useEffect(() => {
    if (showAllSignosOpen && parsedId > 0) {
      setAllSignosLoading(true);
      getPacienteSignosVitales(parsedId, { limit: 300 })
        .then((res) => setAllSignosData(res?.data ?? []))
        .catch(() => setAllSignosData([]))
        .finally(() => setAllSignosLoading(false));
    }
  }, [showAllSignosOpen, parsedId]);

  useEffect(() => {
    if (showAllCitasOpen && parsedId > 0) {
      setAllCitasLoading(true);
      getPacienteCitas(parsedId, { limit: 300, offset: 0 })
        .then((res) => setAllCitasData(res?.data ?? res?.citas ?? []))
        .catch(() => setAllCitasData([]))
        .finally(() => setAllCitasLoading(false));
    }
  }, [showAllCitasOpen, parsedId]);

  // Cargar citas del paciente al abrir el modal de sesión educativa (para "Vincular a cita")
  useEffect(() => {
    if (sesionModalOpen && parsedId > 0) {
      setSesionCitasLoading(true);
      getPacienteCitas(parsedId, { limit: 150, offset: 0 })
        .then((res) => setSesionCitasOpciones(Array.isArray(res?.data) ? res.data : []))
        .catch(() => setSesionCitasOpciones([]))
        .finally(() => setSesionCitasLoading(false));
    }
  }, [sesionModalOpen, parsedId]);

  const openDetalleCita = useCallback((idCita) => {
    const id = idCita ?? null;
    if (!id) return;
    setDetalleCitaId(id);
    setCitaDetalle(null);
    setCitaDetalleLoading(true);
    getCitaById(id)
      .then((data) => setCitaDetalle(data))
      .catch(() => setCitaDetalle(null))
      .finally(() => setCitaDetalleLoading(false));
  }, []);

  const closeDetalleCita = useCallback(() => {
    setDetalleCitaId(null);
    setCitaDetalle(null);
  }, []);

  const openDetalleSigno = useCallback((signo) => {
    setSignoDetalleSeleccionado(signo || null);
  }, []);
  const closeDetalleSigno = useCallback(() => {
    setSignoDetalleSeleccionado(null);
  }, []);

  const openSignosFormForEdit = useCallback((signo) => {
    if (!signo) return;
    setSignosForm({
      ...INITIAL_SIGNOS_VITALES,
      peso_kg: signo.peso_kg != null ? String(signo.peso_kg) : '',
      talla_m: signo.talla_m != null ? String(signo.talla_m) : '',
      medida_cintura_cm: signo.medida_cintura_cm != null ? String(signo.medida_cintura_cm) : '',
      presion_sistolica: signo.presion_sistolica != null ? String(signo.presion_sistolica) : '',
      presion_diastolica: signo.presion_diastolica != null ? String(signo.presion_diastolica) : '',
      glucosa_mg_dl: signo.glucosa_mg_dl != null ? String(signo.glucosa_mg_dl) : '',
      colesterol_mg_dl: signo.colesterol_mg_dl != null ? String(signo.colesterol_mg_dl) : '',
      colesterol_ldl: signo.colesterol_ldl != null ? String(signo.colesterol_ldl) : '',
      colesterol_hdl: signo.colesterol_hdl != null ? String(signo.colesterol_hdl) : '',
      trigliceridos_mg_dl: signo.trigliceridos_mg_dl != null ? String(signo.trigliceridos_mg_dl) : '',
      hba1c_porcentaje: signo.hba1c_porcentaje != null ? String(signo.hba1c_porcentaje) : '',
      edad_paciente_en_medicion: signo.edad_paciente_en_medicion != null ? String(signo.edad_paciente_en_medicion) : '',
      observaciones: signo.observaciones != null ? String(signo.observaciones) : '',
    });
    setEditingSignoId(signo.id_signo ?? signo.id_signo_vital ?? signo.id ?? null);
    setSignosSubmitError('');
    closeDetalleSigno();
    setSignosModalOpen(true);
  }, [closeDetalleSigno]);

  useEffect(() => {
    if (showAllComorbilidadesOpen && parsedId > 0) {
      setAllComorbilidadesLoading(true);
      getPacienteComorbilidades(parsedId)
        .then((res) => setAllComorbilidadesData(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])))
        .catch(() => setAllComorbilidadesData([]))
        .finally(() => setAllComorbilidadesLoading(false));
    }
  }, [showAllComorbilidadesOpen, parsedId]);

  useEffect(() => {
    loadPaciente();
  }, [loadPaciente]);

  const loadCitas = useCallback(async () => {
    if (parsedId === 0) return;
    setCitasLoading(true);
    try {
      const res = await queryClient.fetchQuery({
        queryKey: ['pacienteCitas', parsedId, { limit: 10, offset: 0 }],
        queryFn: () => getPacienteCitas(parsedId, { limit: 10, offset: 0 }),
      });
      setCitas(res);
    } catch {
      setCitas({ data: [], total: 0 });
    } finally {
      setCitasLoading(false);
    }
  }, [parsedId, queryClient]);

  useEffect(() => {
    if (parsedId > 0) loadCitas();
  }, [parsedId, loadCitas]);

  const loadSignos = useCallback(async () => {
    if (parsedId === 0) return;
    setSignosLoading(true);
    try {
      const res = await getPacienteSignosVitales(parsedId, { limit: 15, sort: 'DESC' });
      setSignos(res);
    } catch {
      setSignos({ data: [], total: 0 });
    } finally {
      setSignosLoading(false);
    }
  }, [parsedId]);

  /** Signos vitales para gráficos; por defecto últimos 3 meses (más rápido). Completo pagina todo el historial. */
  const loadChartSignos = useCallback(async (filtro = FILTROS_TIEMPO.ULTIMOS_3_MESES) => {
    if (parsedId === 0) return;
    chartSignosAbortRef.current?.abort();
    const ac = new AbortController();
    chartSignosAbortRef.current = ac;
    setChartSignosLoading(true);
    setChartSignosError(null);
    try {
      const { fechaInicio, fechaFin } = getDateRangeForFilter(filtro);
      const esCompleto = filtro === FILTROS_TIEMPO.COMPLETO;
      const baseParams = {
        sort: esCompleto ? 'ASC' : 'DESC',
        lite: true,
        timeout: esCompleto ? 120000 : 60000,
        signal: ac.signal,
      };
      if (fechaInicio) baseParams.fechaInicio = formatYmdLocal(fechaInicio);
      if (fechaFin) baseParams.fechaFin = formatYmdLocal(fechaFin);

      const pageSize = esCompleto ? 200 : 500;
      let offset = 0;
      let total = 0;
      const all = [];
      const maxPages = esCompleto ? 50 : 4;
      let pages = 0;
      do {
        if (ac.signal.aborted) return;
        const page = await getPacienteSignosVitales(parsedId, {
          ...baseParams,
          limit: pageSize,
          offset,
        });
        const rows = page?.data ?? [];
        total = page?.total ?? rows.length;
        all.push(...rows);
        offset += pageSize;
        pages += 1;
        if (rows.length === 0) break;
      } while (all.length < total && pages < maxPages);
      if (ac.signal.aborted) return;
      setChartSignos({ data: all, total: total || all.length });
    } catch (err) {
      if (ac.signal.aborted || err?.code === 'ERR_CANCELED') return;
      const msg =
        err?.code === 'ECONNABORTED'
          ? 'La carga tardó demasiado. Intenta de nuevo.'
          : err?.response?.data?.error || err?.message || 'No se pudieron cargar los signos vitales.';
      setChartSignosError(msg);
      setChartSignos({ data: [], total: 0 });
    } finally {
      if (!ac.signal.aborted) setChartSignosLoading(false);
    }
  }, [parsedId]);

  const loadDiagnosticos = useCallback(async () => {
    if (parsedId === 0) return;
    setDiagnosticosLoading(true);
    try {
      const res = await getPacienteDiagnosticos(parsedId, { limit: 10 });
      setDiagnosticos(res);
    } catch {
      setDiagnosticos({ data: [], total: 0 });
    } finally {
      setDiagnosticosLoading(false);
    }
  }, [parsedId]);

  const loadMedicamentos = useCallback(async () => {
    if (parsedId === 0) return;
    setMedicamentosLoading(true);
    try {
      const res = await getPacienteMedicamentos(parsedId, { limit: 10 });
      setMedicamentos(res);
    } catch {
      setMedicamentos({ data: [], total: 0 });
    } finally {
      setMedicamentosLoading(false);
    }
  }, [parsedId]);

  const loadTomasMedicamento = useCallback(async (dias = null) => {
    if (parsedId === 0) return;
    const rango = dias ?? tomasMedicamentoRango;
    setTomasMedicamentoLoading(true);
    try {
      const fin = new Date();
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - Number(rango));
      const res = await getPacienteTomasMedicamento(parsedId, {
        fechaInicio: inicio.toISOString().split('T')[0],
        fechaFin: fin.toISOString().split('T')[0],
      });
      setTomasMedicamento(res);
    } catch {
      setTomasMedicamento({ data: [], total: 0 });
    } finally {
      setTomasMedicamentoLoading(false);
    }
  }, [parsedId, tomasMedicamentoRango]);

  const loadRedApoyo = useCallback(async () => {
    if (parsedId === 0) return;
    setRedApoyoLoading(true);
    try {
      const res = await getPacienteRedApoyo(parsedId, { limit: 10 });
      setRedApoyo(res);
    } catch {
      setRedApoyo({ data: [], total: 0 });
    } finally {
      setRedApoyoLoading(false);
    }
  }, [parsedId]);

  const loadVacunacion = useCallback(async () => {
    if (parsedId === 0) return;
    setVacunacionLoading(true);
    try {
      const res = await getPacienteEsquemaVacunacion(parsedId, { limit: 10 });
      setVacunacion(res);
    } catch {
      setVacunacion({ data: [], total: 0 });
    } finally {
      setVacunacionLoading(false);
    }
  }, [parsedId]);

  const loadComorbilidades = useCallback(async () => {
    if (parsedId === 0) return;
    setComorbilidadesLoading(true);
    try {
      const res = await getPacienteComorbilidades(parsedId);
      setComorbilidades(res);
    } catch {
      setComorbilidades({ data: [], total: 0 });
    } finally {
      setComorbilidadesLoading(false);
    }
  }, [parsedId]);

  const loadDeteccionesComplicaciones = useCallback(async () => {
    if (parsedId === 0) return;
    setDeteccionesComplicacionesLoading(true);
    try {
      const res = await getPacienteDeteccionesComplicaciones(parsedId, { limit: 50 });
      setDeteccionesComplicaciones(res);
    } catch {
      setDeteccionesComplicaciones({ data: [], total: 0 });
    } finally {
      setDeteccionesComplicacionesLoading(false);
    }
  }, [parsedId]);

  const loadSesionesEducativas = useCallback(async () => {
    if (parsedId === 0) return;
    setSesionesEducativasLoading(true);
    try {
      const res = await getPacienteSesionesEducativas(parsedId, { limit: 50 });
      setSesionesEducativas(res);
    } catch {
      setSesionesEducativas({ data: [], total: 0 });
    } finally {
      setSesionesEducativasLoading(false);
    }
  }, [parsedId]);

  const loadSaludBucal = useCallback(async () => {
    if (parsedId === 0) return;
    setSaludBucalLoading(true);
    try {
      const res = await getPacienteSaludBucal(parsedId, { limit: 50 });
      setSaludBucal(res);
    } catch {
      setSaludBucal({ data: [], total: 0 });
    } finally {
      setSaludBucalLoading(false);
    }
  }, [parsedId]);

  const loadDeteccionesTuberculosis = useCallback(async () => {
    if (parsedId === 0) return;
    setDeteccionesTuberculosisLoading(true);
    try {
      const res = await getPacienteDeteccionesTuberculosis(parsedId, { limit: 50 });
      setDeteccionesTuberculosis(res);
    } catch {
      setDeteccionesTuberculosis({ data: [], total: 0 });
    } finally {
      setDeteccionesTuberculosisLoading(false);
    }
  }, [parsedId]);

  const loadDoctoresAsignados = useCallback(async () => {
    if (parsedId === 0) return;
    setDoctoresAsignadosLoading(true);
    try {
      const list = await getPacienteDoctores(parsedId);
      setDoctoresAsignados(Array.isArray(list) ? list : []);
    } catch {
      setDoctoresAsignados([]);
    } finally {
      setDoctoresAsignadosLoading(false);
    }
  }, [parsedId]);

  useEffect(() => {
    if (!modalSection) return;
    if (modalSection === 'citas' || modalSection === 'diagnosticos' || modalSection === 'historial-consultas') loadCitas();
    if (modalSection === 'diagnosticos') loadDiagnosticos();
    else if (modalSection === 'graficos') loadChartSignos(FILTROS_TIEMPO.ULTIMOS_3_MESES);
    else if (modalSection === 'signos' || modalSection === 'monitoreo') loadSignos();
    else if (modalSection === 'medicacion') {
      loadMedicamentos();
      loadTomasMedicamento();
    }
    else if (modalSection === 'red-apoyo') loadRedApoyo();
    else if (modalSection === 'vacunacion') loadVacunacion();
    else if (modalSection === 'comorbilidades') loadComorbilidades();
    else if (modalSection === 'detecciones') loadDeteccionesComplicaciones();
    else if (modalSection === 'sesiones-educativas') loadSesionesEducativas();
    else if (modalSection === 'salud-bucal') loadSaludBucal();
    else if (modalSection === 'detecciones-tb') loadDeteccionesTuberculosis();
    else if (modalSection === 'doctores') {
      loadDoctoresAsignados();
      if (isAdmin()) getDoctores({ limit: 200 }).then((l) => setListaDoctores(Array.isArray(l) ? l : [])).catch(() => setListaDoctores([]));
    }
  }, [modalSection, loadCitas, loadSignos, loadChartSignos, loadDiagnosticos, loadMedicamentos, loadTomasMedicamento, loadRedApoyo, loadVacunacion, loadComorbilidades, loadDeteccionesComplicaciones, loadSesionesEducativas, loadSaludBucal, loadDeteccionesTuberculosis, loadDoctoresAsignados, isAdmin]);

  useEffect(() => () => chartSignosAbortRef.current?.abort(), []);

  useEffect(() => {
    if (!formaModalOpen || parsedId === 0) return;
    setPeriodosLoading(true);
    setPeriodoSeleccionado('');
    getFormaMesesDisponibles(parsedId)
      .then((res) => setPeriodosDisponibles(Array.isArray(res?.periodos) ? res.periodos : []))
      .catch(() => setPeriodosDisponibles([]))
      .finally(() => setPeriodosLoading(false));
  }, [formaModalOpen, parsedId]);

  const handleVerExpediente = useCallback(async () => {
    if (parsedId === 0) return;
    setExpedienteLoading(true);
    setExpedienteError(null);
    try {
      const html = await queryClient.fetchQuery({
        queryKey: ['expedienteHTML', parsedId],
        queryFn: () => getExpedienteHTML(parsedId),
      });
      openHTMLInNewWindow(html, 'Expediente médico');
    } catch (err) {
      setExpedienteError(
        err?.response?.data?.error || err?.message || 'Error al cargar el expediente'
      );
    } finally {
      setExpedienteLoading(false);
    }
  }, [parsedId, queryClient]);

  if (parsedId === 0) {
    return (
      <div>
        <PageHeader title="Detalle de paciente" showBack backTo="/pacientes" />
        <p style={{ color: 'var(--color-error)' }}>Paciente no encontrado.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Detalle de paciente" showBack backTo="/pacientes" />
        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Detalle de paciente" showBack backTo="/pacientes" />
        <p style={{ color: 'var(--color-error)' }}>{error}</p>
      </div>
    );
  }

  const p = paciente;
  const nombreCompleto = formatNombreCompleto(p) || '—';

  const renderTabContent = (tabId) => {
    if (!tabId) return null;
    switch (tabId) {
      case 'historial-consultas': {
        const citasOrdenadas = [...(citas.data || [])].sort(
          (a, b) => new Date(b.fecha_cita) - new Date(a.fecha_cita)
        );
        return (
          <Card className="patient-section-card">
            <h2 className="patient-section-title">Historial de consultas</h2>
            {citasLoading ? (
              <LoadingSpinner />
            ) : citasOrdenadas.length === 0 ? (
              <EmptyState message="No hay citas registradas" />
            ) : (
              <>
                <ul className="tracking-list">
                  {citasOrdenadas.map((cita, index) => (
                    <li
                      key={`${cita.id_cita ?? cita.id}-${index}`}
                      className="tracking-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => openDetalleCita(cita.id_cita ?? cita.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDetalleCita(cita.id_cita ?? cita.id);
                        }
                      }}
                    >
                      <span className="tracking-item-date">
                        {formatDateTimeAmPm(cita.fecha_cita)}
                      </span>
                      <span className="tracking-item-body">
                        {sanitizeForDisplay(cita.motivo_consulta) ||
                          sanitizeForDisplay(cita.doctor_nombre) ||
                          '—'}{' '}
                        <Badge
                          variant={
                            cita.estado === 'atendida'
                              ? 'success'
                              : cita.estado === 'cancelada' ||
                                cita.estado === 'no_asistida'
                              ? 'error'
                              : 'neutral'
                          }
                        >
                          {ESTADO_CITA[cita.estado] || cita.estado}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: '0.75rem' }}>
                  <Button type="button" variant="secondary" size="small" onClick={() => navigate(`/citas?paciente=${parsedId}`)}>
                    Ver todas las citas
                  </Button>
                </div>
              </>
            )}
          </Card>
        );
      }
      case 'monitoreo': {
        const ultimoSignoMonitoreo = (signos.data || [])[0];
        const signosListMonitoreo = signos.data || [];
        return (
          <>
            <MonitoreoContinuoSummary
              loading={signosLoading}
              ultimoSigno={ultimoSignoMonitoreo}
              onVerHistorial={() => setModalSection('signos')}
              hideTitle
            />
            <Card className="patient-section-card" style={{ marginTop: 'var(--space-4)' }}>
              <h2 className="patient-section-title">Registros</h2>
              <p style={{ margin: '0 0 0.75rem', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>
                Haz clic en un registro para ver toda la información.
              </p>
              {signosLoading ? (
                <LoadingSpinner />
              ) : signosListMonitoreo.length === 0 ? (
                <EmptyState message="No hay registros de signos vitales" />
              ) : (
                <ul className="tracking-list">
                  {signosListMonitoreo.map((s, i) => (
                    <li
                      key={s.id_signo ?? s.id_signo_vital ?? s.id ?? i}
                      className="tracking-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => openDetalleSigno(s)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDetalleSigno(s);
                        }
                      }}
                    >
                      <span className="tracking-item-date">{formatDate(s.fecha_medicion)}</span>
                      <span className="tracking-item-body">
                        Peso: {s.peso_kg ?? '—'} kg · Talla: {s.talla_m ?? '—'} m · PA: {s.presion_sistolica ?? '—'}/{s.presion_diastolica ?? '—'} · Glucosa: {s.glucosa_mg_dl ?? '—'} mg/dL
                        {(s.colesterol_mg_dl != null || s.colesterol_ldl != null || s.colesterol_hdl != null) && (
                          <> · Col: {s.colesterol_mg_dl ?? '—'} (LDL: {s.colesterol_ldl ?? '—'} / HDL: {s.colesterol_hdl ?? '—'})</>
                        )}
                        {s.hba1c_porcentaje != null && <> · HbA1c: {s.hba1c_porcentaje}%</>}
                        {s.observaciones && <> · {sanitizeForDisplay(s.observaciones)}</>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {signos.total > signosListMonitoreo.length && signosListMonitoreo.length > 0 && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
                  Total: {signos.total}.{' '}
                  <button
                    type="button"
                    onClick={() => setShowAllSignosOpen(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primario)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}
                  >
                    Ver historial completo
                  </button>
                </p>
              )}
            </Card>
          </>
        );
      }
      case 'citas': {
        const handleCreateCita = async () => {
          const idDoctor = parsePositiveInt(citaForm.id_doctor, 0);
          const fecha = (citaForm.fecha_cita || '').trim();
          if (!idDoctor || !fecha) {
            setCitaError('Selecciona doctor y fecha/hora.');
            return;
          }
          setCitaError('');
          setCitaSubmitting(true);
          try {
            await createCita({
              id_paciente: parsedId,
              id_doctor: idDoctor,
              fecha_cita: fechaCitaDatetimeLocalToApi(fecha.length <= 10 ? `${fecha}T12:00:00` : fecha),
              motivo: citaForm.motivo?.trim() || undefined,
            });
            setCitaForm({ id_doctor: '', fecha_cita: '', motivo: '' });
            setCitaModalOpen(false);
            const citasActualizadas = await getPacienteCitas(parsedId, { limit: 10, offset: 0 });
            setCitas(citasActualizadas);
            queryClient.setQueryData(['pacienteCitas', parsedId, { limit: 10, offset: 0 }], citasActualizadas);
            await queryClient.invalidateQueries({ queryKey: ['pacienteResumenMedico', parsedId] });
            await loadResumenMedico();
            message.success('Cita creada');
          } catch (e) {
            setCitaError(e?.response?.data?.error || e?.message || 'Error al crear la cita');
            message.error(e?.response?.data?.error || e?.message);
          } finally {
            setCitaSubmitting(false);
          }
        };
        return (
          <Card className="patient-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <h2 className="patient-section-title" style={{ margin: 0, paddingBottom: 0, borderBottom: 'none' }}>Citas</h2>
              {canEditMedical && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button variant="primary" onClick={() => { setCitaError(''); setCitaForm({ id_doctor: '', fecha_cita: '', motivo: '' }); setCitaModalOpen(true); }}>
                    Agregar cita
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/pacientes/${parsedId}/agendar-cita`)}>
                    Ir a agendar cita
                  </Button>
                </div>
              )}
            </div>
            {citasLoading ? (
              <LoadingSpinner />
            ) : citas.data.length === 0 ? (
              <EmptyState message="No hay citas registradas" />
            ) : (
              <ul className="tracking-list">
                {citas.data.map((c, index) => (
                  <li
                    key={`${c.id_cita ?? c.id}-${index}`}
                    className="tracking-item"
                    style={{ cursor: 'pointer' }}
                    onClick={() => openDetalleCita(c.id_cita ?? c.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetalleCita(c.id_cita ?? c.id); } }}
                  >
                    <span className="tracking-item-date">{formatDateTimeAmPm(c.fecha_cita)}</span>
                    <span className="tracking-item-body">
                      {sanitizeForDisplay(c.doctor_nombre) || '—'}{' '}
                      <Badge variant={c.estado === 'atendida' ? 'success' : c.estado === 'cancelada' || c.estado === 'no_asistida' ? 'error' : 'neutral'}>
                        {ESTADO_CITA[c.estado] || c.estado}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {(citas.total > citas.data.length || citas.data.length > 0) && (
              <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>
                Total: {citas.total}.{' '}
                <button type="button" onClick={() => setShowAllCitasOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primario)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>
                  Ver historial completo
                </button>
                {' · '}
                <button type="button" onClick={() => navigate(`/citas?paciente=${parsedId}`)} style={{ background: 'none', border: 'none', color: 'var(--color-primario)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>
                  Ver todas en página
                </button>
              </p>
            )}
            {canEditMedical && (
              <Modal
                open={citaModalOpen}
                onClose={() => { if (!citaSubmitting) setCitaModalOpen(false); }}
                title="Nueva cita"
                okText={citaSubmitting ? 'Guardando…' : 'Crear cita'}
                confirmLoading={citaSubmitting}
                onOk={handleCreateCita}
                width={480}
              >
                {citaError && <p style={{ color: 'var(--color-error)', margin: '0 0 0.75rem', fontSize: '0.9rem' }}>{citaError}</p>}
                <Select
                  label="Doctor *"
                  placeholder="Seleccionar doctor"
                  value={citaForm.id_doctor || undefined}
                  onChange={(v) => setCitaForm((f) => ({ ...f, id_doctor: v ?? '' }))}
                  options={citaDoctores.map((d) => ({
                    value: String(d.id_doctor),
                    label: formatNombreCompleto(d),
                  }))}
                />
                <Input
                  label="Fecha y hora *"
                  type="datetime-local"
                  value={citaForm.fecha_cita}
                  onChange={(e) => setCitaForm((f) => ({ ...f, fecha_cita: e.target.value }))}
                />
                <Input
                  label="Motivo (opcional)"
                  value={citaForm.motivo}
                  onChange={(e) => setCitaForm((f) => ({ ...f, motivo: e.target.value }))}
                  placeholder="Ej: Control de glucosa, revisión..."
                />
              </Modal>
            )}
          </Card>
        );
      }
      case 'signos': {
        const handleCreateSignos = async () => {
          const body = signosVitalesToPayload(signosForm, paciente?.fecha_nacimiento);
          setSignosSubmitError('');
          setSignosSubmitting(true);
          if (!editingSignoId && signosCitaId) body.id_cita = signosCitaId;
          try {
            if (editingSignoId) {
              await apiUpdateSignosVitales(parsedId, editingSignoId, body);
              message.success('Registro de signos vitales actualizado');
            } else {
              await apiCreateSignosVitales(parsedId, body);
              message.success('Registro de signos vitales guardado');
            }
            setSignosForm(INITIAL_SIGNOS_VITALES);
            setEditingSignoId(null);
            setSignosCitaId(null);
            loadSignos();
            setSignosModalOpen(false);
          } catch (e) {
            const errMsg = e?.response?.data?.error || e?.message || 'Error al guardar';
            setSignosSubmitError(errMsg);
            message.error(errMsg);
          } finally {
            setSignosSubmitting(false);
          }
        };
        const handleDeleteSigno = async (signoId) => {
          if (!window.confirm('¿Eliminar este registro de signos vitales?')) return;
          try {
            await apiDeleteSignosVitales(parsedId, signoId);
            loadSignos();
          } catch (e) {
            setSignosSubmitError(e?.response?.data?.error || e?.message || 'Error al eliminar');
          }
        };
        return (
          <Card className="patient-section-card">
            <h2 className="patient-section-title">Signos vitales</h2>
            {signosLoading ? (
              <LoadingSpinner />
            ) : (signos.data?.length ?? 0) === 0 ? (
              <EmptyState message="No hay registros de signos vitales" />
            ) : (
              <ul className="tracking-list">
                {(signos.data || []).map((s, i) => (
                  <li
                    key={s.id_signo ?? s.id_signo_vital ?? s.id ?? i}
                    className="tracking-item"
                    style={{ cursor: 'pointer' }}
                    onClick={() => openDetalleSigno(s)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetalleSigno(s); } }}
                  >
                    <span className="tracking-item-date">{formatDate(s.fecha_medicion)}</span>
                    <span className="tracking-item-body">
                      Peso: {s.peso_kg ?? '—'} kg · Talla: {s.talla_m ?? '—'} m · Cintura: {s.medida_cintura_cm ?? '—'} cm · PA: {s.presion_sistolica ?? '—'}/{s.presion_diastolica ?? '—'} · Glucosa: {s.glucosa_mg_dl ?? '—'} mg/dL
                      {(s.colesterol_mg_dl != null || s.colesterol_ldl != null || s.colesterol_hdl != null) && (
                        <> · Col: {s.colesterol_mg_dl ?? '—'} (LDL: {s.colesterol_ldl ?? '—'} / HDL: {s.colesterol_hdl ?? '—'})</>
                      )}
                      {s.trigliceridos_mg_dl != null && <> · Trig: {s.trigliceridos_mg_dl} mg/dL</>}
                      {s.hba1c_porcentaje != null && <> · HbA1c: {s.hba1c_porcentaje}%</>}
                      {s.observaciones && <> · {sanitizeForDisplay(s.observaciones)}</>}
                    </span>
                    {canEditMedical && (
                      <span className="tracking-item-actions" onClick={(e) => e.stopPropagation()}>
                        <Button variant="secondary" size="small" onClick={() => handleDeleteSigno(s.id_signo ?? s.id_signo_vital ?? s.id)}>Eliminar</Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {(signos.total > (signos.data?.length ?? 0) || signos.data?.length > 0) && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
                Total: {signos.total}.{' '}
                <button type="button" onClick={() => setShowAllSignosOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primario)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>
                  Ver historial completo
                </button>
              </p>
            )}
            {canEditMedical && (
              <div style={{ marginTop: '1rem' }}>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => {
                    setSignosSubmitError('');
                    setEditingSignoId(null);
                    setSignosCitaId(null);
                    setSignosForm(INITIAL_SIGNOS_VITALES);
                    setSignosModalOpen(true);
                  }}
                >
                  Agregar registro
                </Button>
                <Modal
                  open={signosModalOpen}
                  onClose={() => {
                    if (!signosSubmitting) {
                      setSignosModalOpen(false);
                      setEditingSignoId(null);
                      setSignosCitaId(null);
                    }
                  }}
                  title={editingSignoId ? 'Editar registro de signos vitales' : 'Nuevo registro de signos vitales'}
                  okText={signosSubmitting ? 'Guardando…' : (editingSignoId ? 'Guardar cambios' : 'Guardar registro')}
                  confirmLoading={signosSubmitting}
                  onOk={handleCreateSignos}
                  width={720}
                >
                  {signosSubmitError && (
                    <p
                      style={{
                        color: 'var(--color-error)',
                        margin: '0 0 0.5rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      {signosSubmitError}
                    </p>
                  )}
                  <SignosVitalesForm
                    value={signosForm}
                    onChange={setSignosForm}
                    showImc
                    fechaNacimientoPaciente={paciente?.fecha_nacimiento}
                  />
                </Modal>
              </div>
            )}
          </Card>
        );
      }
      case 'diagnosticos': {
        const handleSaveDiagnostico = async () => {
          const desc = newDiagnosticoDescripcion.trim();
          if (desc.length < 10) {
            setDiagnosticoSubmitError('La descripción debe tener al menos 10 caracteres.');
            return;
          }
          setDiagnosticoSubmitError('');
          setDiagnosticoSubmitting(true);
          const rawCita = (newDiagnosticoCitaId || '').toString().trim();
          const idCitaNum = rawCita ? parseInt(rawCita, 10) : NaN;
          const payloadCreate = { descripcion: desc };
          if (Number.isFinite(idCitaNum) && idCitaNum > 0) {
            payloadCreate.id_cita = idCitaNum;
          }
          try {
            if (editingDiagnostico) {
              await apiUpdateDiagnostico(parsedId, editingDiagnostico.id_diagnostico ?? editingDiagnostico.id, {
                descripcion: desc,
              });
              message.success('Diagnóstico actualizado');
            } else {
              await apiCreateDiagnostico(parsedId, payloadCreate);
              message.success('Diagnóstico guardado');
            }
            setNewDiagnosticoDescripcion('');
            setNewDiagnosticoCitaId('');
            setEditingDiagnostico(null);
            loadDiagnosticos();
            setDiagnosticoModalOpen(false);
          } catch (e) {
            const errMsg = e?.response?.data?.error || e?.message || 'Error al guardar';
            setDiagnosticoSubmitError(errMsg);
            message.error(errMsg);
          } finally {
            setDiagnosticoSubmitting(false);
          }
        };
        const handleDeleteDiagnostico = async (diagnosticoId) => {
          if (!window.confirm('¿Eliminar este diagnóstico?')) return;
          try {
            await apiDeleteDiagnostico(parsedId, diagnosticoId);
            loadDiagnosticos();
          } catch (e) {
            setDiagnosticoSubmitError(e?.response?.data?.error || e?.message || 'Error al eliminar');
          }
        };
        const diagList = diagnosticos.data ?? [];
        return (
          <Card className="patient-section-card">
            <h2 className="patient-section-title">Diagnósticos</h2>
            {diagnosticosLoading ? (
              <LoadingSpinner />
            ) : diagList.length === 0 ? (
              <EmptyState message="No hay diagnósticos registrados" />
            ) : (
              <ul className="tracking-list">
                {diagList.map((d, i) => (
                  <li key={d.id_diagnostico ?? d.id ?? i} className="tracking-item">
                    <button
                      type="button"
                      className="tracking-item-clickable"
                      onClick={() => setDetalleDiagnosticoSeleccionado(d)}
                      style={{
                        flex: '1 1 auto',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: 'inherit',
                        font: 'inherit',
                      }}
                    >
                      <span className="tracking-item-date">{formatDate(d.fecha_registro ?? d.fecha_diagnostico)}</span>
                      <span className="tracking-item-body">{sanitizeForDisplay(d.descripcion ?? d.diagnostico) || '—'}</span>
                    </button>
                    {canEditMedical && (
                      <span className="tracking-item-actions">
                        <Button variant="secondary" size="small" onClick={(e) => { e.stopPropagation(); handleDeleteDiagnostico(d.id_diagnostico ?? d.id); }}>Eliminar</Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canEditMedical && (
              <div style={{ marginTop: '1rem' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setDiagnosticoSubmitError('');
                    setEditingDiagnostico(null);
                    setNewDiagnosticoDescripcion('');
                    setNewDiagnosticoCitaId('');
                    setDiagnosticoModalOpen(true);
                  }}
                >
                  Agregar diagnóstico
                </Button>
                <Modal
                  open={diagnosticoModalOpen}
                  onClose={() => {
                    if (!diagnosticoSubmitting) {
                      setDiagnosticoModalOpen(false);
                      setEditingDiagnostico(null);
                    }
                  }}
                  title={editingDiagnostico ? 'Editar diagnóstico' : 'Nuevo diagnóstico'}
                  okText={diagnosticoSubmitting ? 'Guardando…' : (editingDiagnostico ? 'Guardar cambios' : 'Guardar diagnóstico')}
                  confirmLoading={diagnosticoSubmitting}
                  onOk={handleSaveDiagnostico}
                >
                  {diagnosticoSubmitError && (
                    <p
                      style={{
                        color: 'var(--color-error)',
                        margin: '0 0 0.5rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      {diagnosticoSubmitError}
                    </p>
                  )}
                  <TextArea
                    placeholder="Descripción (mín. 10 caracteres)"
                    value={newDiagnosticoDescripcion}
                    onChange={(e) => setNewDiagnosticoDescripcion(e.target.value)}
                    rows={3}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  {citas.data?.length > 0 && (
                    <Select
                      label="Cita asociada (opcional)"
                      placeholder="Sin cita asociada"
                      value={newDiagnosticoCitaId}
                      onChange={(v) => setNewDiagnosticoCitaId(v ?? '')}
                      options={[
                        { value: '', label: 'Sin cita asociada' },
                        ...citas.data.map((c) => ({
                          value: String(c.id_cita),
                          label: `${formatDate(c.fecha_cita)} — ${c.motivo_consulta ?? 'Cita'}`,
                        })),
                      ]}
                    />
                  )}
                </Modal>
                <Modal
                  open={!!detalleDiagnosticoSeleccionado}
                  onClose={() => setDetalleDiagnosticoSeleccionado(null)}
                  title="Detalle de diagnóstico"
                  footer={null}
                  width={520}
                >
                  {detalleDiagnosticoSeleccionado && (
                    <div className="patient-section-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                      <div style={{ background: 'var(--color-fondo-card)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--color-borde-claro)' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-texto-primario)', marginBottom: '0.5rem' }}>📅 Fecha</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>
                          {formatDate(detalleDiagnosticoSeleccionado.fecha_registro ?? detalleDiagnosticoSeleccionado.fecha_diagnostico)}
                        </div>
                      </div>
                      {(detalleDiagnosticoSeleccionado.doctor_nombre != null && detalleDiagnosticoSeleccionado.doctor_nombre !== '') && (
                        <div style={{ background: 'var(--color-fondo-card)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--color-borde-claro)' }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-texto-primario)', marginBottom: '0.5rem' }}>👤 Doctor</div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>{detalleDiagnosticoSeleccionado.doctor_nombre}</div>
                        </div>
                      )}
                      <div style={{ background: 'var(--color-fondo-card)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem', border: '1px solid var(--color-borde-claro)' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-texto-primario)', marginBottom: '0.5rem' }}>Descripción</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-texto-secundario)', whiteSpace: 'pre-wrap' }}>
                          {sanitizeForDisplay(detalleDiagnosticoSeleccionado.descripcion ?? detalleDiagnosticoSeleccionado.diagnostico) || '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {canEditMedical && (
                          <>
                            <Button
                              variant="primary"
                              size="small"
                              onClick={() => {
                                const d = detalleDiagnosticoSeleccionado;
                                setNewDiagnosticoDescripcion(d.descripcion ?? d.diagnostico ?? '');
                                setNewDiagnosticoCitaId(d.id_cita != null ? String(d.id_cita) : '');
                                setEditingDiagnostico(d);
                                setDetalleDiagnosticoSeleccionado(null);
                                setDiagnosticoSubmitError('');
                                setDiagnosticoModalOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="secondary"
                              size="small"
                              onClick={async () => {
                                if (!window.confirm('¿Eliminar este diagnóstico?')) return;
                                try {
                                  await apiDeleteDiagnostico(parsedId, detalleDiagnosticoSeleccionado.id_diagnostico ?? detalleDiagnosticoSeleccionado.id);
                                  loadDiagnosticos();
                                  setDetalleDiagnosticoSeleccionado(null);
                                  message.success('Diagnóstico eliminado');
                                } catch (e) {
                                  message.error(e?.response?.data?.error || e?.message || 'Error al eliminar');
                                }
                              }}
                            >
                              Eliminar
                            </Button>
                          </>
                        )}
                        <Button variant="secondary" size="small" onClick={() => setDetalleDiagnosticoSeleccionado(null)}>
                          Cerrar
                        </Button>
                      </div>
                    </div>
                  )}
                </Modal>
              </div>
            )}
          </Card>
        );
      }
      case 'medicacion': {
        const handleCreatePlanMedicacion = async () => {
          const items = medicacionForm.medicamentos.filter((m) => m.id_medicamento && parsePositiveInt(m.id_medicamento, 0) > 0);
          if (items.length === 0) {
            setMedicacionError('Selecciona al menos un medicamento.');
            return;
          }
          const fechaInicio = (medicacionForm.fecha_inicio || '').trim();
          if (!fechaInicio) {
            setMedicacionError('La fecha de inicio es obligatoria.');
            return;
          }
          setMedicacionError('');
          setMedicacionSubmitting(true);
          const payload = {
            fecha_inicio: fechaInicio,
            fecha_fin: (medicacionForm.fecha_fin || '').trim() || undefined,
            observaciones: medicacionForm.observaciones?.trim() || undefined,
            medicamentos: items.map((m) => {
              const horarios = Array.isArray(m.horarios) ? m.horarios.filter((h) => h && String(h).trim()) : [];
              return {
                id_medicamento: parsePositiveInt(m.id_medicamento, 0),
                dosis: (m.dosis || '').trim() || undefined,
                frecuencia: (m.frecuencia || '').trim() || undefined,
                horarios: horarios.length > 0 ? horarios : undefined,
                via_administracion: (m.via_administracion || '').trim() || undefined,
                observaciones: (m.observaciones || '').trim() || undefined,
              };
            }),
          };
          try {
            if (editingPlanMedicacion) {
              await apiUpdatePlanMedicacion(parsedId, editingPlanMedicacion.id_plan ?? editingPlanMedicacion.id, payload);
              message.success('Plan de medicación actualizado');
            } else {
              await apiCreatePlanMedicacion(parsedId, payload);
              message.success('Plan de medicación creado');
            }
            setMedicacionForm({
              fecha_inicio: '',
              fecha_fin: '',
              observaciones: '',
              medicamentos: [{ id_medicamento: '', dosis: '', frecuencia: '', horarios: [], via_administracion: '', observaciones: '' }],
            });
            setEditingPlanMedicacion(null);
            setMedicacionModalOpen(false);
            loadMedicamentos();
          } catch (e) {
            setMedicacionError(e?.response?.data?.error || e?.message || 'Error al guardar');
            message.error(e?.response?.data?.error || e?.message);
          } finally {
            setMedicacionSubmitting(false);
          }
        };
        const addMedicamentoRow = () => {
          setMedicacionForm((f) => ({
            ...f,
            medicamentos: [...f.medicamentos, { id_medicamento: '', dosis: '', frecuencia: '', horarios: [], via_administracion: '', observaciones: '' }],
          }));
        };
        const addHorarioRow = (medIndex) => {
          setMedicacionForm((f) => ({
            ...f,
            medicamentos: f.medicamentos.map((m, i) =>
              i === medIndex ? { ...m, horarios: [...(m.horarios || []), ''] } : m
            ),
          }));
        };
        const removeHorarioRow = (medIndex, horarioIndex) => {
          setMedicacionForm((f) => ({
            ...f,
            medicamentos: f.medicamentos.map((m, i) =>
              i === medIndex ? { ...m, horarios: (m.horarios || []).filter((_, j) => j !== horarioIndex) } : m
            ),
          }));
        };
        const updateHorarioValue = (medIndex, horarioIndex, value) => {
          setMedicacionForm((f) => ({
            ...f,
            medicamentos: f.medicamentos.map((m, i) => {
              if (i !== medIndex) return m;
              const arr = [...(m.horarios || [])];
              arr[horarioIndex] = value;
              return { ...m, horarios: arr };
            }),
          }));
        };
        const updateMedicamentoRow = (index, field, value) => {
          setMedicacionForm((f) => ({
            ...f,
            medicamentos: f.medicamentos.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
          }));
        };
        return (
          <Card className="patient-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              <h2 className="patient-section-title" style={{ margin: 0 }}>Medicación</h2>
              {canEditMedical && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setMedicacionError('');
                    setEditingPlanMedicacion(null);
                    setMedicacionForm({
                      fecha_inicio: '',
                      fecha_fin: '',
                      observaciones: '',
                      medicamentos: [{ id_medicamento: '', dosis: '', frecuencia: '', horarios: [], via_administracion: '', observaciones: '' }],
                    });
                    setMedicacionModalOpen(true);
                  }}
                >
                  Agregar plan de medicación
                </Button>
              )}
            </div>
            {medicamentosLoading ? (
              <LoadingSpinner />
            ) : medicamentos.data.length === 0 ? (
              <EmptyState message="No hay planes de medicación" />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {medicamentos.data.map((m, i) => (
                  <li
                    key={m.id_plan ?? m.id ?? i}
                    style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-borde-claro)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', cursor: 'pointer' }}
                    onClick={() => setPlanDetalleSeleccionado(m)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPlanDetalleSeleccionado(m); } }}
                  >
                    <div>
                      <strong>{sanitizeForDisplay(m.nombre_medicamento ?? m.medicamento) || '—'}</strong>
                      {(m.dosis || m.frecuencia) && (
                        <span style={{ color: 'var(--color-texto-secundario)', marginLeft: '0.5rem' }}>
                          {[m.dosis, m.frecuencia].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      — Inicio: {formatDate(m.fecha_inicio)} — {m.activo ? 'Activo' : 'Finalizado'}
                      {Array.isArray(m.medicamentos) && m.medicamentos.length > 0 && (
                        <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0, fontSize: 'var(--text-sm)' }}>
                          {m.medicamentos.map((med, j) => (
                            <li key={j}>
                              {sanitizeForDisplay(med.nombre_medicamento ?? med.medicamento) || '—'}
                              {(med.dosis || med.frecuencia) && ` — ${[med.dosis, med.frecuencia].filter(Boolean).join(' · ')}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {canEditMedical && (
                      <span style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => {
                            const mapMed = (med) => {
                              const hrs = med.horarios && Array.isArray(med.horarios) ? med.horarios : (med.horario ? [med.horario] : []);
                              return {
                                id_medicamento: String(med.id_medicamento ?? med.id ?? ''),
                                dosis: med.dosis ?? '',
                                frecuencia: med.frecuencia ?? '',
                                horarios: hrs.map((h) => (typeof h === 'string' ? h.slice(0, 5) : '')),
                                via_administracion: med.via_administracion ?? '',
                                observaciones: med.observaciones ?? '',
                              };
                            };
                            const meds = Array.isArray(m.medicamentos) && m.medicamentos.length > 0
                              ? m.medicamentos.map(mapMed)
                              : (m.id_medicamento != null ? [mapMed(m)] : [{ id_medicamento: '', dosis: '', frecuencia: '', horarios: [], via_administracion: '', observaciones: '' }]);
                            setMedicacionError('');
                            setMedicacionForm({
                              fecha_inicio: m.fecha_inicio ? String(m.fecha_inicio).slice(0, 10) : '',
                              fecha_fin: m.fecha_fin ? String(m.fecha_fin).slice(0, 10) : '',
                              observaciones: m.observaciones ?? '',
                              medicamentos: meds,
                            });
                            setEditingPlanMedicacion(m);
                            setPlanDetalleSeleccionado(null);
                            setMedicacionModalOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={async () => {
                            if (!window.confirm('¿Eliminar este plan de medicación?')) return;
                            try {
                              await apiDeletePlanMedicacion(parsedId, m.id_plan ?? m.id);
                              loadMedicamentos();
                              setPlanDetalleSeleccionado(null);
                              message.success('Plan eliminado');
                            } catch (e) {
                              message.error(e?.response?.data?.error || e?.message || 'Error al eliminar');
                            }
                          }}
                        >
                          Eliminar
                        </Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-borde-claro)' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Registro de tomas</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--color-texto-secundario)', fontSize: 'var(--text-sm)' }}>Últimos</span>
                <Select
                  value={tomasMedicamentoRango}
                  onChange={(v) => {
                    setTomasMedicamentoRango(v ?? '30');
                    loadTomasMedicamento(v ?? '30');
                  }}
                  options={[
                    { value: '7', label: '7 días' },
                    { value: '30', label: '30 días' },
                    { value: '90', label: '90 días' },
                  ]}
                  style={{ width: 120 }}
                />
              </div>
              {tomasMedicamentoLoading ? (
                <LoadingSpinner />
              ) : tomasMedicamento.data.length === 0 ? (
                <EmptyState message="No hay tomas registradas en este periodo" />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--color-borde-claro)', textAlign: 'left' }}>
                        <th scope="col" style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>Fecha</th>
                        <th
                          scope="col"
                          style={{ padding: '0.5rem' }}
                          title="Horario indicado en el plan de medicación para la toma"
                        >
                          Hora de toma del medicamento
                        </th>
                        <th
                          scope="col"
                          style={{ padding: '0.5rem' }}
                          title="Hora a la que se registró la administración en el sistema"
                        >
                          Hora de administración registrada
                        </th>
                        <th scope="col" style={{ padding: '0.5rem' }}>Medicación / Plan</th>
                        <th scope="col" style={{ padding: '0.5rem' }}>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tomasMedicamento.data.map((toma) => {
                        const planLabel = (medicamentos.data.find((m) => (m.id_plan ?? m.id) === toma.id_plan_medicacion)?.nombre_medicamento ?? medicamentos.data.find((m) => (m.id_plan ?? m.id) === toma.id_plan_medicacion)?.medicamento) || (toma.PlanDetalle?.Medicamento?.nombre_medicamento) || `Plan #${toma.id_plan_medicacion}`;
                        const fechaToma = toma.fecha_toma ? formatDate(toma.fecha_toma) : '—';
                        const horaAdministracion = formatHoraAdministracionRegistrada(toma.hora_toma);
                        const horaPrescripta = formatHorarioPrescriptoMedicamento(
                          toma.PlanDetalle,
                          toma.hora_toma
                        );
                        return (
                          <tr key={toma.id_toma} style={{ borderBottom: '1px solid var(--color-borde-claro)' }}>
                            <td style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>{fechaToma}</td>
                            <td style={{ padding: '0.5rem' }}>{horaPrescripta}</td>
                            <td style={{ padding: '0.5rem' }}>{horaAdministracion}</td>
                            <td style={{ padding: '0.5rem' }}>{sanitizeForDisplay(planLabel)}</td>
                            <td style={{ padding: '0.5rem', color: 'var(--color-texto-secundario)' }}>{toma.observaciones ? sanitizeForDisplay(toma.observaciones) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {planDetalleSeleccionado && (
              <Modal
                open={!!planDetalleSeleccionado}
                onClose={() => setPlanDetalleSeleccionado(null)}
                title="Detalle del plan de medicación"
                footer={null}
                width={520}
              >
                {(() => {
                  const p = planDetalleSeleccionado;
                  return (
                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                      <p><strong>Fecha de inicio:</strong> {formatDate(p.fecha_inicio)}</p>
                      <p><strong>Estado:</strong> {p.activo ? 'Activo' : 'Finalizado'}</p>
                      {p.observaciones && <p><strong>Observaciones:</strong> {sanitizeForDisplay(p.observaciones)}</p>}
                      {Array.isArray(p.medicamentos) && p.medicamentos.length > 0 && (
                        <>
                          <p style={{ marginTop: '0.75rem' }}><strong>Medicamentos:</strong></p>
                          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                            {p.medicamentos.map((med, j) => (
                              <li key={j}>
                                {sanitizeForDisplay(med.nombre_medicamento ?? med.medicamento) || '—'}
                                {(med.dosis || med.frecuencia) && ` — ${[med.dosis, med.frecuencia].filter(Boolean).join(' · ')}`}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {canEditMedical && (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => {
                              const meds = Array.isArray(p.medicamentos) && p.medicamentos.length > 0
                                ? p.medicamentos.map((med) => {
                                    const hrs = med.horarios && Array.isArray(med.horarios) ? med.horarios : (med.horario ? [med.horario] : []);
                                    return {
                                      id_medicamento: String(med.id_medicamento ?? med.id ?? ''),
                                      dosis: med.dosis ?? '',
                                      frecuencia: med.frecuencia ?? '',
                                      horarios: hrs.map((h) => (typeof h === 'string' ? h.slice(0, 5) : '')),
                                      via_administracion: med.via_administracion ?? '',
                                      observaciones: med.observaciones ?? '',
                                    };
                                  })
                                : [{ id_medicamento: '', dosis: '', frecuencia: '', horarios: [], via_administracion: '', observaciones: '' }];
                              setMedicacionForm({
                                fecha_inicio: p.fecha_inicio ? String(p.fecha_inicio).slice(0, 10) : '',
                                fecha_fin: p.fecha_fin ? String(p.fecha_fin).slice(0, 10) : '',
                                observaciones: p.observaciones ?? '',
                                medicamentos: meds,
                              });
                              setEditingPlanMedicacion(p);
                              setPlanDetalleSeleccionado(null);
                              setMedicacionModalOpen(true);
                            }}
                          >
                            Editar plan
                          </Button>
                        )}
                        <Button variant="secondary" size="small" onClick={() => setPlanDetalleSeleccionado(null)}>Cerrar</Button>
                      </div>
                    </div>
                  );
                })()}
              </Modal>
            )}
            {canEditMedical && (
              <Modal
                open={medicacionModalOpen}
                onClose={() => {
                  if (!medicacionSubmitting) {
                    setMedicacionModalOpen(false);
                    setEditingPlanMedicacion(null);
                  }
                }}
                title={editingPlanMedicacion ? 'Editar plan de medicación' : 'Nuevo plan de medicación'}
                okText={medicacionSubmitting ? 'Guardando…' : (editingPlanMedicacion ? 'Guardar cambios' : 'Guardar plan')}
                confirmLoading={medicacionSubmitting}
                onOk={handleCreatePlanMedicacion}
                width={560}
              >
                {medicacionError && <p style={{ color: 'var(--color-error)', margin: '0 0 0.75rem', fontSize: '0.9rem' }}>{medicacionError}</p>}
                <Input
                  label="Fecha de inicio *"
                  type="date"
                  value={medicacionForm.fecha_inicio}
                  onChange={(e) => setMedicacionForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                />
                <Input
                  label="Fecha fin (opcional)"
                  type="date"
                  value={medicacionForm.fecha_fin}
                  onChange={(e) => setMedicacionForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                />
                {medicacionForm.medicamentos.map((row, idx) => (
                  <div key={idx} style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--color-fondo-secundario)', borderRadius: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', alignItems: 'end' }}>
                      <Select
                        label="Medicamento *"
                        placeholder="Seleccionar"
                        value={row.id_medicamento || undefined}
                        onChange={(v) => updateMedicamentoRow(idx, 'id_medicamento', v ?? '')}
                        options={medicamentosCatalog.map((med) => ({
                          value: String(med.id_medicamento ?? med.id),
                          label: sanitizeForDisplay(med.nombre_medicamento ?? med.nombre) || '—',
                        }))}
                      />
                      <Input
                        label="Dosis"
                        value={row.dosis}
                        onChange={(e) => updateMedicamentoRow(idx, 'dosis', e.target.value)}
                        placeholder="Ej: 500 mg"
                      />
                      <Input
                        label="Frecuencia"
                        value={row.frecuencia}
                        onChange={(e) => updateMedicamentoRow(idx, 'frecuencia', e.target.value)}
                        placeholder="Ej: cada 8 h"
                      />
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 'var(--text-sm)', color: 'var(--color-texto-primario)' }}>Horarios (opcional)</span>
                      {(row.horarios || []).map((h, hi) => (
                        <div key={hi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 6 }}>
                          <input
                            type="time"
                            value={h || ''}
                            onChange={(e) => updateHorarioValue(idx, hi, e.target.value)}
                            style={{ padding: '0.35rem 0.5rem', border: '1px solid var(--color-borde-claro)', borderRadius: 'var(--radius)', fontSize: 'var(--text-sm)' }}
                          />
                          <Button type="button" variant="secondary" size="small" onClick={() => removeHorarioRow(idx, hi)}>Quitar</Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="small" onClick={() => addHorarioRow(idx)} style={{ marginTop: 2 }}>
                        + Agregar otro horario
                      </Button>
                    </div>
                    <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <Input
                        label="Vía de administración"
                        value={row.via_administracion || ''}
                        onChange={(e) => updateMedicamentoRow(idx, 'via_administracion', e.target.value)}
                        placeholder="Ej: Oral"
                      />
                      <Input
                        label="Observaciones (opcional)"
                        value={row.observaciones || ''}
                        onChange={(e) => updateMedicamentoRow(idx, 'observaciones', e.target.value)}
                        placeholder="Por medicamento"
                      />
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="small" onClick={addMedicamentoRow} style={{ marginBottom: '0.75rem' }}>
                  + Agregar otro medicamento
                </Button>
                <TextArea
                  label="Observaciones del plan (opcional)"
                  value={medicacionForm.observaciones}
                  onChange={(e) => setMedicacionForm((f) => ({ ...f, observaciones: e.target.value }))}
                  rows={2}
                  placeholder="Notas adicionales sobre el plan de medicación..."
                />
              </Modal>
            )}
          </Card>
        );
      }
      case 'red-apoyo':
        return (
          <RedApoyoCard
            items={redApoyo.data}
            loading={redApoyoLoading}
            canEdit={canEditMedical}
            onCreate={
              canEditMedical
                ? async (payload) => {
                    await apiCreateRedApoyo(parsedId, payload);
                    loadRedApoyo();
                  }
                : undefined
            }
            onUpdate={
              canEditMedical
                ? async (contactId, payload) => {
                    await apiUpdateRedApoyo(parsedId, contactId, payload);
                    loadRedApoyo();
                  }
                : undefined
            }
            onDelete={
              canEditMedical
                ? async (contactId) => {
                    await apiDeleteRedApoyo(parsedId, contactId);
                    loadRedApoyo();
                  }
                : undefined
            }
          />
        );
      case 'vacunacion':
        return (
          <Card className="patient-section-card">
            <h2 className="patient-section-title">Esquema de vacunación</h2>
            {vacunacionLoading ? (
              <LoadingSpinner />
            ) : vacunacion.data.length === 0 ? (
              <EmptyState message="No hay registros de vacunación" />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {vacunacion.data.map((v, i) => (
                  <li
                    key={v.id_esquema ?? v.id ?? i}
                    style={{
                      padding: '0.5rem 0',
                      borderBottom: '1px solid var(--color-borde-claro)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <strong>{sanitizeForDisplay(v.nombre_vacuna ?? v.vacuna) || '—'}</strong>{' '}
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>
                        {v.fecha_aplicacion && `· ${formatDate(v.fecha_aplicacion)}`}
                        {v.lote && ` · Lote: ${sanitizeForDisplay(v.lote)}`}
                        {v.lugar_aplicacion && ` · Lugar: ${sanitizeForDisplay(v.lugar_aplicacion)}`}
                      </span>
                    </div>
                    {canEditMedical && (
                      <span style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Button
                          type="button"
                          size="small"
                          variant="primary"
                          onClick={() => {
                            setVacunaError('');
                            setVacunaForm(() => {
                              const lug = parseLugarAplicacionVacunaForm(v.lugar_aplicacion);
                              return {
                                id_vacuna: String(v.id_vacuna ?? v.id_vacuna_fk ?? v.id ?? ''),
                                fecha_aplicacion: v.fecha_aplicacion ? String(v.fecha_aplicacion).slice(0, 10) : '',
                                lote: v.lote ?? '',
                                lugar_aplicacion: lug.select,
                                lugar_aplicacion_otro: lug.otro,
                                observaciones: v.observaciones ?? '',
                              };
                            });
                            setEditingVacuna(v);
                            setVacunaModalOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="small"
                          variant="secondary"
                          onClick={async () => {
                            const idEsquema = v.id_esquema ?? v.id;
                            if (!idEsquema) return;
                            if (!window.confirm('¿Eliminar este registro de vacunación?')) return;
                            try {
                              await apiDeleteEsquemaVacunacion(parsedId, idEsquema);
                              loadVacunacion();
                            } catch (e) {
                              console.error('Error al eliminar esquema de vacunación', e);
                            }
                          }}
                        >
                          Eliminar
                        </Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canEditMedical && (
              <div style={{ marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setVacunaError('');
                    setEditingVacuna(null);
                    setVacunaForm({
                      id_vacuna: '',
                      fecha_aplicacion: '',
                      lote: '',
                      lugar_aplicacion: '',
                      lugar_aplicacion_otro: '',
                      observaciones: '',
                    });
                    setVacunaModalOpen(true);
                  }}
                >
                  Agregar vacuna
                </Button>
                <Modal
                  open={vacunaModalOpen}
                  onClose={() => {
                    if (!vacunaSubmitting) {
                      setVacunaModalOpen(false);
                      setEditingVacuna(null);
                    }
                  }}
                  title={editingVacuna ? 'Editar vacuna' : 'Agregar vacuna'}
                  okText={vacunaSubmitting ? 'Guardando…' : (editingVacuna ? 'Guardar cambios' : 'Guardar vacuna')}
                  confirmLoading={vacunaSubmitting}
                  onOk={async () => {
                    const idVac = vacunaForm.id_vacuna;
                    const fecha = (vacunaForm.fecha_aplicacion || '').trim();
                    if (!idVac || !fecha) {
                      setVacunaError('Selecciona una vacuna y una fecha de aplicación.');
                      return;
                    }
                    if (vacunaForm.lugar_aplicacion === LUGAR_APLICACION_OTRO) {
                      const ot = (vacunaForm.lugar_aplicacion_otro || '').trim();
                      if (!ot) {
                        setVacunaError('Especifica el lugar de aplicación o elige otra opción.');
                        return;
                      }
                    }
                    const lugarPayload = buildLugarAplicacionPayload(
                      vacunaForm.lugar_aplicacion,
                      vacunaForm.lugar_aplicacion_otro
                    );
                    setVacunaError('');
                    setVacunaSubmitting(true);
                    try {
                      if (editingVacuna) {
                        await apiUpdateEsquemaVacunacion(parsedId, editingVacuna.id_esquema ?? editingVacuna.id, {
                          id_vacuna: idVac,
                          fecha_aplicacion: fecha,
                          lote: vacunaForm.lote?.trim() || undefined,
                          lugar_aplicacion: lugarPayload || null,
                          observaciones: vacunaForm.observaciones?.trim() || undefined,
                        });
                        message.success('Vacuna actualizada');
                      } else {
                        await apiCreateEsquemaVacunacion(parsedId, {
                          id_vacuna: idVac,
                          vacuna: undefined,
                          fecha_aplicacion: fecha,
                          lote: vacunaForm.lote?.trim() || undefined,
                          lugar_aplicacion: lugarPayload || null,
                          observaciones: vacunaForm.observaciones?.trim() || undefined,
                        });
                      }
                      setVacunaForm({
                        id_vacuna: '',
                        fecha_aplicacion: '',
                        lote: '',
                        lugar_aplicacion: '',
                        lugar_aplicacion_otro: '',
                        observaciones: '',
                      });
                      setEditingVacuna(null);
                      setVacunaModalOpen(false);
                      loadVacunacion();
                    } catch (e) {
                      setVacunaError(
                        e?.response?.data?.error || e?.message || 'Error al guardar la vacuna',
                      );
                    } finally {
                      setVacunaSubmitting(false);
                    }
                  }}
                >
                  <div
                    className="vacuna-modal-form-wrap"
                    style={{
                      width: '90%',
                      minHeight: '90%',
                      margin: '0 auto',
                      padding: '1.25rem',
                      background: 'var(--color-fondo-secundario)',
                      color: 'var(--color-texto-primario)',
                      borderRadius: 'var(--radius-xl, 8px)',
                    }}
                  >
                    {vacunaError && (
                      <p
                        style={{
                          margin: '0 0 0.5rem',
                          color: 'var(--color-error)',
                          fontSize: '0.9rem',
                        }}
                      >
                        {vacunaError}
                      </p>
                    )}
                    <div
                      className="vacuna-modal-form-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                        gap: '0.75rem',
                        marginBottom: '0.75rem',
                        alignItems: 'start',
                      }}
                    >
                      <Select
                      label="Vacuna"
                      size="large"
                      placeholder="— Seleccionar vacuna —"
                      value={vacunaForm.id_vacuna || undefined}
                      onChange={(v) =>
                        setVacunaForm((f) => ({ ...f, id_vacuna: v ?? '' }))
                      }
                      options={[
                        { value: '', label: '— Seleccionar vacuna —' },
                        ...vacunasCatalog.map((vac) => ({
                          value: String(vac.id_vacuna ?? vac.id),
                          label: sanitizeForDisplay(vac.nombre_vacuna ?? vac.nombre) || '—',
                        })),
                      ]}
                    />
                    <Input
                      label="Fecha de aplicación"
                      type="date"
                      size="large"
                      value={vacunaForm.fecha_aplicacion}
                      onChange={(e) =>
                        setVacunaForm((f) => ({ ...f, fecha_aplicacion: e.target.value }))
                      }
                    />
                    <Input
                      label="Lote (opcional)"
                      size="large"
                      value={vacunaForm.lote}
                      onChange={(e) =>
                        setVacunaForm((f) => ({ ...f, lote: e.target.value }))
                      }
                    />
                    <Select
                      label="Lugar de aplicación"
                      size="large"
                      placeholder="— No indicar —"
                      value={vacunaForm.lugar_aplicacion ? vacunaForm.lugar_aplicacion : undefined}
                      onChange={(v) =>
                        setVacunaForm((f) => ({
                          ...f,
                          lugar_aplicacion: v ?? '',
                          lugar_aplicacion_otro:
                            v === LUGAR_APLICACION_OTRO ? f.lugar_aplicacion_otro : '',
                        }))
                      }
                      options={LUGARES_APLICACION_VACUNA_OPTIONS.filter((o) => o.value !== '').map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                    />
                    {vacunaForm.lugar_aplicacion === LUGAR_APLICACION_OTRO ? (
                      <Input
                        label="lugar/Institución"
                        size="large"
                        placeholder="Ej. Hospital general, clínica privada…"
                        value={vacunaForm.lugar_aplicacion_otro}
                        onChange={(e) =>
                          setVacunaForm((f) => ({ ...f, lugar_aplicacion_otro: e.target.value }))
                        }
                      />
                    ) : null}
                    <Input
                      label="Observaciones (opcional)"
                      size="large"
                      value={vacunaForm.observaciones}
                      onChange={(e) =>
                        setVacunaForm((f) => ({ ...f, observaciones: e.target.value }))
                      }
                    />
                    </div>
                  </div>
                </Modal>
              </div>
            )}
          </Card>
        );
      case 'comorbilidades':
        return (
          <Card className="patient-section-card">
            <h2 className="patient-section-title">Comorbilidades</h2>
            {comorbilidadesLoading ? (
              <LoadingSpinner />
            ) : (comorbilidades.data?.length ?? 0) === 0 ? (
              <EmptyState message="No hay comorbilidades registradas" />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {(Array.isArray(comorbilidades.data) ? comorbilidades.data : []).map((c, i) => (
                  <li
                    key={c.id_comorbilidad ?? c.id ?? i}
                    style={{
                      padding: '0.5rem 0',
                      borderBottom: '1px solid var(--color-borde-claro)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <strong>{sanitizeForDisplay(c.nombre_comorbilidad ?? c.nombre) || '—'}</strong>
                      {(c.fecha_deteccion || c.observaciones) && (
                        <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.25rem' }}>
                          {c.fecha_deteccion && formatDate(c.fecha_deteccion)}
                          {c.observaciones && ` — ${sanitizeForDisplay(c.observaciones)}`}
                        </span>
                      )}
                    </div>
                    {canEditMedical && (
                      <span style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Button
                          type="button"
                          size="small"
                          variant="primary"
                          onClick={() => {
                            setComorbilidadError('');
                            setComorbilidadForm({
                              ...COMORBILIDAD_FORM_INITIAL,
                              id_comorbilidad: String(c.id_comorbilidad ?? c.id ?? ''),
                              fecha_deteccion: c.fecha_deteccion ? String(c.fecha_deteccion).slice(0, 10) : '',
                              observaciones: c.observaciones ?? '',
                              anos_padecimiento: c.anos_padecimiento != null ? String(c.anos_padecimiento) : '',
                              es_diagnostico_basal: !!c.es_diagnostico_basal,
                              [ANIO_DIAGNOSTICO_FIELD]:
                                c[ANIO_DIAGNOSTICO_FIELD] != null ? String(c[ANIO_DIAGNOSTICO_FIELD]) : '',
                              es_agregado_posterior: !!c.es_agregado_posterior,
                              recibe_tratamiento_no_farmacologico: !!c.recibe_tratamiento_no_farmacologico,
                              recibe_tratamiento_farmacologico: !!c.recibe_tratamiento_farmacologico,
                            });
                            setEditingComorbilidad(c);
                            setComorbilidadModalOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="small"
                          variant="secondary"
                          onClick={async () => {
                            const idRel = c.id ?? c.id_relacion ?? c.id_paciente_comorbilidad ?? c.id_comorbilidad;
                            if (!idRel) return;
                            if (!window.confirm('¿Eliminar esta comorbilidad del paciente?')) return;
                            try {
                              await apiDeleteComorbilidad(parsedId, idRel);
                              loadComorbilidades();
                            } catch (e) {
                              console.error('Error al eliminar comorbilidad', e);
                            }
                          }}
                        >
                          Eliminar
                        </Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {(comorbilidades.data?.length ?? 0) > 0 && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
                <button type="button" onClick={() => setShowAllComorbilidadesOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primario)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>
                  Ver historial completo
                </button>
              </p>
            )}
            {canEditMedical && (
              <div style={{ marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setComorbilidadError('');
                    setEditingComorbilidad(null);
                    setComorbilidadForm(COMORBILIDAD_FORM_INITIAL);
                    setComorbilidadModalOpen(true);
                  }}
                >
                  Agregar comorbilidad
                </Button>
                <Modal
                  open={comorbilidadModalOpen}
                  onClose={() => {
                    if (!comorbilidadSubmitting) {
                      setComorbilidadModalOpen(false);
                      setEditingComorbilidad(null);
                    }
                  }}
                  title={editingComorbilidad ? 'Editar comorbilidad' : 'Agregar comorbilidad'}
                  okText={comorbilidadSubmitting ? 'Guardando…' : (editingComorbilidad ? 'Guardar cambios' : 'Guardar comorbilidad')}
                  confirmLoading={comorbilidadSubmitting}
                  onOk={async () => {
                    const idCom = comorbilidadForm.id_comorbilidad;
                    if (!idCom) {
                      setComorbilidadError('Selecciona una comorbilidad.');
                      return;
                    }
                    setComorbilidadError('');
                    setComorbilidadSubmitting(true);
                    try {
                      const body = {
                        id_comorbilidad: idCom,
                        fecha_deteccion: comorbilidadForm.fecha_deteccion || undefined,
                        observaciones: comorbilidadForm.observaciones?.trim() || undefined,
                        anos_padecimiento: comorbilidadForm.anos_padecimiento
                          ? Number.parseInt(comorbilidadForm.anos_padecimiento, 10)
                          : undefined,
                        es_diagnostico_basal: !!comorbilidadForm.es_diagnostico_basal,
                        [ANIO_DIAGNOSTICO_FIELD]: comorbilidadForm[ANIO_DIAGNOSTICO_FIELD]
                          ? Number.parseInt(comorbilidadForm[ANIO_DIAGNOSTICO_FIELD], 10)
                          : undefined,
                        es_agregado_posterior: !!comorbilidadForm.es_agregado_posterior,
                        recibe_tratamiento_no_farmacologico: !!comorbilidadForm.recibe_tratamiento_no_farmacologico,
                        recibe_tratamiento_farmacologico: !!comorbilidadForm.recibe_tratamiento_farmacologico,
                      };
                      if (editingComorbilidad) {
                        const idRel = editingComorbilidad.id ?? editingComorbilidad.id_relacion ?? editingComorbilidad.id_paciente_comorbilidad;
                        if (idRel) {
                          await apiUpdateComorbilidad(parsedId, idRel, body);
                          message.success('Comorbilidad actualizada');
                        }
                      } else {
                        await apiAddComorbilidad(parsedId, body);
                      }
                      setComorbilidadForm(COMORBILIDAD_FORM_INITIAL);
                      setEditingComorbilidad(null);
                      setComorbilidadModalOpen(false);
                      loadComorbilidades();
                    } catch (e) {
                      setComorbilidadError(
                        e?.response?.data?.error || e?.message || 'Error al guardar comorbilidad',
                      );
                    } finally {
                      setComorbilidadSubmitting(false);
                    }
                  }}
                >
                  {comorbilidadError && (
                    <p
                      style={{
                        margin: '0 0 0.5rem',
                        color: 'var(--color-error)',
                        fontSize: '0.9rem',
                      }}
                    >
                      {comorbilidadError}
                    </p>
                  )}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <Select
                      label="Comorbilidad"
                      placeholder="— Seleccionar comorbilidad —"
                      value={comorbilidadForm.id_comorbilidad || undefined}
                      onChange={(v) =>
                        setComorbilidadForm((f) => ({
                          ...f,
                          id_comorbilidad: v ?? '',
                        }))
                      }
                      options={[
                        { value: '', label: '— Seleccionar comorbilidad —' },
                        ...comorbilidadesCatalog.map((com) => ({
                          value: String(com.id_comorbilidad ?? com.id),
                          label: sanitizeForDisplay(com.nombre_comorbilidad ?? com.nombre) || '—',
                        })),
                      ]}
                    />
                    <Input
                      label="Fecha de detección"
                      type="date"
                      value={comorbilidadForm.fecha_deteccion}
                      onChange={(e) =>
                        setComorbilidadForm((f) => ({
                          ...f,
                          fecha_deteccion: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Observaciones (opcional)"
                      value={comorbilidadForm.observaciones}
                      onChange={(e) =>
                        setComorbilidadForm((f) => ({
                          ...f,
                          observaciones: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Años con el padecimiento (opcional)"
                      value={comorbilidadForm.anos_padecimiento}
                      onChange={(e) =>
                        setComorbilidadForm((f) => ({
                          ...f,
                          anos_padecimiento: e.target.value.replace(/[^0-9]/g, ''),
                        }))
                      }
                    />
                    <Input
                      label="Año de diagnóstico (YYYY)"
                      value={comorbilidadForm[ANIO_DIAGNOSTICO_FIELD]}
                      onChange={(e) =>
                        setComorbilidadForm((f) => ({
                          ...f,
                          [ANIO_DIAGNOSTICO_FIELD]: e.target.value.replace(/[^0-9]/g, '').slice(0, 4),
                        }))
                      }
                    />
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={!!comorbilidadForm.es_diagnostico_basal}
                        onChange={(e) => setComorbilidadForm((f) => ({ ...f, es_diagnostico_basal: e.target.checked }))}
                      />
                      Es diagnóstico basal
                    </label>
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={!!comorbilidadForm.es_agregado_posterior}
                        onChange={(e) => setComorbilidadForm((f) => ({ ...f, es_agregado_posterior: e.target.checked }))}
                      />
                      Dx. agregado posterior al basal
                    </label>
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={!!comorbilidadForm.recibe_tratamiento_no_farmacologico}
                        onChange={(e) =>
                          setComorbilidadForm((f) => ({
                            ...f,
                            recibe_tratamiento_no_farmacologico: e.target.checked,
                          }))
                        }
                      />
                      Recibe tratamiento no farmacológico
                    </label>
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={!!comorbilidadForm.recibe_tratamiento_farmacologico}
                        onChange={(e) =>
                          setComorbilidadForm((f) => ({
                            ...f,
                            recibe_tratamiento_farmacologico: e.target.checked,
                          }))
                        }
                      />
                      Recibe tratamiento farmacológico
                    </label>
                  </div>
                </Modal>
              </div>
            )}
          </Card>
        );
      case 'detecciones': {
        const deteccionIdForApi = (d) => d.id_deteccion ?? d.id;
        const openNuevaDeteccion = () => {
          setDeteccionCreating(true);
          setEditingDeteccion(null);
          setDeteccionEditForm({
            ...DETECCION_FORM_INITIAL,
            fecha_deteccion: new Date().toISOString().slice(0, 10),
          });
        };
        return (
          <Card className="patient-section-card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <h2 className="patient-section-title" style={{ margin: 0 }}>Detecciones de complicaciones</h2>
              {canEditMedical && (
                <Button type="button" variant="primary" onClick={openNuevaDeteccion}>
                  Nueva complicación
                </Button>
              )}
            </div>
            {deteccionesComplicacionesLoading ? (
              <LoadingSpinner />
            ) : (deteccionesComplicaciones.data?.length ?? 0) === 0 ? (
              <EmptyState message="No hay detecciones de complicaciones" />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {(deteccionesComplicaciones.data || []).map((d, i) => (
                  <li
                    key={d.id_deteccion ?? d.id ?? i}
                    style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-borde-claro)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
                  >
                    <div>
                      {formatDate(d.fecha_deteccion ?? d.fecha_creacion)} — {sanitizeForDisplay(d.tipo_complicacion ?? d.Comorbilidad?.nombre_comorbilidad) || 'Complicación'}
                      {d.fecha_diagnostico && ` · Dx: ${formatDate(d.fecha_diagnostico)}`}
                      {d.observaciones && ` — ${sanitizeForDisplay(d.observaciones)}`}
                    </div>
                    {canEditMedical && (
                      <span style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button
                          type="button"
                          size="small"
                          variant="primary"
                          onClick={() => {
                            setDeteccionCreating(false);
                            setEditingDeteccion(d);
                            setDeteccionEditForm({
                              ...DETECCION_FORM_INITIAL,
                              tipo_complicacion: d.tipo_complicacion ?? '',
                              fecha_deteccion: d.fecha_deteccion ? String(d.fecha_deteccion).slice(0, 10) : '',
                              fecha_diagnostico: d.fecha_diagnostico ? String(d.fecha_diagnostico).slice(0, 10) : '',
                              observaciones: d.observaciones ?? '',
                              exploracion_pies: !!d.exploracion_pies,
                              exploracion_fondo_ojo: !!d.exploracion_fondo_ojo,
                              realiza_auto_monitoreo: !!d.realiza_auto_monitoreo,
                              auto_monitoreo_glucosa: !!d.auto_monitoreo_glucosa,
                              auto_monitoreo_presion: !!d.auto_monitoreo_presion,
                              microalbuminuria_realizada: !!d.microalbuminuria_realizada,
                              microalbuminuria_resultado:
                                d.microalbuminuria_resultado != null ? String(d.microalbuminuria_resultado) : '',
                              fue_referido: !!d.fue_referido,
                              referencia_observaciones: d.referencia_observaciones ?? '',
                            });
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          type="button"
                          size="small"
                          variant="secondary"
                          onClick={async () => {
                            const idDet = deteccionIdForApi(d);
                            if (!idDet) return;
                            if (!window.confirm('¿Eliminar esta detección?')) return;
                            try {
                              await apiDeleteDeteccionComplicacion(parsedId, idDet);
                              loadDeteccionesComplicaciones();
                            } catch (e) {
                              message.error(e?.response?.data?.error || e?.message || 'Error al eliminar');
                            }
                          }}
                        >
                          Eliminar
                        </Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {deteccionesComplicaciones.total > (deteccionesComplicaciones.data?.length ?? 0) && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>Total: {deteccionesComplicaciones.total}</p>
            )}
            {canEditMedical && (editingDeteccion || deteccionCreating) && (
              <Modal
                open={!!(editingDeteccion || deteccionCreating)}
                onClose={() => {
                  setEditingDeteccion(null);
                  setDeteccionCreating(false);
                }}
                title={deteccionCreating ? 'Nueva complicación' : 'Editar detección'}
                okText={deteccionCreating ? 'Registrar' : 'Guardar cambios'}
                onOk={async () => {
                  try {
                    if (deteccionCreating) {
                      const tipo = deteccionEditForm.tipo_complicacion?.trim();
                      if (!tipo) {
                        message.warning('Indica el tipo o descripción de la complicación');
                        throw new Error('VALIDATION');
                      }
                      await apiCreateDeteccionComplicacion(parsedId, {
                        tipo_complicacion: tipo,
                        fecha_deteccion: deteccionEditForm.fecha_deteccion || undefined,
                        fecha_diagnostico: deteccionEditForm.fecha_diagnostico || undefined,
                        observaciones: deteccionEditForm.observaciones?.trim() || undefined,
                        exploracion_pies: !!deteccionEditForm.exploracion_pies,
                        exploracion_fondo_ojo: !!deteccionEditForm.exploracion_fondo_ojo,
                        realiza_auto_monitoreo: !!deteccionEditForm.realiza_auto_monitoreo,
                        auto_monitoreo_glucosa: !!deteccionEditForm.auto_monitoreo_glucosa,
                        auto_monitoreo_presion: !!deteccionEditForm.auto_monitoreo_presion,
                        microalbuminuria_realizada: !!deteccionEditForm.microalbuminuria_realizada,
                        microalbuminuria_resultado:
                          deteccionEditForm.microalbuminuria_realizada &&
                          Number.isFinite(Number.parseFloat(deteccionEditForm.microalbuminuria_resultado))
                            ? Number.parseFloat(deteccionEditForm.microalbuminuria_resultado)
                            : undefined,
                        fue_referido: !!deteccionEditForm.fue_referido,
                        referencia_observaciones: deteccionEditForm.fue_referido
                          ? deteccionEditForm.referencia_observaciones?.trim() || undefined
                          : undefined,
                      });
                      message.success('Complicación registrada');
                      setDeteccionCreating(false);
                    } else {
                      await apiUpdateDeteccionComplicacion(parsedId, deteccionIdForApi(editingDeteccion), {
                        tipo_complicacion: deteccionEditForm.tipo_complicacion?.trim() || undefined,
                        fecha_deteccion: deteccionEditForm.fecha_deteccion || undefined,
                        fecha_diagnostico: deteccionEditForm.fecha_diagnostico || undefined,
                        observaciones: deteccionEditForm.observaciones?.trim() || undefined,
                        exploracion_pies: !!deteccionEditForm.exploracion_pies,
                        exploracion_fondo_ojo: !!deteccionEditForm.exploracion_fondo_ojo,
                        realiza_auto_monitoreo: !!deteccionEditForm.realiza_auto_monitoreo,
                        auto_monitoreo_glucosa: !!deteccionEditForm.auto_monitoreo_glucosa,
                        auto_monitoreo_presion: !!deteccionEditForm.auto_monitoreo_presion,
                        microalbuminuria_realizada: !!deteccionEditForm.microalbuminuria_realizada,
                        microalbuminuria_resultado:
                          deteccionEditForm.microalbuminuria_realizada &&
                          Number.isFinite(Number.parseFloat(deteccionEditForm.microalbuminuria_resultado))
                            ? Number.parseFloat(deteccionEditForm.microalbuminuria_resultado)
                            : undefined,
                        fue_referido: !!deteccionEditForm.fue_referido,
                        referencia_observaciones: deteccionEditForm.fue_referido
                          ? deteccionEditForm.referencia_observaciones?.trim() || undefined
                          : undefined,
                      });
                      message.success('Detección actualizada');
                      setEditingDeteccion(null);
                    }
                    loadDeteccionesComplicaciones();
                  } catch (e) {
                    if (e?.message === 'VALIDATION') return;
                    message.error(e?.response?.data?.error || e?.message || 'Error al guardar');
                  }
                }}
              >
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <Input
                    label="Tipo o descripción de la complicación"
                    value={deteccionEditForm.tipo_complicacion}
                    onChange={(e) => setDeteccionEditForm((f) => ({ ...f, tipo_complicacion: e.target.value }))}
                    placeholder="Ej. Neuropatía periférica leve"
                  />
                  <Input
                    label="Fecha detección"
                    type="date"
                    value={deteccionEditForm.fecha_deteccion}
                    onChange={(e) => setDeteccionEditForm((f) => ({ ...f, fecha_deteccion: e.target.value }))}
                  />
                  <Input
                    label="Fecha diagnóstico"
                    type="date"
                    value={deteccionEditForm.fecha_diagnostico}
                    onChange={(e) => setDeteccionEditForm((f) => ({ ...f, fecha_diagnostico: e.target.value }))}
                  />
                  <Input
                    label="Observaciones"
                    value={deteccionEditForm.observaciones}
                    onChange={(e) => setDeteccionEditForm((f) => ({ ...f, observaciones: e.target.value }))}
                  />
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={!!deteccionEditForm.exploracion_pies}
                      onChange={(e) => setDeteccionEditForm((f) => ({ ...f, exploracion_pies: e.target.checked }))}
                    />
                    Exploración de pies
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={!!deteccionEditForm.exploracion_fondo_ojo}
                      onChange={(e) => setDeteccionEditForm((f) => ({ ...f, exploracion_fondo_ojo: e.target.checked }))}
                    />
                    Exploración de fondo de ojo
                  </label>
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={!!deteccionEditForm.realiza_auto_monitoreo}
                      onChange={(e) =>
                        setDeteccionEditForm((f) => ({
                          ...f,
                          realiza_auto_monitoreo: e.target.checked,
                          auto_monitoreo_glucosa: e.target.checked ? f.auto_monitoreo_glucosa : false,
                          auto_monitoreo_presion: e.target.checked ? f.auto_monitoreo_presion : false,
                        }))
                      }
                    />
                    Realiza auto-monitoreo
                  </label>
                  {deteccionEditForm.realiza_auto_monitoreo && (
                    <>
                      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={!!deteccionEditForm.auto_monitoreo_glucosa}
                          onChange={(e) =>
                            setDeteccionEditForm((f) => ({ ...f, auto_monitoreo_glucosa: e.target.checked }))
                          }
                        />
                        Auto-monitoreo glucosa
                      </label>
                      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={!!deteccionEditForm.auto_monitoreo_presion}
                          onChange={(e) =>
                            setDeteccionEditForm((f) => ({ ...f, auto_monitoreo_presion: e.target.checked }))
                          }
                        />
                        Auto-monitoreo presión
                      </label>
                    </>
                  )}
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={!!deteccionEditForm.microalbuminuria_realizada}
                      onChange={(e) =>
                        setDeteccionEditForm((f) => ({
                          ...f,
                          microalbuminuria_realizada: e.target.checked,
                          microalbuminuria_resultado: e.target.checked ? f.microalbuminuria_resultado : '',
                        }))
                      }
                    />
                    Microalbuminuria realizada
                  </label>
                  {deteccionEditForm.microalbuminuria_realizada && (
                    <Input
                      label="Resultado de microalbuminuria"
                      value={deteccionEditForm.microalbuminuria_resultado}
                      onChange={(e) =>
                        setDeteccionEditForm((f) => ({
                          ...f,
                          microalbuminuria_resultado: e.target.value.replace(/[^0-9.]/g, ''),
                        }))
                      }
                      placeholder="Ej. 25.5"
                    />
                  )}
                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={!!deteccionEditForm.fue_referido}
                      onChange={(e) =>
                        setDeteccionEditForm((f) => ({
                          ...f,
                          fue_referido: e.target.checked,
                          referencia_observaciones: e.target.checked ? f.referencia_observaciones : '',
                        }))
                      }
                    />
                    Fue referido a otro nivel
                  </label>
                  {deteccionEditForm.fue_referido && (
                    <TextArea
                      label="Observaciones de referencia"
                      value={deteccionEditForm.referencia_observaciones}
                      onChange={(e) => setDeteccionEditForm((f) => ({ ...f, referencia_observaciones: e.target.value }))}
                      rows={3}
                    />
                  )}
                </div>
              </Modal>
            )}
          </Card>
        );
      }
      case 'sesiones-educativas':
        return (
          <Card className="patient-section-card">
            <h2 className="patient-section-title">Sesiones educativas</h2>
            {sesionesEducativasLoading ? (
              <LoadingSpinner />
            ) : (sesionesEducativas.data?.length ?? 0) === 0 ? (
              <EmptyState message="No hay sesiones educativas" />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {(sesionesEducativas.data || []).map((s, i) => {
                  const id = s.id_sesion ?? s.id ?? i;
                  return (
                    <li
                      key={id}
                      style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-borde-claro)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
                    >
                      <div>
                        {formatDate(s.fecha_sesion ?? s.fecha_registro ?? s.fecha)} — {sanitizeForDisplay(s.tipo_sesion) || '—'}
                        {(s.asistio != null || s.numero_intervenciones != null) && (
                          <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.25rem' }}>
                            {s.asistio != null && (s.asistio ? 'Asistió' : 'No asistió')}
                            {s.asistio != null && s.numero_intervenciones != null && ' · '}
                            {s.numero_intervenciones != null && `${s.numero_intervenciones} intervención(es)`}
                          </span>
                        )}
                        {s.observaciones && (
                          <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.25rem' }}>
                            {sanitizeForDisplay(s.observaciones)}
                          </span>
                        )}
                      </div>
                      {canEditMedical && (
                        <span style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            type="button"
                            size="small"
                            variant="primary"
                            onClick={() => {
                              setSesionError('');
                              setSesionForm({
                                fecha_sesion: s.fecha_sesion ? String(s.fecha_sesion).slice(0, 10) : '',
                                tipo_sesion: s.tipo_sesion ?? '',
                                asistio: !!s.asistio,
                                numero_intervenciones: s.numero_intervenciones != null ? String(s.numero_intervenciones) : '1',
                                id_cita: s.id_cita != null ? String(s.id_cita) : '',
                                observaciones: s.observaciones ?? '',
                              });
                              setEditingSesion(s);
                              setSesionModalOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="small"
                            variant="secondary"
                            onClick={async () => {
                              if (!window.confirm('¿Eliminar esta sesión educativa?')) return;
                              try {
                                await apiDeleteSesionEducativa(parsedId, id);
                                loadSesionesEducativas();
                              } catch (e) {
                                console.error('Error al eliminar sesión educativa', e);
                              }
                            }}
                          >
                            Eliminar
                          </Button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {sesionesEducativas.total > (sesionesEducativas.data?.length ?? 0) && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>Total: {sesionesEducativas.total}</p>
            )}
            {canEditMedical && (
              <div style={{ marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setSesionError('');
                    setEditingSesion(null);
                    setSesionForm({
                      fecha_sesion: '',
                      tipo_sesion: '',
                      asistio: false,
                      numero_intervenciones: '1',
                      id_cita: '',
                      observaciones: '',
                    });
                    setSesionModalOpen(true);
                  }}
                >
                  Agregar sesión educativa
                </Button>
                <Modal
                  open={sesionModalOpen}
                  onClose={() => {
                    if (!sesionSubmitting) {
                      setSesionModalOpen(false);
                      setEditingSesion(null);
                    }
                  }}
                  title={editingSesion ? 'Editar sesión educativa' : 'Nueva sesión educativa'}
                  okText={sesionSubmitting ? 'Guardando…' : (editingSesion ? 'Guardar cambios' : 'Guardar sesión')}
                  confirmLoading={sesionSubmitting}
                  onOk={async () => {
                    const fecha = (sesionForm.fecha_sesion || '').trim();
                    const tipo = (sesionForm.tipo_sesion || '').trim();
                    if (!fecha || !tipo) {
                      setSesionError('Fecha y tipo de sesión son obligatorios.');
                      return;
                    }
                    setSesionError('');
                    setSesionSubmitting(true);
                    try {
                      const numInterv = parseInt(sesionForm.numero_intervenciones, 10);
                      const idCitaVal = (sesionForm.id_cita || '').trim();
                      const body = {
                        fecha_sesion: fecha,
                        tipo_sesion: tipo,
                        asistio: !!sesionForm.asistio,
                        numero_intervenciones: (Number.isNaN(numInterv) || numInterv < 1) ? 1 : numInterv,
                        observaciones: sesionForm.observaciones?.trim() || undefined,
                      };
                      if (idCitaVal) {
                        const citaId = parseInt(idCitaVal, 10);
                        if (!Number.isNaN(citaId) && citaId > 0) body.id_cita = citaId;
                      }
                      if (editingSesion) {
                        await apiUpdateSesionEducativa(parsedId, editingSesion.id_sesion ?? editingSesion.id, body);
                        message.success('Sesión actualizada');
                      } else {
                        await apiCreateSesionEducativa(parsedId, body);
                      }
                      setSesionForm({
                        fecha_sesion: '',
                        tipo_sesion: '',
                        asistio: false,
                        numero_intervenciones: '1',
                        id_cita: '',
                        observaciones: '',
                      });
                      setEditingSesion(null);
                      setSesionModalOpen(false);
                      loadSesionesEducativas();
                    } catch (e) {
                      setSesionError(e?.response?.data?.error || e?.message || 'Error al guardar sesión educativa');
                    } finally {
                      setSesionSubmitting(false);
                    }
                  }}
                >
                  {sesionError && (
                    <p style={{ margin: '0 0 0.75rem', color: 'var(--color-error)', fontSize: '0.9rem' }}>
                      {sesionError}
                    </p>
                  )}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <Input
                      label="Fecha de sesión"
                      type="date"
                      value={sesionForm.fecha_sesion}
                      onChange={(e) => setSesionForm((f) => ({ ...f, fecha_sesion: e.target.value }))}
                    />
                    <Select
                      label="Tipo de sesión"
                      placeholder="Seleccionar tipo"
                      value={sesionForm.tipo_sesion || undefined}
                      onChange={(v) => setSesionForm((f) => ({ ...f, tipo_sesion: v ?? '' }))}
                      options={[
                        { value: 'nutricional', label: 'Nutricional' },
                        { value: 'actividad_fisica', label: 'Actividad física' },
                        { value: 'medico_preventiva', label: 'Médico preventiva' },
                        { value: 'trabajo_social', label: 'Trabajo social' },
                        { value: 'psicologica', label: 'Psicológica' },
                        { value: 'odontologica', label: 'Odontológica' },
                      ]}
                    />
                    <Input
                      label="Número de intervenciones"
                      type="number"
                      min={1}
                      value={sesionForm.numero_intervenciones}
                      onChange={(e) => setSesionForm((f) => ({ ...f, numero_intervenciones: e.target.value.replace(/[^0-9]/g, '') || '1' }))}
                    />
                    <Select
                      label="Vincular a cita"
                      placeholder={sesionCitasLoading ? 'Cargando citas…' : 'Seleccionar cita'}
                      value={sesionForm.id_cita === '' ? '__ninguna__' : (sesionForm.id_cita || '__ninguna__')}
                      onChange={(v) => setSesionForm((f) => ({ ...f, id_cita: v && v !== '__ninguna__' ? String(v) : '' }))}
                      disabled={sesionCitasLoading}
                      options={[
                        { value: '__ninguna__', label: 'Ninguna' },
                        ...(sesionCitasOpciones || []).map((c) => ({
                          value: String(c.id_cita ?? c.id),
                          label: `${formatDate(c.fecha_cita)} — ${sanitizeForDisplay(c.motivo_consulta || c.motivo || c.estado) || 'Cita'}`,
                        })),
                      ]}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <input
                        type="checkbox"
                        id="sesion-asistio"
                        checked={!!sesionForm.asistio}
                        onChange={(e) => setSesionForm((f) => ({ ...f, asistio: e.target.checked }))}
                      />
                      <label htmlFor="sesion-asistio" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                        Asistió a sesión educativa
                      </label>
                    </div>
                    <Input
                      label="Observaciones (opcional)"
                      value={sesionForm.observaciones}
                      onChange={(e) => setSesionForm((f) => ({ ...f, observaciones: e.target.value }))}
                    />
                  </div>
                </Modal>
              </div>
            )}
          </Card>
        );
      case 'salud-bucal':
        return (
          <Card className="patient-section-card">
            <h2 className="patient-section-title">Salud bucal</h2>
            {saludBucalLoading ? (
              <LoadingSpinner />
            ) : (saludBucal.data?.length ?? 0) === 0 ? (
              <EmptyState message="No hay registros de salud bucal" />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {(saludBucal.data || []).map((r, i) => {
                  const id = r.id_salud_bucal ?? r.id ?? i;
                  return (
                    <li
                      key={id}
                      style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-borde-claro)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
                    >
                      <div>
                        {formatDate(r.fecha_registro ?? r.fecha)} —{' '}
                        {r.presenta_enfermedades_odontologicas ? 'Con enfermedades odontológicas' : 'Sin enfermedades odontológicas'}
                        {r.observaciones && (
                          <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.25rem' }}>
                            {sanitizeForDisplay(r.observaciones)}
                          </span>
                        )}
                      </div>
                      {canEditMedical && (
                        <span style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            type="button"
                            size="small"
                            variant="primary"
                            onClick={() => {
                              setSaludError('');
                              setSaludForm({
                                fecha_registro: r.fecha_registro ? String(r.fecha_registro).slice(0, 10) : '',
                                presenta_enfermedades_odontologicas: !!r.presenta_enfermedades_odontologicas,
                                recibio_tratamiento_odontologico: !!r.recibio_tratamiento_odontologico,
                                observaciones: r.observaciones ?? '',
                              });
                              setEditingSalud(r);
                              setSaludModalOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="small"
                            variant="secondary"
                            onClick={async () => {
                              if (!window.confirm('¿Eliminar este registro de salud bucal?')) return;
                              try {
                                await apiDeleteSaludBucal(parsedId, id);
                                loadSaludBucal();
                              } catch (e) {
                                console.error('Error al eliminar salud bucal', e);
                              }
                            }}
                          >
                            Eliminar
                          </Button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {saludBucal.total > (saludBucal.data?.length ?? 0) && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>Total: {saludBucal.total}</p>
            )}
            {canEditMedical && (
              <div style={{ marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setSaludError('');
                    setEditingSalud(null);
                    setSaludForm({
                      fecha_registro: '',
                      presenta_enfermedades_odontologicas: false,
                      recibio_tratamiento_odontologico: false,
                      observaciones: '',
                    });
                    setSaludModalOpen(true);
                  }}
                >
                  Agregar registro de salud bucal
                </Button>
                <Modal
                  open={saludModalOpen}
                  onClose={() => {
                    if (!saludSubmitting) {
                      setSaludModalOpen(false);
                      setEditingSalud(null);
                    }
                  }}
                  title={editingSalud ? 'Editar registro de salud bucal' : 'Nuevo registro de salud bucal'}
                  okText={saludSubmitting ? 'Guardando…' : (editingSalud ? 'Guardar cambios' : 'Guardar registro')}
                  confirmLoading={saludSubmitting}
                  onOk={async () => {
                    const fecha = (saludForm.fecha_registro || '').trim();
                    if (!fecha) {
                      setSaludError('La fecha de registro es obligatoria.');
                      return;
                    }
                    setSaludError('');
                    setSaludSubmitting(true);
                    try {
                      const body = {
                        fecha_registro: fecha,
                        presenta_enfermedades_odontologicas: !!saludForm.presenta_enfermedades_odontologicas,
                        recibio_tratamiento_odontologico: !!saludForm.recibio_tratamiento_odontologico,
                        observaciones: saludForm.observaciones?.trim() || undefined,
                      };
                      if (editingSalud) {
                        await apiUpdateSaludBucal(parsedId, editingSalud.id_salud_bucal ?? editingSalud.id, body);
                        message.success('Registro actualizado');
                      } else {
                        await apiCreateSaludBucal(parsedId, body);
                      }
                      setSaludForm({
                        fecha_registro: '',
                        presenta_enfermedades_odontologicas: false,
                        recibio_tratamiento_odontologico: false,
                        observaciones: '',
                      });
                      setEditingSalud(null);
                      setSaludModalOpen(false);
                      loadSaludBucal();
                    } catch (e) {
                      setSaludError(
                        e?.response?.data?.error ||
                          e?.message ||
                          'Error al guardar registro de salud bucal',
                      );
                    } finally {
                      setSaludSubmitting(false);
                    }
                  }}
                >
                  {saludError && (
                    <p
                      style={{
                        margin: '0 0 0.5rem',
                        color: 'var(--color-error)',
                        fontSize: '0.9rem',
                      }}
                    >
                      {saludError}
                    </p>
                  )}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <Input
                      label="Fecha de registro"
                      type="date"
                      value={saludForm.fecha_registro}
                      onChange={(e) =>
                        setSaludForm((f) => ({ ...f, fecha_registro: e.target.value }))
                      }
                    />
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={saludForm.presenta_enfermedades_odontologicas}
                        onChange={(e) =>
                          setSaludForm((f) => ({
                            ...f,
                            presenta_enfermedades_odontologicas: e.target.checked,
                          }))
                        }
                      />
                      Presenta enfermedades odontológicas
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={saludForm.recibio_tratamiento_odontologico}
                        onChange={(e) =>
                          setSaludForm((f) => ({
                            ...f,
                            recibio_tratamiento_odontologico: e.target.checked,
                          }))
                        }
                      />
                      Recibió tratamiento odontológico
                    </label>
                    <Input
                      label="Observaciones (opcional)"
                      value={saludForm.observaciones}
                      onChange={(e) =>
                        setSaludForm((f) => ({ ...f, observaciones: e.target.value }))
                      }
                    />
                  </div>
                </Modal>
              </div>
            )}
          </Card>
        );
      case 'detecciones-tb':
        return (
          <Card className="patient-section-card">
            <h2 className="patient-section-title">Detección de tuberculosis</h2>
            {deteccionesTuberculosisLoading ? (
              <LoadingSpinner />
            ) : (deteccionesTuberculosis.data?.length ?? 0) === 0 ? (
              <EmptyState message="No hay detecciones de tuberculosis" />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {(deteccionesTuberculosis.data || []).map((d, i) => {
                  const id = d.id_deteccion_tb ?? d.id ?? i;
                  return (
                    <li
                      key={id}
                      style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-borde-claro)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
                    >
                      <div>
                        {formatDate(d.fecha_deteccion ?? d.fecha)} — {d.baciloscopia_resultado ? `Baciloscopia: ${sanitizeForDisplay(d.baciloscopia_resultado)}` : 'Detección'}
                        {d.observaciones && (
                          <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.25rem' }}>
                            {sanitizeForDisplay(d.observaciones)}
                          </span>
                        )}
                      </div>
                      {canEditMedical && (
                        <span style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            type="button"
                            size="small"
                            variant="primary"
                            onClick={() => {
                              setTbError('');
                              setTbForm({
                                fecha_deteccion: d.fecha_deteccion ? String(d.fecha_deteccion).slice(0, 10) : '',
                                aplicacion_encuesta: !!d.aplicacion_encuesta,
                                baciloscopia_realizada: !!d.baciloscopia_realizada,
                                baciloscopia_resultado: d.baciloscopia_resultado ?? '',
                                ingreso_tratamiento: !!d.ingreso_tratamiento,
                                observaciones: d.observaciones ?? '',
                              });
                              setEditingTb(d);
                              setTbModalOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            type="button"
                            size="small"
                            variant="secondary"
                            onClick={async () => {
                              if (!window.confirm('¿Eliminar esta detección de tuberculosis?')) return;
                              try {
                                await apiDeleteDeteccionTb(parsedId, id);
                                loadDeteccionesTuberculosis();
                              } catch (e) {
                                console.error('Error al eliminar detección de tuberculosis', e);
                              }
                            }}
                          >
                            Eliminar
                          </Button>
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {deteccionesTuberculosis.total > (deteccionesTuberculosis.data?.length ?? 0) && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>Total: {deteccionesTuberculosis.total}</p>
            )}
            {canEditMedical && (
              <div style={{ marginTop: '1.5rem' }}>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setTbError('');
                    setEditingTb(null);
                    setTbForm({
                      fecha_deteccion: '',
                      aplicacion_encuesta: false,
                      baciloscopia_realizada: false,
                      baciloscopia_resultado: '',
                      ingreso_tratamiento: false,
                      observaciones: '',
                    });
                    setTbModalOpen(true);
                  }}
                >
                  Agregar detección de tuberculosis
                </Button>
                <Modal
                  open={tbModalOpen}
                  onClose={() => {
                    if (!tbSubmitting) {
                      setTbModalOpen(false);
                      setEditingTb(null);
                    }
                  }}
                  title={editingTb ? 'Editar detección de tuberculosis' : 'Nueva detección de tuberculosis'}
                  okText={tbSubmitting ? 'Guardando…' : (editingTb ? 'Guardar cambios' : 'Guardar detección')}
                  confirmLoading={tbSubmitting}
                  onOk={async () => {
                    const fecha = (tbForm.fecha_deteccion || '').trim();
                    if (!fecha) {
                      setTbError('La fecha de detección es obligatoria.');
                      return;
                    }
                    setTbError('');
                    setTbSubmitting(true);
                    try {
                      const body = {
                        fecha_deteccion: fecha,
                        aplicacion_encuesta: !!tbForm.aplicacion_encuesta,
                        baciloscopia_realizada: !!tbForm.baciloscopia_realizada,
                        baciloscopia_resultado: tbForm.baciloscopia_resultado?.trim() || undefined,
                        ingreso_tratamiento: !!tbForm.ingreso_tratamiento,
                        observaciones: tbForm.observaciones?.trim() || undefined,
                      };
                      if (editingTb) {
                        await apiUpdateDeteccionTb(parsedId, editingTb.id_deteccion_tb ?? editingTb.id, body);
                        message.success('Detección actualizada');
                      } else {
                        await apiCreateDeteccionTb(parsedId, body);
                      }
                      setTbForm({
                        fecha_deteccion: '',
                        aplicacion_encuesta: false,
                        baciloscopia_realizada: false,
                        baciloscopia_resultado: '',
                        ingreso_tratamiento: false,
                        observaciones: '',
                      });
                      setEditingTb(null);
                      setTbModalOpen(false);
                      loadDeteccionesTuberculosis();
                    } catch (e) {
                      setTbError(
                        e?.response?.data?.error ||
                          e?.message ||
                          'Error al guardar detección de tuberculosis',
                      );
                    } finally {
                      setTbSubmitting(false);
                    }
                  }}
                >
                  {tbError && (
                    <p
                      style={{
                        margin: '0 0 0.5rem',
                        color: 'var(--color-error)',
                        fontSize: '0.9rem',
                      }}
                    >
                      {tbError}
                    </p>
                  )}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <Input
                      label="Fecha de detección"
                      type="date"
                      value={tbForm.fecha_deteccion}
                      onChange={(e) =>
                        setTbForm((f) => ({ ...f, fecha_deteccion: e.target.value }))
                      }
                    />
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={tbForm.aplicacion_encuesta}
                        onChange={(e) =>
                          setTbForm((f) => ({ ...f, aplicacion_encuesta: e.target.checked }))
                        }
                      />
                      Aplicación de encuesta
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={tbForm.baciloscopia_realizada}
                        onChange={(e) =>
                          setTbForm((f) => ({
                            ...f,
                            baciloscopia_realizada: e.target.checked,
                          }))
                        }
                      />
                      Baciloscopia realizada
                    </label>
                    <Input
                      label="Resultado baciloscopia (opcional)"
                      value={tbForm.baciloscopia_resultado}
                      onChange={(e) =>
                        setTbForm((f) => ({ ...f, baciloscopia_resultado: e.target.value }))
                      }
                    />
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={tbForm.ingreso_tratamiento}
                        onChange={(e) =>
                          setTbForm((f) => ({
                            ...f,
                            ingreso_tratamiento: e.target.checked,
                          }))
                        }
                      />
                      Ingreso a tratamiento
                    </label>
                    <Input
                      label="Observaciones (opcional)"
                      value={tbForm.observaciones}
                      onChange={(e) =>
                        setTbForm((f) => ({ ...f, observaciones: e.target.value }))
                      }
                    />
                  </div>
                </Modal>
              </div>
            )}
          </Card>
        );
      case 'doctores': {
        const assignedIds = new Set((doctoresAsignados || []).map((d) => d.id_doctor));
        const doctoresDisponibles = listaDoctores.filter((d) => !assignedIds.has(d.id_doctor));
        const handleAsignar = async () => {
          const idDoctor = assignDoctorId ? parseInt(assignDoctorId, 10) : 0;
          if (!idDoctor) {
            setAssignError('Selecciona un doctor');
            return;
          }
          setAssignError('');
          setAssigning(true);
          try {
            await assignDoctorToPaciente(parsedId, { id_doctor: idDoctor });
            setAssignDoctorId('');
            loadDoctoresAsignados();
            setAssignDoctorModalOpen(false);
          } catch (e) {
            setAssignError(e?.response?.data?.error || e?.message || 'Error al asignar');
          } finally {
            setAssigning(false);
          }
        };
        const handleDesasignar = async (doctorId) => {
          if (!window.confirm('¿Desasignar a este doctor del paciente?')) return;
          try {
            await unassignDoctorFromPaciente(parsedId, doctorId);
            loadDoctoresAsignados();
          } catch (e) {
            setAssignError(e?.response?.data?.error || e?.message || 'Error al desasignar');
          }
        };
        return (
          <Card className="patient-section-card">
            <h2 className="patient-section-title">Doctores asignados</h2>
            {doctoresAsignadosLoading ? (
              <LoadingSpinner />
            ) : (doctoresAsignados?.length ?? 0) === 0 ? (
              <EmptyState message="No hay doctores asignados" />
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {doctoresAsignados.map((d, i) => (
                  <li key={d.id_doctor ?? i} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--color-borde-claro)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <strong>{sanitizeForDisplay(d.nombre_completo) || '—'}</strong>
                      {d.fecha_asignacion && <span style={{ marginLeft: '0.5rem', color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>({formatDate(d.fecha_asignacion)})</span>}
                      {d.observaciones && <div style={{ fontSize: '0.9rem', color: 'var(--color-texto-secundario)' }}>{sanitizeForDisplay(d.observaciones)}</div>}
                    </div>
                    {isAdmin() && (
                      <Button variant="secondary" size="small" onClick={() => handleDesasignar(d.id_doctor)}>Desasignar</Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {(doctoresAsignados?.length ?? 0) > 0 && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
                <button type="button" onClick={() => setShowAllDoctoresOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--color-primario)', cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit' }}>
                  Ver listado completo
                </button>
              </p>
            )}
            {isAdmin() && (
              <div style={{ marginTop: '1rem' }}>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => {
                    setAssignError('');
                    setAssignDoctorId('');
                    setAssignDoctorModalOpen(true);
                  }}
                >
                  Asignar doctor
                </Button>
                <Modal
                  open={assignDoctorModalOpen}
                  onClose={() => {
                    if (!assigning) {
                      setAssignDoctorModalOpen(false);
                    }
                  }}
                  title="Asignar doctor al paciente"
                  okText={assigning ? 'Asignando…' : 'Asignar'}
                  confirmLoading={assigning}
                  onOk={handleAsignar}
                >
                  {assignError && (
                    <p
                      style={{
                        color: 'var(--color-error)',
                        margin: '0 0 0.5rem',
                        fontSize: '0.9rem',
                      }}
                    >
                      {assignError}
                    </p>
                  )}
                  <Select
                    label="Seleccionar doctor"
                    placeholder="Seleccionar doctor"
                    value={assignDoctorId || undefined}
                    onChange={(v) => setAssignDoctorId(v ?? '')}
                    options={[
                      { value: '', label: 'Seleccionar doctor' },
                      ...doctoresDisponibles.map((doc) => ({
                        value: String(doc.id_doctor),
                        label:
                          sanitizeForDisplay(formatNombreCompleto(doc)) || String(doc.id_doctor),
                      })),
                    ]}
                    style={{ marginBottom: 0 }}
                  />
                </Modal>
              </div>
            )}
          </Card>
        );
      }
      case 'graficos':
        return (
          <Card className="patient-section-card">
            <h2 className="patient-section-title">Gráficos de evolución</h2>
            <PacienteGraficosEvolucion
              signosData={chartSignos.data}
              signosLoading={chartSignosLoading}
              signosError={chartSignosError}
              onRetry={loadChartSignos}
              onFilterChange={loadChartSignos}
            />
          </Card>
        );
      default:
        return null;
    }
  };

  const initials = (() => {
    const full = formatNombreCompleto(p);
    if (!full) return '?';
    const parts = full.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((x) => (x || '').charAt(0)).join('').toUpperCase() || '?';
  })();

  return (
    <div className="patient-detail-page">
      <a href="/pacientes" className="patient-back" onClick={(e) => { e.preventDefault(); navigate('/pacientes'); }} aria-label="Volver a lista de pacientes">
        ← Volver a Pacientes
      </a>

      <header className="patient-header-card">
        <div className="patient-header-top">
          <div className="patient-avatar" aria-hidden="true">{initials}</div>
          <div className="patient-header-info">
            <h1>{nombreCompleto}</h1>
            <div className="patient-meta">
              {p.edad != null && <span>Edad: {p.edad} años</span>}
              {p.fecha_nacimiento && <span>Fecha nac.: {formatDate(p.fecha_nacimiento)}</span>}
              {(p.numero_celular || p.telefono) && <span>Tel: {sanitizeForDisplay(p.numero_celular ?? p.telefono)}</span>}
              {p.curp && <span>CURP: {sanitizeForDisplay(p.curp)}</span>}
            </div>
            {(() => {
              const comorbHeader = Array.isArray(p.comorbilidades)
                ? p.comorbilidades
                    .map((c) => (typeof c === 'object' && (c?.nombre || c?.nombre_comorbilidad) ? c.nombre || c.nombre_comorbilidad : String(c)))
                    .filter(Boolean)
                : [];
              return comorbHeader.length > 0 ? (
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.25rem', marginBottom: '0.25rem' }}>
                  Comorbilidades: {comorbHeader.map((n) => sanitizeForDisplay(n)).join(', ')}
                </div>
              ) : null;
            })()}
            <span className={`patient-badge-status ${p.activo ? 'is-active' : 'is-inactive'}`}>
              {p.activo ? 'Activo' : 'Inactivo'}
            </span>
            {!p.activo && (p.fecha_baja || p.motivo_baja) ? (
              <div
                style={{
                  marginTop: '0.35rem',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-texto-secundario)',
                  maxWidth: '42rem',
                }}
              >
                {p.fecha_baja ? (
                  <span style={{ display: 'block' }}>
                    <strong>Fecha de baja:</strong> {formatDate(p.fecha_baja)}
                  </span>
                ) : null}
                {p.motivo_baja ? (
                  <span style={{ display: 'block' }}>
                    <strong>Motivo:</strong> {sanitizeForDisplay(p.motivo_baja)}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="patient-header-actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            <Button variant="outline" type="button" onClick={() => setFormaModalOpen(true)}>
              {EXCEL_FORMATO_REGISTRO_MENSUAL_LABEL}
            </Button>
            <Button
              variant="outline"
              type="button"
              loading={notasMedicasLoading}
              onClick={async () => {
                if (notasMedicasLoading || !parsedId) return;
                setNotasMedicasLoading(true);
                try {
                  await openNotasMedicasPDF(parsedId);
                  message.success('Se abrió el documento. Usa Imprimir > Guardar como PDF si quieres descargar el PDF.');
                } catch (err) {
                  message.error(err?.message || 'Error al generar Notas Médicas');
                } finally {
                  setNotasMedicasLoading(false);
                }
              }}
            >
              Descargar Notas Médicas (PDF)
            </Button>
            <Button variant="outline" onClick={() => navigate(`/chat/${parsedId}`)}>
              Enviar mensaje
            </Button>
            <Button variant="outline" onClick={() => navigate(`/pacientes/${parsedId}/editar`)}>
              Editar paciente
            </Button>
          </div>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-4)',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          {resumenMedicoLoading && !resumenMedico && (
            <Card className="patient-section-card">
              <h2 className="patient-section-title">Resumen médico</h2>
              <LoadingSpinner />
            </Card>
          )}
          {resumenMedico && <MedicalSummaryCard resumen={resumenMedico} />}
        </div>
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          {citas.data?.length > 0 && (
            <ProximaCitaCard
              citas={citas.data}
              onVerCita={openDetalleCita}
              onVerTodas={() => navigate(`/citas?paciente=${parsedId}`)}
            />
          )}
        </div>
      </div>

      <div className="patient-detail-cards-grid" data-tour="paciente-detail-sections-grid">
        {PATIENT_DETAIL_SECTIONS.map((section) => (
          <SectionCard
            key={section.id}
            icon={section.icon}
            label={section.label}
            onClick={() => setModalSection(section.id)}
          />
        ))}
      </div>

      <PatientSectionModal
        open={!!modalSection}
        sectionId={modalSection}
        onClose={closePatientSectionModal}
      >
        {modalSection && renderTabContent(modalSection)}
      </PatientSectionModal>

      {patientModalTourSteps.length > 0 && (
        <Joyride
          key={modalSection ?? 'patient-modal-tour'}
          run={patientModalTourRun}
          steps={patientModalTourSteps}
          continuous
          showProgress
          showSkipButton
          disableScrollParentFix
          disableScrolling
          callback={handlePatientModalTourCallback}
          locale={JOYRIDE_LOCALE}
          styles={patientModalJoyrideStyles}
          floaterProps={{ disableAnimation: false }}
        />
      )}

      {/* Modales "Ver todo" / historial completo */}
      <Modal open={showAllSignosOpen} onClose={() => setShowAllSignosOpen(false)} title="Historial de signos vitales" footer={null} width={720}>
        {allSignosLoading ? <LoadingSpinner /> : allSignosData.length === 0 ? <EmptyState message="No hay registros" /> : (
          <ul className="tracking-list" style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {allSignosData.map((s, i) => (
              <li
                key={s.id_signo ?? s.id_signo_vital ?? s.id ?? i}
                className="tracking-item"
                style={{ cursor: 'pointer' }}
                onClick={() => { setShowAllSignosOpen(false); openDetalleSigno(s); }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowAllSignosOpen(false); openDetalleSigno(s); } }}
              >
                <span className="tracking-item-date">{formatDate(s.fecha_medicion)}</span>
                <span className="tracking-item-body">
                  Peso: {s.peso_kg ?? '—'} kg · Talla: {s.talla_m ?? '—'} m · PA: {s.presion_sistolica ?? '—'}/{s.presion_diastolica ?? '—'} · Glucosa: {s.glucosa_mg_dl ?? '—'} mg/dL
                  {s.observaciones && <> · {sanitizeForDisplay(s.observaciones)}</>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <DetalleSignoVitalModal
        open={!!signoDetalleSeleccionado}
        onClose={closeDetalleSigno}
        signo={signoDetalleSeleccionado}
        canEdit={canEditMedical}
        onEdit={openSignosFormForEdit}
        onVerCita={(idCita) => { closeDetalleSigno(); openDetalleCita(idCita); }}
      />
      <Modal open={showAllCitasOpen} onClose={() => setShowAllCitasOpen(false)} title="Historial de citas" footer={null} width={640}>
        {allCitasLoading ? <LoadingSpinner /> : allCitasData.length === 0 ? <EmptyState message="No hay citas" /> : (
          <ul className="tracking-list" style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {allCitasData.map((c, i) => (
              <li key={c.id_cita ?? c.id ?? i} className="tracking-item" style={{ cursor: 'pointer' }} onClick={() => { setShowAllCitasOpen(false); openDetalleCita(c.id_cita ?? c.id); }}>
                <span className="tracking-item-date">{formatDateTimeAmPm(c.fecha_cita)}</span>
                <span className="tracking-item-body">
                  {sanitizeForDisplay(c.doctor_nombre) || '—'}{' '}
                  <Badge variant={c.estado === 'atendida' ? 'success' : c.estado === 'cancelada' || c.estado === 'no_asistida' ? 'error' : 'neutral'}>{ESTADO_CITA[c.estado] || c.estado}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <DetalleCitaModal
        open={!!detalleCitaId}
        onClose={closeDetalleCita}
        citaDetalle={citaDetalle}
        loading={citaDetalleLoading}
        onVerEnPagina={(idCita) => navigate(`/citas/${idCita}`)}
        canEditMedical={canEditMedical}
        onCompletarWizard={(idCita) => { closeDetalleCita(); setWizardCitaId(idCita); setWizardCita(citaDetalle); setWizardCitaModalOpen(true); }}
        onSoloSignosVitales={(idCita) => { closeDetalleCita(); setSignosCitaId(idCita); setSignosForm(INITIAL_SIGNOS_VITALES); setModalSection('signos'); setSignosModalOpen(true); }}
      />
      <CompletarCitaModal
        open={wizardCitaModalOpen}
        onClose={() => { setWizardCitaModalOpen(false); setWizardCitaId(null); setWizardCita(null); }}
        citaId={wizardCitaId}
        cita={wizardCita}
        onSuccess={() => { loadCitas(); setWizardCitaModalOpen(false); setWizardCitaId(null); setWizardCita(null); }}
      />
      <Modal open={showAllComorbilidadesOpen} onClose={() => setShowAllComorbilidadesOpen(false)} title="Comorbilidades registradas" footer={null} width={560}>
        {allComorbilidadesLoading ? <LoadingSpinner /> : allComorbilidadesData.length === 0 ? <EmptyState message="No hay comorbilidades" /> : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '70vh', overflow: 'auto' }}>
            {allComorbilidadesData.map((c, i) => (
              <li key={c.id_comorbilidad ?? c.id ?? i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-borde-claro)' }}>
                <strong>{sanitizeForDisplay(c.nombre_comorbilidad ?? c.nombre) || '—'}</strong>
                {(c.fecha_deteccion || c.observaciones) && (
                  <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>
                    {c.fecha_deteccion && formatDate(c.fecha_deteccion)}
                    {c.observaciones && ` — ${sanitizeForDisplay(c.observaciones)}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Modal>
      <Modal open={showAllDoctoresOpen} onClose={() => setShowAllDoctoresOpen(false)} title="Doctores asignados" footer={null} width={480}>
        {doctoresAsignadosLoading ? (
          <LoadingSpinner />
        ) : (doctoresAsignados?.length ?? 0) === 0 ? (
          <EmptyState message="No hay doctores asignados" />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(doctoresAsignados || []).map((d, i) => (
              <li key={d.id_doctor ?? i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-borde-claro)' }}>
                <strong>{sanitizeForDisplay(d.nombre_completo) || '—'}</strong>
                {d.fecha_asignacion && <span style={{ marginLeft: '0.5rem', color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>({formatDate(d.fecha_asignacion)})</span>}
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* Modal Excel formato registro mensual (solo web): periodos con registros del paciente */}
      <Modal
        className="modal-forma-periodo"
        open={formaModalOpen}
        onClose={() => { setFormaModalOpen(false); setPeriodoSeleccionado(''); }}
        title={`Descargar ${EXCEL_FORMATO_REGISTRO_MENSUAL_LABEL}`}
        cancelText="Cancelar"
        okText="Descargar archivo"
        confirmLoading={formaLoading}
        onOk={async () => {
          if (!periodoSeleccionado) return;
          const [anioStr, mesStr] = periodoSeleccionado.split('-');
          const mes = parseInt(mesStr, 10);
          const anio = parseInt(anioStr, 10);
          setFormaLoading(true);
          setFormaError(null);
          try {
            const data = await getFormaData({ idPaciente: parsedId, mes, anio });
            downloadFormaExcel(
              data,
              `${EXCEL_FORMATO_REGISTRO_MENSUAL_FILE_PREFIX}-paciente-${parsedId}-${anio}-${String(mes).padStart(2, '0')}.xlsx`,
            );
            message.success('Descarga iniciada');
            setFormaModalOpen(false);
            setPeriodoSeleccionado('');
          } catch (err) {
            const msg = err?.response?.data?.error || err?.message || 'Error al descargar';
            setFormaError(msg);
            message.error(msg);
          } finally {
            setFormaLoading(false);
          }
        }}
        okButtonProps={{ disabled: !periodoSeleccionado }}
        width={440}
      >
        <p style={{ margin: '0 0 1rem', color: 'var(--color-texto-secundario)', fontSize: 'var(--text-sm)' }}>
          Elige el periodo según los registros del paciente (signos vitales, citas, detecciones, etc.).
        </p>
        {formaError && (
          <p style={{ margin: '0 0 0.5rem', color: 'var(--color-error)', fontSize: 'var(--text-sm)' }}>{formaError}</p>
        )}
        {periodosLoading ? (
          <LoadingSpinner />
        ) : periodosDisponibles.length === 0 ? (
          <EmptyState message="No hay periodos con registros para este paciente" />
        ) : (
          <Select
            label="Periodo"
            placeholder="Selecciona mes y año"
            value={periodoSeleccionado || undefined}
            onChange={(v) => setPeriodoSeleccionado(v ?? '')}
            options={periodosDisponibles.map((p) => ({ value: p.value, label: p.label }))}
            style={{ marginBottom: 0 }}
          />
        )}
      </Modal>
    </div>
  );
}

const CHART_COLORS = {
  primary: '#006657',
  secondary: '#BC955C',
  grid: '#E8F0EE',
  paSistolica: '#c62828',
  paDiastolica: '#1565c0',
  colesterolTotal: '#6a1b9a',
  colesterolLdl: '#d84315',
  colesterolHdl: '#00838f',
  hba1c: '#2e7d32',
};

function calcIMC(pesoKg, tallaM) {
  if (pesoKg == null || tallaM == null || Number(tallaM) === 0) return null;
  const imc = Number(pesoKg) / (Number(tallaM) * Number(tallaM));
  return Number.isNaN(imc) ? null : parseFloat(imc.toFixed(1));
}

const chartSectionStyle = { minWidth: 280, marginBottom: 'var(--space-8)', height: 260 };
const chartTitleStyle = { fontSize: 'var(--text-base)', color: 'var(--color-texto-secundario)', marginBottom: 'var(--space-2)', fontWeight: 'var(--font-semibold)' };
const tooltipStyle = {
  fontSize: 'var(--text-sm)',
  padding: 'var(--space-2) var(--space-3)',
  borderRadius: 'var(--radius)',
  border: '1px solid var(--color-borde-claro)',
  backgroundColor: 'var(--color-fondo-card)',
  boxShadow: 'var(--shadow-md)',
};

/** Formatea valores de un registro de signos vitales para mostrar en desglose (paridad con app móvil) */
function getSignoValores(signo) {
  const items = [];
  if (signo.presion_sistolica != null || signo.presion_diastolica != null) {
    items.push({ label: 'Presión arterial', value: `${signo.presion_sistolica ?? '—'}/${signo.presion_diastolica ?? '—'} mmHg` });
  }
  if (signo.glucosa_mg_dl != null) items.push({ label: 'Glucosa', value: `${signo.glucosa_mg_dl} mg/dL` });
  if (signo.peso_kg != null) items.push({ label: 'Peso', value: `${signo.peso_kg} kg` });
  if (signo.talla_m != null) items.push({ label: 'Talla', value: `${signo.talla_m} m` });
  const imc = signo.imc ?? calcIMC(signo.peso_kg, signo.talla_m);
  if (imc != null) items.push({ label: 'IMC', value: `${imc} kg/m²` });
  if (signo.medida_cintura_cm != null) items.push({ label: 'Cintura', value: `${signo.medida_cintura_cm} cm` });
  if (signo.colesterol_mg_dl != null) items.push({ label: 'Colesterol total', value: `${signo.colesterol_mg_dl} mg/dL` });
  if (signo.colesterol_ldl != null) items.push({ label: 'Colesterol LDL', value: `${signo.colesterol_ldl} mg/dL` });
  if (signo.colesterol_hdl != null) items.push({ label: 'Colesterol HDL', value: `${signo.colesterol_hdl} mg/dL` });
  if (signo.trigliceridos_mg_dl != null) items.push({ label: 'Triglicéridos', value: `${signo.trigliceridos_mg_dl} mg/dL` });
  if (signo.hba1c_porcentaje != null) items.push({ label: 'HbA1c', value: `${signo.hba1c_porcentaje}%` });
  if (signo.observaciones) items.push({ label: 'Observaciones', value: sanitizeForDisplay(signo.observaciones) });
  return items;
}

function PacienteGraficosEvolucion({ signosData, signosLoading, signosError, onRetry, onFilterChange }) {
  const [filtroTiempo, setFiltroTiempo] = useState(FILTROS_TIEMPO.ULTIMOS_3_MESES);

  const handleFiltroChange = (nuevoFiltro) => {
    setFiltroTiempo(nuevoFiltro);
    onFilterChange?.(nuevoFiltro);
  };
  const [detalleMesOpen, setDetalleMesOpen] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState(null);
  const [diaFiltro, setDiaFiltro] = useState('todos');
  const [registroDetalleOpen, setRegistroDetalleOpen] = useState(false);
  const [registroDetalle, setRegistroDetalle] = useState(null);

  useEffect(() => {
    setDiaFiltro('todos');
  }, [mesSeleccionado]);

  const signosFiltrados = useMemo(
    () => filterSignosByTimeRange(signosData ?? [], filtroTiempo),
    [signosData, filtroTiempo]
  );

  const sorted = useMemo(
    () =>
      [...signosFiltrados].sort((a, b) => {
        const ta = parseApiDate(a.fecha_medicion)?.getTime() ?? 0;
        const tb = parseApiDate(b.fecha_medicion)?.getTime() ?? 0;
        return ta - tb;
      }),
    [signosFiltrados]
  );

  const chartData = useMemo(() => sorted.map((s) => {
    const imc = s.imc ?? calcIMC(s.peso_kg, s.talla_m);
    return {
      ...s,
      fecha: formatDate(s.fecha_medicion),
      fechaRaw: s.fecha_medicion,
      peso_kg: s.peso_kg != null ? Number(s.peso_kg) : null,
      glucosa_mg_dl: s.glucosa_mg_dl != null ? Number(s.glucosa_mg_dl) : null,
      presion_sistolica: s.presion_sistolica != null ? Number(s.presion_sistolica) : null,
      presion_diastolica: s.presion_diastolica != null ? Number(s.presion_diastolica) : null,
      imc: imc != null ? Number(imc) : null,
      colesterol_mg_dl: s.colesterol_mg_dl != null ? Number(s.colesterol_mg_dl) : null,
      colesterol_ldl: s.colesterol_ldl != null ? Number(s.colesterol_ldl) : null,
      colesterol_hdl: s.colesterol_hdl != null ? Number(s.colesterol_hdl) : null,
      hba1c_porcentaje: s.hba1c_porcentaje != null ? Number(s.hba1c_porcentaje) : null,
    };
  }), [sorted]);

  const monthlyData = useMemo(
    () => aggregateSignosByMonth(signosFiltrados).map((m) => ({ ...m, registros: m.totalRegistros })),
    [signosFiltrados]
  );

  if (signosLoading) {
    return (
      <div>
        <LoadingSpinner />
        <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)' }}>
          Cargando signos vitales ({FILTRO_LABELS[filtroTiempo] ?? filtroTiempo})…
        </p>
      </div>
    );
  }

  if (signosError) {
    return (
      <div>
        <EmptyState message={signosError} />
        {onRetry && (
          <div style={{ marginTop: 'var(--space-3)', textAlign: 'center' }}>
            <Button type="button" variant="primary" onClick={() => onRetry(filtroTiempo)}>
              Reintentar carga
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (!signosData?.length) {
    return <EmptyState message="No hay datos de signos vitales para graficar. Registra mediciones en la pestaña Signos vitales." />;
  }

  if (signosFiltrados.length === 0) {
    return (
      <div>
        <TimeRangeFilter value={filtroTiempo} onChange={handleFiltroChange} />
        <EmptyState message="No hay registros en el período seleccionado. Prueba con «Completo» u otro rango." />
      </div>
    );
  }

  const hasPeso = chartData.some((d) => d.peso_kg != null);
  const hasGlucosa = chartData.some((d) => d.glucosa_mg_dl != null);
  const hasPA = chartData.some((d) => d.presion_sistolica != null || d.presion_diastolica != null);
  const hasIMC = chartData.some((d) => d.imc != null);
  const hasColesterol = chartData.some((d) => d.colesterol_mg_dl != null || d.colesterol_ldl != null || d.colesterol_hdl != null);
  const hasHbA1c = chartData.some((d) => d.hba1c_porcentaje != null);
  const hasAnyChart = hasPeso || hasGlucosa || hasPA || hasIMC || hasColesterol || hasHbA1c;

  const mesesEnPeriodo = monthlyData.length;

  return (
    <div style={{ overflowX: 'auto' }}>
      <TimeRangeFilter value={filtroTiempo} onChange={handleFiltroChange} />
      <p
        style={{
          margin: '0 0 var(--space-4)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-texto-secundario)',
        }}
        aria-live="polite"
      >
        {FILTRO_LABELS[filtroTiempo] ?? filtroTiempo}: {signosFiltrados.length} registro
        {signosFiltrados.length === 1 ? '' : 's'}
        {mesesEnPeriodo > 0 ? ` en ${mesesEnPeriodo} mes${mesesEnPeriodo === 1 ? '' : 'es'}` : ''}
        {filtroTiempo === FILTROS_TIEMPO.COMPLETO && (signosData?.length ?? 0) > 0
          ? ` (${signosData.length} en historial cargado)`
          : ''}
      </p>

      {monthlyData.length > 0 && (
        <div style={{ ...chartSectionStyle, marginBottom: 'var(--space-6)' }}>
          <h3 style={chartTitleStyle}>Registros por mes</h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginBottom: 'var(--space-2)' }}>
            Haz clic en una barra para ver el desglose de signos vitales de ese mes.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart key={`meses-${filtroTiempo}`} data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <YAxis domain={[0, 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, 'Registros']} labelFormatter={(label) => label} />
              <Bar
                dataKey="registros"
                fill={CHART_COLORS.primary}
                radius={[4, 4, 0, 0]}
                name="Registros"
                onClick={(payload) => {
                  if (payload && (payload.signos || payload.mesKey)) {
                    setMesSeleccionado(payload);
                    setDetalleMesOpen(true);
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Modal desglose por mes (paridad con app móvil) */}
      <Modal
        open={detalleMesOpen}
        onClose={() => { setDetalleMesOpen(false); setMesSeleccionado(null); }}
        title={mesSeleccionado ? `Desglose: ${mesSeleccionado.mesLabel}` : 'Desglose'}
        footer={null}
        width={560}
        destroyOnClose
      >
        {mesSeleccionado && (() => {
          const signosMes = mesSeleccionado.signos || [];
          const diasUnicos = [];
          const seen = new Set();
          signosMes.forEach((s) => {
            const raw = s.fecha_medicion || s.fecha_registro || s.fecha_creacion;
            if (raw) {
              const d = new Date(raw);
              if (!Number.isNaN(d.getTime())) {
                const key = d.toISOString().slice(0, 10);
                if (!seen.has(key)) {
                  seen.add(key);
                  diasUnicos.push({ key, label: formatDate(raw) });
                }
              }
            }
          });
          diasUnicos.sort((a, b) => b.key.localeCompare(a.key));
          const registrosFiltrados = diaFiltro === 'todos'
            ? [...signosMes].sort((a, b) => new Date(b.fecha_medicion || b.fecha_registro) - new Date(a.fecha_medicion || a.fecha_registro))
            : signosMes.filter((s) => {
                const raw = s.fecha_medicion || s.fecha_registro || s.fecha_creacion;
                return raw && raw.slice(0, 10) === diaFiltro;
              }).sort((a, b) => new Date(b.fecha_medicion || b.fecha_registro) - new Date(a.fecha_medicion || a.fecha_registro));
          return (
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-fondo-secundario)', borderRadius: 'var(--radius)' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-texto-secundario)' }}>Total mediciones: </span>
                <span style={{ fontWeight: 700 }}>{mesSeleccionado.totalRegistros ?? signosMes.length}</span>
              </div>
              {diasUnicos.length > 1 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 'var(--text-sm)' }}>Filtrar por día</label>
                  <Select
                    options={[{ value: 'todos', label: 'Todos los días' }, ...diasUnicos.map((d) => ({ value: d.key, label: d.label }))]}
                    value={diaFiltro}
                    onChange={(val) => setDiaFiltro(val ?? 'todos')}
                    placeholder="Todos los días"
                  />
                </div>
              )}
              <h4 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-base)' }}>Registros ({registrosFiltrados.length})</h4>
              {registrosFiltrados.length === 0 ? (
                <p style={{ color: 'var(--color-texto-secundario)' }}>No hay registros para el filtro seleccionado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {registrosFiltrados.map((signo, idx) => {
                    const fechaRaw = signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion;
                    const valores = getSignoValores(signo);
                    return (
                      <div
                        key={signo.id_signo_vital ?? `${fechaRaw}-${idx}`}
                        style={{
                          border: '1px solid var(--color-borde-claro)',
                          borderRadius: 'var(--radius)',
                          overflow: 'hidden',
                          background: 'var(--color-fondo-card)',
                        }}
                      >
                        <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--color-fondo-secundario)', borderBottom: '1px solid var(--color-borde-claro)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                          {formatDateTime(fechaRaw)}
                        </div>
                        <div style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          {valores.length === 0 ? (
                            <span style={{ color: 'var(--color-texto-secundario)', fontSize: 'var(--text-sm)' }}>Sin valores registrados</span>
                          ) : (
                            valores.map((item) => (
                              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <span style={{ color: 'var(--color-texto-secundario)', fontSize: 'var(--text-sm)' }}>{item.label}</span>
                                <span style={{ fontWeight: 600 }}>{item.value}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {hasPeso && (
        <div style={chartSectionStyle}>
          <h3 style={chartTitleStyle}>Evolución del peso (kg)</h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginBottom: 'var(--space-2)' }}>
            Haz clic en un punto para ver el registro de esa fecha.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart key={`peso-${filtroTiempo}`} data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value != null ? `${value} kg` : '—', 'Peso']} labelFormatter={(label) => `Fecha: ${label}`} />
              <Line
                type="monotone"
                dataKey="peso_kg"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                connectNulls
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload == null) return null;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={CHART_COLORS.primary}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (payload.fechaRaw) {
                          setRegistroDetalle(payload);
                          setRegistroDetalleOpen(true);
                        }
                      }}
                    />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Modal detalle de un registro (al clic en punto de evolución) */}
      <Modal
        open={registroDetalleOpen}
        onClose={() => { setRegistroDetalleOpen(false); setRegistroDetalle(null); }}
        title={registroDetalle ? `Registro: ${formatDateTime(registroDetalle.fechaRaw)}` : 'Registro'}
        footer={null}
        width={480}
        destroyOnClose
      >
        {registroDetalle && (() => {
          const valores = getSignoValores(registroDetalle);
          return (
            <div style={{ padding: 'var(--space-2) 0' }}>
              {valores.length === 0 ? (
                <p style={{ color: 'var(--color-texto-secundario)' }}>Sin valores registrados para esta fecha.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {valores.map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-borde-claro)' }}>
                      <span style={{ color: 'var(--color-texto-secundario)' }}>{item.label}</span>
                      <span style={{ fontWeight: 600 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {hasGlucosa && (
        <div style={chartSectionStyle}>
          <h3 style={chartTitleStyle}>Evolución de glucosa (mg/dL)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value != null ? `${value} mg/dL` : '—', 'Glucosa']} labelFormatter={(label) => `Fecha: ${label}`} />
              <Bar dataKey="glucosa_mg_dl" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} name="Glucosa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasPA && (
        <div style={chartSectionStyle}>
          <h3 style={chartTitleStyle}>Evolución presión arterial (mmHg)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => `Fecha: ${label}`} />
              <Legend />
              <Line type="monotone" dataKey="presion_sistolica" stroke={CHART_COLORS.paSistolica} strokeWidth={2} dot={{ r: 4 }} connectNulls name="Sistólica" />
              <Line type="monotone" dataKey="presion_diastolica" stroke={CHART_COLORS.paDiastolica} strokeWidth={2} dot={{ r: 4 }} connectNulls name="Diastólica" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasIMC && (
        <div style={chartSectionStyle}>
          <h3 style={chartTitleStyle}>Evolución IMC (kg/m²)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value != null ? `${value} kg/m²` : '—', 'IMC']} labelFormatter={(label) => `Fecha: ${label}`} />
              <Line type="monotone" dataKey="imc" stroke={CHART_COLORS.hba1c} strokeWidth={2} dot={{ fill: CHART_COLORS.hba1c, r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasColesterol && (
        <div style={chartSectionStyle}>
          <h3 style={chartTitleStyle}>Evolución colesterol (mg/dL)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={(label) => `Fecha: ${label}`} />
              <Legend />
              <Line type="monotone" dataKey="colesterol_mg_dl" stroke={CHART_COLORS.colesterolTotal} strokeWidth={2} dot={{ r: 4 }} connectNulls name="Total" />
              <Line type="monotone" dataKey="colesterol_ldl" stroke={CHART_COLORS.colesterolLdl} strokeWidth={2} dot={{ r: 4 }} connectNulls name="LDL" />
              <Line type="monotone" dataKey="colesterol_hdl" stroke={CHART_COLORS.colesterolHdl} strokeWidth={2} dot={{ r: 4 }} connectNulls name="HDL" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasHbA1c && (
        <div style={chartSectionStyle}>
          <h3 style={chartTitleStyle}>Evolución HbA1c (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value != null ? `${value}%` : '—', 'HbA1c']} labelFormatter={(label) => `Fecha: ${label}`} />
              <Line type="monotone" dataKey="hba1c_porcentaje" stroke={CHART_COLORS.hba1c} strokeWidth={2} dot={{ fill: CHART_COLORS.hba1c, r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!hasAnyChart && (
        <p style={{ color: 'var(--color-texto-secundario)', fontSize: 'var(--text-sm)' }}>
          No hay datos para mostrar en el período seleccionado. Registra mediciones en la pestaña Signos vitales.
        </p>
      )}

      <ComparativaEvolucionSignos signosVitales={signosFiltrados} />
    </div>
  );
}
