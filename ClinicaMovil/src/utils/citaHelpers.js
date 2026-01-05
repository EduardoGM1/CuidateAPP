/**
 * @file citaHelpers.js
 * @description Utilidades para trabajar con citas (próxima, última, filtrado)
 * @author Senior Developer
 * @date 2025-11-17
 */

/**
 * Obtiene la próxima cita (futura más cercana) o la última cita registrada
 * 
 * @param {Array} citas - Array de citas
 * @param {Date} fechaReferencia - Fecha de referencia (default: ahora)
 * @returns {Object} - { cita: Object|null, tipo: 'proxima'|'ultima'|null }
 */
export const obtenerProximaOUltimaCita = (citas, fechaReferencia = new Date()) => {
  if (!citas || citas.length === 0) {
    return { cita: null, tipo: null };
  }

  const ahora = fechaReferencia.getTime();
  
  // Separar citas futuras y pasadas
  const citasFuturas = [];
  const citasPasadas = [];

  citas.forEach(cita => {
    if (!cita.fecha_cita) return;
    
    const fechaCita = new Date(cita.fecha_cita).getTime();
    const diferencia = fechaCita - ahora;

    if (diferencia > 0) {
      // Cita futura
      citasFuturas.push({ ...cita, diferencia });
    } else {
      // Cita pasada
      citasPasadas.push({ ...cita, diferencia: Math.abs(diferencia) });
    }
  });

  // Si hay citas futuras, retornar la más próxima
  if (citasFuturas.length > 0) {
    citasFuturas.sort((a, b) => a.diferencia - b.diferencia);
    return {
      cita: citasFuturas[0],
      tipo: 'proxima'
    };
  }

  // Si no hay futuras, retornar la última pasada
  if (citasPasadas.length > 0) {
    citasPasadas.sort((a, b) => a.diferencia - b.diferencia);
    return {
      cita: citasPasadas[0],
      tipo: 'ultima'
    };
  }

  return { cita: null, tipo: null };
};

/**
 * Obtiene el texto descriptivo para la cita (Próxima cita / Última cita registrada)
 * 
 * @param {string} tipo - Tipo de cita ('proxima'|'ultima'|null)
 * @returns {string} - Texto descriptivo
 */
export const obtenerTextoDescriptivoCita = (tipo) => {
  switch (tipo) {
    case 'proxima':
      return 'Próxima Cita';
    case 'ultima':
      return 'Última Cita Registrada';
    default:
      return 'Cita';
  }
};

export default {
  obtenerProximaOUltimaCita,
  obtenerTextoDescriptivoCita
};

