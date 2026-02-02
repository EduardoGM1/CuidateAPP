/**
 * Paleta de Colores IMSS Bienestar
 * Basado en la identidad visual oficial del IMSS Bienestar
 * https://imssbienestar.gob.mx/
 * 
 * @author Senior Developer
 * @date 2025-10-28
 */

// Constantes globales de la aplicación
export const COLORES = {
  // ==================== IMSS BIENESTAR - Colores Oficiales ====================
  
  // Colores Primarios IMSS (Azul Gobierno de México)
  PRIMARIO: '#0D47A1',           // Azul profundo oficial
  PRIMARIO_LIGHT: '#1565C0',    // Azul claro oficial
  PRIMARIO_DARK: '#0A3291',     // Azul oscuro oficial
  
  // Colores Secundarios
  SECUNDARIO: '#424242',        // Gris oscuro
  SECUNDARIO_LIGHT: '#616161',  // Gris medio
  SECUNDARIO_DARK: '#212121',   // Gris muy oscuro
  
  // Colores de Estado (Médicos)
  EXITO: '#2E7D32',             // Verde éxito (más profundo IMSS)
  EXITO_LIGHT: '#4CAF50',       // Verde claro
  ADVERTENCIA: '#F57C00',       // Naranja advertencia IMSS
  ADVERTENCIA_LIGHT: '#FF9800', // Naranja claro
  ERROR: '#C62828',             // Rojo error (más profundo)
  ERROR_LIGHT: '#F44336',       // Rojo claro
  INFO: '#1565C0',              // Azul información
  INFO_LIGHT: '#42A5F5',       // Azul claro información
  
  // Colores de Fondo
  FONDO: '#F5F5F5',             // Gris claro fondo
  FONDO_SECUNDARIO: '#FAFAFA',  // Blanco con tinte
  FONDO_CARD: '#FFFFFF',        // Blanco puro
  FONDO_OVERLAY: 'rgba(0,0,0,0.5)', // Overlay oscuro
  
  // Colores de Texto
  TEXTO_PRIMARIO: '#212121',    // Negro suave
  TEXTO_SECUNDARIO: '#757575',  // Gris texto secundario
  TEXTO_DISABLED: '#BDBDBD',    // Gris deshabilitado
  TEXTO_EN_PRIMARIO: '#FFFFFF', // Blanco para texto sobre azul
  
  // Colores para Pacientes (Indicadores Médicos)
  BIEN: '#2E7D32',              // Verde estable
  ESTABLE: '#43A047',           // Verde estable claro
  CUIDADO: '#FF8F00',           // Amarillo/naranja atención
  ALERTA: '#F57C00',            // Naranja alerta
  URGENTE: '#C62828',           // Rojo urgente
  CRITICO: '#B71C1C',           // Rojo crítico
  
  // Colores Generales
  BLANCO: '#FFFFFF',            // Blanco puro
  NEGRO: '#000000',             // Negro puro
  TRANSPARENTE: 'transparent',  // Transparente
  
  // Colores Acción
  ACCION_PRIMARIA: '#0D47A1',   // Botón principal IMSS
  ACCION_SECUNDARIA: '#424242', // Botón secundario
  ACCION_SUCESS: '#2E7D32',     // Botón éxito
  ACCION_WARNING: '#F57C00',    // Botón advertencia
  ACCION_DANGER: '#C62828',     // Botón peligro
  
  // Colores Accesibilidad (más brillantes para contraste)
  ACCESIBILIDAD_ALTO: '#0A3291',  // Alto contraste
  ACCESIBILIDAD_MEDIO: '#1565C0', // Medio contraste

  // Navegación (unificar tabs y headers)
  NAV_PRIMARIO: '#1565C0',       // Azul tabs/header flujo profesional (PRIMARIO_LIGHT)
  NAV_PRIMARIO_INACTIVO: '#BBDEFB', // Azul claro tabs inactivos
  NAV_PACIENTE: '#4CAF50',       // Verde header/tema flujo paciente (EXITO_LIGHT)
  NAV_PACIENTE_FONDO: '#E8F5E9', // Verde muy claro fondo stack paciente
  NAV_FILTROS_ACTIVOS: '#E3F2FD', // Azul muy claro fondo chips filtros activos

  // UI (bordes y sombras)
  BORDE_CLARO: '#E0E0E0',       // Borde gris claro
  SWITCH_TRACK_OFF: '#CCCCCC',  // Track switch desactivado
  ADVERTENCIA_TEXTO: '#E65100', // Texto naranja oscuro (avisos)
  FONDO_ADVERTENCIA_CLARO: '#FFF3E0', // Fondo naranja muy claro (paneles aviso)
  FONDO_VERDE_SUAVE: '#F1F8E9',       // Fondo verde muy claro (cards éxito)
  BORDE_VERDE_SUAVE: '#C8E6C9',       // Borde verde claro
  FONDO_ERROR_CLARO: '#FFF5F5',      // Fondo rojo muy claro (errores)
  BORDE_ERROR_CLARO: '#FFCDD2',      // Borde rojo claro
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
  LOGIN: '/auth/login',
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
