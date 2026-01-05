/**
 * Componente: Botón Grande con Ícono
 * 
 * Botón accesible mínimo 80x80px para pacientes rurales.
 * Incluye TTS automático, feedback háptico y visual.
 */

import React, { memo } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Animated } from 'react-native';
import useTTS from '../../hooks/useTTS';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Badge from './Badge';

/**
 * Botón grande accesible para pacientes
 * @param {Object} props
 * @param {string} props.icon - Ícono/emoji (80x80px mínimo visual)
 * @param {string} props.label - Texto del botón
 * @param {string} props.subLabel - Texto secundario (opcional)
 * @param {Function} props.onPress - Función al presionar
 * @param {string} props.color - Color del borde (green, red, blue, orange)
 * @param {boolean} props.autoSpeak - Hablar automáticamente al tocar (default: true)
 * @param {string} props.speakText - Texto a pronunciar (default: label)
 * @param {number} props.badgeCount - Contador para mostrar en badge (opcional)
 * @param {string} props.badgeVariant - Variante del badge (default, warning, danger, success)
 */
const BigIconButton = memo(({
  icon,
  label,
  subLabel,
  onPress,
  color = 'green',
  autoSpeak = true,
  speakText,
  disabled = false,
  style,
  badgeCount,
  badgeVariant = 'default',
}) => {
  const { speak } = useTTS();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  // Colores por tipo
  const colorStyles = {
    green: { border: '#4CAF50', bg: '#F1F8E9' },
    red: { border: '#F44336', bg: '#FFEBEE' },
    blue: { border: '#2196F3', bg: '#E3F2FD' },
    orange: { border: '#FF9800', bg: '#FFF3E0' },
    purple: { border: '#9C27B0', bg: '#F3E5F5' },
  };

  const selectedColor = colorStyles[color] || colorStyles.green;

  const handlePress = async () => {
    if (disabled) return;

    // Animación de escala
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Feedback háptico
    hapticService.medium();

    // Feedback auditivo
    audioFeedbackService.playTap();

    // TTS automático
    if (autoSpeak) {
      const textToSpeak = speakText || label;
      await speak(textToSpeak);
    }

    // Ejecutar acción
    if (onPress) {
      onPress();
    }
  };

  const handleLongPress = async () => {
    if (disabled) return;
    
    // En long press, pronunciar descripción completa
    const fullText = subLabel ? `${label}. ${subLabel}` : label;
    await speak(fullText);
    hapticService.heavy();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            borderColor: selectedColor.border,
            backgroundColor: disabled ? '#E0E0E0' : selectedColor.bg,
          },
          disabled && styles.disabled,
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${subLabel || ''}${badgeCount ? `. ${badgeCount} notificaciones` : ''}`}
        accessibilityHint="Presiona para abrir. Mantén presionado para escuchar descripción completa."
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
          {badgeCount !== undefined && badgeCount > 0 && (
            <View style={styles.badgeContainer}>
              <Badge count={badgeCount} variant={badgeVariant} size="medium" />
            </View>
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.label, disabled && styles.disabledText]} numberOfLines={1}>
            {label}
          </Text>
          {subLabel && (
            <Text style={[styles.subLabel, disabled && styles.disabledText]} numberOfLines={2}>
              {subLabel}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

BigIconButton.displayName = 'BigIconButton';

const styles = StyleSheet.create({
  button: {
    width: '100%', // ✅ Ocupa todo el ancho del contenedor (90% de la pantalla)
    height: 200, // ✅ Altura aumentada a 200px para cards más grandes
    minHeight: 200, // ✅ Altura mínima igual a la altura fija
    maxHeight: 200, // ✅ Altura máxima igual a la altura fija
    borderRadius: 24, // ✅ Border radius aumentado proporcionalmente
    paddingVertical: 20, // ✅ Padding vertical aumentado
    paddingHorizontal: 24, // ✅ Padding horizontal aumentado
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginVertical: 10, // ✅ Espaciado vertical aumentado
    alignSelf: 'center', // ✅ Centrar cada card individualmente
    overflow: 'visible', // ✅ Cambiado a 'visible' para que el badge no afecte el tamaño
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 10, // ✅ Margen aumentado proporcionalmente
    width: 100, // ✅ 100px fijo para todas las cards
    height: 100, // ✅ 100px fijo para todas las cards
    minWidth: 100, // ✅ Ancho mínimo fijo
    minHeight: 100, // ✅ Altura mínima fija
    maxWidth: 100, // ✅ Ancho máximo fijo
    maxHeight: 100, // ✅ Altura máxima fija
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0, // ✅ Evitar que se encoja
    flexGrow: 0, // ✅ Evitar que crezca
  },
  icon: {
    fontSize: 80, // ✅ Tamaño de ícono aumentado proporcionalmente
    lineHeight: 100, // ✅ Asegurar altura de 100px
    textAlign: 'center', // ✅ Centrar el ícono
  },
  badgeContainer: {
    position: 'absolute',
    top: -4, // ✅ Ajustado para no afectar el tamaño de la card
    right: -4, // ✅ Ajustado para no afectar el tamaño de la card
    zIndex: 1, // ✅ Asegurar que el badge esté por encima
    // ✅ El badge no debe afectar el layout de la card
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start', // ✅ Alinear al inicio para mantener altura
    flexShrink: 0, // ✅ No permitir que se encoja
    flexGrow: 0, // ✅ No permitir que crezca
    height: 60, // ✅ Altura fija para el contenedor de texto
    minHeight: 60, // ✅ Altura mínima fija
    maxHeight: 60, // ✅ Altura máxima fija
  },
  label: {
    fontSize: 22, // ✅ Tamaño de fuente aumentado
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4, // ✅ Margen aumentado proporcionalmente
    width: '100%',
    lineHeight: 28, // ✅ Altura de línea aumentada
  },
  subLabel: {
    fontSize: 16, // ✅ Tamaño de fuente aumentado
    color: '#666',
    textAlign: 'center',
    width: '100%',
    lineHeight: 22, // ✅ Altura de línea aumentada
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
});

export default BigIconButton;
