import { useCallback, useReducer } from 'react';
import { isValidPacienteRegistroStep } from '../constants/pacienteRegistroWizard';

/** Acciones del reducer (exportadas para pruebas). */
export const WIZARD_STEP_ACTION = {
  GO_FORWARD: 'wizard/GO_FORWARD',
  SELECT_VISITED: 'wizard/SELECT_VISITED',
};

/**
 * @typedef {{ currentStep: number, maxStepReached: number }} WizardStepState
 */

/**
 * @param {WizardStepState} state
 * @param {{ type: string, payload: number }} action
 * @returns {WizardStepState}
 */
export function pacienteRegistroWizardReducer(state, action) {
  const step = action.payload;

  if (!isValidPacienteRegistroStep(step)) {
    return state;
  }

  switch (action.type) {
    case WIZARD_STEP_ACTION.GO_FORWARD:
      return {
        currentStep: step,
        maxStepReached: Math.max(state.maxStepReached, step),
      };
    case WIZARD_STEP_ACTION.SELECT_VISITED:
      if (step === state.currentStep) return state;
      if (step > state.maxStepReached) return state;
      return { ...state, currentStep: step };
    default:
      return state;
  }
}

/**
 * Navegación por pasos de un asistente: avance lineal y salto a pasos ya visitados.
 *
 * @param {{ initialStep?: number, totalSteps?: number }} [options]
 */
export function useWizardStepNavigation(options = {}) {
  const initialStep =
    options.initialStep != null && isValidPacienteRegistroStep(options.initialStep)
      ? options.initialStep
      : 1;

  const [state, dispatch] = useReducer(pacienteRegistroWizardReducer, {
    currentStep: initialStep,
    maxStepReached: initialStep,
  });

  const goForwardToStep = useCallback((step) => {
    dispatch({ type: WIZARD_STEP_ACTION.GO_FORWARD, payload: step });
  }, []);

  const selectVisitedStep = useCallback((step) => {
    dispatch({ type: WIZARD_STEP_ACTION.SELECT_VISITED, payload: step });
  }, []);

  return {
    currentStep: state.currentStep,
    maxStepReached: state.maxStepReached,
    goForwardToStep,
    selectVisitedStep,
  };
}
