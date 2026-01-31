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
import { Card, Title, Searchbar, Button, IconButton } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import gestionService from '../../api/gestionService';
import useDebounce from '../../hooks/useDebounce';
import { COLORES } from '../../utils/constantes';

const GestionComorbilidades = ({ navigation }) => {
  const { userRole } = useAuth();
  const [comorbilidades, setComorbilidades] = useState([]);
  const [filteredComorbilidades, setFilteredComorbilidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedComorbilidad, setSelectedComorbilidad] = useState(null);
  const [editingComorbilidad, setEditingComorbilidad] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Formulario
  const [formData, setFormData] = useState({
    nombre_comorbilidad: '',
    descripcion: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Validar que solo administradores puedan acceder
  useEffect(() => {
    if (!userRole || !['Admin', 'admin', 'administrador'].includes(userRole)) {
      Logger.warn('Acceso no autorizado a gestión de comorbilidades', { userRole });
      navigation.goBack();
    }
  }, [userRole, navigation]);

  // Cargar comorbilidades
  const loadComorbilidades = useCallback(async () => {
    try {
      setLoading(true);
      Logger.info('Cargando comorbilidades');
      
      const data = await gestionService.getComorbilidades();
      
      if (Array.isArray(data)) {
        setComorbilidades(data);
        setFilteredComorbilidades(data);
        Logger.info('Comorbilidades cargadas', { total: data.length });
      } else {
        Logger.warn('Formato de respuesta inesperado', { data });
        setComorbilidades([]);
        setFilteredComorbilidades([]);
      }
    } catch (error) {
      Logger.error('Error cargando comorbilidades', error);
      Alert.alert('Error', 'No se pudieron cargar las comorbilidades');
      setComorbilidades([]);
      setFilteredComorbilidades([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Efecto para cargar al montar y cuando se enfoca la pantalla
  useEffect(() => {
    loadComorbilidades();
  }, [loadComorbilidades]);

  useFocusEffect(
    useCallback(() => {
      loadComorbilidades();
    }, [loadComorbilidades])
  );

  // Debounce para búsqueda (300ms de delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filtrar comorbilidades por búsqueda
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setFilteredComorbilidades(comorbilidades);
      return;
    }

    const query = debouncedSearchQuery.toLowerCase().trim();
    const filtered = comorbilidades.filter(com => 
      com.nombre_comorbilidad?.toLowerCase().includes(query) ||
      com.descripcion?.toLowerCase().includes(query)
    );
    
    setFilteredComorbilidades(filtered);
  }, [debouncedSearchQuery, comorbilidades]);

  // Validar formulario
  const validateForm = () => {
    const errors = {};
    
    if (!formData.nombre_comorbilidad.trim()) {
      errors.nombre_comorbilidad = 'El nombre de la comorbilidad es requerido';
    } else if (formData.nombre_comorbilidad.trim().length > 150) {
      errors.nombre_comorbilidad = 'El nombre no puede exceder 150 caracteres';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      nombre_comorbilidad: '',
      descripcion: ''
    });
    setFormErrors({});
    setEditingComorbilidad(null);
  };

  // Abrir modal para crear
  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  // Memoizar función para abrir opciones
  const handleOpenOptions = useCallback((comorbilidad) => {
    setSelectedComorbilidad(comorbilidad);
    setShowOptionsModal(true);
  }, []);

  // Cerrar modal de opciones
  const handleCloseOptions = () => {
    setShowOptionsModal(false);
    setSelectedComorbilidad(null);
  };

  // Abrir modal para editar desde opciones
  const handleOpenEdit = () => {
    if (!selectedComorbilidad) return;
    
    setFormData({
      nombre_comorbilidad: selectedComorbilidad.nombre_comorbilidad || '',
      descripcion: selectedComorbilidad.descripcion || ''
    });
    setEditingComorbilidad(selectedComorbilidad);
    setFormErrors({});
    setShowOptionsModal(false);
    setSelectedComorbilidad(null);
    setShowModal(true);
  };

  // Eliminar desde opciones
  const handleDeleteFromOptions = () => {
    if (!selectedComorbilidad) return;
    
    setShowOptionsModal(false);
    handleDelete(selectedComorbilidad);
    setSelectedComorbilidad(null);
  };

  // Guardar comorbilidad
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Error de validación', 'Por favor, corrige los errores en el formulario');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        nombre_comorbilidad: formData.nombre_comorbilidad.trim(),
        descripcion: formData.descripcion?.trim() || null
      };

      if (editingComorbilidad) {
        // Actualizar
        await gestionService.updateComorbilidad(editingComorbilidad.id_comorbilidad, dataToSave);
        Logger.info('Comorbilidad actualizada', { id: editingComorbilidad.id_comorbilidad });
        Alert.alert('Éxito', 'Comorbilidad actualizada correctamente');
      } else {
        // Crear
        await gestionService.createComorbilidad(dataToSave);
        Logger.info('Comorbilidad creada');
        Alert.alert('Éxito', 'Comorbilidad creada correctamente');
      }

      setShowModal(false);
      resetForm();
      await loadComorbilidades();
    } catch (error) {
      Logger.error('Error guardando comorbilidad', error);
      
      let errorMessage = 'No se pudo guardar la comorbilidad';
      if (error.response?.status === 409) {
        errorMessage = 'Ya existe una comorbilidad con ese nombre';
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

  // Memoizar función para eliminar comorbilidad
  const handleDelete = useCallback((comorbilidad) => {
    Alert.alert(
      'Eliminar Comorbilidad',
      `¿Estás seguro de que deseas eliminar "${comorbilidad.nombre_comorbilidad}"?\n\nEsta acción no se puede deshacer. Si la comorbilidad está siendo usada por pacientes, no se podrá eliminar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await gestionService.deleteComorbilidad(comorbilidad.id_comorbilidad);
              Logger.info('Comorbilidad eliminada', { id: comorbilidad.id_comorbilidad });
              Alert.alert('Éxito', 'Comorbilidad eliminada correctamente');
              await loadComorbilidades();
            } catch (error) {
              Logger.error('Error eliminando comorbilidad', error);
              
              let errorMessage = 'No se pudo eliminar la comorbilidad';
              if (error.response?.status === 409) {
                errorMessage = error.response.data.error || 'La comorbilidad está siendo usada y no se puede eliminar';
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

  // Renderizar item de comorbilidad (memoizado)
  const renderComorbilidadItem = useCallback(({ item: comorbilidad }) => (
    <Card style={styles.comorbilidadCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Title style={styles.cardTitle}>
              {comorbilidad.nombre_comorbilidad}
            </Title>
            {comorbilidad.descripcion && (
              <Text style={styles.cardDescription}>
                {comorbilidad.descripcion}
              </Text>
            )}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => handleOpenOptions(comorbilidad)}
            >
              <Text style={styles.optionsButtonText}>Opciones</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card.Content>
    </Card>
  ), [handleOpenOptions]);

  // Memoizar keyExtractor
  const keyExtractor = useCallback((item) => `comorbilidad-${item.id_comorbilidad}`, []);

  // Manejar refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadComorbilidades();
  };

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
            <Text style={styles.headerTitle}>Gestión de Comorbilidades</Text>
            <Text style={styles.headerSubtitle}>
              Catálogo de comorbilidades del sistema
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar comorbilidades..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          showClearIcon={false}
        />
      </View>

      {/* Botón Agregar */}
      <View style={styles.buttonsContainer}>
        <Button
          mode="contained"
          onPress={handleOpenCreate}
          style={styles.addButton}
          icon="plus"
        >
          Agregar Comorbilidad
        </Button>
      </View>

      {/* Content */}
      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.PRIMARIO} />
          <Text style={styles.loadingText}>Cargando comorbilidades...</Text>
        </View>
      )}

      {/* Lista de Comorbilidades con FlatList */}
      {!loading && (
        <>
          {filteredComorbilidades.length > 0 ? (
            <FlatList
              data={filteredComorbilidades}
              renderItem={renderComorbilidadItem}
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
                length: 140, // Altura aproximada de cada card
                offset: 140 * index,
                index,
              })}
              ListHeaderComponent={
                <View style={styles.counterContainer}>
                  <Text style={styles.counterText}>
                    Mostrando {filteredComorbilidades.length} de {comorbilidades.length} comorbilidades
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <Card style={styles.noDataCard}>
                  <Card.Content>
                    <Text style={styles.noDataText}>
                      {searchQuery 
                        ? 'No se encontraron comorbilidades con ese criterio'
                        : 'No hay comorbilidades registradas'}
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
                    ? 'No se encontraron comorbilidades con ese criterio'
                    : 'No hay comorbilidades registradas'}
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
                Opciones - {selectedComorbilidad?.nombre_comorbilidad || 'Comorbilidad'}
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
                <Text style={styles.optionText}>Editar Comorbilidad</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, styles.optionItemDelete]}
                onPress={handleDeleteFromOptions}
              >
                <Text style={[styles.optionText, styles.optionTextDelete]}>Eliminar Comorbilidad</Text>
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
                {editingComorbilidad ? 'Editar Comorbilidad' : 'Nueva Comorbilidad'}
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
                <Text style={styles.label}>Nombre de la Comorbilidad *</Text>
                <TextInput
                  style={[
                    styles.input,
                    formErrors.nombre_comorbilidad && styles.inputError
                  ]}
                  value={formData.nombre_comorbilidad}
                  onChangeText={(text) => {
                    setFormData({ ...formData, nombre_comorbilidad: text });
                    if (formErrors.nombre_comorbilidad) {
                      setFormErrors({ ...formErrors, nombre_comorbilidad: null });
                    }
                  }}
                  placeholder="Ej: Diabetes Tipo 2"
                  maxLength={150}
                  editable={!saving}
                />
                {formErrors.nombre_comorbilidad && (
                  <Text style={styles.errorText}>{formErrors.nombre_comorbilidad}</Text>
                )}
              </View>

              {/* Descripción */}
              <View style={styles.formField}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.descripcion}
                  onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                  placeholder="Descripción de la comorbilidad (opcional)"
                  multiline
                  numberOfLines={4}
                  editable={!saving}
                />
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
                {editingComorbilidad ? 'Actualizar' : 'Crear'}
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
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addButton: {
    borderRadius: 12,
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
  comorbilidadCard: {
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
  cardDescription: {
    fontSize: 14,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
    color: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    textAlign: 'center',
  },
});

export default GestionComorbilidades;

