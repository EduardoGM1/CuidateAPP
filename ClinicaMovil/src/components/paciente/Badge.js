/**
 * Componente: Badge
 * 
 * Badge reutilizable para mostrar contadores y notificaciones.
 * Diseñado para pacientes rurales con texto grande y colores distintivos.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Badge = memo(({
  count = 0,
  text,
  variant = 'default', // 'default', 'warning', 'danger', 'success'
  size = 'medium', // 'small', 'medium', 'large'
  showZero = false,
  style,
}) => {
  // Si el contador es 0 y no se debe mostrar, no renderizar
  if (count === 0 && !showZero && !text) {
    return null;
  }

  // Variantes de color
  const variants = {
    default: { bg: '#2196F3', text: '#FFFFFF' },
    warning: { bg: '#FF9800', text: '#FFFFFF' },
    danger: { bg: '#F44336', text: '#FFFFFF' },
    success: { bg: '#4CAF50', text: '#FFFFFF' },
  };

  // Tamaños
  const sizes = {
    small: {
      container: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
      text: { fontSize: 12, fontWeight: '600' },
    },
    medium: {
      container: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
      text: { fontSize: 14, fontWeight: '700' },
    },
    large: {
      container: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
      text: { fontSize: 16, fontWeight: '700' },
    },
  };

  const selectedVariant = variants[variant] || variants.default;
  const selectedSize = sizes[size] || sizes.medium;

  const displayText = text || (count > 99 ? '99+' : count.toString());

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: selectedVariant.bg,
          ...selectedSize.container,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: selectedVariant.text,
            ...selectedSize.text,
          },
        ]}
      >
        {displayText}
      </Text>
    </View>
  );
});

Badge.displayName = 'Badge';

const styles = StyleSheet.create({
  badge: {
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  badgeText: {
    textAlign: 'center',
  },
});

export default Badge;



