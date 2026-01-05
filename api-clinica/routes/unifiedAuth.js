import { Router } from 'express';
import {
  loginDoctorAdmin,
  loginPaciente,
  setupPIN,
  changePIN,
  setupBiometric,
  setupPassword,
  getUserCredentials,
  deleteCredential
} from '../controllers/unifiedAuthController.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { writeRateLimit, searchRateLimit, pinLoginRateLimit } from '../middlewares/rateLimiting.js';
import AdvancedRateLimiting from '../middlewares/advancedRateLimiting.js';

const router = Router();

/**
 * Rutas de autenticación unificada
 * 
 * Este sistema reemplaza los endpoints separados de:
 * - /api/auth/login (Doctor/Admin)
 * - /api/paciente-auth/login-pin (Paciente)
 * - /api/paciente-auth/login-biometric (Paciente)
 */

// ========================================
// ENDPOINTS PÚBLICOS - LOGIN
// ========================================

/**
 * Login para Doctores y Administradores
 * POST /api/auth-unified/login-doctor-admin
 */
router.post('/login-doctor-admin',
  AdvancedRateLimiting.crudLimiter(),
  writeRateLimit,
  loginDoctorAdmin
);

/**
 * Login para Pacientes (PIN o biométrico)
 * POST /api/auth-unified/login-paciente
 * 
 * Soporta dos modos:
 * 1. Con id_paciente: Búsqueda rápida (backward compatibility)
 * 2. Solo con PIN: Búsqueda en todas las credenciales (nuevo método recomendado)
 */
router.post('/login-paciente',
  pinLoginRateLimit, // Rate limiting específico para PIN (más estricto)
  AdvancedRateLimiting.crudLimiter(),
  writeRateLimit,
  loginPaciente
);

// ========================================
// ENDPOINTS PÚBLICOS - SETUP (en desarrollo)
// ========================================

if (process.env.NODE_ENV === 'development') {
  /**
   * Configurar PIN para paciente
   * POST /api/auth-unified/setup-pin
   */
  router.post('/setup-pin',
    AdvancedRateLimiting.crudLimiter(),
    writeRateLimit,
    setupPIN
  );

  /**
   * Configurar biometría para paciente
   * POST /api/auth-unified/setup-biometric
   */
  router.post('/setup-biometric',
    AdvancedRateLimiting.crudLimiter(),
    writeRateLimit,
    setupBiometric
  );

  /**
   * Configurar password para Doctor/Admin
   * POST /api/auth-unified/setup-password
   */
  router.post('/setup-password',
    AdvancedRateLimiting.crudLimiter(),
    writeRateLimit,
    setupPassword
  );
}

// ========================================
// ENDPOINTS PROTEGIDOS
// ========================================

router.use(authenticateToken);

/**
 * Cambiar PIN de paciente (requiere autenticación)
 * PUT /api/auth-unified/change-pin
 */
router.put('/change-pin',
  AdvancedRateLimiting.crudLimiter(),
  writeRateLimit,
  changePIN
);

/**
 * Obtener credenciales de un usuario
 * GET /api/auth-unified/credentials/:userType/:userId
 */
router.get('/credentials/:userType/:userId',
  authorizeRoles(['Admin', 'Doctor']),
  searchRateLimit,
  getUserCredentials
);

/**
 * Eliminar credencial
 * DELETE /api/auth-unified/credentials/:credentialId
 */
router.delete('/credentials/:credentialId',
  authorizeRoles(['Admin']),
  writeRateLimit,
  deleteCredential
);

export default router;

