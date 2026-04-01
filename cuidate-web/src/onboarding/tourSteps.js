import { crearPasosSeccion, crearPasosShell } from './catalogoOnboarding';

/** Pasos globales: marco de la app (menú, cabecera, contenido). */
export function getShellSteps(isMobile) {
  return crearPasosShell(isMobile);
}

/** Pasos por sección (anclas data-tour en cada página). */
export function getSectionSteps(sectionId, { isAdmin }) {
  const pasosPorSeccion = crearPasosSeccion(isAdmin);
  return pasosPorSeccion[sectionId] ?? [];
}

export function filterExistingTargets(steps) {
  if (!steps?.length) return [];
  return steps.filter((step) => {
    const t = step.target;
    if (t === 'body') return true;
    try {
      return document.querySelector(t) != null;
    } catch {
      return false;
    }
  });
}
