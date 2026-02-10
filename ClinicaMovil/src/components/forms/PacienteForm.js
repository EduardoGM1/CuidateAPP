import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import { Card, Title, Button, Divider, RadioButton } from 'react-native-paper';
import FormField from './FormField';
import EstadoSelector from './EstadoSelector';
import MunicipioSelector from './MunicipioSelector';
import { formValidation } from './FormValidation';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';

/**
 * Componente de formulario específico para pacientes
 * Reutilizable para crear y editar pacientes
 */
const PacienteForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  loading = false,
  mode = 'create', // 'create' o 'edit'
  showCredentials = false, // Los pacientes no necesitan credenciales por defecto
  modulos = [], // Lista de módulos disponibles desde la base de datos
}) => {
  // Estado del formulario
  const [formData, setFormData] = useState({
    // Datos de acceso (opcional)
    email: '',
    password: '',
    confirmPassword: '',
    
    // Datos personales
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    fechaNacimiento: '',
    curp: '',
    sexo: 'Hombre',
    
    // Datos de contacto
    direccion: '',
    estado: '',
    localidad: '',
    numeroCelular: '',
    
    // Datos médicos
    institucionSalud: '',
    idModulo: '',
    
    // Datos del sistema
    activo: true,
    // ✅ Campos de baja según formato GAM (Instrucción ⑭)
    fechaBaja: '',
    motivoBaja: '',
    numeroGam: '',
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
        fechaNacimiento: initialData.fecha_nacimiento || '',
        curp: initialData.curp || '',
        sexo: initialData.sexo || 'Hombre',
        direccion: initialData.direccion || '',
        estado: initialData.estado || '',
        localidad: initialData.localidad || '',
        numeroCelular: initialData.numero_celular || '',
        institucionSalud: initialData.institucion_salud || '',
        idModulo: initialData.id_modulo?.toString() || '',
        activo: initialData.activo !== undefined ? initialData.activo : true,
      });
      
      Logger.info('PacienteForm: Datos iniciales cargados', { 
        mode, 
        pacienteId: initialData.id_paciente,
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
        validation = formValidation.validatePatientName(value);
        break;
      case 'apellidoPaterno':
        validation = formValidation.validatePatientSurnames(value, formData.apellidoMaterno);
        break;
      case 'apellidoMaterno':
        validation = formValidation.validatePatientSurnames(formData.apellidoPaterno, value);
        break;
      case 'fechaNacimiento':
        validation = formValidation.validateBirthDate(value);
        break;
      case 'curp':
        validation = formValidation.validateCURP(value);
        break;
      case 'sexo':
        validation = formValidation.validateSex(value);
        break;
      case 'direccion':
        validation = formValidation.validateAddress(value);
        break;
      case 'numeroCelular':
        validation = formValidation.validateCellPhone(value);
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
      
      Logger.info('PacienteForm: Iniciando validación', { mode, hasInitialData: !!initialData });

      // Validar formulario completo
      const validation = formValidation.validatePatientForm(formData);
      
      if (!validation.isValid) {
        setErrors(validation.errors);
        Logger.warn('PacienteForm: Validación fallida', { 
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

      // Validar confirmación de contraseña si estamos creando con credenciales
      if (mode === 'create' && showCredentials && formData.password) {
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
        idModulo: parseInt(formData.idModulo) || 1,
        // ✅ Campos de baja según formato GAM (Instrucción ⑭)
        fechaBaja: formData.fechaBaja || null,
        motivoBaja: formData.motivoBaja || null,
        numeroGam: formData.numeroGam ? parseInt(formData.numeroGam) : null,
      };

      // Remover campos no necesarios para el backend
      if (mode === 'edit') {
        delete submitData.password;
        delete submitData.confirmPassword;
        delete submitData.email; // El email no se puede cambiar
      }

      // Si no hay credenciales, remover campos de acceso
      if (!showCredentials) {
        delete submitData.email;
        delete submitData.password;
        delete submitData.confirmPassword;
      }

      Logger.info('PacienteForm: Enviando datos', { 
        mode, 
        fieldsCount: Object.keys(submitData).length,
        hasPassword: !!submitData.password,
        hasCredentials: showCredentials
      });

      // Llamar función de envío
      await onSubmit(submitData);
      
      Logger.success('PacienteForm: Envío exitoso', { mode });
      
    } catch (error) {
      Logger.error('PacienteForm: Error en envío', { error: error.message });
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
            {mode === 'create' ? 'Registrar Nuevo Paciente' : 'Editar Paciente'}
          </Title>
          
          {/* Datos de Acceso (opcional) */}
          {showCredentials && (
            <>
              <Title style={styles.sectionTitle}>Datos de Acceso (Opcional)</Title>
              
              <FormField
                label="Email"
                value={formData.email}
                onChangeText={(value) => handleFieldChange('email', value)}
                placeholder="paciente@email.com"
                type="email"
                error={errors.email}
                validation={(value) => validateField('email', value)}
              />

              <FormField
                label="Contraseña"
                value={formData.password}
                onChangeText={(value) => handleFieldChange('password', value)}
                placeholder="Mínimo 6 caracteres"
                type="password"
                error={errors.password}
                validation={(value) => validateField('password', value)}
              />

              <FormField
                label="Confirmar Contraseña"
                value={formData.confirmPassword}
                onChangeText={(value) => handleFieldChange('confirmPassword', value)}
                placeholder="Repite la contraseña"
                type="password"
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
            placeholder="María"
            required
            error={errors.nombre}
            validation={(value) => validateField('nombre', value)}
          />

          <FormField
            label="Apellido Paterno"
            value={formData.apellidoPaterno}
            onChangeText={(value) => handleFieldChange('apellidoPaterno', value)}
            placeholder="González"
            required
            error={errors.apellidoPaterno}
            validation={(value) => validateField('apellidoPaterno', value)}
          />

          <FormField
            label="Apellido Materno"
            value={formData.apellidoMaterno}
            onChangeText={(value) => handleFieldChange('apellidoMaterno', value)}
            placeholder="Hernández (opcional)"
            error={errors.apellidoMaterno}
            validation={(value) => validateField('apellidoMaterno', value)}
          />

          <FormField
            label="Fecha de Nacimiento"
            value={formData.fechaNacimiento}
            onChangeText={(value) => handleFieldChange('fechaNacimiento', value)}
            placeholder="YYYY-MM-DD (ej: 1985-03-15)"
            type="date"
            required
            error={errors.fechaNacimiento}
            validation={(value) => validateField('fechaNacimiento', value)}
          />

          <FormField
            label="CURP"
            value={formData.curp}
            onChangeText={(value) => handleFieldChange('curp', value.toUpperCase())}
            placeholder="GOHM850315MDFNRN01"
            required
            error={errors.curp}
            validation={(value) => validateField('curp', value)}
          />

          {/* Selector de Sexo */}
          <View style={styles.radioContainer}>
            <Text style={styles.radioLabel}>Sexo *</Text>
            <View style={styles.radioGroup}>
              <View style={styles.radioOption}>
                <RadioButton
                  value="Hombre"
                  status={formData.sexo === 'Hombre' ? 'checked' : 'unchecked'}
                  onPress={() => handleFieldChange('sexo', 'Hombre')}
                />
                <Text style={styles.radioText}>Hombre</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton
                  value="Mujer"
                  status={formData.sexo === 'Mujer' ? 'checked' : 'unchecked'}
                  onPress={() => handleFieldChange('sexo', 'Mujer')}
                />
                <Text style={styles.radioText}>Mujer</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton
                  value="Otro"
                  status={formData.sexo === 'Otro' ? 'checked' : 'unchecked'}
                  onPress={() => handleFieldChange('sexo', 'Otro')}
                />
                <Text style={styles.radioText}>Otro</Text>
              </View>
            </View>
            {errors.sexo && <Text style={styles.errorText}>{errors.sexo}</Text>}
          </View>

          <Divider style={styles.divider} />

          {/* Datos de Contacto */}
          <Title style={styles.sectionTitle}>Datos de Contacto</Title>
          
          <FormField
            label="Dirección"
            value={formData.direccion}
            onChangeText={(value) => handleFieldChange('direccion', value)}
            placeholder="Calle Principal 123, Col. Centro"
            multiline
            numberOfLines={2}
            required
            error={errors.direccion}
            validation={(value) => validateField('direccion', value)}
          />

          <EstadoSelector
            label="Estado *"
            value={formData.estado}
            onValueChange={(estado) => {
              handleFieldChange('estado', estado);
              // Limpiar localidad cuando cambia el estado
              handleFieldChange('localidad', '');
            }}
            error={errors.estado}
            required={true}
          />

          <MunicipioSelector
            label="Municipio / Ciudad *"
            value={formData.localidad}
            onValueChange={(municipio) => handleFieldChange('localidad', municipio)}
            estadoSeleccionado={formData.estado}
            error={errors.localidad}
            required={true}
          />

          <FormField
            label="Número de Celular"
            value={formData.numeroCelular}
            onChangeText={(value) => handleFieldChange('numeroCelular', value)}
            placeholder="555-1001"
            type="phone"
            required
            error={errors.numeroCelular}
            validation={(value) => validateField('numeroCelular', value)}
          />

          <Divider style={styles.divider} />

          {/* Datos Médicos */}
          <Title style={styles.sectionTitle}>Datos Médicos</Title>
          
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
                  onPress={() => handleFieldChange('institucionSalud', institucion)}
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

          {/* Selector de Módulo */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Módulo *</Text>
            {modulos.length > 0 ? (
              <View style={styles.moduleSelector}>
                {modulos.map((modulo) => (
                  <TouchableOpacity
                    key={modulo.id_modulo}
                    style={[
                      styles.moduleOption,
                      formData.idModulo === modulo.id_modulo.toString() && styles.moduleOptionSelected
                    ]}
                    onPress={() => handleFieldChange('idModulo', modulo.id_modulo.toString())}
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
            ) : (
              <Text style={styles.loadingText}>Cargando módulos...</Text>
            )}
            {errors.idModulo && <Text style={styles.errorText}>{errors.idModulo}</Text>}
          </View>

          {/* ✅ Campos de Baja - Instrucción ⑭ (Solo en modo edición) */}
          {mode === 'edit' && (
            <>
              <Divider style={{ marginVertical: 16 }} />
              <Title style={{ fontSize: 18, marginBottom: 16 }}>⑭ Datos de Baja</Title>
              
              <View style={styles.fieldContainer}>
                <FormField
                  label="Número GAM (opcional)"
                  value={formData.numeroGam}
                  onChangeText={(value) => handleFieldChange('numeroGam', value.replace(/[^0-9]/g, ''))}
                  placeholder="Número de integrante en el GAM"
                  keyboardType="numeric"
                  error={errors.numeroGam}
                />
              </View>

              <View style={styles.fieldContainer}>
                <FormField
                  label="Fecha de Baja (opcional)"
                  value={formData.fechaBaja}
                  onChangeText={(value) => handleFieldChange('fechaBaja', value)}
                  placeholder="YYYY-MM-DD"
                  error={errors.fechaBaja}
                />
              </View>

              <View style={styles.fieldContainer}>
                <FormField
                  label="Motivo de Baja (opcional)"
                  value={formData.motivoBaja}
                  onChangeText={(value) => handleFieldChange('motivoBaja', value)}
                  placeholder="Motivo de la baja del paciente"
                  multiline
                  numberOfLines={3}
                  error={errors.motivoBaja}
                />
              </View>
            </>
          )}

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
              {mode === 'create' ? 'Registrar Paciente' : 'Actualizar Paciente'}
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
  radioContainer: {
    marginBottom: 16,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioText: {
    fontSize: 16,
    color: '#2D3748',
    marginLeft: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#E53E3E',
    marginTop: 4,
    marginLeft: 4,
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
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C3E50',
    marginBottom: 8,
  },
  moduleSelector: {
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#E8F5E8',
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
  loadingText: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    fontStyle: 'italic',
    padding: 12,
  },
});

export default PacienteForm;


