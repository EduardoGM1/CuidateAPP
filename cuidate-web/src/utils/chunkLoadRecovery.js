/**
 * Detección y recuperación cuando el navegador intenta cargar chunks JS
 * de un build anterior (tras deploy de cuidate-web).
 */

export const CHUNK_RELOAD_FLAG = 'cuidate-chunk-auto-reload';
export const BUILD_STORAGE_KEY = 'cuidate-build-id';

const CHUNK_LOAD_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Loading chunk [\d]+ failed/i,
  /ChunkLoadError/i,
  /Failed to load module script/i,
  /Unable to preload CSS/i,
  /dynamically imported module/i,
];

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isChunkLoadError(error) {
  if (!error) return false;
  const parts = [];
  if (typeof error === 'string') parts.push(error);
  if (typeof error === 'object') {
    const e = /** @type {{ message?: string; name?: string; cause?: unknown }} */ (error);
    if (e.message) parts.push(e.message);
    if (e.name) parts.push(e.name);
    if (e.cause) return isChunkLoadError(e.cause);
  }
  const msg = parts.join(' ');
  return CHUNK_LOAD_PATTERNS.some((p) => p.test(msg));
}

export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
  } catch {
    /* ignore */
  }
}

/**
 * Recarga como máximo una vez por buildId nuevo (evita loop tras deploy).
 * @param {string} buildId
 * @returns {boolean}
 */
export function reloadOnceForNewBuild(buildId) {
  if (!buildId || typeof window === 'undefined') return false;
  try {
    const guardKey = `cuidate-build-reload:${buildId}`;
    if (sessionStorage.getItem(guardKey) === '1') {
      sessionStorage.setItem(BUILD_STORAGE_KEY, buildId);
      return false;
    }
    sessionStorage.setItem(BUILD_STORAGE_KEY, buildId);
    sessionStorage.setItem(guardKey, '1');
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}

/**
 * Recarga una vez por sesión ante error de chunk (no comparte lógica con version.json).
 * @returns {boolean}
 */
export function reloadOnceForStaleChunk() {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_FLAG) === '1') {
      return false;
    }
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}

/** @deprecated Usar reloadOnceForStaleChunk o reloadOnceForNewBuild */
export function reloadForStaleAssets() {
  return reloadOnceForStaleChunk();
}

/**
 * Sincroniza buildId antes de montar React (reduce parpadeos tras deploy).
 */
export async function fetchCurrentBuildId() {
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.buildId ?? null;
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<boolean>} true si se disparó reload
 */
export async function syncBuildVersionOnStartup() {
  if (import.meta.env.DEV) return false;
  const buildId = await fetchCurrentBuildId();
  if (!buildId) return false;

  try {
    const stored = sessionStorage.getItem(BUILD_STORAGE_KEY);
    if (!stored) {
      sessionStorage.setItem(BUILD_STORAGE_KEY, buildId);
      return false;
    }
    if (stored !== buildId) {
      return reloadOnceForNewBuild(buildId);
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Registra manejadores globales (import dinámico fuera de React.lazy).
 */
export function setupChunkLoadRecovery() {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      reloadOnceForStaleChunk();
    }
  });

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target;
      if (target instanceof HTMLScriptElement && target.src?.includes('/assets/')) {
        reloadOnceForStaleChunk();
        return;
      }
      if (isChunkLoadError({ message: event.message })) {
        reloadOnceForStaleChunk();
      }
    },
    true
  );
}
