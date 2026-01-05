import crypto from 'crypto';

// Simple CSRF protection implementation
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