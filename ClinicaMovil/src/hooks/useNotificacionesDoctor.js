import { useState, useEffect, useCallback } from 'react';
import gestionService from '../api/gestionService';
import Logger from '../services/logger';

/**
 * Hook para obtener notificaciones de un doctor
 * Incluye filtros avanzados, paginación y búsqueda
 * 
 * @param {number} doctorId - ID del doctor
 * @param {Object} filters - Filtros para las notificaciones
 * @param {number} filters.limit - Número de registros por página
 * @param {number} filters.offset - Offset para paginación
 * @param {string} filters.tipo - Tipo de notificación (cita_actualizada, nuevo_mensaje, etc.)
 * @param {string} filters.estado - Estado (enviada, leida, archivada)
 * @param {string} filters.fecha_desde - Fecha inicial (YYYY-MM-DD)
 * @param {string} filters.fecha_hasta - Fecha final (YYYY-MM-DD)
 * @param {string} filters.search - Búsqueda por título o mensaje
 * @returns {Object} - { notificaciones, loading, error, total, hasMore, contadorNoLeidas, refresh, marcarLeida, archivar }
 */
const useNotificacionesDoctor = (doctorId, filters = {}) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [contadorNoLeidas, setContadorNoLeidas] = useState(0);

  const {
    limit = 50,
    offset = 0,
    tipo = null,
    estado = null,
    fecha_desde = null,
    fecha_hasta = null,
    search = ''
  } = filters;

  const fetchNotificaciones = useCallback(async () => {
    if (!doctorId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      Logger.info('useNotificacionesDoctor: Obteniendo notificaciones', { 
        doctorId, limit, offset, tipo, estado, fecha_desde, fecha_hasta, search 
      });
      
      const response = await gestionService.getNotificacionesDoctor(doctorId, {
        limit,
        offset,
        tipo,
        estado,
        fecha_desde,
        fecha_hasta,
        search
      });
      
      if (response.success) {
        setNotificaciones(response.data.notificaciones || []);
        setTotal(response.data.total || 0);
        setHasMore(response.data.hasMore || false);
        Logger.success(`useNotificacionesDoctor: ${response.data.notificaciones?.length || 0} notificaciones obtenidas`);
      } else {
        throw new Error(response.error || 'Error al obtener notificaciones');
      }
    } catch (err) {
      Logger.error('useNotificacionesDoctor: Error al obtener notificaciones', err);
      setError(err);
      setNotificaciones([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, limit, offset, tipo, estado, fecha_desde, fecha_hasta, search]);

  const fetchContador = useCallback(async () => {
    if (!doctorId) return;

    try {
      const response = await gestionService.getContadorNotificaciones(doctorId);
      if (response.success) {
        setContadorNoLeidas(response.data.no_leidas || 0);
      }
    } catch (err) {
      Logger.error('useNotificacionesDoctor: Error obteniendo contador', err);
    }
  }, [doctorId]);

  useEffect(() => {
    // Solo cargar si doctorId está disponible
    if (doctorId) {
      fetchNotificaciones();
      fetchContador();
    } else {
      setLoading(false);
    }
  }, [doctorId, fetchNotificaciones, fetchContador]);

  const refresh = useCallback(() => {
    if (doctorId) {
      // Forzar recarga incluso si hay datos
      setLoading(true);
      fetchNotificaciones();
      fetchContador();
    }
  }, [doctorId, fetchNotificaciones, fetchContador]);

  const marcarLeida = useCallback(async (notificacionId) => {
    if (!doctorId) return;

    try {
      await gestionService.marcarNotificacionLeida(doctorId, notificacionId);
      // Si estamos filtrando por estado 'enviada', remover la notificación de la lista
      // ya que ahora está leída y no debe mostrarse
      if (estado === 'enviada') {
        setNotificaciones(prev => prev.filter(notif => notif.id_notificacion !== notificacionId));
        setTotal(prev => Math.max(0, prev - 1));
      } else {
        // Si no hay filtro de estado, actualizar el estado local
        setNotificaciones(prev => prev.map(notif => 
          notif.id_notificacion === notificacionId 
            ? { ...notif, estado: 'leida', fecha_lectura: new Date().toISOString() }
            : notif
        ));
      }
      // Actualizar contador
      if (contadorNoLeidas > 0) {
        setContadorNoLeidas(prev => prev - 1);
      }
      Logger.success('Notificación marcada como leída');
    } catch (err) {
      Logger.error('Error marcando notificación como leída', err);
      throw err;
    }
  }, [doctorId, contadorNoLeidas, estado]);

  const archivar = useCallback(async (notificacionId) => {
    if (!doctorId) return;

    try {
      await gestionService.archivarNotificacion(doctorId, notificacionId);
      // Remover de la lista
      setNotificaciones(prev => prev.filter(notif => notif.id_notificacion !== notificacionId));
      setTotal(prev => prev - 1);
      Logger.success('Notificación archivada');
    } catch (err) {
      Logger.error('Error archivando notificación', err);
      throw err;
    }
  }, [doctorId]);

  return {
    notificaciones,
    loading,
    error,
    total,
    hasMore,
    contadorNoLeidas,
    refresh,
    marcarLeida,
    archivar
  };
};

export default useNotificacionesDoctor;

