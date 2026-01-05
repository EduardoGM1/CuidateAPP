import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { getMunicipiosByEstado } from '../../data/municipiosMexico';

/**
 * Componente selector de municipios/ciudades de México
 * Filtra los municipios según el estado seleccionado
 */
const MunicipioSelector = ({
  label = 'Municipio / Ciudad',
  value,
  onValueChange,
  estadoSeleccionado,
  error = null,
  required = false,
  disabled = false,
  style = {},
  labelStyle = {},
  errorStyle = {},
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Obtener municipios filtrados por estado
  const municipios = useMemo(() => {
    if (!estadoSeleccionado) {
      return [];
    }
    return getMunicipiosByEstado(estadoSeleccionado);
  }, [estadoSeleccionado]);

  // Filtrar municipios basado en el texto de búsqueda
  const filteredMunicipios = useMemo(() => {
    if (!searchText.trim()) {
      return municipios;
    }
    const searchLower = searchText.toLowerCase().trim();
    return municipios.filter(municipio =>
      municipio.toLowerCase().includes(searchLower)
    );
  }, [municipios, searchText]);

  const handleSelect = (municipio) => {
    onValueChange(municipio);
    setModalVisible(false);
    setSearchText(''); // Limpiar búsqueda al seleccionar
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSearchText(''); // Limpiar búsqueda al cerrar
  };

  const isDisabled = disabled || !estadoSeleccionado || municipios.length === 0;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.selector,
          error && styles.selectorError,
          isDisabled && styles.selectorDisabled,
        ]}
        onPress={() => {
          if (!isDisabled) {
            setModalVisible(true);
            setSearchText(''); // Limpiar búsqueda al abrir
          }
        }}
        disabled={isDisabled}
      >
        <Text style={[
          styles.selectorText,
          !value && styles.selectorPlaceholder,
        ]}>
          {value || (
            estadoSeleccionado 
              ? 'Seleccione un municipio' 
              : 'Primero seleccione un estado'
          )}
        </Text>
        <Text style={styles.selectorIcon}>▼</Text>
      </TouchableOpacity>

      {error && (
        <Text style={[styles.errorText, errorStyle]}>{error}</Text>
      )}

      {!estadoSeleccionado && (
        <Text style={styles.hintText}>
          Debe seleccionar un estado primero
        </Text>
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
              <Text style={styles.modalTitle}>
                Municipios de {estadoSeleccionado || ''}
              </Text>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Barra de búsqueda */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar municipio..."
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
            
            {municipios.length > 0 ? (
              filteredMunicipios.length > 0 ? (
                <ScrollView 
                  style={styles.optionsList}
                  contentContainerStyle={styles.optionsListContent}
                >
                  {filteredMunicipios.map((municipio, index) => (
                    <TouchableOpacity
                      key={`${municipio}-${index}`}
                      style={[
                        styles.optionItem,
                        value === municipio && styles.optionItemSelected,
                      ]}
                      onPress={() => handleSelect(municipio)}
                    >
                      <Text style={[
                        styles.optionText,
                        value === municipio && styles.optionTextSelected,
                      ]}>
                        {municipio}
                      </Text>
                      {value === municipio && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No se encontraron municipios
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No hay municipios disponibles para este estado
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
  hintText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
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
    flex: 1,
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  clearButtonText: {
    fontSize: 18,
    color: '#666',
  },
  optionsList: {
    maxHeight: 400,
  },
  optionsListContent: {
    paddingBottom: 20,
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
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#1976D2',
  },
  checkmark: {
    fontSize: 18,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default MunicipioSelector;


