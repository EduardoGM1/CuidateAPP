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

const JOYRIDE_LOCALE = {
  back: 'Atrás',
  close: 'Cerrar',
  last: 'Listo',
  next: 'Siguiente',
  open: 'Abrir',
  skip: 'Omitir',
};

const joyrideStyles = {
  options: {
    primaryColor: 'var(--color-primario, #006657)',
    textColor: 'var(--color-texto-primario, #1a1a1a)',
    overlayColor: 'rgba(16, 49, 43, 0.78)',
    zIndex: 10050,
    arrowColor: '#fff',
  },
  tooltip: {
    borderRadius: 10,
    fontSize: 14,
  },
  tooltipContainer: {
    textAlign: 'left',
  },
  buttonNext: {
    fontSize: 14,
  },
  buttonBack: {
    fontSize: 14,
  },
  buttonSkip: {
    fontSize: 14,
  },
};

/**
 * Tours globales (shell) y por ruta. Montado una vez en MainLayout.
 */
export default function OnboardingHost({ isMobile }) {
  const location = useLocation();
  const isAdminRaw = useAuthStore((s) => s.isAdmin);
  const isAdminFn = typeof isAdminRaw === 'function' ? isAdminRaw : () => false;

  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState([]);
  const tourModeRef = useRef('idle');
  const sectionIdRef = useRef(null);
  const shellStartedRef = useRef(false);

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
        window.setTimeout(() => tryStartSectionTour(location.pathname), 450);
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
    [location.pathname, tryStartSectionTour]
  );

  useEffect(() => {
    const onReset = () => {
      shellStartedRef.current = true;
      tourModeRef.current = 'shell';
      sectionIdRef.current = null;
      setRun(false);
      setSteps([]);
      const filtered = filterExistingTargets(getShellSteps(isMobile));
      if (!filtered.length) {
        markShellComplete();
        return;
      }
      window.setTimeout(() => {
        setSteps(filtered);
        setRun(true);
      }, 350);
    };
    window.addEventListener('cuidate-onboarding-reset', onReset);
    return () => window.removeEventListener('cuidate-onboarding-reset', onReset);
  }, [isMobile]);

  useEffect(() => {
    if (isShellComplete() || shellStartedRef.current) return;
    shellStartedRef.current = true;
    const filtered = filterExistingTargets(getShellSteps(isMobile));
    if (!filtered.length) {
      markShellComplete();
      return;
    }
    tourModeRef.current = 'shell';
    const t = window.setTimeout(() => {
      setSteps(filtered);
      setRun(true);
    }, 650);
    return () => window.clearTimeout(t);
  }, [isMobile]);

  useEffect(() => {
    if (!isShellComplete()) return;
    setRun(false);
    setSteps([]);
    const t = window.setTimeout(() => tryStartSectionTour(location.pathname), 550);
    return () => {
      window.clearTimeout(t);
      setRun(false);
    };
  }, [location.pathname, tryStartSectionTour]);

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
