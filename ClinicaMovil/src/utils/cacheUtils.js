/**
 * Utilidades para limpiar cache de la aplicación
 */

import audioCacheService from '../services/audioCacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import Logger from '../services/logger';

/**
 * Limpiar todo el cache de la aplicación
 * Incluye: cache de audio, metadata en AsyncStorage, y archivos temporales
 * @returns {Promise<Object>} Resultado de la limpieza
 */
export async function clearAllCache() {
  const results = {
    audioCache: { success: false, message: '' },
    asyncStorage: { success: false, message: '', keysRemoved: 0 },
    fileSystem: { success: false, message: '', filesDeleted: 0 },
  };

  try {
    Logger.info('🧹 Iniciando limpieza completa de cache...');

    // 1. Limpiar cache de audio
    try {
      await audioCacheService.clearCache();
      results.audioCache = { 
        success: true, 
        message: 'Cache de audio limpiado correctamente' 
      };
      Logger.info('✅ Cache de audio limpiado');
    } catch (error) {
      results.audioCache = { 
        success: false, 
        message: error.message || 'Error desconocido' 
      };
      Logger.error('❌ Error limpiando cache de audio:', error);
    }

    // 2. Limpiar metadata de cache en AsyncStorage
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('@audio_cache') || 
        key.includes('cache')
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        results.asyncStorage = { 
          success: true, 
          message: `${cacheKeys.length} keys eliminadas`,
          keysRemoved: cacheKeys.length
        };
        Logger.info(`✅ ${cacheKeys.length} keys de cache eliminadas de AsyncStorage`);
      } else {
        results.asyncStorage = { 
          success: true, 
          message: 'No se encontraron keys de cache',
          keysRemoved: 0
        };
        Logger.info('ℹ️ No se encontraron keys de cache en AsyncStorage');
      }
    } catch (error) {
      results.asyncStorage = { 
        success: false, 
        message: error.message || 'Error desconocido',
        keysRemoved: 0
      };
      Logger.error('❌ Error limpiando AsyncStorage:', error);
    }

    // 3. Limpiar directorio de cache de audio
    try {
      const cacheDir = `${RNFS.CacheDirectoryPath}/audio_cache`;
      const exists = await RNFS.exists(cacheDir);
      
      if (exists) {
        const files = await RNFS.readDir(cacheDir);
        let deletedCount = 0;
        
        for (const file of files) {
          try {
            await RNFS.unlink(file.path);
            deletedCount++;
          } catch (error) {
            Logger.warn(`⚠️ No se pudo eliminar: ${file.path}`, error);
          }
        }
        
        results.fileSystem = { 
          success: true, 
          message: `${deletedCount} archivos eliminados`,
          filesDeleted: deletedCount
        };
        Logger.info(`✅ ${deletedCount} archivos eliminados del directorio de cache`);
      } else {
        results.fileSystem = { 
          success: true, 
          message: 'Directorio de cache no existe',
          filesDeleted: 0
        };
        Logger.info('ℹ️ Directorio de cache no existe');
      }
    } catch (error) {
      results.fileSystem = { 
        success: false, 
        message: error.message || 'Error desconocido',
        filesDeleted: 0
      };
      Logger.error('❌ Error limpiando directorio de cache:', error);
    }

    Logger.info('✨ Limpieza de cache completada', results);
    return results;
  } catch (error) {
    Logger.error('❌ Error general limpiando cache:', error);
    throw error;
  }
}

/**
 * Limpiar solo el cache de audio
 * @returns {Promise<boolean>} true si se limpió correctamente
 */
export async function clearAudioCache() {
  try {
    await audioCacheService.clearCache();
    Logger.info('✅ Cache de audio limpiado');
    return true;
  } catch (error) {
    Logger.error('❌ Error limpiando cache de audio:', error);
    return false;
  }
}

/**
 * Obtener estadísticas del cache
 * @returns {Promise<Object>} Estadísticas del cache
 */
export async function getCacheStats() {
  try {
    const stats = await audioCacheService.getCacheStats();
    return stats;
  } catch (error) {
    Logger.error('❌ Error obteniendo estadísticas de cache:', error);
    return null;
  }
}
