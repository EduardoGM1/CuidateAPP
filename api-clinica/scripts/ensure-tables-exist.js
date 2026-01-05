/**
 * Script para verificar y crear las tablas comorbilidades y vacunas si no existen
 * 
 * Uso: node scripts/ensure-tables-exist.js
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Comorbilidad, Vacuna } from '../models/associations.js';
import logger from '../utils/logger.js';

async function ensureTablesExist() {
  try {
    logger.info('Verificando conexión a la base de datos...');
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida');

    logger.info('Verificando si las tablas existen...');
    
    // Verificar y sincronizar Comorbilidad
    try {
      await Comorbilidad.sync({ alter: false });
      logger.info('✅ Tabla comorbilidades verificada');
    } catch (error) {
      logger.warn(`Advertencia al verificar comorbilidades: ${error.message}`);
      // Intentar crear la tabla
      try {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS comorbilidades (
            id_comorbilidad INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_comorbilidad VARCHAR(150) NOT NULL UNIQUE,
            descripcion TEXT
          )
        `);
        logger.info('✅ Tabla comorbilidades creada manualmente');
      } catch (createError) {
        logger.error(`Error creando tabla comorbilidades: ${createError.message}`);
      }
    }

    // Verificar y sincronizar Vacuna
    try {
      await Vacuna.sync({ alter: false });
      logger.info('✅ Tabla vacunas verificada');
    } catch (error) {
      logger.warn(`Advertencia al verificar vacunas: ${error.message}`);
      // Intentar crear la tabla
      try {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS vacunas (
            id_vacuna INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_vacuna VARCHAR(150) NOT NULL UNIQUE,
            descripcion TEXT,
            tipo VARCHAR(100)
          )
        `);
        logger.info('✅ Tabla vacunas creada manualmente');
      } catch (createError) {
        logger.error(`Error creando tabla vacunas: ${createError.message}`);
      }
    }

    // Verificar que las tablas existen consultándolas
    const [comorbilidadesResult] = await sequelize.query("SELECT COUNT(*) as count FROM comorbilidades");
    const [vacunasResult] = await sequelize.query("SELECT COUNT(*) as count FROM vacunas");
    
    logger.info(`✅ Tabla comorbilidades: ${comorbilidadesResult[0]?.count || 0} registros`);
    logger.info(`✅ Tabla vacunas: ${vacunasResult[0]?.count || 0} registros`);

    logger.info('✅ Verificación completada exitosamente');
    
  } catch (error) {
    logger.error('Error verificando tablas:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Ejecutar el script
ensureTablesExist();


