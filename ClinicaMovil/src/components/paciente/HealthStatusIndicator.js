/**
 * Componente: HealthStatusIndicator
 * 
 * Indicador de estado de salud tipo semáforo (verde/amarillo/rojo).
 * Diseñado para pacientes rurales con colores grandes y visibles.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import useTTS from '../../hooks/useTTS';
import hapticService from '../../services/hapticService';

const HealthStatusIndicator = memo(({
  status = 'normal', // 'normal', 'warning', 'critical'
  label,
  showLabel = true,
  onPress,
  size = 'medium', // 'small', 'medium', 'large'
}) => {
  const { speak } = useTTS();

  // Estados con colores y mensajes
  const statusConfig = {
    normal: {
      color: '#4CAF50',
      bg: '#E8F5E9',
      text: 'Saludable',
      icon: '🟢',
      tts: 'Tu estado de salud es normal',
    },
    warning: {
      color: '#FF9800',
      bg: '#FFF3E0',
      text: 'Atención',
      icon: '🟡',
      tts: 'Tu estado de salud requiere atención',
    },
    critical: {
      color: '#F44336',
      bg: '#FFEBEE',
      text: 'Urgente',
      icon: '🔴',
      tts: 'Tu estado de salud requiere atención urgente',
    },
  };

  const config = statusConfig[status] || statusConfig.normal;

  // Tamaños del indicador
  const sizes = {
    small: { width: 16, height: 16, fontSize: 12 },
    medium: { width: 24, height: 24, fontSize: 14 },
    large: { width: 32, height: 32, fontSize: 16 },
  };

  const selectedSize = sizes[size] || sizes.medium;

  const handlePress = async () => {
    hapticService.light();
    await speak(config.tts);
    if (onPress) {
      onPress();
    }
  };

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={styles.container}
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.7 : 1}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`Estado de salud: ${config.text}`}
    >
      <View
        style={[
          styles.indicator,
          {
            backgroundColor: config.color,
            width: selectedSize.width,
            height: selectedSize.height,
            borderRadius: selectedSize.width / 2,
          },
        ]}
      />
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { fontSize: selectedSize.fontSize }]}>
            {label || config.text}
          </Text>
        </View>
      )}
    </Component>
  );
});

HealthStatusIndicator.displayName = 'HealthStatusIndicator';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  indicator: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  labelContainer: {
    marginLeft: 4,
  },
  label: {
    fontWeight: '600',
    color: '#333',
  },
});

export default HealthStatusIndicator;



