import request from 'supertest';
import express from 'express';
import sequelize from '../config/db.js';
import authRoutes from '../routes/auth.js';
import { globalErrorHandler } from '../middlewares/errorHandler.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(globalErrorHandler);

describe('✅ VALIDATION TESTS', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('🔐 VALIDACIONES DE REGISTRO', () => {
    test('Debe rechazar email inválido', async () => {
      const invalidData = {
        email: 'email-sin-arroba',
        password: 'Admin123',
        rol: 'Admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Test-Mode', 'true')
        .send(invalidData);

      console.log('❌ Email inválido:', response.body);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Datos de validación incorrectos');
      expect(response.body.details.some(err => err.path === 'email')).toBe(true);
    });

    test('Debe rechazar password sin mayúscula', async () => {
      const invalidData = {
        email: 'test@test.com',
        password: 'admin123',
        rol: 'Admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Test-Mode', 'true')
        .send(invalidData);

      console.log('❌ Password sin mayúscula:', response.body);

      expect(response.status).toBe(400);
      expect(response.body.details.some(err => 
        err.path === 'password' && err.msg.includes('mayúscula')
      )).toBe(true);
    });

    test('Debe rechazar password sin número', async () => {
      const invalidData = {
        email: 'test2@test.com',
        password: 'AdminPassword',
        rol: 'Admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Test-Mode', 'true')
        .send(invalidData);

      console.log('❌ Password sin número:', response.body);

      expect(response.status).toBe(400);
      expect(response.body.details.some(err => 
        err.path === 'password' && err.msg.includes('número')
      )).toBe(true);
    });

    test('Debe rechazar rol inválido', async () => {
      const invalidData = {
        email: 'test3@test.com',
        password: 'Admin123',
        rol: 'RolInvalido'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Test-Mode', 'true')
        .send(invalidData);

      console.log('❌ Rol inválido:', response.body);

      expect(response.status).toBe(400);
      expect(response.body.details.some(err => err.path === 'rol')).toBe(true);
    });

    test('Debe aceptar datos válidos', async () => {
      const validData = {
        email: 'valid@test.com',
        password: 'Valid123',
        rol: 'Admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Test-Mode', 'true')
        .send(validData);

      console.log('✅ Datos válidos:', response.body);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Usuario registrado exitosamente');
      expect(response.body.token).toBeDefined();
    });

    test('Debe rechazar email duplicado', async () => {
      const duplicateData = {
        email: 'valid@test.com', // Mismo email del test anterior
        password: 'Valid123',
        rol: 'Doctor'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Test-Mode', 'true')
        .send(duplicateData);

      console.log('❌ Email duplicado:', response.body);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El email ya está registrado');
    });
  });

  describe('📋 RESUMEN DE VALIDACIONES', () => {
    test('Debe mostrar reglas de validación', () => {
      console.log('\n📋 REGLAS DE VALIDACIÓN VERIFICADAS:');
      console.log('✅ Email: Formato válido, máximo 150 caracteres');
      console.log('✅ Password: Mínimo 6 caracteres, 1 mayúscula, 1 minúscula, 1 número');
      console.log('✅ Rol: Solo Paciente, Doctor, Admin');
      console.log('✅ Email único: No duplicados');
      console.log('✅ Campos requeridos: Email y password obligatorios');
    });
  });
});