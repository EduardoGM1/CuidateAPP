import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import useTestMode from '../hooks/useTestMode';

/**
 * Componente reutilizable para activar/desactivar el modo de prueba
 * Se puede usar en cualquier pantalla que necesite datos de prueba
 */
const TestModeToggle = ({ 
  onFillData = null, 
  showFillButton = true, 
  style = {},
  buttonStyle = {},
  textStyle = {} 
}) => {
  const { 
    isTestModeEnabled, 
    isLoading, 
    toggleTestMode, 
    fillFormWithTestData 
  } = useTestMode();

  const handleToggle = () => {
    toggleTestMode();
    
    Alert.alert(
      isTestModeEnabled ? 'Modo de Prueba Desactivado' : 'Modo de Prueba Activado',
      isTestModeEnabled 
        ? 'Los datos de prueba han sido desactivados.' 
        : 'Los datos de prueba están activados. Usa el botón 🎲 para llenar formularios automáticamente.',
      [{ text: 'OK' }]
    );
  };

  const handleFillData = () => {
    if (onFillData) {
      onFillData();
    } else {
      Alert.alert(
        'Función de Llenado',
        'Esta pantalla no tiene configurada la función de llenado automático.',
        [{ text: 'OK' }]
      );
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={[
          styles.toggleButton, 
          isTestModeEnabled && styles.toggleButtonActive,
          buttonStyle
        ]} 
        onPress={handleToggle}
      >
        <Text style={[styles.toggleButtonText, textStyle]}>
          {isTestModeEnabled ? '🧪' : '⚙️'}
        </Text>
      </TouchableOpacity>
      
      {isTestModeEnabled && showFillButton && (
        <TouchableOpacity 
          style={[styles.fillButton, buttonStyle]} 
          onPress={handleFillData}
        >
          <Text style={[styles.fillButtonText, textStyle]}>🎲</Text>
        </TouchableOpacity>
      )}
      
      {isTestModeEnabled && (
        <Text style={[styles.statusText, textStyle]}>Modo Prueba</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E86AB',
  },
  toggleButtonActive: {
    backgroundColor: '#2E86AB',
  },
  toggleButtonText: {
    fontSize: 16,
  },
  fillButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27AE60',
  },
  fillButtonText: {
    fontSize: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '600',
  },
});

export default TestModeToggle;

