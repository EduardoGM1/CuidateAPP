/**
 * Componente: Botón Grande con Ícono
 *
 * Botón accesible para pacientes. Escala con AccessibilityContext.
 */

import React, { memo, useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';
import useTTS from '../../hooks/useTTS';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Badge from './Badge';
import { COLORES } from '../../utils/constantes';
import AppText from '../common/AppText';
import { useAccessibilityOptional } from '../../context/AccessibilityContext';

const BASE_CARD_HEIGHT = 220;
const BASE_TEXT_HEIGHT = 72;

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
  const accessibility = useAccessibilityOptional();
  const m = accessibility?.fontScaleMultiplier ?? 1;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const layout = useMemo(
    () => ({
      cardHeight: Math.round(BASE_CARD_HEIGHT * m),
      textHeight: Math.round(BASE_TEXT_HEIGHT * m),
      iconSize: Math.round(80 * m),
      iconBox: Math.round(100 * m),
    }),
    [m]
  );

  const colorStyles = {
    green: { border: COLORES.EXITO_LIGHT, bg: '#F1F8E9' },
    red: { border: COLORES.ERROR_LIGHT, bg: '#FFEBEE' },
    blue: { border: COLORES.PRIMARIO_LIGHT, bg: COLORES.NAV_FILTROS_ACTIVOS },
    orange: { border: COLORES.ADVERTENCIA_LIGHT, bg: '#FFF3E0' },
    purple: { border: '#9C27B0', bg: '#F3E5F5' },
  };

  const selectedColor = colorStyles[color] || colorStyles.green;

  const handlePress = async () => {
    if (disabled) return;

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    hapticService.medium();
    audioFeedbackService.playTap();

    if (autoSpeak) {
      await speak(speakText || label);
    }

    if (onPress) onPress();
  };

  const handleLongPress = async () => {
    if (disabled) return;
    const fullText = subLabel ? `${label}. ${subLabel}` : label;
    await speak(fullText);
    hapticService.heavy();
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { minHeight: layout.cardHeight + 20 },
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          {
            borderColor: selectedColor.border,
            backgroundColor: disabled ? COLORES.TEXTO_DISABLED : selectedColor.bg,
            height: layout.cardHeight,
            minHeight: layout.cardHeight,
            maxHeight: layout.cardHeight,
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
        <View
          style={[
            styles.iconContainer,
            {
              width: layout.iconBox,
              height: layout.iconBox,
              minWidth: layout.iconBox,
              minHeight: layout.iconBox,
              maxWidth: layout.iconBox,
              maxHeight: layout.iconBox,
            },
          ]}
        >
          <AppText style={[styles.icon, { fontSize: layout.iconSize, lineHeight: layout.iconBox }]}>
            {icon}
          </AppText>
          {badgeCount !== undefined && badgeCount > 0 && (
            <View style={styles.badgeContainer}>
              <Badge count={badgeCount} variant={badgeVariant} size="medium" />
            </View>
          )}
        </View>
        <View style={[styles.textContainer, { height: layout.textHeight, minHeight: layout.textHeight, maxHeight: layout.textHeight }]}>
          <AppText style={styles.label} numberOfLines={2}>
            {label}
          </AppText>
          {subLabel ? (
            <AppText style={styles.subLabel} numberOfLines={3}>
              {subLabel}
            </AppText>
          ) : null}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

BigIconButton.displayName = 'BigIconButton';

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    flexShrink: 0,
    alignSelf: 'center',
  },
  button: {
    width: '100%',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginVertical: 10,
    alignSelf: 'center',
    overflow: 'visible',
    flexShrink: 0,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    flexGrow: 0,
  },
  icon: {
    textAlign: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    zIndex: 1,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    flexShrink: 0,
    flexGrow: 0,
  },
  label: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
    width: '100%',
    lineHeight: 28,
  },
  subLabel: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    width: '100%',
    lineHeight: 22,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default BigIconButton;
