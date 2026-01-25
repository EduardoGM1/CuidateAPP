import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock de la base de datos
// Mock de modelos
const mockUsuario = {
  findOne: jest.fn(),
  create: jest.fn()
};

// Mock debe ir antes del import
jest.mock('../models/associations.js', () => ({
  Usuario: mockUsuario
}));

import { Usuario } from '../models/associations.js';

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      Usuario.findOne.mockResolvedValue(null);
      Usuario.create.mockResolvedValue({
        id_usuario: 1,
        email: 'test@test.com',
        rol: 'Paciente'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'Test123',
          rol: 'Paciente'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.usuario.email).toBe('test@test.com');
    });

    it('should return error for existing email', async () => {
      Usuario.findOne.mockResolvedValue({ email: 'test@test.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'Test123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('El email ya está registrado');
    });

    it('should return validation error for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Test123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id_usuario: 1,
        email: 'test@test.com',
        password_hash: '$2a$10$hashedpassword',
        rol: 'Paciente',
        activo: true,
        update: jest.fn()
      };

      Usuario.findOne.mockResolvedValue(mockUser);
      
      // Mock bcrypt
      jest.doMock('bcryptjs', () => ({
        compare: jest.fn().mockResolvedValue(true)
      }));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'Test123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should return error for invalid credentials', async () => {
      Usuario.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciales inválidas');
    });
  });
});