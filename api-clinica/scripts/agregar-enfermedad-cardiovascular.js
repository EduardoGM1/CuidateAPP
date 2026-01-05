/**
 * Script para agregar "Enfermedad Cardiovascular" a la base de datos
 * 
 * Ejecutar: node scripts/agregar-enfermedad-cardiovascular.js
 */

import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../config/db.js';
import { Comorbilidad } from '../models/associations.js';
import logger from '../utils/logger.js';

async function agregarEnfermedadCardiovascular() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado a la base de datos');

    // Verificar si ya existe
    const existe = await Comorbilidad.findOne({
      where: {
        nombre_comorbilidad: 'Enfermedad Cardiovascular'
      }
    });

    if (existe) {
      logger.info('ℹ️  La comorbilidad "Enfermedad Cardiovascular" ya existe en la base de datos');
      logger.info(`   ID: ${existe.id_comorbilidad}`);
      return;
    }

    // Crear la comorbilidad
    const nuevaComorbilidad = await Comorbilidad.create({
      nombre_comorbilidad: 'Enfermedad Cardiovascular',
      descripcion: 'Enfermedad que afecta el corazón y los vasos sanguíneos'
    });

    logger.info('✅ Comorbilidad "Enfermedad Cardiovascular" agregada exitosamente');
    logger.info(`   ID: ${nuevaComorbilidad.id_comorbilidad}`);
    logger.info(`   Nombre: ${nuevaComorbilidad.nombre_comorbilidad}`);

  } catch (error) {
    logger.error('❌ Error agregando comorbilidad:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      logger.error('   La comorbilidad ya existe en la base de datos');
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    logger.info('🔌 Conexión cerrada');
  }
}

agregarEnfermedadCardiovascular();

