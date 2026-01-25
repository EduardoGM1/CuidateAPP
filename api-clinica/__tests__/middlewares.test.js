import { SecurityValidator } from '../middlewares/securityValidator.js';

// Mock de express-validator
jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    notEmpty: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isDate: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis()
  })),
  param: jest.fn(() => ({
    isInt: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn()
}));

// Importar después del mock
import { body, param, validationResult } from 'express-validator';

describe('Middlewares', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Paciente Validation', () => {
    it('should validate required fields for paciente', () => {
      expect(validatePaciente).toBeDefined();
      expect(Array.isArray(validatePaciente)).toBe(true);
      
      // Verificar que se llaman las validaciones correctas
      expect(body).toHaveBeenCalledWith('nombre');
      expect(body).toHaveBeenCalledWith('apellido_paterno');
      expect(body).toHaveBeenCalledWith('fecha_nacimiento');
    });

    it('should validate ID parameter', () => {
      expect(validateId).toBeDefined();
      expect(Array.isArray(validateId)).toBe(true);
      
      expect(param).toHaveBeenCalledWith('id');
    });
  });

  describe('Auth Validation', () => {
    it('should validate registration fields', () => {
      expect(validateRegister).toBeDefined();
      expect(Array.isArray(validateRegister)).toBe(true);
      
      expect(body).toHaveBeenCalledWith('email');
      expect(body).toHaveBeenCalledWith('password');
      expect(body).toHaveBeenCalledWith('rol');
    });

    it('should validate login fields', () => {
      expect(validateLogin).toBeDefined();
      expect(Array.isArray(validateLogin)).toBe(true);
      
      expect(body).toHaveBeenCalledWith('email');
      expect(body).toHaveBeenCalledWith('password');
    });
  });

  describe('Validation Result Handler', () => {
    it('should handle validation errors correctly', () => {
      const mockReq = {};
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const mockNext = jest.fn();

      const mockErrors = {
        isEmpty: jest.fn().mockReturnValue(false),
        array: jest.fn().mockReturnValue([
          { msg: 'Nombre es requerido', param: 'nombre' }
        ])
      };

      validationResult.mockReturnValue(mockErrors);

      // Ejecutar el último middleware (handler de errores)
      const errorHandler = validatePaciente[validatePaciente.length - 1];
      errorHandler(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        errors: [{ msg: 'Nombre es requerido', param: 'nombre' }]
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when no validation errors', () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();

      const mockErrors = {
        isEmpty: jest.fn().mockReturnValue(true)
      };

      validationResult.mockReturnValue(mockErrors);

      const errorHandler = validatePaciente[validatePaciente.length - 1];
      errorHandler(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });
});