import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

/**
 * Componente de fecha con campos separados (Día, Mes, Año)
 * Muestra de forma intuitiva DD-MM-YYYY
 * Guarda internamente en formato YYYY-MM-DD
 * 
 * @param {string} value - Valor actual en formato YYYY-MM-DD
 * @param {function} onChangeText - Función que recibe el texto en formato YYYY-MM-DD
 * @param {string} label - Label del campo
 * @param {boolean} editable - Si el campo es editable
 * @param {string} error - Mensaje de error a mostrar
 */
const DateInputSeparated = ({ 
  value = '', 
  onChangeText, 
  label,
  editable = true,
  error,
  ...props 
}) => {
  
  // Separar el valor YYYY-MM-DD en día, mes, año
  const parseDate = (dateString) => {
    if (!dateString || dateString.length !== 10) return { day: '', month: '', year: '' };
    
    const parts = dateString.split('-');
    return {
      year: parts[0] || '',
      month: parts[1] || '',
      day: parts[2] || ''
    };
  };

  // Estado local para los campos separados
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  // Sincronizar el valor externo con los campos internos
  useEffect(() => {
    const parsed = parseDate(value);
    setDay(parsed.day);
    setMonth(parsed.month);
    setYear(parsed.year);
  }, [value]);

  // Función para cambiar el día, mes o año
  const handleChange = (field, text) => {
    // Solo permitir números
    const numericText = text.replace(/[^0-9]/g, '');
    
    // Límites para cada campo
    let maxLength = 2;
    let maxValue = 31;
    
    if (field === 'month') {
      maxLength = 2;
      maxValue = 12;
    } else if (field === 'year') {
      maxLength = 4;
      maxValue = 2100;
    }

    // Actualizar el valor si está dentro de los límites
    if (numericText === '' || (parseInt(numericText) <= maxValue && numericText.length <= maxLength)) {
      if (field === 'day') {
        setDay(numericText);
      } else if (field === 'month') {
        setMonth(numericText);
      } else if (field === 'year') {
        setYear(numericText);
      }

      // Solo enviar el cambio cuando se complete cada campo
      if (numericText.length === maxLength || (field === 'year' && numericText.length === 4)) {
        updateDateFormatted();
      }
    }
  };

  // Actualizar la fecha formateada
  const updateDateFormatted = () => {
    const d = day.length === 2 ? day.padStart(2, '0') : '';
    const m = month.length === 2 ? month.padStart(2, '0') : '';
    const y = year.length === 4 ? year : '';

    if (d && m && y) {
      const formatted = `${y}-${m}-${d}`;
      onChangeText(formatted);
    }
  };

  // Función para avanzar al siguiente campo automáticamente
  const handleSubmit = (field) => {
    if (field === 'day' && day.length === 2) {
      // No hay avanzar, solo validar
    } else if (field === 'month' && month.length === 2) {
      // No hay avanzar, solo validar
    }
    updateDateFormatted();
  };

  const isValidDate = () => {
    if (!day || !month || !year || year.length !== 4) return null;
    
    const d = parseInt(day);
    const m = parseInt(month);
    const y = parseInt(year);
    
    if (y < 1900 || y > 2100) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return false;
    }
    
    return true;
  };

  const valid = isValidDate();
  const showValidIndicator = day && month && year.length === 4 && valid !== null;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.dateContainer}>
        {/* Campo Día */}
        <View style={[styles.fieldContainer, focusedField === 'day' && styles.focused]}>
          <Text style={styles.fieldLabel}>Día</Text>
          <TextInput
            style={styles.input}
            value={day}
            onChangeText={(text) => handleChange('day', text)}
            onSubmitEditing={() => handleSubmit('day')}
            placeholder="DD"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={2}
            editable={editable}
            onFocus={() => setFocusedField('day')}
            onBlur={() => setFocusedField(null)}
            {...props}
          />
        </View>

        {/* Separador */}
        <Text style={styles.separator}>/</Text>

        {/* Campo Mes */}
        <View style={[styles.fieldContainer, focusedField === 'month' && styles.focused]}>
          <Text style={styles.fieldLabel}>Mes</Text>
          <TextInput
            style={styles.input}
            value={month}
            onChangeText={(text) => handleChange('month', text)}
            onSubmitEditing={() => handleSubmit('month')}
            placeholder="MM"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={2}
            editable={editable}
            onFocus={() => setFocusedField('month')}
            onBlur={() => setFocusedField(null)}
            {...props}
          />
        </View>

        {/* Separador */}
        <Text style={styles.separator}>/</Text>

        {/* Campo Año */}
        <View style={[styles.fieldContainer, focusedField === 'year' && styles.focused, styles.yearField]}>
          <Text style={styles.fieldLabel}>Año</Text>
          <TextInput
            style={styles.input}
            value={year}
            onChangeText={(text) => handleChange('year', text)}
            onSubmitEditing={() => handleSubmit('year')}
            placeholder="YYYY"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={4}
            editable={editable}
            onFocus={() => setFocusedField('year')}
            onBlur={() => setFocusedField(null)}
            {...props}
          />
        </View>

        {/* Indicador de fecha válida */}
        {showValidIndicator && valid && (
          <View style={styles.validIndicator}>
            <Text style={styles.validIcon}>✓</Text>
          </View>
        )}
      </View>

      {/* Mensaje de error */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Sugerencia de formato */}
      {!day && !month && !year && !error && (
        <Text style={styles.hintText}>
          Ejemplo: 27/10/2025
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  fieldContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 4,
    backgroundColor: '#fff',
  },
  focused: {
    borderColor: '#1976d2',
    borderWidth: 2,
  },
  yearField: {
    flex: 1.2,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  input: {
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: 8,
    fontFamily: 'monospace',
  },
  separator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    lineHeight: 40,
  },
  validIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 4,
  },
  validIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 4,
  },
  hintText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default DateInputSeparated;


