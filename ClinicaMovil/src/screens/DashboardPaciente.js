/**
 * Dashboard Paciente - Pantalla principal mejorada
 * 
 * Dashboard accesible para pacientes rurales con:
 * - TTS completo
 * - Navegación por íconos grandes
 * - Registro de signos vitales
 * - Visualización de medicamentos con recordatorios
 * - Próximas citas
 * - Alertas visuales y auditivas
 * - Indicadores de salud
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import BigIconButton from '../components/paciente/BigIconButton';
import HealthStatusIndicator from '../components/paciente/HealthStatusIndicator';
import useTTS from '../hooks/useTTS';
import usePacienteData from '../hooks/usePacienteData';
import { useReminders } from '../hooks/useReminders';
import { useHealthStatus } from '../hooks/useHealthStatus';
import { useNotificationManager } from '../hooks/useNotificationManager';
import hapticService from '../services/hapticService';
import audioFeedbackService from '../services/audioFeedbackService';
import Logger from '../services/logger';
import useWebSocket from '../hooks/useWebSocket';
import { COLORES } from '../utils/constantes';

const DashboardPaciente = () => {
  const navigation = useNavigation();
  const { logout, userData } = useAuth();
  const { paciente, loading, medicamentos, citas, signosVitales, refresh } = usePacienteData();
  const { speak, speakInstruction, stopAndClear, createTimeout } = useTTS();
  const [refreshing, setRefreshing] = useState(false);
  
  // Hooks para recordatorios e indicadores
  const reminders = useReminders(medicamentos, citas, signosVitales, !loading);
  const healthStatus = useHealthStatus(signosVitales, !loading);
  
  // Activar notificaciones programadas
  useNotificationManager(medicamentos, citas, !loading);

  // WebSocket para actualizaciones en tiempo real
  const { subscribeToEvent, isConnected } = useWebSocket();
  const pacienteId = paciente?.id_paciente || paciente?.id || userData?.id_paciente || userData?.id;

  // Suscribirse a eventos WebSocket
  useEffect(() => {
    if (!subscribeToEvent || !pacienteId) return;

    const unsubscribeCitaCreada = subscribeToEvent('cita_creada', (data) => {
      if (data.id_paciente === pacienteId) {
        Logger.info('DashboardPaciente: Nueva cita recibida por WebSocket', data);
        hapticService.light();
      }
    });

    const unsubscribeAlertaCritica = subscribeToEvent('alerta_signos_vitales_critica', (data) => {
      if (data.id_paciente === pacienteId) {
        Logger.info('DashboardPaciente: Alerta crítica recibida', data);
        hapticService.heavy();
        audioFeedbackService.playError();
        speak(`Alerta crítica. ${data.mensaje || 'Tus signos vitales requieren atención inmediata'}`, {
          variant: 'alert',
          priority: 'high'
        });
      }
    });

    return () => {
      if (unsubscribeCitaCreada) unsubscribeCitaCreada();
      if (unsubscribeAlertaCritica) unsubscribeAlertaCritica();
    };
  }, [subscribeToEvent, pacienteId, speak]);

  // Función para obtener primer nombre
  const obtenerPrimerNombre = useCallback((nombreCompleto) => {
    if (!nombreCompleto) return 'Paciente';
    return nombreCompleto.split(' ')[0];
  }, []);

  // Construir nombre completo
  const construirNombreCompleto = useCallback(() => {
    if (paciente?.nombre_completo) return paciente.nombre_completo;
    if (userData?.nombre_completo) return userData.nombre_completo;
    
    if (paciente?.nombre) {
      const partes = [
        paciente.nombre,
        paciente.apellido_paterno,
        paciente.apellido_materno
      ].filter(Boolean);
      if (partes.length > 0) return partes.join(' ');
    }
    
    if (userData?.nombre) {
      const partes = [
        userData.nombre,
        userData.apellido_paterno,
        userData.apellido_materno
      ].filter(Boolean);
      if (partes.length > 0) return partes.join(' ');
    }
    
    return paciente?.nombre || userData?.nombre || 'Paciente';
  }, [paciente, userData]);

  const nombreCompleto = construirNombreCompleto();
  const nombrePaciente = obtenerPrimerNombre(nombreCompleto);

  // Navegación con TTS
  const handleNavigate = useCallback(async (screen, label) => {
    hapticService.medium();
    await speak(`Abriendo ${label}`, {
      variant: 'information',
      priority: 'low'
    });
    navigation.navigate(screen);
  }, [navigation, speak]);

  // Cerrar sesión
  const handleLogout = useCallback(async () => {
    hapticService.medium();
    await speak('Cerrando sesión', {
      variant: 'information',
      priority: 'low'
    });
    await logout();
  }, [speak, logout]);

  // Refrescar datos
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    hapticService.light();
    try {
      await refresh();
      await speak('Datos actualizados', {
        variant: 'confirmation',
        priority: 'low'
      });
    } catch (error) {
      Logger.error('Error refrescando datos', error);
      await speak('Error al actualizar datos', {
        variant: 'error',
        priority: 'high'
      });
    } finally {
      setRefreshing(false);
    }
  }, [refresh, speak]);

  // Saludar al paciente al entrar
  useEffect(() => {
    const saludar = async () => {
      const mensaje = `Hola, ${nombrePaciente}. Selecciona una opción para continuar: ver tus citas, registrar tus signos vitales, consultar tus medicamentos, revisar tu historial o chatear con tu doctor.`;
      await speak(mensaje);
    };

    let timeoutId;
    if (!loading && (paciente || userData)) {
      timeoutId = createTimeout(saludar, 500);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      stopAndClear();
    };
  }, [paciente, loading, userData, speak, nombrePaciente, stopAndClear, createTimeout]);

  // Mostrar loading
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.PRIMARIO} />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORES.PRIMARIO]}
            tintColor={COLORES.PRIMARIO}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.saludo}>
              Hola {nombrePaciente} 👋
            </Text>
            <Text style={styles.subtitle}>
              Tu panel de salud
            </Text>
          </View>
          <TouchableOpacity
            style={styles.listenButton}
            onPress={async () => {
              try {
                hapticService.light();
                const mensaje = `Hola, ${nombrePaciente}. Selecciona una opción para continuar: ver tus citas, registrar tus signos vitales, consultar tus medicamentos, revisar tu historial o chatear con tu doctor.`;
                await speak(mensaje);
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

        {/* Resumen rápido */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {reminders.citas.totalProximas || 0}
            </Text>
            <Text style={styles.summaryLabel}>Citas próximas</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {medicamentos?.length || 0}
            </Text>
            <Text style={styles.summaryLabel}>Medicamentos</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {signosVitales?.length || 0}
            </Text>
            <Text style={styles.summaryLabel}>Registros</Text>
          </View>
        </View>

        {/* Opciones principales - Máximo 4 */}
        <View style={styles.optionsContainer}>
          <Text style={styles.sectionTitle}>Opciones principales</Text>
          
          <BigIconButton
            icon="📅"
            label="Mis Citas"
            subLabel="Ver próximas citas médicas"
            color="green"
            badgeCount={reminders.citas.totalProximas > 0 ? reminders.citas.totalProximas : undefined}
            badgeVariant={reminders.citas.citas5h.length > 0 ? 'danger' : 'warning'}
            onPress={() => handleNavigate('MisCitas', 'mis citas')}
            speakText={`Mis citas. ${reminders.citas.totalProximas > 0 ? `${reminders.citas.totalProximas} citas próximas` : 'Ver próximas citas médicas'}`}
          />

          <BigIconButton
            icon="💓"
            label="Signos Vitales"
            subLabel="Registrar datos de salud"
            color="red"
            badgeCount={reminders.signosVitales.necesitaRecordatorio ? 1 : undefined}
            badgeVariant="warning"
            onPress={() => handleNavigate('RegistrarSignosVitales', 'registrar signos vitales')}
            speakText="Signos vitales. Registra tus datos vitales. Sigue los pasos"
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
        </View>

        {/* Botón de cerrar sesión */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
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
    marginBottom: 24,
  },
  headerContent: {
    marginBottom: 12,
  },
  saludo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORES.PRIMARIO,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: COLORES.PRIMARIO_LIGHT,
  },
  listenButton: {
    backgroundColor: COLORES.PRIMARIO,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  listenButtonText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 16,
    fontWeight: '600',
  },
  healthStatusContainer: {
    marginBottom: 24,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 16,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryCard: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORES.PRIMARIO,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.PRIMARIO,
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: COLORES.ERROR,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutButtonText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default DashboardPaciente;
