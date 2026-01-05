import { useState, useEffect, useCallback } from 'react';
import useWebSocket from './useWebSocket';
import Logger from '../services/logger';

const useRealtimeList = (listType, initialData = []) => {
  const [items, setItems] = useState(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { subscribeToEvent } = useWebSocket();

  // Función para añadir un nuevo elemento al inicio de la lista
  const addNewItem = useCallback((newItem) => {
    setItems(prevItems => {
      // Verificar si el elemento ya existe para evitar duplicados
      const exists = prevItems.some(item => 
        item.id_paciente === newItem.id_paciente || 
        item.id_doctor === newItem.id_doctor
      );
      
      if (!exists) {
        Logger.info(`RealtimeList: Nuevo ${listType} añadido`, newItem);
        return [newItem, ...prevItems];
      }
      
      return prevItems;
    });
  }, [listType]);

  // Función para actualizar un elemento existente
  const updateItem = useCallback((updatedItem) => {
    setItems(prevItems => {
      const updated = prevItems.map(item => {
        if (item.id_paciente === updatedItem.id_paciente || 
            item.id_doctor === updatedItem.id_doctor) {
          Logger.info(`RealtimeList: ${listType} actualizado`, updatedItem);
          return { ...item, ...updatedItem };
        }
        return item;
      });
      
      return updated;
    });
  }, [listType]);

  // Función para eliminar un elemento
  const removeItem = useCallback((itemId) => {
    setItems(prevItems => {
      const filtered = prevItems.filter(item => 
        item.id_paciente !== itemId && item.id_doctor !== itemId
      );
      
      if (filtered.length !== prevItems.length) {
        Logger.info(`RealtimeList: ${listType} eliminado`, { itemId });
      }
      
      return filtered;
    });
  }, [listType]);

  // Función para ordenar por fecha (más recientes primero)
  const sortByRecent = useCallback(() => {
    setItems(prevItems => {
      const sorted = [...prevItems].sort((a, b) => {
        const dateA = new Date(a.fecha_registro || a.created_at);
        const dateB = new Date(b.fecha_registro || b.created_at);
        return dateB - dateA; // Más recientes primero
      });
      
      Logger.debug(`RealtimeList: ${listType} ordenado por fecha reciente`);
      return sorted;
    });
  }, [listType]);

  // Función para ordenar por fecha (más antiguos primero)
  const sortByOldest = useCallback(() => {
    setItems(prevItems => {
      const sorted = [...prevItems].sort((a, b) => {
        const dateA = new Date(a.fecha_registro || a.created_at);
        const dateB = new Date(b.fecha_registro || b.created_at);
        return dateA - dateB; // Más antiguos primero
      });
      
      Logger.debug(`RealtimeList: ${listType} ordenado por fecha antigua`);
      return sorted;
    });
  }, [listType]);

  // Suscribirse a eventos WebSocket según el tipo de lista
  useEffect(() => {
    if (!subscribeToEvent) return;

    let unsubscribeFunctions = [];

    if (listType === 'patients') {
      // Suscribirse a eventos de pacientes
      const unsubscribePatientCreated = subscribeToEvent('patient_created', addNewItem);
      const unsubscribePatientUpdated = subscribeToEvent('patient_updated', updateItem);
      const unsubscribePatientDeleted = subscribeToEvent('patient_deleted', removeItem);
      
      unsubscribeFunctions = [
        unsubscribePatientCreated,
        unsubscribePatientUpdated,
        unsubscribePatientDeleted
      ];
    } else if (listType === 'doctors') {
      // Suscribirse a eventos de doctores
      const unsubscribeDoctorCreated = subscribeToEvent('doctor_created', addNewItem);
      const unsubscribeDoctorUpdated = subscribeToEvent('doctor_updated', updateItem);
      const unsubscribeDoctorDeleted = subscribeToEvent('doctor_deleted', removeItem);
      
      unsubscribeFunctions = [
        unsubscribeDoctorCreated,
        unsubscribeDoctorUpdated,
        unsubscribeDoctorDeleted
      ];
    }

    // Limpiar suscripciones al desmontar
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [subscribeToEvent, listType, addNewItem, updateItem, removeItem]);

  // Función para establecer datos iniciales
  const setInitialData = useCallback((data) => {
    setItems(data);
    Logger.debug(`RealtimeList: Datos iniciales establecidos para ${listType}`, { count: data.length });
  }, [listType]);

  // Función para refrescar la lista
  const refresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    // Aquí se podría hacer una nueva petición HTTP si es necesario
    setTimeout(() => setIsLoading(false), 1000);
  }, []);

  return {
    items,
    isLoading,
    error,
    setInitialData,
    addNewItem,
    updateItem,
    removeItem,
    sortByRecent,
    sortByOldest,
    refresh,
    setError
  };
};

export default useRealtimeList;

