import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// // import { Ionicons } from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

// Componentes personalizados
import FormField from '../../components/forms/FormField';

// Hooks personalizados
import useDoctorForm from '../../hooks/useDoctorForm';
import useGestion from '../../hooks/useGestion';

// Servicios
import Logger from '../../services/logger';
import { COLORES, NETWORK_STAGGER } from '../../utils/constantes';
import { doctorAuthService } from '../../api/authService';
import { generarDatosDoctor } from '../../services/testDataService';

/**
 * Pantalla para agregar un nuevo doctor
 * Integra el hook useDoctorForm y el componente DoctorForm
 */
const AgregarDoctor = () => {
  const navigation = useNavigation();
  
  // Hooks personalizados
  const { 
    loading: formLoading, 
    error: formError, 
    createDoctorProfile, 
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
  const [userData, setUserData] = useState(null); // Datos del usuario creado
  const [showGradoEstudioDropdown, setShowGradoEstudioDropdown] = useState(false);
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    // Parte 1: Datos de usuario
    email: '',
    password: '',
    confirmPassword: '',
    
    // Parte 2: Datos del doctor
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    telefono: '',
    institucionHospitalaria: '',
    gradoEstudio: '',
    anosServicio: '',
    idModulo: '',
    activo: true,
  });
  
  const [errors, setErrors] = useState({});

  /** Cargar módulos con retraso para no saturar conexiones (Android limita ~5 por host). */
  useEffect(() => {
    const t = setTimeout(() => {
      Logger.info('AgregarDoctor: Cargando módulos');
      fetchModulos();
    }, NETWORK_STAGGER.MODULOS_FORM_MS);
    return () => clearTimeout(t);
  }, [fetchModulos]);

  /**
   * Validar datos de usuario (Parte 1)
   */
  const validateUserData = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirma la contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    
    if (!formData.apellidoPaterno.trim()) {
      newErrors.apellidoPaterno = 'El apellido paterno es requerido';
    }
    
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El teléfono es requerido';
    }
    
    if (!formData.idModulo) {
      newErrors.idModulo = 'Selecciona un módulo';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Crear usuario (Parte 1)
   */
  const handleCreateUser = async () => {
    if (!validateUserData()) {
      return;
    }

    try {
      setIsSubmitting(true);
      Logger.info('AgregarDoctor: Creando usuario base');
      
      const userResponse = await doctorAuthService.register(
        formData.email,
        formData.password,
        'Doctor'
      );

      if (!userResponse.usuario) {
        throw new Error('Error al crear usuario base');
      }

      setUserData(userResponse.usuario);
      setCurrentStep(2);
      Logger.success('AgregarDoctor: Usuario creado exitosamente');
      
    } catch (error) {
      Logger.error('AgregarDoctor: Error creando usuario', error);
      Alert.alert('Error', 'No se pudo crear el usuario. Verifica los datos e intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Crear doctor (Parte 2)
   */
  const handleCreateDoctor = async () => {
    if (!validateDoctorData()) {
      return;
    }

    if (!userData || !userData.id_usuario) {
      Alert.alert('Error', 'No se encontró el ID del usuario. Regresa al paso anterior.');
      return;
    }

    try {
      setIsSubmitting(true);
      Logger.info('AgregarDoctor: Creando perfil de doctor', { userId: userData.id_usuario });
      
      // Preparar datos del doctor (sin datos de usuario ya que se crearon en paso 1)
      const doctorData = {
        id_usuario: userData.id_usuario,
        nombre: formData.nombre,
        apellido_paterno: formData.apellidoPaterno,
        apellido_materno: formData.apellidoMaterno,
        telefono: formData.telefono,
        institucion_hospitalaria: formData.institucionHospitalaria,
        grado_estudio: formData.gradoEstudio,
        anos_servicio: parseInt(formData.anosServicio) || 0,
        id_modulo: parseInt(formData.idModulo),
        activo: formData.activo,
      };

      const result = await createDoctorProfile(doctorData);
      
      if (result.success) {
        Alert.alert(
          'Éxito',
          'Doctor creado exitosamente',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Error al crear doctor');
      }
      
    } catch (error) {
      Logger.error('AgregarDoctor: Error creando doctor', error);
      Alert.alert('Error', 'No se pudo crear el doctor. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Manejar cancelación
   */
  const handleCancel = () => {
    Alert.alert(
      'Cancelar Creación',
      '¿Estás seguro de que quieres cancelar la creación del doctor? Los datos ingresados se perderán.',
      [
        {
          text: 'Continuar Editando',
          style: 'cancel',
        },
        {
          text: 'Cancelar',
          style: 'destructive',
          onPress: () => {
            Logger.info('AgregarDoctor: Creación cancelada por el usuario');
            navigation.goBack();
          },
        },
      ]
    );
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
            <Text style={styles.infoIconText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agregar Doctor</Text>
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
            <Text style={styles.infoIconText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agregar Doctor</Text>
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
          onScrollBeginDrag={() => showGradoEstudioDropdown && setShowGradoEstudioDropdown(false)}
        >
          {currentStep === 1 ? (
            // PARTE 1: Datos de Usuario
            <View style={styles.formContainer}>
              <View style={styles.stepContainer}>
                <Text style={styles.stepTitle}>👤 Datos de Usuario</Text>
                <Text style={styles.stepDescription}>
                  Crea las credenciales de acceso para el doctor
                </Text>
              </View>

              <FormField
                label="Email *"
                value={formData.email}
                onChangeText={(text) => handleTextChange('email', text)}
                placeholder="doctor@clinica.com"
                keyboardType="email-address"
                error={errors.email}
              />

              <FormField
                label="Contraseña *"
                value={formData.password}
                onChangeText={(text) => handleTextChange('password', text)}
                placeholder="Mínimo 6 caracteres"
                type="password"
                error={errors.password}
              />

              <FormField
                label="Confirmar Contraseña *"
                value={formData.confirmPassword}
                onChangeText={(text) => handleTextChange('confirmPassword', text)}
                placeholder="Repite la contraseña"
                type="password"
                error={errors.confirmPassword}
              />

              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleCreateUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORES.BLANCO} />
                ) : (
                  <Text style={styles.submitButtonText}>Crear Usuario</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // PARTE 2: Datos del Doctor
            <View style={styles.formContainer}>
              <View style={styles.stepContainer}>
                <View style={styles.stepHeaderWithButton}>
                  <View style={styles.stepHeaderText}>
                    <Text style={styles.stepTitle}>👨‍⚕️ Datos del Doctor</Text>
                    <Text style={styles.stepDescription}>
                      Completa la información profesional del doctor
                    </Text>
                    
                    {/* Indicador de usuario creado */}
                    <View style={styles.userCreatedIndicator}>
                      <Text style={styles.userCreatedText}>✅ Usuario creado: {userData?.email}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.fillDataButton}
                    onPress={() => {
                      const testData = generarDatosDoctor(modulos && modulos.length > 0 ? modulos[0].id_modulo : null);
                      setFormData(prev => ({
                        ...prev,
                        ...testData
                      }));
                      Alert.alert(
                        'Datos de Prueba Cargados',
                        'El formulario ha sido llenado con datos aleatorios para testing.',
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Text style={styles.fillDataButtonText}>🎲</Text>
                  </TouchableOpacity>
                </View>
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

              {/* Selector de Grado de Estudio */}
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
                      {[
                        { value: 'Licenciatura', label: 'Licenciatura' },
                        { value: 'Especialidad', label: 'Especialidad' },
                        { value: 'Maestría', label: 'Maestría' },
                        { value: 'Doctorado', label: 'Doctorado' }
                      ].map((option) => (
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
                onPress={handleCreateDoctor}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={COLORES.TEXTO_EN_PRIMARIO} />
                ) : (
                  <Text style={styles.submitButtonText}>Crear Doctor</Text>
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
    backgroundColor: COLORES.FONDO_SECUNDARIO,
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
    borderBottomColor: COLORES.BORDE_CLARO,
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
    color: COLORES.PRIMARIO,
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
    borderBottomColor: COLORES.BORDE_CLARO,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORES.BORDE_CLARO,
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
    color: COLORES.BLANCO,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORES.BORDE_CLARO,
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
  userCreatedIndicator: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORES.PRIMARIO,
  },
  userCreatedText: {
    fontSize: 14,
    color: COLORES.PRIMARIO,
    fontWeight: '500',
  },
  stepHeaderWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepHeaderText: {
    flex: 1,
  },
  fillDataButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORES.PRIMARIO,
    marginLeft: 12,
  },
  fillDataButtonText: {
    fontSize: 18,
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

  // Módulos
  moduleSelector: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
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
    borderColor: COLORES.BORDE_CLARO,
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

  // Estilos para selector de Grado de Estudio
  gradoEstudioSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    borderRadius: 8,
    backgroundColor: COLORES.FONDO_CARD,
    paddingHorizontal: 12,
    paddingVertical: 14,
    minHeight: 48,
  },
  placeholderSelector: {
    borderColor: COLORES.BORDE_CLARO,
  },
  gradoEstudioSelectorText: {
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  placeholderText: {
    color: COLORES.TEXTO_SECUNDARIO,
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
    borderColor: COLORES.BORDE_CLARO,
    borderRadius: 8,
    backgroundColor: COLORES.FONDO_CARD,
    elevation: 3,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.FONDO_SECUNDARIO,
  },
  dropdownItemSelected: {
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
  },
  dropdownItemText: {
    fontSize: 15,
    color: COLORES.TEXTO_PRIMARIO,
  },
  dropdownItemTextSelected: {
    color: COLORES.PRIMARIO,
    fontWeight: '600',
  },

  // Botón de envío
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
    color: COLORES.BLANCO,
    fontSize: 16,
    fontWeight: '600',
  },

  // Loading
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

  // Error
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORES.FONDO_ERROR_CLARO,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORES.ERROR,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.ERROR,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORES.ERROR,
    marginBottom: 12,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORES.ERROR,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: COLORES.BLANCO,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AgregarDoctor;
