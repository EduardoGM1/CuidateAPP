import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';
import { 
  Usuario, 
  Paciente, 
  Doctor, 
  DoctorPaciente,
  Modulo,
  Comorbilidad,
  PacienteComorbilidad,
  Cita,
  SignoVital,
  Diagnostico,
  PlanMedicacion,
  PlanDetalle,
  Medicamento
} from '../models/associations.js';
import UnifiedAuthService from '../services/unifiedAuthService.js';
import bcrypt from 'bcryptjs';

async function crearEduardoCompleto() {
  const transaction = await sequelize.transaction();
  
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    logger.info('📝 CREANDO PACIENTE: Eduardo Gonzalez Gonzalez');
    logger.info('='.repeat(80));

    // 1. OBTENER DOCTOR ACTIVO
    logger.info('\n1️⃣ Buscando doctor activo...');
    const doctor = await Doctor.findOne({
      where: { activo: true },
      include: [{
        model: Usuario,
        attributes: ['email', 'rol']
      }],
      order: [['id_doctor', 'ASC']]
    });

    if (!doctor) {
      throw new Error('No se encontró ningún doctor activo en el sistema');
    }

    logger.info(`✅ Doctor encontrado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);

    // 2. OBTENER MÓDULO
    logger.info('\n2️⃣ Buscando módulo...');
    const modulo = await Modulo.findOne({
      order: [['id_modulo', 'ASC']]
    });

    if (!modulo) {
      throw new Error('No se encontró ningún módulo activo');
    }

    logger.info(`✅ Módulo encontrado: ${modulo.nombre_modulo} (ID: ${modulo.id_modulo})`);

    // 3. CREAR USUARIO PARA EL PACIENTE
    logger.info('\n3️⃣ Creando usuario para el paciente...');
    const email = `eduardo.gonzalez.${Date.now()}@temp.com`;
    const password = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(password, 10);

    const usuario = await Usuario.create({
      email,
      password_hash: hashedPassword,
      rol: 'Paciente',
      activo: true,
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`✅ Usuario creado (ID: ${usuario.id_usuario})`);

    // 4. CREAR PACIENTE
    logger.info('\n4️⃣ Creando paciente...');
    const fechaNacimiento = new Date('1990-05-15');
    const curp = 'GONE900515HMCNRD01'; // CURP generado para Eduardo Gonzalez Gonzalez
    
    const paciente = await Paciente.create({
      id_usuario: usuario.id_usuario,
      nombre: 'Eduardo',
      apellido_paterno: 'Gonzalez',
      apellido_materno: 'Gonzalez',
      fecha_nacimiento: fechaNacimiento,
      sexo: 'Hombre',
      curp: curp,
      direccion: 'Calle Principal 123, Colonia Centro',
      localidad: 'Ciudad de México',
      numero_celular: '5551234567',
      institucion_salud: 'IMSS',
      id_modulo: modulo.id_modulo,
      activo: true,
      fecha_registro: new Date()
    }, { transaction });

    logger.info(`✅ Paciente creado: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno} (ID: ${paciente.id_paciente})`);

    // 5. CONFIGURAR PIN
    logger.info('\n5️⃣ Configurando PIN: 2020...');
    const pin = '2020';
    const deviceId = `device_${Date.now()}_eduardo_${Math.random().toString(36).substring(2, 9)}`;

    try {
      await UnifiedAuthService.setupCredential(
        'Paciente',
        paciente.id_paciente,
        'pin',
        pin,
        {
          deviceId: deviceId,
          deviceName: `${paciente.nombre} ${paciente.apellido_paterno} - Mobile`,
          deviceType: 'mobile',
          isPrimary: true
        },
        transaction
      );
      logger.info(`✅ PIN configurado: ${pin}`);
    } catch (pinError) {
      logger.error('Error configurando PIN:', pinError);
      throw pinError;
    }

    // 6. ASIGNAR DOCTOR
    logger.info('\n6️⃣ Asignando paciente al doctor...');
    const [doctorPaciente, created] = await DoctorPaciente.findOrCreate({
      where: {
        id_doctor: doctor.id_doctor,
        id_paciente: paciente.id_paciente,
      },
      defaults: {
        fecha_asignacion: new Date(),
        activo: true,
      },
      transaction
    });

    logger.info(`✅ ${created ? 'Doctor asignado' : 'Ya estaba asignado'}`);

    // 7. ASIGNAR COMORBILIDADES
    logger.info('\n7️⃣ Asignando comorbilidades...');
    const comorbilidades = await Comorbilidad.findAll({
      limit: 3,
      order: sequelize.random()
    });

    if (comorbilidades.length > 0) {
      for (const comorbilidad of comorbilidades) {
        await PacienteComorbilidad.findOrCreate({
          where: {
            id_paciente: paciente.id_paciente,
            id_comorbilidad: comorbilidad.id_comorbilidad,
          },
          defaults: {
            fecha_deteccion: new Date('2024-01-15'),
            observaciones: 'Diagnóstico inicial'
          },
          transaction
        });
      }
      logger.info(`✅ ${comorbilidades.length} comorbilidades asignadas`);
    }

    // 8. CREAR CITAS
    logger.info('\n8️⃣ Creando citas...');
    
    // Cita pasada (hace 30 días)
    const citaPasada = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      fecha_cita: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      motivo: 'Consulta general',
      asistencia: true,
      es_primera_consulta: false,
      observaciones: 'Paciente en buen estado general'
    }, { transaction });

    // Cita futura (en 15 días)
    const citaFutura = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      fecha_cita: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      motivo: 'Seguimiento',
      asistencia: null,
      es_primera_consulta: false,
      observaciones: 'Cita de seguimiento programada'
    }, { transaction });

    logger.info(`✅ 2 citas creadas (1 pasada, 1 futura)`);

    // 9. CREAR SIGNOS VITALES
    logger.info('\n9️⃣ Creando signos vitales...');
    
    // Signos vitales recientes (3 registros)
    const signosVitalesData = [
      {
        id_paciente: paciente.id_paciente,
        id_cita: citaPasada.id_cita,
        fecha_medicion: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        peso_kg: 75.5,
        talla_m: 1.75,
        imc: 24.7,
        medida_cintura_cm: 85,
        presion_sistolica: 125,
        presion_diastolica: 80,
        glucosa_mg_dl: 95,
        colesterol_mg_dl: 180,
        trigliceridos_mg_dl: 120,
        registrado_por: 'doctor',
        observaciones: 'Signos vitales normales'
      },
      {
        id_paciente: paciente.id_paciente,
        fecha_medicion: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        peso_kg: 76.0,
        talla_m: 1.75,
        imc: 24.8,
        medida_cintura_cm: 86,
        presion_sistolica: 130,
        presion_diastolica: 85,
        glucosa_mg_dl: 100,
        colesterol_mg_dl: 185,
        trigliceridos_mg_dl: 125,
        registrado_por: 'paciente',
        observaciones: 'Registro del paciente'
      },
      {
        id_paciente: paciente.id_paciente,
        fecha_medicion: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        peso_kg: 74.8,
        talla_m: 1.75,
        imc: 24.4,
        medida_cintura_cm: 84,
        presion_sistolica: 120,
        presion_diastolica: 78,
        glucosa_mg_dl: 92,
        colesterol_mg_dl: 175,
        trigliceridos_mg_dl: 115,
        registrado_por: 'doctor',
        observaciones: 'Control rutinario'
      }
    ];

    for (const signoData of signosVitalesData) {
      await SignoVital.create(signoData, { transaction });
    }

    logger.info(`✅ ${signosVitalesData.length} registros de signos vitales creados`);

    // 10. CREAR DIAGNÓSTICOS
    logger.info('\n🔟 Creando diagnósticos...');
    
    const diagnostico1 = await Diagnostico.create({
      id_cita: citaPasada.id_cita,
      descripcion: 'Paciente en buen estado general. Signos vitales dentro de parámetros normales. Se recomienda continuar con dieta balanceada y ejercicio regular.',
      fecha_registro: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    }, { transaction });

    logger.info(`✅ 1 diagnóstico creado para la cita pasada`);

    // 11. CREAR PLAN DE MEDICACIÓN
    logger.info('\n1️⃣1️⃣ Creando plan de medicación...');
    
    const planMedicacion = await PlanMedicacion.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      id_cita: citaPasada.id_cita,
      fecha_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      fecha_fin: null, // En curso
      observaciones: 'Medicación de mantenimiento',
      activo: true
    }, { transaction });

    // Obtener medicamentos disponibles
    const medicamentos = await Medicamento.findAll({
      limit: 2,
      order: sequelize.random()
    });

    if (medicamentos.length > 0) {
      for (const medicamento of medicamentos) {
        await PlanDetalle.create({
          id_plan: planMedicacion.id_plan,
          id_medicamento: medicamento.id_medicamento,
          dosis: '1 tableta',
          frecuencia: 'Cada 8 horas',
          horario: '08:00, 16:00, 00:00',
          via_administracion: 'Oral',
          observaciones: 'Tomar con alimentos'
        }, { transaction });
      }
      logger.info(`✅ Plan de medicación creado con ${medicamentos.length} medicamento(s)`);
    } else {
      logger.warn('⚠️  No se encontraron medicamentos disponibles');
    }

    // 12. CREAR RED DE APOYO
    logger.info('\n1️⃣2️⃣ Creando red de apoyo...');
    
    const { RedApoyo } = await import('../models/associations.js');
    
    const redApoyoData = [
      {
        id_paciente: paciente.id_paciente,
        nombre_contacto: 'María González',
        parentesco: 'Esposa',
        numero_celular: '5559876543'
      },
      {
        id_paciente: paciente.id_paciente,
        nombre_contacto: 'Carlos González',
        parentesco: 'Hermano',
        numero_celular: '5559876544'
      }
    ];

    for (const contacto of redApoyoData) {
      await RedApoyo.create(contacto, { transaction });
    }

    logger.info(`✅ ${redApoyoData.length} contactos de red de apoyo creados`);

    // Commit de la transacción
    await transaction.commit();

    logger.info('\n' + '='.repeat(80));
    logger.info('✅ PACIENTE CREADO EXITOSAMENTE');
    logger.info('='.repeat(80));
    logger.info('\n📋 RESUMEN:');
    logger.info(`   👤 Paciente: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}`);
    logger.info(`   🆔 ID Paciente: ${paciente.id_paciente}`);
    logger.info(`   🔢 PIN: ${pin}`);
    logger.info(`   👨‍⚕️ Doctor: ${doctor.nombre} ${doctor.apellido_paterno}`);
    logger.info(`   📅 Citas: 2 (1 pasada, 1 futura)`);
    logger.info(`   💓 Signos Vitales: ${signosVitalesData.length}`);
    logger.info(`   🩺 Diagnósticos: 1`);
    logger.info(`   💊 Medicamentos: ${medicamentos.length}`);
    logger.info(`   🦠 Comorbilidades: ${comorbilidades.length}`);
    logger.info(`   👥 Red de Apoyo: ${redApoyoData.length}`);
    logger.info('\n📱 CREDENCIALES PARA LOGIN:');
    logger.info('================================================================================');
    logger.info(`   ID Paciente: ${paciente.id_paciente}`);
    logger.info(`   PIN: ${pin}`);
    logger.info(`   Device ID: ${deviceId}`);
    logger.info('\n🔗 Endpoint: POST /api/auth-unified/login-paciente');
    logger.info('📦 Body:');
    logger.info(`{`);
    logger.info(`  "id_paciente": ${paciente.id_paciente},`);
    logger.info(`  "pin": "${pin}",`);
    logger.info(`  "device_id": "${deviceId}"`);
    logger.info(`}`);
    logger.info('================================================================================');

  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error creando paciente:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1]?.includes('crear-eduardo-completo')) {
  crearEduardoCompleto()
    .then(() => {
      logger.info('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('\n❌ Error fatal:', error);
      console.error('Error detallado:', error);
      process.exit(1);
    });
}

export default crearEduardoCompleto;

