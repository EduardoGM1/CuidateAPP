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
import { useNavigation, useRoute } from '@react-navigation/native';

// Componentes personalizados
import FormField from '../../components/forms/FormField';

// Hooks personalizados
import useDoctorForm from '../../hooks/useDoctorForm';
import useGestion from '../../hooks/useGestion';

// Servicios
import Logger from '../../services/logger';
import { COLORES, NETWORK_STAGGER } from '../../utils/constantes';

// Opciones de grado de estudio (mismo que AgregarDoctor)
const GRADOS_ESTUDIO = [
  { value: 'Licenciatura', label: 'Licenciatura' },
  { value: 'Especialidad', label: 'Especialidad' },
  { value: 'Maestría', label: 'Maestría' },
  { value: 'Doctorado', label: 'Doctorado' },
];

/**
 * Pantalla para editar un doctor existente
 * Formulario de dos partes: Usuario + Perfil de Doctor
 */
const EditarDoctor = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Obtener datos del doctor desde los parámetros de navegación
  const { doctor } = route.params || {};
  
  // Hooks personalizados
  const { 
    loading: formLoading, 
    error: formError, 
    updateDoctor, 
    clearError: clearFormError,
    capitalizeText
  } = useDoctorForm();
  
  const { 
    modulos, 
    loading: modulosLoading, 
    error: modulosError, 
    fetchModulos 
  } = useGestion.useModulos();

  // Estados locales
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Datos usuario, 2: Datos doctor
  const [showGradoEstudioDropdown, setShowGradoEstudioDropdown] = useState(false);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    // Parte 1: Datos de usuario (solo lectura)
    email: doctor?.email || doctor?.Usuario?.email || '',
    password: '', // No se muestra en edición
    confirmPassword: '', // No se muestra en edición
    
    // Parte 2: Datos del doctor
    nombre: doctor?.nombre || '',
    apellidoPaterno: doctor?.apellido_paterno || doctor?.apellido || '',
    apellidoMaterno: doctor?.apellido_materno || '',
    telefono: doctor?.telefono || doctor?.numero_celular || '',
    institucionHospitalaria: doctor?.institucion_hospitalaria || '',
    gradoEstudio: doctor?.grado_estudio || '',
    anosServicio: doctor?.anos_servicio?.toString() || '',
    idModulo: doctor?.id_modulo?.toString() || '',
    activo: doctor?.activo ?? true,
  });
  
  const [errors, setErrors] = useState({});

  /** Cargar módulos con retraso para no saturar conexiones (Android limita ~5 por host). */
  useEffect(() => {
    const t = setTimeout(() => {
      Logger.info('EditarDoctor: Cargando módulos');
      fetchModulos();
    }, NETWORK_STAGGER.MODULOS_FORM_MS);
    return () => clearTimeout(t);
  }, [fetchModulos]);

  /**
   * Actualizar formulario cuando cambien los datos del doctor
   */
  useEffect(() => {
    if (doctor) {
      // Log esencial: Datos del doctor que llegan al formulario
      Logger.info('EditarDoctor: Datos del doctor recibidos', {
        id: doctor?.id || doctor?.id_doctor,
        nombre: doctor?.nombre,
        email: doctor?.email || doctor?.Usuario?.email,
        apellido_paterno: doctor?.apellido_paterno,
        apellido_materno: doctor?.apellido_materno,
        telefono: doctor?.telefono,
        institucion_hospitalaria: doctor?.institucion_hospitalaria,
        grado_estudio: doctor?.grado_estudio,
        anos_servicio: doctor?.anos_servicio,
        id_modulo: doctor?.id_modulo,
        activo: doctor?.activo
      });
      
      // Mapear datos del doctor con valores garantizados (no undefined)
      const doctorData = {
        // Parte 1: Datos de usuario (solo lectura)
        email: doctor?.email || doctor?.Usuario?.email || '',
        password: '', // No se muestra en edición
        confirmPassword: '', // No se muestra en edición
        
        // Parte 2: Datos del doctor - Valores garantizados
        nombre: doctor?.nombre || '',
        apellidoPaterno: doctor?.apellido_paterno || doctor?.apellido || '',
        apellidoMaterno: doctor?.apellido_materno || '',
        telefono: doctor?.telefono || doctor?.numero_celular || '',
        institucionHospitalaria: doctor?.institucion_hospitalaria || doctor?.especialidad || '',
        gradoEstudio: doctor?.grado_estudio || doctor?.especialidad || '',
        anosServicio: doctor?.anos_servicio?.toString() || '0',
        idModulo: doctor?.id_modulo?.toString() || (typeof doctor?.modulo === 'object' ? doctor?.modulo?.id_modulo?.toString() : (typeof doctor?.modulo === 'string' ? modulos?.find(m => m.nombre_modulo === doctor.modulo)?.id_modulo?.toString() || '1' : '1')) || '1',
        activo: doctor?.activo ?? true,
      };
      
      // Log esencial: Datos mapeados para el formulario
      Logger.info('EditarDoctor: Datos mapeados para formulario', {
        email: doctorData.email,
        nombre: doctorData.nombre,
        apellidoPaterno: doctorData.apellidoPaterno,
        apellidoMaterno: doctorData.apellidoMaterno,
        telefono: doctorData.telefono,
        institucionHospitalaria: doctorData.institucionHospitalaria,
        gradoEstudio: doctorData.gradoEstudio,
        anosServicio: doctorData.anosServicio,
        idModulo: doctorData.idModulo,
        activo: doctorData.activo
      });
      
      setFormData(doctorData);
    }
  }, [doctor, modulos]);

  /**
   * Manejar cambio de texto con capitalización automática
   * @param {string} field - Campo a actualizar
   * @param {string} text - Texto ingresado
   */
  const handleTextChangeWithCapitalization = (field, text) => {
    const capitalizedText = capitalizeText(text);
    setFormData(prev => ({
      ...prev,
      [field]: capitalizedText
    }));
  };

  /**
   * Manejar cambio de texto normal (sin capitalización)
   * @param {string} field - Campo a actualizar
   * @param {string} text - Texto ingresado
   */
  const handleTextChange = (field, text) => {
    setFormData(prev => ({
      ...prev,
      [field]: text
    }));
  };

  /**
   * Validar datos del doctor (Parte 2)
   */
  const validateDoctorData = () => {
    const newErrors = {};
    
    if (!formData.nombre?.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    
    if (!formData.apellidoPaterno?.trim()) {
      newErrors.apellidoPaterno = 'El apellido paterno es requerido';
    }
    
    if (!formData.telefono?.trim()) {
      newErrors.telefono = 'El teléfono es requerido';
    }
    
    if (!formData.idModulo || formData.idModulo === '') {
      newErrors.idModulo = 'Selecciona un módulo';
    }
    
    // Validar que los campos no sean undefined
    if (formData.institucionHospitalaria === undefined) {
      newErrors.institucionHospitalaria = 'La institución hospitalaria es requerida';
    }
    
    if (formData.gradoEstudio === undefined) {
      newErrors.gradoEstudio = 'El grado de estudio es requerido';
    }
    
    if (formData.anosServicio === undefined || formData.anosServicio === '') {
      newErrors.anosServicio = 'Los años de servicio son requeridos';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Actualizar doctor
   */
  const handleUpdateDoctor = async () => {
    if (!validateDoctorData()) {
      return;
    }

    // Obtener ID del doctor (puede ser 'id' o 'id_doctor')
    const doctorId = doctor?.id_doctor || doctor?.id;
    
    // Log esencial: ID del doctor
    Logger.info('EditarDoctor: ID del doctor', { doctorId });
    
    if (!doctorId) {
      Alert.alert('Error', 'No se encontró el ID del doctor.');
      Logger.error('EditarDoctor: ID del doctor no encontrado', { doctor });
      return;
    }

    try {
      setIsSubmitting(true);
      Logger.info('EditarDoctor: Actualizando doctor', { doctorId });
      
      // SOLUCIÓN DEFINITIVA: Usar datos del doctor como base y solo actualizar campos modificados
      const doctorData = {
        // Usar datos del doctor como base, solo actualizar si formData tiene valores válidos
        nombre: formData.nombre?.trim() || doctor?.nombre || '',
        apellido_paterno: formData.apellidoPaterno?.trim() || doctor?.apellido_paterno || doctor?.apellido || '',
        apellido_materno: formData.apellidoMaterno?.trim() || doctor?.apellido_materno || '',
        telefono: formData.telefono?.trim() || doctor?.telefono || doctor?.numero_celular || '',
        institucion_hospitalaria: formData.institucionHospitalaria?.trim() || doctor?.institucion_hospitalaria || doctor?.especialidad || '',
        grado_estudio: formData.gradoEstudio?.trim() || doctor?.grado_estudio || doctor?.especialidad || '',
        anos_servicio: formData.anosServicio ? parseInt(formData.anosServicio) : (doctor?.anos_servicio || 0),
        id_modulo: formData.idModulo ? parseInt(formData.idModulo) : (doctor?.id_modulo || (typeof doctor?.modulo === 'object' ? doctor?.modulo?.id_modulo : (typeof doctor?.modulo === 'string' ? modulos?.find(m => m.nombre_modulo === doctor.modulo)?.id_modulo : 1)) || 1),
        activo: formData.activo !== undefined ? formData.activo : (doctor?.activo ?? true),
      };
      
      // Validar que no hay campos undefined
      const camposUndefined = Object.entries(doctorData).filter(([key, value]) => value === undefined);
      if (camposUndefined.length > 0) {
        Logger.error('EditarDoctor: Campos undefined detectados', { camposUndefined });
        Alert.alert('Error', 'Hay campos sin datos. Por favor, verifica la información del doctor.');
        return;
      }
      
      // Log esencial: Datos que se envían al servidor
      Logger.info('EditarDoctor: Datos a enviar', { 
        doctorId, 
        datos: {
          nombre: doctorData.nombre,
          apellido_paterno: doctorData.apellido_paterno,
          apellido_materno: doctorData.apellido_materno,
          telefono: doctorData.telefono,
          institucion_hospitalaria: doctorData.institucion_hospitalaria,
          grado_estudio: doctorData.grado_estudio,
          anos_servicio: doctorData.anos_servicio,
          id_modulo: doctorData.id_modulo,
          activo: doctorData.activo
        },
        mapeoIdModulo: {
          formDataIdModulo: formData.idModulo,
          doctorIdModulo: doctor?.id_modulo,
          doctorModulo: doctor?.modulo,
          tipoModulo: typeof doctor?.modulo,
          modulosDisponibles: modulos?.map(m => ({ id: m.id_modulo, nombre: m.nombre_modulo }))
        }
      });

      const result = await updateDoctor(doctorId, formData, doctor);
      
      if (result.success) {
        Alert.alert(
          'Éxito',
          'Doctor actualizado exitosamente',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Error al actualizar doctor');
      }
      
    } catch (error) {
      Logger.error('EditarDoctor: Error actualizando doctor', error);
      
      // El hook useDoctorForm ya maneja los Alert, solo logueamos aquí
      // para debugging adicional si es necesario
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostrar loading si están cargando los módulos
  if (modulosLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Doctor</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.PRIMARIO} />
          <Text style={styles.loadingText}>Cargando módulos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Mostrar error si falló la carga de módulos
  if (modulosError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Editar Doctor</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>❌ Error de Conexión</Text>
          <Text style={styles.errorMessage}>
            {modulosError}. Desliza hacia abajo para intentar nuevamente.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchModulos}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Si no hay datos del doctor, no renderizar
  if (!doctor) {
    return null;
  }

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
          {currentStep === 1 ? 'Datos de Usuario' : 'Datos del Doctor'}
        </Text>
        
        <View style={styles.placeholder} />
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
            // PARTE 1: Datos de Usuario (solo lectura)
            <View style={styles.formContainer}>
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>👤 Datos de Usuario</Text>
                <Text style={styles.stepDescription}>
                  Información de acceso del doctor
                </Text>
              </View>

              <FormField
                label="Email *"
                value={formData.email}
                onChangeText={(text) => handleTextChange('email', text)}
                placeholder="Email del doctor"
                type="email"
                required={true}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={styles.nextButton}
                onPress={() => setCurrentStep(2)}
              >
                <Text style={styles.nextButtonText}>Continuar a Datos del Doctor →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // PARTE 2: Datos del Doctor
            <View style={styles.formContainer}>
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>👨‍⚕️ Datos del Doctor</Text>
                <Text style={styles.stepDescription}>
                  Información profesional del doctor
                </Text>
              </View>

              <FormField
                label="Nombre *"
                value={formData.nombre}
                onChangeText={(text) => handleTextChangeWithCapitalization('nombre', text)}
                placeholder="Nombre del doctor"
                error={errors.nombre}
              />

              <FormField
                label="Apellido Paterno *"
                value={formData.apellidoPaterno}
                onChangeText={(text) => handleTextChangeWithCapitalization('apellidoPaterno', text)}
                placeholder="Apellido paterno"
                error={errors.apellidoPaterno}
              />

              <FormField
                label="Apellido Materno"
                value={formData.apellidoMaterno}
                onChangeText={(text) => handleTextChangeWithCapitalization('apellidoMaterno', text)}
                placeholder="Apellido materno"
                error={errors.apellidoMaterno}
              />

              <FormField
                label="Teléfono *"
                value={formData.telefono}
                onChangeText={(text) => handleTextChange('telefono', text)}
                placeholder="Número de teléfono"
                keyboardType="phone-pad"
                error={errors.telefono}
              />

              <FormField
                label="Institución Hospitalaria"
                value={formData.institucionHospitalaria}
                onChangeText={(text) => handleTextChangeWithCapitalization('institucionHospitalaria', text)}
                placeholder="Hospital o clínica"
                error={errors.institucionHospitalaria}
              />

              {/* Selector de Grado de Estudio (dropdown) */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Grado de Estudio</Text>
                <TouchableOpacity
                  style={[
                    styles.gradoEstudioSelector,
                    errors.gradoEstudio && styles.inputError,
                    !formData.gradoEstudio && styles.placeholderSelector
                  ]}
                  onPress={() => setShowGradoEstudioDropdown(!showGradoEstudioDropdown)}
                >
                  <Text style={[
                    styles.gradoEstudioSelectorText,
                    !formData.gradoEstudio && styles.placeholderText
                  ]}>
                    {formData.gradoEstudio || 'Selecciona un grado de estudio'}
                  </Text>
                  <Text style={styles.arrowText}>
                    {showGradoEstudioDropdown ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>
                
                {showGradoEstudioDropdown && (
                  <View style={styles.dropdownList}>
                    <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                      {GRADOS_ESTUDIO.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.dropdownItem,
                            formData.gradoEstudio === option.value && styles.dropdownItemSelected
                          ]}
                          onPress={() => {
                            setFormData({...formData, gradoEstudio: option.value});
                            setShowGradoEstudioDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            formData.gradoEstudio === option.value && styles.dropdownItemTextSelected
                          ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                {errors.gradoEstudio && <Text style={styles.errorText}>{errors.gradoEstudio}</Text>}
              </View>

              <FormField
                label="Años de Servicio"
                value={formData.anosServicio}
                onChangeText={(text) => handleTextChange('anosServicio', text)}
                placeholder="Años de experiencia"
                keyboardType="numeric"
                error={errors.anosServicio}
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
                          {modulo.nombre_modulo || `Módulo ${modulo.id_modulo}`}
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
                onPress={handleUpdateDoctor}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORES.TEXTO_EN_PRIMARIO} />
                ) : (
                  <Text style={styles.submitButtonText}>Actualizar Doctor</Text>
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
    backgroundColor: COLORES.FONDO,
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
    borderBottomColor: COLORES.SECUNDARIO_LIGHT,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORES.FONDO,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORES.NAV_PRIMARIO,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
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
    borderBottomColor: COLORES.SECUNDARIO_LIGHT,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORES.SECUNDARIO_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: COLORES.PRIMARIO,
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
  },
  progressStepTextActive: {
    color: COLORES.TEXTO_EN_PRIMARIO,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORES.SECUNDARIO_LIGHT,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: COLORES.PRIMARIO,
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
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    lineHeight: 20,
  },

  // Campos del formulario
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORES.ERROR,
    marginTop: 4,
  },
  readOnlyField: {
    backgroundColor: COLORES.FONDO,
    opacity: 0.7,
  },

  // Módulos
  moduleSelector: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.TEXTO_DISABLED,
    overflow: 'hidden',
  },
  moduleOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.FONDO_SECUNDARIO,
  },
  moduleOptionSelected: {
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
  },
  moduleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleOptionText: {
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  moduleOptionTextSelected: {
    color: COLORES.PRIMARIO,
    fontWeight: '500',
  },
  moduleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORES.TEXTO_DISABLED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleRadioSelected: {
    borderColor: COLORES.PRIMARIO,
  },
  moduleRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORES.PRIMARIO,
  },

  // Estilos para selector de Grado de Estudio (dropdown)
  gradoEstudioSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORES.SECUNDARIO_LIGHT,
    borderRadius: 8,
    backgroundColor: COLORES.FONDO_CARD,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 48,
  },
  placeholderSelector: {
    borderColor: COLORES.SECUNDARIO_LIGHT,
  },
  gradoEstudioSelectorText: {
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  placeholderText: {
    color: COLORES.TEXTO_DISABLED,
  },
  arrowText: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    marginLeft: 8,
  },
  inputError: {
    borderColor: COLORES.ERROR,
    borderWidth: 2,
  },
  dropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: COLORES.SECUNDARIO_LIGHT,
    borderRadius: 8,
    backgroundColor: COLORES.FONDO_CARD,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.SECUNDARIO_LIGHT,
  },
  dropdownItemSelected: {
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
  },
  dropdownItemText: {
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
  },
  dropdownItemTextSelected: {
    color: COLORES.PRIMARIO,
    fontWeight: '600',
  },

  // Botones
  nextButton: {
    backgroundColor: COLORES.PRIMARIO,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  nextButtonText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORES.PRIMARIO,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: COLORES.TEXTO_DISABLED,
  },
  submitButtonText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 16,
    fontWeight: '600',
  },

  // Loading y Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORES.ERROR,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORES.PRIMARIO,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryText: {
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditarDoctor;