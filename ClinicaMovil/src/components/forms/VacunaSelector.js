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
import { COLORES } from '../../utils/constantes';

/**
 * Componente selector de vacunas
 * Muestra un modal con lista de vacunas desde la API para seleccionar
 */
const VacunaSelector = ({
  label = 'Vacuna',
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
  const [vacunas, setVacunas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorLoading, setErrorLoading] = useState(null);

  // Cargar vacunas cuando se abre el modal
  useEffect(() => {
    if (modalVisible && vacunas.length === 0 && !loading && !errorLoading) {
      loadVacunas();
    }
  }, [modalVisible]);

  const loadVacunas = async () => {
    try {
      setLoading(true);
      setErrorLoading(null);
      Logger.info('VacunaSelector: Cargando lista de vacunas');
      
      const response = await gestionService.getVacunas();
      
      // El servicio puede devolver directamente un array o un objeto con data
      const vacunasData = Array.isArray(response) 
        ? response 
        : (response?.data?.vacunas || response?.vacunas || []);
      
      if (Array.isArray(vacunasData)) {
        setVacunas(vacunasData);
        Logger.info(`VacunaSelector: ${vacunasData.length} vacunas cargadas`);
      } else {
        throw new Error('Formato de respuesta inválido');
      }
    } catch (error) {
      Logger.error('VacunaSelector: Error cargando vacunas', error);
      setErrorLoading(error.message || 'Error al cargar vacunas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (vacuna) => {
    // Guardar el nombre de la vacuna (string) para compatibilidad con el backend
    onValueChange(vacuna.nombre_vacuna || vacuna.nombre || vacuna);
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

  // Filtrar vacunas basado en el texto de búsqueda
  const filteredVacunas = useMemo(() => {
    if (!searchText.trim()) {
      return vacunas;
    }
    const searchLower = searchText.toLowerCase().trim();
    return vacunas.filter(vacuna => {
      const nombre = vacuna.nombre_vacuna || vacuna.nombre || '';
      const tipo = vacuna.tipo || '';
      const descripcion = vacuna.descripcion || '';
      return (
        nombre.toLowerCase().includes(searchLower) ||
        tipo.toLowerCase().includes(searchLower) ||
        descripcion.toLowerCase().includes(searchLower)
      );
    });
  }, [vacunas, searchText]);

  // Encontrar la vacuna seleccionada
  const selectedVacuna = vacunas.find(
    v => (v.nombre_vacuna || v.nombre) === value
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
          !selectedVacuna && styles.selectorPlaceholder,
        ]}>
          {selectedVacuna 
            ? (selectedVacuna.nombre_vacuna || selectedVacuna.nombre)
            : value || 'Seleccione una vacuna'}
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
              <Text style={styles.modalTitle}>Seleccionar Vacuna</Text>
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
                placeholder="Buscar vacuna..."
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
                <Text style={styles.loadingText}>Cargando vacunas...</Text>
              </View>
            ) : errorLoading ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorLoading}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={loadVacunas}
                >
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            ) : filteredVacunas.length > 0 ? (
              <ScrollView 
                style={styles.optionsList}
                contentContainerStyle={styles.optionsListContent}
                showsVerticalScrollIndicator={true}
              >
                {filteredVacunas.map((vacuna) => {
                  const nombre = vacuna.nombre_vacuna || vacuna.nombre || '';
                  const isSelected = nombre === value;
                  return (
                    <TouchableOpacity
                      key={vacuna.id_vacuna || vacuna.id || nombre}
                      style={[
                        styles.optionItem,
                        isSelected && styles.optionItemSelected,
                      ]}
                      onPress={() => handleSelect(vacuna)}
                    >
                      <View style={styles.optionContent}>
                        <Text style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}>
                          {nombre}
                        </Text>
                        {vacuna.tipo && (
                          <Text style={styles.optionSubtext}>
                            {vacuna.tipo}
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
                    ? 'No se encontraron vacunas' 
                    : 'No hay vacunas disponibles'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
    color: COLORES.ERROR,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: COLORES.FONDO_CARD,
    minHeight: 48,
  },
  selectorError: {
    borderColor: COLORES.ERROR,
  },
  selectorDisabled: {
    backgroundColor: COLORES.FONDO,
    opacity: 0.6,
  },
  selectorText: {
    flex: 1,
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
  },
  selectorPlaceholder: {
    color: COLORES.TEXTO_SECUNDARIO,
  },
  selectorIcon: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORES.ERROR,
    marginTop: 4,
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

export default VacunaSelector;

