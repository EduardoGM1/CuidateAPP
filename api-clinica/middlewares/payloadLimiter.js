import express from 'express';

// Límites de payload optimizados para seguridad
const PAYLOAD_LIMITS = {
  default: '1mb',     // Reducido para mayor seguridad
  files: '2mb',       // Reducido de 5MB a 2MB
  images: '5mb',      // Reducido de 10MB a 5MB
  emergency: '512kb'  // Para endpoints críticos
};

// Middleware para límite general (1MB) - MEJORADO
export const defaultPayloadLimit = express.json({ 
  limit: PAYLOAD_LIMITS.default,
  strict: true,
  type: 'application/json'
});

// Middleware para archivos médicos (2MB) - OPTIMIZADO
export const filePayloadLimit = express.json({ 
  limit: PAYLOAD_LIMITS.files,
  strict: true,
  type: 'application/json'
});

// Middleware para imágenes médicas (5MB) - OPTIMIZADO
export const imagePayloadLimit = express.json({ 
  limit: PAYLOAD_LIMITS.images,
  strict: true,
  type: 'application/json'
});

// Middleware para endpoints de emergencia (512KB)
export const emergencyPayloadLimit = express.json({ 
  limit: PAYLOAD_LIMITS.emergency,
  strict: true,
  type: 'application/json'
});

// Middleware de validación de tamaño personalizado con validación mejorada
export const customPayloadLimit = (limit) => {
  return express.json({ 
    limit,
    strict: true,
    type: 'application/json',
    verify: (req, res, buf) => {
      // Validación adicional del contenido
      if (buf.length === 0) {
        throw new Error('Payload vacío no permitido');
      }
    }
  });
};

// Middleware para validar tamaño antes del procesamiento
export const validatePayloadSize = (maxSize = '1mb') => {
  return (req, res, next) => {
    const contentLength = req.get('content-length');
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          error: 'Payload demasiado grande',
          maxSize: maxSize,
          receivedSize: `${Math.round(sizeInBytes / 1024)}KB`
        });
      }
    }
    next();
  };
};

// Función auxiliar para convertir tamaños
function parseSize(size) {
  const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 };
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) return 1024 * 1024; // Default 1MB
  return parseFloat(match[1]) * units[match[2]];
}