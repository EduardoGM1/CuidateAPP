/**
 * @file FiltrosConsultas.js
 * @description Componente para filtros de consultas por mes
 * @author Senior Developer
 * @date 2026-01-26
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

/**
 * Componente de filtro por mes para consultas
 * 
 * @param {Object} props
 * @param {string} props.mesSeleccionado - Mes seleccionado actualmente (formato: 'YYYY-MM' o 'todos')
 * @param {Function} props.onMesChange - Función para cambiar el mes seleccionado
 * @param {Array} props.consultas - Array de consultas para obtener los meses disponibles
 */
const FiltrosConsultas = ({
  mesSeleccionado,
  onMesChange,
  consultas = []
}) => {
  const [showDropdown, setShowDropdown] = useState(false);

  // Obtener meses únicos de las consultas
  const mesesDisponibles = useMemo(() => {
    if (!consultas || consultas.length === 0) {
      return [];
    }

    const mesesSet = new Set();
    consultas.forEach(consulta => {
      if (consulta.cita && consulta.cita.fecha_cita) {
        const fecha = new Date(consulta.cita.fecha_cita);
        const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        mesesSet.add(mesKey);
      }
    });

    // Convertir a array y ordenar descendente (más reciente primero)
    const meses = Array.from(mesesSet).sort((a, b) => b.localeCompare(a));

    // Formatear para mostrar
    return meses.map(mesKey => {
      const [año, mes] = mesKey.split('-');
      const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
      const mesesNombres = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return {
        key: mesKey,
        label: `${mesesNombres[parseInt(mes) - 1]} ${año}`,
        año: parseInt(año),
        mes: parseInt(mes)
      };
    });
  }, [consultas]);

  // Obtener el label del mes seleccionado
  const mesSeleccionadoLabel = useMemo(() => {
    if (mesSeleccionado === 'todos' || !mesSeleccionado) {
      return 'Todos los meses';
    }
    const mes = mesesDisponibles.find(m => m.key === mesSeleccionado);
    return mes ? mes.label : 'Todos los meses';
  }, [mesSeleccionado, mesesDisponibles]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filtrar por mes:</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text style={styles.dropdownButtonText}>
          📅 {mesSeleccionadoLabel}
        </Text>
        <Text style={styles.dropdownArrow}>
          {showDropdown ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>

      {showDropdown && (
        <View style={styles.dropdownList}>
          <ScrollView nestedScrollEnabled={true} style={styles.dropdownScroll}>
            <TouchableOpacity
              style={[
                styles.dropdownItem,
                (!mesSeleccionado || mesSeleccionado === 'todos') && styles.dropdownItemSelected
              ]}
              onPress={() => {
                onMesChange('todos');
                setShowDropdown(false);
              }}
            >
              <Text style={[
                styles.dropdownItemText,
                (!mesSeleccionado || mesSeleccionado === 'todos') && styles.dropdownItemTextSelected
              ]}>
                📅 Todos los meses
              </Text>
            </TouchableOpacity>
            {mesesDisponibles.map(mes => (
              <TouchableOpacity
                key={mes.key}
                style={[
                  styles.dropdownItem,
                  mesSeleccionado === mes.key && styles.dropdownItemSelected
                ]}
                onPress={() => {
                  onMesChange(mes.key);
                  setShowDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  mesSeleccionado === mes.key && styles.dropdownItemTextSelected
                ]}>
                  {mes.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
    flex: 1
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#616161',
    marginLeft: 8
  },
  dropdownList: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 200
  },
  dropdownScroll: {
    maxHeight: 200
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5'
  },
  dropdownItemSelected: {
    backgroundColor: '#E3F2FD'
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#212121'
  },
  dropdownItemTextSelected: {
    color: '#2196F3',
    fontWeight: '600'
  }
});

export default React.memo(FiltrosConsultas);

