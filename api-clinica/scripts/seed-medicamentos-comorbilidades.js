import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Medicamento } from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * Script para añadir medicamentos comunes usados para tratar comorbilidades
 */
async function seedMedicamentosComorbilidades() {
  try {
    logger.info('🔌 Conectando a la base de datos...');
    await sequelize.authenticate();
    logger.info('✅ Conexión establecida');

    // Medicamentos para tratar comorbilidades comunes
    const medicamentos = [
      {
        nombre_medicamento: 'Metformina',
        descripcion: 'Antidiabético oral de primera línea para el tratamiento de diabetes mellitus tipo 2. Reduce los niveles de glucosa en sangre mejorando la sensibilidad a la insulina.'
      },
      {
        nombre_medicamento: 'Losartán',
        descripcion: 'Antihipertensivo del grupo de los antagonistas del receptor de angiotensina II (ARA-II). Usado para el tratamiento de hipertensión arterial y protección renal en pacientes diabéticos.'
      },
      {
        nombre_medicamento: 'Atorvastatina',
        descripcion: 'Estatinas para el tratamiento de dislipidemia (colesterol elevado). Reduce el colesterol LDL y el riesgo de eventos cardiovasculares.'
      },
      {
        nombre_medicamento: 'Salbutamol',
        descripcion: 'Broncodilatador de acción rápida para el tratamiento del asma y EPOC. Alivia los síntomas de dificultad respiratoria y sibilancias.'
      },
      {
        nombre_medicamento: 'Sertralina',
        descripcion: 'Antidepresivo del grupo de los inhibidores selectivos de la recaptación de serotonina (ISRS). Usado para el tratamiento de depresión, ansiedad y trastornos del estado de ánimo.'
      }
    ];

    logger.info(`📋 Intentando añadir ${medicamentos.length} medicamentos...\n`);

    let añadidos = 0;
    let existentes = 0;
    let errores = 0;

    for (const medicamento of medicamentos) {
      try {
        // Verificar si ya existe
        const existente = await Medicamento.findOne({
          where: { nombre_medicamento: medicamento.nombre_medicamento }
        });

        if (existente) {
          logger.warn(`⚠️  El medicamento "${medicamento.nombre_medicamento}" ya existe (ID: ${existente.id_medicamento})`);
          existentes++;
        } else {
          const nuevoMedicamento = await Medicamento.create(medicamento);
          logger.info(`✅ Medicamento añadido: ${nuevoMedicamento.nombre_medicamento} (ID: ${nuevoMedicamento.id_medicamento})`);
          añadidos++;
        }
      } catch (error) {
        logger.error(`❌ Error al añadir "${medicamento.nombre_medicamento}":`, error.message);
        errores++;
      }
    }

    logger.info('\n📊 Resumen:');
    logger.info(`   ✅ Añadidos: ${añadidos}`);
    logger.info(`   ⚠️  Existentes: ${existentes}`);
    logger.info(`   ❌ Errores: ${errores}`);
    logger.info(`   📦 Total procesados: ${medicamentos.length}\n`);

    // Mostrar todos los medicamentos actuales
    const totalMedicamentos = await Medicamento.count();
    logger.info(`📊 Total de medicamentos en la base de datos: ${totalMedicamentos}`);

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
seedMedicamentosComorbilidades()
  .then(() => {
    logger.info('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });


