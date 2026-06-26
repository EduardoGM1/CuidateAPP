/**
 * Preferencias de accesibilidad — única fuente de verdad para escalas de texto.
 */

export const CONFIG_STORAGE_KEY = 'configuracion_paciente';

/** @typedef {'compact' | 'normal' | 'large' | 'xlarge'} FontScaleKey */

export const FONT_SCALE_ORDER = ['compact', 'normal', 'large', 'xlarge'];

export const FONT_SCALE_MULTIPLIERS = {
  compact: 0.9,
  normal: 1,
  large: 1.15,
  xlarge: 1.3,
};

export const FONT_SCALE_LABELS = {
  compact: 'Pequeño',
  normal: 'Normal',
  large: 'Grande',
  xlarge: 'Muy grande',
};

/** Compatibilidad con tamanoFuente guardado antes del provider global. */
export const LEGACY_TO_FONT_SCALE = {
  pequeño: 'compact',
  normal: 'normal',
  grande: 'large',
};

export const FONT_SCALE_TO_LEGACY = {
  compact: 'pequeño',
  normal: 'normal',
  large: 'grande',
  xlarge: 'grande',
};

export const SYSTEM_FONT_SCALE_WARN_THRESHOLD = 1.2;

export const MAX_OS_FONT_MULTIPLIER = 1;
