import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, IconButton, Chip, Button, Card } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import useNotificacionesDoctor from '../../hooks/useNotificacionesDoctor';
import FilterModal from '../../components/common/FilterModal';
import FilterChips from '../../components/common/FilterChips';
import ListCard from '../../components/common/ListCard';
import { emptyStateStyles } from '../../utils/sharedStyles';
import { formatDateTime } from '../../utils/dateUtils';
import { COLORES } from '../../utils/constantes';
import useWebSocket from '../../hooks/useWebSocket';

// Tipos de notificación para filtros
const TIPOS_NOTIFICACION = [
  { value: 'cita_actualizada', label: 'Cita Actualizada' },
  { value: 'cita_reprogramada', label: 'Cita Reprogramada' },
  { value: 'cita_cancelada', label: 'Cita Cancelada' },
  { value: 'solicitud_reprogramacion', label: 'Solicitud de Reprogramación' },
  { value: 'nuevo_mensaje', label: 'Nuevo Mensaje' },
  { value: 'alerta_signos_vitales', label: 'Alerta Signos Vitales' },
  { value: 'paciente_registro_signos', label: 'Registro de Signos' },
];

const ESTADOS_NOTIFICACION = [
  { value: 'enviada', label: 'Enviada' },
  { value: 'leida', label: 'Leída' },
  { value: 'archivada', label: 'Archivada' },
];

const HistorialNotificaciones = ({ navigation }) => {
  const { userData, userRole } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  
  // Estados de filtros
  const [filterTipo, setFilterTipo] = useState(null);
  const [filterEstado, setFilterEstado] = useState(null);
  const [filterFechaDesde, setFilterFechaDesde] = useState(null);
  const [filterFechaHasta, setFilterFechaHasta] = useState(null);

  // Valores de filtros para el modal
  const filterValues = useMemo(() => ({
    tipo: filterTipo,
    estado: filterEstado,
    fecha_desde: filterFechaDesde,
    fecha_hasta: filterFechaHasta,
  }), [filterTipo, filterEstado, filterFechaDesde, filterFechaHasta]);

  // Configuración de filtros para FilterModal
  const filterConfig = [
    {
      type: 'dropdown',
      key: 'tipo',
      label: 'Tipo de Notificación',
      options: TIPOS_NOTIFICACION,
    },
    {
      type: 'dropdown',
      key: 'estado',
      label: 'Estado',
      options: ESTADOS_NOTIFICACION,
    },
    {
      type: 'date',
      key: 'fecha_desde',
      label: 'Fecha Desde',
    },
    {
      type: 'date',
      key: 'fecha_hasta',
      label: 'Fecha Hasta',
    },
  ];

  // Memoizar filtros
  const notificacionesFilters = useMemo(() => ({
    limit: 50,
    offset: 0,
    tipo: filterTipo,
    estado: filterEstado,
    fecha_desde: filterFechaDesde,
    fecha_hasta: filterFechaHasta,
    search: searchQuery
  }), [filterTipo, filterEstado, filterFechaDesde, filterFechaHasta, searchQuery]);

  // WebSocket para actualizaciones en tiempo real
  const { subscribeToEvent, isConnected } = useWebSocket();

  // Obtener notificaciones
  const { 
    notificaciones, 
    loading, 
    error,
    total, 
    hasMore, 
    contadorNoLeidas,
    refresh: refreshNotificaciones, 
    marcarLeida, 
    archivar 
  } = useNotificacionesDoctor(userData?.id_doctor, notificacionesFilters);

  // Suscribirse a eventos WebSocket para notificaciones en tiempo real
  useEffect(() => {
    if (!subscribeToEvent || !userData?.id_doctor) return;

    // Evento: Nueva notificación del doctor
    const unsubscribeNotificacion = subscribeToEvent('notificacion_doctor', (data) => {
      if (data.id_doctor === userData.id_doctor) {
        Logger.info('HistorialNotificaciones: Nueva notificación recibida por WebSocket', data);
        // Recargar notificaciones para mostrar la nueva
        refreshNotificaciones();
      }
    });

    // Cleanup
    return () => {
      if (unsubscribeNotificacion) unsubscribeNotificacion();
    };
  }, [subscribeToEvent, userData?.id_doctor, refreshNotificaciones]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshNotificaciones();
    } catch (error) {
      Logger.error('Error refrescando notificaciones', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (key, value) => {
    switch (key) {
      case 'tipo':
        setFilterTipo(value);
        break;
      case 'estado':
        setFilterEstado(value);
        break;
      case 'fecha_desde':
        setFilterFechaDesde(value);
        break;
      case 'fecha_hasta':
        setFilterFechaHasta(value);
        break;
      default:
        break;
    }
  };

  const aplicarFiltros = () => {
    setShowFiltersModal(false);
  };

  const limpiarFiltros = () => {
    setFilterTipo(null);
    setFilterEstado(null);
    setFilterFechaDesde(null);
    setFilterFechaHasta(null);
    setSearchQuery('');
  };

  const removerFiltro = (key) => {
    handleFilterChange(key, null);
  };

  const getFilterLabel = (key, value) => {
    if (key === 'tipo') {
      const tipo = TIPOS_NOTIFICACION.find(t => t.value === value);
      return tipo ? tipo.label : value;
    }
    if (key === 'estado') {
      const estado = ESTADOS_NOTIFICACION.find(e => e.value === value);
      return estado ? estado.label : value;
    }
    return `${key}: ${value}`;
  };

  const handleMarcarLeida = async (notificacionId) => {
    try {
      await marcarLeida(notificacionId);
    } catch (error) {
      Alert.alert('Error', 'No se pudo marcar la notificación como leída');
      Logger.error('Error marcando notificación como leída', error);
    }
  };

  const handleArchivar = async (notificacionId) => {
    Alert.alert(
      'Archivar Notificación',
      '¿Estás seguro de que deseas archivar esta notificación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: async () => {
            try {
              await archivar(notificacionId);
            } catch (error) {
              Alert.alert('Error', 'No se pudo archivar la notificación');
              Logger.error('Error archivando notificación', error);
            }
          },
        },
      ]
    );
  };

  /**
   * Manejar presión en notificación
   * Reutiliza la misma lógica que DashboardDoctor.js
   * Si es solicitud de reprogramación, navegar a la pantalla de gestión
   * Si es nuevo mensaje, navegar al chat con el paciente
   * Para otros tipos, marcar como leída si no lo está
   */
  const handleNotificacionPress = useCallback((notificacion) => {
    // Log detallado para debugging
    Logger.info('HistorialNotificaciones: handleNotificacionPress llamado', {
      tipo: notificacion.tipo,
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

    Logger.info('HistorialNotificaciones: Análisis de tipo de notificación', {
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
      
      Logger.navigation('HistorialNotificaciones', 'GestionSolicitudesReprogramacion', {
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
        Logger.error('HistorialNotificaciones: No se pudo obtener pacienteId de la notificación', {
          notificacion
        });
        return;
      }

      Logger.navigation('HistorialNotificaciones', 'ChatPaciente', {
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
    
    // Para otros tipos de notificación, solo marcar como leída si no lo está
    if (notificacion.estado === 'enviada') {
      handleMarcarLeida(notificacion.id_notificacion);
    }
  }, [navigation]);


  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'enviada':
        return COLORES.ERROR_LIGHT;
      case 'leida':
        return COLORES.EXITO_LIGHT;
      case 'archivada':
        return COLORES.TEXTO_DISABLED;
      default:
        return COLORES.TEXTO_SECUNDARIO;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={{ padding: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>🔔 Mis Notificaciones</Text>
          {contadorNoLeidas > 0 && (
            <Chip style={styles.badgeChip} textStyle={styles.badgeText}>
              {contadorNoLeidas} no leídas
            </Chip>
          )}
        </View>
        <TouchableOpacity
          style={{ padding: 8 }}
          onPress={() => setShowFiltersModal(true)}
        >
          <Text style={{ fontSize: 20 }}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar notificaciones..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon={() => null}
        />
      </View>

      {/* Filtros activos */}
      <FilterChips
        filters={filterValues}
        onRemoveFilter={removerFiltro}
        onClearAll={limpiarFiltros}
        getFilterLabel={getFilterLabel}
      />

      {/* Contenido */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.NAV_PRIMARIO} />
          <Text style={styles.loadingText}>Cargando notificaciones...</Text>
        </View>
      ) : error ? (
        <View style={emptyStateStyles.emptyContainer}>
          <Text style={emptyStateStyles.emptyEmoji}>⚠️</Text>
          <Text style={emptyStateStyles.emptyText}>Error al cargar</Text>
          <Text style={emptyStateStyles.emptySubtext}>{error.message || 'Error desconocido'}</Text>
        </View>
      ) : notificaciones.length === 0 ? (
        <View style={emptyStateStyles.emptyContainer}>
          <Text style={emptyStateStyles.emptyEmoji}>🔔</Text>
          <Text style={emptyStateStyles.emptyText}>No hay notificaciones</Text>
          <Text style={emptyStateStyles.emptySubtext}>
            No se encontraron notificaciones con los filtros aplicados
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {notificaciones.map((notificacion) => (
            <View key={notificacion.id_notificacion} style={styles.notificacionContainer}>
              <TouchableOpacity
                onPress={() => handleNotificacionPress(notificacion)}
                activeOpacity={0.7}
                style={styles.notificacionTouchable}
              >
                <Card style={styles.notificacionCard} pointerEvents="none">
                  <Card.Content style={styles.cardContent}>
                    {/* Header con título y badge */}
                    <View style={styles.cardHeader}>
                      <View style={styles.titleContainer}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {notificacion.titulo}
                        </Text>
                      </View>
                      <Chip
                        style={[styles.badgeChip, { backgroundColor: getEstadoColor(notificacion.estado) }]}
                        textStyle={styles.badgeText}
                      >
                        {notificacion.estado}
                      </Chip>
                    </View>

                    {/* Mensaje */}
                    <Text style={styles.cardSubtitle} numberOfLines={4}>
                      {notificacion.mensaje}
                    </Text>

                    {/* Metadata */}
                    <View style={styles.metadataContainer}>
                      <View style={styles.metadataRow}>
                        <Text style={styles.metadataText}>
                          {formatDateTime(notificacion.fecha_envio)}
                        </Text>
                      </View>
                      {notificacion.paciente_nombre && (
                        <View style={styles.metadataRow}>
                          <Text style={styles.metadataText} numberOfLines={1}>
                            {notificacion.paciente_nombre}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card.Content>

                  {/* Botones de acción dentro del card */}
                  <View style={styles.actionButtons} pointerEvents="box-none">
                    {notificacion.estado === 'enviada' && (
                      <Button
                        mode="contained"
                        onPress={(e) => {
                          e.stopPropagation();
                          handleMarcarLeida(notificacion.id_notificacion);
                        }}
                        style={[styles.actionButton, styles.actionButtonPrimary]}
                        buttonColor={COLORES.EXITO_LIGHT}
                        labelStyle={styles.actionButtonLabel}
                        compact
                      >
                        Marcar como leída
                      </Button>
                    )}
                    {notificacion.estado !== 'archivada' && (
                      <Button
                        mode="outlined"
                        onPress={(e) => {
                          e.stopPropagation();
                          handleArchivar(notificacion.id_notificacion);
                        }}
                        style={[styles.actionButton, styles.actionButtonSecondary]}
                        labelStyle={styles.actionButtonLabel}
                        compact
                      >
                        Archivar
                      </Button>
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            </View>
          ))}
          
          {hasMore && (
            <View style={styles.loadMoreContainer}>
              <Text style={styles.loadMoreText}>
                Mostrando {notificaciones.length} de {total} notificaciones
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal de Filtros */}
      <FilterModal
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        onApply={aplicarFiltros}
        onClear={limpiarFiltros}
        filterConfig={filterConfig}
        filterValues={filterValues}
        onFilterChange={handleFilterChange}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.FONDO,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: COLORES.FONDO_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.BORDE_CLARO,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
  },
  searchContainer: {
    padding: 12,
    backgroundColor: COLORES.FONDO_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.BORDE_CLARO,
  },
  searchBar: {
    elevation: 1,
    backgroundColor: COLORES.FONDO,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  notificacionContainer: {
    marginBottom: 12,
  },
  notificacionTouchable: {
    marginBottom: 0,
  },
  notificacionCard: {
    marginBottom: 0,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderRadius: 12,
    backgroundColor: COLORES.FONDO_CARD,
  },
  cardContent: {
    padding: 16,
    paddingBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    lineHeight: 22,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    lineHeight: 20,
    marginBottom: 12,
    marginTop: 4,
  },
  metadataContainer: {
    marginTop: 8,
    gap: 6,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    flex: 1,
  },
  badgeChip: {
    height: 26,
    minWidth: 70,
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORES.SECUNDARIO_LIGHT,
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
  },
  actionButtonPrimary: {
    elevation: 0,
  },
  actionButtonSecondary: {
    borderColor: COLORES.TEXTO_DISABLED,
  },
  actionButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 4,
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
  },
});

export default HistorialNotificaciones;

