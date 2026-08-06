import Logger from '../services/logger';
import { getApiClient } from './httpClient';

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
