import { useState, useCallback } from 'react';

/**
 * Hook reutilizable para gestionar estado de formularios
 * Elimina la necesidad de múltiples useState y funciones reset/update repetitivas
 * 
 * @param {Object} initialValues - Valores iniciales del formulario
 * @returns {Object} - Estado y funciones para gestionar el formulario
 * 
 * @example
 * const { formData, updateField, resetForm, setFormData } = useFormState({
 *   nombre: '',
 *   email: '',
 *   edad: ''
 * });
 * 
 * // Actualizar campo
 * updateField('nombre', 'Juan');
 * 
 * // Resetear formulario
 * resetForm();
 */
export const useFormState = (initialValues = {}) => {
  const [formData, setFormData] = useState(initialValues);

  /**
   * Actualiza un campo específico del formulario
   * @param {string} field - Nombre del campo
   * @param {any} value - Nuevo valor
   */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  /**
   * Actualiza múltiples campos a la vez
   * @param {Object} updates - Objeto con campos a actualizar
   */
  const updateFields = useCallback((updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  /**
   * Resetea el formulario a los valores iniciales
   */
  const resetForm = useCallback(() => {
    setFormData(initialValues);
  }, [initialValues]);

  /**
   * Establece el formulario completo
   * @param {Object} data - Nuevos datos del formulario
   */
  const setFormDataDirect = useCallback((data) => {
    setFormData(data);
  }, []);

  /**
   * Resetea el formulario a valores personalizados
   * @param {Object} newValues - Nuevos valores iniciales
   */
  const resetTo = useCallback((newValues) => {
    setFormData(newValues);
  }, []);

  return {
    formData,
    updateField,
    updateFields,
    resetForm,
    setFormData: setFormDataDirect,
    resetTo
  };
};

export default useFormState;


