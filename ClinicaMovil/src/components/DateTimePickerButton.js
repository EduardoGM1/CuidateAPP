import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Pressable } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

/**
 * Componente de selector de fecha y hora para citas médicas
 * Muestra "21 noviembre 2025, 14:30" visualmente
 * Guarda internamente en formato ISO datetime para el backend
 * 
 * @param {string} value - Valor actual en formato ISO (YYYY-MM-DDTHH:mm:ss) o YYYY-MM-DD HH:mm:ss
 * @param {function} onDateChange - Función que recibe el valor en formato ISO
 * @param {string} label - Label del campo
 * @param {boolean} disabled - Si el campo está deshabilitado
 * @param {string} error - Mensaje de error a mostrar
 * @param {Date} minimumDate - Fecha/hora mínima permitida
 */
const DateTimePickerButton = ({ 
  value = '', 
  onDateChange, 
  label,
  disabled = false,
  error,
  minimumDate = new Date(),
  ...props 
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(null);

  // Convertir string ISO a objeto Date
  useEffect(() => {
    if (value) {
      let date;
      
      // Intentar parsear diferentes formatos
      if (value.includes('T')) {
        // Formato ISO: 2025-10-31T14:30:00
        date = new Date(value);
      } else if (value.includes(' ')) {
        // Formato: 2025-10-31 14:30:00 o 2025-10-31 14:30
        date = new Date(value.replace(' ', 'T'));
      } else if (value.length === 10) {
        // Solo fecha: 2025-10-31, agregar hora por defecto (09:00)
        const parts = value.split('-');
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 9, 0);
      } else {
        date = new Date(value);
      }
      
      if (!isNaN(date.getTime())) {
        // Solo actualizar si el valor es diferente al actual
        setSelectedDateTime(prev => {
          if (!prev || prev.getTime() !== date.getTime()) {
            return date;
          }
          return prev;
        });
      } else {
        setSelectedDateTime(null);
      }
    } else if (!selectedDateTime) {
      // Solo establecer valor por defecto si no hay valor Y no hay selectedDateTime
      // Usar fecha/hora actual redondeada a la siguiente hora
      const now = new Date();
      now.setMinutes(0);
      now.setSeconds(0);
      now.setMilliseconds(0);
      // Si la hora actual es pasada, usar la siguiente hora
      const minDate = minimumDate instanceof Date ? minimumDate : new Date(minimumDate);
      if (now < minDate) {
        now.setHours(now.getHours() + 1);
      }
      setSelectedDateTime(now);
    }
  }, [value]);

  // Función para remover emojis de forma exhaustiva
  const removeEmojis = (text) => {
    if (!text || typeof text !== 'string') return text || '';
    
    return text
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
      .replace(/[\u{2600}-\u{26FF}]/gu, '')
      .replace(/[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '')
      .replace(/[\u{200D}]/gu, '')
      .replace(/[\u{20E3}]/gu, '')
      .replace(/[\u{1FA00}-\u{1FAFF}]/gu, '')
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
      .replace(/[\u{1F004}]/gu, '')
      .replace(/[\u{1F0CF}]/gu, '')
      .replace(/[\u{1F170}-\u{1F251}]/gu, '')
      .trim();
  };

  // Formatear fecha y hora a texto legible: "21 noviembre 2025, 14:30"
  // Usando formato manual para evitar emojis
  const formatDateTimeDisplay = (date) => {
    if (!date) return 'Seleccionar fecha y hora';
    
    try {
      // Formato manual sin usar locale de date-fns para evitar emojis
      const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      
      const dia = date.getDate();
      const mes = meses[date.getMonth()];
      const año = date.getFullYear();
      const horas = String(date.getHours()).padStart(2, '0');
      const minutos = String(date.getMinutes()).padStart(2, '0');
      
      // Construir el texto sin usar template literals que puedan introducir emojis
      const formatted = dia + ' ' + mes + ' ' + año + ', ' + horas + ':' + minutos;
      // Limpiar cualquier emoji que pueda estar
      return removeEmojis(formatted);
    } catch (error) {
      return removeEmojis('Fecha/hora inválida');
    }
  };

  // Convertir Date a ISO string para el backend
  const formatDateTimeToISO = (date) => {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  };

  const handleDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (date) {
      // Si ya había una hora seleccionada, mantenerla
      const newDate = selectedDateTime 
        ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                   selectedDateTime.getHours(), selectedDateTime.getMinutes())
        : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0);
      
      setSelectedDateTime(newDate);
      
      // En Android, después de seleccionar fecha, mostrar selector de hora
      if (Platform.OS === 'android') {
        setShowTimePicker(true);
      } else {
        // En iOS, ambos pickers se muestran juntos
        const formatted = formatDateTimeToISO(newDate);
        onDateChange(formatted);
      }
    }
  };

  const handleTimeChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (date && selectedDateTime) {
      const newDateTime = new Date(
        selectedDateTime.getFullYear(),
        selectedDateTime.getMonth(),
        selectedDateTime.getDate(),
        date.getHours(),
        date.getMinutes()
      );
      
      setSelectedDateTime(newDateTime);
      const formatted = formatDateTimeToISO(newDateTime);
      onDateChange(formatted);
    }
  };

  const handlePress = () => {
    if (!disabled) {
      if (Platform.OS === 'android') {
        // Usar API imperativa de Android para evitar hints visuales del sistema
        DateTimePickerAndroid.open({
          value: selectedDateTime || new Date(),
          mode: 'date',
          display: 'default',
          minimumDate: minDate,
          onChange: (event, date) => {
            if (event.type === 'set' && date) {
              // Después de seleccionar fecha, abrir selector de hora
              const newDate = selectedDateTime 
                ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), 
                           selectedDateTime.getHours(), selectedDateTime.getMinutes())
                : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0);
              
              setSelectedDateTime(newDate);
              
              // Abrir selector de hora inmediatamente después
              setTimeout(() => {
                DateTimePickerAndroid.open({
                  value: newDate,
                  mode: 'time',
                  display: 'default',
                  is24Hour: true,
                  onChange: (timeEvent, timeDate) => {
                    if (timeEvent.type === 'set' && timeDate) {
                      const finalDateTime = new Date(
                        newDate.getFullYear(),
                        newDate.getMonth(),
                        newDate.getDate(),
                        timeDate.getHours(),
                        timeDate.getMinutes()
                      );
                      setSelectedDateTime(finalDateTime);
                      const formatted = formatDateTimeToISO(finalDateTime);
                      onDateChange(formatted);
                    }
                  },
                });
              }, 100);
            }
          },
        });
      } else {
        // iOS: usar modal como antes
        setShowPicker(true);
      }
    }
  };

  const rawDisplayValue = selectedDateTime ? formatDateTimeDisplay(selectedDateTime) : 'Seleccionar fecha y hora';
  // Limpiar el displayValue de cualquier emoji que pueda haber - múltiples pasadas
  let displayValue = removeEmojis(rawDisplayValue);
  displayValue = removeEmojis(displayValue); // Segunda pasada
  displayValue = removeEmojis(String(displayValue || '')); // Tercera pasada como string
  
  const hasValue = selectedDateTime !== null;
  const isValidDateTime = selectedDateTime && !isNaN(selectedDateTime.getTime());
  const minDate = minimumDate instanceof Date ? minimumDate : new Date(minimumDate);

  return (
    <View style={[styles.container, props.style]}>
      {label && <Text style={styles.label}>{removeEmojis(label)}</Text>}
      
      <Pressable
        style={({ pressed }) => [
          styles.dateTimeButton,
          disabled && styles.dateTimeButtonDisabled,
          error && styles.dateTimeButtonError,
          hasValue && isValidDateTime && styles.dateTimeButtonValid,
          pressed && !disabled && styles.dateTimeButtonPressed
        ]}
        onPress={handlePress}
        disabled={disabled}
        android_ripple={{ color: '#E3F2FD', borderless: false }}
      >
        <View style={styles.buttonContent} pointerEvents="box-none">
          <View style={styles.textWrapper} pointerEvents="none">
            <Text
              style={[
                styles.dateTimeText,
                !hasValue && styles.dateTimeTextPlaceholder
              ]}
              allowFontScaling={true}
              suppressHighlighting={true}
              selectable={false}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayValue}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* DateTime Picker - iOS */}
      {showPicker && Platform.OS === 'ios' && (
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
                <Text style={styles.titleText}>Fecha y Hora</Text>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => {
                    if (selectedDateTime) {
                      const formatted = formatDateTimeToISO(selectedDateTime);
                      onDateChange(formatted);
                    }
                    setShowPicker(false);
                  }}
                >
                  <Text style={styles.confirmButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDateTime || new Date()}
                mode="datetime"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={minDate}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android ahora usa API imperativa, no necesita renderizar pickers aquí */}

      {/* Mensaje de error */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Sugerencia */}
      {!hasValue && !error && (
        <Text style={styles.hintText}>
          Toca para seleccionar fecha y hora
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
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    minHeight: 52,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dateTimeButtonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  dateTimeButtonError: {
    borderColor: '#f44336',
  },
  dateTimeButtonValid: {
    borderColor: '#4CAF50',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  dateTimeButtonPressed: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  textWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  dateTimeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#212121',
    includeFontPadding: false,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  dateTimeTextPlaceholder: {
    color: '#9E9E9E',
    fontWeight: '400',
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

export default DateTimePickerButton;
