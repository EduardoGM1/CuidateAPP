/**
 * Helpers de autenticación para tests
 * Proporciona funciones y datos de prueba para tests de autenticación
 */

import jwt from 'jsonwebtoken';
import { generateTestToken as generateMobileTestToken } from '../utils/mobileAuth.js';

/**
 * Datos de prueba para tests
 */
export const TEST_DATA = {
  validUser: {
    email: 'test.admin@clinica.com',
    password: 'Admin123',
    rol: 'Admin'
  },
  validDoctor: {
    email: 'test.doctor@clinica.com',
    password: 'Doctor123',
    rol: 'Doctor'
  },
  validPaciente: {
    email: 'test.paciente@clinica.com',
    password: 'Paciente123',
    rol: 'Paciente'
  },
  validPacienteData: {
    nombre: 'Test',
    apellido_paterno: 'Paciente',
    apellido_materno: 'Usuario',
    fecha_nacimiento: '1990-01-01',
    curp: 'PEUT900101HDFRRN01',
    sexo: 'Hombre',
    numero_celular: '5551234567',
    institucion_salud: 'IMSS',
    direccion: 'Calle Test 123',
    localidad: 'Ciudad Test'
  },
  invalidUser: {
    email: 'invalid@test.com',
    password: 'WrongPassword123'
  },
  invalidEmail: {
    email: 'invalid-email',
    password: 'Password123'
  },
  weakPassword: {
    email: 'test@test.com',
    password: 'weak'
  }
};

/**
 * Genera un token JWT para tests
 * @param {Object} userData - Datos del usuario
 * @param {string} userData.id - ID del usuario
 * @param {string} userData.email - Email del usuario
 * @param {string} userData.rol - Rol del usuario (Admin, Doctor, Paciente)
 * @param {Object} options - Opciones adicionales
 * @returns {string} Token JWT
 */
export const generateTestToken = (userData = {}, options = {}) => {
  const {
    id = 1,
    email = 'test@clinica.com',
    rol = 'Admin',
    id_usuario = id,
    id_paciente = null,
    id_doctor = null
  } = userData;

  const payload = {
    id: id_usuario,
    id_usuario,
    email,
    rol,
    type: options.type || 'web',
    test: true,
    ...(id_paciente && { id_paciente }),
    ...(id_doctor && { id_doctor })
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret', {
    expiresIn: options.expiresIn || '24h',
    issuer: 'clinica-test-api'
  });
};

/**
 * Genera headers de autenticación para tests
 * @param {Object} userData - Datos del usuario
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Headers con Authorization
 */
export const authHeaders = (userData = {}, options = {}) => {
  const token = generateTestToken(userData, options);
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Test-Mode': 'true',
    ...(options.deviceId && { 'X-Device-ID': options.deviceId }),
    ...(options.platform && { 'X-Platform': options.platform })
  };
};

/**
 * Genera token para usuario Admin
 * @param {Object} options - Opciones adicionales
 * @returns {string} Token JWT
 */
export const generateAdminToken = (options = {}) => {
  return generateTestToken({
    id: 1,
    email: TEST_DATA.validUser.email,
    rol: 'Admin'
  }, options);
};

/**
 * Genera token para usuario Doctor
 * @param {Object} options - Opciones adicionales
 * @returns {string} Token JWT
 */
export const generateDoctorToken = (options = {}) => {
  return generateTestToken({
    id: 2,
    email: TEST_DATA.validDoctor.email,
    rol: 'Doctor'
  }, options);
};

/**
 * Genera token para usuario Paciente
 * @param {Object} options - Opciones adicionales
 * @returns {string} Token JWT
 */
export const generatePacienteToken = (options = {}) => {
  return generateTestToken({
    id: 3,
    email: TEST_DATA.validPaciente.email,
    rol: 'Paciente'
  }, options);
};

/**
 * Headers de autenticación para Admin
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Headers
 */
export const adminHeaders = (options = {}) => {
  return authHeaders({
    id: 1,
    email: TEST_DATA.validUser.email,
    rol: 'Admin'
  }, options);
};

/**
 * Headers de autenticación para Doctor
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Headers
 */
export const doctorHeaders = (options = {}) => {
  return authHeaders({
    id: 2,
    email: TEST_DATA.validDoctor.email,
    rol: 'Doctor'
  }, options);
};

/**
 * Headers de autenticación para Paciente
 * @param {Object} options - Opciones adicionales
 * @returns {Object} Headers
 */
export const pacienteHeaders = (options = {}) => {
  return authHeaders({
    id: 3,
    email: TEST_DATA.validPaciente.email,
    rol: 'Paciente'
  }, options);
};

/**
 * Genera token móvil para tests
 * @param {string} userType - Tipo de usuario (patient, doctor, admin)
 * @param {Object} deviceInfo - Información del dispositivo
 * @returns {string} Token JWT móvil
 */
export const generateMobileToken = (userType = 'patient', deviceInfo = {}) => {
  return generateMobileTestToken(userType, deviceInfo);
};
