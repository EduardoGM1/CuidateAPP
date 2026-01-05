import validator from 'express-validator';
import { body, param, query, validationResult } from 'express-validator';
import { Op } from 'sequelize';

/**
 * Middleware de validación y sanitización para prevenir SQL Injection
 * Utiliza express-validator con reglas estrictas
 */
class SecurityValidator {
  
  /**
   * Sanitiza strings para prevenir SQL injection
   */
  static sanitizeString() {
    return body('*').customSanitizer((value, { path }) => {
      if (typeof value === 'string') {
        // Remover caracteres peligrosos para SQL
        return value
          .replace(/['"`;\\]/g, '') // Remover comillas y punto y coma
          .replace(/--/g, '') // Remover comentarios SQL
          .replace(/\/\*/g, '') // Remover comentarios de bloque
          .replace(/\*\//g, '') // Remover fin de comentarios
          .replace(/union\s+select/gi, '') // Remover UNION SELECT
          .replace(/drop\s+table/gi, '') // Remover DROP TABLE
          .replace(/delete\s+from/gi, '') // Remover DELETE FROM
          .replace(/insert\s+into/gi, '') // Remover INSERT INTO
          .replace(/update\s+set/gi, '') // Remover UPDATE SET
          .trim();
      }
      return value;
    });
  }

  /**
   * Valida emails con protección contra injection
   */
  static validateEmail() {
    return body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .isLength({ min: 5, max: 150 })
      .withMessage('Email debe ser válido y tener entre 5-150 caracteres')
      .custom((value) => {
        // Verificar que no contiene caracteres peligrosos
        const dangerousPatterns = [
          /['"`;\\]/,
          /--/,
          /\/\*/,
          /union\s+select/i,
          /drop\s+table/i,
          /delete\s+from/i
        ];
        
        if (dangerousPatterns.some(pattern => pattern.test(value))) {
          throw new Error('Email contiene caracteres no permitidos');
        }
        return true;
      });
  }

  /**
   * Valida passwords con protección contra injection
   */
  static validatePassword() {
    return body('password')
      .isLength({ min: 6, max: 128 })
      .withMessage('Password debe tener entre 6-128 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password debe contener al menos una mayúscula, una minúscula y un número')
      .custom((value) => {
        // Verificar que no contiene caracteres peligrosos
        const dangerousPatterns = [
          /['"`;\\]/,
          /--/,
          /\/\*/,
          /union\s+select/i,
          /drop\s+table/i,
          /delete\s+from/i,
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i
        ];
        
        if (dangerousPatterns.some(pattern => pattern.test(value))) {
          throw new Error('Password contiene caracteres no permitidos');
        }
        return true;
      });
  }

  /**
   * Valida nombres con protección contra injection
   */
  static validateName() {
    return body(['nombre', 'apellido_paterno', 'apellido_materno'])
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Nombre debe tener entre 2-100 caracteres')
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
      .withMessage('Nombre solo puede contener letras y espacios')
      .customSanitizer((value) => {
        if (typeof value === 'string') {
          return value
            .replace(/['"`;\\]/g, '')
            .replace(/--/g, '')
            .replace(/\/\*/g, '')
            .trim();
        }
        return value;
      });
  }

  /**
   * Valida nombres para actualización de doctores (más permisivo)
   */
  static validateDoctorNameUpdate() {
    return body(['nombre', 'apellido_paterno', 'apellido_materno'])
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Nombre debe tener entre 1-100 caracteres')
      .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.\-]+$/)
      .withMessage('Nombre solo puede contener letras, espacios, puntos y guiones')
      .customSanitizer((value) => {
        if (typeof value === 'string') {
          return value
            .replace(/['"`;\\]/g, '')
            .replace(/--/g, '')
            .replace(/\/\*/g, '')
            .trim();
        }
        return value;
      });
  }

  /**
   * Valida CURP con formato específico
   */
  static validateCURP() {
    return body('curp')
      .optional()
      .isLength({ min: 18, max: 18 })
      .withMessage('CURP debe tener exactamente 18 caracteres')
      .matches(/^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$/)
      .withMessage('CURP debe tener formato válido')
      .customSanitizer((value) => {
        if (typeof value === 'string') {
          return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        }
        return value;
      });
  }

  /**
   * Valida IDs numéricos
   */
  static validateNumericId() {
    return param('id')
      .isInt({ min: 1 })
      .withMessage('ID debe ser un número entero positivo')
      .toInt();
  }

  /**
   * Valida campos específicos para actualización de doctores
   */
  static validateDoctorUpdateFields() {
    return [
      // Validar email
      body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .isLength({ min: 5, max: 150 })
        .withMessage('Email debe ser válido y tener entre 5-150 caracteres')
        .custom((value) => {
          // Verificar que no contiene caracteres peligrosos
          const dangerousPatterns = [
            /['"`;\\]/,
            /--/,
            /\/\*/,
            /union\s+select/i,
            /drop\s+table/i,
            /delete\s+from/i,
            /insert\s+into/i,
            /update\s+set/i
          ];
          
          if (dangerousPatterns.some(pattern => pattern.test(value))) {
            throw new Error('Email contiene caracteres no permitidos');
          }
          return true;
        }),
      
      // Validar teléfono
      body('telefono')
        .optional()
        .isLength({ min: 7, max: 20 })
        .withMessage('Teléfono debe tener entre 7-20 caracteres')
        .matches(/^[\d\s\-\+\(\)]+$/)
        .withMessage('Teléfono solo puede contener números, espacios, guiones, paréntesis y signo +')
        .customSanitizer((value) => {
          if (typeof value === 'string') {
            return value.replace(/[^\d\s\-\+\(\)]/g, '').trim();
          }
          return value;
        }),
      
      // Validar institución hospitalaria
      body('institucion_hospitalaria')
        .optional()
        .isLength({ min: 2, max: 200 })
        .withMessage('Institución hospitalaria debe tener entre 2-200 caracteres')
        .customSanitizer((value) => {
          if (typeof value === 'string') {
            return value
              .replace(/['"`;\\]/g, '')
              .replace(/--/g, '')
              .replace(/\/\*/g, '')
              .trim();
          }
          return value;
        }),
      
      // Validar grado de estudio
      body('grado_estudio')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Grado de estudio debe tener entre 2-100 caracteres')
        .customSanitizer((value) => {
          if (typeof value === 'string') {
            return value
              .replace(/['"`;\\]/g, '')
              .replace(/--/g, '')
              .replace(/\/\*/g, '')
              .trim();
          }
          return value;
        }),
      
      // Validar años de servicio
      body('anos_servicio')
        .optional()
        .isInt({ min: 0, max: 50 })
        .withMessage('Años de servicio debe ser un número entre 0-50')
        .toInt(),
      
      // Validar ID de módulo
      body('id_modulo')
        .optional()
        .isInt({ min: 1 })
        .withMessage('ID de módulo debe ser un número entero positivo')
        .toInt(),
      
      // Validar estado activo
      body('activo')
        .optional()
        .isBoolean()
        .withMessage('Estado activo debe ser verdadero o falso')
        .toBoolean()
    ];
  }

  /**
   * Valida campos específicos para creación de doctores
   */
  static validateDoctorCreateFields() {
    return [
      // Validar email
      body('email')
        .isEmail()
        .normalizeEmail()
        .isLength({ min: 5, max: 150 })
        .withMessage('Email debe ser válido y tener entre 5-150 caracteres')
        .custom((value) => {
          const dangerousPatterns = [
            /['"`;\\]/,
            /--/,
            /\/\*/,
            /union\s+select/i,
            /drop\s+table/i,
            /delete\s+from/i,
            /insert\s+into/i,
            /update\s+set/i
          ];
          
          if (dangerousPatterns.some(pattern => pattern.test(value))) {
            throw new Error('Email contiene caracteres no permitidos');
          }
          return true;
        }),

      // Validar contraseña
      body('password')
        .isLength({ min: 6, max: 100 })
        .withMessage('Contraseña debe tener entre 6-100 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Contraseña debe contener al menos una mayúscula, una minúscula y un número'),

      // Validar confirmación de contraseña
      body('confirmPassword')
        .custom((value, { req }) => {
          if (value !== req.body.password) {
            throw new Error('Las contraseñas no coinciden');
          }
          return true;
        }),

      // Validar nombre
      body('nombre')
        .isLength({ min: 2, max: 100 })
        .withMessage('Nombre debe tener entre 2-100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.]+$/)
        .withMessage('Nombre solo puede contener letras, espacios y puntos')
        .customSanitizer((value) => {
          if (typeof value === 'string') {
            return value
              .replace(/['"`;\\]/g, '')
              .replace(/--/g, '')
              .replace(/\/\*/g, '')
              .trim();
          }
          return value;
        }),

      // Validar apellido paterno
      body('apellido_paterno')
        .isLength({ min: 2, max: 100 })
        .withMessage('Apellido paterno debe tener entre 2-100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.]+$/)
        .withMessage('Apellido paterno solo puede contener letras, espacios y puntos')
        .customSanitizer((value) => {
          if (typeof value === 'string') {
            return value
              .replace(/['"`;\\]/g, '')
              .replace(/--/g, '')
              .replace(/\/\*/g, '')
              .trim();
          }
          return value;
        }),

      // Validar apellido materno
      body('apellido_materno')
        .isLength({ min: 2, max: 100 })
        .withMessage('Apellido materno debe tener entre 2-100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.]+$/)
        .withMessage('Apellido materno solo puede contener letras, espacios y puntos')
        .customSanitizer((value) => {
          if (typeof value === 'string') {
            return value
              .replace(/['"`;\\]/g, '')
              .replace(/--/g, '')
              .replace(/\/\*/g, '')
              .trim();
          }
          return value;
        }),

      // Validar teléfono
      body('telefono')
        .isLength({ min: 7, max: 20 })
        .withMessage('Teléfono debe tener entre 7-20 caracteres')
        .matches(/^[\d\s\-\+\(\)]{7,20}$/)
        .withMessage('Teléfono solo puede contener números, espacios, guiones, paréntesis y signo +')
        .customSanitizer((value) => {
          if (typeof value === 'string') {
            return value.replace(/[^\d\s\-\+\(\)]/g, '').trim();
          }
          return value;
        }),

      // Validar institución hospitalaria
      body('institucion_hospitalaria')
        .isLength({ min: 2, max: 200 })
        .withMessage('Institución hospitalaria debe tener entre 2-200 caracteres')
        .customSanitizer((value) => {
          if (typeof value === 'string') {
            return value
              .replace(/['"`;\\]/g, '')
              .replace(/--/g, '')
              .replace(/\/\*/g, '')
              .trim();
          }
          return value;
        }),

      // Validar grado de estudio
      body('grado_estudio')
        .isLength({ min: 2, max: 100 })
        .withMessage('Grado de estudio debe tener entre 2-100 caracteres')
        .customSanitizer((value) => {
          if (typeof value === 'string') {
            return value
              .replace(/['"`;\\]/g, '')
              .replace(/--/g, '')
              .replace(/\/\*/g, '')
              .trim();
          }
          return value;
        }),

      // Validar años de servicio
      body('anos_servicio')
        .isInt({ min: 0, max: 50 })
        .withMessage('Años de servicio debe ser un número entre 0-50')
        .toInt(),

      // Validar ID de módulo
      body('id_modulo')
        .isInt({ min: 1 })
        .withMessage('ID de módulo debe ser un número entero positivo')
        .toInt(),

      // Validar estado activo
      body('activo')
        .optional()
        .isBoolean()
        .withMessage('Estado activo debe ser verdadero o falso')
        .toBoolean()
    ];
  }

  /**
   * Valida parámetros de consulta
   */
  static validateQueryParams() {
    return [
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit debe ser entre 1-100')
        .toInt(),
      query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset debe ser un número positivo')
        .toInt(),
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page debe ser un número positivo')
        .toInt()
    ];
  }

  /**
   * Valida roles
   */
  static validateRole() {
    return body('rol')
      .isIn(['Admin', 'Doctor', 'Paciente'])
      .withMessage('Rol debe ser Admin, Doctor o Paciente');
  }

  /**
   * Middleware para manejar errores de validación
   */
  static handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de validación incorrectos',
        details: errors.array(),
        received_data: {
          email: req.body.email ? `${req.body.email.substring(0, 3)}***` : undefined,
          password_length: req.body.password ? req.body.password.length : undefined,
          password_sample: req.body.password ? `${req.body.password.substring(0, 3)}***` : undefined,
          rol: req.body.rol
        },
        validation_requirements: {
          email: 'Debe ser un email válido',
          password: 'Mínimo 6 caracteres, 1 mayúscula, 1 minúscula, 1 número',
          rol: 'Paciente, Doctor o Admin'
        }
      });
    }
    next();
  }

  /**
   * Sanitiza objetos para prevenir mass assignment
   */
  static sanitizeObject(allowedFields) {
    return (req, res, next) => {
      if (req.body && typeof req.body === 'object') {
        const sanitizedBody = {};
        
        // Solo permitir campos específicos
        allowedFields.forEach(field => {
          if (req.body.hasOwnProperty(field)) {
            sanitizedBody[field] = req.body[field];
          }
        });
        
        req.body = sanitizedBody;
      }
      next();
    };
  }

  /**
   * Valida fechas
   */
  static validateDate(fieldName) {
    return body(fieldName)
      .optional()
      .isISO8601()
      .withMessage(`${fieldName} debe ser una fecha válida`)
      .custom((value) => {
        const date = new Date(value);
        const now = new Date();
        
        // Validar que la fecha no sea futura para fechas de nacimiento
        if (fieldName === 'fecha_nacimiento' && date > now) {
          throw new Error('Fecha de nacimiento no puede ser futura');
        }
        
        // Validar que la fecha no sea muy antigua
        const minDate = new Date('1900-01-01');
        if (date < minDate) {
          throw new Error('Fecha no puede ser anterior a 1900');
        }
        
        return true;
      });
  }

  /**
   * Valida números decimales seguros
   */
  static validateDecimal(fieldName, min = 0, max = 999999) {
    return body(fieldName)
      .optional()
      .isFloat({ min, max })
      .withMessage(`${fieldName} debe ser un número entre ${min}-${max}`)
      .toFloat();
  }

  /**
   * Valida enteros seguros
   */
  static validateInteger(fieldName, min = 0, max = 999999) {
    return body(fieldName)
      .optional()
      .isInt({ min, max })
      .withMessage(`${fieldName} debe ser un número entero entre ${min}-${max}`)
      .toInt();
  }

  /**
   * Valida PIN de 4 dígitos para pacientes
   */
  static validatePIN() {
    return body('pin')
      .isLength({ min: 4, max: 4 })
      .withMessage('PIN debe tener exactamente 4 dígitos')
      .isNumeric()
      .withMessage('PIN solo puede contener números')
      .custom((value) => {
        // Verificar que no contiene caracteres peligrosos
        const dangerousPatterns = [
          /['"`;\\]/,
          /--/,
          /\/\*/,
          /union\s+select/i,
          /drop\s+table/i,
          /delete\s+from/i,
          /insert\s+into/i,
          /update\s+set/i
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            throw new Error('PIN contiene caracteres no permitidos');
          }
        }
        
        return true;
      });
  }

  /**
   * Valida device ID para autenticación de pacientes
   */
  static validateDeviceId() {
    return body('device_id')
      .isLength({ min: 10, max: 128 })
      .withMessage('Device ID debe tener entre 10-128 caracteres')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Device ID solo puede contener letras, números, guiones y guiones bajos')
      .custom((value) => {
        // Verificar que no contiene caracteres peligrosos
        const dangerousPatterns = [
          /['"`;\\]/,
          /--/,
          /\/\*/,
          /union\s+select/i,
          /drop\s+table/i,
          /delete\s+from/i,
          /insert\s+into/i,
          /update\s+set/i
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(value)) {
            throw new Error('Device ID contiene caracteres no permitidos');
          }
        }
        
        return true;
      });
  }
}

/**
 * Utilidades de Sequelize para consultas seguras
 */
class SequelizeSecurity {
  
  /**
   * Crea condiciones WHERE seguras
   */
  static createSafeWhere(conditions) {
    const safeConditions = {};
    
    Object.keys(conditions).forEach(key => {
      const value = conditions[key];
      
      if (typeof value === 'string') {
        // Escapar caracteres especiales para LIKE
        safeConditions[key] = {
          [Op.like]: `%${value.replace(/[%_\\]/g, '\\$&')}%`
        };
      } else if (typeof value === 'number') {
        safeConditions[key] = value;
      } else if (Array.isArray(value)) {
        // Para arrays, usar IN con validación
        const safeArray = value.filter(item => 
          typeof item === 'string' || typeof item === 'number'
        );
        if (safeArray.length > 0) {
          safeConditions[key] = {
            [Op.in]: safeArray
          };
        }
      }
    });
    
    return safeConditions;
  }

  /**
   * Crea ordenamiento seguro
   */
  static createSafeOrder(orderBy, allowedFields) {
    if (!orderBy || !allowedFields.includes(orderBy)) {
      return [['created_at', 'DESC']]; // Ordenamiento por defecto seguro
    }
    
    return [[orderBy, 'DESC']];
  }

  /**
   * Crea paginación segura
   */
  static createSafePagination(limit, offset) {
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safeOffset = Math.max(parseInt(offset) || 0, 0);
    
    return {
      limit: safeLimit,
      offset: safeOffset
    };
  }

  /**
   * Valida y sanitiza atributos para SELECT
   */
  static createSafeAttributes(requestedFields, allowedFields) {
    if (!requestedFields) {
      return { exclude: ['password_hash', 'refresh_token_hash'] };
    }
    
    const fields = requestedFields.split(',');
    const safeFields = fields.filter(field => 
      allowedFields.includes(field.trim())
    );
    
    if (safeFields.length === 0) {
      return { exclude: ['password_hash', 'refresh_token_hash'] };
    }
    
    return {
      include: safeFields,
      exclude: ['password_hash', 'refresh_token_hash']
    };
  }
}

export { SecurityValidator, SequelizeSecurity };
