import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { getPacienteById, getPacienteDoctores, assignDoctorToPaciente, unassignDoctorFromPaciente } from '../../api/pacientes';
import { getDoctores } from '../../api/doctores';
import { createCita } from '../../api/citas';
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
  deleteSignosVitales as apiDeleteSignosVitales,
  createDiagnostico as apiCreateDiagnostico,
  deleteDiagnostico as apiDeleteDiagnostico,
  createPacienteRedApoyo as apiCreateRedApoyo,
  updatePacienteRedApoyo as apiUpdateRedApoyo,
  deletePacienteRedApoyo as apiDeleteRedApoyo,
  createPacienteEsquemaVacunacion as apiCreateEsquemaVacunacion,
  deletePacienteEsquemaVacunacion as apiDeleteEsquemaVacunacion,
  addPacienteComorbilidad as apiAddComorbilidad,
  deletePacienteComorbilidad as apiDeleteComorbilidad,
  createSesionEducativa as apiCreateSesionEducativa,
  deleteSesionEducativa as apiDeleteSesionEducativa,
  createSaludBucal as apiCreateSaludBucal,
  deleteSaludBucal as apiDeleteSaludBucal,
  createDeteccionTuberculosis as apiCreateDeteccionTb,
  deleteDeteccionTuberculosis as apiDeleteDeteccionTb,
  createPacientePlanMedicacion as apiCreatePlanMedicacion,
  deletePacientePlanMedicacion as apiDeletePlanMedicacion,
} from '../../api/pacienteMedicalData';
import { PageHeader, DataCard } from '../../components/shared';
import { LoadingSpinner, Button, Card, Badge, EmptyState, Input, Select, TextArea, Modal } from '../../components/ui';
import RedApoyoCard from '../../components/pacientes/RedApoyoCard';
import MedicalSummaryCard from '../../components/pacientes/MedicalSummaryCard';
import ProximaCitaCard from '../../components/pacientes/ProximaCitaCard';
import SectionCard from '../../components/pacientes/SectionCard';
import PatientSectionModal from '../../components/pacientes/PatientSectionModal';
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
} from 'recharts';

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
    observaciones: '',
  });
  const [sesionModalOpen, setSesionModalOpen] = useState(false);
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
  const [newDiagnosticoDescripcion, setNewDiagnosticoDescripcion] = useState('');
  const [newDiagnosticoCitaId, setNewDiagnosticoCitaId] = useState('');
  const [diagnosticoSubmitError, setDiagnosticoSubmitError] = useState('');
  const [diagnosticoSubmitting, setDiagnosticoSubmitting] = useState(false);
  const [signosModalOpen, setSignosModalOpen] = useState(false);
  const [diagnosticoModalOpen, setDiagnosticoModalOpen] = useState(false);
  const [vacunaModalOpen, setVacunaModalOpen] = useState(false);
  const [comorbilidadModalOpen, setComorbilidadModalOpen] = useState(false);
  const [saludModalOpen, setSaludModalOpen] = useState(false);
  const [tbModalOpen, setTbModalOpen] = useState(false);
  const [assignDoctorModalOpen, setAssignDoctorModalOpen] = useState(false);

  const [citaModalOpen, setCitaModalOpen] = useState(false);
  const [citaForm, setCitaForm] = useState({ id_doctor: '', fecha_cita: '', motivo: '' });
  const [citaDoctores, setCitaDoctores] = useState([]);
  const [citaSubmitting, setCitaSubmitting] = useState(false);
  const [citaError, setCitaError] = useState('');

  const [medicacionModalOpen, setMedicacionModalOpen] = useState(false);
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
    if (modalSection === 'citas' || modalSection === 'diagnosticos') loadCitas();
    else if (modalSection === 'signos' || modalSection === 'graficos') loadSignos();
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
    if (modalSection === 'datos') loadResumenMedico();
  }, [modalSection, loadCitas, loadSignos, loadDiagnosticos, loadMedicamentos, loadRedApoyo, loadVacunacion, loadComorbilidades, loadDeteccionesComplicaciones, loadSesionesEducativas, loadSaludBucal, loadDeteccionesTuberculosis, loadDoctoresAsignados, loadResumenMedico, isAdmin]);

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
        const ultimoSigno = (signos.data || [])[0];

        return (
          <>
            {resumenMedicoLoading && !resumenMedico && (
              <Card className="patient-section-card">
                <h2 className="patient-section-title">Resumen médico</h2>
                <LoadingSpinner />
              </Card>
            )}
            {resumenMedico && <MedicalSummaryCard resumen={resumenMedico} />}

            <Card className="patient-section-card">
              <h2 className="patient-section-title">Monitoreo continuo</h2>
              {signosLoading ? (
                <LoadingSpinner />
              ) : !ultimoSigno ? (
                <EmptyState message="Aún no hay registros de signos vitales" />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
                    gap: '0.75rem',
                    fontSize: '0.95rem',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-texto-secundario)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Fecha última medición
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {formatDate(ultimoSigno.fecha_medicion)}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-texto-secundario)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Peso
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {ultimoSigno.peso_kg != null ? `${ultimoSigno.peso_kg} kg` : '—'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-texto-secundario)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      PA
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {ultimoSigno.presion_sistolica != null &&
                      ultimoSigno.presion_diastolica != null
                        ? `${ultimoSigno.presion_sistolica}/${ultimoSigno.presion_diastolica} mmHg`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-texto-secundario)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Glucosa
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {ultimoSigno.glucosa_mg_dl != null
                        ? `${ultimoSigno.glucosa_mg_dl} mg/dL`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--color-texto-secundario)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      HbA1c
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {ultimoSigno.hba1c_porcentaje != null
                        ? `${ultimoSigno.hba1c_porcentaje}%`
                        : '—'}
                    </div>
                  </div>
                </div>
              )}
            </Card>

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
                    onClick={() => navigate(`/citas/${c.id_cita ?? c.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/citas/${c.id_cita ?? c.id}`); } }}
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
          try {
            await apiCreateSignosVitales(parsedId, {
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
            });
            setSignosForm(emptySignosForm);
            loadSignos();
            setSignosModalOpen(false);
            message.success('Registro de signos vitales guardado');
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
                  <li key={s.id_signo ?? s.id_signo_vital ?? s.id ?? i} className="tracking-item">
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
                      <span className="tracking-item-actions">
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
                    }
                  }}
                  title="Nuevo registro de signos vitales"
                  okText={signosSubmitting ? 'Guardando…' : 'Guardar registro'}
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
        const handleCreateDiagnostico = async () => {
          const desc = newDiagnosticoDescripcion.trim();
          if (desc.length < 10) {
            setDiagnosticoSubmitError('La descripción debe tener al menos 10 caracteres.');
            return;
          }
          setDiagnosticoSubmitError('');
          setDiagnosticoSubmitting(true);
          try {
            await apiCreateDiagnostico(parsedId, {
              descripcion: desc,
              id_cita: newDiagnosticoCitaId ? parseInt(newDiagnosticoCitaId, 10) : undefined,
            });
            setNewDiagnosticoDescripcion('');
            setNewDiagnosticoCitaId('');
            loadDiagnosticos();
            setDiagnosticoModalOpen(false);
            message.success('Diagnóstico guardado');
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
                    <span className="tracking-item-date">{formatDate(d.fecha_registro ?? d.fecha_diagnostico)}</span>
                    <span className="tracking-item-body">{sanitizeForDisplay(d.descripcion ?? d.diagnostico) || '—'}</span>
                    {canEditMedical && (
                      <span className="tracking-item-actions">
                        <Button variant="secondary" size="small" onClick={() => handleDeleteDiagnostico(d.id_diagnostico ?? d.id)}>Eliminar</Button>
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
                    }
                  }}
                  title="Nuevo diagnóstico"
                  okText={diagnosticoSubmitting ? 'Guardando…' : 'Guardar diagnóstico'}
                  confirmLoading={diagnosticoSubmitting}
                  onOk={handleCreateDiagnostico}
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
          try {
            await apiCreatePlanMedicacion(parsedId, {
              fecha_inicio: fechaInicio,
              observaciones: medicacionForm.observaciones?.trim() || undefined,
              medicamentos: items.map((m) => ({
                id_medicamento: parsePositiveInt(m.id_medicamento, 0),
                dosis: (m.dosis || '').trim() || undefined,
                frecuencia: (m.frecuencia || '').trim() || undefined,
              })),
            });
            setMedicacionForm({
              fecha_inicio: '',
              observaciones: '',
              medicamentos: [{ id_medicamento: '', dosis: '', frecuencia: '' }],
            });
            setMedicacionModalOpen(false);
            loadMedicamentos();
            message.success('Plan de medicación creado');
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
                  <li key={m.id_plan ?? m.id ?? i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-borde-claro)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
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
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={async () => {
                          if (!window.confirm('¿Eliminar este plan de medicación?')) return;
                          try {
                            await apiDeletePlanMedicacion(parsedId, m.id_plan ?? m.id);
                            loadMedicamentos();
                            message.success('Plan eliminado');
                          } catch (e) {
                            message.error(e?.response?.data?.error || e?.message || 'Error al eliminar');
                          }
                        }}
                      >
                        Eliminar
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canEditMedical && (
              <Modal
                open={medicacionModalOpen}
                onClose={() => { if (!medicacionSubmitting) setMedicacionModalOpen(false); }}
                title="Nuevo plan de medicación"
                okText={medicacionSubmitting ? 'Guardando…' : 'Guardar plan'}
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
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        onClick={async () => {
                          const idEsquema = v.id_esquema ?? v.id;
                          if (!idEsquema) return;
                          // eslint-disable-next-line no-alert
                          if (!window.confirm('¿Eliminar este registro de vacunación?')) return;
                          try {
                            await apiDeleteEsquemaVacunacion(parsedId, idEsquema);
                            loadVacunacion();
                          } catch (e) {
                            // eslint-disable-next-line no-console
                            console.error('Error al eliminar esquema de vacunación', e);
                          }
                        }}
                      >
                        Eliminar
                      </Button>
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
                    }
                  }}
                  title="Agregar vacuna"
                  okText={vacunaSubmitting ? 'Guardando…' : 'Guardar vacuna'}
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
                      await apiCreateEsquemaVacunacion(parsedId, {
                        id_vacuna: idVac,
                        vacuna: undefined,
                        fecha_aplicacion: fecha,
                        lote: vacunaForm.lote?.trim() || undefined,
                        observaciones: vacunaForm.observaciones?.trim() || undefined,
                      });
                      setVacunaForm({
                        id_vacuna: '',
                        fecha_aplicacion: '',
                        lote: '',
                        observaciones: '',
                      });
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
                      <Button
                        type="button"
                        size="small"
                        variant="secondary"
                        onClick={async () => {
                          const idCom = c.id_relacion ?? c.id_paciente_comorbilidad ?? c.id_comorbilidad ?? c.id;
                          if (!idCom) return;
                          // eslint-disable-next-line no-alert
                          if (!window.confirm('¿Eliminar esta comorbilidad del paciente?')) return;
                          try {
                            await apiDeleteComorbilidad(parsedId, idCom);
                            loadComorbilidades();
                          } catch (e) {
                            // eslint-disable-next-line no-console
                            console.error('Error al eliminar comorbilidad', e);
                          }
                        }}
                      >
                        Eliminar
                      </Button>
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
                    }
                  }}
                  title="Agregar comorbilidad"
                  okText={comorbilidadSubmitting ? 'Guardando…' : 'Guardar comorbilidad'}
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
                      await apiAddComorbilidad(parsedId, {
                        id_comorbilidad: idCom,
                        fecha_deteccion: comorbilidadForm.fecha_deteccion || undefined,
                        observaciones: comorbilidadForm.observaciones?.trim() || undefined,
                      });
                      setComorbilidadForm({
                        id_comorbilidad: '',
                        fecha_deteccion: '',
                        observaciones: '',
                      });
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
      case 'detecciones':
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
                  <li key={d.id_deteccion ?? d.id ?? i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-borde-claro)' }}>
                    {formatDate(d.fecha_deteccion ?? d.fecha_creacion)} — {sanitizeForDisplay(d.tipo_complicacion ?? d.Comorbilidad?.nombre_comorbilidad) || 'Complicación'}
                    {d.fecha_diagnostico && ` · Dx: ${formatDate(d.fecha_diagnostico)}`}
                    {d.observaciones && ` — ${sanitizeForDisplay(d.observaciones)}`}
                  </li>
                ))}
              </ul>
            )}
            {deteccionesComplicaciones.total > (deteccionesComplicaciones.data?.length ?? 0) && (
              <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>Total: {deteccionesComplicaciones.total}</p>
            )}
          </Card>
        );
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
                        {s.observaciones && (
                          <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--color-texto-secundario)', marginTop: '0.25rem' }}>
                            {sanitizeForDisplay(s.observaciones)}
                          </span>
                        )}
                      </div>
                      {canEditMedical && (
                        <Button
                          type="button"
                          size="small"
                          variant="secondary"
                          onClick={async () => {
                            // eslint-disable-next-line no-alert
                            if (!window.confirm('¿Eliminar esta sesión educativa?')) return;
                            try {
                              await apiDeleteSesionEducativa(parsedId, id);
                              loadSesionesEducativas();
                            } catch (e) {
                              // eslint-disable-next-line no-console
                              console.error('Error al eliminar sesión educativa', e);
                            }
                          }}
                        >
                          Eliminar
                        </Button>
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
                    setSesionForm({ fecha_sesion: '', tipo_sesion: '', observaciones: '' });
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
                    }
                  }}
                  title="Nueva sesión educativa"
                  okText={sesionSubmitting ? 'Guardando…' : 'Guardar sesión'}
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
                      await apiCreateSesionEducativa(parsedId, {
                        fecha_sesion: fecha,
                        tipo_sesion: tipo,
                        observaciones: sesionForm.observaciones?.trim() || undefined,
                      });
                      setSesionForm({ fecha_sesion: '', tipo_sesion: '', observaciones: '' });
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
                    <Input
                      label="Tipo de sesión (ej. nutricional)"
                      value={sesionForm.tipo_sesion}
                      onChange={(e) => setSesionForm((f) => ({ ...f, tipo_sesion: e.target.value }))}
                    />
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
                        <Button
                          type="button"
                          size="small"
                          variant="secondary"
                          onClick={async () => {
                            // eslint-disable-next-line no-alert
                            if (!window.confirm('¿Eliminar este registro de salud bucal?')) return;
                            try {
                              await apiDeleteSaludBucal(parsedId, id);
                              loadSaludBucal();
                            } catch (e) {
                              // eslint-disable-next-line no-console
                              console.error('Error al eliminar salud bucal', e);
                            }
                          }}
                        >
                          Eliminar
                        </Button>
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
                    }
                  }}
                  title="Nuevo registro de salud bucal"
                  okText={saludSubmitting ? 'Guardando…' : 'Guardar registro'}
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
                      await apiCreateSaludBucal(parsedId, {
                        fecha_registro: fecha,
                        presenta_enfermedades_odontologicas:
                          !!saludForm.presenta_enfermedades_odontologicas,
                        recibio_tratamiento_odontologico:
                          !!saludForm.recibio_tratamiento_odontologico,
                        observaciones: saludForm.observaciones?.trim() || undefined,
                      });
                      setSaludForm({
                        fecha_registro: '',
                        presenta_enfermedades_odontologicas: false,
                        recibio_tratamiento_odontologico: false,
                        observaciones: '',
                      });
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
                        <Button
                          type="button"
                          size="small"
                          variant="secondary"
                          onClick={async () => {
                            // eslint-disable-next-line no-alert
                            if (!window.confirm('¿Eliminar esta detección de tuberculosis?')) return;
                            try {
                              await apiDeleteDeteccionTb(parsedId, id);
                              loadDeteccionesTuberculosis();
                            } catch (e) {
                              // eslint-disable-next-line no-console
                              console.error('Error al eliminar detección de tuberculosis', e);
                            }
                          }}
                        >
                          Eliminar
                        </Button>
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
                    }
                  }}
                  title="Nueva detección de tuberculosis"
                  okText={tbSubmitting ? 'Guardando…' : 'Guardar detección'}
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
                      await apiCreateDeteccionTb(parsedId, {
                        fecha_deteccion: fecha,
                        aplicacion_encuesta: !!tbForm.aplicacion_encuesta,
                        baciloscopia_realizada: !!tbForm.baciloscopia_realizada,
                        baciloscopia_resultado: tbForm.baciloscopia_resultado?.trim() || undefined,
                        ingreso_tratamiento: !!tbForm.ingreso_tratamiento,
                        observaciones: tbForm.observaciones?.trim() || undefined,
                      });
                      setTbForm({
                        fecha_deteccion: '',
                        aplicacion_encuesta: false,
                        baciloscopia_realizada: false,
                        baciloscopia_resultado: '',
                        ingreso_tratamiento: false,
                        observaciones: '',
                      });
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
              <li key={s.id_signo ?? s.id_signo_vital ?? s.id ?? i} className="tracking-item">
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
      <Modal open={showAllCitasOpen} onClose={() => setShowAllCitasOpen(false)} title="Historial de citas" footer={null} width={640}>
        {allCitasLoading ? <LoadingSpinner /> : allCitasData.length === 0 ? <EmptyState message="No hay citas" /> : (
          <ul className="tracking-list" style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {allCitasData.map((c, i) => (
              <li key={c.id_cita ?? c.id ?? i} className="tracking-item" style={{ cursor: 'pointer' }} onClick={() => { setShowAllCitasOpen(false); navigate(`/citas/${c.id_cita ?? c.id}`); }}>
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
};

function PacienteGraficosEvolucion({ pacienteId, signosData, loadSignos, signosLoading }) {
  useEffect(() => {
    if (pacienteId && (!signosData || signosData.length === 0)) loadSignos?.();
  }, [pacienteId, signosData?.length, loadSignos]);

  if (signosLoading || !signosData?.length) {
    return signosLoading ? <LoadingSpinner /> : <EmptyState message="No hay datos de signos vitales para graficar. Registra mediciones en la pestaña Signos vitales." />;
  }

  const sorted = [...signosData].sort((a, b) => new Date(a.fecha_medicion) - new Date(b.fecha_medicion));
  const chartData = sorted.map((s) => ({
    fecha: formatDate(s.fecha_medicion),
    fechaRaw: s.fecha_medicion,
    peso_kg: s.peso_kg != null ? Number(s.peso_kg) : null,
    glucosa_mg_dl: s.glucosa_mg_dl != null ? Number(s.glucosa_mg_dl) : null,
  }));

  const hasPeso = chartData.some((d) => d.peso_kg != null);
  const hasGlucosa = chartData.some((d) => d.glucosa_mg_dl != null);

  const tooltipStyle = {
    fontSize: 'var(--text-sm)',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-borde-claro)',
    backgroundColor: 'var(--color-fondo-card)',
    boxShadow: 'var(--shadow-md)',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      {hasPeso && (
        <div style={{ minWidth: 280, marginBottom: 'var(--space-8)', height: 260 }}>
          <h3 style={{ fontSize: 'var(--text-base)', color: 'var(--color-texto-secundario)', marginBottom: 'var(--space-2)', fontWeight: 'var(--font-semibold)' }}>
            Evolución del peso (kg)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} kg`, 'Peso']} labelFormatter={(label) => `Fecha: ${label}`} />
              <Line type="monotone" dataKey="peso_kg" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ fill: CHART_COLORS.primary, r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasGlucosa && (
        <div style={{ minWidth: 280, height: 260 }}>
          <h3 style={{ fontSize: 'var(--text-base)', color: 'var(--color-texto-secundario)', marginBottom: 'var(--space-2)', fontWeight: 'var(--font-semibold)' }}>
            Evolución de glucosa (mg/dL)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--color-texto-secundario)' }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} mg/dL`, 'Glucosa']} labelFormatter={(label) => `Fecha: ${label}`} />
              <Bar dataKey="glucosa_mg_dl" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} name="Glucosa" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {!hasPeso && !hasGlucosa && (
        <p style={{ color: 'var(--color-texto-secundario)', fontSize: 'var(--text-sm)' }}>
          No hay datos de peso ni glucosa para mostrar. Registra mediciones en la pestaña Signos vitales.
        </p>
      )}
    </div>
  );
}
