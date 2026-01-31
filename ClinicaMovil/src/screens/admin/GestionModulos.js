import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Searchbar, Button, IconButton } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import gestionService from '../../api/gestionService';
import useDebounce from '../../hooks/useDebounce';
import { COLORES } from '../../utils/constantes';
import { listActionButtonStyles } from '../../utils/sharedStyles';

const GestionModulos = ({ navigation }) => {
  const { userRole } = useAuth();
  const [modulos, setModulos] = useState([]);
  const [filteredModulos, setFilteredModulos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedModulo, setSelectedModulo] = useState(null);
  const [editingModulo, setEditingModulo] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Formulario
  const [formData, setFormData] = useState({
    nombre_modulo: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Validar que solo administradores puedan acceder
  useEffect(() => {
    if (!userRole || !['Admin', 'admin', 'administrador'].includes(userRole)) {
      Logger.warn('Acceso no autorizado a gestión de módulos', { userRole });
      navigation.goBack();
    }
  }, [userRole, navigation]);

  // Cargar módulos
  const loadModulos = useCallback(async () => {
    try {
      setLoading(true);
      Logger.info('Cargando módulos');
      
      const data = await gestionService.getModulos();
      
      if (Array.isArray(data)) {
        setModulos(data);
        setFilteredModulos(data);
        Logger.info('Módulos cargados', { total: data.length });
      } else {
        Logger.warn('Formato de respuesta inesperado', { data });
        setModulos([]);
        setFilteredModulos([]);
      }
    } catch (error) {
      Logger.error('Error cargando módulos', error);
      Alert.alert('Error', 'No se pudieron cargar los módulos');
      setModulos([]);
      setFilteredModulos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Efecto para cargar al montar y cuando se enfoca la pantalla
  useEffect(() => {
    loadModulos();
  }, [loadModulos]);

  useFocusEffect(
    useCallback(() => {
      loadModulos();
    }, [loadModulos])
  );

  // Debounce para búsqueda (300ms de delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filtrar módulos por búsqueda
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setFilteredModulos(modulos);
      return;
    }

    const query = debouncedSearchQuery.toLowerCase().trim();
    const filtered = modulos.filter(modulo => 
      modulo.nombre_modulo?.toLowerCase().includes(query)
    );
    
    setFilteredModulos(filtered);
  }, [debouncedSearchQuery, modulos]);

  // Validar formulario
  const validateForm = () => {
    const errors = {};
    
    if (!formData.nombre_modulo.trim()) {
      errors.nombre_modulo = 'El nombre del módulo es requerido';
    } else if (formData.nombre_modulo.trim().length > 50) {
      errors.nombre_modulo = 'El nombre no puede exceder 50 caracteres';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      nombre_modulo: ''
    });
    setFormErrors({});
    setEditingModulo(null);
  };

  // Abrir modal para crear
  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  // Memoizar función para abrir opciones
  const handleOpenOptions = useCallback((modulo) => {
    setSelectedModulo(modulo);
    setShowOptionsModal(true);
  }, []);

  // Cerrar modal de opciones
  const handleCloseOptions = () => {
    setShowOptionsModal(false);
    setSelectedModulo(null);
  };

  // Abrir modal para editar desde opciones
  const handleOpenEdit = () => {
    if (!selectedModulo) return;
    
    setFormData({
      nombre_modulo: selectedModulo.nombre_modulo || ''
    });
    setEditingModulo(selectedModulo);
    setFormErrors({});
    setShowOptionsModal(false);
    setSelectedModulo(null);
    setShowModal(true);
  };

  // Eliminar desde opciones
  const handleDeleteFromOptions = () => {
    if (!selectedModulo) return;
    
    setShowOptionsModal(false);
    handleDelete(selectedModulo);
    setSelectedModulo(null);
  };

  // Guardar módulo
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Error de validación', 'Por favor, corrige los errores en el formulario');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        nombre_modulo: formData.nombre_modulo.trim()
      };

      if (editingModulo) {
        // Actualizar
        await gestionService.updateModulo(editingModulo.id_modulo, dataToSave);
        Logger.info('Módulo actualizado', { id: editingModulo.id_modulo });
        Alert.alert('Éxito', 'Módulo actualizado correctamente');
      } else {
        // Crear
        await gestionService.createModulo(dataToSave);
        Logger.info('Módulo creado');
        Alert.alert('Éxito', 'Módulo creado correctamente');
      }

      setShowModal(false);
      resetForm();
      await loadModulos();
    } catch (error) {
      Logger.error('Error guardando módulo', error);
      
      let errorMessage = 'No se pudo guardar el módulo';
      if (error.response?.status === 409) {
        errorMessage = 'Ya existe un módulo con ese nombre';
      } else if (error.response?.data?.error || error.response?.data?.message) {
        errorMessage = error.response.data.error || error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Memoizar función para eliminar módulo
  const handleDelete = useCallback((modulo) => {
    Alert.alert(
      'Eliminar Módulo',
      `¿Estás seguro de que deseas eliminar "${modulo.nombre_modulo}"?\n\nEsta acción no se puede deshacer. Si el módulo está siendo usado por doctores, no se podrá eliminar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await gestionService.deleteModulo(modulo.id_modulo);
              Logger.info('Módulo eliminado', { id: modulo.id_modulo });
              Alert.alert('Éxito', 'Módulo eliminado correctamente');
              await loadModulos();
            } catch (error) {
              Logger.error('Error eliminando módulo', error);
              
              let errorMessage = 'No se pudo eliminar el módulo';
              if (error.response?.status === 409) {
                errorMessage = error.response.data.error || 'El módulo está siendo usado y no se puede eliminar';
              } else if (error.response?.data?.error || error.response?.data?.message) {
                errorMessage = error.response.data.error || error.response.data.message;
              }
              
              Alert.alert('Error', errorMessage);
            }
          }
        }
      ]
    );
  }, []);

  // Manejar refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadModulos();
  };

  // Formatear fecha (usa formato legible)
  const formatearFecha = useCallback((fecha) => {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      // Formatear fecha: "6 de noviembre del 2025"
      const dia = date.getDate();
      const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const mes = meses[date.getMonth()];
      const año = date.getFullYear();
      return `${dia} de ${mes} del ${año}`;
    } catch (error) {
      return 'N/A';
    }
  }, []);

  // Renderizar item de módulo (memoizado)
  const renderModuloItem = useCallback(({ item: modulo }) => (
    <Card style={styles.moduloCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>
              {modulo.nombre_modulo}
            </Text>
            <Text style={styles.cardDate}>
              Creado: {formatearFecha(modulo.created_at)}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => handleOpenOptions(modulo)}
            >
              <Text style={styles.optionsButtonText}>Opciones</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card.Content>
    </Card>
  ), [handleOpenOptions, formatearFecha]);

  // Memoizar keyExtractor
  const keyExtractor = useCallback((item) => `modulo-${item.id_modulo}`, []);

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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ fontSize: 24, color: COLORES.BLANCO }}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Gestión de Módulos</Text>
            <Text style={styles.headerSubtitle}>
              Administrar módulos del sistema
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar módulos..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          showClearIcon={false}
        />
      </View>

      {/* Botón Agregar */}
      <View style={listActionButtonStyles.buttonsContainer}>
        <Button
          mode="contained"
          onPress={handleOpenCreate}
          style={listActionButtonStyles.addButton}
          contentStyle={listActionButtonStyles.addButtonContent}
          labelStyle={listActionButtonStyles.addButtonLabel}
          buttonColor={COLORES.NAV_PRIMARIO}
          icon="plus"
        >
          Agregar Módulo
        </Button>
      </View>

      {/* Content */}
      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.PRIMARIO} />
          <Text style={styles.loadingText}>Cargando módulos...</Text>
        </View>
      )}

      {/* Lista de Módulos con FlatList */}
      {!loading && (
        <>
          {filteredModulos.length > 0 ? (
            <FlatList
              data={filteredModulos}
              renderItem={renderModuloItem}
              keyExtractor={keyExtractor}
              style={styles.listContainer}
              contentContainerStyle={styles.listContentContainer}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={10}
              windowSize={10}
              getItemLayout={(data, index) => ({
                length: 120, // Altura aproximada de cada card
                offset: 120 * index,
                index,
              })}
              ListHeaderComponent={
                <View style={styles.counterContainer}>
                  <Text style={styles.counterText}>
                    Mostrando {filteredModulos.length} de {modulos.length} módulos
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <Card style={styles.noDataCard}>
                  <Card.Content>
                    <Text style={styles.noDataText}>
                      {searchQuery 
                        ? 'No se encontraron módulos con ese criterio'
                        : 'No hay módulos registrados'}
                    </Text>
                  </Card.Content>
                </Card>
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[COLORES.PRIMARIO]}
                  tintColor={COLORES.PRIMARIO}
                />
              }
            />
          ) : (
            <Card style={styles.noDataCard}>
              <Card.Content>
                <Text style={styles.noDataText}>
                  {searchQuery 
                    ? 'No se encontraron módulos con ese criterio'
                    : 'No hay módulos registrados'}
                </Text>
              </Card.Content>
            </Card>
          )}
        </>
      )}

      {/* Modal de Opciones */}
      <Modal
        visible={showOptionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseOptions}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Opciones - {selectedModulo?.nombre_modulo || 'Módulo'}
              </Text>
              <TouchableOpacity
                onPress={handleCloseOptions}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.optionsList}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleOpenEdit}
              >
                <Text style={styles.optionText}>Editar Módulo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, styles.optionItemDelete]}
                onPress={handleDeleteFromOptions}
              >
                <Text style={[styles.optionText, styles.optionTextDelete]}>Eliminar Módulo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={handleCloseOptions}
                style={styles.cancelButton}
              >
                Cancelar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Formulario */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !saving && (setShowModal(false), resetForm())}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingModulo ? 'Editar Módulo' : 'Nuevo Módulo'}
              </Text>
              <TouchableOpacity
                onPress={() => !saving && (setShowModal(false), resetForm())}
                disabled={saving}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Nombre */}
              <View style={styles.formField}>
                <Text style={styles.label}>Nombre del Módulo *</Text>
                <TextInput
                  style={[
                    styles.input,
                    formErrors.nombre_modulo && styles.inputError
                  ]}
                  value={formData.nombre_modulo}
                  onChangeText={(text) => {
                    setFormData({ ...formData, nombre_modulo: text });
                    if (formErrors.nombre_modulo) {
                      setFormErrors({ ...formErrors, nombre_modulo: null });
                    }
                  }}
                  placeholder="Ej: Módulo 1"
                  maxLength={50}
                  editable={!saving}
                />
                {formErrors.nombre_modulo && (
                  <Text style={styles.errorText}>{formErrors.nombre_modulo}</Text>
                )}
                <Text style={styles.hintText}>
                  Máximo 50 caracteres
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => !saving && (setShowModal(false), resetForm())}
                disabled={saving}
                style={styles.cancelButton}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                disabled={saving}
                loading={saving}
                style={styles.saveButton}
              >
                {editingModulo ? 'Actualizar' : 'Crear'}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.BLANCO,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORES.INFO_LIGHT,
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
  },
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
  listContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  listContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  moduloCard: {
    marginBottom: 15,
    elevation: 3,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 5,
  },
  cardDate: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    marginTop: 5,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionsButton: {
    backgroundColor: COLORES.PRIMARIO,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
  },
  optionsButtonText: {
    color: COLORES.BLANCO,
    fontSize: 14,
    fontWeight: '600',
  },
  optionsModalContent: {
    backgroundColor: COLORES.BLANCO,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  optionsList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.TEXTO_DISABLED,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORES.FONDO_SECUNDARIO,
  },
  optionItemDelete: {
    borderBottomWidth: 0,
    backgroundColor: COLORES.FONDO_SECUNDARIO,
  },
  optionText: {
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionTextDelete: {
    color: COLORES.ERROR_LIGHT,
  },
  noDataCard: {
    elevation: 1,
    backgroundColor: COLORES.FONDO_SECUNDARIO,
    marginTop: 20,
  },
  noDataText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  counterContainer: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORES.FONDO_OVERLAY,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORES.BLANCO,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.TEXTO_DISABLED,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORES.PRIMARIO,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  formField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORES.TEXTO_DISABLED,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORES.BLANCO,
    color: COLORES.TEXTO_PRIMARIO,
  },
  inputError: {
    borderColor: COLORES.ERROR_LIGHT,
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  errorText: {
    fontSize: 14,
    color: COLORES.ERROR_LIGHT,
    marginTop: 5,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: COLORES.TEXTO_DISABLED,
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 8,
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
  },
  closeButtonX: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORES.ERROR_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    textAlign: 'center',
  },
});

export default GestionModulos;

