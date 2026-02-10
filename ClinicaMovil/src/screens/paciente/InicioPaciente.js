/**
 * Pantalla: Inicio Paciente
 * 
 * Pantalla principal ultra-simplificada para pacientes rurales.
 * Máximo 4 opciones grandes con navegación por colores y TTS.
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import BigIconButton from '../../components/paciente/BigIconButton';
import HealthStatusIndicator from '../../components/paciente/HealthStatusIndicator';
import useTTS from '../../hooks/useTTS';
import usePacienteData from '../../hooks/usePacienteData';
import { useReminders } from '../../hooks/useReminders';
import { useHealthStatus } from '../../hooks/useHealthStatus';
import { useNotificationManager } from '../../hooks/useNotificationManager';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import localNotificationService from '../../services/localNotificationService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';
import useWebSocket from '../../hooks/useWebSocket';
import OfflineIndicator from '../../components/common/OfflineIndicator';

const InicioPaciente = () => {
  const navigation = useNavigation();
  const { logout, userData } = useAuth();
  const { paciente, loading, medicamentos, citas, signosVitales, refresh } = usePacienteData();
  const { speak, speakInstruction, stopAndClear, createTimeout } = useTTS();
  const [refreshing, setRefreshing] = useState(false);
  
  // Hooks para recordatorios e indicadores
  const reminders = useReminders(medicamentos, citas, signosVitales, !loading);
  const healthStatus = useHealthStatus(signosVitales, !loading);

  // Handler para pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticService.medium();
    try {
      await refresh();
      audioFeedbackService.playSuccess();
      await speak('Datos actualizados');
    } catch (error) {
      Logger.error('Error refrescando datos:', error);
      audioFeedbackService.playError();
    } finally {
      setRefreshing(false);
    }
  }, [refresh, speak]);
  
  // Activar notificaciones programadas
  useNotificationManager(medicamentos, citas, !loading);

  // WebSocket para actualizaciones en tiempo real
  const { subscribeToEvent } = useWebSocket();
  const pacienteId = paciente?.id_paciente || paciente?.id || userData?.id_paciente || userData?.id;

  // Suscribirse a eventos WebSocket relevantes para el dashboard
  useEffect(() => {
    if (!subscribeToEvent || !pacienteId) return;

    // Evento: Nueva cita creada (actualizar contador)
    const unsubscribeCitaCreada = subscribeToEvent('cita_creada', (data) => {
      if (data.id_paciente === pacienteId) {
        Logger.info('InicioPaciente: Nueva cita recibida por WebSocket', data);
        hapticService.light();
        // Los datos se actualizarán automáticamente cuando el usuario navegue a MisCitas
      }
    });

    // Evento: Cita actualizada (actualizar contador si es relevante)
    const unsubscribeCitaActualizada = subscribeToEvent('cita_actualizada', (data) => {
      if (data.id_paciente === pacienteId) {
        Logger.info('InicioPaciente: Cita actualizada recibida por WebSocket', data);
        hapticService.light();
      }
    });

    // Evento: Alerta crítica de signos vitales
    const unsubscribeAlertaCritica = subscribeToEvent('alerta_signos_vitales_critica', (data) => {
      if (data.id_paciente === pacienteId) {
        Logger.info('InicioPaciente: Alerta crítica recibida por WebSocket', data);
        hapticService.heavy();
        audioFeedbackService.playError();
        // Mostrar notificación local
        localNotificationService.showNotification({
          title: '🚨 Alerta Crítica de Salud',
          message: data.mensaje || 'Tus signos vitales requieren atención inmediata',
          channelId: 'clinica-movil-alerts',
          priority: 'high',
          data: { type: 'critical_alert', pacienteId: data.id_paciente }
        });
      }
    });

    // Evento: Alerta moderada de signos vitales
    const unsubscribeAlertaModerada = subscribeToEvent('alerta_signos_vitales_moderada', (data) => {
      if (data.id_paciente === pacienteId) {
        Logger.info('InicioPaciente: Alerta moderada recibida por WebSocket', data);
        hapticService.medium();
      }
    });

    return () => {
      if (unsubscribeCitaCreada) unsubscribeCitaCreada();
      if (unsubscribeCitaActualizada) unsubscribeCitaActualizada();
      if (unsubscribeAlertaCritica) unsubscribeAlertaCritica();
      if (unsubscribeAlertaModerada) unsubscribeAlertaModerada();
    };
  }, [subscribeToEvent, pacienteId]);

  // Función para obtener solo el primer nombre (primera palabra)
  const obtenerPrimerNombre = useCallback((nombreCompleto) => {
    if (!nombreCompleto) return 'Paciente';
    return nombreCompleto.split(' ')[0];
  }, []);

  // Función para construir el nombre completo del paciente
  const construirNombreCompleto = useCallback(() => {
    // Intentar obtener nombre_completo si existe
    if (paciente?.nombre_completo) {
      return paciente.nombre_completo;
    }
    if (userData?.nombre_completo) {
      return userData.nombre_completo;
    }

    // Construir desde campos individuales del paciente
    if (paciente?.nombre) {
      const partes = [
        paciente.nombre,
        paciente.apellido_paterno,
        paciente.apellido_materno
      ].filter(Boolean); // Eliminar valores null/undefined/empty
      if (partes.length > 0) {
        return partes.join(' ');
      }
    }

    // Construir desde userData si no hay datos del paciente
    if (userData?.nombre) {
      const partes = [
        userData.nombre,
        userData.apellido_paterno,
        userData.apellido_materno
      ].filter(Boolean);
      if (partes.length > 0) {
        return partes.join(' ');
      }
    }

    // Si solo hay nombre sin apellidos
    if (paciente?.nombre) {
      return paciente.nombre;
    }
    if (userData?.nombre) {
      return userData.nombre;
    }

    return null;
  }, [paciente, userData]);

  const handleNavigate = useCallback(async (screen, label) => {
    hapticService.medium();
    await speak(`Abriendo ${label}`, {
      variant: 'information',
      priority: 'low'
    });
    navigation.navigate(screen);
  }, [navigation, speak]);

  const performLogout = useCallback(async () => {
    Logger.info('Logout iniciado desde paciente');
    hapticService.medium();
    await speak('Cerrando sesión', {
      variant: 'information',
      priority: 'low'
    });
    await logout();
  }, [speak, logout]);

  const handleLogout = useCallback(() => {
    hapticService.light();
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres cerrar tu sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: performLogout },
      ]
    );
  }, [performLogout]);

  // Obtener el nombre completo y el primer nombre del paciente
  const nombreCompleto = construirNombreCompleto();
  const nombrePaciente = obtenerPrimerNombre(nombreCompleto);
  
  // Debug: Log para verificar datos (debe estar después de todos los useCallback)
  useEffect(() => {
    Logger.debug('InicioPaciente: Datos del paciente', {
      tienePaciente: !!paciente,
      tieneUserData: !!userData,
      nombrePaciente,
      nombreCompleto,
      pacienteId: paciente?.id_paciente || paciente?.id,
      pacienteNombre: paciente?.nombre,
      userDataNombre: userData?.nombre,
      userDataNombreCompleto: userData?.nombre_completo,
      userDataKeys: userData ? Object.keys(userData) : [],
      pacienteKeys: paciente ? Object.keys(paciente) : []
    });
  }, [paciente, userData, nombrePaciente, nombreCompleto]);

  // Saludar al paciente al entrar
  useEffect(() => {
    const saludar = async () => {
      const primerNombre = obtenerPrimerNombre(nombreCompleto);
      await speak(`Bienvenido ${nombrePaciente}. ¿Qué necesitas hacer hoy, Ver tus Citas, Registrar Signos Vitales, Ver tus Medicamentos, Ver tu Historial Medico, o Chat con Doctor?`);
    };

    let timeoutId;
    if (!loading && (paciente || userData)) {
      timeoutId = createTimeout(saludar, 500); // Pequeño delay para que cargue todo
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // Cleanup: Detener TTS cuando el componente se desmonta
      Logger.debug('InicioPaciente: Cleanup - Deteniendo TTS y limpiando cola');
      stopAndClear();
    };
  }, [paciente, loading, userData, speak, obtenerPrimerNombre, nombreCompleto, nombrePaciente, stopAndClear, createTimeout]);

  return (
    <SafeAreaView style={styles.container}>
      <OfflineIndicator />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
          <Text style={styles.saludo}>
            Hola {nombrePaciente}
          </Text>
          <TouchableOpacity
            style={styles.listenButton}
            onPress={async () => {
              try {
                hapticService.light();
                await speak(`Hola ${nombreCompleto || nombrePaciente}. ¿Qué necesitas hacer hoy, Ver tus Citas, Registrar Signos Vitales, Ver tus Medicamentos, Ver tu Historial Medico, o Chat con Doctor?`);
              } catch (error) {
                Logger.error('Error en TTS:', error);
                hapticService.error();
              }
            }}
          >
            <Text style={styles.listenButtonText}>🔊 Escuchar</Text>
          </TouchableOpacity>
        </View>

        {/* Indicador de estado de salud */}
        {healthStatus.status !== 'normal' && (
          <View style={styles.healthStatusContainer}>
            <HealthStatusIndicator
              status={healthStatus.status}
              label={healthStatus.label}
              size="large"
            />
          </View>
        )}

        {/* Opciones principales - Máximo 4 */}
        <View style={styles.optionsContainer}>
          <BigIconButton
            icon="🗓️"
            label="Mis Citas"
            subLabel="Ver próximas citas médicas"
            color="green"
            badgeCount={reminders.citas.totalProximas > 0 ? reminders.citas.totalProximas : undefined}
            badgeVariant={reminders.citas.citas5h.length > 0 ? 'danger' : 'warning'}
            onPress={() => handleNavigate('MisCitas', 'mis citas')}
            speakText={`Mis citas. ${reminders.citas.totalProximas > 0 ? `${reminders.citas.totalProximas} citas próximas` : 'Ver próximas citas médicas'}`}
          />

          <BigIconButton
            icon="🩺"
            label="Signos Vitales"
            subLabel="Registrar datos de salud"
            color="red"
            badgeCount={reminders.signosVitales.necesitaRecordatorio ? 1 : undefined}
            badgeVariant="warning"
            onPress={() => handleNavigate('RegistrarSignosVitales', 'registrar signos vitales')}
            speakText="Signos vitales. Registra tus datos vitales.sigue los pasos"
          />

          <BigIconButton
            icon="💊"
            label="Mis Medicamentos"
            subLabel="Ver medicamentos y horarios"
            color="blue"
            badgeCount={reminders.medicamentos.proximoMedicamento && reminders.medicamentos.tiempoRestante < 60 ? 1 : undefined}
            badgeVariant={reminders.medicamentos.proximoMedicamento && reminders.medicamentos.tiempoRestante < 30 ? 'danger' : 'warning'}
            onPress={() => handleNavigate('MisMedicamentos', 'mis medicamentos')}
            speakText="Mis medicamentos. Ver medicamentos y horarios"
          />

          <BigIconButton
            icon="📋"
            label="Mi Historial"
            subLabel="Ver historial médico completo"
            color="orange"
            onPress={() => handleNavigate('HistorialMedico', 'mi historial médico')}
            speakText="Ver historial médico completo"
          />

          <BigIconButton
            icon="💬"
            label="Chat con Doctor"
            subLabel="Hablar con tu médico"
            color="purple"
            onPress={() => handleNavigate('ChatDoctor', 'chat con doctor')}
            speakText="Chat con doctor. Hablar con tu médico"
          />
        </View>


        {/* Botón de cerrar sesión */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingTop: 40,
    alignItems: 'center', // ✅ Centrar contenido horizontalmente
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  saludo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    marginBottom: 12,
    textAlign: 'center',
  },
  listenButton: {
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORES.INFO_LIGHT,
  },
  listenButtonText: {
    fontSize: 14,
    color: COLORES.NAV_PRIMARIO,
    fontWeight: '600',
  },
  optionsContainer: {
    width: '90%',
    alignSelf: 'center',
    marginBottom: 40,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  logoutButton: {
    backgroundColor: COLORES.ERROR_LIGHT,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 30,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 200,
    elevation: 4,
    shadowColor: COLORES.NEGRO,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  logoutText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 18,
    fontWeight: '600',
  },
  healthStatusContainer: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

export default InicioPaciente;

