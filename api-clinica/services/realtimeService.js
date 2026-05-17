// Servicio de tiempo real con WebSockets para la aplicación móvil
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Usuario, Paciente } from '../models/associations.js';

class RealtimeService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
    this.userRooms = new Map();
  }

  // Inicializar Socket.IO con manejo de errores mejorado
  initialize(httpServer) {
    try {
      this.io = new Server(httpServer, {
        cors: {
          origin: function (origin, callback) {
            // Permitir todos los origins en desarrollo
            if (process.env.NODE_ENV === 'development') {
              return callback(null, true);
            }
            
            // En producción, validar origins específicos
            const allowedOrigins = [
              'http://localhost:3000',
              'http://localhost:3001',
              'http://localhost:5173', // Vite
              'http://localhost:5174', // cuidate-web dev
              'http://localhost:8081', // React Native Metro
              'http://10.0.2.2:3000',  // Android emulator
              'http://localhost:19006', // Expo
              ...(process.env.WEB_APP_ORIGIN ? [process.env.WEB_APP_ORIGIN] : []),
            ];
            
            if (allowedOrigins.includes(origin)) {
              return callback(null, true);
            }
            
            callback(new Error('No permitido por CORS'));
          },
          credentials: true,
          methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling'] // ✅ Soporte para móviles
      });

      this.setupMiddleware();
      this.setupEventHandlers();
      
      console.log('🚀 WebSocket server initialized for mobile app');
    } catch (error) {
      console.error('❌ Error initializing WebSocket server:', error.message);
      // No lanzar el error, solo loggearlo para que el servidor continúe
    }
  }

  // Middleware de autenticación para WebSockets (con manejo de errores mejorado)
  setupMiddleware() {
    if (!this.io) return; // Verificar que io esté inicializado
    
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
        const deviceId = socket.handshake.auth.device_id || socket.handshake.headers['x-device-id'];
        
        if (!token) {
          return next(new Error('Token de autenticación requerido'));
        }

        // Verificar que JWT_SECRET esté disponible
        if (!process.env.JWT_SECRET) {
          console.warn('JWT_SECRET not available, skipping WebSocket auth');
          return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await Usuario.findByPk(decoded.id);
        
        if (!user || !user.activo) {
          return next(new Error('Usuario inválido'));
        }

        socket.userId = decoded.id;
        socket.userRole = decoded.rol;
        socket.deviceId = deviceId;
        socket.platform = decoded.platform || 'unknown';
        
        next();
      } catch (error) {
        console.error('WebSocket auth error:', error.message);
        next(new Error('Token inválido'));
      }
    });
  }

  // Configurar manejadores de eventos
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`📱 Cliente conectado: ${socket.userId} - ${socket.platform} - ${socket.deviceId}`);
      
      // Registrar cliente
      this.connectedClients.set(socket.id, {
        userId: socket.userId,
        userRole: socket.userRole,
        deviceId: socket.deviceId,
        platform: socket.platform,
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // Unir a sala de usuario
      const userRoom = `user_${socket.userId}`;
      socket.join(userRoom);
      this.userRooms.set(socket.userId, socket.id);
      console.log(`📱 [WS] Usuario ${socket.userId} (${socket.userRole}) unido a sala ${userRoom} (socket: ${socket.id})`);

      // Eventos específicos para móviles
      this.setupMobileEvents(socket);
      this.setupPatientEvents(socket);
      this.setupDoctorEvents(socket);
      this.setupAdminEvents(socket);
      this.setupGeneralEvents(socket);

      // Manejar desconexión
      socket.on('disconnect', () => {
        console.log(`📱 Cliente desconectado: ${socket.userId}`);
        this.connectedClients.delete(socket.id);
        this.userRooms.delete(socket.userId);
      });
    });
  }

  // Eventos específicos para dispositivos móviles
  setupMobileEvents(socket) {
    // Heartbeat para mantener conexión activa
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
      
      // Actualizar última actividad
      const client = this.connectedClients.get(socket.id);
      if (client) {
        client.lastActivity = new Date();
      }
    });

    // Solicitar estado de sincronización
    socket.on('sync_status_request', () => {
      const syncStatus = {
        last_sync: new Date().toISOString(),
        pending_changes: 0, // Aquí calcularías cambios pendientes
        server_time: Date.now()
      };
      
      socket.emit('sync_status', syncStatus);
    });

    // Notificar que la app está en segundo plano
    socket.on('app_background', () => {
      console.log(`📱 App en segundo plano: ${socket.userId}`);
      socket.emit('background_acknowledged');
    });

    // Notificar que la app está en primer plano
    socket.on('app_foreground', () => {
      console.log(`📱 App en primer plano: ${socket.userId}`);
      socket.emit('foreground_acknowledged');
    });
  }

  // Eventos para pacientes
  setupPatientEvents(socket) {
    if (socket.userRole === 'Paciente') {
      // Unir a sala de notificaciones de paciente
      socket.join('patients_notifications');
      console.log(`📱 [WS] Paciente ${socket.userId} unido a sala patients_notifications (socket: ${socket.id})`);
      
      // También unir a sala por id_paciente si está disponible
      // Esto permite recibir eventos incluso si id_usuario no está configurado correctamente
      if (socket.userId) {
        // Obtener id_paciente del usuario
        Usuario.findByPk(socket.userId, {
          include: [{ model: Paciente, attributes: ['id_paciente'] }]
        }).then(usuario => {
          if (usuario?.Paciente?.id_paciente) {
            const salaPaciente = `paciente_${usuario.Paciente.id_paciente}`;
            socket.join(salaPaciente);
            console.log(`📱 [WS] Paciente ${usuario.Paciente.id_paciente} unido a sala ${salaPaciente} (socket: ${socket.id})`);
          } else {
            console.warn(`⚠️ [WS] Usuario ${socket.userId} no tiene Paciente asociado`);
          }
        }).catch(err => {
          console.error('❌ [WS] Error obteniendo id_paciente para WebSocket:', err.message, err.stack);
        });
      }

      // Solicitar citas pendientes
      socket.on('request_upcoming_appointments', async () => {
        // Aquí buscarías las citas del paciente
        const appointments = []; // Placeholder
        
        socket.emit('upcoming_appointments', appointments);
      });

      // Solicitar recordatorios de medicamentos
      socket.on('request_medication_reminders', async () => {
        const reminders = []; // Placeholder
        
        socket.emit('medication_reminders', reminders);
      });
    }
  }

  // Eventos para administradores (web y móvil)
  setupAdminEvents(socket) {
    const role = (socket.userRole || '').toString();
    if (role === 'Admin' || role === 'Administrador') {
      socket.join('admins_notifications');
      console.log(`📱 [WS] Admin ${socket.userId} unido a sala admins_notifications (socket: ${socket.id})`);
    }
  }

  // Eventos para doctores
  setupDoctorEvents(socket) {
    if (socket.userRole === 'Doctor') {
      // Unir a sala de notificaciones de doctores
      socket.join('doctors_notifications');
      console.log(`📱 [WS] Doctor ${socket.userId} unido a sala doctors_notifications (socket: ${socket.id})`);

      // Notificación de nuevo paciente en espera
      socket.on('patient_waiting', (patientData) => {
        socket.to('doctors_notifications').emit('new_patient_waiting', patientData);
      });

      // Solicitar lista de pacientes en espera
      socket.on('request_waiting_patients', async () => {
        const waitingPatients = []; // Placeholder
        
        socket.emit('waiting_patients', waitingPatients);
      });
    }
  }

  // Eventos generales
  setupGeneralEvents(socket) {
    // Solicitar información del servidor
    socket.on('server_info', () => {
      socket.emit('server_info', {
        uptime: process.uptime(),
        timestamp: Date.now(),
        version: '1.0.0',
        environment: process.env.NODE_ENV
      });
    });
  }

  // Métodos para enviar notificaciones desde el backend
  sendToUser(userId, event, data) {
    try {
      if (!this.io) {
        console.warn('WebSocket no inicializado, no se puede enviar evento:', event);
        return false;
      }
      
      // Usar la sala del usuario (más confiable que socketId)
      const userRoom = `user_${userId}`;
      const socketId = this.userRooms.get(userId);
      
      // Verificar si hay clientes conectados en esa sala
      const room = this.io.sockets.adapter.rooms.get(userRoom);
      const hasClients = room && room.size > 0;
      
      if (hasClients || socketId) {
        // Enviar a la sala del usuario (más confiable)
        this.io.to(userRoom).emit(event, data);
        console.log(`📤 [WS] Evento ${event} enviado a usuario ${userId} (sala: ${userRoom}, socket: ${socketId || 'N/A'}, clientes: ${room?.size || 0})`);
        return true;
      }
      
      console.warn(`⚠️ [WS] Usuario ${userId} no encontrado (sala: ${userRoom}, socketId: ${socketId || 'N/A'}) para evento ${event}`);
      return false;
    } catch (error) {
      console.error('❌ [WS] Error en sendToUser:', error.message, error.stack);
      return false;
    }
  }

  // Método adicional para enviar a paciente por id_paciente (fallback)
  sendToPaciente(idPaciente, event, data) {
    try {
      if (!this.io) {
        console.warn('WebSocket no inicializado, no se puede enviar evento:', event);
        return false;
      }
      
      const salaPaciente = `paciente_${idPaciente}`;
      const room = this.io.sockets.adapter.rooms.get(salaPaciente);
      const hasClients = room && room.size > 0;
      
      if (hasClients) {
        // Enviar a la sala del paciente
        this.io.to(salaPaciente).emit(event, data);
        console.log(`📤 [WS] Evento ${event} enviado a paciente ${idPaciente} (sala: ${salaPaciente}, clientes: ${room.size})`);
        return true;
      } else {
        console.warn(`⚠️ [WS] No hay clientes en sala ${salaPaciente} para evento ${event}`);
        return false;
      }
    } catch (error) {
      console.error('❌ [WS] Error en sendToPaciente:', error.message, error.stack);
      return false;
    }
  }

  sendToRole(role, event, data) {
    try {
      if (!this.io) {
        console.warn('WebSocket no inicializado, no se puede enviar evento:', event);
        return;
      }
      
      // Normalizar el nombre del rol para la sala
      const roleName = role.toLowerCase();
      let salaRole;
      
      if (roleName === 'admin' || roleName === 'administrador') {
        salaRole = 'admins_notifications';
      } else if (roleName === 'doctor' || roleName === 'doctores') {
        salaRole = 'doctors_notifications';
      } else if (roleName === 'paciente' || roleName === 'pacientes') {
        salaRole = 'patients_notifications';
      } else {
        salaRole = `${roleName}s_notifications`;
      }
      
      const room = this.io.sockets.adapter.rooms.get(salaRole);
      const hasClients = room && room.size > 0;
      
      if (hasClients) {
        this.io.to(salaRole).emit(event, data);
        console.log(`📤 [WS] Evento ${event} enviado a rol ${role} (sala: ${salaRole}, clientes: ${room.size})`);
      } else {
        console.warn(`⚠️ [WS] No hay clientes en sala ${salaRole} para evento ${event}`);
      }
    } catch (error) {
      console.error('❌ [WS] Error en sendToRole:', error.message, error.stack);
    }
  }

  sendToAll(event, data) {
    try {
      if (!this.io) {
        console.warn('WebSocket no inicializado, no se puede enviar evento:', event);
        return;
      }
      this.io.emit(event, data);
    } catch (error) {
      console.error('Error en sendToAll:', error.message);
    }
  }

  // Notificaciones específicas para móviles
  sendPushNotification(userId, notification) {
    const pushData = {
      ...notification,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    this.sendToUser(userId, 'push_notification', pushData);
  }

  sendAppointmentReminder(userId, appointment) {
    this.sendPushNotification(userId, {
      type: 'appointment_reminder',
      title: 'Recordatorio de Cita',
      message: `Tienes una cita en 30 minutos con ${appointment.doctor_name}`,
      data: appointment
    });
  }

  sendMedicationReminder(userId, medication) {
    this.sendPushNotification(userId, {
      type: 'medication_reminder',
      title: 'Hora de Medicamento',
      message: `Es hora de tomar ${medication.name}`,
      data: medication
    });
  }

  sendTestResult(userId, result) {
    this.sendPushNotification(userId, {
      type: 'test_result',
      title: 'Resultado de Examen',
      message: 'Tus resultados de laboratorio están listos',
      data: result
    });
  }

  // Métricas de conexiones
  getConnectionStats() {
    return {
      total_connections: this.connectedClients.size,
      by_platform: this.getConnectionsByPlatform(),
      by_role: this.getConnectionsByRole(),
      uptime: process.uptime()
    };
  }

  getConnectionsByPlatform() {
    const platforms = {};
    this.connectedClients.forEach(client => {
      platforms[client.platform] = (platforms[client.platform] || 0) + 1;
    });
    return platforms;
  }

  getConnectionsByRole() {
    const roles = {};
    this.connectedClients.forEach(client => {
      roles[client.userRole] = (roles[client.userRole] || 0) + 1;
    });
    return roles;
  }
}

// Instancia singleton
const realtimeService = new RealtimeService();

export default realtimeService;
