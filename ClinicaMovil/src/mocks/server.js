/**
 * @file server.js
 * @description MSW server para Node.js (testing)
 * @author Senior Developer
 * @date 2025-11-08
 */

// Usar require en lugar de import para compatibilidad con Jest
let server = null;

try {
  const { setupServer } = require('msw/node');
  const { handlers } = require('./handlers');
  
  // Configurar el servidor MSW para Node.js (Jest)
  server = setupServer(...handlers);
} catch (error) {
  // MSW no está disponible, crear un mock básico
  console.warn('MSW no está disponible:', error.message);
  server = {
    listen: jest.fn(),
    resetHandlers: jest.fn(),
    close: jest.fn(),
  };
}

module.exports = { server };
