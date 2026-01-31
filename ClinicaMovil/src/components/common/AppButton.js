/**
 * AppButton - Botón Paper con colores desde theme (Design System)
 * Variantes: primary | secondary | success | warning | danger | outline
 * @see docs/PLAN-IMPLEMENTACION-DESIGN-SYSTEM.md Fase 2
 */

import React from 'react';
import { Button } from 'react-native-paper';
import theme from '../../config/theme';

const AppButton = ({
  variant = 'primary',
  mode = 'contained',
  onPress,
  loading = false,
  disabled = false,
  children,
  style,
  contentStyle,
  labelStyle,
  ...rest
}) => {
  const v = theme.button[variant] || theme.button.primary;
  const buttonColor = v.backgroundColor;
  const textColor = v.color;
  const isOutline = variant === 'outline';
  const effectiveMode = isOutline ? 'outlined' : mode;

  return (
    <Button
      mode={effectiveMode}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      buttonColor={isOutline ? undefined : buttonColor}
      textColor={isOutline ? v.borderColor : textColor}
      style={[{ borderRadius: theme.border.radius.md }, style]}
      contentStyle={contentStyle}
      labelStyle={[{ fontWeight: '600' }, labelStyle]}
      {...rest}
    >
      {children}
    </Button>
  );
};

export default AppButton;
