/**
 * Texto con escala controlada por la app (no por el sistema).
 */

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { MAX_OS_FONT_MULTIPLIER } from '../../constants/accessibility';
import { useAccessibilityOptional } from '../../context/AccessibilityContext';

const AppText = ({
  style,
  fontSize,
  lineHeight,
  children,
  allowScaling = true,
  ...rest
}) => {
  const accessibility = useAccessibilityOptional();
  const multiplier = allowScaling && accessibility ? accessibility.fontScaleMultiplier : 1;

  const flat = StyleSheet.flatten(style) || {};
  const baseFontSize = fontSize ?? flat.fontSize;
  const baseLineHeight = lineHeight ?? flat.lineHeight;

  const scaledStyle = {};
  if (baseFontSize != null) {
    scaledStyle.fontSize = Math.round(baseFontSize * multiplier);
  }
  if (baseLineHeight != null) {
    scaledStyle.lineHeight = Math.round(baseLineHeight * multiplier);
  }

  return (
    <Text
      {...rest}
      allowFontScaling={false}
      maxFontSizeMultiplier={MAX_OS_FONT_MULTIPLIER}
      style={[style, scaledStyle]}
    >
      {children}
    </Text>
  );
};

export default AppText;
