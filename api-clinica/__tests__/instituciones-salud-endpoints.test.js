/**
 * Validación de endpoints de Instituciones de Salud.
 * Ejecutar: npm run test -- __tests__/instituciones-salud-endpoints.test.js
 * No requiere servidor externo (usa la app con supertest).
 */

import request from 'supertest';
import app from '../test-app.js';

describe('Endpoints Instituciones de Salud', () => {
  let adminToken;
  let createdId;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@clinica.com', password: 'Admin123!' });
    if (login.body?.token) adminToken = login.body.token;
  });

  const auth = () => (adminToken ? request(app).set('Authorization', `Bearer ${adminToken}`) : request(app));

  describe('GET /api/instituciones-salud', () => {
    test('debe devolver 200 y lista (sin auth)', async () => {
      const res = await request(app).get('/api/instituciones-salud');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data?.instituciones_salud)).toBe(true);
      expect(typeof res.body.data?.total).toBe('number');
      expect(res.body.data.total).toBe(res.body.data.instituciones_salud.length);
    });

    test('cada item debe tener id, nombre, activo, orden', async () => {
      const res = await request(app).get('/api/instituciones-salud');
      const list = res.body.data?.instituciones_salud ?? [];
      if (list.length > 0) {
        const first = list[0];
        expect(first).toHaveProperty('id_institucion_salud');
        expect(first).toHaveProperty('nombre');
        expect(first).toHaveProperty('activo');
        expect(first).toHaveProperty('orden');
      }
    });

    test('?activo=false debe devolver todas', async () => {
      const res = await request(app).get('/api/instituciones-salud?activo=false');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data?.instituciones_salud)).toBe(true);
    });
  });

  describe('GET /api/instituciones-salud/:id', () => {
    test('id 0 debe devolver 400', async () => {
      const res = await request(app).get('/api/instituciones-salud/0');
      expect(res.status).toBe(400);
    });

    test('id inexistente debe devolver 404', async () => {
      const res = await request(app).get('/api/instituciones-salud/999999');
      expect(res.status).toBe(404);
    });

    test('id válido debe devolver 200 y institucion_salud', async () => {
      const listRes = await request(app).get('/api/instituciones-salud');
      const list = listRes.body.data?.instituciones_salud ?? [];
      if (list.length === 0) return;
      const id = list[0].id_institucion_salud;
      const res = await request(app).get(`/api/instituciones-salud/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.data?.institucion_salud).toBeDefined();
      expect(res.body.data.institucion_salud.nombre).toBeDefined();
    });
  });

  describe('POST /api/instituciones-salud (Admin)', () => {
    test('sin token debe devolver 401', async () => {
      const res = await request(app)
        .post('/api/instituciones-salud')
        .send({ nombre: 'Test', activo: true });
      expect(res.status).toBe(401);
    });

    test('con token Admin debe crear y devolver 201', async () => {
      if (!adminToken) return;
      const nombre = `Test E2E ${Date.now()}`;
      const res = await auth()
        .post('/api/instituciones-salud')
        .send({ nombre, activo: true });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const inst = res.body.data?.institucion_salud ?? res.body.institucion_salud;
      expect(inst).toBeDefined();
      expect(inst.nombre).toBe(nombre);
      expect(inst.id_institucion_salud != null).toBe(true);
      createdId = inst.id_institucion_salud ?? inst.id;
    });
  });

  describe('PUT /api/instituciones-salud/:id', () => {
    test('debe actualizar nombre y activo', async () => {
      if (!adminToken || !createdId) return;
      const res = await auth()
        .put(`/api/instituciones-salud/${createdId}`)
        .send({ nombre: 'Test Actualizado', activo: false });
      expect(res.status).toBe(200);
      const inst = res.body.data?.institucion_salud;
      expect(inst?.nombre).toBe('Test Actualizado');
      expect(inst?.activo === false || inst?.activo === 0).toBe(true);
    });
  });

  describe('DELETE /api/instituciones-salud/:id', () => {
    test('debe eliminar y devolver 200', async () => {
      if (!adminToken || !createdId) return;
      const res = await auth().delete(`/api/instituciones-salud/${createdId}`);
      expect(res.status).toBe(200);
    });

    test('GET tras DELETE debe devolver 404', async () => {
      if (!createdId) return;
      const res = await request(app).get(`/api/instituciones-salud/${createdId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Validación paciente con institución inválida', () => {
    test('POST paciente con institucion_salud inexistente debe devolver 400', async () => {
      if (!adminToken) return;
      const res = await auth()
        .post('/api/pacientes')
        .send({
          nombre: 'Val',
          apellido_paterno: 'Test',
          fecha_nacimiento: '1990-01-01',
          estado: 'Ciudad de México',
          institucion_salud: 'InstitucionInexistenteXYZ123'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
