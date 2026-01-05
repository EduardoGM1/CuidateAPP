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

const GestionMedicamentos = ({ navigation }) => {
  const { userRole } = useAuth();
  const [medicamentos, setMedicamentos] = useState([]);
  const [filteredMedicamentos, setFilteredMedicamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedMedicamento, setSelectedMedicamento] = useState(null);
  const [editingMedicamento, setEditingMedicamento] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Formulario
  const [formData, setFormData] = useState({
    nombre_medicamento: '',
    descripcion: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Validar que solo administradores puedan acceder
  useEffect(() => {
    if (!userRole || !['Admin', 'admin', 'administrador'].includes(userRole)) {
      Logger.warn('Acceso no autorizado a gestión de medicamentos', { userRole });
      navigation.goBack();
    }
  }, [userRole, navigation]);

  // Cargar medicamentos
  const loadMedicamentos = useCallback(async () => {
    try {
      setLoading(true);
      Logger.info('Cargando medicamentos');
      
      const data = await gestionService.getAllMedicamentos();
      
      if (Array.isArray(data)) {
        setMedicamentos(data);
        setFilteredMedicamentos(data);
        Logger.info('Medicamentos cargados', { total: data.length });
      } else {
        Logger.warn('Formato de respuesta inesperado', { data });
        setMedicamentos([]);
        setFilteredMedicamentos([]);
      }
    } catch (error) {
      Logger.error('Error cargando medicamentos', error);
      Alert.alert('Error', 'No se pudieron cargar los medicamentos');
      setMedicamentos([]);
      setFilteredMedicamentos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Efecto para cargar al montar y cuando se enfoca la pantalla
  useEffect(() => {
    loadMedicamentos();
  }, [loadMedicamentos]);

  useFocusEffect(
    useCallback(() => {
      loadMedicamentos();
    }, [loadMedicamentos])
  );

  // Debounce para búsqueda (300ms de delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filtrar medicamentos por búsqueda
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setFilteredMedicamentos(medicamentos);
      return;
    }

    const query = debouncedSearchQuery.toLowerCase().trim();
    const filtered = medicamentos.filter(med => 
      med.nombre_medicamento?.toLowerCase().includes(query) ||
      med.descripcion?.toLowerCase().includes(query)
    );
    
    setFilteredMedicamentos(filtered);
  }, [debouncedSearchQuery, medicamentos]);

  // Validar formulario
  const validateForm = () => {
    const errors = {};
    
    if (!formData.nombre_medicamento.trim()) {
      errors.nombre_medicamento = 'El nombre del medicamento es requerido';
    } else if (formData.nombre_medicamento.trim().length > 150) {
      errors.nombre_medicamento = 'El nombre no puede exceder 150 caracteres';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      nombre_medicamento: '',
      descripcion: ''
    });
    setFormErrors({});
    setEditingMedicamento(null);
  };

  // Abrir modal para crear
  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  // Abrir modal de opciones
  // Memoizar función para abrir opciones
  const handleOpenOptions = useCallback((medicamento) => {
    setSelectedMedicamento(medicamento);
    setShowOptionsModal(true);
  }, []);

  // Cerrar modal de opciones
  const handleCloseOptions = () => {
    setShowOptionsModal(false);
    setSelectedMedicamento(null);
  };

  // Abrir modal para editar desde opciones
  const handleOpenEdit = () => {
    if (!selectedMedicamento) return;
    
    setFormData({
      nombre_medicamento: selectedMedicamento.nombre_medicamento || '',
      descripcion: selectedMedicamento.descripcion || ''
    });
    setEditingMedicamento(selectedMedicamento);
    setFormErrors({});
    setShowOptionsModal(false);
    setSelectedMedicamento(null);
    setShowModal(true);
  };

  // Eliminar desde opciones
  const handleDeleteFromOptions = () => {
    if (!selectedMedicamento) return;
    
    setShowOptionsModal(false);
    handleDelete(selectedMedicamento);
    setSelectedMedicamento(null);
  };

  // Guardar medicamento
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Error de validación', 'Por favor, corrige los errores en el formulario');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        nombre_medicamento: formData.nombre_medicamento.trim(),
        descripcion: formData.descripcion?.trim() || null
      };

      if (editingMedicamento) {
        // Actualizar
        await gestionService.updateMedicamento(editingMedicamento.id_medicamento, dataToSave);
        Logger.info('Medicamento actualizado', { id: editingMedicamento.id_medicamento });
        Alert.alert('Éxito', 'Medicamento actualizado correctamente');
      } else {
        // Crear
        await gestionService.createMedicamento(dataToSave);
        Logger.info('Medicamento creado');
        Alert.alert('Éxito', 'Medicamento creado correctamente');
      }

      setShowModal(false);
      resetForm();
      await loadMedicamentos();
    } catch (error) {
      Logger.error('Error guardando medicamento', error);
      
      let errorMessage = 'No se pudo guardar el medicamento';
      if (error.response?.status === 409) {
        errorMessage = 'Ya existe un medicamento con ese nombre';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Memoizar función para eliminar medicamento
  const handleDelete = useCallback((medicamento) => {
    Alert.alert(
      'Eliminar Medicamento',
      `¿Estás seguro de que deseas eliminar "${medicamento.nombre_medicamento}"?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await gestionService.deleteMedicamento(medicamento.id_medicamento);
              Logger.info('Medicamento eliminado', { id: medicamento.id_medicamento });
              Alert.alert('Éxito', 'Medicamento eliminado correctamente');
              await loadMedicamentos();
            } catch (error) {
              Logger.error('Error eliminando medicamento', error);
              Alert.alert('Error', 'No se pudo eliminar el medicamento');
            }
          }
        }
      ]
    );
  }, []);

  // Renderizar item de medicamento (memoizado)
  const renderMedicamentoItem = useCallback(({ item: medicamento }) => (
    <Card style={styles.medicamentoCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Title style={styles.cardTitle}>
              {medicamento.nombre_medicamento}
            </Title>
            {medicamento.descripcion && (
              <Text style={styles.cardDescription}>
                {medicamento.descripcion}
              </Text>
            )}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => handleOpenOptions(medicamento)}
            >
              <Text style={styles.optionsButtonText}>Opciones</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card.Content>
    </Card>
  ), [handleOpenOptions]);

  // Memoizar keyExtractor
  const keyExtractor = useCallback((item) => `medicamento-${item.id_medicamento}`, []);

  // Manejar refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadMedicamentos();
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
            <IconButton icon="arrow-left" size={24} iconColor={COLORES.BLANCO} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Gestión de Medicamentos</Text>
            <Text style={styles.headerSubtitle}>
              Catálogo de medicamentos del sistema
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar medicamentos..."
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
          Agregar Medicamento
        </Button>
      </View>

      {/* Content */}
      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.PRIMARIO} />
          <Text style={styles.loadingText}>Cargando medicamentos...</Text>
        </View>
      )}

      {/* Lista de Medicamentos con FlatList */}
      {!loading && (
        <>
          {filteredMedicamentos.length > 0 ? (
            <FlatList
              data={filteredMedicamentos}
              renderItem={renderMedicamentoItem}
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
                length: 130, // Altura aproximada de cada card
                offset: 130 * index,
                index,
              })}
              ListHeaderComponent={
                <View style={styles.counterContainer}>
                  <Text style={styles.counterText}>
                    Mostrando {filteredMedicamentos.length} de {medicamentos.length} medicamentos
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <Card style={styles.noDataCard}>
                  <Card.Content>
                    <Text style={styles.noDataText}>
                      {searchQuery 
                        ? 'No se encontraron medicamentos con ese criterio'
                        : 'No hay medicamentos registrados'}
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
                    ? 'No se encontraron medicamentos con ese criterio'
                    : 'No hay medicamentos registrados'}
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
                Opciones - {selectedMedicamento?.nombre_medicamento || 'Medicamento'}
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
                <Text style={styles.optionText}>Editar Medicamento</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, styles.optionItemDelete]}
                onPress={handleDeleteFromOptions}
              >
                <Text style={[styles.optionText, styles.optionTextDelete]}>Eliminar Medicamento</Text>
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
                {editingMedicamento ? 'Editar Medicamento' : 'Nuevo Medicamento'}
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
                <Text style={styles.label}>Nombre del Medicamento *</Text>
                <TextInput
                  style={[
                    styles.input,
                    formErrors.nombre_medicamento && styles.inputError
                  ]}
                  value={formData.nombre_medicamento}
                  onChangeText={(text) => {
                    setFormData({ ...formData, nombre_medicamento: text });
                    if (formErrors.nombre_medicamento) {
                      setFormErrors({ ...formErrors, nombre_medicamento: null });
                    }
                  }}
                  placeholder="Ej: Paracetamol 500mg"
                  maxLength={150}
                  editable={!saving}
                />
                {formErrors.nombre_medicamento && (
                  <Text style={styles.errorText}>{formErrors.nombre_medicamento}</Text>
                )}
              </View>

              {/* Descripción */}
              <View style={styles.formField}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.descripcion}
                  onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                  placeholder="Descripción del medicamento (opcional)"
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
                {editingMedicamento ? 'Actualizar' : 'Crear'}
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
    color: '#666',
  },
  listContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  listContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  medicamentoCard: {
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
    color: '#333',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
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
    borderBottomColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
  },
  optionItemDelete: {
    borderBottomWidth: 0,
    backgroundColor: '#FFEBEE',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  optionTextDelete: {
    color: '#F44336',
  },
  noDataCard: {
    elevation: 1,
    backgroundColor: '#F9F9F9',
    marginTop: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
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
    color: '#666',
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
    color: '#F44336',
    marginBottom: 20,
    textAlign: 'center',
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    borderBottomColor: '#E0E0E0',
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
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORES.BLANCO,
    color: '#333',
  },
  inputError: {
    borderColor: '#F44336',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 5,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
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

export default GestionMedicamentos;

