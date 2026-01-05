import { useState, useEffect, useCallback } from 'react';
import gestionService from '../api/gestionService';
import Logger from '../services/logger';

/**
 * Hook para obtener todas las citas del sistema
 * Incluye filtros avanzados, paginación y búsqueda
 * 
 * @param {Object} filters - Filtros para las citas
 * @param {number} filters.limit - Número de registros por página
 * @param {number} filters.offset - Offset para paginación
 * @param {number} filters.doctorId - ID del doctor
 * @param {number} filters.pacienteId - ID del paciente
 * @param {string} filters.fechaDesde - Fecha inicial (YYYY-MM-DD)
 * @param {string} filters.fechaHasta - Fecha final (YYYY-MM-DD)
 * @param {string} filters.search - Búsqueda por motivo
 * @returns {Object} - { citas, loading, error, total, hasMore, refresh }
 */
const useTodasCitas = (filters = {}) => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const {
    limit = 50,
    offset = 0,
    doctorId = null,
    pacienteId = null,
    fechaDesde = null,
    fechaHasta = null,
    search = ''
  } = filters;

  const fetchCitas = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      Logger.info('useTodasCitas: Obteniendo todas las citas', { 
        limit, offset, doctorId, pacienteId, fechaDesde, fechaHasta, search 
      });
      
      const response = await gestionService.getAllCitas({
        limit,
        offset,
        doctor: doctorId,
        paciente: pacienteId,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        search
      });
      
      if (response.success) {
        setCitas(response.data.citas || []);
        setTotal(response.data.total || 0);
        setHasMore(response.data.hasMore || false);
        Logger.success(`useTodasCitas: ${response.data.citas?.length || 0} citas obtenidas`);
      } else {
        throw new Error(response.error || 'Error al obtener citas');
      }
    } catch (err) {
      Logger.error('useTodasCitas: Error al obtener citas', err);
      setError(err);
      setCitas([]);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, doctorId, pacienteId, fechaDesde, fechaHasta, search]);

  useEffect(() => {
    fetchCitas();
  }, [fetchCitas]);

  const refresh = useCallback(() => {
    fetchCitas();
  }, [fetchCitas]);

  return {
    citas,
    loading,
    error,
    total,
    hasMore,
    refresh
  };
};

export default useTodasCitas;

