import express from 'express';
import DashboardController from '../controllers/dashboardController.js';
import { 
  authenticateToken, 
  requireAdmin, 
  requireDoctor, 
  validatePatientAccess,
  userRateLimit 
} from '../middlewares/dashboardAuth.js';

const router = express.Router();
const dashboardController = new DashboardController();

// =====================================================
// MIDDLEWARE GLOBAL PARA TODAS LAS RUTAS
// =====================================================

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Aplicar rate limiting (100 requests por 15 minutos por usuario)
router.use(userRateLimit(100, 15 * 60 * 1000));

// =====================================================
// RUTAS PARA ADMINISTRADOR
// =====================================================

/**
 * @route GET /api/dashboard/admin/summary
 * @desc Obtener resumen completo del dashboard administrativo
 * @access Admin
 */
router.get('/admin/summary', 
  requireAdmin,
  dashboardController.getAdminSummary.bind(dashboardController)
);

/**
 * @route GET /api/dashboard/admin/metrics
 * @desc Obtener métricas principales del dashboard administrativo
 * @access Admin
 */
router.get('/admin/metrics', 
  requireAdmin,
  dashboardController.getAdminMetrics.bind(dashboardController)
);

/**
 * @route GET /api/dashboard/admin/charts/:type
 * @desc Obtener datos para gráficos administrativos
 * @access Admin
 * @param {string} type - Tipo de gráfico (citas, pacientes, etc.)
 */
router.get('/admin/charts/:type', 
  requireAdmin,
  dashboardController.getAdminCharts.bind(dashboardController)
);

/**
 * @route GET /api/dashboard/admin/alerts
 * @desc Obtener alertas administrativas
 * @access Admin
 */
router.get('/admin/alerts', 
  requireAdmin,
  dashboardController.getAdminAlerts.bind(dashboardController)
);

/**
 * @route GET /api/dashboard/admin/analytics
 * @desc Obtener análisis avanzados administrativos
 * @access Admin
 */
router.get('/admin/analytics', 
  requireAdmin,
  dashboardController.getAdminAnalytics.bind(dashboardController)
);

// =====================================================
// RUTAS PARA DOCTOR
// =====================================================

/**
 * @route GET /api/dashboard/doctor/summary
 * @desc Obtener resumen completo del dashboard del doctor
 * @access Doctor
 */
router.get('/doctor/summary', 
  requireDoctor,
  dashboardController.getDoctorSummary.bind(dashboardController)
);

/**
 * @route GET /api/dashboard/doctor/patients
 * @desc Obtener lista de pacientes asignados al doctor
 * @access Doctor
 */
router.get('/doctor/patients', 
  requireDoctor,
  dashboardController.getDoctorPatients.bind(dashboardController)
);

/**
 * @route GET /api/dashboard/doctor/appointments
 * @desc Obtener citas del doctor (hoy o próximas)
 * @access Doctor
 * @query {string} fecha - Fecha específica (opcional)
 */
router.get('/doctor/appointments', 
  requireDoctor,
  dashboardController.getDoctorAppointments.bind(dashboardController)
);

/**
 * @route GET /api/dashboard/doctor/messages
 * @desc Obtener mensajes pendientes del doctor
 * @access Doctor
 */
router.get('/doctor/messages', 
  requireDoctor,
  dashboardController.getDoctorMessages.bind(dashboardController)
);

// =====================================================
// RUTAS PARA PACIENTES ESPECÍFICOS
// =====================================================

/**
 * @route GET /api/dashboard/doctor/patient/:pacienteId/vitals
 * @desc Obtener signos vitales de un paciente específico
 * @access Doctor (con acceso al paciente)
 * @param {number} pacienteId - ID del paciente
 */
router.get('/doctor/patient/:pacienteId/vitals', 
  requireDoctor,
  validatePatientAccess,
  dashboardController.getPatientVitalSigns.bind(dashboardController)
);

// =====================================================
// RUTAS DE SALUD DEL SISTEMA
// =====================================================

/**
 * @route GET /api/dashboard/health
 * @desc Verificar salud del sistema de dashboard
 * @access Authenticated users
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard API funcionando correctamente',
    timestamp: new Date().toISOString(),
    user: {
      id: req.user.id_usuario,
      role: req.user.rol
    }
  });
});

// =====================================================
// MANEJO DE ERRORES PARA RUTAS NO ENCONTRADAS
// =====================================================

// =====================================================
// MANEJO DE ERRORES PARA RUTAS NO ENCONTRADAS
// =====================================================

// Eliminar la ruta catch-all problemática
// router.all('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Endpoint de dashboard no encontrado',
//     availableEndpoints: {
//       admin: [
//         'GET /api/dashboard/admin/summary',
//         'GET /api/dashboard/admin/metrics',
//         'GET /api/dashboard/admin/charts/:type',
//         'GET /api/dashboard/admin/alerts',
//         'GET /api/dashboard/admin/analytics'
//       ],
//       doctor: [
//         'GET /api/dashboard/doctor/summary',
//         'GET /api/dashboard/doctor/patients',
//         'GET /api/dashboard/doctor/appointments',
//         'GET /api/dashboard/doctor/messages',
//         'GET /api/dashboard/doctor/patient/:pacienteId/vitals'
//       ],
//       system: [
//         'GET /api/dashboard/health'
//       ]
//     }
//   });
// });

export default router;
