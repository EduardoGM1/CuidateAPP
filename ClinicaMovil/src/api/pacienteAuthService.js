/**
 * Compatibilidad: el flujo real vive en authService (rutas /api/auth-unified/*).
 * El backend deprecó /api/paciente-auth/* (410). Usar este módulo solo donde
 * aún se importe el default; preferir importar desde ./authService.
 */
import { doctorAuthService, pacienteAuthService as unifiedPacienteAuth } from './authService';

const validatePIN = (pin) => {
  if (!pin || typeof pin !== 'string') {
    return { valid: false, error: 'PIN es requerido' };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { valid: false, error: 'PIN debe tener exactamente 4 dígitos' };
  }
  return { valid: true };
};

const generateDeviceId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `device_${timestamp}_${random}`;
};

export default {
  /** Registro vía API estándar (mismo que authSlice / doctorAuthService). */
  async register(email, password, rol = 'Paciente') {
    return doctorAuthService.register(email, password, rol);
  },

  async setupPIN(pacienteId, pin, deviceId) {
    return unifiedPacienteAuth.setupPIN(pacienteId, pin, deviceId);
  },

  async loginWithPIN(pacienteId, pin, deviceId) {
    return unifiedPacienteAuth.loginWithPIN(pacienteId, pin, deviceId);
  },

  async setupBiometric(pacienteId, deviceId, publicKey, credentialId) {
    return unifiedPacienteAuth.setupBiometric(pacienteId, deviceId, publicKey, credentialId);
  },

  async loginWithBiometric(pacienteId, deviceId, signature, challenge) {
    return unifiedPacienteAuth.loginWithBiometric(pacienteId, deviceId, signature, challenge);
  },

  generateDeviceId,
  validatePIN,
};
