/**
 * Servicio: AudioCache
 * 
 * Servicio para cachear archivos de audio descargados localmente.
 * Mejora el rendimiento y reduce el consumo de datos.
 */

import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import Logger from './logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY_PREFIX = '@audio_cache:';
const CACHE_METADATA_KEY = '@audio_cache_metadata';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100 MB

// Obtener directorio base con fallbacks para Android
const getBaseCacheDirectory = () => {
  if (Platform.OS === 'ios') {
    return RNFS.DocumentDirectoryPath;
  }
  
  // Android: intentar múltiples opciones con fallback
  return RNFS.CacheDirectoryPath || 
         RNFS.ExternalDirectoryPath || 
         RNFS.DocumentDirectoryPath ||
         RNFS.TemporaryDirectoryPath;
};

const BASE_CACHE_DIR = getBaseCacheDirectory();
const CACHE_DIR = BASE_CACHE_DIR ? `${BASE_CACHE_DIR}/audio_cache` : null;

class AudioCacheService {
  constructor() {
    this.cacheMetadata = null;
    this.initialized = false;
  }

  /**
   * Inicializar el servicio de cache
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Verificar que tenemos un directorio válido
      if (!CACHE_DIR || !BASE_CACHE_DIR) {
        const error = new Error('No se pudo determinar el directorio de cache. Paths disponibles: ' + 
          JSON.stringify({
            CacheDirectoryPath: RNFS.CacheDirectoryPath,
            ExternalDirectoryPath: RNFS.ExternalDirectoryPath,
            DocumentDirectoryPath: RNFS.DocumentDirectoryPath,
            TemporaryDirectoryPath: RNFS.TemporaryDirectoryPath,
          }));
        Logger.error('AudioCacheService: Error determinando directorio de cache', error);
        this.cacheMetadata = { entries: {}, totalSize: 0 };
        this.initialized = true;
        return; // Continuar sin cache en lugar de fallar
      }

      // Verificar que el directorio base existe
      const baseDirExists = await RNFS.exists(BASE_CACHE_DIR);
      if (!baseDirExists) {
        Logger.warn('AudioCacheService: Directorio base no existe, intentando crear...', { path: BASE_CACHE_DIR });
        try {
          await RNFS.mkdir(BASE_CACHE_DIR);
        } catch (baseDirError) {
          Logger.error('AudioCacheService: No se pudo crear directorio base', {
            error: baseDirError.message || String(baseDirError),
            path: BASE_CACHE_DIR,
          });
          this.cacheMetadata = { entries: {}, totalSize: 0 };
          this.initialized = true;
          return; // Continuar sin cache
        }
      }

      // Crear directorio de cache si no existe (con creación recursiva)
      const dirExists = await RNFS.exists(CACHE_DIR);
      if (!dirExists) {
        try {
          // Crear directorio recursivamente
          await RNFS.mkdir(CACHE_DIR);
          Logger.info('AudioCacheService: Directorio de cache creado', { path: CACHE_DIR });
        } catch (mkdirError) {
          // Si falla, intentar crear el directorio padre primero
          const parentDir = CACHE_DIR.substring(0, CACHE_DIR.lastIndexOf('/'));
          if (parentDir && !(await RNFS.exists(parentDir))) {
            await RNFS.mkdir(parentDir);
          }
          await RNFS.mkdir(CACHE_DIR);
          Logger.info('AudioCacheService: Directorio de cache creado (recursivo)', { path: CACHE_DIR });
        }
      }

      // Verificar que el directorio existe y es accesible
      const finalCheck = await RNFS.exists(CACHE_DIR);
      if (!finalCheck) {
        throw new Error(`No se pudo crear o acceder al directorio de cache: ${CACHE_DIR}`);
      }

      // Cargar metadata del cache
      const metadataStr = await AsyncStorage.getItem(CACHE_METADATA_KEY);
      if (metadataStr) {
        try {
          this.cacheMetadata = JSON.parse(metadataStr);
          // Validar estructura
          if (!this.cacheMetadata.entries || !this.cacheMetadata.totalSize) {
            this.cacheMetadata = { entries: {}, totalSize: 0 };
          }
        } catch (parseError) {
          Logger.warn('AudioCacheService: Error parseando metadata, reiniciando', parseError);
          this.cacheMetadata = { entries: {}, totalSize: 0 };
        }
      } else {
        this.cacheMetadata = {
          entries: {},
          totalSize: 0,
        };
      }

      this.initialized = true;
      Logger.info('AudioCacheService: Inicializado', {
        entries: Object.keys(this.cacheMetadata.entries).length,
        totalSize: this.cacheMetadata.totalSize,
        cacheDir: CACHE_DIR,
        baseDir: BASE_CACHE_DIR,
      });
    } catch (error) {
      Logger.error('AudioCacheService: Error inicializando', {
        error: error.message || String(error),
        code: error.code,
        path: CACHE_DIR,
        baseDir: BASE_CACHE_DIR,
        cause: error.cause || error,
      });
      // Inicializar con valores por defecto para que el servicio siga funcionando
      // El servicio continuará sin cache, pero no fallará
      this.cacheMetadata = { entries: {}, totalSize: 0 };
      this.initialized = true;
    }
  }

  /**
   * Generar clave de cache a partir de una URL
   */
  _getCacheKey(url) {
    // Usar hash simple de la URL como clave
    return url.split('/').pop().split('?')[0] || url.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * Obtener ruta del archivo en cache
   */
  _getCachePath(cacheKey) {
    return `${CACHE_DIR}/${cacheKey}`;
  }

  /**
   * Descargar y cachear un archivo de audio
   */
  async downloadAndCache(url) {
    await this.initialize();

    // Si no hay directorio de cache disponible, lanzar error para usar fallback
    if (!CACHE_DIR) {
      throw new Error('Directorio de cache no disponible');
    }

    try {
      // Verificar que el directorio de cache existe antes de descargar
      const dirExists = await RNFS.exists(CACHE_DIR);
      if (!dirExists) {
        Logger.warn('AudioCacheService: Directorio de cache no existe, recreando...', { 
          path: CACHE_DIR,
          baseDir: BASE_CACHE_DIR,
        });
        try {
          // Asegurar que el directorio base existe
          if (!(await RNFS.exists(BASE_CACHE_DIR))) {
            await RNFS.mkdir(BASE_CACHE_DIR);
          }
          await RNFS.mkdir(CACHE_DIR);
        } catch (mkdirError) {
          Logger.error('AudioCacheService: No se pudo crear directorio de cache', {
            error: mkdirError.message || String(mkdirError),
            path: CACHE_DIR,
          });
          throw new Error('No se pudo crear directorio de cache');
        }
      }

      const cacheKey = this._getCacheKey(url);
      const cachePath = this._getCachePath(cacheKey);

      // Verificar si ya está en cache
      const cached = await this.getCachedPath(url);
      if (cached) {
        Logger.info('AudioCacheService: Audio ya está en cache', { url, cacheKey });
        return cached;
      }

      Logger.info('AudioCacheService: Descargando audio', { url, cacheKey });

      // Descargar archivo
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: cachePath,
      }).promise;

      if (downloadResult.statusCode === 200) {
        // Verificar que el archivo se descargó correctamente
        const fileExists = await RNFS.exists(cachePath);
        if (!fileExists) {
          throw new Error(`Archivo descargado no encontrado: ${cachePath}`);
        }

        // Obtener tamaño del archivo
        const fileInfo = await RNFS.stat(cachePath);
        const fileSize = parseInt(fileInfo.size, 10);

        if (isNaN(fileSize) || fileSize <= 0) {
          throw new Error(`Tamaño de archivo inválido: ${fileSize}`);
        }

        // Verificar límite de cache
        if (this.cacheMetadata.totalSize + fileSize > MAX_CACHE_SIZE) {
          await this._cleanupOldEntries(fileSize);
        }

        // Actualizar metadata
        this.cacheMetadata.entries[url] = {
          cacheKey,
          cachePath,
          size: fileSize,
          downloadedAt: Date.now(),
          lastAccessed: Date.now(),
        };
        this.cacheMetadata.totalSize += fileSize;

        await this._saveMetadata();

        Logger.info('AudioCacheService: Audio cacheado exitosamente', {
          url,
          cacheKey,
          size: fileSize,
        });

        return cachePath;
      } else {
        throw new Error(`Error descargando: status ${downloadResult.statusCode}`);
      }
    } catch (error) {
      Logger.error('AudioCacheService: Error descargando y cacheando', {
        error: error.message || String(error),
        code: error.code,
        url,
        nativeStackAndroid: error.nativeStackAndroid,
        userInfo: error.userInfo,
      });
      throw error;
    }
  }

  /**
   * Obtener ruta del archivo cacheado si existe
   */
  async getCachedPath(url) {
    await this.initialize();

    try {
      const entry = this.cacheMetadata.entries[url];
      if (!entry) {
        return null;
      }

      // Verificar que el archivo existe
      const exists = await RNFS.exists(entry.cachePath);
      if (!exists) {
        // Limpiar entrada inválida
        delete this.cacheMetadata.entries[url];
        this.cacheMetadata.totalSize -= entry.size;
        await this._saveMetadata();
        return null;
      }

      // Actualizar último acceso
      entry.lastAccessed = Date.now();
      await this._saveMetadata();

      return entry.cachePath;
    } catch (error) {
      Logger.error('AudioCacheService: Error obteniendo path cacheado', error);
      return null;
    }
  }

  /**
   * Limpiar entradas antiguas del cache
   */
  async _cleanupOldEntries(requiredSpace) {
    try {
      // Ordenar entradas por último acceso (más antiguas primero)
      const entries = Object.entries(this.cacheMetadata.entries)
        .map(([url, entry]) => ({ url, ...entry }))
        .sort((a, b) => a.lastAccessed - b.lastAccessed);

      let freedSpace = 0;
      const toDelete = [];

      for (const entry of entries) {
        if (freedSpace >= requiredSpace) break;

        try {
          const exists = await RNFS.exists(entry.cachePath);
          if (exists) {
            await RNFS.unlink(entry.cachePath);
          }
          toDelete.push(entry.url);
          freedSpace += entry.size;
        } catch (error) {
          Logger.warn('AudioCacheService: Error eliminando archivo del cache', error);
        }
      }

      // Actualizar metadata
      toDelete.forEach((url) => {
        const entry = this.cacheMetadata.entries[url];
        if (entry) {
          this.cacheMetadata.totalSize -= entry.size;
          delete this.cacheMetadata.entries[url];
        }
      });

      await this._saveMetadata();

      Logger.info('AudioCacheService: Cache limpiado', {
        deleted: toDelete.length,
        freedSpace,
      });
    } catch (error) {
      Logger.error('AudioCacheService: Error limpiando cache', error);
    }
  }

  /**
   * Guardar metadata del cache
   */
  async _saveMetadata() {
    try {
      await AsyncStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(this.cacheMetadata));
    } catch (error) {
      Logger.error('AudioCacheService: Error guardando metadata', error);
    }
  }

  /**
   * Limpiar todo el cache
   */
  async clearCache() {
    await this.initialize();

    try {
      // Eliminar todos los archivos
      const entries = Object.values(this.cacheMetadata.entries);
      for (const entry of entries) {
        try {
          const exists = await RNFS.exists(entry.cachePath);
          if (exists) {
            await RNFS.unlink(entry.cachePath);
          }
        } catch (error) {
          Logger.warn('AudioCacheService: Error eliminando archivo', error);
        }
      }

      // Resetear metadata
      this.cacheMetadata = { entries: {}, totalSize: 0 };
      await this._saveMetadata();

      Logger.info('AudioCacheService: Cache limpiado completamente');
    } catch (error) {
      Logger.error('AudioCacheService: Error limpiando cache', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del cache
   */
  async getCacheStats() {
    await this.initialize();

    return {
      entries: Object.keys(this.cacheMetadata.entries).length,
      totalSize: this.cacheMetadata.totalSize,
      maxSize: MAX_CACHE_SIZE,
      usagePercent: (this.cacheMetadata.totalSize / MAX_CACHE_SIZE) * 100,
    };
  }
}

// Singleton
const audioCacheService = new AudioCacheService();

export default audioCacheService;

