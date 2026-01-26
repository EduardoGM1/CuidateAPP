import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Paragraph, Searchbar, Button, Chip } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import useTodasCitas from '../../hooks/useTodasCitas';
import { useDoctores, usePacientes, useModulos } from '../../hooks/useGestion';
import { formatDateTime } from '../../utils/dateUtils';
import { gestionService } from '../../api/gestionService';
import { ESTADOS_CITA } from '../../utils/constantes';
import DateTimePickerButton from '../../components/DateTimePickerButton';
import CompletarCitaWizard from '../../components/CompletarCitaWizard';

const VerTodasCitas = ({ navigation }) => {
  const { userData, userRole } = useAuth();
  const route = useRoute();
  
  // Obtener parámetros de ruta (si viene desde dashboard o DetalleDoctor)
  const { id_cita, highlightCitaId, desde_dashboard } = route.params || {};
  // Usar highlightCitaId si está disponible, sino usar id_cita
  const citaIdToHighlight = highlightCitaId || id_cita;
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDoctor, setFilterDoctor] = useState(null);
  const [filterFechaDesde, setFilterFechaDesde] = useState(null);
  const [filterFechaHasta, setFilterFechaHasta] = useState(null);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [filterModulo, setFilterModulo] = useState(null);
  const [showModuloDropdown, setShowModuloDropdown] = useState(false);
  
  // Estados para gestión de citas
  const [showEstadoModal, setShowEstadoModal] = useState(false);
  const [showReprogramarModal, setShowReprogramarModal] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [fechaReprogramada, setFechaReprogramada] = useState('');
  const [motivoReprogramacion, setMotivoReprogramacion] = useState('');
  const [actualizando, setActualizando] = useState(false);


  // Estados para wizard de completar cita
  const [showWizard, setShowWizard] = useState(false);
  const [citaSeleccionadaWizard, setCitaSeleccionadaWizard] = useState(null);
  
  // Estado para cita resaltada (cuando viene desde dashboard)
  const [citaResaltada, setCitaResaltada] = useState(null);
  
  // Estado para cita destacada (mostrar al inicio cuando viene con highlightCitaId)
  const [citaDestacada, setCitaDestacada] = useState(null);
  const [loadingCitaDestacada, setLoadingCitaDestacada] = useState(false);
  
  // Ref para ScrollView (para hacer scroll automático)
  const scrollViewRef = useRef(null);

  // Obtener doctores para filtro (solo para admin)
  const { doctores } = useDoctores('activos', 'recent');
  
  // Obtener módulos para filtro
  const { modulos, fetchModulos } = useModulos();
  
  // Cargar módulos al montar el componente
  useEffect(() => {
    fetchModulos();
  }, [fetchModulos]);
  
  // Cargar la cita destacada cuando viene con highlightCitaId
  useEffect(() => {
    const fetchCitaDestacada = async () => {
      if (!citaIdToHighlight) {
        setCitaDestacada(null);
        return;
      }
      
      setLoadingCitaDestacada(true);
      try {
        Logger.info('VerTodasCitas: Cargando cita destacada', { citaId: citaIdToHighlight });
        const citaData = await gestionService.getCitaById(citaIdToHighlight);
        
        if (citaData) {
          // Normalizar los datos de la cita para que coincidan con el formato de la lista
          const citaNormalizada = {
            id_cita: citaData.id_cita,
            id: citaData.id_cita,
            paciente_nombre: citaData.Paciente 
              ? `${citaData.Paciente.nombre} ${citaData.Paciente.apellido_paterno || ''} ${citaData.Paciente.apellido_materno || ''}`.trim()
              : citaData.paciente_nombre || 'Paciente no disponible',
            doctor_nombre: citaData.Doctor
              ? `${citaData.Doctor.nombre} ${citaData.Doctor.apellido_paterno || ''} ${citaData.Doctor.apellido_materno || ''}`.trim()
              : citaData.doctor_nombre || 'Doctor no disponible',
            fecha_cita: citaData.fecha_cita,
            estado: citaData.estado,
            motivo: citaData.motivo,
            es_primera_consulta: citaData.es_primera_consulta,
            observaciones: citaData.observaciones,
            modulo_nombre: citaData.Doctor?.Modulo?.nombre_modulo || citaData.modulo_nombre || null,
            // Datos originales para acciones
            ...citaData
          };
          
          setCitaDestacada(citaNormalizada);
          setCitaResaltada(citaIdToHighlight);
          Logger.success('VerTodasCitas: Cita destacada cargada', { citaId: citaIdToHighlight });
        }
      } catch (error) {
        Logger.error('VerTodasCitas: Error cargando cita destacada', { 
          citaId: citaIdToHighlight, 
          error: error.message 
        });
        // No mostrar error al usuario, simplemente no mostrar la cita destacada
      } finally {
        setLoadingCitaDestacada(false);
      }
    };
    
    fetchCitaDestacada();
  }, [citaIdToHighlight]);
  
  // Obtener pacientes del doctor (solo para doctores, para filtrar búsqueda)
  const { pacientes: pacientesDoctor } = usePacientes('activos', 'recent', 'todas');
  const pacientesIdsDoctor = useMemo(() => {
    if (userRole !== 'Doctor' && userRole !== 'doctor') return null;
    return pacientesDoctor?.map(p => p.id_paciente || p.id) || [];
  }, [pacientesDoctor, userRole]);

  // Memoizar filtros para evitar recreación del objeto en cada render
  // Para doctores, no enviar filterDoctor ya que el backend filtra automáticamente
  const citasFilters = useMemo(() => {
    const filters = {
      pageSize: 20, // Tamaño de página para infinite scroll
      fechaDesde: filterFechaDesde,
      fechaHasta: filterFechaHasta,
      search: searchQuery
    };
    // Solo admin puede filtrar por doctor
    if ((userRole === 'Admin' || userRole === 'admin') && filterDoctor) {
      filters.doctorId = filterDoctor;
    }
    return filters;
  }, [filterDoctor, filterFechaDesde, filterFechaHasta, searchQuery, userRole]);

  // Obtener todas las citas con filtros e infinite scroll
  const { 
    citas, 
    loading, 
    loadingMore,
    error, 
    total, 
    hasMore, 
    refresh,
    loadMore 
  } = useTodasCitas(citasFilters);

  // Estado de carga inicial
  const isLoadingData = loading;

  // Filtrar citas por búsqueda local
  const [filteredCitas, setFilteredCitas] = useState([]);
  // Estado para rastrear si los datos se han cargado al menos una vez
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    // Solo procesar si no está cargando o si ya se cargó al menos una vez
    if (loading && !hasLoadedOnce) {
      // Aún cargando por primera vez, no actualizar filteredCitas
      return;
    }

    // Marcar que ya se cargó al menos una vez cuando loading cambia a false
    if (!loading && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }

    if (!citas || citas.length === 0) {
      setFilteredCitas([]);
      return;
    }

    let filtered = citas;

    // Filtrar por módulo (solo para admin)
    if ((userRole === 'Admin' || userRole === 'admin') && filterModulo) {
      filtered = filtered.filter(cita => {
        // Buscar el doctor de esta cita
        const doctor = doctores.find(d => d.id_doctor === cita.id_doctor);
        return doctor?.id_modulo === filterModulo;
      });
    }

    // Búsqueda por nombre de paciente o doctor
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(cita => {
        const pacienteMatch = cita.paciente_nombre?.toLowerCase().includes(query);
        const doctorMatch = cita.doctor_nombre?.toLowerCase().includes(query);
        const motivoMatch = cita.motivo?.toLowerCase().includes(query);
        
        // Si es doctor, solo buscar en sus pacientes asignados
        if ((userRole === 'Doctor' || userRole === 'doctor') && pacientesIdsDoctor) {
          const esPacienteDelDoctor = pacientesIdsDoctor.includes(cita.id_paciente);
          // Si la búsqueda coincide con paciente, verificar que sea del doctor
          if (pacienteMatch && !esPacienteDelDoctor) {
            return false;
          }
        }
        
        return pacienteMatch || doctorMatch || motivoMatch;
      });
    }

    setFilteredCitas(filtered);
  }, [citas, searchQuery, userRole, pacientesIdsDoctor, loading, hasLoadedOnce, filterModulo, doctores]);

  // Efecto para resaltar la cita en la lista si está visible
  // (La cita destacada al inicio se maneja por separado con citaDestacada)
  useEffect(() => {
    // Si ya tenemos la cita destacada mostrada arriba, no necesitamos hacer scroll
    if (citaDestacada) {
      return;
    }
    
    if (citaIdToHighlight && filteredCitas.length > 0) {
      // Convertir id_cita a número para comparación robusta
      const idCitaNum = typeof citaIdToHighlight === 'string' ? parseInt(citaIdToHighlight) : citaIdToHighlight;
      
      // Buscar la cita en la lista con comparación robusta
      const index = filteredCitas.findIndex(cita => {
        const citaId = typeof (cita.id_cita || cita.id) === 'string' 
          ? parseInt(cita.id_cita || cita.id) 
          : (cita.id_cita || cita.id);
        return citaId === idCitaNum;
      });
      
      if (index >= 0) {
        const citaEncontrada = filteredCitas[index];
        
        Logger.info('VerTodasCitas: Cita encontrada en lista para resaltar', {
          id_cita: idCitaNum,
          index,
          total: filteredCitas.length,
          paciente: citaEncontrada.paciente_nombre
        });
        
        // Resaltar la cita en la lista
        setCitaResaltada(idCitaNum);
        
        // Remover resaltado después de 5 segundos
        setTimeout(() => {
          setCitaResaltada(null);
        }, 5000);
      }
    }
  }, [citaIdToHighlight, filteredCitas, citaDestacada]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      Logger.error('Error refrescando citas', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleVerDetalle = (cita) => {
    Logger.navigation('VerTodasCitas', 'DetallePaciente');
    navigation.navigate('DetallePaciente', { 
      paciente: { id_paciente: cita.id_paciente, id: cita.id_paciente } 
    });
  };

  const handleVerDetalleDoctor = (cita) => {
    if (!cita.id_doctor) {
      Alert.alert('Sin Doctor', 'Esta cita no tiene doctor asignado');
      return;
    }
    Logger.navigation('VerTodasCitas', 'DetalleDoctor');
    navigation.navigate('DetalleDoctor', { 
      doctor: { id_doctor: cita.id_doctor, id: cita.id_doctor } 
    });
  };

  // Función para abrir wizard de completar cita
  const handleOpenWizard = async (cita) => {
    try {
      // Obtener datos completos de la cita
      // getCitaById retorna directamente el objeto de la cita (response.data del API)
      const citaData = await gestionService.getCitaById(cita.id_cita);
      
      // Verificar que tenemos los datos necesarios
      if (citaData && citaData.id_cita) {
        setCitaSeleccionadaWizard(citaData);
        setShowWizard(true);
        Logger.info('Wizard de completar cita abierto desde VerTodasCitas', { 
          citaId: cita.id_cita,
          citaDataKeys: Object.keys(citaData || {})
        });
      } else {
        Logger.error('Datos de cita incompletos', { 
          citaId: cita.id_cita,
          citaData: citaData 
        });
        Alert.alert('Error', 'No se pudo cargar los datos de la cita');
      }
    } catch (error) {
      Logger.error('Error abriendo wizard', error);
      Alert.alert('Error', 'No se pudo abrir el wizard: ' + (error.message || 'Error desconocido'));
    }
  };

  // Función para manejar éxito del wizard
  const handleWizardSuccess = () => {
    // Recargar citas
    refresh();
    setShowWizard(false);
    setCitaSeleccionadaWizard(null);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case ESTADOS_CITA.ATENDIDA:
        return '#4CAF50';
      case ESTADOS_CITA.PENDIENTE:
        return '#FF9800';
      case ESTADOS_CITA.NO_ASISTIDA:
        return '#F44336';
      case ESTADOS_CITA.REPROGRAMADA:
        return '#2196F3';
      case ESTADOS_CITA.CANCELADA:
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case ESTADOS_CITA.ATENDIDA:
        return 'Atendida';
      case ESTADOS_CITA.PENDIENTE:
        return 'Pendiente';
      case ESTADOS_CITA.NO_ASISTIDA:
        return 'No Asistida';
      case ESTADOS_CITA.REPROGRAMADA:
        return 'Reprogramada';
      case ESTADOS_CITA.CANCELADA:
        return 'Cancelada';
      default:
        return estado || 'Desconocido';
    }
  };

  const aplicarFiltros = () => {
    // Los filtros se aplican automáticamente en el hook
    setShowFiltersModal(false);
  };

  const limpiarFiltros = () => {
    // Solo limpiar filtros de admin si es admin
    if (userRole === 'Admin' || userRole === 'admin') {
      setFilterDoctor(null);
      setFilterModulo(null);
    }
    setFilterFechaDesde(null);
    setFilterFechaHasta(null);
    setShowFiltersModal(false);
  };

  // Abrir modal para cambiar estado
  const handleCambiarEstado = (cita) => {
    setCitaSeleccionada(cita);
    setNuevoEstado(cita.estado || ESTADOS_CITA.PENDIENTE);
    setShowEstadoModal(true);
  };

  // Actualizar estado de cita
  const handleActualizarEstado = async () => {
    if (!citaSeleccionada || !nuevoEstado) {
      Alert.alert('Error', 'Por favor, selecciona un estado');
      return;
    }

    try {
      setActualizando(true);
      const citaId = citaSeleccionada.id_cita || citaSeleccionada.id;
      const response = await gestionService.updateEstadoCita(citaId, nuevoEstado);

      if (response.success) {
        Alert.alert('Éxito', 'Estado actualizado exitosamente');
        setShowEstadoModal(false);
        setCitaSeleccionada(null);
        await refresh();
      } else {
        Alert.alert('Error', response.error || 'No se pudo actualizar el estado');
      }
    } catch (error) {
      Logger.error('VerTodasCitas: Error actualizando estado', error);
      Alert.alert('Error', 'No se pudo actualizar el estado. Intenta de nuevo.');
    } finally {
      setActualizando(false);
    }
  };

  // Abrir modal para reprogramar
  const handleReprogramar = (cita) => {
    setCitaSeleccionada(cita);
    setFechaReprogramada('');
    setMotivoReprogramacion('');
    setShowReprogramarModal(true);
  };

  // Reprogramar cita
  const handleEnviarReprogramacion = async () => {
    if (!citaSeleccionada || !fechaReprogramada) {
      Alert.alert('Error', 'Por favor, selecciona una fecha para reprogramar');
      return;
    }

    try {
      setActualizando(true);
      const citaId = citaSeleccionada.id_cita || citaSeleccionada.id;
      const response = await gestionService.reprogramarCita(
        citaId,
        fechaReprogramada,
        motivoReprogramacion.trim() || ''
      );

      if (response.success) {
        Alert.alert('Éxito', 'Cita reprogramada exitosamente');
        setShowReprogramarModal(false);
        setCitaSeleccionada(null);
        setFechaReprogramada('');
        setMotivoReprogramacion('');
        await refresh();
      } else {
        Alert.alert('Error', response.error || 'No se pudo reprogramar la cita');
      }
    } catch (error) {
      Logger.error('VerTodasCitas: Error reprogramando cita', error);
      Alert.alert('Error', 'No se pudo reprogramar la cita. Intenta de nuevo.');
    } finally {
      setActualizando(false);
    }
  };

  // Manejar errores
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error al cargar las citas</Text>
          <Text style={styles.errorDetails}>{error.message || 'Error desconocido'}</Text>
          <Button mode="contained" onPress={handleRefresh} style={styles.retryButton}>
            Reintentar
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>📅 Todas las Citas</Text>
            <Text style={styles.headerSubtitle}>{total} citas en el sistema</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.filtrosTextButton}
              onPress={() => setShowFiltersModal(true)}
            >
              <Text style={styles.filtrosTextButtonText}>Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={
            (userRole === 'Doctor' || userRole === 'doctor') 
              ? "Buscar por paciente o motivo..." 
              : "Buscar por paciente, doctor o motivo..."
          }
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          showClearIcon={false}
        />
      </View>

      {/* Filtros Activos */}
      {(filterDoctor || filterModulo || filterFechaDesde || filterFechaHasta) && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersLabel}>Filtros activos:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterChipsContainer}>
              {filterDoctor && (userRole === 'Admin' || userRole === 'admin') && (
                <Chip 
                  style={styles.filterChip}
                  onClose={() => setFilterDoctor(null)}
                >
                  <Text>Doctor: {(() => {
                    const doc = doctores.find(d => d.id_doctor === filterDoctor);
                    if (!doc) return 'ID ' + filterDoctor;
                    return `${doc.nombre} ${doc.apellido_paterno || ''}`.trim();
                  })()}</Text>
                </Chip>
              )}
              {filterModulo && (userRole === 'Admin' || userRole === 'admin') && (
                <Chip 
                  style={styles.filterChip}
                  onClose={() => setFilterModulo(null)}
                >
                  <Text>Módulo: {modulos.find(m => m.id_modulo === filterModulo)?.nombre_modulo || 'ID ' + filterModulo}</Text>
                </Chip>
              )}
              {filterFechaDesde && (
                <Chip 
                  style={styles.filterChip}
                  onClose={() => setFilterFechaDesde(null)}
                >
                  <Text>Desde: {filterFechaDesde}</Text>
                </Chip>
              )}
              {filterFechaHasta && (
                <Chip 
                  style={styles.filterChip}
                  onClose={() => setFilterFechaHasta(null)}
                >
                  <Text>Hasta: {filterFechaHasta}</Text>
                </Chip>
              )}
            </View>
          </ScrollView>
          <TouchableOpacity onPress={limpiarFiltros} style={styles.clearFiltersButton}>
            <Text style={styles.clearFiltersText}>Limpiar todo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cita Destacada - Se muestra cuando viene desde otra pantalla con highlightCitaId */}
      {loadingCitaDestacada && (
        <View style={styles.citaDestacadaLoading}>
          <ActivityIndicator size="small" color="#2196F3" />
          <Text style={styles.citaDestacadaLoadingText}>Cargando cita seleccionada...</Text>
        </View>
      )}
      
      {citaDestacada && !loadingCitaDestacada && (
        <View style={styles.citaDestacadaContainer}>
          <View style={styles.citaDestacadaHeader}>
            <Text style={styles.citaDestacadaTitle}>📌 Cita Seleccionada</Text>
            <TouchableOpacity 
              onPress={() => {
                setCitaDestacada(null);
                setCitaResaltada(null);
              }}
              style={styles.citaDestacadaCloseButton}
            >
              <Text style={styles.citaDestacadaCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Card style={styles.citaDestacadaCard}>
            <TouchableOpacity 
              onPress={() => handleVerDetalle(citaDestacada)}
              activeOpacity={0.7}
            >
              <Card.Content>
                <View style={styles.citaHeader}>
                  <View style={styles.citaTitleContainer}>
                    <Text style={styles.citaTitle}>
                      👤 {citaDestacada.paciente_nombre}
                    </Text>
                    <Chip 
                      style={[
                        styles.estadoChip,
                        { backgroundColor: getEstadoColor(citaDestacada.estado) }
                      ]}
                      textStyle={styles.estadoChipText}
                    >
                      <Text>{getEstadoTexto(citaDestacada.estado)}</Text>
                    </Chip>
                  </View>
                </View>
                <View style={styles.citaInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>👨‍⚕️</Text>
                    <Text style={styles.infoText}>{citaDestacada.doctor_nombre}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>📅</Text>
                    <Text style={styles.infoText}>{formatDateTime(citaDestacada.fecha_cita)}</Text>
                  </View>
                  {citaDestacada.motivo && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>📝</Text>
                      <Text style={styles.infoText} numberOfLines={2}>{citaDestacada.motivo}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.citaActions}>
                  <Button
                    mode="contained"
                    onPress={() => handleVerDetalle(citaDestacada)}
                    style={styles.actionButton}
                    buttonColor="#2196F3"
                    compact
                  >
                    Ver Detalle
                  </Button>
                </View>
              </Card.Content>
            </TouchableOpacity>
          </Card>
        </View>
      )}

      {/* Lista de Citas con Infinite Scroll */}
      {isLoadingData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando citas...</Text>
        </View>
      ) : (
        <FlatList
          ref={scrollViewRef}
          style={styles.scrollView}
          data={filteredCitas}
          keyExtractor={(item) => String(item.id_cita || item.id)}
          renderItem={({ item: cita }) => {
            // Comparación robusta de IDs (manejar string vs number)
            const estaResaltada = citaResaltada && (() => {
              const citaId = typeof (cita.id_cita || cita.id) === 'string' 
                ? parseInt(cita.id_cita || cita.id) 
                : (cita.id_cita || cita.id);
              const resaltadaId = typeof citaResaltada === 'string' 
                ? parseInt(citaResaltada) 
                : citaResaltada;
              return citaId === resaltadaId;
            })();
            
            return (
              <Card style={[
                styles.citaCard,
                estaResaltada && styles.citaCardResaltada
              ]}>
                <TouchableOpacity 
                  onPress={() => handleVerDetalle(cita)}
                  activeOpacity={0.7}
                >
                  <Card.Content>
                    {/* Header de la cita */}
                    <View style={styles.citaHeader}>
                      <View style={styles.citaTitleContainer}>
                        <Text style={styles.citaTitle}>
                          👤 {cita.paciente_nombre}
                        </Text>
                        <Chip 
                          style={[
                            styles.estadoChip,
                            { backgroundColor: getEstadoColor(cita.estado) }
                          ]}
                          textStyle={styles.estadoChipText}
                        >
                          <Text>{getEstadoTexto(cita.estado)}</Text>
                        </Chip>
                      </View>
                      {cita.es_primera_consulta && (
                        <Chip 
                          style={styles.primeraConsultaChip}
                          textStyle={styles.primeraConsultaText}
                        >
                          Primera Consulta
                        </Chip>
                      )}
                    </View>

                    {/* Información adicional */}
                    <View style={styles.citaInfo}>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>👨‍⚕️</Text>
                        <Text 
                          style={styles.infoText}
                          onPress={() => handleVerDetalleDoctor(cita)}
                        >
                          {cita.doctor_nombre}
                        </Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <Text style={styles.infoIcon}>📅</Text>
                        <Text style={styles.infoText}>
                          {formatDateTime(cita.fecha_cita)}
                        </Text>
                      </View>
                      
                      {cita.motivo && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoIcon}>🩺</Text>
                          <Text style={styles.infoText}>{cita.motivo}</Text>
                        </View>
                      )}
                    </View>

                    {/* Observaciones si existen */}
                    {cita.observaciones && (
                      <View style={styles.observacionesContainer}>
                        <Text style={styles.observacionesLabel}>📝 Observaciones:</Text>
                        <Text style={styles.observacionesText}>
                          {cita.observaciones}
                        </Text>
                      </View>
                    )}
                  </Card.Content>
                </TouchableOpacity>

                {/* Botones de acción para doctores/admin */}
                <View style={styles.accionesContainer}>
                  {/* Fila 1: Botón Completar (si está pendiente) */}
                  {cita.estado === 'pendiente' && (
                    <View style={styles.accionesFila1}>
                      <TouchableOpacity
                        onPress={() => handleOpenWizard(cita)}
                        activeOpacity={0.7}
                        style={[styles.accionButtonFull, styles.accionButtonTouchable, { backgroundColor: '#4CAF50' }]}
                      >
                        <Text style={[styles.accionButtonText, { color: '#FFFFFF' }]}>
                          Completar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {/* Fila 2: Cambiar Estado y Reprogramar */}
                  <View style={styles.accionesFila2}>
                    <TouchableOpacity
                      onPress={() => handleCambiarEstado(cita)}
                      activeOpacity={0.7}
                      style={[styles.accionButtonHalf, styles.accionButtonTouchable, styles.accionButtonOutlined]}
                    >
                      <Text style={styles.accionButtonText}>
                        Cambiar Estado
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleReprogramar(cita)}
                      activeOpacity={0.7}
                      style={[styles.accionButtonHalf, styles.accionButtonTouchable, styles.accionButtonOutlined]}
                    >
                      <Text style={styles.accionButtonText}>
                        Reprogramar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          }}
          // Pull-to-refresh
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          // Infinite scroll
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          // Footer con indicador de carga
          ListFooterComponent={() => (
            loadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.loadingMoreText}>Cargando más citas...</Text>
              </View>
            ) : hasMore && filteredCitas.length > 0 ? (
              <View style={styles.loadingMoreContainer}>
                <Text style={styles.scrollHintText}>Desliza para cargar más</Text>
              </View>
            ) : filteredCitas.length > 0 ? (
              <View style={styles.endOfListContainer}>
                <Text style={styles.endOfListText}>
                  Has llegado al final ({total} citas en total)
                </Text>
              </View>
            ) : null
          )}
          // Lista vacía
          ListEmptyComponent={() => (
            hasLoadedOnce ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>📅</Text>
                <Text style={styles.emptyText}>No hay citas para mostrar</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Intenta con otros términos de búsqueda' : 'Aún no hay citas registradas en el sistema'}
                </Text>
              </View>
            ) : null
          )}
          // Optimizaciones de rendimiento
          removeClippedSubviews={true}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          // Layout aproximado para scroll (mejora scrollToIndex)
          getItemLayout={(data, index) => ({
            length: 250, // altura aproximada de cada card
            offset: 250 * index,
            index
          })}
          // Manejar error de scrollToIndex
          onScrollToIndexFailed={(info) => {
            const wait = new Promise(resolve => setTimeout(resolve, 300));
            wait.then(() => {
              if (scrollViewRef.current && filteredCitas.length > 0) {
                scrollViewRef.current.scrollToIndex({ 
                  index: Math.min(info.index, filteredCitas.length - 1), 
                  animated: true 
                });
              }
            });
          }}
          // Contenido superior (padding)
          contentContainerStyle={filteredCitas.length === 0 ? styles.emptyListContainer : undefined}
        />
      )}

      {/* Modal de Filtros */}
      <Modal
        visible={showFiltersModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFiltersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>🔍 Filtros</Title>
              <TouchableOpacity
                onPress={() => setShowFiltersModal(false)}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {/* Filtro por Doctor - Solo para Admin */}
              {(userRole === 'Admin' || userRole === 'admin') && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Doctor</Text>
                  <TouchableOpacity
                    style={styles.doctorDropdownSelector}
                    onPress={() => setShowDoctorDropdown(!showDoctorDropdown)}
                  >
                    <Text style={[
                      styles.doctorDropdownText,
                      !filterDoctor && styles.doctorDropdownPlaceholder
                    ]}>
                      {filterDoctor 
                        ? (() => {
                            const doc = doctores.find(d => d.id_doctor === filterDoctor);
                            if (!doc) return 'Doctor seleccionado';
                            const nombreCompleto = `${doc.nombre} ${doc.apellido_paterno || ''} ${doc.apellido_materno || ''}`.trim();
                            const modulo = doc.Modulo?.nombre_modulo || doc.modulo || '';
                            return modulo ? `${nombreCompleto} - ${modulo}` : nombreCompleto;
                          })()
                        : 'Todos los doctores'}
                    </Text>
                    <Text style={styles.dropdownArrow}>
                      {showDoctorDropdown ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>
                  {showDoctorDropdown && (
                    <View style={styles.doctorDropdownList}>
                      <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                        <TouchableOpacity
                          style={[
                            styles.doctorDropdownItem,
                            filterDoctor === null && styles.doctorDropdownItemSelected
                          ]}
                          onPress={() => {
                            setFilterDoctor(null);
                            setShowDoctorDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.doctorDropdownItemText,
                            filterDoctor === null && styles.doctorDropdownItemTextSelected
                          ]}>
                            Todos los doctores
                          </Text>
                        </TouchableOpacity>
                        {doctores.map((doctor) => {
                          const nombreCompleto = `${doctor.nombre} ${doctor.apellido_paterno || ''} ${doctor.apellido_materno || ''}`.trim();
                          const modulo = doctor.Modulo?.nombre_modulo || doctor.modulo || '';
                          return (
                            <TouchableOpacity
                              key={doctor.id_doctor}
                              style={[
                                styles.doctorDropdownItem,
                                filterDoctor === doctor.id_doctor && styles.doctorDropdownItemSelected
                              ]}
                              onPress={() => {
                                setFilterDoctor(doctor.id_doctor);
                                setShowDoctorDropdown(false);
                              }}
                            >
                              <Text style={[
                                styles.doctorDropdownItemText,
                                filterDoctor === doctor.id_doctor && styles.doctorDropdownItemTextSelected
                              ]}>
                                {modulo ? `${nombreCompleto} - ${modulo}` : nombreCompleto}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {/* Filtro por Módulo - Solo para Admin */}
              {(userRole === 'Admin' || userRole === 'admin') && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterLabel}>Módulo</Text>
                  <TouchableOpacity
                    style={styles.doctorDropdownSelector}
                    onPress={() => setShowModuloDropdown(!showModuloDropdown)}
                  >
                    <Text style={[
                      styles.doctorDropdownText,
                      !filterModulo && styles.doctorDropdownPlaceholder
                    ]}>
                      {filterModulo 
                        ? modulos.find(m => m.id_modulo === filterModulo)?.nombre_modulo || 'Módulo seleccionado'
                        : 'Todos los módulos'}
                    </Text>
                    <Text style={styles.dropdownArrow}>
                      {showModuloDropdown ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>
                  {showModuloDropdown && (
                    <View style={styles.doctorDropdownList}>
                      <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                        <TouchableOpacity
                          style={[
                            styles.doctorDropdownItem,
                            filterModulo === null && styles.doctorDropdownItemSelected
                          ]}
                          onPress={() => {
                            setFilterModulo(null);
                            setShowModuloDropdown(false);
                          }}
                        >
                          <Text style={[
                            styles.doctorDropdownItemText,
                            filterModulo === null && styles.doctorDropdownItemTextSelected
                          ]}>
                            Todos los módulos
                          </Text>
                        </TouchableOpacity>
                        {modulos.map((mod) => (
                          <TouchableOpacity
                            key={mod.id_modulo}
                            style={[
                              styles.doctorDropdownItem,
                              filterModulo === mod.id_modulo && styles.doctorDropdownItemSelected
                            ]}
                            onPress={() => {
                              setFilterModulo(mod.id_modulo);
                              setShowModuloDropdown(false);
                            }}
                          >
                            <Text style={[
                              styles.doctorDropdownItemText,
                              filterModulo === mod.id_modulo && styles.doctorDropdownItemTextSelected
                            ]}>
                              {mod.nombre_modulo}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}

              {/* Filtro por Fecha */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Fecha Desde</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  value={filterFechaDesde}
                  onChangeText={setFilterFechaDesde}
                />
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Fecha Hasta</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD"
                  value={filterFechaHasta}
                  onChangeText={setFilterFechaHasta}
                />
              </View>

              {/* Botones */}
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={limpiarFiltros}
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  Limpiar
                </Button>
                <Button
                  mode="contained"
                  onPress={aplicarFiltros}
                  style={[styles.modalButton, styles.applyButton]}
                  buttonColor="#2196F3"
                >
                  Aplicar
                </Button>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para cambiar estado */}
      <Modal
        visible={showEstadoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEstadoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>📋 Cambiar Estado</Title>
              <TouchableOpacity
                onPress={() => setShowEstadoModal(false)}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
            >
              {citaSeleccionada && (
                <View style={styles.modalCitaInfo}>
                  <Text style={styles.modalCitaInfoText}>
                    👤 {citaSeleccionada.paciente_nombre}
                  </Text>
                  <Text style={styles.modalCitaInfoText}>
                    📅 {formatDateTime(citaSeleccionada.fecha_cita)}
                  </Text>
                  <Text style={styles.modalCitaInfoText}>
                    Estado actual: {getEstadoTexto(citaSeleccionada.estado)}
                  </Text>
                </View>
              )}

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Nuevo Estado *</Text>
                <View style={styles.estadosContainer}>
                  {Object.values(ESTADOS_CITA)
                    .filter(estado => estado !== ESTADOS_CITA.REPROGRAMADA && estado !== ESTADOS_CITA.CANCELADA)
                    .map((estado) => (
                      <TouchableOpacity
                        key={estado}
                        style={[
                          styles.estadoOption,
                          nuevoEstado === estado && styles.estadoOptionActive,
                          { backgroundColor: nuevoEstado === estado ? getEstadoColor(estado) : '#E0E0E0' }
                        ]}
                        onPress={() => setNuevoEstado(estado)}
                      >
                        <Text
                          style={[
                            styles.estadoOptionText,
                            nuevoEstado === estado && styles.estadoOptionTextActive
                          ]}
                        >
                          {getEstadoTexto(estado)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            </ScrollView>

            {/* Botones de acción fuera del ScrollView - Siempre visibles */}
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setShowEstadoModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
                disabled={actualizando}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleActualizarEstado}
                style={[styles.modalButton, styles.applyButton]}
                buttonColor="#4CAF50"
                loading={actualizando}
                disabled={actualizando || !nuevoEstado}
              >
                Actualizar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para reprogramar */}
      <Modal
        visible={showReprogramarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReprogramarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Title style={styles.modalTitle}>🔄 Reprogramar Cita</Title>
              <TouchableOpacity
                onPress={() => setShowReprogramarModal(false)}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
            >
              {citaSeleccionada && (
                <View style={styles.modalCitaInfo}>
                  <Text style={styles.modalCitaInfoText}>
                    👤 {citaSeleccionada.paciente_nombre}
                  </Text>
                  <Text style={styles.modalCitaInfoText}>
                    📅 Fecha actual: {formatDateTime(citaSeleccionada.fecha_cita)}
                  </Text>
                </View>
              )}

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Nueva Fecha y Hora *</Text>
                <DateTimePickerButton
                  value={fechaReprogramada}
                  onDateChange={setFechaReprogramada}
                  label="Seleccionar fecha y hora"
                  minimumDate={new Date()}
                />
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Motivo (opcional)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  placeholder="Ej: Cambio de horario por disponibilidad..."
                  value={motivoReprogramacion}
                  onChangeText={setMotivoReprogramacion}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            {/* Botones de acción fuera del ScrollView - Siempre visibles */}
            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setShowReprogramarModal(false)}
                style={[styles.modalButton, styles.cancelButton]}
                disabled={actualizando}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleEnviarReprogramacion}
                style={[styles.modalButton, styles.applyButton]}
                buttonColor="#2196F3"
                loading={actualizando}
                disabled={actualizando || !fechaReprogramada}
              >
                Reprogramar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ Modal Wizard para Completar Cita */}
      <CompletarCitaWizard
        visible={showWizard}
        onClose={() => {
          setShowWizard(false);
          setCitaSeleccionadaWizard(null);
        }}
        cita={citaSeleccionadaWizard}
        onSuccess={handleWizardSuccess}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#666',
  },
  scrollHintText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  endOfListContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
  },
  endOfListText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorDetails: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    marginTop: 10,
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 4,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 1,
  },
  activeFilters: {
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#1976D2',
    marginBottom: 8,
    fontWeight: '600',
  },
  filterChipsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  clearFiltersButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  citaCard: {
    margin: 12,
    marginVertical: 6,
    elevation: 2,
  },
  citaCardResaltada: {
    borderWidth: 3,
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
    elevation: 4,
  },
  // Estilos para cita destacada
  citaDestacadaContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  citaDestacadaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  citaDestacadaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  citaDestacadaCloseButton: {
    padding: 4,
  },
  citaDestacadaCloseText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  citaDestacadaCard: {
    borderRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  citaDestacadaLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  citaDestacadaLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  citaHeader: {
    marginBottom: 12,
  },
  citaTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  citaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  estadoChip: {
    paddingHorizontal: 8,
  },
  estadoChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  primeraConsultaChip: {
    backgroundColor: '#E1F5FE',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  primeraConsultaText: {
    color: '#0277BD',
    fontSize: 11,
  },
  citaInfo: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  observacionesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  observacionesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  observacionesText: {
    fontSize: 13,
    color: '#333',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  doctoresList: {
    flexDirection: 'row',
  },
  doctorChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  doctorChipActive: {
    backgroundColor: '#2196F3',
  },
  doctorChipText: {
    color: '#666',
    fontSize: 14,
  },
  doctorChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  doctorDropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  doctorDropdownText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  doctorDropdownPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  doctorDropdownList: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  doctorDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  doctorDropdownItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  doctorDropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  doctorDropdownItemTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filtrosTextButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filtrosTextButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 8,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  cancelButton: {
    borderColor: '#999',
  },
  applyButton: {
    backgroundColor: '#2196F3',
  },
  closeButtonX: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    textAlign: 'center',
  },
  accionesContainer: {
    marginTop: 12,
    gap: 8,
  },
  accionesFila1: {
    width: '100%',
  },
  accionesFila2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  accionButtonFull: {
    width: '100%',
  },
  accionButtonHalf: {
    flex: 1,
  },
  accionButtonTouchable: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  accionButtonOutlined: {
    borderWidth: 1,
    borderColor: '#2196F3',
    backgroundColor: 'transparent',
  },
  accionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
  },
  accionButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 2,
  },
  modalCitaInfo: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  modalCitaInfoText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  estadosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  estadoOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  estadoOptionActive: {
    elevation: 2,
  },
  estadoOptionText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  estadoOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    backgroundColor: '#FFFFFF',
  },
});

export default VerTodasCitas;
