import { createServer } from 'http';
import { Server } from 'socket.io';
import io from 'socket.io-client';
import jwt from 'jsonwebtoken';

describe('🔌 WEBSOCKET TESTS', () => {
  let httpServer;
  let ioServer;
  let clientSocket;
  let serverSocket;

  beforeAll((done) => {
    // Crear servidor HTTP para pruebas
    httpServer = createServer();
    ioServer = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Configurar middleware de autenticación
    ioServer.use((socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Token requerido'));
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.rol;
        next();
      } catch (error) {
        next(new Error('Token inválido'));
      }
    });

    // Configurar eventos del servidor
    ioServer.on('connection', (socket) => {
      serverSocket = socket;

      // Eventos del servidor
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      socket.on('app_background', () => {
        socket.emit('sync_status', { 
          last_sync: Date.now(), 
          pending_changes: 0 
        });
      });

      socket.on('request_upcoming_appointments', () => {
        socket.emit('appointment_reminder', {
          appointment_id: 1,
          doctor_name: 'Dr. Test',
          time: new Date().toISOString()
        });
      });

      socket.on('request_medication_reminders', () => {
        socket.emit('medication_reminder', {
          medication_id: 1,
          name: 'Medicamento Test',
          dosage: '1 tableta'
        });
      });
    });

    httpServer.listen(3001, () => {
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket) {
      clientSocket.close();
    }
    ioServer.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    // Generar token JWT válido para pruebas
    const token = jwt.sign(
      { id: 1, email: 'test@test.com', rol: 'Admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    clientSocket = io('http://localhost:3001', {
      auth: {
        token: token,
        device_id: 'test-device-123'
      }
    });

    clientSocket.on('connect', () => {
      done();
    });

    clientSocket.on('connect_error', (error) => {
      done(error);
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.close();
    }
  });

  describe('🔐 WebSocket Authentication', () => {
    test('should authenticate with valid JWT token', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    test('should reject connection without token', (done) => {
      const invalidSocket = io('http://localhost:3001', {
        auth: {},
        timeout: 5000
      });

      invalidSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Token requerido');
        invalidSocket.close();
        done();
      });

      invalidSocket.on('connect', () => {
        invalidSocket.close();
        done(new Error('Should not have connected'));
      });

      // Timeout fallback
      setTimeout(() => {
        invalidSocket.close();
        done(new Error('Test timeout'));
      }, 10000);
    });

    test('should reject connection with invalid token', (done) => {
      const invalidSocket = io('http://localhost:3001', {
        auth: {
          token: 'invalid-token',
          device_id: 'test-device'
        },
        timeout: 5000
      });

      invalidSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Token inválido');
        invalidSocket.close();
        done();
      });

      invalidSocket.on('connect', () => {
        invalidSocket.close();
        done(new Error('Should not have connected'));
      });

      // Timeout fallback
      setTimeout(() => {
        invalidSocket.close();
        done(new Error('Test timeout'));
      }, 10000);
    });
  });

  describe('📡 WebSocket Communication', () => {
    test('should handle ping-pong heartbeat', (done) => {
      clientSocket.emit('ping');
      
      clientSocket.on('pong', (data) => {
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.timestamp).toBe('number');
        done();
      });
    });

    test('should handle app background event', (done) => {
      clientSocket.emit('app_background');
      
      clientSocket.on('sync_status', (data) => {
        expect(data).toHaveProperty('last_sync');
        expect(data).toHaveProperty('pending_changes');
        expect(typeof data.last_sync).toBe('number');
        expect(typeof data.pending_changes).toBe('number');
        done();
      });
    });

    test('should handle appointment requests', (done) => {
      clientSocket.emit('request_upcoming_appointments');
      
      clientSocket.on('appointment_reminder', (data) => {
        expect(data).toHaveProperty('appointment_id');
        expect(data).toHaveProperty('doctor_name');
        expect(data).toHaveProperty('time');
        expect(data.doctor_name).toBe('Dr. Test');
        done();
      });
    });

    test('should handle medication requests', (done) => {
      clientSocket.emit('request_medication_reminders');
      
      clientSocket.on('medication_reminder', (data) => {
        expect(data).toHaveProperty('medication_id');
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('dosage');
        expect(data.name).toBe('Medicamento Test');
        done();
      });
    });
  });

  describe('🚨 WebSocket Security', () => {
    test('should handle multiple concurrent connections', (done) => {
      const connections = [];
      const maxConnections = 5;
      let connectedCount = 0;

      for (let i = 0; i < maxConnections; i++) {
        const token = jwt.sign(
          { id: i + 1, email: `test${i}@test.com`, rol: 'Admin' },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        const socket = io('http://localhost:3001', {
          auth: {
            token: token,
            device_id: `test-device-${i}`
          }
        });

        socket.on('connect', () => {
          connectedCount++;
          if (connectedCount === maxConnections) {
            // Cerrar todas las conexiones
            connections.forEach(s => s.close());
            expect(connectedCount).toBe(maxConnections);
            done();
          }
        });

        connections.push(socket);
      }
    });

    test('should handle malformed messages gracefully', (done) => {
      // Enviar mensaje malformado
      clientSocket.emit('malformed_event', { invalid: 'data' });
      
      // El servidor no debería crashear
      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        done();
      }, 100);
    });

    test('should handle rapid message bursts', (done) => {
      let messageCount = 0;
      const maxMessages = 10;

      clientSocket.on('pong', () => {
        messageCount++;
        if (messageCount === maxMessages) {
          expect(messageCount).toBe(maxMessages);
          done();
        }
      });

      // Enviar múltiples pings rápidamente
      for (let i = 0; i < maxMessages; i++) {
        clientSocket.emit('ping');
      }
    });
  });

  describe('📱 Mobile-Specific Features', () => {
    test('should support mobile device identification', (done) => {
      const mobileSocket = io('http://localhost:3001', {
        auth: {
          token: jwt.sign(
            { id: 1, email: 'mobile@test.com', rol: 'Paciente' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
          ),
          device_id: 'mobile-device-123',
          platform: 'android',
          app_version: '1.0.0'
        }
      });

      mobileSocket.on('connect', () => {
        expect(mobileSocket.connected).toBe(true);
        mobileSocket.close();
        done();
      });
    });

    test('should handle offline/online state changes', (done) => {
      clientSocket.emit('app_background');
      
      clientSocket.on('sync_status', (data) => {
        expect(data).toHaveProperty('last_sync');
        
        // Simular vuelta a online
        clientSocket.emit('app_foreground');
        
        setTimeout(() => {
          expect(clientSocket.connected).toBe(true);
          done();
        }, 100);
      });
    });
  });
});
