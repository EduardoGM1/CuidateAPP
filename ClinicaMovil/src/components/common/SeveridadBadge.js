/**
 * Componente reutilizable para mostrar badge de severidad
 * Usado en HistorialAuditoria y otros componentes
 */

import React from 'react';
import { Chip } from 'react-native-paper';
import { StyleSheet } from 'react-native';

const SeveridadBadge = ({ severidad, style, textStyle }) => {
  const getColor = (severidad) => {
    switch (severidad) {
      case 'critical':
        return '#D32F2F'; // Rojo oscuro
      case 'error':
        return '#F57C00'; // Naranja
      case 'warning':
        return '#FBC02D'; // Amarillo
      case 'info':
      default:
        return '#1976D2'; // Azul
    }
  };

  const getLabel = (severidad) => {
    switch (severidad) {
      case 'critical':
        return 'Crítico';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Advertencia';
      case 'info':
      default:
        return 'Info';
    }
  };

  return (
    <Chip
      style={[styles.badge, { backgroundColor: getColor(severidad) }, style]}
      textStyle={[styles.badgeText, textStyle]}
      mode="flat"
    >
      {getLabel(severidad)}
    </Chip>
  );
};

const styles = StyleSheet.create({
  badge: {
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    lineHeight: 14,
  },
});

export default SeveridadBadge;

