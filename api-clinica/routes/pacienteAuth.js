/**
 * Legacy: tablas paciente_auth* eliminadas.
 * Todas las rutas responden 410. Usar /api/auth-unified/*
 */

import { Router } from 'express';

const router = Router();

// Express 5 / path-to-regexp no acepta '*'; middleware sin path cubre el montaje.
router.use((req, res) => {
  res.status(410).json({
    success: false,
    error: 'Este endpoint está deprecated',
    message: 'Usa /api/auth-unified/* para autenticación de pacientes',
    deprecated: true,
    migration: {
      login_pin: 'POST /api/auth-unified/login-paciente',
      setup_pin: 'POST /api/auth-unified/setup-pin',
      setup_biometric: 'POST /api/auth-unified/setup-biometric',
    },
  });
});

export default router;
