import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Paragraph, Button, Chip } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import { useAdminDashboard } from '../../hooks/useDashboard';
import { COLORES } from '../../utils/constantes';
import { modalStyles } from '../../utils/sharedStyles';
import { formatDateTime } from '../../utils/dateUtils';
import gestionService from '../../api/gestionService';
import SeveridadBadge from '../../components/common/SeveridadBadge';
import AlertBanner from '../../components/common/AlertBanner';

const { width } = Dimensions.get('window');

const DashboardAdmin = ({ navigation }) => {
  const { userData, userRole } = useAuth();
  const { 
    metrics, 
    chartData, 
    pacientesNuevosData,
    citasPorEstadoData,
    doctoresActivosData,
    alerts, 
    loading, 
    error, 
    refresh 
  } = useAdminDashboard();

  // Estados para modal de detalles
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState(null);

  // Validar que solo administradores puedan acceder
  React.useEffect(() => {
    if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'administrador') {
      Logger.warn('Acceso no autorizado al dashboard administrativo', { userRole });
      // Redirigir a dashboard de doctor o cerrar sesión
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    }
  }, [userRole, navigation]);

  // Si no es administrador, no renderizar nada
  if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'administrador') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>🚫 Acceso Denegado</Text>
          <Text style={styles.accessDeniedMessage}>
            Solo los administradores pueden acceder a esta pantalla.
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

  // Usar datos dinámicos del hook
  const metricsData = metrics || {
    totalPacientes: 0,
    totalDoctores: 0,
    citasHoy: { completadas: 0, total: 0 },
    tasaAsistencia: { tasa_asistencia: 0 },
    alertasPendientes: 0,
  };

  const chartDataFormatted = chartData || [];
  const pacientesNuevosFormatted = pacientesNuevosData || [];
  const notifications = alerts || [];

  const handleAddDoctor = () => {
    try {
      Logger.navigation('DashboardAdmin', 'AgregarDoctor');
      navigation.navigate('AgregarDoctor');
    } catch (error) {
      Logger.error('Error navegando a AgregarDoctor', error);
      console.log('Error navegando a agregar doctor:', error);
    }
  };

  const handleAddPatient = () => {
    try {
      Logger.navigation('DashboardAdmin', 'AgregarPaciente');
      navigation.navigate('AgregarPaciente');
    } catch (error) {
      Logger.error('Error navegando a AgregarPaciente', error);
      console.log('Error navegando a agregar paciente:', error);
    }
  };

  const handleViewModulos = () => {
    try {
      Logger.navigation('DashboardAdmin', 'GestionModulos');
      navigation.navigate('GestionModulos');
    } catch (error) {
      Logger.error('Error navegando a GestionModulos', error);
      console.log('Error navegando a módulos:', error);
    }
  };

  const handleViewMedicamentos = () => {
    try {
      Logger.navigation('DashboardAdmin', 'GestionMedicamentos');
      navigation.navigate('GestionMedicamentos');
    } catch (error) {
      Logger.error('Error navegando a GestionMedicamentos', error);
      console.log('Error navegando a medicamentos:', error);
    }
  };

  const handleViewComorbilidades = () => {
    try {
      Logger.navigation('DashboardAdmin', 'GestionComorbilidades');
      navigation.navigate('GestionComorbilidades');
    } catch (error) {
      Logger.error('Error navegando a GestionComorbilidades', error);
      console.log('Error navegando a comorbilidades:', error);
    }
  };

  const handleViewVacunas = () => {
    try {
      Logger.navigation('DashboardAdmin', 'GestionVacunas');
      navigation.navigate('GestionVacunas');
    } catch (error) {
      Logger.error('Error navegando a GestionVacunas', error);
      console.log('Error navegando a vacunas:', error);
    }
  };

  const handleViewTodasCitas = () => {
    try {
      Logger.navigation('DashboardAdmin', 'VerTodasCitas');
      navigation.navigate('VerTodasCitas');
    } catch (error) {
      Logger.error('Error navegando a VerTodasCitas', error);
      console.log('Error navegando a todas las citas:', error);
    }
  };

  const handleViewAuditoria = () => {
    try {
      Logger.navigation('DashboardAdmin', 'HistorialAuditoria');
      navigation.navigate('HistorialAuditoria');
    } catch (error) {
      Logger.error('Error navegando a HistorialAuditoria', error);
      console.log('Error navegando a historial de auditoría:', error);
    }
  };

  const handleViewTodasNotificaciones = () => {
    try {
      Logger.navigation('DashboardAdmin', 'TodasNotificaciones');
      // Por ahora navega a HistorialAuditoria, pero puedes crear una pantalla específica
      navigation.navigate('HistorialAuditoria');
    } catch (error) {
      Logger.error('Error navegando a todas las notificaciones', error);
      console.log('Error navegando a todas las notificaciones:', error);
    }
  };

  // Constantes para tipos de acción y entidades (reutilizadas de HistorialAuditoria)
  const ENTIDADES_AFECTADAS = [
    { value: 'cita', label: 'Cita' },
    { value: 'paciente', label: 'Paciente' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'sistema', label: 'Sistema' },
    { value: 'configuracion', label: 'Configuración' },
    { value: 'acceso', label: 'Acceso' },
    { value: 'error', label: 'Error' },
  ];

  const TIPOS_ACCION = [
    { value: 'cita_estado_actualizado', label: 'Estado de Cita Actualizado' },
    { value: 'cita_reprogramada', label: 'Cita Reprogramada' },
    { value: 'paciente_creado', label: 'Paciente Creado' },
    { value: 'paciente_modificado', label: 'Paciente Modificado' },
    { value: 'doctor_creado', label: 'Doctor Creado' },
    { value: 'doctor_modificado', label: 'Doctor Modificado' },
    { value: 'asignacion_paciente', label: 'Asignación de Paciente' },
    { value: 'configuracion_cambiada', label: 'Configuración Cambiada' },
    { value: 'acceso_sospechoso', label: 'Acceso Sospechoso' },
    { value: 'error_sistema', label: 'Error del Sistema' },
    { value: 'error_critico', label: 'Error Crítico' },
  ];

  // Funciones helper para tipos de acción
  const getTipoAccionIcon = (tipo) => {
    switch (tipo) {
      case 'cita_estado_actualizado':
      case 'cita_reprogramada':
        return '';
      case 'paciente_creado':
      case 'paciente_modificado':
        return '👤';
      case 'doctor_creado':
      case 'doctor_modificado':
        return '👨‍⚕️';
      case 'asignacion_paciente':
        return '🔗';
      case 'configuracion_cambiada':
        return '⚙️';
      case 'acceso_sospechoso':
        return '🚨';
      case 'error_sistema':
      case 'error_critico':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  const getTipoAccionColor = (tipo) => {
    switch (tipo) {
      case 'cita_estado_actualizado':
      case 'cita_reprogramada':
        return '#2196F3';
      case 'paciente_creado':
      case 'doctor_creado':
        return '#4CAF50';
      case 'paciente_modificado':
      case 'doctor_modificado':
        return '#FF9800';
      case 'asignacion_paciente':
        return '#9C27B0';
      case 'configuracion_cambiada':
        return '#607D8B';
      case 'acceso_sospechoso':
        return '#F57C00';
      case 'error_sistema':
        return '#FF5722';
      case 'error_critico':
        return '#D32F2F';
      default:
        return '#9E9E9E';
    }
  };

  const getTipoAccionLabel = (tipo) => {
    const tipoObj = TIPOS_ACCION.find(t => t.value === tipo);
    if (tipoObj) {
      const label = tipoObj.label;
      if (label.length > 20) {
        return label.substring(0, 17) + '...';
      }
      return label;
    }
    return tipo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Funciones de navegación contextual
  const navegarAPaciente = async (pacienteNombre) => {
    try {
      // Buscar paciente por nombre (necesitamos obtener el ID)
      // Por ahora, navegamos a la lista de pacientes
      Logger.navigation('DashboardAdmin', 'GestionAdmin', { buscar: pacienteNombre });
      setShowDetailModal(false);
      setNotificacionSeleccionada(null);
      navigation.navigate('GestionAdmin', { 
        initialTab: 'pacientes',
        searchQuery: pacienteNombre 
      });
    } catch (error) {
      Logger.error('Error navegando a paciente', error);
    }
  };

  const navegarACita = (idCita) => {
    if (!idCita) return;
    try {
      Logger.navigation('DashboardAdmin', 'VerTodasCitas', { id_cita: idCita });
      setShowDetailModal(false);
      setNotificacionSeleccionada(null);
      navigation.navigate('VerTodasCitas', { highlightCitaId: idCita });
    } catch (error) {
      Logger.error('Error navegando a cita', error);
    }
  };

  const navegarAPacientePorId = async (idPaciente) => {
    if (!idPaciente) return;
    try {
      Logger.navigation('DashboardAdmin', 'DetallePaciente', { id_paciente: idPaciente });
      const paciente = await gestionService.getPacienteById(idPaciente);
      if (paciente) {
        setShowDetailModal(false);
        setNotificacionSeleccionada(null);
        navigation.navigate('DetallePaciente', { paciente });
      }
    } catch (error) {
      Logger.error('Error navegando a paciente', error);
    }
  };

  const navegarADoctor = async (idDoctor) => {
    if (!idDoctor) return;
    try {
      Logger.navigation('DashboardAdmin', 'DetalleDoctor', { id_doctor: idDoctor });
      const doctor = await gestionService.getDoctorById(idDoctor);
      if (doctor) {
        setShowDetailModal(false);
        setNotificacionSeleccionada(null);
        navigation.navigate('DetalleDoctor', { doctor });
      }
    } catch (error) {
      Logger.error('Error navegando a doctor', error);
    }
  };

  const renderMetricCard = (title, value, subtitle, color = '#1976D2') => (
    <Card style={[styles.metricCard, { borderLeftColor: color }]}>
      <Card.Content style={styles.metricContent}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.metricSubtitle}>{subtitle}</Text>
      </Card.Content>
    </Card>
  );

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

        const maxValue = Math.max(...data.map(item => item[dataKey]));
        
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
                              backgroundColor: dataKey === 'pacientes' ? '#2196F3' : '#4CAF50',
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


  const renderNotification = (notification) => {
    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'urgent': return '#F44336';
        case 'high': return '#FF9800';
        case 'medium': return '#2196F3';
        default: return '#9E9E9E';
      }
    };

    const getNotificationIcon = (type, customIcon) => {
      if (customIcon) return customIcon;
      switch (type) {
        case 'symptom': return '⚠️';
        case 'appointment': return '📅';
        case 'audit': return '🔔';
        default: return '🔔';
      }
    };

    return (
      <TouchableOpacity
        key={notification.id}
        onPress={() => {
          setNotificacionSeleccionada(notification);
          setShowDetailModal(true);
          Logger.info('Ver detalle de notificación', { id: notification.id, type: notification.type });
        }}
        activeOpacity={0.7}
      >
        <Card style={[styles.notificationCard, { borderLeftColor: getPriorityColor(notification.priority) }]}>
          <Card.Content style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationIcon}>{getNotificationIcon(notification.type, notification.icon)}</Text>
              <Text style={styles.notificationTime}>{notification.time}</Text>
            </View>
            <Text style={styles.notificationMessage}>{notification.message}</Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

      return (
        <SafeAreaView style={styles.container}>
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={refresh}
                colors={['#1976D2']}
                tintColor="#1976D2"
              />
            }
          >
        {/* Header */}
        <View style={styles.header}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.headerTitle}>Dashboard Administrativo</Text>
          <Text style={styles.headerDate}>{new Date().toLocaleDateString('es-ES', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</Text>
        </View>

        {/* Alertas Críticas */}
        {notifications && notifications.filter(n => n.priority === 'urgent' || n.severidad === 'critica').length > 0 && (
          <AlertBanner
            alertas={notifications.filter(n => n.priority === 'urgent' || n.severidad === 'critica').map(n => ({
              severidad: n.severidad || (n.priority === 'urgent' ? 'critica' : 'alta'),
              mensaje: n.message || n.mensaje || 'Alerta importante',
            }))}
            onDismiss={() => {}}
            onPress={() => handleViewTodasNotificaciones()}
          />
        )}

        {/* Métricas Principales */}
        <View style={styles.metricsContainer}>
          <Text style={styles.sectionTitle}>Métricas Principales</Text>
          <View style={styles.metricsGrid}>
            {renderMetricCard(
              'Pacientes Totales',
              metricsData.totalPacientes.toLocaleString(),
              '+12% este mes',
              '#4CAF50'
            )}
            {renderMetricCard(
              'Doctores Activos',
              metricsData.totalDoctores,
              '',
              '#2196F3'
            )}
            {renderMetricCard(
              'Citas Hoy',
              `${metricsData.citasHoy.completadas}/${metricsData.citasHoy.total}`,
              `${metricsData.tasaAsistencia.tasa_asistencia}% asistencia`,
              '#FF9800'
            )}
            {renderMetricCard(
              'Alertas Pendientes',
              metricsData.alertasPendientes,
              'Revisar ahora',
              '#F44336'
            )}
          </View>
        </View>

            {/* Gráficos Rápidos */}
            <View style={styles.chartsContainer}>
              <Text style={styles.sectionTitle}>Gráficos Rápidos</Text>
              
              {/* Gráfico de Citas */}
              <View style={styles.singleChartContainer}>
                {renderChartCard('Citas Últimos 7 Días', chartDataFormatted)}
              </View>

              {/* Gráfico de Pacientes Nuevos */}
              <View style={styles.singleChartContainer}>
                {renderChartCard('Pacientes Nuevos Últimos 7 Días', pacientesNuevosFormatted, 'pacientes')}
              </View>
            </View>

            {/* Notificaciones */}
            <View style={styles.notificationsContainer}>
              <View style={styles.notificationsHeader}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Notificaciones Importantes</Text>
                <TouchableOpacity onPress={handleViewTodasNotificaciones}>
                  <Text style={styles.verTodasLabel}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              {notifications.length > 0 ? (
                notifications.map(renderNotification)
              ) : (
                <Card style={styles.noDataCard}>
                  <Card.Content>
                    <Text style={styles.noDataText}>No hay notificaciones pendientes</Text>
                  </Card.Content>
                </Card>
              )}
            </View>

        {/* Accesos Rápidos */}
        <View style={styles.quickAccessContainer}>
          <Text style={styles.sectionTitle}>Accesos Rápidos</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity style={[styles.quickAccessButton, styles.primaryButton]} onPress={handleAddDoctor}>
              <Text style={styles.quickAccessIcon}>👨‍⚕️</Text>
              <Text style={styles.quickAccessText}>Agregar Doctor</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickAccessButton, styles.primaryButton]} onPress={handleAddPatient}>
              <Text style={styles.quickAccessIcon}>👥</Text>
              <Text style={styles.quickAccessText}>Registrar Paciente</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickAccessButton, styles.primaryButton]} onPress={handleViewTodasCitas}>
              <Text style={styles.quickAccessIcon}>📅</Text>
              <Text style={styles.quickAccessText}>Todas las Citas</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickAccessButton, styles.secondaryButton]} onPress={handleViewAuditoria}>
              <Text style={styles.quickAccessIcon}></Text>
              <Text style={styles.secondaryButtonText}>Historial de Auditoría</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickAccessButton, styles.secondaryButton]} onPress={handleViewModulos}>
              <Text style={styles.quickAccessIcon}>🏢</Text>
              <Text style={styles.secondaryButtonText}>Módulos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickAccessButton, styles.secondaryButton]} onPress={handleViewMedicamentos}>
              <Text style={styles.quickAccessIcon}>💊</Text>
              <Text style={styles.secondaryButtonText}>Medicamentos</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickAccessButton, styles.secondaryButton]} onPress={handleViewComorbilidades}>
              <Text style={styles.quickAccessIcon}>🏥</Text>
              <Text style={styles.secondaryButtonText}>Comorbilidades</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickAccessButton, styles.secondaryButton]} onPress={handleViewVacunas}>
              <Text style={styles.quickAccessIcon}>💉</Text>
              <Text style={styles.secondaryButtonText}>Vacunas</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal de Detalle de Notificación */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowDetailModal(false);
          setNotificacionSeleccionada(null);
        }}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContent}>
            <View style={modalStyles.modalHeader}>
              <Title style={modalStyles.modalTitle}>
                {notificacionSeleccionada && `${notificacionSeleccionada.icon || '🔔'} Detalle de Notificación`}
              </Title>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailModal(false);
                  setNotificacionSeleccionada(null);
                }}
              >
                <Text style={modalStyles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            {notificacionSeleccionada && (
              <ScrollView style={styles.detailScrollView} showsVerticalScrollIndicator={true}>
                <View style={styles.detailContent}>
                  {/* Renderizar contenido según el tipo de notificación */}
                  {notificacionSeleccionada.rawData?.tipo === 'valor_critico' && (
                    <>
                      {/* Información Principal */}
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>⚠️ Alerta de Signos Vitales Críticos</Text>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Paciente:</Text>
                          <Text style={styles.detailValue}>
                            {notificacionSeleccionada.rawData.nombre} {notificacionSeleccionada.rawData.apellido_paterno}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Tipo de Alerta:</Text>
                          <View style={styles.chipContainer}>
                            <Chip
                              style={[styles.detailChip, { backgroundColor: '#F44336' }]}
                              textStyle={styles.detailChipText}
                              mode="flat"
                            >
                              {notificacionSeleccionada.rawData.tipo_alerta}
                            </Chip>
                          </View>
                        </View>

                        {notificacionSeleccionada.rawData.glucosa_mg_dl && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Glucosa:</Text>
                            <Text style={[styles.detailValue, styles.criticalValue]}>
                              {notificacionSeleccionada.rawData.glucosa_mg_dl} mg/dl
                            </Text>
                          </View>
                        )}

                        {notificacionSeleccionada.rawData.presion_sistolica && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Presión Sistólica:</Text>
                            <Text style={[styles.detailValue, styles.criticalValue]}>
                              {notificacionSeleccionada.rawData.presion_sistolica} mmHg
                            </Text>
                          </View>
                        )}

                        {notificacionSeleccionada.rawData.presion_diastolica && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Presión Diastólica:</Text>
                            <Text style={[styles.detailValue, styles.criticalValue]}>
                              {notificacionSeleccionada.rawData.presion_diastolica} mmHg
                            </Text>
                          </View>
                        )}

                      </View>

                      {/* Información de Fecha */}
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>📅 Fecha de Medición</Text>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Fecha y Hora:</Text>
                          <Text style={styles.detailValue}>
                            {formatDateTime(notificacionSeleccionada.rawData.fecha_medicion)}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}

                  {notificacionSeleccionada.rawData?.tipo === 'cita_perdida' && (
                    <>
                      {/* Información Principal */}
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Información General</Text>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Paciente:</Text>
                          <Text style={styles.detailValue}>{notificacionSeleccionada.rawData.paciente}</Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Fecha de la Cita:</Text>
                          <Text style={styles.detailValue}>
                            {formatDateTime(notificacionSeleccionada.rawData.fecha)}
                          </Text>
                        </View>

                        {notificacionSeleccionada.rawData.motivo && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Motivo:</Text>
                            <Text style={styles.detailValue}>{notificacionSeleccionada.rawData.motivo}</Text>
                          </View>
                        )}

                        {notificacionSeleccionada.rawData.id_cita && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>ID de Cita:</Text>
                            <Text style={styles.detailValue}>#{notificacionSeleccionada.rawData.id_cita}</Text>
                          </View>
                        )}

                      </View>
                    </>
                  )}

                  {notificacionSeleccionada.rawData?.tipo === 'auditoria' && (
                    <>
                      {/* Información Principal */}
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>Información General</Text>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Descripción:</Text>
                          <Text style={styles.detailValue}>{notificacionSeleccionada.rawData.descripcion}</Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Tipo de Acción:</Text>
                          <View style={styles.chipContainer}>
                            <Chip
                              style={[styles.detailChip, { backgroundColor: getTipoAccionColor(notificacionSeleccionada.rawData.tipo_accion) }]}
                              textStyle={styles.detailChipText}
                              mode="flat"
                            >
                              {getTipoAccionLabel(notificacionSeleccionada.rawData.tipo_accion)}
                            </Chip>
                          </View>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Entidad Afectada:</Text>
                          <Text style={styles.detailValue}>
                            {ENTIDADES_AFECTADAS.find(e => e.value === notificacionSeleccionada.rawData.entidad_afectada)?.label || notificacionSeleccionada.rawData.entidad_afectada}
                          </Text>
                        </View>

                        {notificacionSeleccionada.rawData.id_entidad && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>ID de Entidad:</Text>
                            <Text style={styles.detailValue}>#{notificacionSeleccionada.rawData.id_entidad}</Text>
                          </View>
                        )}

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Severidad:</Text>
                          <SeveridadBadge severidad={notificacionSeleccionada.rawData.severidad || 'info'} />
                        </View>

                      </View>

                      {/* Información de Fecha */}
                      <View style={styles.detailSection}>
                        <Text style={styles.detailSectionTitle}>📅 Fecha y Hora</Text>
                        
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Fecha y Hora:</Text>
                          <Text style={styles.detailValue}>
                            {formatDateTime(notificacionSeleccionada.rawData.fecha_creacion)}
                          </Text>
                        </View>

                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>ID de Registro:</Text>
                          <Text style={styles.detailValue}>#{notificacionSeleccionada.rawData.id_auditoria}</Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.FONDO,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: COLORES.PRIMARIO,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.BLANCO,
    marginBottom: 5,
  },
  headerDate: {
    fontSize: 16,
    color: COLORES.INFO_LIGHT,
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 15,
    marginLeft: 5,
  },
  metricsContainer: {
    padding: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 5,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: COLORES.TEXTO_DISABLED,
  },
  chartsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  singleChartContainer: {
    width: '100%',
  },
  chartCard: {
    width: '100%',
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
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
    color: COLORES.TEXTO_SECUNDARIO,
    marginTop: 5,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORES.PRIMARIO,
    marginBottom: 5,
  },
  notificationsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginLeft: 5,
    marginRight: 5,
  },
  verTodasLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.PRIMARIO,
    textDecorationLine: 'underline',
  },
  notificationCard: {
    marginBottom: 10,
    elevation: 2,
    borderLeftWidth: 4,
  },
  notificationContent: {
    padding: 15,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORES.TEXTO_DISABLED,
  },
  notificationMessage: {
    fontSize: 14,
    color: COLORES.TEXTO_PRIMARIO,
    lineHeight: 20,
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
    backgroundColor: COLORES.PRIMARIO,
  },
  secondaryButton: {
    backgroundColor: COLORES.BLANCO,
    borderWidth: 1,
    borderColor: COLORES.SECUNDARIO_LIGHT,
  },
  quickAccessIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  quickAccessText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORES.BLANCO,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORES.TEXTO_PRIMARIO,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.ERROR,
    marginBottom: 20,
    textAlign: 'center',
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  goBackButton: {
    backgroundColor: COLORES.PRIMARIO,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
      goBackText: {
        color: COLORES.BLANCO,
        fontSize: 16,
        fontWeight: '600',
      },
      noDataText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
      },
      noDataCard: {
        elevation: 1,
        backgroundColor: '#F9F9F9',
      },
      // Estilos del modal de detalles (idénticos a HistorialAuditoria)
      detailScrollView: {
        maxHeight: 500,
        width: '100%',
        paddingHorizontal: 16,
      },
      detailContent: {
        padding: 16,
        width: '100%',
      },
      detailSection: {
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
      },
      detailSectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2196F3',
        marginBottom: 12,
      },
      detailRow: {
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        width: '100%',
      },
      detailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        minWidth: 120,
        maxWidth: 120,
        marginRight: 12,
      },
      detailValue: {
        fontSize: 14,
        color: '#333',
        flex: 1,
        flexWrap: 'wrap',
        flexShrink: 1,
      },
      criticalValue: {
        color: '#F44336',
        fontWeight: 'bold',
      },
      chipContainer: {
        flex: 1,
      },
      detailChip: {
        alignSelf: 'flex-start',
        height: 28,
      },
      detailChipText: {
        fontSize: 11,
        color: '#FFFFFF',
        fontWeight: '600',
      },
      navigationButtonContainer: {
        marginTop: 16,
        marginBottom: 8,
      },
      navigationButton: {
        marginVertical: 4,
      },
    });

export default DashboardAdmin;
