import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Comorbilidad } from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * Script para añadir comorbilidades comunes al sistema
 */
async function seedComorbilidades() {
  try {
    logger.info('🔌 Conectando a la base de datos...');
    await sequelize.authenticate();
    logger.info('✅ Conexión establecida');

    // Comorbilidades comunes
    const comorbilidades = [
      {
        nombre_comorbilidad: 'Diabetes',
        descripcion: 'Diabetes mellitus, una enfermedad metabólica caracterizada por niveles elevados de glucosa en sangre. Incluye Diabetes Tipo 1, Diabetes Tipo 2 y Diabetes Gestacional.'
      },
      {
        nombre_comorbilidad: 'Hipertensión',
        descripcion: 'Hipertensión arterial, condición crónica caracterizada por presión arterial persistentemente elevada (≥140/90 mmHg). Factor de riesgo importante para enfermedades cardiovasculares.'
      },
      {
        nombre_comorbilidad: 'Obesidad',
        descripcion: 'Obesidad, condición médica caracterizada por exceso de grasa corporal (IMC ≥30). Factor de riesgo para múltiples enfermedades crónicas incluyendo diabetes, hipertensión y enfermedades cardiovasculares.'
      },
      {
        nombre_comorbilidad: 'Dislipidemia',
        descripcion: 'Dislipidemia, alteración de los niveles de lípidos en sangre (colesterol, triglicéridos). Incluye hipercolesterolemia, hipertrigliceridemia y combinaciones de ambas.'
      },
      {
        nombre_comorbilidad: 'Enfermedad Renal Crónica',
        descripcion: 'Enfermedad Renal Crónica (ERC), pérdida progresiva e irreversible de la función renal. Puede avanzar a insuficiencia renal terminal requiriendo diálisis o trasplante.'
      },
      {
        nombre_comorbilidad: 'EPOC',
        descripcion: 'Enfermedad Pulmonar Obstructiva Crónica (EPOC), condición pulmonar obstructiva caracterizada por limitación del flujo aéreo. Incluye enfisema y bronquitis crónica.'
      },
      {
        nombre_comorbilidad: 'Enfermedad Cardiovascular',
        descripcion: 'Enfermedad Cardiovascular, grupo de enfermedades que afectan el corazón y los vasos sanguíneos. Incluye enfermedad coronaria, insuficiencia cardíaca, arritmias y enfermedad vascular periférica.'
      },
      {
        nombre_comorbilidad: 'Tuberculosis',
        descripcion: 'Tuberculosis (TB), enfermedad infecciosa causada por Mycobacterium tuberculosis que afecta principalmente los pulmones, pero puede afectar otros órganos. Requiere tratamiento prolongado con antibióticos específicos.'
      },
      {
        nombre_comorbilidad: 'Asma',
        descripcion: 'Asma, enfermedad crónica de las vías respiratorias caracterizada por inflamación, estrechamiento de las vías aéreas y síntomas recurrentes de sibilancias, disnea, opresión torácica y tos.'
      },
      {
        nombre_comorbilidad: 'Tabaquismo',
        descripcion: 'Tabaquismo, adicción a la nicotina y consumo regular de productos del tabaco. Factor de riesgo significativo para múltiples enfermedades incluyendo cáncer, EPOC, enfermedades cardiovasculares y eventos cerebrovasculares.'
      }
    ];

    logger.info(`🏥 Intentando añadir ${comorbilidades.length} comorbilidades...\n`);

    let añadidas = 0;
    let existentes = 0;
    let errores = 0;

    for (const comorbilidad of comorbilidades) {
      try {
        // Verificar si ya existe
        const existente = await Comorbilidad.findOne({
          where: { nombre_comorbilidad: comorbilidad.nombre_comorbilidad }
        });

        if (existente) {
          logger.warn(`⚠️  La comorbilidad "${comorbilidad.nombre_comorbilidad}" ya existe (ID: ${existente.id_comorbilidad})`);
          existentes++;
        } else {
          const nuevaComorbilidad = await Comorbilidad.create(comorbilidad);
          logger.info(`✅ Comorbilidad añadida: ${nuevaComorbilidad.nombre_comorbilidad} (ID: ${nuevaComorbilidad.id_comorbilidad})`);
          añadidas++;
        }
      } catch (error) {
        logger.error(`❌ Error al añadir "${comorbilidad.nombre_comorbilidad}":`, error.message);
        errores++;
      }
    }

    logger.info('\n📊 Resumen:');
    logger.info(`   ✅ Añadidas: ${añadidas}`);
    logger.info(`   ⚠️  Existentes: ${existentes}`);
    logger.info(`   ❌ Errores: ${errores}`);
    logger.info(`   🏥 Total procesadas: ${comorbilidades.length}\n`);

    // Mostrar todas las comorbilidades actuales
    const totalComorbilidades = await Comorbilidad.count();
    logger.info(`📊 Total de comorbilidades en la base de datos: ${totalComorbilidades}`);

    // Mostrar lista de todas las comorbilidades
    const todasComorbilidades = await Comorbilidad.findAll({
      attributes: ['id_comorbilidad', 'nombre_comorbilidad'],
      order: [['nombre_comorbilidad', 'ASC']]
    });

    if (todasComorbilidades.length > 0) {
      logger.info('\n📋 Lista de comorbilidades en el sistema:');
      todasComorbilidades.forEach((com, index) => {
        logger.info(`   ${index + 1}. [ID: ${com.id_comorbilidad}] ${com.nombre_comorbilidad}`);
      });
    }

    logger.info('\n✅ Proceso completado exitosamente');

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
seedComorbilidades()
  .then(() => {
    logger.info('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });


