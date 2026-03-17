import React, { useState, useEffect, useMemo } from 'react';
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
// // import { Ionicons } from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Componentes personalizados
import PacienteForm from '../../components/forms/PacienteForm';

// Hooks personalizados
import usePacienteForm from '../../hooks/usePacienteForm';
import useGestion from '../../hooks/useGestion';
import { useAuth } from '../../context/AuthContext';

// Servicios
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';
import { formatNombreCompleto } from '../../utils/formatNombreCompleto';

/**
 * Pantalla para editar un paciente existente
 * Reutiliza la estructura de EditarDoctor.js con lógica de pacientes
 */
const EditarPaciente = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userData: authUserData, userRole } = useAuth();
  
  // Obtener datos del paciente desde los parámetros de navegación
  const { paciente } = route.params || {};
  
  // Hooks personalizados
  const { 
    loading: formLoading, 
    error: formError, 
    updatePaciente, 
    clearError: clearFormError 
  } = usePacienteForm();
  
  const { 
    modulos, 
    loading: modulosLoading, 
    error: modulosError, 
    fetchModulos 
  } = useGestion.useModulos();

  const { institucionesSalud = [], fetchInstitucionesSalud } = useGestion.useInstitucionesSalud();

  // Estados locales
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Filtro de módulos: Doctores solo ven su módulo asignado
  const modulosFiltrados = useMemo(() => {
    if (userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador') {
      return modulos;
    }
    if ((userRole === 'Doctor' || userRole === 'doctor') && authUserData?.id_modulo) {
      return modulos.filter(modulo => modulo.id_modulo === authUserData.id_modulo);
    }
    return [];
  }, [modulos, userRole, authUserData?.id_modulo]);

  /** Cargar módulos con retraso para no saturar conexiones (Android limita ~5 por host). */
  useEffect(() => {
    const t = setTimeout(() => {
      Logger.info('EditarPaciente: Cargando módulos e instituciones');
      fetchModulos();
      fetchInstitucionesSalud();
    }, NETWORK_STAGGER.MODULOS_FORM_MS);
    return () => clearTimeout(t);
  }, [fetchModulos, fetchInstitucionesSalud]);

  /**
   * Validar que se recibieron los datos del paciente
   */
  useEffect(() => {
    if (!paciente) {
      Logger.error('EditarPaciente: No se recibieron datos del paciente');
      Alert.alert(
        'Error',
        'No se encontraron datos del paciente para editar.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [paciente, navigation]);

  /**
   * Manejar envío del formulario
   */
  const handleSubmit = async (formData) => {
    try {
      setIsSubmitting(true);
      
      Logger.info('EditarPaciente: Iniciando actualización de paciente', { 
        pacienteId: paciente.id_paciente,
        nombre: formData.nombre 
      });

      const result = await updatePaciente(paciente.id_paciente, formData);

      if (result.success) {
        Logger.success('EditarPaciente: Paciente actualizado exitosamente');
        
        // Navegar de vuelta con parámetro de éxito
        navigation.navigate('DetallePaciente', { 
          paciente: { ...paciente, ...formData },
          refresh: true,
          successMessage: 'Paciente actualizado exitosamente' 
        });
      } else {
        Logger.error('EditarPaciente: Error en actualización', { 
          error: result.error 
        });
      }

    } catch (error) {
      Logger.error('EditarPaciente: Error inesperado', { 
        error: error.message 
      });
      
      Alert.alert(
        'Error Inesperado',
        'Ocurrió un error inesperado. Inténtalo de nuevo.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Manejar cancelación
   */
  const handleCancel = () => {
    Alert.alert(
      'Cancelar Edición',
      '¿Estás seguro de que quieres cancelar la edición del paciente? Los cambios no guardados se perderán.',
      [
        {
          text: 'Continuar Editando',
          style: 'cancel',
        },
        {
          text: 'Cancelar',
          style: 'destructive',
          onPress: () => {
            Logger.info('EditarPaciente: Edición cancelada por el usuario');
            navigation.goBack();
          },
        },
      ]
    );
  };

  /**
   * Limpiar errores
   */
  const handleClearError = () => {
    clearFormError();
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
          <Text style={styles.headerTitle}>Editar Paciente</Text>
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
          <Text style={styles.headerTitle}>Editar Paciente</Text>
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

  // Si no hay datos del paciente, no renderizar
  if (!paciente) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleCancel}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Editar Paciente</Text>
        
        <View style={styles.placeholder} />
      </View>

      {/* Contenido */}
      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Información de la pantalla */}
          <View style={styles.infoContainer}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoIconText}>👤</Text>
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Editar Paciente</Text>
              <Text style={styles.infoDescription}>
                Modifica la información del paciente {formatNombreCompleto(paciente)}.
              </Text>
            </View>
          </View>

          {/* Error del formulario */}
          {formError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>❌ Error del Formulario</Text>
              <Text style={styles.errorMessage}>
                {formError}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={handleClearError}
              >
                <Text style={styles.retryText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Formulario */}
          <View style={styles.formContainer}>
            <PacienteForm
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              loading={formLoading || isSubmitting}
              modulos={modulosFiltrados || []}
              institucionesSalud={institucionesSalud || []}
              mode="edit"
              initialData={paciente}
            />
          </View>

          {/* Información adicional */}
          <View style={styles.additionalInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIconText}>ℹ️</Text>
              <Text style={styles.infoText}>
                Los cambios se aplicarán inmediatamente al guardar
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIconText}>🏥</Text>
              <Text style={styles.infoText}>
                La información médica es confidencial y segura
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIconText}>🔒</Text>
              <Text style={styles.infoText}>
                Todos los datos están protegidos y encriptados
              </Text>
            </View>
          </View>
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

  // Contenido
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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

  // Información
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    elevation: 1,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoIcon: {
    marginRight: 16,
  },

  infoIconText: {
    fontSize: 20,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    lineHeight: 20,
  },

  // Formulario
  formContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },

  // Información adicional
  additionalInfo: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    padding: 16,
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    elevation: 1,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    flex: 1,
  },
});

export default EditarPaciente;
