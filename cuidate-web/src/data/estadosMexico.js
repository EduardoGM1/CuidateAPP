/**
 * Catálogo de Estados de México
 * Basado en el catálogo oficial del INEGI
 * 32 estados de la República Mexicana
 */

export const estadosMexico = [
  { clave: '01', nombre: 'Aguascalientes' },
  { clave: '02', nombre: 'Baja California' },
  { clave: '03', nombre: 'Baja California Sur' },
  { clave: '04', nombre: 'Campeche' },
  { clave: '05', nombre: 'Chiapas' },
  { clave: '06', nombre: 'Chihuahua' },
  { clave: '07', nombre: 'Ciudad de México' },
  { clave: '08', nombre: 'Coahuila' },
  { clave: '09', nombre: 'Colima' },
  { clave: '10', nombre: 'Durango' },
  { clave: '11', nombre: 'Guanajuato' },
  { clave: '12', nombre: 'Guerrero' },
  { clave: '13', nombre: 'Hidalgo' },
  { clave: '14', nombre: 'Jalisco' },
  { clave: '15', nombre: 'México' },
  { clave: '16', nombre: 'Michoacán' },
  { clave: '17', nombre: 'Morelos' },
  { clave: '18', nombre: 'Nayarit' },
  { clave: '19', nombre: 'Nuevo León' },
  { clave: '20', nombre: 'Oaxaca' },
  { clave: '21', nombre: 'Puebla' },
  { clave: '22', nombre: 'Querétaro' },
  { clave: '23', nombre: 'Quintana Roo' },
  { clave: '24', nombre: 'San Luis Potosí' },
  { clave: '25', nombre: 'Sinaloa' },
  { clave: '26', nombre: 'Sonora' },
  { clave: '27', nombre: 'Tabasco' },
  { clave: '28', nombre: 'Tamaulipas' },
  { clave: '29', nombre: 'Tlaxcala' },
  { clave: '30', nombre: 'Veracruz' },
  { clave: '31', nombre: 'Yucatán' },
  { clave: '32', nombre: 'Zacatecas' }
];

/**
 * Obtener nombre del estado por clave
 */
export const getEstadoByClave = (clave) => {
  return estadosMexico.find(estado => estado.clave === clave)?.nombre || null;
};

/**
 * Obtener clave del estado por nombre
 */
export const getClaveByEstado = (nombre) => {
  return estadosMexico.find(estado => estado.nombre === nombre)?.clave || null;
};

/**
 * Verificar si un estado existe
 */
export const isValidEstado = (nombre) => {
  return estadosMexico.some(estado => estado.nombre === nombre);
};

export default estadosMexico;


