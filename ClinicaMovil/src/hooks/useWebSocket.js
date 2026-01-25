import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Logger from '../services/logger';
import { getApiBaseUrl } from '../config/apiConfig';

const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const { userData, token } = useAuth();
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!token || !userData) {
      Logger.warn('WebSocket: No hay token o datos de usuario');
      return;
    }

    try {
      // Usar configuración de API dinámica (detecta automáticamente emulador vs dispositivo físico)
      const apiBaseUrl = getApiBaseUrl();
      Logger.info('WebSocket: Conectando a', { url: apiBaseUrl });
      
      const newSocket = io(apiBaseUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
      });

      // Eventos de conexión
      newSocket.on('connect', () => {
        Logger.info('WebSocket: Conectado exitosamente', { 
          socketId: newSocket.id,
          userId: userData.id_usuario 
        });
        setIsConnected(true);
        reconnectAttempts.current = 0;
      });

      newSocket.on('disconnect', (reason) => {
        Logger.warn('WebSocket: Desconectado', { reason });
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        const errorMessage = error.message || String(error);
        Logger.error('WebSocket: Error de conexión', { 
          error: errorMessage,
          attempts: reconnectAttempts.current 
        });
        
        // Si el error es "Token inválido", intentar refrescar el token
        if (errorMessage.includes('Token inválido') || errorMessage.includes('invalid token') || errorMessage.includes('Unauthorized')) {
          Logger.info('WebSocket: Token inválido detectado, intentando refrescar...');
          // El token se refrescará automáticamente en el siguiente intento de conexión
          // No reconectar inmediatamente, esperar a que el token se refresque
          reconnectAttempts.current = Math.max(0, reconnectAttempts.current - 1); // Reducir intentos para permitir reintento
        }
        
        setIsConnected(false);
      });

      // Eventos de heartbeat
      newSocket.on('pong', (data) => {
        Logger.debug('WebSocket: Pong recibido', { timestamp: data.timestamp });
      });

      // Eventos de sincronización
      newSocket.on('sync_status', (data) => {
        Logger.debug('WebSocket: Estado de sincronización', data);
      });

      // Eventos de información del servidor
      newSocket.on('server_info', (data) => {
        Logger.debug('WebSocket: Información del servidor', data);
      });

      setSocket(newSocket);
    } catch (error) {
      Logger.error('WebSocket: Error inicializando conexión', error);
    }
  }, [token, userData]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, [socket]);

  const sendEvent = useCallback((event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
      Logger.debug('WebSocket: Evento enviado', { event, data });
    } else {
      Logger.warn('WebSocket: No se puede enviar evento - no conectado', { event });
    }
  }, [socket, isConnected]);

  const subscribeToEvent = useCallback((event, callback) => {
    if (!socket) {
      Logger.warn('WebSocket: No se puede suscribir - socket no disponible', { event });
      return null;
    }
    
    if (!isConnected) {
      Logger.warn('WebSocket: No se puede suscribir - socket no conectado', { event });
      return null;
    }
    
    socket.on(event, callback);
    Logger.debug('WebSocket: Suscrito a evento', { event, socketId: socket.id });
    
    // Retornar función de limpieza
    return () => {
      if (socket) {
        socket.off(event, callback);
        Logger.debug('WebSocket: Desuscrito de evento', { event });
      }
    };
  }, [socket, isConnected]);

  // Conectar automáticamente cuando hay token
  useEffect(() => {
    if (token && userData && !socket) {
      // Pequeño delay para asegurar que el token esté completamente disponible
      const connectTimeout = setTimeout(() => {
        connect();
      }, 100);
      
      return () => clearTimeout(connectTimeout);
    }
  }, [token, userData, socket, connect]);

  // Limpiar conexión al desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Heartbeat periódico
  useEffect(() => {
    if (socket && isConnected) {
      const heartbeatInterval = setInterval(() => {
        sendEvent('ping');
      }, 30000); // Cada 30 segundos

      return () => clearInterval(heartbeatInterval);
    }
  }, [socket, isConnected, sendEvent]);

  return {
    isConnected,
    socket,
    connect,
    disconnect,
    sendEvent,
    subscribeToEvent
  };
};

export default useWebSocket;

