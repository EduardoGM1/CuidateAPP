import sequelize from '../config/db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// Importar modelos
import {
  Usuario,
  Paciente,
  Doctor,
  Modulo,
  DoctorPaciente,
  RedApoyo,
  Cita,
  SignoVital,
  Diagnostico,
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  EsquemaVacunacion,
  Vacuna,
  PacienteComorbilidad,
  Comorbilidad,
  DeteccionComplicacion,
  MensajeChat,
  SesionEducativa,
  SaludBucal,
  DeteccionTuberculosis,
  PuntoChequeo,
  SolicitudReprogramacion,
  NotificacionDoctor,
  AuthCredential
} from '../models/associations.js';

import UnifiedAuthService from '../services/unifiedAuthService.js';
import logger from '../utils/logger.js';
import EncryptionService from '../services/encryptionService.js';

/**
 * Script para:
 * 1. Eliminar todos los pacientes del doctor con email doctor@clinica.com
 * 2. Crear 1 paciente nuevo con datos completos:
 *    - Primera cita registrada
 *    - Signos vitales completos (encriptados)
 *    - Diagnóstico
 *    - Plan de medicación
 *    - Todos los datos necesarios
 */

const DOCTOR_EMAIL = 'doctor@clinica.com';

async function limpiarPacientesYCrearUnoCompleto() {
  let transaction;
  
  try {
    // Intentar conectar usando Sequelize (igual que otros scripts que funcionaron)
    logger.info('🔍 Conectando a la base de datos...');
    await sequelize.authenticate();
    logger.info('✅ Conexión establecida\n');
    
    transaction = await sequelize.transaction();
  } catch (error) {
    if (error.message && error.message.includes('mysql_native_password')) {
      logger.error('❌ Error de autenticación MySQL.');
      logger.error('   El usuario está configurado para usar mysql_native_password pero el plugin no está cargado.');
      logger.info('\n💡 SOLUCIÓN: Ejecuta en MySQL (como root o usuario con privilegios):');
      logger.info(`   ALTER USER '${process.env.DB_USER || 'root'}'@'localhost' IDENTIFIED WITH caching_sha2_password BY '${process.env.DB_PASSWORD || 'tu_password'}';`);
      logger.info('   FLUSH PRIVILEGES;');
      logger.info('\n   O si necesitas mantener mysql_native_password:');
      logger.info('   INSTALL PLUGIN mysql_native_password SONAME \'auth_native_password.so\';');
      logger.info(`   ALTER USER '${process.env.DB_USER || 'root'}'@'localhost' IDENTIFIED WITH mysql_native_password BY '${process.env.DB_PASSWORD || 'tu_password'}';`);
      logger.info('   FLUSH PRIVILEGES;\n');
      throw new Error('Error de autenticación MySQL. Ver logs arriba para solución.');
    }
    logger.error('❌ Error conectando a la base de datos:', error.message);
    throw error;
  }

  try {
    logger.info('🚀 Iniciando limpieza y creación de paciente completo...\n');

    // 1. Buscar doctor por email
    logger.info('1️⃣ Buscando doctor con email doctor@clinica.com...');
    const usuarioDoctor = await Usuario.findOne({
      where: { email: DOCTOR_EMAIL, rol: 'Doctor' },
      transaction
    });

    if (!usuarioDoctor) {
      throw new Error('❌ ERROR: No se encontró doctor con email doctor@clinica.com');
    }

    const doctor = await Doctor.findOne({
      where: { id_usuario: usuarioDoctor.id_usuario },
      transaction
    });

    if (!doctor) {
      throw new Error('❌ ERROR: No se encontró registro de doctor asociado');
    }

    logger.info(`✅ Doctor encontrado (ID: ${doctor.id_doctor})\n`);

    // 2. Obtener todos los pacientes asignados a este doctor
    logger.info('2️⃣ Obteniendo pacientes asignados al doctor...');
    const asignaciones = await DoctorPaciente.findAll({
      where: { id_doctor: doctor.id_doctor },
      transaction
    });

    const pacienteIds = asignaciones.map(a => a.id_paciente);
    logger.info(`   📋 Encontrados ${pacienteIds.length} pacientes asignados\n`);

    // 3. Eliminar todos los datos relacionados de los pacientes
    if (pacienteIds.length > 0) {
      logger.info('3️⃣ Eliminando datos relacionados de pacientes...');
      
      // Eliminar en orden (respetando foreign keys)
      await MensajeChat.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await SolicitudReprogramacion.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await DeteccionTuberculosis.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await SaludBucal.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await SesionEducativa.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await DeteccionComplicacion.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await EsquemaVacunacion.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await PacienteComorbilidad.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      await RedApoyo.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      
      // Eliminar planes de medicación y detalles
      const planes = await PlanMedicacion.findAll({
        where: { id_paciente: { [Op.in]: pacienteIds } },
        attributes: ['id_plan'],
        transaction
      });
      const planIds = planes.map(p => p.id_plan);
      if (planIds.length > 0) {
        await PlanDetalle.destroy({ where: { id_plan: { [Op.in]: planIds } }, transaction });
        await PlanMedicacion.destroy({ where: { id_plan: { [Op.in]: planIds } }, transaction });
      }
      
      // Obtener citas primero para eliminar diagnósticos asociados
      const citas = await Cita.findAll({
        where: { id_paciente: { [Op.in]: pacienteIds } },
        attributes: ['id_cita'],
        transaction
      });
      const citaIds = citas.map(c => c.id_cita);
      
      // Eliminar diagnósticos por id_cita
      if (citaIds.length > 0) {
        await Diagnostico.destroy({ where: { id_cita: { [Op.in]: citaIds } }, transaction });
      }
      
      // Eliminar signos vitales
      await SignoVital.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      
      // Eliminar citas
      await Cita.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      
      // Eliminar asignaciones doctor-paciente
      await DoctorPaciente.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      
      // Eliminar credenciales de autenticación
      const pacientes = await Paciente.findAll({
        where: { id_paciente: { [Op.in]: pacienteIds } },
        attributes: ['id_usuario'],
        transaction
      });
      const usuarioIds = pacientes.map(p => p.id_usuario).filter(Boolean);
      if (usuarioIds.length > 0) {
        await AuthCredential.destroy({ where: { id_usuario: { [Op.in]: usuarioIds } }, transaction });
      }
      
      // Eliminar pacientes
      await Paciente.destroy({ where: { id_paciente: { [Op.in]: pacienteIds } }, transaction });
      
      // Eliminar usuarios asociados
      if (usuarioIds.length > 0) {
        await Usuario.destroy({ where: { id_usuario: { [Op.in]: usuarioIds } }, transaction });
      }
      
      logger.info(`   ✅ Eliminados ${pacienteIds.length} pacientes y todos sus datos relacionados\n`);
    } else {
      logger.info('   ℹ️  No hay pacientes asignados para eliminar\n');
    }

    // 4. Obtener módulo (usar el primero disponible o crear uno por defecto)
    logger.info('4️⃣ Obteniendo módulo...');
    let modulo = await Modulo.findOne({ transaction });
    if (!modulo) {
      modulo = await Modulo.create({
        nombre: 'Módulo Principal',
        descripcion: 'Módulo principal del sistema',
        activo: true
      }, { transaction });
      logger.info('   ✅ Módulo creado');
    } else {
      logger.info(`   ✅ Módulo encontrado (ID: ${modulo.id_modulo})`);
    }

    // 5. Crear nuevo paciente con datos completos
    logger.info('\n5️⃣ Creando nuevo paciente con datos completos...');
    
    const fechaNacimiento = new Date('1985-05-15');
    const fechaNacimientoEncrypted = EncryptionService.encryptField(fechaNacimiento.toISOString().split('T')[0]);
    
    // Crear usuario para el paciente
    const passwordHash = await bcrypt.hash('Paciente123!', 10);
    const usuarioPaciente = await Usuario.create({
      email: `paciente.test.${Date.now()}@clinica.com`,
      password_hash: passwordHash,
      rol: 'Paciente',
      activo: true,
      fecha_creacion: new Date()
    }, { transaction });

    // Crear paciente
    const paciente = await Paciente.create({
      id_usuario: usuarioPaciente.id_usuario,
      nombre: EncryptionService.encryptField('María'),
      apellido_paterno: EncryptionService.encryptField('González'),
      apellido_materno: EncryptionService.encryptField('López'),
      fecha_nacimiento: fechaNacimientoEncrypted,
      sexo: 'F',
      curp: EncryptionService.encryptField('GOLL850515MDFRPR01'),
      telefono: EncryptionService.encryptField('5551234567'),
      numero_celular: EncryptionService.encryptField('5559876543'),
      email: usuarioPaciente.email,
      direccion: EncryptionService.encryptField('Calle Principal 123, Colonia Centro'),
      estado: 'Ciudad de México',
      localidad: 'Ciudad de México',
      institucion_salud: 'IMSS',
      id_modulo: modulo.id_modulo,
      activo: true,
      fecha_creacion: new Date()
    }, { transaction });

    logger.info(`   ✅ Paciente creado (ID: ${paciente.id_paciente})`);

    // Crear credencial de autenticación con PIN
    await UnifiedAuthService.setupCredential(
      'Paciente',
      paciente.id_usuario,
      { pin: '2020' },
      transaction
    );
    logger.info('   ✅ Credencial de autenticación creada (PIN: 2020)');

    // Asignar paciente al doctor
    await DoctorPaciente.create({
      id_doctor: doctor.id_doctor,
      id_paciente: paciente.id_paciente,
      fecha_asignacion: new Date(),
      activo: true
    }, { transaction });
    logger.info('   ✅ Paciente asignado al doctor');

    // 6. Crear primera cita
    logger.info('\n6️⃣ Creando primera cita...');
    const fechaCita = new Date();
    fechaCita.setHours(10, 0, 0, 0);
    
    const cita = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      fecha_cita: fechaCita,
      estado: 'atendida',
      asistencia: true,
      es_primera_consulta: true,
      motivo: EncryptionService.encryptField('Consulta de rutina y evaluación general'),
      observaciones: EncryptionService.encryptField('Paciente en buen estado general. Se realizará evaluación completa.'),
      fecha_creacion: new Date()
    }, { transaction });
    logger.info(`   ✅ Cita creada (ID: ${cita.id_cita})`);

    // 7. Crear signos vitales completos (con encriptación)
    logger.info('\n7️⃣ Creando signos vitales completos...');
    const signosVitales = await SignoVital.create({
      id_paciente: paciente.id_paciente,
      id_cita: cita.id_cita,
      fecha_medicion: fechaCita,
      peso_kg: 65.5,
      talla_m: 1.65,
      imc: 24.1,
      medida_cintura_cm: 78.0,
      presion_sistolica: EncryptionService.encryptField('120'),
      presion_diastolica: EncryptionService.encryptField('80'),
      glucosa_mg_dl: EncryptionService.encryptField('95'),
      colesterol_mg_dl: EncryptionService.encryptField('180'),
      colesterol_ldl: EncryptionService.encryptField('110'),
      colesterol_hdl: EncryptionService.encryptField('55'),
      trigliceridos_mg_dl: EncryptionService.encryptField('120'),
      hba1c_porcentaje: EncryptionService.encryptField('5.5'),
      edad_paciente_en_medicion: 38,
      registrado_por: 'doctor',
      observaciones: EncryptionService.encryptField('Signos vitales dentro de parámetros normales. Paciente en buen estado general.'),
      fecha_creacion: new Date()
    }, { transaction });
    logger.info(`   ✅ Signos vitales creados (ID: ${signosVitales.id_signo})`);

    // 8. Crear diagnóstico
    logger.info('\n8️⃣ Creando diagnóstico...');
    const diagnostico = await Diagnostico.create({
      id_paciente: paciente.id_paciente,
      id_cita: cita.id_cita,
      fecha_registro: fechaCita,
      descripcion: EncryptionService.encryptField('Paciente sana. Control de rutina. Sin patologías detectadas. Se recomienda seguimiento en 6 meses.'),
      fecha_creacion: new Date()
    }, { transaction });
    logger.info(`   ✅ Diagnóstico creado (ID: ${diagnostico.id_diagnostico})`);

    // 9. Crear plan de medicación
    logger.info('\n9️⃣ Creando plan de medicación...');
    
    // Buscar o crear medicamento
    let medicamento = await Medicamento.findOne({
      where: { nombre: 'Ácido Acetilsalicílico' },
      transaction
    });
    
    if (!medicamento) {
      medicamento = await Medicamento.create({
        nombre: 'Ácido Acetilsalicílico',
        descripcion: 'Antiagregante plaquetario',
        activo: true
      }, { transaction });
    }

    const planMedicacion = await PlanMedicacion.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctor.id_doctor,
      id_cita: cita.id_cita,
      fecha_inicio: fechaCita,
      fecha_fin: new Date(fechaCita.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 días
      observaciones: EncryptionService.encryptField('Plan de medicación preventivo. Tomar con alimentos.'),
      fecha_creacion: new Date()
    }, { transaction });

    await PlanDetalle.create({
      id_plan: planMedicacion.id_plan,
      id_medicamento: medicamento.id_medicamento,
      dosis: '100 mg',
      frecuencia: 'Una vez al día',
      duracion_dias: 30,
      instrucciones: 'Tomar con el desayuno',
      fecha_creacion: new Date()
    }, { transaction });
    
    logger.info(`   ✅ Plan de medicación creado (ID: ${planMedicacion.id_plan})`);

    // 10. Crear comorbilidad (opcional)
    logger.info('\n🔟 Creando comorbilidad...');
    let comorbilidad = await Comorbilidad.findOne({
      where: { nombre: 'Hipertensión Arterial' },
      transaction
    });
    
    if (!comorbilidad) {
      comorbilidad = await Comorbilidad.create({
        nombre: 'Hipertensión Arterial',
        descripcion: 'Presión arterial elevada',
        activo: true
      }, { transaction });
    }

    await PacienteComorbilidad.create({
      id_paciente: paciente.id_paciente,
      id_comorbilidad: comorbilidad.id_comorbilidad,
      fecha_diagnostico: fechaCita,
      diagnostico_basal: EncryptionService.encryptField('Hipertensión controlada'),
      tratamiento_actual: EncryptionService.encryptField('Control con dieta y ejercicio'),
      activo: true,
      fecha_creacion: new Date()
    }, { transaction });
    logger.info('   ✅ Comorbilidad creada');

    await transaction.commit();

    logger.info('\n✅ ✅ ✅ PROCESO COMPLETADO EXITOSAMENTE ✅ ✅ ✅\n');
    logger.info('📊 RESUMEN:');
    logger.info(`   👤 Paciente ID: ${paciente.id_paciente}`);
    logger.info(`   📧 Email: ${usuarioPaciente.email}`);
    logger.info(`   🔐 PIN: 2020`);
    logger.info(`   📅 Cita ID: ${cita.id_cita}`);
    logger.info(`   💓 Signos Vitales ID: ${signosVitales.id_signo}`);
    logger.info(`   📋 Diagnóstico ID: ${diagnostico.id_diagnostico}`);
    logger.info(`   💊 Plan Medicación ID: ${planMedicacion.id_plan}`);
    logger.info(`   👨‍⚕️  Doctor: ${DOCTOR_EMAIL}\n`);

    return {
      pacienteId: paciente.id_paciente,
      citaId: cita.id_cita,
      signosVitalesId: signosVitales.id_signo,
      diagnosticoId: diagnostico.id_diagnostico,
      planMedicacionId: planMedicacion.id_plan
    };

  } catch (error) {
    await transaction.rollback();
    logger.error('❌ ERROR en el proceso:', error);
    throw error;
  }
}

// Ejecutar script
limpiarPacientesYCrearUnoCompleto()
  .then((result) => {
    logger.info('\n✅ Script ejecutado exitosamente');
    logger.info('📋 IDs generados:', result);
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });

