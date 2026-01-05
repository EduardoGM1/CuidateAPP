import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { Doctor, Modulo } from '../models/associations.js';
import logger from '../utils/logger.js';

/**
 * Script para desasignar doctores del módulo 7 y luego eliminar el módulo
 */
async function desasignarYEliminarModulo7() {
  try {
    logger.info('🔌 Conectando a la base de datos...');
    await sequelize.authenticate();
    logger.info('✅ Conexión establecida');

    // Buscar el módulo 7
    const modulo7 = await Modulo.findByPk(7);
    
    if (!modulo7) {
      logger.info('✅ El módulo 7 no existe. No hay nada que hacer.');
      await sequelize.close();
      process.exit(0);
    }

    logger.info(`\n📋 Módulo encontrado: "${modulo7.nombre_modulo}" (ID: ${modulo7.id_modulo})`);

    // Buscar doctores que usan este módulo
    const doctoresConModulo7 = await Doctor.findAll({
      where: { id_modulo: 7 },
      attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'id_modulo']
    });

    logger.info(`\n👨‍⚕️ Doctores usando el módulo 7: ${doctoresConModulo7.length}`);

    if (doctoresConModulo7.length > 0) {
      logger.info('🔄 Desasignando módulo de los doctores...');
      
      for (const doctor of doctoresConModulo7) {
        await doctor.update({ id_modulo: null });
        logger.info(`   ✅ Doctor "${doctor.nombre} ${doctor.apellido_paterno}" (ID: ${doctor.id_doctor}) desasignado del módulo`);
      }
    }

    // Eliminar el módulo
    logger.info('\n🗑️  Eliminando módulo 7...');
    await modulo7.destroy();
    logger.info(`✅ Módulo "${modulo7.nombre_modulo}" eliminado exitosamente`);

    // Verificar resultado
    const modulosRestantes = await Modulo.count();
    logger.info(`\n📊 Total de módulos restantes en la base de datos: ${modulosRestantes}`);

    if (modulosRestantes === 0) {
      logger.info('✅ Base de datos limpia. Ahora puedes crear módulos desde la interfaz de gestión.');
    }

    logger.info('\n✅ Proceso completado exitosamente');

  } catch (error) {
    logger.error('❌ Error en el proceso:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Ejecutar el script
desasignarYEliminarModulo7()
  .then(() => {
    logger.info('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Error fatal:', error);
    process.exit(1);
  });


