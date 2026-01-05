/**
 * Hook personalizado para lógica común de chat
 * Encapsula estados, WebSocket, notificaciones push y funciones de mensajería
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import useWebSocket from './useWebSocket';
import chatService from '../api/chatService';
import offlineService from '../services/offlineService';
import chatNotificationService from '../services/chatNotificationService';
import hapticService from '../services/hapticService';
import audioFeedbackService from '../services/audioFeedbackService';
import Logger from '../services/logger';

/**
 * Hook useChat
 * @param {Object} config - Configuración del chat
 * @param {string|null} config.pacienteId - ID del paciente
 * @param {string|null} config.doctorId - ID del doctor (puede ser null inicialmente)
 * @param {string} config.remitente - 'Paciente' o 'Doctor'
 * @param {Function} config.onNuevoMensaje - Callback cuando llega un nuevo mensaje (opcional)
 * @returns {Object} Estados y funciones del chat
 */
const useChat = ({ pacienteId, doctorId: doctorIdProp, remitente, onNuevoMensaje }) => {
  // Permitir doctorId dinámico (puede cambiar)
  const [doctorId, setDoctorId] = useState(doctorIdProp);
  
  // Actualizar doctorId cuando cambia la prop (incluyendo cuando cambia de null a un valor)
  useEffect(() => {
    // Actualizar siempre que doctorIdProp cambie
    // Esto es importante para cuando cambia de null a un valor
    const currentDoctorId = doctorIdRef.current;
    if (doctorIdProp !== currentDoctorId) {
      Logger.debug('useChat: doctorId actualizado desde prop', { 
        doctorIdProp, 
        doctorIdAnterior: currentDoctorId,
        nuevoDoctorId: doctorIdProp 
      });
      setDoctorId(doctorIdProp);
    }
  }, [doctorIdProp]);
  // Estados
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensajeTexto, setMensajeTexto] = useState('');
  const [grabandoAudio, setGrabandoAudio] = useState(false);
  const [mostrarGrabador, setMostrarGrabador] = useState(false);
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);
  const [mensajesPendientes, setMensajesPendientes] = useState([]);
  const [escribiendo, setEscribiendo] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Normalizar pacienteId
  const pacienteIdNormalized = useMemo(() => {
    return pacienteId ? String(pacienteId) : null;
  }, [pacienteId]);

  // Refs para evitar closure stale
  const pacienteIdRef = useRef(pacienteIdNormalized);
  const doctorIdRef = useRef(doctorId);
  const cargarMensajesRef = useRef(null);
  const scrollViewRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const longPressTimerRef = useRef(null);

  // Actualizar refs cuando cambian
  useEffect(() => {
    pacienteIdRef.current = pacienteIdNormalized;
  }, [pacienteIdNormalized]);

  useEffect(() => {
    doctorIdRef.current = doctorId;
  }, [doctorId]);

  // WebSocket
  const { subscribeToEvent, isConnected, sendEvent } = useWebSocket();

  // Monitorear estado de conexión
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsOnline(connected);
      if (connected) {
        sincronizarMensajesPendientes();
      }
    });

    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected && state.isInternetReachable);
    });

    return () => unsubscribe();
  }, []);

  // Sincronizar mensajes pendientes
  const sincronizarMensajesPendientes = useCallback(async () => {
    try {
      const queue = await offlineService.getQueue();
      const chatMessages = queue.filter(item => item.resource === 'mensajeChat' && item.status === 'pending');
      setMensajesPendientes(chatMessages);
      
      if (chatMessages.length > 0 && isOnline) {
        await offlineService.syncQueue();
        setTimeout(() => {
          if (cargarMensajesRef.current) {
            cargarMensajesRef.current(false);
          }
        }, 1000);
      }
    } catch (error) {
      Logger.error('Error sincronizando mensajes pendientes:', error);
    }
  }, [isOnline]);

  // Cargar mensajes
  const cargarMensajes = useCallback(async (showLoading = true) => {
    const currentPacienteId = pacienteIdRef.current;
    
    if (!currentPacienteId) {
      Logger.warn('useChat: No hay pacienteId, no se pueden cargar mensajes');
      return;
    }
    
    try {
      if (showLoading) setLoading(true);
      const conversacion = await chatService.getConversacion(currentPacienteId, doctorId);
      setMensajes(conversacion || []);
      
      Logger.debug('useChat: Mensajes cargados', { count: conversacion?.length || 0 });
      
      // Cargar mensajes no leídos
      try {
        const noLeidos = await chatService.getMensajesNoLeidos(currentPacienteId);
        setMensajesNoLeidos(noLeidos?.length || 0);
      } catch (error) {
        Logger.warn('Error cargando mensajes no leídos:', error);
      }
      
      // Marcar como leídos (solo si hay doctorId)
      if (doctorId) {
        try {
          await chatService.marcarTodosComoLeidos(currentPacienteId, doctorId);
        } catch (error) {
          Logger.warn('Error marcando mensajes como leídos:', error);
        }
      }

      // Actualizar contador de mensajes pendientes
      try {
        const queue = await offlineService.getQueue();
        const chatMessages = queue.filter(item => item.resource === 'mensajeChat' && item.status === 'pending');
        setMensajesPendientes(chatMessages);
      } catch (error) {
        Logger.warn('Error actualizando mensajes pendientes:', error);
      }
      
      // Si no hay doctorId pero hay mensajes, obtenerlo del primer mensaje (para ChatDoctor)
      if (!doctorId && conversacion && conversacion.length > 0) {
        const primerMensajeConDoctor = conversacion.find(m => m.id_doctor);
        if (primerMensajeConDoctor && primerMensajeConDoctor.id_doctor) {
          const nuevoDoctorId = primerMensajeConDoctor.id_doctor;
          setDoctorId(nuevoDoctorId);
          Logger.debug('useChat: doctorId obtenido del primer mensaje', { doctorId: nuevoDoctorId });
          
          // Marcar como leídos después de obtener doctorId (para pacientes)
          try {
            await chatService.marcarTodosComoLeidos(currentPacienteId, nuevoDoctorId);
            Logger.debug('useChat: Mensajes marcados como leídos después de obtener doctorId');
          } catch (error) {
            Logger.warn('Error marcando mensajes como leídos después de obtener doctorId:', error);
          }
        }
      }
    } catch (error) {
      Logger.error('Error cargando mensajes:', error);
      if (error.response?.status !== 404) {
        if (showLoading) {
          Alert.alert('Error', 'No se pudieron cargar los mensajes. Verifica tu conexión.');
        }
      } else {
        setMensajes([]);
        Logger.info('useChat: No hay mensajes aún (404)');
      }
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
    return null;
  }, [doctorId]);
  
  // Actualizar ref de cargarMensajes
  useEffect(() => {
    cargarMensajesRef.current = cargarMensajes;
  }, [cargarMensajes]);

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    hapticService.light();
    cargarMensajes(false);
  }, [cargarMensajes]);

  // Suscribirse a eventos WebSocket
  useEffect(() => {
    if (!subscribeToEvent || !pacienteIdNormalized || !isConnected) {
      if (!isConnected) {
        Logger.debug('useChat: Esperando conexión WebSocket...');
      }
      return;
    }

    Logger.debug('useChat: Suscribiéndose a eventos WebSocket', { pacienteId: pacienteIdNormalized, isConnected });
    
    const unsubscribeNuevo = subscribeToEvent('nuevo_mensaje', async (data) => {
      const currentPacienteId = pacienteIdRef.current;
      if (data.id_paciente === currentPacienteId || String(data.id_paciente) === String(currentPacienteId)) {
        Logger.info('Nuevo mensaje recibido:', data);
        hapticService.light();
        
        // Si el mensaje es del otro usuario (no del remitente actual), marcarlo como leído automáticamente
        // porque el chat está abierto
        if (data.mensaje && data.mensaje.remitente !== remitente) {
          const currentDoctorId = doctorIdRef.current;
          if (currentDoctorId && currentPacienteId) {
            try {
              await chatService.marcarComoLeido(data.mensaje.id_mensaje);
              Logger.debug('useChat: Mensaje marcado como leído automáticamente (chat abierto)');
              
              // Actualizar el estado del mensaje en la lista sin recargar todo
              setMensajes(prev => prev.map(m => 
                m.id_mensaje === data.mensaje.id_mensaje 
                  ? { ...m, leido: true, estado: 'leido' }
                  : m
              ));
            } catch (error) {
              Logger.warn('Error marcando mensaje como leído automáticamente:', error);
            }
          }
        }
        
        if (cargarMensajesRef.current) {
          cargarMensajesRef.current(false);
        }
        
        // Callback personalizado si existe
        if (onNuevoMensaje && data.mensaje) {
          onNuevoMensaje(data.mensaje);
        }
      }
    });

    const unsubscribeActualizado = subscribeToEvent('mensaje_actualizado', (data) => {
      const currentPacienteId = pacienteIdRef.current;
      if (data.id_paciente === currentPacienteId || String(data.id_paciente) === String(currentPacienteId)) {
        Logger.info('Mensaje actualizado, actualizando en tiempo real...', data);
        hapticService.light();
        
        // Actualizar el mensaje específico en la lista sin recargar todo
        if (data.mensaje && data.mensaje.id_mensaje) {
          setMensajes(prev => prev.map(m => 
            m.id_mensaje === data.mensaje.id_mensaje 
              ? { ...m, ...data.mensaje, estado: data.mensaje.leido ? 'leido' : 'enviado' }
              : m
          ));
        } else {
          // Si no hay datos específicos, recargar después de un breve delay
          if (cargarMensajesRef.current) {
            setTimeout(() => {
              if (cargarMensajesRef.current) {
                cargarMensajesRef.current(false);
              }
            }, 300);
          }
        }
      }
    });

    const unsubscribeEliminado = subscribeToEvent('mensaje_eliminado', (data) => {
      const currentPacienteId = pacienteIdRef.current;
      if (data.id_paciente === currentPacienteId || String(data.id_paciente) === String(currentPacienteId)) {
        Logger.info('Mensaje eliminado, recargando...');
        hapticService.light();
        if (cargarMensajesRef.current) {
          setTimeout(() => {
            if (cargarMensajesRef.current) {
              cargarMensajesRef.current(false);
            }
          }, 300);
        }
      }
    });

    const unsubscribeEscribiendo = subscribeToEvent('usuario_escribiendo', (data) => {
      const currentPacienteId = pacienteIdRef.current;
      const remitenteEsperado = remitente === 'Paciente' ? 'Doctor' : 'Paciente';
      if ((data.id_paciente === currentPacienteId || String(data.id_paciente) === String(currentPacienteId)) && data.remitente === remitenteEsperado) {
        setEscribiendo(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setEscribiendo(false);
        }, 3000);
      }
    });

    const unsubscribeMarcadosLeidos = subscribeToEvent('mensajes_marcados_leidos', (data) => {
      const currentPacienteId = pacienteIdRef.current;
      if (data.id_paciente === currentPacienteId || String(data.id_paciente) === String(currentPacienteId)) {
        Logger.info('Mensajes marcados como leídos, actualizando estados en tiempo real...', data);
        
        // Actualizar todos los mensajes del remitente opuesto a "leído" sin recargar todo
        const remitenteOpuesto = remitente === 'Paciente' ? 'Doctor' : 'Paciente';
        setMensajes(prev => prev.map(m => {
          // Si el mensaje es del remitente opuesto y no está leído, marcarlo como leído
          if (m.remitente === remitenteOpuesto && !m.leido) {
            return { ...m, leido: true, estado: 'leido' };
          }
          return m;
        }));
      }
    });

    return () => {
      if (unsubscribeNuevo) unsubscribeNuevo();
      if (unsubscribeActualizado) unsubscribeActualizado();
      if (unsubscribeEliminado) unsubscribeEliminado();
      if (unsubscribeEscribiendo) unsubscribeEscribiendo();
      if (unsubscribeMarcadosLeidos) unsubscribeMarcadosLeidos();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [subscribeToEvent, pacienteIdNormalized, isConnected, remitente, onNuevoMensaje]);

  // Suscribirse a notificaciones push
  useEffect(() => {
    const currentPacienteId = pacienteIdRef.current;
    
    if (!currentPacienteId) {
      return;
    }

    const unsubscribePush = chatNotificationService.onNuevoMensaje((data) => {
      const currentPacienteIdFromRef = pacienteIdRef.current;
      const dataPacienteId = data?.id_paciente ? String(data.id_paciente) : null;
      const currentPacienteIdNormalized = currentPacienteIdFromRef ? String(currentPacienteIdFromRef) : null;
      
      if (dataPacienteId && currentPacienteIdNormalized && dataPacienteId === currentPacienteIdNormalized) {
        Logger.info('Notificación push recibida, actualizando chat...');
        hapticService.light();
        
        setTimeout(() => {
          if (cargarMensajesRef.current) {
            cargarMensajesRef.current(false);
          }
        }, 500);
        
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 1000);
      }
    });

    return () => {
      if (unsubscribePush) unsubscribePush();
    };
  }, [pacienteIdNormalized]);

  // Enviar mensaje de texto
  const handleEnviarTexto = useCallback(async (texto = null) => {
    let textoAEnviar = null;
    
    if (texto !== null && texto !== undefined) {
      if (typeof texto === 'object' && texto !== null && (texto.nativeEvent || texto._targetInst)) {
        textoAEnviar = null;
      } else if (typeof texto === 'string') {
        textoAEnviar = texto.trim();
      } else {
        textoAEnviar = String(texto || '').trim();
      }
    }
    
    if (!textoAEnviar) {
      const textoEstado = typeof mensajeTexto === 'string' ? mensajeTexto : String(mensajeTexto || '');
      textoAEnviar = textoEstado.trim();
    }
    
    if (!textoAEnviar || textoAEnviar.length === 0) {
      Logger.warn('useChat: Intento de enviar mensaje vacío');
      return;
    }
    
    if (!pacienteIdNormalized || enviando) {
      Logger.warn('useChat: Faltan datos requeridos', { pacienteId: pacienteIdNormalized, doctorId, enviando });
      // Nota: doctorId puede ser null - el backend lo obtendrá automáticamente de la relación doctor_paciente
      if (!pacienteIdNormalized) {
        return;
      }
    }

    const mensajeLocal = {
      id_mensaje: `temp_${Date.now()}`,
      remitente,
      mensaje_texto: textoAEnviar,
      fecha_envio: new Date().toISOString(),
      estado: 'enviando',
      leido: false,
    };

    setMensajes(prev => [...prev, mensajeLocal]);
    setMensajeTexto('');
    hapticService.medium();

    try {
      setEnviando(true);
      
      if (isOnline) {
        const nuevoMensaje = await chatService.enviarMensajeTexto(
          pacienteIdNormalized,
          doctorId,
          remitente,
          textoAEnviar
        );
        
        setMensajes(prev => prev.map(m => 
          m.id_mensaje === mensajeLocal.id_mensaje 
            ? { ...nuevoMensaje, estado: 'enviado' }
            : m
        ));
        
        audioFeedbackService.playSuccess();
      } else {
        await offlineService.addToQueue({
          type: 'create',
          resource: 'mensajeChat',
          data: {
            id_paciente: pacienteIdNormalized,
            id_doctor: doctorId,
            remitente,
            mensaje_texto: textoAEnviar,
          }
        });
        
        setMensajes(prev => prev.map(m => 
          m.id_mensaje === mensajeLocal.id_mensaje 
            ? { ...m, estado: 'pendiente' }
            : m
        ));
        
        await sincronizarMensajesPendientes();
        audioFeedbackService.playSuccess();
      }
    } catch (error) {
      Logger.error('Error enviando mensaje:', error);
      
      setMensajes(prev => prev.map(m => 
        m.id_mensaje === mensajeLocal.id_mensaje 
          ? { ...m, estado: 'error', error: error.message }
          : m
      ));
      
      if (isOnline) {
        Alert.alert('Error', 'No se pudo enviar el mensaje');
        audioFeedbackService.playError();
      }
    } finally {
      setEnviando(false);
    }
  }, [mensajeTexto, pacienteIdNormalized, doctorId, enviando, isOnline, remitente, sincronizarMensajesPendientes]);

  // Manejar grabación de voz completada
  const handleGrabacionCompleta = useCallback(async ({ audioFilePath, audioUrl, duration }) => {
    try {
      // Validar que tenemos duración y al menos una ruta (local o URL del servidor)
      if (!duration || (!audioFilePath && !audioUrl)) {
        Alert.alert('Error', 'No se pudo obtener el archivo de audio');
        audioFeedbackService.playError();
        setMostrarGrabador(false);
        return;
      }

      hapticService.medium();
      setEnviando(true);
      setMostrarGrabador(false);

      // Si ya tenemos audioUrl (archivo ya subido), usarlo directamente
      // Si no, subir el archivo local
      let finalAudioUrl = audioUrl;
      if (!finalAudioUrl && audioFilePath) {
        Logger.info('useChat: Subiendo archivo de audio...', { audioFilePath });
        finalAudioUrl = await chatService.uploadAudioFile(audioFilePath);
      }

      if (!finalAudioUrl) {
        throw new Error('No se pudo obtener la URL del audio');
      }

      Logger.info('useChat: Enviando mensaje de audio...', { audioUrl: finalAudioUrl, duration });
      const nuevoMensaje = await chatService.enviarMensajeAudio(
        pacienteIdNormalized,
        doctorId,
        remitente,
        finalAudioUrl,
        duration,
        null
      );

      await cargarMensajesRef.current(false);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);

      audioFeedbackService.playSuccess();
      hapticService.medium();
      Logger.info('useChat: Mensaje de audio enviado exitosamente', { mensajeId: nuevoMensaje?.id_mensaje });
    } catch (error) {
      Logger.error('Error procesando audio:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo enviar el mensaje de audio. Intenta nuevamente.'
      );
      audioFeedbackService.playError();
    } finally {
      setEnviando(false);
    }
  }, [pacienteIdNormalized, doctorId, remitente]);

  // Toggle grabador
  const handleToggleGrabador = useCallback(() => {
    hapticService.light();
    setMostrarGrabador(!mostrarGrabador);
  }, [mostrarGrabador]);

  // Ref para debounce del evento "escribiendo..."
  const typingDebounceRef = useRef(null);

  // Manejar cambio de texto (para indicador "escribiendo...")
  const handleTextChange = useCallback((text) => {
    const textoLimpio = typeof text === 'string' ? text : String(text || '');
    setMensajeTexto(textoLimpio);
    
    // Limpiar debounce anterior
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = null;
    }
    
    // Enviar evento "escribiendo..." con debounce (500ms)
    if (textoLimpio.length > 0 && sendEvent && isConnected && pacienteIdNormalized) {
      typingDebounceRef.current = setTimeout(() => {
        try {
          sendEvent('usuario_escribiendo', {
            id_paciente: pacienteIdNormalized,
            remitente
          });
        } catch (error) {
          Logger.error('Error enviando evento usuario_escribiendo:', error);
        }
        typingDebounceRef.current = null;
      }, 500);
    }
  }, [sendEvent, isConnected, pacienteIdNormalized, remitente]);
  
  // Limpiar debounce al desmontar
  useEffect(() => {
    return () => {
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
    };
  }, []);

  // Asegurar que mensajeTexto siempre sea un string
  useEffect(() => {
    if (typeof mensajeTexto !== 'string') {
      setMensajeTexto(String(mensajeTexto || ''));
    }
  }, [mensajeTexto]);

  return {
    // Estados
    mensajes,
    setMensajes,
    loading,
    refreshing,
    enviando,
    mensajeTexto,
    grabandoAudio,
    mostrarGrabador,
    mensajesNoLeidos,
    mensajesPendientes,
    escribiendo,
    isOnline,
    
    // Funciones
    cargarMensajes,
    handleRefresh,
    handleEnviarTexto,
    handleGrabacionCompleta,
    handleToggleGrabador,
    handleTextChange,
    sincronizarMensajesPendientes,
    
    // Refs
    scrollViewRef,
    typingTimeoutRef,
    longPressTimerRef,
    
    // WebSocket
    sendEvent,
    isConnected,
    
    // DoctorId dinámico (puede cambiar)
    doctorId,
    setDoctorId,
  };
};

export default useChat;

