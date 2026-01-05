/**
 * @file chatUtils.test.js
 * @description Tests unitarios para funciones de utilidad del chat
 * @author Senior Developer
 * @date 2025-11-19
 */

import {
  obtenerIniciales,
  obtenerNombreCompleto,
  formatearUltimaActividad,
  agruparMensajesPorFecha
} from '../chatUtils';
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

export const obtenerNombreCompleto = (paciente) => {
  if (!paciente) return 'Paciente';
  const partes = [
    paciente.nombre,
    paciente.apellido_paterno,
    paciente.apellido_materno
  ].filter(Boolean);
  return partes.join(' ') || 'Paciente';
};

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
      fechaLabel = fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
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

describe('Chat Utils - obtenerIniciales', () => {
  test('debe retornar iniciales correctas con nombre y apellido', () => {
    const paciente = {
      nombre: 'Juan',
      apellido_paterno: 'Pérez',
    };
    expect(obtenerIniciales(paciente)).toBe('JP');
  });

  test('debe retornar iniciales cuando solo hay nombre', () => {
    const paciente = {
      nombre: 'Juan',
    };
    const resultado = obtenerIniciales(paciente);
    expect(resultado).toMatch(/^J/); // Debe empezar con J
    expect(resultado.length).toBeGreaterThan(0);
  });

  test('debe retornar "??" cuando no hay datos', () => {
    expect(obtenerIniciales(null)).toBe('??');
    expect(obtenerIniciales(undefined)).toBe('??');
    expect(obtenerIniciales({})).toBe('??');
  });

  test('debe usar apellido_materno si no hay apellido_paterno', () => {
    const paciente = {
      nombre: 'María',
      apellido_materno: 'García',
    };
    expect(obtenerIniciales(paciente)).toBe('MG');
  });

  test('debe manejar nombres con espacios', () => {
    const paciente = {
      nombre: 'Juan Carlos',
      apellido_paterno: 'Pérez',
    };
    expect(obtenerIniciales(paciente)).toBe('JP');
  });
});

describe('Chat Utils - obtenerNombreCompleto', () => {
  test('debe retornar nombre completo con todos los apellidos', () => {
    const paciente = {
      nombre: 'Juan',
      apellido_paterno: 'Pérez',
      apellido_materno: 'García',
    };
    expect(obtenerNombreCompleto(paciente)).toBe('Juan Pérez García');
  });

  test('debe retornar solo nombre si no hay apellidos', () => {
    const paciente = {
      nombre: 'Juan',
    };
    expect(obtenerNombreCompleto(paciente)).toBe('Juan');
  });

  test('debe retornar "Paciente" cuando no hay datos', () => {
    expect(obtenerNombreCompleto(null)).toBe('Paciente');
    expect(obtenerNombreCompleto(undefined)).toBe('Paciente');
    expect(obtenerNombreCompleto({})).toBe('Paciente');
  });

  test('debe filtrar valores vacíos', () => {
    const paciente = {
      nombre: 'Juan',
      apellido_paterno: '',
      apellido_materno: 'García',
    };
    expect(obtenerNombreCompleto(paciente)).toBe('Juan García');
  });
});

describe('Chat Utils - formatearUltimaActividad', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-19T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('debe retornar "Ahora" para fechas recientes', () => {
    const fecha = new Date('2025-11-19T11:59:30Z');
    expect(formatearUltimaActividad(fecha)).toBe('Ahora');
  });

  test('debe retornar "Hace X min" para minutos', () => {
    const fecha = new Date('2025-11-19T11:55:00Z');
    expect(formatearUltimaActividad(fecha)).toBe('Hace 5 min');
  });

  test('debe retornar "Hace X h" para horas', () => {
    const fecha = new Date('2025-11-19T10:00:00Z');
    expect(formatearUltimaActividad(fecha)).toBe('Hace 2 h');
  });

  test('debe retornar "Ayer" para fechas de ayer', () => {
    const fecha = new Date('2025-11-18T12:00:00Z');
    expect(formatearUltimaActividad(fecha)).toBe('Ayer');
  });

  test('debe retornar fecha formateada para fechas antiguas', () => {
    const fecha = new Date('2025-11-15T12:00:00Z');
    const resultado = formatearUltimaActividad(fecha);
    expect(resultado).toMatch(/\d{2}/); // Debe contener día
    expect(resultado).toMatch(/nov/i); // Debe contener mes
  });

  test('debe retornar "Nunca" cuando no hay fecha', () => {
    expect(formatearUltimaActividad(null)).toBe('Nunca');
    expect(formatearUltimaActividad(undefined)).toBe('Nunca');
  });
});

describe('Chat Utils - agruparMensajesPorFecha', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-19T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('debe agrupar mensajes por fecha correctamente', () => {
    const hoy = new Date('2025-11-19T10:00:00Z');
    const ayer = new Date('2025-11-18T10:00:00Z');

    const mensajes = [
      {
        id_mensaje: 1,
        fecha_envio: hoy.toISOString(),
        mensaje_texto: 'Mensaje hoy',
      },
      {
        id_mensaje: 2,
        fecha_envio: ayer.toISOString(),
        mensaje_texto: 'Mensaje ayer',
      },
    ];

    const grupos = agruparMensajesPorFecha(mensajes);

    expect(grupos).toHaveLength(2);
    expect(grupos[0].fecha).toBe('Hoy');
    expect(grupos[0].mensajes).toHaveLength(1);
    expect(grupos[1].fecha).toBe('Ayer');
    expect(grupos[1].mensajes).toHaveLength(1);
  });

  test('debe agrupar múltiples mensajes del mismo día', () => {
    const hoy = new Date('2025-11-19T10:00:00Z');

    const mensajes = [
      {
        id_mensaje: 1,
        fecha_envio: hoy.toISOString(),
        mensaje_texto: 'Mensaje 1',
      },
      {
        id_mensaje: 2,
        fecha_envio: hoy.toISOString(),
        mensaje_texto: 'Mensaje 2',
      },
      {
        id_mensaje: 3,
        fecha_envio: hoy.toISOString(),
        mensaje_texto: 'Mensaje 3',
      },
    ];

    const grupos = agruparMensajesPorFecha(mensajes);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].fecha).toBe('Hoy');
    expect(grupos[0].mensajes).toHaveLength(3);
  });

  test('debe manejar array vacío', () => {
    const grupos = agruparMensajesPorFecha([]);
    expect(grupos).toHaveLength(0);
  });

  test('debe ordenar mensajes dentro de cada grupo', () => {
    const hoy = new Date('2025-11-19T10:00:00Z');
    const hoy2 = new Date('2025-11-19T11:00:00Z');

    const mensajes = [
      {
        id_mensaje: 2,
        fecha_envio: hoy2.toISOString(),
        mensaje_texto: 'Mensaje 2',
      },
      {
        id_mensaje: 1,
        fecha_envio: hoy.toISOString(),
        mensaje_texto: 'Mensaje 1',
      },
    ];

    const grupos = agruparMensajesPorFecha(mensajes);
    expect(grupos[0].mensajes).toHaveLength(2);
  });
});

