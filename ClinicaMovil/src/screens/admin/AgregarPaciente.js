import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// Componentes personalizados
import FormField from '../../components/forms/FormField';
import DateInput from '../../components/DateInput';
import DateInputSeparated from '../../components/DateInputSeparated';
import DatePickerButton from '../../components/DatePickerButton';
import DateTimePickerButton from '../../components/DateTimePickerButton';
import EstadoSelector from '../../components/forms/EstadoSelector';
import MunicipioSelector from '../../components/forms/MunicipioSelector';
import VacunaSelector from '../../components/forms/VacunaSelector';
import MedicamentoSelector from '../../components/forms/MedicamentoSelector';

// Hooks personalizados
import usePacienteForm from '../../hooks/usePacienteForm';
import useGestion from '../../hooks/useGestion';
import useTestMode from '../../hooks/useTestMode';

// Servicios
import Logger from '../../services/logger';
import { COLORES, NETWORK_STAGGER } from '../../utils/constantes';
import { pacienteAuthService } from '../../api/authService';
import gestionService from '../../api/gestionService';
import { useAuth } from '../../context/AuthContext';

/**
 * Pantalla para agregar un nuevo paciente
 * Formulario de dos partes: Usuario + Perfil de Paciente
 */
const AgregarPaciente = () => {
  const navigation = useNavigation();
  const { userData: authUserData, userRole } = useAuth();
  
  // Hooks personalizados
  const { 
    loading: formLoading, 
    error: formError, 
    createPacienteProfile, 
    createPacienteCompleto,
    setupPacientePIN,
    createCita,
    createPrimeraConsulta,
    clearError: clearFormError 
  } = usePacienteForm();
  
  const { 
    modulos, 
    loading: modulosLoading, 
    error: modulosError, 
    fetchModulos 
  } = useGestion.useModulos();

  const { 
    doctores: doctoresActivos, 
    loading: doctoresLoading, 
    error: doctoresError 
  } = useGestion.useDoctores('activos');

  // Hook para modo de prueba
  const { 
    isTestModeEnabled, 
    isLoading: testModeLoading, 
    toggleTestMode, 
    fillFormWithTestData 
  } = useTestMode();

  // Estados locales
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: PIN, 2: Datos paciente, 3: Red apoyo, 4: Primera consulta
  const [userData, setUserData] = useState(null); // Datos del usuario creado
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    // Parte 1: Configuración de PIN
    pin: '',
    confirmPin: '',
    deviceId: '', // Se generará automáticamente
    
    // Parte 2: Datos del paciente
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    fechaNacimiento: '',
    curp: '',
    institucionSalud: '',
    sexo: '',
    direccion: '',
    estado: '',
    localidad: '',
    numeroCelular: '',
    idModulo: '',
    activo: true,
    
    // Parte 3: Red de apoyo
    redApoyo: [
      {
        nombreContacto: '',
        numeroCelular: '',
        email: '',
        direccion: '',
        localidad: '',
        parentesco: ''
      }
    ],
    
    // Parte 4: Primera consulta médica (OBLIGATORIO)
    primeraConsulta: {
      enfermedades_cronicas: [],
      motivo_consulta: '',
      anos_padecimiento: {}, // { enfermedad: años }
      diagnostico_agregado: '',
      // ✅ Diagnóstico Basal (según FORMA_2022_OFICIAL)
      diagnostico_basal: {
        es_basal: false, // ① Basal del paciente
        año_diagnostico: '', // Año del Dx
        es_agregado_posterior: false // Dx. (s) Agregados posterior al Basal
      },
      tratamiento_actual: '', // 'con_medicamento' | 'sin_medicamento'
      medicamentos: [],
      tratamiento_sin_medicamento: '',
      // ✅ Tratamiento explícito (según FORMA_2022_OFICIAL)
      recibe_tratamiento_no_farmacologico: false, // ② No Farmacológico
      recibe_tratamiento_farmacologico: false, // ③ Farmacológico
      fecha: new Date().toISOString().split('T')[0], // Fecha actual en formato YYYY-MM-DD
      idDoctor: '',
      observaciones: '',
      signos_vitales: {
        peso_kg: '',
        talla_m: '',
        imc: '',
        medida_cintura_cm: '',
        presion_sistolica: '',
        presion_diastolica: '',
        glucosa_mg_dl: '',
        colesterol_mg_dl: '',
        // ✅ Colesterol LDL/HDL (solo para Hipercolesterolemia/Dislipidemia)
        colesterol_ldl: '', // LDL - Solo para pacientes con diagnóstico
        colesterol_hdl: '', // HDL - Solo para pacientes con diagnóstico
        trigliceridos_mg_dl: '',
        // ✅ HbA1c (%) - Campo obligatorio para criterios de acreditación
        hba1c_porcentaje: '', // *HbA1c (%) - Campo obligatorio
        edad_paciente_en_medicion: '', // Edad en medición (para validar rangos: 20-59 años vs 60+ años)
        edadEditable: false, // Flag para permitir edición manual de la edad
        observaciones: ''
      },
      vacunas: []
    }
  });
  
  const [errors, setErrors] = useState({});

  // Pre-seleccionar el doctor actual si el usuario es doctor
  useEffect(() => {
    if ((userRole === 'Doctor' || userRole === 'doctor') && 
        authUserData?.id_doctor && 
        doctoresActivos && 
        doctoresActivos.length > 0 &&
        !formData.primeraConsulta.idDoctor) {
      // Buscar si el doctor actual está en la lista de doctores activos
      const currentDoctor = doctoresActivos.find(d => d.id_doctor === authUserData.id_doctor);
      if (currentDoctor) {
        setFormData(prev => ({
          ...prev,
          primeraConsulta: {
            ...prev.primeraConsulta,
            idDoctor: currentDoctor.id_doctor.toString()
          }
        }));
        Logger.info('AgregarPaciente: Doctor actual pre-seleccionado automáticamente', {
          doctorId: authUserData.id_doctor
        });
      }
    }
  }, [userRole, authUserData?.id_doctor, doctoresActivos, formData.primeraConsulta.idDoctor]);

  // Opciones para formularios médicos
  const enfermedadesCronicas = [
    'Diabetes', 'Hipertensión', 'Obesidad', 'Dislipidemia', 'Enfermedad renal crónica',
    'EPOC', 'Enfermedad cardiovascular', 'Tuberculosis', 'Asma', 'Tabaquismo', 'Otro'
  ];

  const motivosConsulta = [
    'Revisión general', 'Control de diabetes', 'Control de hipertensión',
    'Síntomas nuevos', 'Seguimiento de tratamiento', 'Consulta preventiva',
    'Emergencia', 'Otros'
  ];

  const medicamentosComunes = [
    'Metformina', 'Insulina', 'Losartán', 'Amlodipino', 'Atorvastatina',
    'Omeprazol', 'Paracetamol', 'Ibuprofeno', 'Aspirina', 'Otros'
  ];

  /** Cargar módulos con retraso para no saturar conexiones (Android limita ~5 por host). */
  useEffect(() => {
    const t = setTimeout(() => {
      Logger.info('AgregarPaciente: Cargando módulos');
      fetchModulos();
    }, NETWORK_STAGGER.MODULOS_FORM_MS);
    return () => clearTimeout(t);
  }, [fetchModulos]);

  /**
   * Calcular edad automáticamente cuando cambia la fecha de nacimiento
   */
  useEffect(() => {
    if (formData.fechaNacimiento && !formData.primeraConsulta.signos_vitales.edadEditable) {
      try {
        const fechaNac = new Date(formData.fechaNacimiento);
        const hoy = new Date();
        let edadCalculada = hoy.getFullYear() - fechaNac.getFullYear();
        const mesDiff = hoy.getMonth() - fechaNac.getMonth();
        if (mesDiff < 0 || (mesDiff === 0 && hoy.getDate() < fechaNac.getDate())) {
          edadCalculada--;
        }
        
        // Solo actualizar si la edad calculada es válida y diferente a la actual
        if (edadCalculada >= 0 && edadCalculada <= 120) {
          const edadActual = formData.primeraConsulta.signos_vitales.edad_paciente_en_medicion;
          if (edadActual !== edadCalculada.toString()) {
            setFormData(prev => ({
              ...prev,
              primeraConsulta: {
                ...prev.primeraConsulta,
                signos_vitales: {
                  ...prev.primeraConsulta.signos_vitales,
                  edad_paciente_en_medicion: edadCalculada.toString()
                }
              }
            }));
          }
        }
      } catch (error) {
        Logger.warn('Error calculando edad automáticamente:', error);
      }
    }
  }, [formData.fechaNacimiento, formData.primeraConsulta.signos_vitales.edadEditable]);

  // Función para llenar formulario con datos de prueba
  const handleFillTestData = () => {
    if (doctoresActivos && doctoresActivos.length > 0 && modulos && modulos.length > 0) {
      const doctor = doctoresActivos[0]; // Usar el primer doctor disponible
      const modulo = modulos[0]; // Usar el primer módulo disponible
      
      fillFormWithTestData(setFormData, doctor.id_doctor, modulo.id_modulo);
      
      // Mostrar mensaje de confirmación
      Alert.alert(
        'Datos de Prueba Cargados', 
        'El formulario ha sido llenado con datos aleatorios para testing.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Datos Requeridos', 
        'Necesitas tener doctores y módulos disponibles para generar datos de prueba.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Validar datos de PIN (Parte 1)
   * @param {Object} accumulatedErrors - Objeto para acumular errores (opcional)
   * @returns {boolean} - true si es válido
   */
  const validatePinData = (accumulatedErrors = {}) => {
    // Validar PINs débiles en frontend también
    const weakPINs = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
    
    let hasPinErrors = false;
    
    if (!formData.pin || !formData.pin.trim()) {
      accumulatedErrors.pin = 'El PIN es requerido';
      hasPinErrors = true;
    } else if (!/^\d{4}$/.test(formData.pin)) {
      accumulatedErrors.pin = 'El PIN debe tener exactamente 4 dígitos';
      hasPinErrors = true;
    } else if (weakPINs.includes(formData.pin)) {
      accumulatedErrors.pin = 'El PIN es demasiado débil. Elige un PIN más seguro';
      hasPinErrors = true;
    }
    
    if (!formData.confirmPin || !formData.confirmPin.trim()) {
      accumulatedErrors.confirmPin = 'Confirma el PIN';
      hasPinErrors = true;
    } else if (formData.pin !== formData.confirmPin) {
      accumulatedErrors.confirmPin = 'Los PINs no coinciden';
      hasPinErrors = true;
    }
    
    return !hasPinErrors;
  };

  /**
   * Validar datos del paciente (Parte 2)
   * @param {Object} accumulatedErrors - Objeto para acumular errores
   * @returns {boolean} - true si es válido
   */
  const validatePacienteData = (accumulatedErrors = {}) => {
    if (!formData.nombre.trim()) {
      accumulatedErrors.nombre = 'El nombre es requerido';
    }
    
    if (!formData.apellidoPaterno.trim()) {
      accumulatedErrors.apellidoPaterno = 'El apellido paterno es requerido';
    }
    
    if (!formData.fechaNacimiento.trim()) {
      accumulatedErrors.fechaNacimiento = 'La fecha de nacimiento es requerida';
    }
    
    if (!formData.curp.trim()) {
      accumulatedErrors.curp = 'El CURP es requerido';
    } else if (!/^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/.test(formData.curp.toUpperCase())) {
      accumulatedErrors.curp = 'El CURP no tiene un formato válido';
    }
    
    if (!formData.institucionSalud) {
      accumulatedErrors.institucionSalud = 'Debe seleccionar una institución de salud';
    }
    
    if (!formData.sexo) {
      accumulatedErrors.sexo = 'Debe seleccionar el sexo';
    }
    
    if (!formData.numeroCelular.trim()) {
      accumulatedErrors.numeroCelular = 'El número celular es requerido';
    }
    
    if (!formData.direccion.trim()) {
      accumulatedErrors.direccion = 'La dirección es requerida';
    }
    
    // Validar estado (obligatorio)
    if (!formData.estado || !formData.estado.trim()) {
      accumulatedErrors.estado = 'El estado es requerido';
    }
    
    // Validar localidad (requiere estado seleccionado)
    if (!formData.localidad || !formData.localidad.trim()) {
      accumulatedErrors.localidad = 'La localidad es requerida';
    } else if (!formData.estado || !formData.estado.trim()) {
      accumulatedErrors.localidad = 'Debe seleccionar un estado primero';
    }
    
    if (!formData.idModulo) {
      accumulatedErrors.idModulo = 'Selecciona un módulo';
    }
    
    // Verificar si hay errores de campos del paciente
    const pacienteErrorKeys = ['nombre', 'apellidoPaterno', 'fechaNacimiento', 'curp', 'institucionSalud', 
                               'sexo', 'numeroCelular', 'direccion', 'estado', 'localidad', 'idModulo'];
    return !pacienteErrorKeys.some(key => accumulatedErrors[key]);
  };

  /**
   * Validar datos de red de apoyo (Parte 3)
   * @param {Object} accumulatedErrors - Objeto para acumular errores
   * @returns {boolean} - true si es válido
   */
  const validateRedApoyoData = (accumulatedErrors = {}) => {
    formData.redApoyo.forEach((contacto, index) => {
      if (!contacto.nombreContacto.trim()) {
        accumulatedErrors[`redApoyo_${index}_nombreContacto`] = 'El nombre del contacto es requerido';
      }
      
      if (!contacto.numeroCelular.trim()) {
        accumulatedErrors[`redApoyo_${index}_numeroCelular`] = 'El número celular es requerido';
      }
      
      if (!contacto.parentesco.trim()) {
        accumulatedErrors[`redApoyo_${index}_parentesco`] = 'El parentesco es requerido';
      }
    });
    
    // Verificar si hay errores de red de apoyo
    const redApoyoErrorKeys = Object.keys(accumulatedErrors).filter(key => key.startsWith('redApoyo_'));
    return redApoyoErrorKeys.length === 0;
  };

  /**
   * Validar datos de primera consulta (Parte 4) - OBLIGATORIO
   * @param {Object} accumulatedErrors - Objeto para acumular errores
   * @returns {boolean} - true si es válido
   */
  const validatePrimeraConsultaData = (accumulatedErrors = {}) => {
    // Validar enfermedades crónicas
    if (formData.primeraConsulta.enfermedades_cronicas.length === 0) {
      accumulatedErrors.enfermedades_cronicas = 'Debe seleccionar al menos una enfermedad crónica';
    }
    
    // Validar motivo de consulta
    if (!formData.primeraConsulta.motivo_consulta.trim()) {
      accumulatedErrors.motivo_consulta = 'El motivo de consulta es requerido';
    }
    
    // Validar años de padecimiento para cada enfermedad seleccionada
    formData.primeraConsulta.enfermedades_cronicas.forEach(enfermedad => {
      const anosValue = formData.primeraConsulta.anos_padecimiento?.[enfermedad];
      // Convertir a string para validar (puede ser número o string)
      const anosString = anosValue ? String(anosValue).trim() : '';
      if (!anosString || anosString === '' || anosString === '0') {
        accumulatedErrors[`anos_${enfermedad}`] = `Debe especificar los años con ${enfermedad}`;
      }
    });
    
    // Validar diagnóstico agregado
    if (!formData.primeraConsulta.diagnostico_agregado.trim()) {
      accumulatedErrors.diagnostico_agregado = 'El diagnóstico agregado es requerido';
    }
    
    // Validar tratamiento actual
    if (!formData.primeraConsulta.tratamiento_actual) {
      accumulatedErrors.tratamiento_actual = 'Debe seleccionar el tipo de tratamiento';
    }
    
    // Si es con medicamento, validar medicamentos
    if (formData.primeraConsulta.tratamiento_actual === 'con_medicamento') {
      if (formData.primeraConsulta.medicamentos.length === 0) {
        accumulatedErrors.medicamentos = 'Debe especificar al menos un medicamento';
      }
    }
    
    // Si es sin medicamento, validar tratamiento alternativo
    if (formData.primeraConsulta.tratamiento_actual === 'sin_medicamento') {
      if (!formData.primeraConsulta.tratamiento_sin_medicamento.trim()) {
        accumulatedErrors.tratamiento_sin_medicamento = 'Debe especificar el tratamiento sin medicamento';
      }
    }
    
    // Validar fecha de consulta
    if (!formData.primeraConsulta.fecha.trim()) {
      accumulatedErrors.fecha_consulta = 'La fecha de consulta es requerida';
    }
    
    // Validar doctor asignado
    if (!formData.primeraConsulta.idDoctor) {
      accumulatedErrors.idDoctor = 'Debe seleccionar un doctor para la consulta';
    }
    
    // Validar observaciones
    if (!formData.primeraConsulta.observaciones.trim()) {
      accumulatedErrors.observaciones = 'Las observaciones son requeridas';
    }
    
    // Validar signos vitales básicos
    if (!formData.primeraConsulta.signos_vitales.peso_kg.trim()) {
      accumulatedErrors.peso_kg = 'El peso es requerido';
    }
    
    if (!formData.primeraConsulta.signos_vitales.talla_m.trim()) {
      accumulatedErrors.talla_m = 'La talla es requerida';
    }
    
    if (!formData.primeraConsulta.signos_vitales.presion_sistolica.trim()) {
      accumulatedErrors.presion_sistolica = 'La presión sistólica es requerida';
    }
    
    if (!formData.primeraConsulta.signos_vitales.presion_diastolica.trim()) {
      accumulatedErrors.presion_diastolica = 'La presión diastólica es requerida';
    }

    // ✅ Validar HbA1c (%) - Campo obligatorio para criterios de acreditación
    if (!formData.primeraConsulta.signos_vitales.hba1c_porcentaje.trim()) {
      accumulatedErrors.hba1c_porcentaje = 'La HbA1c (%) es requerida para criterios de acreditación';
    } else {
      const hba1c = parseFloat(formData.primeraConsulta.signos_vitales.hba1c_porcentaje);
      if (isNaN(hba1c) || hba1c < 4.0 || hba1c > 15.0) {
        accumulatedErrors.hba1c_porcentaje = 'La HbA1c debe estar entre 4.0% y 15.0%';
      }
    }

    // ✅ Validar edad en medición - Requerida para validar rangos de HbA1c
    if (!formData.primeraConsulta.signos_vitales.edad_paciente_en_medicion.trim()) {
      accumulatedErrors.edad_paciente_en_medicion = 'La edad en medición es requerida';
    } else {
      const edad = parseInt(formData.primeraConsulta.signos_vitales.edad_paciente_en_medicion, 10);
      if (isNaN(edad) || edad < 0 || edad > 150) {
        accumulatedErrors.edad_paciente_en_medicion = 'La edad debe ser un número válido entre 0 y 150 años';
      }
    }

    // ✅ Validar Colesterol LDL/HDL si el paciente tiene Hipercolesterolemia/Dislipidemia
    const tieneDislipidemia = formData.primeraConsulta.enfermedades_cronicas.includes('Dislipidemia') || 
                               formData.primeraConsulta.enfermedades_cronicas.some(e => e.toLowerCase().includes('colesterol'));
    if (tieneDislipidemia) {
      if (!formData.primeraConsulta.signos_vitales.colesterol_ldl.trim()) {
        accumulatedErrors.colesterol_ldl = 'El colesterol LDL es requerido para pacientes con Dislipidemia';
      }
      if (!formData.primeraConsulta.signos_vitales.colesterol_hdl.trim()) {
        accumulatedErrors.colesterol_hdl = 'El colesterol HDL es requerido para pacientes con Dislipidemia';
      }
    }

    // ✅ Validar diagnóstico basal si está marcado
    if (formData.primeraConsulta.diagnostico_basal.es_basal) {
      if (!formData.primeraConsulta.diagnostico_basal.año_diagnostico.trim()) {
        accumulatedErrors.año_diagnostico = 'El año del diagnóstico es requerido cuando es diagnóstico basal';
      } else {
        const año = parseInt(formData.primeraConsulta.diagnostico_basal.año_diagnostico, 10);
        const añoActual = new Date().getFullYear();
        if (isNaN(año) || año < 1900 || año > añoActual) {
          accumulatedErrors.año_diagnostico = `El año del diagnóstico debe ser entre 1900 y ${añoActual}`;
        }
      }
    }
    
    // Verificar si hay errores de primera consulta
    const consultaErrorKeys = ['enfermedades_cronicas', 'motivo_consulta', 'diagnostico_agregado', 
                               'tratamiento_actual', 'medicamentos', 'tratamiento_sin_medicamento',
                               'fecha_consulta', 'idDoctor', 'observaciones', 'peso_kg', 'talla_m',
                               'presion_sistolica', 'presion_diastolica'];
    const hasConsultaErrors = consultaErrorKeys.some(key => accumulatedErrors[key]) ||
                               Object.keys(accumulatedErrors).some(key => key.startsWith('anos_'));
    
    return !hasConsultaErrors;
  };

  // Funciones auxiliares para primera consulta
  const toggleEnfermedadCronica = (enfermedad) => {
    // Si es "Otro", mostrar alerta para SÍNDROME METABÓLICO
    if (enfermedad === 'Otro') {
      Alert.alert(
        'Síndrome Metabólico',
        '¿Desea agregar SÍNDROME METABÓLICO a las enfermedades crónicas?',
        [
          {
            text: 'Cancelar',
            style: 'cancel'
          },
          {
            text: 'Agregar',
            onPress: () => {
              setFormData(prev => ({
                ...prev,
                primeraConsulta: {
                  ...prev.primeraConsulta,
                  enfermedades_cronicas: prev.primeraConsulta.enfermedades_cronicas.includes('SÍNDROME METABÓLICO')
                    ? prev.primeraConsulta.enfermedades_cronicas.filter(e => e !== 'SÍNDROME METABÓLICO')
                    : [...prev.primeraConsulta.enfermedades_cronicas, 'SÍNDROME METABÓLICO']
                }
              }));
            }
          }
        ]
      );
      return;
    }

    // Para las demás enfermedades, comportamiento normal
    setFormData(prev => ({
      ...prev,
      primeraConsulta: {
        ...prev.primeraConsulta,
        enfermedades_cronicas: prev.primeraConsulta.enfermedades_cronicas.includes(enfermedad)
          ? prev.primeraConsulta.enfermedades_cronicas.filter(e => e !== enfermedad)
          : [...prev.primeraConsulta.enfermedades_cronicas, enfermedad]
      }
    }));
  };

  const updateAnosPadecimiento = (enfermedad, anos) => {
    setFormData(prev => ({
      ...prev,
      primeraConsulta: {
        ...prev.primeraConsulta,
        anos_padecimiento: {
          ...prev.primeraConsulta.anos_padecimiento,
          [enfermedad]: anos
        }
      }
    }));
  };

  const addMedicamento = () => {
    setFormData(prev => ({
      ...prev,
      primeraConsulta: {
        ...prev.primeraConsulta,
        medicamentos: [...prev.primeraConsulta.medicamentos, '']
      }
    }));
  };

  const updateMedicamento = (index, medicamento) => {
    setFormData(prev => ({
      ...prev,
      primeraConsulta: {
        ...prev.primeraConsulta,
        medicamentos: prev.primeraConsulta.medicamentos.map((med, i) => 
          i === index ? medicamento : med
        )
      }
    }));
  };

  const removeMedicamento = (index) => {
    setFormData(prev => ({
      ...prev,
      primeraConsulta: {
        ...prev.primeraConsulta,
        medicamentos: prev.primeraConsulta.medicamentos.filter((_, i) => i !== index)
      }
    }));
  };

  const addVacuna = () => {
    setFormData(prev => ({
      ...prev,
      primeraConsulta: {
        ...prev.primeraConsulta,
        vacunas: [...prev.primeraConsulta.vacunas, { vacuna: '', fecha_aplicacion: '', lote_vacuna: '' }]
      }
    }));
  };

  const updateVacuna = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      primeraConsulta: {
        ...prev.primeraConsulta,
        vacunas: prev.primeraConsulta.vacunas.map((vacuna, i) => 
          i === index ? { ...vacuna, [field]: value } : vacuna
        )
      }
    }));
  };

  const removeVacuna = (index) => {
    setFormData(prev => ({
      ...prev,
      primeraConsulta: {
        ...prev.primeraConsulta,
        vacunas: prev.primeraConsulta.vacunas.filter((_, i) => i !== index)
      }
    }));
  };

  /**
   * Validar todos los pasos del formulario de una vez
   * @returns {{isValid: boolean, errors: Object, errorMessage: string}}
   */
  const validateAllSteps = () => {
    // Crear un objeto único para acumular todos los errores
    const allErrors = {};
    
    // Validar todos los pasos acumulando errores en el mismo objeto
    const pinValid = validatePinData(allErrors);
    const pacienteValid = validatePacienteData(allErrors);
    const redApoyoValid = validateRedApoyoData(allErrors);
    const consultaValid = validatePrimeraConsultaData(allErrors);
    
    const isValid = pinValid && pacienteValid && redApoyoValid && consultaValid;
    
    // Construir mensaje de error específico
    let errorMessage = '';
    if (!isValid) {
      errorMessage = 'Por favor completa los siguientes campos requeridos:\n\n';
      if (!pinValid) errorMessage += '• Paso 1: PIN\n';
      if (!pacienteValid) errorMessage += '• Paso 2: Datos del paciente\n';
      if (!redApoyoValid) errorMessage += '• Paso 3: Red de apoyo\n';
      if (!consultaValid) errorMessage += '• Paso 4: Primera consulta\n';
    }
    
    return {
      isValid,
      errors: allErrors,
      errorMessage
    };
  };

  /**
   * Crear paciente completo con primera consulta (Nuevo flujo)
   */
  const handleCreatePaciente = async () => {
    Logger.info('Iniciando creación de paciente...');
    Logger.debug('Estado actual del formulario:', {
      pin: formData.pin,
      confirmPin: formData.confirmPin,
      nombre: formData.nombre,
      apellidoPaterno: formData.apellidoPaterno
    });
    
    // Validar todos los pasos de una vez con validación centralizada
    const validation = validateAllSteps();
    
    Logger.debug('Resultados de validación:', {
      isValid: validation.isValid,
      errorCount: Object.keys(validation.errors).length,
      errors: validation.errors
    });

    if (!validation.isValid) {
      // Actualizar el estado de errores una sola vez con todos los errores
      setErrors(validation.errors);
      
      Logger.warn('Validación falló:', validation.errorMessage);
      Alert.alert('Campos Requeridos', validation.errorMessage);
      return;
    }
    
    // Si todo es válido, limpiar errores
    setErrors({});

    try {
      setIsSubmitting(true);
      Logger.info('AgregarPaciente: Iniciando creación completa del paciente');
      
      // Generar device ID único
      const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Preparar datos del paciente completo
      // Validar que los campos requeridos no estén vacíos antes de enviar
      if (!formData.estado || !formData.estado.trim()) {
        Logger.error('AgregarPaciente: Campo estado faltante o vacío', { estado: formData.estado });
        Alert.alert('Error', 'El campo Estado es requerido. Por favor, selecciona un estado.');
        setIsSubmitting(false);
        return;
      }

      const pacienteData = {
        nombre: formData.nombre?.trim() || '',
        apellido_paterno: formData.apellidoPaterno?.trim() || '',
        apellido_materno: formData.apellidoMaterno?.trim() || '',
        fecha_nacimiento: formData.fechaNacimiento || '',
        curp: formData.curp?.trim() || null,
        institucion_salud: formData.institucionSalud || null,
        sexo: formData.sexo || null,
        direccion: formData.direccion?.trim() || null,
        estado: formData.estado?.trim() || '', // ✅ Asegurar que estado no sea null/undefined
        localidad: formData.localidad?.trim() || null,
        numero_celular: formData.numeroCelular?.trim() || null,
        id_modulo: parseInt(formData.idModulo) || null,
        activo: formData.activo !== undefined ? formData.activo : true,
        pin: formData.pin || '',
        device_id: deviceId
      };

      // Log de validación antes de enviar
      Logger.info('AgregarPaciente: Datos del paciente preparados', {
        nombre: pacienteData.nombre,
        apellido_paterno: pacienteData.apellido_paterno,
        fecha_nacimiento: pacienteData.fecha_nacimiento ? 'presente' : 'faltante',
        estado: pacienteData.estado || 'FALTANTE',
        id_modulo: pacienteData.id_modulo,
        hasPin: !!pacienteData.pin
      });

      // Crear paciente completo (usuario + paciente + PIN)
      const result = await createPacienteCompleto(pacienteData);
      
      if (result.success) {
        Logger.info('AgregarPaciente: Paciente creado exitosamente', { 
          pacienteId: result.data?.id_paciente 
        });
        
        const pacienteId = result.data.id_paciente;
        
        // Si el usuario es doctor, asignar automáticamente el paciente a ese doctor
        if ((userRole === 'Doctor' || userRole === 'doctor') && authUserData?.id_doctor) {
          try {
            Logger.info('AgregarPaciente: Asignando paciente automáticamente al doctor que lo creó', {
              doctorId: authUserData.id_doctor,
              pacienteId
            });
            
            // Usar assignDoctorToPaciente que permite tanto Admin como Doctor
            // (assignPatientToDoctor solo permite Admin)
            await gestionService.assignDoctorToPaciente(
              pacienteId,
              authUserData.id_doctor,
              'Paciente creado por el doctor'
            );
            
            Logger.success('AgregarPaciente: Paciente asignado automáticamente al doctor', {
              doctorId: authUserData.id_doctor,
              pacienteId
            });
          } catch (error) {
            Logger.error('AgregarPaciente: Error asignando paciente al doctor', {
              error: error.message,
              doctorId: authUserData.id_doctor,
              pacienteId
            });
            // No bloquear el flujo si falla la asignación, solo loguear el error
          }
        }
        
        // Crear contactos de red de apoyo
        if (formData.redApoyo && Array.isArray(formData.redApoyo) && formData.redApoyo.length > 0) {
          Logger.info('AgregarPaciente: Creando contactos de red de apoyo', {
            total: formData.redApoyo.length
          });
          
          // Crear contactos de red de apoyo usando el servicio importado
          
          for (let i = 0; i < formData.redApoyo.length; i++) {
            const contacto = formData.redApoyo[i];
            
            // Validar que tenga al menos nombre y número celular (requeridos por backend)
            if (contacto.nombreContacto && contacto.nombreContacto.trim()) {
              try {
                const redApoyoData = {
                  nombre_contacto: contacto.nombreContacto.trim(),
                  numero_celular: contacto.numeroCelular?.trim() || null,
                  email: contacto.email?.trim() || null,
                  direccion: contacto.direccion?.trim() || null,
                  localidad: contacto.localidad?.trim() || null,
                  parentesco: contacto.parentesco?.trim() || null
                };
                
                await gestionService.createPacienteRedApoyo(pacienteId, redApoyoData);
                Logger.info(`AgregarPaciente: Contacto ${i + 1} de red de apoyo creado`, {
                  nombre: contacto.nombreContacto
                });
              } catch (error) {
                Logger.error(`AgregarPaciente: Error creando contacto ${i + 1} de red de apoyo`, {
                  error: error.message,
                  contacto
                });
                // Continuar con los demás contactos aunque uno falle
              }
            } else {
              Logger.warn(`AgregarPaciente: Contacto ${i + 1} omitido: sin nombre`, { contacto });
            }
          }
        }
        
        // Crear la primera consulta completa
        // ✅ Incluir todos los campos según FORMA_2022_OFICIAL
        const signosVitalesCompletos = {
          ...formData.primeraConsulta.signos_vitales,
          // Convertir valores numéricos a números si son strings
          peso_kg: formData.primeraConsulta.signos_vitales.peso_kg ? parseFloat(formData.primeraConsulta.signos_vitales.peso_kg) : null,
          talla_m: formData.primeraConsulta.signos_vitales.talla_m ? parseFloat(formData.primeraConsulta.signos_vitales.talla_m) : null,
          medida_cintura_cm: formData.primeraConsulta.signos_vitales.medida_cintura_cm ? parseFloat(formData.primeraConsulta.signos_vitales.medida_cintura_cm) : null,
          presion_sistolica: formData.primeraConsulta.signos_vitales.presion_sistolica ? parseFloat(formData.primeraConsulta.signos_vitales.presion_sistolica) : null,
          presion_diastolica: formData.primeraConsulta.signos_vitales.presion_diastolica ? parseFloat(formData.primeraConsulta.signos_vitales.presion_diastolica) : null,
          glucosa_mg_dl: formData.primeraConsulta.signos_vitales.glucosa_mg_dl ? parseFloat(formData.primeraConsulta.signos_vitales.glucosa_mg_dl) : null,
          colesterol_mg_dl: formData.primeraConsulta.signos_vitales.colesterol_mg_dl ? parseFloat(formData.primeraConsulta.signos_vitales.colesterol_mg_dl) : null,
          // ✅ Nuevos campos según FORMA_2022_OFICIAL
          colesterol_ldl: formData.primeraConsulta.signos_vitales.colesterol_ldl ? parseFloat(formData.primeraConsulta.signos_vitales.colesterol_ldl) : null,
          colesterol_hdl: formData.primeraConsulta.signos_vitales.colesterol_hdl ? parseFloat(formData.primeraConsulta.signos_vitales.colesterol_hdl) : null,
          trigliceridos_mg_dl: formData.primeraConsulta.signos_vitales.trigliceridos_mg_dl ? parseFloat(formData.primeraConsulta.signos_vitales.trigliceridos_mg_dl) : null,
          hba1c_porcentaje: formData.primeraConsulta.signos_vitales.hba1c_porcentaje ? parseFloat(formData.primeraConsulta.signos_vitales.hba1c_porcentaje) : null,
          edad_paciente_en_medicion: formData.primeraConsulta.signos_vitales.edad_paciente_en_medicion ? parseInt(formData.primeraConsulta.signos_vitales.edad_paciente_en_medicion, 10) : null,
        };

        const consultaData = {
          id_paciente: pacienteId,
          id_doctor: parseInt(formData.primeraConsulta.idDoctor),
          fecha_cita: formData.primeraConsulta.fecha,
          motivo: formData.primeraConsulta.motivo_consulta,
          observaciones: formData.primeraConsulta.observaciones,
          asistencia: false,
          motivo_no_asistencia: null,
          
          diagnostico: {
            descripcion: `Enfermedades crónicas: ${formData.primeraConsulta.enfermedades_cronicas.join(', ')}. ${formData.primeraConsulta.diagnostico_agregado}`
          },
          
          plan_medicacion: {
            observaciones: formData.primeraConsulta.tratamiento_actual === 'con_medicamento' 
              ? `Medicamentos: ${formData.primeraConsulta.medicamentos.join(', ')}`
              : formData.primeraConsulta.tratamiento_sin_medicamento,
            fecha_inicio: formData.primeraConsulta.fecha
          },
          
          signos_vitales: signosVitalesCompletos,
          vacunas: formData.primeraConsulta.vacunas,
          
          // Comorbilidades para asociar al paciente
          comorbilidades: formData.primeraConsulta.enfermedades_cronicas,
          
          // ✅ Años de padecimiento por enfermedad (para asociar a cada comorbilidad)
          anos_padecimiento: formData.primeraConsulta.anos_padecimiento,
          
          // ✅ Campos adicionales según FORMA_2022_OFICIAL
          diagnostico_basal: formData.primeraConsulta.diagnostico_basal,
          tratamiento_explicito: {
            recibe_tratamiento_no_farmacologico: formData.primeraConsulta.recibe_tratamiento_no_farmacologico,
            recibe_tratamiento_farmacologico: formData.primeraConsulta.recibe_tratamiento_farmacologico
          }
        };

        const consultaResult = await createPrimeraConsulta(consultaData);
        
        if (consultaResult.success) {
          Alert.alert(
            'Éxito',
            'Paciente creado exitosamente con primera consulta médica programada',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack()
              }
            ]
          );
        } else {
          throw new Error(consultaResult.error || 'Error al crear primera consulta');
        }
      } else {
        throw new Error(result.error || 'Error al crear paciente');
      }
      
    } catch (error) {
      Logger.error('AgregarPaciente: Error creando paciente', error);
      Alert.alert('Error', 'No se pudo crear el paciente. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Agregar contacto a red de apoyo
   */
  const addRedApoyoContact = () => {
    setFormData(prev => ({
      ...prev,
      redApoyo: [...prev.redApoyo, {
        nombreContacto: '',
        numeroCelular: '',
        email: '',
        direccion: '',
        localidad: '',
        parentesco: ''
      }]
    }));
  };

  /**
   * Eliminar contacto de red de apoyo
   */
  const removeRedApoyoContact = (index) => {
    if (formData.redApoyo.length > 1) {
      setFormData(prev => ({
        ...prev,
        redApoyo: prev.redApoyo.filter((_, i) => i !== index)
      }));
    }
  };

  /**
   * Actualizar contacto de red de apoyo
   */
  const updateRedApoyoContact = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      redApoyo: prev.redApoyo.map((contacto, i) => 
        i === index ? { ...contacto, [field]: value } : contacto
      )
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {currentStep === 1 ? 'Configurar PIN' : 
           currentStep === 2 ? 'Datos del Paciente' : 
           currentStep === 3 ? 'Red de Apoyo' :
           'Primera Consulta'}
        </Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.testModeButton, isTestModeEnabled && styles.testModeButtonActive]} 
            onPress={toggleTestMode}
          >
            <Text style={styles.testModeButtonText}>
              {isTestModeEnabled ? '🧪' : '⚙️'}
            </Text>
          </TouchableOpacity>
          
          {isTestModeEnabled && (
            <TouchableOpacity 
              style={styles.fillDataButton} 
              onPress={handleFillTestData}
            >
              <Text style={styles.fillDataButtonText}>🎲</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Indicador de progreso */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressStep, currentStep >= 1 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, currentStep >= 1 && styles.progressStepTextActive]}>1</Text>
        </View>
        <View style={[styles.progressLine, currentStep >= 2 && styles.progressLineActive]} />
        <View style={[styles.progressStep, currentStep >= 2 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, currentStep >= 2 && styles.progressStepTextActive]}>2</Text>
        </View>
        <View style={[styles.progressLine, currentStep >= 3 && styles.progressLineActive]} />
        <View style={[styles.progressStep, currentStep >= 3 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, currentStep >= 3 && styles.progressStepTextActive]}>3</Text>
        </View>
        <View style={[styles.progressLine, currentStep >= 4 && styles.progressLineActive]} />
        <View style={[styles.progressStep, currentStep >= 4 && styles.progressStepActive]}>
          <Text style={[styles.progressStepText, currentStep >= 4 && styles.progressStepTextActive]}>4</Text>
        </View>
      </View>

      {/* Contenido */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 ? (
            // PARTE 1: Configuración de PIN
            <View style={styles.formContainer}>
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>🔐 Configurar PIN</Text>
                <Text style={styles.stepDescription}>
                  Configura un PIN de 4 dígitos para el acceso del paciente
                </Text>
              </View>

              <FormField
                label="PIN de 4 dígitos *"
                value={formData.pin}
                onChangeText={(text) => {
                  setFormData({...formData, pin: text});
                }}
                placeholder="1234"
                keyboardType="numeric"
                maxLength={4}
                error={errors.pin}
              />

              <FormField
                label="Confirmar PIN *"
                value={formData.confirmPin}
                onChangeText={(text) => {
                  setFormData({...formData, confirmPin: text});
                }}
                placeholder="1234"
                keyboardType="numeric"
                maxLength={4}
                error={errors.confirmPin}
              />

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={() => setCurrentStep(2)}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>Continuar a Datos del Paciente →</Text>
              </TouchableOpacity>
            </View>
          ) : currentStep === 2 ? (
            // PARTE 2: Datos del Paciente
            <View style={styles.formContainer}>
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>🏥 Datos del Paciente</Text>
                <Text style={styles.stepDescription}>
                  Completa la información médica y personal del paciente
                </Text>
                
                {/* Indicador de PIN configurado */}
                <View style={styles.userCreatedIndicator}>
                  <Text style={styles.userCreatedText}>🔐 PIN configurado: {formData.pin}</Text>
                </View>
              </View>

              <FormField
                label="Nombre *"
                value={formData.nombre}
                onChangeText={(text) => setFormData({...formData, nombre: text})}
                placeholder="Nombre del paciente"
                error={errors.nombre}
              />

              <FormField
                label="Apellido Paterno *"
                value={formData.apellidoPaterno}
                onChangeText={(text) => setFormData({...formData, apellidoPaterno: text})}
                placeholder="Apellido paterno"
                error={errors.apellidoPaterno}
              />

              <FormField
                label="Apellido Materno"
                value={formData.apellidoMaterno}
                onChangeText={(text) => setFormData({...formData, apellidoMaterno: text})}
                placeholder="Apellido materno"
                error={errors.apellidoMaterno}
              />

              <DatePickerButton
                label="Fecha de Nacimiento *"
                value={formData.fechaNacimiento}
                onChangeText={(text) => setFormData({...formData, fechaNacimiento: text})}
                error={errors.fechaNacimiento}
                maximumDate={new Date()} // No permitir fechas futuras
              />

              <FormField
                label="CURP *"
                value={formData.curp}
                onChangeText={(text) => setFormData({...formData, curp: text.toUpperCase()})}
                placeholder="CURP del paciente"
                error={errors.curp}
              />

              {/* Selector de Institución de Salud */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Institución de Salud *</Text>
                <View style={styles.moduleSelector}>
                  {['IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro'].map((institucion) => (
                    <TouchableOpacity
                      key={institucion}
                      style={[
                        styles.moduleOption,
                        formData.institucionSalud === institucion && styles.moduleOptionSelected
                      ]}
                      onPress={() => setFormData({...formData, institucionSalud: institucion})}
                    >
                      <Text style={[
                        styles.moduleOptionText,
                        formData.institucionSalud === institucion && styles.moduleOptionTextSelected
                      ]}>
                        {institucion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.institucionSalud && <Text style={styles.errorText}>{errors.institucionSalud}</Text>}
              </View>

              {/* Selector de Sexo */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Sexo *</Text>
                <View style={styles.moduleSelector}>
                  {['Hombre', 'Mujer'].map((sexo) => (
                    <TouchableOpacity
                      key={sexo}
                      style={[
                        styles.moduleOption,
                        formData.sexo === sexo && styles.moduleOptionSelected
                      ]}
                      onPress={() => setFormData({...formData, sexo: sexo})}
                    >
                      <Text style={[
                        styles.moduleOptionText,
                        formData.sexo === sexo && styles.moduleOptionTextSelected
                      ]}>
                        {sexo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.sexo && <Text style={styles.errorText}>{errors.sexo}</Text>}
              </View>

              <FormField
                label="Dirección *"
                value={formData.direccion}
                onChangeText={(text) => setFormData({...formData, direccion: text})}
                placeholder="Dirección completa"
                error={errors.direccion}
              />

              <EstadoSelector
                label="Estado *"
                value={formData.estado}
                onValueChange={(estado) => {
                  setFormData({
                    ...formData,
                    estado: estado,
                    // Limpiar localidad cuando cambia el estado
                    localidad: ''
                  });
                }}
                error={errors.estado}
                required={true}
              />

              <MunicipioSelector
                label="Municipio / Ciudad *"
                value={formData.localidad}
                onValueChange={(municipio) => {
                  setFormData({...formData, localidad: municipio});
                }}
                estadoSeleccionado={formData.estado}
                error={errors.localidad}
                required={true}
              />

              <FormField
                label="Número Celular *"
                value={formData.numeroCelular}
                onChangeText={(text) => setFormData({...formData, numeroCelular: text})}
                placeholder="Número de celular"
                keyboardType="phone-pad"
                error={errors.numeroCelular}
              />

              {/* Selector de Módulo */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Módulo *</Text>
                <View style={styles.moduleSelector}>
                  {modulos.map((modulo) => (
                    <TouchableOpacity
                      key={modulo.id_modulo}
                      style={[
                        styles.moduleOption,
                        formData.idModulo === modulo.id_modulo.toString() && styles.moduleOptionSelected
                      ]}
                      onPress={() => setFormData({...formData, idModulo: modulo.id_modulo.toString()})}
                    >
                      <View style={styles.moduleOptionContent}>
                        <Text style={[
                          styles.moduleOptionText,
                          formData.idModulo === modulo.id_modulo.toString() && styles.moduleOptionTextSelected
                        ]}>
                          {modulo.nombre_modulo}
                        </Text>
                        <View style={[
                          styles.moduleRadio,
                          formData.idModulo === modulo.id_modulo.toString() && styles.moduleRadioSelected
                        ]}>
                          {formData.idModulo === modulo.id_modulo.toString() && (
                            <View style={styles.moduleRadioInner} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.idModulo && <Text style={styles.errorText}>{errors.idModulo}</Text>}
              </View>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={() => setCurrentStep(3)}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>Continuar a Red de Apoyo →</Text>
              </TouchableOpacity>
            </View>
          ) : currentStep === 3 ? (
            // PARTE 3: Red de Apoyo
            <View style={styles.formContainer}>
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>👥 Red de Apoyo</Text>
                <Text style={styles.stepDescription}>
                  Agrega contactos de emergencia y personas de apoyo para el paciente
                </Text>
              </View>

              {formData.redApoyo.map((contacto, index) => (
                <View key={index} style={styles.redApoyoContainer}>
                  <View style={styles.redApoyoHeader}>
                    <Text style={styles.redApoyoTitle}>Contacto {index + 1}</Text>
                    {formData.redApoyo.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeContactButton}
                        onPress={() => removeRedApoyoContact(index)}
                      >
                        <Text style={styles.removeContactButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <FormField
                    label="Nombre del Contacto *"
                    value={contacto.nombreContacto}
                    onChangeText={(text) => updateRedApoyoContact(index, 'nombreContacto', text)}
                    placeholder="Nombre completo"
                    error={errors[`redApoyo_${index}_nombreContacto`]}
                  />

                  <FormField
                    label="Número Celular *"
                    value={contacto.numeroCelular}
                    onChangeText={(text) => updateRedApoyoContact(index, 'numeroCelular', text)}
                    placeholder="Número de celular"
                    keyboardType="phone-pad"
                    error={errors[`redApoyo_${index}_numeroCelular`]}
                  />

                  <FormField
                    label="Email"
                    value={contacto.email}
                    onChangeText={(text) => updateRedApoyoContact(index, 'email', text)}
                    placeholder="Email del contacto"
                    keyboardType="email-address"
                    error={errors[`redApoyo_${index}_email`]}
                  />

                  <FormField
                    label="Dirección"
                    value={contacto.direccion}
                    onChangeText={(text) => updateRedApoyoContact(index, 'direccion', text)}
                    placeholder="Dirección del contacto"
                    error={errors[`redApoyo_${index}_direccion`]}
                  />

                  <FormField
                    label="Localidad"
                    value={contacto.localidad}
                    onChangeText={(text) => updateRedApoyoContact(index, 'localidad', text)}
                    placeholder="Localidad o municipio"
                    error={errors[`redApoyo_${index}_localidad`]}
                  />

                  <FormField
                    label="Parentesco *"
                    value={contacto.parentesco}
                    onChangeText={(text) => updateRedApoyoContact(index, 'parentesco', text)}
                    placeholder="Ej: Padre, Madre, Hijo, Hermano, etc."
                    error={errors[`redApoyo_${index}_parentesco`]}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={styles.addContactButton}
                onPress={addRedApoyoContact}
              >
                <Text style={styles.addContactButtonText}>+ Agregar Otro Contacto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={() => setCurrentStep(4)}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>Continuar a Primera Consulta →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // PARTE 4: Primera Consulta Médica (OBLIGATORIO)
            <View style={styles.formContainer}>
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>🏥 Primera Consulta Médica</Text>
                <Text style={styles.stepDescription}>
                  Información médica inicial del paciente (OBLIGATORIO)
                </Text>
              </View>

              {/* Enfermedades Crónicas */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Enfermedades Crónicas *</Text>
                <View style={styles.checkboxGrid}>
                  {enfermedadesCronicas.map((enfermedad) => (
                    <TouchableOpacity
                      key={enfermedad}
                      style={[
                        styles.checkboxItem,
                        formData.primeraConsulta.enfermedades_cronicas.includes(enfermedad) && styles.checkboxItemSelected
                      ]}
                      onPress={() => toggleEnfermedadCronica(enfermedad)}
                    >
                      <View style={[
                        styles.checkbox,
                        formData.primeraConsulta.enfermedades_cronicas.includes(enfermedad) && styles.checkboxSelected
                      ]}>
                        {formData.primeraConsulta.enfermedades_cronicas.includes(enfermedad) && (
                          <Text style={styles.checkboxText}>✓</Text>
                        )}
                      </View>
                      <Text style={[
                        styles.checkboxLabel,
                        formData.primeraConsulta.enfermedades_cronicas.includes(enfermedad) && styles.checkboxLabelSelected
                      ]}>
                        {enfermedad}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.enfermedades_cronicas && <Text style={styles.errorText}>{errors.enfermedades_cronicas}</Text>}
              </View>

              {/* Años de Padecimiento */}
              {formData.primeraConsulta.enfermedades_cronicas && formData.primeraConsulta.enfermedades_cronicas.map((enfermedad) => (
                <FormField
                  key={enfermedad}
                  label={`Años con ${enfermedad} *`}
                  value={formData.primeraConsulta.anos_padecimiento?.[enfermedad] || ''}
                  onChangeText={(text) => updateAnosPadecimiento(enfermedad, text)}
                  placeholder="Ej: 5"
                  keyboardType="numeric"
                  error={errors[`anos_${enfermedad}`]}
                />
              ))}

              {/* Motivo de Consulta */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Motivo de Consulta *</Text>
                <View style={styles.moduleSelector}>
                  {motivosConsulta.map((motivo) => (
                    <TouchableOpacity
                      key={motivo}
                      style={[
                        styles.moduleOption,
                        formData.primeraConsulta.motivo_consulta === motivo && styles.moduleOptionSelected
                      ]}
                      onPress={() => setFormData({
                        ...formData,
                        primeraConsulta: {
                          ...formData.primeraConsulta,
                          motivo_consulta: motivo
                        }
                      })}
                    >
                      <Text style={[
                        styles.moduleOptionText,
                        formData.primeraConsulta.motivo_consulta === motivo && styles.moduleOptionTextSelected
                      ]}>
                        {motivo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.motivo_consulta && <Text style={styles.errorText}>{errors.motivo_consulta}</Text>}
              </View>

              {/* Diagnóstico Agregado */}
              <FormField
                label="Diagnóstico Agregado *"
                value={formData.primeraConsulta.diagnostico_agregado}
                onChangeText={(text) => setFormData({
                  ...formData,
                  primeraConsulta: {
                    ...formData.primeraConsulta,
                    diagnostico_agregado: text
                  }
                })}
                placeholder="Diagnósticos adicionales..."
                multiline
                numberOfLines={3}
                error={errors.diagnostico_agregado}
              />

              {/* ✅ Diagnóstico Basal (según FORMA_2022_OFICIAL) */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Diagnóstico Basal *</Text>
                <Text style={{ fontSize: 12, color: COLORES.TEXTO_SECUNDARIO, marginBottom: 8 }}>
                  Marque si este es el diagnóstico inicial (basal) del paciente
                </Text>
                <TouchableOpacity
                  style={[
                    styles.checkboxItem,
                    formData.primeraConsulta.diagnostico_basal.es_basal && styles.checkboxItemSelected
                  ]}
                  onPress={() => setFormData({
                    ...formData,
                    primeraConsulta: {
                      ...formData.primeraConsulta,
                      diagnostico_basal: {
                        ...formData.primeraConsulta.diagnostico_basal,
                        es_basal: !formData.primeraConsulta.diagnostico_basal.es_basal
                      }
                    }
                  })}
                >
                  <View style={[
                    styles.checkbox,
                    formData.primeraConsulta.diagnostico_basal.es_basal && styles.checkboxSelected
                  ]}>
                    {formData.primeraConsulta.diagnostico_basal.es_basal && (
                      <Text style={styles.checkboxText}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Es diagnóstico basal (inicial)</Text>
                </TouchableOpacity>

                {formData.primeraConsulta.diagnostico_basal.es_basal && (
                  <>
                    <FormField
                      label="Año del Diagnóstico *"
                      value={formData.primeraConsulta.diagnostico_basal.año_diagnostico}
                      onChangeText={(text) => setFormData({
                        ...formData,
                        primeraConsulta: {
                          ...formData.primeraConsulta,
                          diagnostico_basal: {
                            ...formData.primeraConsulta.diagnostico_basal,
                            año_diagnostico: text
                          }
                        }
                      })}
                      placeholder="Ej: 2020"
                      keyboardType="numeric"
                      error={errors.año_diagnostico}
                    />
                    <TouchableOpacity
                      style={[
                        styles.checkboxItem,
                        formData.primeraConsulta.diagnostico_basal.es_agregado_posterior && styles.checkboxItemSelected
                      ]}
                      onPress={() => setFormData({
                        ...formData,
                        primeraConsulta: {
                          ...formData.primeraConsulta,
                          diagnostico_basal: {
                            ...formData.primeraConsulta.diagnostico_basal,
                            es_agregado_posterior: !formData.primeraConsulta.diagnostico_basal.es_agregado_posterior
                          }
                        }
                      })}
                    >
                      <View style={[
                        styles.checkbox,
                        formData.primeraConsulta.diagnostico_basal.es_agregado_posterior && styles.checkboxSelected
                      ]}>
                        {formData.primeraConsulta.diagnostico_basal.es_agregado_posterior && (
                          <Text style={styles.checkboxText}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>Dx. (s) Agregados posterior al Basal</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Tipo de Tratamiento */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tratamiento Actual *</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[
                      styles.radioOption,
                      formData.primeraConsulta.tratamiento_actual === 'con_medicamento' && styles.radioOptionSelected
                    ]}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        primeraConsulta: {
                          ...formData.primeraConsulta,
                          tratamiento_actual: 'con_medicamento',
                          // ✅ Actualizar booleanos explícitos según FORMA_2022_OFICIAL
                          recibe_tratamiento_farmacologico: true,
                          // Inicializar con un medicamento vacío si no hay ninguno
                          medicamentos: formData.primeraConsulta.medicamentos.length === 0 ? [''] : formData.primeraConsulta.medicamentos
                        }
                      });
                    }}
                  >
                    <View style={[
                      styles.radioButton,
                      formData.primeraConsulta.tratamiento_actual === 'con_medicamento' && styles.radioButtonSelected
                    ]}>
                      {formData.primeraConsulta.tratamiento_actual === 'con_medicamento' && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                    <Text style={[
                      styles.radioLabel,
                      formData.primeraConsulta.tratamiento_actual === 'con_medicamento' && styles.radioLabelSelected
                    ]}>
                      Con medicamento
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.radioOption,
                      formData.primeraConsulta.tratamiento_actual === 'sin_medicamento' && styles.radioOptionSelected
                    ]}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        primeraConsulta: {
                          ...formData.primeraConsulta,
                          tratamiento_actual: 'sin_medicamento',
                          // ✅ Actualizar booleanos explícitos según FORMA_2022_OFICIAL
                          recibe_tratamiento_no_farmacologico: true,
                          recibe_tratamiento_farmacologico: false,
                          // Limpiar medicamentos y asegurar que hay tratamiento sin medicamento
                          medicamentos: [],
                          tratamiento_sin_medicamento: formData.primeraConsulta.tratamiento_sin_medicamento || ''
                        }
                      });
                    }}
                  >
                    <View style={[
                      styles.radioButton,
                      formData.primeraConsulta.tratamiento_actual === 'sin_medicamento' && styles.radioButtonSelected
                    ]}>
                      {formData.primeraConsulta.tratamiento_actual === 'sin_medicamento' && (
                        <View style={styles.radioButtonInner} />
                      )}
                    </View>
                    <Text style={[
                      styles.radioLabel,
                      formData.primeraConsulta.tratamiento_actual === 'sin_medicamento' && styles.radioLabelSelected
                    ]}>
                      Sin medicamento
                    </Text>
                  </TouchableOpacity>
                </View>
                {errors.tratamiento_actual && <Text style={styles.errorText}>{errors.tratamiento_actual}</Text>}
              </View>

              {/* Medicamentos (si es con medicamento) */}
              {formData.primeraConsulta.tratamiento_actual === 'con_medicamento' && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Medicamentos *</Text>
                  {formData.primeraConsulta.medicamentos.map((medicamento, index) => (
                    <View key={index} style={styles.medicamentoEntryContainer}>
                      <View style={styles.medicamentoInputGroup}>
                        <View style={{ flex: 1 }}>
                          <MedicamentoSelector
                            label="Medicamento"
                            value={medicamento}
                            onValueChange={(nombreMedicamento) => updateMedicamento(index, nombreMedicamento)}
                            required={false}
                            style={{ marginBottom: 0 }}
                            showLabel={true}
                          />
                        </View>
                        <TouchableOpacity
                          style={styles.removeMedicamentoButton}
                          onPress={() => removeMedicamento(index)}
                        >
                          <Text style={styles.removeMedicamentoText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addMedicamentoButton}
                    onPress={addMedicamento}
                  >
                    <Text style={styles.addMedicamentoText}>+ Agregar Medicamento</Text>
                  </TouchableOpacity>
                  {errors.medicamentos && <Text style={styles.errorText}>{errors.medicamentos}</Text>}
                </View>
              )}

              {/* Tratamiento sin medicamento */}
              {formData.primeraConsulta.tratamiento_actual === 'sin_medicamento' && (
                <FormField
                  label="Tratamiento Sin Medicamento *"
                  value={formData.primeraConsulta.tratamiento_sin_medicamento}
                  onChangeText={(text) => setFormData({
                    ...formData,
                    primeraConsulta: {
                      ...formData.primeraConsulta,
                      tratamiento_sin_medicamento: text
                    }
                  })}
                  placeholder="Ej: Alimentación saludable, ejercicio..."
                  multiline
                  numberOfLines={3}
                  error={errors.tratamiento_sin_medicamento}
                />
              )}

              {/* ✅ Tratamiento Explícito según FORMA_2022_OFICIAL - Instrucciones ② y ③ */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Recibe Tratamiento *</Text>
                <Text style={{ fontSize: 12, color: COLORES.TEXTO_SECUNDARIO, marginBottom: 8 }}>
                  Marque según corresponda
                </Text>
                
                {/* No Farmacológico (Instrucción ②) */}
                <TouchableOpacity
                  style={[
                    styles.checkboxItem,
                    formData.primeraConsulta.recibe_tratamiento_no_farmacologico && styles.checkboxItemSelected
                  ]}
                  onPress={() => setFormData({
                    ...formData,
                    primeraConsulta: {
                      ...formData.primeraConsulta,
                      recibe_tratamiento_no_farmacologico: !formData.primeraConsulta.recibe_tratamiento_no_farmacologico
                    }
                  })}
                >
                  <View style={[
                    styles.checkbox,
                    formData.primeraConsulta.recibe_tratamiento_no_farmacologico && styles.checkboxSelected
                  ]}>
                    {formData.primeraConsulta.recibe_tratamiento_no_farmacologico && (
                      <Text style={styles.checkboxText}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>No Farmacológico (dieta, ejercicio, cambios de estilo de vida)</Text>
                </TouchableOpacity>

                {/* Farmacológico (Instrucción ③) */}
                <TouchableOpacity
                  style={[
                    styles.checkboxItem,
                    formData.primeraConsulta.recibe_tratamiento_farmacologico && styles.checkboxItemSelected
                  ]}
                  onPress={() => setFormData({
                    ...formData,
                    primeraConsulta: {
                      ...formData.primeraConsulta,
                      recibe_tratamiento_farmacologico: !formData.primeraConsulta.recibe_tratamiento_farmacologico
                    }
                  })}
                >
                  <View style={[
                    styles.checkbox,
                    formData.primeraConsulta.recibe_tratamiento_farmacologico && styles.checkboxSelected
                  ]}>
                    {formData.primeraConsulta.recibe_tratamiento_farmacologico && (
                      <Text style={styles.checkboxText}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Farmacológico (medicamentos)</Text>
                </TouchableOpacity>
              </View>

              {/* Fecha y Hora de Consulta */}
              <DateTimePickerButton
                label="Fecha y Hora de Consulta *"
                value={formData.primeraConsulta.fecha}
                onDateChange={(dateTime) => setFormData({
                  ...formData,
                  primeraConsulta: {
                    ...formData.primeraConsulta,
                    fecha: dateTime
                  }
                })}
                error={errors.fecha_consulta}
                minimumDate={new Date()}
                disabled={false}
              />
              <Text style={{ fontSize: 12, color: '#999', marginTop: 4, marginBottom: 12 }}>
                Selecciona la fecha y hora para la primera consulta médica
              </Text>

              {/* Doctor Asignado */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Doctor Asignado *</Text>
                <View style={styles.moduleSelector}>
                  {doctoresActivos.map((doctor) => (
                    <TouchableOpacity
                      key={doctor.id_doctor}
                      style={[
                        styles.moduleOption,
                        formData.primeraConsulta.idDoctor === doctor.id_doctor.toString() && styles.moduleOptionSelected
                      ]}
                      onPress={() => setFormData({
                        ...formData,
                        primeraConsulta: {
                          ...formData.primeraConsulta,
                          idDoctor: doctor.id_doctor.toString()
                        }
                      })}
                    >
                      <Text style={[
                        styles.moduleOptionText,
                        formData.primeraConsulta.idDoctor === doctor.id_doctor.toString() && styles.moduleOptionTextSelected
                      ]}>
                        Dr. {doctor.nombre} {doctor.apellido_paterno}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.idDoctor && <Text style={styles.errorText}>{errors.idDoctor}</Text>}
              </View>

              {/* Signos Vitales */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Signos Vitales *</Text>
                
                <View style={styles.rowContainer}>
                  <FormField
                    label="Peso (kg) *"
                    value={formData.primeraConsulta.signos_vitales.peso_kg}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      primeraConsulta: {
                        ...formData.primeraConsulta,
                        signos_vitales: {
                          ...formData.primeraConsulta.signos_vitales,
                          peso_kg: text
                        }
                      }
                    })}
                    placeholder="70.5"
                    keyboardType="numeric"
                    style={{ flex: 1, marginRight: 8 }}
                    error={errors.peso_kg}
                  />
                  
                  <FormField
                    label="Talla (m) *"
                    value={formData.primeraConsulta.signos_vitales.talla_m}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      primeraConsulta: {
                        ...formData.primeraConsulta,
                        signos_vitales: {
                          ...formData.primeraConsulta.signos_vitales,
                          talla_m: text
                        }
                      }
                    })}
                    placeholder="1.65"
                    keyboardType="numeric"
                    style={{ flex: 1, marginLeft: 8 }}
                    error={errors.talla_m}
                  />
                </View>

                <View style={styles.rowContainer}>
                  <FormField
                    label="Presión Sistólica *"
                    value={formData.primeraConsulta.signos_vitales.presion_sistolica}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      primeraConsulta: {
                        ...formData.primeraConsulta,
                        signos_vitales: {
                          ...formData.primeraConsulta.signos_vitales,
                          presion_sistolica: text
                        }
                      }
                    })}
                    placeholder="120"
                    keyboardType="numeric"
                    style={{ flex: 1, marginRight: 8 }}
                    error={errors.presion_sistolica}
                  />
                  
                  <FormField
                    label="Presión Diastólica *"
                    value={formData.primeraConsulta.signos_vitales.presion_diastolica}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      primeraConsulta: {
                        ...formData.primeraConsulta,
                        signos_vitales: {
                          ...formData.primeraConsulta.signos_vitales,
                          presion_diastolica: text
                        }
                      }
                    })}
                    placeholder="80"
                    keyboardType="numeric"
                    style={{ flex: 1, marginLeft: 8 }}
                    error={errors.presion_diastolica}
                  />
                </View>

                {/* ✅ HbA1c (%) - Campo obligatorio para criterios de acreditación */}
                <View style={styles.rowContainer}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <FormField
                      label="HbA1c (%) *"
                      value={formData.primeraConsulta.signos_vitales.hba1c_porcentaje}
                      onChangeText={(text) => setFormData({
                        ...formData,
                        primeraConsulta: {
                          ...formData.primeraConsulta,
                          signos_vitales: {
                            ...formData.primeraConsulta.signos_vitales,
                            hba1c_porcentaje: text
                          }
                        }
                      })}
                      placeholder="Ej: 6.5"
                      keyboardType="decimal-pad"
                      error={errors.hba1c_porcentaje}
                    />
                  </View>
                  
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <FormField
                      label="Edad en Medición (años) *"
                      value={formData.primeraConsulta.signos_vitales.edad_paciente_en_medicion || ''}
                      onChangeText={(text) => {
                        setFormData({
                          ...formData,
                          primeraConsulta: {
                            ...formData.primeraConsulta,
                            signos_vitales: {
                              ...formData.primeraConsulta.signos_vitales,
                              edad_paciente_en_medicion: text
                            }
                          }
                        });
                      }}
                      placeholder={formData.fechaNacimiento ? "Calculado automáticamente" : "Ej: 45"}
                      keyboardType="number-pad"
                      disabled={!!formData.fechaNacimiento && !formData.primeraConsulta.signos_vitales.edadEditable}
                      error={errors.edad_paciente_en_medicion}
                    />
                  </View>
                </View>
                {/* Texto informativo de edad calculada - Fuera del rowContainer para no afectar la alineación */}
                {formData.fechaNacimiento && (
                  <View style={{ marginTop: 4, marginLeft: '50%', paddingLeft: 8, width: '50%' }}>
                    <Text 
                      style={{ 
                        fontSize: 12, 
                        color: '#3182CE', 
                        marginBottom: 4,
                        flexWrap: 'wrap'
                      }}
                      numberOfLines={2}
                    >
                      ✓ Calculado automáticamente
                    </Text>
                    {!formData.primeraConsulta.signos_vitales.edadEditable && (
                      <TouchableOpacity
                        onPress={() => {
                          setFormData({
                            ...formData,
                            primeraConsulta: {
                              ...formData.primeraConsulta,
                              signos_vitales: {
                                ...formData.primeraConsulta.signos_vitales,
                                edadEditable: true
                              }
                            }
                          });
                        }}
                        style={{ paddingVertical: 2, alignSelf: 'flex-start' }}
                      >
                        <Text style={{ fontSize: 12, color: '#3182CE', textDecorationLine: 'underline' }}>
                          Editar manualmente
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                
                {/* Validación de rangos de HbA1c según edad */}
                {formData.primeraConsulta.signos_vitales.hba1c_porcentaje && 
                 formData.primeraConsulta.signos_vitales.edad_paciente_en_medicion && (
                  <View style={{ backgroundColor: '#fff3cd', padding: 12, borderRadius: 8, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: '#856404' }}>
                      {(() => {
                        const edad = parseInt(formData.primeraConsulta.signos_vitales.edad_paciente_en_medicion, 10);
                        const hba1c = parseFloat(formData.primeraConsulta.signos_vitales.hba1c_porcentaje);
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

                {/* Colesterol Total */}
                <FormField
                  label="Colesterol Total (mg/dl) *"
                  value={formData.primeraConsulta.signos_vitales.colesterol_mg_dl}
                  onChangeText={(text) => setFormData({
                    ...formData,
                    primeraConsulta: {
                      ...formData.primeraConsulta,
                      signos_vitales: {
                        ...formData.primeraConsulta.signos_vitales,
                        colesterol_mg_dl: text
                      }
                    }
                  })}
                  placeholder="Ej: 200"
                  keyboardType="numeric"
                  error={errors.colesterol_mg_dl}
                />

                {/* ✅ Colesterol LDL/HDL - Solo para pacientes con Hipercolesterolemia/Dislipidemia */}
                {(formData.primeraConsulta.enfermedades_cronicas.includes('Dislipidemia') || 
                  formData.primeraConsulta.enfermedades_cronicas.some(e => e.toLowerCase().includes('colesterol'))) && (
                  <View style={styles.rowContainer}>
                    <FormField
                      label="Colesterol LDL (mg/dl) *"
                      value={formData.primeraConsulta.signos_vitales.colesterol_ldl}
                      onChangeText={(text) => setFormData({
                        ...formData,
                        primeraConsulta: {
                          ...formData.primeraConsulta,
                          signos_vitales: {
                            ...formData.primeraConsulta.signos_vitales,
                            colesterol_ldl: text
                          }
                        }
                      })}
                      placeholder="Ej: 130"
                      keyboardType="numeric"
                      style={{ flex: 1, marginRight: 8 }}
                      error={errors.colesterol_ldl}
                    />
                    
                    <FormField
                      label="Colesterol HDL (mg/dl) *"
                      value={formData.primeraConsulta.signos_vitales.colesterol_hdl}
                      onChangeText={(text) => setFormData({
                        ...formData,
                        primeraConsulta: {
                          ...formData.primeraConsulta,
                          signos_vitales: {
                            ...formData.primeraConsulta.signos_vitales,
                            colesterol_hdl: text
                          }
                        }
                      })}
                      placeholder="Ej: 50"
                      keyboardType="numeric"
                      style={{ flex: 1, marginLeft: 8 }}
                      error={errors.colesterol_hdl}
                    />
                  </View>
                )}

                {/* Trigliceridos - Solo para pacientes con Hipertrigliceridemia */}
                {(formData.primeraConsulta.enfermedades_cronicas.includes('Dislipidemia') || 
                  formData.primeraConsulta.enfermedades_cronicas.some(e => e.toLowerCase().includes('triglicerid'))) && (
                  <FormField
                    label="Trigliceridos (mg/dl) *"
                    value={formData.primeraConsulta.signos_vitales.trigliceridos_mg_dl}
                    onChangeText={(text) => setFormData({
                      ...formData,
                      primeraConsulta: {
                        ...formData.primeraConsulta,
                        signos_vitales: {
                          ...formData.primeraConsulta.signos_vitales,
                          trigliceridos_mg_dl: text
                        }
                      }
                    })}
                    placeholder="Ej: 150"
                    keyboardType="numeric"
                    error={errors.trigliceridos_mg_dl}
                  />
                )}
              </View>

              {/* Vacunas */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Esquema de Vacunación</Text>
                {formData.primeraConsulta.vacunas.map((vacuna, index) => (
                  <View key={index} style={styles.vacunaRow}>
                    <View style={styles.vacunaContentContainer}>
                      <View style={styles.vacunaFieldContainer}>
                        <VacunaSelector
                          label="Vacuna"
                          value={vacuna.vacuna}
                          onValueChange={(nombreVacuna) => updateVacuna(index, 'vacuna', nombreVacuna)}
                          required={false}
                        />
                      </View>
                      <View style={styles.vacunaFieldContainer}>
                        <DatePickerButton
                          label="Fecha"
                          value={vacuna.fecha_aplicacion}
                          onChangeText={(text) => updateVacuna(index, 'fecha_aplicacion', text)}
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeMedicamentoButton}
                      onPress={() => removeVacuna(index)}
                    >
                      <Text style={styles.removeMedicamentoText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addMedicamentoButton}
                  onPress={addVacuna}
                >
                  <Text style={styles.addMedicamentoText}>+ Agregar Vacuna</Text>
                </TouchableOpacity>
              </View>

              {/* Observaciones */}
              <FormField
                label="Observaciones *"
                value={formData.primeraConsulta.observaciones}
                onChangeText={(text) => setFormData({
                  ...formData,
                  primeraConsulta: {
                    ...formData.primeraConsulta,
                    observaciones: text
                  }
                })}
                placeholder="Observaciones adicionales..."
                multiline
                numberOfLines={4}
                error={errors.observaciones}
              />

              {/* Botón Final */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleCreatePaciente}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Crear Paciente con Primera Consulta</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORES.FONDO_CARD,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  backButtonText: {
    fontSize: 24,
    color: '#2E86AB',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  testModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E86AB',
  },
  testModeButtonActive: {
    backgroundColor: '#2E86AB',
  },
  testModeButtonText: {
    fontSize: 18,
  },
  fillDataButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  fillDataButtonText: {
    fontSize: 18,
  },
  placeholder: {
    width: 40,
  },

  // Indicador de progreso
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: COLORES.FONDO_CARD,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: '#4CAF50', // Verde para pacientes
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
  },
  progressStepTextActive: {
    color: '#FFFFFF',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E9ECEF',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#4CAF50', // Verde para pacientes
  },

  // Contenido
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // Formulario
  formContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  stepContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    lineHeight: 20,
  },
  userCreatedIndicator: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  userCreatedText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },

  // Campos del formulario
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },

  // Módulos
  moduleSelector: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    overflow: 'hidden',
  },
  moduleOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  moduleOptionSelected: {
    backgroundColor: '#E8F5E8', // Verde claro para pacientes
  },
  moduleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleOptionText: {
    fontSize: 16,
    color: '#2C3E50',
    flex: 1,
  },
  moduleOptionTextSelected: {
    color: '#4CAF50', // Verde para pacientes
    fontWeight: '500',
  },
  moduleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E9ECEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleRadioSelected: {
    borderColor: '#4CAF50', // Verde para pacientes
  },
  moduleRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50', // Verde para pacientes
  },

  // Botón de envío
  submitButton: {
    backgroundColor: '#4CAF50', // Verde para pacientes
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Red de apoyo
  redApoyoContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.TEXTO_DISABLED,
  },
  redApoyoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  redApoyoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1976D2',
  },
  removeContactButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FFEBEE',
  },
  removeContactButtonText: {
    fontSize: 16,
  },
  addContactButton: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1976D2',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addContactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },

  // Estilos para Paso 4 - Primera Consulta
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },

  // Estilos para checkboxes de enfermedades
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.TEXTO_DISABLED,
    backgroundColor: COLORES.FONDO_CARD,
  },
  checkboxItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORES.TEXTO_DISABLED,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkboxText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333333',
  },
  checkboxLabelSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },

  // Estilos para radio buttons
  radioGroup: {
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.TEXTO_DISABLED,
    backgroundColor: COLORES.FONDO_CARD,
  },
  radioOptionSelected: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORES.TEXTO_DISABLED,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#4CAF50',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333333',
  },
  radioLabelSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },

  // Estilos para medicamentos (layout 1x1: selector arriba, botón eliminar a la derecha)
  medicamentoEntryContainer: {
    marginBottom: 16,
  },
  medicamentoInputGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
    gap: 8,
  },
  removeMedicamentoButton: {
    marginTop: 24, // Alinear con el selector (considerando el label)
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FF5252',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    alignSelf: 'flex-start',
  },
  removeMedicamentoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addMedicamentoButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  addMedicamentoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Estilos para vacunas
  vacunaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  vacunaContentContainer: {
    flex: 1,
    gap: 0,
  },
  vacunaFieldContainer: {
    marginBottom: 0,
  },
});

export default AgregarPaciente;