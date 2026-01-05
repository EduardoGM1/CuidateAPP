import DashboardService from '../services/dashboardService.js';
import logger from '../utils/logger.js';

export class DashboardController {
  constructor() {
    this.dashboardService = new DashboardService();
  }

  // =====================================================
  // ENDPOINTS PARA ADMINISTRADOR
  // =====================================================

  async getAdminSummary(req, res) {
    try {
      logger.info('Solicitud de resumen administrativo', { 
        userId: req.user?.id_usuario,
        ip: req.ip 
      });

      const summary = await this.dashboardService.getAdminSummary();

      res.json({
        success: true,
        data: summary,
        message: 'Resumen administrativo obtenido exitosamente'
      });
    } catch (error) {
      logger.error('Error en getAdminSummary', error);
      this.handleError(res, error, 'Error obteniendo resumen administrativo');
    }
  }

  async getAdminMetrics(req, res) {
    try {
      logger.info('Solicitud de métricas administrativas', { 
        userId: req.user?.id_usuario 
      });

      const metrics = await this.dashboardService.getAdminMetrics();

      res.json({
        success: true,
        data: metrics,
        message: 'Métricas administrativas obtenidas exitosamente'
      });
    } catch (error) {
      logger.error('Error en getAdminMetrics', error);
      this.handleError(res, error, 'Error obteniendo métricas administrativas');
    }
  }

  async getAdminCharts(req, res) {
    try {
      const { type } = req.params;
      
      logger.info('Solicitud de gráfico administrativo', { 
        userId: req.user?.id_usuario,
        chartType: type 
      });

      const chartData = await this.dashboardService.getAdminCharts(type);

      res.json({
        success: true,
        data: chartData,
        message: `Gráfico ${type} obtenido exitosamente`
      });
    } catch (error) {
      logger.error('Error en getAdminCharts', error);
      this.handleError(res, error, 'Error obteniendo gráfico administrativo');
    }
  }

  async getAdminAlerts(req, res) {
    try {
      logger.info('Solicitud de alertas administrativas', { 
        userId: req.user?.id_usuario 
      });

      const alerts = await this.dashboardService.getAdminAlerts();

      res.json({
        success: true,
        data: alerts,
        message: 'Alertas administrativas obtenidas exitosamente'
      });
    } catch (error) {
      logger.error('Error en getAdminAlerts', error);
      this.handleError(res, error, 'Error obteniendo alertas administrativas');
    }
  }

  async getAdminAnalytics(req, res) {
    try {
      logger.info('Solicitud de análisis administrativos', { 
        userId: req.user?.id_usuario 
      });

      const analytics = await this.dashboardService.getAdminAnalytics();

      res.json({
        success: true,
        data: analytics,
        message: 'Análisis administrativos obtenidos exitosamente'
      });
    } catch (error) {
      logger.error('Error en getAdminAnalytics', error);
      this.handleError(res, error, 'Error obteniendo análisis administrativos');
    }
  }

  // =====================================================
  // ENDPOINTS PARA DOCTOR
  // =====================================================

  async getDoctorSummary(req, res) {
    try {
      const userId = req.user?.id_usuario;
      const { estado, periodo, mesInicio, mesFin, año } = req.query; // Obtener parámetros opcionales
      
      // Construir objeto rangoMeses si el periodo es mensual
      let rangoMeses = null;
      if (periodo === 'mensual') {
        const añoActual = año ? parseInt(año) : new Date().getFullYear();
        const mesInicioNum = mesInicio ? parseInt(mesInicio) : null;
        const mesFinNum = mesFin ? parseInt(mesFin) : null;
        
        if (mesInicioNum && mesFinNum) {
          rangoMeses = {
            mesInicio: mesInicioNum,
            mesFin: mesFinNum,
            año: añoActual
          };
        }
      }
      
      // Log crítico: Verificar que se recibe la petición
      logger.info(`[DASHBOARD] Petición recibida - UserId: ${userId}, Estado: ${estado || 'todos'}, Periodo: ${periodo || 'ninguno'}, RangoMeses: ${rangoMeses ? JSON.stringify(rangoMeses) : 'N/A'}`);
      
      // Obtener el id_doctor real del usuario
      const { Doctor } = await import('../models/associations.js');
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: userId },
        attributes: ['id_doctor']
      });
      
      if (!doctor) {
        logger.warn('Doctor no encontrado para usuario', { userId });
        return res.status(404).json({
          success: false,
          error: 'Doctor no encontrado'
        });
      }
      
      const doctorId = doctor.id_doctor;
      
      logger.info(`[DASHBOARD] DoctorId encontrado: ${doctorId} para UserId: ${userId}, Estado filtro: ${estado || 'N/A'}, Periodo: ${periodo || 'N/A'}, RangoMeses: ${rangoMeses ? JSON.stringify(rangoMeses) : 'N/A'}`);

      const summary = await this.dashboardService.getDoctorSummary(doctorId, estado, periodo, rangoMeses);

      res.json({
        success: true,
        data: summary,
        message: 'Resumen del doctor obtenido exitosamente'
      });
    } catch (error) {
      logger.error('Error en getDoctorSummary', error);
      this.handleError(res, error, 'Error obteniendo resumen del doctor');
    }
  }

  async getDoctorPatients(req, res) {
    try {
      const doctorId = req.user?.id_usuario;
      
      logger.info('Solicitud de pacientes del doctor', { 
        doctorId 
      });

      const patients = await this.dashboardService.getDoctorPatients(doctorId);

      res.json({
        success: true,
        data: patients,
        message: 'Pacientes del doctor obtenidos exitosamente'
      });
    } catch (error) {
      logger.error('Error en getDoctorPatients', error);
      this.handleError(res, error, 'Error obteniendo pacientes del doctor');
    }
  }

  async getDoctorAppointments(req, res) {
    try {
      const doctorId = req.user?.id_usuario;
      const { fecha } = req.query;
      
      logger.info('Solicitud de citas del doctor', { 
        doctorId,
        fecha 
      });

      const appointments = await this.dashboardService.getDoctorAppointments(doctorId, fecha);

      res.json({
        success: true,
        data: appointments,
        message: 'Citas del doctor obtenidas exitosamente'
      });
    } catch (error) {
      logger.error('Error en getDoctorAppointments', error);
      this.handleError(res, error, 'Error obteniendo citas del doctor');
    }
  }

  async getPatientVitalSigns(req, res) {
    try {
      const doctorId = req.user?.id_usuario;
      const { pacienteId } = req.params;
      
      logger.info('Solicitud de signos vitales del paciente', { 
        doctorId,
        pacienteId 
      });

      // Validar que el doctor tiene acceso al paciente
      this.dashboardService.validarAccesoDoctor(doctorId, pacienteId);

      const vitalSigns = await this.dashboardService.getPatientVitalSigns(doctorId, pacienteId);

      res.json({
        success: true,
        data: vitalSigns,
        message: 'Signos vitales del paciente obtenidos exitosamente'
      });
    } catch (error) {
      logger.error('Error en getPatientVitalSigns', error);
      this.handleError(res, error, 'Error obteniendo signos vitales del paciente');
    }
  }

  async getDoctorMessages(req, res) {
    try {
      const doctorId = req.user?.id_usuario;
      
      logger.info('Solicitud de mensajes del doctor', { 
        doctorId 
      });

      const messages = await this.dashboardService.getDoctorMessages(doctorId);

      res.json({
        success: true,
        data: messages,
        message: 'Mensajes del doctor obtenidos exitosamente'
      });
    } catch (error) {
      logger.error('Error en getDoctorMessages', error);
      this.handleError(res, error, 'Error obteniendo mensajes del doctor');
    }
  }

  // =====================================================
  // MANEJO DE ERRORES CENTRALIZADO
  // =====================================================

  handleError(res, error, defaultMessage) {
    logger.error('Error en dashboard controller', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    const statusCode = this.getStatusCode(error);
    const message = error.message || defaultMessage;

    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }

  getStatusCode(error) {
    if (error.message.includes('No tiene acceso')) {
      return 403; // Forbidden
    }
    if (error.message.includes('no encontrado') || error.message.includes('no existe')) {
      return 404; // Not Found
    }
    if (error.message.includes('requerido') || error.message.includes('inválido')) {
      return 400; // Bad Request
    }
    return 500; // Internal Server Error
  }
}

export default DashboardController;
