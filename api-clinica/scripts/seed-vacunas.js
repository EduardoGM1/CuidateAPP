import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Vacuna } from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * Script para añadir vacunas comunes al sistema
 */
async function seedVacunas() {
  try {
    logger.info('🔌 Conectando a la base de datos...');
    await sequelize.authenticate();
    logger.info('✅ Conexión establecida');

    // Vacunas comunes
    const vacunas = [
      {
        nombre_vacuna: 'Hepatitis B',
        descripcion: 'Vacuna para la prevención de la hepatitis B. Se administra en serie de 3 dosis. Protege contra la infección hepática causada por el virus de la hepatitis B.',
        tipo: 'Hepatitis'
      },
      {
        nombre_vacuna: 'Influenza (Gripe)',
        descripcion: 'Vacuna anual contra la influenza estacional. Se recomienda especialmente para adultos mayores, niños, mujeres embarazadas y personas con condiciones médicas crónicas.',
        tipo: 'Influenza'
      },
      {
        nombre_vacuna: 'Tétanos',
        descripcion: 'Vacuna contra el tétanos (toxoide tetánico). Previene la infección por Clostridium tetani. Se administra en combinación con difteria (Td o Tdap) cada 10 años en adultos.',
        tipo: 'Toxoide'
      },
      {
        nombre_vacuna: 'Difteria',
        descripcion: 'Vacuna contra la difteria, generalmente administrada en combinación con tétanos y tos ferina (DTP, Td, Tdap). Protege contra la enfermedad respiratoria causada por Corynebacterium diphtheriae.',
        tipo: 'Toxoide'
      },
      {
        nombre_vacuna: 'Sarampión',
        descripcion: 'Vacuna contra el sarampión, generalmente administrada como parte de la triple viral (MMR: sarampión, paperas y rubéola). Previene el sarampión, una enfermedad viral altamente contagiosa.',
        tipo: 'Viral'
      }
    ];

    logger.info(`💉 Intentando añadir ${vacunas.length} vacunas...\n`);

    let añadidas = 0;
    let existentes = 0;
    let errores = 0;

    for (const vacuna of vacunas) {
      try {
        // Verificar si ya existe
        const existente = await Vacuna.findOne({
          where: { nombre_vacuna: vacuna.nombre_vacuna }
        });

        if (existente) {
          logger.warn(`⚠️  La vacuna "${vacuna.nombre_vacuna}" ya existe (ID: ${existente.id_vacuna})`);
          existentes++;
        } else {
          const nuevaVacuna = await Vacuna.create(vacuna);
          logger.info(`✅ Vacuna añadida: ${nuevaVacuna.nombre_vacuna} (ID: ${nuevaVacuna.id_vacuna}, Tipo: ${nuevaVacuna.tipo || 'N/A'})`);
          añadidas++;
        }
      } catch (error) {
        logger.error(`❌ Error al añadir "${vacuna.nombre_vacuna}":`, error.message);
        errores++;
      }
    }

    logger.info('\n📊 Resumen:');
    logger.info(`   ✅ Añadidas: ${añadidas}`);
    logger.info(`   ⚠️  Existentes: ${existentes}`);
    logger.info(`   ❌ Errores: ${errores}`);
    logger.info(`   💉 Total procesadas: ${vacunas.length}\n`);

    // Mostrar todas las vacunas actuales
    const totalVacunas = await Vacuna.count();
    logger.info(`📊 Total de vacunas en la base de datos: ${totalVacunas}`);

    logger.info('✅ Proceso completado exitosamente');

  } catch (error) {
    logger.error('❌ Error en el proceso de seeding:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar el script
seedVacunas()
  .then(() => {
    logger.info('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });


