import dotenv from "dotenv";
dotenv.config();

// Validate environment variables early
import { validateEnvironment } from "./utils/envValidator.js";
try {
  validateEnvironment();
} catch (error) {
  console.warn('Environment validation failed:', error.message);
  console.warn('Continuing with default values for development...');
  // process.exit(1);
}

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import sequelize from "./config/db.js";
import logger from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { createSSLServer, forceHTTPS } from "./config/ssl.js";
import { requestMonitoring, healthCheck as monitoringHealthCheck, memoryMonitoring } from "./middlewares/monitoring.js";
// import { scheduleBackups } from "./scripts/backup-system.js"; // Archivo eliminado en limpieza
import scheduledTasksService from "./services/scheduledTasksService.js";
import { ensureTicketResueltoAtColumn } from "./utils/ensureTicketResueltoAt.js";
import { ensureConsentimientosPrivacidadTable } from "./utils/ensureConsentimientosPrivacidadTable.js";
import { ensureEsquemaVacunacionLugarColumn } from "./utils/ensureEsquemaVacunacionLugar.js";
import { cerrarTicketsResueltoVencidos } from "./services/ticketAutoCloseService.js";

// Security middlewares
import { generalRateLimit, suspiciousActivityDetector } from './middlewares/rateLimiting.js';
import { globalErrorHandler, generateRequestId } from './middlewares/errorHandler.js';
import { sanitizeStrings } from './middlewares/sanitization.js';
import { testModeHandler, healthCheck as testHealthCheck, endpointSecurityHeaders } from './middlewares/testConfig.js';
import { securityValidation } from './middlewares/securityValidation.js';
import { securityEventLogger } from './middlewares/securityLogging.js';

// Advanced Security Middlewares
import XSSProtection from './middlewares/xssProtection.js';
import AdvancedRateLimiting from './middlewares/advancedRateLimiting.js';
import ReDoSProtection from './middlewares/reDoSProtection.js';

// Import associations
import "./models/associations.js";

// Import routes
import authRoutes from "./routes/auth.js";
import pacienteAuthRoutes from "./routes/pacienteAuth.js";
import unifiedAuthRoutes from "./routes/unifiedAuth.js";
import pacienteRoutes from "./routes/paciente.js";
import doctorRoutes from "./routes/doctor.js";
import comorbillidadRoutes from "./routes/comorbilidad.js";
import medicamentoRoutes from "./routes/medicamento.js";
import signoVitalRoutes from "./routes/signoVital.js";
import citaRoutes from "./routes/cita.js";
import diagnosticoRoutes from "./routes/diagnostico.js";
import planMedicacionRoutes from "./routes/planMedicacion.js";
import redApoyoRoutes from "./routes/redApoyo.js";
import mensajeChatRoutes from "./routes/mensajeChat.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import testRoutes from "./routes/test.js";
import mobileRoutes from "./routes/mobile.js"; // ✅ Rutas móviles
import moduloRoutes from "./routes/modulo.js"; // ✅ Rutas de módulos
import institucionSaludRoutes from "./routes/institucionSalud.js"; // ✅ Catálogo instituciones de salud
import pacienteMedicalDataRoutes from "./routes/pacienteMedicalData.js"; // ✅ Datos médicos de pacientes
import vacunaRoutes from "./routes/vacuna.js"; // ✅ Rutas de vacunas (catálogo)
import auditoriaRoutes from "./routes/auditoriaRoutes.js"; // ✅ Rutas de auditoría (admin)
import adminOperationsRoutes from "./routes/adminOperationsRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import notificacionRoutes from "./routes/notificacionRoutes.js"; // ✅ Rutas de notificaciones (doctores)
import reportRoutes from "./routes/reportRoutes.js"; // ✅ Rutas de reportes (PDF/CSV)
import medicamentoTomaRoutes from "./routes/medicamentoToma.js"; // ✅ Rutas de toma de medicamentos
import privacyConsentRoutes from "./routes/privacyConsent.js";
import { getCsrfToken } from "./middlewares/csrfProtection.js";

// Import mobile services
import realtimeService from "./services/realtimeService.js";
import pushNotificationService from "./services/pushNotificationService.js";
import { mobileDeviceHandler, trackDeviceActivity, optimizeForMobile } from "./middlewares/mobileDevice.js";

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Detrás de Nginx (o otro proxy): confiar en X-Forwarded-* para IP real y rate-limit correcto
app.set('trust proxy', 1);

// Force HTTPS in production - SIEMPRE activo
if (NODE_ENV === 'production') {
  app.use(forceHTTPS);
  logger.info('🔒 HTTPS enforcement enabled for production');
}

// Compresión gzip para reducir consumo de datos (JSON, HTML, texto)
app.use(compression());
logger.info('📦 Compression (gzip) enabled for responses');

// Global middlewares
app.use(express.json({ limit: '100kb' })); // Limitar tamaño del payload
app.use(express.urlencoded({ extended: true, limit: '100kb' })); // Limitar tamaño del payload

// Manejar errores de JSON malformado
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON malformado',
      message: 'El cuerpo de la solicitud no es un JSON válido'
    });
  }
  next(err);
});

app.use(generateRequestId); // Generar ID de solicitud único
app.use(securityEventLogger); // Logging de eventos de seguridad

// Middlewares de monitoreo - DESHABILITADOS EN DESARROLLO PARA POSTMAN
if (NODE_ENV === 'production') {
  app.use(requestMonitoring); // Monitoreo de solicitudes
  app.use(memoryMonitoring()); // Monitoreo de memoria (debe devolver middleware que llame a next())
}

// Configuración de CORS - MEJORADO: Whitelist más estricta
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8081', // Metro bundler React Native
  'http://10.0.2.2:3000',  // Android emulator
  'http://localhost:19006', // Expo
  'http://localhost:19000', // Expo web
  'http://localhost:5173',  // Vite dev server
  'http://localhost:5174',  // cuidate-web (vite.config.js)
  'http://localhost:8080'   // Vue/React dev server
];

// Agregar dominios de producción desde variables de entorno
const productionOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()).filter(Boolean) || [];
const allAllowedOrigins = [...allowedOrigins, ...productionOrigins];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir solicitudes sin origen (curl, scripts, health checks, Postman, mismo servidor)
    if (!origin) {
      return callback(null, true);
    }

    // Validar origen contra whitelist
    if (allAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // En desarrollo, permitir localhost, emulador y red local (app móvil en dispositivo físico)
    if (NODE_ENV === 'development') {
      const isLocalhost = origin.includes('localhost') || 
                         origin.includes('127.0.0.1') || 
                         origin.includes('10.0.2.2');
      const isLocalNetwork = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin);
      if (isLocalhost || isLocalNetwork) {
        logger.debug(`CORS: Permitiendo origen de desarrollo: ${origin}`);
        return callback(null, true);
      }
    }

    // Rechazar origen no permitido
    logger.warn('CORS: Origen rechazado', { origin });
    callback(new Error(`CORS: Origin '${origin}' not allowed`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Test-Mode',
    'X-Device-ID',
    'X-App-Version',
    'X-Platform',
    'X-Push-Token',
    'X-Client-Type',
    'X-Device-Info'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Token-Expires'],
  maxAge: 86400 // 24 horas
}));
logger.info(`🌐 CORS configured (${allAllowedOrigins.length} allowed origins)`);

// Helmet - MEJORADO: Headers de seguridad siempre activos (configurables)
const helmetConfig = {
  // Headers básicos siempre activos (seguridad crítica)
  noSniff: true, // Prevenir MIME type sniffing
  frameguard: { action: 'deny' }, // Prevenir clickjacking
  xssFilter: true, // Filtro XSS básico
  crossOriginEmbedderPolicy: false, // Deshabilitado para compatibilidad con WebSockets
  // HSTS solo en producción
  hsts: NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  } : false,
  // CSP configurado según entorno
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // 'unsafe-inline' necesario para algunas librerías
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://fcm.googleapis.com",
        ...(NODE_ENV === 'development' ? ["ws://localhost:3000", "ws://localhost:3001"] : [])
      ],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    },
  } : false // CSP deshabilitado en desarrollo para facilitar debugging
};

app.use(helmet(helmetConfig));
logger.info(`🛡️ Security headers configured (CSP: ${NODE_ENV === 'production' ? 'enabled' : 'disabled'})`);
app.use(morgan("combined"));

// Advanced Security Middlewares - MEJORADO: Siempre activos con configuración apropiada
// Validaciones de seguridad siempre activas
app.use(securityValidation); // Validación de profundidad, tamaño y tipos

// Protecciones avanzadas según entorno
if (NODE_ENV === 'production') {
  app.use((req, res, next) => XSSProtection.xssProtection.call(XSSProtection, req, res, next)); // Protección XSS (contexto explícito)
  app.use((req, res, next) => ReDoSProtection.preventReDoS.call(ReDoSProtection, req, res, next)); // Prevención ReDoS (contexto explícito)
  app.use(sanitizeStrings); // Sanitización básica
  app.use(AdvancedRateLimiting.generalLimiter()); // Rate limiting general
  app.use(AdvancedRateLimiting.ddosLimiter()); // Protección DDoS
} else {
  // En desarrollo, solo sanitización básica (para no romper debugging)
  app.use(sanitizeStrings);
}
logger.info('🛡️ Advanced security middlewares configured');

// Test route
app.get('/', (req, res) => {
  res.json({
    message: 'API Clínica funcionando correctamente',
    timestamp: new Date().toISOString(),
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      health: 'GET /health',
      csrf: 'GET /api/csrf-token'
    }
  });
});

// CSRF token endpoint
app.get('/api/csrf-token', getCsrfToken);

// Servir archivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/paciente-auth", pacienteAuthRoutes); // Legacy - mantener para compatibilidad
app.use("/api/auth-unified", unifiedAuthRoutes); // Nuevo sistema unificado
app.use("/api/pacientes", pacienteRoutes);
// Tickets (soporte doctor → admin): ANTES de /api/doctores para no chocar con GET /api/doctores/:id
app.use("/api/doctores/soporte", ticketRoutes);
app.use("/api/doctores", doctorRoutes);
app.use("/api/comorbilidades", comorbillidadRoutes);
app.use("/api/medicamentos", medicamentoRoutes);
app.use("/api/signos-vitales", signoVitalRoutes);
app.use("/api/citas", citaRoutes);
app.use("/api/diagnosticos", diagnosticoRoutes);
app.use("/api/planes-medicacion", planMedicacionRoutes);
app.use("/api/red-apoyo", redApoyoRoutes);
app.use("/api/mensajes-chat", mensajeChatRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/test", testRoutes);
app.use("/api/mobile", mobileRoutes); // ✅ Rutas móviles
app.use("/api/modulos", moduloRoutes); // ✅ Rutas de módulos
app.use("/api/instituciones-salud", institucionSaludRoutes); // ✅ Catálogo instituciones de salud
app.use("/api/pacientes", pacienteMedicalDataRoutes); // ✅ Datos médicos de pacientes
app.use("/api/vacunas", vacunaRoutes); // ✅ Rutas de vacunas (catálogo)
app.use("/api/admin/auditoria", auditoriaRoutes); // ✅ Auditoría del sistema (admin)
app.use("/api/admin/operations", adminOperationsRoutes); // Exportaciones, logs sensibles, sistema, sesiones
app.use("/api/tickets", ticketRoutes); // Alias; la web usa /api/doctores/soporte por compatibilidad con proxies
app.use("/api/doctores", notificacionRoutes); // ✅ Notificaciones de doctores
app.use("/api/reportes", reportRoutes); // ✅ Reportes PDF/CSV
app.use("/api/medicamentos-toma", medicamentoTomaRoutes); // ✅ Toma de medicamentos
app.use("/api/privacy-consent", privacyConsentRoutes);

// Health check endpoint for monitoring
app.get('/health', monitoringHealthCheck);
app.get('/test-health', testHealthCheck);

// Global error handler
app.use(globalErrorHandler);

// Database synchronization and server start
let server;
sequelize
  .sync({ force: false })
  .then(async () => {
    logger.info("Database synchronized successfully.");
    try {
      await ensureTicketResueltoAtColumn();
      await cerrarTicketsResueltoVencidos();
    } catch (e) {
      logger.warn("[tickets] Arranque: columna resuelto_at o cierre automático", { error: e.message });
    }
    try {
      await ensureEsquemaVacunacionLugarColumn();
    } catch (e) {
      logger.warn("[vacunación] Arranque: columna lugar_aplicacion", { error: e.message });
    }
    try {
      await ensureConsentimientosPrivacidadTable();
    } catch (e) {
      logger.warn("[privacy-consent] Arranque: tabla consentimientos_privacidad", { error: e.message });
    }
    // Iniciar servidor según entorno
    if (NODE_ENV === 'production') {
      // En producción, intentar HTTPS primero
      server = createSSLServer(app, PORT);
      
      // Si HTTPS no está configurado, usar HTTP (pero forceHTTPS redirigirá)
      if (!server) {
        logger.warn('⚠️ HTTPS no configurado, iniciando HTTP (forceHTTPS redirigirá a HTTPS)');
        server = app.listen(PORT, '0.0.0.0', () => {
          logger.info(`HTTP Server running on http://0.0.0.0:${PORT} (PRODUCCIÓN - Use proxy reverso con SSL)`);
        });
      }
    } else {
      // En desarrollo, usar HTTP
      server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(`HTTP Server running on http://0.0.0.0:${PORT}`);
        logger.info(`🌐 Accessible from: http://localhost:${PORT}`);
        logger.info(`📱 Para la app móvil: mismo WiFi y en ClinicaMovil/src/config/apiUrlOverride.js pon la IP de esta PC (ej: http://192.168.1.100:3000)`);
      });
    }

    // Initialize WebSocket service
    realtimeService.initialize(server);
    logger.info("✅ WebSocket service initialized for mobile app");

    // Initialize Push Notification service
    // pushNotificationService.init();
    logger.info("✅ Push notification service initialized");

    // Initialize Cron Jobs (alertas y recordatorios)
    import('./services/cronJobs.js').then(({ initializeCronJobs }) => {
      initializeCronJobs();
    }).catch((error) => {
      logger.error('Error cargando cron jobs:', error);
    });

    // Schedule daily backups - DESHABILITADO (archivo backup-system.js eliminado)
    // scheduleBackups();
    
    // Iniciar servicio de tareas programadas para notificaciones push
    scheduledTasksService.start();
  })
  .catch((error) => {
    logger.error(`Unable to connect to the database: ${error.message}`);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    sequelize.close().then(() => {
      logger.info('Database connection closed');
      process.exit(0);
    });
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error);
  process.exit(1);
});

export { app, server };