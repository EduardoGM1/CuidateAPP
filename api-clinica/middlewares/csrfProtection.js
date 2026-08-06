import crypto from 'crypto';

/**
 * CSRF opcional (Bearer-first API).
 * Web y móvil autentican con Authorization: Bearer — no hay cookie de sesión,
 * por lo que CSRF no se aplica globalmente a mutaciones (rompería clientes nativos).
 * GET /api/csrf-token queda disponible por compatibilidad; no es obligatorio.
 */
const csrfTokens = new Map();

export const csrfProtection = (req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionId = req.headers['authorization'] || req.ip;
  
  if (!token || !csrfTokens.has(sessionId) || csrfTokens.get(sessionId) !== token) {
    return res.status(403).json({ error: 'CSRF token inválido' });
  }
  
  next();
};

// CSRF token endpoint
export const getCsrfToken = (req, res) => {
  const sessionId = req.headers['authorization'] || req.ip;
  const token = crypto.randomBytes(32).toString('hex');
  
  csrfTokens.set(sessionId, token);
  
  // Limpiar tokens antiguos cada hora
  setTimeout(() => csrfTokens.delete(sessionId), 3600000);
  
  res.json({ csrfToken: token });
};