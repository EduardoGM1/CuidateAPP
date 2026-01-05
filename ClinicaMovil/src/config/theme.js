/**
 * Theme Configuration - IMSS Bienestar
 * 
 * Centralización de estilos y colores de la aplicación
 * Basado en la identidad visual oficial del IMSS Bienestar
 * 
 * @author Senior Developer
 * @date 2025-10-28
 */

import { COLORES } from '../utils/constantes';

/**
 * Estilos Globales - IMSS Bienestar
 */
export const theme = {
  // Colores
  colors: COLORES,
  
  // Botones
  button: {
    primary: {
      backgroundColor: COLORES.ACCION_PRIMARIA,
      color: COLORES.BLANCO,
    },
    secondary: {
      backgroundColor: COLORES.ACCION_SECUNDARIA,
      color: COLORES.BLANCO,
    },
    success: {
      backgroundColor: COLORES.ACCION_SUCESS,
      color: COLORES.BLANCO,
    },
    warning: {
      backgroundColor: COLORES.ACCION_WARNING,
      color: COLORES.BLANCO,
    },
    danger: {
      backgroundColor: COLORES.ACCION_DANGER,
      color: COLORES.BLANCO,
    },
    outline: {
      backgroundColor: COLORES.TRANSPARENTE,
      borderColor: COLORES.PRIMARIO,
      borderWidth: 1,
      color: COLORES.PRIMARIO,
    },
  },
  
  // Cards
  card: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Headers
  header: {
    backgroundColor: COLORES.PRIMARIO,
    color: COLORES.BLANCO,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  
  // Estados Médicos
  estados: {
    estable: {
      backgroundColor: COLORES.ESTABLE,
      color: COLORES.BLANCO,
    },
    bien: {
      backgroundColor: COLORES.BIEN,
      color: COLORES.BLANCO,
    },
    atencion: {
      backgroundColor: COLORES.CUIDADO,
      color: COLORES.BLANCO,
    },
    alerta: {
      backgroundColor: COLORES.ALERTA,
      color: COLORES.BLANCO,
    },
    urgente: {
      backgroundColor: COLORES.URGENTE,
      color: COLORES.BLANCO,
    },
    critico: {
      backgroundColor: COLORES.CRITICO,
      color: COLORES.BLANCO,
    },
  },
  
  // Fondos
  background: {
    primary: COLORES.FONDO,
    secondary: COLORES.FONDO_SECUNDARIO,
    card: COLORES.FONDO_CARD,
    overlay: COLORES.FONDO_OVERLAY,
  },
  
  // Textos
  text: {
    primary: COLORES.TEXTO_PRIMARIO,
    secondary: COLORES.TEXTO_SECUNDARIO,
    disabled: COLORES.TEXTO_DISABLED,
    onPrimary: COLORES.TEXTO_EN_PRIMARIO,
  },
  
  // Inputs
  input: {
    backgroundColor: COLORES.BLANCO,
    borderColor: COLORES.SECUNDARIO_LIGHT,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: COLORES.TEXTO_PRIMARIO,
  },
  
  // Espaciado
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  
  // Bordes
  border: {
    radius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      round: 9999,
    },
    width: 1,
    color: COLORES.SECUNDARIO_LIGHT,
  },
  
  // Elevación (Sombras)
  shadow: {
    small: {
      shadowColor: COLORES.NEGRO,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: COLORES.NEGRO,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    large: {
      shadowColor: COLORES.NEGRO,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
};

export default theme;








