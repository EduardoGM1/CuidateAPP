import { Router } from 'express';
import { sanitizeStrings } from '../middlewares/sanitization.js';
import { preventMassAssignment } from '../middlewares/sanitization.js';
import XSSProtection from '../middlewares/xssProtection.js';
import { generalRateLimit } from '../middlewares/rateLimiting.js';

const router = Router();

// Campos permitidos para prevenir mass assignment
const ALLOWED_FIELDS = ['nombre', 'apellido_paterno', 'email', 'descripcion', 'test'];

// Endpoint vulnerable para pruebas de seguridad (solo en modo test)
router.post('/vulnerable', 
  // Aplicar sanitización incluso en test para verificar que funciona
  (req, res, next) => {
    // En modo test, aplicar sanitización pero permitir que el test verifique
    if (process.env.NODE_ENV === 'test') {
      // Aplicar sanitización XSS
      if (req.body && typeof req.body === 'object') {
        req.body = XSSProtection.sanitizeObject(req.body);
      }
      
      // Aplicar prevención de mass assignment
      const filteredBody = {};
      ALLOWED_FIELDS.forEach(field => {
        if (req.body && req.body.hasOwnProperty(field)) {
          filteredBody[field] = req.body[field];
        }
      });
      req.body = filteredBody;
      
      // Verificar SQL injection
      const sqlPatterns = [
        /\b(union\s+select|select\s+.*\s+from|insert\s+into|delete\s+from|update\s+.*\s+set|drop\s+table|create\s+table|alter\s+table)\b/gi,
        /[';]\s*(drop|create|alter|exec|execute|truncate|grant|revoke)/gi,
        /--\s*$|#\s*$|\/\*.*\*\//gi
      ];
      
      const checkForSQL = (obj) => {
        if (typeof obj !== 'object' || obj === null) return false;
        for (const key in obj) {
          if (obj.hasOwnProperty(key) && typeof obj[key] === 'string') {
            if (sqlPatterns.some(pattern => pattern.test(obj[key]))) {
              return true;
            }
          }
        }
        return false;
      };
      
      if (checkForSQL(req.body)) {
        return res.status(400).json({
          error: 'Contenido SQL injection detectado',
          message: 'Se detectó contenido potencialmente peligroso'
        });
      }
    }
    next();
  },
  (req, res) => {
    if (process.env.NODE_ENV !== 'test') {
      return res.status(404).json({ error: 'Endpoint no disponible' });
    }
    
    // Simular respuesta para pruebas
    res.json({
      message: 'Test endpoint',
      received: req.body
    });
  }
);

// Endpoint para rate limiting tests
router.post('/rate-limited', generalRateLimit, (req, res) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(404).json({ error: 'Endpoint no disponible' });
  }
  res.json({ message: 'OK' });
});

// Endpoint para auth tests
router.post('/auth', generalRateLimit, (req, res) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(404).json({ error: 'Endpoint no disponible' });
  }
  // Simular login fallido
  res.status(401).json({ error: 'Credenciales inválidas' });
});

// Endpoint para JSON test
router.post('/json-test', (req, res) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(404).json({ error: 'Endpoint no disponible' });
  }
  res.json({ message: 'JSON válido' });
});

export default router;