/**
 * Path del ítem de navegación que mejor coincide con la ruta actual.
 * Prioriza la coincidencia más específica (path más largo).
 * @param {string} pathname
 * @param {{ path: string }[]} navLinks
 * @returns {string}
 */
export function getActiveNavPath(pathname, navLinks) {
  const current = pathname === '/dashboard' ? '/' : pathname;
  let bestPath = null;
  let bestLength = -1;

  for (const { path } of navLinks) {
    const matches =
      path === '/'
        ? current === '/'
        : current === path || current.startsWith(`${path}/`);

    if (matches && path.length > bestLength) {
      bestPath = path;
      bestLength = path.length;
    }
  }

  return bestPath ?? '/';
}
