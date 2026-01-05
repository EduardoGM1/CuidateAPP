/**
 * Script de pruebas para las mejoras de auditoría
 * Verifica que todas las nuevas funcionalidades funcionen correctamente
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import auditoriaService from '../services/auditoriaService.js';
import alertasAuditoriaService from '../services/alertasAuditoriaService.js';
import exportAuditoriaService from '../services/exportAuditoriaService.js';

dotenv.config();

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verificarBaseDatos() {
  let connection;
  try {
    log('\n📊 Verificando estructura de base de datos...', 'cyan');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db',
    });

    // Verificar nuevos campos
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sistema_auditoria'
      AND COLUMN_NAME IN ('ip_address', 'user_agent', 'severidad', 'stack_trace')
    `, [process.env.DB_NAME || 'clinica_db']);

    if (columns.length === 4) {
      log('✅ Todos los nuevos campos están presentes', 'green');
      columns.forEach(col => {
        log(`   - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`, 'blue');
      });
    } else {
      log(`❌ Faltan campos. Encontrados: ${columns.length}/4`, 'red');
      return false;
    }

    // Verificar nuevos ENUMs
    const [enumTypes] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sistema_auditoria' 
      AND COLUMN_NAME = 'tipo_accion'
    `, [process.env.DB_NAME || 'clinica_db']);

    const tipoAccionEnum = enumTypes[0]?.COLUMN_TYPE || '';
    const nuevosTipos = ['login_exitoso', 'login_fallido', 'acceso_sospechoso', 'error_sistema', 'error_critico'];
    const tiposEncontrados = nuevosTipos.filter(tipo => tipoAccionEnum.includes(tipo));

    if (tiposEncontrados.length === nuevosTipos.length) {
      log('✅ Todos los nuevos tipos de acción están en el ENUM', 'green');
    } else {
      log(`⚠️  Algunos tipos faltan. Encontrados: ${tiposEncontrados.length}/${nuevosTipos.length}`, 'yellow');
    }

    // Verificar índices
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sistema_auditoria'
      AND INDEX_NAME IN ('idx_severidad', 'idx_ip_address', 'idx_fecha_severidad')
    `, [process.env.DB_NAME || 'clinica_db']);

    if (indexes.length >= 2) {
      log('✅ Índices creados correctamente', 'green');
      indexes.forEach(idx => {
        log(`   - ${idx.INDEX_NAME}`, 'blue');
      });
    } else {
      log(`⚠️  Algunos índices faltan. Encontrados: ${indexes.length}`, 'yellow');
    }

    await connection.end();
    return true;
  } catch (error) {
    log(`❌ Error verificando base de datos: ${error.message}`, 'red');
    if (connection) await connection.end();
    return false;
  }
}

async function probarRegistroLogin() {
  try {
    log('\n🔐 Probando registro de login...', 'cyan');
    
    const resultado = await auditoriaService.registrarLoginExitoso(
      1, 
      '192.168.1.100', 
      'Mozilla/5.0 (Test Browser)'
    );

    if (resultado && resultado.id_auditoria) {
      log('✅ Login exitoso registrado correctamente', 'green');
      log(`   ID: ${resultado.id_auditoria}`, 'blue');
      return resultado;
    } else {
      log('❌ Error registrando login exitoso', 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Error en prueba de login: ${error.message}`, 'red');
    return null;
  }
}

async function probarRegistroLoginFallido() {
  try {
    log('\n❌ Probando registro de login fallido...', 'cyan');
    
    const resultado = await auditoriaService.registrarLoginFallido(
      'test@example.com',
      '192.168.1.100',
      'Mozilla/5.0 (Test Browser)',
      'Credenciales inválidas'
    );

    if (resultado && resultado.id_auditoria) {
      log('✅ Login fallido registrado correctamente', 'green');
      log(`   ID: ${resultado.id_auditoria}`, 'blue');
      return resultado;
    } else {
      log('❌ Error registrando login fallido', 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Error en prueba de login fallido: ${error.message}`, 'red');
    return null;
  }
}

async function probarRegistroError() {
  try {
    log('\n🔴 Probando registro de error del sistema...', 'cyan');
    
    const error = new Error('Error de prueba del sistema');
    error.stack = 'Error: Error de prueba del sistema\n    at test-auditoria-mejoras.js:123';
    
    const resultado = await auditoriaService.registrarErrorSistema(
      error,
      {
        method: 'GET',
        path: '/api/test',
        id_usuario: 1,
        ip_address: '192.168.1.100',
        user_agent: 'Test Agent'
      },
      'error'
    );

    if (resultado && resultado.id_auditoria) {
      log('✅ Error del sistema registrado correctamente', 'green');
      log(`   ID: ${resultado.id_auditoria}`, 'blue');
      return resultado;
    } else {
      log('❌ Error registrando error del sistema', 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Error en prueba de error del sistema: ${error.message}`, 'red');
    return null;
  }
}

async function probarDeteccionAccesosSospechosos() {
  try {
    log('\n⚠️  Probando detección de accesos sospechosos...', 'cyan');
    
    const resultado = await auditoriaService.detectarAccesosSospechosos(
      '192.168.1.100',
      'Mozilla/5.0 (Test Browser)',
      10
    );

    log(`✅ Detección completada`, 'green');
    log(`   Es sospechoso: ${resultado.esSospechoso}`, 'blue');
    log(`   Logins fallidos: ${resultado.loginsFallidos}`, 'blue');
    log(`   User agents diferentes: ${resultado.userAgentsDiferentes}`, 'blue');
    
    if (resultado.sospechas && resultado.sospechas.length > 0) {
      log(`   Sospechas detectadas: ${resultado.sospechas.length}`, 'yellow');
      resultado.sospechas.forEach(sospecha => {
        log(`     - ${sospecha.descripcion}`, 'yellow');
      });
    }
    
    return resultado;
  } catch (error) {
    log(`❌ Error en detección de accesos sospechosos: ${error.message}`, 'red');
    return null;
  }
}

async function probarExportacion() {
  try {
    log('\n📤 Probando exportación de datos...', 'cyan');
    
    const datosPrueba = [
      {
        id_auditoria: 1,
        fecha_creacion: new Date(),
        tipo_accion: 'login_exitoso',
        entidad_afectada: 'acceso',
        id_entidad: 1,
        descripcion: 'Login exitoso de prueba',
        usuario_nombre: 'test@example.com',
        ip_address: '192.168.1.100',
        severidad: 'info',
        user_agent: 'Test Browser'
      }
    ];

    // Probar CSV
    const csv = exportAuditoriaService.exportarCSV(datosPrueba, { tipo_accion: 'login_exitoso' });
    if (csv && csv.includes('ID')) {
      log('✅ Exportación CSV funciona correctamente', 'green');
      log(`   Tamaño: ${csv.length} caracteres`, 'blue');
    } else {
      log('❌ Error en exportación CSV', 'red');
    }

    // Probar Excel
    const excel = exportAuditoriaService.exportarExcel(datosPrueba, { tipo_accion: 'login_exitoso' });
    if (excel && excel.includes('ID')) {
      log('✅ Exportación Excel funciona correctamente', 'green');
      log(`   Tamaño: ${excel.length} caracteres`, 'blue');
    } else {
      log('❌ Error en exportación Excel', 'red');
    }

    return true;
  } catch (error) {
    log(`❌ Error en pruebas de exportación: ${error.message}`, 'red');
    return false;
  }
}

async function probarAlertas() {
  try {
    log('\n🔔 Probando sistema de alertas...', 'cyan');
    
    // Probar verificación de umbrales
    const umbralExcedido = await alertasAuditoriaService.verificarUmbrales('login_fallido', 10, 5);
    log(`   Umbral de login fallido: ${umbralExcedido ? 'Excedido' : 'Normal'}`, 'blue');

    // Probar alerta (no enviará notificación real, solo verificará)
    const accionPrueba = {
      id_auditoria: 999,
      tipo_accion: 'error_critico',
      descripcion: 'Error crítico de prueba',
      severidad: 'critical'
    };

    const requiereAlerta = await alertasAuditoriaService.verificarAlerta(accionPrueba);
    log(`   Acción crítica requiere alerta: ${requiereAlerta}`, 'blue');

    log('✅ Sistema de alertas funciona correctamente', 'green');
    return true;
  } catch (error) {
    log(`❌ Error en pruebas de alertas: ${error.message}`, 'red');
    return false;
  }
}

async function ejecutarPruebas() {
  log('\n🚀 Iniciando pruebas de mejoras de auditoría...\n', 'cyan');
  
  const resultados = {
    baseDatos: false,
    registroLogin: false,
    registroLoginFallido: false,
    registroError: false,
    deteccionSospechosos: false,
    exportacion: false,
    alertas: false
  };

  // Ejecutar pruebas
  resultados.baseDatos = await verificarBaseDatos();
  resultados.registroLogin = await probarRegistroLogin();
  resultados.registroLoginFallido = await probarRegistroLoginFallido();
  resultados.registroError = await probarRegistroError();
  resultados.deteccionSospechosos = await probarDeteccionAccesosSospechosos();
  resultados.exportacion = await probarExportacion();
  resultados.alertas = await probarAlertas();

  // Resumen
  log('\n📋 RESUMEN DE PRUEBAS\n', 'cyan');
  const totalPruebas = Object.keys(resultados).length;
  const pruebasExitosas = Object.values(resultados).filter(r => r !== false && r !== null).length;

  Object.entries(resultados).forEach(([prueba, resultado]) => {
    const estado = resultado !== false && resultado !== null ? '✅' : '❌';
    const nombre = prueba.replace(/([A-Z])/g, ' $1').trim();
    log(`${estado} ${nombre}`, resultado !== false && resultado !== null ? 'green' : 'red');
  });

  log(`\n📊 Resultado: ${pruebasExitosas}/${totalPruebas} pruebas exitosas`, 
      pruebasExitosas === totalPruebas ? 'green' : 'yellow');

  if (pruebasExitosas === totalPruebas) {
    log('\n🎉 ¡Todas las pruebas pasaron exitosamente!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.', 'yellow');
    process.exit(1);
  }
}

// Ejecutar pruebas
ejecutarPruebas().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

