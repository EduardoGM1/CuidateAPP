/**
 * Script para probar la creación de doctores y pacientes
 * 
 * Ejecutar: node scripts/test-crear-doctor-paciente.js
 */

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
import logger from '../utils/logger.js';

const API_BASE_URL = 'http://localhost:3000';

const probarEndpoint = async ({ name, method, url, data, headers, expectedStatus }) => {
  logger.info(`Iniciando prueba: ${name}`);
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${url}`,
      data,
      headers,
      validateStatus: (status) => status >= 200 && status < 500
    });

    if (response.status === expectedStatus) {
      logger.info(`✅ ${name} - ÉXITO (Status: ${response.status})`);
      if (response.data) {
        logger.info(`   Respuesta:`, JSON.stringify(response.data, null, 2).substring(0, 500));
      }
    } else {
      logger.error(`❌ ${name} - FALLÓ (Status esperado: ${expectedStatus}, Recibido: ${response.status})`);
      logger.error('   Respuesta:', response.data);
    }
    return response;
  } catch (error) {
    logger.error(`❌ ${name} - ERROR (Mensaje: ${error.message})`);
    if (error.response) {
      logger.error('   Status:', error.response.status);
      logger.error('   Respuesta del servidor:', error.response.data);
    }
    return null;
  }
};

const runTests = async () => {
  logger.info('═══════════════════════════════════════════════════════');
  logger.info('  PRUEBAS DE CREACIÓN DE DOCTORES Y PACIENTES');
  logger.info('═══════════════════════════════════════════════════════');

  // 1. Prueba de creación de doctor exitosa (sin id_usuario para evitar conflictos)
  logger.info('\n--- Prueba: Crear doctor exitosamente (sin id_usuario) ---');
  const doctorData = {
    nombre: 'Dr. Prueba',
    apellido_paterno: 'Test',
    apellido_materno: 'Automático',
    telefono: '1234567890',
    institucion_hospitalaria: 'Hospital de Prueba',
    grado_estudio: 'Licenciatura',
    anos_servicio: 5,
    id_modulo: 1, // Asumiendo que el módulo 1 existe
    activo: true
  };
  await probarEndpoint({
    name: 'POST /api/doctores/public (Doctor sin id_usuario)',
    method: 'POST',
    url: '/api/doctores/public',
    data: doctorData,
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: 201
  });

  // 2. Prueba de creación de doctor con tipos incorrectos (strings en lugar de números)
  logger.info('\n--- Prueba: Crear doctor con tipos incorrectos (debe convertir) ---');
  const doctorDataString = {
    nombre: 'Dr. Prueba String',
    apellido_paterno: 'Test',
    id_modulo: '1', // String en lugar de número
    anos_servicio: '5', // String en lugar de número
    activo: 'true' // String en lugar de boolean
  };
  await probarEndpoint({
    name: 'POST /api/doctores/public (Tipos String)',
    method: 'POST',
    url: '/api/doctores/public',
    data: doctorDataString,
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: 201 // Debería funcionar porque ahora convertimos tipos
  });

  // 3. Prueba de creación de paciente exitosa (sin id_usuario para evitar conflictos)
  logger.info('\n--- Prueba: Crear paciente exitosamente (sin id_usuario) ---');
  const pacienteData = {
    nombre: 'Paciente',
    apellido_paterno: 'Prueba',
    apellido_materno: 'Test',
    fecha_nacimiento: '1990-01-01',
    curp: `TEST${Date.now().toString().slice(-10)}HDFRPA01`, // CURP único usando timestamp
    institucion_salud: 'IMSS',
    sexo: 'Hombre',
    direccion: 'Calle de Prueba 123',
    localidad: 'Ciudad de Prueba',
    numero_celular: `987654${Date.now().toString().slice(-4)}`, // Teléfono único
    id_modulo: 1,
    activo: true
  };
  await probarEndpoint({
    name: 'POST /api/pacientes/public (Paciente sin id_usuario)',
    method: 'POST',
    url: '/api/pacientes/public',
    data: pacienteData,
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: 201
  });

  // 4. Prueba de creación de paciente con tipos incorrectos (debe convertir)
  logger.info('\n--- Prueba: Crear paciente con tipos incorrectos (debe convertir) ---');
  const pacienteDataString = {
    nombre: 'Paciente',
    apellido_paterno: 'Prueba',
    fecha_nacimiento: '1990-01-01',
    curp: `TEST${Date.now().toString().slice(-10)}MDFRPA02`, // CURP único
    id_modulo: '1', // String en lugar de número
    activo: 'true' // String en lugar de boolean
  };
  await probarEndpoint({
    name: 'POST /api/pacientes/public (Tipos String)',
    method: 'POST',
    url: '/api/pacientes/public',
    data: pacienteDataString,
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: 201 // Debería funcionar porque ahora convertimos tipos
  });

  // 5. Prueba de creación de doctor con campos faltantes
  logger.info('\n--- Prueba: Crear doctor sin campos requeridos ---');
  const doctorDataIncompleto = {
    nombre: 'Dr. Incompleto'
    // Falta apellido_paterno
  };
  await probarEndpoint({
    name: 'POST /api/doctores/public (Campos Faltantes)',
    method: 'POST',
    url: '/api/doctores/public',
    data: doctorDataIncompleto,
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: 400
  });

  // 6. Prueba de creación de paciente con campos faltantes
  logger.info('\n--- Prueba: Crear paciente sin campos requeridos ---');
  const pacienteDataIncompleto = {
    nombre: 'Paciente Incompleto'
    // Falta apellido_paterno y fecha_nacimiento
  };
  await probarEndpoint({
    name: 'POST /api/pacientes/public (Campos Faltantes)',
    method: 'POST',
    url: '/api/pacientes/public',
    data: pacienteDataIncompleto,
    headers: { 'Content-Type': 'application/json' },
    expectedStatus: 400
  });

  logger.info('\n═══════════════════════════════════════════════════════');
  logger.info('  FIN DE PRUEBAS DE CREACIÓN DE DOCTORES Y PACIENTES');
  logger.info('═══════════════════════════════════════════════════════');
};

runTests().catch(error => {
  logger.error('Error general en las pruebas:', error);
});

