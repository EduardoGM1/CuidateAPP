/**
 * Inicialización de Cron Jobs
 * 
 * Configura y arranca todos los cron jobs del sistema.
 * Se ejecuta automáticamente al iniciar el servidor.
 */

import reminderService from './reminderService.js';
import RefreshTokenService from './refreshTokenService.js';
import SecretRotationService from './secretRotationService.js';
import cron from 'node-cron';
import logger from '../utils/logger.js';

/**
 * Inicializar todos los cron jobs del sistema
 */
export const initializeCronJobs = () => {
  try {
    logger.info('🔄 Inicializando cron jobs del sistema...');

    // Inicializar recordatorios programados
    reminderService.inicializarCronJobs();

    // Limpiar refresh tokens expirados diariamente a las 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('🧹 Limpiando refresh tokens expirados...');
        await RefreshTokenService.cleanupExpiredTokens();
        logger.info('✅ Limpieza de tokens completada');
      } catch (error) {
        logger.error('❌ Error limpiando tokens expirados:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Mexico_City'
    });

    // Verificar y rotar secreto JWT si es necesario (semanal, domingos a las 3 AM)
    cron.schedule('0 3 * * 0', async () => {
      try {
        logger.info('🔑 Verificando rotación de secreto JWT...');
        await SecretRotationService.scheduleRotation();
      } catch (error) {
        logger.error('❌ Error en rotación de secreto:', error);
      }
    }, {
      scheduled: true,
      timezone: 'America/Mexico_City'
    });

    logger.info('✅ Todos los cron jobs inicializados correctamente');
  } catch (error) {
    logger.error('❌ Error inicializando cron jobs:', error);
    // No detener el servidor si hay error en cron jobs
  }
};

// Ejecutar automáticamente al importar este módulo
if (process.env.NODE_ENV !== 'test') {
  // No inicializar en tests (causaría problemas)
  initializeCronJobs();
}

export default {
  initializeCronJobs,
};




