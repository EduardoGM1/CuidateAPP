/**
 * Script para verificar errores del sistema en la auditoría
 * 
 * Ejecutar: node scripts/verificar-errores-auditoria.js
 */

import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../config/db.js';
import { SistemaAuditoria } from '../models/associations.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

async function verificarErroresAuditoria() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado a la base de datos');

    // Buscar errores del sistema
    const errores = await SistemaAuditoria.findAll({
      where: {
        tipo_accion: {
          [Op.in]: ['error_sistema', 'error_critico']
        }
      },
      order: [['fecha_creacion', 'DESC']],
      limit: 20
    });

    logger.info(`\n📋 Encontrados ${errores.length} errores del sistema:\n`);

    if (errores.length === 0) {
      logger.info('✅ No se encontraron errores del sistema en la auditoría');
      return;
    }

    // Agrupar por tipo de error
    const erroresPorTipo = {};
    errores.forEach(error => {
      const tipo = error.tipo_accion;
      if (!erroresPorTipo[tipo]) {
        erroresPorTipo[tipo] = [];
      }
      erroresPorTipo[tipo].push(error);
    });

    // Mostrar errores agrupados
    for (const [tipo, listaErrores] of Object.entries(erroresPorTipo)) {
      logger.info(`\n🔴 ${tipo.toUpperCase()} (${listaErrores.length} errores):`);
      
      listaErrores.forEach((error, index) => {
        const datosNuevos = error.datos_nuevos || {};
        const mensaje = error.descripcion || datosNuevos.message || 'Sin mensaje';
        const fecha = new Date(error.fecha_creacion).toLocaleString('es-ES');
        
        logger.info(`\n   ${index + 1}. ${mensaje}`);
        logger.info(`      Fecha: ${fecha}`);
        logger.info(`      Severidad: ${error.severidad || 'N/A'}`);
        
        if (datosNuevos.message) {
          logger.info(`      Mensaje: ${datosNuevos.message}`);
        }
        
        if (error.stack_trace) {
          const stackLines = error.stack_trace.split('\n').slice(0, 3);
          logger.info(`      Stack (primeras 3 líneas):`);
          stackLines.forEach(line => {
            logger.info(`         ${line.trim()}`);
          });
        }
        
        if (datosNuevos.path) {
          logger.info(`      Ruta: ${datosNuevos.method || 'N/A'} ${datosNuevos.path}`);
        }
      });
    }

    // Buscar específicamente errores de encriptación
    const erroresEncriptacion = errores.filter(error => {
      const descripcion = error.descripcion || '';
      const datosNuevos = error.datos_nuevos || {};
      const mensaje = datosNuevos.message || '';
      return descripcion.includes('ENCRYPTION_KEY') || 
             descripcion.includes('encryption') || 
             mensaje.includes('ENCRYPTION_KEY') ||
             mensaje.includes('encryption');
    });

    if (erroresEncriptacion.length > 0) {
      logger.info(`\n\n🔐 ERRORES DE ENCRIPTACIÓN (${erroresEncriptacion.length}):`);
      erroresEncriptacion.forEach((error, index) => {
        const datosNuevos = error.datos_nuevos || {};
        logger.info(`\n   ${index + 1}. ${error.descripcion || datosNuevos.message}`);
        logger.info(`      Fecha: ${new Date(error.fecha_creacion).toLocaleString('es-ES')}`);
        if (datosNuevos.stack) {
          logger.info(`      Stack: ${datosNuevos.stack.split('\n')[0]}`);
        }
      });
    }

    // Estadísticas
    logger.info(`\n\n📊 ESTADÍSTICAS:`);
    logger.info(`   - Total de errores: ${errores.length}`);
    logger.info(`   - Errores críticos: ${erroresPorTipo['error_critico']?.length || 0}`);
    logger.info(`   - Errores del sistema: ${erroresPorTipo['error_sistema']?.length || 0}`);
    logger.info(`   - Errores de encriptación: ${erroresEncriptacion.length}`);

  } catch (error) {
    logger.error('❌ Error verificando auditoría:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    logger.info('\n🔌 Conexión cerrada');
  }
}

verificarErroresAuditoria();

