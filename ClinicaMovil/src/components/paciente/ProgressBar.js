/**
 * Componente: ProgressBar
 * 
 * Barra de progreso reutilizable para mostrar avance visual.
 * Diseñada para pacientes rurales con colores grandes y claros.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ProgressBar = memo(({
  current = 0,
  total = 100,
  showLabel = true,
  label,
  variant = 'default', // 'default', 'success', 'warning', 'danger'
  height = 8,
  style,
}) => {
  const percentage = total > 0 ? Math.min(Math.max((current / total) * 100, 0), 100) : 0;

  // Variantes de color
  const variants = {
    default: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
  };

  const color = variants[variant] || variants.default;

  const displayLabel = label || `${current} de ${total}`;

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{displayLabel}</Text>
          <Text style={styles.percentage}>{Math.round(percentage)}%</Text>
        </View>
      )}
      <View
        style={[
          styles.progressBar,
          {
            height,
            borderRadius: height / 2,
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage}%`,
              backgroundColor: color,
              borderRadius: height / 2,
            },
          ]}
        />
      </View>
    </View>
  );
});

ProgressBar.displayName = 'ProgressBar';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
  },
  progressBar: {
    width: '100%',
    backgroundColor: '#E0E0E0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
});

export default ProgressBar;



