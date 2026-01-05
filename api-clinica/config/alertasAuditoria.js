/**
 * Configuración de alertas y umbrales para auditoría
 * Define cuándo se deben generar alertas basadas en patrones de actividad
 */

export const UMBRALES_ALERTAS = {
  // Umbrales para logins fallidos
  LOGIN_FALLIDOS: {
    cantidad: 5,
    tiempoMinutos: 10,
    severidad: 'error'
  },

  // Umbrales para cambios masivos
  CAMBIOS_MASIVOS: {
    cantidad: 10,
    tiempoMinutos: 5,
    severidad: 'warning'
  },

  // Umbrales para accesos desde múltiples IPs
  IPS_MULTIPLES: {
    cantidad: 3,
    tiempoMinutos: 15,
    severidad: 'warning'
  },

  // Umbrales para errores críticos
  ERRORES_CRITICOS: {
    cantidad: 3,
    tiempoMinutos: 5,
    severidad: 'critical'
  }
};

/**
 * Tipos de acciones que requieren alerta inmediata
 */
export const ACCIONES_CRITICAS = [
  'error_critico',
  'acceso_sospechoso',
  'doctor_creado',
  'doctor_modificado',
  'configuracion_cambiada'
];

/**
 * Verificar si una acción requiere alerta inmediata
 * @param {string} tipoAccion - Tipo de acción
 * @returns {boolean}
 */
export function esAccionCritica(tipoAccion) {
  return ACCIONES_CRITICAS.includes(tipoAccion);
}

/**
 * Obtener severidad recomendada para un tipo de acción
 * @param {string} tipoAccion - Tipo de acción
 * @returns {string} Severidad ('info', 'warning', 'error', 'critical')
 */
export function obtenerSeveridad(tipoAccion) {
  const severidadMap = {
    'login_exitoso': 'info',
    'login_fallido': 'warning',
    'acceso_sospechoso': 'error',
    'error_sistema': 'error',
    'error_critico': 'critical',
    'sistema_automatico': 'info',
    'cita_estado_actualizado': 'info',
    'cita_reprogramada': 'info',
    'paciente_creado': 'info',
    'paciente_modificado': 'info',
    'doctor_creado': 'warning',
    'doctor_modificado': 'warning',
    'asignacion_paciente': 'info',
    'configuracion_cambiada': 'warning'
  };

  return severidadMap[tipoAccion] || 'info';
}

export default {
  UMBRALES_ALERTAS,
  ACCIONES_CRITICAS,
  esAccionCritica,
  obtenerSeveridad
};

