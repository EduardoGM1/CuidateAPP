/**
 * Componente: Filtro de Rango de Tiempo
 * 
 * Permite al usuario seleccionar diferentes rangos de tiempo para filtrar los gráficos:
 * - Por defecto: Desde el primer registro hasta el último
 * - Últimos 3 meses
 * - Últimos 6 meses
 * - Por año completo
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const FILTROS_DISPONIBLES = {
  COMPLETO: 'completo',
  AÑO_ACTUAL: 'año_actual',
  ULTIMOS_3_MESES: 'ultimos_3_meses',
  ULTIMOS_6_MESES: 'ultimos_6_meses',
};

const TimeRangeFilter = ({ filtroSeleccionado, onFiltroChange, style }) => {
  const filtros = [
    {
      key: FILTROS_DISPONIBLES.COMPLETO,
      label: '📊 Completo',
      descripcion: 'Desde el inicio',
    },
    {
      key: FILTROS_DISPONIBLES.AÑO_ACTUAL,
      label: '🗓️ Año Actual',
      descripcion: 'Año actual',
    },
    {
      key: FILTROS_DISPONIBLES.ULTIMOS_3_MESES,
      label: '📅 Últimos 3 meses',
      descripcion: 'Últimos 3 meses',
    },
    {
      key: FILTROS_DISPONIBLES.ULTIMOS_6_MESES,
      label: '📆 Últimos 6 meses',
      descripcion: 'Últimos 6 meses',
    },
  ];

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Filtrar por período:</Text>
      <View style={styles.filtrosContainer}>
        {filtros.map((filtro) => {
          const estaSeleccionado = filtroSeleccionado === filtro.key;
          return (
            <TouchableOpacity
              key={filtro.key}
              style={[
                styles.filtroButton,
                estaSeleccionado && styles.filtroButtonActive,
              ]}
              onPress={() => onFiltroChange(filtro.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filtroText,
                  estaSeleccionado && styles.filtroTextActive,
                ]}
              >
                {filtro.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  filtrosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filtroButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 6,
    marginBottom: 6,
    minWidth: 90,
    flex: 1,
    maxWidth: '48%', // Para que quepan 2 botones por fila en pantallas pequeñas
  },
  filtroButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  filtroText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  filtroTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default TimeRangeFilter;
export { FILTROS_DISPONIBLES };
