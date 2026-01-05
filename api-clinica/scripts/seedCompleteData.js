/**
 * Script para Poblar la Base de Datos con Datos Ficticios Completos
 * Incluye: +15 pacientes, +6 doctores, citas de los últimos 7 días, pacientes nuevos
 */

import sequelize from '../config/db.js';
import { 
  Usuario, Doctor, Paciente, Cita, Diagnostico, PlanMedicacion, 
  SignoVital, PuntoChequeo, EsquemaVacunacion, Modulo, Comorbilidad,
  PacienteAuth, PacienteAuthPIN
} from '../models/associations.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

// Datos ficticios para doctores
const doctoresData = [
  {
    nombre: 'Dr. María',
    apellido_paterno: 'González',
    apellido_materno: 'López',
    telefono: '555-1001-0001',
    institucion_hospitalaria: 'Hospital Central',
    grado_estudio: 'Cardiología',
    anos_servicio: 8,
    id_modulo: 2
  },
  {
    nombre: 'Dr. Carlos',
    apellido_paterno: 'Martínez',
    apellido_materno: 'Ruiz',
    telefono: '555-1002-0002',
    institucion_hospitalaria: 'Clínica San José',
    grado_estudio: 'Pediatría',
    anos_servicio: 12,
    id_modulo: 3
  },
  {
    nombre: 'Dra. Ana',
    apellido_paterno: 'Hernández',
    apellido_materno: 'Vega',
    telefono: '555-1003-0003',
    institucion_hospitalaria: 'Hospital General',
    grado_estudio: 'Ginecología',
    anos_servicio: 15,
    id_modulo: 4
  },
  {
    nombre: 'Dr. Roberto',
    apellido_paterno: 'Sánchez',
    apellido_materno: 'Morales',
    telefono: '555-1004-0004',
    institucion_hospitalaria: 'Centro Médico',
    grado_estudio: 'Medicina Interna',
    anos_servicio: 6,
    id_modulo: 1
  },
  {
    nombre: 'Dra. Laura',
    apellido_paterno: 'Díaz',
    apellido_materno: 'Castro',
    telefono: '555-1005-0005',
    institucion_hospitalaria: 'Hospital Regional',
    grado_estudio: 'Neurología',
    anos_servicio: 10,
    id_modulo: 1
  },
  {
    nombre: 'Dr. Miguel',
    apellido_paterno: 'Torres',
    apellido_materno: 'Jiménez',
    telefono: '555-1006-0006',
    institucion_hospitalaria: 'Clínica Privada',
    grado_estudio: 'Ortopedia',
    anos_servicio: 7,
    id_modulo: 1
  }
];

// Datos ficticios para pacientes
const pacientesData = [
  // Pacientes de los últimos 7 días (nuevos)
  {
    nombre: 'Elena',
    apellido_paterno: 'Rodríguez',
    apellido_materno: 'Mendoza',
    fecha_nacimiento: '1985-03-15',
    curp: 'ROME850315MDFNDL01',
    institucion_salud: 'IMSS',
    sexo: 'Mujer',
    direccion: 'Av. Reforma 123',
    localidad: 'Ciudad de México',
    numero_celular: '5512345678',
    fecha_registro: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // Ayer
  },
  {
    nombre: 'Fernando',
    apellido_paterno: 'Vargas',
    apellido_materno: 'Silva',
    fecha_nacimiento: '1992-07-22',
    curp: 'VASF920722HDFRLN02',
    institucion_salud: 'ISSSTE',
    sexo: 'Hombre',
    direccion: 'Calle Morelos 456',
    localidad: 'Guadalajara',
    numero_celular: '5512345679',
    fecha_registro: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // Hace 2 días
  },
  {
    nombre: 'Isabel',
    apellido_paterno: 'Morales',
    apellido_materno: 'Cruz',
    fecha_nacimiento: '1988-11-08',
    curp: 'MOCI881108MDFRZB03',
    institucion_salud: 'Particular',
    sexo: 'Mujer',
    direccion: 'Blvd. Insurgentes 789',
    localidad: 'Monterrey',
    numero_celular: '5512345680',
    fecha_registro: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Hace 3 días
  },
  {
    nombre: 'Javier',
    apellido_paterno: 'Luna',
    apellido_materno: 'Herrera',
    fecha_nacimiento: '1995-01-30',
    curp: 'LUHJ950130HDFNRV04',
    institucion_salud: 'IMSS',
    sexo: 'Hombre',
    direccion: 'Calle Hidalgo 321',
    localidad: 'Puebla',
    numero_celular: '5512345681',
    fecha_registro: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // Hace 4 días
  },
  {
    nombre: 'Carmen',
    apellido_paterno: 'Reyes',
    apellido_materno: 'Gutiérrez',
    fecha_nacimiento: '1983-09-12',
    curp: 'REGC830912MDFYRM05',
    institucion_salud: 'ISSSTE',
    sexo: 'Mujer',
    direccion: 'Av. Juárez 654',
    localidad: 'Tijuana',
    numero_celular: '5512345682',
    fecha_registro: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // Hace 5 días
  },
  {
    nombre: 'Diego',
    apellido_paterno: 'Flores',
    apellido_materno: 'Ramírez',
    fecha_nacimiento: '1990-05-18',
    curp: 'FLRD900518HDFRMG06',
    institucion_salud: 'Particular',
    sexo: 'Hombre',
    direccion: 'Calle Zaragoza 987',
    localidad: 'León',
    numero_celular: '5512345683',
    fecha_registro: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // Hace 6 días
  },
  {
    nombre: 'Patricia',
    apellido_paterno: 'Mendoza',
    apellido_materno: 'Ortega',
    fecha_nacimiento: '1987-12-03',
    curp: 'MEOP871203MDFNDR07',
    institucion_salud: 'IMSS',
    sexo: 'Mujer',
    direccion: 'Blvd. López Mateos 147',
    localidad: 'Cancún',
    numero_celular: '5512345684',
    fecha_registro: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Hace 7 días
  },
  // Pacientes más antiguos
  {
    nombre: 'Ricardo',
    apellido_paterno: 'Castro',
    apellido_materno: 'Méndez',
    fecha_nacimiento: '1980-04-25',
    curp: 'CAMR800425HDFSRD08',
    institucion_salud: 'ISSSTE',
    sexo: 'Hombre',
    direccion: 'Calle Independencia 258',
    localidad: 'Mérida',
    numero_celular: '5512345685',
    fecha_registro: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // Hace 15 días
  },
  {
    nombre: 'Sofía',
    apellido_paterno: 'Jiménez',
    apellido_materno: 'Vega',
    fecha_nacimiento: '1993-08-14',
    curp: 'JIVS930814MDFMGF09',
    institucion_salud: 'Particular',
    sexo: 'Mujer',
    direccion: 'Av. Universidad 369',
    localidad: 'Toluca',
    numero_celular: '5512345686',
    fecha_registro: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // Hace 20 días
  },
  {
    nombre: 'Andrés',
    apellido_paterno: 'Guerrero',
    apellido_materno: 'Pérez',
    fecha_nacimiento: '1986-06-07',
    curp: 'GUPA860607HDFRND10',
    institucion_salud: 'IMSS',
    sexo: 'Hombre',
    direccion: 'Calle Madero 741',
    localidad: 'Querétaro',
    numero_celular: '5512345687',
    fecha_registro: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) // Hace 25 días
  },
  {
    nombre: 'Valentina',
    apellido_paterno: 'Herrera',
    apellido_materno: 'Soto',
    fecha_nacimiento: '1991-10-19',
    curp: 'HESV911019MDFRTL11',
    institucion_salud: 'ISSSTE',
    sexo: 'Mujer',
    direccion: 'Blvd. Revolución 852',
    localidad: 'Saltillo',
    numero_celular: '5512345688',
    fecha_registro: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Hace 30 días
  },
  {
    nombre: 'Gabriel',
    apellido_paterno: 'Soto',
    apellido_materno: 'López',
    fecha_nacimiento: '1984-02-11',
    curp: 'SOLG840211HDFTPB12',
    institucion_salud: 'Particular',
    sexo: 'Hombre',
    direccion: 'Calle Morelos 963',
    localidad: 'Hermosillo',
    numero_celular: '5512345689',
    fecha_registro: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) // Hace 35 días
  },
  {
    nombre: 'Natalia',
    apellido_paterno: 'López',
    apellido_materno: 'García',
    fecha_nacimiento: '1989-12-28',
    curp: 'LOGN891228MDFPRT13',
    institucion_salud: 'IMSS',
    sexo: 'Mujer',
    direccion: 'Av. Constitución 174',
    localidad: 'Culiacán',
    numero_celular: '5512345690',
    fecha_registro: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) // Hace 40 días
  },
  {
    nombre: 'Emilio',
    apellido_paterno: 'García',
    apellido_materno: 'Martín',
    fecha_nacimiento: '1982-07-05',
    curp: 'GAME820705HDFRML14',
    institucion_salud: 'ISSSTE',
    sexo: 'Hombre',
    direccion: 'Calle Juárez 285',
    localidad: 'Aguascalientes',
    numero_celular: '5512345691',
    fecha_registro: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) // Hace 45 días
  },
  {
    nombre: 'Adriana',
    apellido_paterno: 'Martín',
    apellido_materno: 'Fernández',
    fecha_nacimiento: '1994-03-17',
    curp: 'MAFA940317MDFRND15',
    institucion_salud: 'Particular',
    sexo: 'Mujer',
    direccion: 'Blvd. López Portillo 396',
    localidad: 'Villahermosa',
    numero_celular: '5512345692',
    fecha_registro: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000) // Hace 50 días
  }
];

// Motivos de consulta comunes
const motivosConsulta = [
  'Revisión general',
  'Control de diabetes',
  'Control de hipertensión',
  'Dolor de cabeza',
  'Fiebre',
  'Tos persistente',
  'Dolor abdominal',
  'Fatiga',
  'Ansiedad',
  'Insomnio',
  'Control prenatal',
  'Vacunación',
  'Consulta de seguimiento',
  'Síntomas respiratorios',
  'Dolor articular'
];

// Diagnósticos comunes
const diagnosticos = [
  'Hipertensión arterial controlada',
  'Diabetes tipo 2 en control',
  'Gripe común',
  'Infección respiratoria',
  'Ansiedad leve',
  'Insomnio transitorio',
  'Gastritis',
  'Migraña',
  'Artritis',
  'Bronquitis',
  'Neumonía leve',
  'Depresión leve',
  'Obesidad',
  'Colesterol elevado',
  'Anemia leve'
];

// Medicamentos comunes
const medicamentos = [
  'Metformina 500mg',
  'Losartán 50mg',
  'Omeprazol 20mg',
  'Paracetamol 500mg',
  'Ibuprofeno 400mg',
  'Amoxicilina 500mg',
  'Sertralina 50mg',
  'Lorazepam 1mg',
  'Atorvastatina 20mg',
  'Aspirina 100mg'
];

// Vacunas comunes
const vacunas = [
  'Influenza',
  'Tétanos',
  'Hepatitis B',
  'Neumococo',
  'COVID-19',
  'Varicela',
  'Sarampión',
  'Rubéola',
  'Paperas',
  'HPV'
];

async function seedCompleteData() {
  try {
    console.log('🌱 INICIANDO POBLADO COMPLETO DE BASE DE DATOS');
    console.log('==============================================');

    // Sincronizar modelos
    await sequelize.sync({ alter: true });

    // 1. Crear módulos si no existen - DESHABILITADO
    // Los módulos deben crearse manualmente desde la interfaz de gestión
    // console.log('\n📋 Creando módulos...');
    // const modulos = await Promise.all([
    //   Modulo.findOrCreate({ where: { id_modulo: 1 }, defaults: { nombre_modulo: 'Medicina General' } }),
    //   Modulo.findOrCreate({ where: { id_modulo: 2 }, defaults: { nombre_modulo: 'Cardiología' } }),
    //   Modulo.findOrCreate({ where: { id_modulo: 3 }, defaults: { nombre_modulo: 'Pediatría' } }),
    //   Modulo.findOrCreate({ where: { id_modulo: 4 }, defaults: { nombre_modulo: 'Ginecología' } })
    // ]);
    // console.log('✅ Módulos creados/verificados');
    console.log('\n📋 Módulos: Se deben crear manualmente desde la interfaz de gestión');

    // 2. Crear doctores adicionales
    console.log('\n👨‍⚕️ Creando doctores adicionales...');
    const doctoresCreados = [];
    
    for (const doctorData of doctoresData) {
      const email = `doctor${doctoresCreados.length + 2}@clinica.com`;
      const password = `doctor${doctoresCreados.length + 2}123`;
      const hashedPassword = await bcrypt.hash(password, 10);

      const [usuario] = await Usuario.findOrCreate({
        where: { email },
        defaults: {
          password_hash: hashedPassword,
          rol: 'Doctor',
          activo: true
        }
      });

      const [doctor] = await Doctor.findOrCreate({
        where: { id_usuario: usuario.id_usuario },
        defaults: {
          ...doctorData,
          id_usuario: usuario.id_usuario,
          activo: true
        }
      });

      doctoresCreados.push({ doctor, usuario, password });
      console.log(`✅ Doctor creado: ${doctorData.nombre} ${doctorData.apellido_paterno} (${email})`);
    }

    // 3. Crear pacientes
    console.log('\n👥 Creando pacientes...');
    const pacientesCreados = [];
    
    for (let i = 0; i < pacientesData.length; i++) {
      const pacienteData = pacientesData[i];
      const email = `paciente${i + 3}@temp.com`;
      const password = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(password, 10);

      const [usuario] = await Usuario.findOrCreate({
        where: { email },
        defaults: {
          password_hash: hashedPassword,
          rol: 'Paciente',
          activo: true
        }
      });

      const [paciente] = await Paciente.findOrCreate({
        where: { id_usuario: usuario.id_usuario },
        defaults: {
          ...pacienteData,
          id_usuario: usuario.id_usuario,
          id_modulo: Math.floor(Math.random() * 4) + 1, // Módulo aleatorio
          activo: true
        }
      });

      // Crear PIN para algunos pacientes
      if (Math.random() > 0.3) { // 70% de probabilidad
        const pin = Math.floor(1000 + Math.random() * 9000).toString(); // PIN de 4 dígitos
        const deviceId = Math.random().toString(36).substring(2, 15);
        
        const [pacienteAuth] = await PacienteAuth.findOrCreate({
          where: { id_paciente: paciente.id_paciente },
          defaults: {
            id_paciente: paciente.id_paciente,
            device_id: deviceId,
            activo: true
          }
        });

        const pinSalt = Math.random().toString(36).slice(-16);
        const hashedPin = await bcrypt.hash(pin + pinSalt, 10);
        
        await PacienteAuthPIN.findOrCreate({
          where: { id_auth: pacienteAuth.id_auth },
          defaults: {
            id_auth: pacienteAuth.id_auth,
            pin_hash: hashedPin,
            pin_salt: pinSalt,
            intentos_fallidos: 0,
            bloqueado_hasta: null
          }
        });
      }

      pacientesCreados.push(paciente);
      console.log(`✅ Paciente creado: ${pacienteData.nombre} ${pacienteData.apellido_paterno}`);
    }

    // 4. Crear citas de los últimos 7 días
    console.log('\n📅 Creando citas de los últimos 7 días...');
    const citasCreadas = [];
    
    for (let i = 0; i < 7; i++) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      
      // Crear 3-8 citas por día
      const numCitas = Math.floor(Math.random() * 6) + 3;
      
      for (let j = 0; j < numCitas; j++) {
        const paciente = pacientesCreados[Math.floor(Math.random() * pacientesCreados.length)];
        const doctor = doctoresCreados[Math.floor(Math.random() * doctoresCreados.length)].doctor;
        
        const hora = Math.floor(Math.random() * 8) + 8; // Entre 8 AM y 4 PM
        const minutos = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, 45
        
        fecha.setHours(hora, minutos, 0, 0);
        
        const motivo = motivosConsulta[Math.floor(Math.random() * motivosConsulta.length)];
        const asistencia = Math.random() > 0.2; // 80% de asistencia
        
        const [cita] = await Cita.findOrCreate({
          where: {
            id_paciente: paciente.id_paciente,
            fecha_cita: fecha,
            motivo: motivo
          },
          defaults: {
            id_paciente: paciente.id_paciente,
            id_doctor: doctor.id_doctor,
            fecha_cita: fecha,
            motivo: motivo,
            asistencia: asistencia,
            es_primera_consulta: Math.random() > 0.7, // 30% primera consulta
            observaciones: `Consulta del ${fecha.toLocaleDateString()}`
          }
        });

        citasCreadas.push(cita);

        // Crear diagnóstico si la cita fue atendida
        if (asistencia && Math.random() > 0.3) {
          const diagnostico = diagnosticos[Math.floor(Math.random() * diagnosticos.length)];
          await Diagnostico.findOrCreate({
            where: { id_cita: cita.id_cita },
            defaults: {
              id_cita: cita.id_cita,
              descripcion: diagnostico
            }
          });
        }

        // Crear plan de medicación si hay diagnóstico
        if (asistencia && Math.random() > 0.4) {
          const medicamento = medicamentos[Math.floor(Math.random() * medicamentos.length)];
          await PlanMedicacion.findOrCreate({
            where: { id_cita: cita.id_cita },
            defaults: {
              id_paciente: paciente.id_paciente,
              id_doctor: doctor.id_doctor,
              id_cita: cita.id_cita,
              fecha_inicio: fecha.toISOString().split('T')[0],
              observaciones: `Tratamiento con ${medicamento}`,
              activo: true
            }
          });
        }

        // Crear punto de chequeo
        await PuntoChequeo.findOrCreate({
          where: { id_cita: cita.id_cita },
          defaults: {
            id_cita: cita.id_cita,
            id_paciente: paciente.id_paciente,
            asistencia: asistencia,
            motivo_no_asistencia: asistencia ? null : 'No se presentó',
            observaciones: `Chequeo del ${fecha.toLocaleDateString()}`
          }
        });

        // Crear signos vitales si la cita fue atendida
        if (asistencia && Math.random() > 0.5) {
          await SignoVital.findOrCreate({
            where: { id_cita: cita.id_cita },
            defaults: {
              id_paciente: paciente.id_paciente,
              id_cita: cita.id_cita,
              fecha_medicion: fecha,
              peso_kg: (60 + Math.random() * 40).toFixed(1), // 60-100 kg
              talla_m: (1.50 + Math.random() * 0.40).toFixed(2), // 1.50-1.90 m
              presion_sistolica: Math.floor(100 + Math.random() * 40), // 100-140
              presion_diastolica: Math.floor(60 + Math.random() * 30), // 60-90
              glucosa_mg_dl: Math.floor(80 + Math.random() * 60), // 80-140
              registrado_por: 'doctor',
              observaciones: 'Signos vitales normales'
            }
          });
        }

        // Crear vacunas ocasionales
        if (asistencia && Math.random() > 0.8) {
          const vacuna = vacunas[Math.floor(Math.random() * vacunas.length)];
          await EsquemaVacunacion.findOrCreate({
            where: {
              id_paciente: paciente.id_paciente,
              vacuna: vacuna,
              fecha_aplicacion: fecha
            },
            defaults: {
              id_paciente: paciente.id_paciente,
              vacuna: vacuna,
              fecha_aplicacion: fecha,
              lote_vacuna: `LOTE${Math.floor(Math.random() * 10000)}`
            }
          });
        }
      }
      
      console.log(`✅ Citas creadas para ${fecha.toLocaleDateString()}: ${numCitas}`);
    }

    // 5. Resumen final
    console.log('\n🎉 POBLADO COMPLETO FINALIZADO');
    console.log('==============================');
    console.log(`👨‍⚕️ Doctores creados: ${doctoresCreados.length}`);
    console.log(`👥 Pacientes creados: ${pacientesCreados.length}`);
    console.log(`📅 Citas creadas: ${citasCreadas.length}`);
    console.log(`📋 Módulos disponibles: 4`);
    
    console.log('\n🔑 CREDENCIALES DE DOCTORES:');
    console.log('============================');
    doctoresCreados.forEach(({ usuario, password }, index) => {
      console.log(`${index + 1}. ${usuario.email} / ${password}`);
    });

    console.log('\n📊 ESTADÍSTICAS:');
    console.log('================');
    console.log(`• Pacientes nuevos (últimos 7 días): 7`);
    console.log(`• Pacientes antiguos: ${pacientesCreados.length - 7}`);
    console.log(`• Citas de los últimos 7 días: ${citasCreadas.length}`);
    console.log(`• Tasa de asistencia promedio: ~80%`);
    console.log(`• Primera consulta: ~30% de las citas`);

  } catch (error) {
    console.error('❌ Error durante el poblado:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar el script
seedCompleteData();

