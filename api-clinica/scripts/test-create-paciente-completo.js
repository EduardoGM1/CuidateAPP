import dotenv from 'dotenv';
import axios from 'axios';
import logger from '../utils/logger.js';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

async function testCreatePacienteCompleto() {
  try {
    // 1. Login como doctor
    logger.info('1. Iniciando sesión como doctor...');
    const loginResponse = await axios.post(`${API_URL}/auth/login-doctor-admin`, {
      email: 'doctor@clinica.com',
      password: 'Doctor123!'
    });
    
    const token = loginResponse.data.token;
    logger.info('✅ Login exitoso', { token: token.substring(0, 20) + '...' });
    
    // 2. Crear paciente completo
    logger.info('2. Creando paciente completo...');
    const pacienteData = {
      nombre: 'Alejandro',
      apellido_paterno: 'Fernández',
      apellido_materno: 'Díaz',
      fecha_nacimiento: '1982-01-17',
      curp: 'ZZNY820117HDFMTO51',
      institucion_salud: 'Bienestar',
      sexo: 'Hombre',
      direccion: 'Carrera Central #4913',
      estado: 'Aguascalientes',
      localidad: 'Asientos',
      numero_celular: '113-3115841',
      id_modulo: 1,
      activo: true,
      pin: '4983',
      device_id: 'device_test_' + Date.now()
    };
    
    logger.info('Datos del paciente a enviar:', {
      ...pacienteData,
      curp: pacienteData.curp.substring(0, 4) + '...',
      numero_celular: pacienteData.numero_celular.substring(0, 3) + '...',
      pin: '****'
    });
    
    const createResponse = await axios.post(
      `${API_URL}/pacientes/completo`,
      pacienteData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    logger.info('✅ Paciente creado exitosamente', {
      pacienteId: createResponse.data.data?.id_paciente,
      success: createResponse.data.success
    });
    
  } catch (error) {
    logger.error('❌ Error en prueba', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data ? JSON.parse(error.config.data) : null
      }
    });
    
    if (error.response?.data?.missing_fields) {
      logger.error('Campos faltantes detectados:', error.response.data.missing_fields);
    }
  }
}

testCreatePacienteCompleto();

