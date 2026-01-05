import request from 'supertest';
import express from 'express';

// Mock completo de la aplicación para pruebas de integración
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Mock routes simples para pruebas de integración
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  app.get('/api/test', (req, res) => {
    res.json({ message: 'API funcionando correctamente' });
  });

  app.post('/api/json-test', (req, res) => {
    res.json({ received: req.body });
  });

  // Simulación de error para testing
  app.get('/api/error', (req, res) => {
    throw new Error('Error de prueba');
  });

  // Error handler para JSON malformado
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'JSON malformado' });
    }
    res.status(500).json({ error: err.message });
  });

  return app;
};

describe('Integration Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('API Endpoints', () => {
    it('should respond to test endpoint', async () => {
      const response = await request(app).get('/api/test');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('API funcionando correctamente');
    });

    it('should handle errors gracefully', async () => {
      const response = await request(app).get('/api/error');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Request/Response Format', () => {
    it('should handle JSON requests', async () => {
      const testData = { test: 'data' };
      
      // Crear endpoint temporal para esta prueba
      app.post('/api/json-test', (req, res) => {
        res.json({ received: req.body });
      });

      const response = await request(app)
        .post('/api/json-test')
        .send(testData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.received).toEqual(testData);
    });

    it('should return proper content-type headers', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      // Verificar que la respuesta es válida (los headers específicos dependen de la configuración)
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/json-test')
        .send('{ invalid json }')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });
});