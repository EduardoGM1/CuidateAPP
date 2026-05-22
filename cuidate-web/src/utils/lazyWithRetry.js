import { lazy } from 'react';
import { isChunkLoadError, reloadOnceForStaleChunk, clearChunkReloadFlag } from './chunkLoadRecovery';

/**
 * React.lazy con reintento: si el chunk no existe (deploy nuevo), recarga la app una vez.
 * @param {() => Promise<{ default: React.ComponentType }>} factory
 */
export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      const mod = await factory();
      clearChunkReloadFlag();
      return mod;
    } catch (err) {
      if (!isChunkLoadError(err)) throw err;
      if (reloadOnceForStaleChunk()) {
        return new Promise(() => {});
      }
      throw err;
    }
  });
}
