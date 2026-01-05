import { body, param, query } from 'express-validator';

// Whitelist de campos permitidos por modelo
const ALLOWED_FIELDS = {
  paciente: [
    'nombre', 'apellido_paterno', 'apellido_materno', 'fecha_nacimiento',
    'curp', 'institucion_salud', 'sexo', 'direccion', 'localidad', 
    'numero_celular', 'id_modulo'
  ],
  doctor: [
    'nombre', 'apellido_paterno', 'apellido_materno', 'telefono',
    'institucion_hospitalaria', 'grado_estudio', 'anos_servicio', 'id_modulo'
  ],
  cita: [
    'id_paciente', 'id_doctor', 'fecha_cita', 'asistencia', 'motivo',
    'es_primera_consulta', 'observaciones'
  ],
  diagnostico: [
    'id_cita', 'descripcion'
  ],
  signoVital: [
    'id_paciente', 'id_cita', 'peso_kg', 'talla_m', 'imc', 'medida_cintura_cm',
    'presion_sistolica', 'presion_diastolica', 'glucosa_mg_dl', 
    'colesterol_mg_dl', 'trigliceridos_mg_dl', 'registrado_por', 'observaciones'
  ]
};

// Middleware para sanitizar campos de entrada
export const sanitizeFields = (modelName) => {
  return (req, res, next) => {
    if (!ALLOWED_FIELDS[modelName]) {
      return res.status(400).json({ error: 'Modelo no válido' });
    }

    const allowedFields = ALLOWED_FIELDS[modelName];
    const sanitizedBody = {};

    // Solo permitir campos whitelistados
    for (const field of allowedFields) {
      if (req.body.hasOwnProperty(field)) {
        sanitizedBody[field] = req.body[field];
      }
    }

    // Reemplazar req.body con versión sanitizada
    req.body = sanitizedBody;
    next();
  };
};

// Sanitización de parámetros de URL
export const sanitizeParams = [
  param('id').isInt({ min: 1 }).withMessage('ID debe ser un número entero positivo').toInt(),
  param('pacienteId').optional().isInt({ min: 1 }).withMessage('ID de paciente inválido').toInt(),
  param('doctorId').optional().isInt({ min: 1 }).withMessage('ID de doctor inválido').toInt(),
  param('diagnosticoId').optional().isInt({ min: 1 }).withMessage('ID de diagnóstico inválido').toInt()
];

// Sanitización de query parameters
export const sanitizeQuery = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit debe ser entre 1 y 100').toInt(),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset debe ser mayor o igual a 0').toInt(),
  query('search').optional().trim().escape().isLength({ max: 100 }).withMessage('Búsqueda máximo 100 caracteres')
];

// Middleware para limpiar strings de caracteres peligrosos - MEJORADO PARA DESARROLLO
export const sanitizeStrings = (req, res, next) => {
  // Skip para tests y desarrollo
  if (process.env.NODE_ENV === 'test' || 
      (process.env.NODE_ENV === 'development' && req.get('X-Test-Mode') === 'true')) {
    return next();
  }

  // Patrones XSS optimizados (sin backtracking)
  const xssPatterns = [
    /<script[^>]{0,100}>/gi,
    /<\/script>/gi,
    /<iframe[^>]{0,100}>/gi,
    /<\/iframe>/gi,
    /<object[^>]{0,100}>/gi,
    /<embed[^>]{0,100}>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w{1,20}\s*=/gi,
    /expression\s*\(/gi
  ];

  // SQL Injection patterns optimizados - más específicos y menos agresivos
  const sqlPatterns = [
    // Comandos SQL completos (solo si están como comandos, no como parte de texto normal)
    /\b(union\s+select|select\s+\*|insert\s+into\s+\w+|delete\s+from\s+\w+|update\s+\w+\s+set|drop\s+table\s+\w+|create\s+table\s+\w+|alter\s+table\s+\w+)\b/gi,
    // Comandos SQL con punto y coma o comilla al inicio
    /[';]\s*(drop|create|alter|exec|execute|truncate|grant|revoke)\s+\w+/gi,
    // Comentarios SQL al final de línea
    /--\s*$|#\s*$|\/\*[\s\S]*\*\//gi
  ];

  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      let sanitized = value;
      
      // Detectar patrones XSS primero
      const hasXSS = xssPatterns.some(pattern => pattern.test(sanitized));
      if (hasXSS) {
        throw new Error('Contenido XSS detectado');
      }
      
      // Detectar SQL injection
      const hasSqlInjection = sqlPatterns.some(pattern => pattern.test(sanitized));
      if (hasSqlInjection) {
        throw new Error('Contenido SQL injection detectado');
      }
      
      // Escapar caracteres HTML de forma más completa
      return sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/`/g, '&#x60;')
        .replace(/=/g, '&#x3D;')
        .trim();
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    try {
      // Usar Object.keys() para mayor compatibilidad
      const keys = Object.keys(obj);
      for (const key of keys) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          sanitized[key] = sanitizeObject(obj[key]);
        } else if (Array.isArray(obj[key])) {
          sanitized[key] = obj[key].map(item => sanitizeValue(item));
        } else {
          sanitized[key] = sanitizeValue(obj[key]);
        }
      }
    } catch (error) {
      // Si hay error, retornar objeto original
      logger.debug('Error sanitizando objeto', { error: error.message });
      return obj;
    }
    return sanitized;
  };

  try {
    // Solo sanitizar body (modificable)
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Para query y params, solo verificar (más permisivo para valores comunes)
    const checkDangerous = (obj) => {
      if (typeof obj !== 'object' || obj === null) return false;
      
      try {
        // Usar Object.keys() para mayor compatibilidad
        const keys = Object.keys(obj);
        for (const key of keys) {
          const value = obj[key];
          if (typeof value === 'string' && value.length > 0) {
            // Valores comunes permitidos (whitelist)
            const commonValues = ['activos', 'inactivos', 'todos', 'recent', 'oldest', 'asc', 'desc', 'true', 'false'];
            const lowerValue = value.toLowerCase().trim();
            
            // Si es un valor común, permitirlo sin verificar patrones
            if (commonValues.includes(lowerValue)) {
              continue;
            }
            
            // Solo verificar patrones SQL si el valor es suficientemente largo
            // (evitar falsos positivos con valores cortos)
            if (value.length > 10) {
              const hasSqlInjection = sqlPatterns.some(pattern => {
                // Hacer el test más específico: debe ser una palabra completa o comando SQL
                const match = pattern.exec(value);
                if (match) {
                  // Verificar que no sea parte de una palabra normal
                  const before = value[match.index - 1];
                  const after = value[match.index + match[0].length];
                  // Si está rodeado de espacios, signos de puntuación o al inicio/fin, es sospechoso
                  if (!before || !after || /[\s,;()]/.test(before) || /[\s,;()]/.test(after)) {
                    return true;
                  }
                }
                return false;
              });
              if (hasSqlInjection) return true;
            }
          }
        }
      } catch (error) {
        // Si hay error al verificar, loguear pero no bloquear (puede ser objeto especial)
        logger.debug('Error verificando query/params en sanitizeStrings', { error: error.message });
        return false;
      }
      return false;
    };
    
    // Solo verificar si hay valores sospechosos (no bloquear por defecto)
    const queryDangerous = checkDangerous(req.query);
    const paramsDangerous = checkDangerous(req.params);
    
    if (queryDangerous || paramsDangerous) {
      logger.warn('Contenido potencialmente peligroso detectado en query/params', {
        url: req.url,
        query: req.query,
        params: req.params,
        ip: req.ip
      });
      throw new Error('Contenido potencialmente peligroso detectado');
    }
    
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Datos de entrada no válidos',
      message: 'Se detectó contenido potencialmente peligroso'
    });
  }
};

// Middleware específico para prevenir mass assignment
export const preventMassAssignment = (allowedFields) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const filteredBody = {};
      allowedFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          filteredBody[field] = req.body[field];
        }
      });
      req.body = filteredBody;
    }
    next();
  };
};