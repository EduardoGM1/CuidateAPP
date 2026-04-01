import { getSectionTourId } from './sectionFromPath';
import { filterExistingTargets, getSectionSteps } from './tourSteps';

/**
 * Resuelve la guía de una ruta y devuelve sección + pasos listos para Joyride.
 * Si la ruta no tiene guía o no existen anclas en el DOM, devuelve null.
 */
export function resolverGuiaPorRuta(pathname, esAdmin) {
  const idSeccion = getSectionTourId(pathname, esAdmin);
  if (!idSeccion) return null;
  const pasosCrudos = getSectionSteps(idSeccion, { isAdmin: esAdmin });
  const pasosFiltrados = filterExistingTargets(pasosCrudos);
  if (!pasosFiltrados.length) return null;
  return { idSeccion, pasos: pasosFiltrados };
}
