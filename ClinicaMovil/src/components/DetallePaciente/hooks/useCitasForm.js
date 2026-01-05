import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { validateCita } from '../../../utils/citaValidator';
import { canExecute } from '../../../utils/validation';
import Logger from '../../../services/logger';

/**
 * useCitasForm - Hook para gestionar el formulario de citas
 * 
 * Centraliza la lógica del formulario de citas incluyendo:
 * - Estado del formulario
 * - Validaciones
 * - Envío con rate limiting
 * - Manejo de errores específico
 * 
 * @param {Function} onCreate - Función para crear la cita en el backend
 * @param {Function} onSuccess - Callback cuando se crea exitosamente
 * 
 * @example
 * const {
 *   formData,
 *   loading,
 *   errors,
 *   updateField,
 *   reset,
 *   submit
 * } = useCitasForm(
 *   gestionService.createCita,
 *   () => refreshData()
 * );
 */
const useCitasForm = (onCreate, onSuccess) => {
  const [formData, setFormData] = useState({
    id_doctor: '',
    fecha_cita: '',
    motivo: '',
    observaciones: '',
    es_primera_consulta: false
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  /**
   * Actualiza un campo del formulario
   */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Limpiar error de ese campo si existe
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Resetea el formulario a valores iniciales
   */
  const reset = useCallback(() => {
    setFormData({
      id_doctor: '',
      fecha_cita: '',
      motivo: '',
      observaciones: '',
      es_primera_consulta: false
    });
    setErrors({});
  }, []);

  /**
   * Valida los datos del formulario
   */
  const validate = useCallback(() => {
    const validation = validateCita(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return false;
    }
    setErrors({});
    return true;
  }, [formData]);

  /**
   * Envía el formulario con validaciones y rate limiting
   */
  const submit = useCallback(async (pacienteId) => {
    // Rate limiting
    const rateCheck = canExecute('saveCita', 1000);
    if (!rateCheck.allowed) {
      Alert.alert('Espere', 'Por favor espere antes de volver a intentar');
      return { success: false, error: 'rate_limit' };
    }

    // Validar
    if (!validate()) {
      const firstError = Object.values(errors)[0];
      Alert.alert('Validación', firstError);
      Logger.warn('Validación fallida en cita', errors);
      return { success: false, error: 'validation' };
    }

    setLoading(true);
    try {
      Logger.info('Guardando cita...', { 
        paciente: pacienteId,
        fecha: formData.fecha_cita
      });

      const validation = validateCita(formData);
      const dataToSend = {
        id_paciente: pacienteId,
        id_doctor: validation.sanitizedData.id_doctor || null,
        fecha_cita: validation.sanitizedData.fecha_cita,
        motivo: validation.sanitizedData.motivo,
        observaciones: validation.sanitizedData.observaciones || null,
        es_primera_consulta: validation.sanitizedData.es_primera_consulta
      };

      const response = await onCreate(dataToSend);
      
      if (response.success) {
        Logger.info('Cita guardada exitosamente');
        Alert.alert('Éxito', 'Cita registrada correctamente');
        reset();
        if (onSuccess) onSuccess();
        return { success: true, data: response.data };
      } else {
        throw new Error(response.error || 'Error al crear la cita');
      }
    } catch (error) {
      Logger.error('Error guardando cita', {
        error: error.message,
        stack: error.stack,
        paciente: pacienteId,
        data: formData
      });
      
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
        }
      } else if (error.request) {
        errorMessage = 'No hay conexión con el servidor. Verifique su internet.';
      }
      
      Alert.alert('Error', errorMessage);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, [formData, errors, validate, onCreate, onSuccess, reset]);

  return {
    formData,
    loading,
    errors,
    updateField,
    reset,
    submit,
    validate
  };
};

export default useCitasForm;




