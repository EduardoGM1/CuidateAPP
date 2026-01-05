import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const DOCTOR_EMAIL = 'doctor@clinica.com';
const DOCTOR_PASSWORD = 'Doctor123!';

/**
 * Script alternativo que usa la API HTTP en lugar de conexión directa a MySQL
 * para eliminar pacientes y crear uno nuevo con datos completos
 */

let authToken = null;

async function login() {
  try {
    console.log(`   Intentando login en: ${API_URL}/auth/login`);
    console.log(`   Email: ${DOCTOR_EMAIL}`);
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: DOCTOR_EMAIL,
      password: DOCTOR_PASSWORD
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('   Status:', response.status);
    console.log('   Response keys:', Object.keys(response.data || {}));

    if (response.data && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login exitoso\n');
      return true;
    }
    
    if (response.data && response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login exitoso\n');
      return true;
    }
    
    console.error('❌ Respuesta de login inválida:', response.data);
    return false;
  } catch (error) {
    console.error('❌ Error en login:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('   No se recibió respuesta del servidor');
      console.error('   Request:', error.request);
    }
    return false;
  }
}

async function getPacientes() {
  try {
    const response = await axios.get(`${API_URL}/pacientes?estado=activos&sort=recent`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success && Array.isArray(response.data.pacientes)) {
      return response.data.pacientes;
    }
    return [];
  } catch (error) {
    console.error('❌ Error obteniendo pacientes:', error.response?.data?.error || error.message);
    return [];
  }
}

async function deletePaciente(pacienteId) {
  try {
    const response = await axios.delete(`${API_URL}/pacientes/${pacienteId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    return response.data.success;
  } catch (error) {
    console.error(`❌ Error eliminando paciente ${pacienteId}:`, error.response?.data?.error || error.message);
    return false;
  }
}

async function createPacienteCompleto() {
  const pacienteData = {
    nombre: 'María',
    apellido_paterno: 'González',
    apellido_materno: 'López',
    fecha_nacimiento: '1985-05-15',
    curp: 'GOLL850515MDFRPR01',
    sexo: 'F',
    telefono: '5551234567',
    numero_celular: '5559876543',
    direccion: 'Calle Principal 123, Colonia Centro',
    estado: 'Ciudad de México',
    localidad: 'Ciudad de México',
    institucion_salud: 'IMSS',
    id_modulo: 1,
    activo: true,
    pin: '2020',
    device_id: `device_${Date.now()}`,
    // Primera consulta completa
    primeraConsulta: {
      motivo_consulta: 'Consulta de rutina y evaluación general',
      diagnostico_agregado: 'Paciente sana. Control de rutina.',
      diagnostico_basal: 'Sin patologías detectadas',
      tratamiento_actual: 'Control con dieta y ejercicio',
      recibe_tratamiento_no_farmacologico: true,
      recibe_tratamiento_farmacologico: false,
      signos_vitales: {
        peso_kg: 65.5,
        talla_m: 1.65,
        medida_cintura_cm: 78.0,
        presion_sistolica: 120,
        presion_diastolica: 80,
        glucosa_mg_dl: 95,
        colesterol_mg_dl: 180,
        colesterol_ldl: 110,
        colesterol_hdl: 55,
        trigliceridos_mg_dl: 120,
        hba1c_porcentaje: 5.5,
        edad_paciente_en_medicion: 38,
        observaciones: 'Signos vitales dentro de parámetros normales. Paciente en buen estado general.'
      },
      diagnostico: {
        descripcion: 'Paciente sana. Control de rutina. Sin patologías detectadas. Se recomienda seguimiento en 6 meses.'
      },
      plan_medicacion: {
        observaciones: 'Plan de medicación preventivo. Tomar con alimentos.',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        medicamentos: [
          {
            id_medicamento: null, // Se buscará o creará
            nombre_medicamento: 'Ácido Acetilsalicílico',
            dosis: '100 mg',
            frecuencia: 'Una vez al día',
            duracion_dias: 30,
            instrucciones: 'Tomar con el desayuno'
          }
        ]
      },
      comorbilidades: [
        {
          id_comorbilidad: null, // Se buscará o creará
          nombre: 'Hipertensión Arterial',
          fecha_diagnostico: new Date().toISOString().split('T')[0],
          diagnostico_basal: 'Hipertensión controlada',
          tratamiento_actual: 'Control con dieta y ejercicio',
          activo: true
        }
      ]
    }
  };

  try {
    const response = await axios.post(`${API_URL}/pacientes/completo`, pacienteData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('❌ Error creando paciente:', error.response?.data?.error || error.message);
    if (error.response?.data) {
      console.error('Detalles:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function main() {
  console.log('🚀 Iniciando limpieza y creación de paciente vía API...\n');

  // 1. Login
  console.log('1️⃣ Iniciando sesión...');
  if (!await login()) {
    console.error('❌ No se pudo iniciar sesión. Abortando.');
    process.exit(1);
  }

  // 2. Obtener pacientes del doctor
  console.log('\n2️⃣ Obteniendo pacientes del doctor...');
  const pacientes = await getPacientes();
  console.log(`   📋 Encontrados ${pacientes.length} paciente(s)\n`);

  // 3. Eliminar pacientes existentes
  if (pacientes.length > 0) {
    console.log('3️⃣ Eliminando pacientes existentes...');
    for (const paciente of pacientes) {
      console.log(`   🗑️  Eliminando paciente: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);
      const deleted = await deletePaciente(paciente.id_paciente);
      if (deleted) {
        console.log(`   ✅ Paciente ${paciente.id_paciente} eliminado`);
      } else {
        console.log(`   ⚠️  No se pudo eliminar paciente ${paciente.id_paciente}`);
      }
    }
    console.log('');
  } else {
    console.log('   ℹ️  No hay pacientes para eliminar\n');
  }

  // 4. Crear nuevo paciente completo
  console.log('4️⃣ Creando nuevo paciente con datos completos...');
  const nuevoPaciente = await createPacienteCompleto();

  if (nuevoPaciente) {
    console.log('\n✅ ✅ ✅ PROCESO COMPLETADO EXITOSAMENTE ✅ ✅ ✅\n');
    console.log('📊 RESUMEN:');
    console.log(`   👤 Paciente ID: ${nuevoPaciente.id_paciente || nuevoPaciente.id}`);
    console.log(`   📧 Email: ${nuevoPaciente.email || 'N/A'}`);
    console.log(`   🔐 PIN: 2020`);
    if (nuevoPaciente.cita) {
      console.log(`   📅 Cita ID: ${nuevoPaciente.cita.id_cita || nuevoPaciente.cita.id}`);
    }
    console.log(`   👨‍⚕️  Doctor: ${DOCTOR_EMAIL}\n`);
  } else {
    console.error('\n❌ No se pudo crear el paciente completo');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

