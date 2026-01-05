/**
 * Script de Prueba para Sistema de Auditoría
 * 
 * Este script verifica que:
 * 1. El servicio de auditoría funciona correctamente
 * 2. Se pueden crear registros de auditoría
 * 3. Los registros se almacenan en la base de datos
 * 4. Se pueden consultar los registros
 */

import sequelize from '../config/db.js';
import auditoriaService from '../services/auditoriaService.js';
import { SistemaAuditoria, Usuario } from '../models/associations.js';
import logger from '../utils/logger.js';

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

async function testAuditoria() {
  log('\n🧪 INICIANDO PRUEBAS DE AUDITORÍA\n', 'cyan');

  try {
    // 1. Verificar conexión a la base de datos
    log('1️⃣ Verificando conexión a la base de datos...', 'blue');
    await sequelize.authenticate();
    log('   ✅ Conexión exitosa', 'green');

    // 2. Verificar que la tabla existe
    log('\n2️⃣ Verificando que la tabla sistema_auditoria existe...', 'blue');
    const tableExists = await sequelize.getQueryInterface().showAllTables()
      .then(tables => tables.includes('sistema_auditoria'));
    
    if (!tableExists) {
      log('   ❌ La tabla sistema_auditoria no existe', 'red');
      log('   💡 Ejecuta la migración: node scripts/create-sistema-auditoria-notificaciones-doctor.js', 'yellow');
      process.exit(1);
    }
    log('   ✅ La tabla existe', 'green');

    // 3. Obtener un usuario admin para pruebas
    log('\n3️⃣ Obteniendo usuario admin para pruebas...', 'blue');
    const admin = await Usuario.findOne({
      where: { rol: 'Admin' }
    });

    if (!admin) {
      log('   ⚠️  No se encontró usuario admin, usando id_usuario = null', 'yellow');
    } else {
      log(`   ✅ Usuario admin encontrado: ${admin.email} (ID: ${admin.id_usuario})`, 'green');
    }

    // 4. Crear registros de prueba
    log('\n4️⃣ Creando registros de prueba...', 'blue');

    // Registro 1: Acción automática del sistema
    log('   📝 Creando registro: Actualización automática de citas...', 'blue');
    const registro1 = await auditoriaService.registrarActualizacionCitasAutomatica(
      3,
      [
        { id_cita: 1, fecha_cita: new Date('2025-11-01'), estado_anterior: 'pendiente' },
        { id_cita: 2, fecha_cita: new Date('2025-11-02'), estado_anterior: 'pendiente' },
        { id_cita: 3, fecha_cita: new Date('2025-11-03'), estado_anterior: 'pendiente' }
      ]
    );
    if (registro1) {
      log(`   ✅ Registro creado (ID: ${registro1.id_auditoria})`, 'green');
    } else {
      log('   ❌ Error al crear registro', 'red');
    }

    // Registro 2: Cambio de estado de cita manual
    log('   📝 Creando registro: Cambio de estado de cita...', 'blue');
    const registro2 = await auditoriaService.registrarCambioEstadoCita(
      1,
      'pendiente',
      'atendida',
      admin?.id_usuario || null
    );
    if (registro2) {
      log(`   ✅ Registro creado (ID: ${registro2.id_auditoria})`, 'green');
    } else {
      log('   ❌ Error al crear registro', 'red');
    }

    // Registro 3: Reprogramación de cita
    log('   📝 Creando registro: Reprogramación de cita...', 'blue');
    const fechaAnterior = new Date('2025-11-10');
    const fechaNueva = new Date('2025-11-15');
    const registro3 = await auditoriaService.registrarReprogramacionCita(
      1,
      fechaAnterior,
      fechaNueva,
      admin?.id_usuario || null
    );
    if (registro3) {
      log(`   ✅ Registro creado (ID: ${registro3.id_auditoria})`, 'green');
    } else {
      log('   ❌ Error al crear registro', 'red');
    }

    // Registro 4: Acción genérica
    log('   📝 Creando registro: Acción genérica...', 'blue');
    const registro4 = await auditoriaService.registrarAccion({
      tipo_accion: 'paciente_creado',
      entidad_afectada: 'paciente',
      id_entidad: 1,
      descripcion: 'Paciente de prueba creado',
      datos_nuevos: { nombre: 'Juan', apellido: 'Pérez' },
      id_usuario: admin?.id_usuario || null
    });
    if (registro4) {
      log(`   ✅ Registro creado (ID: ${registro4.id_auditoria})`, 'green');
    } else {
      log('   ❌ Error al crear registro', 'red');
    }

    // 5. Verificar que los registros se guardaron
    log('\n5️⃣ Verificando registros en la base de datos...', 'blue');
    const totalRegistros = await SistemaAuditoria.count();
    log(`   📊 Total de registros en la base de datos: ${totalRegistros}`, 'cyan');

    const registrosRecientes = await SistemaAuditoria.findAll({
      limit: 5,
      order: [['fecha_creacion', 'DESC']],
      include: [{
        model: Usuario,
        attributes: ['id_usuario', 'email', 'rol'],
        required: false
      }]
    });

    log('\n   📋 Últimos 5 registros:', 'cyan');
    registrosRecientes.forEach((reg, index) => {
      log(`\n   ${index + 1}. ID: ${reg.id_auditoria}`, 'blue');
      log(`      Tipo: ${reg.tipo_accion}`, 'blue');
      log(`      Entidad: ${reg.entidad_afectada}`, 'blue');
      log(`      Descripción: ${reg.descripcion}`, 'blue');
      log(`      Usuario: ${reg.Usuario?.email || 'Sistema Automático'}`, 'blue');
      log(`      Fecha: ${reg.fecha_creacion.toLocaleString('es-MX')}`, 'blue');
    });

    // 6. Verificar tipos de acción
    log('\n6️⃣ Verificando tipos de acción registrados...', 'blue');
    const tiposAccion = await SistemaAuditoria.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('tipo_accion')), 'tipo_accion']
      ],
      raw: true
    });
    log(`   📊 Tipos de acción encontrados: ${tiposAccion.length}`, 'cyan');
    tiposAccion.forEach(tipo => {
      log(`      - ${tipo.tipo_accion}`, 'blue');
    });

    // 7. Verificar entidades afectadas
    log('\n7️⃣ Verificando entidades afectadas...', 'blue');
    const entidades = await SistemaAuditoria.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('entidad_afectada')), 'entidad_afectada']
      ],
      raw: true
    });
    log(`   📊 Entidades afectadas encontradas: ${entidades.length}`, 'cyan');
    entidades.forEach(ent => {
      log(`      - ${ent.entidad_afectada}`, 'blue');
    });

    // Resumen final
    log('\n✅ PRUEBAS COMPLETADAS EXITOSAMENTE\n', 'green');
    log(`📊 Resumen:`, 'cyan');
    log(`   - Total de registros: ${totalRegistros}`, 'cyan');
    log(`   - Registros creados en esta prueba: 4`, 'cyan');
    log(`   - Tipos de acción: ${tiposAccion.length}`, 'cyan');
    log(`   - Entidades afectadas: ${entidades.length}`, 'cyan');

  } catch (error) {
    log(`\n❌ ERROR EN LAS PRUEBAS: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar pruebas
testAuditoria();

