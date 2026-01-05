import { decryptPIIFields, encryptPIIFields } from '../utils/encryption.js';
import logger from '../utils/logger.js';

// Campos que se desencriptan automáticamente por modelo
// Fase 1 - Crítico: Datos personales (PII) y datos médicos (PHI) sensibles
const ENCRYPTED_FIELDS = {
  pacientes: [
    'curp',                    // ✅ Ya implementado
    'numero_celular',          // ✅ Ya implementado
    'direccion',               // ✅ Ya implementado
    'fecha_nacimiento'         // ❌ AGREGADO - PII crítico
    // NOTA: email no existe en modelo Paciente (se usa en Usuario)
  ],
  doctores: [
    'telefono'                 // ✅ Ya implementado
    // NOTA: email no existe en modelo Doctor (se usa en Usuario)
  ],
  usuarios: [
    // NOTA: Email en usuarios NO se encripta porque se usa para login/búsqueda
    // Si se requiere encriptar, implementar búsqueda por hash
  ],
  red_apoyo: [
    'numero_celular',          // ✅ Ya implementado
    'email',                   // ✅ Ya implementado
    'direccion'                // ✅ Ya implementado
  ],
  diagnosticos: [
    'descripcion'              // ✅ Ya implementado
  ],
  signos_vitales: [
    'observaciones',           // ✅ Ya implementado
    'presion_sistolica',       // ❌ AGREGADO - PHI crítico
    'presion_diastolica',      // ❌ AGREGADO - PHI crítico
    'glucosa_mg_dl',           // ❌ AGREGADO - PHI crítico
    'colesterol_mg_dl',        // ❌ AGREGADO - PHI crítico
    'trigliceridos_mg_dl'      // ❌ AGREGADO - PHI crítico
  ],
  citas: [
    'motivo',                  // ❌ AGREGADO - PHI crítico
    'observaciones'            // ❌ AGREGADO - PHI crítico
  ],
  planes_medicacion: [
    'observaciones'            // ❌ AGREGADO - PHI crítico
  ],
  plan_detalle: [
    'observaciones'           // ❌ AGREGADO - PHI crítico
  ],
  paciente_comorbilidad: [
    'observaciones'            // ❌ AGREGADO - PHI crítico
  ],
  esquema_vacunacion: [
    'observaciones'           // ❌ AGREGADO - PHI crítico
  ]
};

// Middleware para desencriptar automáticamente en respuestas
// NOTA: Los hooks de Sequelize ya desencriptan automáticamente al cargar de la BD
// Este middleware es una capa adicional de seguridad para casos donde los datos
// no pasan por los hooks (ej: queries raw, datos de otras fuentes)
export const autoDecryptResponse = (modelName) => {
  return (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      // Usar Promise para manejar la desencriptación asíncrona
      Promise.resolve().then(async () => {
        try {
          if (data && ENCRYPTED_FIELDS[modelName]) {
            // Función auxiliar para verificar si un campo necesita desencriptación
            const needsDecryption = (value) => {
              if (!value || typeof value !== 'string') return false;
              
              // Verificar formato JSON (EncryptionService) - formato: {"encrypted":"...","iv":"...","authTag":"..."}
              try {
                const jsonData = JSON.parse(value);
                if (jsonData.encrypted && jsonData.iv && jsonData.authTag) {
                  return true;
                }
              } catch (jsonError) {
                // No es JSON válido, continuar con formato iv:tag:data
              }
              
              // Verificar formato encriptado: iv:tag:data (3 partes separadas por :)
              const parts = value.split(':');
              return parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0;
            };
            
            // Función auxiliar para desencriptar un item (ahora async)
            const decryptItem = async (item) => {
              if (!item || typeof item !== 'object') return item;
              
              // Verificar si algún campo encriptado necesita desencriptación
              const hasEncryptedFields = ENCRYPTED_FIELDS[modelName].some(field => {
                return item[field] && needsDecryption(item[field]);
              });
              
              // Solo desencriptar si hay campos que parecen estar encriptados
              if (hasEncryptedFields) {
                try {
                  return await decryptPIIFields(item, ENCRYPTED_FIELDS[modelName]);
                } catch (error) {
                  logger.warn(`Error desencriptando item: ${error.message}`);
                  return item;
                }
              }
              
              // Si no hay campos encriptados, retornar tal cual
              return item;
            };
            
            // Si tiene estructura de respuesta con data (sendSuccess)
            if (data.data !== undefined) {
              if (Array.isArray(data.data)) {
                // data.data es un array directamente - usar Promise.all para manejar async
                data.data = await Promise.all(data.data.map(decryptItem));
              } else if (data.data && typeof data.data === 'object') {
                // data.data es un objeto que puede contener arrays o objetos anidados
                // Buscar arrays dentro del objeto (ej: { citas: [...], total: 10 })
                const dataObj = data.data;
                const keys = Object.keys(dataObj);
                
                for (const key of keys) {
                  try {
                    if (Array.isArray(dataObj[key])) {
                      // Si es un array, desencriptar cada item solo si necesita
                      dataObj[key] = await Promise.all(dataObj[key].map(decryptItem));
                    } else if (dataObj[key] && typeof dataObj[key] === 'object' && !Array.isArray(dataObj[key])) {
                      // Si es un objeto, verificar si necesita desencriptación
                      dataObj[key] = await decryptItem(dataObj[key]);
                    }
                  } catch (error) {
                    logger.warn(`Error procesando campo ${key} en data.data: ${error.message}`);
                  }
                }
              }
            }
            // Si es un array de objetos directamente
            else if (Array.isArray(data)) {
              data = await Promise.all(data.map(decryptItem));
            }
            // Si es un objeto único
            else if (typeof data === 'object' && data !== null) {
              data = await decryptItem(data);
            }
          }
        } catch (error) {
          // Si hay un error crítico, loguear pero continuar con la respuesta original
          logger.error(`Error crítico en autoDecryptResponse para ${modelName}:`, {
            error: error.message,
            stack: error.stack
          });
        }
        
        // Enviar respuesta después de desencriptar
        originalJson.call(this, data);
      }).catch(error => {
        logger.error(`Error en Promise de autoDecryptResponse para ${modelName}:`, {
          error: error.message,
          stack: error.stack
        });
        // En caso de error, enviar respuesta original
        originalJson.call(this, data);
      });
    };
    
    next();
  };
};

// Middleware para encriptar automáticamente en requests
export const autoEncryptRequest = (modelName) => {
  return (req, res, next) => {
    if (req.body && ENCRYPTED_FIELDS[modelName]) {
      req.body = encryptPIIFields(req.body, ENCRYPTED_FIELDS[modelName]);
    }
    next();
  };
};