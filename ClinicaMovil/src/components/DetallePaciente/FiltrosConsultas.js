/**
 * @file FiltrosConsultas.js
 * @description Componente para filtros y búsqueda de consultas
 * @author Senior Developer
 * @date 2025-11-17
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * Componente de filtros para consultas
 * 
 * @param {Object} props
 * @param {string} props.filtroTipo - Tipo de filtro actual
 * @param {Function} props.onFiltroChange - Función para cambiar el filtro
 * @param {string} props.busquedaTexto - Texto de búsqueda actual
 * @param {Function} props.onBusquedaChange - Función para cambiar el texto de búsqueda
 */
const FiltrosConsultas = ({
  filtroTipo,
  onFiltroChange,
  busquedaTexto,
  onBusquedaChange
}) => {
  const filtros = [
    { key: 'todas', label: 'Todas', icon: '📋' },
    { key: 'completas', label: 'Completas', icon: '✅' },
    { key: 'con_signos', label: 'Con Signos', icon: '💓' },
    { key: 'con_diagnosticos', label: 'Con Diagnósticos', icon: '🩺' },
    { key: 'parciales', label: 'Parciales', icon: '⚠️' },
    { key: 'sin_completar', label: 'Sin Completar', icon: '📅' }
  ];

  return (
    <View style={styles.container}>
      {/* Búsqueda por texto */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Buscar por motivo, doctor, observaciones..."
          placeholderTextColor="#9E9E9E"
          value={busquedaTexto}
          onChangeText={onBusquedaChange}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filtros por tipo */}
      <View style={styles.filtrosContainer}>
        {filtros.map(filtro => (
          <TouchableOpacity
            key={filtro.key}
            style={[
              styles.filtroButton,
              filtroTipo === filtro.key && styles.filtroButtonActive
            ]}
            onPress={() => onFiltroChange(filtro.key)}
          >
            <Text
              style={[
                styles.filtroText,
                filtroTipo === filtro.key && styles.filtroTextActive
              ]}
            >
              {filtro.icon} {filtro.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8
  },
  searchContainer: {
    marginBottom: 12
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  filtrosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  filtroButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  filtroButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  filtroText: {
    fontSize: 12,
    color: '#616161',
    fontWeight: '500'
  },
  filtroTextActive: {
    color: '#FFFFFF',
    fontWeight: '600'
  }
});

export default React.memo(FiltrosConsultas);

