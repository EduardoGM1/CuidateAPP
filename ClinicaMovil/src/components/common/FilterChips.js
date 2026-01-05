import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';
import { activeFiltersStyles } from '../../utils/sharedStyles';

/**
 * Componente reutilizable para mostrar filtros activos como chips
 * 
 * @param {Object} props
 * @param {Object} props.filters - Objeto con los filtros activos
 * @param {Function} props.onRemoveFilter - Función para remover un filtro específico
 * @param {Function} props.onClearAll - Función para limpiar todos los filtros
 * @param {Function} props.getFilterLabel - Función opcional para formatear labels de filtros
 */
const FilterChips = ({ filters, onRemoveFilter, onClearAll, getFilterLabel }) => {
  // Determinar si hay filtros activos
  const hasActiveFilters = Object.values(filters).some(value => 
    value !== null && value !== undefined && value !== ''
  );

  if (!hasActiveFilters) {
    return null;
  }

  const getLabel = (key, value) => {
    if (getFilterLabel) {
      return getFilterLabel(key, value);
    }
    // Labels por defecto
    const labels = {
      doctorId: 'Doctor',
      tipo_accion: 'Tipo de acción',
      entidad_afectada: 'Entidad',
      tipo: 'Tipo',
      estado: 'Estado',
      fecha_desde: 'Desde',
      fecha_hasta: 'Hasta',
      search: 'Búsqueda',
    };
    return `${labels[key] || key}: ${value}`;
  };

  return (
    <View style={activeFiltersStyles.activeFilters}>
      <Text style={activeFiltersStyles.activeFiltersLabel}>Filtros activos:</Text>
      <View style={activeFiltersStyles.filterChipsContainer}>
        {Object.entries(filters).map(([key, value]) => {
          if (value === null || value === undefined || value === '') {
            return null;
          }
          return (
            <Chip
              key={key}
              style={styles.filterChip}
              onClose={() => onRemoveFilter(key)}
              mode="outlined"
            >
              {getLabel(key, value)}
            </Chip>
          );
        })}
      </View>
      {onClearAll && (
        <TouchableOpacity
          style={activeFiltersStyles.clearFiltersButton}
          onPress={onClearAll}
        >
          <Text style={activeFiltersStyles.clearFiltersText}>Limpiar todos</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  filterChip: {
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
});

export default FilterChips;

