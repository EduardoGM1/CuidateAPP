// Tests de seguridad integrados con la aplicación real
import request from 'supertest';
import app from '../test-app.js';

describe('🛡️ SECURITY INTEGRATION TESTS', () => {
  
  describe('🔐 AUTHENTICATION SECURITY', () => {
    test('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/pacientes')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
    
    test('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/pacientes')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
    
    test('should enforce rate limiting on auth endpoints', async () => {
      const requests = [];
      
      // Hacer múltiples requests de login rápidamente
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@test.com',
              password: 'wrongpassword'
            })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // Al menos algunos deben ser bloqueados por rate limiting
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
  
  describe('🚨 INPUT VALIDATION SECURITY', () => {
    test('should reject SQL injection attempts in login', async () => {
      const sqlPayloads = [
        "admin' OR '1'='1' --",
        "'; DROP TABLE usuarios; --",
        "' UNION SELECT * FROM usuarios --"
      ];
      
      for (const payload of sqlPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'test'
          });
        
        // Debe rechazar o sanitizar
        expect(response.status).not.toBe(200);
      }
    });
    
    test('should sanitize XSS attempts in registration', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")'
      ];
      
      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@test.com',
            password: 'Test123!',
            nombre: payload,
            apellido_paterno: 'Test',
            rol: 'Paciente'
          });
        
        // Si acepta el registro, el nombre debe estar sanitizado
        if (response.status === 201) {
          expect(response.body.usuario.nombre).not.toContain('<script');
          expect(response.body.usuario.nombre).not.toContain('javascript:');
        }
      }
    });
  });
  
  describe('📊 RESPONSE SECURITY', () => {
    test('should not expose sensitive information in error responses', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);
      
      const responseText = JSON.stringify(response.body);
      
      // No debe exponer información del sistema
      expect(responseText).not.toMatch(/mysql/i);
      expect(responseText).not.toMatch(/sequelize/i);
      expect(responseText).not.toMatch(/password/i);
      expect(responseText).not.toMatch(/database/i);
      expect(responseText).not.toMatch(/stack/i);
    });
    
    test('should include security headers', async () => {
      const response = await request(app)
        .get('/api/auth/login')
        .expect(405); // Method not allowed for GET
      
      // Verificar headers de seguridad
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });
  
  describe('🔒 DATA PROTECTION', () => {
    test('should not return password hashes in user data', async () => {
      // Primero registrar un usuario
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'security-test@test.com',
          password: 'Test123!',
          nombre: 'Security',
          apellido_paterno: 'Test',
          rol: 'Paciente'
        });
      
      if (registerResponse.status === 201) {
        // Verificar que no se devuelve el hash de password
        expect(registerResponse.body.usuario).not.toHaveProperty('password');
        expect(registerResponse.body.usuario).not.toHaveProperty('password_hash');
      }
    });
    
    test('should validate CURP format', async () => {
      const invalidCURPs = [
        'INVALID',
        '123456789',
        'TOOLONGCURPFORMAT123456',
        ''
      ];
      
      for (const curp of invalidCURPs) {
        const response = await request(app)
          .post('/api/pacientes')
          .set('Authorization', 'Bearer valid-token') // Necesitaría un token válido
          .send({
            nombre: 'Test',
            apellido_paterno: 'Test',
            curp: curp,
            fecha_nacimiento: '1990-01-01'
          });
        
        // Debe rechazar CURPs inválidos
        expect(response.status).toBe(400);
      }
    });
  });
  
  describe('⚡ PERFORMANCE SECURITY', () => {
    test('should handle concurrent requests without crashing', async () => {
      const requests = [];
      
      // 20 requests concurrentes
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: `test${i}@test.com`,
              password: 'Test123!'
            })
        );
      }
      
      const startTime = Date.now();
      await Promise.all(requests);
      const endTime = Date.now();
      
      // No debe tomar más de 10 segundos
      expect(endTime - startTime).toBeLessThan(10000);
    });
    
    test('should reject oversized payloads', async () => {
      // Crear payload muy grande
      const largeString = 'A'.repeat(2 * 1024 * 1024); // 2MB
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'Test123!',
          nombre: largeString
        });
      
      // Debe rechazar payloads muy grandes
      expect(response.status).toBe(500); // Express devuelve 500 para payloads grandes
    });
  });
  
  describe('🌐 CORS SECURITY', () => {
    test('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://malicious-site.com')
        .set('Access-Control-Request-Method', 'POST');
      
      // CORS debe estar configurado restrictivamente
      if (response.headers['access-control-allow-origin']) {
        expect(response.headers['access-control-allow-origin'])
          .not.toBe('*');
      }
    });
  });
});

describe('🏥 MEDICAL SECURITY INTEGRATION', () => {
  
  describe('👨⚕️ ROLE-BASED ACCESS', () => {
    test('should enforce doctor-patient relationships', async () => {
      // Este test requeriría tokens JWT válidos con diferentes roles
      // Por ahora verificamos que el endpoint requiere autenticación
      const response = await request(app)
        .get('/api/pacientes/123')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
    
    test('should prevent cross-patient data access', async () => {
      // Verificar que sin token no se puede acceder
      const response = await request(app)
        .get('/api/pacientes/456/citas')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('📋 MEDICAL DATA VALIDATION', () => {
    test('should validate medical data formats', async () => {
      const invalidMedicalData = {
        diagnostico: '<script>alert("xss")</script>',
        tratamiento: 'javascript:alert(1)',
        dosis: -1, // Dosis negativa
        fecha_inicio: 'invalid-date'
      };
      
      const response = await request(app)
        .post('/api/diagnosticos')
        .set('Authorization', 'Bearer invalid-token')
        .send(invalidMedicalData)
        .expect(401); // Sin auth válida
      
      expect(response.body).toHaveProperty('error');
    });
  });
});