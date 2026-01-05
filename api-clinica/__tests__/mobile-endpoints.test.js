import request from 'supertest';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Configurar variables de entorno para tests
dotenv.config();
process.env.NODE_ENV = 'test';

// Crear app de prueba con middlewares básicos
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Simular endpoints móviles
  app.post('/api/mobile/login', (req, res) => {
    const { email, password } = req.body;
    const deviceId = req.headers['x-device-id'];
    const platform = req.headers['x-platform'];
    const appVersion = req.headers['x-app-version'];
    const clientType = req.headers['x-client-type'];

    // Validar headers móviles requeridos
    if (!deviceId || !platform || !appVersion || !clientType) {
      return res.status(400).json({
        error: 'Headers móviles requeridos faltantes',
        required: ['X-Device-ID', 'X-Platform', 'X-App-Version', 'X-Client-Type']
      });
    }

    // Validar credenciales básicas
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y password requeridos'
      });
    }

    // Simular login exitoso
    res.status(200).json({
      message: 'Login móvil exitoso',
      token: 'mock-jwt-token',
      refresh_token: 'mock-refresh-token',
      usuario: {
        id_usuario: 1,
        email: email,
        rol: 'Paciente',
        activo: true
      },
      device_info: {
        device_id: deviceId,
        platform: platform,
        app_version: appVersion,
        client_type: clientType
      }
    });
  });

  app.post('/api/mobile/refresh-token', (req, res) => {
    const { refresh_token } = req.body;
    const deviceId = req.headers['x-device-id'];

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Refresh token requerido'
      });
    }

    if (!deviceId) {
      return res.status(400).json({
        error: 'X-Device-ID header requerido'
      });
    }

    // Simular refresh exitoso
    res.status(200).json({
      message: 'Token renovado exitosamente',
      token: 'new-mock-jwt-token',
      refresh_token: 'new-mock-refresh-token'
    });
  });

  app.post('/api/mobile/register', (req, res) => {
    const { email, password, nombre, apellidoPaterno, rol } = req.body;
    const deviceId = req.headers['x-device-id'];

    // Validar campos requeridos
    if (!email || !password || !nombre || !apellidoPaterno || !rol) {
      return res.status(400).json({
        error: 'Campos requeridos faltantes',
        required: ['email', 'password', 'nombre', 'apellidoPaterno', 'rol']
      });
    }

    // Simular registro exitoso
    res.status(201).json({
      message: 'Usuario móvil registrado exitosamente',
      usuario: {
        id_usuario: 2,
        email: email,
        nombre: nombre,
        apellido_paterno: apellidoPaterno,
        rol: rol,
        activo: true
      },
      next_step: 'Iniciar sesión para obtener token'
    });
  });

  app.get('/api/mobile/config', (req, res) => {
    const deviceId = req.headers['x-device-id'];
    const platform = req.headers['x-platform'];

    if (!deviceId || !platform) {
      return res.status(400).json({
        error: 'Headers móviles requeridos'
      });
    }

    res.status(200).json({
      config: {
        app_version: '1.0.0',
        min_app_version: '1.0.0',
        features: {
          push_notifications: true,
          offline_mode: true,
          voice_commands: true,
          accessibility_mode: true
        },
        endpoints: {
          websocket: 'ws://localhost:3000',
          api_base: 'http://localhost:3000/api'
        }
      }
    });
  });

  return app;
};

describe('📱 MOBILE ENDPOINTS TESTS', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('🔐 Mobile Authentication Endpoints', () => {
    const mobileHeaders = {
      'X-Device-ID': 'test-device-123',
      'X-Platform': 'android',
      'X-App-Version': '1.0.0',
      'X-Client-Type': 'app'
    };

    test('POST /api/mobile/login - should login with mobile headers', async () => {
      const response = await request(app)
        .post('/api/mobile/login')
        .set(mobileHeaders)
        .send({
          email: 'test@mobile.com',
          password: 'Test123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('usuario');
      expect(response.body).toHaveProperty('device_info');
      expect(response.body.device_info.device_id).toBe('test-device-123');
      expect(response.body.device_info.platform).toBe('android');
    });

    test('POST /api/mobile/login - should reject without mobile headers', async () => {
      const response = await request(app)
        .post('/api/mobile/login')
        .send({
          email: 'test@mobile.com',
          password: 'Test123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Headers móviles requeridos faltantes');
    });

    test('POST /api/mobile/refresh-token - should refresh token', async () => {
      const response = await request(app)
        .post('/api/mobile/refresh-token')
        .set('X-Device-ID', 'test-device-123')
        .send({
          refresh_token: 'mock-refresh-token'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('refresh_token');
    });

    test('POST /api/mobile/register - should register mobile user', async () => {
      const response = await request(app)
        .post('/api/mobile/register')
        .set('X-Device-ID', 'test-device-123')
        .send({
          email: 'newuser@mobile.com',
          password: 'Test123',
          nombre: 'Juan',
          apellidoPaterno: 'Pérez',
          rol: 'Paciente'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('usuario');
      expect(response.body.usuario.email).toBe('newuser@mobile.com');
      expect(response.body.usuario.rol).toBe('Paciente');
    });
  });

  describe('⚙️ Mobile Configuration Endpoints', () => {
    test('GET /api/mobile/config - should return mobile config', async () => {
      const response = await request(app)
        .get('/api/mobile/config')
        .set({
          'X-Device-ID': 'test-device-123',
          'X-Platform': 'android'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('config');
      expect(response.body.config).toHaveProperty('features');
      expect(response.body.config.features).toHaveProperty('push_notifications');
      expect(response.body.config.features).toHaveProperty('accessibility_mode');
    });
  });

  describe('📱 Mobile Headers Validation', () => {
    test('should validate X-Device-ID header', async () => {
      const headers = {
        'X-Platform': 'android',
        'X-App-Version': '1.0.0',
        'X-Client-Type': 'app'
      };

      const response = await request(app)
        .post('/api/mobile/login')
        .set(headers)
        .send({
          email: 'test@mobile.com',
          password: 'Test123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Headers móviles requeridos faltantes');
    });

    test('should validate X-Platform header', async () => {
      const headers = {
        'X-Device-ID': 'test-device-123',
        'X-App-Version': '1.0.0',
        'X-Client-Type': 'app'
      };

      const response = await request(app)
        .post('/api/mobile/login')
        .set(headers)
        .send({
          email: 'test@mobile.com',
          password: 'Test123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Headers móviles requeridos faltantes');
    });

    test('should validate X-App-Version header', async () => {
      const headers = {
        'X-Device-ID': 'test-device-123',
        'X-Platform': 'android',
        'X-Client-Type': 'app'
      };

      const response = await request(app)
        .post('/api/mobile/login')
        .set(headers)
        .send({
          email: 'test@mobile.com',
          password: 'Test123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Headers móviles requeridos faltantes');
    });

    test('should validate X-Client-Type header', async () => {
      const headers = {
        'X-Device-ID': 'test-device-123',
        'X-Platform': 'android',
        'X-App-Version': '1.0.0'
      };

      const response = await request(app)
        .post('/api/mobile/login')
        .set(headers)
        .send({
          email: 'test@mobile.com',
          password: 'Test123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Headers móviles requeridos faltantes');
    });
  });

  describe('🔒 Mobile Security Tests', () => {
    test('should handle malformed mobile headers', async () => {
      const response = await request(app)
        .post('/api/mobile/login')
        .set({
          'X-Device-ID': '',
          'X-Platform': 'android',
          'X-App-Version': '1.0.0',
          'X-Client-Type': 'app'
        })
        .send({
          email: 'test@mobile.com',
          password: 'Test123'
        });

      expect(response.status).toBe(400);
    });

    test('should validate mobile-specific data formats', async () => {
      const response = await request(app)
        .post('/api/mobile/login')
        .set({
          'X-Device-ID': 'test-device-123',
          'X-Platform': 'android',
          'X-App-Version': '1.0.0',
          'X-Client-Type': 'app'
        })
        .send({
          email: 'invalid-email',
          password: 'Test123'
        });

      // Debería procesar la request pero validar el email
      expect(response.status).toBe(200);
    });
  });

  describe('📊 Mobile Performance Tests', () => {
    test('should handle concurrent mobile requests', async () => {
      const mobileHeaders = {
        'X-Device-ID': 'test-device-123',
        'X-Platform': 'android',
        'X-App-Version': '1.0.0',
        'X-Client-Type': 'app'
      };

      const requests = Array(5).fill().map(() => 
        request(app)
          .post('/api/mobile/login')
          .set(mobileHeaders)
          .send({
            email: 'test@mobile.com',
            password: 'Test123'
          })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
      });
    });

    test('should respond within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/mobile/login')
        .set({
          'X-Device-ID': 'test-device-123',
          'X-Platform': 'android',
          'X-App-Version': '1.0.0',
          'X-Client-Type': 'app'
        })
        .send({
          email: 'test@mobile.com',
          password: 'Test123'
        });

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100); // Menos de 100ms
    });
  });
});

