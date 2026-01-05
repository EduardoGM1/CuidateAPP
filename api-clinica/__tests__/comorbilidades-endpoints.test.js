/**
 * Tests para verificar GET, POST, PUT de comorbilidades
 * Verifica que los datos, formato y tipos de datos del frontend sean correctos
 */

import request from 'supertest';
import { app } from '../index.js';
import { Paciente, Comorbilidad, PacienteComorbilidad, Doctor, Usuario } from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import sequelize from '../config/db.js';

describe('🔍 Tests de Endpoints de Comorbilidades (GET, POST, PUT)', () => {
  let adminToken;
  let doctorToken;
  let pacienteId;
  let comorbilidadId;
  let pacienteComorbilidadId;

  beforeAll(async () => {
    // Crear o obtener admin
    let admin = await Usuario.findOne({ where: { email: 'admin@clinica.com' } });
    if (!admin) {
      admin = await Usuario.create({
        email: 'admin@clinica.com',
        password_hash: '',
        rol: 'Admin',
        activo: true
      });
    }
    
    // Crear credencial para admin
    const adminCreds = await UnifiedAuthService.getUserCredentials('Admin', admin.id_usuario);
    if (adminCreds.length === 0) {
      await UnifiedAuthService.setupCredential('Admin', admin.id_usuario, 'password', 'Admin123!', { isPrimary: true });
    }

    // Login como admin
    const adminLogin = await request(app)
      .post('/api/auth-unified/login')
      .send({
        userType: 'Admin',
        email: 'admin@clinica.com',
        password: 'Admin123!'
      });
    
    adminToken = adminLogin.body.token;

    // Crear o obtener doctor
    let doctor = await Doctor.findOne({ 
      include: [{ model: Usuario, where: { email: 'doctor@clinica.com' } }]
    });
    
    if (!doctor) {
      const doctorUser = await Usuario.create({
        email: 'doctor@clinica.com',
        password_hash: '',
        rol: 'Doctor',
        activo: true
      });
      doctor = await Doctor.create({
        id_usuario: doctorUser.id_usuario,
        nombre: 'Test',
        apellido_paterno: 'Doctor',
        activo: true
      });
    }

    const doctorUser = await Usuario.findOne({ 
      where: { email: 'doctor@clinica.com' } 
    });
    
    const doctorCreds = await UnifiedAuthService.getUserCredentials('Doctor', doctorUser.id_usuario);
    if (doctorCreds.length === 0) {
      await UnifiedAuthService.setupCredential('Doctor', doctorUser.id_usuario, 'password', 'Doctor123!', { isPrimary: true });
    }

    // Login como doctor
    const doctorLogin = await request(app)
      .post('/api/auth-unified/login')
      .send({
        userType: 'Doctor',
        email: 'doctor@clinica.com',
        password: 'Doctor123!'
      });
    
    doctorToken = doctorLogin.body.token;

    // Crear paciente de prueba
    const paciente = await Paciente.findOne({ where: { nombre: 'Test', apellido_paterno: 'Paciente' } });
    if (!paciente) {
      const nuevoPaciente = await Paciente.create({
        nombre: 'Test',
        apellido_paterno: 'Paciente',
        fecha_nacimiento: '1990-01-01',
        activo: true
      });
      pacienteId = nuevoPaciente.id_paciente;
    } else {
      pacienteId = paciente.id_paciente;
    }

    // Asignar doctor al paciente
    const DoctorPaciente = (await import('../models/DoctorPaciente.js')).default;
    await DoctorPaciente.findOrCreate({
      where: {
        id_doctor: doctor.id_doctor,
        id_paciente: pacienteId
      },
      defaults: {
        id_doctor: doctor.id_doctor,
        id_paciente: pacienteId
      }
    });

    // Crear comorbilidad de prueba
    const comorbilidad = await Comorbilidad.findOne({ where: { nombre_comorbilidad: 'Test Comorbilidad' } });
    if (!comorbilidad) {
      const nuevaComorbilidad = await Comorbilidad.create({
        nombre_comorbilidad: 'Test Comorbilidad',
        descripcion: 'Comorbilidad de prueba'
      });
      comorbilidadId = nuevaComorbilidad.id_comorbilidad;
    } else {
      comorbilidadId = comorbilidad.id_comorbilidad;
    }
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    if (pacienteComorbilidadId) {
      await PacienteComorbilidad.destroy({
        where: { id_paciente: pacienteId, id_comorbilidad: comorbilidadId }
      });
    }
    await sequelize.close();
  });

  describe('GET /api/pacientes/:id/comorbilidades', () => {
    test('✅ Debe obtener comorbilidades del paciente (formato correcto)', async () => {
      const response = await request(app)
        .get(`/api/pacientes/${pacienteId}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Verificar estructura de cada comorbilidad
      if (response.body.data.length > 0) {
        const comorbilidad = response.body.data[0];
        expect(comorbilidad).toHaveProperty('id_comorbilidad');
        expect(comorbilidad).toHaveProperty('nombre_comorbilidad');
        expect(comorbilidad).toHaveProperty('nombre'); // Alias para compatibilidad
        expect(comorbilidad).toHaveProperty('descripcion');
        expect(comorbilidad).toHaveProperty('fecha_deteccion');
        expect(comorbilidad).toHaveProperty('observaciones');
        expect(comorbilidad).toHaveProperty('anos_padecimiento');
        
        // Verificar tipos de datos
        expect(typeof comorbilidad.id_comorbilidad).toBe('number');
        expect(typeof comorbilidad.nombre_comorbilidad).toBe('string');
        expect(typeof comorbilidad.nombre).toBe('string');
        if (comorbilidad.anos_padecimiento !== null) {
          expect(typeof comorbilidad.anos_padecimiento).toBe('number');
        }
      }
    });

    test('✅ Debe retornar array vacío si no hay comorbilidades', async () => {
      // Crear paciente sin comorbilidades
      const pacienteSinComorb = await Paciente.create({
        nombre: 'Sin',
        apellido_paterno: 'Comorbilidades',
        fecha_nacimiento: '1990-01-01',
        activo: true
      });

      const response = await request(app)
        .get(`/api/pacientes/${pacienteSinComorb.id_paciente}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);

      // Limpiar
      await PacienteComorbilidad.destroy({
        where: { id_paciente: pacienteSinComorb.id_paciente }
      });
      await Paciente.destroy({ where: { id_paciente: pacienteSinComorb.id_paciente } });
    });

    test('❌ Debe rechazar acceso sin token', async () => {
      const response = await request(app)
        .get(`/api/pacientes/${pacienteId}/comorbilidades`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/pacientes/:id/comorbilidades', () => {
    test('✅ Debe crear comorbilidad con datos correctos del frontend', async () => {
      // Datos como los envía el frontend
      const datosFrontend = {
        id_comorbilidad: comorbilidadId,
        fecha_deteccion: '2020-01-15',
        observaciones: 'Diagnosticada en consulta',
        anos_padecimiento: 5
      };

      const response = await request(app)
        .post(`/api/pacientes/${pacienteId}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(datosFrontend);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      const comorbilidad = response.body.data;
      expect(comorbilidad).toHaveProperty('id_paciente', pacienteId);
      expect(comorbilidad).toHaveProperty('id_comorbilidad', comorbilidadId);
      expect(comorbilidad).toHaveProperty('fecha_deteccion', '2020-01-15');
      expect(comorbilidad).toHaveProperty('observaciones', 'Diagnosticada en consulta');
      expect(comorbilidad).toHaveProperty('anos_padecimiento', 5);

      pacienteComorbilidadId = comorbilidad.id_paciente; // Guardar para limpieza
    });

    test('✅ Debe aceptar id_comorbilidad como string (conversión automática)', async () => {
      // El frontend puede enviar strings
      const datosFrontend = {
        id_comorbilidad: String(comorbilidadId), // String en lugar de número
        fecha_deteccion: '2021-03-20',
        observaciones: 'Test con string',
        anos_padecimiento: '3' // String también
      };

      const response = await request(app)
        .post(`/api/pacientes/${pacienteId}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(datosFrontend);

      // Debe rechazar porque ya existe (409) o crear si no existe
      expect([201, 409]).toContain(response.status);
    });

    test('✅ Debe aceptar anos_padecimiento como string o número', async () => {
      // Crear nueva comorbilidad para este test
      const nuevaComorb = await Comorbilidad.create({
        nombre_comorbilidad: `Test Comorb ${Date.now()}`,
        descripcion: 'Test'
      });

      const datosConString = {
        id_comorbilidad: nuevaComorb.id_comorbilidad,
        anos_padecimiento: '2' // String
      };

      const response1 = await request(app)
        .post(`/api/pacientes/${pacienteId}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(datosConString);

      expect([201, 409]).toContain(response1.status);

      // Limpiar
      await PacienteComorbilidad.destroy({
        where: { id_paciente: pacienteId, id_comorbilidad: nuevaComorb.id_comorbilidad }
      });
      await Comorbilidad.destroy({ where: { id_comorbilidad: nuevaComorb.id_comorbilidad } });
    });

    test('✅ Debe aceptar campos opcionales como null o undefined', async () => {
      const nuevaComorb = await Comorbilidad.create({
        nombre_comorbilidad: `Test Opcional ${Date.now()}`,
        descripcion: 'Test'
      });

      const datosMinimos = {
        id_comorbilidad: nuevaComorb.id_comorbilidad
        // Sin fecha_deteccion, observaciones, anos_padecimiento
      };

      const response = await request(app)
        .post(`/api/pacientes/${pacienteId}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(datosMinimos);

      expect([201, 409]).toContain(response.status);

      // Limpiar
      await PacienteComorbilidad.destroy({
        where: { id_paciente: pacienteId, id_comorbilidad: nuevaComorb.id_comorbilidad }
      });
      await Comorbilidad.destroy({ where: { id_comorbilidad: nuevaComorb.id_comorbilidad } });
    });

    test('❌ Debe rechazar sin id_comorbilidad', async () => {
      const datosInvalidos = {
        fecha_deteccion: '2020-01-15',
        observaciones: 'Sin id_comorbilidad'
      };

      const response = await request(app)
        .post(`/api/pacientes/${pacienteId}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(datosInvalidos);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    test('❌ Debe rechazar id_comorbilidad inválido', async () => {
      const datosInvalidos = {
        id_comorbilidad: 'no-es-un-numero',
        fecha_deteccion: '2020-01-15'
      };

      const response = await request(app)
        .post(`/api/pacientes/${pacienteId}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(datosInvalidos);

      expect(response.status).toBe(400);
    });

    test('❌ Debe rechazar comorbilidad duplicada (409)', async () => {
      // Primero crear una
      const nuevaComorb = await Comorbilidad.create({
        nombre_comorbilidad: `Test Duplicado ${Date.now()}`,
        descripcion: 'Test'
      });

      await PacienteComorbilidad.create({
        id_paciente: pacienteId,
        id_comorbilidad: nuevaComorb.id_comorbilidad
      });

      // Intentar crear duplicado
      const datosDuplicado = {
        id_comorbilidad: nuevaComorb.id_comorbilidad
      };

      const response = await request(app)
        .post(`/api/pacientes/${pacienteId}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(datosDuplicado);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('success', false);

      // Limpiar
      await PacienteComorbilidad.destroy({
        where: { id_paciente: pacienteId, id_comorbilidad: nuevaComorb.id_comorbilidad }
      });
      await Comorbilidad.destroy({ where: { id_comorbilidad: nuevaComorb.id_comorbilidad } });
    });
  });

  describe('PUT /api/pacientes/:id/comorbilidades/:comorbilidadId', () => {
    let relacionExistente;

    beforeEach(async () => {
      // Crear relación para actualizar
      const nuevaComorb = await Comorbilidad.create({
        nombre_comorbilidad: `Test Update ${Date.now()}`,
        descripcion: 'Test'
      });

      relacionExistente = await PacienteComorbilidad.create({
        id_paciente: pacienteId,
        id_comorbilidad: nuevaComorb.id_comorbilidad,
        fecha_deteccion: '2020-01-01',
        observaciones: 'Original',
        anos_padecimiento: 1
      });
    });

    afterEach(async () => {
      if (relacionExistente) {
        await PacienteComorbilidad.destroy({
          where: {
            id_paciente: relacionExistente.id_paciente,
            id_comorbilidad: relacionExistente.id_comorbilidad
          }
        });
        await Comorbilidad.destroy({
          where: { id_comorbilidad: relacionExistente.id_comorbilidad }
        });
      }
    });

    test('✅ Debe actualizar comorbilidad con datos correctos', async () => {
      const datosActualizacion = {
        fecha_deteccion: '2021-05-10',
        observaciones: 'Actualizada en consulta',
        anos_padecimiento: 3
      };

      const response = await request(app)
        .put(`/api/pacientes/${pacienteId}/comorbilidades/${relacionExistente.id_comorbilidad}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(datosActualizacion);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      const actualizada = response.body.data;
      expect(actualizada.fecha_deteccion).toBe('2021-05-10');
      expect(actualizada.observaciones).toBe('Actualizada en consulta');
      expect(actualizada.anos_padecimiento).toBe(3);
    });

    test('✅ Debe aceptar actualización parcial (solo algunos campos)', async () => {
      const datosParciales = {
        anos_padecimiento: 4
        // Solo actualizar anos_padecimiento
      };

      const response = await request(app)
        .put(`/api/pacientes/${pacienteId}/comorbilidades/${relacionExistente.id_comorbilidad}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(datosParciales);

      expect(response.status).toBe(200);
      expect(response.body.data.anos_padecimiento).toBe(4);
    });

    test('✅ Debe aceptar anos_padecimiento como string', async () => {
      const datosConString = {
        anos_padecimiento: '5' // String
      };

      const response = await request(app)
        .put(`/api/pacientes/${pacienteId}/comorbilidades/${relacionExistente.id_comorbilidad}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(datosConString);

      expect(response.status).toBe(200);
      expect(response.body.data.anos_padecimiento).toBe(5); // Debe convertirse a número
    });

    test('✅ Debe permitir null en campos opcionales', async () => {
      const datosConNull = {
        observaciones: null,
        anos_padecimiento: null
      };

      const response = await request(app)
        .put(`/api/pacientes/${pacienteId}/comorbilidades/${relacionExistente.id_comorbilidad}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(datosConNull);

      expect(response.status).toBe(200);
    });

    test('❌ Debe rechazar comorbilidad inexistente', async () => {
      const response = await request(app)
        .put(`/api/pacientes/${pacienteId}/comorbilidades/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ observaciones: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('Validación de tipos de datos del frontend', () => {
    test('✅ Verificar que el backend acepta todos los formatos del frontend', async () => {
      const nuevaComorb = await Comorbilidad.create({
        nombre_comorbilidad: `Test Formatos ${Date.now()}`,
        descripcion: 'Test'
      });

      // Formato 1: Todos los campos como números
      const formato1 = {
        id_comorbilidad: comorbilidadId,
        anos_padecimiento: 5
      };

      // Formato 2: Campos como strings (común en frontend)
      const formato2 = {
        id_comorbilidad: String(comorbilidadId),
        anos_padecimiento: '3'
      };

      // Formato 3: Campos opcionales omitidos
      const formato3 = {
        id_comorbilidad: nuevaComorb.id_comorbilidad
      };

      // Todos deben ser aceptados
      const response1 = await request(app)
        .post(`/api/pacientes/${pacienteId}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(formato1);
      
      expect([201, 409]).toContain(response1.status);

      const response2 = await request(app)
        .post(`/api/pacientes/${pacienteId}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(formato2);
      
      expect([201, 409]).toContain(response2.status);

      const response3 = await request(app)
        .post(`/api/pacientes/${pacienteId}/comorbilidades`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(formato3);
      
      expect([201, 409]).toContain(response3.status);

      // Limpiar
      await PacienteComorbilidad.destroy({
        where: { id_paciente: pacienteId }
      });
      await Comorbilidad.destroy({ where: { id_comorbilidad: nuevaComorb.id_comorbilidad } });
    });
  });
});

