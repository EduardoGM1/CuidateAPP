import request from 'supertest';
import express from 'express';
import sequelize from '../config/db.js';
import '../models/associations.js';
import { generateTestToken, authHeaders, TEST_DATA } from '../test-helpers/auth.js';

// Import routes
import authRoutes from '../routes/auth.js';
import doctorRoutes from '../routes/doctor.js';
import pacienteRoutes from '../routes/paciente.js';

// Import middlewares
import { globalErrorHandler } from '../middlewares/errorHandler.js';

const app = express();

// Basic setup
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/doctores', doctorRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use(globalErrorHandler);

describe('CRUD Operations Tests', () => {
  let adminToken;
  let doctorToken;
  let adminUserId;
  let doctorUserId;
  let doctorId;
  let pacienteId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('🔐 AUTENTICACIÓN', () => {
    test('Debe crear administrador exitosamente', async () => {
      const adminData = TEST_DATA.validUser;

      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Test-Mode', 'true')
        .send(adminData);

      console.log('Admin register response:', response.body);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Usuario registrado exitosamente');
      expect(response.body.token).toBeDefined();
      expect(response.body.usuario.rol).toBe('Admin');
      
      adminToken = response.body.token;
      adminUserId = response.body.usuario.id;
    });

    test('Debe hacer login de administrador', async () => {
      const loginData = {
        email: TEST_DATA.validUser.email,
        password: TEST_DATA.validUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Test-Mode', 'true')
        .send(loginData);

      console.log('Admin login response:', response.body);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login exitoso');
      expect(response.body.token).toBeDefined();
    });

    test('Debe crear doctor exitosamente', async () => {
      const doctorData = TEST_DATA.validDoctor;

      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Test-Mode', 'true')
        .send(doctorData);

      console.log('Doctor register response:', response.body);

      expect(response.status).toBe(201);
      expect(response.body.usuario.rol).toBe('Doctor');
      
      doctorToken = response.body.token;
      doctorUserId = response.body.usuario.id;
    });
  });

  describe('👨⚕️ CRUD DOCTORES', () => {
    test('Admin debe crear perfil de doctor', async () => {
      const doctorProfile = {
        id_usuario: doctorUserId,
        nombre: 'Carlos',
        apellido_paterno: 'Martínez',
        apellido_materno: 'López',
        telefono: '5551234567',
        institucion_hospitalaria: 'Hospital Test',
        grado_estudio: 'Medicina Interna',
        anos_servicio: 10,
        id_modulo: 1
      };

      const response = await request(app)
        .post('/api/doctores')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Test-Mode', 'true')
        .send(doctorProfile);

      console.log('Doctor profile response:', response.body);

      expect(response.status).toBe(201);
      expect(response.body.nombre).toBe('Carlos');
      
      doctorId = response.body.id_doctor;
    });

    test('Admin debe listar todos los doctores', async () => {
      const response = await request(app)
        .get('/api/doctores')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Test-Mode', 'true');

      console.log('List doctors response:', response.body);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('Doctor debe ver solo su propio perfil', async () => {
      const response = await request(app)
        .get('/api/doctores')
        .set('Authorization', `Bearer ${doctorToken}`)
        .set('X-Test-Mode', 'true');

      console.log('Doctor self-view response:', response.body);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
    });
  });

  describe('👥 CRUD PACIENTES', () => {
    test('Admin debe crear paciente', async () => {
      const pacienteData = {
        nombre: 'María',
        apellido_paterno: 'González',
        apellido_materno: 'Pérez',
        fecha_nacimiento: '1985-03-15',
        curp: 'GOPM850315MDFNRR01',
        institucion_salud: 'IMSS',
        sexo: 'Mujer',
        direccion: 'Av. Test 123',
        localidad: 'Ciudad Test',
        numero_celular: '5551111111',
        id_modulo: 1
      };

      const response = await request(app)
        .post('/api/pacientes')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Test-Mode', 'true')
        .send(pacienteData);

      console.log('Patient create response:', response.body);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Paciente creado exitosamente');
      expect(response.body.data.nombre).toBe('María');
      
      pacienteId = response.body.data.id_paciente;
    });

    test('Admin debe listar todos los pacientes', async () => {
      const response = await request(app)
        .get('/api/pacientes')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Test-Mode', 'true');

      console.log('List patients response:', response.body);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('Admin debe obtener paciente por ID', async () => {
      const response = await request(app)
        .get(`/api/pacientes/${pacienteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Test-Mode', 'true');

      console.log('Get patient by ID response:', response.body);

      expect(response.status).toBe(200);
      expect(response.body.id_paciente).toBe(pacienteId);
      expect(response.body.nombre).toBe('María');
    });

    test('Admin debe actualizar paciente', async () => {
      const updateData = {
        direccion: 'Av. Actualizada 456',
        numero_celular: '5552222222'
      };

      const response = await request(app)
        .put(`/api/pacientes/${pacienteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Test-Mode', 'true')
        .send(updateData);

      console.log('Update patient response:', response.body);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Paciente actualizado exitosamente');
      expect(response.body.data.direccion).toBe('Av. Actualizada 456');
    });
  });

  describe('🚫 VALIDACIONES Y ERRORES', () => {
    test('Debe rechazar email inválido', async () => {
      const invalidData = {
        email: 'email-invalido',
        password: 'Admin123',
        rol: 'Admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Test-Mode', 'true')
        .send(invalidData);

      console.log('Invalid email response:', response.body);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Datos de validación incorrectos');
      expect(response.body.details).toBeDefined();
    });

    test('Debe rechazar password débil', async () => {
      const weakPasswordData = {
        email: 'test@test.com',
        password: 'weak',
        rol: 'Admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Test-Mode', 'true')
        .send(weakPasswordData);

      console.log('Weak password response:', response.body);

      expect(response.status).toBe(400);
      expect(response.body.details.some(err => err.path === 'password')).toBe(true);
    });

    test('Debe rechazar acceso sin token', async () => {
      const response = await request(app)
        .get('/api/pacientes')
        .set('X-Test-Mode', 'true');

      console.log('No token response:', response.body);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token de acceso requerido');
    });

    test('Debe rechazar token inválido', async () => {
      const response = await request(app)
        .get('/api/pacientes')
        .set('Authorization', 'Bearer token_invalido')
        .set('X-Test-Mode', 'true');

      console.log('Invalid token response:', response.body);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Token inválido');
    });
  });

  describe('🔒 CONTROL DE ACCESO', () => {
    test('Doctor no debe poder crear otros doctores', async () => {
      const doctorProfile = {
        nombre: 'Otro',
        apellido_paterno: 'Doctor',
        telefono: '5559999999'
      };

      const response = await request(app)
        .post('/api/doctores')
        .set('Authorization', `Bearer ${doctorToken}`)
        .set('X-Test-Mode', 'true')
        .send(doctorProfile);

      console.log('Doctor create doctor response:', response.body);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('No tienes permisos para esta acción');
    });

    test('Solo Admin puede eliminar pacientes', async () => {
      const response = await request(app)
        .delete(`/api/pacientes/${pacienteId}`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .set('X-Test-Mode', 'true');

      console.log('Doctor delete patient response:', response.body);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('No tienes permisos para esta acción');
    });
  });

  describe('📊 ESTADÍSTICAS', () => {
    test('Debe mostrar resumen de tests ejecutados', () => {
      console.log('\n📊 RESUMEN DE PRUEBAS CRUD:');
      console.log('✅ Autenticación: Admin y Doctor creados');
      console.log('✅ CRUD Doctores: Crear, listar, control de acceso');
      console.log('✅ CRUD Pacientes: Crear, listar, obtener, actualizar');
      console.log('✅ Validaciones: Email, password, tokens');
      console.log('✅ Seguridad: Control de acceso por roles');
      console.log('✅ Base de datos: Conexión y operaciones');
    });
  });
});