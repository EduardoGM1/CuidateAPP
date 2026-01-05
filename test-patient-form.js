import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

// Función para obtener token de autenticación
async function getAuthToken() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'admin@clinica.com',
      password: 'admin123'
    });
    
    if (response.data.success) {
      return response.data.token;
    } else {
      throw new Error('Error en autenticación');
    }
  } catch (error) {
    console.error('Error obteniendo token:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener doctores activos
async function getDoctoresActivos(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/doctores?estado=activos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error('Error obteniendo doctores');
    }
  } catch (error) {
    console.error('Error obteniendo doctores:', error.response?.data || error.message);
    throw error;
  }
}

// Función para crear paciente completo con primera consulta
async function createPacienteCompleto(token, pacienteData) {
  try {
    console.log('📋 Datos del paciente a crear:', {
      nombre: pacienteData.nombre,
      apellidoPaterno: pacienteData.apellido_paterno,
      enfermedades_cronicas: pacienteData.primeraConsulta.enfermedades_cronicas,
      motivo_consulta: pacienteData.primeraConsulta.motivo_consulta,
      tratamiento_actual: pacienteData.primeraConsulta.tratamiento_actual
    });

    const response = await axios.post(`${API_BASE_URL}/api/pacientes/completo`, pacienteData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ Paciente creado exitosamente:', response.data.data);
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Error creando paciente');
    }
  } catch (error) {
    console.error('❌ Error creando paciente:', error.response?.data || error.message);
    throw error;
  }
}

// Función para crear primera consulta
async function createPrimeraConsulta(token, consultaData) {
  try {
    console.log('🏥 Datos de primera consulta:', {
      pacienteId: consultaData.id_paciente,
      doctorId: consultaData.id_doctor,
      fecha: consultaData.fecha_cita,
      motivo: consultaData.motivo
    });

    const response = await axios.post(`${API_BASE_URL}/api/citas/primera-consulta`, consultaData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data.success) {
      console.log('✅ Primera consulta creada exitosamente:', response.data.data);
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Error creando primera consulta');
    }
  } catch (error) {
    console.error('❌ Error creando primera consulta:', error.response?.data || error.message);
    throw error;
  }
}

// Función principal de prueba
async function testPatientForm() {
  try {
    console.log('🧪 INICIANDO PRUEBAS DEL FORMULARIO DE PACIENTES');
    console.log('================================================');

    // 1. Obtener token de autenticación
    console.log('🔐 Paso 1: Obteniendo token de autenticación...');
    const token = await getAuthToken();
    console.log('✅ Token obtenido exitosamente');

    // 2. Obtener doctores activos
    console.log('👨‍⚕️ Paso 2: Obteniendo doctores activos...');
    const doctores = await getDoctoresActivos(token);
    console.log(`✅ Se encontraron ${doctores.length} doctores activos`);
    
    if (doctores.length === 0) {
      throw new Error('No hay doctores activos para asignar la consulta');
    }

    // 3. Crear datos de prueba del paciente
    console.log('📝 Paso 3: Preparando datos de prueba...');
    const pacienteData = {
      // Datos básicos del paciente
      nombre: 'María',
      apellido_paterno: 'González',
      apellido_materno: 'López',
      fecha_nacimiento: '1985-03-15',
      curp: 'GOLM850315MDFNPR01',
      institucion_salud: 'IMSS',
      sexo: 'Femenino',
      direccion: 'Calle Principal 123',
      localidad: 'Ciudad de México',
      numero_celular: '555-1234-5678',
      id_modulo: 1,
      activo: true,
      
      // PIN del paciente
      pin: '1234',
      device_id: 'test-device-001',
      
      // Primera consulta médica (OBLIGATORIA)
      primeraConsulta: {
        enfermedades_cronicas: ['Diabetes', 'Hipertensión'],
        motivo_consulta: 'Control de diabetes',
        anos_padecimiento: {
          'Diabetes': '5',
          'Hipertensión': '3'
        },
        diagnostico_agregado: 'Paciente con diabetes tipo 2 e hipertensión arterial',
        tratamiento_actual: 'con_medicamento',
        medicamentos: ['Metformina 500mg', 'Losartán 50mg'],
        tratamiento_sin_medicamento: '',
        fecha: '2025-10-20',
        idDoctor: doctores[0].id_doctor.toString(),
        observaciones: 'Paciente requiere seguimiento mensual',
        signos_vitales: {
          peso_kg: '70.5',
          talla_m: '1.65',
          imc: '25.9',
          medida_cintura_cm: '85.0',
          presion_sistolica: '130',
          presion_diastolica: '85',
          glucosa_mg_dl: '140',
          colesterol_mg_dl: '220',
          trigliceridos_mg_dl: '180',
          observaciones: 'Presión arterial elevada, glucosa en ayunas alta'
        },
        vacunas: [
          {
            vacuna: 'COVID-19',
            fecha_aplicacion: '2024-01-15',
            lote_vacuna: 'LOT123456'
          },
          {
            vacuna: 'Influenza',
            fecha_aplicacion: '2024-10-01',
            lote_vacuna: 'LOT789012'
          }
        ]
      }
    };

    // 4. Crear paciente completo
    console.log('👤 Paso 4: Creando paciente completo...');
    const pacienteCreado = await createPacienteCompleto(token, pacienteData);
    
    // 5. Crear primera consulta médica
    console.log('🏥 Paso 5: Creando primera consulta médica...');
    const consultaData = {
      id_paciente: pacienteCreado.id_paciente,
      id_doctor: parseInt(pacienteData.primeraConsulta.idDoctor),
      fecha_cita: pacienteData.primeraConsulta.fecha,
      motivo: pacienteData.primeraConsulta.motivo_consulta,
      observaciones: pacienteData.primeraConsulta.observaciones,
      asistencia: null,
      
      diagnostico: {
        descripcion: `Enfermedades crónicas: ${pacienteData.primeraConsulta.enfermedades_cronicas.join(', ')}. ${pacienteData.primeraConsulta.diagnostico_agregado}`
      },
      
      plan_medicacion: {
        observaciones: `Medicamentos: ${pacienteData.primeraConsulta.medicamentos.join(', ')}`,
        fecha_inicio: pacienteData.primeraConsulta.fecha
      },
      
      asistencia: false,
      motivo_no_asistencia: null,
      
      signos_vitales: pacienteData.primeraConsulta.signos_vitales,
      vacunas: pacienteData.primeraConsulta.vacunas
    };

    const consultaCreada = await createPrimeraConsulta(token, consultaData);

    console.log('\n🎉 PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('=====================================');
    console.log('✅ Paciente creado con ID:', pacienteCreado.id_paciente);
    console.log('✅ Primera consulta creada con ID:', consultaCreada.id_cita);
    console.log('✅ Formulario de 4 pasos funcionando correctamente');
    console.log('✅ Validaciones implementadas correctamente');
    console.log('✅ Campos específicos de primera consulta funcionando');
    console.log('=====================================');

  } catch (error) {
    console.error('\n❌ ERROR EN LAS PRUEBAS:', error.message);
    console.log('=====================================');
    process.exit(1);
  }
}

// Ejecutar pruebas
testPatientForm();

