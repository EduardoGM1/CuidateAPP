/**
 * Script para eliminar toda la base de datos y crear solo:
 * - 1 Administrador
 * - 1 Doctor
 * - 1 Paciente (Eduardo Gonzalez Gonzalez)
 * 
 * Ejecutar: node scripts/reset-db-completo.js
 */

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
  Medicamento,
  EsquemaVacunacion,
  RedApoyo,
  MensajeChat,
  SolicitudReprogramacion,
  SistemaAuditoria,
  NotificacionDoctor,
  AuthCredential,
  Vacuna
} from '../models/associations.js';
import bcrypt from 'bcrypt';
import UnifiedAuthService from '../services/unifiedAuthService.js';

// Orden de eliminación respetando foreign keys
const TABLAS_ELIMINAR = [
  'notificaciones_doctor',
  'sistema_auditoria',
  'solicitudes_reprogramacion',
  'mensajes_chat',
  'red_apoyo',
  'esquema_vacunacion',
  'plan_detalle',
  'plan_medicacion',
  'diagnosticos',
  'signos_vitales',
  'citas',
  'paciente_comorbilidad',
  'doctor_paciente',
  'pacientes',
  'doctores',
  'auth_credentials',
  'usuarios',
  'medicamentos',
  'vacunas',
  'comorbilidades',
  'modulos'
];

async function eliminarTodasLasTablas() {
  logger.info('🗑️  Eliminando todas las tablas...');
  
  // Desactivar verificación de foreign keys temporalmente
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  
  try {
    for (const tabla of TABLAS_ELIMINAR) {
      try {
        await sequelize.query(`TRUNCATE TABLE \`${tabla}\``);
        logger.info(`   ✅ ${tabla} truncada`);
      } catch (error) {
        // Si la tabla no existe, continuar
        if (error.message.includes("doesn't exist") || error.message.includes("Unknown table")) {
          logger.warn(`   ⚠️  Tabla ${tabla} no existe, omitiendo...`);
        } else {
          logger.warn(`   ⚠️  Error truncando ${tabla}: ${error.message}`);
        }
      }
    }
  } finally {
    // Reactivar verificación de foreign keys
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
  }
  
  logger.info('✅ Todas las tablas eliminadas\n');
}

async function crearModulo() {
  logger.info('📦 Creando módulo...');
  
  const { Modulo } = await import('../models/associations.js');
  
  const modulo = await Modulo.create({
    nombre_modulo: 'Módulo Principal',
    descripcion: 'Módulo principal del sistema',
    activo: true,
    fecha_creacion: new Date()
  });
  
  logger.info(`✅ Módulo creado: ${modulo.nombre_modulo} (ID: ${modulo.id_modulo})\n`);
  return modulo;
}

async function crearAdministrador() {
  logger.info('👤 Creando administrador...');
  
  const email = 'admin@clinica.com';
  const password = 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);
  
  const usuario = await Usuario.create({
    email,
    password_hash: passwordHash,
    rol: 'Admin',
    activo: true,
    fecha_creacion: new Date()
  });
  
  // Crear credencial en auth_credentials para el sistema unificado
  await AuthCredential.create({
    user_type: 'Admin',
    user_id: usuario.id_usuario,
    auth_method: 'password',
    credential_value: passwordHash,
    is_primary: true,
    activo: true,
    created_at: new Date(),
    updated_at: new Date()
  });
  
  logger.info(`✅ Administrador creado (ID: ${usuario.id_usuario})\n`);
  
  return {
    email,
    password,
    id_usuario: usuario.id_usuario
  };
}

async function crearDoctor(modulo) {
  logger.info('👨‍⚕️ Creando doctor...');
  
  const email = 'doctor@petalmail.com';
  const password = 'doctor123';
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Crear usuario
  const usuario = await Usuario.create({
    email,
    password_hash: passwordHash,
    rol: 'Doctor',
    activo: true,
    fecha_creacion: new Date()
  });
  
  // Crear credencial en auth_credentials para el sistema unificado
  await AuthCredential.create({
    user_type: 'Doctor',
    user_id: usuario.id_usuario,
    auth_method: 'password',
    credential_value: passwordHash,
    is_primary: true,
    activo: true,
    created_at: new Date(),
    updated_at: new Date()
  });
  
  // Crear perfil de doctor
  const doctor = await Doctor.create({
    id_usuario: usuario.id_usuario,
    nombre: 'Dr. Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: 'García',
    telefono: '5551234567',
    institucion_hospitalaria: 'Hospital General',
    grado_estudio: 'Especialidad',
    anos_servicio: 10,
    id_modulo: modulo.id_modulo,
    activo: true,
    fecha_registro: new Date()
  });
  
  logger.info(`✅ Doctor creado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})\n`);
  
  return {
    email,
    password,
    id_usuario: usuario.id_usuario,
    id_doctor: doctor.id_doctor
  };
}

async function crearPaciente(modulo, doctor) {
  logger.info('👤 Creando paciente: Eduardo Gonzalez Gonzalez...');
  
  const email = 'eduardo.gonzalez@temp.com';
  const password = 'paciente123';
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Crear usuario
  const usuario = await Usuario.create({
    email,
    password_hash: passwordHash,
    rol: 'Paciente',
    activo: true,
    fecha_creacion: new Date()
  });
  
  // Crear perfil de paciente
  const fechaNacimiento = new Date('1990-05-15');
  const paciente = await Paciente.create({
    id_usuario: usuario.id_usuario,
    nombre: 'Eduardo',
    apellido_paterno: 'Gonzalez',
    apellido_materno: 'Gonzalez',
    fecha_nacimiento: fechaNacimiento,
    sexo: 'Hombre',
    curp: 'GONE900515HMCNRD01',
    direccion: 'Calle Principal 123, Colonia Centro',
    localidad: 'Ciudad de México',
    numero_celular: '5551234567',
    institucion_salud: 'IMSS',
    id_modulo: modulo.id_modulo,
    activo: true,
    fecha_registro: new Date()
  });
  
  // Asignar doctor al paciente
  await DoctorPaciente.create({
    id_doctor: doctor.id_doctor,
    id_paciente: paciente.id_paciente,
    fecha_asignacion: new Date()
  });
  
  // Crear PIN para el paciente (los pacientes solo usan PIN para login)
  const pin = '2020';
  const deviceId = `device-${paciente.id_paciente}-${Date.now()}`;
  
  try {
    await UnifiedAuthService.setupCredential(
      'Paciente',
      paciente.id_paciente,
      'pin',
      pin,
      {
        deviceId: deviceId,
        deviceName: 'Dispositivo Principal',
        deviceType: 'mobile',
        isPrimary: true
      }
    );
    logger.info(`✅ PIN configurado para el paciente: ${pin}`);
  } catch (error) {
    logger.warn(`⚠️  Error configurando PIN: ${error.message}`);
  }
  
  logger.info(`✅ Paciente creado: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno} (ID: ${paciente.id_paciente})\n`);
  
  return {
    email,
    password,
    pin,
    id_usuario: usuario.id_usuario,
    id_paciente: paciente.id_paciente
  };
}

async function resetearBaseDatos() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado a la base de datos\n');
    
    // 1. Eliminar todas las tablas
    await eliminarTodasLasTablas();
    
    // 2. Crear módulo
    const modulo = await crearModulo();
    
    // 3. Crear administrador
    const admin = await crearAdministrador();
    
    // 4. Crear doctor
    const doctor = await crearDoctor(modulo);
    
    // 5. Crear paciente
    const paciente = await crearPaciente(modulo, doctor);
    
    // 6. Mostrar credenciales
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('📋 CREDENCIALES DEL SISTEMA');
    logger.info('═══════════════════════════════════════════════════════════════\n');
    
    logger.info('👤 ADMINISTRADOR:');
    logger.info(`   Email: ${admin.email}`);
    logger.info(`   Contraseña: ${admin.password}`);
    logger.info(`   ID Usuario: ${admin.id_usuario}\n`);
    
    logger.info('👨‍⚕️ DOCTOR:');
    logger.info(`   Email: ${doctor.email}`);
    logger.info(`   Contraseña: ${doctor.password}`);
    logger.info(`   ID Usuario: ${doctor.id_usuario}`);
    logger.info(`   ID Doctor: ${doctor.id_doctor}\n`);
    
    logger.info('👤 PACIENTE (Eduardo Gonzalez Gonzalez):');
    logger.info(`   Email: ${paciente.email}`);
    logger.info(`   Contraseña: ${paciente.password} (NO SE USA - Solo para referencia)`);
    logger.info(`   PIN: ${paciente.pin} (USAR ESTE PARA LOGIN)`);
    logger.info(`   ID Usuario: ${paciente.id_usuario}`);
    logger.info(`   ID Paciente: ${paciente.id_paciente}\n`);
    
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('✅ Base de datos reseteada y usuarios creados exitosamente');
    logger.info('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    logger.error('❌ Error reseteando base de datos:', error);
    if (error.stack) {
      logger.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    logger.info('🔌 Conexión cerrada');
  }
}

resetearBaseDatos();

