import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function consultarDatosPacientes() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    logger.info('📊 CONSULTA DE DATOS DE PACIENTES');
    logger.info('='.repeat(80));

    const pacientes = [
      { id: 3, nombre: 'Beatriz Jiménez Sánchez' },
      { id: 4, nombre: 'José García Díaz' }
    ];

    for (const paciente of pacientes) {
      logger.info(`\n\n👤 ${paciente.nombre} (ID: ${paciente.id})`);
      logger.info('='.repeat(80));

      // 1. Signos Vitales
      const [signosVitales] = await sequelize.query(
        `SELECT * FROM signos_vitales WHERE id_paciente = ? ORDER BY id_signo DESC`,
        { replacements: [paciente.id] }
      );
      logger.info(`\n📈 SIGNOS VITALES: ${signosVitales.length} registro(s)`);
      if (signosVitales.length > 0) {
        signosVitales.slice(0, 5).forEach((sv, idx) => {
          logger.info(`   ${idx + 1}. Fecha: ${sv.fecha_medicion || sv.fecha_creacion || 'N/A'}`);
          logger.info(`      - Presión Arterial: ${sv.presion_sistolica || 'N/A'}/${sv.presion_diastolica || 'N/A'}`);
          logger.info(`      - Glucosa: ${sv.glucosa_mg_dl || 'N/A'} mg/dL`);
          logger.info(`      - Colesterol: ${sv.colesterol_mg_dl || 'N/A'} mg/dL`);
          logger.info(`      - Peso: ${sv.peso_kg || 'N/A'} kg`);
          logger.info(`      - Talla: ${sv.talla_m || 'N/A'} m`);
          logger.info(`      - IMC: ${sv.imc || 'N/A'}`);
          logger.info(`      - Registrado por: ${sv.registrado_por || 'N/A'}`);
        });
        if (signosVitales.length > 5) {
          logger.info(`   ... y ${signosVitales.length - 5} registro(s) más`);
        }
      } else {
        logger.info(`   ⚠️  No hay signos vitales registrados`);
      }

      // 2. Medicamentos (planes_medicacion y plan_detalle)
      const [planesMedicacion] = await sequelize.query(
        `SELECT pm.* FROM planes_medicacion pm WHERE pm.id_paciente = ? ORDER BY pm.fecha_inicio DESC`,
        { replacements: [paciente.id] }
      );
      
      logger.info(`\n💊 PLANES DE MEDICACIÓN: ${planesMedicacion.length} plan(es)`);
      if (planesMedicacion.length > 0) {
        for (const plan of planesMedicacion) {
          logger.info(`   Plan ID: ${plan.id_plan} (${plan.fecha_inicio || 'N/A'} - ${plan.fecha_fin || 'En curso'})`);
          
          // Obtener detalles del plan (medicamentos)
          const [detalles] = await sequelize.query(
            `SELECT pd.*, m.nombre_medicamento, m.descripcion 
             FROM plan_detalle pd
             LEFT JOIN medicamentos m ON m.id_medicamento = pd.id_medicamento
             WHERE pd.id_plan = ?`,
            { replacements: [plan.id_plan] }
          );
          
          if (detalles.length > 0) {
            detalles.forEach((det, idx) => {
              logger.info(`      ${idx + 1}. ${det.nombre_medicamento || 'Medicamento desconocido'}`);
              logger.info(`         - Dosis: ${det.dosis || 'N/A'}`);
              logger.info(`         - Frecuencia: ${det.frecuencia || 'N/A'}`);
              logger.info(`         - Activo: ${det.activo ? 'Sí' : 'No'}`);
            });
          } else {
            logger.info(`      ⚠️  Este plan no tiene medicamentos asignados`);
          }
        }
      } else {
        logger.info(`   ⚠️  No hay planes de medicación registrados`);
      }

      // 3. Citas
      const [citas] = await sequelize.query(
        `SELECT c.*, d.nombre as doctor_nombre, d.apellido_paterno as doctor_apellido
         FROM citas c
         LEFT JOIN doctores d ON d.id_doctor = c.id_doctor
         WHERE c.id_paciente = ?
         ORDER BY c.fecha_cita DESC`,
        { replacements: [paciente.id] }
      );
      logger.info(`\n📅 CITAS: ${citas.length} registro(s)`);
      if (citas.length > 0) {
        citas.forEach((cita, idx) => {
          const doctorNombre = cita.doctor_nombre 
            ? `${cita.doctor_nombre} ${cita.doctor_apellido || ''}`.trim()
            : 'No asignado';
          logger.info(`   ${idx + 1}. Fecha: ${cita.fecha_cita || 'N/A'}`);
          logger.info(`      - Doctor: ${doctorNombre}`);
          logger.info(`      - Motivo: ${cita.motivo || 'N/A'}`);
          logger.info(`      - Asistencia: ${cita.asistencia !== null ? (cita.asistencia ? 'Sí' : 'No') : 'N/A'}`);
          logger.info(`      - Primera Consulta: ${cita.es_primera_consulta ? 'Sí' : 'No'}`);
        });
      } else {
        logger.info(`   ⚠️  No hay citas registradas`);
      }

      // 4. Diagnósticos (asociados a citas)
      const [diagnosticos] = await sequelize.query(
        `SELECT d.*, c.id_paciente, c.fecha_cita
         FROM diagnosticos d
         INNER JOIN citas c ON c.id_cita = d.id_cita
         WHERE c.id_paciente = ?
         ORDER BY d.fecha_registro DESC`,
        { replacements: [paciente.id] }
      );
      logger.info(`\n🩺 DIAGNÓSTICOS: ${diagnosticos.length} registro(s)`);
      if (diagnosticos.length > 0) {
        diagnosticos.slice(0, 3).forEach((diag, idx) => {
          logger.info(`   ${idx + 1}. Fecha Registro: ${diag.fecha_registro || 'N/A'}`);
          logger.info(`      - Fecha Cita: ${diag.fecha_cita || 'N/A'}`);
          logger.info(`      - Descripción: ${diag.descripcion ? diag.descripcion.substring(0, 50) + '...' : 'N/A'}`);
        });
        if (diagnosticos.length > 3) {
          logger.info(`   ... y ${diagnosticos.length - 3} diagnóstico(s) más`);
        }
      } else {
        logger.info(`   ⚠️  No hay diagnósticos registrados`);
      }

      // 5. Comorbilidades
      const [comorbilidades] = await sequelize.query(
        `SELECT pc.*, c.nombre_comorbilidad, c.descripcion
         FROM paciente_comorbilidad pc
         LEFT JOIN comorbilidades c ON c.id_comorbilidad = pc.id_comorbilidad
         WHERE pc.id_paciente = ?`,
        { replacements: [paciente.id] }
      );
      logger.info(`\n🦠 COMORBILIDADES: ${comorbilidades.length} registro(s)`);
      if (comorbilidades.length > 0) {
        comorbilidades.forEach((com, idx) => {
          logger.info(`   ${idx + 1}. ${com.nombre_comorbilidad || 'Desconocida'}`);
          logger.info(`      - Fecha Detección: ${com.fecha_deteccion || 'N/A'}`);
          logger.info(`      - Observaciones: ${com.observaciones ? com.observaciones.substring(0, 50) + '...' : 'N/A'}`);
        });
      } else {
        logger.info(`   ⚠️  No hay comorbilidades registradas`);
      }

      // 6. Red de Apoyo
      const [redApoyo] = await sequelize.query(
        `SELECT * FROM red_apoyo WHERE id_paciente = ?`,
        { replacements: [paciente.id] }
      );
      logger.info(`\n👥 RED DE APOYO: ${redApoyo.length} contacto(s)`);
      if (redApoyo.length > 0) {
        redApoyo.forEach((contacto, idx) => {
          logger.info(`   ${idx + 1}. ${contacto.nombre || 'Sin nombre'}`);
          logger.info(`      - Parentesco: ${contacto.parentesco || 'N/A'}`);
          logger.info(`      - Teléfono: ${contacto.telefono || 'N/A'}`);
        });
      } else {
        logger.info(`   ⚠️  No hay contactos de red de apoyo registrados`);
      }

      // 7. Información General (tabla no existe actualmente)
      // const [infoGeneral] = await sequelize.query(
      //   `SELECT * FROM informacion_general WHERE id_paciente = ?`,
      //   { replacements: [paciente.id] }
      // );
      logger.info(`\n📋 INFORMACIÓN GENERAL: (tabla no existe en la BD)`);

      // Resumen
      logger.info(`\n📊 RESUMEN:`);
      logger.info(`   ✅ Signos Vitales: ${signosVitales.length}`);
      logger.info(`   ✅ Planes de Medicación: ${planesMedicacion.length}`);
      logger.info(`   ✅ Citas: ${citas.length}`);
      logger.info(`   ✅ Diagnósticos: ${diagnosticos.length}`);
      logger.info(`   ✅ Comorbilidades: ${comorbilidades.length}`);
      logger.info(`   ✅ Red de Apoyo: ${redApoyo.length}`);
    }

    logger.info('\n\n' + '='.repeat(80));
    logger.info('✅ Consulta completada');
    logger.info('='.repeat(80));

  } catch (error) {
    logger.error('❌ Error consultando datos:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

consultarDatosPacientes()
  .then(() => {
    logger.info('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Error fatal:', error);
    console.error('Error detallado:', error);
    process.exit(1);
  });

