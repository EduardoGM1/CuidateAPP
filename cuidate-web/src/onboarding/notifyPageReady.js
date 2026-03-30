/**
 * Emite cuando la vista terminó de cargar (datos listos, sin spinner principal).
 * OnboardingHost escucha y entonces inicia la guía de la sección.
 */
export const ONBOARDING_PAGE_READY = 'cuidate-onboarding-page-ready';

export function notifyOnboardingPageReady() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ONBOARDING_PAGE_READY));
}
