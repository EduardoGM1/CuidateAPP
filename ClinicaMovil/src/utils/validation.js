/**
 * Utilidades de validación y sanitización
 * Previene XSS, SQL Injection indirecto y datos corruptos
 */

/**
 * Sanitiza strings removiendo caracteres peligrosos
 * @param {string} input - String a sanitizar
 * @param {number} maxLength - Longitud máxima permitida
 * @returns {string} - String sanitizado
 */
export const sanitizeString = (input, maxLength = 255) => {
  if (!input || typeof input !== 'string') return '';
  
  // Remover caracteres peligrosos para XSS
  let sanitized = input
    .replace(/[<>]/g, '') // Remover < y >
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+=/gi, '') // Remover event handlers (onclick=, etc)
    .trim();
  
  // Limitar longitud
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Validar email
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validar teléfono (formato mexicano)
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 12;
};

/**
 * Validar fecha (formato YYYY-MM-DD)
 */
export const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validar que la fecha no sea en el pasado
 */
export const isDateInFuture = (dateString) => {
  if (!isValidDate(dateString)) return false;
  const date = new Date(dateString);
  // Normalizar fecha (solo día, sin hora)
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

/**
 * Validar que la fecha no sea en el pasado para citas
 * IMPORTANTE: Permite citas para hoy y fechas futuras
 */
export const isDateInPast = (dateString) => {
  if (!isValidDate(dateString)) return false;
  const date = new Date(dateString);
  // Normalizar fecha (solo día, sin hora) para comparar solo fechas
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  // Normalizar hoy también (solo día, sin hora)
  today.setHours(0, 0, 0, 0);
  // Retorna true si la fecha es ANTES de hoy (no incluye hoy)
  // Retorna false si la fecha es hoy o futura (permite hoy y futuro)
  return date < today;
};

/**
 * Validar CURP (básico)
 */
export const isValidCURP = (curp) => {
  if (!curp) return false;
  const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;
  return curpRegex.test(curp.toUpperCase());
};

/**
 * Validar ID numérico
 */
export const isValidId = (id) => {
  if (!id) return false;
  const num = parseInt(id);
  return !isNaN(num) && num > 0;
};

/**
 * Validar longitud de texto
 */
export const isValidLength = (text, min = 0, max = Infinity) => {
  if (!text) return min === 0;
  return text.length >= min && text.length <= max;
};

/**
 * Validar que un número esté en rango
 */
export const isInRange = (value, min, max) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * Validar formato de presión arterial
 */
export const isValidBloodPressure = (systolic, diastolic) => {
  const sys = parseInt(systolic);
  const dia = parseInt(diastolic);
  
  return (
    !isNaN(sys) && sys >= 50 && sys <= 250 &&
    !isNaN(dia) && dia >= 30 && dia <= 150 &&
    sys > dia
  );
};

/**
 * Validar formato de glucosa
 */
export const isValidGlucose = (glucose) => {
  const glc = parseFloat(glucose);
  return !isNaN(glc) && glc >= 30 && glc <= 600;
};

/**
 * Rate limiting simple en frontend
 */
const clickTimes = {};

export const canExecute = (actionKey, cooldownMs = 1000) => {
  const now = Date.now();
  const lastTime = clickTimes[actionKey] || 0;
  
  if (now - lastTime < cooldownMs) {
    return {
      allowed: false,
      remainingTime: cooldownMs - (now - lastTime)
    };
  }
  
  clickTimes[actionKey] = now;
  return { allowed: true };
};



