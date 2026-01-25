import { useState, useEffect, useCallback, useRef } from 'react';
import gestionService from '../api/gestionService';
import Logger from '../services/logger';

/**
 * Hook para obtener todas las citas del sistema con Infinite Scroll
 * Incluye filtros avanzados, paginación incremental y búsqueda
 * 
 * @param {Object} filters - Filtros para las citas
 * @param {number} filters.pageSize - Número de registros por página (default: 20)
 * @param {number} filters.doctorId - ID del doctor
 * @param {number} filters.pacienteId - ID del paciente
 * @param {string} filters.fechaDesde - Fecha inicial (YYYY-MM-DD)
 * @param {string} filters.fechaHasta - Fecha final (YYYY-MM-DD)
 * @param {string} filters.search - Búsqueda por motivo
 * @returns {Object} - { citas, loading, loadingMore, error, total, hasMore, refresh, loadMore }
 */
const useTodasCitas = (filters = {}) => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true); // Carga inicial
  const [loadingMore, setLoadingMore] = useState(false); // Carga de más páginas
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Ref para evitar llamadas duplicadas
  const isLoadingRef = useRef(false);
  // Ref para tracking de filtros anteriores
  const prevFiltersRef = useRef(null);

  const {
    pageSize = 20,
    doctorId = null,
    pacienteId = null,
    fechaDesde = null,
    fechaHasta = null,
    search = ''
  } = filters;

  // Crear una key única para los filtros actuales
  const filtersKey = JSON.stringify({ doctorId, pacienteId, fechaDesde, fechaHasta, search });

  /**
   * Fetch citas con offset específico
   * @param {number} page - Número de página (0-indexed)
   * @param {boolean} isInitial - Si es carga inicial (reemplaza) o incremental (acumula)
   */
  const fetchCitas = useCallback(async (page = 0, isInitial = true) => {
    // Evitar llamadas duplicadas
    if (isLoadingRef.current) {
      Logger.debug('useTodasCitas: Ignorando llamada duplicada');
      return;
    }
    
    isLoadingRef.current = true;
    
    if (isInitial) {
      setLoading(true);
      setCitas([]);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    const offset = page * pageSize;
    
    try {
      Logger.info('useTodasCitas: Obteniendo citas', { 
        page, 
        offset, 
        pageSize, 
        isInitial,
        doctorId, 
        pacienteId, 
        fechaDesde, 
        fechaHasta, 
        search 
      });
      
      const response = await gestionService.getAllCitas({
        limit: pageSize,
        offset,
        doctor: doctorId,
        paciente: pacienteId,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        search
      });
      
      if (response.success) {
        const newCitas = response.data.citas || [];
        const totalCount = response.data.total || 0;
        
        if (isInitial) {
          // Carga inicial: reemplazar
          setCitas(newCitas);
        } else {
          // Carga incremental: acumular sin duplicados
          setCitas(prev => {
            const existingIds = new Set(prev.map(c => c.id_cita));
            const uniqueNewCitas = newCitas.filter(c => !existingIds.has(c.id_cita));
            return [...prev, ...uniqueNewCitas];
          });
        }
        
        setTotal(totalCount);
        setCurrentPage(page);
        
        // Calcular si hay más páginas
        const loadedCount = (page + 1) * pageSize;
        setHasMore(loadedCount < totalCount && newCitas.length === pageSize);
        
        Logger.success(`useTodasCitas: ${newCitas.length} citas obtenidas (página ${page + 1}, total: ${totalCount})`);
      } else {
        throw new Error(response.error || 'Error al obtener citas');
      }
    } catch (err) {
      Logger.error('useTodasCitas: Error al obtener citas', err);
      setError(err);
      if (isInitial) {
        setCitas([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [pageSize, doctorId, pacienteId, fechaDesde, fechaHasta, search]);

  // Efecto para carga inicial y cuando cambian los filtros
  useEffect(() => {
    // Detectar si los filtros cambiaron
    if (prevFiltersRef.current !== filtersKey) {
      prevFiltersRef.current = filtersKey;
      setCurrentPage(0);
      setHasMore(true);
      fetchCitas(0, true);
    }
  }, [filtersKey, fetchCitas]);

  // Carga inicial
  useEffect(() => {
    if (prevFiltersRef.current === null) {
      prevFiltersRef.current = filtersKey;
      fetchCitas(0, true);
    }
  }, []);

  /**
   * Cargar más citas (siguiente página)
   * Llamar desde onEndReached de FlatList
   */
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading || isLoadingRef.current) {
      Logger.debug('useTodasCitas: loadMore ignorado', { hasMore, loadingMore, loading });
      return;
    }
    
    const nextPage = currentPage + 1;
    Logger.info('useTodasCitas: Cargando más citas', { nextPage });
    fetchCitas(nextPage, false);
  }, [hasMore, loadingMore, loading, currentPage, fetchCitas]);

  /**
   * Refrescar desde el inicio (pull-to-refresh)
   */
  const refresh = useCallback(() => {
    setCurrentPage(0);
    setHasMore(true);
    fetchCitas(0, true);
  }, [fetchCitas]);

  return {
    citas,
    loading,        // true solo en carga inicial
    loadingMore,    // true cuando carga más páginas
    error,
    total,
    hasMore,
    currentPage,
    refresh,        // Pull-to-refresh
    loadMore        // Infinite scroll - cargar siguiente página
  };
};

export default useTodasCitas;
