import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Paragraph, Chip, Button } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import { useDoctorDashboard } from '../../hooks/useDashboard';
import { usePacientes } from '../../hooks/useGestion';
import useNotificacionesDoctor from '../../hooks/useNotificacionesDoctor';
import { formatDate, formatTime, formatDateTime, formatDateWithWeekday } from '../../utils/dateUtils';
import useWebSocket from '../../hooks/useWebSocket';
import useScreenFocus from '../../hooks/useScreenFocus';
import gestionService from '../../api/gestionService';
import { estaFueraDeRango, RANGOS_NORMALES } from '../../utils/vitalSignsRanges';

const { width } = Dimensions.get('window');

const DashboardDoctor = ({ navigation }) => {
  const { userData, userRole } = useAuth();
  
  // Validar que solo doctores puedan acceder
  useEffect(() => {
    if (userRole !== 'Doctor' && userRole !== 'doctor') {
      Logger.warn('Acceso no autorizado al dashboard de doctor', { userRole });
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    }
  }, [userRole, navigation]);

  // Hook para datos del dashboard del doctor
  const { 
    data: dashboardData,
    metrics, 
    citasHoy, 
    pacientes: pacientesDashboard,
    proximasCitas,
    chartData,
    alertasSignosVitales,
    loading: dashboardLoading, 
    error: dashboardError, 
    refresh: refreshDashboard 
  } = useDoctorDashboard();

  // Hook para pacientes (ya filtra por doctor automáticamente en el backend)
  const { 
    pacientes, 
    loading: pacientesLoading, 
    error: pacientesError,
    refresh: refreshPacientes 
  } = usePacientes('activos', 'recent');

  // Hook para notificaciones (solo mostrar no leídas en el dashboard)
  const { 
    notificaciones, 
    contadorNoLeidas, 
    loading: loadingNotificaciones,
    refresh: refreshNotificaciones
  } = useNotificacionesDoctor(userData?.id_doctor, { 
    limit: 5,
    estado: 'enviada' // Solo mostrar notificaciones no leídas
  });

  // WebSocket para actualizaciones en tiempo real
  const { subscribeToEvent, isConnected } = useWebSocket();

  // Refrescar todos los datos
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para modal de signos vitales
  const [showSignosVitalesModal, setShowSignosVitalesModal] = useState(false);
  const [pacienteSignosVitales, setPacienteSignosVitales] = useState(null);
  const [loadingSignosVitales, setLoadingSignosVitales] = useState(false);
  const [notificacionSignosVitales, setNotificacionSignosVitales] = useState(null);
  
  const handleRefresh = useCallback(async () => {
    if (!userData?.id_usuario) {
      // No hay usuario autenticado, no hacer refresh
      setRefreshing(false);
      return;
    }
    
    setRefreshing(true);
    try {
      await Promise.all([
        refreshDashboard(),
        refreshPacientes(),
        refreshNotificaciones()
      ]);
      // Logger.info('DashboardDoctor: Datos refrescados exitosamente');
    } catch (error) {
      Logger.error('Error refrescando datos del dashboard', error);
    } finally {
      setRefreshing(false);
    }
  }, [userData?.id_usuario, refreshDashboard, refreshPacientes, refreshNotificaciones]);

  // Refrescar datos cuando la pantalla se enfoca
  useScreenFocus(
    [refreshDashboard, refreshPacientes, refreshNotificaciones],
    {
      enabled: !!userData?.id_usuario,
      screenName: 'DashboardDoctor',
      dependencies: [userData?.id_usuario]
    }
  );

  // Suscribirse a eventos WebSocket (solo cuando esté conectado)
  useEffect(() => {
    if (!subscribeToEvent || !userData?.id_doctor || !isConnected) {
      if (!isConnected) {
        Logger.debug('DashboardDoctor: WebSocket no conectado, esperando conexión...');
      }
      return;
    }

    Logger.info('DashboardDoctor: Suscribiéndose a eventos WebSocket', { id_doctor: userData.id_doctor, isConnected });

    // Evento: Nueva cita creada
    const unsubscribeCitaCreada = subscribeToEvent('cita_creada', (data) => {
      if (data.id_doctor === userData.id_doctor) {
        Logger.info('DashboardDoctor: Nueva cita recibida por WebSocket', data);
        // Recargar dashboard para actualizar métricas y citas
        refreshDashboard();
      }
    });

    // Evento: Cita actualizada
    const unsubscribeCitaActualizada = subscribeToEvent('cita_actualizada', (data) => {
      if (data.id_doctor === userData.id_doctor) {
        Logger.info('DashboardDoctor: Cita actualizada recibida por WebSocket', data);
        // Recargar dashboard
        refreshDashboard();
      }
    });

    // Evento: Solicitud de reprogramación
    const unsubscribeSolicitudReprogramacion = subscribeToEvent('solicitud_reprogramacion', (data) => {
      if (data.id_doctor === userData.id_doctor) {
        Logger.info('DashboardDoctor: Solicitud de reprogramación recibida por WebSocket', data);
        // Recargar dashboard y notificaciones (las solicitudes aparecen como notificaciones)
        refreshDashboard();
        refreshNotificaciones();
      }
    });

    // Evento: Signos vitales registrados
    const unsubscribeSignosVitales = subscribeToEvent('signos_vitales_registrados', (data) => {
      Logger.info('DashboardDoctor: Signos vitales registrados recibidos por WebSocket', data);
      // Recargar dashboard para actualizar alertas de signos vitales
      refreshDashboard();
    });

    // Evento: Alerta de signos vitales crítica
    const unsubscribeAlertaCritica = subscribeToEvent('alerta_signos_vitales_critica', (data) => {
      Logger.info('DashboardDoctor: Alerta crítica recibida por WebSocket', data);
      // Recargar dashboard para actualizar alertas
      refreshDashboard();
      // Mostrar alerta visual
      Alert.alert(
        '🚨 ALERTA CRÍTICA',
        data.mensaje || 'Signos vitales fuera de rango crítico',
        [{ text: 'Ver Paciente', onPress: () => handleViewPacienteFromAlerta(data) }]
      );
    });

    // Evento: Alerta de signos vitales moderada
    const unsubscribeAlertaModerada = subscribeToEvent('alerta_signos_vitales_moderada', (data) => {
      Logger.info('DashboardDoctor: Alerta moderada recibida por WebSocket', data);
      // Recargar dashboard para actualizar alertas
      refreshDashboard();
    });

    // Evento: Nueva notificación del doctor
    const unsubscribeNotificacion = subscribeToEvent('notificacion_doctor', (data) => {
      if (data.id_doctor === userData.id_doctor) {
        Logger.info('DashboardDoctor: Nueva notificación recibida por WebSocket', data);
        // Recargar notificaciones
        refreshNotificaciones();
      }
    });

    // Evento: Paciente asignado
    const unsubscribePacienteAsignado = subscribeToEvent('patient_assigned', (data) => {
      if (data.id_doctor === userData.id_doctor) {
        Logger.info('DashboardDoctor: Nuevo paciente asignado recibido por WebSocket', data);
        // Recargar lista de pacientes
        refreshPacientes();
        // Recargar dashboard
        refreshDashboard();
      }
    });

    // Evento: Paciente desasignado
    const unsubscribePacienteDesasignado = subscribeToEvent('patient_unassigned', (data) => {
      if (data.id_doctor === userData.id_doctor) {
        Logger.info('DashboardDoctor: Paciente desasignado recibido por WebSocket', data);
        // Recargar lista de pacientes
        refreshPacientes();
        // Recargar dashboard
        refreshDashboard();
      }
    });

    // Cleanup
    return () => {
      if (unsubscribeCitaCreada) unsubscribeCitaCreada();
      if (unsubscribeCitaActualizada) unsubscribeCitaActualizada();
      if (unsubscribeSolicitudReprogramacion) unsubscribeSolicitudReprogramacion();
      if (unsubscribeSignosVitales) unsubscribeSignosVitales();
      if (unsubscribeAlertaCritica) unsubscribeAlertaCritica();
      if (unsubscribeAlertaModerada) unsubscribeAlertaModerada();
      if (unsubscribeNotificacion) unsubscribeNotificacion();
      if (unsubscribePacienteAsignado) unsubscribePacienteAsignado();
      if (unsubscribePacienteDesasignado) unsubscribePacienteDesasignado();
    };
  }, [subscribeToEvent, userData?.id_doctor, isConnected, refreshDashboard, refreshPacientes, refreshNotificaciones, handleViewPacienteFromAlerta]);

  /**
   * Navegar a detalles de un paciente
   */
  const handleViewPaciente = (paciente) => {
    const pacienteId = paciente.id_paciente || paciente.id;
    Logger.navigation('DashboardDoctor', 'DetallePaciente', { pacienteId });
    navigation.navigate('DetallePaciente', { 
      paciente: {
        id_paciente: pacienteId,
        id: pacienteId,
        nombre: paciente.nombre || paciente.nombre_completo?.split(' ')[0],
        apellido_paterno: paciente.apellido_paterno || paciente.nombre_completo?.split(' ')[1],
        apellido_materno: paciente.apellido_materno
      }
    });
  };

  /**
   * Navegar a detalles de paciente desde alerta de signos vitales
   */
  const handleViewPacienteFromAlerta = (alerta) => {
    Logger.navigation('DashboardDoctor', 'DetallePaciente', { pacienteId: alerta.id_paciente });
    navigation.navigate('DetallePaciente', { 
      paciente: {
        id_paciente: alerta.id_paciente,
        id: alerta.id_paciente,
        nombre: alerta.paciente.split(' ')[0],
        apellido_paterno: alerta.paciente.split(' ')[1] || ''
      }
    });
  };

  const handleViewAllAppointments = () => {
    Logger.navigation('DashboardDoctor', 'VerTodasCitas');
    navigation.navigate('VerTodasCitas');
  };

  const handleViewPatients = () => {
    Logger.navigation('DashboardDoctor', 'ListaPacientesDoctor');
    navigation.navigate('ListaPacientesDoctor');
  };

  /**
   * Manejar presión en notificación
   * Si es solicitud de reprogramación, navegar a la pantalla de gestión
   * Si es nuevo mensaje, navegar al chat con el paciente
   * Para otros tipos, navegar a HistorialNotificaciones
   */
  const handleNotificacionPress = useCallback((notificacion) => {
    // Log detallado para debugging
    Logger.info('DashboardDoctor: handleNotificacionPress llamado', {
      tipo: notificacion.tipo,
      tipo_raw: typeof notificacion.tipo,
      id_notificacion: notificacion.id_notificacion,
      titulo: notificacion.titulo,
      mensaje: notificacion.mensaje,
      datos_adicionales: notificacion.datos_adicionales
    });

    // Verificar tipo de notificación (comparación robusta)
    const tipoNotificacion = notificacion.tipo 
      ? String(notificacion.tipo).toLowerCase().trim() 
      : null;

    // Verificar también por título o mensaje si el tipo no está disponible
    const tituloLower = notificacion.titulo?.toLowerCase() || '';
    const mensajeLower = notificacion.mensaje?.toLowerCase() || '';
    const esSolicitudReprogramacion = 
      tipoNotificacion === 'solicitud_reprogramacion' ||
      tituloLower.includes('reprogramación') ||
      tituloLower.includes('reprogramacion') ||
      mensajeLower.includes('reprogramar');

    Logger.info('DashboardDoctor: Análisis de tipo de notificación', {
      tipoNotificacion,
      esSolicitudReprogramacion,
      titulo: notificacion.titulo,
      mensaje: notificacion.mensaje
    });

    if (esSolicitudReprogramacion) {
      // Extraer id_solicitud de datos_adicionales o usar id_cita como fallback
      const idSolicitud = notificacion.datos_adicionales?.id_solicitud || null;
      const idCita = notificacion.id_cita || null;
      const idNotificacion = notificacion.id_notificacion || null;
      
      Logger.navigation('DashboardDoctor', 'GestionSolicitudesReprogramacion', {
        desde: 'notificacion',
        id_notificacion: idNotificacion,
        id_solicitud: idSolicitud,
        id_cita: idCita,
        tipo_detectado: tipoNotificacion
      });
      
      // Pasar parámetros al navegar para que la pantalla pueda mostrar la solicitud específica
      // y marcar la notificación como leída
      navigation.navigate('GestionSolicitudesReprogramacion', {
        id_solicitud: idSolicitud,
        id_cita: idCita,
        id_notificacion: idNotificacion,
        desde_notificacion: true
      });
      return; // Importante: retornar después de navegar
    } 
    
    if (tipoNotificacion === 'nuevo_mensaje') {
      const pacienteId = notificacion.id_paciente || notificacion.datos_adicionales?.id_paciente;
      
      if (!pacienteId) {
        Logger.error('DashboardDoctor: No se pudo obtener pacienteId de la notificación', {
          notificacion
        });
        return;
      }

      Logger.navigation('DashboardDoctor', 'ChatPaciente', {
        desde: 'notificacion',
        id_notificacion: notificacion.id_notificacion,
        pacienteId
      });

      // Navegar al chat con el paciente
      navigation.navigate('ChatPaciente', {
        pacienteId: String(pacienteId),
        paciente: notificacion.datos_adicionales?.paciente_nombre 
          ? { 
              id_paciente: pacienteId,
              nombre: notificacion.datos_adicionales.paciente_nombre.split(' ')[0],
              apellido_paterno: notificacion.datos_adicionales.paciente_nombre.split(' ')[1] || ''
            }
          : undefined
      });
      return; // Importante: retornar después de navegar
    }
    
    // Verificar si es notificación de alerta de signos vitales
    const esAlertaSignosVitales = 
      tipoNotificacion === 'alerta_signos_vitales' ||
      tituloLower.includes('signos vitales') ||
      tituloLower.includes('alerta') ||
      mensajeLower.includes('signos vitales');
    
    if (esAlertaSignosVitales) {
      const pacienteId = notificacion.id_paciente || notificacion.datos_adicionales?.id_paciente;
      
      if (!pacienteId) {
        Logger.error('DashboardDoctor: No se pudo obtener pacienteId de la notificación de signos vitales', {
          notificacion
        });
        return;
      }
      
      Logger.info('DashboardDoctor: Mostrando modal de signos vitales', {
        pacienteId,
        id_notificacion: notificacion.id_notificacion
      });
      
      // Guardar notificación para mostrar en el modal
      setNotificacionSignosVitales(notificacion);
      setShowSignosVitalesModal(true);
      
      // Cargar signos vitales del paciente
      cargarSignosVitalesPaciente(pacienteId);
      
      return;
    }
    
    // Para otros tipos de notificación, navegar a HistorialNotificaciones
    Logger.warn('DashboardDoctor: Tipo de notificación no reconocido, navegando a HistorialNotificaciones', {
      tipo: tipoNotificacion,
      id_notificacion: notificacion.id_notificacion,
      titulo: notificacion.titulo
    });
    Logger.navigation('DashboardDoctor', 'HistorialNotificaciones', {
      desde: 'notificacion',
      id_notificacion: notificacion.id_notificacion,
      tipo: tipoNotificacion
    });
    navigation.navigate('HistorialNotificaciones');
  }, [navigation]);
  
  // Función para cargar signos vitales del paciente
  const cargarSignosVitalesPaciente = useCallback(async (pacienteId) => {
    setLoadingSignosVitales(true);
    try {
      Logger.info('DashboardDoctor: Cargando signos vitales del paciente', { pacienteId });
      
      const response = await gestionService.getPacienteSignosVitales(pacienteId, {
        limit: 1, // Solo el último registro
        offset: 0,
        sort: 'DESC'
      });
      
      if (response.success && response.data && response.data.length > 0) {
        setPacienteSignosVitales(response.data[0]);
        Logger.info('DashboardDoctor: Signos vitales cargados exitosamente', {
          pacienteId,
          signosVitales: response.data[0]
        });
      } else {
        Logger.warn('DashboardDoctor: No se encontraron signos vitales para el paciente', { pacienteId });
        setPacienteSignosVitales(null);
      }
    } catch (error) {
      Logger.error('DashboardDoctor: Error cargando signos vitales del paciente', error);
      setPacienteSignosVitales(null);
    } finally {
      setLoadingSignosVitales(false);
    }
  }, []);
  
  // Función para cerrar el modal y marcar notificación como leída
  const cerrarModalSignosVitales = useCallback(async () => {
    if (notificacionSignosVitales && userData?.id_doctor) {
      try {
        await gestionService.marcarNotificacionLeida(
          userData.id_doctor,
          notificacionSignosVitales.id_notificacion
        );
        Logger.info('DashboardDoctor: Notificación de signos vitales marcada como leída', {
          id_notificacion: notificacionSignosVitales.id_notificacion
        });
        // Refrescar notificaciones para removerla de la lista
        refreshNotificaciones();
      } catch (error) {
        Logger.warn('DashboardDoctor: Error marcando notificación como leída (no crítico)', error);
      }
    }
    
    setShowSignosVitalesModal(false);
    setPacienteSignosVitales(null);
    setNotificacionSignosVitales(null);
  }, [notificacionSignosVitales, userData?.id_doctor, refreshNotificaciones]);

  // Usar datos del dashboard o valores por defecto
  const doctorMetrics = metrics || {
    citasHoy: 0,
    pacientesAsignados: 0,
    mensajesPendientes: 0,
    proximasCitas: 0,
  };

  // Usar citas del hook o array vacío
  const citasHoyData = citasHoy || [];
  
  // Log para debugging - Comentado temporalmente
  // useEffect(() => {
  //   Logger.debug('DashboardDoctor: Estado de citasHoy', {
  //     citasHoyLength: citasHoy?.length || 0,
  //     citasHoyDataLength: citasHoyData.length,
  //     citasHoy: citasHoy,
  //     dashboardData: dashboardData?.citasHoy,
  //     metrics: metrics
  //   });
  // }, [citasHoy, citasHoyData, dashboardData, metrics]);

  const renderMetricCard = (title, value, subtitle, color = '#1976D2') => (
    <Card style={[styles.metricCard, { borderLeftColor: color }]}>
      <Card.Content style={styles.metricContent}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.metricSubtitle}>{subtitle}</Text>
      </Card.Content>
    </Card>
  );

  // Función para renderizar gráfico de citas (reutilizada del admin)
  const renderChartCard = (title, data, dataKey = 'citas') => {
    if (!data || data.length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Title style={styles.chartTitle}>{title}</Title>
            <Text style={styles.noDataText}>No hay datos disponibles</Text>
          </Card.Content>
        </Card>
      );
    }

    const maxValue = Math.max(...data.map(item => item[dataKey]), 1);
    
    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>{title}</Title>
          <View style={styles.chartContainer}>
            <View style={styles.chartBars}>
              {data.map((item, index) => {
                const barHeight = (item[dataKey] / maxValue) * 80;
                return (
                  <View key={index} style={styles.barContainer}>
                    <Text style={styles.barValue}>{item[dataKey]}</Text>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: '#4CAF50',
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>{item.dia}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Función para renderizar alerta de signos vitales críticos
  const renderAlertaSignosVitales = (alerta) => {
    const getPriorityColor = () => {
      if (alerta.glucosa > 200 || alerta.presion_sistolica > 160) {
        return '#F44336'; // Rojo para crítico
      }
      return '#FF9800'; // Naranja para alto
    };

    return (
      <TouchableOpacity
        key={alerta.id}
        onPress={() => handleViewPacienteFromAlerta(alerta)}
        activeOpacity={0.7}
      >
        <Card style={[styles.alertaCard, { borderLeftColor: getPriorityColor() }]}>
          <Card.Content style={styles.alertaContent}>
            <View style={styles.alertaHeader}>
              <Text style={styles.alertaIcono}>⚠️</Text>
              <View style={styles.alertaInfo}>
                <Text style={styles.alertaPaciente}>{alerta.paciente}</Text>
                <Text style={styles.alertaTipo}>{alerta.tipo_alerta}</Text>
                {alerta.glucosa > 200 && (
                  <Text style={styles.alertaDetalle}>Glucosa: {alerta.glucosa} mg/dL</Text>
                )}
                {(alerta.presion_sistolica > 160 || alerta.presion_diastolica > 100) && (
                  <Text style={styles.alertaDetalle}>
                    Presión: {alerta.presion_sistolica}/{alerta.presion_diastolica} mmHg
                  </Text>
                )}
              </View>
              <Text style={styles.alertaTiempo}>{alerta.fecha_medicion_formateada}</Text>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderCitaItem = (cita, index) => {
    // cita.hora ya viene formateado del hook useDoctorDashboard para citas de hoy
    // Para próximas citas, usar fechaFormateada y hora
    const horaFormateada = cita.hora || (cita.fecha ? formatTime(new Date(cita.fecha)) : 'N/A');
    const fechaFormateada = cita.fechaFormateada || (cita.fecha ? formatDate(new Date(cita.fecha)) : null);
    const estado = cita.estado || cita.asistencia || 'Pendiente';
    const estadoColor = estado === 'atendida' || estado === 'Completada' ? '#4CAF50' : 
                       estado === 'pendiente' || estado === 'Pendiente' ? '#FF9800' : 
                       estado === 'cancelada' || estado === 'Cancelada' ? '#9E9E9E' : '#F44336';
    
    const handleCitaPress = () => {
      const citaId = cita.id || cita.id_cita;
      Logger.info('DashboardDoctor: Card de cita presionado', {
        id_cita: citaId,
        paciente: cita.paciente
      });
      navigation.navigate('VerTodasCitas', {
        id_cita: citaId,
        desde_dashboard: true
      });
    };
    
    return (
      <TouchableOpacity
        key={cita.id || index}
        onPress={handleCitaPress}
        activeOpacity={0.7}
        style={styles.citaTouchable}
      >
        <Card style={styles.citaCard} pointerEvents="none">
          <Card.Content style={styles.citaContent}>
            <View style={styles.citaHeader}>
              <View>
                {fechaFormateada && (
                  <Text style={styles.citaFecha}>{fechaFormateada}</Text>
                )}
                <Text style={styles.citaHora}>{horaFormateada}</Text>
              </View>
              <View style={[
                styles.estadoBadge,
                { backgroundColor: estadoColor }
              ]}>
                <Text style={styles.estadoText}>{estado}</Text>
              </View>
            </View>
            <Text style={styles.pacienteNombre}>{cita.paciente}</Text>
            {cita.motivo && (
              <Text style={styles.citaMotivo}>{cita.motivo}</Text>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderPacienteItem = (paciente) => (
    <TouchableOpacity
      key={paciente.id_paciente}
      onPress={() => handleViewPaciente(paciente)}
      activeOpacity={0.7}
    >
      <Card style={styles.pacienteCard}>
        <Card.Content style={styles.pacienteContent}>
          <View style={styles.pacienteHeader}>
            <View style={styles.pacienteInfo}>
              <Text style={styles.pacienteNombre}>
                {paciente.nombre_completo || `${paciente.nombre} ${paciente.apellido_paterno}`}
              </Text>
              {paciente.numero_celular && (
                <Text style={styles.pacienteTelefono}>{paciente.numero_celular}</Text>
              )}
              {paciente.edad && (
                <Text style={styles.pacienteEdad}>Edad: {paciente.edad} años</Text>
              )}
            </View>
            <View style={[
              styles.estadoBadge,
              { backgroundColor: paciente.activo ? '#4CAF50' : '#F44336' }
            ]}>
              <Text style={styles.estadoText}>
                {paciente.activo ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );


  // Si no es doctor, no renderizar nada
  if (userRole !== 'Doctor' && userRole !== 'doctor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>🚫 Acceso Denegado</Text>
          <Text style={styles.accessDeniedMessage}>
            Solo los doctores pueden acceder a esta pantalla.
          </Text>
          <TouchableOpacity 
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const loading = dashboardLoading || pacientesLoading;
  const error = dashboardError || pacientesError;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1976D2']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard Doctor</Text>
          <Text style={styles.headerSubtitle}>Bienvenido Dr. {userData?.email?.split('@')[0] || 'Usuario'}</Text>
          <Text style={styles.headerDate}>{formatDateWithWeekday(new Date())}</Text>
        </View>

        {/* Métricas Principales */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>Resumen del Día</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Citas Hoy',
              doctorMetrics.citasHoy || 0,
              `${citasHoyData.length} programadas`,
              '#4CAF50'
            )}
            {renderMetricCard(
              'Mis Pacientes',
              doctorMetrics.pacientesAsignados || pacientes?.length || 0,
              'asignados',
              '#2196F3'
            )}
          </View>
        </View>

        {/* Citas de Hoy */}
        <View style={styles.citasContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 Citas de Hoy</Text>
            <TouchableOpacity onPress={handleViewAllAppointments}>
              <Text style={styles.verTodasText}>Ver todas →</Text>
            </TouchableOpacity>
          </View>
          {citasHoyData.length > 0 ? (
            citasHoyData.slice(0, 5).map(renderCitaItem)
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No hay citas programadas para hoy</Text>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Gráfico de Citas de la Semana - Removido */}

        {/* Notificaciones Recientes */}
        <View style={styles.notificacionesContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              🔔 Notificaciones
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('HistorialNotificaciones')}
            >
              <Text style={styles.verTodasText}>Ver todas →</Text>
            </TouchableOpacity>
          </View>
          
          {loadingNotificaciones ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#1976D2" />
            </View>
          ) : notificaciones.length > 0 ? (
            notificaciones.slice(0, 3).map((notif) => (
              <TouchableOpacity
                key={notif.id_notificacion}
                onPress={() => {
                  Logger.info('DashboardDoctor: Card de notificación presionado', {
                    id_notificacion: notif.id_notificacion,
                    tipo: notif.tipo
                  });
                  handleNotificacionPress(notif);
                }}
                activeOpacity={0.7}
                style={styles.notificacionTouchable}
              >
                <Card style={styles.notificacionCard} pointerEvents="none">
                  <Card.Content>
                    <View style={styles.notificacionHeader}>
                      <View style={styles.notificacionContent}>
                        <Text style={styles.notificacionTitulo} numberOfLines={1}>
                          {notif.titulo}
                        </Text>
                        <Text style={styles.notificacionMensaje} numberOfLines={2}>
                          {notif.mensaje}
                        </Text>
                      </View>
                      {notif.estado === 'enviada' && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Text style={styles.emptyText}>No hay notificaciones</Text>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Próximas Citas (más allá de hoy) - Removido */}

        {/* Alertas de Signos Vitales Críticos - Removido */}


        {/* Accesos Rápidos */}
        <View style={styles.quickAccessContainer}>
          <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity style={[styles.quickAccessButton, styles.primaryButton]} onPress={handleViewAllAppointments}>
              <Text style={styles.quickAccessIcon}>📅</Text>
              <Text style={styles.quickAccessText}>Ver Todas las Citas</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickAccessButton, styles.primaryButton]} onPress={handleViewPatients}>
              <Text style={styles.quickAccessIcon}>👥</Text>
              <Text style={styles.quickAccessText}>Mis Pacientes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickAccessButton, styles.primaryButton]}
              onPress={() => {
                Logger.navigation('DashboardDoctor', 'AgregarPaciente');
                navigation.navigate('AgregarPaciente');
              }}
            >
              <Text style={styles.quickAccessIcon}>➕</Text>
              <Text style={styles.quickAccessText}>Nuevo Paciente</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickAccessButton, styles.primaryButton]}
              onPress={() => {
                Logger.navigation('DashboardDoctor', 'HistorialMedicoDoctor');
                navigation.navigate('HistorialMedicoDoctor');
              }}
            >
              <Text style={styles.quickAccessIcon}>📋</Text>
              <Text style={styles.quickAccessText}>Historial Médico</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Modal de Signos Vitales Fuera de Rango */}
      <Modal
        visible={showSignosVitalesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={cerrarModalSignosVitales}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>⚠️ Signos Vitales Fuera de Rango</Title>
              <TouchableOpacity 
                onPress={cerrarModalSignosVitales}
                style={styles.modalCloseButtonContainer}
              >
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScrollView}>
              {loadingSignosVitales ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color="#2196F3" />
                  <Text style={styles.modalLoadingText}>Cargando información...</Text>
                </View>
              ) : notificacionSignosVitales ? (
                <>
                  {/* Información del Paciente */}
                  <Card style={styles.modalPacienteCard}>
                    <Card.Content>
                      <Text style={styles.modalPacienteNombre}>
                        👤 {notificacionSignosVitales.datos_adicionales?.paciente_nombre || 
                             notificacionSignosVitales.titulo?.replace('Alerta de Signos Vitales: ', '') || 
                             'Paciente'}
                      </Text>
                      {notificacionSignosVitales.mensaje && (
                        <Text style={styles.modalMensaje}>
                          {notificacionSignosVitales.mensaje}
                        </Text>
                      )}
                      {notificacionSignosVitales.datos_adicionales?.fecha_medicion && (
                        <Text style={styles.modalFecha}>
                          📅 {formatDateTime(new Date(notificacionSignosVitales.datos_adicionales.fecha_medicion))}
                        </Text>
                      )}
                    </Card.Content>
                  </Card>
                  
                  {/* Signos Vitales Fuera de Rango */}
                  {pacienteSignosVitales ? (
                    <Card style={styles.modalSignosCard}>
                      <Card.Content>
                        <Text style={styles.modalSignosTitle}>Signos Vitales Registrados:</Text>
                        <View style={styles.modalSignosList}>
                          {renderSignoVitalItem('Glucosa', pacienteSignosVitales.glucosa_mg_dl, 'mg/dL', 'glucosa')}
                          {renderSignoVitalItem('Presión Sistólica', pacienteSignosVitales.presion_sistolica, 'mmHg', 'presionSistolica')}
                          {renderSignoVitalItem('Presión Diastólica', pacienteSignosVitales.presion_diastolica, 'mmHg', 'presionDiastolica')}
                          {renderSignoVitalItem('IMC', pacienteSignosVitales.imc, 'kg/m²', 'imc')}
                          {renderSignoVitalItem('Colesterol', pacienteSignosVitales.colesterol_mg_dl, 'mg/dL', 'colesterol')}
                          {renderSignoVitalItem('Triglicéridos', pacienteSignosVitales.trigliceridos_mg_dl, 'mg/dL', 'trigliceridos')}
                          {renderSignoVitalItem('Peso', pacienteSignosVitales.peso_kg, 'kg', null)}
                          {renderSignoVitalItem('Talla', pacienteSignosVitales.talla_m, 'm', null)}
                        </View>
                      </Card.Content>
                    </Card>
                  ) : (
                    <Card style={styles.modalSignosCard}>
                      <Card.Content>
                        <Text style={styles.modalNoDataText}>
                          No se encontraron signos vitales registrados para este paciente.
                        </Text>
                      </Card.Content>
                    </Card>
                  )}
                </>
              ) : null}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              {notificacionSignosVitales?.id_paciente && (
                <Button
                  mode="contained"
                  onPress={() => {
                    const pacienteId = notificacionSignosVitales.id_paciente;
                    const pacienteNombre = notificacionSignosVitales.datos_adicionales?.paciente_nombre || 'Paciente';
                    const nombreParts = pacienteNombre.split(' ');
                    cerrarModalSignosVitales();
                    navigation.navigate('ChatPaciente', {
                      pacienteId: String(pacienteId),
                      paciente: {
                        id_paciente: pacienteId,
                        nombre: nombreParts[0] || 'Paciente',
                        apellido_paterno: nombreParts[1] || ''
                      }
                    });
                  }}
                  style={styles.modalButtonFull}
                >
                  Enviar Mensaje
                </Button>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Función helper para renderizar un signo vital
const renderSignoVitalItem = (label, valor, unidad, tipo) => {
  if (valor === null || valor === undefined) return null;
  
  const estaFueraDeRangoValue = tipo && estaFueraDeRango ? estaFueraDeRango(valor, tipo) : false;
  const rango = tipo && RANGOS_NORMALES && RANGOS_NORMALES[tipo] ? RANGOS_NORMALES[tipo] : null;
  
  return (
    <View style={styles.modalSignoItem}>
      <Text style={styles.modalSignoLabel}>{label}:</Text>
      <Text style={[
        styles.modalSignoValue,
        estaFueraDeRangoValue && styles.modalSignoValueOutOfRange
      ]}>
        {valor} {unidad}
        {estaFueraDeRangoValue && ' ⚠️'}
      </Text>
      {estaFueraDeRangoValue && rango && (
        <Text style={styles.modalSignoRango}>
          Rango normal: {rango.min} - {rango.max} {unidad}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#4CAF50',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E8F5E9',
    marginBottom: 5,
  },
  headerDate: {
    fontSize: 14,
    color: '#C8E6C9',
    textTransform: 'capitalize',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginLeft: 5,
  },
  metricsContainer: {
    padding: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - 50) / 2,
    marginBottom: 15,
    elevation: 3,
    borderLeftWidth: 4,
  },
  metricContent: {
    padding: 15,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  citasContainer: {
    padding: 20,
    paddingTop: 0,
  },
  citaTouchable: {
    marginBottom: 12,
  },
  citaCard: {
    marginBottom: 10,
    elevation: 2,
  },
  citaContent: {
    padding: 15,
  },
  citaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  citaHora: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  citaFecha: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pacienteNombre: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  quickAccessContainer: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 30,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAccessButton: {
    width: (width - 50) / 2,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  quickAccessIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  quickAccessText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  quickAccessSubtext: {
    fontSize: 10,
    color: '#FFE082',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },
  // Estilos para gestión de pacientes
  pacientesContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  refreshButtonText: {
    fontSize: 18,
  },
  pacienteCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 8,
  },
  pacienteContent: {
    padding: 16,
  },
  pacienteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pacienteInfo: {
    flex: 1,
  },
  pacienteTelefono: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  pacienteEdad: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  citaMotivo: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  chartsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  chartCard: {
    width: '100%',
    elevation: 3,
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    width: '100%',
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 20,
    borderRadius: 2,
    marginBottom: 5,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 5,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  proximasCitasContainer: {
    padding: 20,
    paddingTop: 0,
  },
  alertasContainer: {
    padding: 20,
    paddingTop: 0,
  },
  alertaCard: {
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderRadius: 8,
  },
  alertaContent: {
    padding: 16,
  },
  alertaHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertaIcono: {
    fontSize: 24,
    marginRight: 12,
  },
  alertaInfo: {
    flex: 1,
  },
  alertaPaciente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  alertaTipo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
    marginBottom: 4,
  },
  alertaDetalle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  alertaTiempo: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    marginLeft: 8,
  },
  alertChip: {
    height: 24,
    backgroundColor: '#F44336',
  },
  alertChipText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  goBackButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  goBackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pacienteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  activateButton: {
    backgroundColor: '#4CAF50',
  },
  deactivateButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  notificacionesContainer: {
    padding: 20,
    paddingTop: 0,
  },
  badgeChip: {
    height: 20,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  verTodasText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  notificacionTouchable: {
    marginBottom: 12,
  },
  notificacionCard: {
    elevation: 2,
    borderRadius: 8,
  },
  notificacionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificacionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificacionContent: {
    flex: 1,
  },
  notificacionTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificacionMensaje: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginLeft: 8,
    marginTop: 4,
  },
  emptyCard: {
    marginBottom: 12,
    elevation: 1,
  },
  alertaCard: {
    marginBottom: 10,
  },
  alertaCardContent: {
    elevation: 2,
    borderLeftWidth: 4,
  },
  alertaContent: {
    padding: 15,
  },
  alertaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertaIcono: {
    fontSize: 24,
    marginRight: 12,
  },
  alertaInfo: {
    flex: 1,
  },
  alertaPaciente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  alertaSintoma: {
    fontSize: 14,
    color: '#666',
  },
  alertaTiempo: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  // Estilos del Modal de Signos Vitales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  modalCloseButtonContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  modalCloseButton: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
    lineHeight: 18,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  modalPacienteCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  modalPacienteNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalMensaje: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalFecha: {
    fontSize: 12,
    color: '#999',
  },
  modalSignosCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  modalSignosTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  modalSignosList: {
    gap: 12,
  },
  modalSignoItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalSignoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  modalSignoValue: {
    fontSize: 16,
    color: '#2196F3',
    marginBottom: 4,
  },
  modalSignoValueOutOfRange: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  modalSignoRango: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  modalNoDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalButton: {
    flex: 1,
  },
  modalButtonFull: {
    width: '100%',
  },
});

export default DashboardDoctor;
