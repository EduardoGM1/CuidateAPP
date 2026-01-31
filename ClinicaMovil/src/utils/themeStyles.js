/**
 * Helpers de estilos derivados del theme - Design System
 * Reutilizados por pantallas y componentes para evitar hex sueltos.
 * @see docs/PLAN-IMPLEMENTACION-DESIGN-SYSTEM.md
 */

import { StyleSheet } from 'react-native';
import theme from '../config/theme';
import { COLORES, TAMAÑOS } from './constantes';

const t = theme;

/**
 * Estilo de botón por variante (primary | secondary | success | warning | danger | outline)
 */
export function getButtonStyle(variant = 'primary') {
  const v = t.button[variant] || t.button.primary;
  return {
    backgroundColor: v.backgroundColor,
    borderWidth: v.borderWidth || 0,
    borderColor: v.borderColor,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.border.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  };
}

/**
 * Color de texto para botón por variante
 */
export function getButtonTextColor(variant = 'primary') {
  const v = t.button[variant] || t.button.primary;
  return v.color;
}

/**
 * Estilo base de card (desde theme.card)
 */
export function getCardStyle() {
  return { ...t.card };
}

/**
 * Estilo de overlay para modales
 */
export function getModalOverlay() {
  return {
    flex: 1,
    backgroundColor: t.background.overlay,
    justifyContent: 'flex-end',
  };
}

/**
 * Estilo de contenido de modal (desde theme + bordes)
 */
export function getModalContent() {
  return {
    backgroundColor: t.background.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    width: '100%',
  };
}

/**
 * Estilo de header de modal
 */
export function getModalHeader() {
  return {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.border.color,
  };
}

/**
 * Estilo de header de pantalla (navegación)
 */
export function getHeaderStyle(flujo = 'profesional') {
  const bg = flujo === 'paciente' ? t.navigation.headerPaciente : t.navigation.headerBackground;
  return {
    backgroundColor: bg,
    borderBottomWidth: 0,
  };
}

/**
 * Tint color del header (flecha, título)
 */
export function getHeaderTintColor(flujo = 'profesional') {
  return t.navigation.headerTintColor;
}

/**
 * StyleSheet de estilos comunes derivados del theme (para usar en create o merge)
 */
export const themeStyles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: t.background.primary,
  },
  cardBase: {
    ...t.card,
  },
  textPrimary: {
    fontSize: TAMAÑOS.TEXTO_NORMAL,
    color: t.text.primary,
  },
  textTitle: {
    fontSize: TAMAÑOS.TEXTO_TITULO,
    fontWeight: 'bold',
    color: t.text.primary,
  },
  textSecondary: {
    fontSize: 14,
    color: t.text.secondary,
  },
});

export default themeStyles;
