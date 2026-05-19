/**
 * Detección y recuperación cuando el navegador intenta cargar chunks JS
 * de un build anterior (tras deploy de cuidate-web).
 */

export const CHUNK_RELOAD_FLAG = 'cuidate-chunk-auto-reload';

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
 * Recarga la página una sola vez por sesión para obtener index.html y chunks nuevos.
 * @returns {boolean} true si se disparó reload
 */
export function reloadForStaleAssets() {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_FLAG) === '1') {
      return false;
    }
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
  } catch {
    /* sin sessionStorage */
  }
  window.location.reload();
  return true;
}

/**
 * Registra manejadores globales (import dinámico fuera de React.lazy).
 */
export function setupChunkLoadRecovery() {
  if (typeof window === 'undefined') return;

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      reloadForStaleAssets();
    }
  });

  window.addEventListener('error', (event) => {
    const target = event.target;
    if (target instanceof HTMLScriptElement && target.src?.includes('/assets/')) {
      reloadForStaleAssets();
      return;
    }
    if (isChunkLoadError({ message: event.message })) {
      reloadForStaleAssets();
    }
  });
}
