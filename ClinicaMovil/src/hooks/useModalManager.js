/**
 * @file useModalManager.js
 * @description Hook personalizado para gestión centralizada de modales
 * @author Senior Developer
 * @date 2025-10-28
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Logger from '../services/logger';

/**
 * Hook para gestión centralizada de múltiples modales
 * Elimina la necesidad de múltiples useState para cada modal
 * 
 * @returns {Object} Objeto con métodos para gestionar modales
 * @example
 * const { open, close, toggle, isOpen } = useModalManager();
 * open('addCita');
 * close('addCita');
 * toggle('optionsCitas');
 * const visible = isOpen('addCita');
 */
export const useModalManager = () => {
  const [modals, setModals] = useState({});
  const previousState = useRef({});

  /**
   * Registra un modal con un estado inicial
   * @param {string} name - Nombre del modal
   * @param {boolean} initialState - Estado inicial (default: false)
   */
  const register = useCallback((name, initialState = false) => {
    setModals(prev => {
      // Solo registrar si no existe
      if (!prev.hasOwnProperty(name)) {
        return {
          ...prev,
          [name]: {
            show: initialState,
            data: null
          }
        };
      }
      return prev;
    });
  }, []);

  /**
   * Abre un modal
   * @param {string} name - Nombre del modal
   * @param {*} data - Datos opcionales para el modal
   */
  const open = useCallback((name, data = null) => {
    setModals(prev => ({
      ...prev,
      [name]: {
        show: true,
        data
      }
    }));

    Logger.debug(`Modal opened: ${name}`, { name, data });

    // Guardar estado previo para debugging
    previousState.current[name] = { show: false, data: null };
  }, []);

  /**
   * Cierra un modal
   * @param {string} name - Nombre del modal
   */
  const close = useCallback((name) => {
    setModals(prev => {
      if (prev[name]) {
        return {
          ...prev,
          [name]: {
            show: false,
            data: null
          }
        };
      }
      return prev;
    });

    Logger.debug(`Modal closed: ${name}`, { name });
  }, []);

  /**
   * Alterna el estado de un modal (abre si está cerrado, cierra si está abierto)
   * @param {string} name - Nombre del modal
   * @param {*} data - Datos opcionales para el modal
   */
  const toggle = useCallback((name, data = null) => {
    setModals(prev => ({
      ...prev,
      [name]: {
        show: !prev[name]?.show,
        data: prev[name]?.show ? null : data
      }
    }));

    Logger.debug(`Modal toggled: ${name}`, { name, newState: !modals[name]?.show });
  }, [modals]);

  /**
   * Verifica si un modal está abierto
   * @param {string} name - Nombre del modal
   * @returns {boolean} true si el modal está visible
   */
  const isOpen = useCallback((name) => {
    return modals[name]?.show || false;
  }, [modals]);

  /**
   * Obtiene los datos asociados a un modal
   * @param {string} name - Nombre del modal
   * @returns {*} Datos del modal o null
   */
  const getModalData = useCallback((name) => {
    return modals[name]?.data || null;
  }, [modals]);

  /**
   * Cierra todos los modales
   */
  const closeAll = useCallback(() => {
    setModals(prev => {
      const newState = {};
      Object.keys(prev).forEach(key => {
        newState[key] = { show: false, data: null };
      });
      return newState;
    });

    Logger.debug('All modals closed');
  }, []);

  /**
   * Obtiene el estado actual de todos los modales
   * @returns {Object} Estado de todos los modales
   */
  const getAllModals = useCallback(() => {
    return modals;
  }, [modals]);

  return {
    // Métodos principales
    open,
    close,
    toggle,
    isOpen,
    getModalData,
    
    // Métodos auxiliares
    closeAll,
    register,
    getAllModals,
    
    // Estado (read-only)
    modals
  };
};

export default useModalManager;












