import Logger from './logger';

// Servicio de validaciones para la aplicación
export const validationService = {
  // Validar email
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validar contraseña
  validatePassword(password) {
    const checks = {
      minLength: password.length >= 6,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password),
    };
    
    const strengthScore = Object.values(checks).filter(Boolean).length;
    
    return {
      isValid: checks.minLength && checks.hasLetter && checks.hasNumber,
      strengthScore,
      strengthChecks: checks,
    };
  },

  // Validar PIN de 4 dígitos
  validatePIN(pin) {
    const pinRegex = /^\d{4}$/;
    return {
      isValid: pinRegex.test(pin),
      message: pinRegex.test(pin) ? 'PIN válido' : 'PIN debe tener exactamente 4 dígitos',
    };
  },

  // Validar ID de paciente
  validatePatientId(pacienteId) {
    const id = parseInt(pacienteId);
    return {
      isValid: !isNaN(id) && id > 0,
      message: !isNaN(id) && id > 0 ? 'ID de paciente válido' : 'ID de paciente debe ser un número positivo',
    };
  },

  // Validar login de doctor
  validateDoctorLogin(email, password) {
    const errors = [];
    let isValid = true;

    // Validar email
    if (!email || !this.validateEmail(email)) {
      errors.push({
        field: 'email',
        message: 'Email inválido',
        isValid: false,
      });
      isValid = false;
    }

    // Validar contraseña
    const passwordValidation = this.validatePassword(password);
    if (!password || !passwordValidation.isValid) {
      errors.push({
        field: 'password',
        message: 'Contraseña debe tener al menos 6 caracteres, una letra y un número',
        isValid: false,
      });
      isValid = false;
    }

    return {
      isValid,
      errors,
      data: isValid ? { email, password } : null,
    };
  },

  // Validar login de paciente con PIN
  // pacienteId es opcional - si no se proporciona, se usa búsqueda global por PIN
  validatePatientPINLogin(pacienteId, pin) {
    const errors = [];
    let isValid = true;

    // SOLUCIÓN MEJORADA: Normalizar pacienteId primero
    // Convertir cualquier valor "vacío" o descriptivo a null explícitamente
    let normalizedPacienteId = pacienteId;
    
    // Si es null, undefined, string vacío, o string descriptivo → null
    if (pacienteId === null || 
        pacienteId === undefined || 
        pacienteId === '' ||
        pacienteId === 'búsqueda global' ||
        (typeof pacienteId === 'string' && (
          pacienteId.toLowerCase().includes('búsqueda') ||
          pacienteId.toLowerCase().includes('global') ||
          pacienteId.toLowerCase().includes('search')
        ))) {
      normalizedPacienteId = null;
    }

    // SOLUCIÓN CRÍTICA: Solo validar pacienteId si NO es null y es un número válido
    // Si es null, simplemente no validarlo (se usará búsqueda global)
    if (normalizedPacienteId !== null) {
      // Intentar convertir a número
      const idNum = typeof normalizedPacienteId === 'number' 
        ? normalizedPacienteId 
        : parseInt(normalizedPacienteId);
      
      // Si no es un número válido, tratarlo como null (búsqueda global)
      if (isNaN(idNum) || idNum <= 0) {
        Logger.info('pacienteId no es un número válido, usando búsqueda global', {
          original: pacienteId,
          parsed: idNum
        });
        normalizedPacienteId = null;
      } else {
        // Es un número válido, validarlo
        const patientIdValidation = this.validatePatientId(normalizedPacienteId);
        if (!patientIdValidation.isValid) {
          errors.push({
            field: 'pacienteId',
            message: patientIdValidation.message,
            isValid: false,
          });
          isValid = false;
        }
      }
    }

    // Validar PIN (siempre requerido)
    const pinValidation = this.validatePIN(pin);
    if (!pinValidation.isValid) {
      errors.push({
        field: 'pin',
        message: pinValidation.message,
        isValid: false,
      });
      isValid = false;
    }

    return {
      isValid,
      errors,
      data: isValid ? { 
        pacienteId: normalizedPacienteId, // null o número válido
        pin 
      } : null,
    };
  },
};