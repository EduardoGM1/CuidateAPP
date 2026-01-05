import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import gestionService from '../../api/gestionService';
import Logger from '../../services/logger';

/**
 * Componente selector de medicamentos
 * Muestra un modal con lista de medicamentos desde la API para seleccionar
 * Reutiliza la estructura y patrón de VacunaSelector para mantener consistencia
 */
const MedicamentoSelector = ({
  label = 'Medicamento',
  value,
  onValueChange,
  error = null,
  required = false,
  disabled = false,
  showLabel = true,
  style = {},
  labelStyle = {},
  errorStyle = {},
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [medicamentos, setMedicamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorLoading, setErrorLoading] = useState(null);

  // Cargar medicamentos cuando se abre el modal
  useEffect(() => {
    if (modalVisible && medicamentos.length === 0 && !loading && !errorLoading) {
      loadMedicamentos();
    }
  }, [modalVisible]);

  const loadMedicamentos = async () => {
    try {
      setLoading(true);
      setErrorLoading(null);
      Logger.info('MedicamentoSelector: Cargando lista de medicamentos');
      
      const response = await gestionService.getMedicamentos();
      
      // El servicio puede devolver directamente un array o un objeto con data
      const medicamentosData = Array.isArray(response) 
        ? response 
        : (response?.data?.medicamentos || response?.medicamentos || []);
      
      if (Array.isArray(medicamentosData)) {
        setMedicamentos(medicamentosData);
        Logger.info(`MedicamentoSelector: ${medicamentosData.length} medicamentos cargados`);
      } else {
        throw new Error('Formato de respuesta inválido');
      }
    } catch (error) {
      Logger.error('MedicamentoSelector: Error cargando medicamentos', error);
      setErrorLoading(error.message || 'Error al cargar medicamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (medicamento) => {
    // Guardar el nombre del medicamento (string) para compatibilidad con el backend
    onValueChange(medicamento.nombre_medicamento || medicamento.nombre || medicamento);
    setModalVisible(false);
    setSearchText('');
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSearchText('');
  };

  const handleOpenModal = () => {
    if (!disabled) {
      setModalVisible(true);
      setSearchText('');
      // Recargar si hay error previo
      if (errorLoading) {
        setErrorLoading(null);
      }
    }
  };

  // Filtrar medicamentos basado en el texto de búsqueda
  const filteredMedicamentos = useMemo(() => {
    if (!searchText.trim()) {
      return medicamentos;
    }
    const searchLower = searchText.toLowerCase().trim();
    return medicamentos.filter(medicamento => {
      const nombre = medicamento.nombre_medicamento || medicamento.nombre || '';
      const descripcion = medicamento.descripcion || '';
      return (
        nombre.toLowerCase().includes(searchLower) ||
        descripcion.toLowerCase().includes(searchLower)
      );
    });
  }, [medicamentos, searchText]);

  // Encontrar el medicamento seleccionado
  const selectedMedicamento = medicamentos.find(
    m => (m.nombre_medicamento || m.nombre) === value
  );

  return (
    <View style={[styles.container, style]}>
      {showLabel && label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.selector,
          error && styles.selectorError,
          disabled && styles.selectorDisabled,
        ]}
        onPress={handleOpenModal}
        disabled={disabled}
      >
        <Text style={[
          styles.selectorText,
          !selectedMedicamento && styles.selectorPlaceholder,
        ]}>
          {selectedMedicamento 
            ? (selectedMedicamento.nombre_medicamento || selectedMedicamento.nombre)
            : value || 'Seleccione un medicamento'}
        </Text>
        <Text style={styles.selectorIcon}>▼</Text>
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, errorStyle]}>{error}</Text>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Medicamento</Text>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar medicamento..."
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchText('')}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1976D2" />
                <Text style={styles.loadingText}>Cargando medicamentos...</Text>
              </View>
            ) : errorLoading ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorLoading}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={loadMedicamentos}
                >
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : filteredMedicamentos.length > 0 ? (
              <ScrollView 
                style={styles.optionsList}
                contentContainerStyle={styles.optionsListContent}
                showsVerticalScrollIndicator={true}
              >
                {filteredMedicamentos.map((medicamento) => {
                  const nombre = medicamento.nombre_medicamento || medicamento.nombre || '';
                  const isSelected = nombre === value;
                  return (
                    <TouchableOpacity
                      key={medicamento.id_medicamento || medicamento.id || nombre}
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemSelected,
                      ]}
                      onPress={() => handleSelect(medicamento)}
                    >
                      <View style={styles.optionContent}>
                        <Text style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}>
                          {nombre}
                        </Text>
                        {medicamento.descripcion && (
                          <Text style={styles.optionSubtext} numberOfLines={2}>
                            {medicamento.descripcion}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>
                  {searchText.trim() 
                    ? 'No se encontraron medicamentos' 
                    : 'No hay medicamentos disponibles'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Reutilizar estilos de VacunaSelector para mantener consistencia visual
const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  selectorError: {
    borderColor: '#F44336',
  },
  selectorDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  selectorPlaceholder: {
    color: '#999',
  },
  selectorIcon: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 24,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#1976D2',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  optionsList: {
    maxHeight: 500,
  },
  optionsListContent: {
    paddingBottom: 10,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#1976D2',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  checkmark: {
    fontSize: 18,
    color: '#1976D2',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  noResultsContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
});

export default MedicamentoSelector;

