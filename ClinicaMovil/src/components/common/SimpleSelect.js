/**
 * Componente: Selector Simple Reutilizable
 * 
 * Componente de select/dropdown simple que muestra una lista de opciones
 * en un modal. Reutilizable para cualquier caso de uso.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { COLORES } from '../../utils/constantes';

const SimpleSelect = ({
  label,
  value,
  options = [],
  onValueChange,
  placeholder = 'Seleccionar...',
  style,
  labelStyle,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (option) => {
    onValueChange(option.value);
    setModalVisible(false);
  };

  const handleOpenModal = () => {
    if (!disabled) {
      setModalVisible(true);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[styles.label, labelStyle]}>{label}</Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.selectButton,
          disabled && styles.selectButtonDisabled
        ]}
        onPress={handleOpenModal}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.selectButtonText,
          !selectedOption && styles.selectButtonTextPlaceholder
        ]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Text style={styles.selectButtonIcon}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{label || 'Seleccionar'}</Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={options}
                  keyExtractor={(item) => item.value?.toString() || item.label}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.optionItem,
                        value === item.value && styles.optionItemSelected
                      ]}
                      onPress={() => handleSelect(item)}
                    >
                      <Text style={[
                        styles.optionText,
                        value === item.value && styles.optionTextSelected
                      ]}>
                        {item.label}
                      </Text>
                      {value === item.value && (
                        <Text style={styles.optionCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  style={styles.optionsList}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORES.FONDO_CARD,
    borderWidth: 1,
    borderColor: COLORES.TEXTO_DISABLED,
    borderRadius: 8,
    minHeight: 48,
  },
  selectButtonDisabled: {
    backgroundColor: COLORES.FONDO,
    opacity: 0.6,
  },
  selectButtonText: {
    fontSize: 15,
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  selectButtonTextPlaceholder: {
    color: COLORES.TEXTO_SECUNDARIO,
  },
  selectButtonIcon: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORES.FONDO_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: COLORES.NEGRO,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.TEXTO_DISABLED,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: 'bold',
  },
  optionsList: {
    maxHeight: 400,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.FONDO,
  },
  optionItemSelected: {
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
  },
  optionText: {
    fontSize: 15,
    color: COLORES.TEXTO_PRIMARIO,
    flex: 1,
  },
  optionTextSelected: {
    color: COLORES.NAV_PRIMARIO,
    fontWeight: '600',
  },
  optionCheck: {
    fontSize: 18,
    color: COLORES.NAV_PRIMARIO,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default SimpleSelect;
