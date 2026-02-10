import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { COLORES } from '../../utils/constantes';

/**
 * Componente reutilizable para campos de formulario con soporte para fecha
 * Maneja validación, estados de error y diferentes tipos de input
 */
const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  type = 'text',
  required = false,
  validation = null,
  error = null,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  rightIcon = null,
  onRightIconPress = null,
  style = {},
  inputStyle = {},
  labelStyle = {},
  errorStyle = {},
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  // Manejar validación en tiempo real
  const handleTextChange = (text) => {
    onChangeText(text);
    
    // Validación en tiempo real si se proporciona
    if (validation && typeof validation === 'function') {
      validation(text);
    }
  };

  // Manejar cambio de fecha personalizado
  const handleDateChange = () => {
    // Formatear fecha como YYYY-MM-DD para la base de datos
    const year = selectedYear;
    const month = String(selectedMonth).padStart(2, '0');
    const day = String(selectedDay).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    onChangeText(formattedDate);
    
    // Validación en tiempo real si se proporciona
    if (validation && typeof validation === 'function') {
      validation(formattedDate);
    }
    
    setShowDatePicker(false);
  };

  // Generar arrays para los selectores
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 1900; year--) {
      years.push(year);
    }
    return years;
  };

  const generateMonths = () => {
    return [
      { value: 1, label: 'Enero' },
      { value: 2, label: 'Febrero' },
      { value: 3, label: 'Marzo' },
      { value: 4, label: 'Abril' },
      { value: 5, label: 'Mayo' },
      { value: 6, label: 'Junio' },
      { value: 7, label: 'Julio' },
      { value: 8, label: 'Agosto' },
      { value: 9, label: 'Septiembre' },
      { value: 10, label: 'Octubre' },
      { value: 11, label: 'Noviembre' },
      { value: 12, label: 'Diciembre' }
    ];
  };

  const generateDays = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  // Mostrar selector de fecha
  const showDatePickerModal = () => {
    if (!disabled) {
      setShowDatePicker(true);
    }
  };

  // Formatear fecha para mostrar en el input
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Si no es una fecha válida, devolver el string original
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString; // Si hay error, devolver el string original
    }
  };

  // Renderizar icono derecho
  const renderRightIcon = () => {
    if (type === 'password') {
      return (
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          disabled={disabled}
          style={styles.iconButton}
        >
          <Text style={styles.iconText}>
            {showPassword ? '👁️‍🗨️' : '👁️'}
          </Text>
        </TouchableOpacity>
      );
    }
    
    if (type === 'date') {
      return (
        <TouchableOpacity
          onPress={showDatePickerModal}
          disabled={disabled}
          style={styles.iconButton}
        >
          <Icon source="calendar-blank" size={22} color="#666" />
        </TouchableOpacity>
      );
    }
    
    if (rightIcon) {
      return (
        <TouchableOpacity
          onPress={onRightIconPress}
          disabled={disabled}
          style={styles.iconButton}
        >
          <Text style={styles.iconText}>
            {rightIcon === 'search' ? '🔍' : rightIcon === 'close' ? '✕' : '📝'}
          </Text>
        </TouchableOpacity>
      );
    }
    
    return null;
  };

  // Determinar tipo de input
  const getInputType = () => {
    if (type === 'password') {
      return secureTextEntry && !showPassword;
    }
    return secureTextEntry;
  };

  // Determinar tipo de teclado
  const getKeyboardType = () => {
    if (keyboardType !== 'default') return keyboardType;
    
    switch (type) {
      case 'email':
        return 'email-address';
      case 'phone':
        return 'phone-pad';
      case 'number':
        return 'numeric';
      case 'date':
        return 'default'; // Para fecha no queremos teclado numérico
      default:
        return 'default';
    }
  };

  // Determinar capitalización
  const getAutoCapitalize = () => {
    if (autoCapitalize !== 'sentences') return autoCapitalize;
    
    switch (type) {
      case 'email':
        return 'none';
      case 'password':
        return 'none';
      default:
        return 'sentences';
    }
  };

  // Obtener valor para mostrar
  const getDisplayValue = () => {
    if (type === 'date') {
      return formatDateForDisplay(value);
    }
    return value;
  };

  // Obtener placeholder para fecha
  const getPlaceholder = () => {
    if (type === 'date') {
      return 'DD/MM/YYYY';
    }
    return placeholder;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {/* Input Container */}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
        disabled && styles.inputContainerDisabled
      ]}>
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            inputStyle
          ]}
          value={getDisplayValue()}
          onChangeText={type === 'date' ? undefined : handleTextChange}
          placeholder={getPlaceholder()}
          placeholderTextColor="#999"
          editable={!disabled && type !== 'date'}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={getKeyboardType()}
          autoCapitalize={getAutoCapitalize()}
          secureTextEntry={getInputType()}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onPressIn={type === 'date' ? showDatePickerModal : undefined}
        />
        
        {/* Right Icon */}
        {renderRightIcon()}
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Fecha de Nacimiento</Text>
            
            <View style={styles.datePickerContainer}>
              {/* Selector de Año */}
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorLabel}>Año</Text>
                <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                  {generateYears().map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.selectorOption,
                        selectedYear === year && styles.selectorOptionSelected
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={[
                        styles.selectorOptionText,
                        selectedYear === year && styles.selectorOptionTextSelected
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Selector de Mes */}
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorLabel}>Mes</Text>
                <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                  {generateMonths().map(month => (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles.selectorOption,
                        selectedMonth === month.value && styles.selectorOptionSelected
                      ]}
                      onPress={() => setSelectedMonth(month.value)}
                    >
                      <Text style={[
                        styles.selectorOptionText,
                        selectedMonth === month.value && styles.selectorOptionTextSelected
                      ]}>
                        {month.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Selector de Día */}
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorLabel}>Día</Text>
                <ScrollView style={styles.selectorScroll} showsVerticalScrollIndicator={false}>
                  {generateDays().map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.selectorOption,
                        selectedDay === day && styles.selectorOptionSelected
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[
                        styles.selectorOptionText,
                        selectedDay === day && styles.selectorOptionTextSelected
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Botones */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleDateChange}
              >
                <Text style={styles.modalButtonConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Error Message */}
      {error && (
        <Text style={[styles.errorText, errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#E53E3E',
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 48,
  },
  inputContainerFocused: {
    borderColor: '#3182CE',
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: '#E53E3E',
    borderWidth: 2,
  },
  inputContainerDisabled: {
    backgroundColor: '#F7FAFC',
    borderColor: '#E2E8F0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748',
    paddingVertical: 8,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  errorText: {
    fontSize: 14,
    color: '#E53E3E',
    marginTop: 4,
    marginLeft: 4,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 16,
    color: '#4A5568',
  },
  
  // Estilos para el modal de fecha
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORES.FONDO_OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    textAlign: 'center',
    marginBottom: 20,
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  selectorContainer: {
    flex: 1,
    marginHorizontal: 5,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 10,
  },
  selectorScroll: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  selectorOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  selectorOptionSelected: {
    backgroundColor: '#E6FFFA',
  },
  selectorOptionText: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
  },
  selectorOptionTextSelected: {
    color: '#319795',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  modalButtonCancel: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalButtonConfirm: {
    backgroundColor: '#319795',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    textAlign: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default FormField;