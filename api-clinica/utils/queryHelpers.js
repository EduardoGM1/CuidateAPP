/**
 * Query Helpers Utility
 * 
 * Funciones reutilizables para construir queries de Sequelize.
 * Elimina duplicación de código en controladores.
 * 
 * @author Senior Developer
 * @date 2025-10-28
 */

import { Op } from 'sequelize';
import { FILTERS } from '../config/constants.js';

/**
 * Construye la cláusula ORDER BY según sort y estado
 * 
 * @param {string} sort - Tipo de ordenamiento ('recent' | 'oldest')
 * @param {string} estado - Estado del filtro ('activos' | 'inactivos' | 'todos')
 * @param {string} defaultField - Campo por defecto (default: 'fecha_registro')
 * @returns {Array} - Array de arrays para Sequelize order
 * 
 * @example
 * const orderClause = buildOrderClause('recent', 'todos', 'fecha_registro');
 * // Resultado: [['activo', 'DESC'], ['fecha_registro', 'DESC']]
 */
export const buildOrderClause = (sort, estado, defaultField = 'fecha_registro') => {
  // Determinar dirección de ordenamiento
  const sortDirection = sort === FILTERS.SORT_RECENT ? 'DESC' : 'ASC';
  
  // Si estado es 'todos', primero ordenar por activo, luego por fecha
  if (estado === FILTERS.ESTADO_ALL) {
    return [
      [FILTERS.DEFAULT_ACTIVE_FIRST, 'DESC'], // Activos primero (true > false)
      [defaultField, sortDirection]
    ];
  }
  
  // Si estado no es 'todos', solo ordenar por fecha
  return [[defaultField, sortDirection]];
};

/**
 * Construye la condición WHERE para el filtro de estado
 * 
 * @param {string} estado - Estado del filtro
 * @returns {Object} - Objeto con condición where
 * 
 * @example
 * const whereCondition = buildEstadoWhere('activos');
 * // Resultado: { activo: true }
 */
export const buildEstadoWhere = (estado) => {
  const whereCondition = {};
  
  switch (estado) {
    case FILTERS.ESTADO_ACTIVOS:
      whereCondition.activo = true;
      break;
    case FILTERS.ESTADO_INACTIVOS:
      whereCondition.activo = false;
      break;
    case FILTERS.ESTADO_ALL:
      // No aplicar filtro de activo
      break;
    default:
      // Por defecto solo activos
      whereCondition.activo = true;
  }
  
  return whereCondition;
};

/**
 * Valida y normaliza el límite de paginación
 * 
 * @param {string|number} limit - Límite solicitado
 * @param {number} maxLimit - Límite máximo permitido
 * @param {number} defaultLimit - Límite por defecto
 * @returns {number} - Límite validado
 * 
 * @example
 * const limit = validateLimit(req.query.limit, 100, 20);
 */
export const validateLimit = (limit, maxLimit, defaultLimit) => {
  const parsedLimit = parseInt(limit);
  
  if (isNaN(parsedLimit) || parsedLimit <= 0) {
    return defaultLimit;
  }
  
  return Math.min(parsedLimit, maxLimit);
};

/**
 * Valida y normaliza el offset de paginación
 * 
 * @param {string|number} offset - Offset solicitado
 * @returns {number} - Offset validado
 */
export const validateOffset = (offset) => {
  const parsedOffset = parseInt(offset);
  return isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset;
};

/**
 * Construye opciones de paginación completas
 * 
 * @param {Object} queryParams - Parámetros de query (limit, offset, sort, estado)
 * @param {Object} config - Configuración (defaultField, maxLimit, defaultLimit)
 * @returns {Object} - Objeto con order, where, limit, offset
 * 
 * @example
 * const { order, where, limit, offset } = buildPaginationOptions(
 *   req.query,
 *   { defaultField: 'fecha_registro', maxLimit: 100, defaultLimit: 20 }
 * );
 */
export const buildPaginationOptions = (queryParams, config) => {
  const {
    limit: rawLimit = config.defaultLimit || 20,
    offset: rawOffset = 0,
    sort = FILTERS.SORT_RECENT,
    estado = FILTERS.ESTADO_ACTIVOS
  } = queryParams;
  
  const { defaultField = 'fecha_registro', maxLimit = 1000 } = config;
  
  const limit = validateLimit(rawLimit, maxLimit, config.defaultLimit || 20);
  const offset = validateOffset(rawOffset);
  
  const order = buildOrderClause(sort, estado, defaultField);
  const where = buildEstadoWhere(estado);
  
  return {
    order,
    where,
    limit,
    offset
  };
};

/**
 * Construye condición de búsqueda por texto
 * 
 * @param {string} searchTerm - Término de búsqueda
 * @param {Array<string>} fields - Campos donde buscar
 * @returns {Object} - Condición OR para Sequelize
 * 
 * @example
 * const searchCondition = buildSearchCondition('Juan', ['nombre', 'apellido_paterno']);
 */
export const buildSearchCondition = (searchTerm, fields) => {
  if (!searchTerm || !fields || fields.length === 0) {
    return {};
  }
  
  return {
    [Op.or]: fields.map(field => ({
      [field]: {
        [Op.like]: `%${searchTerm}%`
      }
    }))
  };
};

/**
 * Construye condición de rango de fechas
 * 
 * @param {string} startDate - Fecha inicio (YYYY-MM-DD)
 * @param {string} endDate - Fecha fin (YYYY-MM-DD)
 * @param {string} field - Campo de fecha a filtrar
 * @returns {Object} - Condición de rango
 */
export const buildDateRangeCondition = (startDate, endDate, field = 'fecha_registro') => {
  const condition = {};
  
  if (startDate && endDate) {
    condition[field] = {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    };
  } else if (startDate) {
    condition[field] = {
      [Op.gte]: new Date(startDate)
    };
  } else if (endDate) {
    condition[field] = {
      [Op.lte]: new Date(endDate)
    };
  }
  
  return condition;
};

/**
 * Combina múltiples condiciones WHERE con AND
 * 
 * @param {Array<Object>} conditions - Array de condiciones
 * @returns {Object} - Condición combinada
 */
export const combineWhereConditions = (conditions) => {
  return conditions.reduce((acc, condition) => {
    return { ...acc, ...condition };
  }, {});
};

export default {
  buildOrderClause,
  buildEstadoWhere,
  validateLimit,
  validateOffset,
  buildPaginationOptions,
  buildSearchCondition,
  buildDateRangeCondition,
  combineWhereConditions
};




