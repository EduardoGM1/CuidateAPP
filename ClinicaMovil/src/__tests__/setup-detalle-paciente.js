/**
 * Setup de mocks para tests de DetallePaciente
 */

// No mockear react-native completamente, solo lo necesario
// Los mocks específicos se harán en cada test según necesidad

// Mock de react-native-paper
jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  
  const CardContent = ({ children }) => <View>{children}</View>;
  
  const Card = ({ children, style, ...props }) => (
    <View style={style} {...props}>{children}</View>
  );
  
  // Asignar Content como propiedad de Card
  Card.Content = CardContent;
  
  return {
    Provider: ({ children }) => children,
    Card,
    Title: ({ children, style }) => <Text style={style}>{children}</Text>,
    Paragraph: ({ children, style }) => <Text style={style}>{children}</Text>,
    Button: ({ children, onPress, disabled, loading, mode, ...props }) => (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} {...props}>
        <Text>{loading ? 'Cargando...' : children}</Text>
      </TouchableOpacity>
    ),
    Chip: ({ children, style }) => <View style={style}><Text>{children}</Text></View>,
    IconButton: ({ icon, onPress, ...props }) => (
      <TouchableOpacity onPress={onPress} {...props}>
        <Text>{icon}</Text>
      </TouchableOpacity>
    ),
    ActivityIndicator: () => <View testID="activity-indicator" />,
    TextInput: require('react-native').TextInput,
    ScrollView: require('react-native').ScrollView,
    RefreshControl: require('react-native').RefreshControl,
  };
});

// Mock de componentes de DetallePaciente
jest.mock('../components/DetallePaciente/shared/OptionsModal', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  
  const OptionsModal = ({ visible, onClose, title, options = [] }) => {
    if (!visible) return null;
    return (
      <View testID="options-modal">
        <Text>{title}</Text>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            testID={`option-${index}`}
            onPress={() => {
              if (option.onPress) option.onPress();
              onClose();
            }}
          >
            <Text>{option.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity testID="close-modal" onPress={onClose}>
          <Text>X</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return {
    __esModule: true,
    default: OptionsModal,
  };
});

jest.mock('../components/DetallePaciente/shared/FormModal', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  
  const FormModal = ({ visible, onClose, title, children, onSave, saving, disabled, saveLabel = 'Guardar', cancelLabel = 'Cancelar' }) => {
    if (!visible) return null;
    return (
      <View testID="form-modal">
        <Text>{title}</Text>
        {children}
        <TouchableOpacity
          testID="save-button"
          onPress={onSave}
          disabled={disabled || saving}
        >
          <Text>{saveLabel}</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="cancel-button" onPress={onClose}>
          <Text>{cancelLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return {
    __esModule: true,
    default: FormModal,
  };
});

jest.mock('../components/DetallePaciente/shared/HistoryModal', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  
  const HistoryModal = ({ visible, onClose, title, items = [], loading, renderItem, emptyMessage }) => {
    if (!visible) return null;
    return (
      <View testID="history-modal">
        <Text>{title}</Text>
        {loading ? (
          <Text>Cargando...</Text>
        ) : items.length > 0 ? (
          items.map((item, index) => (
            <View key={index}>
              {renderItem ? renderItem(item, index) : <Text>{JSON.stringify(item)}</Text>}
            </View>
          ))
        ) : (
          <Text>{emptyMessage}</Text>
        )}
      </View>
    );
  };
  
  return {
    __esModule: true,
    default: HistoryModal,
  };
});

// Mock de DatePickerButton
jest.mock('../components/DatePickerButton', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity, TextInput } = require('react-native');
  
  const DatePickerButton = ({ label, value, onChangeText, editable = true }) => (
    <View>
      <Text>{label}</Text>
      <TouchableOpacity disabled={!editable}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          placeholder={label}
        />
      </TouchableOpacity>
    </View>
  );
  
  return {
    __esModule: true,
    default: DatePickerButton,
  };
});

// Mock de hooks de modal manager - funcional para tests con React state
jest.mock('../hooks/useModalManager', () => {
  const React = require('react');
  
  const useModalManager = () => {
    // Usar useState real de React para que los cambios disparen re-renders
    const [modals, setModals] = React.useState({});
    
    const isOpen = React.useCallback((modalId) => {
      return modals[modalId]?.show || false;
    }, [modals]);
    
    const open = React.useCallback((modalId, data = null) => {
      setModals(prev => ({
        ...prev,
        [modalId]: {
          show: true,
          data
        }
      }));
    }, []);
    
    const close = React.useCallback((modalId) => {
      setModals(prev => {
        if (prev[modalId]) {
          return {
            ...prev,
            [modalId]: {
              show: false,
              data: null
            }
          };
        }
        return prev;
      });
    }, []);
    
    const toggle = React.useCallback((modalId, data = null) => {
      setModals(prev => ({
        ...prev,
        [modalId]: {
          show: !prev[modalId]?.show,
          data: prev[modalId]?.show ? null : data
        }
      }));
    }, []);
    
    const getData = React.useCallback((modalId) => {
      return modals[modalId]?.data || null;
    }, [modals]);
    
    const register = React.useCallback((modalId, initialState = false) => {
      setModals(prev => {
        if (!prev.hasOwnProperty(modalId)) {
          return {
            ...prev,
            [modalId]: {
              show: initialState,
              data: null
            }
          };
        }
        return prev;
      });
    }, []);
    
    const closeAll = React.useCallback(() => {
      setModals(prev => {
        const newState = {};
        Object.keys(prev).forEach(key => {
          newState[key] = { show: false, data: null };
        });
        return newState;
      });
    }, []);
    
    return {
      register,
      isOpen,
      open,
      close,
      toggle,
      getData,
      getModalData: getData,
      closeAll,
      getAllModals: () => modals,
      modals,
    };
  };

  return {
    __esModule: true,
    default: useModalManager,
    useModalManager,
  };
});

// Mock de componentes adicionales de DetallePaciente
jest.mock('../components/DetallePaciente/PatientHeader', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const PatientHeader = ({ paciente, calcularEdad }) => {
    const edad = calcularEdad ? calcularEdad(paciente?.fecha_nacimiento) : paciente?.edad;
    return (
      <View testID="patient-header">
        <Text>{paciente?.nombre} {paciente?.apellido_paterno} {paciente?.apellido_materno}</Text>
        {edad && <Text>{edad} años</Text>}
      </View>
    );
  };
  return {
    __esModule: true,
    default: PatientHeader,
  };
});

jest.mock('../components/DetallePaciente/PatientGeneralInfo', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const PatientGeneralInfo = ({ paciente, formatearFecha }) => (
    <View testID="patient-general-info">
      {paciente?.edad && <Text>{paciente.edad} años</Text>}
    </View>
  );
  return {
    __esModule: true,
    default: PatientGeneralInfo,
  };
});

jest.mock('../components/DetallePaciente/MedicalSummary', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MedicalSummary = () => <View testID="medical-summary" />;
  return {
    __esModule: true,
    default: MedicalSummary,
  };
});

jest.mock('../components/DetallePaciente/ComorbilidadesSection', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  const ComorbilidadesSection = ({ onOptionsPress }) => (
    <View testID="comorbilidades-section">
      <Text>Comorbilidades</Text>
      <TouchableOpacity testID="comorbilidades-options" onPress={onOptionsPress}>
        <Text>Opciones</Text>
      </TouchableOpacity>
    </View>
  );
  return {
    __esModule: true,
    default: ComorbilidadesSection,
  };
});

// Mock de contextos
jest.mock('../context/DetallePacienteContext', () => {
  const React = require('react');
  return {
    DetallePacienteProvider: ({ children }) => children,
    useDetallePacienteContext: () => ({
      pacienteId: 1,
      refresh: jest.fn(),
    }),
  };
});

// Mock de componentes de fecha
jest.mock('../components/DateInput', () => {
  const React = require('react');
  const { View, TextInput } = require('react-native');
  const DateInput = ({ value, onChangeText, ...props }) => (
    <View>
      <TextInput value={value} onChangeText={onChangeText} {...props} />
    </View>
  );
  return {
    __esModule: true,
    default: DateInput,
  };
});

jest.mock('../components/DateInputSeparated', () => {
  const React = require('react');
  const { View, TextInput } = require('react-native');
  const DateInputSeparated = ({ value, onChangeText, ...props }) => (
    <View>
      <TextInput value={value} onChangeText={onChangeText} {...props} />
    </View>
  );
  return {
    __esModule: true,
    default: DateInputSeparated,
  };
});

jest.mock('../components/DateTimePickerButton', () => {
  const React = require('react');
  const { View, TextInput, TouchableOpacity } = require('react-native');
  const DateTimePickerButton = ({ label, value, onChangeText, ...props }) => (
    <View>
      <TextInput value={value} onChangeText={onChangeText} placeholder={label} {...props} />
    </View>
  );
  return {
    __esModule: true,
    default: DateTimePickerButton,
  };
});

// Mock de react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }) => <View {...props}>{children}</View>,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock de Logger
jest.mock('../services/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock de servicios de test data
jest.mock('../services/testDataService', () => ({
  generarDatosSignosVitales: jest.fn(() => ({})),
  generarDatosDiagnostico: jest.fn(() => ({})),
  generarDatosCita: jest.fn(() => ({})),
}));

// Mock de utilidades de validación - IMPORTANTE: debe estar antes de cualquier importación de DetallePaciente
const mockValidateCita = jest.fn((data) => {
  // Validación real simplificada para tests
  const errors = {};
  if (!data || !data.fecha_cita) errors.fecha_cita = 'La fecha es requerida';
  if (!data || !data.motivo) errors.motivo = 'El motivo es requerido';
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData: data || {} // Incluir sanitizedData como espera el código
  };
});

const mockValidateSignosVitales = jest.fn((data) => {
  // Validación real simplificada para tests
  if (!data) {
    return {
      isValid: false,
      errors: { general: 'Datos inválidos' }
    };
  }
  
  const errors = {};
  
  // Validar que al menos un campo esté lleno
  const hasData = data.peso_kg || data.talla_m || data.presion_sistolica || data.glucosa_mg_dl;
  if (!hasData) {
    errors.general = 'Debe completar al menos un campo';
    return { isValid: false, errors };
  }
  
  // Validar presión arterial
  if (data.presion_sistolica && data.presion_diastolica) {
    const sistolica = parseInt(data.presion_sistolica);
    const diastolica = parseInt(data.presion_diastolica);
    if (!isNaN(sistolica) && !isNaN(diastolica) && sistolica < diastolica) {
      errors.presion_general = 'La presión sistólica debe ser mayor que la diastólica';
    }
  }
  
  // Validar glucosa
  if (data.glucosa_mg_dl) {
    const glucosa = parseFloat(data.glucosa_mg_dl);
    if (isNaN(glucosa) || glucosa < 30 || glucosa > 600) {
      errors.glucosa_mg_dl = 'Glucosa inválida (30-600 mg/dl)';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
});

jest.mock('../utils/citaValidator', () => ({
  validateCita: mockValidateCita,
  validateSignosVitales: mockValidateSignosVitales,
}));

// Mock de canExecute - debe devolver un objeto con allowed y remainingTime
// IMPORTANTE: Debe ser una función que siempre retorne el objeto correcto
const mockCanExecute = jest.fn((actionKey, cooldownMs) => {
  // Simular comportamiento real: siempre permite en tests
  return { allowed: true, remainingTime: 0 };
});

jest.mock('../utils/validation', () => {
  // Importar módulo real primero para mantener otras funciones
  const actualModule = jest.requireActual('../utils/validation');
  
  return {
    ...actualModule,
    // Sobrescribir canExecute con el mock
    canExecute: (actionKey, cooldownMs) => {
      return { allowed: true, remainingTime: 0 };
    },
    sanitizeString: jest.fn((str) => str || ''),
    isValidEmail: jest.fn(() => true),
    isValidPhone: jest.fn(() => true),
    isValidDate: jest.fn(() => true),
    isValidLength: jest.fn(() => true),
  };
});

jest.mock('../utils/constantes', () => ({
  ESTADOS_CITA: {
    PROGRAMADA: 'programada',
    CONFIRMADA: 'confirmada',
    EN_PROCESO: 'en_proceso',
    COMPLETADA: 'completada',
    CANCELADA: 'cancelada',
    NO_ASISTIO: 'no_asistio',
  },
}));

// Mock de useFormState - debe mantener estado real
jest.mock('../hooks/useFormState', () => {
  const React = require('react');
  
  const useFormState = (initialValues = {}) => {
    const [formData, setFormData] = React.useState(initialValues);
    
    const updateField = React.useCallback((field, value) => {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }, []);
    
    const updateFields = React.useCallback((fields) => {
      setFormData(prev => ({
        ...prev,
        ...fields
      }));
    }, []);
    
    const resetForm = React.useCallback(() => {
      setFormData(initialValues);
    }, [initialValues]);
    
    const resetTo = React.useCallback((newValues) => {
      setFormData(newValues);
    }, []);
    
    return {
      formData,
      updateField,
      updateFields,
      resetForm,
      setFormData,
      resetTo,
    };
  };

  return {
    __esModule: true,
    default: useFormState,
    useFormState,
  };
});

// Mock de useSaveHandler - debe ejecutar validación real
jest.mock('../hooks/useSaveHandler', () => {
  const React = require('react');
  const { Alert } = require('react-native');
  
  const useSaveHandler = (config = {}) => {
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState(null);
    
    const handleSave = React.useCallback(async () => {
      try {
        setSaving(true);
        setError(null);
        
        // Ejecutar validación si existe
        if (config.validationFn) {
          const isValid = config.validationFn();
          if (!isValid) {
            setSaving(false);
            return { success: false, error: 'Validation failed' };
          }
        }
        
        // Preparar datos si existe prepareData
        const dataToSave = config.prepareData 
          ? config.prepareData(config.formData)
          : config.formData;
        
        // Llamar al servicio si existe
        if (config.serviceMethod) {
          const result = await config.serviceMethod(dataToSave);
          if (result && result.success) {
            if (config.resetForm) {
              config.resetForm();
            }
            if (config.setModalState) {
              config.setModalState(false);
            }
            if (config.refreshData) {
              await config.refreshData();
            }
            if (config.onSuccess) {
              config.onSuccess(result);
            }
            setSaving(false);
            return { success: true, data: result };
          } else {
            setError(result?.error || 'Error al guardar');
            setSaving(false);
            return { success: false, error: result?.error || 'Error al guardar' };
          }
        } else {
          // Si no hay servicio, simular éxito
          if (config.resetForm) {
            config.resetForm();
          }
          if (config.setModalState) {
            config.setModalState(false);
          }
          if (config.onSuccess) {
            config.onSuccess({});
          }
          setSaving(false);
          return { success: true };
        }
      } catch (err) {
        setError(err.message || 'Error desconocido');
        setSaving(false);
        return { success: false, error: err.message || 'Error desconocido' };
      }
    }, [config]);
    
    return {
      handleSave,
      saving,
      error,
    };
  };

  return {
    __esModule: true,
    default: useSaveHandler,
    useSaveHandler,
  };
});

// Mock de hooks de gestión - debe estar antes de cualquier importación
jest.mock('../hooks/useGestion', () => {
  const mockPacienteDetailsReturn = {
    paciente: {
      id_paciente: 1,
      nombre: 'María',
      apellido_paterno: 'García',
      apellido_materno: 'López',
      edad: 45,
      sexo: 'Mujer',
      curp: 'GALM850415HDFRRX01',
      activo: true
    },
    loading: false,
    error: null,
    refresh: () => {}
  };

  const mockDoctoresReturn = {
    doctores: [
      { id_doctor: 1, nombre: 'Dr. Juan', apellido_paterno: 'Pérez' }
    ]
  };

  // Funciones que retornan los valores directamente
  const usePacienteDetails = () => mockPacienteDetailsReturn;
  const useDoctores = () => mockDoctoresReturn;

  return {
    __esModule: true,
    useDoctores,
    usePacienteDetails,
    usePacientes: () => ({}),
    useModulos: () => ({}),
    useDoctorDetails: () => ({}),
    useDoctorPatientData: () => ({}),
    default: {
      useDoctores,
      usePacienteDetails,
    }
  };
});

// Mock de hooks de datos médicos
jest.mock('../hooks/usePacienteMedicalData', () => {
  const mockMedicalDataReturn = {
    citas: [],
    signosVitales: [],
    diagnosticos: [],
    medicamentos: [],
    resumen: {
      total_citas: 0,
      total_signos_vitales: 0,
      total_diagnosticos: 0,
      total_medicamentos: 0
    },
    loading: false,
    error: null,
    refreshAll: () => {},
    totalCitas: 0,
    totalSignosVitales: 0,
    totalDiagnosticos: 0,
    totalMedicamentos: 0
  };

  const mockRedApoyoReturn = {
    redApoyo: [],
    loading: false,
    refresh: () => {}
  };

  const mockEsquemaVacunacionReturn = {
    esquemaVacunacion: [],
    loading: false,
    refresh: () => {}
  };

  const mockComorbilidadesReturn = {
    comorbilidades: [],
    loading: false,
    refresh: () => {}
  };

  // Mock de hooks individuales para useConsultasAgrupadas
  const mockIndividualHookReturn = {
    citas: [],
    signosVitales: [],
    diagnosticos: [],
    loading: false,
    error: null,
    refresh: () => {},
    total: 0
  };

  return {
    __esModule: true,
    usePacienteMedicalData: () => mockMedicalDataReturn,
    usePacienteCitas: () => mockIndividualHookReturn,
    usePacienteSignosVitales: () => mockIndividualHookReturn,
    usePacienteDiagnosticos: () => mockIndividualHookReturn,
    usePacienteRedApoyo: () => mockRedApoyoReturn,
    usePacienteEsquemaVacunacion: () => mockEsquemaVacunacionReturn,
    usePacienteComorbilidades: () => mockComorbilidadesReturn,
  };
});

// Mock de AuthContext - debe estar antes de cualquier importación que lo use
jest.mock('../context/AuthContext', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  const mockAuthValue = {
    user: { id: 1, nombre: 'Test User', rol: 'Admin' },
    userRole: 'Admin',
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn(),
  };
  
  return {
    useAuth: () => mockAuthValue,
    AuthProvider: ({ children }) => <View>{children}</View>,
    Provider: ({ children }) => <View>{children}</View>,
  };
});

