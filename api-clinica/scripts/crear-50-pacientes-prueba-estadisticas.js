/**
 * Script para crear datos de prueba completos para estadísticas:
 * 1. 1 Usuario Administrador
 * 2. 5 Doctores
 * 3. 50 Pacientes con datos variados:
 *    - Diferentes edades (rangos: 0-18, 19-35, 36-50, 51-65, 65+)
 *    - Diferentes géneros
 *    - Asignados a diferentes doctores
 * 4. Citas variadas:
 *    - Diferentes estados (pendiente, atendida, cancelada, perdida)
 *    - Diferentes días de la semana
 *    - Distribuidas en los últimos 6 meses
 */

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
  Cita,
  SignoVital,
  AuthCredential
} from '../models/associations.js';

import EncryptionService from '../services/encryptionService.js';
import logger from '../utils/logger.js';

// Nombres y apellidos para generar datos realistas
const nombres = [
  'María', 'José', 'Ana', 'Carlos', 'Laura', 'Miguel', 'Carmen', 'Juan', 'Patricia', 'Roberto',
  'Guadalupe', 'Francisco', 'Rosa', 'Antonio', 'Martha', 'Pedro', 'Sofía', 'Luis', 'Elena', 'Fernando',
  'Alejandra', 'Ricardo', 'Gabriela', 'Javier', 'Diana', 'Manuel', 'Claudia', 'Alejandro', 'Verónica', 'Daniel',
  'Adriana', 'Eduardo', 'Lucía', 'Andrés', 'Paola', 'Sergio', 'Natalia', 'Raúl', 'Mariana', 'Diego',
  'Valeria', 'Óscar', 'Andrea', 'Arturo', 'Isabel', 'Héctor', 'Monica', 'Gustavo', 'Teresa', 'Rodrigo'
];

const apellidos = [
  'García', 'Rodríguez', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores',
  'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Morales', 'Ortiz', 'Gutiérrez', 'Chávez', 'Ramos', 'Herrera',
  'Jiménez', 'Ruiz', 'Mendoza', 'Aguilar', 'Vargas', 'Castro', 'Romero', 'Moreno', 'Delgado', 'Hernández'
];

const generos = ['Hombre', 'Mujer']; // Valores aceptados en BD (ENUM)
const generosCompletos = ['Masculino', 'Femenino']; // Para estadísticas
const estadosCitas = ['pendiente', 'atendida', 'cancelada', 'no_asistida', 'reprogramada'];
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Función para generar fecha de nacimiento según rango de edad
function generarFechaNacimiento(rangoEdad) {
  const hoy = new Date();
  let añoNacimiento;
  
  switch(rangoEdad) {
    case '0-18':
      añoNacimiento = hoy.getFullYear() - Math.floor(Math.random() * 19); // 0-18 años
      break;
    case '19-35':
      añoNacimiento = hoy.getFullYear() - 19 - Math.floor(Math.random() * 17); // 19-35 años
      break;
    case '36-50':
      añoNacimiento = hoy.getFullYear() - 36 - Math.floor(Math.random() * 15); // 36-50 años
      break;
    case '51-65':
      añoNacimiento = hoy.getFullYear() - 51 - Math.floor(Math.random() * 15); // 51-65 años
      break;
    case '65+':
      añoNacimiento = hoy.getFullYear() - 65 - Math.floor(Math.random() * 30); // 65-95 años
      break;
    default:
      añoNacimiento = hoy.getFullYear() - 30;
  }
  
  const mes = Math.floor(Math.random() * 12);
  const dia = Math.floor(Math.random() * 28) + 1;
  return new Date(añoNacimiento, mes, dia);
}

// Función para generar CURP
function generarCURP(nombre, apellidoPaterno, apellidoMaterno, fechaNac, genero) {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const iniciales = apellidoPaterno[0] + apellidoMaterno[0] + nombre[0];
  const año = fechaNac.getFullYear().toString().slice(-2);
  const mes = String(fechaNac.getMonth() + 1).padStart(2, '0');
  const dia = String(fechaNac.getDate()).padStart(2, '0');
  const letraGenero = (genero === 'Femenino' || genero === 'Mujer' || genero === 'F') ? 'M' : 'H';
  const random = Array.from({ length: 3 }, () => letras[Math.floor(Math.random() * letras.length)]).join('');
  const digito = Math.floor(Math.random() * 10);
  
  return `${iniciales}${año}${mes}${dia}${letraGenero}${random}${digito}`;
}

// Función para generar número de teléfono
function generarTelefono() {
  return `555${Math.floor(Math.random() * 9000) + 1000}${Math.floor(Math.random() * 9000) + 1000}`;
}

// Función para generar fecha de cita en un día específico de la semana
function generarFechaCitaDiaSemana(diaSemana, offsetSemanas = 0) {
  const hoy = new Date();
  const diaActual = hoy.getDay(); // 0 = Domingo, 1 = Lunes, etc.
  const diasSemanaNum = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const diaObjetivo = diasSemanaNum.indexOf(diaSemana);
  
  // Calcular días hasta el próximo día objetivo
  let diasHasta = (diaObjetivo - diaActual + 7) % 7;
  if (diasHasta === 0) diasHasta = 7; // Si es hoy, usar la próxima semana
  
  // Retroceder según offsetSemanas
  const fecha = new Date(hoy);
  fecha.setDate(fecha.getDate() + diasHasta - (offsetSemanas * 7));
  
  // Agregar hora aleatoria entre 8:00 y 17:00
  fecha.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 4) * 15, 0, 0);
  
  return fecha;
}

async function crearDatosPruebaEstadisticas() {
  let transaction;
  
  try {
    logger.info('🔍 Conectando a la base de datos...');
    await sequelize.authenticate();
    logger.info('✅ Conexión establecida\n');
    
    transaction = await sequelize.transaction();

    logger.info('🚀 Iniciando creación de datos de prueba para estadísticas...\n');

    // 1. Limpiar datos existentes (opcional - comentar si no se desea limpiar)
    logger.info('1️⃣ Limpiando datos existentes...');
    
    // Obtener IDs de usuarios a preservar (admin y doctor por defecto)
    const usuariosPreservar = await Usuario.findAll({
      where: {
        email: { [Op.in]: ['admin@clinica.com', 'doctor@clinica.com'] },
        rol: { [Op.in]: ['Admin', 'Doctor'] }
      },
      attributes: ['id_usuario'],
      transaction
    });
    const idsUsuariosPreservar = usuariosPreservar.map(u => u.id_usuario);
    
    // Obtener IDs de doctores a preservar
    const doctoresPreservar = await Doctor.findAll({
      where: { id_usuario: { [Op.in]: idsUsuariosPreservar } },
      attributes: ['id_doctor'],
      transaction
    });
    const idsDoctoresPreservar = doctoresPreservar.map(d => d.id_doctor);
    
    await Cita.destroy({ where: {}, transaction, force: true });
    await SignoVital.destroy({ where: {}, transaction, force: true });
    await DoctorPaciente.destroy({ where: {}, transaction, force: true });
    await AuthCredential.destroy({ where: {}, transaction, force: true });
    await Paciente.destroy({ where: {}, transaction, force: true });
    
    // Eliminar doctores excepto los preservados
    if (idsDoctoresPreservar.length > 0) {
      await Doctor.destroy({ 
        where: { id_doctor: { [Op.notIn]: idsDoctoresPreservar } }, 
        transaction, 
        force: true 
      });
    } else {
      await Doctor.destroy({ where: {}, transaction, force: true });
    }
    
    // Eliminar usuarios excepto admin y doctor por defecto
    if (idsUsuariosPreservar.length > 0) {
      await Usuario.destroy({ 
        where: { id_usuario: { [Op.notIn]: idsUsuariosPreservar } }, 
        transaction, 
        force: true 
      });
    } else {
      await Usuario.destroy({ 
        where: { 
          email: { [Op.ne]: 'admin@clinica.com' },
          rol: { [Op.ne]: 'Admin' }
        }, 
        transaction, 
        force: true 
      });
    }
    
    logger.info('✅ Datos limpiados\n');

    // 2. Obtener o crear módulo
    logger.info('2️⃣ Obteniendo módulo...');
    let modulo = await Modulo.findOne({ transaction });
    if (!modulo) {
      modulo = await Modulo.create({
        nombre_modulo: 'Módulo Principal',
        descripcion: 'Módulo principal del sistema',
        activo: true
      }, { transaction });
      logger.info('   ✅ Módulo creado');
    } else {
      logger.info(`   ✅ Módulo encontrado (ID: ${modulo.id_modulo})`);
    }

    // 3. Crear Administrador
    logger.info('\n3️⃣ Creando administrador...');
    let adminUsuario = await Usuario.findOne({
      where: { email: 'admin@clinica.com', rol: 'Admin' },
      transaction
    });

    if (!adminUsuario) {
      const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
      adminUsuario = await Usuario.create({
        email: 'admin@clinica.com',
        password_hash: adminPasswordHash,
        rol: 'Admin',
        activo: true,
        fecha_creacion: new Date()
      }, { transaction });
      logger.info('   ✅ Administrador creado');
    } else {
      logger.info('   ✅ Administrador ya existe');
    }
    logger.info(`   📧 Email: admin@clinica.com`);
    logger.info(`   🔑 Password: Admin123!`);

    // 4. Crear 5 Doctores
    logger.info('\n4️⃣ Creando 5 doctores...');
    const doctores = [];
    const especialidades = ['Medicina General', 'Cardiología', 'Endocrinología', 'Pediatría', 'Geriatría'];
    
    for (let i = 0; i < 5; i++) {
      const nombre = nombres[i * 2];
      const apellidoPaterno = apellidos[i * 2];
      const apellidoMaterno = apellidos[i * 2 + 1];
      const email = `doctor${i + 1}@clinica.com`;
      
      let doctorUsuario = await Usuario.findOne({
        where: { email },
        transaction
      });

      if (!doctorUsuario) {
        const passwordHash = await bcrypt.hash('Doctor123!', 10);
        doctorUsuario = await Usuario.create({
          email,
          password_hash: passwordHash,
          rol: 'Doctor',
          activo: true,
          fecha_creacion: new Date()
        }, { transaction });
      }

      let doctor = await Doctor.findOne({
        where: { id_usuario: doctorUsuario.id_usuario },
        transaction
      });

      if (!doctor) {
        doctor = await Doctor.create({
          id_usuario: doctorUsuario.id_usuario,
          nombre,
          apellido_paterno: apellidoPaterno,
          apellido_materno: apellidoMaterno,
          especialidad: especialidades[i],
          numero_cedula: `DOC${String(i + 1).padStart(6, '0')}`,
          telefono: generarTelefono(),
          activo: true,
          fecha_creacion: new Date()
        }, { transaction });
      }

      doctores.push(doctor);
      logger.info(`   ✅ Doctor ${i + 1}: ${nombre} ${apellidoPaterno} (${especialidades[i]})`);
    }

    // 5. Crear 50 Pacientes con distribución variada
    logger.info('\n5️⃣ Creando 50 pacientes con datos variados...');
    
    // Distribución de pacientes por rango de edad
    const distribucionEdad = {
      '0-18': 8,    // 8 pacientes
      '19-35': 12,  // 12 pacientes
      '36-50': 15,  // 15 pacientes
      '51-65': 10,  // 10 pacientes
      '65+': 5      // 5 pacientes
    };

    // Distribución de pacientes por género (aproximadamente 50/50)
    const pacientes = [];
    let contadorEdad = { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
    let indiceNombre = 10; // Empezar después de los nombres usados para doctores

    for (let i = 0; i < 50; i++) {
      // Determinar rango de edad
      let rangoEdad = '36-50'; // Por defecto
      for (const [rango, max] of Object.entries(distribucionEdad)) {
        if (contadorEdad[rango] < max) {
          rangoEdad = rango;
          contadorEdad[rango]++;
          break;
        }
      }

      const fechaNacimiento = generarFechaNacimiento(rangoEdad);
      const fechaNacimientoEncrypted = EncryptionService.encryptField(
        fechaNacimiento.toISOString().split('T')[0]
      );

      // Alternar género aproximadamente
      const genero = i % 2 === 0 ? generos[0] : generos[1]; // M o F
      const generoCompleto = i % 2 === 0 ? generosCompletos[0] : generosCompletos[1]; // Para estadísticas
      
      const nombre = nombres[indiceNombre % nombres.length];
      const apellidoPaterno = apellidos[indiceNombre % apellidos.length];
      const apellidoMaterno = apellidos[(indiceNombre + 1) % apellidos.length];
      indiceNombre++;

      const curp = generarCURP(nombre, apellidoPaterno, apellidoMaterno, fechaNacimiento, generoCompleto);
      const telefono = generarTelefono();
      const email = `paciente${i + 1}.${Date.now()}@clinica.com`;

      // Crear usuario
      const passwordHash = await bcrypt.hash('Paciente123!', 10);
      const usuarioPaciente = await Usuario.create({
        email,
        password_hash: passwordHash,
        rol: 'Paciente',
        activo: true,
        fecha_creacion: new Date()
      }, { transaction });

      // Crear paciente
      const paciente = await Paciente.create({
        id_usuario: usuarioPaciente.id_usuario,
        nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno,
        fecha_nacimiento: fechaNacimientoEncrypted,
        sexo: genero, // M o F para BD
        genero: generoCompleto, // Masculino/Femenino para estadísticas
        curp: EncryptionService.encryptField(curp),
        telefono: EncryptionService.encryptField(telefono),
        numero_celular: EncryptionService.encryptField(telefono),
        email,
        direccion: EncryptionService.encryptField(`Calle ${Math.floor(Math.random() * 1000) + 1}, Col. Centro`),
        estado: 'Ciudad de México',
        localidad: 'Ciudad de México',
        institucion_salud: ['IMSS', 'ISSSTE', 'Bienestar', 'Particular'][Math.floor(Math.random() * 4)],
        id_modulo: modulo.id_modulo,
        activo: true,
        estado: 'activo',
        fecha_creacion: new Date()
      }, { transaction });

      // Asignar paciente a un doctor (distribuir entre los 5 doctores)
      const doctorAsignado = doctores[i % doctores.length];
      await DoctorPaciente.create({
        id_doctor: doctorAsignado.id_doctor,
        id_paciente: paciente.id_paciente,
        fecha_asignacion: new Date()
      }, { transaction });

      // Actualizar id_doctor en paciente
      await paciente.update({ id_doctor: doctorAsignado.id_doctor }, { transaction });

      // Crear credencial PIN
      const pin = String(1000 + i).padStart(4, '0'); // PINs: 1000-1049
      const pinHash = await bcrypt.hash(pin, 10);
      await AuthCredential.create({
        user_type: 'Paciente',
        user_id: paciente.id_paciente,
        auth_method: 'pin',
        credential_value: pinHash,
        device_id: `device_${paciente.id_paciente}_${Date.now()}`,
        device_name: 'Dispositivo Principal',
        device_type: 'mobile',
        is_primary: true,
        activo: true,
        created_at: new Date()
      }, { transaction });

      pacientes.push(paciente);
      
      if ((i + 1) % 10 === 0) {
        logger.info(`   ✅ ${i + 1}/50 pacientes creados...`);
      }
    }
    logger.info('   ✅ 50 pacientes creados exitosamente\n');

    // 6. Crear Citas variadas
    logger.info('6️⃣ Creando citas variadas...');
    let citasCreadas = 0;
    
    // Crear citas distribuidas en los últimos 6 meses
    const hoy = new Date();
    const seisMesesAtras = new Date(hoy);
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    // Crear aproximadamente 3-5 citas por paciente
    for (const paciente of pacientes) {
      const numCitas = 3 + Math.floor(Math.random() * 3); // 3-5 citas por paciente
      
      for (let j = 0; j < numCitas; j++) {
        // Fecha aleatoria en los últimos 6 meses
        const diasAtras = Math.floor(Math.random() * 180); // 0-180 días
        const fechaCita = new Date(seisMesesAtras);
        fechaCita.setDate(fechaCita.getDate() + diasAtras);
        
        // Asegurar que algunas citas sean del mes actual para estadísticas mensuales
        if (j === 0 && Math.random() > 0.7) {
          // 30% de probabilidad de que la primera cita sea del mes actual
          const diasAtrasMes = Math.floor(Math.random() * 30);
          fechaCita.setTime(hoy.getTime() - (diasAtrasMes * 24 * 60 * 60 * 1000));
        }
        
        // Hora aleatoria entre 8:00 y 17:00
        fechaCita.setHours(8 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 4) * 15, 0, 0);

        // Estado aleatorio (con más peso en 'atendida')
        const rand = Math.random();
        let estado;
        if (rand < 0.5) estado = 'atendida';
        else if (rand < 0.7) estado = 'pendiente';
        else if (rand < 0.85) estado = 'cancelada';
        else if (rand < 0.95) estado = 'no_asistida';
        else estado = 'reprogramada';

        // Obtener doctor asignado al paciente
        const asignacion = await DoctorPaciente.findOne({
          where: { id_paciente: paciente.id_paciente },
          transaction
        });
        const idDoctor = asignacion ? asignacion.id_doctor : doctores[0].id_doctor;

        const cita = await Cita.create({
          id_paciente: paciente.id_paciente,
          id_doctor: idDoctor,
          fecha_cita: fechaCita,
          estado: estado,
          asistencia: estado === 'atendida',
          es_primera_consulta: j === 0,
          motivo: EncryptionService.encryptField(
            estado === 'atendida' ? 'Consulta de control' :
            estado === 'pendiente' ? 'Consulta programada' :
            estado === 'cancelada' ? 'Consulta cancelada por paciente' :
            estado === 'no_asistida' ? 'Consulta no asistida' :
            'Consulta reprogramada'
          ),
          observaciones: EncryptionService.encryptField(
            estado === 'atendida' ? 'Paciente atendido correctamente' :
            estado === 'pendiente' ? 'Pendiente de atención' :
            estado === 'cancelada' ? 'Cancelada con anticipación' :
            estado === 'no_asistida' ? 'No se presentó a la cita' :
            'Consulta reprogramada a nueva fecha'
          ),
          fecha_creacion: fechaCita
        }, { transaction });

        // Crear signos vitales para citas atendidas
        if (estado === 'atendida') {
          await SignoVital.create({
            id_paciente: paciente.id_paciente,
            id_cita: cita.id_cita,
            fecha_medicion: fechaCita,
            peso_kg: 60 + Math.random() * 30, // 60-90 kg
            talla_m: 1.50 + Math.random() * 0.40, // 1.50-1.90 m
            imc: 20 + Math.random() * 15, // 20-35
            medida_cintura_cm: 70 + Math.random() * 30,
            presion_sistolica: EncryptionService.encryptField(
              String(100 + Math.floor(Math.random() * 40))
            ),
            presion_diastolica: EncryptionService.encryptField(
              String(60 + Math.floor(Math.random() * 30))
            ),
            glucosa_mg_dl: EncryptionService.encryptField(
              String(80 + Math.floor(Math.random() * 40))
            ),
            registrado_por: 'doctor',
            fecha_creacion: fechaCita
          }, { transaction });
        }

        citasCreadas++;
      }
    }

    logger.info(`   ✅ ${citasCreadas} citas creadas\n`);

    // 7. Crear citas adicionales distribuidas por días de la semana
    logger.info('7️⃣ Creando citas adicionales por día de la semana...');
    let citasPorDia = 0;
    
    for (let semana = 0; semana < 4; semana++) { // Últimas 4 semanas
      for (const diaSemana of diasSemana) {
        const fechaCita = generarFechaCitaDiaSemana(diaSemana, semana);
        
        // Seleccionar paciente aleatorio
        const pacienteAleatorio = pacientes[Math.floor(Math.random() * pacientes.length)];
        const asignacion = await DoctorPaciente.findOne({
          where: { id_paciente: pacienteAleatorio.id_paciente },
          transaction
        });
        const idDoctor = asignacion ? asignacion.id_doctor : doctores[0].id_doctor;

        await Cita.create({
          id_paciente: pacienteAleatorio.id_paciente,
          id_doctor: idDoctor,
          fecha_cita: fechaCita,
          estado: Math.random() > 0.3 ? 'atendida' : 'pendiente',
          asistencia: Math.random() > 0.3,
          es_primera_consulta: false,
          motivo: EncryptionService.encryptField(`Consulta ${diaSemana}`),
          observaciones: EncryptionService.encryptField('Consulta programada'),
          fecha_creacion: fechaCita
        }, { transaction });

        citasPorDia++;
      }
    }
    logger.info(`   ✅ ${citasPorDia} citas adicionales creadas por día de semana\n`);

    await transaction.commit();
    
    logger.info('\n✅ ========================================');
    logger.info('✅ DATOS DE PRUEBA CREADOS EXITOSAMENTE');
    logger.info('✅ ========================================\n');
    logger.info('📊 RESUMEN:');
    logger.info(`   👤 1 Administrador (admin@clinica.com / Admin123!)`);
    logger.info(`   👨‍⚕️  5 Doctores (doctor1@clinica.com - doctor5@clinica.com / Doctor123!)`);
    logger.info(`   👥 50 Pacientes (PINs: 1000-1049 / Password: Paciente123!)`);
    logger.info(`   📅 ${citasCreadas + citasPorDia} Citas creadas`);
    logger.info(`\n   Distribución de pacientes:`);
    logger.info(`   - 0-18 años: ${contadorEdad['0-18']}`);
    logger.info(`   - 19-35 años: ${contadorEdad['19-35']}`);
    logger.info(`   - 36-50 años: ${contadorEdad['36-50']}`);
    logger.info(`   - 51-65 años: ${contadorEdad['51-65']}`);
    logger.info(`   - 65+ años: ${contadorEdad['65+']}`);
    logger.info(`\n   Distribución de doctores:`);
    doctores.forEach((doctor, i) => {
      const pacientesAsignados = pacientes.filter(p => p.id_doctor === doctor.id_doctor).length;
      logger.info(`   - Doctor ${i + 1} (${doctor.nombre} ${doctor.apellido_paterno}): ${pacientesAsignados} pacientes`);
    });
    logger.info('\n✅ Listo para probar estadísticas!\n');

  } catch (error) {
    if (transaction) {
      await transaction.rollback();
    }
    logger.error('❌ Error creando datos de prueba:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Ejecutar script
crearDatosPruebaEstadisticas()
  .then(() => {
    logger.info('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error en script:', error);
    process.exit(1);
  });
