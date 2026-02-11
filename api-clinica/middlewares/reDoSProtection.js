import validator from 'express-validator';

/**
 * Middleware para prevenir ReDoS (Regular Expression Denial of Service) attacks
 */
class ReDoSProtection {
  
  /**
   * Expresiones regulares seguras y optimizadas
   */
  static getSafeRegexPatterns() {
    return {
      // Email seguro (evita backtracking catastrófico)
      email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      
      // Password seguro (evita backtracking)
      password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
      
      // CURP seguro
      curp: /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$/,
      
      // Teléfono seguro
      phone: /^[0-9]{10}$/,
      
      // Nombre seguro (solo letras y espacios)
      name: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,100}$/,
      
      // ID numérico seguro
      numericId: /^[1-9][0-9]*$/,
      
      // UUID seguro
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      
      // Fecha ISO segura
      isoDate: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/,
      
      // URL segura
      url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
      
      // IP segura
      ip: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      
      // Alphanumeric seguro
      alphanumeric: /^[a-zA-Z0-9]+$/,
      
      // Decimal seguro
      decimal: /^-?\d+(\.\d{1,2})?$/,
      
      // Entero seguro
      integer: /^-?\d+$/
    };
  }

  /**
   * Valida que una expresión regular sea segura
   */
  static validateRegexSafety(regex, input, maxTime = 100) {
    const startTime = Date.now();
    
    try {
      const result = regex.test(input);
      const executionTime = Date.now() - startTime;
      
      if (executionTime > maxTime) {
        throw new Error(`Regex execution time exceeded: ${executionTime}ms`);
      }
      
      return { result, executionTime };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new Error(`Regex execution failed: ${error.message} (${executionTime}ms)`);
    }
  }

  /**
   * Middleware para validar inputs con regex seguros
   */
  static validateWithSafeRegex(field, patternName, customMessage) {
    const patterns = this.getSafeRegexPatterns();
    const pattern = patterns[patternName];
    
    if (!pattern) {
      throw new Error(`Pattern not found: ${patternName}`);
    }

    return validator.body(field).custom((value) => {
      if (typeof value !== 'string') {
        return true;
      }

      try {
        const { result, executionTime } = this.validateRegexSafety(pattern, value);
        
        if (!result) {
          throw new Error(customMessage || `Formato inválido para ${field}`);
        }
        
        return true;
      } catch (error) {
        throw new Error(`Validación fallida: ${error.message}`);
      }
    });
  }

  /**
   * Middleware para prevenir ReDoS en todos los inputs
   */
  static preventReDoS(req, res, next) {
    // Saltar validación en login/register (email/password no son regex de usuario)
    const authPath = req.path === '/login' || req.path === '/register' || req.path === '/forgot-password' || req.path === '/reset-password'
      || req.path.endsWith('/login') || req.path.endsWith('/register')
      || req.path.includes('login-doctor-admin') || req.path.includes('login-paciente') || req.path.includes('auth-unified');
    if (authPath) {
      return next();
    }
    const patterns = this.getSafeRegexPatterns();
    const maxExecutionTime = 50; // 50ms máximo por validación
    
    // Función para validar un valor
    const validateValue = (value, fieldName) => {
      if (typeof value !== 'string') {
        return true;
      }

      // Validar longitud máxima para prevenir ReDoS
      if (value.length > 1000) {
        throw new Error(`Campo ${fieldName} excede longitud máxima permitida`);
      }

      // Solo rechazar cadenas que claramente pueden causar ReDoS: repetición excesiva del mismo carácter.
      // No usar patrones como (a+)+$ o (a|a)*$: en JS hacen match con casi cualquier string (falsos positivos).
      if (/(.)\1{15,}/.test(value)) {
        throw new Error(`Campo ${fieldName} contiene patrones peligrosos`);
      }

      return true;
    };

    // Validar body
    if (req.body) {
      for (const [key, value] of Object.entries(req.body)) {
        try {
          validateValue(value, `body.${key}`);
        } catch (error) {
          return res.status(400).json({
            error: 'Input contiene patrones peligrosos',
            code: 'REDOS_DETECTED',
            field: key,
            message: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Validar query
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        try {
          validateValue(value, `query.${key}`);
        } catch (error) {
          return res.status(400).json({
            error: 'Query parameter contiene patrones peligrosos',
            code: 'REDOS_DETECTED',
            field: key,
            message: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Validar params
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        try {
          validateValue(value, `params.${key}`);
        } catch (error) {
          return res.status(400).json({
            error: 'URL parameter contiene patrones peligrosos',
            code: 'REDOS_DETECTED',
            field: key,
            message: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    next();
  }

  /**
   * Validador específico para email
   */
  static validateEmail() {
    return this.validateWithSafeRegex('email', 'email', 'Email debe tener formato válido');
  }

  /**
   * Validador específico para password
   */
  static validatePassword() {
    return this.validateWithSafeRegex('password', 'password', 'Password debe contener al menos una mayúscula, una minúscula y un número');
  }

  /**
   * Validador específico para CURP
   */
  static validateCURP() {
    return this.validateWithSafeRegex('curp', 'curp', 'CURP debe tener formato válido');
  }

  /**
   * Validador específico para teléfono
   */
  static validatePhone() {
    return this.validateWithSafeRegex('telefono', 'phone', 'Teléfono debe tener 10 dígitos');
  }

  /**
   * Validador específico para nombre
   */
  static validateName() {
    return this.validateWithSafeRegex(['nombre', 'apellido_paterno', 'apellido_materno'], 'name', 'Nombre solo puede contener letras y espacios');
  }

  /**
   * Validador específico para ID numérico
   */
  static validateNumericId() {
    return this.validateWithSafeRegex('id', 'numericId', 'ID debe ser un número entero positivo');
  }

  /**
   * Validador específico para fecha ISO
   */
  static validateISODate() {
    return this.validateWithSafeRegex('fecha', 'isoDate', 'Fecha debe tener formato ISO válido');
  }

  /**
   * Validador específico para URL
   */
  static validateURL() {
    return this.validateWithSafeRegex('url', 'url', 'URL debe tener formato válido');
  }

  /**
   * Validador específico para IP
   */
  static validateIP() {
    return this.validateWithSafeRegex('ip', 'ip', 'IP debe tener formato válido');
  }

  /**
   * Validador específico para alfanumérico
   */
  static validateAlphanumeric() {
    return this.validateWithSafeRegex('codigo', 'alphanumeric', 'Código solo puede contener letras y números');
  }

  /**
   * Validador específico para decimal
   */
  static validateDecimal() {
    return this.validateWithSafeRegex('precio', 'decimal', 'Precio debe ser un número decimal válido');
  }

  /**
   * Validador específico para entero
   */
  static validateInteger() {
    return this.validateWithSafeRegex('cantidad', 'integer', 'Cantidad debe ser un número entero válido');
  }
}

export default ReDoSProtection;
