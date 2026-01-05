import { useState, useCallback } from 'react';

/**
 * useModalsState - Hook para gestionar estados de múltiples modales
 * 
 * Centraliza la gestión de todos los estados booleanos de modales,
 * reduciendo de 17 useState separados a un solo hook.
 * 
 * @param {Object} config - Configuración de modales
 * @returns {Object} - Estados y funciones para controlar modales
 * 
 * @example
 * const { modals, openModal, closeModal, toggleModal, closeAll } = useModalsState({
 *   signos: ['add', 'all', 'options'],
 *   citas: ['add', 'all', 'options'],
 * });
 * 
 * // Abrir modal de agregar signos vitales
 * openModal('signos', 'add');
 * 
 * // Cerrar todos los modales
 * closeAll();
 */
const useModalsState = (config = {}) => {
  // Crear estado inicial dinámicamente basado en la configuración
  const createInitialState = () => {
    const state = {};
    Object.keys(config).forEach(category => {
      config[category].forEach(action => {
        state[`${category}_${action}`] = false;
      });
    });
    return state;
  };

  const [modals, setModals] = useState(createInitialState);

  /**
   * Abre un modal específico
   * @param {string} category - Categoría (ej: 'signos', 'citas')
   * @param {string} action - Acción (ej: 'add', 'all', 'options')
   */
  const openModal = useCallback((category, action) => {
    const key = `${category}_${action}`;
    setModals(prev => ({
      ...prev,
      [key]: true
    }));
  }, []);

  /**
   * Cierra un modal específico
   * @param {string} category - Categoría
   * @param {string} action - Acción
   */
  const closeModal = useCallback((category, action) => {
    const key = `${category}_${action}`;
    setModals(prev => ({
      ...prev,
      [key]: false
    }));
  }, []);

  /**
   * Cambia el estado de un modal (toggle)
   * @param {string} category - Categoría
   * @param {string} action - Acción
   */
  const toggleModal = useCallback((category, action) => {
    const key = `${category}_${action}`;
    setModals(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  /**
   * Cierra todos los modales
   */
  const closeAll = useCallback(() => {
    setModals(createInitialState());
  }, []);

  /**
   * Verifica si un modal está abierto
   * @param {string} category - Categoría
   * @param {string} action - Acción
   * @returns {boolean}
   */
  const isModalOpen = useCallback((category, action) => {
    const key = `${category}_${action}`;
    return modals[key] || false;
  }, [modals]);

  /**
   * Cierra todos los modales de una categoría específica
   * @param {string} category - Categoría
   */
  const closeCategory = useCallback((category) => {
    setModals(prev => {
      const updated = { ...prev };
      config[category]?.forEach(action => {
        const key = `${category}_${action}`;
        updated[key] = false;
      });
      return updated;
    });
  }, [config]);

  return {
    modals,
    openModal,
    closeModal,
    toggleModal,
    closeAll,
    isModalOpen,
    closeCategory
  };
};

export default useModalsState;




