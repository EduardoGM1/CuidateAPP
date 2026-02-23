/**
 * Utilidades de diseño responsivo - Compatibilidad con todos los teléfonos
 *
 * - useResponsiveDimensions: dimensiones reactivas (rotación, multi-ventana)
 * - scaleWithWidth: escalado suave de tamaños según ancho de referencia
 * - Breakpoints y helpers para grids/cards
 *
 * @see constantes.js (TAMAÑOS, COLORES)
 */

import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

/** Ancho de referencia (diseño base, ej. iPhone 375) */
export const BASE_WIDTH = 375;

/** Altura de referencia */
export const BASE_HEIGHT = 667;

/** Breakpoints en px (ancho de pantalla) */
export const BREAKPOINTS = {
  SMALL: 360,
  MEDIUM: 400,
  LARGE: 480,
};

/**
 * Escala un valor según el ancho actual respecto a BASE_WIDTH.
 * Limita el factor para no dejar texto/iconos demasiado pequeños o grandes.
 *
 * @param {number} value - Valor en px del diseño base
 * @param {number} screenWidth - Ancho actual (ej. useWindowDimensions().width)
 * @param {number} baseWidth - Ancho de referencia (default 375)
 * @returns {number}
 */
export function scaleWithWidth(value, screenWidth, baseWidth = BASE_WIDTH) {
  if (!value || screenWidth <= 0) return value;
  const scale = screenWidth / baseWidth;
  const minScale = 0.85;
  const maxScale = 1.25;
  const factor = Math.min(maxScale, Math.max(minScale, scale));
  return Math.round(value * factor);
}

/**
 * Hook: dimensiones de ventana reactivas (cambian con rotación o multi-ventana).
 * Preferir sobre Dimensions.get('window') para que el layout se actualice.
 *
 * @returns {{ width, height, isSmallScreen, isLandscape, scale, cardWidthHalf, spacing }}
 */
export function useResponsiveDimensions() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isSmallScreen = width <= BREAKPOINTS.SMALL;
    const isLandscape = width > height;
    const scale = width / BASE_WIDTH;
    const scaleFactor = Math.min(1.25, Math.max(0.85, scale));
    const cardWidthHalf = (width - 50) / 2;
    const spacing = {
      xs: scaleWithWidth(4, width),
      sm: scaleWithWidth(8, width),
      md: scaleWithWidth(16, width),
      lg: scaleWithWidth(24, width),
    };

    return {
      width,
      height,
      isSmallScreen,
      isLandscape,
      scale: scaleFactor,
      cardWidthHalf,
      spacing,
    };
  }, [width, height]);
}

/**
 * Ancho para una tarjeta en grid 2 columnas (margen total ~50)
 */
export function getCardWidthTwoColumns(screenWidth, gap = 50) {
  return (screenWidth - gap) / 2;
}

/**
 * Espaciado horizontal recomendado según ancho (evita bordes pegados en pantallas grandes)
 */
export function getHorizontalPadding(screenWidth) {
  if (screenWidth <= BREAKPOINTS.SMALL) return 12;
  if (screenWidth >= BREAKPOINTS.LARGE) return 24;
  return 20;
}

export default {
  BASE_WIDTH,
  BASE_HEIGHT,
  BREAKPOINTS,
  scaleWithWidth,
  useResponsiveDimensions,
  getCardWidthTwoColumns,
  getHorizontalPadding,
};
