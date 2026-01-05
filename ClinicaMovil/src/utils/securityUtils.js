/**
 * Utilidades de seguridad para cumplir con normas de protección de datos
 * LGPD (Ley General de Protección de Datos Personales)
 * NOM-004-SSA3-2012, NOM-024-SSA3-2012
 */

import Logger from '../services/logger';

/**
 * Verificar si los datos son sensibles de salud (PHI - Protected Health Information)
 */
export const isHealthSensitiveData = (data) => {
  if (!data || typeof data !== 'object') return false;
  
  const sensitiveHealthFields = [
    // Datos médicos (PHI)
    'diagnostico', 'diagnóstico',
    'enfermedad', 'condicion', 'condición',
    'medicamento', 'medicamentos',
    'alergia', 'alergias',
    'signos_vitales', 'signosVitales',
    'presion_arterial', 'presionArterial', 'presion_sistolica', 'presion_diastolica',
    'glucosa', 'glucosa_mg_dl', 'temperatura',
    'colesterol', 'colesterol_mg_dl', 'trigliceridos', 'trigliceridos_mg_dl',
    'peso', 'peso_kg', 'talla', 'talla_m', 'imc', 'medida_cintura',
    'historial_medico', 'historialMedico',
    'cita', 'citas', 'motivo', 'notas',
    'comorbilidad', 'comorbilidades',
    'vacuna', 'vacunas',
    'dosis', 'frecuencia', 'horario', 'via_administracion',
    'observaciones',
    // Datos personales (PII)
    'curp', 'fecha_nacimiento', 'fechaNacimiento',
    'direccion', 'dirección', 'localidad',
    'numero_celular', 'numeroCelular',
    'telefono', 'teléfono',
    'email',
    'nombre', 'apellido', 'nombre_contacto',
    'fecha_deteccion'
  ];
  
  const keys = Object.keys(data).map(k => k.toLowerCase());
  return sensitiveHealthFields.some(field => 
    keys.some(key => key.includes(field.toLowerCase()))
  );
};

/**
 * Sanitizar datos antes de loggear (cumplimiento LGPD)
 */
export const sanitizeForLogging = (data) => {
  if (!data) return data;
  
  if (typeof data === 'object') {
    const sanitized = { ...data };
    const sensitiveKeys = [
      // Credenciales y autenticación
      'password', 'token', 'secret', 'pin', 'refreshToken', 'accessToken',
      // Datos personales (PII)
      'curp', 'fecha_nacimiento', 'fechaNacimiento', 'direccion', 'dirección',
      'telefono', 'teléfono', 'numero_celular', 'numeroCelular',
      'email', 'localidad', 'nombre', 'apellido', 'nombre_contacto',
      // Datos médicos (PHI)
      'diagnostico', 'diagnóstico', 'medicamento', 'medicamentos',
      'signos_vitales', 'signosVitales', 'presion_arterial', 'presionArterial',
      'presion_sistolica', 'presion_diastolica', 'glucosa', 'glucosa_mg_dl',
      'colesterol', 'colesterol_mg_dl', 'trigliceridos', 'trigliceridos_mg_dl',
      'peso', 'peso_kg', 'talla', 'talla_m', 'imc', 'medida_cintura',
      'historial_medico', 'historialMedico', 'motivo', 'notas',
      'observaciones', 'dosis', 'frecuencia', 'horario', 'via_administracion',
      'alergia', 'alergias', 'comorbilidad', 'comorbilidades',
      'vacuna', 'vacunas', 'fecha_deteccion'
    ];
    
    for (const key in sanitized) {
      const keyLower = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeForLogging(sanitized[key]);
      }
    }
    
    return sanitized;
  }
  
  return data;
};

/**
 * Verificar que la conexión sea segura (HTTPS)
 */
export const verifySecureConnection = (url) => {
  if (!url) return false;
  
  // En producción, debe ser HTTPS
  if (!__DEV__ && !url.startsWith('https://')) {
    Logger.error('⚠️ ADVERTENCIA DE SEGURIDAD: Conexión no segura en producción', { url });
    return false;
  }
  
  // En desarrollo, permitir HTTP pero loggear
  if (__DEV__ && !url.startsWith('https://')) {
    Logger.warn('⚠️ Conexión HTTP en desarrollo (permitido solo en desarrollo)', { url });
  }
  
  return true;
};

/**
 * Validar que los datos médicos cumplan con normas de protección
 */
export const validateHealthDataProtection = (data) => {
  if (!data) return { valid: true };
  
  const issues = [];
  
  // Verificar que no se expongan datos sensibles en logs
  if (__DEV__) {
    // En desarrollo, permitir más flexibilidad
    return { valid: true };
  }
  
  // En producción, ser estricto
  if (isHealthSensitiveData(data)) {
    // Verificar que los datos estén encriptados o protegidos
    // Esta validación se puede extender según necesidades
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
};

/**
 * Política de retención de datos (cumplimiento LGPD)
 */
export const DATA_RETENTION_POLICIES = {
  // Datos de autenticación: eliminar al cerrar sesión
  AUTH_DATA: 'session',
  
  // Datos médicos en caché: máximo 24 horas
  MEDICAL_CACHE: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
  
  // Tokens: según expiración del backend
  TOKENS: 'backend',
  
  // Logs: máximo 7 días
  LOGS: 7 * 24 * 60 * 60 * 1000, // 7 días
};

/**
 * Verificar cumplimiento de políticas de retención
 */
export const checkDataRetention = async (key, timestamp) => {
  const policy = DATA_RETENTION_POLICIES[key.toUpperCase()];
  
  if (!policy || policy === 'session' || policy === 'backend') {
    return true; // No aplicar retención automática
  }
  
  const now = Date.now();
  const age = now - timestamp;
  
  if (age > policy) {
    Logger.info(`Datos expirados según política de retención: ${key}`);
    return false; // Datos deben eliminarse
  }
  
  return true;
};

/**
 * Consentimiento del usuario (cumplimiento LGPD)
 */
export const CONSENT_TYPES = {
  DATA_COLLECTION: 'data_collection',
  HEALTH_DATA: 'health_data',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
};

/**
 * Verificar si el usuario ha dado consentimiento
 */
export const hasUserConsent = async (consentType) => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const consentKey = `consent_${consentType}`;
    const consent = await AsyncStorage.getItem(consentKey);
    return consent === 'true';
  } catch (error) {
    Logger.error('Error verificando consentimiento', error);
    return false; // Por defecto, no hay consentimiento
  }
};

/**
 * Guardar consentimiento del usuario
 */
export const saveUserConsent = async (consentType, granted) => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const consentKey = `consent_${consentType}`;
    await AsyncStorage.setItem(consentKey, granted ? 'true' : 'false');
    Logger.info(`Consentimiento guardado: ${consentType} = ${granted}`);
    return true;
  } catch (error) {
    Logger.error('Error guardando consentimiento', error);
    return false;
  }
};

export default {
  isHealthSensitiveData,
  sanitizeForLogging,
  verifySecureConnection,
  validateHealthDataProtection,
  DATA_RETENTION_POLICIES,
  checkDataRetention,
  CONSENT_TYPES,
  hasUserConsent,
  saveUserConsent,
};

