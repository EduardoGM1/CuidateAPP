/**
 * Pantalla: Mis Citas
 * 
 * Lista simplificada de próximas citas médicas del paciente.
 * Diseño ultra-simple con TTS y feedback visual.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { Button } from 'react-native-paper';
import usePacienteData from '../../hooks/usePacienteData';
import { useAppointmentReminders } from '../../hooks/useReminders';
import ReminderBanner from '../../components/paciente/ReminderBanner';
import { gestionService } from '../../api/gestionService';
import useTTS from '../../hooks/useTTS';
import ttsService from '../../services/ttsService';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Logger from '../../services/logger';
import { ESTADOS_SOLICITUD_REPROGRAMACION, COLORES } from '../../utils/constantes';
import useWebSocket from '../../hooks/useWebSocket';
import { formatDateWithWeekday } from '../../utils/dateUtils';

const MisCitas = () => {
  const navigation = useNavigation();
  const { paciente, loading: loadingPaciente, citas, refresh, totalCitas } = usePacienteData();
  const { speak, speakDate, speakTime, stopAndClear, createTimeout } = useTTS();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loadingCitas, setLoadingCitas] = useState(false);
  const [citasData, setCitasData] = useState([]);
  
  // Estados para reprogramación
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [showSolicitudesModal, setShowSolicitudesModal] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [motivoReprogramacion, setMotivoReprogramacion] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);

  // Recordatorios de citas
  const reminders = useAppointmentReminders(citasData, !loadingCitas);

  // Ref para rastrear si ya se leyó la próxima cita (evitar repetir)
  const ultimaProximaCitaIdRef = useRef(null);
  const yaLeyoProximaCitaRef = useRef(false);
  
  // Ref para almacenar timeouts activos y poder cancelarlos
  const activeTimeoutsRef = useRef([]);

  // Obtener pacienteId de paciente o userData
  const pacienteId = paciente?.id_paciente || paciente?.id;

  // WebSocket para actualizaciones en tiempo real
  const { subscribeToEvent, isConnected } = useWebSocket();

  // Memoizar loadCitas para evitar bucles infinitos
  const loadCitas = useCallback(async (source = 'unknown') => {
    const currentPacienteId = paciente?.id_paciente || paciente?.id;
    
    if (!currentPacienteId) {
      Logger.warn('MisCitas: No hay pacienteId disponible');
      setLoadingCitas(false);
      setCitasData([]);
      return;
    }

    try {
      setLoadingCitas(true);
      Logger.debug('MisCitas: Cargando citas', { pacienteId: currentPacienteId, source });
      
      const response = await gestionService.getPacienteCitas(currentPacienteId, {
        limit: 20,
        sort: 'ASC', // Próximas primero
      });
      
      Logger.debug('MisCitas: Respuesta del servicio', { 
        hasResponse: !!response,
        isArray: Array.isArray(response),
        hasData: !!response?.data,
        dataIsArray: Array.isArray(response?.data)
      });
      
      // El servicio retorna response.data que tiene estructura { success, data: [...], total: ... }
      let citas = [];
      if (Array.isArray(response)) {
        citas = response;
      } else if (response?.data && Array.isArray(response.data)) {
        citas = response.data;
      } else if (response?.data?.data && Array.isArray(response.data.data)) {
        citas = response.data.data;
      }
      
      Logger.debug('MisCitas: Citas extraídas', { total: citas.length, firstCita: citas[0] || null });
      
      // Filtrar solo citas futuras o recientes
      const ahora = new Date();
      const citasFuturas = citas.filter(cita => {
        if (!cita.fecha_cita) return false;
        const fechaCita = new Date(cita.fecha_cita);
        return fechaCita >= ahora || (ahora - fechaCita) < 24 * 60 * 60 * 1000; // Últimas 24h también
      });
      
      // Ordenar por fecha
      citasFuturas.sort((a, b) => new Date(a.fecha_cita) - new Date(b.fecha_cita));
      
          setCitasData(citasFuturas);
          Logger.success('MisCitas: Citas cargadas exitosamente', { 
            total: citasFuturas.length,
            totalRaw: citas.length,
            source
          });

      // Leer próxima cita automáticamente si hay citas y cambió
      if (citasFuturas.length > 0) {
        const proximaCita = citasFuturas[0];
        const proximaCitaId = proximaCita.id_cita || proximaCita.id;
        
        // Solo leer si es una nueva próxima cita o es la primera vez
        if (proximaCitaId !== ultimaProximaCitaIdRef.current) {
          ultimaProximaCitaIdRef.current = proximaCitaId;
          yaLeyoProximaCitaRef.current = false; // Resetear flag
          
          // Leer después de un pequeño delay para que la UI se actualice
          // Usar createTimeout para que se cancele automáticamente si el componente se desmonta
          const timeoutId = createTimeout(async () => {
            try {
              const ahora = new Date();
              const fechaCita = new Date(proximaCita.fecha_cita);
              const diffMs = fechaCita - ahora;
              const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
              const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

              // Construir mensaje según proximidad
              let mensaje = '';
              
              if (diffDays < 0) {
                // Cita pasada
                mensaje = `Tienes ${citasFuturas.length} ${citasFuturas.length === 1 ? 'cita' : 'citas'} programadas. La próxima cita ya pasó.`;
              } else if (diffHours < 24) {
                // Menos de 24 horas
                const horas = Math.floor(diffHours);
                const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                
                if (horas < 1) {
                  mensaje = `Tienes ${citasFuturas.length} ${citasFuturas.length === 1 ? 'cita' : 'citas'} programadas. Tu próxima cita es en ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
                } else {
                  mensaje = `Tienes ${citasFuturas.length} ${citasFuturas.length === 1 ? 'cita' : 'citas'} programadas. Tu próxima cita es en ${horas} ${horas === 1 ? 'hora' : 'horas'}`;
                }
              } else if (diffDays === 1) {
                // Mañana
                const horaStrTTS = ttsService.formatTimeForTTS(fechaCita);
                mensaje = `Tienes ${citasFuturas.length} ${citasFuturas.length === 1 ? 'cita' : 'citas'} programadas. Tu próxima cita es mañana a las ${horaStrTTS}`;
              } else if (diffDays <= 7) {
                // Esta semana
                const diasStr = diffDays === 1 ? 'mañana' : `en ${diffDays} días`;
                const horaStrTTS = ttsService.formatTimeForTTS(fechaCita);
                mensaje = `Tienes ${citasFuturas.length} ${citasFuturas.length === 1 ? 'cita' : 'citas'} programadas. Tu próxima cita es ${diasStr} a las ${horaStrTTS}`;
              } else {
                // Más de una semana - usar formateo manual en español
                const fechaStr = formatDateWithWeekday(fechaCita);
                const horaStrTTS = ttsService.formatTimeForTTS(fechaCita);
                mensaje = `Tienes ${citasFuturas.length} ${citasFuturas.length === 1 ? 'cita' : 'citas'} programadas. Tu próxima cita es el ${fechaStr} a las ${horaStrTTS}`;
              }

              // Agregar información adicional si está disponible
              if (proximaCita.motivo) {
                mensaje += `. Motivo: ${proximaCita.motivo}`;
              }
              if (proximaCita.doctor_nombre) {
                mensaje += `. Con el doctor ${proximaCita.doctor_nombre}`;
              }

              // Leer con TTS
              await speak(mensaje, {
                variant: 'information',
                priority: 'medium'
              });

              yaLeyoProximaCitaRef.current = true;
              Logger.debug('MisCitas: Próxima cita leída automáticamente', {
                citaId: proximaCitaId,
                diffDays,
                mensaje: mensaje.substring(0, 50) + '...'
              });
            } catch (error) {
              Logger.error('MisCitas: Error leyendo próxima cita', error);
              yaLeyoProximaCitaRef.current = false;
            }
          }, 1000);
          
          activeTimeoutsRef.current.push(timeoutId);
        }
      } else {
        // Si no hay citas, resetear referencias y leer mensaje
        if (ultimaProximaCitaIdRef.current !== null) {
          ultimaProximaCitaIdRef.current = null;
          yaLeyoProximaCitaRef.current = false;
          
          // Leer mensaje de que no hay citas
          const timeoutId = createTimeout(async () => {
            try {
              await speak('No tienes citas programadas', {
                variant: 'information',
                priority: 'low'
              });
            } catch (error) {
              Logger.error('MisCitas: Error leyendo mensaje sin citas', error);
            }
          }, 1000);
          
          activeTimeoutsRef.current.push(timeoutId);
        }
      }
    } catch (error) {
      Logger.error('MisCitas: Error cargando citas:', error);
      setCitasData([]);
    } finally {
      setLoadingCitas(false);
    }
  }, [paciente?.id_paciente, paciente?.id, speak]); // ✅ Solo los IDs y speak

  // Cargar citas al entrar (solo cuando se enfoca la pantalla y hay pacienteId)
  useFocusEffect(
    useCallback(() => {
      const currentPacienteId = paciente?.id_paciente || paciente?.id;
      
      if (currentPacienteId) {
        Logger.debug('MisCitas: useFocusEffect - Cargando citas', { pacienteId: currentPacienteId });
        loadCitas('useFocusEffect');
      } else {
        Logger.warn('MisCitas: useFocusEffect - No hay pacienteId disponible');
        setLoadingCitas(false);
        setCitasData([]);
      }
      
      // Resetear flag cuando se enfoca la pantalla (para permitir leer de nuevo si cambió)
      // No leer saludo inicial, la próxima cita se leerá automáticamente después de cargar
      
      return () => {
        // Cleanup: Detener TTS y limpiar cola cuando se sale de la pantalla
        Logger.debug('MisCitas: Cleanup - Deteniendo TTS y limpiando cola');
        stopAndClear();
        
        // Cancelar todos los timeouts pendientes
        activeTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
        activeTimeoutsRef.current = [];
      };
    }, [paciente?.id_paciente, paciente?.id, loadCitas, stopAndClear]) // ✅ Incluir stopAndClear
  );

  // También cargar cuando el pacienteId esté disponible
  useEffect(() => {
    const currentPacienteId = paciente?.id_paciente || paciente?.id;
    if (currentPacienteId && !loadingCitas && citasData.length === 0) {
      Logger.debug('MisCitas: PacienteId disponible, cargando citas');
      loadCitas('useEffect-initial');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteId]);

  // Cargar solicitudes cuando se enfoca la pantalla
  useFocusEffect(
    useCallback(() => {
      if (pacienteId) {
        loadSolicitudes();
      }
    }, [pacienteId, loadSolicitudes])
  );

  // Suscribirse a eventos WebSocket de citas (solo cuando esté conectado)
  useEffect(() => {
    if (!subscribeToEvent || !pacienteId || !isConnected) {
      if (!isConnected) {
        Logger.debug('MisCitas: WebSocket no conectado, esperando conexión...');
      }
      return;
    }

    Logger.info('MisCitas: Suscribiéndose a eventos WebSocket', { pacienteId, isConnected });

    // Evento: Nueva cita creada
    const unsubscribeCitaCreada = subscribeToEvent('cita_creada', (data) => {
      if (data.id_paciente == pacienteId) {
        hapticService.light();
        audioFeedbackService.playSuccess();
        loadCitas('websocket-cita-creada');
        speak(`Nueva cita programada para ${formatFecha(data.fecha_cita)}`, {
          variant: 'information',
          priority: 'high'
        });
      }
    });

    // Evento: Cita actualizada (cambio de estado)
    const unsubscribeCitaActualizada = subscribeToEvent('cita_actualizada', (data) => {
      if (data.id_paciente == pacienteId) {
        hapticService.medium();
        loadCitas('websocket-cita-actualizada');
        
        const estadoMensaje = {
          'atendida': 'Tu cita ha sido marcada como atendida',
          'cancelada': 'Tu cita ha sido cancelada',
          'reprogramada': 'Tu cita ha sido reprogramada',
          'no_asistida': 'Tu cita ha sido marcada como no asistida'
        };
        
        const mensaje = estadoMensaje[data.estado] || 'Tu cita ha sido actualizada';
        speak(mensaje, {
          variant: 'information',
          priority: 'high'
        });
      }
    });

    // Evento: Cita reprogramada
    const unsubscribeCitaReprogramada = subscribeToEvent('cita_reprogramada', (data) => {
      if (data.id_paciente == pacienteId) {
        hapticService.medium();
        audioFeedbackService.playSuccess();
        loadCitas('websocket-cita-reprogramada');
        const fechaNueva = data.fecha_reprogramada || data.fecha_nueva || data.fecha_cita;
        speak(`Tu cita ha sido reprogramada para ${formatFecha(fechaNueva)}`, {
          variant: 'information',
          priority: 'high'
        });
      }
    });

    // Evento: Solicitud de reprogramación (respuesta del doctor)
    const unsubscribeSolicitudReprogramacion = subscribeToEvent('solicitud_reprogramacion', (data) => {
      if (data.id_paciente == pacienteId) {
        loadSolicitudes();
      }
    });

    // Evento: Solicitud de reprogramación procesada (aprobada/rechazada)
    const unsubscribeSolicitudProcesada = subscribeToEvent('solicitud_reprogramacion_procesada', (data) => {
      Logger.info('MisCitas: Solicitud de reprogramación procesada recibida por WebSocket', data);
      // Recargar solicitudes y citas
      loadSolicitudes();
      loadCitas();
      
      // Mostrar mensaje al usuario
      if (data.mensaje) {
        speak(data.mensaje, {
          variant: data.accion === 'aprobar' ? 'success' : 'information',
          priority: 'high'
        });
      }
    });

    // Cleanup
    return () => {
      if (unsubscribeCitaCreada) unsubscribeCitaCreada();
      if (unsubscribeCitaActualizada) unsubscribeCitaActualizada();
      if (unsubscribeCitaReprogramada) unsubscribeCitaReprogramada();
      if (unsubscribeSolicitudReprogramacion) unsubscribeSolicitudReprogramacion();
      if (unsubscribeSolicitudProcesada) unsubscribeSolicitudProcesada();
    };
  }, [subscribeToEvent, pacienteId, isConnected, loadCitas, speak, loadSolicitudes]);

  const handleRefresh = async () => {
    setRefreshing(true);
    hapticService.medium();
    await refresh();
    await loadCitas('pull-to-refresh');
    setRefreshing(false);
    audioFeedbackService.playSuccess();
  };

  // Formatear fecha para mostrar (usa formato legible)
  const formatFecha = (fecha) => {
    try {
      const fechaObj = new Date(fecha);
      if (isNaN(fechaObj.getTime())) return 'Fecha inválida';
      
      const hoy = new Date();
      const manana = new Date(hoy);
      manana.setDate(manana.getDate() + 1);
      
      // Verificar si tiene hora
      const tieneHora = fechaObj.getHours() !== 0 || 
                        fechaObj.getMinutes() !== 0 || 
                        fechaObj.getSeconds() !== 0 ||
                        fecha.toString().includes('T') ||
                        fecha.toString().includes(' ');
      
      // Formatear fecha: "6 de noviembre del 2025"
      const dia = fechaObj.getDate();
      const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const mes = meses[fechaObj.getMonth()];
      const año = fechaObj.getFullYear();
      const fechaFormateada = `${dia} de ${mes} del ${año}`;
      
      // Verificar si es hoy o mañana
      if (fechaObj.toDateString() === hoy.toDateString()) {
        if (tieneHora) {
          const horaStr = fechaObj.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          return `Hoy, hora: ${horaStr}`;
        }
        return 'Hoy';
      } else if (fechaObj.toDateString() === manana.toDateString()) {
        if (tieneHora) {
          const horaStr = fechaObj.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          return `Mañana, hora: ${horaStr}`;
        }
        return 'Mañana';
      }
      
      // Fecha normal con hora si la tiene
      if (tieneHora) {
        const horaStr = fechaObj.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `${fechaFormateada}, hora: ${horaStr}`;
      }
      
      return fechaFormateada;
    } catch (error) {
      return fecha;
    }
  };

  // Calcular días hasta la cita
  const diasHastaCita = (fecha) => {
    try {
      const fechaCita = new Date(fecha);
      const ahora = new Date();
      const diff = fechaCita - ahora;
      const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
      
      if (dias < 0) return 'Pasada';
      if (dias === 0) return 'Hoy';
      if (dias === 1) return 'Mañana';
      return `En ${dias} días`;
    } catch {
      return '';
    }
  };

  // Semaforología: color de la barra y del card según proximidad (rojo = Hoy, amarillo = Mañana, verde = En X días)
  const getColorSemaforo = (diasTexto) => {
    if (diasTexto === 'Hoy') return COLORES.ERROR_LIGHT;      // Rojo - urgente
    if (diasTexto === 'Mañana') return COLORES.ADVERTENCIA_LIGHT; // Amarillo/ámbar - próximo
    return COLORES.EXITO; // Verde - tranquilo (En X días o Pasada)
  };

  const handleCardPress = async (cita) => {
    hapticService.medium();
    
    // Formatear fecha para mostrar - usar formateo manual en español
    const fechaObj = new Date(cita.fecha_cita);
    const fechaStr = formatDateWithWeekday(fechaObj);
    
    // Formatear hora para TTS (con "de la mañana/tarde/noche")
    const horaStrTTS = ttsService.formatTimeForTTS(cita.fecha_cita);
    
    const motivoStr = cita.motivo || 'Sin motivo especificado';
    const doctorStr = cita.doctor_nombre || 'Sin doctor asignado';
    
    await speak(`Cita el ${fechaStr} a las ${horaStrTTS}. Motivo: ${motivoStr}. Doctor: ${doctorStr}`, {
      variant: 'information',
      priority: 'medium'
    });
  };

  const handleLongPress = async (cita) => {
    hapticService.heavy();
    await speakDate(cita.fecha_cita);
    await new Promise(resolve => setTimeout(resolve, 500));
    await speakTime(cita.fecha_cita);
  };

  // Cargar solicitudes de reprogramación
  const loadSolicitudes = useCallback(async () => {
    if (!pacienteId) {
      setSolicitudes([]);
      return;
    }
    
    try {
      setLoadingSolicitudes(true);
      const response = await gestionService.getSolicitudesReprogramacion(pacienteId);
      if (response && response.success) {
        // Asegurar que siempre sea un array
        const data = response.data;
        setSolicitudes(Array.isArray(data) ? data : []);
      } else {
        setSolicitudes([]);
      }
    } catch (error) {
      Logger.error('MisCitas: Error cargando solicitudes', error);
      setSolicitudes([]);
    } finally {
      setLoadingSolicitudes(false);
    }
  }, [pacienteId]);

  // Abrir modal para solicitar reprogramación
  const handleSolicitarReprogramacion = (cita) => {
    hapticService.medium();
    setCitaSeleccionada(cita);
    setMotivoReprogramacion('');
    setShowSolicitarModal(true);
  };

  // Enviar solicitud de reprogramación
  const handleEnviarSolicitud = async () => {
    if (!citaSeleccionada || !motivoReprogramacion.trim()) {
      Alert.alert('Error', 'Por favor, ingresa un motivo para la reprogramación');
      return;
    }

    try {
      setEnviandoSolicitud(true);
      hapticService.medium();
      
      const citaId = citaSeleccionada.id_cita || citaSeleccionada.id;
      
      // Los pacientes NO pueden elegir fecha, solo enviar solicitud
      // El doctor/admin decidirá la nueva fecha al aprobar
      const response = await gestionService.solicitarReprogramacion(
        citaId,
        motivoReprogramacion.trim(),
        null // No se envía fecha, el doctor decidirá
      );

      if (response.success) {
        audioFeedbackService.playSuccess();
        await speak('Solicitud enviada exitosamente. El doctor revisará tu solicitud.', {
          variant: 'success',
          priority: 'high'
        });
        setShowSolicitarModal(false);
        setCitaSeleccionada(null);
        setMotivoReprogramacion('');
        await loadSolicitudes();
        await loadCitas();
      } else {
        audioFeedbackService.playError();
        Alert.alert('Error', response.error || 'No se pudo enviar la solicitud');
      }
    } catch (error) {
      Logger.error('MisCitas: Error enviando solicitud', error);
      audioFeedbackService.playError();
      Alert.alert('Error', 'No se pudo enviar la solicitud. Intenta de nuevo.');
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  // Cancelar solicitud pendiente
  const handleCancelarSolicitud = async (solicitud) => {
    Alert.alert(
      'Cancelar Solicitud',
      '¿Estás seguro de que deseas cancelar esta solicitud?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              hapticService.medium();
              const citaId = solicitud.id_cita;
              const solicitudId = solicitud.id_solicitud;
              
              const response = await gestionService.cancelarSolicitudReprogramacion(citaId, solicitudId);
              
              if (response.success) {
                audioFeedbackService.playSuccess();
                await speak('Solicitud cancelada exitosamente', {
                  variant: 'success',
                  priority: 'high'
                });
                await loadSolicitudes();
              } else {
                audioFeedbackService.playError();
                Alert.alert('Error', response.error || 'No se pudo cancelar la solicitud');
              }
            } catch (error) {
              Logger.error('MisCitas: Error cancelando solicitud', error);
              audioFeedbackService.playError();
              Alert.alert('Error', 'No se pudo cancelar la solicitud. Intenta de nuevo.');
            }
          }
        }
      ]
    );
  };

  // Obtener texto del estado de solicitud
  const getEstadoSolicitudTexto = (estado) => {
    switch (estado) {
      case ESTADOS_SOLICITUD_REPROGRAMACION.PENDIENTE:
        return 'Pendiente';
      case ESTADOS_SOLICITUD_REPROGRAMACION.APROBADA:
        return 'Aprobada';
      case ESTADOS_SOLICITUD_REPROGRAMACION.RECHAZADA:
        return 'Rechazada';
      case ESTADOS_SOLICITUD_REPROGRAMACION.CANCELADA:
        return 'Cancelada';
      default:
        return 'Desconocido';
    }
  };

  // Obtener color del estado de solicitud
  const getEstadoSolicitudColor = (estado) => {
    switch (estado) {
      case ESTADOS_SOLICITUD_REPROGRAMACION.PENDIENTE:
        return COLORES.ADVERTENCIA_LIGHT;
      case ESTADOS_SOLICITUD_REPROGRAMACION.APROBADA:
        return COLORES.NAV_PACIENTE;
      case ESTADOS_SOLICITUD_REPROGRAMACION.RECHAZADA:
        return COLORES.ERROR_LIGHT;
      case ESTADOS_SOLICITUD_REPROGRAMACION.CANCELADA:
        return COLORES.TEXTO_DISABLED;
      default:
        return COLORES.TEXTO_DISABLED;
    }
  };

  // Verificar si una cita tiene una solicitud de reprogramación pendiente
  const tieneSolicitudPendiente = useCallback((citaId) => {
    if (!solicitudes || !Array.isArray(solicitudes) || solicitudes.length === 0) {
      return null;
    }
    
    const solicitud = solicitudes.find(
      (sol) => 
        (sol.id_cita === citaId || sol.id_cita === String(citaId)) &&
        sol.estado === ESTADOS_SOLICITUD_REPROGRAMACION.PENDIENTE
    );
    
    return solicitud || null;
  }, [solicitudes]);

  // Mostrar loading: mientras se obtiene el paciente o mientras se cargan citas y aún no hay datos
  const shouldShowLoading =
    (loadingPaciente && !pacienteId) ||
    (loadingCitas && citasData.length === 0);
  
  if (shouldShowLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.NAV_PACIENTE} />
          <Text style={styles.loadingText}>Cargando tus citas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORES.NAV_PACIENTE]}
            tintColor={COLORES.NAV_PACIENTE}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              hapticService.light();
              navigation.goBack();
            }}
          >
            <Text style={styles.backButtonText}>← Atrás</Text>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Mis Citas</Text>
          </View>
          
          <TouchableOpacity
            style={styles.listenButton}
            onPress={async () => {
              try {
                hapticService.light();
                const mensaje = `Tienes ${citasData.length} ${citasData.length === 1 ? 'cita' : 'citas'} programadas${reminders.totalProximas > 0 ? `. ${reminders.totalProximas} ${reminders.totalProximas === 1 ? 'cita' : 'citas'} muy próximas` : ''}`;
                await speak(mensaje);
              } catch (error) {
                Logger.error('Error en TTS:', error);
                hapticService.error();
              }
            }}
          >
            <Text style={styles.listenButtonText}>🔊</Text>
          </TouchableOpacity>
        </View>

        {/* Banner de alerta para citas próximas (5h) */}
        {reminders.citas5h.length > 0 && reminders.citas5h[0] && (
          <ReminderBanner
            title="🚨 Cita Muy Próxima"
            message={`${reminders.citas5h[0].motivo || 'Consulta médica'} - ${formatFecha(reminders.citas5h[0].fecha_cita)}`}
            timeRemaining={reminders.citas5h[0].tiempoRestante}
            variant="urgent"
            showCountdown={true}
          />
        )}

        {/* Banner de alerta para citas próximas (24h) */}
        {reminders.citas24h.length > 0 && reminders.citas24h[0] && reminders.citas5h.length === 0 && (
          <ReminderBanner
            title="Recordatorio de Cita"
            message={`${reminders.citas24h[0].motivo || 'Consulta médica'} - ${formatFecha(reminders.citas24h[0].fecha_cita)}`}
            timeRemaining={reminders.citas24h[0].tiempoRestante}
            variant="warning"
            showCountdown={true}
          />
        )}

        {/* Contador */}
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {citasData.length === 0
              ? 'No tienes citas programadas'
              : `${citasData.length} ${citasData.length === 1 ? 'cita' : 'citas'} programadas`}
          </Text>
        </View>

        {/* Botón para ver solicitudes de reprogramación */}
        {solicitudes && Array.isArray(solicitudes) && solicitudes.length > 0 && (
          <TouchableOpacity
            style={styles.solicitudesButton}
            onPress={() => {
              hapticService.medium();
              setShowSolicitudesModal(true);
            }}
          >
            <Text style={styles.solicitudesButtonText}>
              Ver Solicitudes de Reprogramación ({solicitudes.length})
            </Text>
          </TouchableOpacity>
        )}

        {/* Lista de citas */}
        {citasData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No tienes citas programadas</Text>
            <Text style={styles.emptySubtext}>
              Presiona para refrescar y ver nuevas citas
            </Text>
          </View>
        ) : (
          citasData.map((cita, index) => {
            const diasTexto = diasHastaCita(cita.fecha_cita);
            const esHoy = diasTexto === 'Hoy';
            const esMañana = diasTexto === 'Mañana';
            const colorSemaforo = getColorSemaforo(diasTexto);
            
            return (
              <TouchableOpacity
                key={cita.id_cita || index}
                style={[
                  styles.citaCard,
                  esHoy && styles.citaCardToday,
                  esMañana && styles.citaCardTomorrow,
                ]}
                onPress={() => handleCardPress(cita)}
                onLongPress={() => handleLongPress(cita)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Cita ${formatFecha(cita.fecha_cita)}. ${cita.motivo || ''}`}
              >
                <View style={styles.citaCardInner}>
                  <View style={[styles.citaCardBarra, { backgroundColor: colorSemaforo }]} />
                  <View style={styles.citaCardContent}>
                    <View style={styles.citaHeader}>
                      {esHoy && <View style={[styles.badgeToday, { backgroundColor: colorSemaforo }]}><Text style={styles.badgeText}>HOY</Text></View>}
                      {esMañana && <View style={[styles.badgeTomorrow, { backgroundColor: colorSemaforo }]}><Text style={styles.badgeText}>MAÑANA</Text></View>}
                      {!esHoy && !esMañana && <View style={[styles.badgeDias, { backgroundColor: colorSemaforo }]}><Text style={styles.badgeText}>{diasTexto}</Text></View>}
                      {(esHoy || esMañana) && <Text style={styles.citaDias}>{diasTexto}</Text>}
                    </View>

                    <Text style={styles.citaFecha}>{formatFecha(cita.fecha_cita)}</Text>

                {cita.motivo && (
                  <View style={styles.citaMotivoContainer}>
                    <Text style={styles.citaMotivoLabel}>Motivo:</Text>
                    <Text style={styles.citaMotivo}>{cita.motivo}</Text>
                  </View>
                )}

                {cita.doctor_nombre && (
                  <View style={styles.citaDoctorContainer}>
                    <Text style={styles.citaDoctorIcon}>👨‍⚕️</Text>
                    <Text style={styles.citaDoctor}>{cita.doctor_nombre}</Text>
                  </View>
                )}

                {/* Reprogramación: cualquier momento si la cita no está cancelada ni atendida (incluye citas vencidas) */}
                {cita.estado !== 'cancelada' && cita.estado !== 'atendida' && (() => {
                  const solicitudPendiente = tieneSolicitudPendiente(cita.id_cita || cita.id);
                  const yaTieneSolicitud = !!solicitudPendiente;
                  
                  return (
                    <TouchableOpacity
                      style={[
                        styles.reprogramarButton,
                        yaTieneSolicitud && styles.reprogramarButtonDisabled
                      ]}
                      onPress={() => yaTieneSolicitud ? null : handleSolicitarReprogramacion(cita)}
                      disabled={yaTieneSolicitud}
                    >
                      <Text style={[
                        styles.reprogramarButtonText,
                        yaTieneSolicitud && styles.reprogramarButtonTextDisabled
                      ]}>
                        {yaTieneSolicitud 
                          ? '✅ Solicitud de Reprogramación Enviada' 
                          : '🔄 Solicitar Reprogramación'}
                      </Text>
                    </TouchableOpacity>
                  );
                })()}

                    <View style={styles.citaFooter}>
                      <Text style={styles.citaHint}>
                        Presiona para escuchar detalles • Mantén presionado para escuchar fecha y hora
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal para solicitar reprogramación */}
      <Modal
        visible={showSolicitarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSolicitarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔄 Solicitar Reprogramación</Text>
              <TouchableOpacity
                onPress={() => setShowSolicitarModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {citaSeleccionada && (
                <View style={styles.modalCitaInfo}>
                  <Text style={styles.modalCitaInfoText}>
                    📅 {formatFecha(citaSeleccionada.fecha_cita)}
                  </Text>
                  {citaSeleccionada.motivo && (
                    <Text style={styles.modalCitaInfoText}>
                      🩺 {citaSeleccionada.motivo}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Motivo de reprogramación *</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Ej: No podré asistir por..."
                  value={motivoReprogramacion}
                  onChangeText={setMotivoReprogramacion}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.modalHint}>
                  El doctor revisará tu solicitud y decidirá la nueva fecha
                </Text>
              </View>

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setShowSolicitarModal(false)}
                  style={styles.modalCancelButton}
                  disabled={enviandoSolicitud}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleEnviarSolicitud}
                  style={styles.modalSubmitButton}
                  loading={enviandoSolicitud}
                  disabled={enviandoSolicitud || !motivoReprogramacion.trim()}
                >
                  Enviar Solicitud
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para ver solicitudes de reprogramación */}
      <Modal
        visible={showSolicitudesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSolicitudesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                Mis Solicitudes de Reprogramación
              </Text>
              <TouchableOpacity
                onPress={() => setShowSolicitudesModal(false)}
                style={styles.modalCloseButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollViewContent}
              showsVerticalScrollIndicator={true}
            >
              {loadingSolicitudes ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={COLORES.NAV_PACIENTE} />
                  <Text style={styles.modalLoadingText}>Cargando...</Text>
                </View>
              ) : !solicitudes || solicitudes.length === 0 ? (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>No tienes solicitudes de reprogramación</Text>
                </View>
              ) : (
                (Array.isArray(solicitudes) ? solicitudes : []).map((solicitud, index) => (
                  <View key={solicitud.id_solicitud || index} style={styles.solicitudCard}>
                    <View style={styles.solicitudHeader}>
                      <Text style={styles.solicitudFecha} numberOfLines={2}>
                        📅 {solicitud.fecha_creacion ? formatFecha(solicitud.fecha_creacion) : 'Fecha no disponible'}
                      </Text>
                      <View
                        style={[
                          styles.solicitudEstadoBadge,
                          { backgroundColor: getEstadoSolicitudColor(solicitud.estado) }
                        ]}
                      >
                        <Text style={styles.solicitudEstadoText} numberOfLines={1}>
                          {getEstadoSolicitudTexto(solicitud.estado)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.solicitudMotivo}>
                      <Text style={styles.solicitudMotivoLabel}>Motivo: </Text>
                      {solicitud.motivo || 'Sin motivo especificado'}
                    </Text>

                    {/* Los pacientes ya no pueden solicitar fecha específica */}
                    {/* El doctor decidirá la nueva fecha al aprobar */}

                    {solicitud.respuesta_doctor && (
                      <View style={styles.solicitudRespuesta}>
                        <Text style={styles.solicitudRespuestaLabel}>
                          👨‍⚕️ Respuesta del doctor:
                        </Text>
                        <Text style={styles.solicitudRespuestaText}>
                          {solicitud.respuesta_doctor}
                        </Text>
                      </View>
                    )}

                    {solicitud.estado === ESTADOS_SOLICITUD_REPROGRAMACION.PENDIENTE && (
                      <TouchableOpacity
                        style={styles.cancelarSolicitudButton}
                        onPress={() => handleCancelarSolicitud(solicitud)}
                      >
                        <Text style={styles.cancelarSolicitudButtonText}>
                          ✕ Cancelar Solicitud
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORES.FONDO_CARD,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '600',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    textAlign: 'center',
  },
  listenButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    borderWidth: 1,
    borderColor: COLORES.NAV_PRIMARIO,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listenButtonText: {
    fontSize: 20,
  },
  counter: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORES.NAV_PACIENTE,
  },
  counterText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORES.EXITO,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
  citaCard: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 16,
    padding: 0,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORES.NAV_PACIENTE,
    elevation: 4,
    shadowColor: COLORES.NEGRO,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  citaCardToday: {
    borderColor: COLORES.ERROR_LIGHT,
    backgroundColor: COLORES.FONDO_ERROR_CLARO,
  },
  citaCardTomorrow: {
    borderColor: COLORES.ADVERTENCIA_LIGHT,
    backgroundColor: COLORES.FONDO_ADVERTENCIA_CLARO,
  },
  citaCardInner: {
    flexDirection: 'row',
    minHeight: 80,
  },
  citaCardBarra: {
    width: 6,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  citaCardContent: {
    flex: 1,
    padding: 20,
  },
  citaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  badgeToday: {
    backgroundColor: COLORES.ERROR_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeTomorrow: {
    backgroundColor: COLORES.ADVERTENCIA_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeDias: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 12,
    fontWeight: 'bold',
  },
  citaDias: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    marginLeft: 'auto',
  },
  citaDiasRight: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    marginLeft: 'auto',
  },
  citaFecha: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 12,
  },
  citaMotivoContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: COLORES.FONDO,
    borderRadius: 8,
  },
  citaMotivoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 4,
  },
  citaMotivo: {
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
  },
  citaDoctorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  citaDoctorIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  citaDoctor: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '500',
  },
  citaFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORES.BORDE_CLARO,
    paddingTop: 12,
    marginTop: 8,
  },
  citaHint: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  reprogramarButton: {
    backgroundColor: COLORES.ADVERTENCIA_LIGHT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  reprogramarButtonDisabled: {
    backgroundColor: COLORES.BORDE_CLARO,
    borderColor: COLORES.TEXTO_DISABLED,
    opacity: 0.7,
  },
  reprogramarButtonText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 16,
    fontWeight: '600',
  },
  reprogramarButtonTextDisabled: {
    color: COLORES.TEXTO_SECUNDARIO,
  },
  solicitudesButton: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORES.PRIMARIO_LIGHT,
  },
  solicitudesButtonText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORES.FONDO_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 16,
    width: '100%',
    maxHeight: '85%',
    height: Dimensions.get('window').height * 0.85,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.TEXTO_DISABLED,
    paddingBottom: 12,
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
    marginRight: 8,
  },
  modalCloseButton: {
    padding: 8,
    flexShrink: 0,
  },
  modalCloseText: {
    fontSize: 24,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollViewContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  modalCitaInfo: {
    backgroundColor: COLORES.FONDO,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalCitaInfoText: {
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 4,
  },
  modalField: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: COLORES.FONDO_CARD,
  },
  modalHint: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: COLORES.NAV_PACIENTE,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  modalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
  solicitudCard: {
    backgroundColor: COLORES.FONDO,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  solicitudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  solicitudFecha: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  solicitudEstadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexShrink: 0,
  },
  solicitudEstadoText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 12,
    fontWeight: '600',
  },
  solicitudMotivo: {
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  solicitudMotivoLabel: {
    fontWeight: '600',
  },
  solicitudFechaSolicitada: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 8,
  },
  solicitudRespuesta: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    borderRadius: 8,
  },
  solicitudRespuestaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.NAV_PRIMARIO,
    marginBottom: 4,
  },
  solicitudRespuestaText: {
    fontSize: 14,
    color: COLORES.TEXTO_PRIMARIO,
  },
  cancelarSolicitudButton: {
    backgroundColor: COLORES.ERROR_LIGHT,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  cancelarSolicitudButtonText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MisCitas;
