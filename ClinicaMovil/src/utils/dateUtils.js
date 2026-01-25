/**
 * Utilidades para formateo de fechas y tiempos
 * Proporciona funciones consistentes para mostrar fechas en toda la aplicación
 */

/**
 * Formatea una fecha en formato legible: "6 de noviembre del 2025"
 * @param {string|Date} timestamp - Fecha a formatear
 * @returns {string} Fecha formateada o mensaje de error
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'Fecha no disponible';
  
  const date = new Date(timestamp);
  
  // Validar que la fecha sea válida
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  
  // Formatear fecha: "6 de noviembre del 2025"
  const dia = date.getDate();
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const mes = meses[date.getMonth()];
  const año = date.getFullYear();
  return `${dia} de ${mes} del ${año}`;
};

/**
 * Formatea una fecha con hora en formato legible: "6 de noviembre del 2025, hora: 12:27"
 * @param {string|Date} timestamp - Fecha a formatear
 * @returns {string} Fecha y hora formateada o mensaje de error
 */
export const formatDateTime = (timestamp) => {
  if (!timestamp) return 'Fecha no disponible';
  
  const date = new Date(timestamp);
  
  // Validar que la fecha sea válida
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  
  // Verificar si tiene hora (no es medianoche o tiene minutos/segundos)
  const tieneHora = date.getHours() !== 0 || 
                    date.getMinutes() !== 0 || 
                    date.getSeconds() !== 0 ||
                    timestamp.toString().includes('T') ||
                    timestamp.toString().includes(' ');
  
  // Formatear fecha: "6 de noviembre del 2025"
  const dia = date.getDate();
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const mes = meses[date.getMonth()];
  const año = date.getFullYear();
  const fechaFormateada = `${dia} de ${mes} del ${año}`;
  
  if (tieneHora) {
    const horaFormateada = date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return `${fechaFormateada}, hora: ${horaFormateada}`;
  }
  
  return fechaFormateada;
};

/**
 * Formatea una fecha con hora en formato HH:MM
 * @param {string|Date} timestamp - Fecha a formatear
 * @returns {string} Hora formateada o mensaje de error
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return 'Hora no disponible';
  
  const date = new Date(timestamp);
  
  // Validar que la fecha sea válida
  if (isNaN(date.getTime())) {
    return 'Hora inválida';
  }
  
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formatea tiempo relativo (hace X tiempo)
 * @param {string|Date} timestamp - Fecha a formatear
 * @returns {string} Tiempo relativo formateado
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Fecha no disponible';
  
  const now = new Date();
  const time = new Date(timestamp);
  
  // Validar que la fecha sea válida
  if (isNaN(time.getTime())) {
    return 'Fecha inválida';
  }
  
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Si la fecha es futura (diferencia negativa)
  if (diffMs < 0) {
    const futureMs = Math.abs(diffMs);
    const futureMins = Math.floor(futureMs / 60000);
    const futureHours = Math.floor(futureMs / 3600000);
    const futureDays = Math.floor(futureMs / 86400000);
    
    if (futureDays === 1) {
      return 'Mañana';
    } else if (futureDays === 2) {
      return 'Pasado mañana';
    } else if (futureDays > 2) {
      return formatDate(timestamp);
    } else if (futureHours >= 1) {
      return `En ${futureHours} horas`;
    } else {
      return `En ${futureMins} min`;
    }
  }

  // Si la fecha es pasada (diferencia positiva)
  if (diffMins < 1) {
    return 'Ahora';
  } else if (diffMins < 60) {
    return `Hace ${diffMins} min`;
  } else if (diffHours < 24) {
    return `Hace ${diffHours} horas`;
  } else if (diffDays === 1) {
    return 'Hace 1 día';
  } else if (diffDays === 2) {
    return 'Hace 2 días';
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  } else {
    // Para fechas más antiguas, mostrar formato DIA/MES/AÑO
    return formatDate(timestamp);
  }
};

/**
 * Valida si una fecha es válida
 * @param {string|Date} timestamp - Fecha a validar
 * @returns {boolean} True si la fecha es válida
 */
export const isValidDate = (timestamp) => {
  if (!timestamp) return false;
  
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
};

/**
 * Obtiene la diferencia en días entre dos fechas
 * @param {string|Date} date1 - Primera fecha
 * @param {string|Date} date2 - Segunda fecha
 * @returns {number} Diferencia en días
 */
export const getDaysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
    return 0;
  }
  
  const diffMs = Math.abs(d2 - d1);
  return Math.floor(diffMs / 86400000);
};

/**
 * Formatea una fecha para mostrar en listas de citas
 * @param {string|Date} timestamp - Fecha a formatear
 * @returns {string} Fecha formateada para citas
 */
export const formatAppointmentDate = (timestamp) => {
  if (!timestamp) return 'Fecha no disponible';
  
  const date = new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Comparar fechas sin hora
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  
  if (dateOnly.getTime() === todayOnly.getTime()) {
    return `Hoy - ${formatTime(timestamp)}`;
  } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
    return `Mañana - ${formatTime(timestamp)}`;
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return `Ayer - ${formatTime(timestamp)}`;
  } else {
    return `${formatDate(timestamp)} - ${formatTime(timestamp)}`;
  }
};

/**
 * Formatea una fecha con día de la semana completo en español
 * @param {string|Date} timestamp - Fecha a formatear
 * @returns {string} Fecha formateada con día de la semana (ej: "lunes, 6 de noviembre del 2025")
 */
export const formatDateWithWeekday = (timestamp) => {
  if (!timestamp) return 'Fecha no disponible';
  
  const date = new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  
  const diasSemana = [
    'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
  ];
  
  const diaSemana = diasSemana[date.getDay()];
  const fechaFormateada = formatDate(timestamp);
  
  return `${diaSemana}, ${fechaFormateada}`;
};

/**
 * Formatea una fecha con mes abreviado en español
 * @param {string|Date} timestamp - Fecha a formatear
 * @param {boolean} includeYear - Si incluir el año (default: true)
 * @returns {string} Fecha formateada (ej: "6 nov" o "6 nov 2025")
 */
export const formatDateShort = (timestamp, includeYear = true) => {
  if (!timestamp) return 'Fecha no disponible';
  
  const date = new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  
  const mesesAbreviados = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
  ];
  
  const dia = date.getDate();
  const mes = mesesAbreviados[date.getMonth()];
  const año = date.getFullYear();
  
  if (includeYear) {
    return `${dia} ${mes} ${año}`;
  }
  return `${dia} ${mes}`;
};

/**
 * Formatea una fecha con formato DD/MM/YYYY
 * @param {string|Date} timestamp - Fecha a formatear
 * @returns {string} Fecha formateada (ej: "06/11/2025")
 */
export const formatDateNumeric = (timestamp) => {
  if (!timestamp) return 'Fecha no disponible';
  
  const date = new Date(timestamp);
  
  if (isNaN(date.getTime())) {
    return 'Fecha inválida';
  }
  
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const año = date.getFullYear();
  
  return `${dia}/${mes}/${año}`;
};

export default {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  isValidDate,
  getDaysDifference,
  formatAppointmentDate,
  formatDateWithWeekday,
  formatDateShort,
  formatDateNumeric
};

