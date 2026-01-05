import { validationService } from '../../services/validationService';
import Logger from '../../services/logger';

/**
 * Validaciones específicas para formularios de doctores y pacientes
 * Extiende el validationService existente con validaciones específicas
 */
export const formValidation = {
  // =====================================================
  // VALIDACIONES BÁSICAS (REUTILIZAR EXISTENTES)
  // =====================================================
  
  validateEmail: validationService.validateEmail,
  validatePassword: validationService.validatePassword,
  validatePIN: validationService.validatePIN,

  // =====================================================
  // VALIDACIONES ESPECÍFICAS PARA DOCTORES
  // =====================================================

  /**
   * Validar nombre completo de doctor
   */
  validateDoctorName(name) {
    if (!name || name.trim().length < 2) {
      return {
        isValid: false,
        message: 'El nombre debe tener al menos 2 caracteres'
      };
    }
    
    if (name.trim().length > 50) {
      return {
        isValid: false,
        message: 'El nombre no puede exceder 50 caracteres'
      };
    }
    
    return {
      isValid: true,
      message: 'Nombre válido'
    };
  },

  /**
   * Validar apellidos de doctor
   */
  validateDoctorSurnames(apellidoPaterno, apellidoMaterno) {
    const errors = [];
    
    if (!apellidoPaterno || apellidoPaterno.trim().length < 2) {
      errors.push('Apellido paterno debe tener al menos 2 caracteres');
    }
    
    if (apellidoMaterno && apellidoMaterno.trim().length > 0 && apellidoMaterno.trim().length < 2) {
      errors.push('Apellido materno debe tener al menos 2 caracteres');
    }
    
    if (apellidoPaterno && apellidoPaterno.trim().length > 50) {
      errors.push('Apellido paterno no puede exceder 50 caracteres');
    }
    
    if (apellidoMaterno && apellidoMaterno.trim().length > 50) {
      errors.push('Apellido materno no puede exceder 50 caracteres');
    }
    
    return {
      isValid: errors.length === 0,
      message: errors.length === 0 ? 'Apellidos válidos' : errors[0],
      errors
    };
  },

  /**
   * Validar teléfono de doctor
   */
  validateDoctorPhone(telefono) {
    if (!telefono || telefono.trim().length === 0) {
      return {
        isValid: false,
        message: 'El teléfono es requerido'
      };
    }
    
    // Formato mexicano: 555-1234 o +52 555 123 4567
    const phoneRegex = /^(\+52\s?)?(\d{3}[\s-]?\d{3}[\s-]?\d{4}|\d{3}[\s-]?\d{4})$/;
    
    if (!phoneRegex.test(telefono.trim())) {
      return {
        isValid: false,
        message: 'Formato de teléfono inválido (ej: 555-1234)'
      };
    }
    
    return {
      isValid: true,
      message: 'Teléfono válido'
    };
  },

  /**
   * Validar especialidad/grado de estudio
   */
  validateSpecialty(especialidad) {
    if (!especialidad || especialidad.trim().length < 3) {
      return {
        isValid: false,
        message: 'La especialidad debe tener al menos 3 caracteres'
      };
    }
    
    if (especialidad.trim().length > 100) {
      return {
        isValid: false,
        message: 'La especialidad no puede exceder 100 caracteres'
      };
    }
    
    return {
      isValid: true,
      message: 'Especialidad válida'
    };
  },

  /**
   * Validar años de servicio
   */
  validateYearsOfService(anosServicio) {
    const years = parseInt(anosServicio);
    
    if (isNaN(years) || years < 0) {
      return {
        isValid: false,
        message: 'Los años de servicio deben ser un número positivo'
      };
    }
    
    if (years > 50) {
      return {
        isValid: false,
        message: 'Los años de servicio no pueden exceder 50'
      };
    }
    
    return {
      isValid: true,
      message: 'Años de servicio válidos'
    };
  },

  /**
   * Validar institución hospitalaria
   */
  validateInstitution(institucion) {
    if (!institucion || institucion.trim().length < 3) {
      return {
        isValid: false,
        message: 'La institución debe tener al menos 3 caracteres'
      };
    }
    
    if (institucion.trim().length > 100) {
      return {
        isValid: false,
        message: 'La institución no puede exceder 100 caracteres'
      };
    }
    
    return {
      isValid: true,
      message: 'Institución válida'
    };
  },

  // =====================================================
  // VALIDACIONES ESPECÍFICAS PARA PACIENTES
  // =====================================================

  /**
   * Validar nombre completo de paciente
   */
  validatePatientName(name) {
    return this.validateDoctorName(name); // Misma validación
  },

  /**
   * Validar apellidos de paciente
   */
  validatePatientSurnames(apellidoPaterno, apellidoMaterno) {
    return this.validateDoctorSurnames(apellidoPaterno, apellidoMaterno); // Misma validación
  },

  /**
   * Validar fecha de nacimiento
   */
  validateBirthDate(fechaNacimiento) {
    if (!fechaNacimiento) {
      return {
        isValid: false,
        message: 'La fecha de nacimiento es requerida'
      };
    }
    
    const birthDate = new Date(fechaNacimiento);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (isNaN(birthDate.getTime())) {
      return {
        isValid: false,
        message: 'Fecha de nacimiento inválida'
      };
    }
    
    if (age < 0) {
      return {
        isValid: false,
        message: 'La fecha de nacimiento no puede ser futura'
      };
    }
    
    if (age > 120) {
      return {
        isValid: false,
        message: 'La edad no puede exceder 120 años'
      };
    }
    
    return {
      isValid: true,
      message: 'Fecha de nacimiento válida'
    };
  },

  /**
   * Validar CURP
   */
  validateCURP(curp) {
    if (!curp || curp.trim().length === 0) {
      return {
        isValid: false,
        message: 'El CURP es requerido'
      };
    }
    
    // Formato CURP mexicano: 18 caracteres alfanuméricos
    const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/;
    
    if (!curpRegex.test(curp.trim().toUpperCase())) {
      return {
        isValid: false,
        message: 'Formato de CURP inválido (18 caracteres alfanuméricos)'
      };
    }
    
    return {
      isValid: true,
      message: 'CURP válido'
    };
  },

  /**
   * Validar sexo
   */
  validateSex(sexo) {
    const validSexes = ['Hombre', 'Mujer', 'Otro'];
    
    if (!sexo || !validSexes.includes(sexo)) {
      return {
        isValid: false,
        message: 'Selecciona un sexo válido'
      };
    }
    
    return {
      isValid: true,
      message: 'Sexo válido'
    };
  },

  /**
   * Validar dirección
   */
  validateAddress(direccion) {
    if (!direccion || direccion.trim().length < 5) {
      return {
        isValid: false,
        message: 'La dirección debe tener al menos 5 caracteres'
      };
    }
    
    if (direccion.trim().length > 200) {
      return {
        isValid: false,
        message: 'La dirección no puede exceder 200 caracteres'
      };
    }
    
    return {
      isValid: true,
      message: 'Dirección válida'
    };
  },

  /**
   * Validar número de celular
   */
  validateCellPhone(numeroCelular) {
    if (!numeroCelular || numeroCelular.trim().length === 0) {
      return {
        isValid: false,
        message: 'El número de celular es requerido'
      };
    }
    
    // Formato mexicano: 10 dígitos
    const cellRegex = /^(\d{10}|\d{3}[\s-]?\d{3}[\s-]?\d{4})$/;
    
    if (!cellRegex.test(numeroCelular.trim())) {
      return {
        isValid: false,
        message: 'Formato de celular inválido (10 dígitos)'
      };
    }
    
    return {
      isValid: true,
      message: 'Celular válido'
    };
  },

  // =====================================================
  // VALIDACIONES COMPLETAS DE FORMULARIOS
  // =====================================================

  /**
   * Validar formulario completo de doctor
   */
  validateDoctorForm(formData) {
    const errors = {};
    let isValid = true;

    // Validar email
    if (!this.validateEmail(formData.email)) {
      errors.email = 'Email inválido';
      isValid = false;
    }

    // Validar contraseña
    const passwordValidation = this.validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      errors.password = 'Contraseña debe tener al menos 6 caracteres, una letra y un número';
      isValid = false;
    }

    // Validar nombre
    const nameValidation = this.validateDoctorName(formData.nombre);
    if (!nameValidation.isValid) {
      errors.nombre = nameValidation.message;
      isValid = false;
    }

    // Validar apellidos
    const surnamesValidation = this.validateDoctorSurnames(formData.apellidoPaterno, formData.apellidoMaterno);
    if (!surnamesValidation.isValid) {
      errors.apellidoPaterno = surnamesValidation.message;
      isValid = false;
    }

    // Validar teléfono
    const phoneValidation = this.validateDoctorPhone(formData.telefono);
    if (!phoneValidation.isValid) {
      errors.telefono = phoneValidation.message;
      isValid = false;
    }

    // Validar especialidad
    const specialtyValidation = this.validateSpecialty(formData.gradoEstudio);
    if (!specialtyValidation.isValid) {
      errors.gradoEstudio = specialtyValidation.message;
      isValid = false;
    }

    // Validar años de servicio
    const yearsValidation = this.validateYearsOfService(formData.anosServicio);
    if (!yearsValidation.isValid) {
      errors.anosServicio = yearsValidation.message;
      isValid = false;
    }

    // Validar institución
    const institutionValidation = this.validateInstitution(formData.institucionHospitalaria);
    if (!institutionValidation.isValid) {
      errors.institucionHospitalaria = institutionValidation.message;
      isValid = false;
    }

    Logger.info('Validación formulario doctor', { isValid, errorsCount: Object.keys(errors).length });

    return {
      isValid,
      errors,
      data: isValid ? formData : null
    };
  },

  /**
   * Validar formulario completo de paciente
   */
  validatePatientForm(formData) {
    const errors = {};
    let isValid = true;

    // Validar nombre
    const nameValidation = this.validatePatientName(formData.nombre);
    if (!nameValidation.isValid) {
      errors.nombre = nameValidation.message;
      isValid = false;
    }

    // Validar apellidos
    const surnamesValidation = this.validatePatientSurnames(formData.apellidoPaterno, formData.apellidoMaterno);
    if (!surnamesValidation.isValid) {
      errors.apellidoPaterno = surnamesValidation.message;
      isValid = false;
    }

    // Validar fecha de nacimiento
    const birthValidation = this.validateBirthDate(formData.fechaNacimiento);
    if (!birthValidation.isValid) {
      errors.fechaNacimiento = birthValidation.message;
      isValid = false;
    }

    // Validar CURP
    const curpValidation = this.validateCURP(formData.curp);
    if (!curpValidation.isValid) {
      errors.curp = curpValidation.message;
      isValid = false;
    }

    // Validar sexo
    const sexValidation = this.validateSex(formData.sexo);
    if (!sexValidation.isValid) {
      errors.sexo = sexValidation.message;
      isValid = false;
    }

    // Validar dirección
    const addressValidation = this.validateAddress(formData.direccion);
    if (!addressValidation.isValid) {
      errors.direccion = addressValidation.message;
      isValid = false;
    }

    // Validar estado (obligatorio)
    if (!formData.estado || !formData.estado.trim()) {
      errors.estado = 'El estado es requerido';
      isValid = false;
    }

    // Validar localidad (requiere estado)
    if (!formData.localidad || !formData.localidad.trim()) {
      errors.localidad = 'La localidad es requerida';
      isValid = false;
    } else if (!formData.estado || !formData.estado.trim()) {
      errors.localidad = 'Debe seleccionar un estado primero';
      isValid = false;
    }

    // Validar celular
    const cellValidation = this.validateCellPhone(formData.numeroCelular);
    if (!cellValidation.isValid) {
      errors.numeroCelular = cellValidation.message;
      isValid = false;
    }

    Logger.info('Validación formulario paciente', { isValid, errorsCount: Object.keys(errors).length });

    return {
      isValid,
      errors,
      data: isValid ? formData : null
    };
  }
};

export default formValidation;


