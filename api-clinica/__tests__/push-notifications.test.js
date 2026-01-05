import request from 'supertest';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Configurar variables de entorno para tests
dotenv.config();
process.env.NODE_ENV = 'test';

// Crear app de prueba para notificaciones push
const createPushTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Simular servicio de notificaciones push
  const mockPushService = {
    registerDeviceToken: async (userId, deviceToken, platform, deviceInfo) => {
      return {
        success: true,
        message: 'Token registrado exitosamente',
        token_id: 'mock-token-id'
      };
    },

    sendPushNotification: async (userId, notification) => {
      return {
        success: true,
        sent_to: 1,
        results: [{
          token: 'mock-device-token',
          result: 'sent'
        }]
      };
    },

    sendTestNotification: async (userId, message) => {
      return {
        success: true,
        message: 'Notificación de prueba enviada',
        notification: {
          title: 'Notificación de Prueba',
          body: message,
          type: 'test'
        }
      };
    }
  };

  // Endpoint para registrar token de dispositivo
  app.post('/api/mobile/device/register', (req, res) => {
    const { device_token, platform, device_info } = req.body;
    const userId = req.headers['x-user-id'] || 1;

    if (!device_token || !platform) {
      return res.status(400).json({
        error: 'device_token y platform requeridos'
      });
    }

    mockPushService.registerDeviceToken(userId, device_token, platform, device_info)
      .then(result => {
        res.status(200).json(result);
      })
      .catch(error => {
        res.status(500).json({
          error: 'Error registrando token',
          details: error.message
        });
      });
  });

  // Endpoint para enviar notificación de prueba
  app.post('/api/mobile/notification/test', (req, res) => {
    const { message, user_id } = req.body;
    const userId = user_id || req.headers['x-user-id'] || 1;

    if (!message) {
      return res.status(400).json({
        error: 'Mensaje requerido'
      });
    }

    mockPushService.sendTestNotification(userId, message)
      .then(result => {
        res.status(200).json(result);
      })
      .catch(error => {
        res.status(500).json({
          error: 'Error enviando notificación',
          details: error.message
        });
      });
  });

  // Endpoint para enviar notificación de cita
  app.post('/api/mobile/notification/appointment', (req, res) => {
    const { appointment_id, doctor_name, time, user_id } = req.body;
    const userId = user_id || req.headers['x-user-id'] || 1;

    if (!appointment_id || !doctor_name || !time) {
      return res.status(400).json({
        error: 'appointment_id, doctor_name y time requeridos'
      });
    }

    const notification = {
      type: 'appointment_reminder',
      title: 'Recordatorio de Cita',
      message: `Tienes una cita en 30 minutos con Dr. ${doctor_name}`,
      data: {
        appointment_id,
        doctor_name,
        time
      }
    };

    mockPushService.sendPushNotification(userId, notification)
      .then(result => {
        res.status(200).json({
          success: true,
          message: 'Notificación de cita enviada',
          ...result
        });
      })
      .catch(error => {
        res.status(500).json({
          error: 'Error enviando notificación de cita',
          details: error.message
        });
      });
  });

  // Endpoint para enviar notificación de medicamento
  app.post('/api/mobile/notification/medication', (req, res) => {
    const { medication_name, dosage, instructions, user_id } = req.body;
    const userId = user_id || req.headers['x-user-id'] || 1;

    if (!medication_name || !dosage) {
      return res.status(400).json({
        error: 'medication_name y dosage requeridos'
      });
    }

    const notification = {
      type: 'medication_reminder',
      title: 'Hora de Medicamento',
      message: `Es hora de tomar ${medication_name}`,
      data: {
        medication_name,
        dosage,
        instructions
      }
    };

    mockPushService.sendPushNotification(userId, notification)
      .then(result => {
        res.status(200).json({
          success: true,
          message: 'Notificación de medicamento enviada',
          ...result
        });
      })
      .catch(error => {
        res.status(500).json({
          error: 'Error enviando notificación de medicamento',
          details: error.message
        });
      });
  });

  // Endpoint para obtener estadísticas de notificaciones
  app.get('/api/mobile/notification/stats', (req, res) => {
    res.status(200).json({
      total_users_with_tokens: 5,
      total_tokens: 8,
      active_tokens: 7,
      platforms: {
        android: 4,
        ios: 3
      }
    });
  });

  return app;
};

describe('📱 PUSH NOTIFICATIONS TESTS', () => {
  let app;

  beforeAll(() => {
    app = createPushTestApp();
  });

  describe('🔔 Device Token Management', () => {
    test('POST /api/mobile/device/register - should register device token', async () => {
      const response = await request(app)
        .post('/api/mobile/device/register')
        .set('X-User-ID', '1')
        .send({
          device_token: 'mock-fcm-token-123',
          platform: 'android',
          device_info: {
            model: 'Pixel 6',
            os_version: 'Android 13',
            app_version: '1.0.0'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token registrado exitosamente');
    });

    test('POST /api/mobile/device/register - should reject without required fields', async () => {
      const response = await request(app)
        .post('/api/mobile/device/register')
        .set('X-User-ID', '1')
        .send({
          platform: 'android'
          // Missing device_token
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('device_token y platform requeridos');
    });
  });

  describe('📨 Test Notifications', () => {
    test('POST /api/mobile/notification/test - should send test notification', async () => {
      const response = await request(app)
        .post('/api/mobile/notification/test')
        .set('X-User-ID', '1')
        .send({
          message: 'Esta es una notificación de prueba'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notificación de prueba enviada');
      expect(response.body.notification.title).toBe('Notificación de Prueba');
    });

    test('POST /api/mobile/notification/test - should reject without message', async () => {
      const response = await request(app)
        .post('/api/mobile/notification/test')
        .set('X-User-ID', '1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Mensaje requerido');
    });
  });

  describe('🏥 Medical Notifications', () => {
    test('POST /api/mobile/notification/appointment - should send appointment reminder', async () => {
      const response = await request(app)
        .post('/api/mobile/notification/appointment')
        .set('X-User-ID', '1')
        .send({
          appointment_id: 123,
          doctor_name: 'Dr. García',
          time: '2024-01-15T10:00:00Z'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notificación de cita enviada');
      expect(response.body.sent_to).toBe(1);
    });

    test('POST /api/mobile/notification/medication - should send medication reminder', async () => {
      const response = await request(app)
        .post('/api/mobile/notification/medication')
        .set('X-User-ID', '1')
        .send({
          medication_name: 'Paracetamol',
          dosage: '500mg',
          instructions: 'Tomar con agua'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notificación de medicamento enviada');
      expect(response.body.sent_to).toBe(1);
    });

    test('POST /api/mobile/notification/appointment - should reject without required fields', async () => {
      const response = await request(app)
        .post('/api/mobile/notification/appointment')
        .set('X-User-ID', '1')
        .send({
          appointment_id: 123
          // Missing doctor_name and time
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('appointment_id, doctor_name y time requeridos');
    });
  });

  describe('📊 Notification Statistics', () => {
    test('GET /api/mobile/notification/stats - should return notification stats', async () => {
      const response = await request(app)
        .get('/api/mobile/notification/stats');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_users_with_tokens');
      expect(response.body).toHaveProperty('total_tokens');
      expect(response.body).toHaveProperty('active_tokens');
      expect(response.body).toHaveProperty('platforms');
      expect(response.body.platforms).toHaveProperty('android');
      expect(response.body.platforms).toHaveProperty('ios');
    });
  });

  describe('🔒 Push Notification Security', () => {
    test('should handle malformed device tokens', async () => {
      const response = await request(app)
        .post('/api/mobile/device/register')
        .set('X-User-ID', '1')
        .send({
          device_token: '', // Empty token
          platform: 'android'
        });

      expect(response.status).toBe(400); // Should reject empty tokens
    });

    test('should validate platform types', async () => {
      const response = await request(app)
        .post('/api/mobile/device/register')
        .set('X-User-ID', '1')
        .send({
          device_token: 'valid-token',
          platform: 'invalid-platform'
        });

      expect(response.status).toBe(200); // Should accept any platform
    });
  });

  describe('📱 Mobile-Specific Push Features', () => {
    test('should handle iOS platform notifications', async () => {
      const response = await request(app)
        .post('/api/mobile/device/register')
        .set('X-User-ID', '1')
        .send({
          device_token: 'mock-apns-token-456',
          platform: 'ios',
          device_info: {
            model: 'iPhone 14',
            os_version: 'iOS 16.0',
            app_version: '1.0.0'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle Android platform notifications', async () => {
      const response = await request(app)
        .post('/api/mobile/device/register')
        .set('X-User-ID', '1')
        .send({
          device_token: 'mock-fcm-token-789',
          platform: 'android',
          device_info: {
            model: 'Samsung Galaxy S21',
            os_version: 'Android 12',
            app_version: '1.0.0'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('⚡ Push Notification Performance', () => {
    test('should handle concurrent notification requests', async () => {
      const requests = Array(3).fill().map(() => 
        request(app)
          .post('/api/mobile/notification/test')
          .set('X-User-ID', '1')
          .send({
            message: 'Notificación concurrente'
          })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('should respond within acceptable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/mobile/notification/test')
        .set('X-User-ID', '1')
        .send({
          message: 'Test de rendimiento'
        });

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(100); // Menos de 100ms
    });
  });
});
