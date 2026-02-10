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
import { listActionButtonStyles } from '../../utils/sharedStyles';

const GestionVacunas = ({ navigation }) => {
  const { userRole } = useAuth();
  const [vacunas, setVacunas] = useState([]);
  const [filteredVacunas, setFilteredVacunas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedVacuna, setSelectedVacuna] = useState(null);
  const [editingVacuna, setEditingVacuna] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Formulario
  const [formData, setFormData] = useState({
    nombre_vacuna: '',
    descripcion: '',
    tipo: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Validar que solo administradores puedan acceder
  useEffect(() => {
    if (!userRole || !['Admin', 'admin', 'administrador'].includes(userRole)) {
      Logger.warn('Acceso no autorizado a gestión de vacunas', { userRole });
      navigation.goBack();
    }
  }, [userRole, navigation]);

  // Cargar vacunas
  const loadVacunas = useCallback(async () => {
    try {
      setLoading(true);
      Logger.info('Cargando vacunas');
      
      const data = await gestionService.getVacunas();
      
      if (Array.isArray(data)) {
        setVacunas(data);
        setFilteredVacunas(data);
        Logger.info('Vacunas cargadas', { total: data.length });
      } else {
        Logger.warn('Formato de respuesta inesperado', { data });
        setVacunas([]);
        setFilteredVacunas([]);
      }
    } catch (error) {
      Logger.error('Error cargando vacunas', error);
      Alert.alert('Error', 'No se pudieron cargar las vacunas');
      setVacunas([]);
      setFilteredVacunas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Efecto para cargar al montar y cuando se enfoca la pantalla
  useEffect(() => {
    loadVacunas();
  }, [loadVacunas]);

  useFocusEffect(
    useCallback(() => {
      loadVacunas();
    }, [loadVacunas])
  );

  // Debounce para búsqueda (300ms de delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Filtrar vacunas por búsqueda
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setFilteredVacunas(vacunas);
      return;
    }

    const query = debouncedSearchQuery.toLowerCase().trim();
    const filtered = vacunas.filter(vac => 
      vac.nombre_vacuna?.toLowerCase().includes(query) ||
      vac.tipo?.toLowerCase().includes(query) ||
      vac.descripcion?.toLowerCase().includes(query)
    );
    
    setFilteredVacunas(filtered);
  }, [debouncedSearchQuery, vacunas]);

  // Validar formulario
  const validateForm = () => {
    const errors = {};
    
    if (!formData.nombre_vacuna.trim()) {
      errors.nombre_vacuna = 'El nombre de la vacuna es requerido';
    } else if (formData.nombre_vacuna.trim().length > 150) {
      errors.nombre_vacuna = 'El nombre no puede exceder 150 caracteres';
    }
    
    if (formData.tipo && formData.tipo.trim().length > 100) {
      errors.tipo = 'El tipo no puede exceder 100 caracteres';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      nombre_vacuna: '',
      descripcion: '',
      tipo: ''
    });
    setFormErrors({});
    setEditingVacuna(null);
  };

  // Abrir modal para crear
  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  // Abrir modal de opciones
  // Memoizar función para abrir opciones
  const handleOpenOptions = useCallback((vacuna) => {
    setSelectedVacuna(vacuna);
    setShowOptionsModal(true);
  }, []);

  // Cerrar modal de opciones
  const handleCloseOptions = () => {
    setShowOptionsModal(false);
    setSelectedVacuna(null);
  };

  // Abrir modal para editar desde opciones
  const handleOpenEdit = () => {
    if (!selectedVacuna) return;
    
    setFormData({
      nombre_vacuna: selectedVacuna.nombre_vacuna || '',
      descripcion: selectedVacuna.descripcion || '',
      tipo: selectedVacuna.tipo || ''
    });
    setEditingVacuna(selectedVacuna);
    setFormErrors({});
    setShowOptionsModal(false);
    setSelectedVacuna(null);
    setShowModal(true);
  };

  // Eliminar desde opciones
  const handleDeleteFromOptions = () => {
    if (!selectedVacuna) return;
    
    setShowOptionsModal(false);
    handleDelete(selectedVacuna);
    setSelectedVacuna(null);
  };

  // Guardar vacuna
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Error de validación', 'Por favor, corrige los errores en el formulario');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        nombre_vacuna: formData.nombre_vacuna.trim(),
        descripcion: formData.descripcion?.trim() || null,
        tipo: formData.tipo?.trim() || null
      };

      if (editingVacuna) {
        // Actualizar
        await gestionService.updateVacuna(editingVacuna.id_vacuna, dataToSave);
        Logger.info('Vacuna actualizada', { id: editingVacuna.id_vacuna });
        Alert.alert('Éxito', 'Vacuna actualizada correctamente');
      } else {
        // Crear
        await gestionService.createVacuna(dataToSave);
        Logger.info('Vacuna creada');
        Alert.alert('Éxito', 'Vacuna creada correctamente');
      }

      setShowModal(false);
      resetForm();
      await loadVacunas();
    } catch (error) {
      Logger.error('Error guardando vacuna', error);
      
      let errorMessage = 'No se pudo guardar la vacuna';
      if (error.response?.status === 409) {
        errorMessage = 'Ya existe una vacuna con ese nombre';
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

  // Memoizar función para eliminar vacuna
  const handleDelete = useCallback((vacuna) => {
    Alert.alert(
      'Eliminar Vacuna',
      `¿Estás seguro de que deseas eliminar "${vacuna.nombre_vacuna}"?\n\nEsta acción no se puede deshacer. Si la vacuna está siendo usada en esquemas de vacunación, no se podrá eliminar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await gestionService.deleteVacuna(vacuna.id_vacuna);
              Logger.info('Vacuna eliminada', { id: vacuna.id_vacuna });
              Alert.alert('Éxito', 'Vacuna eliminada correctamente');
              await loadVacunas();
            } catch (error) {
              Logger.error('Error eliminando vacuna', error);
              
              let errorMessage = 'No se pudo eliminar la vacuna';
              if (error.response?.status === 409) {
                errorMessage = error.response.data.error || 'La vacuna está siendo usada y no se puede eliminar';
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

  // Renderizar item de vacuna (memoizado)
  const renderVacunaItem = useCallback(({ item: vacuna }) => (
    <Card style={styles.vacunaCard}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Title style={styles.cardTitle}>
              {vacuna.nombre_vacuna}
            </Title>
            {vacuna.tipo && (
              <Text style={styles.cardTipo}>
                Tipo: {vacuna.tipo}
              </Text>
            )}
            {vacuna.descripcion && (
              <Text style={styles.cardDescription}>
                {vacuna.descripcion}
              </Text>
            )}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.optionsButton}
              onPress={() => handleOpenOptions(vacuna)}
            >
              <Text style={styles.optionsButtonText}>Opciones</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card.Content>
    </Card>
  ), [handleOpenOptions]);

  // Memoizar keyExtractor
  const keyExtractor = useCallback((item) => `vacuna-${item.id_vacuna}`, []);

  // Manejar refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadVacunas();
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
            <Text style={styles.headerTitle}>Gestión de Vacunas</Text>
            <Text style={styles.headerSubtitle}>
              Catálogo de vacunas del sistema
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar vacunas..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          showClearIcon={false}
          icon={() => null}
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
          Agregar Vacuna
        </Button>
      </View>

      {/* Content */}
      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORES.PRIMARIO} />
          <Text style={styles.loadingText}>Cargando vacunas...</Text>
        </View>
      )}

      {/* Lista de Vacunas con FlatList */}
      {!loading && (
        <>
          {filteredVacunas.length > 0 ? (
            <FlatList
              data={filteredVacunas}
              renderItem={renderVacunaItem}
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
                    Mostrando {filteredVacunas.length} de {vacunas.length} vacunas
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <Card style={styles.noDataCard}>
                  <Card.Content>
                    <Text style={styles.noDataText}>
                      {searchQuery 
                        ? 'No se encontraron vacunas con ese criterio'
                        : 'No hay vacunas registradas'}
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
                    ? 'No se encontraron vacunas con ese criterio'
                    : 'No hay vacunas registradas'}
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
              <Text style={styles.modalTitleOptions} numberOfLines={1} ellipsizeMode="tail">
                {selectedVacuna?.nombre_vacuna || 'Vacuna'}
              </Text>
              <TouchableOpacity onPress={handleCloseOptions} style={styles.modalCloseButton}>
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.optionsList}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={handleOpenEdit}
              >
                <Text style={styles.optionText}>Editar Vacuna</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.optionItem, styles.optionItemDelete]}
                onPress={handleDeleteFromOptions}
              >
                <Text style={[styles.optionText, styles.optionTextDelete]}>Eliminar Vacuna</Text>
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
              <Text style={styles.modalTitleOptions} numberOfLines={1} ellipsizeMode="tail">
                {editingVacuna ? 'Editar Vacuna' : 'Nueva Vacuna'}
              </Text>
              <TouchableOpacity
                onPress={() => !saving && (setShowModal(false), resetForm())}
                disabled={saving}
                style={styles.modalCloseButton}
              >
                <Text style={styles.closeButtonX}>X</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Nombre */}
              <View style={styles.formField}>
                <Text style={styles.label}>Nombre de la Vacuna *</Text>
                <TextInput
                  style={[
                    styles.input,
                    formErrors.nombre_vacuna && styles.inputError
                  ]}
                  value={formData.nombre_vacuna}
                  onChangeText={(text) => {
                    setFormData({ ...formData, nombre_vacuna: text });
                    if (formErrors.nombre_vacuna) {
                      setFormErrors({ ...formErrors, nombre_vacuna: null });
                    }
                  }}
                  placeholder="Ej: COVID-19 (Pfizer-BioNTech)"
                  maxLength={150}
                  editable={!saving}
                />
                {formErrors.nombre_vacuna && (
                  <Text style={styles.errorText}>{formErrors.nombre_vacuna}</Text>
                )}
              </View>

              {/* Tipo */}
              <View style={styles.formField}>
                <Text style={styles.label}>Tipo de Vacuna</Text>
                <TextInput
                  style={[
                    styles.input,
                    formErrors.tipo && styles.inputError
                  ]}
                  value={formData.tipo}
                  onChangeText={(text) => {
                    setFormData({ ...formData, tipo: text });
                    if (formErrors.tipo) {
                      setFormErrors({ ...formErrors, tipo: null });
                    }
                  }}
                  placeholder="Ej: COVID-19, Influenza, etc."
                  maxLength={100}
                  editable={!saving}
                />
                {formErrors.tipo && (
                  <Text style={styles.errorText}>{formErrors.tipo}</Text>
                )}
                <Text style={styles.hintText}>
                  Máximo 100 caracteres
                </Text>
              </View>

              {/* Descripción */}
              <View style={styles.formField}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.descripcion}
                  onChangeText={(text) => setFormData({ ...formData, descripcion: text })}
                  placeholder="Descripción de la vacuna (opcional)"
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
                {editingVacuna ? 'Actualizar' : 'Crear'}
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
  vacunaCard: {
    marginBottom: 15,
    elevation: 3,
    borderRadius: 12,
  },
  cardTipo: {
    fontSize: 14,
    color: COLORES.PRIMARIO,
    fontWeight: '600',
    marginTop: 5,
    marginBottom: 5,
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
    width: '100%',
    alignSelf: 'stretch',
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
  modalTitleOptions: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORES.PRIMARIO,
    flex: 1,
    minWidth: 0,
  },
  modalCloseButton: {
    flexShrink: 0,
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
    color: COLORES.ERROR_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 40,
    textAlign: 'center',
  },
});

export default GestionVacunas;

