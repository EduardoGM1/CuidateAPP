/**
 * Aplicación Express configurada para tests
 * Versión simplificada de index.js para ejecutar tests de integración
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

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
import mobileRoutes from "./routes/mobile.js";
import moduloRoutes from "./routes/modulo.js";
import pacienteMedicalDataRoutes from "./routes/pacienteMedicalData.js";
import vacunaRoutes from "./routes/vacuna.js";
import auditoriaRoutes from "./routes/auditoriaRoutes.js";
import notificacionRoutes from "./routes/notificacionRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import medicamentoTomaRoutes from "./routes/medicamentoToma.js";

// Middlewares
import { globalErrorHandler, generateRequestId } from './middlewares/errorHandler.js';
import { sanitizeStrings } from './middlewares/sanitization.js';
import { testModeHandler } from './middlewares/testConfig.js';

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'test';

// Global middlewares
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

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

// Test mode handler (permite bypass de algunas validaciones en tests)
app.use(testModeHandler);

// CORS simplificado para tests
app.use(cors({
  origin: true, // Permitir todos los orígenes en tests
  credentials: true
}));

// Helmet simplificado para tests
app.use(helmet({
  contentSecurityPolicy: false, // Deshabilitado para tests
  crossOriginEmbedderPolicy: false
}));

// Morgan solo en desarrollo
if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request ID
app.use(generateRequestId);

// Sanitización
app.use(sanitizeStrings);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/paciente-auth', pacienteAuthRoutes);
app.use('/api/unified-auth', unifiedAuthRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/doctores', doctorRoutes);
app.use('/api/comorbilidades', comorbillidadRoutes);
app.use('/api/medicamentos', medicamentoRoutes);
app.use('/api/signos-vitales', signoVitalRoutes);
app.use('/api/citas', citaRoutes);
app.use('/api/diagnosticos', diagnosticoRoutes);
app.use('/api/planes-medicacion', planMedicacionRoutes);
app.use('/api/red-apoyo', redApoyoRoutes);
app.use('/api/mensajes', mensajeChatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/test', testRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/modulos', moduloRoutes);
app.use('/api/pacientes', pacienteMedicalDataRoutes); // Datos médicos
app.use('/api/vacunas', vacunaRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/reportes', reportRoutes);
app.use('/api/medicamento-toma', medicamentoTomaRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Global error handler
app.use(globalErrorHandler);

export default app;
