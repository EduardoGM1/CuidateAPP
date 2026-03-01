/**
 * Colores y configuración compartida para gráficos (Reportes y Dashboard).
 */
export const CHART_COLORS = {
  primary: '#2dd4bf',
  secondary: '#94a3b8',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  neutral: '#64748b',
};

/** Paleta para gráficos de torta (orden consistente). */
export const PIE_COLORS = [
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.error,
  CHART_COLORS.neutral,
  CHART_COLORS.secondary,
  CHART_COLORS.primary,
];
