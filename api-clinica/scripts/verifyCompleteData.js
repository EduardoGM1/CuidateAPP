/**
 * Script de Verificación de Datos Creados
 * Muestra un resumen completo de los datos en la base de datos
 */

import sequelize from '../config/db.js';
import { 
  Usuario, Doctor, Paciente, Cita, Diagnostico, PlanMedicacion, 
  SignoVital, PuntoChequeo, EsquemaVacunacion, Modulo
} from '../models/associations.js';
import { Op } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

async function verifyData() {
  try {
    console.log('📊 VERIFICACIÓN DE DATOS EN LA BASE DE DATOS');
    console.log('============================================');

    // 1. Contar usuarios por rol
    console.log('\n👥 USUARIOS POR ROL:');
    const usuariosPorRol = await Usuario.findAll({
      attributes: ['rol', [sequelize.fn('COUNT', sequelize.col('id_usuario')), 'count']],
      group: ['rol'],
      raw: true
    });
    usuariosPorRol.forEach(rol => {
      console.log(`   ${rol.rol}: ${rol.count} usuarios`);
    });

    // 2. Contar doctores activos
    console.log('\n👨‍⚕️ DOCTORES:');
    const doctoresActivos = await Doctor.count({ where: { activo: true } });
    const doctoresInactivos = await Doctor.count({ where: { activo: false } });
    console.log(`   Activos: ${doctoresActivos}`);
    console.log(`   Inactivos: ${doctoresInactivos}`);

    // 3. Contar pacientes
    console.log('\n👥 PACIENTES:');
    const pacientesActivos = await Paciente.count({ where: { activo: true } });
    const pacientesInactivos = await Paciente.count({ where: { activo: false } });
    console.log(`   Activos: ${pacientesActivos}`);
    console.log(`   Inactivos: ${pacientesInactivos}`);

    // 4. Pacientes nuevos (últimos 7 días)
    const sieteDiasAtras = new Date();
    sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);
    
    const pacientesNuevos = await Paciente.count({
      where: {
        fecha_registro: {
          [Op.gte]: sieteDiasAtras
        }
      }
    });
    console.log(`   Nuevos (últimos 7 días): ${pacientesNuevos}`);

    // 5. Citas de los últimos 7 días
    console.log('\n📅 CITAS DE LOS ÚLTIMOS 7 DÍAS:');
    const citasUltimos7Dias = await Cita.findAll({
      where: {
        fecha_cita: {
          [Op.gte]: sieteDiasAtras
        }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('fecha_cita')), 'fecha'],
        [sequelize.fn('COUNT', sequelize.col('id_cita')), 'total']
      ],
      group: [sequelize.fn('DATE', sequelize.col('fecha_cita'))],
      order: [[sequelize.fn('DATE', sequelize.col('fecha_cita')), 'DESC']],
      raw: true
    });

    citasUltimos7Dias.forEach(cita => {
      console.log(`   ${cita.fecha}: ${cita.total} citas`);
    });

    // 6. Estadísticas de asistencia
    console.log('\n📈 ESTADÍSTICAS DE ASISTENCIA:');
    const totalCitas = await Cita.count();
    const citasAsistidas = await Cita.count({ where: { asistencia: true } });
    const citasNoAsistidas = await Cita.count({ where: { asistencia: false } });
    const citasSinAsistencia = await Cita.count({ where: { asistencia: null } });
    
    const tasaAsistencia = totalCitas > 0 ? ((citasAsistidas / totalCitas) * 100).toFixed(1) : 0;
    
    console.log(`   Total de citas: ${totalCitas}`);
    console.log(`   Asistidas: ${citasAsistidas} (${tasaAsistencia}%)`);
    console.log(`   No asistidas: ${citasNoAsistidas}`);
    console.log(`   Sin registro: ${citasSinAsistencia}`);

    // 7. Primera consulta
    console.log('\n🩺 PRIMERA CONSULTA:');
    const primeraConsulta = await Cita.count({ where: { es_primera_consulta: true } });
    const consultasSeguimiento = await Cita.count({ where: { es_primera_consulta: false } });
    console.log(`   Primera consulta: ${primeraConsulta}`);
    console.log(`   Consultas de seguimiento: ${consultasSeguimiento}`);

    // 8. Diagnósticos creados
    console.log('\n🔬 DIAGNÓSTICOS:');
    const totalDiagnosticos = await Diagnostico.count();
    console.log(`   Total: ${totalDiagnosticos}`);

    // 9. Planes de medicación
    console.log('\n💊 PLANES DE MEDICACIÓN:');
    const totalPlanes = await PlanMedicacion.count();
    const planesActivos = await PlanMedicacion.count({ where: { activo: true } });
    console.log(`   Total: ${totalPlanes}`);
    console.log(`   Activos: ${planesActivos}`);

    // 10. Signos vitales
    console.log('\n🩺 SIGNOS VITALES:');
    const totalSignos = await SignoVital.count();
    console.log(`   Total registros: ${totalSignos}`);

    // 11. Vacunas aplicadas
    console.log('\n💉 VACUNAS:');
    const totalVacunas = await EsquemaVacunacion.count();
    console.log(`   Total aplicadas: ${totalVacunas}`);

    // 12. Módulos disponibles
    console.log('\n📋 MÓDULOS:');
    const modulos = await Modulo.findAll({
      attributes: ['id_modulo', 'nombre_modulo'],
      order: [['id_modulo', 'ASC']]
    });
    modulos.forEach(modulo => {
      console.log(`   ${modulo.id_modulo}. ${modulo.nombre_modulo}`);
    });

    // 13. Resumen final
    console.log('\n🎯 RESUMEN FINAL:');
    console.log('==================');
    console.log(`✅ ${usuariosPorRol.reduce((sum, rol) => sum + parseInt(rol.count), 0)} usuarios totales`);
    console.log(`✅ ${doctoresActivos} doctores activos`);
    console.log(`✅ ${pacientesActivos} pacientes activos`);
    console.log(`✅ ${pacientesNuevos} pacientes nuevos (últimos 7 días)`);
    console.log(`✅ ${totalCitas} citas totales`);
    console.log(`✅ ${citasUltimos7Dias.reduce((sum, cita) => sum + parseInt(cita.total), 0)} citas en los últimos 7 días`);
    console.log(`✅ ${tasaAsistencia}% tasa de asistencia`);
    console.log(`✅ ${primeraConsulta} primeras consultas`);
    console.log(`✅ ${totalDiagnosticos} diagnósticos`);
    console.log(`✅ ${totalPlanes} planes de medicación`);
    console.log(`✅ ${totalSignos} registros de signos vitales`);
    console.log(`✅ ${totalVacunas} vacunas aplicadas`);

    console.log('\n🎉 BASE DE DATOS POBLADA EXITOSAMENTE');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar verificación
verifyData();
