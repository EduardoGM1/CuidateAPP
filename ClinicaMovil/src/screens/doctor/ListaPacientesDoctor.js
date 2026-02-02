/**
 * Pantalla: Lista de Pacientes del Doctor
 * 
 * Muestra todos los pacientes asignados al doctor actual.
 * Incluye búsqueda, filtros y navegación a detalle de paciente.
 * 
 * @author Senior Developer
 * @date 2025-11-16
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Searchbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import gestionService from '../../api/gestionService';
import { usePacientes } from '../../hooks/useGestion';
import useDebounce from '../../hooks/useDebounce';
import { formatDate } from '../../utils/dateUtils';
import { COLORES } from '../../utils/constantes';
import { listActionButtonStyles } from '../../utils/sharedStyles';

const ListaPacientesDoctor = ({ navigation }) => {
  const { userData, userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pacienteFilter, setPacienteFilter] = useState('activos'); // 'activos', 'inactivos', 'todos'
  /** Filtro por comorbilidad: null = todas, number = id_comorbilidad (desde BD) */
  const [comorbilidadFilterId, setComorbilidadFilterId] = useState(null);
  const [dateFilter, setDateFilter] = useState('recent'); // 'recent', 'oldest'
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showComorbilidadDropdown, setShowComorbilidadDropdown] = useState(false);
  const [comorbilidadesCatalog, setComorbilidadesCatalog] = useState([]);
  const [loadingComorbilidadesCatalog, setLoadingComorbilidadesCatalog] = useState(false);

  // Validar que solo doctores puedan acceder
  useEffect(() => {
    if (userRole !== 'Doctor' && userRole !== 'doctor') {
      Logger.warn('Acceso no autorizado a ListaPacientesDoctor', { userRole });
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    }
  }, [userRole, navigation]);

  // Cargar catálogo de comorbilidades desde BD (para dropdown de filtros)
  useEffect(() => {
    if (!showFiltersModal) return;
    let cancelled = false;
    setLoadingComorbilidadesCatalog(true);
    gestionService.getComorbilidadesCatalogForFilter()
      .then((list) => {
        if (!cancelled) setComorbilidadesCatalog(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!cancelled) {
          Logger.error('ListaPacientesDoctor: Error cargando catálogo de comorbilidades', err);
          setComorbilidadesCatalog([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingComorbilidadesCatalog(false);
      });
    return () => { cancelled = true; };
  }, [showFiltersModal]);

  // Hook para pacientes (ya filtra por doctor automáticamente en el backend)
  const { 
    pacientes, 
    loading: pacientesLoading, 
    error: pacientesError,
    refresh: refreshPacientes 
  } = usePacientes(pacienteFilter, dateFilter, comorbilidadFilterId == null ? 'todas' : String(comorbilidadFilterId));

  // Debounce para búsqueda (300ms de delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filtrar pacientes cuando cambien los datos, búsqueda o filtros
  useEffect(() => {
    if (!pacientes || !Array.isArray(pacientes)) {
      setFilteredPacientes([]);
      return;
    }

    const sanitizedQuery = debouncedSearchQuery.trim().toLowerCase();
    
    let filtered = pacientes;
    
    // Aplicar filtro de búsqueda si existe
    if (sanitizedQuery !== '') {
      filtered = pacientes.filter(paciente => {
        if (!paciente || typeof paciente !== 'object') return false;
        
        const nombre = paciente.nombre || '';
        const apellido = `${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''}`.trim();
        const nombreCompleto = paciente.nombreCompleto || `${nombre} ${apellido}`.trim();
        const curp = paciente.curp || '';
        const telefono = paciente.numero_celular || '';
        
        return nombreCompleto.toLowerCase().includes(sanitizedQuery) ||
               curp.toLowerCase().includes(sanitizedQuery) ||
               telefono.includes(sanitizedQuery);
      });
    }
    
    setFilteredPacientes(filtered);
    Logger.debug('ListaPacientesDoctor: Filtros aplicados', { 
      total: pacientes.length,
      filtrados: filtered.length,
      query: sanitizedQuery
    });
  }, [pacientes, debouncedSearchQuery]);

  // Forzar actualización cuando cambien los filtros
  useEffect(() => {
    Logger.info('Filtros cambiados, forzando actualización', { 
      pacienteFilter,
      comorbilidadFilterId,
      dateFilter 
    });
    refreshPacientes();
  }, [pacienteFilter, comorbilidadFilterId, dateFilter, refreshPacientes]);

  // Función para refrescar datos
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshPacientes();
      Logger.info('ListaPacientesDoctor: Datos refrescados exitosamente');
    } catch (error) {
      Logger.error('Error refrescando datos', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshPacientes]);

  // Refrescar datos cuando el usuario regrese a la pantalla
  useFocusEffect(
    useCallback(() => {
      Logger.info('ListaPacientesDoctor: Pantalla enfocada, refrescando datos');
      refreshPacientes();
    }, [refreshPacientes])
  );

  // Navegar a detalle de paciente
  const handleViewPatient = useCallback((paciente) => {
    if (!paciente) {
      Logger.error('handleViewPatient: Paciente es null o undefined');
      Alert.alert('Error', 'No se pudo cargar la información del paciente');
      return;
    }

    const pacienteId = paciente.id_paciente || paciente.id;
    
    if (!pacienteId) {
      Logger.error('handleViewPatient: Paciente sin ID válido', { paciente });
      Alert.alert('Error', 'Información del paciente incompleta');
      return;
    }

    const pacienteData = {
      id_paciente: pacienteId,
      id: pacienteId,
      nombre: paciente.nombre || paciente.nombre_completo?.split(' ')[0] || 'Sin nombre',
      apellido_paterno: paciente.apellido_paterno || paciente.nombre_completo?.split(' ')[1] || '',
      apellido_materno: paciente.apellido_materno || ''
    };

    Logger.navigation('ListaPacientesDoctor', 'DetallePaciente', { 
      pacienteId: pacienteData.id_paciente
    });
    
    try {
      navigation.navigate('DetallePaciente', { paciente: pacienteData });
    } catch (error) {
      Logger.error('Error navegando a DetallePaciente', error);
      Alert.alert('Error', 'No se pudo abrir los detalles del paciente');
    }
  }, [navigation]);

  // Renderizar card de paciente
  const renderPatientCard = useCallback(({ item: paciente }) => {
    if (!paciente) return null;

    const pacienteId = paciente.id_paciente || paciente.id;
    if (!pacienteId) return null;

    return (
      <Card style={[styles.card, !paciente.activo && styles.inactiveCard]}>
        <Card.Content>
          <TouchableOpacity 
            onPress={() => handleViewPatient(paciente)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <View style={styles.titleRow}>
                  <Title style={[styles.cardTitle, !paciente.activo && styles.inactiveText]}>
                    {paciente.nombreCompleto || `${paciente.nombre} ${paciente.apellido_paterno}`.trim()}
                  </Title>
                  <View style={[styles.statusBadge, paciente.activo ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={styles.statusText}>
                      {paciente.activo ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardSubtitle, !paciente.activo && styles.inactiveText]}>
                  {paciente.sexo === 'Mujer' ? '👩' : '👨'} • {paciente.edad || 'N/A'} años
                </Text>
              </View>
            </View>
            
            <View style={styles.cardDetails}>
              {paciente.numero_celular && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📱 Teléfono:</Text>
                  <Text style={[styles.detailValue, !paciente.activo && styles.inactiveText]}>
                    {paciente.numero_celular}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>🏥 Institución:</Text>
                <Text style={[styles.detailValue, !paciente.activo && styles.inactiveText]}>
                  {paciente.institucion_salud || 'No especificada'}
                </Text>
              </View>
              {paciente.fecha_registro && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📅 Registro:</Text>
                  <Text style={[styles.detailValue, !paciente.activo && styles.inactiveText]}>
                    {formatDate(new Date(paciente.fecha_registro))}
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={styles.pressHint}>
              Presiona para más detalles del paciente
            </Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>
    );
  }, [handleViewPatient]);

  // Key extractor para FlatList
  const keyExtractor = useCallback((item, index) => {
    return item.id_paciente?.toString() || item.id?.toString() || `paciente-${index}`;
  }, []);

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
        <View style={styles.headerTop}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>👥 Mis Pacientes</Text>
            <Text style={styles.headerSubtitle}>
              {filteredPacientes.length} paciente{filteredPacientes.length !== 1 ? 's' : ''} asignado{filteredPacientes.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={listActionButtonStyles.filtersButton}
            onPress={() => {
              Logger.navigation('ListaPacientesDoctor', 'AgregarPaciente');
              navigation.navigate('AgregarPaciente');
            }}
            activeOpacity={0.7}
          >
            <Text style={listActionButtonStyles.filtersButtonIcon}>➕</Text>
            <Text style={listActionButtonStyles.filtersButtonText}>Nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de búsqueda y botón de filtros */}
      <View style={listActionButtonStyles.buttonsContainer}>
        <Searchbar
          placeholder="Buscar por nombre, CURP o teléfono..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <TouchableOpacity
          style={listActionButtonStyles.filtersButton}
          onPress={() => setShowFiltersModal(true)}
          activeOpacity={0.7}
        >
          <Text style={listActionButtonStyles.filtersButtonIcon}>🔍</Text>
          <Text style={listActionButtonStyles.filtersButtonText}>Filtros</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de pacientes */}
      {pacientesLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.NAV_PRIMARIO} />
          <Text style={styles.loadingText}>Cargando pacientes...</Text>
        </View>
      ) : pacientesError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {pacientesError?.message || 'Error al cargar pacientes'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : filteredPacientes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery.trim() !== '' 
              ? 'No se encontraron pacientes con ese criterio de búsqueda'
              : 'No tienes pacientes asignados'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPacientes}
          renderItem={renderPatientCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORES.NAV_PRIMARIO]}
              tintColor={COLORES.NAV_PRIMARIO}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal de Filtros */}
      <Modal
        visible={showFiltersModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowFiltersModal(false);
          setShowComorbilidadDropdown(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔧 Filtros Disponibles</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowFiltersModal(false);
                  setShowComorbilidadDropdown(false);
                }}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>👥 Filtros de Pacientes</Text>
                
                <Text style={styles.filterSubtitle}>Estado:</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      pacienteFilter === 'activos' && styles.activeFilterOption
                    ]}
                    onPress={() => setPacienteFilter('activos')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      pacienteFilter === 'activos' && styles.activeFilterOptionText
                    ]}>
                      ✅ Activos
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      pacienteFilter === 'inactivos' && styles.activeFilterOption
                    ]}
                    onPress={() => setPacienteFilter('inactivos')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      pacienteFilter === 'inactivos' && styles.activeFilterOptionText
                    ]}>
                      ❌ Inactivos
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      pacienteFilter === 'todos' && styles.activeFilterOption
                    ]}
                    onPress={() => setPacienteFilter('todos')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      pacienteFilter === 'todos' && styles.activeFilterOptionText
                    ]}>
                      👥 Todos
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.filterSubtitle}>Filtrar por comorbilidad:</Text>
                <View style={styles.comorbilidadDropdownContainer}>
                  <TouchableOpacity
                    style={[
                      styles.comorbilidadDropdownSelector,
                      showComorbilidadDropdown && styles.comorbilidadDropdownSelectorOpen
                    ]}
                    onPress={() => setShowComorbilidadDropdown((v) => !v)}
                    activeOpacity={0.7}
                  >
                    {loadingComorbilidadesCatalog ? (
                      <Text style={styles.comorbilidadDropdownText}>Cargando...</Text>
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.comorbilidadDropdownText,
                            comorbilidadFilterId == null && styles.comorbilidadDropdownPlaceholder
                          ]}
                          numberOfLines={1}
                        >
                          {comorbilidadFilterId == null
                            ? '🏥 Todas las comorbilidades'
                            : (comorbilidadesCatalog.find((c) => c.id_comorbilidad === comorbilidadFilterId)?.nombre_comorbilidad ?? 'Comorbilidad')}
                        </Text>
                        <Text style={styles.comorbilidadDropdownArrow}>
                          {showComorbilidadDropdown ? '▲' : '▼'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {showComorbilidadDropdown && (
                    <View style={styles.comorbilidadDropdownList}>
                      <ScrollView
                        nestedScrollEnabled
                        style={styles.comorbilidadDropdownScroll}
                        keyboardShouldPersistTaps="handled"
                      >
                        <TouchableOpacity
                          style={[
                            styles.comorbilidadDropdownItem,
                            comorbilidadFilterId == null && styles.comorbilidadDropdownItemSelected
                          ]}
                          onPress={() => {
                            setComorbilidadFilterId(null);
                            setShowComorbilidadDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.comorbilidadDropdownItemText,
                              comorbilidadFilterId == null && styles.comorbilidadDropdownItemTextSelected
                            ]}
                          >
                            🏥 Todas las comorbilidades
                          </Text>
                        </TouchableOpacity>
                        {comorbilidadesCatalog.map((c) => {
                          const isSelected = comorbilidadFilterId === c.id_comorbilidad;
                          return (
                            <TouchableOpacity
                              key={c.id_comorbilidad}
                              style={[
                                styles.comorbilidadDropdownItem,
                                isSelected && styles.comorbilidadDropdownItemSelected
                              ]}
                              onPress={() => {
                                setComorbilidadFilterId(c.id_comorbilidad);
                                setShowComorbilidadDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.comorbilidadDropdownItemText,
                                  isSelected && styles.comorbilidadDropdownItemTextSelected
                                ]}
                                numberOfLines={1}
                              >
                                {c.nombre_comorbilidad}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
                
                <Text style={styles.filterSubtitle}>Ordenar por fecha:</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      dateFilter === 'recent' && styles.activeFilterOption
                    ]}
                    onPress={() => setDateFilter('recent')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      dateFilter === 'recent' && styles.activeFilterOptionText
                    ]}>
                      ⬇️ Más Recientes Primero
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      dateFilter === 'oldest' && styles.activeFilterOption
                    ]}
                    onPress={() => setDateFilter('oldest')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      dateFilter === 'oldest' && styles.activeFilterOptionText
                    ]}>
                      ⬆️ Más Antiguos Primero
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setShowFiltersModal(false);
                  setShowComorbilidadDropdown(false);
                }}
              >
                <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: COLORES.NAV_PRIMARIO,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.TEXTO_EN_PRIMARIO,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORES.NAV_PRIMARIO_INACTIVO,
  },
  searchbar: {
    elevation: 2,
    flex: 1,
    marginRight: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORES.FONDO_OVERLAY,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORES.FONDO_CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.TEXTO_DISABLED,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
  },
  closeButtonX: {
    fontSize: 24,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 15,
  },
  filterSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    marginTop: 15,
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  filterOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    backgroundColor: COLORES.FONDO,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    marginRight: 10,
    marginBottom: 10,
  },
  activeFilterOption: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    borderColor: COLORES.NAV_PRIMARIO,
  },
  filterOptionText: {
    fontSize: 13,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '500',
  },
  activeFilterOptionText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontWeight: '600',
  },
  // Dropdown comorbilidad (catálogo desde BD)
  comorbilidadDropdownContainer: {
    marginBottom: 8,
  },
  comorbilidadDropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORES.FONDO,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  comorbilidadDropdownSelectorOpen: {
    borderColor: COLORES.NAV_PRIMARIO,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  comorbilidadDropdownText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  comorbilidadDropdownPlaceholder: {
    color: COLORES.TEXTO_SECUNDARIO,
  },
  comorbilidadDropdownArrow: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    marginLeft: 8,
  },
  comorbilidadDropdownList: {
    backgroundColor: COLORES.FONDO,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: COLORES.BORDE_CLARO,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    overflow: 'hidden',
  },
  comorbilidadDropdownScroll: {
    maxHeight: 220,
  },
  comorbilidadDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORES.BORDE_CLARO,
  },
  comorbilidadDropdownItemSelected: {
    backgroundColor: COLORES.NAV_PRIMARIO + '15',
  },
  comorbilidadDropdownItemText: {
    fontSize: 15,
    color: COLORES.TEXTO_PRIMARIO,
  },
  comorbilidadDropdownItemTextSelected: {
    fontWeight: '600',
    color: COLORES.NAV_PRIMARIO,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORES.BORDE_CLARO,
  },
  applyButton: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    minHeight: 48,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 15,
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
  inactiveCard: {
    opacity: 0.6,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleContainer: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
    marginRight: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  cardDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    marginRight: 8,
    minWidth: 100,
  },
  detailValue: {
    fontSize: 14,
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  inactiveText: {
    color: COLORES.TEXTO_SECUNDARIO,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activeBadge: {
    backgroundColor: COLORES.EXITO_LIGHT,
  },
  inactiveBadge: {
    backgroundColor: COLORES.SECUNDARIO_LIGHT,
  },
  statusText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 12,
    fontWeight: '600',
  },
  pressHint: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORES.BORDE_CLARO,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: COLORES.ERROR_LIGHT,
    marginBottom: 10,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 15,
    fontWeight: '600',
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
    color: COLORES.ERROR_LIGHT,
    marginBottom: 10,
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
});

export default ListaPacientesDoctor;

