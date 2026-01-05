/**
 * Componente: ReminderBanner
 * 
 * Banner reutilizable para mostrar recordatorios importantes.
 * Diseñado para pacientes rurales con texto grande y claro.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import useTTS from '../../hooks/useTTS';
import hapticService from '../../services/hapticService';

const ReminderBanner = memo(({
  title,
  message,
  timeRemaining, // en minutos
  variant = 'info', // 'info', 'warning', 'urgent'
  onPress,
  onDismiss,
  icon,
  showCountdown = true,
}) => {
  const { speak } = useTTS();

  // Variantes de color
  const variants = {
    info: {
      bg: '#E3F2FD',
      border: '#2196F3',
      text: '#1976D2',
      icon: 'ℹ️',
    },
    warning: {
      bg: '#FFF3E0',
      border: '#FF9800',
      text: '#F57C00',
      icon: '⚠️',
    },
    urgent: {
      bg: '#FFEBEE',
      border: '#F44336',
      text: '#C62828',
      icon: '🚨',
    },
  };

  const config = variants[variant] || variants.info;
  const displayIcon = icon || config.icon;

  // Formatear tiempo restante
  const formatTimeRemaining = (minutes) => {
    if (!minutes || minutes < 0) return 'Ahora';
    
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (mins === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${mins}m`;
  };

  const handlePress = async () => {
    hapticService.medium();
    if (title && message) {
      // Usar variant según el tipo de banner
      await speak(`${title}. ${message}`, {
        variant: variant === 'urgent' ? 'alert' : variant === 'warning' ? 'information' : 'information',
        priority: variant === 'urgent' ? 'high' : 'medium'
      });
    }
    if (onPress) {
      onPress();
    }
  };

  const handleDismiss = () => {
    hapticService.light();
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.banner,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          borderWidth: 2,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${message}`}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.icon}>{displayIcon}</Text>
          {onDismiss && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.dismissText, { color: config.text }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {title && (
          <Text style={[styles.title, { color: config.text }]}>
            {title}
          </Text>
        )}

        {message && (
          <Text style={[styles.message, { color: config.text }]}>
            {message}
          </Text>
        )}

        {showCountdown && timeRemaining !== undefined && (
          <Text style={[styles.countdown, { color: config.text }]}>
            ⏰ En {formatTimeRemaining(timeRemaining)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
});

ReminderBanner.displayName = 'ReminderBanner';

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 24,
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  countdown: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default ReminderBanner;

