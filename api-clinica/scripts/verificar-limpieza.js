/**
 * Script para verificar que la limpieza se realizó correctamente
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';

async function verificarLimpieza() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 VERIFICANDO LIMPIEZA DE BASE DE DATOS');
    console.log('='.repeat(80) + '\n');

    const [comorbilidades] = await sequelize.query('SELECT COUNT(*) as total FROM comorbilidades');
    const [vacunas] = await sequelize.query('SELECT COUNT(*) as total FROM vacunas');
    const [medicamentos] = await sequelize.query('SELECT COUNT(*) as total FROM medicamentos');
    const [modulos] = await sequelize.query('SELECT COUNT(*) as total FROM modulos');
    const [doctores] = await sequelize.query('SELECT COUNT(*) as total FROM doctores');
    const [pacientes] = await sequelize.query('SELECT COUNT(*) as total FROM pacientes');
    const [citas] = await sequelize.query('SELECT COUNT(*) as total FROM citas');
    const [signos] = await sequelize.query('SELECT COUNT(*) as total FROM signos_vitales');
    const [diagnosticos] = await sequelize.query('SELECT COUNT(*) as total FROM diagnosticos');
    const [planes] = await sequelize.query('SELECT COUNT(*) as total FROM planes_medicacion');
    const [redApoyo] = await sequelize.query('SELECT COUNT(*) as total FROM red_apoyo');
    const [esquemaVac] = await sequelize.query('SELECT COUNT(*) as total FROM esquema_vacunacion');
    const [pacienteAuth] = await sequelize.query('SELECT COUNT(*) as total FROM paciente_auth');

    console.log('📊 TABLAS MAESTRAS (deben mantenerse):');
    console.log(`   ✅ Comorbilidades: ${comorbilidades[0].total} registros`);
    console.log(`   ✅ Vacunas: ${vacunas[0].total} registros`);
    console.log(`   ✅ Medicamentos: ${medicamentos[0].total} registros`);
    console.log(`   ✅ Módulos: ${modulos[0].total} registros`);
    console.log(`   ✅ Doctores: ${doctores[0].total} registros`);
    console.log('');

    console.log('📊 TABLAS DE PACIENTES (deben estar vacías):');
    const pacientesCount = parseInt(pacientes[0].total) || 0;
    const citasCount = parseInt(citas[0].total) || 0;
    const signosCount = parseInt(signos[0].total) || 0;
    const diagnosticosCount = parseInt(diagnosticos[0].total) || 0;
    const planesCount = parseInt(planes[0].total) || 0;
    const redApoyoCount = parseInt(redApoyo[0].total) || 0;
    const esquemaVacCount = parseInt(esquemaVac[0].total) || 0;
    const pacienteAuthCount = parseInt(pacienteAuth[0].total) || 0;

    console.log(`   ${pacientesCount === 0 ? '✅' : '❌'} Pacientes: ${pacientesCount} registros`);
    console.log(`   ${citasCount === 0 ? '✅' : '❌'} Citas: ${citasCount} registros`);
    console.log(`   ${signosCount === 0 ? '✅' : '❌'} Signos Vitales: ${signosCount} registros`);
    console.log(`   ${diagnosticosCount === 0 ? '✅' : '❌'} Diagnósticos: ${diagnosticosCount} registros`);
    console.log(`   ${planesCount === 0 ? '✅' : '❌'} Planes de Medicación: ${planesCount} registros`);
    console.log(`   ${redApoyoCount === 0 ? '✅' : '❌'} Red de Apoyo: ${redApoyoCount} registros`);
    console.log(`   ${esquemaVacCount === 0 ? '✅' : '❌'} Esquema de Vacunación: ${esquemaVacCount} registros`);
    console.log(`   ${pacienteAuthCount === 0 ? '✅' : '❌'} Autenticación Paciente: ${pacienteAuthCount} registros`);
    console.log('');

    // Verificar que los IDs están reseteados (deben empezar en 1)
    const [nextIdPaciente] = await sequelize.query("SHOW TABLE STATUS LIKE 'pacientes'");
    const nextAutoIncrement = nextIdPaciente[0].Auto_increment;

    console.log('🔢 VERIFICACIÓN DE IDs:');
    console.log(`   Próximo ID de Paciente: ${nextAutoIncrement} (debe ser 1)`);
    console.log('');

    const todoOk = 
      pacientesCount === 0 && 
      citasCount === 0 && 
      signosCount === 0 && 
      diagnosticosCount === 0 &&
      planesCount === 0 &&
      redApoyoCount === 0 &&
      esquemaVacCount === 0 &&
      pacienteAuthCount === 0 &&
      nextAutoIncrement === 1 &&
      parseInt(comorbilidades[0].total) > 0 &&
      parseInt(vacunas[0].total) > 0 &&
      parseInt(medicamentos[0].total) > 0;

    console.log('='.repeat(80));
    if (todoOk) {
      console.log('✅ VERIFICACIÓN EXITOSA - Base de datos limpia');
    } else {
      console.log('⚠️  VERIFICACIÓN COMPLETADA CON ADVERTENCIAS');
    }
    console.log('='.repeat(80) + '\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

verificarLimpieza();

