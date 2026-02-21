import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { getPacienteById, getPacienteDoctores, assignDoctorToPaciente, unassignDoctorFromPaciente } from '../../api/pacientes';
import { getDoctores } from '../../api/doctores';
import { createCita, getCitaById } from '../../api/citas';
import { getMedicamentos } from '../../api/medicamentos';
import { useAuthStore } from '../../stores/authStore';
import { getExpedienteHTML, getFormaData, getFormaMesesDisponibles } from '../../api/reportes';
import { downloadFormaExcel } from '../../utils/formaExcelUtils';
import {
  getPacienteCitas,
  getPacienteSignosVitales,
  getPacienteDiagnosticos,
  getPacienteMedicamentos,
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
import DetalleSignoVitalModal from '../../components/pacientes/DetalleSignoVitalModal';
import ComparativaEvolucionSignos from '../../components/pacientes/ComparativaEvolucionSignos';
import { PATIENT_DETAIL_SECTIONS } from '../../constants/patientDetailSections';
import { getVacunas } from '../../api/vacunas';
import { getComorbilidades } from '../../api/comorbilidades';
import { parsePositiveInt } from '../../utils/params';
import { sanitizeForDisplay } from '../../utils/sanitize';
import { formatDate, formatDateTime } from '../../utils/format';
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
import TimeRangeFilter, { filterSignosByTimeRange, FILTROS_TIEMPO } from '../../components/charts/TimeRangeFilter';
import { aggregateSignosByMonth } from '../../components/charts/monthlyChartUtils';

const ESTADO_CITA = {
  pendiente: 'Pendiente',
  atendida: 'Atendida',
  no_asistida: 'No asistida',
  reprogramada: 'Reprogramada',
  cancelada: 'Cancelada',
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

  const [citas, setCitas] = useState({ data: [], total: 0 });
  const [citasLoading, setCitasLoading] = useState(false);
  const [signos, setSignos] = useState({ data: [], total: 0 });
  const [signosLoading, setSignosLoading] = useState(false);
  const [diagnosticos, setDiagnosticos] = useState({ data: [], total: 0 });
  const [diagnosticosLoading, setDiagnosticosLoading] = useState(false);
  const [medicamentos, setMedicamentos] = useState({ data: [], total: 0 });
  const [medicamentosLoading, setMedicamentosLoading] = useState(false);
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
    observaciones: '',
  });
  const [vacunaSubmitting, setVacunaSubmitting] = useState(false);
  const [vacunaError, setVacunaError] = useState('');
  const [comorbilidadForm, setComorbilidadForm] = useState({
    id_comorbilidad: '',
    fecha_deteccion: '',
    observaciones: '',
  });
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

  const [signosForm, setSignosForm] = useState({
    peso_kg: '', talla_m: '', medida_cintura_cm: '', presion_sistolica: '', presion_diastolica: '',
    glucosa_mg_dl: '', colesterol_mg_dl: '', colesterol_ldl: '', colesterol_hdl: '', trigliceridos_mg_dl: '', hba1c_porcentaje: '', observaciones: '',
  });
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
  const [diagnosticoModalOpen, setDiagnosticoModalOpen] = useState(false);
  const [vacunaModalOpen, setVacunaModalOpen] = useState(false);
  const [editingVacuna, setEditingVacuna] = useState(null);
  const [comorbilidadModalOpen, setComorbilidadModalOpen] = useState(false);
  const [editingComorbilidad, setEditingComorbilidad] = useState(null);
  const [editingDeteccion, setEditingDeteccion] = useState(null);
  const [deteccionEditForm, setDeteccionEditForm] = useState({ fecha_deteccion: '', fecha_diagnostico: '', observaciones: '' });
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
    observaciones: '',
    medicamentos: [{ id_medicamento: '', dosis: '', frecuencia: '' }],
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
  const [signoDetalleSeleccionado, setSignoDetalleSeleccionado] = useState(null);
  const [allComorbilidadesData, setAllComorbilidadesData] = useState([]);
  const [allComorbilidadesLoading, setAllComorbilidadesLoading] = useState(false);

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
    } catch (err) {
      setError(
        err?.response?.status === 404
          ? 'Paciente no encontrado'
          : err?.response?.data?.error || err?.message || 'Error al cargar el paciente'
      );
    } finally {
      setLoading(false);
    }
  }, [parsedId, queryClient]);

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
      // No mostramos error explícito aquí para no saturar la UI; el resto de secciones siguen funcionando.
      setResumenMedico(null);
    } finally {
      setResumenMedicoLoading(false);
    }
  }, [parsedId, queryClient]);

  useEffect(() => {
    loadPaciente();
  }, [loadPaciente]);

  useEffect(() => {
    if (parsedId > 0) loadResumenMedico();
  }, [parsedId, loadResumenMedico]);

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

  const loadSignos = useCallback(async () => {
    if (parsedId === 0) return;
    setSignosLoading(true);
    try {
      const res = await getPacienteSignosVitales(parsedId, { limit: 15 });
      setSignos(res);
    } catch {
      setSignos({ data: [], total: 0 });
    } finally {
      setSignosLoading(false);
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
    if (modalSection === 'datos' || modalSection === 'citas' || modalSection === 'diagnosticos') loadCitas();
    if (modalSection === 'diagnosticos') loadDiagnosticos();
    else if (modalSection === 'signos' || modalSection === 'graficos' || modalSection === 'monitoreo') loadSignos();
    else if (modalSection === 'medicacion') loadMedicamentos();
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
  }, [modalSection, loadCitas, loadSignos, loadDiagnosticos, loadMedicamentos, loadRedApoyo, loadVacunacion, loadComorbilidades, loadDeteccionesComplicaciones, loadSesionesEducativas, loadSaludBucal, loadDeteccionesTuberculosis, loadDoctoresAsignados, isAdmin]);

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
  const nombreCompleto = [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ') || '—';

  const renderTabContent = (tabId) => {
    if (!tabId) return null;
    switch (tabId) {
      case 'datos': {
        const comorbilidadesList = Array.isArray(p.comorbilidades)
          ? p.comorbilidades
              .map((c) =>
                typeof c === 'object' && (c?.nombre || c?.nombre_comorbilidad)
                  ? c.nombre || c.nombre_comorbilidad
                  : String(c)
              )
              .filter(Boolean)
          : [];

        const citasOrdenadas = [...(citas.data || [])].sort(
          (a, b) => new Date(b.fecha_cita) - new Date(a.fecha_cita)
        );
        const timelineCitas = citasOrdenadas.slice(0, 5);

        return (
          <>
            {citas.data?.length > 0 && (
              <ProximaCitaCard
                citas={citas.data}
                onVerCita={(idCita) => navigate(`/citas/${idCita}`)}
                onVerTodas={() => navigate(`/citas?paciente=${parsedId}`)}
              />
            )}

            <Card className="patient-section-card">
              <h2 className="patient-section-title">Historial reciente de consultas</h2>
              {citasLoading ? (
                <LoadingSpinner />
              ) : timelineCitas.length === 0 ? (
                <EmptyState message="No hay citas registradas" />
              ) : (
                <ul className="tracking-list">
                  {timelineCitas.map((cita, index) => (
                    <li
                      key={`${cita.id_cita ?? cita.id}-${index}`}
                      className="tracking-item"
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/citas/${cita.id_cita ?? cita.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/citas/${cita.id_cita ?? cita.id}`);
                        }
                      }}
                    >
                      <span className="tracking-item-date">
                        {formatDateTime(cita.fecha_cita)}
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
              )}
            </Card>

            {comorbilidadesList.length > 0 && (
              <Card className="patient-section-card">
                <h2 className="patient-section-title">Comorbilidades</h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-texto-primario)',
                  }}
                >
                  {comorbilidadesList.join(', ')}
                </p>
              </Card>
            )}

            <Card className="patient-section-card">
              <h2 className="patient-section-title">Expediente médico</h2>
              <p
                style={{
                  margin: '0 0 var(--space-4)',
                  color: 'var(--color-texto-secundario)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                Ver o descargar el expediente médico completo.
              </p>
              {expedienteError && (
                <p
                  style={{
                    margin: '0 0 var(--space-2)',
                    color: 'var(--color-error)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {expedienteError}
                </p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <Button
                  variant="primary"
                  type="button"
                  disabled={expedienteLoading}
                  onClick={handleVerExpediente}
                >
                  {expedienteLoading ? 'Cargando…' : 'Ver en nueva pestaña'}
                </Button>
              </div>
            </Card>
          </>
        );
      }
      case 'monitoreo': {
        const ultimoSignoMonitoreo = (signos.data || [])[0];
        return (
          <MonitoreoContinuoSummary
            loading={signosLoading}
            ultimoSigno={ultimoSignoMonitoreo}
            onVerHistorial={() => setModalSection('signos')}
            hideTitle
          />
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
              fecha_cita: fecha.length <= 10 ? `${fecha}T12:00:00` : fecha,
              motivo: citaForm.motivo?.trim() || undefined,
            });
            setCitaForm({ id_doctor: '', fecha_cita: '', motivo: '' });
            setCitaModalOpen(false);
            loadCitas();
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
                    <span className="tracking-item-date">{formatDateTime(c.fecha_cita)}</span>
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
                    label: [d.nombre, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' '),
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
        const emptySignosForm = {
          peso_kg: '', talla_m: '', medida_cintura_cm: '', presion_sistolica: '', presion_diastolica: '',
          glucosa_mg_dl: '', colesterol_mg_dl: '', colesterol_ldl: '', colesterol_hdl: '', trigliceridos_mg_dl: '', hba1c_porcentaje: '', observaciones: '',
        };
        const handleCreateSignos = async () => {
          const peso = signosForm.peso_kg.trim() ? parseFloat(signosForm.peso_kg) : null;
          const talla = signosForm.talla_m.trim() ? parseFloat(signosForm.talla_m) : null;
          const medidaCintura = signosForm.medida_cintura_cm.trim() ? parseFloat(signosForm.medida_cintura_cm) : null;
          const ps = signosForm.presion_sistolica.trim() ? parseInt(signosForm.presion_sistolica, 10) : null;
          const pd = signosForm.presion_diastolica.trim() ? parseInt(signosForm.presion_diastolica, 10) : null;
          const glucosa = signosForm.glucosa_mg_dl.trim() ? parseFloat(signosForm.glucosa_mg_dl) : null;
          const col = signosForm.colesterol_mg_dl.trim() ? parseFloat(signosForm.colesterol_mg_dl) : null;
          const ldl = signosForm.colesterol_ldl.trim() ? parseFloat(signosForm.colesterol_ldl) : null;
          const hdl = signosForm.colesterol_hdl.trim() ? parseFloat(signosForm.colesterol_hdl) : null;
          const trig = signosForm.trigliceridos_mg_dl.trim() ? parseFloat(signosForm.trigliceridos_mg_dl) : null;
          const hba1c = signosForm.hba1c_porcentaje.trim() ? parseFloat(signosForm.hba1c_porcentaje) : null;
          if (!peso && !talla && !medidaCintura && !ps && !pd && !glucosa && !col && !ldl && !hdl && !trig && !hba1c) {
            setSignosSubmitError('Indica al menos un valor (peso, talla, presión, glucosa, colesterol, HbA1c, etc.).');
            return;
          }
          setSignosSubmitError('');
          setSignosSubmitting(true);
          const body = {
            peso_kg: peso,
            talla_m: talla,
            medida_cintura_cm: medidaCintura,
            presion_sistolica: ps,
            presion_diastolica: pd,
            glucosa_mg_dl: glucosa,
            colesterol_mg_dl: col,
            colesterol_ldl: ldl || undefined,
            colesterol_hdl: hdl || undefined,
            trigliceridos_mg_dl: trig,
            hba1c_porcentaje: hba1c ?? undefined,
            observaciones: signosForm.observaciones.trim() || undefined,
          };
          try {
            if (editingSignoId) {
              await apiUpdateSignosVitales(parsedId, editingSignoId, body);
              message.success('Registro de signos vitales actualizado');
            } else {
              await apiCreateSignosVitales(parsedId, body);
              message.success('Registro de signos vitales guardado');
            }
            setSignosForm(emptySignosForm);
            setEditingSignoId(null);
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
                    setSignosForm(emptySignosForm);
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
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <Input
                      type="number"
                      placeholder="Peso (kg)"
                      value={signosForm.peso_kg}
                      onChange={(e) =>
                        setSignosForm((f) => ({ ...f, peso_kg: e.target.value }))
                      }
                      style={{ marginBottom: 0 }}
                    />
                    <Input
                      type="number"
                      placeholder="Talla (m)"
                      value={signosForm.talla_m}
                      onChange={(e) =>
                        setSignosForm((f) => ({ ...f, talla_m: e.target.value }))
                      }
                      style={{ marginBottom: 0 }}
                    />
                    <Input
                      type="number"
                      placeholder="Cintura (cm)"
                      value={signosForm.medida_cintura_cm}
                      onChange={(e) =>
                        setSignosForm((f) => ({ ...f, medida_cintura_cm: e.target.value }))
                      }
                      style={{ marginBottom: 0 }}
                    />
                    <Input
                      type="number"
                      placeholder="PA sist."
                      value={signosForm.presion_sistolica}
                      onChange={(e) =>
                        setSignosForm((f) => ({ ...f, presion_sistolica: e.target.value }))
                      }
                      style={{ marginBottom: 0 }}
                    />
                    <Input
                      type="number"
                      placeholder="PA diast."
                      value={signosForm.presion_diastolica}
                      onChange={(e) =>
                        setSignosForm((f) => ({ ...f, presion_diastolica: e.target.value }))
                      }
                      style={{ marginBottom: 0 }}
                    />
                    <Input
                      type="number"
                      placeholder="Glucosa"
                      value={signosForm.glucosa_mg_dl}
                      onChange={(e) =>
                        setSignosForm((f) => ({ ...f, glucosa_mg_dl: e.target.value }))
                      }
                      style={{ marginBottom: 0 }}
                    />
                    <Input
                      type="number"
                      placeholder="Colesterol"
                      value={signosForm.colesterol_mg_dl}
                      onChange={(e) =>
                        setSignosForm((f) => ({ ...f, colesterol_mg_dl: e.target.value }))
                      }
                      style={{ marginBottom: 0 }}
                    />
                    <Input
                      type="number"
                      placeholder="LDL"
                      value={signosForm.colesterol_ldl}
                      onChange={(e) =>
                        setSignosForm((f) => ({ ...f, colesterol_ldl: e.target.value }))
                      }
                      style={{ marginBottom: 0 }}
                    />
                    <Input
                      type="number"
                      placeholder="HDL"
                      value={signosForm.colesterol_hdl}
                      onChange={(e) =>
                        setSignosForm((f) => ({ ...f, colesterol_hdl: e.target.value }))
                      }
                      style={{ marginBottom: 0 }}
                    />
                    <Input
                      type="number"
                      placeholder="Triglicéridos"
                      value={signosForm.trigliceridos_mg_dl}
                      onChange={(e) =>
                        setSignosForm((f) => ({ ...f, trigliceridos_mg_dl: e.target.value }))
                      }
                      style={{ marginBottom: 0 }}
                    />
                    <Input
                      type="number"
                      placeholder="HbA1c (%)"
                      value={signosForm.hba1c_porcentaje}
                      onChange={(e) =>
                        setSignosForm((f) => ({ ...f, hba1c_porcentaje: e.target.value }))
                      }
                      style={{ marginBottom: 0 }}
                    />
                  </div>
                  <Input
                    placeholder="Observaciones"
                    value={signosForm.observaciones}
                    onChange={(e) =>
                      setSignosForm((f) => ({ ...f, observaciones: e.target.value }))
                    }
                    style={{ marginBottom: 0 }}
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
          const idCita = newDiagnosticoCitaId ? parseInt(newDiagnosticoCitaId, 10) : undefined;
          try {
            if (editingDiagnostico) {
              await apiUpdateDiagnostico(parsedId, editingDiagnostico.id_diagnostico ?? editingDiagnostico.id, {
                descripcion: desc,
                id_cita: idCita,
              });
              message.success('Diagnóstico actualizado');
            } else {
              await apiCreateDiagnostico(parsedId, {
                descripcion: desc,
                id_cita: idCita,
              });
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
            observaciones: medicacionForm.observaciones?.trim() || undefined,
            medicamentos: items.map((m) => ({
              id_medicamento: parsePositiveInt(m.id_medicamento, 0),
              dosis: (m.dosis || '').trim() || undefined,
              frecuencia: (m.frecuencia || '').trim() || undefined,
            })),
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
              observaciones: '',
              medicamentos: [{ id_medicamento: '', dosis: '', frecuencia: '' }],
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
            medicamentos: [...f.medicamentos, { id_medicamento: '', dosis: '', frecuencia: '' }],
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
                      observaciones: '',
                      medicamentos: [{ id_medicamento: '', dosis: '', frecuencia: '' }],
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
                            const meds = Array.isArray(m.medicamentos) && m.medicamentos.length > 0
                              ? m.medicamentos.map((med) => ({
                                  id_medicamento: String(med.id_medicamento ?? med.id ?? ''),
                                  dosis: med.dosis ?? '',
                                  frecuencia: med.frecuencia ?? '',
                                }))
                              : [{ id_medicamento: '', dosis: '', frecuencia: '' }];
                            setMedicacionError('');
                            setMedicacionForm({
                              fecha_inicio: m.fecha_inicio ? String(m.fecha_inicio).slice(0, 10) : '',
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
                                ? p.medicamentos.map((med) => ({
                                    id_medicamento: String(med.id_medicamento ?? med.id ?? ''),
                                    dosis: med.dosis ?? '',
                                    frecuencia: med.frecuencia ?? '',
                                  }))
                                : [{ id_medicamento: '', dosis: '', frecuencia: '' }];
                              setMedicacionForm({
                                fecha_inicio: p.fecha_inicio ? String(p.fecha_inicio).slice(0, 10) : '',
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
                  </div>
                ))}
                <Button type="button" variant="outline" size="small" onClick={addMedicamentoRow} style={{ marginBottom: '0.75rem' }}>
                  + Agregar otro medicamento
                </Button>
                <TextArea
                  label="Observaciones (opcional)"
                  value={medicacionForm.observaciones}
                  onChange={(e) => setMedicacionForm((f) => ({ ...f, observaciones: e.target.value }))}
                  rows={2}
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
                            setVacunaForm({
                              id_vacuna: String(v.id_vacuna ?? v.id_vacuna_fk ?? v.id ?? ''),
                              fecha_aplicacion: v.fecha_aplicacion ? String(v.fecha_aplicacion).slice(0, 10) : '',
                              lote: v.lote ?? '',
                              observaciones: v.observaciones ?? '',
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
                    setVacunaError('');
                    setVacunaSubmitting(true);
                    try {
                      if (editingVacuna) {
                        await apiUpdateEsquemaVacunacion(parsedId, editingVacuna.id_esquema ?? editingVacuna.id, {
                          id_vacuna: idVac,
                          fecha_aplicacion: fecha,
                          lote: vacunaForm.lote?.trim() || undefined,
                          observaciones: vacunaForm.observaciones?.trim() || undefined,
                        });
                        message.success('Vacuna actualizada');
                      } else {
                        await apiCreateEsquemaVacunacion(parsedId, {
                          id_vacuna: idVac,
                          vacuna: undefined,
                          fecha_aplicacion: fecha,
                          lote: vacunaForm.lote?.trim() || undefined,
                          observaciones: vacunaForm.observaciones?.trim() || undefined,
                        });
                      }
                      setVacunaForm({ id_vacuna: '', fecha_aplicacion: '', lote: '', observaciones: '' });
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
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
                      gap: '0.75rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <Select
                      label="Vacuna"
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
                      value={vacunaForm.fecha_aplicacion}
                      onChange={(e) =>
                        setVacunaForm((f) => ({ ...f, fecha_aplicacion: e.target.value }))
                      }
                    />
                    <Input
                      label="Lote (opcional)"
                      value={vacunaForm.lote}
                      onChange={(e) =>
                        setVacunaForm((f) => ({ ...f, lote: e.target.value }))
                      }
                    />
                    <Input
                      label="Observaciones (opcional)"
                      value={vacunaForm.observaciones}
                      onChange={(e) =>
                        setVacunaForm((f) => ({ ...f, observaciones: e.target.value }))
                      }
                    />
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
                              id_comorbilidad: String(c.id_comorbilidad ?? c.id ?? ''),
                              fecha_deteccion: c.fecha_deteccion ? String(c.fecha_deteccion).slice(0, 10) : '',
                              observaciones: c.observaciones ?? '',
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
                    setComorbilidadForm({
                      id_comorbilidad: '',
                      fecha_deteccion: '',
                      observaciones: '',
                    });
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
                      setComorbilidadForm({ id_comorbilidad: '', fecha_deteccion: '', observaciones: '' });
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
                  </div>
                </Modal>
              </div>
            )}
          </Card>
        );
      case 'detecciones': {
        const deteccionIdForApi = (d) => d.id_deteccion ?? d.id;
        return (
          <Card className="patient-section-card">
            <h2 className="patient-section-title">Detecciones de complicaciones</h2>
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
                            setEditingDeteccion(d);
                            setDeteccionEditForm({
                              fecha_deteccion: d.fecha_deteccion ? String(d.fecha_deteccion).slice(0, 10) : '',
                              fecha_diagnostico: d.fecha_diagnostico ? String(d.fecha_diagnostico).slice(0, 10) : '',
                              observaciones: d.observaciones ?? '',
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
            {canEditMedical && editingDeteccion && (
              <Modal
                open={!!editingDeteccion}
                onClose={() => { setEditingDeteccion(null); }}
                title="Editar detección"
                okText="Guardar cambios"
                onOk={async () => {
                  try {
                    await apiUpdateDeteccionComplicacion(parsedId, deteccionIdForApi(editingDeteccion), {
                      fecha_deteccion: deteccionEditForm.fecha_deteccion || undefined,
                      fecha_diagnostico: deteccionEditForm.fecha_diagnostico || undefined,
                      observaciones: deteccionEditForm.observaciones?.trim() || undefined,
                    });
                    message.success('Detección actualizada');
                    setEditingDeteccion(null);
                    loadDeteccionesComplicaciones();
                  } catch (e) {
                    message.error(e?.response?.data?.error || e?.message || 'Error al actualizar');
                  }
                }}
              >
                <div style={{ display: 'grid', gap: '0.75rem' }}>
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
                          sanitizeForDisplay(
                            [doc.nombre, doc.apellido_paterno, doc.apellido_materno]
                              .filter(Boolean)
                              .join(' '),
                          ) || String(doc.id_doctor),
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
            <PacienteGraficosEvolucion pacienteId={parsedId} signosData={signos.data} loadSignos={loadSignos} signosLoading={signosLoading} />
          </Card>
        );
      default:
        return null;
    }
  };

  const initials = [p.nombre, p.apellido_paterno].filter(Boolean).map((x) => (x || '').charAt(0)).join('').toUpperCase().slice(0, 2) || '?';

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
            <span className={`patient-badge-status ${p.activo ? 'is-active' : 'is-inactive'}`}>
              {p.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="patient-header-actions" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            <Button variant="outline" type="button" onClick={() => setFormaModalOpen(true)}>
              Descargar FORMA en Excel
            </Button>
            <Button variant="outline" onClick={() => navigate(`/pacientes/${parsedId}/editar`)}>
              Editar paciente
            </Button>
          </div>
        </div>
      </header>

      {resumenMedicoLoading && !resumenMedico && (
        <Card className="patient-section-card" style={{ marginBottom: 'var(--space-4)' }}>
          <h2 className="patient-section-title">Resumen médico</h2>
          <LoadingSpinner />
        </Card>
      )}
      {resumenMedico && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <MedicalSummaryCard resumen={resumenMedico} />
        </div>
      )}

      <div className="patient-detail-cards-grid">
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
        onClose={() => setModalSection(null)}
      >
        {modalSection && renderTabContent(modalSection)}
      </PatientSectionModal>

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
      />
      <Modal open={showAllCitasOpen} onClose={() => setShowAllCitasOpen(false)} title="Historial de citas" footer={null} width={640}>
        {allCitasLoading ? <LoadingSpinner /> : allCitasData.length === 0 ? <EmptyState message="No hay citas" /> : (
          <ul className="tracking-list" style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {allCitasData.map((c, i) => (
              <li key={c.id_cita ?? c.id ?? i} className="tracking-item" style={{ cursor: 'pointer' }} onClick={() => { setShowAllCitasOpen(false); openDetalleCita(c.id_cita ?? c.id); }}>
                <span className="tracking-item-date">{formatDateTime(c.fecha_cita)}</span>
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

      {/* Modal FORMA (solo web): periodos con registros del paciente */}
      <Modal
        open={formaModalOpen}
        onClose={() => { setFormaModalOpen(false); setPeriodoSeleccionado(''); }}
        title="Descargar FORMA (Registro Mensual GAM)"
        cancelText="Cancelar"
        okText="Descargar Excel"
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
            downloadFormaExcel(data, `forma-paciente-${parsedId}-${anio}-${String(mes).padStart(2, '0')}.xlsx`);
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

function PacienteGraficosEvolucion({ pacienteId, signosData, loadSignos, signosLoading }) {
  const [filtroTiempo, setFiltroTiempo] = useState(FILTROS_TIEMPO.COMPLETO);

  useEffect(() => {
    if (pacienteId && (!signosData || signosData.length === 0)) loadSignos?.();
  }, [pacienteId, signosData?.length, loadSignos]);

  if (signosLoading || !signosData?.length) {
    return signosLoading ? <LoadingSpinner /> : <EmptyState message="No hay datos de signos vitales para graficar. Registra mediciones en la pestaña Signos vitales." />;
  }

  const signosFiltrados = filterSignosByTimeRange(signosData, filtroTiempo);
  const sorted = [...signosFiltrados].sort((a, b) => new Date(a.fecha_medicion) - new Date(b.fecha_medicion));
  const chartData = sorted.map((s) => {
    const imc = s.imc ?? calcIMC(s.peso_kg, s.talla_m);
    return {
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
  });

  const monthlyData = aggregateSignosByMonth(signosFiltrados).map((m) => ({ ...m, registros: m.totalRegistros }));

  const hasPeso = chartData.some((d) => d.peso_kg != null);
  const hasGlucosa = chartData.some((d) => d.glucosa_mg_dl != null);
  const hasPA = chartData.some((d) => d.presion_sistolica != null || d.presion_diastolica != null);
  const hasIMC = chartData.some((d) => d.imc != null);
  const hasColesterol = chartData.some((d) => d.colesterol_mg_dl != null || d.colesterol_ldl != null || d.colesterol_hdl != null);
  const hasHbA1c = chartData.some((d) => d.hba1c_porcentaje != null);
  const hasAnyChart = hasPeso || hasGlucosa || hasPA || hasIMC || hasColesterol || hasHbA1c;

  return (
    <div style={{ overflowX: 'auto' }}>
      <TimeRangeFilter value={filtroTiempo} onChange={setFiltroTiempo} />

      {monthlyData.length > 0 && (
        <div style={{ ...chartSectionStyle, marginBottom: 'var(--space-6)' }}>
          <h3 style={chartTitleStyle}>Registros por mes</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <YAxis domain={[0, 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value, 'Registros']} labelFormatter={(label) => label} />
              <Bar dataKey="registros" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} name="Registros" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasPeso && (
        <div style={chartSectionStyle}>
          <h3 style={chartTitleStyle}>Evolución del peso (kg)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [value != null ? `${value} kg` : '—', 'Peso']} labelFormatter={(label) => `Fecha: ${label}`} />
              <Line type="monotone" dataKey="peso_kg" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ fill: CHART_COLORS.primary, r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

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

      <ComparativaEvolucionSignos signosVitales={signosData} />
    </div>
  );
}
