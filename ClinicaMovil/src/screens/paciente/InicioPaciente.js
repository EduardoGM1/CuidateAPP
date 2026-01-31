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
  const { subscribeToEvent, isConnected } = useWebSocket();
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

  const handleLogout = useCallback(async () => {
    Logger.info('Logout iniciado desde paciente');
    hapticService.medium();
    await speak('Cerrando sesión', {
      variant: 'information',
      priority: 'low'
    });
    await logout();
  }, [speak, logout]);

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

        {/* Panel de Pruebas (solo en modo desarrollo) */}
        {__DEV__ && (
          <View style={styles.testPanel}>
            <Text style={styles.testPanelTitle}>🧪 Panel de Pruebas</Text>
            
            {/* Indicador de Estado WebSocket */}
            <View style={styles.wsStatusContainer}>
              <View style={[
                styles.wsStatusDot,
                { backgroundColor: isConnected ? COLORES.NAV_PACIENTE : COLORES.ERROR_LIGHT }
              ]} />
              <Text style={styles.wsStatusText}>
                WebSocket: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
              </Text>
            </View>
            
            <View style={styles.testButtonsContainer}>
              <TouchableOpacity
                style={[styles.testButton, styles.testButtonPrimary]}
                onPress={async () => {
                  hapticService.medium();
                  try {
                    localNotificationService.showNotification({
                      title: '💊 Prueba: Recordatorio de Medicamento',
                      message: 'Esta es una notificación de prueba para medicamentos',
                      channelId: 'clinica-movil-reminders',
                      data: { type: 'test', category: 'medication' },
                    });
                    await speak('Notificación de prueba de medicamento enviada', {
                      variant: 'information',
                      priority: 'low'
                    });
                  } catch (error) {
                    Logger.error('Error en prueba de notificación:', error);
                    await speak('Error al enviar notificación de prueba', {
                      variant: 'error',
                      priority: 'high'
                    });
                  }
                }}
              >
                <Text style={styles.testButtonText}>Probar Notificación Medicamento</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, styles.testButtonPrimary]}
                onPress={async () => {
                  hapticService.medium();
                  try {
                    localNotificationService.showNotification({
                      title: '📅 Prueba: Recordatorio de Cita',
                      message: 'Esta es una notificación de prueba para citas',
                      channelId: 'clinica-movil-reminders',
                      data: { type: 'test', category: 'appointment' },
                    });
                    await speak('Notificación de prueba de cita enviada', {
                      variant: 'information',
                      priority: 'low'
                    });
                  } catch (error) {
                    Logger.error('Error en prueba de notificación:', error);
                    await speak('Error al enviar notificación de prueba', {
                      variant: 'error',
                      priority: 'high'
                    });
                  }
                }}
              >
                <Text style={styles.testButtonText}>Probar Notificación Cita</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, styles.testButtonSecondary]}
                onPress={async () => {
                  hapticService.medium();
                  try {
                    const notificaciones = await localNotificationService.getScheduledNotifications();
                    const mensaje = `Tienes ${notificaciones.length} notificaciones programadas`;
                    Logger.info('Notificaciones programadas:', notificaciones);
                    await speak(mensaje, {
                      variant: 'information',
                      priority: 'medium'
                    });
                    // Mostrar detalles en consola
                    notificaciones.forEach((notif, index) => {
                      Logger.info(`Notificación ${index + 1}:`, {
                        title: notif.title,
                        message: notif.message,
                        date: notif.date,
                      });
                    });
                  } catch (error) {
                    Logger.error('Error obteniendo notificaciones:', error);
                    await speak('Error al obtener notificaciones programadas', {
                      variant: 'error',
                      priority: 'high'
                    });
                  }
                }}
              >
                <Text style={styles.testButtonText}>Ver Notificaciones Programadas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, styles.testButtonSecondary]}
                onPress={async () => {
                  hapticService.medium();
                  try {
                    // Programar notificación de prueba en 30 segundos
                    const fechaPrueba = new Date();
                    fechaPrueba.setSeconds(fechaPrueba.getSeconds() + 30);
                    
                    localNotificationService.scheduleNotification(
                      {
                        title: '⏰ Prueba: Notificación Programada',
                        message: 'Esta notificación se programó hace 30 segundos',
                        channelId: 'clinica-movil-reminders',
                        data: { type: 'test', category: 'scheduled' },
                      },
                      fechaPrueba
                    );
                    
                    await speak('Notificación programada para 30 segundos. Espera y verás la notificación', {
                      variant: 'information',
                      priority: 'medium'
                    });
                  } catch (error) {
                    Logger.error('Error programando notificación de prueba:', error);
                    await speak('Error al programar notificación de prueba', {
                      variant: 'error',
                      priority: 'high'
                    });
                  }
                }}
              >
                <Text style={styles.testButtonText}>Programar Notificación (30 seg)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, styles.testButtonWarning]}
                onPress={async () => {
                  hapticService.medium();
                  try {
                    const userId = userData?.id || userData?.id_usuario;
                    
                    if (!userId) {
                      await speak('Error: No se encontró el ID de usuario. Por favor, cierra sesión y vuelve a iniciar sesión', {
                        variant: 'error',
                        priority: 'high'
                      });
                      Alert.alert(
                        '⚠️ Error',
                        'No se encontró el ID de usuario. Por favor, cierra sesión y vuelve a iniciar sesión.',
                        [{ text: 'Entendido' }]
                      );
                      return;
                    }

                    // Verificar que el token esté registrado
                    const pushTokenService = (await import('../../services/pushTokenService.js')).default;
                    const tokenRegistrado = await pushTokenService.isTokenRegistrado();
                    
                    if (!tokenRegistrado) {
                      Logger.warn('Token no registrado, intentando registrar...');
                      
                      // Intentar forzar obtención del token
                      await pushTokenService.forzarObtencionToken();
                      
                      // Esperar un poco y verificar de nuevo
                      setTimeout(async () => {
                        const tokenRegistradoAhora = await pushTokenService.isTokenRegistrado();
                        if (!tokenRegistradoAhora) {
                          await speak('El dispositivo aún no está registrado. Por favor, cierra la app y vuelve a iniciar sesión para que el token se registre automáticamente', {
                            variant: 'information',
                            priority: 'medium'
                          });
                          Alert.alert(
                            '⚠️ Dispositivo no registrado',
                            'El dispositivo aún no está registrado para recibir notificaciones push.\n\n' +
                            'SOLUCIÓN:\n' +
                            '1. Cierra la app completamente\n' +
                            '2. Vuelve a abrirla e inicia sesión\n' +
                            '3. El token se registrará automáticamente\n\n' +
                            'Si el problema persiste, verifica que los permisos de notificación estén otorgados.',
                            [{ text: 'Entendido' }]
                          );
                        }
                      }, 2000);
                      
                      await speak('Registrando dispositivo... Por favor espera unos segundos y vuelve a intentar', {
                        variant: 'information',
                        priority: 'medium'
                      });
                      Alert.alert(
                        '⚠️ Registrando dispositivo',
                        'Intentando registrar el dispositivo...\n\n' +
                        'Por favor, espera 3 segundos y vuelve a presionar el botón.\n\n' +
                        'Si el problema persiste, cierra la app y vuelve a iniciar sesión.',
                        [{ text: 'Entendido' }]
                      );
                      return;
                    }

                    // Solicitar al servidor que envíe una notificación push de prueba en 15 segundos
                    // Esto funciona mejor que las notificaciones locales programadas
                    const servicioApi = (await import('../../api/servicioApi.js')).default;
                    
                    try {
                      Logger.info('Solicitando notificación push de prueba al servidor', { userId, delay_seconds: 15 });
                      
                      // Enviar solicitud al servidor para programar notificación push
                      const response = await servicioApi.post('/mobile/notification/test', {
                        message: 'Esta notificación prueba que funciona con la app cerrada. Si ves esto, ¡funciona correctamente!',
                        type: 'test',
                        delay_seconds: 15, // Enviar en 15 segundos
                        title: '✅ Prueba: App Cerrada Exitosa',
                      });

                      Logger.success('Notificación push programada en el servidor', { response });

                      const mensajeCompleto = `Notificación de prueba solicitada al servidor para 15 segundos. 
                      IMPORTANTE: Cierra la app completamente después de escuchar este mensaje. 
                      El servidor enviará una notificación push en 15 segundos incluso con la app cerrada. 
                      Si ves la notificación, significa que funciona correctamente.`;
                      
                      await speak(mensajeCompleto, {
                        variant: 'information',
                        priority: 'high'
                      });

                      Alert.alert(
                        '🧪 Prueba de Notificación Push',
                        `Notificación push programada para 15 segundos\n\n` +
                        `INSTRUCCIONES:\n` +
                        `1. Cierra la app completamente (no solo minimizar)\n` +
                        `2. Espera 15 segundos\n` +
                        `3. El servidor enviará una notificación push\n` +
                        `4. Si aparece, significa que funciona correctamente ✅\n\n` +
                        `Nota: Este método usa notificaciones push desde el servidor, que funcionan mejor que las locales en todos los dispositivos Android.`,
                        [{ text: 'Entendido' }]
                      );
                    } catch (apiError) {
                      Logger.error('Error solicitando notificación push de prueba:', apiError);
                      
                      // Fallback: usar notificación local si falla el servidor
                      Logger.warn('Usando notificación local como respaldo');
                      const fechaPrueba = new Date();
                      fechaPrueba.setSeconds(fechaPrueba.getSeconds() + 15);
                      
                      localNotificationService.scheduleNotification(
                        {
                          title: '✅ Prueba: App Cerrada Exitosa',
                          message: 'Esta notificación prueba que funciona con la app cerrada. Si ves esto, ¡funciona correctamente!',
                          channelId: 'clinica-movil-reminders',
                          data: { type: 'test', category: 'app_closed_test', urgent: true },
                        },
                        fechaPrueba
                      );

                      await speak('Notificación local programada como respaldo (el servidor no está disponible o no hay token registrado)', {
                        variant: 'information',
                        priority: 'medium'
                      });
                      
                      Alert.alert(
                        '⚠️ Fallback a Notificación Local',
                        'El servidor no está disponible o el token no está registrado.\n\n' +
                        'Se usó una notificación local como respaldo.\n\n' +
                        'Nota: Las notificaciones locales pueden no funcionar en algunos dispositivos Android con la app cerrada.',
                        [{ text: 'Entendido' }]
                      );
                    }
                  } catch (error) {
                    Logger.error('Error programando notificación de prueba con app cerrada:', error);
                    await speak('Error al programar notificación de prueba', {
                      variant: 'error',
                      priority: 'high'
                    });
                    Alert.alert(
                      '❌ Error',
                      'Error al programar notificación de prueba. Verifica que el servidor esté corriendo.',
                      [{ text: 'Entendido' }]
                    );
                  }
                }}
              >
                <Text style={styles.testButtonText}>🧪 Probar Push con App Cerrada (15 seg)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.testButton, styles.testButtonDanger]}
                onPress={async () => {
                  hapticService.medium();
                  try {
                    localNotificationService.cancelAllNotifications();
                    await speak('Todas las notificaciones programadas han sido canceladas', {
                      variant: 'information',
                      priority: 'medium'
                    });
                  } catch (error) {
                    Logger.error('Error cancelando notificaciones:', error);
                    await speak('Error al cancelar notificaciones', {
                      variant: 'error',
                      priority: 'high'
                    });
                  }
                }}
              >
                <Text style={styles.testButtonText}>Cancelar Todas las Notificaciones</Text>
              </TouchableOpacity>
            </View>

            {/* Información de recordatorios actuales */}
            <View style={styles.testInfoContainer}>
              <Text style={styles.testInfoTitle}>📊 Estado Actual:</Text>
              <Text style={styles.testInfoText}>
                Citas próximas: {reminders.citas.totalProximas}
              </Text>
              <Text style={styles.testInfoText}>
                Próximo medicamento: {reminders.medicamentos.proximoMedicamento ? 'Sí' : 'No'}
              </Text>
              {reminders.medicamentos.tiempoRestante !== null && (
                <Text style={styles.testInfoText}>
                  Tiempo restante: {Math.round(reminders.medicamentos.tiempoRestante)} minutos
                </Text>
              )}
              <Text style={styles.testInfoText}>
                Necesita recordatorio signos vitales: {reminders.signosVitales.necesitaRecordatorio ? 'Sí' : 'No'}
              </Text>
              
              {/* Información sobre sistema de notificaciones push */}
              <Text style={[styles.testInfoTitle, { marginTop: 15 }]}>🔔 Sistema de Notificaciones:</Text>
              <Text style={styles.testInfoText}>
                Método: Notificaciones Push desde Servidor
              </Text>
              <Text style={styles.testInfoText}>
                Compatible: Todos los dispositivos Android
              </Text>
              <Text style={styles.testInfoText}>
                Funciona con app cerrada: Sí ✅
              </Text>
              <Text style={[styles.testInfoText, { fontSize: 12, marginTop: 5, fontStyle: 'italic' }]}>
                El servidor verifica cada minuto y envía notificaciones push automáticamente
              </Text>
              
              {/* Estado del token */}
              <TouchableOpacity
                style={[styles.testButton, { marginTop: 10, backgroundColor: COLORES.SECUNDARIO_LIGHT }]}
                onPress={async () => {
                  try {
                    const pushTokenService = (await import('../../services/pushTokenService.js')).default;
                    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                    const userId = userData?.id || userData?.id_usuario;
                    
                    const tokenRegistrado = await pushTokenService.isTokenRegistrado();
                    const currentToken = pushTokenService.getToken();
                    const userIdStored = await AsyncStorage.getItem('user_id');
                    const pendingToken = await AsyncStorage.getItem('pending_push_token');
                    const tokenGuardado = userId ? await AsyncStorage.getItem(`push_token_${userId}`) : null;
                    
                    const info = `Estado del Token:\n\n` +
                      `Token registrado: ${tokenRegistrado ? '✅ Sí' : '❌ No'}\n` +
                      `Token actual: ${currentToken ? `${currentToken.substring(0, 20)}...` : 'No disponible'}\n` +
                      `User ID en storage: ${userIdStored || 'No encontrado'}\n` +
                      `User ID actual: ${userId || 'No encontrado'}\n` +
                      `Token pendiente: ${pendingToken ? 'Sí' : 'No'}\n` +
                      `Token guardado: ${tokenGuardado ? 'Sí' : 'No'}\n\n` +
                      `Recomendación: ${!tokenRegistrado ? 'Cierra la app y vuelve a iniciar sesión' : 'Token OK'}`;
                    
                    Alert.alert('🔍 Diagnóstico de Token', info, [{ text: 'Entendido' }]);
                    
                    Logger.info('Diagnóstico de token', {
                      tokenRegistrado,
                      hasCurrentToken: !!currentToken,
                      userIdStored,
                      userId,
                      hasPendingToken: !!pendingToken,
                      hasTokenGuardado: !!tokenGuardado
                    });
                  } catch (error) {
                    Logger.error('Error en diagnóstico de token:', error);
                    Alert.alert('❌ Error', 'Error obteniendo información del token', [{ text: 'Entendido' }]);
                  }
                }}
              >
                <Text style={styles.testButtonText}>🔍 Ver Estado del Token</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
    alignItems: 'center', // ✅ Centrar cards horizontalmente
    justifyContent: 'center', // ✅ Centrar verticalmente si hay espacio
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
  testPanel: {
    backgroundColor: COLORES.FONDO_ADVERTENCIA_CLARO,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORES.ADVERTENCIA_LIGHT,
    borderStyle: 'dashed',
  },
  testPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORES.ADVERTENCIA_TEXTO,
    marginBottom: 12,
    textAlign: 'center',
  },
  testButtonsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  testButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  testButtonPrimary: {
    backgroundColor: COLORES.NAV_PACIENTE,
  },
  testButtonSecondary: {
    backgroundColor: COLORES.NAV_PRIMARIO,
  },
  testButtonDanger: {
    backgroundColor: COLORES.ERROR_LIGHT,
  },
  testButtonWarning: {
    backgroundColor: COLORES.ADVERTENCIA_LIGHT,
  },
  testButtonText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 14,
    fontWeight: '600',
  },
  testInfoContainer: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORES.ADVERTENCIA_LIGHT,
  },
  testInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.ADVERTENCIA_TEXTO,
    marginBottom: 8,
  },
  testInfoText: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 4,
  },
  wsStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORES.ADVERTENCIA_LIGHT,
  },
  wsStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  wsStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
  },
});

export default InicioPaciente;

