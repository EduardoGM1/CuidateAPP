import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Paragraph, Button, IconButton, Chip, Switch, TextInput } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { usePacienteDetails, useDoctores } from '../../hooks/useGestion';
import { usePacienteMedicalData, usePacienteRedApoyo, usePacienteEsquemaVacunacion, usePacienteComorbilidades, usePacienteDeteccionesComplicaciones, usePacienteSesionesEducativas, usePacienteSaludBucal, usePacienteDeteccionTuberculosis } from '../../hooks/usePacienteMedicalData';
import Logger from '../../services/logger';
import gestionService from '../../api/gestionService';
import DateInput from '../../components/DateInput';
import DateInputSeparated from '../../components/DateInputSeparated';
import DatePickerButton from '../../components/DatePickerButton';
import TimePickerButton from '../../components/TimePickerButton';
import DateTimePickerButton from '../../components/DateTimePickerButton';
import { validateCita, validateSignosVitales } from '../../utils/citaValidator';
import { generarDatosSignosVitales, generarDatosDiagnostico, generarDatosCita } from '../../services/testDataService';
import { canExecute } from '../../utils/validation';
import { ESTADOS_CITA, COLORES } from '../../utils/constantes';
import { downloadFile, downloadAndOpenFile, downloadCSV, downloadPDF } from '../../utils/fileDownloader';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import { storageService } from '../../services/storageService';
import { getApiConfig } from '../../config/apiConfig';

// Nuevos hooks y contextos para refactorización
import useModalManager from '../../hooks/useModalManager';
import { DetallePacienteProvider, useDetallePacienteContext } from '../../context/DetallePacienteContext';

// Componentes refactorizados
import PatientHeader from '../../components/DetallePaciente/PatientHeader';
import PatientGeneralInfo from '../../components/DetallePaciente/PatientGeneralInfo';
import MedicalSummary from '../../components/DetallePaciente/MedicalSummary';
import ComorbilidadesSection from '../../components/DetallePaciente/ComorbilidadesSection';
import AlertBanner from '../../components/common/AlertBanner';
import ProximaCitaCard from '../../components/DetallePaciente/ProximaCitaCard';
import HistorialConsultasModal from '../../components/DetallePaciente/HistorialConsultasModal';
import MonitoreoContinuoSection from '../../components/DetallePaciente/MonitoreoContinuoSection';
import ConsultasTimeline from '../../components/DetallePaciente/ConsultasTimeline';

// Componentes reutilizables para modales
import OptionsModal from '../../components/DetallePaciente/shared/OptionsModal';
import HistoryModal from '../../components/DetallePaciente/shared/HistoryModal';
import ModalBase from '../../components/DetallePaciente/shared/ModalBase';
import FormModal from '../../components/DetallePaciente/shared/FormModal';
import CompletarCitaWizard from '../../components/CompletarCitaWizard';

// Hooks personalizados
import useFormState from '../../hooks/useFormState';
import useSaveHandler from '../../hooks/useSaveHandler';
import useScreenFocus from '../../hooks/useScreenFocus';

// Componente interno que usa los hooks
const DetallePacienteContent = ({ route, navigation }) => {
  const { paciente: initialPaciente } = route.params;
  const { userRole } = useAuth();
  
  // SOLUCIÓN: Normalizar pacienteId de forma más robusta
  // Asegurar que siempre tengamos un ID válido antes de hacer peticiones
  const pacienteId = useMemo(() => {
    const id = initialPaciente?.id_paciente || initialPaciente?.id;
    if (id) {
      Logger.debug('DetallePaciente: pacienteId normalizado', { 
        id, 
        hasInitialPaciente: !!initialPaciente,
        id_paciente: initialPaciente?.id_paciente,
        id_normal: initialPaciente?.id
      });
    }
    return id;
  }, [initialPaciente]);
  
  // Validar que solo administradores o doctores puedan acceder
  // Los doctores solo pueden ver pacientes asignados (validado en backend)
  useEffect(() => {
    if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'administrador' && 
        userRole !== 'Doctor' && userRole !== 'doctor') {
      Logger.warn('Acceso no autorizado a detalle de paciente', { userRole });
      navigation.goBack();
    }
  }, [userRole, navigation]);
  
  // SOLUCIÓN: Solo llamar al hook cuando pacienteId esté disponible
  // Obtener datos completos del paciente desde la API
  const { paciente, loading, error, refresh } = usePacienteDetails(pacienteId);
  
  // ✅ Backend ya normaliza comorbilidades usando pacienteMapper
  // Solo logging para debug (opcional, puede eliminarse en producción)
  useEffect(() => {
    if (paciente) {
      Logger.debug('DetallePaciente: Datos del paciente recibidos', {
        pacienteId: paciente.id_paciente,
        hasComorbilidades: !!paciente.comorbilidades,
        comorbilidadesLength: paciente.comorbilidades?.length || 0,
        // Mostrar estructura de primera comorbilidad para verificación
        primeraComorbilidad: paciente.comorbilidades?.[0] || null
      });
    }
  }, [paciente]);
  
  // 🔥 NUEVO: Modal Manager Hook - Centraliza gestión de modales
  const modalManager = useModalManager();
  
  // SOLUCIÓN: Solo cargar datos médicos cuando pacienteId esté disponible
  // Hook para datos médicos (limit: 5 para todos excepto signos vitales que usaremos limit: 1 directamente)
  const {
    citas,
    signosVitales,
    diagnosticos,
    medicamentos,
    resumen,
    loading: medicalLoading,
    error: medicalError,
    refreshAll: refreshMedicalData,
    totalCitas,
    totalSignosVitales
  } = usePacienteMedicalData(pacienteId, {
    limit: 5,
    autoFetch: true // ✅ Siempre habilitado - el hook valida pacienteId internamente
  });
  
  // Filtrar para mostrar solo 1 registro más reciente en la vista principal
  // (Memoizado más abajo después de definir funciones auxiliares)
  
  // Hooks para Red de Apoyo y Esquema de Vacunación
  // ✅ autoFetch siempre habilitado - los hooks validan pacienteId internamente
  const { redApoyo, loading: loadingRedApoyo, refresh: refreshRedApoyo } = usePacienteRedApoyo(pacienteId, { autoFetch: true });
  const { esquemaVacunacion, loading: loadingEsquemaVacunacion, refresh: refreshEsquemaVacunacion } = usePacienteEsquemaVacunacion(pacienteId, { autoFetch: true });
  const { comorbilidades: comorbilidadesPaciente, loading: loadingComorbilidades, refresh: refreshComorbilidades } = usePacienteComorbilidades(pacienteId, { autoFetch: true });
  const { detecciones, loading: loadingDetecciones, refresh: refreshDetecciones } = usePacienteDeteccionesComplicaciones(pacienteId, { autoFetch: true, limit: 5 });
  const { sesionesEducativas, loading: loadingSesionesEducativas, refresh: refreshSesionesEducativas } = usePacienteSesionesEducativas(pacienteId, { autoFetch: true, limit: 10 });
  const { saludBucal, loading: loadingSaludBucal, refresh: refreshSaludBucal } = usePacienteSaludBucal(pacienteId, { autoFetch: true, limit: 5 });
  const { deteccionesTuberculosis, loading: loadingDeteccionesTuberculosis, refresh: refreshDeteccionesTuberculosis } = usePacienteDeteccionTuberculosis(pacienteId, { autoFetch: true, limit: 5 });
  
  // Hook para obtener doctores para selector de citas
  const { doctores: doctoresList } = useDoctores('activos', 'recent');
  
  // Refrescar datos cuando la pantalla se enfoca
  useScreenFocus(
    [
      refresh,
      refreshMedicalData,
      refreshRedApoyo,
      refreshEsquemaVacunacion,
      refreshComorbilidades,
      refreshDetecciones,
      refreshSesionesEducativas,
      refreshSaludBucal,
      refreshDeteccionesTuberculosis
    ],
    {
      enabled: !!pacienteId,
      screenName: 'DetallePaciente',
      dependencies: [pacienteId]
    }
  );
  
  // Estados para vacunas del sistema (catálogo)
  const [vacunasSistema, setVacunasSistema] = useState([]);
  const [loadingVacunas, setLoadingVacunas] = useState(false);
  const [showVacunaSelector, setShowVacunaSelector] = useState(false);

  // Estados para comorbilidades del sistema (catálogo)
  const [comorbilidadesSistema, setComorbilidadesSistema] = useState([]);
  const [loadingComorbilidadesSistema, setLoadingComorbilidadesSistema] = useState(false);
  const [showComorbilidadSelector, setShowComorbilidadSelector] = useState(false);
  
  const [refreshing, setRefreshing] = useState(false);

  const [showAllDetecciones, setShowAllDetecciones] = useState(false);
  const [showDeteccionModal, setShowDeteccionModal] = useState(false);
  const [editingDeteccion, setEditingDeteccion] = useState(null);
  const [showOptionsDetecciones, setShowOptionsDetecciones] = useState(false);
  const [showMonitoreoDetalle, setShowMonitoreoDetalle] = useState(false);
  const [monitoreoDetalle, setMonitoreoDetalle] = useState(null);
  // ✅ Estados para Salud Bucal (Instrucción ⑫)
  const [showAllSaludBucal, setShowAllSaludBucal] = useState(false);
  const [showSaludBucalModal, setShowSaludBucalModal] = useState(false);
  const [editingSaludBucal, setEditingSaludBucal] = useState(null);
  const [showOptionsSaludBucal, setShowOptionsSaludBucal] = useState(false);
  const [formSaludBucal, setFormSaludBucal] = useState({
    fecha_registro: new Date().toISOString().split('T')[0],
    presenta_enfermedades_odontologicas: false,
    recibio_tratamiento_odontologico: false,
    observaciones: ''
  });

  // ✅ Estados para Detección de Tuberculosis (Instrucción ⑬)
  const [showAllDeteccionesTuberculosis, setShowAllDeteccionesTuberculosis] = useState(false);
  const [showDeteccionTuberculosisModal, setShowDeteccionTuberculosisModal] = useState(false);
  const [editingDeteccionTuberculosis, setEditingDeteccionTuberculosis] = useState(null);
  const [showOptionsDeteccionesTuberculosis, setShowOptionsDeteccionesTuberculosis] = useState(false);
  const [formDeteccionTuberculosis, setFormDeteccionTuberculosis] = useState({
    fecha_deteccion: new Date().toISOString().split('T')[0],
    aplicacion_encuesta: false,
    baciloscopia_realizada: false,
    baciloscopia_resultado: '',
    ingreso_tratamiento: false,
    observaciones: ''
  });

  const [accordionState, setAccordionState] = useState({
    redApoyo: false,
    esquemaVacunacion: false,
    complicaciones: false,
    comorbilidades: false,
    medicamentos: false,
    sesionesEducativas: false,
    saludBucal: false, // ✅ Instrucción ⑫
    deteccionesTuberculosis: false // ✅ Instrucción ⑬
  });
  const [formDeteccion, setFormDeteccion] = useState({
    tipo_complicacion: '', // Instrucción ⑩
    fecha_deteccion: new Date().toISOString().split('T')[0], // Obligatorio
    fecha_diagnostico: '', // Opcional
    observaciones: '',
    // Exámenes realizados - Instrucciones ⑦ y ⑧
    exploracion_pies: false,
    exploracion_fondo_ojo: false,
    // Auto-monitoreo - Instrucción ⑨
    realiza_auto_monitoreo: false,
    auto_monitoreo_glucosa: false,
    auto_monitoreo_presion: false,
    // ✅ Campos según formato GAM - Instrucción ⑥
    microalbuminuria_realizada: false, // ⑥ Cobertura Microalbuminuria
    microalbuminuria_resultado: '', // Resultado de microalbuminuria
    // ✅ Campos según formato GAM - Instrucción ⑪
    fue_referido: false, // ⑪ Referencia
    referencia_observaciones: '' // Detalles de la referencia
  });
  
  // Estado para controlar el loading del expediente completo
  const [exportandoExpediente, setExportandoExpediente] = useState(false);
  
  // 🔥 Registrar todos los modales al inicializar
  useEffect(() => {
    // Registrar todos los modales de opciones
    const modalesParaRegistrar = [
      'optionsCitas',
      'optionsSignosVitales',
      'optionsDiagnosticos',
      'optionsMedicamentos',
      'optionsRedApoyo',
      'optionsEsquemaVacunacion',
      'optionsComorbilidades',
      'addCita',
      'addSignosVitales',
      'addDiagnostico',
      'addMedicamentos',
      'addRedApoyo',
      'addEsquemaVacunacion',
      'addComorbilidad',
      'showAllCitas',
      'showAllSignosVitales',
      'showAllDiagnosticos',
      'showAllMedicamentos',
      'showAllRedApoyo',
      'showAllEsquemaVacunacion',
      'showAllComorbilidades',
      'optionsDoctores',
      'showAllDoctores',
      'addDoctor',
      'replaceDoctor',
      'detalleCita',
      'consultaCompleta'
    ];
    
    modalesParaRegistrar.forEach(modalName => {
      modalManager.register(modalName);
    });
    
    Logger.debug('Modales registrados en DetallePaciente', { count: modalesParaRegistrar.length });
  }, [modalManager]);

  // ✅ SOLUCIÓN: Asegurar carga inicial de datos cuando pacienteId esté disponible
  // Este useEffect se ejecuta cuando pacienteId cambia de undefined a un valor
  // y fuerza la carga inicial si los hooks no la han iniciado automáticamente
  const hasInitialLoad = useRef(false);
  useEffect(() => {
    if (pacienteId && !hasInitialLoad.current) {
      Logger.info('DetallePaciente: pacienteId disponible por primera vez, asegurando carga inicial', { pacienteId });
      hasInitialLoad.current = true;
      
      // Pequeño delay para asegurar que los hooks estén completamente inicializados
      const timer = setTimeout(() => {
        try {
          // Forzar carga inicial de todos los datos médicos
          // Los hooks ya deberían estar cargando, pero esto asegura que se ejecuten
          if (refreshMedicalData) {
            refreshMedicalData();
          }
          if (refreshRedApoyo) {
            refreshRedApoyo();
          }
          if (refreshEsquemaVacunacion) {
            refreshEsquemaVacunacion();
          }
          if (refreshComorbilidades) {
            refreshComorbilidades();
          }
          
          Logger.debug('DetallePaciente: Carga inicial forzada', { pacienteId });
        } catch (error) {
          Logger.error('Error asegurando carga inicial de datos médicos', error);
        }
      }, 100); // 100ms de delay para asegurar que los hooks estén inicializados
      
      return () => clearTimeout(timer);
    }
    
    // Resetear flag si pacienteId cambia a undefined
    if (!pacienteId) {
      hasInitialLoad.current = false;
    }
  }, [pacienteId, refreshMedicalData, refreshRedApoyo, refreshEsquemaVacunacion, refreshComorbilidades]);
  
  // Estados para modal de detalle de cita
  const [citaDetalle, setCitaDetalle] = useState(null);
  const [loadingCitaDetalle, setLoadingCitaDetalle] = useState(false);
  // Disparador para refrescar el card "Última cita" al cerrar el modal detalle (evitar estado desactualizado)
  const [refreshCitasTrigger, setRefreshCitasTrigger] = useState(0);
  const [refreshSignosTrigger, setRefreshSignosTrigger] = useState(0);
  
  // Estados para modal de signos vitales
  const [showAllSignosVitales, setShowAllSignosVitales] = useState(false);
  const [allSignosVitales, setAllSignosVitales] = useState([]);
  const [loadingAllSignos, setLoadingAllSignos] = useState(false);
  
  // Estados para modal de historial completo de citas
  const [showAllCitas, setShowAllCitas] = useState(false);
  
  // Estados para formulario de agregar signos vitales
  const [showAddSignosVitales, setShowAddSignosVitales] = useState(false);
  const [savingSignosVitales, setSavingSignosVitales] = useState(false);
  const [editingSignosVitales, setEditingSignosVitales] = useState(null);
  const [formDataSignosVitales, setFormDataSignosVitales] = useState({
    id_cita: '', // ✅ FASE 1: Agregado campo para asociar a cita (opcional)
    peso_kg: '',
    talla_m: '',
    medida_cintura_cm: '',
    presion_sistolica: '',
    presion_diastolica: '',
    glucosa_mg_dl: '',
    colesterol_mg_dl: '',
    colesterol_ldl: '', // ✅ Colesterol LDL - Solo para pacientes con diagnóstico
    colesterol_hdl: '', // ✅ Colesterol HDL - Solo para pacientes con diagnóstico
    trigliceridos_mg_dl: '',
    hba1c_porcentaje: '', // ✅ HbA1c (%) - Campo obligatorio para criterios de acreditación
    edad_paciente_en_medicion: '', // ✅ Edad en medición (para validar rangos de HbA1c)
    observaciones: ''
  });
  
  // ✅ DEPRECATED: Usamos modalManager ahora
  // Mantenemos por compatibilidad durante migración gradual
  const [showOptionsCitas, setShowOptionsCitas] = useState(false);
  const [showOptionsSignosVitales, setShowOptionsSignosVitales] = useState(false);
  const [showOptionsDiagnosticos, setShowOptionsDiagnosticos] = useState(false);
  const [showOptionsMedicamentos, setShowOptionsMedicamentos] = useState(false);
  
  // Estados para formulario de agregar diagnóstico
  const [showAddDiagnostico, setShowAddDiagnostico] = useState(false);
  const [editingDiagnostico, setEditingDiagnostico] = useState(null);
  const [formDataDiagnostico, setFormDataDiagnostico] = useState({
    id_cita: '',
    descripcion: ''
  });
  
  // Estados para formulario de agregar citas
  const [showAddCita, setShowAddCita] = useState(false);
  const [savingCita, setSavingCita] = useState(false);
  const [editingCita, setEditingCita] = useState(null);
  const [showDoctorDropdownCita, setShowDoctorDropdownCita] = useState(false);
  const [formDataCita, setFormDataCita] = useState({
    id_doctor: '',
    fecha_cita: '',
    motivo: '',
    observaciones: '',
    es_primera_consulta: false
  });

  // ✅ Estados para formulario unificado de consulta completa
  const [showConsultaCompleta, setShowConsultaCompleta] = useState(false);
  const [savingConsultaCompleta, setSavingConsultaCompleta] = useState(false);
  const [modoConsulta, setModoConsulta] = useState('crear_nueva'); // 'crear_nueva' o 'completar_existente'
  const [citaSeleccionadaCompleta, setCitaSeleccionadaCompleta] = useState(null);
  
  // ✅ Estados para wizard de completar cita
  const [showWizard, setShowWizard] = useState(false);
  const [citaSeleccionadaWizard, setCitaSeleccionadaWizard] = useState(null);
  const [seccionesExpandidas, setSeccionesExpandidas] = useState({
    signosVitales: false,
    diagnostico: false,
    planMedicacion: false
  });
  const [formDataConsultaCompleta, setFormDataConsultaCompleta] = useState({
    // Datos de cita
    cita: {
      id_doctor: '',
      fecha_cita: '',
      motivo: '',
      observaciones: '',
      es_primera_consulta: false,
      id_cita: null // Si se completa una existente
    },
    // Signos vitales
    signos_vitales: {
      peso_kg: '',
      talla_m: '',
      medida_cintura_cm: '',
      presion_sistolica: '',
      presion_diastolica: '',
      glucosa_mg_dl: '',
      colesterol_mg_dl: '',
      trigliceridos_mg_dl: '',
      observaciones: ''
    },
    // Diagnóstico
    diagnostico: {
      descripcion: ''
    },
    // Plan de medicación
    plan_medicacion: {
      observaciones: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: '',
      medicamentos: []
    }
  });
  
  // Estados para formulario de agregar medicamentos
  const [showAddMedicamentos, setShowAddMedicamentos] = useState(false);
  const [editingMedicamento, setEditingMedicamento] = useState(null);
  const [medicamentosDisponibles, setMedicamentosDisponibles] = useState([]);
  const [loadingMedicamentos, setLoadingMedicamentos] = useState(false);
  const [formDataMedicamentos, setFormDataMedicamentos] = useState({
    id_cita: '',
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '',
    medicamentos: [] // Array de { id_medicamento, dosis, frecuencia, horario, via_administracion, observaciones }
  });

  // Estados para modales de opciones Red de Apoyo y Esquema Vacunación
  const [showOptionsRedApoyo, setShowOptionsRedApoyo] = useState(false);
  const [showOptionsEsquemaVacunacion, setShowOptionsEsquemaVacunacion] = useState(false);
  const [showOptionsComorbilidades, setShowOptionsComorbilidades] = useState(false);
  
  // Estados para modales de historial
  const [showAllRedApoyo, setShowAllRedApoyo] = useState(false);
  const [showAllEsquemaVacunacion, setShowAllEsquemaVacunacion] = useState(false);
  const [showAllComorbilidades, setShowAllComorbilidades] = useState(false);
  const [showAllDiagnosticos, setShowAllDiagnosticos] = useState(false);
  const [showAllMedicamentos, setShowAllMedicamentos] = useState(false);
  const [showAllDoctores, setShowAllDoctores] = useState(false);
  
  // Estados para gestión de doctores del paciente
  const [doctoresPaciente, setDoctoresPaciente] = useState([]);
  const [loadingDoctoresPaciente, setLoadingDoctoresPaciente] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showReplaceDoctor, setShowReplaceDoctor] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [doctorSeleccionado, setDoctorSeleccionado] = useState(null);
  const { formData: formDataDoctor, updateField: updateDoctorField, resetForm: resetFormDoctor } = useFormState({
    id_doctor: '',
    observaciones: ''
  });
  
  // Estados para formulario de agregar Red de Apoyo
  const [showAddRedApoyo, setShowAddRedApoyo] = useState(false);
  const [contactoRedApoyoSeleccionado, setContactoRedApoyoSeleccionado] = useState(null);
  const [vacunaEsquemaSeleccionada, setVacunaEsquemaSeleccionada] = useState(null);
  const [medicamentoSeleccionado, setMedicamentoSeleccionado] = useState(null);
  const [deteccionComplicacionSeleccionada, setDeteccionComplicacionSeleccionada] = useState(null);
  const [comorbilidadSeleccionada, setComorbilidadSeleccionada] = useState(null);
  const [registroSaludBucalSeleccionado, setRegistroSaludBucalSeleccionado] = useState(null);
  const [deteccionTbSeleccionada, setDeteccionTbSeleccionada] = useState(null);
  const [editingRedApoyo, setEditingRedApoyo] = useState(null);
  const [showParentescoModal, setShowParentescoModal] = useState(false);
  const { formData: formDataRedApoyo, updateField: updateRedApoyoField, resetForm: resetFormRedApoyo } = useFormState({
    nombre_contacto: '',
    numero_celular: '',
    email: '',
    direccion: '',
    localidad: '',
    parentesco: ''
  });
  
  // Opciones de parentesco
  const parentescoOptions = [
    { label: 'Padre', value: 'Padre' },
    { label: 'Madre', value: 'Madre' },
    { label: 'Hijo(a)', value: 'Hijo' },
    { label: 'Esposo(a)', value: 'Esposo' },
    { label: 'Hermano(a)', value: 'Hermano' },
    { label: 'Abuelo(a)', value: 'Abuelo' },
    { label: 'Tío(a)', value: 'Tio' },
    { label: 'Primo(a)', value: 'Primo' },
    { label: 'Suegro(a)', value: 'Suegro' },
    { label: 'Cuñado(a)', value: 'Cunado' },
    { label: 'Yerno/Nuera', value: 'Yerno' },
    { label: 'Amigo(a)', value: 'Amigo' },
    { label: 'Otro', value: 'Otro' },
  ];
  
  // Estados para formulario de agregar Esquema de Vacunación
  const [showAddEsquemaVacunacion, setShowAddEsquemaVacunacion] = useState(false);
  const [editingEsquemaVacunacion, setEditingEsquemaVacunacion] = useState(null);
  const { formData: formDataEsquemaVacunacion, updateField: updateEsquemaVacunacionField, resetForm: resetFormEsquemaVacunacionBase } = useFormState({
    vacuna: '',
    fecha_aplicacion: '',
    lote: '',
    observaciones: ''
  });
  
  // Wrapper para resetFormEsquemaVacunacion que también resetea showVacunaSelector
  const resetFormEsquemaVacunacion = useCallback(() => {
    resetFormEsquemaVacunacionBase();
    setShowVacunaSelector(false);
  }, [resetFormEsquemaVacunacionBase]);

  // Estados para formulario de agregar Sesiones Educativas
  const [showAddSesionEducativa, setShowAddSesionEducativa] = useState(false);
  const [editingSesionEducativa, setEditingSesionEducativa] = useState(null);
  const [savingSesionEducativa, setSavingSesionEducativa] = useState(false);
  const { formData: formDataSesionEducativa, updateField: updateSesionEducativaField, resetForm: resetFormSesionEducativaBase } = useFormState({
    fecha_sesion: new Date().toISOString().split('T')[0],
    asistio: false,
    tipo_sesion: 'nutricional',
    numero_intervenciones: 1,
    observaciones: '',
    id_cita: ''
  });
  const resetFormSesionEducativa = useCallback(() => {
    resetFormSesionEducativaBase();
    setEditingSesionEducativa(null);
  }, [resetFormSesionEducativaBase]);

  // Estados para formulario de agregar Comorbilidad
  const [showAddComorbilidad, setShowAddComorbilidad] = useState(false);
  const [editingComorbilidad, setEditingComorbilidad] = useState(null);
  const { formData: formDataComorbilidad, updateField: updateComorbilidadField, resetForm: resetFormComorbilidadBase } = useFormState({
    id_comorbilidad: null,
    fecha_deteccion: '',
    observaciones: '',
    anos_padecimiento: '',
    // ✅ Nuevos campos según formato GAM
    es_diagnostico_basal: false, // ① Basal del paciente
    año_diagnostico: '', // Año del Dx
    es_agregado_posterior: false, // Dx. Agregados posterior al Basal
    recibe_tratamiento_no_farmacologico: false, // ② No Farmacológico
    recibe_tratamiento_farmacologico: false // ③ Farmacológico (sincronizado automáticamente)
  });
  
  // Wrapper para resetFormComorbilidad que también resetea editingComorbilidad
  const resetFormComorbilidad = useCallback(() => {
    resetFormComorbilidadBase();
    setEditingComorbilidad(null);
    setShowComorbilidadSelector(false);
  }, [resetFormComorbilidadBase]);

  // Función para cargar vacunas del sistema
  const loadVacunasSistema = useCallback(async () => {
    try {
      setLoadingVacunas(true);
      Logger.info('Cargando vacunas del sistema para selector...');
      
      const vacunas = await gestionService.getVacunas({ limit: 200 }); // Obtener hasta 200 vacunas
      
      if (Array.isArray(vacunas)) {
        setVacunasSistema(vacunas);
        Logger.info('Vacunas del sistema cargadas', { count: vacunas.length });
      } else {
        Logger.warn('Formato de respuesta inesperado al cargar vacunas', { vacunas });
        setVacunasSistema([]);
      }
    } catch (error) {
      Logger.error('Error cargando vacunas del sistema', error);
      setVacunasSistema([]);
    } finally {
      setLoadingVacunas(false);
    }
  }, []);
  
  // Cargar vacunas cuando se abre el modal de agregar vacuna
  useEffect(() => {
    if (showAddEsquemaVacunacion && vacunasSistema.length === 0) {
      loadVacunasSistema();
    }
  }, [showAddEsquemaVacunacion, vacunasSistema.length, loadVacunasSistema]);

  // Función para cargar comorbilidades del sistema (catálogo)
  const loadComorbilidadesSistema = useCallback(async () => {
    try {
      setLoadingComorbilidadesSistema(true);
      Logger.info('Cargando comorbilidades del sistema para selector...');
      
      const comorbilidades = await gestionService.getComorbilidades({ limit: 200 }); // Obtener hasta 200 comorbilidades
      
      if (Array.isArray(comorbilidades)) {
        setComorbilidadesSistema(comorbilidades);
        Logger.info('Comorbilidades del sistema cargadas', { count: comorbilidades.length });
      } else {
        Logger.warn('Formato de respuesta inesperado al cargar comorbilidades', { comorbilidades });
        setComorbilidadesSistema([]);
      }
    } catch (error) {
      Logger.error('Error cargando comorbilidades del sistema', error);
      setComorbilidadesSistema([]);
    } finally {
      setLoadingComorbilidadesSistema(false);
    }
  }, []);

  // Cargar comorbilidades cuando se abre el modal de agregar comorbilidad
  useEffect(() => {
    if (showAddComorbilidad && comorbilidadesSistema.length === 0) {
      loadComorbilidadesSistema();
    }
  }, [showAddComorbilidad, comorbilidadesSistema.length, loadComorbilidadesSistema]);

  // Función para calcular la edad correctamente - Memoizada
  const calcularEdad = useCallback((fechaNacimiento) => {
    if (!fechaNacimiento) return 'N/A';
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  }, []);

  // Función para formatear fechas correctamente - Memoizada
  // Funciones helper para estados de citas
  const getEstadoCitaColor = useCallback((estado) => {
    switch (estado) {
      case ESTADOS_CITA.ATENDIDA:
        return '#4CAF50';
      case ESTADOS_CITA.PENDIENTE:
        return '#FF9800';
      case ESTADOS_CITA.NO_ASISTIDA:
        return '#F44336';
      case ESTADOS_CITA.REPROGRAMADA:
        return '#2196F3';
      case ESTADOS_CITA.CANCELADA:
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  }, []);

  const getEstadoCitaTexto = useCallback((estado) => {
    switch (estado) {
      case ESTADOS_CITA.ATENDIDA:
        return 'Atendida';
      case ESTADOS_CITA.PENDIENTE:
        return 'Pendiente';
      case ESTADOS_CITA.NO_ASISTIDA:
        return 'No Asistida';
      case ESTADOS_CITA.REPROGRAMADA:
        return 'Reprogramada';
      case ESTADOS_CITA.CANCELADA:
        return 'Cancelada';
      default:
        return estado || 'Sin estado';
    }
  }, []);

  const formatearFecha = useCallback((fecha, incluirHora = true) => {
    if (!fecha) return 'N/A';
    try {
      const fechaObj = new Date(fecha);
      if (isNaN(fechaObj.getTime())) return 'Fecha inválida';
      
      // Verificar si tiene hora (no es medianoche o tiene minutos/segundos)
      const tieneHora = incluirHora && (
        fechaObj.getHours() !== 0 || 
        fechaObj.getMinutes() !== 0 || 
        fechaObj.getSeconds() !== 0 ||
        fecha.toString().includes('T') ||
        fecha.toString().includes(' ')
      );
      
      // Formatear fecha: "6 de noviembre del 2025"
      const dia = fechaObj.getDate();
      const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const mes = meses[fechaObj.getMonth()];
      const año = fechaObj.getFullYear();
      const fechaFormateada = `${dia} de ${mes} del ${año}`;
      
      if (tieneHora) {
        const horaStr = fechaObj.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `${fechaFormateada}, hora: ${horaStr}`;
      }
      
      return fechaFormateada;
    } catch (error) {
      return 'Fecha inválida';
    }
  }, []);

  // Función para calcular IMC - Memoizada
  const calcularIMC = useCallback((pesoKg, tallaM) => {
    if (!pesoKg || !tallaM || tallaM === 0) return null;
    const imc = pesoKg / (tallaM * tallaM);
    return parseFloat(imc.toFixed(1));
  }, []);

  // Función para obtener el nombre del doctor asignado - Memoizada
  const obtenerDoctorAsignado = useCallback(() => {
    if (!paciente) return 'Sin doctor asignado';
    
    // Si viene del backend con doctor_nombre
    if (paciente.doctor_nombre) {
      return paciente.doctor_nombre;
    }
    
    // Si viene con Doctors array
    if (paciente.Doctors && paciente.Doctors.length > 0) {
      const doctor = paciente.Doctors[0];
      return `${doctor.nombre} ${doctor.apellido_paterno} ${doctor.apellido_materno || ''}`.trim();
    }
    
    // Si viene con doctor_asignado
    if (paciente.doctor_asignado) {
      return paciente.doctor_asignado;
    }
    
    return 'Sin doctor asignado';
  }, [paciente]);

  // Función para determinar el color del IMC según clasificación OMS - Memoizada
  const getIMCColor = useCallback((imc) => {
    if (!imc) return { color: '#666' };
    
    if (imc < 18.5) return { color: '#2196F3' }; // Bajo peso
    if (imc < 25) return { color: '#4CAF50' };   // Normal
    if (imc < 30) return { color: '#FF9800' };   // Sobrepeso
    return { color: '#F44336' };                  // Obesidad
  }, []);

  // =====================================================
  // FUNCIONES HELPER PARA ELIMINAR DUPLICACIÓN
  // =====================================================

  /**
   * Verifica si el usuario actual tiene permisos de administrador
   */
  const canDelete = useCallback(() => {
    return userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador' ||
           userRole === 'Doctor' || userRole === 'doctor';
  }, [userRole]);

  /**
   * Valida que el usuario sea administrador para realizar eliminaciones
   * @param {string} itemType - Tipo de item a eliminar (para mensaje de error)
   * @returns {boolean} - true si tiene permisos, false si no
   */
  const requireAdminForDelete = useCallback((itemType) => {
    if (!canDelete()) {
      Alert.alert('Permiso denegado', `Solo los administradores pueden eliminar ${itemType}`);
      return false;
    }
    return true;
  }, [canDelete]);

  /**
   * Maneja errores de eliminación de forma consistente
   * @param {Error} error - Error capturado
   * @param {string} itemType - Tipo de item que se intentó eliminar
   */
  const handleDeleteError = useCallback((error, itemType) => {
    Logger.error(`Error eliminando ${itemType}`, {
      error: error.message,
      stack: error.stack
    });
    
    let errorMessage = `No se pudo eliminar ${itemType}. Intente nuevamente.`;
    
    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        errorMessage = `${itemType} no encontrado.`;
      } else if (status === 403) {
        errorMessage = `No tiene permisos para eliminar ${itemType}.`;
      } else if (status === 500) {
        errorMessage = 'Error del servidor. Intente más tarde.';
      }
    } else if (error.request) {
      errorMessage = 'Error de conexión. Verifique su internet.';
    }
    
    Alert.alert('Error', errorMessage);
  }, []);

  // Memoizar slices de datos para evitar recalcular en cada render
  const signosVitalesMostrar = useMemo(() => {
    return signosVitales?.slice(0, 1) || [];
  }, [signosVitales]);

  const citasMostrar = useMemo(() => {
    return citas?.slice(0, 1) || [];
  }, [citas]);

  // Memoizar valores calculados del paciente
  const edadPaciente = useMemo(() => {
    return paciente ? calcularEdad(paciente.fecha_nacimiento) : 'N/A';
  }, [paciente, calcularEdad]);

  const doctorNombrePaciente = useMemo(() => {
    return obtenerDoctorAsignado();
  }, [paciente, obtenerDoctorAsignado]);

  // Memoizar totales calculados
  const totalDiagnosticos = useMemo(() => {
    return diagnosticos?.length || 0;
  }, [diagnosticos]);

  const totalMedicamentos = useMemo(() => {
    return medicamentos?.length || 0;
  }, [medicamentos]);

  // ✅ Optimización: Memoizar listas que se usan en el render
  const redApoyoMostrar = useMemo(() => {
    return redApoyo?.slice(0, 2) || [];
  }, [redApoyo]);

  /** Opciones del modal de acciones al tocar un contacto de Red de Apoyo (Llamar / Enviar email) */
  const opcionesContactoRedApoyo = useMemo(() => {
    if (!contactoRedApoyoSeleccionado) return [];
    const contacto = contactoRedApoyoSeleccionado;
    const numero = contacto.numero_celular?.trim();
    const email = contacto.email?.trim();
    const opts = [];
    if (numero) {
      opts.push({
        icon: '📞',
        label: 'Llamar',
        onPress: () => Linking.openURL(`tel:${numero}`),
        color: '#2196F3',
      });
    }
    if (email) {
      opts.push({
        icon: '📧',
        label: 'Enviar email',
        onPress: () => Linking.openURL(`mailto:${email}`),
        color: '#2196F3',
      });
    }
    if (opts.length === 0) {
      opts.push({
        icon: 'ℹ️',
        label: 'Sin teléfono ni email registrado',
        onPress: () => {},
        color: '#666',
      });
    }
    return opts;
  }, [contactoRedApoyoSeleccionado]);

  const esquemaVacunacionMostrar = useMemo(() => {
    return esquemaVacunacion?.slice(0, 2) || [];
  }, [esquemaVacunacion]);

  const comorbilidadesMostrar = useMemo(() => {
    return comorbilidadesPaciente?.slice(0, 2) || [];
  }, [comorbilidadesPaciente]);

  const deteccionesMostrar = useMemo(() => {
    return detecciones?.slice(0, 3) || [];
  }, [detecciones]);

  const sesionesEducativasMostrar = useMemo(() => {
    return sesionesEducativas?.slice(0, 5) || [];
  }, [sesionesEducativas]);

  // ✅ Salud Bucal y Tuberculosis - Memoizar listas
  const saludBucalMostrar = useMemo(() => {
    return saludBucal?.slice(0, 3) || [];
  }, [saludBucal]);

  const deteccionesTuberculosisMostrar = useMemo(() => {
    return deteccionesTuberculosis?.slice(0, 3) || [];
  }, [deteccionesTuberculosis]);

  // ✅ Optimización: Memoizar listas de opciones que no cambian
  const parentescoOptionsMemo = useMemo(() => parentescoOptions, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refresh(),
        refreshMedicalData(),
        refreshDetecciones()
      ]);
      Logger.info('DetallePaciente: Datos refrescados exitosamente');
    } catch (error) {
      Logger.error('Error refrescando datos del paciente', error);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleAccordion = useCallback((key) => {
    setAccordionState(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const renderAccordionIcon = useCallback((expanded) => (
    <Text style={{ fontSize: 18, color: '#2196F3', fontWeight: 'bold' }}>
      {expanded ? '▲' : '▼'}
    </Text>
  ), []);

  const openDeteccionModal = useCallback((det = null) => {
    // Si det es null, estamos creando una nueva complicación
    if (!det) {
      setEditingDeteccion(null);
      setFormDeteccion({
        tipo_complicacion: '',
        fecha_deteccion: new Date().toISOString().split('T')[0],
        fecha_diagnostico: '',
        observaciones: '',
        exploracion_pies: false,
        exploracion_fondo_ojo: false,
        realiza_auto_monitoreo: false,
        auto_monitoreo_glucosa: false,
        auto_monitoreo_presion: false,
        // ✅ Campos según formato GAM - Instrucción ⑥
        microalbuminuria_realizada: false,
        microalbuminuria_resultado: '',
        // ✅ Campos según formato GAM - Instrucción ⑪
        fue_referido: false,
        referencia_observaciones: ''
      });
      setShowDeteccionModal(true);
      return;
    }
    
    // Si det existe, estamos editando una complicación existente
    setEditingDeteccion(det);
    setFormDeteccion({
      tipo_complicacion: det.tipo_complicacion || det.Comorbilidad?.nombre_comorbilidad || '',
      fecha_deteccion: det.fecha_deteccion || new Date().toISOString().split('T')[0],
      fecha_diagnostico: det.fecha_diagnostico || '',
      observaciones: det.observaciones || '',
      exploracion_pies: !!det.exploracion_pies,
      exploracion_fondo_ojo: !!det.exploracion_fondo_ojo,
      realiza_auto_monitoreo: !!det.realiza_auto_monitoreo,
      auto_monitoreo_glucosa: !!det.auto_monitoreo_glucosa,
      auto_monitoreo_presion: !!det.auto_monitoreo_presion,
      // ✅ Nuevos campos según formato GAM - Instrucción ⑥
      microalbuminuria_realizada: !!det.microalbuminuria_realizada,
      microalbuminuria_resultado: det.microalbuminuria_resultado ? String(det.microalbuminuria_resultado) : '',
      // ✅ Campos según formato GAM - Instrucción ⑪
      fue_referido: !!det.fue_referido,
      referencia_observaciones: det.referencia_observaciones || ''
    });
    setShowDeteccionModal(true);
  }, []);

  const openDeteccionForEdit = useCallback(() => {
    const target = detecciones && detecciones.length > 0 ? detecciones[0] : null;
    if (!target) {
      Alert.alert('Sin complicaciones', 'No hay complicaciones para editar.');
      return;
    }
    openDeteccionModal(target);
  }, [detecciones, openDeteccionModal]);

  // ✅ NUEVO: Función para abrir modal de creación de nueva complicación
  const openDeteccionForCreate = useCallback(() => {
    openDeteccionModal(null); // Pasar null para indicar que es creación
  }, [openDeteccionModal]);

  // Abrir modal de detalle de monitoreo continuo (último registro)
  const handleOpenMonitoreoDetalle = useCallback((signo) => {
    if (!signo) return;
    setMonitoreoDetalle(signo);
    setShowMonitoreoDetalle(true);
  }, []);

  const handleSaveDeteccion = useCallback(async () => {
    if (!pacienteId) return;
    
    try {
      const gestionService = (await import('../../api/gestionService')).default;
      
      // Preparar datos según instrucciones del formato GAM
      const dataToSend = {
        fecha_deteccion: formDeteccion.fecha_deteccion, // Obligatorio según instrucciones
        tipo_complicacion: formDeteccion.tipo_complicacion || null, // Instrucción ⑩
        fecha_diagnostico: formDeteccion.fecha_diagnostico || null,
        observaciones: formDeteccion.observaciones || null,
        // Exámenes realizados - Instrucciones ⑦ y ⑧
        exploracion_pies: formDeteccion.exploracion_pies || false,
        exploracion_fondo_ojo: formDeteccion.exploracion_fondo_ojo || false,
        // Auto-monitoreo - Instrucción ⑨
        realiza_auto_monitoreo: formDeteccion.realiza_auto_monitoreo || false,
        auto_monitoreo_glucosa: formDeteccion.auto_monitoreo_glucosa || false,
        auto_monitoreo_presion: formDeteccion.auto_monitoreo_presion || false,
        // Microalbuminuria - Instrucción ⑥
        microalbuminuria_realizada: formDeteccion.microalbuminuria_realizada || false,
        microalbuminuria_resultado: formDeteccion.microalbuminuria_resultado && formDeteccion.microalbuminuria_realizada 
          ? parseFloat(formDeteccion.microalbuminuria_resultado) 
          : null,
        // Referencia - Instrucción ⑪
        fue_referido: formDeteccion.fue_referido || false,
        referencia_observaciones: formDeteccion.referencia_observaciones || null
      };
      
      if (editingDeteccion) {
        // Actualizar complicación existente
        await gestionService.updatePacienteDeteccionComplicacion(
          pacienteId, 
          editingDeteccion.id_deteccion, 
          dataToSend
        );
        Logger.success('Complicación actualizada');
      } else {
        // Crear nueva complicación
        await gestionService.addPacienteDeteccionComplicacion(pacienteId, dataToSend);
        Logger.success('Nueva complicación creada');
      }
      
      await refreshDetecciones();
      setShowDeteccionModal(false);
      setEditingDeteccion(null); // Limpiar estado de edición
    } catch (err) {
      Logger.error('Error guardando detección', err);
      Alert.alert('Error', err.response?.data?.error || 'No se pudo guardar la complicación.');
    }
  }, [pacienteId, editingDeteccion, formDeteccion, refreshDetecciones]);

  const handleDeleteDeteccion = useCallback(async (det) => {
    if (!pacienteId || !det?.id_deteccion) return;
    try {
      const gestionService = (await import('../../api/gestionService')).default;
      await gestionService.deletePacienteDeteccionComplicacion(pacienteId, det.id_deteccion);
      await refreshDetecciones();
      Logger.success('Detección eliminada');
    } catch (err) {
      Logger.error('Error eliminando detección', err);
      Alert.alert('Error', 'No se pudo eliminar la detección.');
    }
  }, [pacienteId, refreshDetecciones]);

  // ✅ Funciones para Salud Bucal (Instrucción ⑫)
  const openSaludBucalModal = useCallback((registro = null) => {
    if (!registro) {
      setEditingSaludBucal(null);
      setFormSaludBucal({
        fecha_registro: new Date().toISOString().split('T')[0],
        presenta_enfermedades_odontologicas: false,
        recibio_tratamiento_odontologico: false,
        observaciones: ''
      });
      setShowSaludBucalModal(true);
      return;
    }
    
    setEditingSaludBucal(registro);
    setFormSaludBucal({
      fecha_registro: registro.fecha_registro || new Date().toISOString().split('T')[0],
      presenta_enfermedades_odontologicas: !!registro.presenta_enfermedades_odontologicas,
      recibio_tratamiento_odontologico: !!registro.recibio_tratamiento_odontologico,
      observaciones: registro.observaciones || ''
    });
    setShowSaludBucalModal(true);
  }, []);

  const handleSaveSaludBucal = useCallback(async () => {
    if (!pacienteId) return;
    
    try {
      const gestionService = (await import('../../api/gestionService')).default;
      
      const dataToSend = {
        fecha_registro: formSaludBucal.fecha_registro,
        presenta_enfermedades_odontologicas: formSaludBucal.presenta_enfermedades_odontologicas || false,
        recibio_tratamiento_odontologico: formSaludBucal.recibio_tratamiento_odontologico || false,
        observaciones: formSaludBucal.observaciones || null
      };
      
      if (editingSaludBucal) {
        await gestionService.updatePacienteSaludBucal(pacienteId, editingSaludBucal.id_salud_bucal, dataToSend);
        Logger.success('Registro de salud bucal actualizado');
      } else {
        await gestionService.createPacienteSaludBucal(pacienteId, dataToSend);
        Logger.success('Registro de salud bucal creado');
      }
      
      setShowSaludBucalModal(false);
      setEditingSaludBucal(null);
      await refreshSaludBucal();
    } catch (err) {
      Logger.error('Error guardando registro de salud bucal', err);
      Alert.alert('Error', 'No se pudo guardar el registro de salud bucal.');
    }
  }, [pacienteId, editingSaludBucal, formSaludBucal, refreshSaludBucal]);

  const handleDeleteSaludBucal = useCallback(async (registro) => {
    if (!pacienteId || !registro?.id_salud_bucal) return;
    
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este registro de salud bucal?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const gestionService = (await import('../../api/gestionService')).default;
              await gestionService.deletePacienteSaludBucal(pacienteId, registro.id_salud_bucal);
              await refreshSaludBucal();
              Logger.success('Registro de salud bucal eliminado');
            } catch (err) {
              Logger.error('Error eliminando registro de salud bucal', err);
              Alert.alert('Error', 'No se pudo eliminar el registro de salud bucal.');
            }
          }
        }
      ]
    );
  }, [pacienteId, refreshSaludBucal]);

  // ✅ Funciones para Detección de Tuberculosis (Instrucción ⑬)
  const openDeteccionTuberculosisModal = useCallback((deteccion = null) => {
    if (!deteccion) {
      setEditingDeteccionTuberculosis(null);
      setFormDeteccionTuberculosis({
        fecha_deteccion: new Date().toISOString().split('T')[0],
        aplicacion_encuesta: false,
        baciloscopia_realizada: false,
        baciloscopia_resultado: '',
        ingreso_tratamiento: false,
        observaciones: ''
      });
      setShowDeteccionTuberculosisModal(true);
      return;
    }
    
    setEditingDeteccionTuberculosis(deteccion);
    setFormDeteccionTuberculosis({
      fecha_deteccion: deteccion.fecha_deteccion || new Date().toISOString().split('T')[0],
      aplicacion_encuesta: !!deteccion.aplicacion_encuesta,
      baciloscopia_realizada: !!deteccion.baciloscopia_realizada,
      baciloscopia_resultado: deteccion.baciloscopia_resultado || '',
      ingreso_tratamiento: !!deteccion.ingreso_tratamiento,
      observaciones: deteccion.observaciones || ''
    });
    setShowDeteccionTuberculosisModal(true);
  }, []);

  const handleSaveDeteccionTuberculosis = useCallback(async () => {
    if (!pacienteId) return;
    
    try {
      const gestionService = (await import('../../api/gestionService')).default;
      
      const dataToSend = {
        fecha_deteccion: formDeteccionTuberculosis.fecha_deteccion,
        aplicacion_encuesta: formDeteccionTuberculosis.aplicacion_encuesta || false,
        baciloscopia_realizada: formDeteccionTuberculosis.baciloscopia_realizada || false,
        baciloscopia_resultado: formDeteccionTuberculosis.baciloscopia_resultado && formDeteccionTuberculosis.baciloscopia_realizada
          ? formDeteccionTuberculosis.baciloscopia_resultado
          : null,
        ingreso_tratamiento: formDeteccionTuberculosis.ingreso_tratamiento || false,
        observaciones: formDeteccionTuberculosis.observaciones || null
      };
      
      if (editingDeteccionTuberculosis) {
        await gestionService.updatePacienteDeteccionTuberculosis(pacienteId, editingDeteccionTuberculosis.id_deteccion_tb, dataToSend);
        Logger.success('Detección de tuberculosis actualizada');
      } else {
        await gestionService.createPacienteDeteccionTuberculosis(pacienteId, dataToSend);
        Logger.success('Detección de tuberculosis creada');
      }
      
      setShowDeteccionTuberculosisModal(false);
      setEditingDeteccionTuberculosis(null);
      await refreshDeteccionesTuberculosis();
    } catch (err) {
      Logger.error('Error guardando detección de tuberculosis', err);
      Alert.alert('Error', 'No se pudo guardar la detección de tuberculosis.');
    }
  }, [pacienteId, editingDeteccionTuberculosis, formDeteccionTuberculosis, refreshDeteccionesTuberculosis]);

  const handleDeleteDeteccionTuberculosis = useCallback(async (deteccion) => {
    if (!pacienteId || !deteccion?.id_deteccion_tb) return;
    
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar esta detección de tuberculosis?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const gestionService = (await import('../../api/gestionService')).default;
              await gestionService.deletePacienteDeteccionTuberculosis(pacienteId, deteccion.id_deteccion_tb);
              await refreshDeteccionesTuberculosis();
              Logger.success('Detección de tuberculosis eliminada');
            } catch (err) {
              Logger.error('Error eliminando detección de tuberculosis', err);
              Alert.alert('Error', 'No se pudo eliminar la detección de tuberculosis.');
            }
          }
        }
      ]
    );
  }, [pacienteId, refreshDeteccionesTuberculosis]);

  /** Opciones al tocar una vacuna (Esquema de vacunación) */
  const opcionesVacunaEsquema = useMemo(() => {
    if (!vacunaEsquemaSeleccionada) return [];
    return [
      { icon: 'pencil', label: 'Editar', onPress: () => { handleEditEsquemaVacunacion(vacunaEsquemaSeleccionada); setVacunaEsquemaSeleccionada(null); }, color: '#2196F3' },
      { icon: 'delete', label: 'Eliminar', onPress: () => { handleDeleteEsquemaVacunacion(vacunaEsquemaSeleccionada); setVacunaEsquemaSeleccionada(null); }, color: '#F44336' }
    ];
  }, [vacunaEsquemaSeleccionada]);

  /** Opciones al tocar un medicamento (Ver detalle / Editar plan) */
  const opcionesMedicamentoSeleccionado = useMemo(() => {
    if (!medicamentoSeleccionado) return [];
    return [
      { icon: 'magnify', label: 'Ver detalle del plan', onPress: () => { setShowAllMedicamentos(true); setMedicamentoSeleccionado(null); }, color: '#666' },
      { icon: 'pencil', label: 'Editar plan', onPress: () => { handleEditMedicamento(medicamentoSeleccionado); setMedicamentoSeleccionado(null); }, color: '#2196F3' }
    ];
  }, [medicamentoSeleccionado]);

  /** Opciones al tocar una complicación */
  const opcionesDeteccionComplicacion = useMemo(() => {
    if (!deteccionComplicacionSeleccionada) return [];
    return [
      { icon: 'pencil', label: 'Editar', onPress: () => { openDeteccionModal(deteccionComplicacionSeleccionada); setDeteccionComplicacionSeleccionada(null); }, color: '#2196F3' },
      { icon: 'delete', label: 'Eliminar', onPress: () => { handleDeleteDeteccion(deteccionComplicacionSeleccionada); setDeteccionComplicacionSeleccionada(null); }, color: '#F44336' }
    ];
  }, [deteccionComplicacionSeleccionada]);

  /** Opciones al tocar una comorbilidad */
  const opcionesComorbilidadSeleccionada = useMemo(() => {
    if (!comorbilidadSeleccionada) return [];
    return [
      { icon: 'pencil', label: 'Editar', onPress: () => { handleEditComorbilidad(comorbilidadSeleccionada); setShowAddComorbilidad(true); setComorbilidadSeleccionada(null); }, color: '#2196F3' },
      { icon: 'delete', label: 'Eliminar', onPress: () => { handleDeleteComorbilidad(comorbilidadSeleccionada); setComorbilidadSeleccionada(null); }, color: '#F44336' }
    ];
  }, [comorbilidadSeleccionada]);

  /** Opciones al tocar un registro de salud bucal */
  const opcionesRegistroSaludBucal = useMemo(() => {
    if (!registroSaludBucalSeleccionado) return [];
    return [
      { icon: 'pencil', label: 'Editar', onPress: () => { openSaludBucalModal(registroSaludBucalSeleccionado); setRegistroSaludBucalSeleccionado(null); }, color: '#2196F3' },
      { icon: 'delete', label: 'Eliminar', onPress: () => { handleDeleteSaludBucal(registroSaludBucalSeleccionado); setRegistroSaludBucalSeleccionado(null); }, color: '#F44336' }
    ];
  }, [registroSaludBucalSeleccionado]);

  /** Opciones al tocar una detección de tuberculosis */
  const opcionesDeteccionTb = useMemo(() => {
    if (!deteccionTbSeleccionada) return [];
    return [
      { icon: 'pencil', label: 'Editar', onPress: () => { openDeteccionTuberculosisModal(deteccionTbSeleccionada); setDeteccionTbSeleccionada(null); }, color: '#2196F3' },
      { icon: 'delete', label: 'Eliminar', onPress: () => { handleDeleteDeteccionTuberculosis(deteccionTbSeleccionada); setDeteccionTbSeleccionada(null); }, color: '#F44336' }
    ];
  }, [deteccionTbSeleccionada]);

  /**
   * Abrir PDF generado usando react-native-file-viewer
   * Esta es la solución más confiable para abrir archivos nativamente
   * 
   * @param {string} filePath - Ruta completa del archivo PDF
   * @param {string} filename - Nombre del archivo (para logs)
   * @returns {Promise<boolean>} - true si se abrió exitosamente, false si no
   */
  const abrirPDFConFileViewer = useCallback(async (filePath, filename) => {
    try {
      Logger.info('Intentando abrir PDF con FileViewer', { filePath, filename });

      // Verificar que el archivo existe antes de intentar abrirlo
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        Logger.warn('El archivo PDF no existe para abrir', { filePath });
        return false;
      }

      // Verificar que el archivo no esté vacío
      const fileInfo = await RNFS.stat(filePath);
      const fileSize = parseInt(fileInfo.size, 10) || 0;
      if (fileSize === 0) {
        Logger.warn('El archivo PDF está vacío, no se puede abrir', { 
          filePath, 
          fileSize 
        });
        return false;
      }

      Logger.debug('Archivo PDF verificado, intentando abrir', {
        filePath,
        fileSize,
        exists: fileExists
      });

      // Abrir el archivo usando FileViewer
      await FileViewer.open(filePath, {
        showOpenWithDialog: true, // Mostrar selector de apps si hay múltiples opciones
        showAppsSuggestions: true, // Mostrar sugerencias de apps
      });

      Logger.success('PDF abierto exitosamente con FileViewer', {
        filePath,
        fileSize
      });

      return true;
    } catch (error) {
      // FileViewer puede lanzar errores específicos
      const errorMessage = error?.message || String(error) || 'Error desconocido';
      
      // No lanzar error, solo loguear (no es crítico si falla)
      Logger.warn('Error al abrir PDF con FileViewer (no crítico)', {
        error: errorMessage,
        stack: error?.stack,
        filePath
      });

      // Errores comunes de FileViewer:
      // - "No app associated with this file type" - No hay app para abrir PDFs
      // - "File not found" - El archivo no existe (aunque ya lo verificamos)
      // - "Permission denied" - Problemas de permisos
      
      return false;
    }
  }, []);

  // Funciones de exportación
  const handleExportarExpedienteCompleto = useCallback(async () => {
    if (!pacienteId) return;
    
    try {
      Alert.alert(
        'Exportar Expediente Completo',
        'Se generará un PDF con toda la información médica del paciente relacionada y estructurada.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Exportar',
            onPress: async () => {
              // Wrapper de seguridad MÁXIMO para evitar que la app se cierre
              // Usar un try-catch anidado para capturar cualquier error no manejado
              try {
                const fecha = new Date().toISOString().split('T')[0];
                const filename = `expediente-medico-${pacienteId}-${fecha}.pdf`;
                
                // Mostrar indicador de carga (Modal controlado por estado)
                setExportandoExpediente(true);
                
                Logger.info('Iniciando exportación de expediente completo (HTML → PDF)', { pacienteId, filename });
                
                // 1. Obtener URL del HTML desde el servicio
                const htmlUrl = await gestionService.exportarExpedienteCompleto(pacienteId);
                
                // 2. Descargar el HTML
                const apiConfig = await getApiConfig();
                const token = await storageService.getAuthToken();
                const deviceId = await storageService.getOrCreateDeviceId();
                
                const htmlResponse = await fetch(htmlUrl, {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Device-ID': deviceId,
                    'X-Platform': Platform.OS,
                    'X-App-Version': '1.0.0',
                    'X-Client-Type': 'mobile',
                  },
                });

                if (!htmlResponse.ok) {
                  const errorText = await htmlResponse.text();
                  throw new Error(`Error al descargar HTML: ${htmlResponse.status} - ${errorText}`);
                }

                const htmlContent = await htmlResponse.text();
                
                Logger.info('HTML descargado exitosamente', { htmlLength: htmlContent.length });

                // 3. Convertir HTML a PDF usando react-native-html-to-pdf
                const downloadDir = Platform.OS === 'ios'
                  ? RNFS.DocumentDirectoryPath
                  : RNFS.DownloadDirectoryPath || RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath;

                const dirExists = await RNFS.exists(downloadDir);
                if (!dirExists) {
                  await RNFS.mkdir(downloadDir);
                }

                const filePath = `${downloadDir}/${filename}`;

                const options = {
                  html: htmlContent,
                  fileName: filename.replace('.pdf', ''),
                  directory: Platform.OS === 'ios' ? 'Documents' : 'Downloads',
                  base64: false,
                  width: 595, // A4 width in points
                  height: 842, // A4 height in points
                };

                Logger.info('Generando PDF desde HTML', { filePath, options });

                // Importación dinámica - el módulo exporta generatePDF, no convert
                let generatePDF;
                try {
                  const htmlToPdfModule = require('react-native-html-to-pdf');
                  
                  // El módulo exporta generatePDF directamente
                  generatePDF = htmlToPdfModule.generatePDF || htmlToPdfModule.default?.generatePDF;
                  
                  if (!generatePDF || typeof generatePDF !== 'function') {
                    Logger.warn('generatePDF no está disponible', { 
                      module: htmlToPdfModule,
                      keys: Object.keys(htmlToPdfModule || {})
                    });
                    throw new Error('La función generatePDF no está disponible en react-native-html-to-pdf');
                  }
                } catch (importError) {
                  Logger.error('Error importando react-native-html-to-pdf', {
                    error: importError?.message || String(importError),
                    stack: importError?.stack
                  });
                  throw new Error('No se pudo cargar el módulo de conversión PDF. Por favor, reconstruye la aplicación (npx react-native run-android).');
                }

                const pdfResult = await generatePDF(options);

                if (!pdfResult || !pdfResult.filePath) {
                  Logger.error('generatePDF no devolvió filePath válido', { pdfResult });
                  throw new Error('No se pudo generar el PDF desde el HTML');
                }

                // Usar la ruta exacta que devuelve generatePDF (puede ser diferente a la que especificamos)
                const finalFilePath = pdfResult.filePath;
                
                Logger.success('PDF generado exitosamente', { 
                  filePath: finalFilePath,
                  fileSize: pdfResult.fileSize || 0,
                  pdfResultKeys: Object.keys(pdfResult || {})
                });

                // 4. Verificar que el archivo existe y tiene contenido
                // Esperar un momento para asegurar que el archivo se haya escrito completamente
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const fileExists = await RNFS.exists(finalFilePath);
                if (!fileExists) {
                  Logger.error('El PDF generado no existe en la ruta especificada', {
                    expectedPath: finalFilePath,
                    optionsDirectory: options.directory,
                    downloadDir
                  });
                  throw new Error('El PDF generado no existe en la ruta especificada');
                }

                const fileInfo = await RNFS.stat(finalFilePath);
                const fileSize = parseInt(fileInfo.size, 10) || 0;
                
                Logger.debug('Información del archivo PDF generado', {
                  filePath: finalFilePath,
                  fileSize,
                  exists: fileExists,
                  fileInfo
                });
                
                if (fileSize === 0) {
                  Logger.error('El PDF generado está vacío', {
                    filePath: finalFilePath,
                    fileSize,
                    pdfResult
                  });
                  throw new Error('El PDF generado está vacío');
                }

                // Cerrar modal de loading
                setExportandoExpediente(false);
                
                // Intentar abrir el PDF automáticamente usando FileViewer
                let pdfAbierto = false;
                try {
                  // Usar la ruta exacta que devuelve generatePDF
                  pdfAbierto = await abrirPDFConFileViewer(finalFilePath, filename);
                } catch (openError) {
                  // No es crítico si falla, solo loguear
                  Logger.warn('Error al intentar abrir PDF automáticamente (no crítico)', {
                    error: openError?.message || String(openError),
                    filePath: finalFilePath
                  });
                }
                
                // Mostrar éxito con información relevante
                setTimeout(() => {
                  const location = Platform.OS === 'android' 
                    ? 'Carpeta de Descargas'
                    : 'Carpeta de Documentos de la app';
                  
                  const mensaje = pdfAbierto
                    ? `Expediente médico generado y abierto exitosamente.\n\nArchivo: ${filename}\nTamaño: ${(fileSize / 1024).toFixed(2)} KB\n\nUbicación: ${location}`
                    : `Expediente médico generado exitosamente.\n\nArchivo: ${filename}\nTamaño: ${(fileSize / 1024).toFixed(2)} KB\n\nUbicación: ${location}\n\nPuedes abrirlo desde el administrador de archivos.`;
                  
                  Alert.alert(
                    '✅ Éxito',
                    mensaje,
                    [
                      // Si no se abrió automáticamente, ofrecer botón para abrir manualmente
                      ...(pdfAbierto ? [] : [
                        {
                          text: 'Abrir PDF',
                          onPress: async () => {
                            try {
                              // Usar la ruta exacta que devuelve generatePDF
                              const abierto = await abrirPDFConFileViewer(finalFilePath, filename);
                              if (!abierto) {
                                Alert.alert(
                                  'Información',
                                  'No se pudo abrir el PDF automáticamente. Por favor, ábrelo manualmente desde el administrador de archivos.',
                                  [{ text: 'OK' }]
                                );
                              }
                            } catch (error) {
                              Logger.warn('Error al abrir PDF desde botón', {
                                error: error?.message || String(error),
                                filePath: finalFilePath
                              });
                              Alert.alert(
                                'Información',
                                'No se pudo abrir el PDF. Por favor, ábrelo manualmente desde el administrador de archivos.',
                                [{ text: 'OK' }]
                              );
                            }
                          }
                        }
                      ]),
                      { text: 'OK' }
                    ]
                  );
                }, 200);
              } catch (error) {
                // Cerrar modal de loading en caso de error
                setExportandoExpediente(false);
                
                const errorMessage = error?.message || String(error) || 'Error desconocido';
                Logger.error('Error exportando expediente completo', {
                  message: errorMessage,
                  stack: error?.stack,
                  pacienteId,
                  error: errorMessage
                });
                
                // Mensaje de error más descriptivo
                let userMessage = 'No se pudo exportar el expediente médico.';
                if (errorMessage.includes('conexión') || errorMessage.includes('conectar') || errorMessage.includes('network')) {
                  userMessage = 'Error de conexión. Verifica tu conexión a internet.';
                } else if (errorMessage.includes('autenticación') || errorMessage.includes('token') || errorMessage.includes('401')) {
                  userMessage = 'Error de autenticación. Por favor, inicia sesión nuevamente.';
                } else if (errorMessage.includes('404')) {
                  userMessage = 'El paciente no fue encontrado.';
                } else if (errorMessage.includes('500') || errorMessage.includes('servidor') || errorMessage.includes('server')) {
                  userMessage = 'Error del servidor. El servidor puede estar ocupado o hay un problema técnico. Por favor, intenta más tarde.';
                } else if (errorMessage.includes('Timeout') || errorMessage.includes('timeout')) {
                  userMessage = 'La generación del PDF está tomando demasiado tiempo. Por favor, intenta nuevamente.';
                } else if (errorMessage.includes('Puppeteer') || errorMessage.includes('puppeteer') || errorMessage.includes('pdfkit')) {
                  userMessage = 'Error al generar el PDF. Por favor, intenta nuevamente o contacta al soporte técnico.';
                } else if (errorMessage) {
                  userMessage = errorMessage.length > 150 ? errorMessage.substring(0, 150) + '...' : errorMessage;
                }
                
                // Usar setTimeout para asegurar que el Alert se muestre después de cerrar el modal
                // Y usar try-catch para evitar que el Alert cause un crash
                setTimeout(() => {
                  try {
                    Alert.alert('❌ Error', userMessage, [{ text: 'OK' }]);
                  } catch (alertError) {
                    Logger.error('Error mostrando alert de error:', alertError);
                    // Si el Alert falla, al menos loguear el error
                  }
                }, 200);
              }
            }
          }
        ]
      );
    } catch (error) {
      // Asegurar que el modal se cierre incluso si hay error en el Alert inicial
      setExportandoExpediente(false);
      
      const errorMessage = error?.message || String(error) || 'Error desconocido';
      Logger.error('Error en exportación de expediente completo', {
        message: errorMessage,
        stack: error?.stack,
        error: errorMessage
      });
      Alert.alert('Error', 'No se pudo exportar el expediente médico');
    }
  }, [pacienteId]);

  const handleExportarSignosVitales = useCallback(async () => {
    if (!pacienteId) return;
    
    try {
      Alert.alert(
        'Exportar Signos Vitales',
        '¿En qué formato deseas exportar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'CSV',
            onPress: async () => {
              try {
                const fecha = new Date().toISOString().split('T')[0];
                const filename = `signos-vitales-${pacienteId}-${fecha}.csv`;
                
                const result = await downloadCSV(
                  `/api/reportes/signos-vitales/${pacienteId}/csv`,
                  filename
                );
                
                Alert.alert(
                  'Éxito',
                  `Signos vitales descargados exitosamente.\n\nArchivo: ${filename}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Logger.error('Error exportando signos vitales:', error);
                Alert.alert('Error', error.message || 'No se pudo exportar los signos vitales');
              }
            }
          },
          {
            text: 'PDF',
            onPress: async () => {
              try {
                const fecha = new Date().toISOString().split('T')[0];
                const filename = `signos-vitales-${pacienteId}-${fecha}.pdf`;
                
                const result = await downloadPDF(
                  `/api/reportes/signos-vitales/${pacienteId}/pdf`,
                  filename
                );
                
                Alert.alert(
                  'Éxito',
                  `Signos vitales descargados exitosamente.\n\nArchivo: ${filename}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Logger.error('Error exportando signos vitales PDF:', error);
                Alert.alert('Error', error.message || 'No se pudo exportar los signos vitales');
              }
            }
          }
        ]
      );
    } catch (error) {
      Logger.error('Error en exportación de signos vitales:', error);
      Alert.alert('Error', 'No se pudo exportar los signos vitales');
    }
  }, [pacienteId]);

  const handleExportarCitas = useCallback(async () => {
    if (!pacienteId) return;
    
    try {
      Alert.alert(
        'Exportar Citas',
        '¿En qué formato deseas exportar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'CSV',
            onPress: async () => {
              try {
                const fecha = new Date().toISOString().split('T')[0];
                const filename = `citas-${pacienteId}-${fecha}.csv`;
                
                const result = await downloadCSV(
                  `/api/reportes/citas/${pacienteId}/csv`,
                  filename
                );
                
                Alert.alert(
                  'Éxito',
                  `Citas descargadas exitosamente.\n\nArchivo: ${filename}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Logger.error('Error exportando citas:', error);
                Alert.alert('Error', error.message || 'No se pudo exportar las citas');
              }
            }
          },
          {
            text: 'PDF',
            onPress: async () => {
              try {
                const fecha = new Date().toISOString().split('T')[0];
                const filename = `citas-${pacienteId}-${fecha}.pdf`;
                
                const result = await downloadPDF(
                  `/api/reportes/citas/${pacienteId}/pdf`,
                  filename
                );
                
                Alert.alert(
                  'Éxito',
                  `Citas descargadas exitosamente.\n\nArchivo: ${filename}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Logger.error('Error exportando citas PDF:', error);
                Alert.alert('Error', error.message || 'No se pudo exportar las citas');
              }
            }
          }
        ]
      );
    } catch (error) {
      Logger.error('Error en exportación de citas:', error);
      Alert.alert('Error', 'No se pudo exportar las citas');
    }
  }, [pacienteId]);

  const handleExportarDiagnosticos = useCallback(async () => {
    if (!pacienteId) return;
    
    try {
      Alert.alert(
        'Exportar Diagnósticos',
        '¿En qué formato deseas exportar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'CSV',
            onPress: async () => {
              try {
                const fecha = new Date().toISOString().split('T')[0];
                const filename = `diagnosticos-${pacienteId}-${fecha}.csv`;
                
                const result = await downloadCSV(
                  `/api/reportes/diagnosticos/${pacienteId}/csv`,
                  filename
                );
                
                Alert.alert(
                  'Éxito',
                  `Diagnósticos descargados exitosamente.\n\nArchivo: ${filename}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Logger.error('Error exportando diagnósticos:', error);
                Alert.alert('Error', error.message || 'No se pudo exportar los diagnósticos');
              }
            }
          },
          {
            text: 'PDF',
            onPress: async () => {
              try {
                const fecha = new Date().toISOString().split('T')[0];
                const filename = `diagnosticos-${pacienteId}-${fecha}.pdf`;
                
                const result = await downloadPDF(
                  `/api/reportes/diagnosticos/${pacienteId}/pdf`,
                  filename
                );
                
                Alert.alert(
                  'Éxito',
                  `Diagnósticos descargados exitosamente.\n\nArchivo: ${filename}`,
                  [{ text: 'OK' }]
                );
              } catch (error) {
                Logger.error('Error exportando diagnósticos PDF:', error);
                Alert.alert('Error', error.message || 'No se pudo exportar los diagnósticos');
              }
            }
          }
        ]
      );
    } catch (error) {
      Logger.error('Error en exportación de diagnósticos:', error);
      Alert.alert('Error', 'No se pudo exportar los diagnósticos');
    }
  }, [pacienteId]);

  // Navegar a chat con paciente (solo para doctores)
  const handleChatPaciente = useCallback(() => {
    if (!pacienteId || !paciente) {
      Alert.alert('Error', 'No se pudo cargar la información del paciente');
      return;
    }

    if (userRole !== 'Doctor' && userRole !== 'doctor') {
      Alert.alert('Error', 'Solo los doctores pueden chatear con pacientes');
      return;
    }

    Logger.navigation('DetallePaciente', 'ChatPaciente', { 
      pacienteId: pacienteId
    });
    
    try {
      navigation.navigate('ChatPaciente', { 
        pacienteId: pacienteId,
        paciente: paciente
      });
    } catch (error) {
      Logger.error('Error navegando a ChatPaciente', error);
      Alert.alert('Error', 'No se pudo abrir el chat con el paciente');
    }
  }, [pacienteId, paciente, userRole, navigation]);

  // ✅ Refactorizado: Usar hook genérico useSaveHandler para Red de Apoyo
  const { handleSave: handleSaveRedApoyo, saving: savingRedApoyo } = useSaveHandler({
    serviceMethod: (data) => {
      const currentPacienteId = pacienteId || paciente?.id_paciente;
      // Si estamos editando, usar UPDATE; si no, usar CREATE
      if (editingRedApoyo && editingRedApoyo.id_red_apoyo) {
        return gestionService.updatePacienteRedApoyo(
          currentPacienteId,
          editingRedApoyo.id_red_apoyo,
          data
        );
      } else {
        return gestionService.createPacienteRedApoyo(currentPacienteId, data);
      }
    },
    formData: formDataRedApoyo,
    resetForm: () => {
      resetFormRedApoyo();
      setEditingRedApoyo(null);
    },
    modalState: showAddRedApoyo,
    setModalState: setShowAddRedApoyo,
    refreshData: refreshRedApoyo,
    onSuccess: () => {
      setEditingRedApoyo(null);
    },
    validationFn: () => {
      if (!formDataRedApoyo.nombre_contacto || !formDataRedApoyo.nombre_contacto.trim()) {
        Alert.alert('Validación', 'El nombre del contacto es requerido');
        return false;
      }
      if (formDataRedApoyo.email && formDataRedApoyo.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formDataRedApoyo.email.trim())) {
          Alert.alert('Validación', 'Por favor ingrese un email válido');
          return false;
        }
      }
      if (formDataRedApoyo.numero_celular && formDataRedApoyo.numero_celular.trim()) {
        const telefono = formDataRedApoyo.numero_celular.trim();
        if (telefono.length < 10) {
          Alert.alert('Validación', 'El teléfono debe tener al menos 10 dígitos');
          return false;
        }
      }
      return true;
    },
    prepareData: (formData) => ({
      nombre_contacto: formData.nombre_contacto.trim(),
      numero_celular: formData.numero_celular?.trim() || null,
      email: formData.email?.trim() || null,
      direccion: formData.direccion?.trim() || null,
      localidad: formData.localidad?.trim() || null,
      parentesco: formData.parentesco || null
    }),
    actionName: 'saveRedApoyo',
    successMessage: 'Contacto agregado exitosamente',
    errorMessage: 'No se pudo guardar el contacto. Intente nuevamente.',
    logContext: { pacienteId: pacienteId || paciente?.id_paciente }
  });

  // Funciones para Esquema de Vacunación
  // resetFormEsquemaVacunacion ya está definido arriba con useFormState
  
  // Función para seleccionar vacuna del catálogo
  const handleSelectVacuna = (vacuna) => {
    updateEsquemaVacunacionField('vacuna', vacuna.nombre_vacuna || vacuna.vacuna);
    setShowVacunaSelector(false);
    Logger.info('Vacuna seleccionada', { nombre: vacuna.nombre_vacuna || vacuna.vacuna });
  };

  // ✅ Refactorizado: Usar hook genérico useSaveHandler para Sesiones Educativas
  const { handleSave: handleSaveSesionEducativa, saving: savingSesionEducativaHook } = useSaveHandler({
    serviceMethod: (data) => {
      const currentPacienteId = pacienteId || paciente?.id_paciente;
      if (editingSesionEducativa && editingSesionEducativa.id_sesion) {
        return gestionService.updatePacienteSesionEducativa(
          currentPacienteId,
          editingSesionEducativa.id_sesion,
          data
        );
      } else {
        return gestionService.createPacienteSesionEducativa(currentPacienteId, data);
      }
    },
    formData: formDataSesionEducativa,
    resetForm: resetFormSesionEducativa,
    modalState: showAddSesionEducativa,
    setModalState: setShowAddSesionEducativa,
    refreshData: refreshSesionesEducativas,
    onSuccess: () => {
      setEditingSesionEducativa(null);
    },
    validationFn: () => {
      if (!formDataSesionEducativa.fecha_sesion || !formDataSesionEducativa.fecha_sesion.trim()) {
        Alert.alert('Validación', 'La fecha de sesión es requerida');
        return false;
      }
      if (!formDataSesionEducativa.tipo_sesion) {
        Alert.alert('Validación', 'El tipo de sesión es requerido');
        return false;
      }
      return true;
    },
    prepareData: (formData) => ({
      fecha_sesion: formData.fecha_sesion?.trim() || null,
      asistio: formData.asistio || false,
      tipo_sesion: formData.tipo_sesion || 'nutricional',
      numero_intervenciones: formData.numero_intervenciones ? parseInt(formData.numero_intervenciones) : 1,
      observaciones: formData.observaciones?.trim() || null,
      id_cita: formData.id_cita ? parseInt(formData.id_cita) : null
    }),
    actionName: 'saveSesionEducativa',
    successMessage: 'Sesión educativa registrada correctamente',
    errorMessage: 'No se pudo guardar la sesión educativa. Intente nuevamente.',
    logContext: { pacienteId: pacienteId || paciente?.id_paciente }
  });

  // ✅ Refactorizado: Usar hook genérico useSaveHandler para Esquema de Vacunación
  const { handleSave: handleSaveEsquemaVacunacion, saving: savingEsquemaVacunacion } = useSaveHandler({
    serviceMethod: (data) => {
      const currentPacienteId = pacienteId || paciente?.id_paciente;
      // Si estamos editando, usar UPDATE; si no, usar CREATE
      if (editingEsquemaVacunacion && editingEsquemaVacunacion.id_esquema) {
        return gestionService.updatePacienteEsquemaVacunacion(
          currentPacienteId,
          editingEsquemaVacunacion.id_esquema,
          data
        );
      } else {
        return gestionService.createPacienteEsquemaVacunacion(currentPacienteId, data);
      }
    },
    formData: formDataEsquemaVacunacion,
    resetForm: () => {
      resetFormEsquemaVacunacion();
      setEditingEsquemaVacunacion(null);
    },
    modalState: showAddEsquemaVacunacion,
    setModalState: setShowAddEsquemaVacunacion,
    refreshData: refreshEsquemaVacunacion,
    onSuccess: () => {
      setEditingEsquemaVacunacion(null);
    },
    validationFn: () => {
      if (!formDataEsquemaVacunacion.vacuna || !formDataEsquemaVacunacion.vacuna.trim()) {
        Alert.alert('Validación', 'El nombre de la vacuna es requerido');
        return false;
      }
      if (!formDataEsquemaVacunacion.fecha_aplicacion || !formDataEsquemaVacunacion.fecha_aplicacion.trim()) {
        Alert.alert('Validación', 'La fecha de aplicación es requerida');
        return false;
      }
      const fechaAplicacion = new Date(formDataEsquemaVacunacion.fecha_aplicacion);
      if (isNaN(fechaAplicacion.getTime())) {
        Alert.alert('Validación', 'La fecha de aplicación no es válida');
        return false;
      }
      return true;
    },
    prepareData: (formData) => ({
      vacuna: formData.vacuna.trim(),
      fecha_aplicacion: formData.fecha_aplicacion.trim(),
      lote: formData.lote?.trim() || null,
      observaciones: formData.observaciones?.trim() || null
    }),
    actionName: 'saveEsquemaVacunacion',
    successMessage: 'Registro de vacunación agregado exitosamente',
    errorMessage: 'No se pudo guardar el registro. Intente nuevamente.',
    logContext: { pacienteId: pacienteId || paciente?.id_paciente }
  });

  // Funciones para Comorbilidades
  // resetFormComorbilidad y updateComorbilidadField ya están definidos arriba con useFormState

  // Función para seleccionar comorbilidad del catálogo
  const handleSelectComorbilidad = (comorbilidad) => {
    updateComorbilidadField('id_comorbilidad', comorbilidad.id_comorbilidad);
    updateComorbilidadField('fecha_deteccion', comorbilidad.fecha_deteccion || '');
    updateComorbilidadField('observaciones', comorbilidad.observaciones || '');
    updateComorbilidadField('anos_padecimiento', comorbilidad.anos_padecimiento || '');
    setShowComorbilidadSelector(false);
    Logger.info('Comorbilidad seleccionada', { nombre: comorbilidad.nombre_comorbilidad });
  };

  // ✅ Refactorizado: Usar hook genérico useSaveHandler para Comorbilidad
  // Nota: Comorbilidad tiene lógica especial (crear/actualizar), se maneja en serviceMethod
  const serviceMethodComorbilidad = useCallback(async (data) => {
    // Lógica especial: crear o actualizar según editingComorbilidad
    const currentPacienteId = pacienteId || paciente?.id_paciente;
    if (!currentPacienteId) {
      throw new Error('ID de paciente no disponible');
    }
    if (editingComorbilidad) {
      return await gestionService.updatePacienteComorbilidad(
        currentPacienteId,
        editingComorbilidad.id_comorbilidad,
        data
      );
    } else {
      return await gestionService.addPacienteComorbilidad(currentPacienteId, data);
    }
  }, [editingComorbilidad, pacienteId, paciente?.id_paciente]);

  const refreshDataComorbilidad = useCallback(async () => {
    // Refrescar ambos en paralelo
    await Promise.all([
      refreshComorbilidades(),
      refresh()
    ]);
  }, [refreshComorbilidades, refresh]);

  // Handler personalizado para manejar error 409 (comorbilidad ya existe)
  const [savingComorbilidad, setSavingComorbilidad] = useState(false);
  
  const handleSaveComorbilidadWith409 = useCallback(async () => {
    try {
      const idComorbilidadNum = parseInt(formDataComorbilidad.id_comorbilidad);
      if (isNaN(idComorbilidadNum)) {
        Alert.alert('Validación', 'Debe seleccionar una comorbilidad');
        return;
      }

      if (!formDataComorbilidad.id_comorbilidad) {
        Alert.alert('Validación', 'Debe seleccionar una comorbilidad');
        return;
      }

      const currentPacienteId = pacienteId || paciente?.id_paciente;
      if (!currentPacienteId) {
        Alert.alert('Error', 'ID de paciente no disponible');
        return;
      }

      const dataToSend = {
        id_comorbilidad: idComorbilidadNum,
        fecha_deteccion: formDataComorbilidad.fecha_deteccion?.trim() || null,
        observaciones: formDataComorbilidad.observaciones?.trim() || null,
        anos_padecimiento: formDataComorbilidad.anos_padecimiento ? parseInt(formDataComorbilidad.anos_padecimiento) : null,
        // ✅ Nuevos campos según formato GAM
        es_diagnostico_basal: formDataComorbilidad.es_diagnostico_basal || false,
        año_diagnostico: formDataComorbilidad.año_diagnostico ? parseInt(formDataComorbilidad.año_diagnostico) : null,
        es_agregado_posterior: formDataComorbilidad.es_agregado_posterior || false,
        recibe_tratamiento_no_farmacologico: formDataComorbilidad.recibe_tratamiento_no_farmacologico || false,
        recibe_tratamiento_farmacologico: formDataComorbilidad.recibe_tratamiento_farmacologico || false
      };

      setSavingComorbilidad(true);
      try {
        if (editingComorbilidad) {
          await gestionService.updatePacienteComorbilidad(
            currentPacienteId,
            editingComorbilidad.id_comorbilidad,
            dataToSend
          );
          Alert.alert('Éxito', 'Comorbilidad actualizada exitosamente');
        } else {
          await gestionService.addPacienteComorbilidad(currentPacienteId, dataToSend);
          Alert.alert('Éxito', 'Comorbilidad agregada exitosamente');
        }
        
        setShowAddComorbilidad(false);
        resetFormComorbilidad();
        await refreshDataComorbilidad();
      } catch (error) {
        // Manejar error 409 - comorbilidad ya existe
        if (error.response?.status === 409) {
          // Buscar la comorbilidad existente en la lista
          const comorbilidadExistente = comorbilidadesPaciente?.find(
            c => c.id_comorbilidad === idComorbilidadNum
          );
          
          if (comorbilidadExistente) {
            Alert.alert(
              'Comorbilidad ya existe',
              `El paciente ya tiene la comorbilidad "${comorbilidadExistente.nombre || comorbilidadExistente.nombre_comorbilidad}" asignada. ¿Desea actualizarla?`,
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => setSavingComorbilidad(false) },
                {
                  text: 'Actualizar',
                  onPress: () => {
                    // Cambiar a modo edición
                    setEditingComorbilidad(comorbilidadExistente);
                    updateComorbilidadField('id_comorbilidad', comorbilidadExistente.id_comorbilidad);
                    updateComorbilidadField('fecha_deteccion', comorbilidadExistente.fecha_deteccion || '');
                    updateComorbilidadField('observaciones', comorbilidadExistente.observaciones || '');
                    updateComorbilidadField('anos_padecimiento', comorbilidadExistente.anos_padecimiento?.toString() || '');
                    setSavingComorbilidad(false);
                    // El modal ya está abierto, solo necesitamos cambiar el modo
                  }
                }
              ]
            );
          } else {
            // Si no encontramos la comorbilidad en la lista, recargar y mostrar mensaje
            Alert.alert(
              'Comorbilidad ya existe',
              'El paciente ya tiene esta comorbilidad asignada. Por favor, actualice la existente desde la lista.',
              [
                { text: 'OK', onPress: () => {
                  setSavingComorbilidad(false);
                  refreshDataComorbilidad();
                }}
              ]
            );
          }
        } else {
          // Otro tipo de error
          const errorMessage = error.response?.data?.error || error.message || 'No se pudo guardar la comorbilidad. Intente nuevamente.';
          Alert.alert('Error', errorMessage);
          setSavingComorbilidad(false);
        }
      }
    } catch (error) {
      Logger.error('Error en handleSaveComorbilidadWith409', error);
      Alert.alert('Error', 'Ocurrió un error inesperado. Intente nuevamente.');
      setSavingComorbilidad(false);
    } finally {
      setSavingComorbilidad(false);
    }
  }, [
    formDataComorbilidad,
    editingComorbilidad,
    pacienteId,
    paciente?.id_paciente,
    comorbilidadesPaciente,
    updateComorbilidadField,
    resetFormComorbilidad,
    refreshDataComorbilidad
  ]);

  const handleEditComorbilidad = (comorbilidad) => {
    setEditingComorbilidad(comorbilidad);
    updateComorbilidadField('id_comorbilidad', comorbilidad.id_comorbilidad);
    updateComorbilidadField('fecha_deteccion', comorbilidad.fecha_deteccion || '');
    updateComorbilidadField('observaciones', comorbilidad.observaciones || '');
    updateComorbilidadField('anos_padecimiento', comorbilidad.anos_padecimiento || '');
    // ✅ Nuevos campos según formato GAM
    updateComorbilidadField('es_diagnostico_basal', comorbilidad.es_diagnostico_basal || false);
    updateComorbilidadField('año_diagnostico', comorbilidad.año_diagnostico ? String(comorbilidad.año_diagnostico) : '');
    updateComorbilidadField('es_agregado_posterior', comorbilidad.es_agregado_posterior || false);
    updateComorbilidadField('recibe_tratamiento_no_farmacologico', comorbilidad.recibe_tratamiento_no_farmacologico || false);
    updateComorbilidadField('recibe_tratamiento_farmacologico', comorbilidad.recibe_tratamiento_farmacologico || false);
    setShowAddComorbilidad(true);
  };

  const handleDeleteComorbilidad = (comorbilidad) => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar la comorbilidad "${comorbilidad.nombre || comorbilidad.nombre_comorbilidad}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentPacienteId = pacienteId || paciente?.id_paciente;
              if (!currentPacienteId) {
                Alert.alert('Error', 'ID de paciente no disponible');
                return;
              }
              
              Logger.info('Eliminando comorbilidad del paciente...', {
                pacienteId: currentPacienteId,
                id_comorbilidad: comorbilidad.id_comorbilidad
              });
              
              await gestionService.deletePacienteComorbilidad(
                currentPacienteId,
                comorbilidad.id_comorbilidad
              );
              
              Logger.info('Comorbilidad eliminada exitosamente', {
                pacienteId: currentPacienteId,
                id_comorbilidad: comorbilidad.id_comorbilidad
              });
              
              Alert.alert('Éxito', 'Comorbilidad eliminada exitosamente');
              
              // Refrescar datos
              await refreshComorbilidades();
              await refresh();
              
            } catch (error) {
              Logger.error('Error eliminando comorbilidad', {
                error: error.message,
                pacienteId: pacienteId || paciente?.id_paciente,
                stack: error.stack
              });
              
              let errorMessage = 'No se pudo eliminar la comorbilidad. Intente nuevamente.';
              
              if (error.response) {
                const status = error.response.status;
                if (status === 404) {
                  errorMessage = 'Comorbilidad no encontrada.';
                } else if (status === 500) {
                  errorMessage = 'Error del servidor. Intente más tarde.';
                }
              } else if (error.request) {
                errorMessage = 'Error de conexión. Verifique su internet.';
              }
              
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  // =====================================================
  // FUNCIONES EDIT/DELETE PARA SIGNOS VITALES
  // =====================================================

  const handleEditSignosVitales = (signo) => {
    setEditingSignosVitales(signo);
    setFormDataSignosVitales({
      id_cita: signo.id_cita ? String(signo.id_cita) : '',
      peso_kg: signo.peso_kg ? String(signo.peso_kg) : '',
      talla_m: signo.talla_m ? String(signo.talla_m) : '',
      medida_cintura_cm: signo.medida_cintura_cm ? String(signo.medida_cintura_cm) : '',
      presion_sistolica: signo.presion_sistolica ? String(signo.presion_sistolica) : '',
      presion_diastolica: signo.presion_diastolica ? String(signo.presion_diastolica) : '',
      glucosa_mg_dl: signo.glucosa_mg_dl ? String(signo.glucosa_mg_dl) : '',
      colesterol_mg_dl: signo.colesterol_mg_dl ? String(signo.colesterol_mg_dl) : '',
      colesterol_ldl: signo.colesterol_ldl ? String(signo.colesterol_ldl) : '', // ✅ Colesterol LDL
      colesterol_hdl: signo.colesterol_hdl ? String(signo.colesterol_hdl) : '', // ✅ Colesterol HDL
      trigliceridos_mg_dl: signo.trigliceridos_mg_dl ? String(signo.trigliceridos_mg_dl) : '',
      hba1c_porcentaje: signo.hba1c_porcentaje ? String(signo.hba1c_porcentaje) : '', // ✅ HbA1c (%)
      edad_paciente_en_medicion: signo.edad_paciente_en_medicion ? String(signo.edad_paciente_en_medicion) : '', // ✅ Edad en medición
      observaciones: signo.observaciones || ''
    });
    setShowAddSignosVitales(true);
  };

  const handleDeleteSignosVitales = (signo) => {
    // Validar que solo Admin pueda eliminar
    if (!requireAdminForDelete('signos vitales')) {
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar los signos vitales del ${signo.fecha_medicion ? formatearFecha(signo.fecha_medicion) : formatearFecha(signo.fecha_creacion)}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentPacienteId = pacienteId || paciente?.id_paciente;
              if (!currentPacienteId) {
                Alert.alert('Error', 'ID de paciente no disponible');
                return;
              }
              
              Logger.info('Eliminando signos vitales del paciente...', {
                pacienteId: currentPacienteId,
                id_signo: signo.id_signo
              });
              
              await gestionService.deletePacienteSignosVitales(
                currentPacienteId,
                signo.id_signo
              );
              
              Logger.info('Signos vitales eliminados exitosamente', {
                pacienteId: currentPacienteId,
                id_signo: signo.id_signo
              });
              
              Alert.alert('Éxito', 'Signos vitales eliminados exitosamente');
              
              // Refrescar datos y card de monitoreo continuo
              await refreshMedicalData();
              await refresh();
              setRefreshSignosTrigger(prev => prev + 1);
              
            } catch (error) {
              Logger.error('Error eliminando signos vitales', {
                error: error.message,
                pacienteId: pacienteId || paciente?.id_paciente,
                stack: error.stack
              });
              
              handleDeleteError(error, 'signos vitales');
            }
          }
        }
      ]
    );
  };

  // =====================================================
  // FUNCIONES EDIT/DELETE PARA DIAGNÓSTICOS
  // =====================================================

  const handleEditDiagnostico = (diagnostico) => {
    setEditingDiagnostico(diagnostico);
    setFormDataDiagnostico({
      id_cita: diagnostico.id_cita ? String(diagnostico.id_cita) : '',
      descripcion: diagnostico.descripcion || ''
    });
    setShowAddDiagnostico(true);
  };

  const handleDeleteDiagnostico = (diagnostico) => {
    // Validar que solo Admin pueda eliminar
    if (!requireAdminForDelete('diagnósticos')) {
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar este diagnóstico?\n\n"${diagnostico.descripcion?.substring(0, 50)}${diagnostico.descripcion?.length > 50 ? '...' : ''}"`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentPacienteId = pacienteId || paciente?.id_paciente;
              if (!currentPacienteId) {
                Alert.alert('Error', 'ID de paciente no disponible');
                return;
              }
              
              Logger.info('Eliminando diagnóstico del paciente...', {
                pacienteId: currentPacienteId,
                id_diagnostico: diagnostico.id_diagnostico
              });
              
              await gestionService.deletePacienteDiagnostico(
                currentPacienteId,
                diagnostico.id_diagnostico
              );
              
              Logger.info('Diagnóstico eliminado exitosamente', {
                pacienteId: currentPacienteId,
                id_diagnostico: diagnostico.id_diagnostico
              });
              
              Alert.alert('Éxito', 'Diagnóstico eliminado exitosamente');
              
              // Refrescar datos
              await refreshMedicalData();
              await refresh();
              
            } catch (error) {
              Logger.error('Error eliminando diagnóstico', {
                error: error.message,
                pacienteId: pacienteId || paciente?.id_paciente,
                stack: error.stack
              });
              
              handleDeleteError(error, 'diagnóstico');
            }
          }
        }
      ]
    );
  };

  // =====================================================
  // FUNCIONES EDIT/DELETE PARA MEDICAMENTOS
  // =====================================================

  const handleEditMedicamento = async (medicamento) => {
    try {
      // Obtener el plan completo para editar
      const currentPacienteId = pacienteId || paciente?.id_paciente;
      if (!currentPacienteId) {
        Alert.alert('Error', 'ID de paciente no disponible');
        return;
      }

      // La API GET /medicamentos devuelve lista aplanada (un ítem por medicamento), no planes con array "medicamentos".
      // Agrupar por id_plan para reconstruir el plan completo con todos sus medicamentos.
      const medicamentosData = await gestionService.getPacienteMedicamentos(currentPacienteId, { limit: 100 });
      const listaAplanada = medicamentosData?.data || [];
      const idPlanBuscado = medicamento.id_plan || medicamento.id_plan_medicacion;
      const itemsDelPlan = listaAplanada.filter(m =>
        m.id_plan === idPlanBuscado || (m.id_plan_medicacion && m.id_plan_medicacion === idPlanBuscado)
      );

      if (itemsDelPlan.length > 0) {
        const primerItem = itemsDelPlan[0];
        const planCompleto = {
          id_plan: primerItem.id_plan || idPlanBuscado,
          id_plan_medicacion: primerItem.id_plan_medicacion || primerItem.id_plan,
          id_cita: primerItem.id_cita,
          fecha_inicio: primerItem.fecha_inicio,
          fecha_fin: primerItem.fecha_fin,
          observaciones: primerItem.observaciones,
          medicamentos: itemsDelPlan.filter(m => m.id_medicamento != null)
        };
        setEditingMedicamento(planCompleto);
        // Mapear medicamentos para el formulario: nombre_medicamento -> nombre, horarios array
        const medicamentosForm = (planCompleto.medicamentos || []).map(m => ({
          id_medicamento: m.id_medicamento,
          nombre: m.nombre_medicamento || m.nombre,
          dosis: m.dosis || '',
          frecuencia: m.frecuencia || '',
          horario: m.horario || '',
          horarios: Array.isArray(m.horarios) && m.horarios.length > 0 ? [...m.horarios] : (m.horario ? [m.horario] : ['']),
          via_administracion: m.via_administracion || '',
          observaciones: m.observaciones || ''
        }));
        setFormDataMedicamentos({
          id_cita: planCompleto.id_cita ? String(planCompleto.id_cita) : '',
          fecha_inicio: planCompleto.fecha_inicio || new Date().toISOString().split('T')[0],
          fecha_fin: planCompleto.fecha_fin || '',
          observaciones: planCompleto.observaciones || '',
          medicamentos: medicamentosForm
        });
        setShowAddMedicamentos(true);
      } else {
        Alert.alert('Error', 'No se pudo cargar el plan de medicación completo');
      }
    } catch (error) {
      Logger.error('Error cargando plan de medicación para editar', error);
      Alert.alert('Error', 'No se pudo cargar el plan de medicación');
    }
  };

  const handleDeleteMedicamento = (medicamento) => {
    // Validar que solo Admin pueda eliminar
    if (!requireAdminForDelete('planes de medicación')) {
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar el plan de medicación que incluye "${medicamento.nombre_medicamento || 'medicamento(s)'}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentPacienteId = pacienteId || paciente?.id_paciente;
              if (!currentPacienteId) {
                Alert.alert('Error', 'ID de paciente no disponible');
                return;
              }
              
              Logger.info('Eliminando plan de medicación del paciente...', {
                pacienteId: currentPacienteId,
                id_plan: medicamento.id_plan || medicamento.id_plan_medicacion
              });
              
              await gestionService.deletePacientePlanMedicacion(
                currentPacienteId,
                medicamento.id_plan || medicamento.id_plan_medicacion
              );
              
              Logger.info('Plan de medicación eliminado exitosamente', {
                pacienteId: currentPacienteId,
                id_plan: medicamento.id_plan || medicamento.id_plan_medicacion
              });
              
              Alert.alert('Éxito', 'Plan de medicación eliminado exitosamente');
              
              // Refrescar datos
              await refreshMedicalData();
              await refresh();
              
            } catch (error) {
              Logger.error('Error eliminando plan de medicación', {
                error: error.message,
                pacienteId: pacienteId || paciente?.id_paciente,
                stack: error.stack
              });
              
              handleDeleteError(error, 'plan de medicación');
            }
          }
        }
      ]
    );
  };

  // =====================================================
  // FUNCIONES EDIT/DELETE PARA SESIONES EDUCATIVAS
  // =====================================================

  const handleEditSesionEducativa = (sesion) => {
    setEditingSesionEducativa(sesion);
    updateSesionEducativaField('fecha_sesion', sesion.fecha_sesion || new Date().toISOString().split('T')[0]);
    updateSesionEducativaField('asistio', sesion.asistio || false);
    updateSesionEducativaField('tipo_sesion', sesion.tipo_sesion || 'nutricional');
    updateSesionEducativaField('numero_intervenciones', sesion.numero_intervenciones ? String(sesion.numero_intervenciones) : '1');
    updateSesionEducativaField('observaciones', sesion.observaciones || '');
    updateSesionEducativaField('id_cita', sesion.id_cita ? String(sesion.id_cita) : '');
    setShowAddSesionEducativa(true);
  };

  const handleDeleteSesionEducativa = (sesion) => {
    // Validar que solo Admin pueda eliminar
    if (!requireAdminForDelete('sesiones educativas')) {
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar la sesión educativa del ${formatearFecha(sesion.fecha_sesion)}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentPacienteId = pacienteId || paciente?.id_paciente;
              if (!currentPacienteId) {
                Alert.alert('Error', 'ID de paciente no disponible');
                return;
              }
              
              Logger.info('Eliminando sesión educativa del paciente...', {
                pacienteId: currentPacienteId,
                id_sesion: sesion.id_sesion
              });
              
              await gestionService.deletePacienteSesionEducativa(
                currentPacienteId,
                sesion.id_sesion
              );
              
              Logger.info('Sesión educativa eliminada exitosamente', {
                pacienteId: currentPacienteId,
                id_sesion: sesion.id_sesion
              });
              
              Alert.alert('Éxito', 'Sesión educativa eliminada exitosamente');
              
              // Refrescar datos
              await refreshSesionesEducativas();
              await refresh();
              
            } catch (error) {
              Logger.error('Error eliminando sesión educativa', {
                error: error.message,
                pacienteId: pacienteId || paciente?.id_paciente,
                stack: error.stack
              });
              
              handleDeleteError(error, 'sesión educativa');
            }
          }
        }
      ]
    );
  };

  // =====================================================
  // FUNCIONES EDIT/DELETE PARA RED DE APOYO
  // =====================================================

  const handleEditRedApoyo = (contacto) => {
    setEditingRedApoyo(contacto);
    updateRedApoyoField('nombre_contacto', contacto.nombre_contacto || '');
    updateRedApoyoField('numero_celular', contacto.numero_celular || '');
    updateRedApoyoField('email', contacto.email || '');
    updateRedApoyoField('direccion', contacto.direccion || '');
    updateRedApoyoField('localidad', contacto.localidad || '');
    updateRedApoyoField('parentesco', contacto.parentesco || '');
    setShowAddRedApoyo(true);
  };

  const handleDeleteRedApoyo = (contacto) => {
    // Validar que solo Admin pueda eliminar
    if (!requireAdminForDelete('contactos de red de apoyo')) {
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar el contacto "${contacto.nombre_contacto}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentPacienteId = pacienteId || paciente?.id_paciente;
              if (!currentPacienteId) {
                Alert.alert('Error', 'ID de paciente no disponible');
                return;
              }
              
              Logger.info('Eliminando contacto de red de apoyo del paciente...', {
                pacienteId: currentPacienteId,
                id_red_apoyo: contacto.id_red_apoyo
              });
              
              await gestionService.deletePacienteRedApoyo(
                currentPacienteId,
                contacto.id_red_apoyo
              );
              
              Logger.info('Contacto de red de apoyo eliminado exitosamente', {
                pacienteId: currentPacienteId,
                id_red_apoyo: contacto.id_red_apoyo
              });
              
              Alert.alert('Éxito', 'Contacto eliminado exitosamente');
              
              // Refrescar datos
              await refreshRedApoyo();
              await refresh();
              
            } catch (error) {
              Logger.error('Error eliminando contacto de red de apoyo', {
                error: error.message,
                pacienteId: pacienteId || paciente?.id_paciente,
                stack: error.stack
              });
              
              handleDeleteError(error, 'contacto de red de apoyo');
            }
          }
        }
      ]
    );
  };

  // =====================================================
  // FUNCIONES EDIT/DELETE PARA ESQUEMA DE VACUNACIÓN
  // =====================================================

  const handleEditEsquemaVacunacion = (vacuna) => {
    setEditingEsquemaVacunacion(vacuna);
    updateEsquemaVacunacionField('vacuna', vacuna.vacuna || '');
    updateEsquemaVacunacionField('fecha_aplicacion', vacuna.fecha_aplicacion || '');
    updateEsquemaVacunacionField('lote', vacuna.lote || '');
    updateEsquemaVacunacionField('observaciones', vacuna.observaciones || '');
    setShowAddEsquemaVacunacion(true);
  };

  const handleDeleteEsquemaVacunacion = (vacuna) => {
    // Validar que solo Admin pueda eliminar
    if (!requireAdminForDelete('registros de vacunación')) {
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de que desea eliminar el registro de vacuna "${vacuna.vacuna}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const currentPacienteId = pacienteId || paciente?.id_paciente;
              if (!currentPacienteId) {
                Alert.alert('Error', 'ID de paciente no disponible');
                return;
              }
              
              Logger.info('Eliminando registro de vacunación del paciente...', {
                pacienteId: currentPacienteId,
                id_esquema: vacuna.id_esquema
              });
              
              await gestionService.deletePacienteEsquemaVacunacion(
                currentPacienteId,
                vacuna.id_esquema
              );
              
              Logger.info('Registro de vacunación eliminado exitosamente', {
                pacienteId: currentPacienteId,
                id_esquema: vacuna.id_esquema
              });
              
              Alert.alert('Éxito', 'Registro de vacunación eliminado exitosamente');
              
              // Refrescar datos
              await refreshEsquemaVacunacion();
              await refresh();
              
            } catch (error) {
              Logger.error('Error eliminando registro de vacunación', {
                error: error.message,
                pacienteId: pacienteId || paciente?.id_paciente,
                stack: error.stack
              });
              
              handleDeleteError(error, 'registro de vacunación');
            }
          }
        }
      ]
    );
  };

  // =====================================================
  // FUNCIONES EDIT/DELETE/CANCELAR PARA CITAS
  // =====================================================

  const handleEditCita = (cita) => {
    setEditingCita(cita);
    setFormDataCita({
      id_doctor: cita.id_doctor ? String(cita.id_doctor) : '',
      fecha_cita: cita.fecha_cita || '',
      motivo: cita.motivo || '',
      observaciones: cita.observaciones || '',
      es_primera_consulta: cita.es_primera_consulta || false
    });
    setShowAddCita(true);
  };

  const handleCancelarCita = (cita) => {
    Alert.alert(
      'Cancelar Cita',
      `¿Está seguro de que desea cancelar la cita del ${formatearFecha(cita.fecha_cita)}?`,
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Sí, Cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              Logger.info('Cancelando cita...', { citaId: cita.id_cita });
              
              await gestionService.cancelarCita(cita.id_cita, 'Cita cancelada por el usuario');
              
              Logger.info('Cita cancelada exitosamente', { citaId: cita.id_cita });
              
              Alert.alert('Éxito', 'Cita cancelada exitosamente');
              
              // Refrescar datos
              await refreshMedicalData();
              await refresh();
              
            } catch (error) {
              Logger.error('Error cancelando cita', {
                error: error.message,
                citaId: cita.id_cita,
                stack: error.stack
              });
              
              let errorMessage = 'No se pudo cancelar la cita. Intente nuevamente.';
              
              if (error.response) {
                const status = error.response.status;
                if (status === 404) {
                  errorMessage = 'Cita no encontrada.';
                } else if (status === 400) {
                  errorMessage = error.response.data?.error || 'No se puede cancelar esta cita.';
                } else if (status === 500) {
                  errorMessage = 'Error del servidor. Intente más tarde.';
                }
              } else if (error.request) {
                errorMessage = 'Error de conexión. Verifique su internet.';
              }
              
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleDeleteCita = (cita) => {
    // Validar que solo Admin pueda eliminar
    if (!requireAdminForDelete('citas')) {
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Está seguro de que desea ELIMINAR PERMANENTEMENTE la cita del ${formatearFecha(cita.fecha_cita)}?\n\n⚠️ Esta acción no se puede deshacer.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar Permanentemente',
          style: 'destructive',
          onPress: async () => {
            try {
              Logger.info('Eliminando cita permanentemente...', { citaId: cita.id_cita });
              
              await gestionService.deleteCita(cita.id_cita);
              
              Logger.info('Cita eliminada exitosamente', { citaId: cita.id_cita });
              
              Alert.alert('Éxito', 'Cita eliminada permanentemente');
              
              // Refrescar datos
              await refreshMedicalData();
              await refresh();
              
            } catch (error) {
              Logger.error('Error eliminando cita', {
                error: error.message,
                citaId: cita.id_cita,
                stack: error.stack
              });
              
              handleDeleteError(error, 'cita');
            }
          }
        }
      ]
    );
  };

  const handleEditPaciente = () => {
    if (!paciente?.id_paciente) {
      Alert.alert('Error', 'No hay datos del paciente disponibles');
      return;
    }
    navigation.navigate('EditarPaciente', { paciente });
  };

  // Cargar doctores del paciente
  const loadDoctoresPaciente = useCallback(async () => {
    const currentPacienteId = pacienteId || paciente?.id_paciente;
    if (!currentPacienteId) return;
    
    try {
      setLoadingDoctoresPaciente(true);
      const response = await gestionService.getPacienteDoctores(currentPacienteId);
      setDoctoresPaciente(response.data || []);
      Logger.info('Doctores del paciente cargados', { 
        pacienteId: currentPacienteId, 
        total: response.total || 0 
      });
    } catch (error) {
      Logger.error('Error cargando doctores del paciente', error);
      Alert.alert('Error', 'No se pudieron cargar los doctores del paciente');
    } finally {
      setLoadingDoctoresPaciente(false);
    }
  }, [pacienteId, paciente?.id_paciente]);

  // Cargar doctores cuando se abre el modal
  useEffect(() => {
    if (modalManager.isOpen('optionsDoctores') || modalManager.isOpen('showAllDoctores')) {
      loadDoctoresPaciente();
    }
  }, [modalManager.isOpen('optionsDoctores'), modalManager.isOpen('showAllDoctores'), loadDoctoresPaciente]);

  const handleChangeDoctor = async () => {
    const currentPacienteId = pacienteId || paciente?.id_paciente;
    if (!currentPacienteId) {
      Alert.alert('Error', 'No hay datos del paciente disponibles');
      return;
    }
    
    modalManager.open('optionsDoctores');
  };

  // Wrapper para resetFormDoctor que también resetea doctorSeleccionado
  const resetFormDoctorWrapper = useCallback(() => {
    resetFormDoctor();
    setDoctorSeleccionado(null);
  }, [resetFormDoctor]);

  const handleSelectDoctor = (doctor) => {
    updateDoctorField('id_doctor', doctor.id_doctor || doctor.id);
    setDoctorSeleccionado(doctor);
  };

  const handleSaveDoctor = async () => {
    const currentPacienteId = pacienteId || paciente?.id_paciente;
    if (!currentPacienteId) {
      Alert.alert('Error', 'No hay datos del paciente disponibles');
      return;
    }

    if (!formDataDoctor.id_doctor) {
      Alert.alert('Error', 'Seleccione un doctor');
      return;
    }

    try {
      setSavingDoctor(true);
      const doctorId = typeof formDataDoctor.id_doctor === 'string' 
        ? parseInt(formDataDoctor.id_doctor, 10) 
        : formDataDoctor.id_doctor;

      if (isNaN(doctorId)) {
        Alert.alert('Error', 'ID de doctor inválido');
        return;
      }

      await gestionService.assignDoctorToPaciente(
        currentPacienteId,
        doctorId,
        formDataDoctor.observaciones?.trim() || ''
      );

      Alert.alert('Éxito', 'Doctor asignado exitosamente');
      resetFormDoctor();
      setShowAddDoctor(false);
      await Promise.all([
        loadDoctoresPaciente(),
        refresh()
      ]);
      Logger.info('Datos refrescados después de asignar doctor');
    } catch (error) {
      Logger.error('Error guardando doctor', {
        error: error.message,
        pacienteId: pacienteId || paciente?.id_paciente,
        stack: error.stack
      });
      let errorMessage = 'No se pudo asignar el doctor. Intente nuevamente.';
      if (error.message && error.status) {
        errorMessage = error.message;
      } else if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        const backendError = errorData?.error || errorData?.message;
        if (status === 400) {
          errorMessage = backendError || 'Datos inválidos. Verifique la información.';
        } else if (status === 404) {
          errorMessage = backendError || 'Paciente o doctor no encontrado.';
        } else if (status === 409) {
          errorMessage = backendError || 'El doctor ya está asignado a este paciente.';
        } else if (status === 500) {
          errorMessage = backendError || 'Error del servidor. Intente más tarde.';
        }
      } else if (error.request) {
        errorMessage = 'Error de conexión. Verifique su internet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setSavingDoctor(false);
    }
  };

  const handleReplaceDoctor = async () => {
    if (!paciente?.id_paciente || !doctorSeleccionado || !formDataDoctor.id_doctor) {
      Alert.alert('Error', 'Seleccione el doctor nuevo');
      return;
    }

    const doctorIdAntiguo = doctorSeleccionado.id_doctor || doctorSeleccionado.id;
    const doctorIdNuevo = typeof formDataDoctor.id_doctor === 'string' 
      ? parseInt(formDataDoctor.id_doctor, 10) 
      : formDataDoctor.id_doctor;

    if (isNaN(doctorIdNuevo)) {
      Alert.alert('Error', 'ID de doctor nuevo inválido');
      return;
    }

    if (doctorIdAntiguo === doctorIdNuevo) {
      Alert.alert('Error', 'El doctor nuevo debe ser diferente al actual');
      return;
    }

    Alert.alert(
      'Reemplazar Doctor',
      `¿Está seguro de que desea reemplazar al doctor "${doctorSeleccionado.nombre_completo || doctorSeleccionado.nombre}" por otro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reemplazar',
          style: 'destructive',
          onPress: async () => {
            try {
              setSavingDoctor(true);
              const currentPacienteId = pacienteId || paciente?.id_paciente;
              if (!currentPacienteId) {
                Alert.alert('Error', 'ID de paciente no disponible');
                setSavingDoctor(false);
                return;
              }
              await gestionService.replacePacienteDoctor(
                currentPacienteId,
                doctorIdAntiguo,
                doctorIdNuevo,
                formDataDoctor.observaciones?.trim() || ''
              );

              Alert.alert('Éxito', 'Doctor reemplazado exitosamente');
              resetFormDoctor();
              setShowReplaceDoctor(false);
              await Promise.all([
                loadDoctoresPaciente(),
                refresh()
              ]);
              Logger.info('Datos refrescados después de reemplazar doctor');
            } catch (error) {
              Logger.error('Error reemplazando doctor', error);
              let errorMessage = 'No se pudo reemplazar el doctor. Intente nuevamente.';
              if (error.message && error.status) {
                errorMessage = error.message;
              } else if (error.response) {
                const backendError = error.response.data?.error || error.response.data?.message;
                errorMessage = backendError || errorMessage;
              }
              Alert.alert('Error', errorMessage);
            } finally {
              setSavingDoctor(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteDoctor = async (doctor) => {
    const currentPacienteId = pacienteId || paciente?.id_paciente;
    if (!currentPacienteId) {
      Alert.alert('Error', 'No hay datos del paciente disponibles');
      return;
    }

    const doctorId = doctor.id_doctor || doctor.id;
    const doctorNombre = doctor.nombre_completo || `${doctor.nombre} ${doctor.apellido_paterno}`.trim();

    Alert.alert(
      'Desasignar Doctor',
      `¿Está seguro de que desea desasignar al doctor "${doctorNombre}" de este paciente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desasignar',
          style: 'destructive',
          onPress: async () => {
            try {
              await gestionService.unassignDoctorFromPaciente(currentPacienteId, doctorId);
              Alert.alert('Éxito', 'Doctor desasignado exitosamente');
              await Promise.all([
                loadDoctoresPaciente(),
                refresh()
              ]);
              Logger.info('Datos refrescados después de desasignar doctor');
            } catch (error) {
              Logger.error('Error desasignando doctor', error);
              let errorMessage = 'No se pudo desasignar el doctor. Intente nuevamente.';
              if (error.message && error.status) {
                errorMessage = error.message;
              } else if (error.response) {
                const backendError = error.response.data?.error || error.response.data?.message;
                errorMessage = backendError || errorMessage;
              }
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleDeletePaciente = async () => {
    const currentPacienteId = pacienteId || paciente?.id_paciente;
    if (!currentPacienteId) {
      Alert.alert('Error', 'No hay datos del paciente disponibles');
      return;
    }
    
    if (!paciente) {
      Alert.alert('Error', 'No hay datos del paciente disponibles');
      return;
    }
    
    const nombreCompleto = `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim();
    
    Alert.alert(
      'Eliminar Paciente',
      `¿Estás seguro de que deseas eliminar a ${nombreCompleto}?\n\nEsta acción marcará el paciente como eliminado (soft delete).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              Logger.info('Eliminando paciente (soft delete)', { 
                pacienteId: currentPacienteId,
                nombre: nombreCompleto
              });
              
              await gestionService.deletePaciente(currentPacienteId);
              
              Logger.info('Paciente eliminado exitosamente', { 
                pacienteId: currentPacienteId,
                nombre: nombreCompleto
              });
              
              Alert.alert('Éxito', 'Paciente eliminado correctamente', [
                { 
                  text: 'OK', 
                  onPress: () => navigation.goBack() 
                }
              ]);
            } catch (error) {
              Logger.error('Error eliminando paciente', { 
                pacienteId: currentPacienteId,
                error: error.message,
                stack: error.stack
              });
              Alert.alert('Error', 'No se pudo eliminar el paciente. Por favor, intenta nuevamente.');
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async () => {
    const currentPacienteId = pacienteId || paciente?.id_paciente;
    if (!currentPacienteId || !paciente) {
      Alert.alert('Error', 'No hay datos del paciente disponibles');
      return;
    }
    
    const nombreCompleto = `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim();
    const accion = paciente.activo ? 'desactivar' : 'activar';
    const nuevoEstado = !paciente.activo;
    
    Alert.alert(
      `Confirmar ${accion}`,
      `¿Estás seguro de que deseas ${accion} a ${nombreCompleto}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: accion.charAt(0).toUpperCase() + accion.slice(1), 
          style: paciente.activo ? 'destructive' : 'default',
          onPress: async () => {
            try {
              Logger.info(`${accion.charAt(0).toUpperCase() + accion.slice(1)} paciente`, { 
                pacienteId: currentPacienteId,
                nuevoEstado
              });
              
              await gestionService.updatePaciente(currentPacienteId, { activo: nuevoEstado });
              
              Logger.info(`Paciente ${accion}do exitosamente`, { 
                pacienteId: currentPacienteId,
                nuevoEstado
              });
              
              Alert.alert('Éxito', `Paciente ${accion}do exitosamente`);
              
              // Refrescar datos para mostrar el nuevo estado
              await refresh();
            } catch (error) {
              Logger.error(`Error ${accion}do paciente`, error);
              Alert.alert('Error', `No se pudo ${accion} el paciente. Inténtalo de nuevo.`);
            }
          }
        }
      ]
    );
  };

  // Función para cargar todos los signos vitales al abrir el modal
  const handleShowAllSignosVitales = async () => {
    const currentPacienteId = pacienteId || paciente?.id_paciente;
    if (!currentPacienteId) {
      Alert.alert('Error', 'No hay datos del paciente disponibles');
      return;
    }

    setLoadingAllSignos(true);
    try {
      Logger.info('Cargando todos los signos vitales del paciente');
      
      const gestionService = (await import('../../api/gestionService.js')).default;
      const response = await gestionService.getPacienteSignosVitales(
        currentPacienteId,
        { limit: 100, offset: 0, sort: 'DESC' }
      );
      
      const signosData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setAllSignosVitales(signosData);
      setShowAllSignosVitales(true);
      
      Logger.success(`Todos los signos vitales cargados: ${signosData.length} registros`);
    } catch (error) {
      Logger.error('Error cargando todos los signos vitales', error);
      Alert.alert('Error', 'No se pudieron cargar los signos vitales');
    } finally {
      setLoadingAllSignos(false);
    }
  };

  // Función para cargar todas las citas al abrir el modal
  /**
   * Abre el modal de historial completo de consultas
   * Simplificado: ahora solo abre el modal, los datos se cargan dentro del componente
   */
  const handleShowAllCitas = useCallback(() => {
    const currentPacienteId = pacienteId || paciente?.id_paciente;
    if (!currentPacienteId) {
      Alert.alert('Error', 'No hay datos del paciente disponibles');
      return;
    }

    Logger.info('Abriendo historial completo de consultas');
    setShowAllCitas(true);
    modalManager.open('showAllCitas');
  }, [pacienteId, paciente, modalManager]);

  // Función para abrir detalle de cita
  const handleOpenCitaDetalle = async (citaId) => {
    if (!citaId) {
      Alert.alert('Error', 'ID de cita no válido');
      return;
    }

    setLoadingCitaDetalle(true);
    setCitaDetalle(null);
    modalManager.open('detalleCita');

    try {
      Logger.info('Obteniendo detalle de cita', { citaId });
      
      const citaData = await gestionService.getCitaById(citaId);
      
      Logger.success('Detalle de cita obtenido', { 
        citaId,
        hasSignosVitales: Array.isArray(citaData.SignosVitales) && citaData.SignosVitales.length > 0,
        hasDiagnosticos: Array.isArray(citaData.Diagnosticos) && citaData.Diagnosticos.length > 0
      });
      
      setCitaDetalle(citaData);
    } catch (error) {
      Logger.error('Error obteniendo detalle de cita', error);
      Alert.alert('Error', 'No se pudo cargar el detalle de la cita');
      handleCloseDetalleCita();
    } finally {
      setLoadingCitaDetalle(false);
    }
  };

  // Cerrar modal detalle de cita y refrescar el card "Última cita" para mostrar estado actualizado
  const handleCloseDetalleCita = useCallback(() => {
    modalManager.close('detalleCita');
    setRefreshCitasTrigger(prev => prev + 1);
  }, []);

  // ✅ FASE 3: Función para abrir formulario de signos vitales desde detalle de cita
  const handleOpenSignosVitalesFromCita = (citaId) => {
    if (!citaId) {
      Alert.alert('Error', 'ID de cita no válido');
      return;
    }

    Logger.info('Abriendo formulario de signos vitales desde cita', { citaId });
    
    // Cerrar modal de detalle y refrescar card de última cita
    handleCloseDetalleCita();
    
    // Resetear formulario y prellenar id_cita
    resetFormSignosVitales();
    updateFormField('id_cita', String(citaId));
    
    // Abrir formulario de signos vitales
    setShowAddSignosVitales(true);
    
    Logger.success('Formulario de signos vitales abierto con cita asociada', { citaId });
  };

  // ✅ NUEVO: Función para resetear formulario de consulta completa
  const resetFormConsultaCompleta = () => {
    setFormDataConsultaCompleta({
      cita: {
        id_doctor: '',
        fecha_cita: '',
        motivo: '',
        observaciones: '',
        es_primera_consulta: false,
        id_cita: null
      },
      signos_vitales: {
        peso_kg: '',
        talla_m: '',
        medida_cintura_cm: '',
        presion_sistolica: '',
        presion_diastolica: '',
        glucosa_mg_dl: '',
        colesterol_mg_dl: '',
        trigliceridos_mg_dl: '',
        observaciones: ''
      },
      diagnostico: {
        descripcion: ''
      },
      plan_medicacion: {
        observaciones: '',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '',
        medicamentos: []
      }
    });
    setModoConsulta('crear_nueva');
    setCitaSeleccionadaCompleta(null);
    setSeccionesExpandidas({
      signosVitales: false,
      diagnostico: false,
      planMedicacion: false
    });
  };

  // ✅ NUEVO: Función para abrir formulario de consulta completa (modo: crear nueva)
  const handleOpenConsultaCompletaNueva = () => {
    resetFormConsultaCompleta();
    setModoConsulta('crear_nueva');
    setShowConsultaCompleta(true);
    modalManager.open('consultaCompleta');
  };

  // ✅ NUEVO: Función para abrir formulario de consulta completa (modo: completar existente)
  const handleOpenConsultaCompletaExistente = (citaId) => {
    if (!citaId) {
      Alert.alert('Error', 'ID de cita no válido');
      return;
    }

    // Buscar la cita en la lista
    const cita = citas?.find(c => c.id_cita === citaId);
    
    if (!cita) {
      Alert.alert('Error', 'No se encontró la cita seleccionada');
      return;
    }

    resetFormConsultaCompleta();
    setModoConsulta('completar_existente');
    setCitaSeleccionadaCompleta(cita);
    
    // Prellenar datos de la cita (solo lectura)
    setFormDataConsultaCompleta(prev => ({
      ...prev,
      cita: {
        ...prev.cita,
        id_cita: cita.id_cita,
        id_doctor: cita.id_doctor || '',
        fecha_cita: cita.fecha_cita || '',
        motivo: cita.motivo || '',
        observaciones: cita.observaciones || '',
        es_primera_consulta: cita.es_primera_consulta || false
      }
    }));

    // Cerrar modal de detalle si está abierto y refrescar card de última cita
    handleCloseDetalleCita();
    
    setShowConsultaCompleta(true);
    modalManager.open('consultaCompleta');
    
    Logger.info('Formulario de consulta completa abierto para completar cita existente', { citaId });
  };

  // ✅ NUEVO: Función para abrir wizard de completar cita
  const handleOpenWizard = async (citaId) => {
    if (!citaId) {
      Alert.alert('Error', 'ID de cita no válido');
      return;
    }

    try {
      Logger.info('Abriendo wizard de completar cita', { citaId });
      
      // Cerrar modal de detalle de cita si está abierto (antes de abrir wizard) y refrescar card
      handleCloseDetalleCita();
      
      // Pequeño delay para asegurar que el modal se cierre antes de abrir el wizard
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Primero mostrar el modal (con loading)
      setShowWizard(true);
      setCitaSeleccionadaWizard(null); // Resetear mientras carga
      
      // Obtener datos completos de la cita
      Logger.debug('Obteniendo datos de la cita', { citaId });
      const citaData = await gestionService.getCitaById(citaId);
      
      Logger.debug('Respuesta de getCitaById', { 
        hasResponse: !!citaData,
        hasId: !!citaData?.id_cita || !!citaData?.data?.id_cita,
        responseKeys: citaData ? Object.keys(citaData) : [],
        responseType: typeof citaData
      });
      
      // getCitaById retorna response.data directamente del backend
      // Puede venir como { success: true, data: {...} } o directamente como objeto de cita
      const cita = citaData?.data || citaData;
      
      if (cita && (cita.id_cita || cita.data?.id_cita)) {
        setCitaSeleccionadaWizard(cita);
        Logger.info('Wizard de completar cita abierto', { 
          citaId,
          citaIdFromData: cita.id_cita || cita.data?.id_cita
        });
      } else {
        Logger.error('Error al obtener datos de la cita - respuesta inválida', { 
          citaId, 
          citaData,
          cita
        });
        Alert.alert('Error', 'No se pudo cargar los datos de la cita. La respuesta no contiene datos válidos.');
        setShowWizard(false);
      }
    } catch (error) {
      Logger.error('Error abriendo wizard', { 
        error: error.message || error,
        stack: error.stack,
        citaId 
      });
      Alert.alert('Error', `No se pudo abrir el wizard: ${error.message || 'Error desconocido'}`);
      setShowWizard(false);
    }
  };

  // ✅ NUEVO: Función para manejar éxito del wizard
  const handleWizardSuccess = () => {
    // Recargar citas y datos del paciente
    refreshMedicalData(); // Recarga todos los datos médicos (citas, signos vitales, etc.)
    refresh(); // Recarga los datos del paciente
    setRefreshCitasTrigger(prev => prev + 1); // Actualizar card "Última cita" y timeline
    setShowWizard(false);
    setCitaSeleccionadaWizard(null);
    Logger.info('Wizard completado exitosamente, datos recargados');
  };

  // ✅ NUEVO: Función para actualizar campo del formulario de consulta completa
  const updateFormFieldConsultaCompleta = (seccion, campo, valor) => {
    setFormDataConsultaCompleta(prev => ({
      ...prev,
      [seccion]: {
        ...prev[seccion],
        [campo]: valor
      }
    }));
  };

  // ✅ NUEVO: Función para toggle de secciones expandidas
  const toggleSeccion = (seccion) => {
    setSeccionesExpandidas(prev => ({
      ...prev,
      [seccion]: !prev[seccion]
    }));
  };

  // ✅ NUEVO: Función para guardar consulta completa
  const handleSaveConsultaCompleta = async () => {
    const currentPacienteId = pacienteId || paciente?.id_paciente;
    if (!currentPacienteId) {
      Alert.alert('Error', 'No hay datos del paciente disponibles');
      return;
    }

    // Validación básica: debe tener datos de cita
    if (modoConsulta === 'crear_nueva') {
      if (!formDataConsultaCompleta.cita.id_doctor || !formDataConsultaCompleta.cita.fecha_cita) {
        Alert.alert('Validación', 'Debe completar al menos doctor y fecha de la cita');
        return;
      }
    }

    // Verificar que hay al menos una sección con datos (excepto cita que es requerida)
    const tieneSignosVitales = formDataConsultaCompleta.signos_vitales.peso_kg || 
                                formDataConsultaCompleta.signos_vitales.presion_sistolica || 
                                formDataConsultaCompleta.signos_vitales.glucosa_mg_dl;
    const tieneDiagnostico = formDataConsultaCompleta.diagnostico.descripcion?.trim();
    const tienePlanMedicacion = formDataConsultaCompleta.plan_medicacion.medicamentos?.length > 0;

    if (!tieneSignosVitales && !tieneDiagnostico && !tienePlanMedicacion) {
      Alert.alert('Validación', 'Debe completar al menos una sección: Signos Vitales, Diagnóstico o Plan de Medicación');
      return;
    }

    setSavingConsultaCompleta(true);
    try {
      Logger.info('Guardando consulta completa', { 
        pacienteId: currentPacienteId,
        modo: modoConsulta,
        citaId: formDataConsultaCompleta.cita.id_cita
      });

      // Preparar datos para enviar
      const dataToSend = {
        cita: {
          ...formDataConsultaCompleta.cita,
          asistencia: modoConsulta === 'completar_existente' ? true : false
        }
      };

      // Incluir signos vitales solo si tienen datos
      if (tieneSignosVitales) {
        const signosData = {};
        if (formDataConsultaCompleta.signos_vitales.peso_kg) {
          signosData.peso_kg = parseFloat(formDataConsultaCompleta.signos_vitales.peso_kg);
        }
        if (formDataConsultaCompleta.signos_vitales.talla_m) {
          signosData.talla_m = parseFloat(formDataConsultaCompleta.signos_vitales.talla_m);
        }
        if (formDataConsultaCompleta.signos_vitales.medida_cintura_cm) {
          signosData.medida_cintura_cm = parseFloat(formDataConsultaCompleta.signos_vitales.medida_cintura_cm);
        }
        if (formDataConsultaCompleta.signos_vitales.presion_sistolica && formDataConsultaCompleta.signos_vitales.presion_diastolica) {
          signosData.presion_sistolica = parseInt(formDataConsultaCompleta.signos_vitales.presion_sistolica);
          signosData.presion_diastolica = parseInt(formDataConsultaCompleta.signos_vitales.presion_diastolica);
        }
        if (formDataConsultaCompleta.signos_vitales.glucosa_mg_dl) {
          signosData.glucosa_mg_dl = parseFloat(formDataConsultaCompleta.signos_vitales.glucosa_mg_dl);
        }
        if (formDataConsultaCompleta.signos_vitales.colesterol_mg_dl) {
          signosData.colesterol_mg_dl = parseFloat(formDataConsultaCompleta.signos_vitales.colesterol_mg_dl);
        }
        if (formDataConsultaCompleta.signos_vitales.trigliceridos_mg_dl) {
          signosData.trigliceridos_mg_dl = parseFloat(formDataConsultaCompleta.signos_vitales.trigliceridos_mg_dl);
        }
        if (formDataConsultaCompleta.signos_vitales.observaciones) {
          signosData.observaciones = formDataConsultaCompleta.signos_vitales.observaciones.trim();
        }
        dataToSend.signos_vitales = signosData;
      }

      // Incluir diagnóstico solo si tiene descripción
      if (tieneDiagnostico) {
        dataToSend.diagnostico = {
          descripcion: formDataConsultaCompleta.diagnostico.descripcion.trim()
        };
      }

      // Incluir plan de medicación solo si tiene medicamentos
      if (tienePlanMedicacion) {
        dataToSend.plan_medicacion = {
          observaciones: formDataConsultaCompleta.plan_medicacion.observaciones?.trim() || '',
          fecha_inicio: formDataConsultaCompleta.plan_medicacion.fecha_inicio || dataToSend.cita.fecha_cita,
          fecha_fin: formDataConsultaCompleta.plan_medicacion.fecha_fin || null,
          medicamentos: formDataConsultaCompleta.plan_medicacion.medicamentos.map(med => ({
            id_medicamento: med.id_medicamento,
            dosis: med.dosis || '',
            frecuencia: med.frecuencia || '',
            horario: med.horario || null,
            via_administracion: med.via_administracion || null,
            observaciones: med.observaciones || null
          }))
        };
      }

      const response = await gestionService.createConsultaCompleta(currentPacienteId, dataToSend);

      if (response.success) {
        Logger.success('Consulta completa guardada exitosamente');
        Alert.alert('Éxito', response.message || 'Consulta completa registrada correctamente');
        
        // Cerrar modal y resetear
        setShowConsultaCompleta(false);
        modalManager.close('consultaCompleta');
        resetFormConsultaCompleta();
        
        // Refrescar datos médicos y card/timeline de citas
        await refreshMedicalData();
        setRefreshCitasTrigger(prev => prev + 1);
      } else {
        throw new Error(response.error || 'Error al crear la consulta completa');
      }
    } catch (error) {
      Logger.error('Error guardando consulta completa', {
        error: error.message,
        paciente: currentPacienteId,
        modo: modoConsulta
      });
      
      let errorMessage = 'No se pudo guardar la consulta completa.';
      if (error.response) {
        const status = error.response.status;
        if (status === 400) {
          errorMessage = error.response.data?.error || 'Datos inválidos. Verifique la información.';
        } else if (status === 404) {
          errorMessage = 'Cita no encontrada.';
        } else if (status === 500) {
          errorMessage = 'Error del servidor. Por favor intente más tarde.';
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSavingConsultaCompleta(false);
    }
  };

  // Función para resetear formulario de cita
  const resetFormCita = () => {
    setFormDataCita({
      id_doctor: '',
      fecha_cita: '',
      motivo: '',
      observaciones: '',
      es_primera_consulta: false
    });
    setEditingCita(null);
    setShowDoctorDropdownCita(false); // Cerrar dropdown al resetear
  };

  // Función para actualizar campo del formulario de cita
  const updateFormFieldCita = (field, value) => {
    setFormDataCita(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Función para guardar cita con validaciones robustas
  const handleSaveCita = useCallback(async () => {
    // ⚠️ RATE LIMITING: Prevenir clicks repetidos
    const rateCheck = canExecute('saveCita', 1000);
    if (!rateCheck.allowed) {
      Alert.alert('Espere', 'Por favor espere antes de volver a intentar');
      return;
    }

    // ✅ VALIDACIÓN COMPLETA usando validador robusto
    const validation = validateCita(formDataCita);
    
    // Verificar que el validador devolvió sanitizedData
    if (!validation || !validation.sanitizedData) {
      Logger.error('Error en validación: sanitizedData no disponible', { validation });
      Alert.alert('Error', 'Error al validar los datos de la cita. Por favor, intente nuevamente.');
      return;
    }
    
    if (!validation.isValid) {
      // Mostrar primero error (si hay muchos)
      const firstError = Object.values(validation.errors)[0];
      Alert.alert('Validación', firstError);
      Logger.warn('Validación fallida en cita', validation.errors);
      return;
    }

    // ✅ USAR DATOS SANITIZADOS del validador
    const currentPacienteId = pacienteId || paciente?.id_paciente;
    if (!currentPacienteId) {
      Alert.alert('Error', 'ID de paciente no disponible');
      return;
    }
    
    setSavingCita(true);
    try {
      Logger.info('Guardando cita...', { 
        paciente: currentPacienteId,
        fecha: validation.sanitizedData?.fecha_cita || formDataCita.fecha_cita
      });
      
      const gestionService = (await import('../../api/gestionService.js')).default;
      
      // Preparar datos para enviar (usando datos sanitizados con fallbacks)
      // El validador ya convierte id_doctor a número, pero nos aseguramos aquí también
      const dataToSend = {
        id_paciente: currentPacienteId,
        id_doctor: validation.sanitizedData?.id_doctor ?? null, // Ya es número del validador
        fecha_cita: validation.sanitizedData?.fecha_cita || formDataCita.fecha_cita,
        motivo: validation.sanitizedData?.motivo || formDataCita.motivo,
        observaciones: validation.sanitizedData?.observaciones || formDataCita.observaciones || null,
        es_primera_consulta: validation.sanitizedData?.es_primera_consulta ?? formDataCita.es_primera_consulta ?? false
      };

      // Asegurar que id_doctor sea número o null
      if (dataToSend.id_doctor !== null && dataToSend.id_doctor !== undefined) {
        dataToSend.id_doctor = Number(dataToSend.id_doctor);
        if (isNaN(dataToSend.id_doctor) || dataToSend.id_doctor <= 0) {
          dataToSend.id_doctor = null;
        }
      } else {
        dataToSend.id_doctor = null;
      }

      // Si estamos editando, usar UPDATE; si no, usar CREATE
      let response;
      if (editingCita && editingCita.id_cita) {
        response = await gestionService.updateCita(editingCita.id_cita, dataToSend);
        Logger.info('Cita actualizada exitosamente');
        Alert.alert('Éxito', 'Cita actualizada correctamente');
        setEditingCita(null);
      } else {
        response = await gestionService.createCita(dataToSend);
        Logger.info('Cita guardada exitosamente');
        Alert.alert('Éxito', 'Cita registrada correctamente');
      }
      
      if (response.success || response.id_cita) {
        // Cerrar modal y resetear formulario
        setShowAddCita(false);
        resetFormCita();
        
        // Refrescar datos médicos
        await refreshMedicalData();
      } else {
        throw new Error(response.error || 'Error al crear la cita');
      }
      
    } catch (error) {
      // ✅ MANEJO ESPECÍFICO DE ERRORES
      Logger.error('Error guardando cita', {
        error: error.message,
        stack: error.stack,
        paciente: currentPacienteId,
        data: formDataCita
      });
      
      // Identificar tipo de error y dar mensaje específico
      let errorMessage = 'No se pudo guardar la cita.';
      
      if (error.response) {
        const status = error.response.status;
        if (status === 409) {
          errorMessage = 'Ya existe una cita en ese horario para este paciente.';
        } else if (status === 400) {
          errorMessage = error.response.data?.error || 'Datos inválidos. Verifique la información.';
        } else if (status === 401 || status === 403) {
          errorMessage = 'No tiene permisos para realizar esta acción.';
        } else if (status === 500) {
          errorMessage = 'Error del servidor. Por favor intente más tarde.';
        } else {
          errorMessage = `Error ${status}: ${error.response.data?.error || 'Error desconocido'}`;
        }
      } else if (error.request) {
        errorMessage = 'No hay conexión con el servidor. Verifique su internet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSavingCita(false);
    }
  }, [formDataCita, paciente, refreshMedicalData]);

  // Obtener IMC actual para mostrar en el formulario
  // Usar la función calcularIMC memoizada ya definida arriba
  const imcActual = useMemo(() => {
    const resultado = calcularIMC(formDataSignosVitales.peso_kg, formDataSignosVitales.talla_m);
    return resultado ? resultado.toString() : '';
  }, [formDataSignosVitales.peso_kg, formDataSignosVitales.talla_m, calcularIMC]);

  // ✅ Función para verificar si el paciente tiene diagnóstico de Hipercolesterolemia/Dislipidemia
  const tieneHipercolesterolemia = useCallback(() => {
    if (!comorbilidadesPaciente || comorbilidadesPaciente.length === 0) {
      return false;
    }
    
    const nombresRelevantes = ['Dislipidemia', 'Hipercolesterolemia', 'dislipidemia', 'hipercolesterolemia'];
    
    return comorbilidadesPaciente.some(comorbilidad => {
      const nombre = comorbilidad.nombre || comorbilidad.nombre_comorbilidad || '';
      return nombresRelevantes.some(relevante => 
        nombre.toLowerCase().includes(relevante.toLowerCase())
      );
    });
  }, [comorbilidadesPaciente]);

  // ✅ Función para verificar si el paciente tiene diagnóstico de Hipertrigliceridemia
  const tieneHipertrigliceridemia = useCallback(() => {
    if (!comorbilidadesPaciente || comorbilidadesPaciente.length === 0) {
      return false;
    }
    
    const nombresRelevantes = ['Hipertrigliceridemia', 'hipertrigliceridemia', 'trigliceridos', 'triglicéridos'];
    
    return comorbilidadesPaciente.some(comorbilidad => {
      const nombre = comorbilidad.nombre || comorbilidad.nombre_comorbilidad || '';
      return nombresRelevantes.some(relevante => 
        nombre.toLowerCase().includes(relevante.toLowerCase())
      );
    });
  }, [comorbilidadesPaciente]);

  // Función para resetear formulario
  const resetFormSignosVitales = () => {
    setFormDataSignosVitales({
      id_cita: '', // ✅ FASE 1: Incluir id_cita en reset
      peso_kg: '',
      talla_m: '',
      medida_cintura_cm: '',
      presion_sistolica: '',
      presion_diastolica: '',
      glucosa_mg_dl: '',
      colesterol_mg_dl: '',
      colesterol_ldl: '', // ✅ Colesterol LDL
      colesterol_hdl: '', // ✅ Colesterol HDL
      trigliceridos_mg_dl: '',
      hba1c_porcentaje: '', // ✅ HbA1c (%)
      edad_paciente_en_medicion: '', // ✅ Edad en medición
      observaciones: ''
    });
    setEditingSignosVitales(null);
  };

  // Función para actualizar campo del formulario
  const updateFormField = (field, value) => {
    setFormDataSignosVitales(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Función para guardar signos vitales con validaciones robustas
  const handleSaveSignosVitales = async () => {
    // ⚠️ RATE LIMITING
    const rateCheck = canExecute('saveSignosVitales', 1000);
    if (!rateCheck.allowed) {
      Alert.alert('Espere', 'Por favor espere antes de volver a intentar');
      return;
    }

    // ✅ VALIDACIÓN COMPLETA
    const validation = validateSignosVitales(formDataSignosVitales);
    
    if (!validation || !validation.isValid) {
      const errors = validation?.errors || {};
      const firstError = Object.values(errors)[0] || 'Error al validar los datos de signos vitales';
      Alert.alert('Validación', firstError);
      Logger.warn('Validación fallida en signos vitales', errors);
      return;
    }

    setSavingSignosVitales(true);
    try {
      Logger.info('Guardando signos vitales...');
      
      const gestionService = (await import('../../api/gestionService.js')).default;
      
      // Preparar datos para enviar (con validación numérica robusta)
      const dataToSend = {};
      if (formDataSignosVitales.peso_kg) {
        const peso = parseFloat(formDataSignosVitales.peso_kg);
        if (!isNaN(peso) && peso > 0 && peso <= 500) {
          dataToSend.peso_kg = peso;
        }
      }
      if (formDataSignosVitales.talla_m) {
        const talla = parseFloat(formDataSignosVitales.talla_m);
        if (!isNaN(talla) && talla > 0 && talla <= 3) {
          dataToSend.talla_m = talla;
        }
      }
      if (formDataSignosVitales.medida_cintura_cm) {
        const cintura = parseFloat(formDataSignosVitales.medida_cintura_cm);
        if (!isNaN(cintura) && cintura > 0 && cintura <= 200) {
          dataToSend.medida_cintura_cm = cintura;
        }
      }
      if (formDataSignosVitales.presion_sistolica && formDataSignosVitales.presion_diastolica) {
        const sist = parseInt(formDataSignosVitales.presion_sistolica);
        const dias = parseInt(formDataSignosVitales.presion_diastolica);
        if (!isNaN(sist) && sist >= 50 && sist <= 250 && 
            !isNaN(dias) && dias >= 30 && dias <= 150 && sist > dias) {
          dataToSend.presion_sistolica = sist;
          dataToSend.presion_diastolica = dias;
        }
      }
      if (formDataSignosVitales.glucosa_mg_dl) {
        const glucosa = parseFloat(formDataSignosVitales.glucosa_mg_dl);
        if (!isNaN(glucosa) && glucosa >= 30 && glucosa <= 600) {
          dataToSend.glucosa_mg_dl = glucosa;
        }
      }
      if (formDataSignosVitales.colesterol_mg_dl) {
        const col = parseFloat(formDataSignosVitales.colesterol_mg_dl);
        if (!isNaN(col) && col >= 0 && col <= 500) {
          dataToSend.colesterol_mg_dl = col;
        }
      }
      if (formDataSignosVitales.trigliceridos_mg_dl) {
        const trigs = parseFloat(formDataSignosVitales.trigliceridos_mg_dl);
        if (!isNaN(trigs) && trigs >= 0 && trigs <= 1000) {
          dataToSend.trigliceridos_mg_dl = trigs;
        }
      }
      // ✅ HbA1c (%) - Campo obligatorio para criterios de acreditación
      if (formDataSignosVitales.hba1c_porcentaje) {
        const hba1c = parseFloat(formDataSignosVitales.hba1c_porcentaje);
        if (!isNaN(hba1c) && hba1c >= 4.0 && hba1c <= 15.0) {
          dataToSend.hba1c_porcentaje = hba1c;
        }
      }
      // ✅ Edad en medición - Para validar rangos de HbA1c
      if (formDataSignosVitales.edad_paciente_en_medicion) {
        const edad = parseInt(formDataSignosVitales.edad_paciente_en_medicion, 10);
        if (!isNaN(edad) && edad >= 0 && edad <= 120) {
          dataToSend.edad_paciente_en_medicion = edad;
        }
      } else if (paciente?.fecha_nacimiento) {
        // Calcular automáticamente si no se proporciona
        const edadCalculada = calcularEdad(paciente.fecha_nacimiento);
        if (edadCalculada && !isNaN(parseInt(edadCalculada, 10))) {
          dataToSend.edad_paciente_en_medicion = parseInt(edadCalculada, 10);
        }
      }
      if (formDataSignosVitales.observaciones) {
        dataToSend.observaciones = formDataSignosVitales.observaciones.trim().substring(0, 500);
      }

      // ✅ FASE 2: Incluir id_cita si está seleccionado
      if (formDataSignosVitales.id_cita && formDataSignosVitales.id_cita !== '') {
        const citaId = parseInt(formDataSignosVitales.id_cita);
        if (!isNaN(citaId) && citaId > 0) {
          dataToSend.id_cita = citaId;
        }
      }

      // Verificar que hay al menos un campo válido
      if (Object.keys(dataToSend).length === 0) {
        Alert.alert('Validación', 'Debe completar al menos un campo con datos válidos');
        return;
      }

      const currentPacienteId = pacienteId || paciente?.id_paciente;
      if (!currentPacienteId) {
        Alert.alert('Error', 'ID de paciente no disponible');
        return;
      }
      
      // Si estamos editando, usar UPDATE; si no, usar CREATE
      if (editingSignosVitales && editingSignosVitales.id_signo) {
        await gestionService.updatePacienteSignosVitales(
          currentPacienteId,
          editingSignosVitales.id_signo,
          dataToSend
        );
        Logger.info('Signos vitales actualizados exitosamente');
        Alert.alert('Éxito', 'Signos vitales actualizados correctamente');
        setEditingSignosVitales(null);
      } else {
        await gestionService.createPacienteSignosVitales(currentPacienteId, dataToSend);
        Logger.info('Signos vitales guardados exitosamente');
        Alert.alert('Éxito', 'Signos vitales registrados correctamente');
      }
      
      // Cerrar modal y resetear formulario
      setShowAddSignosVitales(false);
      resetFormSignosVitales();
      
      // Refrescar datos médicos y card de monitoreo continuo
      await refreshMedicalData();
      setRefreshSignosTrigger(prev => prev + 1);
      
    } catch (error) {
      // ✅ MANEJO ESPECÍFICO DE ERRORES
      const currentPacienteId = pacienteId || paciente?.id_paciente;
      Logger.error('Error guardando signos vitales', {
        error: error.message,
        stack: error.stack,
        paciente: currentPacienteId,
        data: formDataSignosVitales
      });
      
      let errorMessage = 'No se pudieron guardar los signos vitales.';
      
      if (error.response) {
        const status = error.response.status;
        if (status === 400) {
          errorMessage = 'Datos inválidos. Verifique los valores ingresados.';
        } else if (status === 500) {
          errorMessage = 'Error del servidor. Por favor intente más tarde.';
        }
      } else if (error.request) {
        errorMessage = 'Sin conexión. Verifique su internet.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSavingSignosVitales(false);
    }
  };

  // Funciones para manejar diagnóstico
  const resetFormDiagnostico = () => {
    setFormDataDiagnostico({
      id_cita: '',
      descripcion: ''
    });
  };

  const updateDiagnosticoField = (field, value) => {
    setFormDataDiagnostico(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ✅ Refactorizado: Usar hook genérico useSaveHandler
  const { handleSave: handleSaveDiagnostico, saving: savingDiagnostico } = useSaveHandler({
    serviceMethod: (data) => {
      const currentPacienteId = pacienteId || paciente?.id_paciente;
      if (!currentPacienteId) {
        throw new Error('ID de paciente no disponible');
      }
      // Si estamos editando, usar UPDATE; si no, usar CREATE
      if (editingDiagnostico && editingDiagnostico.id_diagnostico) {
        return gestionService.updatePacienteDiagnostico(
          currentPacienteId,
          editingDiagnostico.id_diagnostico,
          data
        );
      } else {
        return gestionService.createPacienteDiagnostico(currentPacienteId, data);
      }
    },
    formData: formDataDiagnostico,
    resetForm: () => {
      resetFormDiagnostico();
      setEditingDiagnostico(null);
    },
    modalState: showAddDiagnostico,
    setModalState: setShowAddDiagnostico,
    refreshData: refreshMedicalData,
    onSuccess: () => {
      setEditingDiagnostico(null);
    },
    validationFn: () => {
      if (!formDataDiagnostico.id_cita) {
        Alert.alert('Validación', 'Por favor seleccione una cita');
        return false;
      }
      if (!formDataDiagnostico.descripcion || formDataDiagnostico.descripcion.trim().length === 0) {
        Alert.alert('Validación', 'Por favor ingrese la descripción del diagnóstico');
        return false;
      }
      if (formDataDiagnostico.descripcion.trim().length < 10) {
        Alert.alert('Validación', 'La descripción debe tener al menos 10 caracteres');
        return false;
      }
      return true;
    },
    prepareData: (formData) => ({
      id_cita: parseInt(formData.id_cita),
      descripcion: formData.descripcion.trim()
    }),
    actionName: 'saveDiagnostico',
    successMessage: 'Diagnóstico registrado correctamente',
    errorMessage: 'No se pudo guardar el diagnóstico. Intente nuevamente.',
    logContext: { pacienteId: pacienteId || paciente?.id_paciente }
  });

  // Funciones para manejar medicamentos
  const resetFormMedicamentos = () => {
    setFormDataMedicamentos({
      id_cita: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: '',
      observaciones: '',
      medicamentos: [] // Cada medicamento tendrá horarios: ['']
    });
  };

  const updateMedicamentoField = (field, value) => {
    setFormDataMedicamentos(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const agregarMedicamento = (medicamento) => {
    setFormDataMedicamentos(prev => ({
      ...prev,
      medicamentos: [...prev.medicamentos, {
        id_medicamento: medicamento.id_medicamento,
        nombre: medicamento.nombre_medicamento,
        dosis: '',
        frecuencia: '',
        horario: '', // Mantener para compatibilidad
        horarios: [''], // Nuevo: array de horarios
        via_administracion: '',
        observaciones: ''
      }]
    }));
  };

  const actualizarMedicamento = (index, field, value) => {
    setFormDataMedicamentos(prev => ({
      ...prev,
      medicamentos: prev.medicamentos.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const eliminarMedicamento = (index) => {
    setFormDataMedicamentos(prev => ({
      ...prev,
      medicamentos: prev.medicamentos.filter((_, i) => i !== index)
    }));
  };

  // ✅ Refactorizado: Usar hook genérico useSaveHandler
  const { handleSave: handleSaveMedicamentos, saving: savingMedicamentos } = useSaveHandler({
    serviceMethod: (data) => {
      const currentPacienteId = pacienteId || paciente?.id_paciente;
      if (!currentPacienteId) {
        throw new Error('ID de paciente no disponible');
      }
      // Si estamos editando, usar UPDATE; si no, usar CREATE
      if (editingMedicamento && (editingMedicamento.id_plan || editingMedicamento.id_plan_medicacion)) {
        return gestionService.updatePacientePlanMedicacion(
          currentPacienteId,
          editingMedicamento.id_plan || editingMedicamento.id_plan_medicacion,
          data
        );
      } else {
        return gestionService.createPacientePlanMedicacion(currentPacienteId, data);
      }
    },
    formData: formDataMedicamentos,
    resetForm: () => {
      resetFormMedicamentos();
      setEditingMedicamento(null);
    },
    modalState: showAddMedicamentos,
    setModalState: setShowAddMedicamentos,
    refreshData: refreshMedicalData,
    onSuccess: () => {
      setEditingMedicamento(null);
    },
    validationFn: () => {
      if (formDataMedicamentos.medicamentos.length === 0) {
        Alert.alert('Validación', 'Debe agregar al menos un medicamento');
        return false;
      }
      const medicamentosInvalidos = formDataMedicamentos.medicamentos.filter(
        med => !med.dosis || med.dosis.trim().length === 0
      );
      if (medicamentosInvalidos.length > 0) {
        Alert.alert('Validación', 'Todos los medicamentos deben tener una dosis');
        return false;
      }
      // Validar que cada medicamento tenga al menos un horario válido
      const medicamentosSinHorario = formDataMedicamentos.medicamentos.filter(med => {
        const horariosValidos = (med.horarios || [])
          .filter(h => h && h.trim() && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(h.trim()));
        return horariosValidos.length === 0 && !med.horario;
      });
      if (medicamentosSinHorario.length > 0) {
        Alert.alert('Validación', 'Todos los medicamentos deben tener al menos un horario válido (formato: HH:MM)');
        return false;
      }
      if (formDataMedicamentos.fecha_inicio && formDataMedicamentos.fecha_fin) {
        const fechaInicio = new Date(formDataMedicamentos.fecha_inicio);
        const fechaFin = new Date(formDataMedicamentos.fecha_fin);
        if (fechaFin < fechaInicio) {
          Alert.alert('Validación', 'La fecha de fin debe ser posterior a la fecha de inicio');
          return false;
        }
      }
      return true;
    },
    prepareData: (formData) => ({
      id_cita: formData.id_cita || null,
      fecha_inicio: formData.fecha_inicio || null,
      fecha_fin: formData.fecha_fin || null,
      observaciones: formData.observaciones?.trim() || null,
      medicamentos: formData.medicamentos.map(med => {
        // Procesar horarios: filtrar vacíos y validar formato
        const horariosValidos = (med.horarios || [])
          .filter(h => h && h.trim() && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(h.trim()));
        
        return {
          id_medicamento: med.id_medicamento,
          dosis: med.dosis.trim(),
          frecuencia: med.frecuencia || null,
          horario: horariosValidos[0] || med.horario || null, // Primer horario para compatibilidad
          horarios: horariosValidos.length > 0 ? horariosValidos : null, // Array de horarios
          via_administracion: med.via_administracion || null,
          observaciones: med.observaciones || null
        };
      })
    }),
    actionName: 'saveMedicamentos',
    successMessage: 'Plan de medicación registrado correctamente',
    errorMessage: 'No se pudo guardar el plan de medicación. Intente nuevamente.',
    logContext: { pacienteId: pacienteId || paciente?.id_paciente }
  });

  const cargarMedicamentos = async () => {
    setLoadingMedicamentos(true);
    try {
      Logger.info('Cargando catálogo de medicamentos...');
      const medicamentos = await gestionService.getMedicamentos();
      setMedicamentosDisponibles(medicamentos);
      Logger.info('Medicamentos cargados exitosamente', { 
        total: medicamentos.length 
      });
    } catch (error) {
      Logger.error('Error cargando medicamentos', {
        error: error.message,
        stack: error.stack
      });
      Alert.alert('Error', 'No se pudieron cargar los medicamentos. Intente nuevamente.');
      setMedicamentosDisponibles([]); // Asegurar que sea un array vacío
    } finally {
      setLoadingMedicamentos(false);
    }
  };

  // SOLUCIÓN: Mejorar manejo de estados de carga
  // Si no hay pacienteId, mostrar loading (esperando que esté disponible)
  if (!pacienteId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando información del paciente...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Estados de carga y error
  if (loading || medicalLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando datos del paciente...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || medicalError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error al cargar los datos del paciente</Text>
          <Text style={styles.errorDetails}>{error?.message || medicalError?.message}</Text>
          <Button mode="contained" onPress={handleRefresh} style={styles.retryButton}>
            Reintentar
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!paciente) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No se encontraron datos del paciente</Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={styles.backButton}>
            Volver
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header - Reemplazado con componente refactorizado */}
        <PatientHeader 
          paciente={paciente}
          calcularEdad={calcularEdad}
          obtenerDoctorAsignado={obtenerDoctorAsignado}
          formatearFecha={formatearFecha}
        />

        {/* Botones de Exportación y Chat */}
        <Card style={styles.exportCard}>
          <Card.Content>
            <Title style={styles.exportTitle}>📥 Exportar Datos</Title>
            
            {/* Botón principal: Expediente Completo */}
            <TouchableOpacity
              style={[styles.exportButton, styles.expedienteCompletoButton]}
              onPress={handleExportarExpedienteCompleto}
            >
              <Text style={[styles.exportButtonIcon, { color: '#FFFFFF' }]}>📄</Text>
              <Text style={[styles.exportButtonText, styles.expedienteCompletoText]}>
                Expediente Médico Completo
              </Text>
            </TouchableOpacity>
            {/* Botón de Chat (solo para doctores) */}
            {(userRole === 'Doctor' || userRole === 'doctor') && (
              <View style={styles.chatButtonContainer}>
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={handleChatPaciente}
                >
                  <Text style={styles.chatButtonIcon}>💬</Text>
                  <Text style={styles.chatButtonText}>Chat con Paciente</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Información General - Reemplazado con componente refactorizado */}
        <PatientGeneralInfo 
          paciente={paciente}
          formatearFecha={formatearFecha}
        />

        {/* Resumen Médico - Reemplazado con componente refactorizado */}
        <MedicalSummary resumen={resumen} />

        {/* Alertas de Signos Vitales */}
        {signosVitalesMostrar && signosVitalesMostrar.length > 0 && (() => {
          // Detectar alertas críticas en signos vitales recientes
          const alertas = [];
          signosVitalesMostrar.slice(0, 3).forEach(signo => {
            if (signo.presion_sistolica && (signo.presion_sistolica > 180 || signo.presion_sistolica < 90)) {
              alertas.push({
                severidad: 'critica',
                mensaje: `Presión arterial fuera de rango: ${signo.presion_sistolica}/${signo.presion_diastolica || '--'} mmHg`,
              });
            }
            if (signo.glucosa_mg_dl && (signo.glucosa_mg_dl > 200 || signo.glucosa_mg_dl < 70)) {
              alertas.push({
                severidad: 'critica',
                mensaje: `Glucosa fuera de rango: ${signo.glucosa_mg_dl} mg/dL`,
              });
            }
          });
          
          return alertas.length > 0 ? (
            <AlertBanner
              alertas={alertas}
              onDismiss={() => {}}
              onPress={() => {
                if (paciente) {
                  navigation.navigate('GraficosEvolucion', { paciente });
                }
              }}
            />
          ) : null;
        })()}

        {/* Historial de Consultas - Vista Unificada */}
        {/* Próxima o Última Cita */}
        <ProximaCitaCard
          pacienteId={pacienteId}
          onPressConsulta={handleOpenCitaDetalle}
          onEditConsulta={(cita) => {
            // Abrir opciones de citas y luego editar
            modalManager.open('optionsCitas');
            // TODO: Implementar edición directa si es necesario
          }}
          formatearFecha={formatearFecha}
          calcularIMC={calcularIMC}
          getEstadoCitaColor={getEstadoCitaColor}
          getEstadoCitaTexto={getEstadoCitaTexto}
          onOpenOptions={() => modalManager.open('optionsCitas')}
          refreshTrigger={refreshCitasTrigger}
        />

        {/* Monitoreo Continuo - Signos Vitales sin Cita */}
        <MonitoreoContinuoSection
          pacienteId={pacienteId}
          formatearFecha={formatearFecha}
          calcularIMC={calcularIMC}
          onEditSigno={handleEditSignosVitales}
          onDeleteSigno={handleDeleteSignosVitales}
          onOpenOptions={() => modalManager.open('optionsSignosVitales')}
          onShowDetalle={handleOpenMonitoreoDetalle}
          refreshTrigger={refreshSignosTrigger}
        />

        {/* Medicamentos */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>💊 Medicamentos ({totalMedicamentos || medicamentos?.length || 0})</Title>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => modalManager.open('optionsMedicamentos')}>
                  <Text style={styles.optionsText}>Opciones</Text>
                </TouchableOpacity>
                <IconButton
                  icon={() => renderAccordionIcon(accordionState.medicamentos)}
                  size={28}
                  onPress={() => toggleAccordion('medicamentos')}
                />
              </View>
            </View>
            {accordionState.medicamentos && (
              <>
                {medicamentos && medicamentos.length > 0 ? (
                  medicamentos.map((medicamento, medIndex) => (
                    <TouchableOpacity
                      key={`med-${medicamento.id_plan}-${medicamento.id_medicamento || medIndex}-${medIndex}`}
                      style={styles.listItem}
                      onPress={() => setMedicamentoSeleccionado(medicamento)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.listItemHeader}>
                        <Text style={styles.listItemTitle}>
                          {medicamento.nombre_medicamento || 'Sin nombre'}
                        </Text>
                        <Chip 
                          mode="outlined" 
                          style={[
                            styles.statusChip,
                            medicamento.estado === 'Activo' ? styles.statusActive : styles.statusInactive
                          ]}
                        >
                          {medicamento.estado}
                        </Chip>
                      </View>
                      <Text style={styles.listItemSubtitle}>
                        {medicamento.doctor_nombre || 'Sin doctor asignado'}
                      </Text>
                      <View style={styles.medicationGrid}>
                        {medicamento.dosis && (
                          <View style={styles.medicationItem}>
                            <Text style={styles.medicationLabel}>Dosis:</Text>
                            <Text style={styles.medicationValue}>{medicamento.dosis}</Text>
                          </View>
                        )}
                        {medicamento.frecuencia && (
                          <View style={styles.medicationItem}>
                            <Text style={styles.medicationLabel}>Frecuencia:</Text>
                            <Text style={styles.medicationValue}>{medicamento.frecuencia}</Text>
                          </View>
                        )}
                        {(medicamento.horarios && Array.isArray(medicamento.horarios) && medicamento.horarios.length > 0) ? (
                          <View style={styles.medicationItem}>
                            <Text style={styles.medicationLabel}>Horarios:</Text>
                            <Text style={styles.medicationValue}>
                              {medicamento.horarios.join(', ')}
                            </Text>
                          </View>
                        ) : medicamento.horario ? (
                          <View style={styles.medicationItem}>
                            <Text style={styles.medicationLabel}>Horario:</Text>
                            <Text style={styles.medicationValue}>{medicamento.horario}</Text>
                          </View>
                        ) : null}
                        {medicamento.via_administracion && (
                          <View style={styles.medicationItem}>
                            <Text style={styles.medicationLabel}>Vía:</Text>
                            <Text style={styles.medicationValue}>{medicamento.via_administracion}</Text>
                          </View>
                        )}
                      </View>
                      {medicamento.observaciones && (
                        <Text style={styles.listItemDescription}>
                          {medicamento.observaciones}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No hay medicamentos registrados</Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Red de Apoyo */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>👥 Red de Apoyo</Title>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => modalManager.open('optionsRedApoyo')}>
                  <Text style={styles.optionsText}>Opciones</Text>
                </TouchableOpacity>
                <IconButton
                  icon={() => renderAccordionIcon(accordionState.redApoyo)}
                  size={28}
                  onPress={() => toggleAccordion('redApoyo')}
                />
              </View>
            </View>
            {accordionState.redApoyo && (
              <>
                {loadingRedApoyo ? (
                  <ActivityIndicator size="large" color="#2196F3" style={{ padding: 20 }} />
                ) : redApoyo && redApoyo.length > 0 ? (
                  redApoyoMostrar.map((contacto, index) => (
                    <TouchableOpacity
                      key={`red-${contacto.id_red_apoyo}-${index}`}
                      style={styles.listItem}
                      onPress={() => setContactoRedApoyoSeleccionado(contacto)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.listItemTitle}>{contacto.nombre_contacto}</Text>
                      <Text style={styles.listItemSubtitle}>
                        Parentesco: {contacto.parentesco || 'No especificado'}
                      </Text>
                      {contacto.numero_celular && (
                        <Text style={styles.listItemDescription}>📞 {contacto.numero_celular}</Text>
                      )}
                      {contacto.email && (
                        <Text style={styles.listItemDescription}>📧 {contacto.email}</Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No hay contactos registrados</Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Esquema de Vacunación */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>💉 Esquema de Vacunación</Title>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => modalManager.open('optionsEsquemaVacunacion')}>
                  <Text style={styles.optionsText}>Opciones</Text>
                </TouchableOpacity>
                <IconButton
                  icon={() => renderAccordionIcon(accordionState.esquemaVacunacion)}
                  size={28}
                  onPress={() => toggleAccordion('esquemaVacunacion')}
                />
              </View>
            </View>
            {accordionState.esquemaVacunacion && (
              <>
                {loadingEsquemaVacunacion ? (
                  <ActivityIndicator size="large" color="#2196F3" style={{ padding: 20 }} />
                ) : esquemaVacunacion && esquemaVacunacion.length > 0 ? (
                  esquemaVacunacionMostrar.map((vacuna, index) => (
                    <TouchableOpacity
                      key={`vacuna-${vacuna.id_esquema}-${index}`}
                      style={styles.listItem}
                      onPress={() => setVacunaEsquemaSeleccionada(vacuna)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.listItemHeader}>
                        <Text style={styles.listItemTitle}>{vacuna.vacuna}</Text>
                        <Text style={styles.listItemSubtitle}>
                          {formatearFecha(vacuna.fecha_aplicacion)}
                        </Text>
                      </View>
                      {vacuna.lote && (
                        <Text style={styles.listItemDescription}>Lote: {vacuna.lote}</Text>
                      )}
                      {vacuna.observaciones && (
                        <Text style={styles.listItemNotes}>{vacuna.observaciones}</Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No hay vacunas registradas</Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Card: Complicaciones */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>🩺 Complicaciones</Title>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => setShowOptionsDetecciones(true)}>
                  <Text style={styles.optionsText}>Opciones</Text>
                </TouchableOpacity>
                <IconButton
                  icon={() => renderAccordionIcon(accordionState.complicaciones)}
                  size={28}
                  onPress={() => toggleAccordion('complicaciones')}
                />
              </View>
            </View>

            {accordionState.complicaciones && (
              <>
                {loadingDetecciones ? (
                  <ActivityIndicator size="large" color="#2196F3" style={{ padding: 20 }} />
                ) : detecciones && detecciones.length > 0 ? (
                  deteccionesMostrar.map((det, index) => (
                    <TouchableOpacity
                      key={`det-${det.id_deteccion || index}`}
                      style={styles.listItem}
                      onPress={() => setDeteccionComplicacionSeleccionada(det)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.listItemHeader}>
                        <Text style={styles.listItemTitle}>
                          {det.tipo_complicacion || det.Comorbilidad?.nombre_comorbilidad || 'Complicación'}
                        </Text>
                        <Text style={styles.listItemSubtitle}>
                          {formatearFecha(det.fecha_deteccion)}
                        </Text>
                      </View>
                      {det.Comorbilidad?.nombre_comorbilidad && (
                        <Text style={styles.listItemDescription}>
                          Comorbilidad: {det.Comorbilidad.nombre_comorbilidad}
                        </Text>
                      )}
                      {det.exploracion_pies || det.exploracion_fondo_ojo ? (
                        <Text style={styles.listItemNotes}>
                          {det.exploracion_pies ? '🦶 Exploración de pies' : ''}
                          {det.exploracion_pies && det.exploracion_fondo_ojo ? ' | ' : ''}
                          {det.exploracion_fondo_ojo ? '👁️ Fondo de ojo' : ''}
                        </Text>
                      ) : null}
                      {det.realiza_auto_monitoreo ? (
                        <Text style={styles.listItemNotes}>
                          📈 Auto-monitoreo: {[
                            det.auto_monitoreo_glucosa ? 'glucosa' : null,
                            det.auto_monitoreo_presion ? 'presión' : null
                          ].filter(Boolean).join(', ')}
                        </Text>
                      ) : null}
                      {det.observaciones ? (
                        <Text style={styles.listItemNotes}>{det.observaciones}</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No hay complicaciones registradas</Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Comorbilidades Crónicas */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>Comorbilidades Crónicas</Title>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => modalManager.open('optionsComorbilidades')}>
                  <Text style={styles.optionsText}>Opciones</Text>
                </TouchableOpacity>
                <IconButton
                  icon={() => renderAccordionIcon(accordionState.comorbilidades)}
                  size={28}
                  onPress={() => toggleAccordion('comorbilidades')}
                />
              </View>
            </View>
            {accordionState.comorbilidades && (
              <>
                {loadingComorbilidades ? (
                  <ActivityIndicator size="large" color="#2196F3" style={{ padding: 20 }} />
                ) : comorbilidadesPaciente && comorbilidadesPaciente.length > 0 ? (
                  comorbilidadesMostrar.map((comorbilidad, index) => (
                    <TouchableOpacity
                      key={`comorbilidad-${comorbilidad.id_comorbilidad}-${index}`}
                      style={styles.listItem}
                      onPress={() => setComorbilidadSeleccionada(comorbilidad)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.listItemTitle}>{comorbilidad.nombre || comorbilidad.nombre_comorbilidad}</Text>
                      {comorbilidad.fecha_deteccion && (
                        <Text style={styles.listItemSubtitle}>
                          Detectada: {formatearFecha(comorbilidad.fecha_deteccion)}
                        </Text>
                      )}
                      {comorbilidad.anos_padecimiento && (
                        <Text style={styles.listItemSubtitle}>
                          Años con padecimiento: {comorbilidad.anos_padecimiento}
                        </Text>
                      )}
                      {comorbilidad.observaciones && (
                        <Text style={styles.listItemDescription}>{comorbilidad.observaciones}</Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No hay comorbilidades registradas</Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* ✅ Sesiones Educativas */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>📚 Sesiones Educativas</Title>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => setShowAddSesionEducativa(true)}>
                  <Text style={styles.optionsText}>Agregar</Text>
                </TouchableOpacity>
                <IconButton
                  icon={() => renderAccordionIcon(accordionState.sesionesEducativas)}
                  size={28}
                  onPress={() => toggleAccordion('sesionesEducativas')}
                />
              </View>
            </View>
            {accordionState.sesionesEducativas && (
              <>
                {loadingSesionesEducativas ? (
                  <ActivityIndicator size="large" color="#2196F3" style={{ padding: 20 }} />
                ) : sesionesEducativas && sesionesEducativas.length > 0 ? (
                  sesionesEducativasMostrar.map((sesion, index) => (
                    <View key={`sesion-${sesion.id_sesion}-${index}`} style={styles.listItem}>
                      <View style={styles.listItemHeader}>
                        <Text style={styles.listItemTitle}>
                          {sesion.tipo_sesion === 'nutricional' ? '🍎' : 
                           sesion.tipo_sesion === 'actividad_fisica' ? '🏃' :
                           sesion.tipo_sesion === 'medico_preventiva' ? '🩺' :
                           sesion.tipo_sesion === 'trabajo_social' ? '👥' :
                           sesion.tipo_sesion === 'psicologica' ? '🧠' :
                           sesion.tipo_sesion === 'odontologica' ? '🦷' : '📚'} {sesion.tipo_sesion?.replace('_', ' ').toUpperCase() || 'Sesión'}
                        </Text>
                        <Text style={styles.listItemSubtitle}>
                          {formatearFecha(sesion.fecha_sesion)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Chip style={{ backgroundColor: sesion.asistio ? '#4CAF50' : '#F44336' }}>
                          {sesion.asistio ? '✅ Asistió' : '❌ No asistió'}
                        </Chip>
                        {sesion.numero_intervenciones > 1 && (
                          <Chip>{sesion.numero_intervenciones} intervenciones</Chip>
                        )}
                      </View>
                      {sesion.observaciones && (
                        <Text style={styles.listItemDescription}>{sesion.observaciones}</Text>
                      )}
                      {/* Botones de acción */}
                      {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador' ||
                        userRole === 'Doctor' || userRole === 'doctor') && (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <TouchableOpacity
                            style={{ flex: 1, backgroundColor: '#2196F3', padding: 8, borderRadius: 6, alignItems: 'center' }}
                            onPress={() => handleEditSesionEducativa(sesion)}
                          >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>✏️ Editar</Text>
                          </TouchableOpacity>
                          {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador') && (
                            <TouchableOpacity
                              style={{ flex: 1, backgroundColor: '#f44336', padding: 8, borderRadius: 6, alignItems: 'center' }}
                              onPress={() => handleDeleteSesionEducativa(sesion)}
                            >
                              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>🗑️ Eliminar</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No hay sesiones educativas registradas</Text>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* ✅ Salud Bucal (Instrucción ⑫) */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>🦷 Salud Bucal</Title>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => setShowOptionsSaludBucal(true)}>
                  <Text style={styles.optionsText}>Opciones</Text>
                </TouchableOpacity>
                <IconButton
                  icon={() => renderAccordionIcon(accordionState.saludBucal)}
                  size={28}
                  onPress={() => toggleAccordion('saludBucal')}
                />
              </View>
            </View>
            {accordionState.saludBucal && (
              <>
                {loadingSaludBucal ? (
                  <ActivityIndicator size="large" color="#2196F3" style={{ padding: 20 }} />
                ) : saludBucal && saludBucal.length > 0 ? (
                  saludBucal.slice(0, 3).map((registro, index) => (
                    <TouchableOpacity
                      key={`salud-bucal-${registro.id_salud_bucal}-${index}`}
                      style={styles.listItem}
                      onPress={() => setRegistroSaludBucalSeleccionado(registro)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.listItemHeader}>
                        <Text style={styles.listItemTitle}>
                          {formatearFecha(registro.fecha_registro)}
                        </Text>
                        <Chip
                          mode="outlined"
                          style={[
                            styles.statusChip,
                            registro.presenta_enfermedades_odontologicas ? styles.statusActive : styles.statusInactive
                          ]}
                        >
                          {registro.presenta_enfermedades_odontologicas ? 'Con enfermedades' : 'Sin enfermedades'}
                        </Chip>
                      </View>
                      {registro.recibio_tratamiento_odontologico && (
                        <Text style={styles.listItemSubtitle}>✅ Recibió tratamiento odontológico</Text>
                      )}
                      {registro.observaciones && (
                        <Text style={styles.listItemNotes}>{registro.observaciones}</Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No hay registros de salud bucal</Text>
                )}
                {saludBucal && saludBucal.length > 3 && (
                  <TouchableOpacity
                    style={{ marginTop: 12, padding: 12, backgroundColor: '#e3f2fd', borderRadius: 8, alignItems: 'center' }}
                    onPress={() => setShowAllSaludBucal(true)}
                  >
                    <Text style={{ color: '#1976d2', fontWeight: '600' }}>
                      Ver todos ({saludBucal.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* ✅ Detección de Tuberculosis (Instrucción ⑬) */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Title style={styles.cardTitle}>🦠 Detección de Tuberculosis</Title>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => setShowOptionsDeteccionesTuberculosis(true)}>
                  <Text style={styles.optionsText}>Opciones</Text>
                </TouchableOpacity>
                <IconButton
                  icon={() => renderAccordionIcon(accordionState.deteccionesTuberculosis)}
                  size={28}
                  onPress={() => toggleAccordion('deteccionesTuberculosis')}
                />
              </View>
            </View>
            {accordionState.deteccionesTuberculosis && (
              <>
                {loadingDeteccionesTuberculosis ? (
                  <ActivityIndicator size="large" color="#2196F3" style={{ padding: 20 }} />
                ) : deteccionesTuberculosis && deteccionesTuberculosis.length > 0 ? (
                  deteccionesTuberculosis.slice(0, 3).map((deteccion, index) => (
                    <TouchableOpacity
                      key={`tb-${deteccion.id_deteccion_tb}-${index}`}
                      style={styles.listItem}
                      onPress={() => setDeteccionTbSeleccionada(deteccion)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.listItemHeader}>
                        <Text style={styles.listItemTitle}>
                          {formatearFecha(deteccion.fecha_deteccion)}
                        </Text>
                        {deteccion.baciloscopia_resultado && (
                          <Chip
                            mode="outlined"
                            style={[
                              styles.statusChip,
                              deteccion.baciloscopia_resultado === 'positivo' ? styles.statusActive : styles.statusInactive
                            ]}
                          >
                            {deteccion.baciloscopia_resultado}
                          </Chip>
                        )}
                      </View>
                      {deteccion.aplicacion_encuesta && (
                        <Text style={styles.listItemSubtitle}>✅ Encuesta aplicada</Text>
                      )}
                      {deteccion.baciloscopia_realizada && (
                        <Text style={styles.listItemSubtitle}>
                          🔬 Baciloscopia: {deteccion.baciloscopia_resultado || 'Pendiente'}
                        </Text>
                      )}
                      {deteccion.ingreso_tratamiento && (
                        <Text style={styles.listItemSubtitle}>💊 Ingresó a tratamiento</Text>
                      )}
                      {deteccion.observaciones && (
                        <Text style={styles.listItemNotes}>{deteccion.observaciones}</Text>
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No hay detecciones de tuberculosis registradas</Text>
                )}
                {deteccionesTuberculosis && deteccionesTuberculosis.length > 3 && (
                  <TouchableOpacity
                    style={{ marginTop: 12, padding: 12, backgroundColor: '#e3f2fd', borderRadius: 8, alignItems: 'center' }}
                    onPress={() => setShowAllDeteccionesTuberculosis(true)}
                  >
                    <Text style={{ color: '#1976d2', fontWeight: '600' }}>
                      Ver todos ({deteccionesTuberculosis.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Botones de Acción */}
        <View style={styles.actionButtonsContainer}>
          <View style={styles.actionButtonsRow}>
            <Button
              mode="contained"
              onPress={handleEditPaciente}
              style={[styles.actionButton, styles.editButton]}
              buttonColor={COLORES.NAV_PRIMARIO}
              textColor="#FFFFFF"
            >
              Editar
            </Button>
            {/* Solo administradores pueden cambiar doctor */}
            {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador') && (
              <Button
                mode="contained"
                onPress={handleChangeDoctor}
                style={[styles.actionButton, styles.changeDoctorButton]}
                buttonColor={COLORES.ADVERTENCIA_LIGHT}
                textColor="#FFFFFF"
              >
                Cambiar Doctor
              </Button>
            )}
          </View>
          <View style={styles.actionButtonsRow}>
            {/* Solo administradores pueden desactivar/activar */}
            {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador') && (
              <Button
                mode="contained"
                onPress={handleToggleStatus}
                style={[styles.actionButton, styles.toggleButton]}
                buttonColor={paciente.activo ? COLORES.ERROR_LIGHT : COLORES.EXITO_LIGHT}
                textColor="#FFFFFF"
              >
                {paciente.activo ? 'Desactivar' : 'Activar'}
              </Button>
            )}
            {/* Solo administradores pueden eliminar */}
            {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador') && (
              <Button
                mode="contained"
                onPress={handleDeletePaciente}
                style={[styles.actionButton, styles.deleteButton]}
                buttonColor={COLORES.ERROR}
                textColor="#FFFFFF"
              >
                Eliminar
              </Button>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Modal para agregar signos vitales */}
      <Modal
        visible={showAddSignosVitales}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}} // Deshabilitado - Solo cierra con botón
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          // onPress={() => !savingSignosVitales && setShowAddSignosVitales(false)} // Deshabilitado
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>📊 Registrar Signos Vitales</Title>
              <View style={styles.modalHeaderButtons}>
                <TouchableOpacity
                  style={styles.fillDataButton}
                  onPress={() => {
                    const testData = generarDatosSignosVitales(formDataSignosVitales.id_cita || null);
                    setFormDataSignosVitales(prev => ({ ...prev, ...testData }));
                    Alert.alert(
                      'Datos de Prueba Cargados',
                      'El formulario ha sido llenado con datos aleatorios para testing.',
                      [{ text: 'OK' }]
                    );
                  }}
                  disabled={savingSignosVitales}
                >
                  <Text style={styles.fillDataButtonText}>🎲</Text>
                </TouchableOpacity>
              <TouchableOpacity
                onPress={() => !savingSignosVitales && (setShowAddSignosVitales(false), resetFormSignosVitales())}
                disabled={savingSignosVitales}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView 
              style={styles.modalFormScrollView} 
              contentContainerStyle={styles.modalFormScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {/* ✅ FASE 2: Selector de cita (opcional) */}
              <View style={styles.formSection}>
                <Text style={styles.label}>📅 Asociar a Cita (Opcional)</Text>
                {formDataSignosVitales.id_cita && formDataSignosVitales.id_cita !== '' ? (
                  <View style={{ backgroundColor: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                    <Text style={[styles.label, { fontSize: 12, color: '#1976d2', fontWeight: '600' }]}>
                      ✅ Cita ya asociada: {(() => {
                        const citaSeleccionada = citas?.find(c => String(c.id_cita) === formDataSignosVitales.id_cita);
                        return citaSeleccionada ? `${formatearFecha(citaSeleccionada.fecha_cita)} - ${citaSeleccionada.motivo || 'Sin motivo'}` : 'Cita seleccionada';
                      })()}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.label, { fontSize: 12, color: '#666', marginBottom: 8, fontWeight: 'normal' }]}>
                    Selecciona una cita para asociar estos signos vitales a una consulta específica
                  </Text>
                )}
                {citas && citas.length > 0 ? (
                  <ScrollView style={{ maxHeight: 200 }}>
                    <TouchableOpacity
                      style={[
                        styles.citaOption,
                        formDataSignosVitales.id_cita === '' && styles.citaOptionSelected
                      ]}
                      onPress={() => updateFormField('id_cita', '')}
                      disabled={savingSignosVitales}
                    >
                      <Text style={styles.citaOptionText}>
                        ⚪ Sin asociar a cita específica
                      </Text>
                    </TouchableOpacity>
                    {citas.map((cita, index) => (
                      <TouchableOpacity
                        key={`signo-cita-option-${cita.id_cita}-${index}`}
                        style={[
                          styles.citaOption,
                          formDataSignosVitales.id_cita === String(cita.id_cita) && styles.citaOptionSelected
                        ]}
                        onPress={() => updateFormField('id_cita', String(cita.id_cita))}
                        disabled={savingSignosVitales}
                      >
                        <Text style={styles.citaOptionText}>
                          📅 {formatearFecha(cita.fecha_cita)} - {cita.motivo || 'Sin motivo'}
                        </Text>
                        <Text style={styles.citaOptionDate}>
                          Dr. {cita.doctor_nombre || 'Sin doctor'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
                    <Text style={[styles.label, { fontSize: 13, color: '#666', fontWeight: 'normal' }]}>
                      No hay citas disponibles para este paciente
                    </Text>
                  </View>
                )}
              </View>

              {/* Antropométricos */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>📏 Antropométricos</Text>
                
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Peso (kg)</Text>
                    <TextInput
                      style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                      value={formDataSignosVitales.peso_kg}
                      onChangeText={(value) => updateFormField('peso_kg', value)}
                      placeholder="Ej: 75.5"
                      placeholderTextColor="#9E9E9E"
                      keyboardType="decimal-pad"
                      editable={!savingSignosVitales}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Talla (m)</Text>
                    <TextInput
                      style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                      value={formDataSignosVitales.talla_m}
                      onChangeText={(value) => updateFormField('talla_m', value)}
                      placeholder="Ej: 1.70"
                      placeholderTextColor="#9E9E9E"
                      keyboardType="decimal-pad"
                      editable={!savingSignosVitales}
                    />
                  </View>
                </View>
                
                {imcActual && (
                  <View style={styles.imcDisplay}>
                    <Text style={styles.imcLabel}>Índice de Masa Corporal (IMC):</Text>
                    <Text style={[styles.imcValue, getIMCColor(parseFloat(imcActual))]}>
                      {imcActual}
                    </Text>
                  </View>
                )}
                
                <View style={[styles.formRow, { justifyContent: 'flex-start' }]}>
                  <View style={[styles.formField, styles.formFieldSingle]}>
                    <Text style={styles.label}>Cintura (cm)</Text>
                    <TextInput
                      style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                      value={formDataSignosVitales.medida_cintura_cm}
                      onChangeText={(value) => updateFormField('medida_cintura_cm', value)}
                      placeholder="Ej: 85"
                      placeholderTextColor="#9E9E9E"
                      keyboardType="decimal-pad"
                      editable={!savingSignosVitales}
                    />
                  </View>
                </View>
              </View>

              {/* Presión Arterial */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>🩺 Presión Arterial</Text>
                
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Sistólica (mmHg)</Text>
                    <TextInput
                      style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                      value={formDataSignosVitales.presion_sistolica}
                      onChangeText={(value) => updateFormField('presion_sistolica', value)}
                      placeholder="Ej: 120"
                      placeholderTextColor="#9E9E9E"
                      keyboardType="number-pad"
                      editable={!savingSignosVitales}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Diastólica (mmHg)</Text>
                    <TextInput
                      style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                      value={formDataSignosVitales.presion_diastolica}
                      onChangeText={(value) => updateFormField('presion_diastolica', value)}
                      placeholder="Ej: 80"
                      placeholderTextColor="#9E9E9E"
                      keyboardType="number-pad"
                      editable={!savingSignosVitales}
                    />
                  </View>
                </View>
              </View>

              {/* Laboratorio */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>🧪 Exámenes de Laboratorio</Text>
                
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Glucosa (mg/dL)</Text>
                    <View style={styles.labelHintSpacer} />
                    <TextInput
                      style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                      value={formDataSignosVitales.glucosa_mg_dl}
                      onChangeText={(value) => updateFormField('glucosa_mg_dl', value)}
                      placeholder="Ej: 95"
                      placeholderTextColor="#9E9E9E"
                      keyboardType="decimal-pad"
                      editable={!savingSignosVitales}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Colesterol Total * (mg/dL)</Text>
                    <Text style={styles.labelHint}>Campo obligatorio para criterios de acreditación</Text>
                    <TextInput
                      style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                      value={formDataSignosVitales.colesterol_mg_dl}
                      onChangeText={(value) => updateFormField('colesterol_mg_dl', value)}
                      placeholder="Ej: 180"
                      placeholderTextColor="#9E9E9E"
                      keyboardType="decimal-pad"
                      editable={!savingSignosVitales}
                    />
                  </View>
                </View>

                {/* ✅ Perfil Lipídico - Solo para pacientes con diagnóstico de Hipercolesterolemia/Dislipidemia */}
                {tieneHipercolesterolemia() && (
                  <View style={styles.formSection}>
                    <Text style={styles.formSectionTitle}>📊 Perfil Lipídico</Text>
                    <Text style={styles.labelHint}>(Solo para pacientes con diagnóstico de Hipercolesterolemia/Dislipidemia)</Text>
                    <View style={styles.formRow}>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Colesterol LDL (mg/dL)</Text>
                        <TextInput
                          style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                          value={formDataSignosVitales.colesterol_ldl}
                          onChangeText={(value) => updateFormField('colesterol_ldl', value)}
                          placeholder="Ej: 100"
                          placeholderTextColor="#9E9E9E"
                          keyboardType="decimal-pad"
                          editable={!savingSignosVitales}
                        />
                      </View>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Colesterol HDL (mg/dL)</Text>
                        <TextInput
                          style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                          value={formDataSignosVitales.colesterol_hdl}
                          onChangeText={(value) => updateFormField('colesterol_hdl', value)}
                          placeholder="Ej: 40"
                          placeholderTextColor="#9E9E9E"
                          keyboardType="decimal-pad"
                          editable={!savingSignosVitales}
                        />
                      </View>
                    </View>
                  </View>
                )}
                
                {/* ✅ Triglicéridos - Solo para pacientes con diagnóstico de Hipertrigliceridemia */}
                {tieneHipertrigliceridemia() && (
                  <View style={styles.formRow}>
                    <View style={styles.formField}>
                      <Text style={styles.label}>Triglicéridos * (mg/dL)</Text>
                      <Text style={styles.labelHint}>(Solo para pacientes con diagnóstico de Hipertrigliceridemia)</Text>
                      <TextInput
                        style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                        value={formDataSignosVitales.trigliceridos_mg_dl}
                        onChangeText={(value) => updateFormField('trigliceridos_mg_dl', value)}
                        placeholder="Ej: 120"
                        placeholderTextColor="#9E9E9E"
                        keyboardType="decimal-pad"
                        editable={!savingSignosVitales}
                      />
                    </View>
                  </View>
                )}

                {/* ✅ HbA1c (%) - Campo obligatorio para criterios de acreditación */}
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>HbA1c (%) *</Text>
                    <Text style={styles.labelHint}>Campo obligatorio para criterios de acreditación</Text>
                    <TextInput
                      style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                      value={formDataSignosVitales.hba1c_porcentaje}
                      onChangeText={(value) => updateFormField('hba1c_porcentaje', value)}
                      placeholder="Ej: 6.5"
                      placeholderTextColor="#9E9E9E"
                      keyboardType="decimal-pad"
                      editable={!savingSignosVitales}
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Edad en Medición (años)</Text>
                    <Text style={styles.labelHint}>Para validar rangos de HbA1c</Text>
                    <TextInput
                      style={[styles.input, !savingSignosVitales && styles.inputEnabled]}
                      value={formDataSignosVitales.edad_paciente_en_medicion}
                      onChangeText={(value) => {
                        // Calcular automáticamente si no se proporciona
                        const edad = value || (paciente?.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) : '');
                        updateFormField('edad_paciente_en_medicion', edad);
                      }}
                      placeholder={paciente?.fecha_nacimiento ? `Ej: ${calcularEdad(paciente.fecha_nacimiento)}` : "Ej: 45"}
                      placeholderTextColor="#9E9E9E"
                      keyboardType="number-pad"
                      editable={!savingSignosVitales}
                    />
                  </View>
                </View>
                {formDataSignosVitales.hba1c_porcentaje && formDataSignosVitales.edad_paciente_en_medicion && (
                  <View style={{ backgroundColor: '#fff3cd', padding: 12, borderRadius: 8, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: '#856404' }}>
                      {(() => {
                        const edad = parseInt(formDataSignosVitales.edad_paciente_en_medicion, 10);
                        const hba1c = parseFloat(formDataSignosVitales.hba1c_porcentaje);
                        if (isNaN(edad) || isNaN(hba1c)) return '';
                        if (edad >= 20 && edad < 60) {
                          return hba1c > 7.0 
                            ? `⚠️ HbA1c por encima del objetivo para 20-59 años (objetivo: <7%)`
                            : `✅ HbA1c dentro del objetivo para 20-59 años (objetivo: <7%)`;
                        } else if (edad >= 60) {
                          return hba1c > 8.0
                            ? `⚠️ HbA1c por encima del objetivo para 60+ años (objetivo: <8%)`
                            : `✅ HbA1c dentro del objetivo para 60+ años (objetivo: <8%)`;
                        }
                        return '';
                      })()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Observaciones */}
              <View style={styles.formSection}>
                <Text style={styles.label}>Observaciones (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea, !savingSignosVitales && styles.inputEnabled]}
                  value={formDataSignosVitales.observaciones}
                  onChangeText={(value) => updateFormField('observaciones', value)}
                  placeholder="Notas adicionales..."
                  placeholderTextColor="#9E9E9E"
                  multiline
                  numberOfLines={4}
                  editable={!savingSignosVitales}
                />
              </View>

              {/* Botones de acción */}
              <View style={styles.modalFormActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowAddSignosVitales(false);
                    resetFormSignosVitales();
                  }}
                  disabled={savingSignosVitales}
                  style={styles.modalCancelButton}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveSignosVitales}
                  loading={savingSignosVitales}
                  disabled={savingSignosVitales}
                  style={styles.modalSaveButton}
                >
                  Guardar
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Modal para ver todos los signos vitales */}
      <HistoryModal
        visible={showAllSignosVitales}
        onClose={() => setShowAllSignosVitales(false)}
        title="Todos los Signos Vitales"
        items={allSignosVitales}
        loading={loadingAllSignos}
        emptyMessage="No hay signos vitales registrados"
        renderItem={(signo, index) => {
          const imcCalculado = signo.imc || calcularIMC(signo.peso_kg, signo.talla_m);
          const fechaMedicion = signo.fecha_medicion || signo.fecha_creacion;

          return (
            <View key={`all-${signo.id_signo}-${index}`} style={styles.modalListItem}>
              <View style={styles.modalListItemHeader}>
                <Text style={styles.modalListItemTitle}>
                  {formatearFecha(fechaMedicion)}
                </Text>
                <Text style={styles.modalListItemSubtitle}>
                  Registrado por: {signo.registrado_por === 'paciente' ? 'Paciente' : signo.registrado_por === 'doctor' ? 'Doctor' : signo.registrado_por || 'Sistema'}
                </Text>
              </View>
              
              {/* Antropométricos */}
              {(signo.peso_kg || signo.talla_m || imcCalculado) && (
                <View style={styles.vitalSection}>
                  <Text style={styles.vitalSectionTitle}>📏 Antropométricos</Text>
                  <View style={styles.vitalsGrid}>
                    {signo.peso_kg && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Peso:</Text>
                        <Text style={styles.vitalValue}>{signo.peso_kg} kg</Text>
                      </View>
                    )}
                    {signo.talla_m && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Talla:</Text>
                        <Text style={styles.vitalValue}>{signo.talla_m} m</Text>
                      </View>
                    )}
                    {imcCalculado && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>IMC:</Text>
                        <Text style={[styles.vitalValue, getIMCColor(parseFloat(imcCalculado))]}>
                          {imcCalculado}
                        </Text>
                      </View>
                    )}
                    {signo.medida_cintura_cm && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Cintura:</Text>
                        <Text style={styles.vitalValue}>{signo.medida_cintura_cm} cm</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Presión Arterial */}
              {(signo.presion_sistolica || signo.presion_diastolica) && (
                <View style={styles.vitalSection}>
                  <Text style={styles.vitalSectionTitle}>🩺 Presión Arterial</Text>
                  <View style={styles.vitalsGrid}>
                    <View style={styles.vitalItem}>
                      <Text style={styles.vitalLabel}>Presión:</Text>
                      <Text style={styles.vitalValue}>
                        {signo.presion_sistolica || '--'}/{signo.presion_diastolica || '--'} mmHg
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Químicos */}
              {(signo.glucosa_mg_dl || signo.colesterol_mg_dl || signo.colesterol_ldl || signo.colesterol_hdl || signo.trigliceridos_mg_dl) && (
                <View style={styles.vitalSection}>
                  <Text style={styles.vitalSectionTitle}>🧪 Exámenes de Laboratorio</Text>
                  <View style={styles.vitalsGrid}>
                    {signo.glucosa_mg_dl && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Glucosa:</Text>
                        <Text style={styles.vitalValue}>{signo.glucosa_mg_dl} mg/dL</Text>
                      </View>
                    )}
                    {signo.colesterol_mg_dl && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Colesterol Total:</Text>
                        <Text style={styles.vitalValue}>{signo.colesterol_mg_dl} mg/dL</Text>
                      </View>
                    )}
                    {signo.colesterol_ldl && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Colesterol LDL:</Text>
                        <Text style={styles.vitalValue}>{signo.colesterol_ldl} mg/dL</Text>
                      </View>
                    )}
                    {signo.colesterol_hdl && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Colesterol HDL:</Text>
                        <Text style={styles.vitalValue}>{signo.colesterol_hdl} mg/dL</Text>
                      </View>
                    )}
                    {signo.trigliceridos_mg_dl && (
                      <View style={styles.vitalItem}>
                        <Text style={styles.vitalLabel}>Triglicéridos:</Text>
                        <Text style={styles.vitalValue}>{signo.trigliceridos_mg_dl} mg/dL</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {signo.observaciones && (
                <Text style={styles.listItemNotes}>
                  {signo.observaciones}
                </Text>
              )}
              
              {/* Botones de acción */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#2196F3', padding: 8, borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setShowAllSignosVitales(false);
                    handleEditSignosVitales(signo);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>✏️ Editar</Text>
                </TouchableOpacity>
                {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador' ||
                  userRole === 'Doctor' || userRole === 'doctor') && (
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#f44336', padding: 8, borderRadius: 6, alignItems: 'center' }}
                    onPress={() => {
                      setShowAllSignosVitales(false);
                      handleDeleteSignosVitales(signo);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Modal Detalle Monitoreo Continuo (último registro) */}
      <ModalBase
        visible={showMonitoreoDetalle}
        title="📊 Detalle de monitoreo continuo"
        onClose={() => {
          setShowMonitoreoDetalle(false);
          setMonitoreoDetalle(null);
        }}
      >
        {monitoreoDetalle ? (
          <ScrollView style={{ maxHeight: 450 }} contentContainerStyle={{ paddingBottom: 12 }}>
            <View style={styles.vitalSection}>
              <Text style={styles.vitalSectionTitle}>📅 Fecha</Text>
              <Text style={styles.vitalValue}>
                {formatearFecha(monitoreoDetalle.fecha_medicion || monitoreoDetalle.fecha_creacion)}
              </Text>
              <Text style={styles.vitalLabel}>
                Registrado por: {monitoreoDetalle.registrado_por === 'paciente' ? 'Paciente' : monitoreoDetalle.registrado_por === 'doctor' ? 'Doctor' : (monitoreoDetalle.registrado_por || 'Sistema')}
              </Text>
            </View>

            {(monitoreoDetalle.peso_kg || monitoreoDetalle.talla_m || monitoreoDetalle.medida_cintura_cm || calcularIMC(monitoreoDetalle.peso_kg, monitoreoDetalle.talla_m)) && (
              <View style={styles.vitalSection}>
                <Text style={styles.vitalSectionTitle}>📏 Antropométricos</Text>
                {monitoreoDetalle.peso_kg && (
                  <Text style={styles.vitalValue}>Peso: {monitoreoDetalle.peso_kg} kg</Text>
                )}
                {monitoreoDetalle.talla_m && (
                  <Text style={styles.vitalValue}>Talla: {monitoreoDetalle.talla_m} m</Text>
                )}
                {monitoreoDetalle.medida_cintura_cm && (
                  <Text style={styles.vitalValue}>Cintura: {monitoreoDetalle.medida_cintura_cm} cm</Text>
                )}
                {calcularIMC(monitoreoDetalle.peso_kg, monitoreoDetalle.talla_m) && (
                  <Text style={styles.vitalValue}>
                    IMC: {calcularIMC(monitoreoDetalle.peso_kg, monitoreoDetalle.talla_m)}
                  </Text>
                )}
              </View>
            )}

            {(monitoreoDetalle.presion_sistolica || monitoreoDetalle.presion_diastolica) && (
              <View style={styles.vitalSection}>
                <Text style={styles.vitalSectionTitle}>🩺 Presión arterial</Text>
                <Text style={styles.vitalValue}>
                  {monitoreoDetalle.presion_sistolica || '--'}/{monitoreoDetalle.presion_diastolica || '--'} mmHg
                </Text>
              </View>
            )}

            {(monitoreoDetalle.glucosa_mg_dl || monitoreoDetalle.colesterol_mg_dl || monitoreoDetalle.trigliceridos_mg_dl) && (
              <View style={styles.vitalSection}>
                <Text style={styles.vitalSectionTitle}>🧪 Exámenes</Text>
                {monitoreoDetalle.glucosa_mg_dl && (
                  <Text style={styles.vitalValue}>Glucosa: {monitoreoDetalle.glucosa_mg_dl} mg/dL</Text>
                )}
                {monitoreoDetalle.colesterol_mg_dl && (
                  <Text style={styles.vitalValue}>Colesterol Total: {monitoreoDetalle.colesterol_mg_dl} mg/dL</Text>
                )}
                {monitoreoDetalle.colesterol_ldl && (
                  <Text style={styles.vitalValue}>Colesterol LDL: {monitoreoDetalle.colesterol_ldl} mg/dL</Text>
                )}
                {monitoreoDetalle.colesterol_hdl && (
                  <Text style={styles.vitalValue}>Colesterol HDL: {monitoreoDetalle.colesterol_hdl} mg/dL</Text>
                )}
                {monitoreoDetalle.trigliceridos_mg_dl && (
                  <Text style={styles.vitalValue}>Triglicéridos: {monitoreoDetalle.trigliceridos_mg_dl} mg/dL</Text>
                )}
              </View>
            )}

            {monitoreoDetalle.observaciones && (
              <View style={styles.vitalSection}>
                <Text style={styles.vitalSectionTitle}>Observaciones</Text>
                <Text style={styles.vitalValue}>{monitoreoDetalle.observaciones}</Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <Text style={styles.noDataText}>No hay datos de monitoreo disponible</Text>
        )}
      </ModalBase>


      {/* Modal de Detalle de Cita */}
      <Modal
        visible={modalManager.isOpen('detalleCita')}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseDetalleCita}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>Detalle de Cita</Title>
              <TouchableOpacity onPress={handleCloseDetalleCita}>
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            {loadingCitaDetalle ? (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#6200ee" />
                <Text style={{ marginTop: 10, color: '#666' }}>Cargando detalle...</Text>
              </View>
            ) : citaDetalle ? (
              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={true}
              >
                {/* Información General de la Cita */}
                <View style={styles.modalListItem}>
                  <View style={styles.modalListItemHeader}>
                    <Text style={styles.modalListItemTitle}>
                      {formatearFecha(citaDetalle.fecha_cita)}
                    </Text>
                    <Chip 
                      mode="outlined" 
                      style={[
                        styles.statusChip,
                        { backgroundColor: getEstadoCitaColor(citaDetalle.estado) }
                      ]}
                      textStyle={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}
                    >
                      {getEstadoCitaTexto(citaDetalle.estado)}
                    </Chip>
                  </View>
                  
                  {citaDetalle.Doctor && (
                    <Text style={styles.modalListItemSubtitle}>
                      Dr. {citaDetalle.Doctor.nombre} {citaDetalle.Doctor.apellido_paterno || ''}
                    </Text>
                  )}
                  
                  {citaDetalle.motivo && (
                    <Text style={styles.modalListItemDescription}>
                      <Text style={{ fontWeight: '600' }}>Motivo:</Text> {citaDetalle.motivo}
                    </Text>
                  )}
                  
                  {citaDetalle.observaciones && (
                    <Text style={styles.modalListItemDescription}>
                      <Text style={{ fontWeight: '600' }}>Observaciones:</Text> {citaDetalle.observaciones}
                    </Text>
                  )}
                  
                  {citaDetalle.es_primera_consulta && (
                    <Chip 
                      mode="flat" 
                      style={styles.firstConsultChip}
                      textStyle={styles.firstConsultChipText}
                    >
                      Primera Consulta
                    </Chip>
                  )}

                  {/* ✅ Botones de acción para completar la cita */}
                  <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0', gap: 10 }}>
                    {/* Botón principal: Wizard (Nuevo - Recomendado) */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#4CAF50',
                        padding: 14,
                        borderRadius: 8,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8
                      }}
                      onPress={() => handleOpenWizard(citaDetalle.id_cita)}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                        Completar Cita (Wizard)
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 11, color: '#666', textAlign: 'center', marginBottom: 8 }}>
                      Recomendado: Flujo guiado paso a paso con guardado progresivo
                    </Text>

                    {/* Botón secundario: Solo agregar signos vitales */}
                    <TouchableOpacity
                      style={{
                        backgroundColor: '#e3f2fd',
                        padding: 10,
                        borderRadius: 8,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 8,
                        borderWidth: 1,
                        borderColor: '#90caf9'
                      }}
                      onPress={() => handleOpenSignosVitalesFromCita(citaDetalle.id_cita)}
                    >
                      <Text style={{ color: '#1976d2', fontWeight: '600', fontSize: 14 }}>
                        Solo Agregar Signos Vitales
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Signos Vitales en esta cita */}
                <View style={{ paddingHorizontal: 8, paddingTop: 16 }}>
                  <Title style={styles.sectionTitle}>Signos Vitales en esta cita</Title>
                  {Array.isArray(citaDetalle.SignosVitales) && citaDetalle.SignosVitales.length > 0 ? (
                    citaDetalle.SignosVitales.map((signo, idx) => {
                      const fechaMedicion = signo.fecha_medicion || signo.fecha_creacion;
                      // Usar la función calcularIMC memoizada global
                      const imcCalculado = signo.imc || calcularIMC(signo.peso_kg, signo.talla_m);

                      return (
                        <View key={`signo-detalle-${signo.id_signo || idx}`} style={styles.modalListItem}>
                          <Text style={styles.modalListItemSubtitle}>
                            📅 {formatearFecha(fechaMedicion)}
                          </Text>
                          
                          {(signo.peso_kg || signo.talla_m || imcCalculado || signo.medida_cintura_cm) && (
                            <View style={{ marginTop: 8 }}>
                              <Text style={[styles.modalListItemDescription, { fontWeight: '600', marginBottom: 4 }]}>📏 Antropométricos</Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {signo.peso_kg && (
                                  <Text style={styles.modalListItemDescription}>Peso: {signo.peso_kg} kg</Text>
                                )}
                                {signo.talla_m && (
                                  <Text style={styles.modalListItemDescription}>Talla: {signo.talla_m} m</Text>
                                )}
                                {imcCalculado && (
                                  <Text style={styles.modalListItemDescription}>IMC: {imcCalculado}</Text>
                                )}
                                {signo.medida_cintura_cm && (
                                  <Text style={styles.modalListItemDescription}>Cintura: {signo.medida_cintura_cm} cm</Text>
                                )}
                              </View>
                            </View>
                          )}
                          
                          {(signo.presion_sistolica || signo.presion_diastolica) && (
                            <View style={{ marginTop: 8 }}>
                              <Text style={[styles.modalListItemDescription, { fontWeight: '600' }]}>
                                Presión: {signo.presion_sistolica}/{signo.presion_diastolica} mmHg
                              </Text>
                            </View>
                          )}
                          
                          {(signo.glucosa_mg_dl || signo.colesterol_mg_dl || signo.trigliceridos_mg_dl) && (
                            <View style={{ marginTop: 8 }}>
                              <Text style={[styles.modalListItemDescription, { fontWeight: '600', marginBottom: 4 }]}>🧪 Exámenes de Laboratorio</Text>
                              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {signo.glucosa_mg_dl && (
                                  <Text style={styles.modalListItemDescription}>
                                    🩸 Glucosa: {signo.glucosa_mg_dl} mg/dL
                                  </Text>
                                )}
                                {signo.colesterol_mg_dl && (
                                  <Text style={styles.modalListItemDescription}>
                                    🧪 Colesterol Total: {signo.colesterol_mg_dl} mg/dL
                                    {signo.colesterol_ldl && `\n🧪 Colesterol LDL: ${signo.colesterol_ldl} mg/dL`}
                                    {signo.colesterol_hdl && `\n🧪 Colesterol HDL: ${signo.colesterol_hdl} mg/dL`}
                                  </Text>
                                )}
                                {signo.trigliceridos_mg_dl && (
                                  <Text style={styles.modalListItemDescription}>
                                    🧪 Triglicéridos: {signo.trigliceridos_mg_dl} mg/dL
                                  </Text>
                                )}
                              </View>
                            </View>
                          )}
                          
                          {signo.observaciones && (
                            <Text style={styles.modalListItemDescription}>
                              {signo.observaciones}
                            </Text>
                          )}
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noDataText}>No hay signos vitales registrados en esta cita</Text>
                  )}
                </View>

                {/* Diagnósticos de la cita */}
                <View style={{ paddingHorizontal: 8, paddingTop: 16 }}>
                  <Title style={styles.sectionTitle}>Diagnóstico(s) de la cita</Title>
                  {Array.isArray(citaDetalle.Diagnosticos) && citaDetalle.Diagnosticos.length > 0 ? (
                    citaDetalle.Diagnosticos.map((dx, idx) => (
                      <View key={`diag-detalle-${dx.id_diagnostico || idx}`} style={styles.modalListItem}>
                        <Text style={styles.modalListItemSubtitle}>
                          📅 {dx.fecha_registro ? formatearFecha(dx.fecha_registro) : 'Fecha no disponible'}
                        </Text>
                        <Text style={styles.modalListItemDescription}>
                          {dx.descripcion || 'Sin descripción'}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noDataText}>No hay diagnóstico registrado en esta cita</Text>
                  )}
                </View>

                {/* Botones de acción para la cita */}
                <View style={{ paddingHorizontal: 8, paddingTop: 24, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#e0e0e0', marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    <TouchableOpacity
                      style={{ flex: 1, minWidth: '45%', backgroundColor: '#2196F3', padding: 12, borderRadius: 8, alignItems: 'center' }}
                      onPress={() => {
                        handleCloseDetalleCita();
                        handleEditCita(citaDetalle);
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>✏️ Editar Cita</Text>
                    </TouchableOpacity>
                    {citaDetalle.estado !== 'cancelada' && citaDetalle.estado !== 'atendida' && (
                      <TouchableOpacity
                        style={{ flex: 1, minWidth: '45%', backgroundColor: '#FF9800', padding: 12, borderRadius: 8, alignItems: 'center' }}
                        onPress={() => {
                          handleCloseDetalleCita();
                          handleCancelarCita(citaDetalle);
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>❌ Cancelar</Text>
                      </TouchableOpacity>
                    )}
                {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador' ||
                  userRole === 'Doctor' || userRole === 'doctor') && (
                  <TouchableOpacity
                    style={{ flex: 1, minWidth: '45%', backgroundColor: '#f44336', padding: 12, borderRadius: 8, alignItems: 'center' }}
                    onPress={() => {
                      handleCloseDetalleCita();
                      handleDeleteCita(citaDetalle);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                )}
                  </View>
                </View>
              </ScrollView>
            ) : (
              <View style={{ padding: 16 }}>
                <Text style={styles.noDataText}>No se encontró el detalle de la cita</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Opciones - Citas */}
      <OptionsModal
        visible={modalManager.isOpen('optionsCitas')}
        onClose={() => modalManager.close('optionsCitas')}
        title="Opciones de Citas"
        options={[
          {
            label: '📅 Agendar Cita (Simple)',
            onPress: () => {
              modalManager.close('optionsCitas');
              setShowAddCita(true);
            },
            color: '#2196F3'
          },
          {
            label: 'Registrar Consulta Completa',
            onPress: () => {
              modalManager.close('optionsCitas');
              handleOpenConsultaCompletaNueva();
            },
            color: '#1976d2',
            style: { backgroundColor: '#e3f2fd' },
            textStyle: { fontWeight: '600' }
          },
          {
            label: 'Ver Historial Completo',
            onPress: () => {
              modalManager.close('optionsCitas');
              handleShowAllCitas();
            },
            color: '#666'
          }
        ]}
      />

      {/* Modal de Historial Completo de Consultas */}
      <HistorialConsultasModal
        visible={showAllCitas}
        onClose={() => {
          setShowAllCitas(false);
          modalManager.close('showAllCitas');
        }}
        pacienteId={pacienteId}
        onPressConsulta={handleOpenCitaDetalle}
        onEditConsulta={(cita) => {
          setShowAllCitas(false);
          modalManager.close('showAllCitas');
          modalManager.open('optionsCitas');
          // TODO: Implementar edición directa si es necesario
        }}
        formatearFecha={formatearFecha}
        calcularIMC={calcularIMC}
        getEstadoCitaColor={getEstadoCitaColor}
        getEstadoCitaTexto={getEstadoCitaTexto}
        refreshTrigger={refreshCitasTrigger}
      />

      {/* Modal para agregar nueva cita */}
      <Modal
        visible={showAddCita}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}} // Deshabilitado - Solo cierra con botón
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          // onPress={() => !savingCita && setShowAddCita(false)} // Deshabilitado
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>📅 Agregar Nueva Cita</Title>
              <View style={styles.modalHeaderButtons}>
                <TouchableOpacity
                  style={styles.fillDataButton}
                  onPress={() => {
                    const testData = generarDatosCita(
                      formDataCita.id_doctor || (doctoresList && doctoresList.length > 0 ? doctoresList[0].id_doctor : null),
                      paciente?.id_paciente || null
                    );
                    setFormDataCita(prev => ({ ...prev, ...testData }));
                    Alert.alert(
                      'Datos de Prueba Cargados',
                      'El formulario ha sido llenado con datos aleatorios para testing.',
                      [{ text: 'OK' }]
                    );
                  }}
                  disabled={savingCita}
                >
                  <Text style={styles.fillDataButtonText}>🎲</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => !savingCita && (setShowAddCita(false), resetFormCita())}
                  disabled={savingCita}
                >
                  <Text style={styles.closeButtonX}>X</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView 
              style={styles.modalFormScrollView} 
              contentContainerStyle={styles.modalFormScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {/* Selección de Doctor - Dropdown (solo doctores del mismo módulo del paciente) */}
              <View style={styles.formSection}>
                <Text style={styles.label}>Doctor (Opcional)</Text>
                {/* Nota informativa del módulo */}
                {paciente?.id_modulo && (
                  <Text style={styles.hintText}>
                    Mostrando doctores del módulo del paciente
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.doctorDropdownSelector}
                  onPress={() => setShowDoctorDropdownCita(!showDoctorDropdownCita)}
                  disabled={savingCita}
                >
                  <Text style={[
                    styles.doctorDropdownText,
                    !formDataCita.id_doctor && styles.doctorDropdownPlaceholder
                  ]}>
                    {formDataCita.id_doctor 
                      ? (() => {
                          const doc = doctoresList?.find(d => d.id_doctor === formDataCita.id_doctor || d.id_doctor === Number(formDataCita.id_doctor));
                          if (!doc) return 'Doctor seleccionado';
                          const nombreCompleto = `${doc.nombre} ${doc.apellido_paterno || ''} ${doc.apellido_materno || ''}`.trim();
                          const modulo = doc.Modulo?.nombre_modulo || doc.modulo || '';
                          return modulo ? `${nombreCompleto} - ${modulo}` : nombreCompleto;
                        })()
                      : 'Sin asignar (seleccionar doctor)'}
                  </Text>
                  <Text style={styles.dropdownArrow}>
                    {showDoctorDropdownCita ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                {showDoctorDropdownCita && (
                  <View style={styles.doctorDropdownList}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                      <TouchableOpacity
                        style={[
                          styles.doctorDropdownItem,
                          formDataCita.id_doctor === '' && styles.doctorDropdownItemSelected
                        ]}
                        onPress={() => {
                          updateFormFieldCita('id_doctor', '');
                          setShowDoctorDropdownCita(false);
                        }}
                      >
                        <Text style={[
                          styles.doctorDropdownItemText,
                          formDataCita.id_doctor === '' && styles.doctorDropdownItemTextSelected
                        ]}>
                          Sin asignar
                        </Text>
                      </TouchableOpacity>
                      {/* Filtrar doctores por el mismo módulo del paciente */}
                      {doctoresList && doctoresList
                        .filter(doctor => {
                          // Si el paciente no tiene módulo asignado, mostrar todos los doctores
                          if (!paciente?.id_modulo) return true;
                          // Filtrar por el mismo módulo del paciente
                          return doctor.id_modulo === paciente.id_modulo;
                        })
                        .map((doctor) => {
                          const isSelected = formDataCita.id_doctor === doctor.id_doctor || 
                                             Number(formDataCita.id_doctor) === doctor.id_doctor;
                          const nombreCompleto = `${doctor.nombre} ${doctor.apellido_paterno || ''} ${doctor.apellido_materno || ''}`.trim();
                          const modulo = doctor.Modulo?.nombre_modulo || doctor.modulo || '';
                          return (
                            <TouchableOpacity
                              key={doctor.id_doctor}
                              style={[
                                styles.doctorDropdownItem,
                                isSelected && styles.doctorDropdownItemSelected
                              ]}
                              onPress={() => {
                                updateFormFieldCita('id_doctor', doctor.id_doctor);
                                setShowDoctorDropdownCita(false);
                              }}
                            >
                              <Text style={[
                                styles.doctorDropdownItemText,
                                isSelected && styles.doctorDropdownItemTextSelected
                              ]}>
                                {modulo ? `${nombreCompleto} - ${modulo}` : nombreCompleto}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      {/* Mensaje si no hay doctores en el módulo */}
                      {paciente?.id_modulo && doctoresList && 
                        doctoresList.filter(d => d.id_modulo === paciente.id_modulo).length === 0 && (
                        <View style={styles.doctorDropdownItem}>
                          <Text style={styles.noDataText}>
                            No hay doctores asignados a este módulo
                          </Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Fecha de la Cita */}
              <View style={styles.formSection}>
                <Text style={styles.label}>📅 Fecha y Hora de la Cita *</Text>
                <DateTimePickerButton
                  value={formDataCita.fecha_cita}
                  onDateChange={(dateTime) => updateFormFieldCita('fecha_cita', dateTime)}
                  label=""
                  disabled={savingCita}
                  minimumDate={new Date()}
                  error={null}
                />
                <Text style={styles.hintText}>
                  Selecciona la fecha y hora para la cita médica
                </Text>
              </View>

              {/* Motivo */}
              <View style={styles.formSection}>
                <Text style={styles.label}>🩺 Motivo de la Cita *</Text>
                <TextInput
                  style={styles.input}
                  value={formDataCita.motivo}
                  onChangeText={(value) => updateFormFieldCita('motivo', value)}
                  placeholder="Ej: Control de glucosa, Revisión general..."
                  multiline
                  numberOfLines={2}
                  editable={!savingCita}
                />
              </View>

              {/* Primera Consulta */}
              <View style={styles.formSection}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => updateFormFieldCita('es_primera_consulta', !formDataCita.es_primera_consulta)}
                  disabled={savingCita}
                >
                  <View style={[
                    styles.checkbox,
                    formDataCita.es_primera_consulta && styles.checkboxChecked
                  ]}>
                    {formDataCita.es_primera_consulta && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Primera consulta médica</Text>
                </TouchableOpacity>
              </View>

              {/* Observaciones */}
              <View style={styles.formSection}>
                <Text style={styles.label}>Observaciones</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formDataCita.observaciones}
                  onChangeText={(value) => updateFormFieldCita('observaciones', value)}
                  placeholder="Notas adicionales sobre la cita..."
                  multiline
                  numberOfLines={4}
                  editable={!savingCita}
                />
              </View>

              {/* Botones */}
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => !savingCita && (setShowAddCita(false), resetFormCita())}
                  disabled={savingCita}
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveCita}
                  loading={savingCita}
                  disabled={savingCita}
                  style={[styles.modalButton, styles.saveButton]}
                  buttonColor={COLORES.NAV_PRIMARIO}
                >
                  Guardar Cita
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Opciones - Signos Vitales */}
      <OptionsModal
        visible={modalManager.isOpen('optionsSignosVitales')}
        onClose={() => modalManager.close('optionsSignosVitales')}
        title="Opciones de Signos Vitales"
        options={[
          {
            icon: '💓',
            label: 'Registrar Signos Vitales',
            onPress: () => {
              modalManager.close('optionsSignosVitales');
              setShowAddSignosVitales(true);
            },
            color: '#2196F3'
          },
          {
            icon: '📈',
            label: 'Ver Gráficos de Evolución',
            onPress: () => {
              modalManager.close('optionsSignosVitales');
              if (paciente) {
                navigation.navigate('GraficosEvolucion', { paciente });
              }
            },
            color: '#4CAF50'
          },
          {
            icon: '📋',
            label: 'Ver Historial Completo',
            onPress: () => handleShowAllSignosVitales(),
            color: '#666'
          }
        ]}
      />

      {/* Modal de Opciones - Diagnósticos */}
      <OptionsModal
        visible={modalManager.isOpen('optionsDiagnosticos')}
        onClose={() => modalManager.close('optionsDiagnosticos')}
        title="Opciones de Diagnósticos"
        options={[
          {
            icon: 'plus',
            label: 'Agregar Nuevo Diagnóstico',
            onPress: () => {
              modalManager.close('optionsDiagnosticos');
              setShowAddDiagnostico(true);
            },
            color: '#2196F3'
          },
          {
            icon: 'magnify',
            label: 'Ver Historial Completo',
            onPress: () => setShowAllDiagnosticos(true),
            color: '#666'
          }
        ]}
      />

      {/* Modal de Opciones - Medicamentos */}
      <OptionsModal
        visible={modalManager.isOpen('optionsMedicamentos')}
        onClose={() => modalManager.close('optionsMedicamentos')}
        title="Opciones de Medicamentos"
        options={[
          {
            icon: 'plus',
            label: 'Agregar Nuevo Medicamento',
            onPress: async () => {
              await cargarMedicamentos();
              setShowAddMedicamentos(true);
            },
            color: '#2196F3'
          },
          {
            icon: 'magnify',
            label: 'Ver Historial Completo',
            onPress: () => setShowAllMedicamentos(true),
            color: '#666'
          }
        ]}
      />

      {/* Modal para agregar diagnóstico */}
      <Modal
        visible={showAddDiagnostico}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}} // Deshabilitado - Solo cierra con botón
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          // onPress={() => !savingDiagnostico && setShowAddDiagnostico(false)} // Deshabilitado
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>🩺 Registrar Diagnóstico</Title>
              <View style={styles.modalHeaderButtons}>
                <TouchableOpacity
                  style={styles.fillDataButton}
                  onPress={() => {
                    const testData = generarDatosDiagnostico(formDataDiagnostico.id_cita || null);
                    setFormDataDiagnostico(prev => ({ ...prev, ...testData }));
                    Alert.alert(
                      'Datos de Prueba Cargados',
                      'El formulario ha sido llenado con datos aleatorios para testing.',
                      [{ text: 'OK' }]
                    );
                  }}
                  disabled={savingDiagnostico}
                >
                  <Text style={styles.fillDataButtonText}>🎲</Text>
                </TouchableOpacity>
              <TouchableOpacity
                onPress={() => !savingDiagnostico && (setShowAddDiagnostico(false), resetFormDiagnostico())}
                disabled={savingDiagnostico}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView style={styles.modalFormScrollView} keyboardShouldPersistTaps="handled">
              {/* Selector de cita */}
              <View style={styles.formSection}>
                <Text style={styles.label}>📅 Cita Asociada *</Text>
                {citas && citas.length > 0 ? (
                  <ScrollView style={{ maxHeight: 200 }}>
                    {citas.map((cita, index) => (
                      <TouchableOpacity
                        key={`cita-option-${cita.id_cita}-${index}`}
                        style={[
                          styles.citaOption,
                          formDataDiagnostico.id_cita === String(cita.id_cita) && styles.citaOptionSelected
                        ]}
                        onPress={() => updateDiagnosticoField('id_cita', String(cita.id_cita))}
                        disabled={savingDiagnostico}
                      >
                        <Text style={styles.citaOptionText}>
                          📅 {formatearFecha(cita.fecha_cita)} - {cita.motivo || 'Sin motivo'}
                        </Text>
                        <Text style={styles.citaOptionDate}>
                          Dr. {cita.doctor_nombre || 'Sin doctor'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.noDataText}>No hay citas disponibles</Text>
                )}
              </View>

              {/* Descripción del diagnóstico */}
              <View style={styles.formSection}>
                <Text style={styles.label}>Descripción del Diagnóstico *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formDataDiagnostico.descripcion}
                  onChangeText={(value) => updateDiagnosticoField('descripcion', value)}
                  placeholder="Ej: Hipertensión arterial leve, requiere seguimiento médico..."
                  multiline
                  numberOfLines={8}
                  editable={!savingDiagnostico}
                />
                <Text style={styles.helperText}>
                  Mínimo 10 caracteres
                </Text>
              </View>

              {/* Botones de acción */}
              <View style={styles.modalFormActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowAddDiagnostico(false);
                    resetFormDiagnostico();
                  }}
                  disabled={savingDiagnostico}
                  style={styles.modalCancelButton}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveDiagnostico}
                  loading={savingDiagnostico}
                  disabled={savingDiagnostico}
                  style={styles.modalSaveButton}
                >
                  Guardar
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* ✅ Modal para Consulta Completa (Formulario Unificado) */}
      <Modal
        visible={showConsultaCompleta || modalManager.isOpen('consultaCompleta')}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !savingConsultaCompleta && (setShowConsultaCompleta(false), modalManager.close('consultaCompleta'), resetFormConsultaCompleta())}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>
                {modoConsulta === 'completar_existente' ? 'Completar Consulta' : 'Registrar Consulta Completa'}
              </Title>
              <TouchableOpacity
                onPress={() => !savingConsultaCompleta && (setShowConsultaCompleta(false), modalManager.close('consultaCompleta'), resetFormConsultaCompleta())}
                disabled={savingConsultaCompleta}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalFormScrollView} 
              contentContainerStyle={styles.modalFormScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {/* Modo indicador */}
              {modoConsulta === 'completar_existente' && citaSeleccionadaCompleta && (
                <View style={{ backgroundColor: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#1976d2', fontWeight: '600', fontSize: 14 }}>
                    ✅ Completando cita del {formatearFecha(citaSeleccionadaCompleta.fecha_cita)}
                  </Text>
                  {citaSeleccionadaCompleta.motivo && (
                    <Text style={{ color: '#1976d2', fontSize: 12, marginTop: 4 }}>
                      Motivo: {citaSeleccionadaCompleta.motivo}
                    </Text>
                  )}
                </View>
              )}

              {/* Sección: Información de Cita */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>
                  📅 Información de la Cita {modoConsulta === 'crear_nueva' ? '(Requerido)' : '(Solo lectura)'}
                </Text>
                
                {modoConsulta === 'completar_existente' ? (
                  // Modo solo lectura para completar existente
                  <View style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 }}>
                    <Text style={styles.label}>Doctor: {citaSeleccionadaCompleta?.doctor_nombre || 'Sin doctor'}</Text>
                    <Text style={styles.label}>Fecha: {formatearFecha(formDataConsultaCompleta.cita.fecha_cita)}</Text>
                    {formDataConsultaCompleta.cita.motivo && (
                      <Text style={styles.label}>Motivo: {formDataConsultaCompleta.cita.motivo}</Text>
                    )}
                  </View>
                ) : (
                  // Modo edición para crear nueva
                  <>
                    <Text style={styles.label}>Doctor (Requerido)</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.doctoresList}
                    >
                      <TouchableOpacity
                        style={[
                          styles.doctorChip,
                          formDataConsultaCompleta.cita.id_doctor === '' && styles.doctorChipActive
                        ]}
                        onPress={() => updateFormFieldConsultaCompleta('cita', 'id_doctor', '')}
                      >
                        <Text style={[
                          styles.doctorChipText,
                          formDataConsultaCompleta.cita.id_doctor === '' && styles.doctorChipTextActive
                        ]}>
                          Sin asignar
                        </Text>
                      </TouchableOpacity>
                      {doctoresList && doctoresList.map((doctor) => (
                        <TouchableOpacity
                          key={doctor.id_doctor}
                          style={[
                            styles.doctorChip,
                            formDataConsultaCompleta.cita.id_doctor === String(doctor.id_doctor) && styles.doctorChipActive
                          ]}
                          onPress={() => updateFormFieldConsultaCompleta('cita', 'id_doctor', String(doctor.id_doctor))}
                        >
                          <Text style={[
                            styles.doctorChipText,
                            formDataConsultaCompleta.cita.id_doctor === String(doctor.id_doctor) && styles.doctorChipTextActive
                          ]}>
                            {doctor.nombre} {doctor.apellido_paterno || ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <DateTimePickerButton
                      label="📅 Fecha y Hora de la Cita (Requerido)"
                      value={formDataConsultaCompleta.cita.fecha_cita}
                      onDateChange={(dateTime) => updateFormFieldConsultaCompleta('cita', 'fecha_cita', dateTime)}
                      disabled={savingConsultaCompleta}
                      minimumDate={modoConsulta === 'completar_existente' ? undefined : new Date()}
                    />

                    <Text style={styles.label}>Motivo de la Consulta (Opcional)</Text>
                    <TextInput
                      style={styles.input}
                      value={formDataConsultaCompleta.cita.motivo}
                      onChangeText={(value) => updateFormFieldConsultaCompleta('cita', 'motivo', value)}
                      placeholder="Ej: Control rutinario, Revisión general..."
                      editable={!savingConsultaCompleta}
                    />
                  </>
                )}

                <Text style={styles.label}>Observaciones de la Cita (Opcional)</Text>
                <TextInput
                  style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={formDataConsultaCompleta.cita.observaciones}
                  onChangeText={(value) => updateFormFieldConsultaCompleta('cita', 'observaciones', value)}
                  placeholder="Notas adicionales sobre la consulta..."
                  multiline
                  numberOfLines={3}
                  editable={!savingConsultaCompleta}
                />

                {modoConsulta === 'crear_nueva' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                      onPress={() => updateFormFieldConsultaCompleta('cita', 'es_primera_consulta', !formDataConsultaCompleta.cita.es_primera_consulta)}
                      disabled={savingConsultaCompleta}
                    >
                      <View style={{
                        width: 24,
                        height: 24,
                        borderWidth: 2,
                        borderColor: '#2196F3',
                        borderRadius: 4,
                        marginRight: 8,
                        backgroundColor: formDataConsultaCompleta.cita.es_primera_consulta ? '#2196F3' : 'transparent',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {formDataConsultaCompleta.cita.es_primera_consulta && (
                          <Text style={{ color: '#fff', fontWeight: 'bold' }}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.label}>Es primera consulta</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Sección: Signos Vitales (Colapsable) */}
              <View style={styles.formSection}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: seccionesExpandidas.signosVitales ? 12 : 0 }}
                  onPress={() => toggleSeccion('signosVitales')}
                  disabled={savingConsultaCompleta}
                >
                  <Text style={styles.formSectionTitle}>Signos Vitales (Opcional)</Text>
                  <Text style={{ fontSize: 20 }}>{seccionesExpandidas.signosVitales ? '▼' : '▶'}</Text>
                </TouchableOpacity>

                {seccionesExpandidas.signosVitales && (
                  <>
                    <View style={styles.formRow}>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Peso (kg)</Text>
                        <TextInput
                          style={styles.input}
                          value={formDataConsultaCompleta.signos_vitales.peso_kg}
                          onChangeText={(value) => updateFormFieldConsultaCompleta('signos_vitales', 'peso_kg', value)}
                          placeholder="Ej: 75.5"
                          keyboardType="decimal-pad"
                          editable={!savingConsultaCompleta}
                        />
                      </View>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Talla (m)</Text>
                        <TextInput
                          style={styles.input}
                          value={formDataConsultaCompleta.signos_vitales.talla_m}
                          onChangeText={(value) => updateFormFieldConsultaCompleta('signos_vitales', 'talla_m', value)}
                          placeholder="Ej: 1.70"
                          keyboardType="decimal-pad"
                          editable={!savingConsultaCompleta}
                        />
                      </View>
                    </View>

                    {formDataConsultaCompleta.signos_vitales.peso_kg && formDataConsultaCompleta.signos_vitales.talla_m && (
                      <View style={{ marginTop: 8, padding: 8, backgroundColor: '#e3f2fd', borderRadius: 6 }}>
                        <Text style={{ fontSize: 12, color: '#1976d2' }}>
                          IMC calculado: {calcularIMC(formDataConsultaCompleta.signos_vitales.peso_kg, formDataConsultaCompleta.signos_vitales.talla_m) || 'N/A'}
                        </Text>
                      </View>
                    )}

                    <View style={styles.formRow}>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Presión Sistólica</Text>
                        <TextInput
                          style={styles.input}
                          value={formDataConsultaCompleta.signos_vitales.presion_sistolica}
                          onChangeText={(value) => updateFormFieldConsultaCompleta('signos_vitales', 'presion_sistolica', value)}
                          placeholder="Ej: 120"
                          keyboardType="number-pad"
                          editable={!savingConsultaCompleta}
                        />
                      </View>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Presión Diastólica</Text>
                        <TextInput
                          style={styles.input}
                          value={formDataConsultaCompleta.signos_vitales.presion_diastolica}
                          onChangeText={(value) => updateFormFieldConsultaCompleta('signos_vitales', 'presion_diastolica', value)}
                          placeholder="Ej: 80"
                          keyboardType="number-pad"
                          editable={!savingConsultaCompleta}
                        />
                      </View>
                    </View>

                    <View style={styles.formRow}>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Glucosa (mg/dL)</Text>
                        <TextInput
                          style={styles.input}
                          value={formDataConsultaCompleta.signos_vitales.glucosa_mg_dl}
                          onChangeText={(value) => updateFormFieldConsultaCompleta('signos_vitales', 'glucosa_mg_dl', value)}
                          placeholder="Ej: 95"
                          keyboardType="decimal-pad"
                          editable={!savingConsultaCompleta}
                        />
                      </View>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Cintura (cm)</Text>
                        <TextInput
                          style={styles.input}
                          value={formDataConsultaCompleta.signos_vitales.medida_cintura_cm}
                          onChangeText={(value) => updateFormFieldConsultaCompleta('signos_vitales', 'medida_cintura_cm', value)}
                          placeholder="Ej: 85"
                          keyboardType="decimal-pad"
                          editable={!savingConsultaCompleta}
                        />
                      </View>
                    </View>

                    <View style={styles.formRow}>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Colesterol (mg/dL)</Text>
                        <TextInput
                          style={styles.input}
                          value={formDataConsultaCompleta.signos_vitales.colesterol_mg_dl}
                          onChangeText={(value) => updateFormFieldConsultaCompleta('signos_vitales', 'colesterol_mg_dl', value)}
                          placeholder="Ej: 180"
                          keyboardType="decimal-pad"
                          editable={!savingConsultaCompleta}
                        />
                      </View>
                      <View style={styles.formField}>
                        <Text style={styles.label}>Triglicéridos (mg/dL)</Text>
                        <TextInput
                          style={styles.input}
                          value={formDataConsultaCompleta.signos_vitales.trigliceridos_mg_dl}
                          onChangeText={(value) => updateFormFieldConsultaCompleta('signos_vitales', 'trigliceridos_mg_dl', value)}
                          placeholder="Ej: 120"
                          keyboardType="decimal-pad"
                          editable={!savingConsultaCompleta}
                        />
                      </View>
                    </View>

                    <Text style={styles.label}>Observaciones de Signos Vitales (Opcional)</Text>
                    <TextInput
                      style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                      value={formDataConsultaCompleta.signos_vitales.observaciones}
                      onChangeText={(value) => updateFormFieldConsultaCompleta('signos_vitales', 'observaciones', value)}
                      placeholder="Notas adicionales sobre los signos vitales..."
                      multiline
                      numberOfLines={3}
                      editable={!savingConsultaCompleta}
                    />
                  </>
                )}
              </View>

              {/* Sección: Diagnóstico (Colapsable) */}
              <View style={styles.formSection}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: seccionesExpandidas.diagnostico ? 12 : 0 }}
                  onPress={() => toggleSeccion('diagnostico')}
                  disabled={savingConsultaCompleta}
                >
                  <Text style={styles.formSectionTitle}>Diagnóstico (Opcional)</Text>
                  <Text style={{ fontSize: 20 }}>{seccionesExpandidas.diagnostico ? '▼' : '▶'}</Text>
                </TouchableOpacity>

                {seccionesExpandidas.diagnostico && (
                  <TextInput
                    style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                    value={formDataConsultaCompleta.diagnostico.descripcion}
                    onChangeText={(value) => updateFormFieldConsultaCompleta('diagnostico', 'descripcion', value)}
                    placeholder="Descripción del diagnóstico..."
                    multiline
                    numberOfLines={4}
                    editable={!savingConsultaCompleta}
                  />
                )}
              </View>

              {/* Sección: Plan de Medicación (Colapsable) - Simplificado por ahora */}
              <View style={styles.formSection}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: seccionesExpandidas.planMedicacion ? 12 : 0 }}
                  onPress={() => toggleSeccion('planMedicacion')}
                  disabled={savingConsultaCompleta}
                >
                  <Text style={styles.formSectionTitle}>💊 Plan de Medicación (Opcional)</Text>
                  <Text style={{ fontSize: 20 }}>{seccionesExpandidas.planMedicacion ? '▼' : '▶'}</Text>
                </TouchableOpacity>

                {seccionesExpandidas.planMedicacion && (
                  <View style={{ backgroundColor: '#fff3cd', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 12, color: '#856404' }}>
                      💡 El plan de medicación completo se puede agregar después desde la sección dedicada.
                      Este formulario permite crear la consulta básica con signos vitales y diagnóstico.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Botones de acción */}
            <View style={styles.modalFormActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowConsultaCompleta(false);
                  modalManager.close('consultaCompleta');
                  resetFormConsultaCompleta();
                }}
                disabled={savingConsultaCompleta}
                style={styles.modalCancelButton}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveConsultaCompleta}
                loading={savingConsultaCompleta}
                disabled={savingConsultaCompleta}
                style={[styles.modalSaveButton, { backgroundColor: '#1976d2' }]}
              >
                {modoConsulta === 'completar_existente' ? 'Completar Consulta' : 'Guardar Consulta'}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* ✅ Modal Wizard para Completar Cita */}
      <CompletarCitaWizard
        visible={showWizard}
        onClose={() => {
          setShowWizard(false);
          setCitaSeleccionadaWizard(null);
        }}
        cita={citaSeleccionadaWizard}
        onSuccess={handleWizardSuccess}
      />

      {/* Modal para agregar plan de medicación */}
      <Modal
        visible={showAddMedicamentos}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}} // Deshabilitado - Solo cierra con botón
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          // onPress={() => !savingMedicamentos && setShowAddMedicamentos(false)} // Deshabilitado
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>💊 Registrar Plan de Medicación</Title>
              <TouchableOpacity
                onPress={() => !savingMedicamentos && (setShowAddMedicamentos(false), resetFormMedicamentos())}
                disabled={savingMedicamentos}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalFormScrollView} keyboardShouldPersistTaps="handled">
              {/* Información general del plan */}
              <View style={styles.formSection}>
                <Text style={styles.label}>Información del Plan</Text>
                
                <View style={[styles.formRow, { alignItems: 'flex-start' }]}>
                  <View style={[styles.formField, { minHeight: 88 }]}>
                    <DatePickerButton
                      label="Fecha Inicio"
                      value={formDataMedicamentos.fecha_inicio}
                      onChangeText={(value) => updateMedicamentoField('fecha_inicio', value)}
                      editable={!savingMedicamentos}
                      hideIcons
                    />
                  </View>
                  <View style={[styles.formField, { minHeight: 88 }]}>
                    <DatePickerButton
                      label="Fecha Fin (opcional)"
                      value={formDataMedicamentos.fecha_fin}
                      onChangeText={(value) => updateMedicamentoField('fecha_fin', value)}
                      editable={!savingMedicamentos}
                      hideIcons
                    />
                  </View>
                </View>

                <Text style={styles.label}>Observaciones del Plan (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formDataMedicamentos.observaciones}
                  onChangeText={(value) => updateMedicamentoField('observaciones', value)}
                  placeholder="Notas adicionales sobre el plan de medicación..."
                  multiline
                  numberOfLines={3}
                  editable={!savingMedicamentos}
                />
              </View>

              {/* Agregar medicamentos */}
              <View style={styles.formSection}>
                <Text style={styles.label}>💊 Medicamentos</Text>
                {loadingMedicamentos ? (
                  <ActivityIndicator size="small" color="#2196F3" />
                ) : (
                  <ScrollView style={{ maxHeight: 150 }}>
                    {medicamentosDisponibles.map((med, index) => (
                      <TouchableOpacity
                        key={`med-disponible-${med.id_medicamento}-${index}`}
                        style={styles.citaOption}
                        onPress={() => agregarMedicamento(med)}
                        disabled={savingMedicamentos || formDataMedicamentos.medicamentos.some(m => m.id_medicamento === med.id_medicamento)}
                      >
                        <Text style={styles.citaOptionText}>{med.nombre_medicamento}</Text>
                        {med.descripcion && (
                          <Text style={styles.citaOptionDate}>{med.descripcion}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Lista de medicamentos agregados */}
              {formDataMedicamentos.medicamentos.length > 0 && (
                <View style={styles.formSection}>
                  <Text style={styles.label}>Medicamentos Agregados ({formDataMedicamentos.medicamentos.length})</Text>
                  {formDataMedicamentos.medicamentos.map((med, index) => (
                    <View key={`med-agregado-${index}`} style={styles.medicamentoCard}>
                      <View style={styles.medicamentoHeader}>
                        <Text style={styles.medicamentoTitle}>{med.nombre}</Text>
                        <TouchableOpacity
                          onPress={() => !savingMedicamentos && eliminarMedicamento(index)}
                          disabled={savingMedicamentos}
                          style={{ padding: 8, opacity: savingMedicamentos ? 0.5 : 1 }}
                        >
                          <Text style={{ fontSize: 18, color: '#ff5252' }}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <TextInput
                        style={styles.input}
                        value={med.dosis}
                        onChangeText={(value) => actualizarMedicamento(index, 'dosis', value)}
                        placeholder="Dosis * (Ej: 500mg)"
                        editable={!savingMedicamentos}
                      />
                      
                      <View style={[styles.formRow, { alignItems: 'flex-start' }]}>
                        <View style={[styles.formField, { minHeight: 60 }]}>
                          <Text style={[styles.label, { marginBottom: 6 }]}>Frecuencia</Text>
                          <TextInput
                            style={styles.input}
                            value={med.frecuencia}
                            onChangeText={(value) => actualizarMedicamento(index, 'frecuencia', value)}
                            placeholder="Ej: Cada 8h"
                            editable={!savingMedicamentos}
                          />
                        </View>
                        <View style={[styles.formField, { flex: 1, minHeight: 60 }]}>
                          <Text style={[styles.label, { marginBottom: 6 }]}>⏰ Horarios (puedes agregar múltiples)</Text>
                          {med.horarios && med.horarios.map((horario, horarioIndex) => (
                            <View key={horarioIndex} style={{ flexDirection: 'row', marginBottom: 8, alignItems: 'center' }}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <TimePickerButton
                                  value={horario}
                                  onChangeText={(value) => {
                                    const nuevosHorarios = [...(med.horarios || [])];
                                    nuevosHorarios[horarioIndex] = value;
                                    actualizarMedicamento(index, 'horarios', nuevosHorarios);
                                  }}
                                  placeholder="Seleccionar hora"
                                  editable={!savingMedicamentos}
                                />
                              </View>
                              {horarioIndex > 0 && (
                                <TouchableOpacity
                                  onPress={() => {
                                    const nuevosHorarios = med.horarios.filter((_, i) => i !== horarioIndex);
                                    actualizarMedicamento(index, 'horarios', nuevosHorarios);
                                  }}
                                  style={{ padding: 8 }}
                                >
                                  <Text style={{ color: '#F44336', fontSize: 18 }}>✕</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                          <TouchableOpacity
                            onPress={() => {
                              const nuevosHorarios = [...(med.horarios || ['']), ''];
                              actualizarMedicamento(index, 'horarios', nuevosHorarios);
                            }}
                            style={{ 
                              backgroundColor: '#E3F2FD', 
                              padding: 10, 
                              borderRadius: 8, 
                              alignItems: 'center',
                              marginTop: 4
                            }}
                          >
                            <Text style={{ color: '#2196F3', fontWeight: '600' }}>+ Agregar otro horario</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      
                      <TextInput
                        style={styles.input}
                        value={med.via_administracion}
                        onChangeText={(value) => actualizarMedicamento(index, 'via_administracion', value)}
                        placeholder="Vía de administración (Ej: Oral)"
                        editable={!savingMedicamentos}
                      />
                      
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={med.observaciones}
                        onChangeText={(value) => actualizarMedicamento(index, 'observaciones', value)}
                        placeholder="Observaciones (opcional)"
                        multiline
                        numberOfLines={2}
                        editable={!savingMedicamentos}
                      />
                    </View>
                  ))}
                </View>
              )}

              {/* Botones de acción */}
              <View style={styles.modalFormActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowAddMedicamentos(false);
                    resetFormMedicamentos();
                  }}
                  disabled={savingMedicamentos}
                  style={styles.modalCancelButton}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveMedicamentos}
                  loading={savingMedicamentos}
                  disabled={savingMedicamentos}
                  style={styles.modalSaveButton}
                >
                  Guardar Plan
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Modales de Red de Apoyo y Esquema de Vacunación - Próximamente */}
      <Modal
        visible={showOptionsRedApoyo}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowOptionsRedApoyo(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsRedApoyo(false)}
        >
          <View style={styles.optionsModalContent}>
            <Text style={styles.optionsModalTitle}>Opciones de Red de Apoyo</Text>
            
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => {
                setShowOptionsRedApoyo(false);
                setShowAddRedApoyo(true);
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 8 }}>➕</Text>
              <Text style={styles.optionText}>Agregar Contacto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => {
                setShowOptionsRedApoyo(false);
                setShowAllRedApoyo(true);
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 8 }}>📋</Text>
              <Text style={styles.optionText}>Ver Historial Completo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showOptionsEsquemaVacunacion}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowOptionsEsquemaVacunacion(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsEsquemaVacunacion(false)}
        >
          <View style={styles.optionsModalContent}>
            <Text style={styles.optionsModalTitle}>Opciones de Vacunación</Text>
            
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => {
                setShowOptionsEsquemaVacunacion(false);
                setShowAddEsquemaVacunacion(true);
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 8 }}>💉</Text>
              <Text style={styles.optionText}>Agregar Vacuna</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => {
                setShowOptionsEsquemaVacunacion(false);
                setShowAllEsquemaVacunacion(true);
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 8 }}>📋</Text>
              <Text style={styles.optionText}>Ver Historial Completo</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal para agregar Red de Apoyo */}
      <Modal
        visible={showAddRedApoyo}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}} // Deshabilitado - Solo cierra con botón
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          // onPress={() => !savingRedApoyo && setShowAddRedApoyo(false)} // Deshabilitado
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>👥 Agregar Contacto</Title>
              <TouchableOpacity
                onPress={() => !savingRedApoyo && (setShowAddRedApoyo(false), resetFormRedApoyo())}
                disabled={savingRedApoyo}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalFormScrollView} 
              contentContainerStyle={styles.modalFormScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.inputContainer}>
              <TextInput
                  style={styles.inputRedApoyo}
                placeholder="Nombre del contacto *"
                value={formDataRedApoyo.nombre_contacto}
                onChangeText={(value) => updateRedApoyoField('nombre_contacto', value)}
                editable={!savingRedApoyo}
              />
              </View>
              
              <View style={styles.inputContainer}>
              <TextInput
                  style={styles.inputRedApoyo}
                placeholder="Teléfono"
                value={formDataRedApoyo.numero_celular}
                onChangeText={(value) => updateRedApoyoField('numero_celular', value)}
                keyboardType="phone-pad"
                editable={!savingRedApoyo}
              />
              </View>
              
              <View style={styles.inputContainer}>
              <TextInput
                  style={styles.inputRedApoyo}
                placeholder="Email"
                value={formDataRedApoyo.email}
                onChangeText={(value) => updateRedApoyoField('email', value)}
                keyboardType="email-address"
                editable={!savingRedApoyo}
              />
              </View>
              
              <View style={styles.inputContainer}>
              <TextInput
                  style={styles.inputRedApoyo}
                placeholder="Dirección"
                value={formDataRedApoyo.direccion}
                onChangeText={(value) => updateRedApoyoField('direccion', value)}
                editable={!savingRedApoyo}
              />
              </View>
              
              <View style={styles.inputContainer}>
              <TextInput
                  style={styles.inputRedApoyo}
                placeholder="Localidad"
                value={formDataRedApoyo.localidad}
                onChangeText={(value) => updateRedApoyoField('localidad', value)}
                editable={!savingRedApoyo}
              />
              </View>
              
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={styles.inputRedApoyo}
                  onPress={() => !savingRedApoyo && setShowParentescoModal(!showParentescoModal)}
                  disabled={savingRedApoyo}
                >
                  <Text style={[
                    styles.inputText,
                    !formDataRedApoyo.parentesco && styles.placeholderText
                  ]}>
                    {formDataRedApoyo.parentesco || 'Parentesco'}
                  </Text>
                  <Text style={styles.arrowText}>▼</Text>
                </TouchableOpacity>
                
                {showParentescoModal && (
                  <View style={styles.dropdownList}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                      {parentescoOptionsMemo.map((option, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dropdownItem,
                            formDataRedApoyo.parentesco === option.value && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            updateRedApoyoField('parentesco', option.value);
                            setShowParentescoModal(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            formDataRedApoyo.parentesco === option.value && styles.dropdownItemTextSelected
                          ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={styles.modalFormActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowAddRedApoyo(false);
                    resetFormRedApoyo();
                  }}
                  disabled={savingRedApoyo}
                  style={styles.modalCancelButton}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveRedApoyo}
                  loading={savingRedApoyo}
                  disabled={savingRedApoyo}
                  style={styles.modalSaveButton}
                >
                  Guardar
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Modal para agregar Esquema de Vacunación */}
      <Modal
        visible={showAddEsquemaVacunacion}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}} // Deshabilitado - Solo cierra con botón
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          // onPress={() => !savingEsquemaVacunacion && setShowAddEsquemaVacunacion(false)} // Deshabilitado
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>💉 Agregar Vacuna</Title>
              <TouchableOpacity
                onPress={() => !savingEsquemaVacunacion && (setShowAddEsquemaVacunacion(false), resetFormEsquemaVacunacion())}
                disabled={savingEsquemaVacunacion}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalFormScrollView} keyboardShouldPersistTaps="handled">
              {/* Selector de Vacuna */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Vacuna *</Text>
                <TouchableOpacity
                  style={[styles.input, styles.vacunaSelectorButton, !formDataEsquemaVacunacion.vacuna && styles.vacunaSelectorButtonEmpty]}
                  onPress={() => !savingEsquemaVacunacion && setShowVacunaSelector(true)}
                  disabled={savingEsquemaVacunacion}
                >
                  <Text style={[
                    styles.vacunaSelectorButtonText,
                    !formDataEsquemaVacunacion.vacuna && styles.vacunaSelectorButtonTextPlaceholder
                  ]}>
                    {formDataEsquemaVacunacion.vacuna || 'Seleccionar vacuna...'}
                  </Text>
                  <Text style={styles.vacunaSelectorButtonIcon}>▼</Text>
                </TouchableOpacity>
                {loadingVacunas && vacunasSistema.length === 0 && (
                  <Text style={styles.loadingText}>Cargando vacunas...</Text>
                )}
              </View>
              
              <DatePickerButton
                label="Fecha de aplicación *"
                value={formDataEsquemaVacunacion.fecha_aplicacion}
                onChangeText={(value) => updateEsquemaVacunacionField('fecha_aplicacion', value)}
                editable={!savingEsquemaVacunacion}
              />
              <TextInput
                style={styles.input}
                placeholder="Número de lote"
                value={formDataEsquemaVacunacion.lote}
                onChangeText={(value) => updateEsquemaVacunacionField('lote', value)}
                editable={!savingEsquemaVacunacion}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Observaciones"
                value={formDataEsquemaVacunacion.observaciones}
                onChangeText={(value) => updateEsquemaVacunacionField('observaciones', value)}
                multiline
                numberOfLines={4}
                editable={!savingEsquemaVacunacion}
              />

              <View style={styles.modalFormActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowAddEsquemaVacunacion(false);
                    resetFormEsquemaVacunacion();
                  }}
                  disabled={savingEsquemaVacunacion}
                  style={styles.modalCancelButton}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveEsquemaVacunacion}
                  loading={savingEsquemaVacunacion}
                  disabled={savingEsquemaVacunacion}
                  style={styles.modalSaveButton}
                >
                  Guardar
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Modal para seleccionar vacuna del catálogo */}
      <Modal
        visible={showVacunaSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVacunaSelector(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowVacunaSelector(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>💉 Seleccionar Vacuna</Title>
              <TouchableOpacity onPress={() => setShowVacunaSelector(false)}>
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalFormScrollView} keyboardShouldPersistTaps="handled">
              {loadingVacunas && vacunasSistema.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={{ marginTop: 10, color: '#666' }}>Cargando vacunas...</Text>
                </View>
              ) : vacunasSistema.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#666', textAlign: 'center' }}>
                    No hay vacunas disponibles en el sistema.{'\n'}
                    Por favor, agrega vacunas desde la gestión administrativa.
                  </Text>
                </View>
              ) : (
                <View style={styles.vacunaSelectorList}>
                  {vacunasSistema.map((vacuna) => (
                    <TouchableOpacity
                      key={vacuna.id_vacuna}
                      style={[
                        styles.vacunaOption,
                        formDataEsquemaVacunacion.vacuna === vacuna.nombre_vacuna && styles.vacunaOptionSelected
                      ]}
                      onPress={() => handleSelectVacuna(vacuna)}
                    >
                      <View style={styles.vacunaOptionContent}>
                        <View style={styles.vacunaOptionTextContainer}>
                          <Text style={[
                            styles.vacunaOptionText,
                            formDataEsquemaVacunacion.vacuna === vacuna.nombre_vacuna && styles.vacunaOptionTextSelected
                          ]}>
                            {vacuna.nombre_vacuna}
                          </Text>
                          {vacuna.tipo && (
                            <Text style={styles.vacunaOptionSubtext}>
                              Tipo: {vacuna.tipo}
                            </Text>
                          )}
                          {vacuna.descripcion && (
                            <Text style={styles.vacunaOptionDescription} numberOfLines={2}>
                              {vacuna.descripcion}
                            </Text>
                          )}
                        </View>
                        <View style={[
                          styles.vacunaRadio,
                          formDataEsquemaVacunacion.vacuna === vacuna.nombre_vacuna && styles.vacunaRadioSelected
                        ]}>
                          {formDataEsquemaVacunacion.vacuna === vacuna.nombre_vacuna && (
                            <View style={styles.vacunaRadioInner} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              <View style={{ padding: 15 }}>
                <Button
                  mode="outlined"
                  onPress={() => setShowVacunaSelector(false)}
                  style={{ marginTop: 10 }}
                >
                  Cancelar
                </Button>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Opciones - Red de Apoyo */}
      <OptionsModal
        visible={modalManager.isOpen('optionsRedApoyo')}
        onClose={() => modalManager.close('optionsRedApoyo')}
        title="Opciones de Red de Apoyo"
        options={[
          {
            icon: 'plus',
            label: 'Agregar Contacto',
            onPress: () => setShowAddRedApoyo(true),
            color: '#2196F3'
          },
          {
            icon: 'magnify',
            label: 'Ver Todos los Contactos',
            onPress: () => setShowAllRedApoyo(true),
            color: '#666'
          }
        ]}
      />

      {/* Modal de acciones al tocar un contacto (Llamar / Enviar email) */}
      <OptionsModal
        visible={!!contactoRedApoyoSeleccionado}
        onClose={() => setContactoRedApoyoSeleccionado(null)}
        title={contactoRedApoyoSeleccionado
          ? `Acciones: ${contactoRedApoyoSeleccionado.nombre_contacto || 'Contacto'}`
          : 'Acciones'}
        options={opcionesContactoRedApoyo}
      />

      {/* Modal al tocar una vacuna (Esquema de vacunación) */}
      <OptionsModal
        visible={!!vacunaEsquemaSeleccionada}
        onClose={() => setVacunaEsquemaSeleccionada(null)}
        title={vacunaEsquemaSeleccionada ? `Vacuna: ${vacunaEsquemaSeleccionada.vacuna || 'Registro'}` : 'Opciones'}
        options={opcionesVacunaEsquema}
      />

      {/* Modal al tocar un medicamento */}
      <OptionsModal
        visible={!!medicamentoSeleccionado}
        onClose={() => setMedicamentoSeleccionado(null)}
        title={medicamentoSeleccionado ? `Medicamento: ${medicamentoSeleccionado.nombre_medicamento || 'Sin nombre'}` : 'Opciones'}
        options={opcionesMedicamentoSeleccionado}
      />

      {/* Modal al tocar una complicación */}
      <OptionsModal
        visible={!!deteccionComplicacionSeleccionada}
        onClose={() => setDeteccionComplicacionSeleccionada(null)}
        title={deteccionComplicacionSeleccionada ? `Complicación: ${deteccionComplicacionSeleccionada.tipo_complicacion || deteccionComplicacionSeleccionada.Comorbilidad?.nombre_comorbilidad || 'Complicación'}` : 'Opciones'}
        options={opcionesDeteccionComplicacion}
      />

      {/* Modal al tocar una comorbilidad */}
      <OptionsModal
        visible={!!comorbilidadSeleccionada}
        onClose={() => setComorbilidadSeleccionada(null)}
        title={comorbilidadSeleccionada ? `Comorbilidad: ${comorbilidadSeleccionada.nombre || comorbilidadSeleccionada.nombre_comorbilidad || ''}` : 'Opciones'}
        options={opcionesComorbilidadSeleccionada}
      />

      {/* Modal al tocar un registro de salud bucal */}
      <OptionsModal
        visible={!!registroSaludBucalSeleccionado}
        onClose={() => setRegistroSaludBucalSeleccionado(null)}
        title={registroSaludBucalSeleccionado ? `Salud bucal: ${formatearFecha(registroSaludBucalSeleccionado.fecha_registro)}` : 'Opciones'}
        options={opcionesRegistroSaludBucal}
      />

      {/* Modal al tocar una detección de tuberculosis */}
      <OptionsModal
        visible={!!deteccionTbSeleccionada}
        onClose={() => setDeteccionTbSeleccionada(null)}
        title={deteccionTbSeleccionada ? `TB: ${formatearFecha(deteccionTbSeleccionada.fecha_deteccion)}` : 'Opciones'}
        options={opcionesDeteccionTb}
      />

      {/* Modal de Opciones - Esquema de Vacunación */}
      <OptionsModal
        visible={modalManager.isOpen('optionsEsquemaVacunacion')}
        onClose={() => modalManager.close('optionsEsquemaVacunacion')}
        title="Opciones de Esquema de Vacunación"
        options={[
          {
            icon: 'plus',
            label: 'Agregar Vacuna',
            onPress: () => setShowAddEsquemaVacunacion(true),
            color: '#2196F3'
          },
          {
            icon: 'magnify',
            label: 'Ver Historial Completo',
            onPress: () => setShowAllEsquemaVacunacion(true),
            color: '#666'
          }
        ]}
      />

      {/* Modal de Opciones - Comorbilidades */}
      <OptionsModal
        visible={modalManager.isOpen('optionsComorbilidades')}
        onClose={() => modalManager.close('optionsComorbilidades')}
        title="Opciones de Comorbilidades"
        options={[
          {
            icon: 'plus',
            label: 'Agregar Comorbilidad',
            onPress: () => {
              resetFormComorbilidad();
              setShowAddComorbilidad(true);
            },
            color: '#2196F3'
          },
          {
            icon: 'magnify',
            label: 'Ver Historial Completo',
            onPress: () => setShowAllComorbilidades(true),
            color: '#666'
          }
        ]}
      />

      {/* ✅ Modal de Opciones - Salud Bucal (Instrucción ⑫) */}
      <OptionsModal
        visible={showOptionsSaludBucal}
        onClose={() => setShowOptionsSaludBucal(false)}
        title="Opciones de Salud Bucal"
        options={[
          {
            icon: 'plus',
            label: 'Agregar Registro de Salud Bucal',
            onPress: () => {
              setShowOptionsSaludBucal(false);
              openSaludBucalModal(null);
            }
          },
          {
            icon: 'magnify',
            label: 'Ver Historial Completo',
            onPress: () => {
              setShowOptionsSaludBucal(false);
              setShowAllSaludBucal(true);
            }
          }
        ]}
      />

      {/* ✅ Modal de Opciones - Detección de Tuberculosis (Instrucción ⑬) */}
      <OptionsModal
        visible={showOptionsDeteccionesTuberculosis}
        onClose={() => setShowOptionsDeteccionesTuberculosis(false)}
        title="Opciones de Detección de Tuberculosis"
        options={[
          {
            icon: 'plus',
            label: 'Agregar Detección de Tuberculosis',
            onPress: () => {
              setShowOptionsDeteccionesTuberculosis(false);
              openDeteccionTuberculosisModal(null);
            }
          },
          {
            icon: 'magnify',
            label: 'Ver Historial Completo',
            onPress: () => {
              setShowOptionsDeteccionesTuberculosis(false);
              setShowAllDeteccionesTuberculosis(true);
            }
          }
        ]}
      />

      {/* Modal de Opciones - Complicaciones */}
      <OptionsModal
        visible={showOptionsDetecciones}
        onClose={() => setShowOptionsDetecciones(false)}
        title="Opciones de Complicaciones"
        options={[
          {
            icon: 'plus',
            label: 'Agregar Nueva Complicación',
            onPress: () => {
              setShowOptionsDetecciones(false);
              openDeteccionForCreate();
            },
            color: '#4CAF50'
          },
          ...(detecciones && detecciones.length > 0 ? [{
            icon: 'pencil',
            label: 'Modificar Complicación',
            onPress: () => {
              setShowOptionsDetecciones(false);
              openDeteccionForEdit();
            },
            color: '#2196F3'
          }] : [])
        ]}
      />

      {/* Modal de Historial Completo - Red de Apoyo */}
      <HistoryModal
        visible={showAllRedApoyo}
        onClose={() => setShowAllRedApoyo(false)}
        title="👥 Red de Apoyo Completa"
        items={redApoyo}
        loading={loadingRedApoyo}
        emptyMessage="No hay contactos registrados"
        renderItem={(contacto, index) => (
          <Card key={`red-all-${contacto.id_red_apoyo}-${index}`} style={styles.listItem}>
            <Card.Content>
              <Text style={styles.listItemTitle}>{contacto.nombre_contacto}</Text>
              <Text style={styles.listItemSubtitle}>
                Parentesco: {contacto.parentesco || 'No especificado'}
              </Text>
              {contacto.numero_celular && (
                <Text style={styles.listItemDescription}>📞 {contacto.numero_celular}</Text>
              )}
              {contacto.email && (
                <Text style={styles.listItemDescription}>📧 {contacto.email}</Text>
              )}
              {contacto.direccion && (
                <Text style={styles.listItemDescription}>📍 {contacto.direccion}</Text>
              )}
              {contacto.localidad && (
                <Text style={styles.listItemDescription}>🏘️ {contacto.localidad}</Text>
              )}
              
              {/* Botones de acción */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0', flexWrap: 'wrap' }}>
                {(contacto.numero_celular || contacto.email) && (
                  <TouchableOpacity
                    style={{ flex: 1, minWidth: 80, backgroundColor: '#4CAF50', padding: 8, borderRadius: 6, alignItems: 'center' }}
                    onPress={() => {
                      setShowAllRedApoyo(false);
                      setContactoRedApoyoSeleccionado(contacto);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>📞 Contactar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={{ flex: 1, minWidth: 80, backgroundColor: '#2196F3', padding: 8, borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setShowAllRedApoyo(false);
                    handleEditRedApoyo(contacto);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>✏️ Editar</Text>
                </TouchableOpacity>
                {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador' ||
                  userRole === 'Doctor' || userRole === 'doctor') && (
                  <TouchableOpacity
                    style={{ flex: 1, minWidth: 80, backgroundColor: '#f44336', padding: 8, borderRadius: 6, alignItems: 'center' }}
                    onPress={() => {
                      setShowAllRedApoyo(false);
                      handleDeleteRedApoyo(contacto);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
      />

      {/* Modal de Historial Completo - Esquema de Vacunación */}
      <HistoryModal
        visible={showAllEsquemaVacunacion}
        onClose={() => setShowAllEsquemaVacunacion(false)}
        title="💉 Esquema de Vacunación Completo"
        items={esquemaVacunacion}
        loading={loadingEsquemaVacunacion}
        emptyMessage="No hay vacunas registradas"
        renderItem={(vacuna, index) => (
          <Card key={`vacuna-all-${vacuna.id_esquema}-${index}`} style={styles.listItem}>
            <Card.Content>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle}>{vacuna.vacuna}</Text>
                <Text style={styles.listItemSubtitle}>
                  {formatearFecha(vacuna.fecha_aplicacion)}
                </Text>
              </View>
              {vacuna.lote && (
                <Text style={styles.listItemDescription}>Lote: {vacuna.lote}</Text>
              )}
              {vacuna.observaciones && (
                <Text style={styles.listItemNotes}>{vacuna.observaciones}</Text>
              )}
              
              {/* Botones de acción */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#2196F3', padding: 8, borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setShowAllEsquemaVacunacion(false);
                    handleEditEsquemaVacunacion(vacuna);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>✏️ Editar</Text>
                </TouchableOpacity>
                {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador' ||
                  userRole === 'Doctor' || userRole === 'doctor') && (
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#f44336', padding: 8, borderRadius: 6, alignItems: 'center' }}
                    onPress={() => {
                      setShowAllEsquemaVacunacion(false);
                      handleDeleteEsquemaVacunacion(vacuna);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
      />

      {/* Modal de Historial Completo - Complicaciones */}
      <HistoryModal
        visible={showAllDetecciones}
        onClose={() => setShowAllDetecciones(false)}
        title="🩺 Complicaciones"
        items={detecciones}
        emptyMessage="No hay complicaciones registradas"
        renderItem={(det, index) => (
          <Card key={`det-all-${det.id_deteccion || index}`} style={styles.listItem}>
            <Card.Content>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle}>
                  {det.tipo_complicacion || det.Comorbilidad?.nombre_comorbilidad || 'Complicación'}
                </Text>
                <Text style={styles.listItemSubtitle}>
                  {formatearFecha(det.fecha_deteccion)}
                </Text>
              </View>
              {det.Comorbilidad?.nombre_comorbilidad && (
                <Text style={styles.listItemDescription}>
                  Comorbilidad: {det.Comorbilidad.nombre_comorbilidad}
                </Text>
              )}
              {det.Cita?.fecha_cita && (
                <Text style={styles.listItemDescription}>
                  Cita: {formatearFecha(det.Cita.fecha_cita)} {det.Cita.motivo ? `- ${det.Cita.motivo}` : ''}
                </Text>
              )}
              {det.Doctor && (
                <Text style={styles.listItemNotes}>
                  Doctor: {`${det.Doctor.nombre || ''} ${det.Doctor.apellido_paterno || ''}`.trim()}
                </Text>
              )}
              {det.exploracion_pies || det.exploracion_fondo_ojo ? (
                <Text style={styles.listItemNotes}>
                  {det.exploracion_pies ? '🦶 Exploración de pies' : ''}
                  {det.exploracion_pies && det.exploracion_fondo_ojo ? ' | ' : ''}
                  {det.exploracion_fondo_ojo ? '👁️ Fondo de ojo' : ''}
                </Text>
              ) : null}
              {det.realiza_auto_monitoreo ? (
                <Text style={styles.listItemNotes}>
                  📈 Auto-monitoreo: {[
                    det.auto_monitoreo_glucosa ? 'glucosa' : null,
                    det.auto_monitoreo_presion ? 'presión' : null
                  ].filter(Boolean).join(', ')}
                </Text>
              ) : null}
              {det.observaciones ? (
                <Text style={styles.listItemNotes}>{det.observaciones}</Text>
              ) : null}
            </Card.Content>
          </Card>
        )}
      />

      {/* Modal Crear/Editar Complicación */}
      <ModalBase
        visible={showDeteccionModal}
        title={editingDeteccion ? "Editar Complicación" : "Crear Nueva Complicación"}
        onClose={() => {
          setShowDeteccionModal(false);
          setEditingDeteccion(null); // Limpiar estado al cerrar
        }}
        allowOutsideClick={false}
      >
        <View style={{ gap: 12 }}>
          <TextInput
            label="Tipo de complicación"
            value={formDeteccion.tipo_complicacion}
            onChangeText={(text) => setFormDeteccion(prev => ({ ...prev, tipo_complicacion: text }))}
            mode="outlined"
          />
          <View style={{ minHeight: 88 }}>
            <DatePickerButton
              label="Fecha de detección *"
              value={formDeteccion.fecha_deteccion}
              onDateChange={(date) => setFormDeteccion(prev => ({ ...prev, fecha_deteccion: date }))}
              mode="date"
              required
              hideIcons
            />
          </View>
          <View style={{ minHeight: 88 }}>
            <DatePickerButton
              label="Fecha de diagnóstico (opcional)"
              value={formDeteccion.fecha_diagnostico}
              onDateChange={(date) => setFormDeteccion(prev => ({ ...prev, fecha_diagnostico: date }))}
              mode="date"
              hideIcons
            />
          </View>
          <TextInput
            label="Observaciones"
            value={formDeteccion.observaciones}
            onChangeText={(text) => setFormDeteccion(prev => ({ ...prev, observaciones: text }))}
            mode="outlined"
            multiline
          />

          {/* ✅ Microalbuminuria - Instrucción ⑥ */}
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Microalbuminuria realizada</Text>
              <Switch
                value={formDeteccion.microalbuminuria_realizada}
                onValueChange={(v) => setFormDeteccion(prev => ({ ...prev, microalbuminuria_realizada: v }))}
              />
            </View>
            {formDeteccion.microalbuminuria_realizada && (
              <TextInput
                label="Resultado de Microalbuminuria (mg/L o mg/g)"
                value={formDeteccion.microalbuminuria_resultado}
                onChangeText={(text) => setFormDeteccion(prev => ({ ...prev, microalbuminuria_resultado: text }))}
                mode="outlined"
                keyboardType="decimal-pad"
                placeholder="Ej: 25.5"
                style={{ marginTop: 8 }}
              />
            )}
          </View>

          {/* ✅ Referencia - Instrucción ⑪ */}
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Fue referido a otro nivel</Text>
              <Switch
                value={formDeteccion.fue_referido}
                onValueChange={(v) => setFormDeteccion(prev => ({ ...prev, fue_referido: v }))}
              />
            </View>
            {formDeteccion.fue_referido && (
              <TextInput
                label="Observaciones de Referencia"
                value={formDeteccion.referencia_observaciones}
                onChangeText={(text) => setFormDeteccion(prev => ({ ...prev, referencia_observaciones: text }))}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Especialidad, institución, motivo..."
                style={{ marginTop: 8 }}
              />
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>Exploración de pies</Text>
            <Switch
              value={formDeteccion.exploracion_pies}
              onValueChange={(v) => setFormDeteccion(prev => ({ ...prev, exploracion_pies: v }))}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>Exploración de Fondo de Ojo</Text>
            <Switch
              value={formDeteccion.exploracion_fondo_ojo}
              onValueChange={(v) => setFormDeteccion(prev => ({ ...prev, exploracion_fondo_ojo: v }))}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text>Realiza auto-monitoreo</Text>
            <Switch
              value={formDeteccion.realiza_auto_monitoreo}
              onValueChange={(v) => setFormDeteccion(prev => ({
                ...prev,
                realiza_auto_monitoreo: v,
                auto_monitoreo_glucosa: v ? prev.auto_monitoreo_glucosa : false,
                auto_monitoreo_presion: v ? prev.auto_monitoreo_presion : false
              }))}
            />
          </View>
          {formDeteccion.realiza_auto_monitoreo && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text>Auto-monitoreo glucosa</Text>
                <Switch
                  value={formDeteccion.auto_monitoreo_glucosa}
                  onValueChange={(v) => setFormDeteccion(prev => ({ ...prev, auto_monitoreo_glucosa: v }))}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text>Auto-monitoreo presión</Text>
                <Switch
                  value={formDeteccion.auto_monitoreo_presion}
                  onValueChange={(v) => setFormDeteccion(prev => ({ ...prev, auto_monitoreo_presion: v }))}
                />
              </View>
            </>
          )}

          {/* ✅ Microalbuminuria - Instrucción ⑥ */}
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Microalbuminuria realizada</Text>
              <Switch
                value={formDeteccion.microalbuminuria_realizada}
                onValueChange={(v) => setFormDeteccion(prev => ({ ...prev, microalbuminuria_realizada: v }))}
              />
            </View>
            {formDeteccion.microalbuminuria_realizada && (
              <TextInput
                label="Resultado de Microalbuminuria (mg/L o mg/g)"
                value={formDeteccion.microalbuminuria_resultado}
                onChangeText={(text) => setFormDeteccion(prev => ({ ...prev, microalbuminuria_resultado: text }))}
                mode="outlined"
                keyboardType="decimal-pad"
                placeholder="Ej: 25.5"
                style={{ marginTop: 8 }}
              />
            )}
          </View>

          {/* ✅ Referencia - Instrucción ⑪ */}
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Fue referido a otro nivel</Text>
              <Switch
                value={formDeteccion.fue_referido}
                onValueChange={(v) => setFormDeteccion(prev => ({ ...prev, fue_referido: v }))}
              />
            </View>
            {formDeteccion.fue_referido && (
              <TextInput
                label="Observaciones de Referencia"
                value={formDeteccion.referencia_observaciones}
                onChangeText={(text) => setFormDeteccion(prev => ({ ...prev, referencia_observaciones: text }))}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Especialidad, institución, motivo..."
                style={{ marginTop: 8 }}
              />
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button 
              mode="text" 
              onPress={() => {
                setShowDeteccionModal(false);
                setEditingDeteccion(null); // Limpiar estado al cancelar
              }}
            >
              Cancelar
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSaveDeteccion} 
              buttonColor={editingDeteccion ? COLORES.NAV_PRIMARIO : COLORES.EXITO_LIGHT}
              disabled={!formDeteccion.fecha_deteccion} // Deshabilitar si no hay fecha de detección (obligatorio)
            >
              {editingDeteccion ? 'Actualizar' : 'Crear'}
            </Button>
          </View>
        </View>
      </ModalBase>

      {/* ✅ Modal Crear/Editar Salud Bucal (Instrucción ⑫) */}
      <ModalBase
        visible={showSaludBucalModal}
        title={editingSaludBucal ? "Editar Registro de Salud Bucal" : "Crear Registro de Salud Bucal"}
        onClose={() => {
          setShowSaludBucalModal(false);
          setEditingSaludBucal(null);
        }}
        allowOutsideClick={false}
      >
        <View style={{ gap: 12 }}>
          <DatePickerButton
            label="Fecha de registro *"
            value={formSaludBucal.fecha_registro}
            onDateChange={(date) => setFormSaludBucal(prev => ({ ...prev, fecha_registro: date }))}
            mode="date"
            required
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>¿Presenta enfermedades odontológicas?</Text>
            <Switch
              value={formSaludBucal.presenta_enfermedades_odontologicas}
              onValueChange={(v) => setFormSaludBucal(prev => ({ ...prev, presenta_enfermedades_odontologicas: v }))}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>¿Recibió tratamiento odontológico?</Text>
            <Switch
              value={formSaludBucal.recibio_tratamiento_odontologico}
              onValueChange={(v) => setFormSaludBucal(prev => ({ ...prev, recibio_tratamiento_odontologico: v }))}
            />
          </View>
          <TextInput
            label="Observaciones"
            value={formSaludBucal.observaciones}
            onChangeText={(text) => setFormSaludBucal(prev => ({ ...prev, observaciones: text }))}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Observaciones adicionales..."
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button 
              mode="text" 
              onPress={() => {
                setShowSaludBucalModal(false);
                setEditingSaludBucal(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSaveSaludBucal} 
              buttonColor={editingSaludBucal ? COLORES.NAV_PRIMARIO : COLORES.EXITO_LIGHT}
              disabled={!formSaludBucal.fecha_registro}
            >
              {editingSaludBucal ? 'Actualizar' : 'Crear'}
            </Button>
          </View>
        </View>
      </ModalBase>

      {/* ✅ Modal Crear/Editar Detección de Tuberculosis (Instrucción ⑬) */}
      <ModalBase
        visible={showDeteccionTuberculosisModal}
        title={editingDeteccionTuberculosis ? "Editar Detección de Tuberculosis" : "Crear Detección de Tuberculosis"}
        onClose={() => {
          setShowDeteccionTuberculosisModal(false);
          setEditingDeteccionTuberculosis(null);
        }}
        allowOutsideClick={false}
      >
        <View style={{ gap: 12 }}>
          <DatePickerButton
            label="Fecha de detección *"
            value={formDeteccionTuberculosis.fecha_deteccion}
            onDateChange={(date) => setFormDeteccionTuberculosis(prev => ({ ...prev, fecha_deteccion: date }))}
            mode="date"
            required
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>Aplicación de encuesta</Text>
            <Switch
              value={formDeteccionTuberculosis.aplicacion_encuesta}
              onValueChange={(v) => setFormDeteccionTuberculosis(prev => ({ ...prev, aplicacion_encuesta: v }))}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>Baciloscopia realizada</Text>
            <Switch
              value={formDeteccionTuberculosis.baciloscopia_realizada}
              onValueChange={(v) => setFormDeteccionTuberculosis(prev => ({ 
                ...prev, 
                baciloscopia_realizada: v,
                baciloscopia_resultado: v ? prev.baciloscopia_resultado : ''
              }))}
            />
          </View>
          {formDeteccionTuberculosis.baciloscopia_realizada && (
            <View>
              <Text style={{ fontSize: 14, marginBottom: 8, color: '#666' }}>Resultado de baciloscopia *</Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {['positivo', 'negativo', 'pendiente', 'no_aplicable'].map((resultado) => (
                  <TouchableOpacity
                    key={resultado}
                    style={[
                      {
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor: formDeteccionTuberculosis.baciloscopia_resultado === resultado ? '#2196F3' : '#e0e0e0',
                        backgroundColor: formDeteccionTuberculosis.baciloscopia_resultado === resultado ? '#e3f2fd' : '#fff'
                      }
                    ]}
                    onPress={() => setFormDeteccionTuberculosis(prev => ({ ...prev, baciloscopia_resultado: resultado }))}
                  >
                    <Text style={{
                      color: formDeteccionTuberculosis.baciloscopia_resultado === resultado ? '#2196F3' : '#666',
                      fontWeight: formDeteccionTuberculosis.baciloscopia_resultado === resultado ? '600' : 'normal',
                      textTransform: 'capitalize'
                    }}>
                      {resultado}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '500' }}>¿Ingresó a tratamiento?</Text>
            <Switch
              value={formDeteccionTuberculosis.ingreso_tratamiento}
              onValueChange={(v) => setFormDeteccionTuberculosis(prev => ({ ...prev, ingreso_tratamiento: v }))}
            />
          </View>
          <TextInput
            label="Observaciones"
            value={formDeteccionTuberculosis.observaciones}
            onChangeText={(text) => setFormDeteccionTuberculosis(prev => ({ ...prev, observaciones: text }))}
            mode="outlined"
            multiline
            numberOfLines={3}
            placeholder="Observaciones adicionales..."
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button 
              mode="text" 
              onPress={() => {
                setShowDeteccionTuberculosisModal(false);
                setEditingDeteccionTuberculosis(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              mode="contained" 
              onPress={handleSaveDeteccionTuberculosis} 
              buttonColor={editingDeteccionTuberculosis ? COLORES.NAV_PRIMARIO : COLORES.EXITO_LIGHT}
              disabled={!formDeteccionTuberculosis.fecha_deteccion || (formDeteccionTuberculosis.baciloscopia_realizada && !formDeteccionTuberculosis.baciloscopia_resultado)}
            >
              {editingDeteccionTuberculosis ? 'Actualizar' : 'Crear'}
            </Button>
          </View>
        </View>
      </ModalBase>

      {/* ✅ Modal de Historial Completo - Salud Bucal */}
      <HistoryModal
        visible={showAllSaludBucal}
        onClose={() => setShowAllSaludBucal(false)}
        title="🦷 Registros de Salud Bucal"
        items={saludBucal}
        loading={loadingSaludBucal}
        emptyMessage="No hay registros de salud bucal"
        renderItem={(registro, index) => (
          <Card key={`salud-bucal-all-${registro.id_salud_bucal}-${index}`} style={styles.listItem}>
            <Card.Content>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle}>{formatearFecha(registro.fecha_registro)}</Text>
                <Chip 
                  mode="outlined" 
                  style={[
                    styles.statusChip,
                    registro.presenta_enfermedades_odontologicas ? styles.statusActive : styles.statusInactive
                  ]}
                >
                  {registro.presenta_enfermedades_odontologicas ? 'Con enfermedades' : 'Sin enfermedades'}
                </Chip>
              </View>
              {registro.recibio_tratamiento_odontologico && (
                <Text style={styles.listItemSubtitle}>✅ Recibió tratamiento odontológico</Text>
              )}
              {registro.observaciones && (
                <Text style={styles.listItemNotes}>{registro.observaciones}</Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#2196F3', padding: 8, borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setShowAllSaludBucal(false);
                    openSaludBucalModal(registro);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>✏️ Editar</Text>
                </TouchableOpacity>
                {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador') && (
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#f44336', padding: 8, borderRadius: 6, alignItems: 'center' }}
                    onPress={() => {
                      setShowAllSaludBucal(false);
                      handleDeleteSaludBucal(registro);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
      />

      {/* ✅ Modal de Historial Completo - Detección de Tuberculosis */}
      <HistoryModal
        visible={showAllDeteccionesTuberculosis}
        onClose={() => setShowAllDeteccionesTuberculosis(false)}
        title="🦠 Detecciones de Tuberculosis"
        items={deteccionesTuberculosis}
        loading={loadingDeteccionesTuberculosis}
        emptyMessage="No hay detecciones de tuberculosis registradas"
        renderItem={(deteccion, index) => (
          <Card key={`tb-all-${deteccion.id_deteccion_tb}-${index}`} style={styles.listItem}>
            <Card.Content>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle}>{formatearFecha(deteccion.fecha_deteccion)}</Text>
                {deteccion.baciloscopia_resultado && (
                  <Chip 
                    mode="outlined" 
                    style={[
                      styles.statusChip,
                      deteccion.baciloscopia_resultado === 'positivo' ? styles.statusActive : styles.statusInactive
                    ]}
                  >
                    {deteccion.baciloscopia_resultado}
                  </Chip>
                )}
              </View>
              {deteccion.aplicacion_encuesta && (
                <Text style={styles.listItemSubtitle}>✅ Encuesta aplicada</Text>
              )}
              {deteccion.baciloscopia_realizada && (
                <Text style={styles.listItemSubtitle}>
                  🔬 Baciloscopia: {deteccion.baciloscopia_resultado || 'Pendiente'}
                </Text>
              )}
              {deteccion.ingreso_tratamiento && (
                <Text style={styles.listItemSubtitle}>💊 Ingresó a tratamiento</Text>
              )}
              {deteccion.observaciones && (
                <Text style={styles.listItemNotes}>{deteccion.observaciones}</Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#2196F3', padding: 8, borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setShowAllDeteccionesTuberculosis(false);
                    openDeteccionTuberculosisModal(deteccion);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>✏️ Editar</Text>
                </TouchableOpacity>
                {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador') && (
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#f44336', padding: 8, borderRadius: 6, alignItems: 'center' }}
                    onPress={() => {
                      setShowAllDeteccionesTuberculosis(false);
                      handleDeleteDeteccionTuberculosis(deteccion);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
      />

      {/* Modal de Historial Completo - Diagnósticos */}
      <HistoryModal
        visible={showAllDiagnosticos}
        onClose={() => setShowAllDiagnosticos(false)}
        title={`🩺 Diagnósticos Completos (${totalDiagnosticos})`}
        items={diagnosticos}
        loading={false}
        emptyMessage="No hay diagnósticos registrados"
        renderItem={(diagnostico, diagIndex) => (
          <Card key={`diag-all-${diagnostico.id_diagnostico}-${diagIndex}`} style={styles.listItem}>
            <Card.Content>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle}>
                  {formatearFecha(diagnostico.fecha_registro)}
                </Text>
                <Text style={styles.listItemSubtitle}>
                  {diagnostico.doctor_nombre || 'Sin doctor asignado'}
                </Text>
              </View>
              <Text style={styles.listItemDescription}>
                {diagnostico.descripcion || 'Sin descripción'}
              </Text>
              
              {/* Botones de acción */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#2196F3', padding: 8, borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setShowAllDiagnosticos(false);
                    handleEditDiagnostico(diagnostico);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>✏️ Editar</Text>
                </TouchableOpacity>
                {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador' ||
                  userRole === 'Doctor' || userRole === 'doctor') && (
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#f44336', padding: 8, borderRadius: 6, alignItems: 'center' }}
                    onPress={() => {
                      setShowAllDiagnosticos(false);
                      handleDeleteDiagnostico(diagnostico);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
      />

      {/* Modal de Historial Completo - Medicamentos */}
      <HistoryModal
        visible={showAllMedicamentos}
        onClose={() => setShowAllMedicamentos(false)}
        title={`💊 Medicamentos Completos (${totalMedicamentos})`}
        items={medicamentos}
        loading={false}
        emptyMessage="No hay medicamentos registrados"
        renderItem={(medicamento, medIndex) => (
          <Card key={`med-all-${medicamento.id_plan}-${medicamento.id_medicamento || medIndex}-${medIndex}`} style={styles.listItem}>
            <Card.Content>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle}>
                  {medicamento.nombre_medicamento || 'Sin nombre'}
                </Text>
                <Chip 
                  mode="outlined" 
                  style={[
                    styles.statusChip,
                    medicamento.estado === 'Activo' ? styles.statusActive : styles.statusInactive
                  ]}
                >
                  {medicamento.estado}
                </Chip>
              </View>
              <Text style={styles.listItemSubtitle}>
                {medicamento.doctor_nombre || 'Sin doctor asignado'}
              </Text>
              <View style={styles.medicationGrid}>
                {medicamento.dosis && (
                  <View style={styles.medicationItem}>
                    <Text style={styles.medicationLabel}>Dosis:</Text>
                    <Text style={styles.medicationValue}>{medicamento.dosis}</Text>
                  </View>
                )}
                {medicamento.frecuencia && (
                  <View style={styles.medicationItem}>
                    <Text style={styles.medicationLabel}>Frecuencia:</Text>
                    <Text style={styles.medicationValue}>{medicamento.frecuencia}</Text>
                  </View>
                )}
                {medicamento.horario && (
                  <View style={styles.medicationItem}>
                    <Text style={styles.medicationLabel}>Horario:</Text>
                    <Text style={styles.medicationValue}>{medicamento.horario}</Text>
                  </View>
                )}
                {medicamento.via_administracion && (
                  <View style={styles.medicationItem}>
                    <Text style={styles.medicationLabel}>Vía:</Text>
                    <Text style={styles.medicationValue}>{medicamento.via_administracion}</Text>
                  </View>
                )}
              </View>
              {medicamento.observaciones && (
                <Text style={styles.listItemDescription}>
                  {medicamento.observaciones}
                </Text>
              )}
              
              {/* Botones de acción - mismo diseño que Esquema de Vacunación (Editar + Eliminar) */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#2196F3', padding: 8, borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setShowAllMedicamentos(false);
                    handleEditMedicamento(medicamento);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>✏️ Editar</Text>
                </TouchableOpacity>
                {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador' ||
                  userRole === 'Doctor' || userRole === 'doctor') && (
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#f44336', padding: 8, borderRadius: 6, alignItems: 'center' }}
                    onPress={() => {
                      setShowAllMedicamentos(false);
                      handleDeleteMedicamento(medicamento);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
      />

      {/* Modal para agregar/editar Comorbilidad */}
      <FormModal
        visible={showAddComorbilidad}
        onClose={() => {
          if (!savingComorbilidad) {
            setShowAddComorbilidad(false);
            resetFormComorbilidad();
          }
        }}
        title={editingComorbilidad ? 'Editar Comorbilidad' : 'Agregar Comorbilidad'}
        onSave={handleSaveComorbilidadWith409}
        saving={savingComorbilidad}
        saveLabel={editingComorbilidad ? 'Actualizar' : 'Guardar'}
      >
              {/* Selector de Comorbilidad */}
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={styles.inputRedApoyo}
                  onPress={() => !savingComorbilidad && setShowComorbilidadSelector(true)}
                  disabled={savingComorbilidad || !!editingComorbilidad}
                >
                  <Text style={[
                    styles.inputText,
                    !formDataComorbilidad.id_comorbilidad && styles.placeholderText
                  ]}>
                    {formDataComorbilidad.id_comorbilidad 
                      ? comorbilidadesSistema.find(c => c.id_comorbilidad === formDataComorbilidad.id_comorbilidad)?.nombre_comorbilidad || 'Comorbilidad seleccionada'
                      : 'Seleccionar Comorbilidad *'}
                  </Text>
                  {!editingComorbilidad && <Text style={styles.arrowText}>▼</Text>}
                </TouchableOpacity>
              </View>

              {/* DatePicker para fecha de detección */}
              <View style={styles.inputContainer}>
                <DatePickerButton
                  label="Fecha de Detección (opcional)"
                  value={formDataComorbilidad.fecha_deteccion}
                  onChange={(date) => updateComorbilidadField('fecha_deteccion', date)}
                  disabled={savingComorbilidad}
                />
              </View>

              {/* Campo de años con padecimiento */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.inputRedApoyo}
                  placeholder="Años con el padecimiento (opcional)"
                  value={formDataComorbilidad.anos_padecimiento}
                  onChangeText={(value) => updateComorbilidadField('anos_padecimiento', value.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                  editable={!savingComorbilidad}
                />
              </View>

              {/* ✅ Diagnóstico Basal - Instrucción ① */}
              <View style={styles.inputContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Switch
                    value={formDataComorbilidad.es_diagnostico_basal || false}
                    onValueChange={(value) => updateComorbilidadField('es_diagnostico_basal', value)}
                    disabled={savingComorbilidad}
                  />
                  <Text style={[styles.label, { marginLeft: 8, flex: 1 }]}>
                    Es diagnóstico basal (inicial)
                  </Text>
                </View>
              </View>

              {/* ✅ Año de diagnóstico */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.inputRedApoyo}
                  placeholder="Año de diagnóstico (YYYY) - Opcional"
                  value={formDataComorbilidad.año_diagnostico}
                  onChangeText={(value) => {
                    const año = value.replace(/[^0-9]/g, '').substring(0, 4);
                    updateComorbilidadField('año_diagnostico', año);
                  }}
                  keyboardType="numeric"
                  editable={!savingComorbilidad}
                />
              </View>

              {/* ✅ Agregado posterior al basal */}
              <View style={styles.inputContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Switch
                    value={formDataComorbilidad.es_agregado_posterior || false}
                    onValueChange={(value) => updateComorbilidadField('es_agregado_posterior', value)}
                    disabled={savingComorbilidad}
                  />
                  <Text style={[styles.label, { marginLeft: 8, flex: 1 }]}>
                    Dx. Agregado posterior al Basal
                  </Text>
                </View>
              </View>

              {/* ✅ Tratamiento No Farmacológico - Instrucción ② */}
              <View style={styles.inputContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Switch
                    value={formDataComorbilidad.recibe_tratamiento_no_farmacologico || false}
                    onValueChange={(value) => updateComorbilidadField('recibe_tratamiento_no_farmacologico', value)}
                    disabled={savingComorbilidad}
                  />
                  <Text style={[styles.label, { marginLeft: 8, flex: 1 }]}>
                    Recibe tratamiento no farmacológico
                  </Text>
                </View>
                <Text style={[styles.labelHint, { marginLeft: 40, fontSize: 11 }]}>
                  (dieta, ejercicio, cambios de estilo de vida)
                </Text>
              </View>

              {/* ✅ Tratamiento Farmacológico - Instrucción ③ */}
              <View style={styles.inputContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Switch
                    value={formDataComorbilidad.recibe_tratamiento_farmacologico || false}
                    onValueChange={(value) => updateComorbilidadField('recibe_tratamiento_farmacologico', value)}
                    disabled={savingComorbilidad}
                  />
                  <Text style={[styles.label, { marginLeft: 8, flex: 1 }]}>
                    Recibe tratamiento farmacológico
                  </Text>
                </View>
                <Text style={[styles.labelHint, { marginLeft: 40, fontSize: 11, color: '#1976d2' }]}>
                  (Se sincroniza automáticamente con Plan de Medicación activo)
                </Text>
              </View>

              {/* Campo de observaciones */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.inputRedApoyo, styles.textArea]}
                  placeholder="Observaciones (opcional)"
                  value={formDataComorbilidad.observaciones}
                  onChangeText={(value) => updateComorbilidadField('observaciones', value)}
                  multiline
                  numberOfLines={3}
                  editable={!savingComorbilidad}
                />
              </View>
      </FormModal>

      {/* Modal selector de comorbilidades del catálogo */}
      <Modal
        visible={showComorbilidadSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowComorbilidadSelector(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowComorbilidadSelector(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>Seleccionar Comorbilidad</Title>
              <TouchableOpacity onPress={() => setShowComorbilidadSelector(false)}>
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalFormScrollView}>
              {loadingComorbilidadesSistema ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={{ marginTop: 10, color: '#666' }}>Cargando comorbilidades...</Text>
                </View>
              ) : comorbilidadesSistema.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#666', textAlign: 'center' }}>
                    No hay comorbilidades disponibles en el sistema.{'\n'}
                    Por favor, agrega comorbilidades desde la gestión administrativa.
                  </Text>
                </View>
              ) : (
                <View style={styles.vacunaSelectorList}>
                  {comorbilidadesSistema.map((comorbilidad) => (
                    <TouchableOpacity
                      key={comorbilidad.id_comorbilidad}
                      style={[
                        styles.vacunaOption,
                        formDataComorbilidad.id_comorbilidad === comorbilidad.id_comorbilidad && styles.vacunaOptionSelected
                      ]}
                      onPress={() => handleSelectComorbilidad(comorbilidad)}
                    >
                      <View style={styles.vacunaOptionContent}>
                        <View style={styles.vacunaOptionTextContainer}>
                          <Text style={[
                            styles.vacunaOptionText,
                            formDataComorbilidad.id_comorbilidad === comorbilidad.id_comorbilidad && styles.vacunaOptionTextSelected
                          ]}>
                            {comorbilidad.nombre_comorbilidad}
                          </Text>
                          {comorbilidad.descripcion && (
                            <Text style={styles.vacunaOptionDescription} numberOfLines={2}>
                              {comorbilidad.descripcion}
                            </Text>
                          )}
                        </View>
                        <View style={[
                          styles.vacunaRadio,
                          formDataComorbilidad.id_comorbilidad === comorbilidad.id_comorbilidad && styles.vacunaRadioSelected
                        ]}>
                          {formDataComorbilidad.id_comorbilidad === comorbilidad.id_comorbilidad && (
                            <View style={styles.vacunaRadioInner} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              <View style={{ padding: 15 }}>
                <Button
                  mode="outlined"
                  onPress={() => setShowComorbilidadSelector(false)}
                  style={{ marginTop: 10 }}
                >
                  Cancelar
                </Button>
              </View>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Historial Completo - Comorbilidades */}
      <HistoryModal
        visible={showAllComorbilidades}
        onClose={() => setShowAllComorbilidades(false)}
        title="Comorbilidades Completas"
        items={comorbilidadesPaciente}
        loading={loadingComorbilidades}
        emptyMessage="No hay comorbilidades registradas"
        renderItem={(comorbilidad, index) => (
          <Card key={`comorbilidad-all-${comorbilidad.id_comorbilidad}-${index}`} style={styles.listItem}>
            <Card.Content>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle}>
                  {comorbilidad.nombre || comorbilidad.nombre_comorbilidad}
                </Text>
                {comorbilidad.fecha_deteccion && (
                  <Text style={styles.listItemSubtitle}>
                    Detectada: {formatearFecha(comorbilidad.fecha_deteccion)}
                  </Text>
                )}
              </View>
              {comorbilidad.observaciones && (
                <Text style={styles.listItemNotes}>{comorbilidad.observaciones}</Text>
              )}
              {/* Botones de acción - mismo diseño que Esquema de Vacunación */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#2196F3', padding: 8, borderRadius: 6, alignItems: 'center' }}
                  onPress={() => {
                    setShowAllComorbilidades(false);
                    handleEditComorbilidad(comorbilidad);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>✏️ Editar</Text>
                </TouchableOpacity>
                {(userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador' ||
                  userRole === 'Doctor' || userRole === 'doctor') && (
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: '#f44336', padding: 8, borderRadius: 6, alignItems: 'center' }}
                    onPress={() => {
                      setShowAllComorbilidades(false);
                      handleDeleteComorbilidad(comorbilidad);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>🗑️ Eliminar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card.Content>
          </Card>
        )}
      />

      {/* ✅ Modal para agregar/editar Sesión Educativa */}
      <FormModal
        visible={showAddSesionEducativa}
        onClose={() => {
          if (!savingSesionEducativaHook) {
            setShowAddSesionEducativa(false);
            resetFormSesionEducativa();
          }
        }}
        title={editingSesionEducativa ? '✏️ Editar Sesión Educativa' : '📚 Agregar Sesión Educativa'}
        onSave={handleSaveSesionEducativa}
        saving={savingSesionEducativaHook}
        saveLabel={editingSesionEducativa ? 'Actualizar' : 'Guardar'}
      >
        {/* Selector de Tipo de Sesión */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Tipo de Sesión *</Text>
          <View style={styles.vacunaSelectorList}>
            {[
              { value: 'nutricional', label: '🍎 Nutricional' },
              { value: 'actividad_fisica', label: '🏃 Actividad Física' },
              { value: 'medico_preventiva', label: '🩺 Médico Preventiva' },
              { value: 'trabajo_social', label: '👥 Trabajo Social' },
              { value: 'psicologica', label: '🧠 Psicológica' },
              { value: 'odontologica', label: '🦷 Odontológica' }
            ].map((tipo) => (
              <TouchableOpacity
                key={tipo.value}
                style={[
                  styles.vacunaOption,
                  formDataSesionEducativa.tipo_sesion === tipo.value && styles.vacunaOptionSelected
                ]}
                onPress={() => updateSesionEducativaField('tipo_sesion', tipo.value)}
                disabled={savingSesionEducativaHook}
              >
                <View style={styles.vacunaOptionContent}>
                  <View style={styles.vacunaOptionTextContainer}>
                    <Text style={[
                      styles.vacunaOptionText,
                      formDataSesionEducativa.tipo_sesion === tipo.value && styles.vacunaOptionTextSelected
                    ]}>
                      {tipo.label}
                    </Text>
                  </View>
                  <View style={[
                    styles.vacunaRadio,
                    formDataSesionEducativa.tipo_sesion === tipo.value && styles.vacunaRadioSelected
                  ]}>
                    {formDataSesionEducativa.tipo_sesion === tipo.value && (
                      <View style={styles.vacunaRadioInner} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* DatePicker para fecha de sesión */}
        <View style={styles.inputContainer}>
          <DatePickerButton
            label="Fecha de Sesión *"
            value={formDataSesionEducativa.fecha_sesion}
            onChange={(date) => updateSesionEducativaField('fecha_sesion', date)}
            disabled={savingSesionEducativaHook}
          />
        </View>

        {/* Switch Asistió */}
        <View style={styles.inputContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Switch
              value={formDataSesionEducativa.asistio || false}
              onValueChange={(value) => updateSesionEducativaField('asistio', value)}
              disabled={savingSesionEducativaHook}
            />
            <Text style={[styles.label, { marginLeft: 8, flex: 1 }]}>
              Asistió a sesión educativa
            </Text>
          </View>
        </View>

        {/* Número de Intervenciones */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputRedApoyo}
            placeholder="Número de intervenciones (opcional)"
            value={formDataSesionEducativa.numero_intervenciones ? String(formDataSesionEducativa.numero_intervenciones) : ''}
            onChangeText={(value) => updateSesionEducativaField('numero_intervenciones', value.replace(/[^0-9]/g, '') || '1')}
            keyboardType="numeric"
            editable={!savingSesionEducativaHook}
          />
        </View>

        {/* Campo de observaciones */}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.inputRedApoyo, styles.textArea]}
            placeholder="Observaciones (opcional)"
            value={formDataSesionEducativa.observaciones}
            onChangeText={(value) => updateSesionEducativaField('observaciones', value)}
            multiline
            numberOfLines={3}
            editable={!savingSesionEducativaHook}
          />
        </View>
      </FormModal>

      {/* Modal de Opciones - Doctores */}
      <OptionsModal
        visible={modalManager.isOpen('optionsDoctores')}
        onClose={() => modalManager.close('optionsDoctores')}
        title="Opciones de Doctores"
        options={[
          {
            icon: 'plus',
            label: 'Asignar Doctor',
            onPress: () => {
              resetFormDoctorWrapper();
              setShowAddDoctor(true);
            },
            color: '#2196F3'
          },
          {
            icon: 'magnify',
            label: 'Ver Doctores Asignados',
            onPress: () => setShowAllDoctores(true),
            color: '#666'
          }
        ]}
      />

      {/* Modal de Historial Completo - Doctores */}
      <HistoryModal
        visible={showAllDoctores}
        onClose={() => setShowAllDoctores(false)}
        title="Doctores Asignados"
        items={doctoresPaciente}
        loading={loadingDoctoresPaciente}
        emptyMessage="No hay doctores asignados"
        renderItem={(doctor, index) => (
          <Card key={`doctor-all-${doctor.id_doctor}-${index}`} style={styles.listItem}>
            <Card.Content>
              <View style={styles.listItemHeader}>
                <Text style={styles.listItemTitle}>
                  {doctor.nombre_completo || `${doctor.nombre} ${doctor.apellido_paterno}`.trim()}
                </Text>
                <Chip 
                  mode="outlined" 
                  style={[
                    styles.statusChip,
                    doctor.activo ? styles.statusActive : styles.statusInactive
                  ]}
                >
                  {doctor.activo ? 'Activo' : 'Inactivo'}
                </Chip>
              </View>
              {doctor.telefono && (
                <Text style={styles.listItemDescription}>📞 {doctor.telefono}</Text>
              )}
              {doctor.institucion_hospitalaria && (
                <Text style={styles.listItemDescription}>{doctor.institucion_hospitalaria}</Text>
              )}
              {doctor.grado_estudio && (
                <Text style={styles.listItemDescription}>🎓 {doctor.grado_estudio}</Text>
              )}
              {doctor.fecha_asignacion && (
                <Text style={styles.listItemSubtitle}>
                  Asignado: {formatearFecha(doctor.fecha_asignacion)}
                </Text>
              )}
              {doctor.observaciones && (
                <Text style={styles.listItemNotes}>{doctor.observaciones}</Text>
              )}
              <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'flex-end' }}>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => {
                    setDoctorSeleccionado(doctor);
                    resetFormDoctor();
                    setShowReplaceDoctor(true);
                  }}
                  style={{ marginRight: 8 }}
                >
                  Reemplazar
                </Button>
                <Button
                  mode="outlined"
                  compact
                  buttonColor={COLORES.ERROR_LIGHT}
                  textColor="#FFFFFF"
                  onPress={() => handleDeleteDoctor(doctor)}
                >
                  Desasignar
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      />

      {/* Modal para Asignar Doctor */}
      <Modal
        visible={showAddDoctor}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}} // Deshabilitado - Solo cierra con botón
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>Asignar Doctor</Title>
              <TouchableOpacity onPress={() => { setShowAddDoctor(false); resetFormDoctor(); }}>
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalFormScrollView} 
              contentContainerStyle={styles.modalFormScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Selección de Doctor */}
              <View style={styles.formSection}>
                <Text style={styles.label}>Doctor *</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.doctoresList}
                >
                  {doctoresList && doctoresList.map((doctor) => (
                    <TouchableOpacity
                      key={doctor.id_doctor || doctor.id}
                      style={[
                        styles.doctorChip,
                        formDataDoctor.id_doctor === (doctor.id_doctor || doctor.id) && styles.doctorChipActive
                      ]}
                      onPress={() => handleSelectDoctor(doctor)}
                    >
                      <Text style={[
                        styles.doctorChipText,
                        formDataDoctor.id_doctor === (doctor.id_doctor || doctor.id) && styles.doctorChipTextActive
                      ]}>
                        {`${doctor.nombre} ${doctor.apellido_paterno}`.trim()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Observaciones */}
              <View style={styles.formSection}>
                <Text style={styles.label}>Observaciones (Opcional)</Text>
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  value={formDataDoctor.observaciones}
                  onChangeText={(text) => updateDoctorField('observaciones', text)}
                  placeholder="Observaciones sobre la asignación..."
                  style={styles.textInput}
                />
              </View>

              <View style={{ padding: 15 }}>
                <Button
                  mode="contained"
                  onPress={handleSaveDoctor}
                  loading={savingDoctor}
                  disabled={savingDoctor || !formDataDoctor.id_doctor}
                  style={{ marginBottom: 10 }}
                >
                  Asignar Doctor
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => { setShowAddDoctor(false); resetFormDoctor(); }}
                  disabled={savingDoctor}
                >
                  Cancelar
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Modal para Reemplazar Doctor */}
      <Modal
        visible={showReplaceDoctor}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}} // Deshabilitado - Solo cierra con botón
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>🔄 Reemplazar Doctor</Title>
              <TouchableOpacity onPress={() => { setShowReplaceDoctor(false); resetFormDoctor(); }}>
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalFormScrollView} 
              contentContainerStyle={styles.modalFormScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {doctorSeleccionado && (
                <View style={styles.formSection}>
                  <Text style={styles.label}>Doctor Actual</Text>
                  <Card style={{ marginBottom: 15 }}>
                    <Card.Content>
                      <Text style={styles.listItemTitle}>
                        {doctorSeleccionado.nombre_completo || `${doctorSeleccionado.nombre} ${doctorSeleccionado.apellido_paterno}`.trim()}
                      </Text>
                      {doctorSeleccionado.fecha_asignacion && (
                        <Text style={styles.listItemSubtitle}>
                          Asignado: {formatearFecha(doctorSeleccionado.fecha_asignacion)}
                        </Text>
                      )}
                    </Card.Content>
                  </Card>
                </View>
              )}

              {/* Selección de Doctor Nuevo */}
              <View style={styles.formSection}>
                <Text style={styles.label}>Doctor Nuevo *</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.doctoresList}
                >
                  {doctoresList && doctoresList
                    .filter(d => (d.id_doctor || d.id) !== (doctorSeleccionado?.id_doctor || doctorSeleccionado?.id))
                    .map((doctor) => (
                    <TouchableOpacity
                      key={doctor.id_doctor || doctor.id}
                      style={[
                        styles.doctorChip,
                        formDataDoctor.id_doctor === (doctor.id_doctor || doctor.id) && styles.doctorChipActive
                      ]}
                      onPress={() => handleSelectDoctor(doctor)}
                    >
                      <Text style={[
                        styles.doctorChipText,
                        formDataDoctor.id_doctor === (doctor.id_doctor || doctor.id) && styles.doctorChipTextActive
                      ]}>
                        {`${doctor.nombre} ${doctor.apellido_paterno}`.trim()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Observaciones */}
              <View style={styles.formSection}>
                <Text style={styles.label}>Observaciones (Opcional)</Text>
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                  value={formDataDoctor.observaciones}
                  onChangeText={(text) => updateDoctorField('observaciones', text)}
                  placeholder="Observaciones sobre el reemplazo..."
                  style={styles.textInput}
                />
              </View>

              <View style={{ padding: 15 }}>
                <Button
                  mode="contained"
                  onPress={handleReplaceDoctor}
                  loading={savingDoctor}
                  disabled={savingDoctor || !formDataDoctor.id_doctor}
                  buttonColor={COLORES.ADVERTENCIA_LIGHT}
                  style={{ marginBottom: 10 }}
                >
                  Reemplazar Doctor
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => { setShowReplaceDoctor(false); resetFormDoctor(); }}
                  disabled={savingDoctor}
                >
                  Cancelar
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Modal de carga para exportación de expediente completo */}
      <Modal
        visible={exportandoExpediente}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          // No permitir cerrar mientras se está generando
        }}
      >
        <View style={styles.loadingModalOverlay}>
          <View style={styles.loadingModalContent}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingModalText}>
              Generando expediente...
            </Text>
            <Text style={styles.loadingModalSubtext}>
              Por favor espera, esto puede tomar unos momentos.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorDetails: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 10,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginTop: 10,
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 10,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  patientInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerDetails: {
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  detailText: {
    fontSize: 14,
    color: '#E3F2FD',
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  exportCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
    backgroundColor: '#F5F5F5',
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  exportButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  expedienteCompletoButton: {
    width: '100%',
    minWidth: '100%',
    backgroundColor: '#1976D2',
    borderColor: '#1565C0',
    marginBottom: 12,
    paddingVertical: 18,
  },
  expedienteCompletoText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  exportButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  exportButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  chatButtonContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chatButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  chatButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  listItemHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 8,
    width: '100%',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 8,
    marginBottom: 2,
    lineHeight: 20,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  listItemDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 18,
  },
  listItemNotes: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 16,
  },
  statusChip: {
    height: 30,
    minHeight: 30,
    justifyContent: 'center',
  },
  statusCompleted: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  statusScheduled: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  statusCancelled: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  statusActive: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  vitalItem: {
    width: '50%',
    marginBottom: 8,
  },
  vitalLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  vitalValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  vitalSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  vitalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 6,
  },
  diagnosisLabel: {
    fontWeight: 'bold',
    color: '#333',
  },
  medicationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  medicationItem: {
    width: '33%',
    marginBottom: 8,
  },
  medicationLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  medicationValue: {
    fontSize: 14,
    color: '#333',
  },
  actionButtonsContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 8,
    elevation: 2,
  },
  editButton: {
    // Estilos específicos para el botón de editar
  },
  changeDoctorButton: {
    // Estilos específicos para el botón de cambiar doctor
  },
  toggleButton: {
    // Estilos específicos para el botón de toggle
  },
  deleteButton: {
    // Estilos específicos para el botón de eliminar
  },
  // Estilos del modal de signos vitales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalOverlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    flex: 1,
    flexDirection: 'column', // ✅ Necesario para que el ScrollView funcione
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingRight: 8, // Reducir padding derecho para dar espacio al botón X
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fillDataButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  fillDataButtonText: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18, // Reducir un poco para dar más espacio
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  closeButtonX: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    textAlign: 'center',
  },
  comorbilidadesContainer: {
    flexDirection: 'column',
    marginTop: 12,
    gap: 12,
  },
  comorbilidadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  comorbilidadChip: {
    marginVertical: 0,
  },
  comorbilidadText: {
    fontSize: 12,
    fontWeight: '500',
  },
  comorbilidadFecha: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginLeft: 4,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  modalListItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  modalListItemHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalListItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  modalListItemSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  
  // Estilos para formulario de signos vitales
  modalFormScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalFormScrollContent: {
    paddingTop: 8,
    paddingBottom: 120, // Espacio para los botones fijos
  },
  formSection: {
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30, // ✅ Más espacio inferior para safe area
    gap: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  modalButton: {
    flex: 1,
    minHeight: 48,
  },
  cancelButton: {
    borderColor: '#666',
  },
  saveButton: {
    // No necesita estilos adicionales
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 10,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
    alignItems: 'flex-end', // Alinea los campos por la parte inferior para compensar labelHint
  },
  formField: {
    flex: 1,
    minWidth: 0, // Permite que flex funcione correctamente
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  formFieldSingle: {
    width: '45%', // Limita el ancho cuando está solo en una fila
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  labelHint: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 6,
    marginTop: -2,
    lineHeight: 12,
    minHeight: 14, // Altura mínima para mantener consistencia
  },
  labelHintSpacer: {
    height: 14, // Espacio equivalente a labelHint para alineación
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
    height: 42,
    color: '#212121',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  inputEnabled: {
    borderColor: '#BDBDBD',
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.7,
  },
  inputContainer: {
    width: '90%',
    alignSelf: 'center',
    marginBottom: 20,
  },
  inputRedApoyo: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  arrowText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  optionTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  checkMark: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  textArea: {
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  imcDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  imcLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  imcValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalFormActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
  },
  modalCancelButton: {
    flex: 1,
    marginRight: 8,
  },
  modalSaveButton: {
    flex: 1,
    marginLeft: 8,
  },
  
  // Estilos para modales de opciones (menú de 3 puntos)
  optionsModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  optionsModalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#f5f5f5',
    minHeight: 44,
  },
  optionText: {
    fontSize: 13,
    color: '#333',
    marginLeft: 4,
    flex: 1,
    flexWrap: 'wrap',
  },
  optionsText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  
  // Estilos para selector de cita en modal de diagnóstico
  citaOption: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  citaOptionSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  citaOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  citaOptionDate: {
    fontSize: 12,
    color: '#666',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  
  // Estilos para medicamento card
  medicamentoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  medicamentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicamentoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    flex: 1,
  },
  // Estilos para checkbox
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  // Estilos para lista de doctores
  doctoresList: {
    flexDirection: 'row',
    marginTop: 8,
  },
  doctorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  doctorChipActive: {
    backgroundColor: '#2196F3',
  },
  doctorChipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  doctorChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Estilos para dropdown de doctor en modal de citas
  doctorDropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  doctorDropdownText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  doctorDropdownPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  doctorDropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  doctorDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  doctorDropdownItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  doctorDropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  doctorDropdownItemTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  // Estilos para textArea
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Estilos para selector de vacunas
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  vacunaSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 8,
    minHeight: 50,
  },
  vacunaSelectorButtonEmpty: {
    borderColor: '#DEE2E6',
  },
  vacunaSelectorButtonText: {
    fontSize: 16,
    color: '#2C3E50',
    flex: 1,
  },
  vacunaSelectorButtonTextPlaceholder: {
    color: '#999',
  },
  vacunaSelectorButtonIcon: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  vacunaSelectorList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    overflow: 'hidden',
    marginBottom: 10,
  },
  vacunaOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  vacunaOptionSelected: {
    backgroundColor: '#E8F5E8',
  },
  vacunaOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vacunaOptionTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  vacunaOptionText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
    marginBottom: 4,
  },
  vacunaOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  vacunaOptionSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  vacunaOptionDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    lineHeight: 16,
  },
  vacunaRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  vacunaRadioSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0F9F0',
  },
  vacunaRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  // Estilos para modal de carga de expediente
  loadingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    minWidth: 250,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingModalText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
  },
  loadingModalSubtext: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

// Componente wrapper con Provider
const DetallePaciente = ({ route, navigation }) => {
  const pacienteId = route.params?.paciente?.id_paciente || route.params?.paciente?.id;
  
  return (
    <DetallePacienteProvider pacienteId={pacienteId}>
      <DetallePacienteContent route={route} navigation={navigation} />
    </DetallePacienteProvider>
  );
};

export default DetallePaciente;
