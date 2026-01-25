/**
 * Script para limpiar el cache de la aplicación
 * Incluye: cache de audio, AsyncStorage, y archivos temporales
 */

const audioCacheService = require('../src/services/audioCacheService').default;
const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const RNFS = require('react-native-fs').default;
const Logger = require('../src/services/logger').default;

async function clearAllCache() {
  try {
    console.log('🧹 Iniciando limpieza de cache...\n');

    // 1. Limpiar cache de audio
    console.log('1️⃣ Limpiando cache de audio...');
    try {
      await audioCacheService.clearCache();
      console.log('✅ Cache de audio limpiado\n');
    } catch (error) {
      console.error('❌ Error limpiando cache de audio:', error.message);
    }

    // 2. Limpiar AsyncStorage (solo keys relacionadas con cache)
    console.log('2️⃣ Limpiando metadata de cache en AsyncStorage...');
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('@audio_cache') || 
        key.includes('cache')
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`✅ ${cacheKeys.length} keys de cache eliminadas de AsyncStorage\n`);
      } else {
        console.log('ℹ️ No se encontraron keys de cache en AsyncStorage\n');
      }
    } catch (error) {
      console.error('❌ Error limpiando AsyncStorage:', error.message);
    }

    // 3. Limpiar directorio de cache de audio
    console.log('3️⃣ Limpiando directorio de cache de audio...');
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
            console.warn(`⚠️ No se pudo eliminar: ${file.path}`);
          }
        }
        
        console.log(`✅ ${deletedCount} archivos eliminados del directorio de cache\n`);
      } else {
        console.log('ℹ️ Directorio de cache no existe\n');
      }
    } catch (error) {
      console.error('❌ Error limpiando directorio de cache:', error.message);
    }

    console.log('✨ Limpieza de cache completada');
  } catch (error) {
    console.error('❌ Error general limpiando cache:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  clearAllCache()
    .then(() => {
      console.log('\n✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en el proceso:', error);
      process.exit(1);
    });
}

module.exports = { clearAllCache };
