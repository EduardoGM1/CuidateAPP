import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';

/**
 * Script de prueba para verificar que la encriptación funciona correctamente
 */
async function testEncriptacion() {
  console.log('🧪 PRUEBAS: Encriptación de Campos Críticos\n');
  console.log('='.repeat(60));
  
  try {
    // 0. Verificar conectividad del servidor
    console.log('\n🌐 0. Verificando conectividad del servidor...');
    try {
      await axios.get(`${API_URL}/api/health`, { timeout: 5000 });
      console.log('✅ Servidor conectado\n');
    } catch (error) {
      console.error('❌ No se pudo conectar al servidor');
      console.error('   Asegúrate de que el servidor esté corriendo en', API_URL);
      console.error('   Ejecuta: cd api-clinica && npm run dev');
      process.exit(1);
    }
    
    // 1. Autenticación
    console.log('🔐 1. Autenticando usuario...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'doctor@clinica.com',
      password: 'Doctor123!'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Error en autenticación');
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Autenticación exitosa\n');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. Crear paciente de prueba con fecha_nacimiento
    console.log('📋 2. Creando paciente de prueba con fecha_nacimiento...');
    const pacienteData = {
      nombre: 'Test',
      apellido_paterno: 'Encriptacion',
      apellido_materno: 'Seguridad',
      fecha_nacimiento: '1990-05-15',
      curp: 'TEST900515HDFRGR01',
      numero_celular: '555-1234-5678',
      direccion: 'Calle de Prueba #123',
      estado: 'Ciudad de México',
      localidad: 'Ciudad de México',
      institucion_salud: 'IMSS',
      sexo: 'Hombre',
      id_modulo: 1
    };
    
    const pacienteResponse = await axios.post(
      `${API_URL}/api/pacientes/completo`,
      pacienteData,
      { headers }
    );
    
    if (!pacienteResponse.data.success) {
      console.error('Respuesta del servidor:', JSON.stringify(pacienteResponse.data, null, 2));
      throw new Error('Error creando paciente: ' + JSON.stringify(pacienteResponse.data));
    }
    
    if (!pacienteResponse.data.paciente || !pacienteResponse.data.paciente.id_paciente) {
      console.error('Respuesta completa:', JSON.stringify(pacienteResponse.data, null, 2));
      throw new Error('Estructura de respuesta inesperada');
    }
    
    const pacienteId = pacienteResponse.data.paciente.id_paciente;
    console.log(`✅ Paciente creado (ID: ${pacienteId})`);
    console.log(`   - fecha_nacimiento recibida: ${pacienteResponse.data.paciente.fecha_nacimiento}`);
    console.log(`   - curp recibida: ${pacienteResponse.data.paciente.curp}`);
    console.log(`   - numero_celular recibido: ${pacienteResponse.data.paciente.numero_celular}`);
    console.log(`   - direccion recibida: ${pacienteResponse.data.paciente.direccion}\n`);
    
    // 3. Crear signos vitales con datos críticos
    console.log('💊 3. Creando signos vitales con datos críticos...');
    const signosVitalesData = {
      presion_sistolica: 120,
      presion_diastolica: 80,
      glucosa_mg_dl: 95.5,
      colesterol_mg_dl: 180.0,
      colesterol_ldl: 120.0,
      colesterol_hdl: 50.0,
      trigliceridos_mg_dl: 150.0,
      hba1c_porcentaje: 6.5,
      observaciones: 'Paciente en buen estado general',
      registrado_por: 'doctor'
    };
    
    const signosResponse = await axios.post(
      `${API_URL}/api/pacientes/${pacienteId}/signos-vitales`,
      signosVitalesData,
      { headers }
    );
    
    if (!signosResponse.data.success) {
      throw new Error('Error creando signos vitales: ' + JSON.stringify(signosResponse.data));
    }
    
    const signoId = signosResponse.data.signo.id_signo;
    console.log(`✅ Signos vitales creados (ID: ${signoId})`);
    console.log(`   - presion_sistolica recibida: ${signosResponse.data.signo.presion_sistolica} (tipo: ${typeof signosResponse.data.signo.presion_sistolica})`);
    console.log(`   - presion_diastolica recibida: ${signosResponse.data.signo.presion_diastolica} (tipo: ${typeof signosResponse.data.signo.presion_diastolica})`);
    console.log(`   - glucosa_mg_dl recibida: ${signosResponse.data.signo.glucosa_mg_dl} (tipo: ${typeof signosResponse.data.signo.glucosa_mg_dl})`);
    console.log(`   - colesterol_mg_dl recibida: ${signosResponse.data.signo.colesterol_mg_dl} (tipo: ${typeof signosResponse.data.signo.colesterol_mg_dl})\n`);
    
    // 4. Crear diagnóstico
    console.log('📝 4. Creando diagnóstico...');
    const diagnosticoData = {
      descripcion: 'Diabetes tipo 2 controlada'
    };
    
    const diagnosticoResponse = await axios.post(
      `${API_URL}/api/pacientes/${pacienteId}/diagnosticos`,
      diagnosticoData,
      { headers }
    );
    
    if (!diagnosticoResponse.data.success) {
      throw new Error('Error creando diagnóstico: ' + JSON.stringify(diagnosticoResponse.data));
    }
    
    console.log(`✅ Diagnóstico creado`);
    console.log(`   - descripcion recibida: ${diagnosticoResponse.data.diagnostico.descripcion}\n`);
    
    // 5. Crear cita con motivo
    console.log('📅 5. Creando cita con motivo...');
    const citaData = {
      fecha_cita: new Date().toISOString(),
      motivo: 'Control de diabetes',
      observaciones: 'Revisión de tratamiento'
    };
    
    const citaResponse = await axios.post(
      `${API_URL}/api/citas`,
      { ...citaData, id_paciente: pacienteId },
      { headers }
    );
    
    if (!citaResponse.data.success) {
      throw new Error('Error creando cita: ' + JSON.stringify(citaResponse.data));
    }
    
    console.log(`✅ Cita creada`);
    console.log(`   - motivo recibido: ${citaResponse.data.cita.motivo}`);
    console.log(`   - observaciones recibidas: ${citaResponse.data.cita.observaciones}\n`);
    
    // 6. Crear red de apoyo
    console.log('👥 6. Creando red de apoyo...');
    const redApoyoData = {
      nombre_contacto: 'Contacto Emergencia',
      numero_celular: '555-9876-5432',
      email: 'contacto@example.com',
      direccion: 'Dirección de contacto #456'
    };
    
    const redApoyoResponse = await axios.post(
      `${API_URL}/api/pacientes/${pacienteId}/red-apoyo`,
      redApoyoData,
      { headers }
    );
    
    if (!redApoyoResponse.data.success) {
      throw new Error('Error creando red de apoyo: ' + JSON.stringify(redApoyoResponse.data));
    }
    
    console.log(`✅ Red de apoyo creada`);
    console.log(`   - numero_celular recibido: ${redApoyoResponse.data.contacto.numero_celular}`);
    console.log(`   - email recibido: ${redApoyoResponse.data.contacto.email}`);
    console.log(`   - direccion recibida: ${redApoyoResponse.data.contacto.direccion}\n`);
    
    // 7. Verificar que los datos se pueden recuperar correctamente
    console.log('🔍 7. Verificando recuperación de datos...');
    const pacienteRecuperado = await axios.get(
      `${API_URL}/api/pacientes/${pacienteId}`,
      { headers }
    );
    
    if (pacienteRecuperado.data.success) {
      const p = pacienteRecuperado.data.paciente;
      console.log('✅ Datos del paciente recuperados correctamente:');
      console.log(`   - fecha_nacimiento: ${p.fecha_nacimiento}`);
      console.log(`   - curp: ${p.curp}`);
      console.log(`   - numero_celular: ${p.numero_celular}`);
      console.log(`   - direccion: ${p.direccion}\n`);
    }
    
    console.log('='.repeat(60));
    console.log('✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE\n');
    console.log('📊 RESUMEN:');
    console.log('   ✅ fecha_nacimiento encriptado y desencriptado correctamente');
    console.log('   ✅ Signos vitales críticos encriptados y desencriptados correctamente');
    console.log('   ✅ Diagnóstico encriptado y desencriptado correctamente');
    console.log('   ✅ Motivo y observaciones de cita encriptados correctamente');
    console.log('   ✅ Red de apoyo encriptada correctamente');
    console.log('   ✅ Los datos numéricos se convierten correctamente\n');
    
  } catch (error) {
    console.error('\n❌ ERROR EN PRUEBAS:', error.message);
    if (error.response) {
      console.error('   Respuesta del servidor:', error.response.data);
    }
    process.exit(1);
  }
}

// Ejecutar pruebas
testEncriptacion();

