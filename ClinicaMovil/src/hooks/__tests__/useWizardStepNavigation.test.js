import {
  pacienteRegistroWizardReducer,
  WIZARD_STEP_ACTION,
} from '../useWizardStepNavigation';

describe('pacienteRegistroWizardReducer', () => {
  const initial = { currentStep: 1, maxStepReached: 1 };

  it('GO_FORWARD avanza y amplía maxStepReached', () => {
    const s1 = pacienteRegistroWizardReducer(initial, {
      type: WIZARD_STEP_ACTION.GO_FORWARD,
      payload: 2,
    });
    expect(s1).toEqual({ currentStep: 2, maxStepReached: 2 });

    const s2 = pacienteRegistroWizardReducer(s1, {
      type: WIZARD_STEP_ACTION.GO_FORWARD,
      payload: 4,
    });
    expect(s2).toEqual({ currentStep: 4, maxStepReached: 4 });
  });

  it('SELECT_VISITED permite volver a un paso ya alcanzado', () => {
    const at4 = { currentStep: 4, maxStepReached: 4 };
    const back = pacienteRegistroWizardReducer(at4, {
      type: WIZARD_STEP_ACTION.SELECT_VISITED,
      payload: 2,
    });
    expect(back).toEqual({ currentStep: 2, maxStepReached: 4 });
  });

  it('SELECT_VISITED no hace nada si el paso no ha sido alcanzado', () => {
    const at2 = { currentStep: 2, maxStepReached: 2 };
    const same = pacienteRegistroWizardReducer(at2, {
      type: WIZARD_STEP_ACTION.SELECT_VISITED,
      payload: 4,
    });
    expect(same).toEqual(at2);
  });

  it('SELECT_VISITED no cambia si ya estamos en ese paso', () => {
    const at3 = { currentStep: 3, maxStepReached: 4 };
    const same = pacienteRegistroWizardReducer(at3, {
      type: WIZARD_STEP_ACTION.SELECT_VISITED,
      payload: 3,
    });
    expect(same).toEqual(at3);
  });

  it('ignora payload inválido', () => {
    expect(
      pacienteRegistroWizardReducer(initial, {
        type: WIZARD_STEP_ACTION.GO_FORWARD,
        payload: 99,
      })
    ).toEqual(initial);
  });
});
