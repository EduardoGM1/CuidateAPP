/**
 * Pantalla: Gestión de Solicitudes de Reprogramación
 * 
 * Permite al doctor ver, aprobar o rechazar solicitudes de reprogramación de citas.
 * 
 * @author Senior Developer
 * @date 2025-11-16
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Chip } from 'react-native-paper';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import gestionService from '../../api/gestionService';
import { formatDateTime } from '../../utils/dateUtils';
import DateTimePickerButton from '../../components/DateTimePickerButton';
import { COLORES } from '../../utils/constantes';

const GestionSolicitudesReprogramacion = ({ navigation }) => {
  const { userData, userRole } = useAuth();
  const route = useRoute();
  
  // Obtener parámetros de ruta (si viene desde notificación)
  const { id_solicitud, id_cita, id_notificacion, desde_notificacion } = route.params || {};
  
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('pendiente'); // 'pendiente', 'aprobada', 'rechazada', 'todas'
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [showResponderModal, setShowResponderModal] = useState(false);
  const [respuestaDoctor, setRespuestaDoctor] = useState('');
  const [fechaReprogramada, setFechaReprogramada] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [solicitudResaltada, setSolicitudResaltada] = useState(null);
  
  // Ref para FlatList (para hacer scroll automático)
  const flatListRef = useRef(null);

  // Validar que solo doctores puedan acceder
  useEffect(() => {
    if (userRole !== 'Doctor' && userRole !== 'doctor') {
      Logger.warn('Acceso no autorizado a GestionSolicitudesReprogramacion', { userRole });
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    }
  }, [userRole, navigation]);

  // Marcar notificación como leída al entrar desde una notificación
  // Sigue el mismo patrón que ChatPaciente.js
  useEffect(() => {
    const marcarNotificacionLeida = async () => {
      if (desde_notificacion && id_notificacion && userData?.id_doctor) {
        try {
          await gestionService.marcarNotificacionLeida(userData.id_doctor, id_notificacion);
          Logger.info('GestionSolicitudesReprogramacion: Notificación marcada como leída', {
            id_notificacion,
            doctorId: userData.id_doctor
          });
        } catch (error) {
          // No crítico - no debe fallar la carga de la pantalla
          Logger.warn('GestionSolicitudesReprogramacion: Error marcando notificación como leída (no crítico)', error);
        }
      }
    };

    marcarNotificacionLeida();
  }, [desde_notificacion, id_notificacion, userData?.id_doctor]);

  // Cargar solicitudes
  const loadSolicitudes = useCallback(async () => {
    try {
      setLoading(true);
      Logger.info('GestionSolicitudesReprogramacion: Cargando solicitudes', { 
        estado: filtroEstado === 'todas' ? null : filtroEstado,
        doctorId: userData?.id_doctor 
      });
      
      const response = await gestionService.getAllSolicitudesReprogramacion(
        filtroEstado === 'todas' ? null : filtroEstado,
        null, // paciente
        userData?.id_doctor // Solo solicitudes del doctor actual
      );

      if (response.success) {
        setSolicitudes(response.data || []);
        Logger.info('GestionSolicitudesReprogramacion: Solicitudes cargadas', { 
          total: response.data?.length || 0 
        });
      } else {
        Logger.error('GestionSolicitudesReprogramacion: Error cargando solicitudes', response.error);
        Alert.alert('Error', response.error || 'No se pudieron cargar las solicitudes');
      }
    } catch (error) {
      Logger.error('GestionSolicitudesReprogramacion: Error cargando solicitudes', error);
      Alert.alert('Error', 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, [filtroEstado, userData?.id_doctor]);

  // Cargar solicitudes al montar y cuando cambie el filtro
  useEffect(() => {
    loadSolicitudes();
  }, [loadSolicitudes]);

  // Ajustar filtro automáticamente si viene desde notificación
  // Esto asegura que la solicitud específica esté visible
  useEffect(() => {
    if (id_solicitud && desde_notificacion && filtroEstado !== 'todas') {
      Logger.info('GestionSolicitudesReprogramacion: Ajustando filtro a "todas" para mostrar solicitud específica', {
        id_solicitud,
        filtro_anterior: filtroEstado
      });
      setFiltroEstado('todas');
    }
  }, [id_solicitud, desde_notificacion]);

  // Scroll automático a la solicitud específica cuando se carga desde notificación
  useEffect(() => {
    if (id_solicitud && solicitudes.length > 0 && flatListRef.current) {
      const idSolicitudNum = typeof id_solicitud === 'string' ? parseInt(id_solicitud) : id_solicitud;
      const index = solicitudes.findIndex(
        s => {
          const solicitudId = typeof s.id_solicitud === 'string' ? parseInt(s.id_solicitud) : s.id_solicitud;
          return solicitudId === idSolicitudNum;
        }
      );
      
      if (index >= 0) {
        Logger.info('GestionSolicitudesReprogramacion: Haciendo scroll a solicitud específica', {
          id_solicitud: idSolicitudNum,
          index,
          total: solicitudes.length,
          solicitud_encontrada: solicitudes[index]?.id_solicitud
        });
        
        // Resaltar la solicitud
        setSolicitudResaltada(idSolicitudNum);
        
        // Hacer scroll después de un delay para asegurar que el FlatList esté completamente renderizado
        // Aumentar delay para dar tiempo a que el filtro se actualice y los items se rendericen
        setTimeout(() => {
          try {
            flatListRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.5 // Centrar en la mitad de la pantalla
            });
            Logger.info('GestionSolicitudesReprogramacion: Scroll realizado exitosamente', { index });
          } catch (error) {
            Logger.warn('GestionSolicitudesReprogramacion: Error haciendo scroll, usando fallback', error);
            // Fallback: usar scrollToOffset si scrollToIndex falla
            const estimatedOffset = index * 200; // Estimación aproximada de altura por item
            flatListRef.current?.scrollToOffset({
              offset: estimatedOffset,
              animated: true
            });
          }
        }, 500); // Aumentar delay a 500ms para asegurar renderizado completo
        
        // Remover resaltado después de 3 segundos
        setTimeout(() => {
          setSolicitudResaltada(null);
        }, 3000);
      } else {
        Logger.warn('GestionSolicitudesReprogramacion: Solicitud no encontrada en la lista', {
          id_solicitud: idSolicitudNum,
          total_solicitudes: solicitudes.length,
          ids_disponibles: solicitudes.map(s => s.id_solicitud),
          filtro_actual: filtroEstado
        });
        
        // Si no se encuentra y el filtro no es 'todas', intentar cambiar el filtro
        if (filtroEstado !== 'todas') {
          Logger.info('GestionSolicitudesReprogramacion: Cambiando filtro a "todas" para buscar solicitud', {
            id_solicitud: idSolicitudNum
          });
          setFiltroEstado('todas');
        }
      }
    }
  }, [solicitudes, id_solicitud, filtroEstado]);

  // Refrescar datos cuando el usuario regrese a la pantalla
  useFocusEffect(
    useCallback(() => {
      Logger.info('GestionSolicitudesReprogramacion: Pantalla enfocada, refrescando datos');
      loadSolicitudes();
    }, [loadSolicitudes])
  );

  // Función para refrescar datos
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSolicitudes();
    } catch (error) {
      Logger.error('Error refrescando solicitudes', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadSolicitudes]);

  // Abrir modal para responder solicitud
  const handleResponderSolicitud = (solicitud) => {
    setSolicitudSeleccionada(solicitud);
    setRespuestaDoctor('');
    setFechaReprogramada(null);
    setShowResponderModal(true);
  };

  // Aprobar solicitud
  const handleAprobar = async () => {
    if (!solicitudSeleccionada) return;

    if (!fechaReprogramada) {
      Alert.alert('Fecha requerida', 'Debes seleccionar una nueva fecha para la cita');
      return;
    }

    setProcesando(true);
    try {
      Logger.info('GestionSolicitudesReprogramacion: Aprobando solicitud', {
        citaId: solicitudSeleccionada.id_cita,
        solicitudId: solicitudSeleccionada.id_solicitud
      });

      // fechaReprogramada ya viene en formato ISO string del DateTimePickerButton
      const fechaISO = fechaReprogramada instanceof Date 
        ? fechaReprogramada.toISOString() 
        : fechaReprogramada;

      const response = await gestionService.responderSolicitudReprogramacion(
        solicitudSeleccionada.id_cita,
        solicitudSeleccionada.id_solicitud,
        'aprobar',
        respuestaDoctor || 'Solicitud aprobada',
        fechaISO
      );

      if (response.success) {
        Alert.alert('Éxito', 'Solicitud aprobada correctamente');
        setShowResponderModal(false);
        setSolicitudSeleccionada(null);
        loadSolicitudes();
      } else {
        Alert.alert('Error', response.error || 'No se pudo aprobar la solicitud');
      }
    } catch (error) {
      Logger.error('GestionSolicitudesReprogramacion: Error aprobando solicitud', error);
      Alert.alert('Error', 'No se pudo aprobar la solicitud');
    } finally {
      setProcesando(false);
    }
  };

  // Rechazar solicitud
  const handleRechazar = async () => {
    if (!solicitudSeleccionada) return;

    Alert.alert(
      'Rechazar Solicitud',
      '¿Estás seguro de que deseas rechazar esta solicitud?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setProcesando(true);
            try {
              Logger.info('GestionSolicitudesReprogramacion: Rechazando solicitud', {
                citaId: solicitudSeleccionada.id_cita,
                solicitudId: solicitudSeleccionada.id_solicitud
              });

              const response = await gestionService.responderSolicitudReprogramacion(
                solicitudSeleccionada.id_cita,
                solicitudSeleccionada.id_solicitud,
                'rechazar',
                respuestaDoctor || 'Solicitud rechazada'
              );

              if (response.success) {
                Alert.alert('Éxito', 'Solicitud rechazada correctamente');
                setShowResponderModal(false);
                setSolicitudSeleccionada(null);
                loadSolicitudes();
              } else {
                Alert.alert('Error', response.error || 'No se pudo rechazar la solicitud');
              }
            } catch (error) {
              Logger.error('GestionSolicitudesReprogramacion: Error rechazando solicitud', error);
              Alert.alert('Error', 'No se pudo rechazar la solicitud');
            } finally {
              setProcesando(false);
            }
          }
        }
      ]
    );
  };

  // Renderizar card de solicitud
  const renderSolicitudCard = ({ item: solicitud }) => {
    const getEstadoColor = () => {
      switch (solicitud.estado) {
        case 'pendiente':
          return '#FF9800';
        case 'aprobada':
          return '#4CAF50';
        case 'rechazada':
          return '#F44336';
        default:
          return '#9E9E9E';
      }
    };

    const getEstadoTexto = () => {
      switch (solicitud.estado) {
        case 'pendiente':
          return 'Pendiente';
        case 'aprobada':
          return 'Aprobada';
        case 'rechazada':
          return 'Rechazada';
        default:
          return solicitud.estado || 'Desconocido';
      }
    };

    // Verificar si esta solicitud está resaltada (viene desde notificación)
    // Manejar comparación robusta de IDs (string vs number)
    const estaResaltada = solicitudResaltada && (() => {
      const solicitudId = typeof solicitud.id_solicitud === 'string' 
        ? parseInt(solicitud.id_solicitud) 
        : solicitud.id_solicitud;
      const resaltadaId = typeof solicitudResaltada === 'string' 
        ? parseInt(solicitudResaltada) 
        : solicitudResaltada;
      return solicitudId === resaltadaId;
    })();

    return (
      <Card style={[
        styles.card,
        estaResaltada && styles.cardResaltada
      ]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Title style={styles.cardTitle}>
                {solicitud.paciente_nombre || 'Paciente desconocido'}
              </Title>
              <Text style={styles.cardSubtitle}>
                Cita: {solicitud.fecha_cita_original ? formatDateTime(new Date(solicitud.fecha_cita_original)) : 'N/A'}
              </Text>
            </View>
            <Chip style={[styles.estadoChip, { backgroundColor: getEstadoColor() }]}>
              <Text style={styles.estadoText}>{getEstadoTexto()}</Text>
            </Chip>
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📅 Fecha actual de la cita:</Text>
              <Text style={styles.detailValue}>
                {solicitud.fecha_cita_original ? formatDateTime(new Date(solicitud.fecha_cita_original)) : 'N/A'}
              </Text>
            </View>
            {solicitud.motivo && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>📝 Motivo:</Text>
                <Text style={styles.detailValue}>{solicitud.motivo}</Text>
              </View>
            )}
          </View>

          {solicitud.estado === 'pendiente' && (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.aprobarButton]}
                onPress={() => handleResponderSolicitud(solicitud)}
              >
                <Text style={styles.actionButtonText}>✓ Aprobar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rechazarButton]}
                onPress={() => {
                  setSolicitudSeleccionada(solicitud);
                  setRespuestaDoctor('');
                  setFechaReprogramada(null);
                  setShowResponderModal(true);
                }}
              >
                <Text style={styles.actionButtonText}>✗ Rechazar</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  // Si no es doctor, no renderizar nada
  if (userRole !== 'Doctor' && userRole !== 'doctor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>🚫 Acceso Denegado</Text>
          <Text style={styles.accessDeniedMessage}>
            Solo los doctores pueden acceder a esta pantalla.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Solicitudes de Reprogramación</Text>
        <Text style={styles.headerSubtitle}>
          {solicitudes.length} solicitud{solicitudes.length !== 1 ? 'es' : ''} {filtroEstado === 'todas' ? '' : filtroEstado}
        </Text>
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          {['pendiente', 'aprobada', 'rechazada', 'todas'].map((estado) => (
            <TouchableOpacity
              key={estado}
              style={[
                styles.filterButton,
                filtroEstado === estado && styles.filterButtonActive
              ]}
              onPress={() => setFiltroEstado(estado)}
            >
              <Text style={[
                styles.filterButtonText,
                filtroEstado === estado && styles.filterButtonTextActive
              ]}>
                {estado.charAt(0).toUpperCase() + estado.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Lista de solicitudes */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Cargando solicitudes...</Text>
        </View>
      ) : solicitudes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {filtroEstado === 'pendiente' 
              ? 'No hay solicitudes pendientes'
              : `No hay solicitudes ${filtroEstado === 'todas' ? '' : filtroEstado}`}
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={solicitudes}
          renderItem={renderSolicitudCard}
          keyExtractor={(item) => item.id_solicitud?.toString() || `solicitud-${item.id_cita}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#1976D2']}
            />
          }
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            // Fallback si scrollToIndex falla (puede pasar si el item no está renderizado aún)
            Logger.warn('GestionSolicitudesReprogramacion: scrollToIndex falló, usando fallback', {
              index: info.index,
              highestMeasuredFrameIndex: info.highestMeasuredFrameIndex,
              averageItemLength: info.averageItemLength
            });
            setTimeout(() => {
              const estimatedOffset = info.averageItemLength * info.index;
              flatListRef.current?.scrollToOffset({
                offset: estimatedOffset,
                animated: true
              });
            }, 100);
          }}
        />
      )}

      {/* Modal para responder solicitud */}
      <Modal
        visible={showResponderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResponderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {solicitudSeleccionada?.estado === 'pendiente' 
                  ? 'Responder Solicitud' 
                  : 'Ver Detalles'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowResponderModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {solicitudSeleccionada && (
              <ScrollView 
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                <Text style={styles.modalLabel}>Paciente:</Text>
                <Text style={styles.modalValue}>
                  {solicitudSeleccionada.paciente_nombre || 'N/A'}
                </Text>

                <Text style={styles.modalLabel}>Fecha original:</Text>
                <Text style={styles.modalValue}>
                  {solicitudSeleccionada.fecha_cita_original 
                    ? formatDateTime(new Date(solicitudSeleccionada.fecha_cita_original))
                    : 'N/A'}
                </Text>

                <Text style={styles.modalLabel}>Fecha actual de la cita:</Text>
                <Text style={styles.modalValue}>
                  {solicitudSeleccionada.fecha_cita_original 
                    ? formatDateTime(new Date(solicitudSeleccionada.fecha_cita_original))
                    : 'N/A'}
                </Text>

                {solicitudSeleccionada.motivo && (
                  <>
                    <Text style={styles.modalLabel}>Motivo:</Text>
                    <Text style={styles.modalValue}>{solicitudSeleccionada.motivo}</Text>
                  </>
                )}

                {solicitudSeleccionada.estado === 'pendiente' && (
                  <>
                    <Text style={styles.modalLabel}>Nueva fecha de cita:</Text>
                    <DateTimePickerButton
                      value={fechaReprogramada}
                      onDateChange={setFechaReprogramada}
                      mode="datetime"
                      placeholder="Seleccionar nueva fecha y hora"
                      style={styles.datePicker}
                    />

                    <Text style={styles.modalLabel}>Respuesta (opcional):</Text>
                    <TextInput
                      style={styles.textInput}
                      multiline
                      numberOfLines={4}
                      placeholder="Escribe una respuesta al paciente..."
                      value={respuestaDoctor}
                      onChangeText={setRespuestaDoctor}
                    />
                  </>
                )}
              </ScrollView>
            )}

            {solicitudSeleccionada?.estado === 'pendiente' && (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.rechazarButton]}
                  onPress={handleRechazar}
                  disabled={procesando}
                >
                  <Text style={styles.modalButtonText}>
                    {procesando ? 'Procesando...' : 'Rechazar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.aprobarButton]}
                  onPress={handleAprobar}
                  disabled={procesando || !fechaReprogramada}
                >
                  <Text style={styles.modalButtonText}>
                    {procesando ? 'Procesando...' : 'Aprobar'}
                  </Text>
                </TouchableOpacity>
              </View>
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
    fontSize: 14,
    color: '#E8F5E9',
  },
  filtersContainer: {
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORES.TEXTO_DISABLED,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 8,
  },
  cardResaltada: {
    borderWidth: 3,
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  estadoChip: {
    height: 28,
  },
  estadoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    marginRight: 8,
    minWidth: 120,
  },
  detailValue: {
    fontSize: 14,
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  aprobarButton: {
    backgroundColor: '#4CAF50',
  },
  rechazarButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
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
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORES.FONDO_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxHeight: '85%',
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.TEXTO_DISABLED,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  modalBody: {
    flexGrow: 1,
    flexShrink: 1,
  },
  modalBodyContent: {
    padding: 20,
    paddingTop: 15,
    paddingBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    marginTop: 12,
    marginBottom: 4,
  },
  modalValue: {
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  datePicker: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GestionSolicitudesReprogramacion;

