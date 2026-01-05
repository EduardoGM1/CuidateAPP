/**
 * Hook para obtener y gestionar conversaciones de un doctor
 * Incluye actualización en tiempo real vía WebSocket
 */

import { useState, useEffect, useCallback } from 'react';
import { getConversacionesDoctor } from '../api/chatService';
import useWebSocket from './useWebSocket';
import Logger from '../services/logger';

/**
 * Hook useConversacionesDoctor
 * @param {number} doctorId - ID del doctor
 * @returns {Object} - { conversaciones, loading, error, refresh }
 */
const useConversacionesDoctor = (doctorId) => {
  const [conversaciones, setConversaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { subscribeToEvent, isConnected } = useWebSocket();

  const fetchConversaciones = useCallback(async () => {
    if (!doctorId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      Logger.info('useConversacionesDoctor: Obteniendo conversaciones', { doctorId });
      
      const response = await getConversacionesDoctor(doctorId);
      
      if (response.success) {
        setConversaciones(response.data || []);
        Logger.success(`useConversacionesDoctor: ${response.data?.length || 0} conversaciones obtenidas`);
      } else {
        throw new Error(response.error || 'Error al obtener conversaciones');
      }
    } catch (err) {
      Logger.error('useConversacionesDoctor: Error al obtener conversaciones', err);
      setError(err);
      setConversaciones([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  // Cargar conversaciones al montar y cuando cambie doctorId
  useEffect(() => {
    // Solo cargar si doctorId está disponible
    if (doctorId) {
      fetchConversaciones();
    } else {
      setLoading(false);
    }
  }, [doctorId, fetchConversaciones]);

  // Suscribirse a eventos WebSocket para actualizaciones en tiempo real
  useEffect(() => {
    if (!subscribeToEvent || !doctorId || !isConnected) return;

    // Evento: Nuevo mensaje recibido
    const unsubscribeNuevoMensaje = subscribeToEvent('nuevo_mensaje', (data) => {
      if (data.id_doctor === doctorId) {
        Logger.info('useConversacionesDoctor: Nuevo mensaje recibido por WebSocket', data);
        // Recargar conversaciones para actualizar último mensaje y contador
        fetchConversaciones();
      }
    });

    // Evento: Mensaje marcado como leído
    const unsubscribeMensajeLeido = subscribeToEvent('mensajes_marcados_leidos', (data) => {
      if (data.id_doctor === doctorId) {
        Logger.info('useConversacionesDoctor: Mensajes marcados como leídos', data);
        // Recargar conversaciones para obtener el contador actualizado desde el backend
        // Esto asegura que el contador sea preciso
        fetchConversaciones();
      }
    });

    // Cleanup
    return () => {
      if (unsubscribeNuevoMensaje) unsubscribeNuevoMensaje();
      if (unsubscribeMensajeLeido) unsubscribeMensajeLeido();
    };
  }, [subscribeToEvent, doctorId, isConnected, fetchConversaciones]);

  const refresh = useCallback(() => {
    if (doctorId) {
      // Forzar recarga incluso si hay datos
      setLoading(true);
      fetchConversaciones();
    }
  }, [doctorId, fetchConversaciones]);

  return {
    conversaciones,
    loading,
    error,
    refresh
  };
};

export default useConversacionesDoctor;

