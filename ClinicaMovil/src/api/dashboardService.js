import axios from 'axios';
import Logger from '../services/logger';
import { storageService } from '../services/storageService';
import { getApiConfigWithFallback, getApiConfig } from '../config/apiConfig';

// Configuración dinámica de la API
let API_CONFIG = null;

// Función para inicializar la configuración con fallback inteligente
const initializeApiConfig = async () => {
  if (!API_CONFIG) {
    try {
      // Usar fallback inteligente que prueba diferentes configuraciones
      API_CONFIG = await getApiConfigWithFallback();
      Logger.info('DashboardService: API Config inicializada con fallback', { 
        baseURL: API_CONFIG.baseURL,
        timeout: API_CONFIG.timeout,
        description: API_CONFIG.description
      });
    } catch (error) {
      // Si falla el fallback, usar configuración básica
      Logger.warn('DashboardService: Fallback falló, usando configuración básica', { error: error.message });
      API_CONFIG = await getApiConfig();
      Logger.info('DashboardService: API Config inicializada (básica)', { 
        baseURL: API_CONFIG.baseURL,
        timeout: API_CONFIG.timeout 
      });
    }
  }
  return API_CONFIG;
};

// Instancia de axios configurada dinámicamente
const createApiClient = async () => {
  const config = await initializeApiConfig();
  
  // IMPORTANTE: Agregar /api al baseURL para que coincida con las rutas del backend
  const baseURL = `${config.baseURL}/api`;
  
  if (__DEV__) {
    Logger.info('DashboardService: Creando cliente API', { baseURL });
  }
  
  return axios.create({
    baseURL: baseURL,
    timeout: config.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Función para obtener cliente API con interceptores
const getApiClient = async () => {
  const apiClient = await createApiClient();
  
  // Interceptor para agregar token de autenticación
  apiClient.interceptors.request.use(
    async (config) => {
      try {
        // ✅ VERIFICACIÓN PROACTIVA: Renovar token si está próximo a expirar ANTES del request
        // Solo verificar si no es un request de refresh token o login (evitar loops)
        if (!config.url?.includes('/refresh-token') && !config.url?.includes('/login')) {
          try {
            const sessionService = (await import('../services/sessionService.js')).default;
            // Usar cache (no forzar verificación) para evitar múltiples verificaciones
            await sessionService.checkAndRefreshTokenIfNeeded(false);
          } catch (refreshError) {
            Logger.warn('DashboardService: Error verificando token antes del request', refreshError.message);
          }
        }

        const token = await storageService.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Headers móviles requeridos
        config.headers['X-Device-ID'] = await storageService.getOrCreateDeviceId();
        config.headers['X-Platform'] = 'android';
        config.headers['X-App-Version'] = '1.0.0';
        config.headers['X-Client-Type'] = 'mobile';
        
        Logger.apiCall(config.method.toUpperCase(), config.url, config.data);
        return config;
      } catch (error) {
        Logger.error('Error configurando request', error);
        return config;
      }
    },
    (error) => {
      Logger.error('Error en interceptor de request', error);
      return Promise.reject(error);
    }
  );

  // Interceptor para manejar respuestas
  apiClient.interceptors.response.use(
    (response) => {
      Logger.apiResponse(response.config.url, response.status, 'Respuesta exitosa');
      return response;
    },
    async (error) => {
      Logger.error('Error en respuesta de API', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.message
      });

      // Manejar token expirado (401 Unauthorized)
      if (error.response?.status === 401 && !error.config._retry) {
        error.config._retry = true;
        
        try {
          // Importar sessionService dinámicamente
          const sessionService = (await import('../services/sessionService.js')).default;
          
          // Intentar renovar el token automáticamente
          Logger.info('Token expirado (401), intentando renovar automáticamente...', {
            url: error.config.url
          });
          
          const newToken = await sessionService.refreshToken();
          
          if (newToken) {
            // Token renovado exitosamente, reintentar request original
            Logger.success('Token renovado exitosamente, reintentando request original', {
              url: error.config.url
            });
            
            error.config.headers.Authorization = `Bearer ${newToken}`;
            
            // Pequeño delay para asegurar que el token se guardó
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return apiClient(error.config);
          } else {
            // No se pudo renovar, la sesión ha expirado
            Logger.warn('No se pudo renovar el token, sesión expirada', {
              url: error.config.url
            });
            return Promise.reject(error);
          }
        } catch (refreshError) {
          Logger.error('Error en proceso de renovación de token', {
            error: refreshError.message,
            url: error.config.url
          });
          
          try {
            const sessionService = (await import('../services/sessionService.js')).default;
            await sessionService.handleSessionExpired();
          } catch (handleError) {
            Logger.error('Error manejando sesión expirada', handleError);
          }
          
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );
  
  return apiClient;
};

// Servicio de Dashboard
export const dashboardService = {
  
  // =====================================================
  // SERVICIOS PARA ADMINISTRADOR
  // =====================================================

  /**
   * Obtener resumen completo del dashboard administrativo
   */
  async getAdminSummary() {
    try {
      Logger.info('Obteniendo resumen administrativo');
      
      const apiClient = await getApiClient();
      const response = await apiClient.get('/dashboard/admin/summary');
      
      Logger.success('Resumen administrativo obtenido exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo resumen administrativo', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener métricas principales del dashboard administrativo
   */
  async getAdminMetrics() {
    try {
      Logger.info('Obteniendo métricas administrativas');
      
      const apiClient = await getApiClient();
      const response = await apiClient.get('/dashboard/admin/metrics');
      
      Logger.success('Métricas administrativas obtenidas exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo métricas administrativas', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener datos para gráficos administrativos
   */
  async getAdminCharts(type = 'citas') {
    try {
      Logger.info(`Obteniendo gráfico administrativo: ${type}`);
      
      const apiClient = await getApiClient();
      const response = await apiClient.get(`/dashboard/admin/charts/${type}`);
      
      Logger.success(`Gráfico ${type} obtenido exitosamente`);
      return response.data;
    } catch (error) {
      Logger.error(`Error obteniendo gráfico ${type}`, error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener alertas administrativas
   */
  async getAdminAlerts() {
    try {
      Logger.info('Obteniendo alertas administrativas');
      
      const apiClient = await getApiClient();
      const response = await apiClient.get('/dashboard/admin/alerts');
      
      Logger.success('Alertas administrativas obtenidas exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo alertas administrativas', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener análisis avanzados administrativos
   */
  async getAdminAnalytics() {
    try {
      Logger.info('Obteniendo análisis administrativos');
      
      const apiClient = await getApiClient();
      const response = await apiClient.get('/dashboard/admin/analytics');
      
      Logger.success('Análisis administrativos obtenidos exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo análisis administrativos', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS PARA DOCTOR
  // =====================================================

  /**
   * Obtener resumen completo del dashboard del doctor
   * @param {string} estado - Estado opcional para filtrar comorbilidades
   * @param {string} periodo - Periodo opcional ('semestre', 'anual', 'mensual') para agrupar comorbilidades
   * @param {Object} rangoMeses - Objeto con {mesInicio, mesFin, año} para periodo 'mensual'
   */
  async getDoctorSummary(estado = null, periodo = null, rangoMeses = null) {
    try {
      // Logger.info('Obteniendo resumen del doctor', { estado, periodo, rangoMeses });
      
      const apiClient = await getApiClient();
      const params = {};
      if (estado) params.estado = estado;
      if (periodo) params.periodo = periodo;
      if (rangoMeses && periodo === 'mensual') {
        params.mesInicio = rangoMeses.mesInicio;
        params.mesFin = rangoMeses.mesFin;
        params.año = rangoMeses.año;
      }
      
      const response = await apiClient.get('/dashboard/doctor/summary', { params });
      
      // Logger.success('Resumen del doctor obtenido exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo resumen del doctor', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener lista de pacientes asignados al doctor
   */
  async getDoctorPatients() {
    try {
      Logger.info('Obteniendo pacientes del doctor');
      
      const apiClient = await getApiClient();
      const response = await apiClient.get('/dashboard/doctor/patients');
      
      Logger.success('Pacientes del doctor obtenidos exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo pacientes del doctor', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener citas del doctor
   */
  async getDoctorAppointments(fecha = null) {
    try {
      Logger.info('Obteniendo citas del doctor', { fecha });
      
      const apiClient = await getApiClient();
      const params = fecha ? { fecha } : {};
      const response = await apiClient.get('/dashboard/doctor/appointments', { params });
      
      Logger.success('Citas del doctor obtenidas exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo citas del doctor', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener mensajes pendientes del doctor
   */
  async getDoctorMessages() {
    try {
      Logger.info('Obteniendo mensajes del doctor');
      
      const apiClient = await getApiClient();
      const response = await apiClient.get('/dashboard/doctor/messages');
      
      Logger.success('Mensajes del doctor obtenidos exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo mensajes del doctor', error);
      throw this.handleError(error);
    }
  },

  /**
   * Obtener signos vitales de un paciente específico
   */
  async getPatientVitalSigns(pacienteId) {
    try {
      Logger.info('Obteniendo signos vitales del paciente', { pacienteId });
      
      const apiClient = await getApiClient();
      const response = await apiClient.get(`/dashboard/doctor/patient/${pacienteId}/vitals`);
      
      Logger.success('Signos vitales del paciente obtenidos exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error obteniendo signos vitales del paciente', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // SERVICIOS DE SALUD DEL SISTEMA
  // =====================================================

  /**
   * Verificar salud del sistema de dashboard
   */
  async checkHealth() {
    try {
      Logger.info('Verificando salud del sistema de dashboard');
      
      const apiClient = await getApiClient();
      const response = await apiClient.get('/dashboard/health');
      
      Logger.success('Salud del sistema verificada exitosamente');
      return response.data;
    } catch (error) {
      Logger.error('Error verificando salud del sistema', error);
      throw this.handleError(error);
    }
  },

  // =====================================================
  // MANEJO DE ERRORES CENTRALIZADO
  // =====================================================

  handleError(error) {
    if (error.response) {
      // El servidor respondió con un estado fuera del rango 2xx
      Logger.error('Error de respuesta de API', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
      
      return {
        type: 'api_error',
        status: error.response.status,
        message: error.response.data.message || 'Error del servidor',
        details: error.response.data,
      };
    } else if (error.request) {
      // La solicitud fue hecha pero no se recibió respuesta
      Logger.error('Error de conexión de red', { 
        url: error.config?.url,
        timeout: error.code === 'ECONNABORTED'
      });
      
      return {
        type: 'connection_error',
        message: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.',
      };
    } else {
      // Algo pasó al configurar la solicitud que provocó un error
      Logger.error('Error de configuración de solicitud', { 
        message: error.message,
        url: error.config?.url
      });
      
      return {
        type: 'request_error',
        message: error.message,
      };
    }
  }
};

export default dashboardService;
