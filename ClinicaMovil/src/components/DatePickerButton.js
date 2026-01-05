import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconButton } from 'react-native-paper';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Componente de selector de fecha con formato visual intuitivo
 * Muestra "21 noviembre 2025" visualmente
 * Guarda internamente en formato YYYY-MM-DD para el backend
 * 
 * @param {string} value - Valor actual en formato YYYY-MM-DD
 * @param {function} onChangeText - Función que recibe el texto en formato YYYY-MM-DD
 * @param {string} label - Label del campo
 * @param {boolean} editable - Si el campo es editable
 * @param {string} error - Mensaje de error a mostrar
 * @param {Date} minimumDate - Fecha mínima permitida
 * @param {Date} maximumDate - Fecha máxima permitida
 */
const DatePickerButton = ({ 
  value = '', 
  onChangeText, 
  label,
  editable = true,
  error,
  minimumDate = new Date('1900-01-01'),
  maximumDate = new Date('2100-12-31'),
  ...props 
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // Convertir YYYY-MM-DD a objeto Date
  useEffect(() => {
    if (value && value.length === 10) {
      const parts = value.split('-');
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (!isNaN(date.getTime())) {
        setSelectedDate(date);
      }
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  // Formatear fecha a texto legible: "21 noviembre 2025"
  const formatDateDisplay = (date) => {
    if (!date) return 'Seleccionar fecha';
    
    try {
      return format(date, 'd MMMM yyyy', { locale: es });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Convertir Date a YYYY-MM-DD
  const formatDateToDatabase = (date) => {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (date) {
      setSelectedDate(date);
      const formatted = formatDateToDatabase(date);
      onChangeText(formatted);
    }
  };

  const handlePress = () => {
    if (editable) {
      setShowPicker(true);
    }
  };

  const displayValue = selectedDate ? formatDateDisplay(selectedDate) : 'Seleccionar fecha';
  const hasValue = selectedDate !== null;
  const isValidDate = selectedDate && !isNaN(selectedDate.getTime());

  return (
    <View style={[styles.container, props.style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.dateButton,
          !editable && styles.dateButtonDisabled,
          error && styles.dateButtonError,
          hasValue && isValidDate && styles.dateButtonValid
        ]}
        onPress={handlePress}
        disabled={!editable}
      >
        <View style={styles.buttonContent}>
          <IconButton
            icon="calendar"
            size={20}
            iconColor={hasValue ? '#1976d2' : '#999'}
            disabled={true}
            style={styles.calendarIcon}
          />
          <Text style={[
            styles.dateText,
            !hasValue && styles.dateTextPlaceholder
          ]}>
            {displayValue}
          </Text>
          {hasValue && editable && (
            <IconButton
              icon="calendar-edit"
              size={20}
              iconColor="#1976d2"
              disabled={true}
              style={styles.editIcon}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* DateTime Picker */}
      {showPicker && (
        Platform.OS === 'ios' ? (
          <Modal
            visible={showPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowPicker(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.iosPickerContainer}>
                <View style={styles.iosHeader}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowPicker(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <Text style={styles.titleText}>Seleccionar Fecha</Text>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => setShowPicker(false)}
                  >
                    <Text style={styles.confirmButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  locale="es-ES"
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDate || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            locale="es-ES"
          />
        )
      )}

      {/* Mensaje de error */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Sugerencia */}
      {!hasValue && !error && (
        <Text style={styles.hintText}>
          Toca para seleccionar la fecha
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 4,
    backgroundColor: '#fff',
    minHeight: 50,
  },
  dateButtonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  dateButtonError: {
    borderColor: '#f44336',
  },
  dateButtonValid: {
    borderColor: '#4caf50',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  calendarIcon: {
    margin: 0,
    width: 40,
    height: 40,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 8,
  },
  dateTextPlaceholder: {
    color: '#999',
  },
  editIcon: {
    margin: 0,
    width: 40,
    height: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  iosPickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  confirmButtonText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: '600',
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
  },
});

export default DatePickerButton;

