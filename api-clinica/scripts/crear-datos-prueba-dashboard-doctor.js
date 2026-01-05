/**
 * Script para crear datos de prueba para el Dashboard del Doctor
 * 
 * Crea:
 * - 1 doctor de prueba (o usa uno existente)
 * - 5-8 pacientes asignados al doctor
 * - Citas (hoy, futuras, pasadas)
 * - Signos vitales con algunos valores fuera de rango (para alertas)
 * - Diagnósticos
 * - Planes de medicación
 * - Solicitudes de reprogramación (pendientes, aprobadas, rechazadas)
 * - Red de apoyo
 * - Esquema de vacunación
 * 
 * @author Senior Developer
 * @date 2025-11-16
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';
import {
  Usuario,
  Doctor,
  Paciente,
  Cita,
  SignoVital,
  Diagnostico,
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  Modulo,
  DoctorPaciente,
  RedApoyo,
  EsquemaVacunacion,
  SolicitudReprogramacion,
  Comorbilidad,
  PacienteComorbilidad
} from '../models/associations.js';
import AuthCredential from '../models/AuthCredential.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

// Configuración
const DOCTOR_EMAIL = 'doctor.prueba@clinica.com';
const DOCTOR_PASSWORD = 'Doctor123!';
const NUM_PACIENTES = 6; // Número de pacientes a crear

// Datos de pacientes de prueba
const pacientesData = [
  {
    nombre: 'Ana',
    apellidoPaterno: 'Martínez',
    apellidoMaterno: 'García',
    fecha_nacimiento: '1985-03-15',
    curp: 'MAGA850315MDFRRN01',
    sexo: 'Mujer',
    institucion_salud: 'IMSS',
    direccion: 'Calle Principal 123, Col. Centro',
    localidad: 'Ciudad de México',
    numero_celular: '5551234567'
  },
  {
    nombre: 'Carlos',
    apellidoPaterno: 'Rodríguez',
    apellidoMaterno: 'López',
    fecha_nacimiento: '1978-07-22',
    curp: 'ROLC780722HDFRDR02',
    sexo: 'Hombre',
    institucion_salud: 'ISSSTE',
    direccion: 'Av. Reforma 456, Col. Juárez',
    localidad: 'Ciudad de México',
    numero_celular: '5552345678'
  },
  {
    nombre: 'María',
    apellidoPaterno: 'Hernández',
    apellidoMaterno: 'Sánchez',
    fecha_nacimiento: '1990-11-08',
    curp: 'HESM901108MDFRRS03',
    sexo: 'Mujer',
    institucion_salud: 'Bienestar',
    direccion: 'Calle Hidalgo 789, Col. Centro',
    localidad: 'Guadalajara',
    numero_celular: '5553456789'
  },
  {
    nombre: 'José',
    apellidoPaterno: 'González',
    apellidoMaterno: 'Pérez',
    fecha_nacimiento: '1982-05-30',
    curp: 'GOPJ820530HDFRZS04',
    sexo: 'Hombre',
    institucion_salud: 'Particular',
    direccion: 'Blvd. Constitución 321, Col. Las Flores',
    localidad: 'Monterrey',
    numero_celular: '5554567890'
  },
  {
    nombre: 'Laura',
    apellidoPaterno: 'Torres',
    apellidoMaterno: 'Ramírez',
    fecha_nacimiento: '1987-09-12',
    curp: 'TORL870912MDFRTR05',
    sexo: 'Mujer',
    institucion_salud: 'IMSS',
    direccion: 'Calle Morelos 654, Col. San Rafael',
    localidad: 'Puebla',
    numero_celular: '5555678901'
  },
  {
    nombre: 'Roberto',
    apellidoPaterno: 'Morales',
    apellidoMaterno: 'Castro',
    fecha_nacimiento: '1975-12-25',
    curp: 'MOCR751225HDFRRT06',
    sexo: 'Hombre',
    institucion_salud: 'ISSSTE',
    direccion: 'Av. Universidad 987, Col. Del Valle',
    localidad: 'Tijuana',
    numero_celular: '5556789012'
  },
  {
    nombre: 'Patricia',
    apellidoPaterno: 'Vargas',
    apellidoMaterno: 'Mendoza',
    fecha_nacimiento: '1989-02-14',
    curp: 'VAMP890214MDFRVM07',
    sexo: 'Mujer',
    institucion_salud: 'Bienestar',
    direccion: 'Calle Independencia 147, Col. Revolución',
    localidad: 'León',
    numero_celular: '5557890123'
  },
  {
    nombre: 'Miguel',
    apellidoPaterno: 'Jiménez',
    apellidoMaterno: 'Ruiz',
    fecha_nacimiento: '1983-08-20',
    curp: 'JIRM830820HDFRJZ08',
    sexo: 'Hombre',
    institucion_salud: 'IMSS',
    direccion: 'Blvd. López Mateos 258, Col. Industrial',
    localidad: 'Querétaro',
    numero_celular: '5558901234'
  }
];

// Motivos de consulta
const motivosConsulta = [
  'Consulta de control',
  'Revisión general',
  'Control de diabetes',
  'Control de hipertensión',
  'Síntomas respiratorios',
  'Dolor de cabeza persistente',
  'Fatiga y debilidad',
  'Consulta de seguimiento',
  'Control de medicación',
  'Revisión de signos vitales'
];

// Diagnósticos comunes
const diagnosticos = [
  'Hipertensión arterial controlada',
  'Diabetes tipo 2 en tratamiento',
  'Obesidad grado 1',
  'Dislipidemia mixta',
  'Ansiedad leve',
  'Síndrome metabólico',
  'Asma bronquial controlada',
  'Gastritis crónica',
  'Anemia ferropénica leve',
  'Artritis reumatoide en control'
];

// Vacunas disponibles
const vacunasDisponibles = [
  'Hepatitis B',
  'Influenza (Gripe)',
  'Tétanos',
  'Difteria',
  'Sarampión',
  'COVID-19',
  'Varicela',
  'Neumococo'
];

// Función para generar fechas
function fechaAleatoria(diasAtras) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - diasAtras);
  return fecha;
}

function fechaFutura(diasAdelante) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + diasAdelante);
  return fecha;
}

// Función para generar fecha de hoy a una hora específica
function fechaHoy(hora = 9) {
  const fecha = new Date();
  fecha.setHours(hora, 0, 0, 0);
  return fecha;
}

async function crearDatosPruebaDashboardDoctor() {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('🌱 INICIANDO CREACIÓN DE DATOS DE PRUEBA PARA DASHBOARD DOCTOR');
    logger.info('='.repeat(80));

    // 1. Obtener o crear módulo
    let modulo = await Modulo.findOne({ limit: 1, transaction });
    if (!modulo) {
      logger.info('Creando módulo de prueba...');
      modulo = await Modulo.create({
        nombre_modulo: 'Módulo de Prueba',
        descripcion: 'Módulo para pruebas del dashboard del doctor',
        activo: true
      }, { transaction });
    }
    logger.info(`✅ Módulo: ${modulo.nombre_modulo} (ID: ${modulo.id_modulo})`);

    // 2. Obtener o crear doctor de prueba
    logger.info('\n👨‍⚕️ Obteniendo o creando doctor de prueba...');
    let doctor = await Doctor.findOne({
      include: [{
        model: Usuario,
        as: 'Usuario',
        where: { email: DOCTOR_EMAIL }
      }],
      transaction
    });

    if (!doctor) {
      logger.info('Creando doctor de prueba...');
      const hashedPassword = await bcrypt.hash(DOCTOR_PASSWORD, 10);
      const usuario = await Usuario.create({
        email: DOCTOR_EMAIL,
        password_hash: hashedPassword,
        rol: 'Doctor',
        activo: true
      }, { transaction });

      doctor = await Doctor.create({
        id_usuario: usuario.id_usuario,
        nombre: 'Dr. Prueba',
        apellido_paterno: 'Dashboard',
        apellido_materno: 'Test',
        telefono: '555-9999',
        institucion_hospitalaria: 'Clínica de Pruebas',
        grado_estudio: 'Especialidad en Medicina General',
        anos_servicio: 10,
        id_modulo: modulo.id_modulo,
        activo: true
      }, { transaction });
      
      // Crear credencial en AuthCredential para que el login funcione
      await AuthCredential.create({
        user_type: 'Doctor',
        user_id: usuario.id_usuario,
        auth_method: 'password',
        credential_value: hashedPassword,
        is_primary: true,
        activo: true,
        failed_attempts: 0,
        created_at: new Date(),
        updated_at: new Date()
      }, { transaction });
      
      logger.info(`✅ Doctor creado: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
      logger.info(`   Email: ${DOCTOR_EMAIL}`);
      logger.info(`   Password: ${DOCTOR_PASSWORD}`);
      logger.info(`   ✅ Credencial de autenticación creada`);
    } else {
      logger.info(`✅ Doctor existente: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
    }

    // 3. Obtener medicamentos disponibles
    const medicamentos = await Medicamento.findAll({ limit: 10, transaction });
    if (medicamentos.length === 0) {
      logger.warn('⚠️  No hay medicamentos disponibles. Algunas funcionalidades pueden no funcionar correctamente.');
    } else {
      logger.info(`✅ Medicamentos disponibles: ${medicamentos.length}`);
    }

    // 4. Obtener comorbilidades disponibles
    const comorbilidades = await Comorbilidad.findAll({ limit: 5, transaction });
    logger.info(`✅ Comorbilidades disponibles: ${comorbilidades.length}`);

    // 5. Crear pacientes y asignarlos al doctor
    logger.info(`\n👥 Creando ${NUM_PACIENTES} pacientes y asignándolos al doctor...`);
    const pacientesCreados = [];

    for (let i = 0; i < Math.min(NUM_PACIENTES, pacientesData.length); i++) {
      const pacienteData = pacientesData[i];
      
      // Verificar si el paciente ya existe por CURP
      let paciente = await Paciente.findOne({
        where: { curp: pacienteData.curp },
        transaction
      });

      if (!paciente) {
        // Crear usuario para paciente
        const emailPaciente = `paciente_${Date.now()}_${i}@temp.com`;
        const passwordPaciente = Math.random().toString(36).slice(-8);
        const hashedPasswordPaciente = await bcrypt.hash(passwordPaciente, 10);
        
        const usuarioPaciente = await Usuario.create({
          email: emailPaciente,
          password_hash: hashedPasswordPaciente,
          rol: 'Paciente',
          activo: true
        }, { transaction });

        // Crear paciente
        paciente = await Paciente.create({
          id_usuario: usuarioPaciente.id_usuario,
          nombre: pacienteData.nombre,
          apellido_paterno: pacienteData.apellidoPaterno,
          apellido_materno: pacienteData.apellidoMaterno,
          fecha_nacimiento: pacienteData.fecha_nacimiento,
          curp: pacienteData.curp,
          institucion_salud: pacienteData.institucion_salud,
          sexo: pacienteData.sexo,
          direccion: pacienteData.direccion,
          localidad: pacienteData.localidad,
          numero_celular: pacienteData.numero_celular,
          id_modulo: modulo.id_modulo,
          fecha_registro: new Date(),
          activo: true
        }, { transaction });
        logger.info(`   ✅ Paciente creado: ${pacienteData.nombre} ${pacienteData.apellidoPaterno} (ID: ${paciente.id_paciente})`);
      } else {
        logger.info(`   ℹ️  Paciente existente: ${pacienteData.nombre} ${pacienteData.apellidoPaterno} (ID: ${paciente.id_paciente})`);
      }

      // Asignar paciente al doctor
      const [doctorPaciente, created] = await DoctorPaciente.findOrCreate({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: paciente.id_paciente,
        },
        defaults: {
          fecha_asignacion: new Date().toISOString().split('T')[0],
          observaciones: 'Asignación para pruebas del dashboard',
          activo: true
        },
        transaction
      });

      if (created) {
        logger.info(`   ✅ Paciente asignado al doctor`);
      }

      // Asignar comorbilidades aleatorias
      if (comorbilidades.length > 0) {
        const numComorbilidades = Math.floor(Math.random() * 3) + 1; // 1-3 comorbilidades
        const comorbilidadesSeleccionadas = comorbilidades
          .sort(() => Math.random() - 0.5)
          .slice(0, numComorbilidades);

        for (const comorbilidad of comorbilidadesSeleccionadas) {
          await PacienteComorbilidad.findOrCreate({
            where: {
              id_paciente: paciente.id_paciente,
              id_comorbilidad: comorbilidad.id_comorbilidad,
            },
            defaults: {
              fecha_deteccion: fechaAleatoria(Math.floor(Math.random() * 365)),
              observaciones: 'Comorbilidad detectada en consulta'
            },
            transaction
          });
        }
      }

      pacientesCreados.push(paciente);

      // 6. Crear citas para este paciente
      logger.info(`   📅 Creando citas para ${pacienteData.nombre}...`);
      const citasCreadas = [];

      // Cita de hoy (pendiente)
      const citaHoy = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fechaHoy(9 + i), // 9:00, 10:00, 11:00, etc.
        asistencia: null,
        motivo: motivosConsulta[Math.floor(Math.random() * motivosConsulta.length)],
        es_primera_consulta: false,
        observaciones: 'Cita de prueba para dashboard',
        fecha_creacion: new Date()
      }, { transaction });
      citasCreadas.push(citaHoy);
      logger.info(`      ✅ Cita de hoy creada: ${citaHoy.fecha_cita.toLocaleString()}`);

      // Cita futura (próxima semana)
      const citaFutura = await Cita.create({
        id_paciente: paciente.id_paciente,
        id_doctor: doctor.id_doctor,
        fecha_cita: fechaFutura(7 + i),
        asistencia: null,
        motivo: motivosConsulta[Math.floor(Math.random() * motivosConsulta.length)],
        es_primera_consulta: false,
        observaciones: 'Cita futura de prueba',
        fecha_creacion: new Date()
      }, { transaction });
      citasCreadas.push(citaFutura);

      // Citas pasadas (2-3 citas)
      const numCitasPasadas = 2 + Math.floor(Math.random() * 2); // 2-3 citas
      for (let j = 0; j < numCitasPasadas; j++) {
        const diasAtras = 30 + (j * 30); // 30, 60, 90 días atrás
        const fechaCita = fechaAleatoria(diasAtras);
        fechaCita.setHours(9 + j, 0, 0, 0);

        const cita = await Cita.create({
          id_paciente: paciente.id_paciente,
          id_doctor: doctor.id_doctor,
          fecha_cita: fechaCita,
          asistencia: Math.random() > 0.2, // 80% asistencia
          motivo: motivosConsulta[Math.floor(Math.random() * motivosConsulta.length)],
          es_primera_consulta: j === 0,
          observaciones: `Cita pasada de prueba - ${j === 0 ? 'Primera consulta' : 'Control'}`,
          fecha_creacion: fechaCita
        }, { transaction });
        citasCreadas.push(cita);

        // Crear signos vitales para citas pasadas (algunos con valores fuera de rango)
        const tieneAlerta = Math.random() > 0.7; // 30% de probabilidad de alerta
        const pesoBase = 65 + Math.random() * 25; // 65-90 kg
        const tallaBase = 1.55 + Math.random() * 0.35; // 1.55-1.90 m
        const imc = (pesoBase / (tallaBase * tallaBase)).toFixed(2);

        await SignoVital.create({
          id_paciente: paciente.id_paciente,
          id_cita: cita.id_cita,
          fecha_medicion: fechaCita,
          peso_kg: parseFloat(pesoBase.toFixed(1)),
          talla_m: parseFloat(tallaBase.toFixed(2)),
          imc: parseFloat(imc),
          medida_cintura_cm: 80 + Math.random() * 20,
          presion_sistolica: tieneAlerta ? 165 : (110 + Math.floor(Math.random() * 30)), // Alerta si > 160
          presion_diastolica: tieneAlerta ? 105 : (70 + Math.floor(Math.random() * 20)), // Alerta si > 100
          glucosa_mg_dl: tieneAlerta ? 220 : (85 + Math.floor(Math.random() * 40)), // Alerta si > 200
          colesterol_mg_dl: 160 + Math.floor(Math.random() * 40),
          trigliceridos_mg_dl: 120 + Math.floor(Math.random() * 60),
          registrado_por: 'doctor',
          observaciones: tieneAlerta ? '⚠️ Valores fuera de rango - Requiere atención' : 'Signos vitales normales'
        }, { transaction });

        // Crear diagnóstico para algunas citas (70% de probabilidad)
        if (Math.random() > 0.3) {
          const diagnostico = diagnosticos[Math.floor(Math.random() * diagnosticos.length)];
          await Diagnostico.create({
            id_cita: cita.id_cita,
            descripcion: diagnostico,
            fecha_registro: fechaCita
          }, { transaction });
        }

        // Crear plan de medicación para la primera cita y algunas otras
        if (j === 0 || Math.random() > 0.5) {
          const fechaInicio = new Date(fechaCita);
          const fechaFin = new Date(fechaInicio);
          fechaFin.setMonth(fechaFin.getMonth() + 3);

          const plan = await PlanMedicacion.create({
            id_paciente: paciente.id_paciente,
            id_doctor: doctor.id_doctor,
            id_cita: cita.id_cita,
            fecha_inicio: fechaInicio.toISOString().split('T')[0],
            fecha_fin: fechaFin.toISOString().split('T')[0],
            observaciones: 'Plan de medicación según diagnóstico',
            activo: true,
            fecha_creacion: fechaCita
          }, { transaction });

          // Agregar medicamentos al plan
          if (medicamentos.length > 0 && plan && plan.id_plan) {
            const numMedicamentos = 2 + Math.floor(Math.random() * 2); // 2-3 medicamentos
            const medicamentosSeleccionados = medicamentos
              .sort(() => Math.random() - 0.5)
              .slice(0, numMedicamentos);

            for (const med of medicamentosSeleccionados) {
              const dosis = ['500mg', '250mg', '100mg', '50mg'][Math.floor(Math.random() * 4)];
              const frecuencia = ['1 vez al día', '2 veces al día', '3 veces al día'][Math.floor(Math.random() * 3)];
              const horario = ['08:00', '12:00', '20:00'][Math.floor(Math.random() * 3)];

              await PlanDetalle.create({
                id_plan: plan.id_plan,
                id_medicamento: med.id_medicamento,
                dosis: dosis,
                frecuencia: frecuencia,
                horario: horario,
                duracion_dias: 90,
                observaciones: 'Medicamento recetado'
              }, { transaction });
            }
          }
        }
      }

      // 7. Crear solicitudes de reprogramación
      if (citasCreadas.length > 0 && Math.random() > 0.5) {
        const citaParaReprogramar = citasCreadas[Math.floor(Math.random() * citasCreadas.length)];
        const nuevaFecha = new Date(citaParaReprogramar.fecha_cita);
        nuevaFecha.setDate(nuevaFecha.getDate() + 2); // 2 días después

        const estados = ['pendiente', 'aprobada', 'rechazada'];
        const estado = estados[Math.floor(Math.random() * estados.length)];

        const solicitud = await SolicitudReprogramacion.create({
          id_cita: citaParaReprogramar.id_cita,
          id_paciente: paciente.id_paciente,
          fecha_solicitada: nuevaFecha.toISOString().split('T')[0],
          motivo: 'Cambio de disponibilidad',
          estado: estado,
          respuesta_doctor: estado === 'aprobada' ? 'Solicitud aprobada' : estado === 'rechazada' ? 'No disponible en esa fecha' : null,
          fecha_respuesta: estado !== 'pendiente' ? new Date() : null,
          fecha_creacion: fechaAleatoria(5)
        }, { transaction });
        logger.info(`      ✅ Solicitud de reprogramación creada (${estado})`);
      }

      // 8. Crear red de apoyo
      const contactosRedApoyo = [
        { nombre: 'María González', parentesco: 'Esposa', telefono: '5551111111' },
        { nombre: 'Juan Pérez', parentesco: 'Hijo', telefono: '5552222222' }
      ];

      for (const contacto of contactosRedApoyo) {
        await RedApoyo.findOrCreate({
          where: {
            id_paciente: paciente.id_paciente,
            nombre_contacto: contacto.nombre
          },
          defaults: {
            parentesco: contacto.parentesco,
            telefono: contacto.telefono,
            email: `${contacto.nombre.toLowerCase().replace(' ', '.')}@email.com`,
            direccion: 'Dirección de contacto',
            observaciones: 'Contacto de emergencia'
          },
          transaction
        });
      }

      // 9. Crear esquema de vacunación
      const numVacunas = 2 + Math.floor(Math.random() * 3); // 2-4 vacunas
      const vacunasSeleccionadas = vacunasDisponibles
        .sort(() => Math.random() - 0.5)
        .slice(0, numVacunas);

      for (const vacuna of vacunasSeleccionadas) {
        await EsquemaVacunacion.findOrCreate({
          where: {
            id_paciente: paciente.id_paciente,
            vacuna: vacuna,
            fecha_aplicacion: fechaAleatoria(Math.floor(Math.random() * 365)).toISOString().split('T')[0]
          },
          defaults: {
            lote: `LOTE-${Math.floor(Math.random() * 10000)}`,
            observaciones: 'Vacuna aplicada correctamente'
          },
          transaction
        });
      }
    }

    // 10. Crear algunas solicitudes de reprogramación adicionales para el doctor
    logger.info('\n📋 Creando solicitudes de reprogramación adicionales...');
    const citasDoctor = await Cita.findAll({
      where: { id_doctor: doctor.id_doctor },
      limit: 10,
      transaction
    });

    for (let i = 0; i < Math.min(3, citasDoctor.length); i++) {
      const cita = citasDoctor[i];
      const nuevaFecha = new Date(cita.fecha_cita);
      nuevaFecha.setDate(nuevaFecha.getDate() + 1);

      await SolicitudReprogramacion.findOrCreate({
        where: {
          id_cita: cita.id_cita,
          estado: 'pendiente'
        },
        defaults: {
          id_paciente: cita.id_paciente,
          fecha_solicitada: nuevaFecha.toISOString().split('T')[0],
          motivo: 'Solicitud de reprogramación de prueba',
          estado: 'pendiente',
          fecha_creacion: new Date()
        },
        transaction
      });
    }

    await transaction.commit();

    logger.info('\n' + '='.repeat(80));
    logger.info('✅ DATOS DE PRUEBA CREADOS EXITOSAMENTE');
    logger.info('='.repeat(80));
    logger.info(`\n📊 RESUMEN:`);
    logger.info(`   👨‍⚕️ Doctor: ${doctor.nombre} ${doctor.apellido_paterno} (ID: ${doctor.id_doctor})`);
    logger.info(`   📧 Email: ${DOCTOR_EMAIL}`);
    logger.info(`   🔑 Password: ${DOCTOR_PASSWORD}`);
    logger.info(`   👥 Pacientes asignados: ${pacientesCreados.length}`);
    logger.info(`\n💡 INSTRUCCIONES:`);
    logger.info(`   1. Inicia sesión en la app móvil con:`);
    logger.info(`      Email: ${DOCTOR_EMAIL}`);
    logger.info(`      Password: ${DOCTOR_PASSWORD}`);
    logger.info(`   2. Verifica las nuevas funcionalidades:`);
    logger.info(`      - Lista de Pacientes (debe mostrar ${pacientesCreados.length} pacientes)`);
    logger.info(`      - Reportes (debe mostrar estadísticas)`);
    logger.info(`      - Historial Médico (debe mostrar historial consolidado)`);
    logger.info(`      - Gestionar Solicitudes (debe mostrar solicitudes pendientes)`);
    logger.info(`\n✅ Proceso completado exitosamente!`);

  } catch (error) {
    await transaction.rollback();
    logger.error('❌ ERROR CREANDO DATOS DE PRUEBA:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar script
crearDatosPruebaDashboardDoctor()
  .then(() => {
    logger.info('\n✅ Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error ejecutando script:', error);
    process.exit(1);
  });

