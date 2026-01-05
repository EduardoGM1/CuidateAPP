/**
 * ⚠️ DEPRECATED: Rutas legacy de autenticación de pacientes
 * 
 * Estas rutas usan tablas que fueron eliminadas (paciente_auth, paciente_auth_pin, etc.)
 * 
 * TODO: Migrar frontend para usar /api/auth-unified/*
 * 
 * Ver: routes/unifiedAuth.js para las nuevas rutas
 */

import { Router } from 'express';
// DEPRECATED: Controlador usa tablas eliminadas - Descomentar después de migrar frontend
// import { setupPIN, loginWithPIN, setupBiometric, loginWithBiometric } from '../controllers/pacienteAuth.js';
import { SecurityValidator } from '../middlewares/securityValidator.js';
import MassAssignmentProtection from '../middlewares/massAssignmentProtection.js';
import AdvancedRateLimiting from '../middlewares/advancedRateLimiting.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { handleValidationErrors } from '../middlewares/errorHandler.js';
import { searchRateLimit, writeRateLimit } from '../middlewares/rateLimiting.js';

const router = Router();

// ⚠️ RUTAS LEGACY DESHABILITADAS - Tablas eliminadas
// TODO: Migrar frontend a /api/auth-unified/*

// Endpoints públicos para autenticación de pacientes (desarrollo)
// COMENTADOS: Tablas legacy eliminadas - usar /api/auth-unified/*
/*
if (process.env.NODE_ENV === 'development') {
  // Configurar PIN para paciente
  router.post('/setup-pin', 
    AdvancedRateLimiting.crudLimiter(),
    MassAssignmentProtection.validateOperation('pinSetup'),
    SecurityValidator.validatePIN(),
    SecurityValidator.handleValidationErrors,
    writeRateLimit,
    setupPIN
  );

  // Login con PIN
  router.post('/login-pin',
    AdvancedRateLimiting.crudLimiter(),
    MassAssignmentProtection.validateOperation('pinLogin'),
    SecurityValidator.validatePIN(),
    SecurityValidator.handleValidationErrors,
    writeRateLimit,
    loginWithPIN
  );

  // Configurar biometría
  router.post('/setup-biometric',
    AdvancedRateLimiting.crudLimiter(),
    MassAssignmentProtection.validateOperation('biometricSetup'),
    writeRateLimit,
    setupBiometric
  );

  // Login con biometría
  router.post('/login-biometric',
    AdvancedRateLimiting.crudLimiter(),
    MassAssignmentProtection.validateOperation('biometricLogin'),
    writeRateLimit,
    loginWithBiometric
  );
}
*/

// Rutas protegidas para administración
// COMENTADAS: Endpoints legacy deshabilitados
/*
router.use(authenticateToken);

// Solo Admin puede ver logs de autenticación
router.get('/', authorizeRoles('Admin'), searchRateLimit, (req, res) => {
  res.json({ message: 'Endpoint de autenticación de pacientes funcionando' });
});
*/

// Mensaje informativo para todas las rutas legacy
// Usar router.use() en lugar de router.all('*') ya que '*' no es válido en Express Router
router.use((req, res) => {
  res.status(410).json({
    success: false,
    error: 'Este endpoint está deprecated',
    message: 'Las tablas de autenticación legacy fueron eliminadas. Por favor, usa /api/auth-unified/*',
    deprecated: true,
    migration_guide: '/api/auth-unified'
  });
});

export default router;