/**
 * @file chatUtils.js
 * @description Funciones de utilidad para el chat (extraídas para testing)
 * @author Senior Developer
 * @date 2025-11-19
 */

/**
 * Obtener iniciales del paciente
 * @param {Object} paciente - Objeto con datos del paciente
 * @returns {string} Iniciales del paciente
 */
export const obtenerIniciales = (paciente) => {
  if (!paciente) return '??';
  const nombre = paciente.nombre || '';
  const apellido = paciente.apellido_paterno || paciente.apellido_materno || '';
  const inicial1 = nombre.charAt(0).toUpperCase() || '';
  const inicial2 = apellido.charAt(0).toUpperCase() || '';
  
  if (inicial1 && inicial2) {
    return inicial1 + inicial2;
  } else if (inicial1) {
    return inicial1 + (nombre.charAt(1) || '').toUpperCase();
  } else {
    return '??';
  }
};

/**
 * Obtener nombre completo del paciente
 * @param {Object} paciente - Objeto con datos del paciente
 * @returns {string} Nombre completo del paciente
 */
export const obtenerNombreCompleto = (paciente) => {
  if (!paciente) return 'Paciente';
  const partes = [
    paciente.nombre,
    paciente.apellido_paterno,
    paciente.apellido_materno
  ].filter(Boolean);
  return partes.join(' ') || 'Paciente';
};

/**
 * Formatear última actividad del paciente
 * @param {Date|string} fecha - Fecha de última actividad
 * @returns {string} Fecha formateada
 */
export const formatearUltimaActividad = (fecha) => {
  if (!fecha) return 'Nunca';
  const ahora = new Date();
  const ultima = new Date(fecha);
  const diff = ahora - ultima;
  const minutos = Math.floor(diff / 60000);
  
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  if (minutos < 1440) return `Hace ${Math.floor(minutos / 60)} h`;
  if (minutos < 2880) return 'Ayer';
  return ultima.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

/**
 * Agrupar mensajes por fecha
 * @param {Array} mensajes - Array de mensajes
 * @returns {Array} Array de grupos de mensajes por fecha
 */
export const agruparMensajesPorFecha = (mensajes) => {
  const grupos = [];
  let grupoActual = null;

  mensajes.forEach((mensaje) => {
    const fecha = new Date(mensaje.fecha_envio);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    const fechaMensaje = new Date(fecha);
    fechaMensaje.setHours(0, 0, 0, 0);

    let fechaLabel = '';
    if (fechaMensaje.getTime() === hoy.getTime()) {
      fechaLabel = 'Hoy';
    } else if (fechaMensaje.getTime() === ayer.getTime()) {
      fechaLabel = 'Ayer';
    } else {
      // Usar formateo manual en español
      const mesesAbreviados = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = mesesAbreviados[fecha.getMonth()];
      const año = fecha.getFullYear();
      fechaLabel = `${dia} ${mes} ${año}`;
    }

    if (!grupoActual || grupoActual.fecha !== fechaLabel) {
      grupoActual = {
        fecha: fechaLabel,
        mensajes: []
      };
      grupos.push(grupoActual);
    }

    grupoActual.mensajes.push(mensaje);
  });

  return grupos;
};

/**
 * Obtener estado del mensaje (simplificado: solo enviado o leído)
 * @param {Object} mensaje - Objeto del mensaje
 * @returns {string} Estado del mensaje ('enviado' o 'leido')
 */
export const obtenerEstadoMensaje = (mensaje) => {
  // Si el mensaje está leído, siempre retornar 'leido'
  if (mensaje.leido) return 'leido';
  
  // Si tiene estado explícito, validar que sea válido
  if (mensaje.estado) {
    // Normalizar estados antiguos a los nuevos
    if (mensaje.estado === 'entregado' || mensaje.estado === 'leido') {
      return 'leido';
    }
    if (mensaje.estado === 'enviado' || mensaje.estado === 'enviando' || mensaje.estado === 'pendiente') {
      return 'enviado';
    }
    return mensaje.estado;
  }
  
  // Si tiene fecha_envio, está enviado
  if (mensaje.fecha_envio) return 'enviado';
  
  // Por defecto, está enviando
  return 'enviado';
};

/**
 * Obtener icono de estado (simplificado: solo enviado o leído)
 * @param {string} estado - Estado del mensaje
 * @returns {string} Icono del estado
 */
export const obtenerIconoEstado = (estado) => {
  const iconos = {
    enviado: '✓',
    leido: '✓✓',
    // Mantener compatibilidad con estados antiguos
    enviando: '✓',
    entregado: '✓✓',
    error: '⚠️',
    pendiente: '✓',
  };
  return iconos[estado] || '✓';
};

/**
 * Obtener color de estado (simplificado: solo enviado o leído)
 * @param {string} estado - Estado del mensaje
 * @returns {string} Color del estado
 */
export const obtenerColorEstado = (estado) => {
  const colores = {
    enviado: '#999', // Gris para enviado
    leido: '#2196F3', // Azul para leído
    // Mantener compatibilidad con estados antiguos
    enviando: '#999',
    entregado: '#2196F3',
    error: '#F44336',
    pendiente: '#999',
  };
  return colores[estado] || '#999';
};

/**
 * Formatear fecha de mensaje
 * @param {Date|string} fecha - Fecha del mensaje
 * @returns {string} Fecha formateada
 */
export const formatearFechaMensaje = (fecha) => {
  if (!fecha) return '';
  const date = new Date(fecha);
  const ahora = new Date();
  const diff = ahora - date;
  const minutos = Math.floor(diff / 60000);
  
  if (minutos < 1) return 'Ahora';
  if (minutos < 60) return `Hace ${minutos} min`;
  if (minutos < 1440) return `Hace ${Math.floor(minutos / 60)} h`;
  // Usar formateo manual en español
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
};


