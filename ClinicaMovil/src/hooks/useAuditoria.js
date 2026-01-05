import { useState, useEffect, useCallback } from 'react';
import gestionService from '../api/gestionService';
import Logger from '../services/logger';

/**
 * Hook para obtener historial de auditoría del sistema
 * Incluye filtros avanzados, paginación y búsqueda
 * 
 * @param {Object} filters - Filtros para la auditoría
 * @param {number} filters.limit - Número de registros por página
 * @param {number} filters.offset - Offset para paginación
 * @param {string} filters.tipo_accion - Tipo de acción (cita_estado_actualizado, etc.)
 * @param {string} filters.entidad_afectada - Entidad afectada (cita, paciente, doctor, sistema)
 * @param {number} filters.id_usuario - ID del usuario
 * @param {string} filters.fecha_desde - Fecha inicial (YYYY-MM-DD)
 * @param {string} filters.fecha_hasta - Fecha final (YYYY-MM-DD)
 * @param {string} filters.search - Búsqueda por descripción
 * @returns {Object} - { auditoria, loading, error, total, hasMore, refresh }
 */
const useAuditoria = (filters = {}) => {
  const [auditoria, setAuditoria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const {
    limit = 50,
    offset = 0,
    tipo_accion = null,
    entidad_afectada = null,
    id_usuario = null,
    fecha_desde = null,
    fecha_hasta = null,
    search = '',
    severidad = null,
    ip_address = null
  } = filters;

  const fetchAuditoria = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      Logger.info('useAuditoria: Obteniendo historial de auditoría', { 
        limit, offset, tipo_accion, entidad_afectada, id_usuario, fecha_desde, fecha_hasta, search 
      });
      
      const response = await gestionService.getAuditoria({
        limit,
        offset,
        tipo_accion,
        entidad_afectada,
        id_usuario,
        fecha_desde,
        fecha_hasta,
        search,
        severidad,
        ip_address
      });
      
      if (response.success) {
        setAuditoria(response.data.auditoria || []);
        setTotal(response.data.total || 0);
        setHasMore(response.data.hasMore || false);
        Logger.success(`useAuditoria: ${response.data.auditoria?.length || 0} registros obtenidos`);
      } else {
        throw new Error(response.error || 'Error al obtener auditoría');
      }
    } catch (err) {
      Logger.error('useAuditoria: Error al obtener auditoría', err);
      setError(err);
      setAuditoria([]);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, tipo_accion, entidad_afectada, id_usuario, fecha_desde, fecha_hasta, search, severidad, ip_address]);

  useEffect(() => {
    fetchAuditoria();
  }, [fetchAuditoria]);

  const refresh = useCallback(() => {
    fetchAuditoria();
  }, [fetchAuditoria]);

  // Función para exportar datos
  const exportarDatos = useCallback(async (formato = 'csv') => {
    try {
      Logger.info('useAuditoria: Exportando datos', { formato, filters });
      const response = await gestionService.exportarAuditoria(formato, filters);
      return response;
    } catch (err) {
      Logger.error('useAuditoria: Error exportando datos', err);
      throw err;
    }
  }, [filters]);

  // Función para obtener estadísticas
  const obtenerEstadisticas = useCallback(async () => {
    try {
      Logger.info('useAuditoria: Obteniendo estadísticas');
      const response = await gestionService.getEstadisticasAuditoria({
        fecha_desde,
        fecha_hasta
      });
      return response;
    } catch (err) {
      Logger.error('useAuditoria: Error obteniendo estadísticas', err);
      throw err;
    }
  }, [fecha_desde, fecha_hasta]);

  // Función para obtener usuarios
  const obtenerUsuarios = useCallback(async () => {
    try {
      Logger.info('useAuditoria: Obteniendo usuarios');
      const response = await gestionService.getUsuariosAuditoria();
      return response;
    } catch (err) {
      Logger.error('useAuditoria: Error obteniendo usuarios', err);
      throw err;
    }
  }, []);

  return {
    auditoria,
    loading,
    error,
    total,
    hasMore,
    refresh,
    exportarDatos,
    obtenerEstadisticas,
    obtenerUsuarios
  };
};

export default useAuditoria;

