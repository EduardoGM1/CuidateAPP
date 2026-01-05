import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import Logger from '../services/logger';
import { canExecute } from '../utils/validation';

/**
 * Hook genérico para manejar operaciones de guardado
 * Elimina duplicación de código en handlers de guardado
 * 
 * @param {Object} config - Configuración del handler
 * @param {Function} config.serviceMethod - Método del servicio a llamar (async)
 * @param {Object} config.formData - Datos del formulario
 * @param {Function} config.resetForm - Función para resetear el formulario
 * @param {boolean} config.modalState - Estado del modal (para cerrarlo)
 * @param {Function} config.setModalState - Función para cerrar el modal
 * @param {Function} config.refreshData - Función para refrescar datos después de guardar
 * @param {Function} config.validationFn - Función de validación personalizada (opcional)
 * @param {Function} config.prepareData - Función para preparar datos antes de enviar (opcional)
 * @param {string} config.actionName - Nombre de la acción para rate limiting
 * @param {string|Function} config.successMessage - Mensaje de éxito personalizado (puede ser función que recibe response)
 * @param {string} config.errorMessage - Mensaje de error por defecto
 * @param {Object} config.logContext - Contexto adicional para logs (ej: { pacienteId, ... })
 * 
 * @returns {Object} - { handleSave, saving, error }
 * 
 * @example
 * const { handleSave, saving } = useSaveHandler({
 *   serviceMethod: (data) => gestionService.createPacienteDiagnostico(pacienteId, data),
 *   formData: formDataDiagnostico,
 *   resetForm: resetFormDiagnostico,
 *   modalState: showAddDiagnostico,
 *   setModalState: setShowAddDiagnostico,
 *   refreshData: refreshMedicalData,
 *   validationFn: () => {
 *     if (!formDataDiagnostico.id_cita) {
 *       Alert.alert('Validación', 'Por favor seleccione una cita');
 *       return false;
 *     }
 *     return true;
 *   },
 *   prepareData: (formData) => ({
 *     id_cita: parseInt(formData.id_cita),
 *     descripcion: formData.descripcion.trim()
 *   }),
 *   actionName: 'saveDiagnostico',
 *   successMessage: 'Diagnóstico registrado correctamente',
 *   logContext: { pacienteId: paciente.id_paciente }
 * });
 */
export const useSaveHandler = (config) => {
  const {
    serviceMethod,
    formData,
    resetForm,
    modalState,
    setModalState,
    refreshData,
    validationFn,
    prepareData,
    actionName,
    successMessage = 'Guardado exitosamente',
    errorMessage = 'No se pudo guardar. Intente nuevamente.',
    logContext = {}
  } = config;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Maneja errores de forma centralizada
   */
  const handleError = useCallback((error, customMessage = null) => {
    Logger.error(`Error en ${actionName || 'guardado'}`, {
      error: error.message,
      stack: error.stack,
      ...logContext
    });

    let finalErrorMessage = customMessage || errorMessage;

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 400) {
        finalErrorMessage = errorData?.error || 'Datos inválidos. Verifique la información.';
      } else if (status === 401 || status === 403) {
        finalErrorMessage = 'No tiene permisos para realizar esta acción.';
      } else if (status === 404) {
        finalErrorMessage = errorData?.error || 'Recurso no encontrado.';
      } else if (status === 409) {
        finalErrorMessage = errorData?.error || 'El registro ya existe.';
      } else if (status === 500) {
        finalErrorMessage = 'Error del servidor. Intente más tarde.';
      }
    } else if (error.request) {
      finalErrorMessage = 'Error de conexión. Verifique su internet.';
    } else if (error.message) {
      // Si el error tiene un mensaje personalizado, usarlo
      finalErrorMessage = error.message;
    }

    setError(finalErrorMessage);
    Alert.alert('Error', finalErrorMessage);
  }, [actionName, errorMessage, logContext]);

  /**
   * Handler principal de guardado
   */
  const handleSave = useCallback(async () => {
    // Limpiar error previo
    setError(null);

    // 1. Validación personalizada (si existe)
    if (validationFn) {
      const validationResult = validationFn(formData);
      if (validationResult === false) {
        // La validación ya mostró el Alert, solo retornar
        return;
      }
      // Si validationFn devuelve un objeto con isValid, verificar
      if (typeof validationResult === 'object' && validationResult.isValid === false) {
        const firstError = Object.values(validationResult.errors || {})[0];
        if (firstError) {
          Alert.alert('Validación', firstError);
        }
        return;
      }
    }

    // 2. Rate limiting
    if (actionName) {
      const rateCheck = canExecute(actionName, 1000);
      if (!rateCheck.allowed) {
        Alert.alert('Espera', 'Por favor espera un momento antes de intentar nuevamente');
        return;
      }
    }

    // 3. Preparar datos
    let dataToSend = formData;
    if (prepareData) {
      try {
        dataToSend = prepareData(formData);
      } catch (prepError) {
        Logger.error(`Error preparando datos para ${actionName}`, prepError);
        Alert.alert('Error', 'Error al preparar los datos. Verifique la información.');
        return;
      }
    }

    // 4. Guardar
    setSaving(true);
    try {
      Logger.info(`Guardando ${actionName || 'datos'}...`, {
        ...logContext,
        dataKeys: Object.keys(dataToSend)
      });

      const response = await serviceMethod(dataToSend);

      Logger.info(`${actionName || 'Datos'} guardado exitosamente`, {
        ...logContext,
        responseId: response?.data?.id || response?.id
      });

      // Manejar mensaje dinámico (puede ser función o string)
      const finalSuccessMessage = typeof successMessage === 'function' 
        ? successMessage(response) 
        : successMessage;
      Alert.alert('Éxito', finalSuccessMessage);

      // 5. Cerrar modal y resetear formulario
      if (setModalState) {
        setModalState(false);
      }
      if (resetForm) {
        resetForm();
      }

      // 6. Refrescar datos
      if (refreshData) {
        await refreshData();
      }

      return response;
    } catch (error) {
      handleError(error);
      throw error; // Re-lanzar para que el componente pueda manejarlo si es necesario
    } finally {
      setSaving(false);
    }
  }, [
    formData,
    serviceMethod,
    resetForm,
    modalState,
    setModalState,
    refreshData,
    validationFn,
    prepareData,
    actionName,
    successMessage,
    handleError,
    logContext
  ]);

  return {
    handleSave,
    saving,
    error
  };
};

export default useSaveHandler;
