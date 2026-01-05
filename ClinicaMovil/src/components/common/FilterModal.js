import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Button, Title } from 'react-native-paper';
import DatePickerButton from '../DatePickerButton';
import { modalStyles, filterStyles } from '../../utils/sharedStyles';

/**
 * Componente reutilizable para modales de filtros
 * 
 * @param {Object} props
 * @param {boolean} props.visible - Controla la visibilidad del modal
 * @param {Function} props.onClose - Función para cerrar el modal
 * @param {Function} props.onApply - Función para aplicar filtros
 * @param {Function} props.onClear - Función para limpiar filtros
 * @param {Array} props.filterConfig - Configuración de filtros a mostrar
 * @param {Object} props.filterValues - Valores actuales de los filtros
 * @param {Function} props.onFilterChange - Función para actualizar valores de filtros
 */
const FilterModal = ({
  visible,
  onClose,
  onApply,
  onClear,
  filterConfig = [],
  filterValues = {},
  onFilterChange
}) => {
  const renderFilter = (config) => {
    const { type, key, label, options, placeholder } = config;
    const value = filterValues[key];

    switch (type) {
      case 'date':
        return (
          <View key={key} style={filterStyles.filterSection}>
            <DatePickerButton
              label={label}
              value={value || ''}
              onChangeText={(newValue) => onFilterChange(key, newValue)}
            />
          </View>
        );

      case 'chips':
        return (
          <View key={key} style={filterStyles.filterSection}>
            <Text style={filterStyles.filterLabel}>{label}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={filterStyles.doctoresList}
            >
              <TouchableOpacity
                style={[
                  filterStyles.doctorChip,
                  value === null && filterStyles.doctorChipActive
                ]}
                onPress={() => onFilterChange(key, null)}
              >
                <Text style={[
                  filterStyles.doctorChipText,
                  value === null && filterStyles.doctorChipTextActive
                ]}>
                  Todos
                </Text>
              </TouchableOpacity>
              {options.map((option) => {
                const optionValue = option.value !== undefined ? option.value : option.id;
                const optionLabel = option.label || option.nombre || option.name;
                return (
                  <TouchableOpacity
                    key={optionValue}
                    style={[
                      filterStyles.doctorChip,
                      value === optionValue && filterStyles.doctorChipActive
                    ]}
                    onPress={() => onFilterChange(key, optionValue)}
                  >
                    <Text style={[
                      filterStyles.doctorChipText,
                      value === optionValue && filterStyles.doctorChipTextActive
                    ]}>
                      {optionLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );

      case 'dropdown':
        // Por ahora, usamos chips también para dropdowns
        // En el futuro se puede mejorar con un Picker nativo
        return (
          <View key={key} style={filterStyles.filterSection}>
            <Text style={filterStyles.filterLabel}>{label}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={filterStyles.doctoresList}
            >
              <TouchableOpacity
                style={[
                  filterStyles.doctorChip,
                  !value && filterStyles.doctorChipActive
                ]}
                onPress={() => onFilterChange(key, null)}
              >
                <Text style={[
                  filterStyles.doctorChipText,
                  !value && filterStyles.doctorChipTextActive
                ]}>
                  Todos
                </Text>
              </TouchableOpacity>
              {options.map((option) => {
                const optionValue = option.value !== undefined ? option.value : option;
                const optionLabel = typeof option === 'string' ? option : (option.label || option);
                return (
                  <TouchableOpacity
                    key={optionValue}
                    style={[
                      filterStyles.doctorChip,
                      value === optionValue && filterStyles.doctorChipActive
                    ]}
                    onPress={() => onFilterChange(key, optionValue)}
                  >
                    <Text style={[
                      filterStyles.doctorChipText,
                      value === optionValue && filterStyles.doctorChipTextActive
                    ]}>
                      {optionLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContent}>
          <View style={modalStyles.modalHeader}>
            <Title style={modalStyles.modalTitle}>🔍 Filtros</Title>
            <TouchableOpacity onPress={onClose}>
              <Text style={modalStyles.closeButtonX}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={modalStyles.modalScrollView}
            contentContainerStyle={modalStyles.modalScrollContent}
            showsVerticalScrollIndicator={true}
          >
            {filterConfig.length > 0 ? (
              filterConfig.map(config => renderFilter(config))
            ) : (
              <Text style={styles.emptyText}>No hay filtros configurados</Text>
            )}
          </ScrollView>

          <View style={modalStyles.modalFooter}>
            <Button
              mode="outlined"
              onPress={onClear}
              style={[filterStyles.modalButton, filterStyles.cancelButton]}
            >
              Limpiar
            </Button>
            <Button
              mode="contained"
              onPress={onApply}
              style={[filterStyles.modalButton, filterStyles.applyButton]}
              buttonColor="#2196F3"
            >
              Aplicar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
});

export default FilterModal;

