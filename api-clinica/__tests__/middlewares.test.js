import { SecurityValidator } from '../middlewares/securityValidator.js';
import { isValidEmailFormat } from '../utils/emailValidation.js';

describe('Middlewares', () => {
  describe('SecurityValidator', () => {
    it('validateEmail devuelve middleware de express-validator', () => {
      const chain = SecurityValidator.validateEmail();
      expect(chain).toBeDefined();
      expect(typeof chain.run).toBe('function');
    });
  });

  describe('isValidEmailFormat', () => {
    it('rechaza emails con puntos consecutivos', () => {
      expect(isValidEmailFormat('user..name@domain.com')).toBe(false);
    });

    it('acepta emails válidos', () => {
      expect(isValidEmailFormat('doctor@hospital.mx')).toBe(true);
    });
  });
});
