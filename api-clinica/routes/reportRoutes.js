import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { searchRateLimit } from '../middlewares/rateLimiting.js';
import * as reportController from '../controllers/reportController.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Solo Admin y Doctor pueden generar reportes
router.use(authorizeRoles('Admin', 'Doctor'));

// Reportes CSV
router.get('/signos-vitales/:idPaciente/csv', searchRateLimit, reportController.getSignosVitalesCSV);
router.get('/citas/:idPaciente/csv', searchRateLimit, reportController.getCitasCSV);
router.get('/diagnosticos/:idPaciente/csv', searchRateLimit, reportController.getDiagnosticosCSV);

// Reporte de estadísticas en HTML (Admin/Doctor - para convertir a PDF en app)
router.get('/estadisticas/html', searchRateLimit, reportController.getReporteEstadisticasHTML);

// Datos para FORMA (Registro Mensual GAM - SIC) - solo web, por paciente
router.get('/forma/:idPaciente', searchRateLimit, reportController.getFormaData);

// Expediente médico completo en HTML (NUEVO - para react-native-html-to-pdf)
router.get('/expediente/:idPaciente/html', searchRateLimit, reportController.getExpedienteCompletoHTML);

// Expediente médico completo en PDF (DEPRECADO - redirige a HTML)
router.get('/expediente/:idPaciente/pdf', searchRateLimit, reportController.getExpedienteCompletoPDF);

// Reportes PDF genéricos (signos-vitales, citas, diagnosticos)
router.get('/:tipo/:idPaciente/pdf', searchRateLimit, reportController.getPDFReport);

export default router;


