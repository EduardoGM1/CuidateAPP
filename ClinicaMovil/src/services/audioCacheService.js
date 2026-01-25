/**
 * Servicio: Audio Cache
 * 
 * Servicio para cachear archivos de audio descargados desde el servidor.
 * Evita descargas repetidas del mismo archivo.
 */

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from './logger';

const CACHE_KEY_PREFIX = '@audio_cache:';
const CACHE_METADATA_KEY = '@audio_cache_metadata';
const MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100 MB

// Obtener directorio de cache
const getCacheDirectory = () => {
  if (Platform.OS === 'ios') {
    return `${RNFS.CachesDirectoryPath}/audio_cache`;
  } else {
    return `${RNFS.CacheDirectoryPath}/audio_cache`;
  }
};

const CACHE_DIR = getCacheDirectory();

class AudioCacheService {
  constructor() {
    this.initialized = false;
    this.cacheMetadata = { entries: {}, totalSize: 0 };
  }

  /**
   * Inicializar directorio de cache
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Crear directorio si no existe
      const exists = await RNFS.exists(CACHE_DIR);
      if (!exists) {
        await RNFS.mkdir(CACHE_DIR);
      }

      // Cargar metadata
      try {
        const metadataStr = await AsyncStorage.getItem(CACHE_METADATA_KEY);
        if (metadataStr) {
          this.cacheMetadata = JSON.parse(metadataStr);
        }
      } catch (e) {
        Logger.warn('AudioCacheService: Error cargando metadata', e);
        this.cacheMetadata = { entries: {}, totalSize: 0 };
      }

      this.initialized = true;
      Logger.info('AudioCacheService: Inicializado', { cacheDir: CACHE_DIR });
    } catch (error) {
      Logger.error('AudioCacheService: Error inicializando', error);
      throw error;
    }
  }

  /**
   * Generar clave de cache desde URL
   */
  _getCacheKey(url) {
    // Usar el nombre del archivo o hash de la URL
    try {
      const urlObj = new URL(url);
      const filename = urlObj.pathname.split('/').pop();
      if (filename && filename.length > 0) {
        return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      }
    } catch (e) {
      // Si no es URL válida, usar hash simple
    }
    
    // Hash simple de la URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit
    }
    return `audio_${Math.abs(hash)}.m4a`;
  }

  /**
   * Obtener ruta de cache para una URL
   */
  _getCachePath(cacheKey) {
    return `${CACHE_DIR}/${cacheKey}`;
  }

  /**
   * Descargar y cachear audio
   */
  async downloadAndCache(url) {
    await this.initialize();

    const cacheKey = this._getCacheKey(url);
    const cachePath = this._getCachePath(cacheKey);

    // Verificar si ya está cacheado
    const cached = await this.getCachedPath(url);
    if (cached) {
      Logger.info('AudioCacheService: Audio ya está en cache', { url, cached });
      return cached;
    }

    Logger.info('AudioCacheService: Descargando audio', { url, cachePath });

    // Descargar archivo
    const downloadResult = await RNFS.downloadFile({
      fromUrl: url,
      toFile: cachePath,
    }).promise;

    if (downloadResult.statusCode === 200) {
      // Verificar que el archivo existe
      const fileExists = await RNFS.exists(cachePath);
      if (!fileExists) {
        throw new Error('El archivo no se descargó correctamente');
      }

      // Obtener tamaño del archivo
      const fileInfo = await RNFS.stat(cachePath);
      const fileSize = fileInfo.size || 0;

      // Guardar en metadata
      this.cacheMetadata.entries[url] = {
        cachePath,
        cacheKey,
        size: fileSize,
        downloadedAt: Date.now(),
      };
      this.cacheMetadata.totalSize += fileSize;

      // Limpiar cache si excede tamaño máximo
      if (this.cacheMetadata.totalSize > MAX_CACHE_SIZE) {
        await this._cleanupOldEntries(fileSize);
      }

      await this._saveMetadata();

      Logger.info('AudioCacheService: Audio descargado y cacheado', { url, cachePath, size: fileSize });
      return cachePath;
    } else {
      throw new Error(`Error descargando archivo: ${downloadResult.statusCode}`);
    }
  }

  /**
   * Obtener ruta cacheada si existe
   */
  async getCachedPath(url) {
    await this.initialize();

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

    return entry.cachePath;
  }

  /**
   * Limpiar entradas antiguas del cache
   */
  async _cleanupOldEntries(requiredSpace) {
    const entries = Object.entries(this.cacheMetadata.entries)
      .map(([url, entry]) => ({ url, ...entry }))
      .sort((a, b) => a.downloadedAt - b.downloadedAt); // Más antiguos primero

    let freedSpace = 0;
    for (const entry of entries) {
      if (freedSpace >= requiredSpace) break;

      try {
        const exists = await RNFS.exists(entry.cachePath);
        if (exists) {
          await RNFS.unlink(entry.cachePath);
        }
        freedSpace += entry.size;
        delete this.cacheMetadata.entries[entry.url];
        this.cacheMetadata.totalSize -= entry.size;
      } catch (e) {
        Logger.warn('AudioCacheService: Error eliminando entrada antigua', e);
      }
    }

    if (freedSpace > 0) {
      Logger.info('AudioCacheService: Cache limpiado', { freedSpace });
    }
  }

  /**
   * Guardar metadata
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
    try {
      await this.initialize();

      // Eliminar todos los archivos
      for (const entry of Object.values(this.cacheMetadata.entries)) {
        try {
          const exists = await RNFS.exists(entry.cachePath);
          if (exists) {
            await RNFS.unlink(entry.cachePath);
          }
        } catch (e) {
          Logger.warn('AudioCacheService: Error eliminando archivo', e);
        }
      }

      // Limpiar metadata
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
      totalSize: this.cacheMetadata.totalSize,
      fileCount: Object.keys(this.cacheMetadata.entries).length,
    };
  }
}

// Singleton
const audioCacheService = new AudioCacheService();
export default audioCacheService;
