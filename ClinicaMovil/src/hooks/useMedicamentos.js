import { useState, useEffect, useCallback } from 'react';
import gestionService from '../api/gestionService';
import Logger from '../services/logger';

/**
 * Hook para gestionar el catálogo de medicamentos
 * CRUD completo: obtener, crear, actualizar, eliminar
 * 
 * @returns {Object} - { medicamentos, loading, error, total, createMedicamento, updateMedicamento, deleteMedicamento, refresh, search }
 */
const useMedicamentos = () => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMedicamentos = useCallback(async (search = '') => {
    setLoading(true);
    setError(null);
    
    try {
      Logger.info('useMedicamentos: Obteniendo catálogo de medicamentos', { search });
      
      const response = await gestionService.getAllMedicamentos({ search });
      
      if (response.success) {
        setMedicamentos(response.data.medicamentos || []);
        setTotal(response.data.total || 0);
        Logger.success(`useMedicamentos: ${response.data.medicamentos?.length || 0} medicamentos obtenidos`);
      } else {
        throw new Error(response.error || 'Error al obtener medicamentos');
      }
    } catch (err) {
      Logger.error('useMedicamentos: Error al obtener medicamentos', err);
      setError(err);
      setMedicamentos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicamentos(searchQuery);
  }, [fetchMedicamentos, searchQuery]);

  const createMedicamento = useCallback(async (data) => {
    try {
      Logger.info('useMedicamentos: Creando medicamento', { nombre: data.nombre_medicamento });
      
      const response = await gestionService.createMedicamento(data);
      
      if (response.success) {
        Logger.success('useMedicamentos: Medicamento creado exitosamente');
        await fetchMedicamentos(searchQuery); // Refrescar lista
        return { success: true, medicamento: response.data.medicamento };
      } else {
        throw new Error(response.error || 'Error al crear medicamento');
      }
    } catch (err) {
      Logger.error('useMedicamentos: Error al crear medicamento', err);
      return { success: false, error: err.message || 'Error al crear medicamento' };
    }
  }, [searchQuery, fetchMedicamentos]);

  const updateMedicamento = useCallback(async (id, data) => {
    try {
      Logger.info('useMedicamentos: Actualizando medicamento', { id });
      
      const response = await gestionService.updateMedicamento(id, data);
      
      if (response.success) {
        Logger.success('useMedicamentos: Medicamento actualizado exitosamente');
        await fetchMedicamentos(searchQuery); // Refrescar lista
        return { success: true, medicamento: response.data.medicamento };
      } else {
        throw new Error(response.error || 'Error al actualizar medicamento');
      }
    } catch (err) {
      Logger.error('useMedicamentos: Error al actualizar medicamento', err);
      return { success: false, error: err.message || 'Error al actualizar medicamento' };
    }
  }, [searchQuery, fetchMedicamentos]);

  const deleteMedicamento = useCallback(async (id) => {
    try {
      Logger.info('useMedicamentos: Eliminando medicamento', { id });
      
      const response = await gestionService.deleteMedicamento(id);
      
      if (response.success) {
        Logger.success('useMedicamentos: Medicamento eliminado exitosamente');
        await fetchMedicamentos(searchQuery); // Refrescar lista
        return { success: true };
      } else {
        throw new Error(response.error || 'Error al eliminar medicamento');
      }
    } catch (err) {
      Logger.error('useMedicamentos: Error al eliminar medicamento', err);
      return { success: false, error: err.message || 'Error al eliminar medicamento' };
    }
  }, [searchQuery, fetchMedicamentos]);

  const refresh = useCallback(() => {
    fetchMedicamentos(searchQuery);
  }, [fetchMedicamentos, searchQuery]);

  const search = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  return {
    medicamentos,
    loading,
    error,
    total,
    createMedicamento,
    updateMedicamento,
    deleteMedicamento,
    refresh,
    search,
    searchQuery
  };
};

export default useMedicamentos;

