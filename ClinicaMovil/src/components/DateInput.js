import React from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';
import { IconButton } from 'react-native-paper';

/**
 * Componente que formatea automáticamente fechas en formato YYYY-MM-DD
 * Auto-inserta guiones mientras el usuario escribe
 * 
 * @param {string} value - Valor actual en formato YYYY-MM-DD
 * @param {function} onChangeText - Función que recibe el texto formateado
 * @param {string} placeholder - Placeholder a mostrar
 * @param {string} label - Label del campo
 * @param {boolean} editable - Si el campo es editable
 * @param {string} error - Mensaje de error a mostrar
 * @param {boolean} showHelp - Si muestra ayuda visual
 */
const DateInput = ({ 
  value = '', 
  onChangeText, 
  placeholder = 'YYYY-MM-DD', 
  label,
  editable = true,
  error,
  showHelp = false,
  ...props 
}) => {
  
  /**
   * Formatea el texto ingresado a formato YYYY-MM-DD
   * - Solo acepta números
   * - Auto-inserta guiones en posición 4 y 7
   * - Máximo 10 caracteres
   */
  const handleTextChange = (text) => {
    // Remover caracteres no numéricos
    const numericText = text.replace(/[^0-9]/g, '');
    
    // Limitar a 10 caracteres (YYYYMMDD + 2 guiones)
    if (numericText.length <= 8) {
      let formatted = numericText;
      
      // Insertar guiones en posiciones correctas
      if (numericText.length > 4) {
        formatted = numericText.slice(0, 4) + '-' + numericText.slice(4);
      }
      if (numericText.length > 6) {
        formatted = numericText.slice(0, 4) + '-' + numericText.slice(4, 6) + '-' + numericText.slice(6);
      }
      
      onChangeText(formatted);
    }
  };

  // Validar si la fecha es válida
  const isValidDate = () => {
    if (!value || value.length !== 10) return null;
    
    const parts = value.split('-');
    if (parts.length !== 3) return false;
    
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    
    // Validaciones básicas
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    // Validar con Date object
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return false;
    }
    
    return true;
  };

  const valid = isValidDate();
  const showValidIndicator = value.length === 10 && valid !== null;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            !editable && styles.inputDisabled,
            error && styles.inputError,
            showValidIndicator && valid && styles.inputValid
          ]}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#999"
          editable={editable}
          maxLength={10}
          keyboardType="numeric"
          {...props}
        />
        
        {/* Indicador visual de fecha válida */}
        {showValidIndicator && valid && (
          <View style={styles.validIndicator}>
            <Text style={styles.validIcon}>✓</Text>
          </View>
        )}
      </View>

      {/* Mensaje de error */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Ayuda visual */}
      {showHelp && (
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            💡 Escribe solo números: 20251027 → 2025-10-27
          </Text>
        </View>
      )}

      {/* Sugerencia de formato */}
      {!value && !error && (
        <Text style={styles.hintText}>
          Ejemplo: 2025-10-27
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
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    fontFamily: 'monospace', // Mejor visualización de fechas
    letterSpacing: 1,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  inputError: {
    borderColor: '#f44336',
  },
  inputValid: {
    borderColor: '#4caf50',
  },
  validIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  validIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginTop: 4,
  },
  helpContainer: {
    marginTop: 4,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
  },
  helpText: {
    color: '#1976d2',
    fontSize: 13,
  },
  hintText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default DateInput;


