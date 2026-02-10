import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { estadosMexico } from '../../data/estadosMexico';
import { COLORES } from '../../utils/constantes';

/**
 * Componente selector de estados de México
 * Muestra un modal con lista de estados para seleccionar
 */
const EstadoSelector = ({
  label = 'Estado *',
  value,
  onValueChange,
  error = null,
  required = true,
  disabled = false,
  style = {},
  labelStyle = {},
  errorStyle = {},
}) => {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');

  const handleSelect = (estado) => {
    onValueChange(estado.nombre);
    setModalVisible(false);
    setSearchText(''); // Limpiar búsqueda al seleccionar
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSearchText(''); // Limpiar búsqueda al cerrar
  };

  const selectedEstado = estadosMexico.find(e => e.nombre === value);

  // Filtrar estados basado en el texto de búsqueda
  const filteredEstados = React.useMemo(() => {
    if (!searchText.trim()) {
      return estadosMexico;
    }
    const searchLower = searchText.toLowerCase().trim();
    return estadosMexico.filter(estado =>
      estado.nombre.toLowerCase().includes(searchLower)
    );
  }, [searchText]);

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
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => {
          if (!disabled) {
            setModalVisible(true);
            setSearchText(''); // Limpiar búsqueda al abrir
          }
        }}
        disabled={disabled}
      >
        <Text style={[
          styles.selectorText,
          !selectedEstado && styles.selectorPlaceholder,
        ]}>
          {selectedEstado ? selectedEstado.nombre : 'Seleccione un estado'}
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
              <Text style={styles.modalTitle}>Seleccionar Estado</Text>
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
                placeholder="Buscar estado..."
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
            
            <ScrollView 
              style={styles.optionsList}
              contentContainerStyle={styles.optionsListContent}
              showsVerticalScrollIndicator={true}
            >
              {filteredEstados.length > 0 ? (
                filteredEstados.map((item) => {
                  return (
                    <TouchableOpacity
                      key={item.clave}
                      style={[
                        styles.optionItem,
                        value === item.nombre && styles.optionItemSelected,
                      ]}
                      onPress={() => handleSelect(item)}
                    >
                      <Text style={[
                        styles.optionText,
                        value === item.nombre && styles.optionTextSelected,
                      ]}>
                        {item.nombre}
                      </Text>
                      {value === item.nombre && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No se encontraron estados
                  </Text>
                </View>
              )}
            </ScrollView>
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

export default EstadoSelector;


