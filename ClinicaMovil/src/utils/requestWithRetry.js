/**
 * @file requestWithRetry.js
 * @description Utilidad para hacer requests con retry automático y manejo de errores robusto
 */

import Logger from '../services/logger';

/**
 * Opciones por defecto para retry
 */
const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  retryDelay: 1000, // 1 segundo
  backoffMultiplier: 2, // Duplicar el delay en cada retry
  timeout: 10000, // 10 segundos
  retryableErrors: [
    'ECONNABORTED', // Timeout
    'ETIMEDOUT', // Timeout de conexión
    'ENOTFOUND', // DNS no resuelto
    'ECONNREFUSED', // Conexión rechazada
    'Network Error', // Error de red genérico
    'ERR_NETWORK', // Error de red de Axios
  ],
  retryableStatusCodes: [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
  ]
};

/**
 * Crea un AbortController con timeout
 */
const createTimeoutController = (timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  return { controller, timeoutId };
};

/**
 * Verifica si un error es retryable
 */
const isRetryableError = (error, options) => {
  // Verificar errores de red
  if (error.code && options.retryableErrors.includes(error.code)) {
    return true;
  }
  
  // Verificar mensaje de error
  if (error.message) {
    const message = error.message.toLowerCase();
    if (options.retryableErrors.some(err => message.includes(err.toLowerCase()))) {
      return true;
    }
  }
  
  // Verificar códigos de estado HTTP
  if (error.response) {
    const status = error.response.status;
    if (options.retryableStatusCodes.includes(status)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Calcula el delay para el siguiente retry usando backoff exponencial
 */
const calculateRetryDelay = (attempt, baseDelay, multiplier) => {
  return baseDelay * Math.pow(multiplier, attempt);
};

/**
 * Hace un request con retry automático y manejo de errores robusto
 * 
 * @param {Function} requestFn - Función que retorna una Promise del request
 * @param {Object} options - Opciones de configuración
 * @param {number} options.maxRetries - Número máximo de reintentos (default: 3)
 * @param {number} options.retryDelay - Delay inicial entre reintentos en ms (default: 1000)
 * @param {number} options.backoffMultiplier - Multiplicador para backoff exponencial (default: 2)
 * @param {number} options.timeout - Timeout del request en ms (default: 10000)
 * @param {Array} options.retryableErrors - Lista de códigos de error que son retryables
 * @param {Array} options.retryableStatusCodes - Lista de códigos HTTP que son retryables
 * @param {AbortController} options.abortController - AbortController externo para cancelar el request
 * 
 * @returns {Promise} Promise que se resuelve con la respuesta del request
 */
export const requestWithRetry = async (requestFn, options = {}) => {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError = null;
  
  // Crear AbortController interno si no se proporciona uno
  const { controller: internalController, timeoutId: internalTimeoutId } = createTimeoutController(config.timeout);
  const abortController = options.abortController || internalController;
  
  try {
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Verificar si el request fue cancelado
        if (abortController.signal.aborted) {
          throw new Error('Request cancelado');
        }
        
        Logger.debug(`requestWithRetry: Intento ${attempt + 1}/${config.maxRetries + 1}`);
        
        // Hacer el request con el signal del AbortController
        const response = await requestFn(abortController.signal);
        
        // Limpiar timeout interno si existe
        if (internalTimeoutId) {
          clearTimeout(internalTimeoutId);
        }
        
        Logger.debug(`requestWithRetry: Request exitoso en intento ${attempt + 1}`);
        return response;
        
      } catch (error) {
        lastError = error;
        
        // Limpiar timeout interno si existe (en caso de error)
        if (internalTimeoutId) {
          clearTimeout(internalTimeoutId);
        }
        
        // Si el error es de abort, no reintentar
        if (error.name === 'AbortError' || error.message === 'Request cancelado') {
          Logger.warn('requestWithRetry: Request cancelado');
          throw error;
        }
        
        // Verificar si el error es retryable
        const shouldRetry = isRetryableError(error, config);
        
        if (!shouldRetry) {
          Logger.warn(`requestWithRetry: Error no retryable en intento ${attempt + 1}`, {
            error: error.message,
            code: error.code,
            status: error.response?.status
          });
          throw error;
        }
        
        // Si es el último intento, lanzar el error
        if (attempt >= config.maxRetries) {
          Logger.error(`requestWithRetry: Todos los intentos fallaron (${config.maxRetries + 1})`, {
            error: error.message,
            code: error.code,
            status: error.response?.status
          });
          throw error;
        }
        
        // Calcular delay para el siguiente retry
        const delay = calculateRetryDelay(attempt, config.retryDelay, config.backoffMultiplier);
        
        Logger.warn(`requestWithRetry: Error retryable en intento ${attempt + 1}, reintentando en ${delay}ms`, {
          error: error.message,
          code: error.code,
          status: error.response?.status,
          nextAttempt: attempt + 2,
          delay
        });
        
        // Esperar antes del siguiente retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } finally {
    // Asegurar que el timeout se limpie siempre
    if (internalTimeoutId) {
      clearTimeout(internalTimeoutId);
    }
  }
  
  // Esto no debería ejecutarse, pero por si acaso
  throw lastError || new Error('Request falló después de todos los intentos');
};

/**
 * Crea un wrapper para funciones de request que agrega retry automático
 */
export const withRetry = (requestFn, defaultOptions = {}) => {
  return async (signal, ...args) => {
    return requestWithRetry(
      (abortSignal) => requestFn(abortSignal || signal, ...args),
      defaultOptions
    );
  };
};

export default requestWithRetry;
