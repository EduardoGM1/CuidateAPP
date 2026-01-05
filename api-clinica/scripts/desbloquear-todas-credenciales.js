import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import logger from '../utils/logger.js';

async function desbloquearTodasCredenciales() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    logger.info('🔓 DESBLOQUEANDO TODAS LAS CREDENCIALES');
    logger.info('='.repeat(80));

    // Desbloquear todas las credenciales y resetear intentos fallidos
    const [resultado] = await sequelize.query(
      `UPDATE auth_credentials 
       SET locked_until = NULL, 
           failed_attempts = 0 
       WHERE locked_until IS NOT NULL 
          OR failed_attempts > 0`
    );

    logger.info(`✅ Credenciales desbloqueadas y intentos reseteados`);
    logger.info(`   Registros afectados: ${resultado.affectedRows || 0}`);

    // Verificar credenciales bloqueadas restantes
    const [bloqueadas] = await sequelize.query(
      `SELECT COUNT(*) as total 
       FROM auth_credentials 
       WHERE locked_until IS NOT NULL 
         AND locked_until > NOW()`
    );

    const [conIntentos] = await sequelize.query(
      `SELECT COUNT(*) as total 
       FROM auth_credentials 
       WHERE failed_attempts > 0`
    );

    logger.info(`\n📊 Estado actual:`);
    logger.info(`   Credenciales bloqueadas: ${bloqueadas[0].total}`);
    logger.info(`   Credenciales con intentos fallidos: ${conIntentos[0].total}`);

    if (bloqueadas[0].total === 0 && conIntentos[0].total === 0) {
      logger.info(`\n✅ Todas las credenciales están desbloqueadas`);
    }

  } catch (error) {
    logger.error('❌ Error desbloqueando credenciales:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

desbloquearTodasCredenciales()
  .then(() => {
    logger.info('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Error fatal:', error);
    console.error('Error detallado:', error);
    process.exit(1);
  });



