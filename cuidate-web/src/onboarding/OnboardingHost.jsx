import { useCallback, useEffect, useRef, useState } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  isShellComplete,
  markShellComplete,
  isSectionComplete,
  markSectionComplete,
} from './storage';
import { getSectionTourId } from './sectionFromPath';
import { getShellSteps, getSectionSteps, filterExistingTargets } from './tourSteps';
import { ONBOARDING_PAGE_READY } from './notifyPageReady';
import { createJoyrideStyles, JOYRIDE_LOCALE } from './joyrideTheme';

const SECTION_TOUR_FALLBACK_MS = 12000;

const joyrideStyles = createJoyrideStyles(10050);

function runWhenDocumentFullyLoaded(callback) {
  if (typeof window === 'undefined') return;
  const run = () => {
    requestAnimationFrame(() => requestAnimationFrame(callback));
  };
  if (document.readyState === 'complete') {
    run();
  } else {
    window.addEventListener('load', run, { once: true });
  }
}

/**
 * Tours globales (shell) y por ruta. La guía por sección espera a que la página
 * emita "listo" (useOnboardingPageReady) o al fallback si no hay aviso.
 */
export default function OnboardingHost({ isMobile }) {
  const location = useLocation();
  const isAdminRaw = useAuthStore((s) => s.isAdmin);
  const isAdminFn = typeof isAdminRaw === 'function' ? isAdminRaw : () => false;

  const locationPathRef = useRef(location.pathname);
  locationPathRef.current = location.pathname;

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);
  const tourModeRef = useRef('idle');
  const sectionIdRef = useRef(null);
  const shellStartedRef = useRef(false);
  /** Incrementar cuando el tour shell termina u omite, para volver a programar la guía de sección sin cambiar de ruta. */
  const [shellFinishedTick, setShellFinishedTick] = useState(0);

  const tryStartSectionTour = useCallback(
    (pathname) => {
      if (!isShellComplete()) return;
      const id = getSectionTourId(pathname, isAdminFn());
      if (!id || isSectionComplete(id)) return;
      const raw = getSectionSteps(id, { isAdmin: isAdminFn() });
      const filtered = filterExistingTargets(raw);
      if (!filtered.length) return;
      tourModeRef.current = 'section';
      sectionIdRef.current = id;
      setSteps(filtered);
      setRun(true);
    },
    [isAdminFn]
  );

  const scheduleSectionTour = useCallback(
    (pathname) => {
      if (!isShellComplete()) return;
      const id = getSectionTourId(pathname, isAdminFn());
      if (!id || isSectionComplete(id)) return;

      let cancelled = false;

      const startIfStillHere = () => {
        if (cancelled) return;
        if (locationPathRef.current !== pathname) return;
        tryStartSectionTour(pathname);
      };

      const onReady = () => {
        if (cancelled) return;
        if (locationPathRef.current !== pathname) return;
        requestAnimationFrame(() => requestAnimationFrame(startIfStillHere));
      };

      window.addEventListener(ONBOARDING_PAGE_READY, onReady);
      const fallback = window.setTimeout(() => {
        window.removeEventListener(ONBOARDING_PAGE_READY, onReady);
        startIfStillHere();
      }, SECTION_TOUR_FALLBACK_MS);

      return () => {
        cancelled = true;
        window.removeEventListener(ONBOARDING_PAGE_READY, onReady);
        window.clearTimeout(fallback);
      };
    },
    [isAdminFn, tryStartSectionTour]
  );

  const handleJoyrideCallback = useCallback(
    (data) => {
      const { status } = data;
      if (status !== STATUS.FINISHED && status !== STATUS.SKIPPED) return;

      if (tourModeRef.current === 'shell') {
        markShellComplete();
        tourModeRef.current = 'idle';
        sectionIdRef.current = null;
        setRun(false);
        setSteps([]);
        setShellFinishedTick((t) => t + 1);
        return;
      }

      if (tourModeRef.current === 'section' && sectionIdRef.current) {
        markSectionComplete(sectionIdRef.current);
        tourModeRef.current = 'idle';
        sectionIdRef.current = null;
        setRun(false);
        setSteps([]);
      }
    },
    []
  );

  useEffect(() => {
    const onReset = () => {
      shellStartedRef.current = true;
      tourModeRef.current = 'shell';
      sectionIdRef.current = null;
      setRun(false);
      setSteps([]);
      runWhenDocumentFullyLoaded(() => {
        const filtered = filterExistingTargets(getShellSteps(isMobile));
        if (!filtered.length) {
          markShellComplete();
          return;
        }
        tourModeRef.current = 'shell';
        setSteps(filtered);
        setRun(true);
      });
    };
    window.addEventListener('cuidate-onboarding-reset', onReset);
    return () => window.removeEventListener('cuidate-onboarding-reset', onReset);
  }, [isMobile]);

  useEffect(() => {
    if (isShellComplete() || shellStartedRef.current) return;
    shellStartedRef.current = true;
    runWhenDocumentFullyLoaded(() => {
      const filtered = filterExistingTargets(getShellSteps(isMobile));
      if (!filtered.length) {
        markShellComplete();
        return;
      }
      tourModeRef.current = 'shell';
      setSteps(filtered);
      setRun(true);
    });
  }, [isMobile]);

  useEffect(() => {
    if (!isShellComplete()) return;
    setRun(false);
    setSteps([]);
    const cleanup = scheduleSectionTour(location.pathname);
    return cleanup;
  }, [location.pathname, scheduleSectionTour, shellFinishedTick]);

  if (!steps.length && !run) return null;

  return (
    <Joyride
      key={`${location.pathname}-${steps.length}`}
      run={run}
      steps={steps}
      continuous
      showProgress
      showSkipButton
      disableScrollParentFix
      scrollToFirstStep
      scrollOffset={80}
      callback={handleJoyrideCallback}
      locale={JOYRIDE_LOCALE}
      styles={joyrideStyles}
      floaterProps={{ disableAnimation: false }}
    />
  );
}
