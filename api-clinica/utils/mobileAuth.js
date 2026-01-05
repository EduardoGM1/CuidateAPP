// Utilidades de autenticación optimizadas para móviles
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Generar token principal para móviles (más corto)
export const generateMobileToken = (user, deviceInfo = {}) => {
  const payload = {
    id: user.id_usuario,
    email: user.email,
    rol: user.rol,
    type: 'mobile',
    device_id: deviceInfo.device_id,
    platform: deviceInfo.platform,
    client_type: deviceInfo.client_type
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '2h', // ✅ Más corto para móviles
    issuer: 'clinica-mobile-api',
    audience: 'clinica-mobile-app'
  });
};

// Generar refresh token para renovación automática
export const generateRefreshToken = (user, deviceInfo = {}) => {
  const payload = {
    id: user.id_usuario,
    type: 'refresh',
    device_id: deviceInfo.device_id,
    token_version: user.token_version || 1
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: '7d',
    issuer: 'clinica-mobile-api',
    audience: 'clinica-mobile-app'
  });
};

// Generar token para pacientes (PIN/Biometría)
export const generatePatientToken = (paciente, authMethod = 'pin', deviceInfo = {}) => {
  const payload = {
    id: paciente.id_paciente,
    type: 'patient',
    auth_method: authMethod,
    device_id: deviceInfo.device_id,
    platform: deviceInfo.platform
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '4h', // ✅ Tiempo intermedio para pacientes
    issuer: 'clinica-patient-api',
    audience: 'clinica-patient-app'
  });
};

// Verificar token móvil
export const verifyMobileToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'clinica-mobile-api',
      audience: 'clinica-mobile-app'
    });
    
    return { valid: true, payload: decoded };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message,
      expired: error.name === 'TokenExpiredError'
    };
  }
};

// Verificar refresh token
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
      issuer: 'clinica-mobile-api',
      audience: 'clinica-mobile-app'
    });
    
    return { valid: true, payload: decoded };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message,
      expired: error.name === 'TokenExpiredError'
    };
  }
};

// Generar challenge para autenticación biométrica
export const generateBiometricChallenge = () => {
  return {
    challenge: crypto.randomBytes(32).toString('hex'),
    expires_at: new Date(Date.now() + 5 * 60 * 1000) // 5 minutos
  };
};

// Validar challenge biométrico
export const validateBiometricChallenge = (challenge, signature, publicKey) => {
  // Aquí implementarías la validación real de WebAuthn
  // Por ahora, simulamos la validación
  return {
    valid: true,
    verified: true
  };
};

// Generar token de sesión temporal (para operaciones sensibles)
export const generateSessionToken = (user, operation = 'general') => {
  const payload = {
    id: user.id_usuario,
    type: 'session',
    operation,
    session_id: crypto.randomUUID()
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '15m', // ✅ Muy corto para operaciones sensibles
    issuer: 'clinica-session-api'
  });
};

// Middleware para renovar tokens automáticamente
export const autoRenewToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const refreshToken = req.headers['x-refresh-token'];
  
  if (authHeader && refreshToken) {
    const token = authHeader.split(' ')[1];
    const tokenResult = verifyMobileToken(token);
    
    // Si el token está próximo a expirar (menos de 30 minutos)
    if (tokenResult.valid && tokenResult.payload.exp) {
      const expirationTime = tokenResult.payload.exp * 1000;
      const timeUntilExpiry = expirationTime - Date.now();
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (timeUntilExpiry < thirtyMinutes) {
        // Renovar token
        const refreshResult = verifyRefreshToken(refreshToken);
        if (refreshResult.valid) {
          // Generar nuevos tokens
          const newToken = generateMobileToken(tokenResult.payload, {
            device_id: tokenResult.payload.device_id,
            platform: tokenResult.payload.platform
          });
          
          const newRefreshToken = generateRefreshToken(tokenResult.payload, {
            device_id: tokenResult.payload.device_id
          });
          
          // Enviar headers con nuevos tokens
          res.set('X-New-Token', newToken);
          res.set('X-New-Refresh-Token', newRefreshToken);
          res.set('X-Token-Renewed', 'true');
        }
      }
    }
  }
  
  next();
};

// Utilidad para extraer información del dispositivo del token
export const extractDeviceInfo = (token) => {
  try {
    const decoded = jwt.decode(token);
    return {
      device_id: decoded?.device_id,
      platform: decoded?.platform,
      client_type: decoded?.client_type,
      type: decoded?.type
    };
  } catch (error) {
    return null;
  }
};

// Generar token de prueba para testing
export const generateTestToken = (userType = 'patient', deviceInfo = {}) => {
  const testPayload = {
    id: userType === 'patient' ? 999 : 1,
    email: userType === 'patient' ? 'test.patient@clinica.com' : 'test.admin@clinica.com',
    rol: userType === 'patient' ? 'Paciente' : 'Admin',
    type: 'mobile',
    device_id: deviceInfo.device_id || 'test-device-123',
    platform: deviceInfo.platform || 'test',
    client_type: 'app',
    test: true
  };

  return jwt.sign(testPayload, process.env.JWT_SECRET, {
    expiresIn: '24h', // ✅ Largo para testing
    issuer: 'clinica-test-api'
  });
};
