import { Router } from 'express';
import { 
  register, 
  login, 
  getUsuarios, 
  changePassword,
  adminChangePassword,
  updatePassword,
  forgotPassword,
  resetPassword,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  refreshToken,
  logout,
  logoutAll
} from '../controllers/auth.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import { preventMassAssignment, sanitizeFields } from '../middlewares/sanitization.js';
import { authRateLimit } from '../middlewares/rateLimiting.js';
import { handleValidationErrors } from '../middlewares/errorHandler.js';

// Advanced Security Middlewares
import { SecurityValidator } from '../middlewares/securityValidator.js';
import AdvancedRateLimiting from '../middlewares/advancedRateLimiting.js';
import MassAssignmentProtection from '../middlewares/massAssignmentProtection.js';
import ReDoSProtection from '../middlewares/reDoSProtection.js';

const router = Router();

/** Solo con RELAX_AUTH_VALIDATION=1 en development se omiten validadores (Postman/DX). */
const relaxAuthValidation =
  process.env.NODE_ENV === 'development' && process.env.RELAX_AUTH_VALIDATION === '1';

// Rate limiting estricto salvo desarrollo local relajado
if (!relaxAuthValidation) {
  router.use(AdvancedRateLimiting.authLimiter());
  router.use(AdvancedRateLimiting.bruteForceLimiter());
}

router.post('/register', 
  ...(relaxAuthValidation ? [] : [
    MassAssignmentProtection.validateOperation('userRegistration'),
    SecurityValidator.validateEmail(),
    SecurityValidator.validatePassword(),
    SecurityValidator.handleValidationErrors
  ]),
  register
);

router.post('/login', 
  ...(relaxAuthValidation ? [] : [
    MassAssignmentProtection.validateOperation('userRegistration'),
    SecurityValidator.validateEmail(),
    SecurityValidator.validatePassword(),
    SecurityValidator.handleValidationErrors
  ]),
  login
);

// Listar usuarios (solo Admin)
router.get('/usuarios', 
  authenticateToken,
  (req, res, next) => {
    if (req.user.rol !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden ver usuarios.'
      });
    }
    next();
  },
  getUsuarios
);

// Obtener usuario por ID (solo Admin)
router.get('/usuarios/:id',
  authenticateToken,
  (req, res, next) => {
    if (req.user.rol !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden ver usuarios.'
      });
    }
    next();
  },
  getUsuarioById
);

// Crear nuevo usuario (solo Admin)
router.post('/usuarios',
  authenticateToken,
  (req, res, next) => {
    if (req.user.rol !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden crear usuarios.'
      });
    }
    next();
  },
  createUsuario
);

// Actualizar usuario (solo Admin)
router.put('/usuarios/:id',
  authenticateToken,
  (req, res, next) => {
    if (req.user.rol !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden actualizar usuarios.'
      });
    }
    next();
  },
  updateUsuario
);

// Eliminar/Desactivar usuario (solo Admin)
router.delete('/usuarios/:id',
  authenticateToken,
  (req, res, next) => {
    if (req.user.rol !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Solo administradores pueden eliminar usuarios.'
      });
    }
    next();
  },
  deleteUsuario
);

// Cambiar contraseña (requiere autenticación y contraseña actual)
router.put('/change-password',
  authenticateToken,
  ...(relaxAuthValidation ? [] : [
    MassAssignmentProtection.validateOperation('passwordUpdate'),
    SecurityValidator.validatePassword(),
    SecurityValidator.handleValidationErrors
  ]),
  changePassword
);

// Recuperación de contraseña - Solicitar reset (público)
router.post('/forgot-password',
  AdvancedRateLimiting.authLimiter(),
  authRateLimit,
  ...(relaxAuthValidation ? [] : [
    SecurityValidator.validateEmail(),
    SecurityValidator.handleValidationErrors
  ]),
  forgotPassword
);

// Recuperación de contraseña - Resetear con token (público). Body: { token, newPassword }
router.post('/reset-password',
  AdvancedRateLimiting.authLimiter(),
  authRateLimit,
  ...(relaxAuthValidation ? [] : [
    SecurityValidator.validateNewPassword(),
    SecurityValidator.handleValidationErrors
  ]),
  resetPassword
);

// Cambiar contraseña de otro usuario (solo Admin, sin requerir contraseña actual)
router.put('/admin/change-password',
  authenticateToken,
  authorizeRoles(['Admin']),
  ...(relaxAuthValidation ? [] : [
    MassAssignmentProtection.validateOperation('passwordUpdate'),
    SecurityValidator.validatePassword(),
    SecurityValidator.handleValidationErrors
  ]),
  adminChangePassword
);

// Endpoint legacy: updatePassword (DEPRECATED - mantener para compatibilidad)
router.put('/update-password', 
  authenticateToken,
  ...(relaxAuthValidation ? [] : [
    MassAssignmentProtection.validateOperation('passwordUpdate'),
    SecurityValidator.validateEmail(),
    SecurityValidator.validatePassword(),
    SecurityValidator.handleValidationErrors
  ]),
  updatePassword
);

// Refresh token (renovar access token)
router.post('/refresh',
  authRateLimit, // Rate limiting para prevenir abuso de refresh tokens
  refreshToken
);

// Cerrar sesión (revocar refresh token)
router.post('/logout',
  authenticateToken,
  logout
);

// Cerrar todas las sesiones (revocar todos los refresh tokens)
router.post('/logout-all',
  authenticateToken,
  logoutAll
);

export default router;