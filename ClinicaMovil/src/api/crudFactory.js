import Logger from '../services/logger';

/**
 * Factory Pattern para crear métodos CRUD genéricos
 * Elimina duplicación de código en gestionService
 */

/**
 * Crea métodos CRUD básicos para un recurso
 * @param {Object} config - Configuración del recurso
 * @param {string} config.resourceName - Nombre del recurso (ej: 'doctores', 'pacientes')
 * @param {string} config.resourcePath - Ruta base de la API (ej: '/api/doctores')
 * @param {Function} config.getApiClient - Función para obtener el cliente API
 * @param {Function} config.handleError - Función para manejar errores
 * @param {Object} config.customMethods - Métodos personalizados adicionales
 * @returns {Object} - Objeto con métodos CRUD
 */
export const createCrudMethods = (config) => {
  const {
    resourceName,
    resourcePath,
    getApiClient,
    handleError,
    customMethods = {}
  } = config;

  /**
   * Obtener todos los recursos con filtros opcionales
   */
  const getAll = async (filters = {}) => {
    try {
      Logger.info(`Obteniendo ${resourceName}`, { filters });
      
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });
      
      const url = queryParams.toString() 
        ? `${resourcePath}?${queryParams.toString()}`
        : resourcePath;
      
      const apiClient = await getApiClient();
      if (!apiClient || typeof apiClient.get !== 'function') {
        throw new Error('getApiClient().get is not a function (it is undefined)');
      }
      const response = await apiClient.get(url);
      
      // Manejar diferentes formatos de respuesta
      let dataArray = [];
      if (response.data?.success && response.data?.data?.[resourceName]) {
        dataArray = response.data.data[resourceName];
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        dataArray = response.data.data;
      } else if (Array.isArray(response.data)) {
        dataArray = response.data;
      } else if (response.data?.data && typeof response.data.data === 'object') {
        // Para respuestas como { data: { doctores: [...] } }
        const key = Object.keys(response.data.data).find(k => Array.isArray(response.data.data[k]));
        if (key) dataArray = response.data.data[key];
      }
      
      Logger.success(`${resourceName} obtenidos exitosamente`, { 
        count: dataArray.length 
      });
      
      return dataArray.length > 0 ? dataArray : (response.data || []);
    } catch (error) {
      Logger.error(`Error obteniendo ${resourceName}`, error);
      throw handleError(error);
    }
  };

  /**
   * Obtener un recurso por ID
   */
  const getById = async (id) => {
    try {
      Logger.info(`Obteniendo ${resourceName} por ID`, { id });
      const apiClient = await getApiClient();
      if (!apiClient || typeof apiClient.get !== 'function') {
        throw new Error('getApiClient().get is not a function (it is undefined)');
      }
      const response = await apiClient.get(`${resourcePath}/${id}`);
      Logger.success(`${resourceName} obtenido exitosamente`);
      
      // Manejar diferentes formatos de respuesta
      return response.data?.data?.[resourceName.slice(0, -1)] || 
             response.data?.data || 
             response.data;
    } catch (error) {
      Logger.error(`Error obteniendo ${resourceName} por ID`, error);
      throw handleError(error);
    }
  };

  /**
   * Crear nuevo recurso
   */
  const create = async (data) => {
    try {
      Logger.info(`Creando ${resourceName.slice(0, -1)}`, { 
        nombre: data.nombre || data.nombre_comorbilidad || data.nombre_vacuna || data.nombre_medicamento || 'N/A'
      });
      
      const apiClient = await getApiClient();
      if (!apiClient || typeof apiClient.post !== 'function') {
        throw new Error('getApiClient().post is not a function (it is undefined)');
      }
      const response = await apiClient.post(resourcePath, data);
      Logger.success(`${resourceName.slice(0, -1)} creado exitosamente`);
      
      return response.data?.data || response.data;
    } catch (error) {
      Logger.error(`Error creando ${resourceName.slice(0, -1)}`, error);
      throw handleError(error);
    }
  };

  /**
   * Actualizar recurso existente
   */
  const update = async (id, data) => {
    try {
      Logger.info(`Actualizando ${resourceName.slice(0, -1)}`, { id });
      const apiClient = await getApiClient();
      if (!apiClient || typeof apiClient.put !== 'function') {
        throw new Error('getApiClient().put is not a function (it is undefined)');
      }
      const response = await apiClient.put(`${resourcePath}/${id}`, data);
      Logger.success(`${resourceName.slice(0, -1)} actualizado exitosamente`);
      
      return response.data?.data || response.data;
    } catch (error) {
      Logger.error(`Error actualizando ${resourceName.slice(0, -1)}`, error);
      throw handleError(error);
    }
  };

  /**
   * Eliminar recurso
   */
  const remove = async (id) => {
    try {
      Logger.info(`Eliminando ${resourceName.slice(0, -1)}`, { id });
      const apiClient = await getApiClient();
      if (!apiClient || typeof apiClient.delete !== 'function') {
        throw new Error('getApiClient().delete is not a function (it is undefined)');
      }
      const response = await apiClient.delete(`${resourcePath}/${id}`);
      Logger.success(`${resourceName.slice(0, -1)} eliminado exitosamente`);
      
      return response.data?.data || response.data;
    } catch (error) {
      Logger.error(`Error eliminando ${resourceName.slice(0, -1)}`, error);
      throw handleError(error);
    }
  };

  // Retornar métodos CRUD básicos + métodos personalizados
  return {
    getAll,
    getById,
    create,
    update,
    delete: remove, // 'delete' es palabra reservada
    ...customMethods
  };
};

/**
 * Crea métodos para recursos relacionados con pacientes
 * @param {Object} config - Configuración del recurso relacionado
 * @param {string} config.resourceName - Nombre del recurso (ej: 'citas', 'signos-vitales')
 * @param {string} config.resourcePath - Ruta base (ej: '/api/pacientes/:id/citas')
 * @param {Function} config.getApiClient - Función para obtener el cliente API
 * @param {Function} config.handleError - Función para manejar errores
 * @param {Object} config.customMethods - Métodos personalizados adicionales
 * @returns {Object} - Objeto con métodos para recursos relacionados
 */
export const createPacienteResourceMethods = (config) => {
  const {
    resourceName,
    resourcePath,
    getApiClient,
    handleError,
    customMethods = {}
  } = config;

  /**
   * Obtener recursos relacionados con un paciente
   */
  const getByPaciente = async (pacienteId, options = {}) => {
    try {
      const { limit = 10, offset = 0, sort = 'DESC' } = options;
      
      Logger.info(`Obteniendo ${resourceName} del paciente`, { 
        pacienteId, 
        limit, 
        offset, 
        sort 
      });
      
      const url = resourcePath.replace(':id', pacienteId);
      const apiClient = await getApiClient();
      if (!apiClient || typeof apiClient.get !== 'function') {
        throw new Error('getApiClient().get is not a function (it is undefined)');
      }
      const response = await apiClient.get(url, {
        params: { limit, offset, sort }
      });
      
      Logger.success(`${resourceName} del paciente obtenidos`, { 
        pacienteId, 
        total: response.data?.total || 0,
        returned: response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error(`Error obteniendo ${resourceName} del paciente`, error);
      throw handleError(error);
    }
  };

  /**
   * Crear recurso relacionado con un paciente
   */
  const createForPaciente = async (pacienteId, data) => {
    try {
      Logger.info(`Creando ${resourceName.slice(0, -1)} para el paciente`, { 
        pacienteId, 
        datos: Object.keys(data)
      });
      
      const url = resourcePath.replace(':id', pacienteId);
      const apiClient = await getApiClient();
      if (!apiClient || typeof apiClient.post !== 'function') {
        throw new Error('getApiClient().post is not a function (it is undefined)');
      }
      const response = await apiClient.post(url, data);
      
      Logger.success(`${resourceName.slice(0, -1)} creado exitosamente`, { 
        pacienteId, 
        id: response.data?.data?.id || response.data?.data?.id_cita || response.data?.data?.id_signo
      });
      
      return response.data;
    } catch (error) {
      Logger.error(`Error creando ${resourceName.slice(0, -1)} del paciente`, error);
      throw handleError(error);
    }
  };

  // Retornar métodos + métodos personalizados
  return {
    getByPaciente,
    createForPaciente,
    ...customMethods
  };
};

/**
 * Factory para crear métodos con filtros complejos
 * @param {Object} config - Configuración
 * @returns {Function} - Método con filtros
 */
export const createFilteredMethod = (config) => {
  const {
    resourceName,
    resourcePath,
    getApiClient,
    handleError,
    filterKeys = []
  } = config;

  return async (filters = {}) => {
    try {
      Logger.info(`Obteniendo ${resourceName} con filtros`, { filters });
      
      const queryParams = new URLSearchParams();
      
      // Agregar filtros permitidos
      filterKeys.forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          queryParams.append(key, filters[key]);
        }
      });
      
      const url = queryParams.toString() 
        ? `${resourcePath}?${queryParams.toString()}`
        : resourcePath;
      
      const apiClient = await getApiClient();
      if (!apiClient || typeof apiClient.get !== 'function') {
        throw new Error('getApiClient().get is not a function (it is undefined)');
      }
      const response = await apiClient.get(url);
      
      Logger.success(`${resourceName} obtenidos`, { 
        total: response.data?.total || 0,
        count: response.data?.[resourceName]?.length || response.data?.data?.length || 0
      });
      
      return response.data;
    } catch (error) {
      Logger.error(`Error obteniendo ${resourceName}`, error);
      throw handleError(error);
    }
  };
};

export default {
  createCrudMethods,
  createPacienteResourceMethods,
  createFilteredMethod
};

