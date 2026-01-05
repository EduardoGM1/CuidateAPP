import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import {
  Usuario,
  Paciente,
  Doctor,
  DoctorPaciente,
  Cita,
  SignoVital,
  Diagnostico,
  EsquemaVacunacion,
  PacienteComorbilidad,
  Comorbilidad,
  Vacuna,
  Modulo
} from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';

/**
 * Script para crear 3 pacientes de prueba completos con:
 * - Usuario y credenciales
 * - Asignación al doctor actual (ID: 1)
 * - 2 citas cada uno
 * - Signos vitales
 * - Diagnósticos
 * - Historial de vacunas
 * - Comorbilidades
 */

// Datos de los 3 pacientes
const pacientesData = [
  {
    pin: '2580',
    nombre: 'María',
    apellido_paterno: 'González',
    apellido_materno: 'López',
    fecha_nacimiento: '1985-05-15',
    curp: 'GOLM850515MDFRXR01',
    sexo: 'Mujer',
    institucion_salud: 'IMSS',
    direccion: 'Calle Principal 123',
    localidad: 'Ciudad de México',
    numero_celular: '5551234567',
    comorbilidades: ['Diabetes', 'Hipertensión'],
    vacunas: ['COVID-19 (mRNA)', 'Influenza (Gripe)', 'Hepatitis B'],
    signosVitales: [
      {
        peso_kg: 75.5,
        talla_m: 1.65,
        presion_sistolica: 140,
        presion_diastolica: 90,
        glucosa_mg_dl: 180,
        colesterol_mg_dl: 220,
        registrado_por: 'doctor'
      },
      {
        peso_kg: 74.8,
        talla_m: 1.65,
        presion_sistolica: 135,
        presion_diastolica: 88,
        glucosa_mg_dl: 165,
        registrado_por: 'doctor'
      }
    ],
    diagnosticos: [
      'Diabetes Mellitus Tipo 2, controlada con metformina. Hipertensión arterial en tratamiento.',
      'Control de diabetes e hipertensión. Buen cumplimiento del tratamiento. Continuar con seguimiento mensual.'
    ]
  },
  {
    pin: '3691',
    nombre: 'Carlos',
    apellido_paterno: 'Rodríguez',
    apellido_materno: 'Martínez',
    fecha_nacimiento: '1978-08-22',
    curp: 'ROMC780822HDFDRR02',
    sexo: 'Hombre',
    institucion_salud: 'ISSSTE',
    direccion: 'Avenida Reforma 456',
    localidad: 'Guadalajara',
    numero_celular: '5552345678',
    comorbilidades: ['Obesidad', 'Dislipidemia'],
    vacunas: ['Tdap (Tétanos, Difteria, Tos Ferina Acelular)', 'Influenza (Gripe)', 'Hepatitis A'],
    signosVitales: [
      {
        peso_kg: 95.2,
        talla_m: 1.75,
        medida_cintura_cm: 105,
        presion_sistolica: 130,
        presion_diastolica: 85,
        colesterol_mg_dl: 250,
        trigliceridos_mg_dl: 180,
        registrado_por: 'doctor'
      },
      {
        peso_kg: 93.5,
        talla_m: 1.75,
        medida_cintura_cm: 103,
        presion_sistolica: 128,
        presion_diastolica: 82,
        registrado_por: 'doctor'
      }
    ],
    diagnosticos: [
      'Obesidad grado I. Dislipidemia mixta. Indicado plan de alimentación y ejercicio físico.',
      'Mejora en parámetros metabólicos. Continuar con dieta y ejercicio. Seguimiento trimestral.'
    ]
  },
  {
    pin: '7410',
    nombre: 'Ana',
    apellido_paterno: 'Sánchez',
    apellido_materno: 'Hernández',
    fecha_nacimiento: '1992-03-10',
    curp: 'SAHA920310MDFRNN03',
    sexo: 'Mujer',
    institucion_salud: 'Bienestar',
    direccion: 'Boulevard Juárez 789',
    localidad: 'Monterrey',
    numero_celular: '5553456789',
    comorbilidades: ['Asma', 'Tabaquismo'],
    vacunas: ['Triple Viral (MMR: Sarampión, Paperas, Rubéola)', 'Varicela', 'VPH (Virus del Papiloma Humano)'],
    signosVitales: [
      {
        peso_kg: 62.3,
        talla_m: 1.60,
        presion_sistolica: 120,
        presion_diastolica: 75,
        glucosa_mg_dl: 95,
        registrado_por: 'doctor'
      },
      {
        peso_kg: 61.8,
        talla_m: 1.60,
        presion_sistolica: 118,
        presion_diastolica: 73,
        registrado_por: 'doctor'
      }
    ],
    diagnosticos: [
      'Asma bronquial leve intermitente. Tabaquismo activo. Indicado tratamiento broncodilatador y programa de cesación tabáquica.',
      'Control adecuado del asma. Progreso en cesación tabáquica. Continuar con tratamiento preventivo.'
    ]
  }
];

async function crearPacientesCompletos() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // Obtener el doctor actual (ID: 1)
    const doctor = await Doctor.findByPk(1);
    if (!doctor) {
      throw new Error('Doctor con ID 1 no encontrado. Asegúrate de que el doctor existe.');
    }
    logger.info(`👨‍⚕️ Doctor asignado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})\n`);

    // Obtener módulos disponibles
    const modulos = await Modulo.findAll({ limit: 5 });
    const moduloIds = modulos.map(m => m.id_modulo);

    const pacientesCreados = [];

    for (let i = 0; i < pacientesData.length; i++) {
      const datos = pacientesData[i];
      logger.info(`\n👤 ========================================`);
      logger.info(`👤 CREANDO PACIENTE ${i + 1}: ${datos.nombre} ${datos.apellido_paterno}`);
      logger.info(`👤 ========================================\n`);

      // 1. Crear paciente directamente (sin usuario/email)
      // Los pacientes usan PIN, no necesitan email
      let paciente = await Paciente.findOne({ 
        where: { 
          nombre: datos.nombre,
          apellido_paterno: datos.apellido_paterno,
          fecha_nacimiento: datos.fecha_nacimiento
        } 
      });
      if (paciente) {
        await paciente.update({
          nombre: datos.nombre,
          apellido_paterno: datos.apellido_paterno,
          apellido_materno: datos.apellido_materno,
          fecha_nacimiento: datos.fecha_nacimiento,
          curp: datos.curp,
          sexo: datos.sexo,
          institucion_salud: datos.institucion_salud,
          direccion: datos.direccion,
          localidad: datos.localidad,
          numero_celular: datos.numero_celular,
          id_modulo: moduloIds[i % moduloIds.length] || null,
          activo: true
        });
        logger.info(`✅ Datos del paciente actualizados (ID: ${paciente.id_paciente})`);
      } else {
        paciente = await Paciente.create({
          id_usuario: null, // Pacientes no necesitan usuario/email
          nombre: datos.nombre,
          apellido_paterno: datos.apellido_paterno,
          apellido_materno: datos.apellido_materno,
          fecha_nacimiento: datos.fecha_nacimiento,
          curp: datos.curp,
          sexo: datos.sexo,
          institucion_salud: datos.institucion_salud,
          direccion: datos.direccion,
          localidad: datos.localidad,
          numero_celular: datos.numero_celular,
          id_modulo: moduloIds[i % moduloIds.length] || null,
          activo: true
        });
        logger.info(`✅ Paciente creado (ID: ${paciente.id_paciente})`);
      }

      // 2. Crear/Actualizar credencial PIN (después de crear paciente)
      const credentials = await UnifiedAuthService.getUserCredentials('Paciente', paciente.id_paciente);
      const existingPinCredential = credentials.find(c => c.auth_method === 'pin' && c.isPrimary);
      
      if (existingPinCredential) {
        // Actualizar PIN existente
        const AuthCredential = (await import('../models/AuthCredential.js')).default;
        const bcrypt = (await import('bcryptjs')).default;
        const salt = await bcrypt.genSalt(10);
        const hashedPin = await bcrypt.hash(datos.pin, salt);
        
        await AuthCredential.update(
          {
            credential_value: hashedPin,
            credential_salt: salt
          },
          {
            where: {
              id_credential: existingPinCredential.id_credential
            }
          }
        );
        logger.info(`✅ PIN actualizado: ${datos.pin}`);
      } else {
        // Crear nuevo PIN
        const deviceId = `device-${paciente.id_paciente}-${Date.now()}`;
        await UnifiedAuthService.setupCredential(
          'Paciente',
          paciente.id_paciente,
          'pin',
          datos.pin,
          {
            deviceId: deviceId,
            deviceName: 'Dispositivo Principal',
            deviceType: 'mobile',
            isPrimary: true
          }
        );
        logger.info(`✅ PIN configurado: ${datos.pin}`);
      }

      // 3. Asignar al doctor
      const asignacion = await DoctorPaciente.findOrCreate({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: paciente.id_paciente
        },
        defaults: {
          id_doctor: doctor.id_doctor,
          id_paciente: paciente.id_paciente
        }
      });
      logger.info(`✅ Asignado al doctor ${doctor.nombre} ${doctor.apellido_paterno}`);

      // 4. Crear 2 citas
      logger.info('\n📅 Creando citas...');
      const fechasCitas = [
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Hace 30 días
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)   // Hace 7 días
      ];

      const citasCreadas = [];
      for (let j = 0; j < 2; j++) {
        const cita = await Cita.create({
          id_paciente: paciente.id_paciente,
          id_doctor: doctor.id_doctor,
          fecha_cita: fechasCitas[j],
          estado: j === 0 ? 'atendida' : 'atendida',
          asistencia: true,
          motivo: j === 0 ? 'Consulta de seguimiento' : 'Control médico',
          es_primera_consulta: j === 0 ? false : false,
          observaciones: `Consulta ${j + 1} del paciente ${datos.nombre} ${datos.apellido_paterno}`,
          fecha_creacion: fechasCitas[j]
        });
        citasCreadas.push(cita);
        logger.info(`   ✅ Cita ${j + 1} creada (ID: ${cita.id_cita}) - ${fechasCitas[j].toISOString().split('T')[0]}`);
      }

      // 5. Crear signos vitales
      logger.info('\n💓 Creando signos vitales...');
      for (let j = 0; j < datos.signosVitales.length; j++) {
        const sv = datos.signosVitales[j];
        const imc = sv.peso_kg && sv.talla_m ? parseFloat((sv.peso_kg / (sv.talla_m * sv.talla_m)).toFixed(2)) : null;
        
        const signoVital = await SignoVital.create({
          id_paciente: paciente.id_paciente,
          id_cita: citasCreadas[j]?.id_cita || null,
          fecha_medicion: fechasCitas[j],
          peso_kg: sv.peso_kg,
          talla_m: sv.talla_m,
          imc: imc,
          medida_cintura_cm: sv.medida_cintura_cm || null,
          presion_sistolica: sv.presion_sistolica,
          presion_diastolica: sv.presion_diastolica,
          glucosa_mg_dl: sv.glucosa_mg_dl || null,
          colesterol_mg_dl: sv.colesterol_mg_dl || null,
          trigliceridos_mg_dl: sv.trigliceridos_mg_dl || null,
          registrado_por: sv.registrado_por,
          observaciones: `Registro ${j + 1} de signos vitales`,
          fecha_creacion: fechasCitas[j]
        });
        logger.info(`   ✅ Signos vitales ${j + 1} creados (ID: ${signoVital.id_signo})`);
      }

      // 6. Crear diagnósticos
      logger.info('\n📋 Creando diagnósticos...');
      for (let j = 0; j < datos.diagnosticos.length; j++) {
        const diagnostico = await Diagnostico.create({
          id_cita: citasCreadas[j]?.id_cita || null,
          descripcion: datos.diagnosticos[j],
          fecha_registro: fechasCitas[j]
        });
        logger.info(`   ✅ Diagnóstico ${j + 1} creado (ID: ${diagnostico.id_diagnostico})`);
      }

      // 7. Crear historial de vacunas
      logger.info('\n💉 Creando historial de vacunación...');
      for (const nombreVacuna of datos.vacunas) {
        const vacuna = await Vacuna.findOne({ where: { nombre_vacuna: nombreVacuna } });
        if (vacuna) {
          const fechaAplicacion = new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000);
          const esquema = await EsquemaVacunacion.create({
            id_paciente: paciente.id_paciente,
            vacuna: nombreVacuna,
            fecha_aplicacion: fechaAplicacion.toISOString().split('T')[0],
            lote: `LOT-${Math.floor(Math.random() * 10000)}`,
            observaciones: `Aplicada en consultorio médico`,
            fecha_creacion: fechaAplicacion
          });
          logger.info(`   ✅ Vacuna "${nombreVacuna}" registrada (ID: ${esquema.id_esquema})`);
        } else {
          logger.warn(`   ⚠️  Vacuna "${nombreVacuna}" no encontrada en catálogo`);
        }
      }

      // 8. Asignar comorbilidades
      logger.info('\n🏥 Asignando comorbilidades...');
      for (const nombreComorbilidad of datos.comorbilidades) {
        const comorbilidad = await Comorbilidad.findOne({ where: { nombre_comorbilidad: nombreComorbilidad } });
        if (comorbilidad) {
          const fechaDeteccion = new Date(Date.now() - Math.floor(Math.random() * 1095) * 24 * 60 * 60 * 1000); // Últimos 3 años
          const anosPadecimiento = Math.floor((Date.now() - fechaDeteccion.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          
          const pacienteComorbilidad = await PacienteComorbilidad.findOrCreate({
            where: {
              id_paciente: paciente.id_paciente,
              id_comorbilidad: comorbilidad.id_comorbilidad
            },
            defaults: {
              id_paciente: paciente.id_paciente,
              id_comorbilidad: comorbilidad.id_comorbilidad,
              fecha_deteccion: fechaDeteccion.toISOString().split('T')[0],
              observaciones: `Diagnosticada en consulta médica`,
              anos_padecimiento: anosPadecimiento
            }
          });
          
          if (pacienteComorbilidad[1]) {
            logger.info(`   ✅ Comorbilidad "${nombreComorbilidad}" asignada (${anosPadecimiento} años de padecimiento)`);
          } else {
            logger.info(`   ⚠️  Comorbilidad "${nombreComorbilidad}" ya estaba asignada`);
          }
        } else {
          logger.warn(`   ⚠️  Comorbilidad "${nombreComorbilidad}" no encontrada en catálogo`);
        }
      }

      pacientesCreados.push({
        paciente: paciente,
        pin: datos.pin
      });

      logger.info(`\n✅ Paciente ${i + 1} completado: ${datos.nombre} ${datos.apellido_paterno} (ID: ${paciente.id_paciente})\n`);
    }

    // RESUMEN FINAL
    logger.info('\n✅ ========================================');
    logger.info('✅ PROCESO COMPLETADO');
    logger.info('✅ ========================================\n');
    logger.info('📋 RESUMEN DE PACIENTES CREADOS:\n');

    pacientesCreados.forEach((p, index) => {
      logger.info(`👤 PACIENTE ${index + 1}:`);
      logger.info(`   🔐 PIN: ${p.pin} (USAR ESTE PARA LOGIN)`);
      logger.info(`   👤 Nombre: ${p.paciente.nombre} ${p.paciente.apellido_paterno} ${p.paciente.apellido_materno || ''}`);
      logger.info(`   🆔 ID Paciente: ${p.paciente.id_paciente}`);
      logger.info(`   📞 Teléfono: ${p.paciente.numero_celular}`);
      logger.info(`   📅 Citas: 2`);
      logger.info(`   💓 Signos vitales: 2`);
      logger.info(`   📋 Diagnósticos: 2`);
      logger.info(`   💉 Vacunas: ${pacientesData[index].vacunas.length}`);
      logger.info(`   🏥 Comorbilidades: ${pacientesData[index].comorbilidades.length}`);
      logger.info('');
    });

    logger.info('✅ Todos los pacientes han sido creados y asignados al doctor correctamente\n');

  } catch (error) {
    logger.error('❌ Error:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

crearPacientesCompletos()
  .then(() => {
    logger.info('✅ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });

