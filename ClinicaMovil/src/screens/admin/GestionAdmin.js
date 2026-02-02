import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Paragraph, Searchbar, Button, IconButton } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import gestionService from '../../api/gestionService';
import { useDoctoresInfinite, usePacientesInfinite, clearDoctorCache } from '../../hooks/useGestion';
import useRealtimeList from '../../hooks/useRealtimeList';
import useWebSocket from '../../hooks/useWebSocket';
import useDebounce from '../../hooks/useDebounce';
import { COLORES } from '../../utils/constantes';
import { listActionButtonStyles } from '../../utils/sharedStyles';
import { formatDate } from '../../utils/dateUtils';

const GestionAdmin = ({ navigation }) => {
  const { userData, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState('doctores'); // 'doctores' o 'pacientes'
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDoctores, setFilteredDoctores] = useState([]);
  const [filteredPacientes, setFilteredPacientes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [doctorFilter, setDoctorFilter] = useState('activos'); // 'activos', 'inactivos', 'todos'
  const [pacienteFilter, setPacienteFilter] = useState('activos'); // 'activos', 'inactivos', 'todos'
  /** Filtro por comorbilidad: null = todas, number = id_comorbilidad (desde BD) */
  const [comorbilidadFilterId, setComorbilidadFilterId] = useState(null);
  const [dateFilter, setDateFilter] = useState('recent'); // 'recent', 'oldest'
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showEstadoDropdown, setShowEstadoDropdown] = useState(false);
  const [showDateSortDropdown, setShowDateSortDropdown] = useState(false);
  const [showComorbilidadDropdown, setShowComorbilidadDropdown] = useState(false);
  const [comorbilidadesCatalog, setComorbilidadesCatalog] = useState([]);
  const [loadingComorbilidadesCatalog, setLoadingComorbilidadesCatalog] = useState(false);
  /** Filtro por módulo: null = todos. Doctores y pacientes tienen su propio valor. */
  const [doctorModuloFilterId, setDoctorModuloFilterId] = useState(null);
  const [pacienteModuloFilterId, setPacienteModuloFilterId] = useState(null);
  const [showDoctorModuloDropdown, setShowDoctorModuloDropdown] = useState(false);
  const [showPacienteModuloDropdown, setShowPacienteModuloDropdown] = useState(false);
  const [modulosCatalog, setModulosCatalog] = useState([]);
  const [loadingModulosCatalog, setLoadingModulosCatalog] = useState(false);

  const ESTADO_OPCIONES = [
    { value: 'activos', label: '✅ Activos' },
    { value: 'inactivos', label: '❌ Inactivos' },
    { value: 'todos', label: '📋 Todos' }
  ];
  const ORDEN_FECHA_OPCIONES = [
    { value: 'recent', label: '⬇️ Más recientes primero' },
    { value: 'oldest', label: '⬆️ Más antiguos primero' }
  ];

  // Hooks para datos dinámicos con Infinite Scroll
  const { 
    doctores, 
    loading: doctoresLoading, 
    loadingMore: doctoresLoadingMore,
    error: doctoresError, 
    total: doctoresTotal,
    hasMore: doctoresHasMore,
    refresh: refreshDoctores,
    loadMore: loadMoreDoctores
  } = useDoctoresInfinite({ 
    estado: doctorFilter, 
    sort: dateFilter,
    modulo: doctorModuloFilterId == null ? null : String(doctorModuloFilterId),
    pageSize: 20
  });
  
  const { 
    pacientes, 
    loading: pacientesLoading, 
    loadingMore: pacientesLoadingMore,
    error: pacientesError, 
    total: pacientesTotal,
    hasMore: pacientesHasMore,
    refresh: refreshPacientes,
    loadMore: loadMorePacientes
  } = usePacientesInfinite({ 
    estado: pacienteFilter, 
    sort: dateFilter,
    comorbilidad: comorbilidadFilterId == null ? 'todas' : String(comorbilidadFilterId),
    modulo: pacienteModuloFilterId == null ? null : String(pacienteModuloFilterId),
    pageSize: 20
  });

  // Hooks para tiempo real
  const { isConnected } = useWebSocket();
  const realtimePacientes = useRealtimeList('patients', pacientes || []);
  const realtimeDoctores = useRealtimeList('doctors', doctores || []);

  // Debounce para búsqueda (300ms de delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Función para cambiar el filtro de fecha con validación
  const handleDateFilterChange = (filter) => {
    // Validar que el filtro sea válido
    if (!filter || !['recent', 'oldest'].includes(filter)) {
      Logger.warn('Filtro de fecha inválido', { filter });
      return;
    }
    
    setDateFilter(filter);
    setShowDateFilter(false);
    Logger.info('Filtro de fecha cambiado', { filter, activeTab });
  };

  // Función para alternar el filtro de fecha
  const toggleDateFilter = () => {
    const newFilter = dateFilter === 'recent' ? 'oldest' : 'recent';
    handleDateFilterChange(newFilter);
  };

  // Función para refrescar datos
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'doctores') {
        await refreshDoctores();
      } else {
        await refreshPacientes();
      }
    } catch (error) {
      Logger.error('Error refrescando datos', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Función de búsqueda segura con sanitización
  const sanitizeSearchQuery = (query) => {
    if (!query || typeof query !== 'string') return '';
    // Remover caracteres especiales que podrían causar problemas
    return query.trim().replace(/[<>]/g, '');
  };

  // Filtrar doctores cuando cambien los datos, búsqueda o filtros
  useEffect(() => {
    // Usar datos de tiempo real si están disponibles, sino usar datos normales
    const dataSource = realtimeDoctores.items && realtimeDoctores.items.length > 0 ? realtimeDoctores.items : doctores;
    
    if (!dataSource || !Array.isArray(dataSource)) return;
    
    const sanitizedQuery = sanitizeSearchQuery(debouncedSearchQuery);
    
    let filtered = dataSource;
    
    // Aplicar filtro de búsqueda si existe
    if (sanitizedQuery !== '') {
      filtered = dataSource.filter(doctor => {
        if (!doctor || typeof doctor !== 'object') return false;
        
        // Mapear campos correctos según BD para búsqueda
        const nombre = doctor.nombre || '';
        const apellido = `${doctor.apellido_paterno || ''} ${doctor.apellido_materno || ''}`.trim();
        const especialidad = doctor.grado_estudio || '';
        const modulo = doctor.modulo_nombre ? `Módulo ${doctor.id_modulo}` : 'Sin módulo';
        const email = doctor.email || '';
        const institucion = doctor.institucion_hospitalaria || '';
        
        const searchLower = sanitizedQuery.toLowerCase();
        
        return nombre.toLowerCase().includes(searchLower) ||
               apellido.toLowerCase().includes(searchLower) ||
               especialidad.toLowerCase().includes(searchLower) ||
               modulo.toLowerCase().includes(searchLower) ||
               email.toLowerCase().includes(searchLower) ||
               institucion.toLowerCase().includes(searchLower);
      });
    }
    
    Logger.info('Filtros aplicados a doctores', { 
      doctorFilter, 
      dateFilter, 
      searchQuery: sanitizedQuery,
      totalDoctores: dataSource.length,
      doctoresFiltrados: filtered.length 
    });
    
    setFilteredDoctores(filtered);
  }, [debouncedSearchQuery, doctores, realtimeDoctores.items, doctorFilter, dateFilter]);

  // Filtrar pacientes cuando cambien los datos, búsqueda o filtros
  useEffect(() => {
    // Usar datos de tiempo real si están disponibles, sino usar datos normales
    const dataSource = realtimePacientes.items && realtimePacientes.items.length > 0 ? realtimePacientes.items : pacientes;
    
    if (!dataSource || !Array.isArray(dataSource)) return;
    
    const sanitizedQuery = sanitizeSearchQuery(debouncedSearchQuery);
    
    let filtered = dataSource;
    
    // Aplicar filtro de búsqueda si existe
    if (sanitizedQuery !== '') {
      filtered = dataSource.filter(paciente => {
        if (!paciente || typeof paciente !== 'object') return false;
        
        const searchLower = sanitizedQuery.toLowerCase();
        
        return paciente.nombre?.toLowerCase().includes(searchLower) ||
               paciente.apellido?.toLowerCase().includes(searchLower) ||
               paciente.email?.toLowerCase().includes(searchLower) ||
               paciente.doctor_asignado?.toLowerCase().includes(searchLower);
      });
    }
    
    Logger.info('Filtros aplicados a pacientes', { 
      dateFilter, 
      searchQuery: sanitizedQuery,
      totalPacientes: dataSource.length,
      pacientesFiltrados: filtered.length 
    });
    
    setFilteredPacientes(filtered);
  }, [debouncedSearchQuery, pacientes, realtimePacientes.items, dateFilter]);

  // Nota: Los hooks useDoctoresInfinite y usePacientesInfinite ya manejan
  // automáticamente los cambios de filtros y recargan los datos cuando es necesario

  // Cargar catálogo de módulos desde BD (para dropdown de filtros en Doctores y Pacientes)
  useEffect(() => {
    if (!showFiltersModal) return;
    let cancelled = false;
    setLoadingModulosCatalog(true);
    gestionService.getModulosCatalogForFilter()
      .then((list) => {
        if (!cancelled) setModulosCatalog(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!cancelled) {
          Logger.error('Error cargando catálogo de módulos', err);
          setModulosCatalog([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingModulosCatalog(false);
      });
    return () => { cancelled = true; };
  }, [showFiltersModal]);

  // Cargar catálogo de comorbilidades desde BD (para dropdown de filtros)
  useEffect(() => {
    if (activeTab !== 'pacientes' || !showFiltersModal) return;
    let cancelled = false;
    setLoadingComorbilidadesCatalog(true);
    gestionService.getComorbilidadesCatalogForFilter()
      .then((list) => {
        if (!cancelled) setComorbilidadesCatalog(Array.isArray(list) ? list : []);
      })
      .catch((err) => {
        if (!cancelled) {
          Logger.error('Error cargando catálogo de comorbilidades', err);
          setComorbilidadesCatalog([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingComorbilidadesCatalog(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, showFiltersModal]);

  // Refrescar datos cuando el usuario regrese a la pantalla
  useFocusEffect(
    React.useCallback(() => {
      Logger.info('Pantalla enfocada, refrescando datos', { activeTab });
      
      if (activeTab === 'doctores') {
        refreshDoctores();
      } else {
        refreshPacientes();
      }
    }, [activeTab, refreshDoctores, refreshPacientes])
  );

  // Sincronizar datos de tiempo real con datos locales
  useEffect(() => {
    if (realtimeDoctores.items && realtimeDoctores.items.length > 0) {
      Logger.info('Datos de tiempo real de doctores actualizados', { 
        totalRealtime: realtimeDoctores.items.length,
        totalLocal: doctores?.length || 0
      });
      
      // Forzar actualización si hay diferencias
      if (realtimeDoctores.items.length !== (doctores?.length || 0)) {
        refreshDoctores();
      }
    }
  }, [realtimeDoctores.items, doctores?.length, refreshDoctores]);

  useEffect(() => {
    if (realtimePacientes.items && realtimePacientes.items.length > 0) {
      Logger.info('Datos de tiempo real de pacientes actualizados', { 
        totalRealtime: realtimePacientes.items.length,
        totalLocal: pacientes?.length || 0
      });
      
      // Forzar actualización si hay diferencias
      if (realtimePacientes.items.length !== (pacientes?.length || 0)) {
        refreshPacientes();
      }
    }
  }, [realtimePacientes.items, pacientes?.length, refreshPacientes]);

  // Validar que solo administradores puedan acceder
  useEffect(() => {
    if (!userRole || !['Admin', 'admin', 'administrador'].includes(userRole)) {
      Logger.warn('Acceso no autorizado a gestión administrativa', { userRole });
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    }
  }, [userRole, navigation]);


  const handleAddDoctor = () => {
    try {
      Logger.navigation('GestionAdmin', 'AgregarDoctor');
      navigation.navigate('AgregarDoctor');
    } catch (error) {
      Logger.error('Error navegando a AgregarDoctor', error);
      Alert.alert('Error', 'No se pudo abrir el formulario de agregar doctor');
    }
  };

  const handleAddPatient = () => {
    try {
      Logger.navigation('GestionAdmin', 'AgregarPaciente');
      navigation.navigate('AgregarPaciente');
    } catch (error) {
      Logger.error('Error navegando a AgregarPaciente', error);
      Alert.alert('Error', 'No se pudo abrir el formulario de agregar paciente');
    }
  };

  const handleEditDoctor = (doctor) => {
    try {
      Logger.navigation('GestionAdmin', 'EditarDoctor', { doctorId: doctor.id_doctor });
      navigation.navigate('EditarDoctor', { doctor });
    } catch (error) {
      Logger.error('Error navegando a EditarDoctor', error);
      Alert.alert('Error', 'No se pudo abrir el formulario de editar doctor');
    }
  };

  // Memoizar función de navegación a paciente
  const handleViewPatient = useCallback((paciente) => {
    // Validación robusta de datos antes de navegar
    if (!paciente) {
      Logger.error('handleViewPatient: Paciente es null o undefined');
      Alert.alert('Error', 'No se pudo cargar la información del paciente');
      return;
    }

    // Buscar ID en diferentes campos posibles
    const pacienteId = paciente.id_paciente || paciente.id || paciente.pacienteId || paciente.paciente_id;
    
    // Log para debug del ID
    Logger.info('GestionAdmin: Debug de ID del paciente', {
      pacienteId: pacienteId,
      pacienteIdPaciente: paciente.id_paciente,
      pacienteIdSimple: paciente.id,
      availableKeys: Object.keys(paciente)
    });
    
    if (!pacienteId) {
      Logger.error('handleViewPatient: Paciente sin ID válido', { 
        paciente, 
        availableKeys: Object.keys(paciente)
      });
      Alert.alert('Error', 'Información del paciente incompleta');
      return;
    }

    // Validar estructura mínima requerida
    const pacienteData = {
      id_paciente: pacienteId,
      nombre: paciente.nombre || paciente.nombre_completo?.split(' ')[0] || 'Sin nombre',
      apellido_paterno: paciente.apellido_paterno || paciente.apellido || 'Sin apellido',
      apellido_materno: paciente.apellido_materno || '',
      sexo: paciente.sexo || 'No especificado',
      fecha_nacimiento: paciente.fecha_nacimiento || new Date().toISOString(),
      activo: paciente.activo !== undefined ? paciente.activo : true,
      // Datos adicionales desde el backend
      nombre_completo: paciente.nombreCompleto || `${paciente.nombre} ${paciente.apellido_paterno}`.trim(),
      doctorNombre: paciente.doctorNombre || 'Sin doctor asignado',
      edad: paciente.edad,
      institucion_salud: paciente.institucion_salud || 'No especificada'
    };

    Logger.navigation('GestionAdmin', 'DetallePaciente', { 
      pacienteId: pacienteData.id_paciente,
      pacienteName: pacienteData.nombre_completo
    });
    
    try {
      navigation.navigate('DetallePaciente', { 
        paciente: pacienteData
      });
    } catch (error) {
      Logger.error('Error navegando a DetallePaciente', error);
      Alert.alert('Error', 'No se pudo abrir los detalles del paciente');
    }
  }, [navigation]);

  const handleEditPatient = (paciente) => {
    try {
      Logger.navigation('GestionAdmin', 'EditarPaciente', { pacienteId: paciente.id_paciente });
      navigation.navigate('EditarPaciente', { paciente });
    } catch (error) {
      Logger.error('Error navegando a EditarPaciente', error);
      Alert.alert('Error', 'No se pudo abrir el formulario de editar paciente');
    }
  };

  const handleDeletePatient = (paciente) => {
    // Validación robusta de datos
    if (!paciente) {
      Logger.error('handleDeletePatient: Paciente es null o undefined');
      Alert.alert('Error', 'No se pudo cargar la información del paciente');
      return;
    }

    const pacienteId = paciente.id_paciente || paciente.id || paciente.pacienteId || paciente.paciente_id;
    const fullName = paciente.nombreCompleto || `${paciente.nombre} ${paciente.apellido_paterno}`.trim() || 'Sin nombre';
    
    if (!pacienteId) {
      Logger.error('handleDeletePatient: Paciente sin ID válido', { 
        paciente, 
        availableKeys: Object.keys(paciente)
      });
      Alert.alert('Error', 'No se puede identificar el paciente');
      return;
    }

    // Confirmación con alerta destructiva
    Alert.alert(
      'Eliminar Paciente',
      `¿Estás seguro de que deseas eliminar a ${fullName}?\n\nEsta acción marcará el paciente como eliminado (soft delete) y no podrá ser deshecha fácilmente.`,
      [
        { 
          text: 'Cancelar', 
          style: 'cancel'
        },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              Logger.info('Iniciando eliminación de paciente', { 
                pacienteId, 
                nombre: fullName 
              });
              
              // Llamar a API para soft delete
              await gestionService.deletePaciente(pacienteId);
              
              Logger.info('Paciente eliminado correctamente', { 
                pacienteId, 
                nombre: fullName 
              });
              
              // Limpiar cache y refrescar lista
              Logger.info('Limpiando cache y refrescando lista de pacientes');
              await refreshPacientes();
              
              // Mostrar confirmación de éxito
              Alert.alert(
                'Éxito', 
                'Paciente eliminado correctamente',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Logger.error('Error eliminando paciente', { 
                pacienteId, 
                nombre: fullName,
                error: error.message,
                stack: error.stack
              });
              Alert.alert('Error', 'No se pudo eliminar el paciente. Por favor, intenta nuevamente.');
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = (item, type) => {
    // Validación de entrada
    if (!item || typeof item !== 'object' || !type) {
      Logger.error('handleToggleStatus: Parámetros inválidos', { item, type });
      Alert.alert('Error', 'Información inválida para cambiar estado');
      return;
    }

    const action = item.activo ? 'desactivar' : 'activar';
    const itemName = type === 'doctor' ? 'doctor' : 'paciente';
    const fullName = `${item.nombre || 'Sin nombre'} ${item.apellido || ''}`.trim();
    const itemId = item.id_doctor || item.id_paciente;
    
    if (!itemId) {
      Logger.error('handleToggleStatus: Item sin ID válido', { item, type });
      Alert.alert('Error', 'No se puede identificar el elemento');
      return;
    }
    
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} ${itemName.charAt(0).toUpperCase() + itemName.slice(1)}`,
      `¿Estás seguro de que quieres ${action} a ${fullName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: action.charAt(0).toUpperCase() + action.slice(1), 
          style: item.activo ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (type === 'doctor') {
                // Limpiar cache antes de actualizar
                clearDoctorCache(item.id_doctor);
                
                // Usar el hook de tiempo real para actualizar
                realtimeDoctores.updateItem({ ...item, activo: !item.activo });
                // Refrescar datos para sincronizar con backend
                await refreshDoctores();
              } else {
                // Usar el hook de tiempo real para actualizar
                realtimePacientes.updateItem({ ...item, activo: !item.activo });
                // Refrescar datos para sincronizar con backend
                await refreshPacientes();
              }
              
              Logger.info(`${action.charAt(0).toUpperCase() + action.slice(1)} ${itemName}`, { 
                id: itemId, 
                name: fullName,
                newStatus: !item.activo
              });
              
              // Mostrar confirmación
              Alert.alert(
                'Éxito', 
                `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} ${action} correctamente`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              Logger.error('Error actualizando estado', error);
              Alert.alert('Error', 'No se pudo cambiar el estado del elemento');
            }
          }
        }
      ]
    );
  };

  // Memoizar función de navegación a doctor
  const handleViewDoctor = useCallback((doctor) => {
    // Validación robusta de datos antes de navegar
    if (!doctor) {
      Logger.error('handleViewDoctor: Doctor es null o undefined');
      Alert.alert('Error', 'No se pudo cargar la información del doctor');
      return;
    }

    // DEBUG: Log de estructura del doctor
    Logger.debug('handleViewDoctor: Estructura del doctor', {
      doctor,
      keys: Object.keys(doctor)
    });

    // Buscar ID en diferentes campos posibles
    const doctorId = doctor.id_doctor || doctor.id || doctor.doctorId || doctor.doctor_id;
    
    // Log específico para debug del ID
    Logger.info('GestionAdmin: Debug de ID del doctor', {
      doctorId: doctorId,
      doctorIdDoctor: doctor.id_doctor,
      doctorIdSimple: doctor.id,
      doctorDoctorId: doctor.doctorId,
      doctorDoctor_id: doctor.doctor_id,
      availableKeys: Object.keys(doctor),
      doctor: doctor
    });
    
    if (!doctorId) {
      Logger.error('handleViewDoctor: Doctor sin ID válido', { 
        doctor, 
        availableKeys: Object.keys(doctor)
      });
      Alert.alert('Error', 'Información del doctor incompleta');
      return;
    }

    // Validar estructura mínima requerida - mapear campos correctos según BD
    const doctorData = {
      id_doctor: doctorId,
      nombre: doctor.nombre || 'Sin nombre',
      apellido: `${doctor.apellido_paterno || ''} ${doctor.apellido_materno || ''}`.trim() || 'Sin apellido',
      especialidad: doctor.grado_estudio || 'Sin especialidad',
      modulo: doctor.modulo_nombre ? `Módulo ${doctor.id_modulo}` : 'Sin módulo asignado',
      email: doctor.email || 'Sin email',
      telefono: doctor.telefono || 'Sin teléfono',
      activo: doctor.activo !== undefined ? doctor.activo : true,
      fecha_registro: doctor.fecha_registro || new Date().toISOString(),
      pacientes_asignados: doctor.pacientes_asignados || doctor.assigned_patients || doctor.pacientes_count || 0,
      // Campos adicionales de la BD
      institucion_hospitalaria: doctor.institucion_hospitalaria || 'Sin institución',
      anos_servicio: doctor.anos_servicio || 0,
      id_modulo: doctor.id_modulo
    };

    Logger.navigation('GestionAdmin', 'ViewDoctor', { 
      doctorId: doctorData.id_doctor,
      doctorName: `${doctorData.nombre} ${doctorData.apellido}`
    });
    
    try {
      navigation.navigate('DetalleDoctor', { 
        doctor: doctorData
      });
    } catch (error) {
      Logger.error('Error navegando a DetalleDoctor', error);
      Alert.alert('Error', 'No se pudo abrir los detalles del doctor');
    }
  }, [navigation]);

  // Memoizar función de renderizado de doctor card
  const renderDoctorCard = useCallback(({ item: doctor }) => {
    // Validación robusta de datos del doctor
    if (!doctor) {
      Logger.error('renderDoctorCard: Doctor es null o undefined');
      return null;
    }

    // Buscar ID en diferentes campos posibles
    const doctorId = doctor.id_doctor || doctor.id || doctor.doctorId || doctor.doctor_id;
    
    if (!doctorId) {
      Logger.error('renderDoctorCard: Doctor sin ID válido', { 
        doctor, 
        availableKeys: Object.keys(doctor),
        id_doctor: doctor.id_doctor,
        id: doctor.id,
        doctorId: doctor.doctorId,
        doctor_id: doctor.doctor_id
      });
      return null;
    }

    // Datos seguros con fallbacks - mapear campos correctos según BD
    const safeDoctor = {
      id_doctor: doctorId,
      nombre: doctor.nombre || 'Sin nombre',
      apellido: `${doctor.apellido_paterno || ''} ${doctor.apellido_materno || ''}`.trim() || 'Sin apellido',
      especialidad: doctor.grado_estudio || 'Sin especialidad',
      modulo: doctor.modulo_nombre ? `Módulo ${doctor.id_modulo}` : 'Sin módulo asignado',
      activo: doctor.activo !== undefined ? doctor.activo : true,
      pacientes_asignados: doctor.pacientes_asignados || doctor.assigned_patients || doctor.pacientes_count || 0,
      email: doctor.email || 'Sin email',
      telefono: doctor.telefono || 'Sin teléfono',
      fecha_registro: doctor.fecha_registro || new Date().toISOString(),
      // Campos adicionales de la BD
      institucion_hospitalaria: doctor.institucion_hospitalaria || 'Sin institución',
      anos_servicio: doctor.anos_servicio || 0,
      id_modulo: doctor.id_modulo
    };

    return (
      <TouchableOpacity 
        onPress={() => handleViewDoctor(doctor)} // Pasar el doctor original para validación
        style={[styles.simpleCard, !safeDoctor.activo && styles.inactiveCard]}
      >
        <View style={styles.simpleCardContent}>
          <View style={styles.simpleCardHeader}>
            <View style={styles.simpleCardInfo}>
              <Text style={[styles.simpleCardTitle, !safeDoctor.activo && styles.inactiveText]}>
                {safeDoctor.nombre} {safeDoctor.apellido}
              </Text>
              <Text style={[styles.simpleCardSubtitle, !safeDoctor.activo && styles.inactiveText]}>
                {safeDoctor.especialidad}
              </Text>
              <View style={styles.moduleRow}>
                <Text style={[styles.simpleCardModule, !safeDoctor.activo && styles.inactiveText]}>
                  📍 {safeDoctor.modulo}
                </Text>
                <Text style={[styles.patientsCount, !safeDoctor.activo && styles.inactiveText]}>
                  👥  {safeDoctor.pacientes_asignados}
                </Text>
              </View>
            </View>
            <View style={styles.simpleCardStatus}>
              <View style={[
                styles.statusIndicator, 
                safeDoctor.activo ? styles.activeIndicator : styles.inactiveIndicator
              ]}>
                <Text style={styles.statusIndicatorText}>
                  {safeDoctor.activo ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleViewDoctor]);

  // Memoizar función de renderizado de paciente card
  const renderPatientCard = useCallback(({ item: paciente }) => (
    <TouchableOpacity 
      onPress={() => handleViewPatient(paciente)}
      activeOpacity={0.7}
    >
      <Card style={[styles.card, !paciente.activo && styles.inactiveCard]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Title style={[styles.cardTitle, !paciente.activo && styles.inactiveText]}>
                {paciente.nombreCompleto || `${paciente.nombre} ${paciente.apellido_paterno}`.trim()}
              </Title>
              <Text style={[styles.cardSubtitle, !paciente.activo && styles.inactiveText]}>
                {paciente.sexo === 'Mujer' ? '👩' : '👨'} • {paciente.edad || (new Date().getFullYear() - new Date(paciente.fecha_nacimiento).getFullYear())} años
              </Text>
            </View>
          </View>
          
          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>👨‍⚕️ Doctor:</Text>
              <Text style={[styles.detailValue, !paciente.activo && styles.inactiveText]}>
                {paciente.doctorNombre || 'Sin doctor asignado'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>🏥 Institución:</Text>
              <Text style={[styles.detailValue, !paciente.activo && styles.inactiveText]}>
                {paciente.institucion_salud || 'No especificada'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📅 Registro:</Text>
              <Text style={[styles.detailValue, !paciente.activo && styles.inactiveText]}>
                {formatDate(new Date(paciente.fecha_registro))}
              </Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, paciente.activo ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.statusText}>
              {paciente.activo ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  ), [handleViewPatient]);

  // Memoizar keyExtractors para FlatList
  const keyExtractorDoctor = useCallback((item, index) => {
    const doctorId = item?.id_doctor || item?.id || item?.doctorId || item?.doctor_id || `doctor-${index}`;
    return `doctor-${doctorId}`;
  }, []);

  const keyExtractorPaciente = useCallback((item, index) => {
    const pacienteId = item?.id_paciente || item?.id || `paciente-${index}`;
    return `paciente-${pacienteId}`;
  }, []);

  // Si no es administrador, no renderizar nada
  if (!userRole || !['Admin', 'admin', 'administrador'].includes(userRole)) {
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Gestión Administrativa</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'doctores' ? 'Gestión de Doctores' : 'Gestión de Pacientes'}
            </Text>
          </View>
        </View>
      </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'doctores' && styles.activeTab]}
            onPress={() => setActiveTab('doctores')}
          >
            <Text style={[styles.tabText, activeTab === 'doctores' && styles.activeTabText]}>
              👨‍⚕️ Doctores ({doctoresTotal || doctores?.length || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pacientes' && styles.activeTab]}
            onPress={() => setActiveTab('pacientes')}
          >
            <Text style={[styles.tabText, activeTab === 'pacientes' && styles.activeTabText]}>
              👥 Pacientes ({pacientesTotal || pacientes?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>

      {/* Search Bar (sin icono a la izquierda) */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={`Buscar ${activeTab === 'doctores' ? 'doctores' : 'pacientes'}...`}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          showClearIcon={false}
          icon={() => null}
        />
      </View>

      {/* Botones de Filtros y Agregar (misma altura y tamaño de texto) */}
      <View style={listActionButtonStyles.buttonsContainer}>
        <TouchableOpacity
          style={listActionButtonStyles.filtersButton}
          onPress={() => setShowFiltersModal(true)}
          activeOpacity={0.7}
        >
          <Text style={listActionButtonStyles.filtersButtonIcon}>🔍</Text>
          <Text style={listActionButtonStyles.filtersButtonText}>Filtros</Text>
        </TouchableOpacity>

        <Button
          mode="contained"
          onPress={activeTab === 'doctores' ? handleAddDoctor : handleAddPatient}
          style={listActionButtonStyles.addButton}
          contentStyle={listActionButtonStyles.addButtonContent}
          labelStyle={listActionButtonStyles.addButtonLabel}
          icon="plus"
          buttonColor={COLORES.NAV_PRIMARIO}
          textColor={COLORES.TEXTO_EN_PRIMARIO}
        >
          Agregar {activeTab === 'doctores' ? 'Doctor' : 'Paciente'}
        </Button>
      </View>

        {/* Content */}
        {/* Loading States */}
        {(doctoresLoading || pacientesLoading) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingText}>Cargando datos...</Text>
          </View>
        )}

        {/* Error States: solo mostrar error de la pestaña activa y cuando no hay datos (evita mostrar error si los datos ya cargaron) */}
        {activeTab === 'doctores' && doctoresError && (!doctores || doctores.length === 0) && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>
                Error al cargar los datos. Desliza hacia abajo para intentar nuevamente.
              </Text>
            </Card.Content>
          </Card>
        )}
        {activeTab === 'pacientes' && pacientesError && (!pacientes || pacientes.length === 0) && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>
                Error al cargar los datos. Desliza hacia abajo para intentar nuevamente.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Content */}
        {!doctoresLoading && !pacientesLoading && (
          <>
            {activeTab === 'doctores' ? (
              <FlatList
                data={filteredDoctores}
                renderItem={renderDoctorCard}
                keyExtractor={keyExtractorDoctor}
                style={styles.listContainer}
                contentContainerStyle={styles.listContentContainer}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={10}
                onEndReached={loadMoreDoctores}
                onEndReachedThreshold={0.3}
                getItemLayout={(data, index) => ({
                  length: 120,
                  offset: 120 * index,
                  index,
                })}
                ListHeaderComponent={
                  <View style={styles.sortingIndicator}>
                    <Text style={styles.sortingText}>
                      📋 {filteredDoctores.length} de {doctoresTotal} doctores
                      {dateFilter === 'recent' ? ' (más recientes primero)' : ' (más antiguos primero)'}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  <View style={styles.listFooter}>
                    {doctoresLoadingMore && (
                      <View style={styles.loadingMoreContainer}>
                        <ActivityIndicator size="small" color="#1976D2" />
                        <Text style={styles.loadingMoreText}>Cargando más doctores...</Text>
                      </View>
                    )}
                    {!doctoresLoadingMore && doctoresHasMore && filteredDoctores.length > 0 && (
                      <Text style={styles.scrollHintText}>↓ Desliza para cargar más</Text>
                    )}
                    {!doctoresHasMore && filteredDoctores.length > 0 && (
                      <View style={styles.endOfListContainer}>
                        <Text style={styles.endOfListText}>✓ Has visto todos los doctores</Text>
                      </View>
                    )}
                  </View>
                }
                ListEmptyComponent={
                  <Card style={styles.noDataCard}>
                    <Card.Content>
                      <Text style={styles.noDataText}>
                        {searchQuery ? 'No se encontraron doctores con ese criterio' : 'No hay doctores registrados'}
                      </Text>
                    </Card.Content>
                  </Card>
                }
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[COLORES.NAV_PRIMARIO]}
                    tintColor="#1976D2"
                  />
                }
              />
            ) : (
              <FlatList
                data={filteredPacientes}
                renderItem={renderPatientCard}
                keyExtractor={keyExtractorPaciente}
                style={styles.listContainer}
                contentContainerStyle={styles.listContentContainer}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={10}
                onEndReached={loadMorePacientes}
                onEndReachedThreshold={0.3}
                getItemLayout={(data, index) => ({
                  length: 180,
                  offset: 180 * index,
                  index,
                })}
                ListHeaderComponent={
                  <View style={styles.sortingIndicator}>
                    <Text style={styles.sortingText}>
                      📋 {filteredPacientes.length} de {pacientesTotal} pacientes
                      {dateFilter === 'recent' ? ' (más recientes primero)' : ' (más antiguos primero)'}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  <View style={styles.listFooter}>
                    {pacientesLoadingMore && (
                      <View style={styles.loadingMoreContainer}>
                        <ActivityIndicator size="small" color="#1976D2" />
                        <Text style={styles.loadingMoreText}>Cargando más pacientes...</Text>
                      </View>
                    )}
                    {!pacientesLoadingMore && pacientesHasMore && filteredPacientes.length > 0 && (
                      <Text style={styles.scrollHintText}>↓ Desliza para cargar más</Text>
                    )}
                    {!pacientesHasMore && filteredPacientes.length > 0 && (
                      <View style={styles.endOfListContainer}>
                        <Text style={styles.endOfListText}>✓ Has visto todos los pacientes</Text>
                      </View>
                    )}
                  </View>
                }
                ListEmptyComponent={
                  <Card style={styles.noDataCard}>
                    <Card.Content>
                      <Text style={styles.noDataText}>
                        {searchQuery ? 'No se encontraron pacientes con ese criterio' : 'No hay pacientes registrados'}
                      </Text>
                    </Card.Content>
                  </Card>
                }
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[COLORES.NAV_PRIMARIO]}
                    tintColor="#1976D2"
                  />
                }
              />
            )}
          </>
        )}

      {/* Modal de Filtros */}
      <Modal
        visible={showFiltersModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowEstadoDropdown(false);
          setShowDateSortDropdown(false);
          setShowComorbilidadDropdown(false);
          setShowDoctorModuloDropdown(false);
          setShowPacienteModuloDropdown(false);
          setShowFiltersModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Filtros Disponibles</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEstadoDropdown(false);
                  setShowDateSortDropdown(false);
                  setShowComorbilidadDropdown(false);
                  setShowFiltersModal(false);
                }}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Filtros para Doctores */}
              {activeTab === 'doctores' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>👨‍⚕️ Filtros de Doctores</Text>

                  <Text style={styles.filterSubtitle}>Estado:</Text>
                  <View style={styles.filterDropdownContainer}>
                    <TouchableOpacity
                      style={[
                        styles.filterDropdownSelector,
                        showEstadoDropdown && styles.filterDropdownSelectorOpen
                      ]}
                      onPress={() => {
                        setShowDateSortDropdown(false);
                        setShowDoctorModuloDropdown(false);
                        setShowEstadoDropdown(!showEstadoDropdown);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.filterDropdownText} numberOfLines={1}>
                        {ESTADO_OPCIONES.find((o) => o.value === doctorFilter)?.label ?? 'Estado'}
                      </Text>
                      <Text style={styles.filterDropdownArrow}>
                        {showEstadoDropdown ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>
                    {showEstadoDropdown && (
                      <View style={styles.filterDropdownList}>
                        {ESTADO_OPCIONES.map((opt) => {
                          const isSelected = doctorFilter === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[
                                styles.filterDropdownItem,
                                isSelected && styles.filterDropdownItemSelected
                              ]}
                              onPress={() => {
                                setDoctorFilter(opt.value);
                                setShowEstadoDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.filterDropdownItemText,
                                  isSelected && styles.filterDropdownItemTextSelected
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  <Text style={styles.filterSubtitle}>Ordenar por fecha:</Text>
                  <View style={styles.filterDropdownContainer}>
                    <TouchableOpacity
                      style={[
                        styles.filterDropdownSelector,
                        showDateSortDropdown && styles.filterDropdownSelectorOpen
                      ]}
                      onPress={() => {
                        setShowEstadoDropdown(false);
                        setShowDoctorModuloDropdown(false);
                        setShowDateSortDropdown(!showDateSortDropdown);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.filterDropdownText} numberOfLines={1}>
                        {ORDEN_FECHA_OPCIONES.find((o) => o.value === dateFilter)?.label ?? 'Orden'}
                      </Text>
                      <Text style={styles.filterDropdownArrow}>
                        {showDateSortDropdown ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>
                    {showDateSortDropdown && (
                      <View style={styles.filterDropdownList}>
                        {ORDEN_FECHA_OPCIONES.map((opt) => {
                          const isSelected = dateFilter === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[
                                styles.filterDropdownItem,
                                isSelected && styles.filterDropdownItemSelected
                              ]}
                              onPress={() => {
                                setDateFilter(opt.value);
                                setShowDateSortDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.filterDropdownItemText,
                                  isSelected && styles.filterDropdownItemTextSelected
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  <Text style={styles.filterSubtitle}>Filtrar por módulo:</Text>
                  <View style={styles.filterDropdownContainer}>
                    <TouchableOpacity
                      style={[
                        styles.filterDropdownSelector,
                        showDoctorModuloDropdown && styles.filterDropdownSelectorOpen
                      ]}
                      onPress={() => {
                        setShowEstadoDropdown(false);
                        setShowDateSortDropdown(false);
                        setShowDoctorModuloDropdown(!showDoctorModuloDropdown);
                      }}
                      activeOpacity={0.7}
                      disabled={loadingModulosCatalog}
                    >
                      <Text style={styles.filterDropdownText} numberOfLines={1}>
                        {loadingModulosCatalog
                          ? 'Cargando...'
                          : doctorModuloFilterId == null
                            ? '📂 Todos los módulos'
                            : (modulosCatalog.find((m) => m.id_modulo === doctorModuloFilterId)?.nombre_modulo ?? 'Módulo')}
                      </Text>
                      <Text style={styles.filterDropdownArrow}>
                        {showDoctorModuloDropdown ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>
                    {showDoctorModuloDropdown && (
                      <View style={styles.filterDropdownList}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                          <TouchableOpacity
                            style={[
                              styles.filterDropdownItem,
                              doctorModuloFilterId == null && styles.filterDropdownItemSelected
                            ]}
                            onPress={() => {
                              setDoctorModuloFilterId(null);
                              setShowDoctorModuloDropdown(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.filterDropdownItemText,
                                doctorModuloFilterId == null && styles.filterDropdownItemTextSelected
                              ]}
                            >
                              📂 Todos los módulos
                            </Text>
                          </TouchableOpacity>
                          {modulosCatalog.map((m) => {
                            const isSelected = doctorModuloFilterId === m.id_modulo;
                            return (
                              <TouchableOpacity
                                key={m.id_modulo}
                                style={[
                                  styles.filterDropdownItem,
                                  isSelected && styles.filterDropdownItemSelected
                                ]}
                                onPress={() => {
                                  setDoctorModuloFilterId(m.id_modulo);
                                  setShowDoctorModuloDropdown(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.filterDropdownItemText,
                                    isSelected && styles.filterDropdownItemTextSelected
                                  ]}
                                  numberOfLines={1}
                                >
                                  {m.nombre_modulo}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Filtros para Pacientes */}
              {activeTab === 'pacientes' && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>👥 Filtros de Pacientes</Text>

                  <Text style={styles.filterSubtitle}>Estado:</Text>
                  <View style={styles.filterDropdownContainer}>
                    <TouchableOpacity
                      style={[
                        styles.filterDropdownSelector,
                        showEstadoDropdown && styles.filterDropdownSelectorOpen
                      ]}
                      onPress={() => {
                        setShowDateSortDropdown(false);
                        setShowComorbilidadDropdown(false);
                        setShowPacienteModuloDropdown(false);
                        setShowEstadoDropdown(!showEstadoDropdown);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.filterDropdownText} numberOfLines={1}>
                        {ESTADO_OPCIONES.find((o) => o.value === pacienteFilter)?.label ?? 'Estado'}
                      </Text>
                      <Text style={styles.filterDropdownArrow}>
                        {showEstadoDropdown ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>
                    {showEstadoDropdown && (
                      <View style={styles.filterDropdownList}>
                        {ESTADO_OPCIONES.map((opt) => {
                          const isSelected = pacienteFilter === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[
                                styles.filterDropdownItem,
                                isSelected && styles.filterDropdownItemSelected
                              ]}
                              onPress={() => {
                                setPacienteFilter(opt.value);
                                setShowEstadoDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.filterDropdownItemText,
                                  isSelected && styles.filterDropdownItemTextSelected
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  <Text style={styles.filterSubtitle}>Filtrar por comorbilidad:</Text>
                  <View style={styles.comorbilidadDropdownContainer}>
                    <TouchableOpacity
                      style={[
                        styles.comorbilidadDropdownSelector,
                        showComorbilidadDropdown && styles.comorbilidadDropdownSelectorOpen
                      ]}
                      onPress={() => {
                        setShowEstadoDropdown(false);
                        setShowDateSortDropdown(false);
                        setShowPacienteModuloDropdown(false);
                        setShowComorbilidadDropdown(!showComorbilidadDropdown);
                      }}
                      activeOpacity={0.7}
                      disabled={loadingComorbilidadesCatalog}
                    >
                      <Text
                        style={[
                          styles.comorbilidadDropdownText,
                          comorbilidadFilterId == null && styles.comorbilidadDropdownPlaceholder
                        ]}
                        numberOfLines={1}
                      >
                        {loadingComorbilidadesCatalog
                          ? 'Cargando...'
                          : comorbilidadFilterId == null
                            ? '🏥 Todas las comorbilidades'
                            : (comorbilidadesCatalog.find((c) => c.id_comorbilidad === comorbilidadFilterId)?.nombre_comorbilidad ?? 'Comorbilidad')}
                      </Text>
                      <Text style={styles.comorbilidadDropdownArrow}>
                        {showComorbilidadDropdown ? '▲' : '▼'}
                      </Text>
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

                  <Text style={styles.filterSubtitle}>Filtrar por módulo:</Text>
                  <View style={styles.filterDropdownContainer}>
                    <TouchableOpacity
                      style={[
                        styles.filterDropdownSelector,
                        showPacienteModuloDropdown && styles.filterDropdownSelectorOpen
                      ]}
                      onPress={() => {
                        setShowEstadoDropdown(false);
                        setShowComorbilidadDropdown(false);
                        setShowDateSortDropdown(false);
                        setShowPacienteModuloDropdown(!showPacienteModuloDropdown);
                      }}
                      activeOpacity={0.7}
                      disabled={loadingModulosCatalog}
                    >
                      <Text style={styles.filterDropdownText} numberOfLines={1}>
                        {loadingModulosCatalog
                          ? 'Cargando...'
                          : pacienteModuloFilterId == null
                            ? '📂 Todos los módulos'
                            : (modulosCatalog.find((m) => m.id_modulo === pacienteModuloFilterId)?.nombre_modulo ?? 'Módulo')}
                      </Text>
                      <Text style={styles.filterDropdownArrow}>
                        {showPacienteModuloDropdown ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>
                    {showPacienteModuloDropdown && (
                      <View style={styles.filterDropdownList}>
                        <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                          <TouchableOpacity
                            style={[
                              styles.filterDropdownItem,
                              pacienteModuloFilterId == null && styles.filterDropdownItemSelected
                            ]}
                            onPress={() => {
                              setPacienteModuloFilterId(null);
                              setShowPacienteModuloDropdown(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.filterDropdownItemText,
                                pacienteModuloFilterId == null && styles.filterDropdownItemTextSelected
                              ]}
                            >
                              📂 Todos los módulos
                            </Text>
                          </TouchableOpacity>
                          {modulosCatalog.map((m) => {
                            const isSelected = pacienteModuloFilterId === m.id_modulo;
                            return (
                              <TouchableOpacity
                                key={m.id_modulo}
                                style={[
                                  styles.filterDropdownItem,
                                  isSelected && styles.filterDropdownItemSelected
                                ]}
                                onPress={() => {
                                  setPacienteModuloFilterId(m.id_modulo);
                                  setShowPacienteModuloDropdown(false);
                                }}
                              >
                                <Text
                                  style={[
                                    styles.filterDropdownItemText,
                                    isSelected && styles.filterDropdownItemTextSelected
                                  ]}
                                  numberOfLines={1}
                                >
                                  {m.nombre_modulo}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.filterSubtitle}>Ordenar por fecha:</Text>
                  <View style={styles.filterDropdownContainer}>
                    <TouchableOpacity
                      style={[
                        styles.filterDropdownSelector,
                        showDateSortDropdown && styles.filterDropdownSelectorOpen
                      ]}
                      onPress={() => {
                        setShowEstadoDropdown(false);
                        setShowComorbilidadDropdown(false);
                        setShowPacienteModuloDropdown(false);
                        setShowDateSortDropdown(!showDateSortDropdown);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.filterDropdownText} numberOfLines={1}>
                        {ORDEN_FECHA_OPCIONES.find((o) => o.value === dateFilter)?.label ?? 'Orden'}
                      </Text>
                      <Text style={styles.filterDropdownArrow}>
                        {showDateSortDropdown ? '▲' : '▼'}
                      </Text>
                    </TouchableOpacity>
                    {showDateSortDropdown && (
                      <View style={styles.filterDropdownList}>
                        {ORDEN_FECHA_OPCIONES.map((opt) => {
                          const isSelected = dateFilter === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              style={[
                                styles.filterDropdownItem,
                                isSelected && styles.filterDropdownItemSelected
                              ]}
                              onPress={() => {
                                setDateFilter(opt.value);
                                setShowDateSortDropdown(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.filterDropdownItemText,
                                  isSelected && styles.filterDropdownItemTextSelected
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Información adicional */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>ℹ️ Información</Text>
                <Text style={styles.filterInfo}>
                  • Los filtros se aplican automáticamente
                </Text>
                <Text style={styles.filterInfo}>
                  • Los cambios se reflejan inmediatamente en la lista
                </Text>
                <Text style={styles.filterInfo}>
                  • Puedes combinar múltiples filtros simultáneamente
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={() => {
                  setShowEstadoDropdown(false);
                  setShowDateSortDropdown(false);
                  setShowComorbilidadDropdown(false);
                  setShowDoctorModuloDropdown(false);
                  setShowPacienteModuloDropdown(false);
                  setShowFiltersModal(false);
                }}
              >
                <Text style={styles.modalApplyButtonText}>✅ Aplicar Filtros</Text>
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
    backgroundColor: COLORES.PRIMARIO,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerText: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.BLANCO,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORES.INFO_LIGHT,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORES.BLANCO,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: COLORES.PRIMARIO,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
  },
  activeTabText: {
    color: COLORES.BLANCO,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchBar: {
    elevation: 2,
    marginBottom: 15,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  listContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  listContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sortingIndicator: {
    backgroundColor: COLORES.INFO_LIGHT,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORES.NAV_PRIMARIO,
  },
  sortingText: {
    fontSize: 13,
    color: COLORES.NAV_PRIMARIO,
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    marginBottom: 15,
    elevation: 3,
    borderRadius: 12,
  },
  inactiveCard: {
    opacity: 0.6,
    backgroundColor: COLORES.FONDO,
  },
  cardHeader: {
    marginBottom: 15,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  cardActions: {
    flexDirection: 'row',
  },
  cardDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeBadge: {
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
  },
  inactiveBadge: {
    backgroundColor: COLORES.FONDO_SECUNDARIO,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORES.EXITO_LIGHT,
  },
  inactiveText: {
    color: COLORES.TEXTO_SECUNDARIO,
  },
  noDataCard: {
    elevation: 1,
    backgroundColor: COLORES.FONDO_SECUNDARIO,
  },
  noDataText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    fontStyle: 'italic',
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
    color: COLORES.ERROR_LIGHT,
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
    backgroundColor: COLORES.NAV_PRIMARIO,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  goBackText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para vista simplificada de doctores
  simpleCard: {
    marginBottom: 15,
    elevation: 3,
    borderRadius: 12,
    backgroundColor: COLORES.FONDO_CARD,
  },
  simpleCardContent: {
    padding: 20,
  },
  simpleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  simpleCardInfo: {
    flex: 1,
  },
  simpleCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 5,
  },
  simpleCardSubtitle: {
    fontSize: 16,
    color: COLORES.NAV_PRIMARIO,
    fontWeight: '600',
    marginBottom: 5,
  },
  simpleCardModule: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    fontStyle: 'italic',
    flex: 1,
  },
  moduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  patientsCount: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '600',
  },
  simpleCardStatus: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeIndicator: {
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
  },
  inactiveIndicator: {
    backgroundColor: COLORES.FONDO_SECUNDARIO,
  },
  statusIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORES.EXITO_LIGHT,
  },
  simpleCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: COLORES.TEXTO_DISABLED,
  },
  simpleCardFooterText: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '500',
  },
  simpleCardArrow: {
    fontSize: 18,
    color: COLORES.NAV_PRIMARIO,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Estilos para loading y error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  errorCard: {
    margin: 20,
    elevation: 2,
    backgroundColor: COLORES.FONDO_SECUNDARIO,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
  },
  // Estilos del Modal
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
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORES.NAV_PRIMARIO,
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
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 15,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 10,
  },
  filterSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 8,
    marginTop: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOption: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORES.FONDO,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 120,
    alignItems: 'center',
  },
  activeFilterOption: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    borderColor: '#1976D2',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORES.TEXTO_SECUNDARIO,
  },
  activeFilterOptionText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontWeight: '600',
  },
  // Dropdown Estado y Orden (compartidos)
  filterDropdownContainer: {
    marginBottom: 12,
  },
  filterDropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORES.FONDO,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 48,
  },
  filterDropdownSelectorOpen: {
    borderColor: COLORES.NAV_PRIMARIO,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  filterDropdownText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  filterDropdownArrow: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    marginLeft: 8,
  },
  filterDropdownList: {
    backgroundColor: COLORES.FONDO,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#E0E0E0',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  filterDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  filterDropdownItemSelected: {
    backgroundColor: COLORES.NAV_PRIMARIO + '15',
  },
  filterDropdownItemText: {
    fontSize: 15,
    color: COLORES.TEXTO_PRIMARIO,
  },
  filterDropdownItemTextSelected: {
    fontWeight: '600',
    color: COLORES.NAV_PRIMARIO,
  },
  // Dropdown comorbilidad (catálogo desde BD)
  comorbilidadDropdownContainer: {
    marginBottom: 8,
  },
  comorbilidadDropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORES.FONDO,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 48,
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
    borderColor: '#E0E0E0',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    maxHeight: 220,
  },
  comorbilidadDropdownScroll: {
    maxHeight: 220,
  },
  comorbilidadDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
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
  filterInfo: {
    fontSize: 13,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 5,
    lineHeight: 18,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: COLORES.TEXTO_DISABLED,
  },
  modalApplyButton: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalApplyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_EN_PRIMARIO,
  },
  // Estilos para Infinite Scroll
  listFooter: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: COLORES.NAV_PRIMARIO,
    fontWeight: '500',
  },
  scrollHintText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#888',
    paddingVertical: 10,
  },
  endOfListContainer: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 14,
    color: COLORES.EXITO_LIGHT,
    fontWeight: '500',
  },
});

export default GestionAdmin;
