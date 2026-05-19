import { useEffect } from 'react';
import { reloadForStaleAssets } from '../utils/chunkLoadRecovery';

const STORAGE_KEY = 'cuidate-build-id';
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Detecta nuevo deploy comparando /version.json (sin caché).
 */
export function useBuildVersionCheck(intervalMs = DEFAULT_INTERVAL_MS) {
  useEffect(() => {
    if (import.meta.env.DEV) return undefined;

    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const buildId = data?.buildId;
        if (!buildId) return;

        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (!stored) {
          sessionStorage.setItem(STORAGE_KEY, buildId);
          return;
        }
        if (stored !== buildId) {
          reloadForStaleAssets();
        }
      } catch {
        /* red o archivo ausente */
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
