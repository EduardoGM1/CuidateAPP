/**
 * Paleta de Colores IMSS Bienestar
 * Manual de Identidad Gráfica - Paleta principal y complementaria
 * https://imssbienestar.gob.mx/
 *
 * Principal: Pantone 561 C (verde #006657), 465 C (canela #BC955C), 468 C (claro #DDC9A3)
 * Complementaria: 7420 C (#9F2241), 7421 C (#691C32), 626/627 C (#235B4E, #10312B)
 *
 * @author Senior Developer
 * @date 2025-10-28
 */

// Constantes globales de la aplicación
export const COLORES = {
  // ==================== IMSS BIENESTAR - Colores Oficiales ====================
  // Paleta principal (logosímbolo institucional)
  IMSS_VERDE_OSCURO: '#006657',    // Pantone 561 C - Verde oscuro (principal)
  IMSS_CANELA: '#BC955C',          // Pantone 465 C - Tono canela
  IMSS_CLARO: '#DDC9A3',          // Pantone 468 C - Color claro complementario
  // Paleta complementaria
  IMSS_ROJO: '#9F2241',           // Pantone 7420 C - Rojo oscuro
  IMSS_ROJO_OSCURO: '#691C32',    // Pantone 7421 C - Rojo oscuro
  IMSS_VERDE_MEDIO: '#235B4E',    // Pantone 626 C - Verde/azul oscuro
  IMSS_VERDE_MUY_OSCURO: '#10312B', // Pantone 627 C - Verde muy oscuro

  // Colores Primarios (basados en verde institucional)
  PRIMARIO: '#006657',            // Verde oscuro IMSS (Pantone 561 C)
  PRIMARIO_LIGHT: '#0A7D6B',      // Verde un poco más claro (derivado)
  PRIMARIO_DARK: '#10312B',       // Verde muy oscuro (Pantone 627 C)

  // Colores Secundarios (canela y complementario)
  SECUNDARIO: '#BC955C',          // Canela (Pantone 465 C)
  SECUNDARIO_LIGHT: '#DDC9A3',   // Claro complementario (Pantone 468 C)
  SECUNDARIO_DARK: '#9B7B4A',    // Canela oscuro (derivado)

  // Colores de Estado (Médicos)
  EXITO: '#006657',               // Verde IMSS
  EXITO_LIGHT: '#235B4E',         // Verde medio
  ADVERTENCIA: '#BC955C',         // Canela para advertencias suaves
  ADVERTENCIA_LIGHT: '#DDC9A3',  // Claro complementario
  ERROR: '#9F2241',               // Rojo institucional (Pantone 7420 C)
  ERROR_LIGHT: '#B52D4D',         // Rojo un poco más claro
  INFO: '#235B4E',                // Verde/azul oscuro (información)
  INFO_LIGHT: '#006657',          // Verde principal

  // Colores de Fondo
  FONDO: '#F5F2ED',               // Fondo crema muy suave (tinte canela)
  FONDO_SECUNDARIO: '#FAF8F5',    // Blanco con tinte cálido
  FONDO_CARD: '#FFFFFF',          // Blanco puro
  FONDO_OVERLAY: 'rgba(0,0,0,0.5)', // Overlay oscuro

  // Colores de Texto
  TEXTO_PRIMARIO: '#212121',      // Negro suave
  TEXTO_SECUNDARIO: '#5C5346',    // Gris cálido (legible sobre fondos claros)
  TEXTO_DISABLED: '#BDBDBD',     // Gris deshabilitado
  TEXTO_EN_PRIMARIO: '#FFFFFF',   // Blanco para texto sobre verde/canela

  // Colores para Pacientes (Indicadores Médicos)
  BIEN: '#006657',                // Verde estable (IMSS)
  ESTABLE: '#235B4E',             // Verde estable medio
  CUIDADO: '#BC955C',             // Canela - atención
  ALERTA: '#9B7B4A',              // Canela oscuro - alerta
  URGENTE: '#9F2241',             // Rojo institucional
  CRITICO: '#691C32',             // Rojo oscuro (Pantone 7421 C)

  // Colores Generales
  BLANCO: '#FFFFFF',
  NEGRO: '#000000',
  TRANSPARENTE: 'transparent',

  // Colores Acción
  ACCION_PRIMARIA: '#006657',     // Botón principal (verde IMSS)
  ACCION_SECUNDARIA: '#BC955C',   // Botón secundario (canela)
  ACCION_SUCESS: '#006657',       // Botón éxito
  ACCION_WARNING: '#9B7B4A',      // Botón advertencia (canela oscuro)
  ACCION_DANGER: '#9F2241',       // Botón peligro (rojo institucional)

  // Colores Accesibilidad
  ACCESIBILIDAD_ALTO: '#10312B',
  ACCESIBILIDAD_MEDIO: '#006657',

  // Navegación (tabs y headers)
  NAV_PRIMARIO: '#006657',        // Verde IMSS - flujo profesional
  NAV_PRIMARIO_INACTIVO: '#DDC9A3', // Claro complementario (tabs inactivos)
  NAV_PACIENTE: '#006657',        // Mismo verde para flujo paciente
  NAV_PACIENTE_FONDO: '#E8F0EE',  // Fondo verde muy suave (tinte #006657)
  NAV_FILTROS_ACTIVOS: '#E8F0EE',  // Fondo chips filtros (verde suave)

  // UI (bordes y sombras)
  BORDE_CLARO: '#DDC9A3',         // Borde claro complementario
  SWITCH_TRACK_OFF: '#DDC9A3',    // Track switch desactivado
  ADVERTENCIA_TEXTO: '#9B7B4A',   // Texto advertencia (canela oscuro)
  FONDO_ADVERTENCIA_CLARO: '#F8F4ED', // Fondo canela muy claro
  FONDO_VERDE_SUAVE: '#E8F0EE',   // Fondo verde muy claro (cards éxito)
  BORDE_VERDE_SUAVE: '#A8C9C2',  // Borde verde suave (derivado #006657)
  FONDO_ERROR_CLARO: '#FDF2F4',   // Fondo rojo muy claro (errores)
  BORDE_ERROR_CLARO: '#9F2241',   // Borde rojo institucional
};

export const TAMAÑOS = {
  TEXTO_NORMAL: 16,
  TEXTO_TITULO: 20,
  TEXTO_GRANDE: 24,
  ESPACIADO_PEQUEÑO: 8,
  ESPACIADO_MEDIO: 16,
  ESPACIADO_GRANDE: 24,
};

export const API_ENDPOINTS = {
  LOGIN: '/mobile/login',
  REGISTER: '/auth/register',
  PACIENTES: '/pacientes',
  CITAS: '/citas',
  SIGNOS_VITALES: '/signos-vitales',
};

export const ROLES = {
  PACIENTE: 'paciente',
  DOCTOR: 'doctor',
  ADMIN: 'admin',
};

export const ESTADOS_CITA = {
  PENDIENTE: 'pendiente',
  ATENDIDA: 'atendida',
  NO_ASISTIDA: 'no_asistida',
  REPROGRAMADA: 'reprogramada',
  CANCELADA: 'cancelada',
};

// Estados de solicitudes de reprogramación
export const ESTADOS_SOLICITUD_REPROGRAMACION = {
  PENDIENTE: 'pendiente',
  APROBADA: 'aprobada',
  RECHAZADA: 'rechazada',
  CANCELADA: 'cancelada',
};

/**
 * Delays para escalonar peticiones al montar pantallas (evitar ERR_NETWORK en Android).
 * Android limita ~5 conexiones simultáneas por host; varias pantallas disparan 4+ requests a la vez.
 */
export const NETWORK_STAGGER = {
  /** Retraso para fetchModulos cuando hay otros hooks (doctores, pacientes, citas) en la misma pantalla. */
  MODULOS_MS: 600,
  /** Retraso para carga secundaria (comorbilidades, citas, etc.) después de la primera ola de hooks. */
  SECONDARY_LOAD_MS: 1200,
  /** Retraso para fetchModulos en formularios (solo 1–2 hooks; retraso menor). */
  MODULOS_FORM_MS: 400,
  /** Retraso para carga de cita destacada u otros datos opcionales. */
  OPTIONAL_DATA_MS: 1000,
};

/**
 * Valor seguro para mostrar motivo/observaciones de cita en UI.
 * Si el backend envía por error un objeto encriptado { encrypted, iv, authTag }, no lo mostramos.
 * @param {*} value - motivo o observaciones (string o objeto)
 * @param {string} fallback - texto por defecto
 * @returns {string}
 */
export function getDisplayMotivo(value, fallback = 'Sin motivo') {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') {
    if (value.encrypted != null && value.iv != null && value.authTag != null) return fallback;
    return fallback;
  }
  const s = String(value).trim();
  if (s.startsWith('{"encrypted"') || s.startsWith('{"iv"')) return fallback;
  return s || fallback;
}
