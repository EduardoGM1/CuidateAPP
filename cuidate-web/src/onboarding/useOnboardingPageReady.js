import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { notifyOnboardingPageReady } from './notifyPageReady';

/**
 * Cuando `isReady` pasa a true (p. ej. lista cargada, sin loading), avisa una vez por ruta
 * para que la guía no se superponga al spinner ni a datos a medias.
 */
export function useOnboardingPageReady(isReady) {
  const location = useLocation();
  const sentRef = useRef(false);

  useEffect(() => {
    sentRef.current = false;
  }, [location.pathname]);

  useEffect(() => {
    if (!isReady) return;
    if (sentRef.current) return;
    sentRef.current = true;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        notifyOnboardingPageReady();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [isReady, location.pathname]);
}
