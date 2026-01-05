/**
 * @file useScreenFocus.js
 * @description Hook para manejar la carga de datos cuando una pantalla se enfoca
 * Evita problemas de datos que no cargan la primera vez que el usuario entra a una pantalla
 * @author Senior Developer
 * @date 2025-12-04
 */

import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import Logger from '../services/logger';

/**
 * Hook para refrescar datos cuando la pantalla se enfoca
 * Evita múltiples solicitudes usando un flag de debounce
 * 
 * @param {Function|Array<Function>} refreshFunctions - Función o array de funciones de refresh
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.enabled - Si está habilitado (default: true)
 * @param {number} options.debounceMs - Tiempo de debounce en ms (default: 300)
 * @param {Array} options.dependencies - Dependencias adicionales para el callback
 * @param {string} options.screenName - Nombre de la pantalla para logging (opcional)
 * 
 * @example
 * // Uso simple con una función
 * useScreenFocus(() => refreshData());
 * 
 * // Uso con múltiples funciones
 * useScreenFocus([refreshDashboard, refreshPacientes, refreshNotificaciones]);
 * 
 * // Con opciones
 * useScreenFocus(refreshData, { 
 *   enabled: !!pacienteId,
 *   debounceMs: 500,
 *   screenName: 'DetallePaciente'
 * });
 */
export const useScreenFocus = (refreshFunctions, options = {}) => {
  const {
    enabled = true,
    debounceMs = 300,
    dependencies = [],
    screenName = 'Unknown'
  } = options;

  // Ref para evitar múltiples llamadas simultáneas
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);

  // Normalizar refreshFunctions a array
  const refreshFunctionsArray = Array.isArray(refreshFunctions) 
    ? refreshFunctions 
    : [refreshFunctions];

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        Logger.debug(`useScreenFocus (${screenName}): Deshabilitado, saltando refresh`);
        return;
      }

      // Verificar debounce
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
      
      if (isRefreshingRef.current) {
        Logger.debug(`useScreenFocus (${screenName}): Ya hay un refresh en progreso, saltando`);
        return;
      }

      if (timeSinceLastRefresh < debounceMs) {
        Logger.debug(`useScreenFocus (${screenName}): Debounce activo (${timeSinceLastRefresh}ms < ${debounceMs}ms), saltando`);
        return;
      }

      // Ejecutar refresh
      const executeRefresh = async () => {
        isRefreshingRef.current = true;
        lastRefreshTimeRef.current = now;

        try {
          Logger.info(`useScreenFocus (${screenName}): Ejecutando refresh de ${refreshFunctionsArray.length} función(es)`);
          
          // Ejecutar todas las funciones de refresh en paralelo
          const refreshPromises = refreshFunctionsArray
            .filter(fn => typeof fn === 'function')
            .map(fn => {
              try {
                const result = fn();
                // Si retorna una Promise, esperarla
                return Promise.resolve(result);
              } catch (error) {
                Logger.warn(`useScreenFocus (${screenName}): Error en función de refresh`, error);
                return Promise.resolve(); // Continuar con otras funciones
              }
            });

          await Promise.all(refreshPromises);
          
          Logger.success(`useScreenFocus (${screenName}): Refresh completado exitosamente`);
        } catch (error) {
          Logger.error(`useScreenFocus (${screenName}): Error durante refresh`, error);
        } finally {
          // Permitir nuevo refresh después de un delay mínimo
          setTimeout(() => {
            isRefreshingRef.current = false;
          }, debounceMs);
        }
      };

      // Ejecutar con un pequeño delay para asegurar que la pantalla esté completamente montada
      const timeoutId = setTimeout(executeRefresh, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    }, [enabled, debounceMs, screenName, ...dependencies])
  );
};

export default useScreenFocus;



