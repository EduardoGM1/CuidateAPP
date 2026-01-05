import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Card, Title, Button, Divider } from 'react-native-paper';
import FormField from './FormField';
import { formValidation } from './FormValidation';
import Logger from '../../services/logger';

/**
 * Componente de formulario específico para doctores
 * Reutilizable para crear y editar doctores
 */
const DoctorForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  mode = 'create', // 'create' o 'edit'
  showCredentials = true, // Mostrar campos de email/password
}) => {
  // Estado del formulario
  const [formData, setFormData] = useState({
    // Datos de acceso (solo para crear)
    email: '',
    password: '',
    confirmPassword: '',
    
    // Datos personales
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    telefono: '',
    
    // Datos profesionales
    gradoEstudio: '',
    institucionHospitalaria: '',
    anosServicio: '',
    idModulo: '',
    
    // Datos del sistema
    activo: true,
  });

  // Estado de errores
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar datos iniciales si estamos editando
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        email: initialData.email || '',
        password: '', // No mostrar contraseña existente
        confirmPassword: '',
        nombre: initialData.nombre || '',
        apellidoPaterno: initialData.apellido_paterno || '',
        apellidoMaterno: initialData.apellido_materno || '',
        telefono: initialData.telefono || '',
        gradoEstudio: initialData.grado_estudio || '',
        institucionHospitalaria: initialData.institucion_hospitalaria || '',
        anosServicio: initialData.anos_servicio?.toString() || '',
        idModulo: initialData.id_modulo?.toString() || '',
        activo: initialData.activo !== undefined ? initialData.activo : true,
      });
      
      Logger.info('DoctorForm: Datos iniciales cargados', { 
        mode, 
        doctorId: initialData.id_doctor,
        hasEmail: !!initialData.email 
      });
    }
  }, [initialData, mode]);

  // Manejar cambios en los campos
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Validar campo individual
  const validateField = (field, value) => {
    let validation = null;

    switch (field) {
      case 'email':
        validation = formValidation.validateEmail(value);
        break;
      case 'password':
        validation = formValidation.validatePassword(value);
        break;
      case 'nombre':
        validation = formValidation.validateDoctorName(value);
        break;
      case 'apellidoPaterno':
        validation = formValidation.validateDoctorSurnames(value, formData.apellidoMaterno);
        break;
      case 'apellidoMaterno':
        validation = formValidation.validateDoctorSurnames(formData.apellidoPaterno, value);
        break;
      case 'telefono':
        validation = formValidation.validateDoctorPhone(value);
        break;
      case 'gradoEstudio':
        validation = formValidation.validateSpecialty(value);
        break;
      case 'anosServicio':
        validation = formValidation.validateYearsOfService(value);
        break;
      case 'institucionHospitalaria':
        validation = formValidation.validateInstitution(value);
        break;
      case 'confirmPassword':
        validation = {
          isValid: value === formData.password,
          message: value === formData.password ? 'Contraseñas coinciden' : 'Las contraseñas no coinciden'
        };
        break;
      default:
        return;
    }

    if (!validation.isValid) {
      setErrors(prev => ({
        ...prev,
        [field]: validation.message
      }));
    }
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      Logger.info('DoctorForm: Iniciando validación', { mode, hasInitialData: !!initialData });

      // Validar formulario completo
      const validation = formValidation.validateDoctorForm(formData);
      
      if (!validation.isValid) {
        setErrors(validation.errors);
        Logger.warn('DoctorForm: Validación fallida', { 
          errors: validation.errors,
          errorsCount: Object.keys(validation.errors).length 
        });
        
        Alert.alert(
          'Error de Validación',
          'Por favor corrige los errores en el formulario',
          [{ text: 'OK' }]
        );
        return;
      }

      // Validar confirmación de contraseña si estamos creando
      if (mode === 'create' && showCredentials) {
        if (formData.password !== formData.confirmPassword) {
          setErrors(prev => ({
            ...prev,
            confirmPassword: 'Las contraseñas no coinciden'
          }));
          Alert.alert('Error', 'Las contraseñas no coinciden');
          return;
        }
      }

      // Preparar datos para envío
      const submitData = {
        ...formData,
        anosServicio: parseInt(formData.anosServicio) || 0,
        idModulo: parseInt(formData.idModulo) || 1,
      };

      // Remover campos no necesarios para el backend
      if (mode === 'edit') {
        delete submitData.password;
        delete submitData.confirmPassword;
        delete submitData.email; // El email no se puede cambiar
      }

      Logger.info('DoctorForm: Enviando datos', { 
        mode, 
        fieldsCount: Object.keys(submitData).length,
        hasPassword: !!submitData.password 
      });

      // Llamar función de envío
      await onSubmit(submitData);
      
      Logger.success('DoctorForm: Envío exitoso', { mode });
      
    } catch (error) {
      Logger.error('DoctorForm: Error en envío', { error: error.message });
      Alert.alert(
        'Error',
        error.message || 'Ocurrió un error al procesar el formulario',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejar cancelación
  const handleCancel = () => {
    Alert.alert(
      'Cancelar',
      '¿Estás seguro de que quieres cancelar? Los cambios no guardados se perderán.',
      [
        { text: 'Continuar editando', style: 'cancel' },
        { text: 'Cancelar', style: 'destructive', onPress: onCancel }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>
            {mode === 'create' ? 'Agregar Nuevo Doctor' : 'Editar Doctor'}
          </Title>
          
          {/* Datos de Acceso (solo para crear) */}
          {showCredentials && mode === 'create' && (
            <>
              <Title style={styles.sectionTitle}>Datos de Acceso</Title>
              
              <FormField
                label="Email"
                value={formData.email}
                onChangeText={(value) => handleFieldChange('email', value)}
                placeholder="doctor@clinica.com"
                type="email"
                required
                error={errors.email}
                validation={(value) => validateField('email', value)}
              />

              <FormField
                label="Contraseña"
                value={formData.password}
                onChangeText={(value) => handleFieldChange('password', value)}
                placeholder="Mínimo 6 caracteres"
                type="password"
                required
                error={errors.password}
                validation={(value) => validateField('password', value)}
              />

              <FormField
                label="Confirmar Contraseña"
                value={formData.confirmPassword}
                onChangeText={(value) => handleFieldChange('confirmPassword', value)}
                placeholder="Repite la contraseña"
                type="password"
                required
                error={errors.confirmPassword}
                validation={(value) => validateField('confirmPassword', value)}
              />

              <Divider style={styles.divider} />
            </>
          )}

          {/* Datos Personales */}
          <Title style={styles.sectionTitle}>Datos Personales</Title>
          
          <FormField
            label="Nombre"
            value={formData.nombre}
            onChangeText={(value) => handleFieldChange('nombre', value)}
            placeholder="Dr. Juan"
            required
            error={errors.nombre}
            validation={(value) => validateField('nombre', value)}
          />

          <FormField
            label="Apellido Paterno"
            value={formData.apellidoPaterno}
            onChangeText={(value) => handleFieldChange('apellidoPaterno', value)}
            placeholder="Pérez"
            required
            error={errors.apellidoPaterno}
            validation={(value) => validateField('apellidoPaterno', value)}
          />

          <FormField
            label="Apellido Materno"
            value={formData.apellidoMaterno}
            onChangeText={(value) => handleFieldChange('apellidoMaterno', value)}
            placeholder="García (opcional)"
            error={errors.apellidoMaterno}
            validation={(value) => validateField('apellidoMaterno', value)}
          />

          <FormField
            label="Teléfono"
            value={formData.telefono}
            onChangeText={(value) => handleFieldChange('telefono', value)}
            placeholder="555-1234"
            type="phone"
            required
            error={errors.telefono}
            validation={(value) => validateField('telefono', value)}
          />

          <Divider style={styles.divider} />

          {/* Datos Profesionales */}
          <Title style={styles.sectionTitle}>Datos Profesionales</Title>
          
          <FormField
            label="Especialidad / Grado de Estudio"
            value={formData.gradoEstudio}
            onChangeText={(value) => handleFieldChange('gradoEstudio', value)}
            placeholder="Especialidad en Medicina Interna"
            required
            error={errors.gradoEstudio}
            validation={(value) => validateField('gradoEstudio', value)}
          />

          <FormField
            label="Institución Hospitalaria"
            value={formData.institucionHospitalaria}
            onChangeText={(value) => handleFieldChange('institucionHospitalaria', value)}
            placeholder="Hospital General Central"
            required
            error={errors.institucionHospitalaria}
            validation={(value) => validateField('institucionHospitalaria', value)}
          />

          <FormField
            label="Años de Servicio"
            value={formData.anosServicio}
            onChangeText={(value) => handleFieldChange('anosServicio', value)}
            placeholder="5"
            type="number"
            required
            error={errors.anosServicio}
            validation={(value) => validateField('anosServicio', value)}
          />

          <FormField
            label="Módulo"
            value={formData.idModulo}
            onChangeText={(value) => handleFieldChange('idModulo', value)}
            placeholder="1"
            type="number"
            required
            error={errors.idModulo}
          />

          {/* Botones de Acción */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              disabled={isSubmitting || loading}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting || loading}
              disabled={isSubmitting || loading}
              style={styles.submitButton}
            >
              {mode === 'create' ? 'Crear Doctor' : 'Actualizar Doctor'}
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: '#2D3748',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
    color: '#4A5568',
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#E2E8F0',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderColor: '#E53E3E',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3182CE',
  },
});

export default DoctorForm;


