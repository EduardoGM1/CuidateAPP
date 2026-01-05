/**
 * Hook para usar el servicio offline
 */

import { useState, useEffect, useCallback } from 'react';
import offlineService from '../services/offlineService';
import Logger from '../services/logger';

/**
 * Hook para manejar operaciones offline
 */
const useOffline = () => {
  const [queueStatus, setQueueStatus] = useState({
    total: 0,
    pending: 0,
    isOnline: true,
    syncing: false,
  });

  // Actualizar estado de la cola
  const updateStatus = useCallback(() => {
    const status = offlineService.getQueueStatus();
    setQueueStatus(status);
  }, []);

  // Inicializar servicio
  useEffect(() => {
    offlineService.initialize().then(() => {
      updateStatus();
    });
  }, [updateStatus]);

  // Actualizar estado periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      updateStatus();
    }, 5000); // Cada 5 segundos

    return () => clearInterval(interval);
  }, [updateStatus]);

  // Agregar operación a la cola
  const addToQueue = useCallback(async (operation) => {
    try {
      const id = await offlineService.addToQueue(operation);
      updateStatus();
      return id;
    } catch (error) {
      Logger.error('useOffline: Error agregando a la cola', error);
      throw error;
    }
  }, [updateStatus]);

  // Sincronizar cola manualmente
  const syncQueue = useCallback(async () => {
    try {
      await offlineService.syncQueue();
      updateStatus();
    } catch (error) {
      Logger.error('useOffline: Error sincronizando cola', error);
      throw error;
    }
  }, [updateStatus]);

  // Limpiar cola
  const clearQueue = useCallback(async () => {
    try {
      await offlineService.clearQueue();
      updateStatus();
    } catch (error) {
      Logger.error('useOffline: Error limpiando cola', error);
      throw error;
    }
  }, [updateStatus]);

  return {
    queueStatus,
    addToQueue,
    syncQueue,
    clearQueue,
    isOnline: queueStatus.isOnline,
    hasPendingOperations: queueStatus.pending > 0,
  };
};

export default useOffline;


