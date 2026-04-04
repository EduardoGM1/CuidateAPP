import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import OnboardingShellModal from './OnboardingShellModal';
import {
  isShellComplete,
  isPatientShellComplete,
  markPatientShellComplete,
  isStackTourComplete,
  markStackTourComplete,
  MOBILE_ONBOARDING_RESET_EVENT,
} from '../../onboarding/mobileOnboardingStorage';
import { PROFESSIONAL_STACK_TOURS } from '../../onboarding/professionalStackScreensContent';
import {
  PATIENT_SHELL_STEPS,
  PATIENT_STACK_TOURS,
} from '../../onboarding/patientOnboardingContent';
import {
  getDeepestRouteName,
  isProfessionalRole,
  isPacienteRole,
} from '../../onboarding/navOnboardingUtils';

const STACK_DEBOUNCE_MS = 480;

export default function NavOnboardingController({ navigationRootState }) {
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [patientShellVisible, setPatientShellVisible] = useState(false);
  const [stackTour, setStackTour] = useState({
    visible: false,
    steps: [],
    screenName: null,
  });
  const [recheckTick, setRecheckTick] = useState(0);
  const userRoleRef = useRef(userRole);
  userRoleRef.current = userRole;

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(MOBILE_ONBOARDING_RESET_EVENT, () => {
      setStackTour({ visible: false, steps: [], screenName: null });
      setPatientShellVisible(false);
      setRecheckTick((t) => t + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      setPatientShellVisible(false);
      return undefined;
    }
    if (!isPacienteRole(userRole)) {
      setPatientShellVisible(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const done = await isPatientShellComplete();
      if (cancelled) return;
      setPatientShellVisible(!done);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, isAuthenticated, userRole, recheckTick]);

  const applyStackTourForRoute = useCallback(async (route) => {
    const role = userRoleRef.current;
    if (!route || route === 'MainTabs') {
      setStackTour({ visible: false, steps: [], screenName: null });
      return;
    }
    if (isProfessionalRole(role)) {
      const shellOk = await isShellComplete();
      if (!shellOk) return;
      const def = PROFESSIONAL_STACK_TOURS[route];
      if (!def) {
        setStackTour({ visible: false, steps: [], screenName: null });
        return;
      }
      const doneTour = await isStackTourComplete(route);
      if (doneTour) {
        setStackTour({ visible: false, steps: [], screenName: null });
        return;
      }
      setStackTour({
        visible: true,
        steps: def.steps,
        screenName: route,
      });
      return;
    }
    if (isPacienteRole(role)) {
      const shellOk = await isPatientShellComplete();
      if (!shellOk) return;
      const def = PATIENT_STACK_TOURS[route];
      if (!def) {
        setStackTour({ visible: false, steps: [], screenName: null });
        return;
      }
      const doneTour = await isStackTourComplete(route);
      if (doneTour) {
        setStackTour({ visible: false, steps: [], screenName: null });
        return;
      }
      setStackTour({
        visible: true,
        steps: def.steps,
        screenName: route,
      });
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated || navigationRootState == null) {
      return undefined;
    }
    const route = getDeepestRouteName(navigationRootState);
    const timer = setTimeout(() => {
      applyStackTourForRoute(route);
    }, STACK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    navigationRootState,
    isLoading,
    isAuthenticated,
    userRole,
    recheckTick,
    applyStackTourForRoute,
  ]);

  const finishPatientShell = async () => {
    await markPatientShellComplete();
    setPatientShellVisible(false);
  };

  const skipPatientShell = async () => {
    await markPatientShellComplete();
    setPatientShellVisible(false);
  };

  const finishStackTour = async () => {
    if (stackTour.screenName) {
      await markStackTourComplete(stackTour.screenName);
    }
    setStackTour({ visible: false, steps: [], screenName: null });
  };

  const skipStackTour = async () => {
    if (stackTour.screenName) {
      await markStackTourComplete(stackTour.screenName);
    }
    setStackTour({ visible: false, steps: [], screenName: null });
  };

  if (!isAuthenticated || isLoading) {
    return null;
  }

  return (
    <>
      <OnboardingShellModal
        key="patient-intro"
        visible={patientShellVisible && isPacienteRole(userRole)}
        steps={PATIENT_SHELL_STEPS}
        onSkip={skipPatientShell}
        onFinish={finishPatientShell}
      />
      <OnboardingShellModal
        key={stackTour.screenName || 'stack-tour'}
        visible={stackTour.visible && !!stackTour.steps.length}
        steps={stackTour.steps}
        onSkip={skipStackTour}
        onFinish={finishStackTour}
      />
    </>
  );
}
