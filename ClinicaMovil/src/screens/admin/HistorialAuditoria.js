import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Searchbar, IconButton, Chip, Title } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import useAuditoria from '../../hooks/useAuditoria';
import FilterModal from '../../components/common/FilterModal';
import FilterChips from '../../components/common/FilterChips';
import ListCard from '../../components/common/ListCard';
import DetalleCitaModal from '../../components/DetalleCitaModal/DetalleCitaModal';
import { emptyStateStyles, modalStyles } from '../../utils/sharedStyles';
import { formatDateTime } from '../../utils/dateUtils';
import { COLORES } from '../../utils/constantes';
import SeveridadBadge from '../../components/common/SeveridadBadge';
import UsuarioSelector from '../../components/common/UsuarioSelector';
import { Button } from 'react-native-paper';
import gestionService from '../../api/gestionService';

// Tipos de acción para filtros
const TIPOS_ACCION = [
  { value: 'cita_estado_actualizado', label: 'Estado de Cita Actualizado' },
  { value: 'cita_reprogramada', label: 'Cita Reprogramada' },
  { value: 'paciente_creado', label: 'Paciente Creado' },
  { value: 'paciente_modificado', label: 'Paciente Modificado' },
  { value: 'doctor_creado', label: 'Doctor Creado' },
  { value: 'doctor_modificado', label: 'Doctor Modificado' },
  { value: 'asignacion_paciente', label: 'Asignación de Paciente' },
  { value: 'configuracion_cambiada', label: 'Configuración Cambiada' },
  { value: 'sistema_automatico', label: 'Sistema Automático' },
  { value: 'login_exitoso', label: 'Login Exitoso' },
  { value: 'login_fallido', label: 'Login Fallido' },
  { value: 'acceso_sospechoso', label: 'Acceso Sospechoso' },
  { value: 'error_sistema', label: 'Error del Sistema' },
  { value: 'error_critico', label: 'Error Crítico' },
];

const ENTIDADES_AFECTADAS = [
  { value: 'cita', label: 'Cita' },
  { value: 'paciente', label: 'Paciente' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'configuracion', label: 'Configuración' },
  { value: 'acceso', label: 'Acceso' },
  { value: 'error', label: 'Error' },
];

const SEVERIDADES = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'error', label: 'Error' },
  { value: 'critical', label: 'Crítico' },
];

const HistorialAuditoria = ({ navigation }) => {
  const { userData, userRole } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] = useState(null);
  // Modal detalle de cita (al pulsar "Ver Cita" en auditoría de cita)
  const [showDetalleCitaModal, setShowDetalleCitaModal] = useState(false);
  const [citaDetalle, setCitaDetalle] = useState(null);
  const [loadingCitaDetalle, setLoadingCitaDetalle] = useState(false);
  
  // Estados de filtros
  const [filterTipoAccion, setFilterTipoAccion] = useState(null);
  const [filterEntidad, setFilterEntidad] = useState(null);
  const [filterFechaDesde, setFilterFechaDesde] = useState(null);
  const [filterFechaHasta, setFilterFechaHasta] = useState(null);
  const [filterSeveridad, setFilterSeveridad] = useState(null);
  const [filterUsuario, setFilterUsuario] = useState(null);
  const [filterIpAddress, setFilterIpAddress] = useState('');
  const [exportando, setExportando] = useState(false);

  // Valores de filtros para el modal
  const filterValues = useMemo(() => ({
    tipo_accion: filterTipoAccion,
    entidad_afectada: filterEntidad,
    fecha_desde: filterFechaDesde,
    fecha_hasta: filterFechaHasta,
    severidad: filterSeveridad,
    id_usuario: filterUsuario?.id_usuario || null,
    ip_address: filterIpAddress || null,
  }), [filterTipoAccion, filterEntidad, filterFechaDesde, filterFechaHasta, filterSeveridad, filterUsuario, filterIpAddress]);

  // Configuración de filtros para FilterModal
  const filterConfig = [
    {
      type: 'dropdown',
      key: 'tipo_accion',
      label: 'Tipo de Acción',
      options: TIPOS_ACCION,
    },
    {
      type: 'dropdown',
      key: 'entidad_afectada',
      label: 'Entidad Afectada',
      options: ENTIDADES_AFECTADAS,
    },
    {
      type: 'dropdown',
      key: 'severidad',
      label: 'Severidad',
      options: SEVERIDADES,
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

  // Memoizar filtros para evitar recreación del objeto
  const auditoriaFilters = useMemo(() => ({
    limit: 50,
    offset: 0,
    tipo_accion: filterTipoAccion,
    entidad_afectada: filterEntidad,
    fecha_desde: filterFechaDesde,
    fecha_hasta: filterFechaHasta,
    search: searchQuery,
    severidad: filterSeveridad,
    id_usuario: filterUsuario?.id_usuario || null,
    ip_address: filterIpAddress || null
  }), [filterTipoAccion, filterEntidad, filterFechaDesde, filterFechaHasta, searchQuery, filterSeveridad, filterUsuario, filterIpAddress]);

  // Obtener auditoría con filtros
  const { auditoria, loading, error, total, hasMore, refresh, exportarDatos } = useAuditoria(auditoriaFilters);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      Logger.error('Error refrescando auditoría', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (key, value) => {
    switch (key) {
      case 'tipo_accion':
        setFilterTipoAccion(value);
        break;
      case 'entidad_afectada':
        setFilterEntidad(value);
        break;
      case 'severidad':
        setFilterSeveridad(value);
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
    setFilterTipoAccion(null);
    setFilterEntidad(null);
    setFilterFechaDesde(null);
    setFilterFechaHasta(null);
    setFilterSeveridad(null);
    setFilterUsuario(null);
    setFilterIpAddress('');
    setSearchQuery('');
  };

  const removerFiltro = (key) => {
    switch (key) {
      case 'id_usuario':
        setFilterUsuario(null);
        break;
      case 'ip_address':
        setFilterIpAddress('');
        break;
      default:
        handleFilterChange(key, null);
        break;
    }
  };

  const getFilterLabel = (key, value) => {
    if (key === 'tipo_accion') {
      const tipo = TIPOS_ACCION.find(t => t.value === value);
      return tipo ? tipo.label : value;
    }
    if (key === 'entidad_afectada') {
      const entidad = ENTIDADES_AFECTADAS.find(e => e.value === value);
      return entidad ? entidad.label : value;
    }
    if (key === 'severidad') {
      const severidad = SEVERIDADES.find(s => s.value === value);
      return severidad ? severidad.label : value;
    }
    if (key === 'id_usuario') {
      return filterUsuario ? `Usuario: ${filterUsuario.email}` : 'Usuario';
    }
    if (key === 'ip_address') {
      return `IP: ${value}`;
    }
    return `${key}: ${value}`;
  };

  // Funciones de navegación contextual
  const handleOpenCitaDetalle = async (idCita) => {
    if (!idCita) return;
    try {
      setShowDetailModal(false);
      setRegistroSeleccionado(null);
      setLoadingCitaDetalle(true);
      setCitaDetalle(null);
      setShowDetalleCitaModal(true);
      Logger.info('HistorialAuditoria: Obteniendo detalle de cita', { citaId: idCita });
      const citaData = await gestionService.getCitaById(idCita);
      Logger.success('HistorialAuditoria: Detalle de cita obtenido', { citaId: idCita });
      setCitaDetalle(citaData);
    } catch (error) {
      Logger.error('HistorialAuditoria: Error obteniendo detalle de cita', error);
      Alert.alert('Error', 'No se pudo cargar el detalle de la cita');
      setShowDetalleCitaModal(false);
    } finally {
      setLoadingCitaDetalle(false);
    }
  };

  const navegarAPaciente = async (idPaciente) => {
    if (!idPaciente) return;
    try {
      Logger.navigation('HistorialAuditoria', 'DetallePaciente', { id_paciente: idPaciente });
      const paciente = await gestionService.getPacienteById(idPaciente);
      if (paciente) {
        setShowDetailModal(false);
        setRegistroSeleccionado(null);
        navigation.navigate('DetallePaciente', { paciente });
      }
    } catch (error) {
      Logger.error('Error navegando a paciente', error);
    }
  };

  const navegarADoctor = async (idDoctor) => {
    if (!idDoctor) return;
    try {
      Logger.navigation('HistorialAuditoria', 'DetalleDoctor', { id_doctor: idDoctor });
      const doctor = await gestionService.getDoctorById(idDoctor);
      if (doctor) {
        setShowDetailModal(false);
        setRegistroSeleccionado(null);
        navigation.navigate('DetalleDoctor', { doctor });
      }
    } catch (error) {
      Logger.error('Error navegando a doctor', error);
    }
  };

  // Función para exportar datos
  const handleExportar = async (formato = 'csv') => {
    try {
      setExportando(true);
      Logger.info('Exportando auditoría', { formato, filters: auditoriaFilters });
      const result = await exportarDatos(formato);
      
      // En React Native, mostrar los datos o usar una librería de compartir
      if (result.success && result.data) {
        // Por ahora, mostrar un mensaje de éxito
        // En producción, se podría usar react-native-share o react-native-fs para guardar el archivo
        Alert.alert(
          'Exportación Exitosa',
          `Los datos han sido exportados. En una versión futura se podrá descargar el archivo ${result.filename}`,
          [{ text: 'OK' }]
        );
      }
      
      Logger.success('Auditoría exportada exitosamente');
    } catch (error) {
      Logger.error('Error exportando auditoría', error);
      Alert.alert('Error', 'No se pudo exportar la auditoría. Por favor, intente nuevamente.');
    } finally {
      setExportando(false);
    }
  };

  const getTipoAccionIcon = (tipo) => {
    switch (tipo) {
      case 'cita_estado_actualizado':
      case 'cita_reprogramada':
        return '📋';
      case 'paciente_creado':
      case 'paciente_modificado':
        return '👤';
      case 'doctor_creado':
      case 'doctor_modificado':
        return '👨‍⚕️';
      case 'sistema_automatico':
        return '⚙️';
      case 'login_exitoso':
        return '✅';
      case 'login_fallido':
        return '❌';
      case 'acceso_sospechoso':
        return '⚠️';
      case 'error_sistema':
      case 'error_critico':
        return '🔴';
      default:
        return '📝';
    }
  };

  const getTipoAccionColor = (tipo) => {
    switch (tipo) {
      case 'cita_estado_actualizado':
      case 'cita_reprogramada':
        return COLORES.NAV_PRIMARIO;
      case 'paciente_creado':
      case 'doctor_creado':
        return COLORES.EXITO_LIGHT;
      case 'paciente_modificado':
      case 'doctor_modificado':
        return COLORES.ADVERTENCIA_LIGHT;
      case 'sistema_automatico':
        return COLORES.TEXTO_SECUNDARIO;
      case 'login_exitoso':
        return COLORES.EXITO_LIGHT;
      case 'login_fallido':
        return COLORES.ADVERTENCIA_LIGHT;
      case 'acceso_sospechoso':
        return COLORES.ADVERTENCIA;
      case 'error_sistema':
        return COLORES.ERROR_LIGHT;
      case 'error_critico':
        return COLORES.ERROR;
      default:
        return COLORES.TEXTO_SECUNDARIO;
    }
  };

  const getTipoAccionLabel = (tipo) => {
    const tipoObj = TIPOS_ACCION.find(t => t.value === tipo);
    if (tipoObj) {
      // Acortar el label si es muy largo
      const label = tipoObj.label;
      if (label.length > 20) {
        return label.substring(0, 17) + '...';
      }
      return label;
    }
    // Si no se encuentra, formatear el valor
    return tipo
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .substring(0, 20);
  };

  // Función para formatear datos (JSON) a formato legible
  const formatearDatos = (datos, tipoAccion = null) => {
    if (!datos || typeof datos !== 'object') {
      return null;
    }

    const items = [];
    
    // Función recursiva para procesar objetos y arrays
    const procesarObjeto = (obj, prefix = '', level = 0) => {
      Object.entries(obj).forEach(([key, value]) => {
        const label = formatearLabel(key);
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value === null || value === undefined) {
          items.push({ key: fullKey, label, value: 'N/A', type: 'null', level });
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            items.push({ key: fullKey, label, value: '[] (vacío)', type: 'array', level });
          } else {
            // Para arrays, mostrar cada elemento
            value.forEach((item, index) => {
              if (typeof item === 'object' && item !== null) {
                // Si es un objeto dentro del array, mostrar sus propiedades
                items.push({ 
                  key: `${fullKey}[${index}]`, 
                  label: `${label} - Elemento ${index + 1}`, 
                  value: '',
                  type: 'array-item-header',
                  level
                });
                procesarObjeto(item, `${fullKey}[${index}]`, level + 1);
              } else {
                items.push({ 
                  key: `${fullKey}[${index}]`, 
                  label: `${label} [${index + 1}]`, 
                  value: formatearValor(item, tipoAccion),
                  type: 'array-item',
                  level
                });
              }
            });
          }
        } else if (typeof value === 'object') {
          // Para objetos anidados, mostrar sus propiedades directamente
          procesarObjeto(value, fullKey, level);
        } else {
          items.push({ key: fullKey, label, value: formatearValor(value, tipoAccion), type: 'primitive', level });
        }
      });
    };

    procesarObjeto(datos);
    return items;
  };

  // Formatear labels de campos
  const formatearLabel = (key) => {
    const labels = {
      estado: 'Estado',
      estado_anterior: 'Estado Anterior',
      estado_nuevo: 'Estado Nuevo',
      fecha_cita: 'Fecha de Cita',
      total_citas: 'Total de Citas',
      citas_actualizadas: 'Citas Actualizadas',
      id_cita: 'ID de Cita',
      fecha_cita: 'Fecha',
      estado_anterior: 'Estado Anterior',
      estado_nuevo: 'Estado Nuevo',
      nombre: 'Nombre',
      apellido: 'Apellido',
      email: 'Email',
      telefono: 'Teléfono',
    };
    
    return labels[key] || key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Formatear valores según su tipo
  const formatearValor = (value, tipoAccion = null) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      // Es una fecha ISO
      try {
        return formatDateTime(value);
      } catch {
        return value;
      }
    }
    
    let valorFormateado = String(value);
    
    // Si el tipo de acción es automático, reemplazar guiones bajos por espacios en estados
    if (tipoAccion === 'sistema_automatico' && typeof value === 'string' && value.includes('_')) {
      // Reemplazar guiones bajos por espacios
      valorFormateado = value.replace(/_/g, ' ');
    }
    
    return valorFormateado;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 Historial de Auditoría</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={{ padding: 8, opacity: (exportando || auditoria.length === 0) ? 0.5 : 1 }}
            onPress={() => {
              if (exportando || auditoria.length === 0) return;
              Alert.alert(
                'Exportar Auditoría',
                'Seleccione el formato de exportación',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'CSV', onPress: () => handleExportar('csv') },
                  { text: 'Excel', onPress: () => handleExportar('excel') },
                ]
              );
            }}
            disabled={exportando || auditoria.length === 0}
          >
            <Text style={{ fontSize: 20 }}>📥</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFiltersModal(true)}
          >
            <Text style={styles.filterButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar por descripción..."
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
          <Text style={styles.loadingText}>Cargando historial...</Text>
        </View>
      ) : error ? (
        <View style={emptyStateStyles.emptyContainer}>
          <Text style={emptyStateStyles.emptyEmoji}>⚠️</Text>
          <Text style={emptyStateStyles.emptyText}>Error al cargar</Text>
          <Text style={emptyStateStyles.emptySubtext}>{error.message || 'Error desconocido'}</Text>
        </View>
      ) : auditoria.length === 0 ? (
        <View style={emptyStateStyles.emptyContainer}>
          <Text style={emptyStateStyles.emptyEmoji}>📋</Text>
          <Text style={emptyStateStyles.emptyText}>No hay registros</Text>
          <Text style={emptyStateStyles.emptySubtext}>
            No se encontraron registros de auditoría con los filtros aplicados
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {auditoria.map((registro) => (
            <ListCard
              key={registro.id_auditoria}
              icon={getTipoAccionIcon(registro.tipo_accion)}
              title={registro.descripcion}
              subtitle={registro.entidad_afectada ? `Entidad: ${registro.entidad_afectada}` : null}
              metadata={[
                {
                  icon: '🗓️',
                  text: formatDateTime(registro.fecha_creacion),
                },
                {
                  icon: '👤',
                  text: registro.usuario_nombre || 'Sistema Automático',
                },
                registro.severidad && {
                  icon: '⚠️',
                  text: registro.severidad,
                },
                registro.ip_address && {
                  icon: '🌐',
                  text: registro.ip_address,
                },
              ].filter(Boolean)}
              badge={
                <View style={styles.badgeContainer}>
                  <Chip
                    style={[styles.badgeChip, { backgroundColor: getTipoAccionColor(registro.tipo_accion) }]}
                    textStyle={styles.badgeText}
                    mode="flat"
                  >
                    {getTipoAccionLabel(registro.tipo_accion)}
                  </Chip>
                  {registro.severidad && (
                    <SeveridadBadge severidad={registro.severidad} style={styles.severidadBadge} />
                  )}
                  {registro.tipo_accion === 'acceso_sospechoso' && (
                    <Chip
                      style={[styles.badgeChip, { backgroundColor: COLORES.ADVERTENCIA }]}
                      textStyle={styles.badgeText}
                      mode="flat"
                    >
                      ⚠️ Sospechoso
                    </Chip>
                  )}
                </View>
              }
              onPress={() => {
                setRegistroSeleccionado(registro);
                setShowDetailModal(true);
                Logger.info('Ver detalle de auditoría', { id: registro.id_auditoria });
              }}
            />
          ))}
          
          {hasMore && (
            <View style={styles.loadMoreContainer}>
              <Text style={styles.loadMoreText}>
                Mostrando {auditoria.length} de {total} registros
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

      {/* Modal de Detalle de Auditoría */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowDetailModal(false);
          setRegistroSeleccionado(null);
        }}
      >
        <View style={modalStyles.modalOverlay}>
          <View style={modalStyles.modalContent}>
            <View style={modalStyles.modalHeader}>
              <Title style={modalStyles.modalTitle}>
                {registroSeleccionado && `${getTipoAccionIcon(registroSeleccionado.tipo_accion)} Detalle de Auditoría`}
              </Title>
              <TouchableOpacity
                onPress={() => {
                  setShowDetailModal(false);
                  setRegistroSeleccionado(null);
                }}
              >
                <Text style={modalStyles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            {registroSeleccionado && (
              <ScrollView style={styles.detailScrollView} showsVerticalScrollIndicator={true}>
                <View style={styles.detailContent}>
              {/* Información Principal */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Información General</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Descripción:</Text>
                  <Text style={styles.detailValue}>{registroSeleccionado.descripcion}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tipo de Acción:</Text>
                  <View style={styles.chipContainer}>
                    <Chip
                      style={[styles.detailChip, { backgroundColor: getTipoAccionColor(registroSeleccionado.tipo_accion) }]}
                      textStyle={styles.detailChipText}
                      mode="flat"
                    >
                      {getTipoAccionLabel(registroSeleccionado.tipo_accion)}
                    </Chip>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Entidad Afectada:</Text>
                  <Text style={styles.detailValue}>
                    {ENTIDADES_AFECTADAS.find(e => e.value === registroSeleccionado.entidad_afectada)?.label || registroSeleccionado.entidad_afectada}
                  </Text>
                </View>

                {registroSeleccionado.id_entidad && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>ID de Entidad:</Text>
                    <Text style={styles.detailValue}>#{registroSeleccionado.id_entidad}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Severidad:</Text>
                  <SeveridadBadge severidad={registroSeleccionado.severidad || 'info'} />
                </View>

                {registroSeleccionado.ip_address && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>IP Address:</Text>
                    <Text style={styles.detailValue}>{registroSeleccionado.ip_address}</Text>
                  </View>
                )}

                {registroSeleccionado.user_agent && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>User Agent:</Text>
                    <Text style={styles.detailValue} numberOfLines={2}>{registroSeleccionado.user_agent}</Text>
                  </View>
                )}

                {/* Botones de navegación contextual */}
                {(() => {
                  const entidadAfectada = registroSeleccionado.entidad_afectada;
                  const idEntidad = registroSeleccionado.id_entidad;
                  
                  if (entidadAfectada === 'cita' && idEntidad) {
                    return (
                      <View style={styles.navigationButtonContainer}>
                        <Button
                          mode="contained"
                          onPress={() => handleOpenCitaDetalle(idEntidad)}
                          style={styles.navigationButton}
                        >
                          Ver Cita #{idEntidad}
                        </Button>
                      </View>
                    );
                  }
                  
                  if (entidadAfectada === 'paciente' && idEntidad) {
                    return (
                      <View style={styles.navigationButtonContainer}>
                        <Button
                          mode="contained"
                          onPress={() => navegarAPaciente(idEntidad)}
                          style={styles.navigationButton}
                          icon="account"
                        >
                          Ver Paciente #{idEntidad}
                        </Button>
                      </View>
                    );
                  }
                  
                  if (entidadAfectada === 'doctor' && idEntidad) {
                    return (
                      <View style={styles.navigationButtonContainer}>
                        <Button
                          mode="contained"
                          onPress={() => navegarADoctor(idEntidad)}
                          style={styles.navigationButton}
                          icon="doctor"
                        >
                          Ver Doctor #{idEntidad}
                        </Button>
                      </View>
                    );
                  }
                  
                  return null;
                })()}
              </View>

              {/* Información de Usuario y Fecha */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>👤 Usuario y Fecha</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Usuario:</Text>
                  <Text style={styles.detailValue}>
                    {registroSeleccionado.usuario_nombre || 'Sistema Automático'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Fecha y Hora:</Text>
                  <Text style={styles.detailValue}>
                    {formatDateTime(registroSeleccionado.fecha_creacion)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ID de Registro:</Text>
                  <Text style={styles.detailValue}>#{registroSeleccionado.id_auditoria}</Text>
                </View>
              </View>

              {/* Datos Anteriores */}
              {registroSeleccionado.datos_anteriores && (() => {
                const datosFormateados = formatearDatos(registroSeleccionado.datos_anteriores, registroSeleccionado.tipo_accion);
                return (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>📥 Datos Anteriores</Text>
                    <View style={styles.dataContainer}>
                      {datosFormateados && datosFormateados.length > 0 ? (
                        datosFormateados.map((item, index) => {
                          if (item.type === 'array-item-header') {
                            // Header de elemento de array (sin valor)
                            return (
                              <View 
                                key={`${item.key}-${index}`} 
                                style={[
                                  styles.dataRowHeader,
                                  item.level > 0 && { marginLeft: item.level * 16 }
                                ]}
                              >
                                <Text style={styles.dataHeaderText}>{item.label}</Text>
                              </View>
                            );
                          }
                          
                          return (
                            <View 
                              key={`${item.key}-${index}`} 
                              style={[
                                styles.dataRow,
                                item.level > 0 && { marginLeft: item.level * 16 }
                              ]}
                            >
                              <Text style={styles.dataLabel}>{item.label}:</Text>
                              <Text style={styles.dataValue}>{item.value}</Text>
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.infoText}>No hay datos anteriores disponibles</Text>
                      )}
                    </View>
                  </View>
                );
              })()}

              {/* Stack Trace (solo para errores) */}
              {registroSeleccionado.stack_trace && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>🔴 Stack Trace</Text>
                  <ScrollView style={styles.stackTraceContainer} nestedScrollEnabled>
                    <Text style={styles.stackTraceText}>{registroSeleccionado.stack_trace}</Text>
                  </ScrollView>
                </View>
              )}

              {/* Datos Nuevos */}
              {registroSeleccionado.datos_nuevos && (() => {
                const datosFormateados = formatearDatos(registroSeleccionado.datos_nuevos, registroSeleccionado.tipo_accion);
                return (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>📤 Datos Nuevos</Text>
                    <View style={styles.dataContainer}>
                      {datosFormateados && datosFormateados.length > 0 ? (
                        datosFormateados.map((item, index) => {
                          if (item.type === 'array-item-header') {
                            // Header de elemento de array (sin valor)
                            return (
                              <View 
                                key={`${item.key}-${index}`} 
                                style={[
                                  styles.dataRowHeader,
                                  item.level > 0 && { marginLeft: item.level * 16 }
                                ]}
                              >
                                <Text style={styles.dataHeaderText}>{item.label}</Text>
                              </View>
                            );
                          }
                          
                          return (
                            <View 
                              key={`${item.key}-${index}`} 
                              style={[
                                styles.dataRow,
                                item.level > 0 && { marginLeft: item.level * 16 }
                              ]}
                            >
                              <Text style={styles.dataLabel}>{item.label}:</Text>
                              <Text style={styles.dataValue}>{item.value}</Text>
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.infoText}>No hay datos nuevos disponibles</Text>
                      )}
                    </View>
                  </View>
                );
              })()}

              {/* Información Adicional */}
              {(!registroSeleccionado.datos_anteriores && !registroSeleccionado.datos_nuevos) && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>ℹ️ Información Adicional</Text>
                  <Text style={styles.infoText}>
                    Este registro no contiene datos adicionales de cambios específicos.
                  </Text>
                </View>
              )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Detalle de Cita (al pulsar "Ver Cita" en registro de auditoría de cita) */}
      <DetalleCitaModal
        visible={showDetalleCitaModal}
        onClose={() => {
          setShowDetalleCitaModal(false);
          setCitaDetalle(null);
        }}
        citaDetalle={citaDetalle}
        loading={loadingCitaDetalle}
        userRole={userRole}
        formatearFecha={formatDateTime}
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
    paddingVertical: 8,
    backgroundColor: COLORES.FONDO_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.TEXTO_DISABLED,
  },
  backButton: {
    padding: 8,
    marginRight: 4,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORES.TEXTO_PRIMARIO,
    fontWeight: 'bold',
  },
  filterButton: {
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORES.NAV_PRIMARIO,
    backgroundColor: COLORES.FONDO_CARD,
  },
  filterButtonText: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  severidadBadge: {
    marginLeft: 4,
  },
  navigationButtonContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  navigationButton: {
    marginVertical: 4,
  },
  stackTraceContainer: {
    maxHeight: 200,
    backgroundColor: COLORES.FONDO,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  stackTraceText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: COLORES.ERROR,
    lineHeight: 16,
  },
  searchContainer: {
    padding: 12,
    backgroundColor: COLORES.FONDO_CARD,
  },
  searchBar: {
    elevation: 1,
  },
  scrollView: {
    flex: 1,
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
  badgeChip: {
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontWeight: '600',
    lineHeight: 14,
  },
  loadMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
  },
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
    borderBottomColor: COLORES.TEXTO_DISABLED,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORES.NAV_PRIMARIO,
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
    color: COLORES.TEXTO_SECUNDARIO,
    minWidth: 120,
    maxWidth: 120,
    marginRight: 12,
  },
  detailValue: {
    fontSize: 14,
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
    flexWrap: 'wrap',
    flexShrink: 1,
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
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontWeight: '600',
  },
  dataContainer: {
    backgroundColor: COLORES.FONDO,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    width: '100%',
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  dataRowHeader: {
    marginTop: 12,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.TEXTO_DISABLED,
  },
  dataHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.NAV_PRIMARIO,
  },
  dataLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    marginRight: 8,
    minWidth: 100,
  },
  dataValue: {
    fontSize: 13,
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
    flexWrap: 'wrap',
  },
  infoText: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

export default HistorialAuditoria;

