import EncryptionService from '../services/encryptionService.js';
import logger from '../utils/logger.js';

/**
 * Hooks de Sequelize para encriptar/desencriptar campos automáticamente
 * 
 * Campos sensibles a encriptar:
 * - CURP
 * - Números de teléfono
 * - Direcciones
 * - Datos médicos críticos (según configuración)
 */

// Campos que deben encriptarse en el modelo Paciente
const ENCRYPTED_FIELDS_PACIENTE = [
  'curp',
  'numero_celular',
  'direccion',
  'fecha_nacimiento' // 🔴 CRÍTICO - LFPDPPP, HIPAA §164.514
];

// Campos que deben encriptarse en SignoVital
const ENCRYPTED_FIELDS_SIGNO_VITAL = [
  'observaciones',
  'presion_sistolica',      // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
  'presion_diastolica',     // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
  'glucosa_mg_dl',          // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
  'colesterol_mg_dl',       // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
  'colesterol_ldl',         // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
  'colesterol_hdl',         // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
  'trigliceridos_mg_dl',    // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
  'hba1c_porcentaje'        // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
];

// Campos que deben encriptarse en Diagnostico
const ENCRYPTED_FIELDS_DIAGNOSTICO = [
  'descripcion' // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA §164.514
];

// Campos que deben encriptarse en Cita
const ENCRYPTED_FIELDS_CITA = [
  'motivo',        // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
  'observaciones'  // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
];

// Campos que deben encriptarse en RedApoyo
const ENCRYPTED_FIELDS_RED_APOYO = [
  'numero_celular', // 🔴 CRÍTICO - LFPDPPP, HIPAA §164.514
  'email',          // 🔴 CRÍTICO - LFPDPPP
  'direccion'       // 🔴 CRÍTICO - LFPDPPP, HIPAA §164.514
];

// Campos que deben encriptarse en PlanMedicacion
const ENCRYPTED_FIELDS_PLAN_MEDICACION = [
  'observaciones' // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
];

// Campos que deben encriptarse en PlanDetalle
const ENCRYPTED_FIELDS_PLAN_DETALLE = [
  'observaciones' // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
];

// Campos que deben encriptarse en PacienteComorbilidad
const ENCRYPTED_FIELDS_PACIENTE_COMORBILIDAD = [
  'observaciones' // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
];

// Campos que deben encriptarse en EsquemaVacunacion
const ENCRYPTED_FIELDS_ESQUEMA_VACUNACION = [
  'observaciones' // 🔴 CRÍTICO - NOM-004-SSA3-2012, HIPAA
];

// Campos que deben encriptarse en otros modelos
const ENCRYPTED_FIELDS_MEDICAL = [
  // Se pueden agregar más campos según necesidad
];

/**
 * Hook antes de crear/actualizar: encriptar campos sensibles
 * Mejores prácticas:
 * - Convierte valores numéricos a string antes de encriptar
 * - Verifica si ya está encriptado para evitar doble encriptación
 * - Maneja errores sin interrumpir el flujo
 */
export const encryptBeforeSave = (Model, encryptedFields) => {
  return (instance, options) => {
    if (!instance) return;
    
    for (const field of encryptedFields) {
      if (instance[field] !== undefined && instance[field] !== null) {
        // Solo encriptar si no está ya encriptado
        if (!EncryptionService.isEncrypted(instance[field])) {
          try {
            // Convertir a string si es numérico (para campos como presion_sistolica, glucosa_mg_dl, etc.)
            let valueToEncrypt = instance[field];
            if (typeof valueToEncrypt === 'number') {
              valueToEncrypt = String(valueToEncrypt);
            } else if (typeof valueToEncrypt !== 'string') {
              valueToEncrypt = String(valueToEncrypt);
            }
            
            instance[field] = EncryptionService.encryptField(valueToEncrypt);
          } catch (error) {
            logger.error(`Error encriptando campo ${field}`, {
              error: error.message,
              model: Model.name,
              fieldType: typeof instance[field]
            });
            // Continuar sin encriptar en caso de error (para compatibilidad)
          }
        }
      }
    }
  };
};

/**
 * Hook después de cargar: desencriptar campos sensibles
 * Mejores prácticas:
 * - Desencripta automáticamente al cargar desde BD
 * - Convierte strings numéricos de vuelta a números cuando corresponde
 * - Maneja errores sin interrumpir el flujo
 */
export const decryptAfterLoad = (Model, encryptedFields) => {
  return (instance) => {
    if (!instance) return;
    
    // Función auxiliar para desencriptar un campo
    const decryptFieldValue = (value, fieldName) => {
      if (value === undefined || value === null || value === '') {
        return value;
      }
      // Aceptar string (JSON) u objeto { encrypted, iv, authTag } (p. ej. devuelto por BD como JSON)
      const isEncryptedString = typeof value === 'string' && value.trim().startsWith('{');
      const isEncryptedObject = typeof value === 'object' && value !== null && value.encrypted != null && value.iv != null && value.authTag != null;
      if (!isEncryptedString && !isEncryptedObject) {
        return value;
      }
      try {
        const decrypted = EncryptionService.decryptField(value);
        if (decrypted !== null && decrypted !== value) {
          // Intentar convertir a número si el campo originalmente era numérico
          // y el valor desencriptado es un número válido
          const numericFields = [
            'presion_sistolica', 'presion_diastolica', 'glucosa_mg_dl',
            'colesterol_mg_dl', 'colesterol_ldl', 'colesterol_hdl',
            'trigliceridos_mg_dl', 'hba1c_porcentaje'
          ];
          
          if (numericFields.includes(fieldName)) {
            const numValue = parseFloat(decrypted);
            if (!isNaN(numValue)) {
              return numValue;
            }
          }
          
          return decrypted;
        }
        // Datos encriptados pero desencriptación falló: no exponer el payload en la API
        if (isEncryptedObject || isEncryptedString) {
          return null;
        }
      } catch (error) {
        // Si falla la desencriptación, puede ser que no esté encriptado
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`Campo ${fieldName} no desencriptado (puede no estar encriptado):`, error.message);
        }
        if (isEncryptedObject || isEncryptedString) {
          return null;
        }
      }
      
      return value; // Retornar valor original si no era encriptado
    };
    
    // Función auxiliar para desencriptar una instancia
    const decryptInstance = (item) => {
      if (!item || !item.dataValues) return;
      
      try {
        for (const field of encryptedFields) {
          if (item.dataValues[field] !== undefined && item.dataValues[field] !== null) {
            const decrypted = decryptFieldValue(item.dataValues[field], field);
            if (decrypted !== item.dataValues[field]) {
              item.dataValues[field] = decrypted;
              item[field] = decrypted; // También actualizar propiedad directa
            }
          }
        }
      } catch (error) {
        logger.warn(`Error desencriptando instancia de ${Model.name}`, {
          error: error.message,
          instanceId: item.id_cita || item.id_paciente || item.id || 'unknown'
        });
      }
    };
    
    // Manejar arrays de instancias (findAll, findAndCountAll)
    if (Array.isArray(instance)) {
      instance.forEach(item => {
        decryptInstance(item);
      });
      return;
    }
    
    // Manejar instancia única (findOne)
    if (instance.dataValues) {
      decryptInstance(instance);
    }
  };
};

/**
 * Aplicar hooks de encriptación a un modelo
 */
export const applyEncryptionHooks = (Model, encryptedFields) => {
  // Hook antes de crear
  Model.addHook('beforeCreate', 'encryptBeforeCreate', encryptBeforeSave(Model, encryptedFields));
  
  // Hook antes de actualizar
  Model.addHook('beforeUpdate', 'encryptBeforeUpdate', encryptBeforeSave(Model, encryptedFields));
  
  // Hook después de cargar (findOne, findAll, etc.)
  Model.addHook('afterFind', 'decryptAfterFind', decryptAfterLoad(Model, encryptedFields));
  
  logger.debug(`Hooks de encriptación aplicados a modelo ${Model.name}`, {
    fields: encryptedFields
  });
};

export { 
  ENCRYPTED_FIELDS_PACIENTE,
  ENCRYPTED_FIELDS_SIGNO_VITAL,
  ENCRYPTED_FIELDS_DIAGNOSTICO,
  ENCRYPTED_FIELDS_CITA,
  ENCRYPTED_FIELDS_RED_APOYO,
  ENCRYPTED_FIELDS_PLAN_MEDICACION,
  ENCRYPTED_FIELDS_PLAN_DETALLE,
  ENCRYPTED_FIELDS_PACIENTE_COMORBILIDAD,
  ENCRYPTED_FIELDS_ESQUEMA_VACUNACION,
  ENCRYPTED_FIELDS_MEDICAL
};

