/**
 * Tema compartido para react-joyride (tour global y tours locales como el modal de paciente).
 * @param {number} [zIndex=10050] - z-index base del tooltip/overlay (subir si debe quedar sobre modales).
 */
export function createJoyrideStyles(zIndex = 10050) {
  return {
    options: {
      primaryColor: 'var(--color-primario, #006657)',
      textColor: 'var(--color-texto-primario, #1a1a1a)',
      overlayColor: 'rgba(16, 49, 43, 0.78)',
      zIndex,
      arrowColor: '#fff',
    },
    tooltip: {
      borderRadius: 10,
      fontSize: 14,
    },
    tooltipContainer: {
      textAlign: 'left',
    },
    buttonNext: {
      fontSize: 14,
    },
    buttonBack: {
      fontSize: 14,
    },
    buttonSkip: {
      fontSize: 14,
    },
  };
}

export const JOYRIDE_LOCALE = {
  back: 'Atrás',
  close: 'Cerrar',
  last: 'Listo',
  next: 'Siguiente',
  open: 'Abrir',
  skip: 'Omitir',
};
