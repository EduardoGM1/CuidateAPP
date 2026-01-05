import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import {
  Paciente,
  PlanMedicacion,
  PlanDetalle,
  Medicamento
} from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * Script para añadir medicamentos de prueba al paciente con PIN 2020
 * 
 * Cómo funciona el sistema de medicamentos:
 * 
 * 1. PLAN DE MEDICACIÓN (PlanMedicacion):
 *    - Un paciente puede tener uno o más planes de medicación activos
 *    - Cada plan tiene fecha_inicio, fecha_fin, y puede estar activo o inactivo
 * 
 * 2. DETALLES DEL PLAN (PlanDetalle):
 *    - Cada medicamento en el plan tiene un PlanDetalle
 *    - Incluye: dosis, frecuencia, horario (HH:MM), vía de administración
 *    - El horario es CRÍTICO: determina cuándo se envía la notificación
 * 
 * 3. NOTIFICACIONES AUTOMÁTICAS (scheduledTasksService):
 *    - El servidor verifica cada 5 minutos si hay medicamentos que deben tomarse
 *    - Busca medicamentos con horario dentro de ±2 minutos de la hora actual
 *    - Envía notificación push al paciente si coincide el horario
 *    - IMPORTANTE: El paciente debe tener id_usuario para recibir notificaciones
 * 
 * 4. CONFIRMACIÓN DE TOMA (MedicamentoToma):
 *    - El paciente puede confirmar que tomó el medicamento
 *    - Se registra en la tabla medicamento_toma
 *    - Endpoint: POST /api/medicamentos-toma
 * 
 * Para probar las notificaciones:
 * - Añadir medicamentos con horarios próximos (ej: dentro de 5-10 minutos)
 * - Asegurarse de que el plan esté activo
 * - Verificar que el paciente tenga id_usuario (necesario para push notifications)
 */

async function añadirMedicamentosPrueba() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // Buscar paciente con PIN 2020 (Roberto Torres)
    const paciente = await Paciente.findOne({
      where: {
        nombre: 'Roberto',
        apellido_paterno: 'Torres'
      }
    });

    if (!paciente) {
      throw new Error('Paciente Roberto Torres no encontrado. Ejecuta primero crear-paciente-pin2020.js');
    }

    logger.info(`👤 Paciente encontrado: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);

    // Verificar si el paciente tiene id_usuario (necesario para notificaciones push)
    if (!paciente.id_usuario) {
      logger.warn('⚠️  El paciente no tiene id_usuario. Las notificaciones push pueden no funcionar.');
      logger.warn('   Las notificaciones requieren que el paciente tenga un usuario asociado.');
    } else {
      logger.info(`✅ Paciente tiene id_usuario: ${paciente.id_usuario}`);
    }

    // Buscar o crear plan de medicación activo
    let planMedicacion = await PlanMedicacion.findOne({
      where: {
        id_paciente: paciente.id_paciente,
        activo: true
      },
      order: [['fecha_creacion', 'DESC']]
    });

    if (!planMedicacion) {
      // Crear nuevo plan de medicación
      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setMonth(fechaFin.getMonth() + 3); // 3 meses de duración

      planMedicacion = await PlanMedicacion.create({
        id_paciente: paciente.id_paciente,
        id_doctor: null, // Se puede asignar después
        id_cita: null,
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        observaciones: 'Plan de medicación de prueba para verificar notificaciones',
        activo: true,
        fecha_creacion: fechaInicio
      });
      logger.info(`✅ Plan de medicación creado (ID: ${planMedicacion.id_plan})`);
    } else {
      logger.info(`✅ Plan de medicación existente encontrado (ID: ${planMedicacion.id_plan})`);
    }

    // Obtener hora actual para calcular horarios de prueba
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutoActual = ahora.getMinutes();

    // Calcular horarios de prueba:
    // - 1 medicamento en 5 minutos
    // - 1 medicamento en 10 minutos
    // - 1 medicamento en 1 hora
    // - 1 medicamento mañana a las 8:00 AM

    const calcularHorario = (minutosAdelante) => {
      const fecha = new Date(ahora);
      fecha.setMinutes(fecha.getMinutes() + minutosAdelante);
      const hora = fecha.getHours().toString().padStart(2, '0');
      const minuto = fecha.getMinutes().toString().padStart(2, '0');
      return `${hora}:${minuto}`;
    };

    // Calcular horario base: 2:40 (o el próximo 2:40 si ya pasó)
    const calcularHorario240 = () => {
      const fecha = new Date(ahora);
      fecha.setHours(14, 40, 0, 0); // 2:40 PM (14:40 en formato 24h)
      
      // Si ya pasó las 2:40 de hoy, usar mañana
      if (fecha.getTime() < ahora.getTime()) {
        fecha.setDate(fecha.getDate() + 1);
      }
      
      const hora = fecha.getHours().toString().padStart(2, '0');
      const minuto = fecha.getMinutes().toString().padStart(2, '0');
      return `${hora}:${minuto}`;
    };

    // Generar 10 medicamentos con horarios cada 2 minutos a partir de 2:40
    // Usar medicamentos que sabemos que existen en el catálogo
    const medicamentosSecuencia = [];
    const nombresMedicamentos = [
      'Paracetamol',
      'Ibuprofeno',
      'Omeprazol',
      'Amoxicilina',
      'Paracetamol', // Reutilizar medicamentos existentes
      'Ibuprofeno',
      'Omeprazol',
      'Amoxicilina',
      'Paracetamol',
      'Ibuprofeno'
    ];
    
    const dosisMedicamentos = [
      '500mg',
      '400mg',
      '20mg',
      '500mg',
      '250mg', // Variar dosis para diferenciar
      '200mg',
      '40mg',
      '250mg',
      '750mg',
      '600mg'
    ];

    // Calcular horario base (2:40)
    const fechaBase = new Date(ahora);
    fechaBase.setHours(14, 40, 0, 0); // 2:40 PM
    
    // Si ya pasó las 2:40 de hoy, usar mañana
    if (fechaBase.getTime() < ahora.getTime()) {
      fechaBase.setDate(fechaBase.getDate() + 1);
    }

    // Generar 10 medicamentos cada 2 minutos
    for (let i = 0; i < 10; i++) {
      const fechaMedicamento = new Date(fechaBase);
      fechaMedicamento.setMinutes(fechaMedicamento.getMinutes() + (i * 2)); // Cada 2 minutos
      
      const hora = fechaMedicamento.getHours().toString().padStart(2, '0');
      const minuto = fechaMedicamento.getMinutes().toString().padStart(2, '0');
      const horario = `${hora}:${minuto}`;
      
      medicamentosSecuencia.push({
        nombre: nombresMedicamentos[i] || `Medicamento ${i + 1}`,
        dosis: dosisMedicamentos[i] || '500mg',
        frecuencia: 'Una vez al día',
        horario: horario,
        via_administracion: 'Oral',
        observaciones: `Medicamento de prueba #${i + 1} - Notificación programada para ${horario}`
      });
    }

    const medicamentosPrueba = [
      ...medicamentosSecuencia,
      {
        nombre: 'Ibuprofeno',
        dosis: '400mg',
        frecuencia: 'Cada 12 horas',
        horario: calcularHorario(60), // En 1 hora
        via_administracion: 'Oral',
        observaciones: 'Tomar después de comer. Medicamento de prueba.'
      },
      {
        nombre: 'Omeprazol',
        dosis: '20mg',
        frecuencia: 'Una vez al día',
        horario: '08:00', // Mañana a las 8:00 AM
        via_administracion: 'Oral',
        observaciones: 'Tomar en ayunas. Medicamento de prueba para horario fijo.'
      },
      {
        nombre: 'Vitamina D',
        dosis: '1000 UI',
        frecuencia: 'Una vez al día',
        horario: '20:00', // Noche a las 8:00 PM
        via_administracion: 'Oral',
        observaciones: 'Tomar con la cena. Medicamento de prueba.'
      }
    ];

    logger.info('\n💊 Añadiendo medicamentos de prueba...\n');

    for (const medData of medicamentosPrueba) {
      // Buscar medicamento en catálogo
      const medicamento = await Medicamento.findOne({
        where: {
          nombre_medicamento: {
            [Op.like]: `%${medData.nombre}%`
          }
        }
      });

      if (!medicamento) {
        logger.warn(`   ⚠️  Medicamento "${medData.nombre}" no encontrado en catálogo, omitiendo...`);
        continue;
      }

      // Verificar si ya existe este medicamento en el plan
      const detalleExistente = await PlanDetalle.findOne({
        where: {
          id_plan: planMedicacion.id_plan,
          id_medicamento: medicamento.id_medicamento,
          horario: medData.horario
        }
      });

      if (detalleExistente) {
        logger.info(`   ⏭️  Medicamento "${medData.nombre}" con horario ${medData.horario} ya existe en el plan, omitiendo...`);
        continue;
      }

      // Crear detalle del plan
      const detalle = await PlanDetalle.create({
        id_plan: planMedicacion.id_plan,
        id_medicamento: medicamento.id_medicamento,
        dosis: medData.dosis,
        frecuencia: medData.frecuencia,
        horario: medData.horario,
        via_administracion: medData.via_administracion,
        observaciones: medData.observaciones
      });

      logger.info(`   ✅ Medicamento "${medData.nombre}" añadido al plan`);
      logger.info(`      - Horario: ${medData.horario}`);
      logger.info(`      - Dosis: ${medData.dosis}`);
      logger.info(`      - Frecuencia: ${medData.frecuencia}`);
      logger.info(`      - ID Detalle: ${detalle.id_detalle}`);
      logger.info('');
    }

    // RESUMEN
    logger.info('\n✅ ========================================');
    logger.info('✅ MEDICAMENTOS DE PRUEBA AÑADIDOS');
    logger.info('✅ ========================================\n');
    logger.info('📋 RESUMEN:\n');
    logger.info(`👤 Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);
    logger.info(`📋 Plan de medicación: ID ${planMedicacion.id_plan} (${planMedicacion.activo ? 'ACTIVO' : 'INACTIVO'})`);
    logger.info(`💊 Medicamentos añadidos: ${medicamentosPrueba.length}`);
    logger.info('');
    logger.info('⏰ HORARIOS DE PRUEBA:');
    logger.info('   📋 SECUENCIA DE 10 NOTIFICACIONES (cada 2 minutos a partir de 2:40):');
    for (let i = 0; i < 10; i++) {
      logger.info(`      ${i + 1}. ${medicamentosPrueba[i].nombre}: ${medicamentosPrueba[i].horario}`);
    }
    logger.info('');
    logger.info('   📋 OTROS HORARIOS:');
    logger.info(`   - ${medicamentosPrueba[10].nombre}: ${medicamentosPrueba[10].horario} (en ~1 hora)`);
    logger.info(`   - ${medicamentosPrueba[11].nombre}: ${medicamentosPrueba[11].horario} (mañana)`);
    logger.info(`   - ${medicamentosPrueba[12].nombre}: ${medicamentosPrueba[12].horario} (noche)`);
    logger.info('');
    logger.info('🔔 NOTIFICACIONES:');
    logger.info('   El servidor verifica cada 5 minutos si hay medicamentos que deben tomarse.');
    logger.info('   Las notificaciones se envían cuando el horario coincide con la hora actual (±2 minutos).');
    logger.info('');
    logger.info('⚠️  IMPORTANTE:');
    if (!paciente.id_usuario) {
      logger.warn('   El paciente NO tiene id_usuario. Las notificaciones push NO funcionarán.');
      logger.warn('   Para que funcionen las notificaciones, el paciente debe tener un usuario asociado.');
    } else {
      logger.info(`   El paciente tiene id_usuario (${paciente.id_usuario}). Las notificaciones deberían funcionar.`);
    }
    logger.info('');

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

añadirMedicamentosPrueba()
  .then(() => {
    logger.info('✅ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });



import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import {
  Paciente,
  PlanMedicacion,
  PlanDetalle,
  Medicamento
} from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * Script para añadir medicamentos de prueba al paciente con PIN 2020
 * 
 * Cómo funciona el sistema de medicamentos:
 * 
 * 1. PLAN DE MEDICACIÓN (PlanMedicacion):
 *    - Un paciente puede tener uno o más planes de medicación activos
 *    - Cada plan tiene fecha_inicio, fecha_fin, y puede estar activo o inactivo
 * 
 * 2. DETALLES DEL PLAN (PlanDetalle):
 *    - Cada medicamento en el plan tiene un PlanDetalle
 *    - Incluye: dosis, frecuencia, horario (HH:MM), vía de administración
 *    - El horario es CRÍTICO: determina cuándo se envía la notificación
 * 
 * 3. NOTIFICACIONES AUTOMÁTICAS (scheduledTasksService):
 *    - El servidor verifica cada 5 minutos si hay medicamentos que deben tomarse
 *    - Busca medicamentos con horario dentro de ±2 minutos de la hora actual
 *    - Envía notificación push al paciente si coincide el horario
 *    - IMPORTANTE: El paciente debe tener id_usuario para recibir notificaciones
 * 
 * 4. CONFIRMACIÓN DE TOMA (MedicamentoToma):
 *    - El paciente puede confirmar que tomó el medicamento
 *    - Se registra en la tabla medicamento_toma
 *    - Endpoint: POST /api/medicamentos-toma
 * 
 * Para probar las notificaciones:
 * - Añadir medicamentos con horarios próximos (ej: dentro de 5-10 minutos)
 * - Asegurarse de que el plan esté activo
 * - Verificar que el paciente tenga id_usuario (necesario para push notifications)
 */

async function añadirMedicamentosPrueba() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // Buscar paciente con PIN 2020 (Roberto Torres)
    const paciente = await Paciente.findOne({
      where: {
        nombre: 'Roberto',
        apellido_paterno: 'Torres'
      }
    });

    if (!paciente) {
      throw new Error('Paciente Roberto Torres no encontrado. Ejecuta primero crear-paciente-pin2020.js');
    }

    logger.info(`👤 Paciente encontrado: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);

    // Verificar si el paciente tiene id_usuario (necesario para notificaciones push)
    if (!paciente.id_usuario) {
      logger.warn('⚠️  El paciente no tiene id_usuario. Las notificaciones push pueden no funcionar.');
      logger.warn('   Las notificaciones requieren que el paciente tenga un usuario asociado.');
    } else {
      logger.info(`✅ Paciente tiene id_usuario: ${paciente.id_usuario}`);
    }

    // Buscar o crear plan de medicación activo
    let planMedicacion = await PlanMedicacion.findOne({
      where: {
        id_paciente: paciente.id_paciente,
        activo: true
      },
      order: [['fecha_creacion', 'DESC']]
    });

    if (!planMedicacion) {
      // Crear nuevo plan de medicación
      const fechaInicio = new Date();
      const fechaFin = new Date();
      fechaFin.setMonth(fechaFin.getMonth() + 3); // 3 meses de duración

      planMedicacion = await PlanMedicacion.create({
        id_paciente: paciente.id_paciente,
        id_doctor: null, // Se puede asignar después
        id_cita: null,
        fecha_inicio: fechaInicio.toISOString().split('T')[0],
        fecha_fin: fechaFin.toISOString().split('T')[0],
        observaciones: 'Plan de medicación de prueba para verificar notificaciones',
        activo: true,
        fecha_creacion: fechaInicio
      });
      logger.info(`✅ Plan de medicación creado (ID: ${planMedicacion.id_plan})`);
    } else {
      logger.info(`✅ Plan de medicación existente encontrado (ID: ${planMedicacion.id_plan})`);
    }

    // Obtener hora actual para calcular horarios de prueba
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const minutoActual = ahora.getMinutes();

    // Calcular horarios de prueba:
    // - 1 medicamento en 5 minutos
    // - 1 medicamento en 10 minutos
    // - 1 medicamento en 1 hora
    // - 1 medicamento mañana a las 8:00 AM

    const calcularHorario = (minutosAdelante) => {
      const fecha = new Date(ahora);
      fecha.setMinutes(fecha.getMinutes() + minutosAdelante);
      const hora = fecha.getHours().toString().padStart(2, '0');
      const minuto = fecha.getMinutes().toString().padStart(2, '0');
      return `${hora}:${minuto}`;
    };

    // Calcular horario base: 2:40 (o el próximo 2:40 si ya pasó)
    const calcularHorario240 = () => {
      const fecha = new Date(ahora);
      fecha.setHours(14, 40, 0, 0); // 2:40 PM (14:40 en formato 24h)
      
      // Si ya pasó las 2:40 de hoy, usar mañana
      if (fecha.getTime() < ahora.getTime()) {
        fecha.setDate(fecha.getDate() + 1);
      }
      
      const hora = fecha.getHours().toString().padStart(2, '0');
      const minuto = fecha.getMinutes().toString().padStart(2, '0');
      return `${hora}:${minuto}`;
    };

    // Generar 10 medicamentos con horarios cada 2 minutos a partir de 2:40
    // Usar medicamentos que sabemos que existen en el catálogo
    const medicamentosSecuencia = [];
    const nombresMedicamentos = [
      'Paracetamol',
      'Ibuprofeno',
      'Omeprazol',
      'Amoxicilina',
      'Paracetamol', // Reutilizar medicamentos existentes
      'Ibuprofeno',
      'Omeprazol',
      'Amoxicilina',
      'Paracetamol',
      'Ibuprofeno'
    ];
    
    const dosisMedicamentos = [
      '500mg',
      '400mg',
      '20mg',
      '500mg',
      '250mg', // Variar dosis para diferenciar
      '200mg',
      '40mg',
      '250mg',
      '750mg',
      '600mg'
    ];

    // Calcular horario base (2:40)
    const fechaBase = new Date(ahora);
    fechaBase.setHours(14, 40, 0, 0); // 2:40 PM
    
    // Si ya pasó las 2:40 de hoy, usar mañana
    if (fechaBase.getTime() < ahora.getTime()) {
      fechaBase.setDate(fechaBase.getDate() + 1);
    }

    // Generar 10 medicamentos cada 2 minutos
    for (let i = 0; i < 10; i++) {
      const fechaMedicamento = new Date(fechaBase);
      fechaMedicamento.setMinutes(fechaMedicamento.getMinutes() + (i * 2)); // Cada 2 minutos
      
      const hora = fechaMedicamento.getHours().toString().padStart(2, '0');
      const minuto = fechaMedicamento.getMinutes().toString().padStart(2, '0');
      const horario = `${hora}:${minuto}`;
      
      medicamentosSecuencia.push({
        nombre: nombresMedicamentos[i] || `Medicamento ${i + 1}`,
        dosis: dosisMedicamentos[i] || '500mg',
        frecuencia: 'Una vez al día',
        horario: horario,
        via_administracion: 'Oral',
        observaciones: `Medicamento de prueba #${i + 1} - Notificación programada para ${horario}`
      });
    }

    const medicamentosPrueba = [
      ...medicamentosSecuencia,
      {
        nombre: 'Ibuprofeno',
        dosis: '400mg',
        frecuencia: 'Cada 12 horas',
        horario: calcularHorario(60), // En 1 hora
        via_administracion: 'Oral',
        observaciones: 'Tomar después de comer. Medicamento de prueba.'
      },
      {
        nombre: 'Omeprazol',
        dosis: '20mg',
        frecuencia: 'Una vez al día',
        horario: '08:00', // Mañana a las 8:00 AM
        via_administracion: 'Oral',
        observaciones: 'Tomar en ayunas. Medicamento de prueba para horario fijo.'
      },
      {
        nombre: 'Vitamina D',
        dosis: '1000 UI',
        frecuencia: 'Una vez al día',
        horario: '20:00', // Noche a las 8:00 PM
        via_administracion: 'Oral',
        observaciones: 'Tomar con la cena. Medicamento de prueba.'
      }
    ];

    logger.info('\n💊 Añadiendo medicamentos de prueba...\n');

    for (const medData of medicamentosPrueba) {
      // Buscar medicamento en catálogo
      const medicamento = await Medicamento.findOne({
        where: {
          nombre_medicamento: {
            [Op.like]: `%${medData.nombre}%`
          }
        }
      });

      if (!medicamento) {
        logger.warn(`   ⚠️  Medicamento "${medData.nombre}" no encontrado en catálogo, omitiendo...`);
        continue;
      }

      // Verificar si ya existe este medicamento en el plan
      const detalleExistente = await PlanDetalle.findOne({
        where: {
          id_plan: planMedicacion.id_plan,
          id_medicamento: medicamento.id_medicamento,
          horario: medData.horario
        }
      });

      if (detalleExistente) {
        logger.info(`   ⏭️  Medicamento "${medData.nombre}" con horario ${medData.horario} ya existe en el plan, omitiendo...`);
        continue;
      }

      // Crear detalle del plan
      const detalle = await PlanDetalle.create({
        id_plan: planMedicacion.id_plan,
        id_medicamento: medicamento.id_medicamento,
        dosis: medData.dosis,
        frecuencia: medData.frecuencia,
        horario: medData.horario,
        via_administracion: medData.via_administracion,
        observaciones: medData.observaciones
      });

      logger.info(`   ✅ Medicamento "${medData.nombre}" añadido al plan`);
      logger.info(`      - Horario: ${medData.horario}`);
      logger.info(`      - Dosis: ${medData.dosis}`);
      logger.info(`      - Frecuencia: ${medData.frecuencia}`);
      logger.info(`      - ID Detalle: ${detalle.id_detalle}`);
      logger.info('');
    }

    // RESUMEN
    logger.info('\n✅ ========================================');
    logger.info('✅ MEDICAMENTOS DE PRUEBA AÑADIDOS');
    logger.info('✅ ========================================\n');
    logger.info('📋 RESUMEN:\n');
    logger.info(`👤 Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);
    logger.info(`📋 Plan de medicación: ID ${planMedicacion.id_plan} (${planMedicacion.activo ? 'ACTIVO' : 'INACTIVO'})`);
    logger.info(`💊 Medicamentos añadidos: ${medicamentosPrueba.length}`);
    logger.info('');
    logger.info('⏰ HORARIOS DE PRUEBA:');
    logger.info('   📋 SECUENCIA DE 10 NOTIFICACIONES (cada 2 minutos a partir de 2:40):');
    for (let i = 0; i < 10; i++) {
      logger.info(`      ${i + 1}. ${medicamentosPrueba[i].nombre}: ${medicamentosPrueba[i].horario}`);
    }
    logger.info('');
    logger.info('   📋 OTROS HORARIOS:');
    logger.info(`   - ${medicamentosPrueba[10].nombre}: ${medicamentosPrueba[10].horario} (en ~1 hora)`);
    logger.info(`   - ${medicamentosPrueba[11].nombre}: ${medicamentosPrueba[11].horario} (mañana)`);
    logger.info(`   - ${medicamentosPrueba[12].nombre}: ${medicamentosPrueba[12].horario} (noche)`);
    logger.info('');
    logger.info('🔔 NOTIFICACIONES:');
    logger.info('   El servidor verifica cada 5 minutos si hay medicamentos que deben tomarse.');
    logger.info('   Las notificaciones se envían cuando el horario coincide con la hora actual (±2 minutos).');
    logger.info('');
    logger.info('⚠️  IMPORTANTE:');
    if (!paciente.id_usuario) {
      logger.warn('   El paciente NO tiene id_usuario. Las notificaciones push NO funcionarán.');
      logger.warn('   Para que funcionen las notificaciones, el paciente debe tener un usuario asociado.');
    } else {
      logger.info(`   El paciente tiene id_usuario (${paciente.id_usuario}). Las notificaciones deberían funcionar.`);
    }
    logger.info('');

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

añadirMedicamentosPrueba()
  .then(() => {
    logger.info('✅ Script finalizado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });









