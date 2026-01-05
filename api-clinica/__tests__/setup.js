// Configuración global para las pruebas

// Mock de variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_NAME = 'test_db';
process.env.DB_PORT = '3306';
process.env.PORT = '3001';

// Mock global de console para pruebas más limpias
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Configuración de timeout para pruebas
jest.setTimeout(10000);

// Mock de bcryptjs para pruebas más rápidas
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

// Mock de jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({
    id: 1,
    email: 'test@test.com',
    rol: 'Paciente'
  })
}));

// Limpiar mocks después de cada prueba
afterEach(() => {
  jest.clearAllMocks();
});

// Configuración para manejar promesas no capturadas
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = {};