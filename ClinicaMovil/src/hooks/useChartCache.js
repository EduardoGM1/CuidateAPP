/**
 * Hook: useChartCache
 * 
 * Hook para manejar caché de datos de gráficos con lazy loading.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { storageService } from '../services/storageService';
import Logger from '../services/logger';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const CACHE_KEY_PREFIX = 'chart_cache_';

const useChartCache = (chartType, fetchFunction, options = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cacheRef = useRef(null);
  const { cacheDuration = CACHE_DURATION, enabled = true } = options;

  const getCacheKey = useCallback((type, params) => {
    const paramsStr = JSON.stringify(params || {});
    return `${CACHE_KEY_PREFIX}${type}_${paramsStr}`;
  }, []);

  const getCachedData = useCallback(async (key) => {
    if (!enabled) return null;
    
    try {
      const cached = await storageService.load(key);
      if (!cached) return null;

      const { data: cachedData, timestamp } = JSON.parse(cached);
      const now = Date.now();
      
      if (now - timestamp < cacheDuration) {
        Logger.debug('ChartCache: Datos obtenidos de caché', { key, age: now - timestamp });
        return cachedData;
      } else {
        // Caché expirado, eliminar
        await storageService.remove(key);
        Logger.debug('ChartCache: Caché expirado, eliminado', { key });
        return null;
      }
    } catch (error) {
      Logger.warn('ChartCache: Error leyendo caché', { key, error: error.message });
      return null;
    }
  }, [enabled, cacheDuration]);

  const setCachedData = useCallback(async (key, dataToCache) => {
    if (!enabled) return;
    
    try {
      const cacheEntry = {
        data: dataToCache,
        timestamp: Date.now(),
      };
      await storageService.save(key, JSON.stringify(cacheEntry));
      Logger.debug('ChartCache: Datos guardados en caché', { key });
    } catch (error) {
      Logger.warn('ChartCache: Error guardando caché', { key, error: error.message });
    }
  }, [enabled]);

  const loadData = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = getCacheKey(chartType, params);
      
      // Intentar obtener de caché primero
      const cachedData = await getCachedData(cacheKey);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        cacheRef.current = cachedData;
        return cachedData;
      }

      // Si no hay caché, cargar desde la API
      Logger.debug('ChartCache: Cargando datos desde API', { chartType, params });
      const freshData = await fetchFunction(params);
      
      // Guardar en caché
      await setCachedData(cacheKey, freshData);
      
      setData(freshData);
      cacheRef.current = freshData;
      setLoading(false);
      
      return freshData;
    } catch (err) {
      Logger.error('ChartCache: Error cargando datos', { chartType, error: err.message });
      setError(err);
      setLoading(false);
      
      // Si hay error pero hay datos en caché, usar esos
      if (cacheRef.current) {
        Logger.info('ChartCache: Usando datos en caché debido a error', { chartType });
        setData(cacheRef.current);
        setError(null);
      }
      
      throw err;
    }
  }, [chartType, fetchFunction, getCacheKey, getCachedData, setCachedData]);

  const clearCache = useCallback(async (params = {}) => {
    const cacheKey = getCacheKey(chartType, params);
    try {
      await storageService.remove(cacheKey);
      Logger.info('ChartCache: Caché limpiado', { cacheKey });
    } catch (error) {
      Logger.warn('ChartCache: Error limpiando caché', { cacheKey, error: error.message });
    }
  }, [chartType, getCacheKey]);

  const refresh = useCallback(async (params = {}) => {
    // Limpiar caché y recargar
    await clearCache(params);
    return await loadData(params);
  }, [clearCache, loadData]);

  return {
    data,
    loading,
    error,
    loadData,
    refresh,
    clearCache,
  };
};

export default useChartCache;


