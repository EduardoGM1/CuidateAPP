import { useEffect } from 'react';
import {
  BUILD_STORAGE_KEY,
  fetchCurrentBuildId,
  reloadOnceForNewBuild,
} from '../utils/chunkLoadRecovery';

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Detecta nuevo deploy comparando /version.json (sin caché).
 * Una sola recarga por buildId; no entra en loop.
 */
export function useBuildVersionCheck(intervalMs = DEFAULT_INTERVAL_MS) {
  useEffect(() => {
    if (import.meta.env.DEV) return undefined;

    let cancelled = false;

    async function check() {
      const buildId = await fetchCurrentBuildId();
      if (!buildId || cancelled) return;

      try {
        const stored = sessionStorage.getItem(BUILD_STORAGE_KEY);
        if (!stored) {
          sessionStorage.setItem(BUILD_STORAGE_KEY, buildId);
          return;
        }
        if (stored !== buildId) {
          reloadOnceForNewBuild(buildId);
        }
      } catch {
        /* ignore */
      }
    }

    check();
    const timer = setInterval(check, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
}
