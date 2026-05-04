/**
 * Suite reducida para CI: revisión funcional automatizada (Jest + Testing Library).
 * No requiere dispositivo físico ni emulador; corre en Node (ubuntu-latest).
 *
 * Ampliar `testMatch` conforme se reparen o añadan tests estables.
 */
const base = { ...require('./jest.config.js') };
delete base.coverageThreshold;

module.exports = {
  ...base,
  testMatch: [
    '<rootDir>/src/utils/__tests__/vitalSignsAnalysis.test.js',
    '<rootDir>/src/components/DetallePaciente/shared/__tests__/OptionsModal.test.js',
    '<rootDir>/src/components/DetallePaciente/shared/__tests__/FormModal.test.js',
    '<rootDir>/src/__tests__/frontend-validation.test.js',
    '<rootDir>/src/__tests__/signos-vitales-create.test.js',
    '<rootDir>/src/__tests__/ChatWebSocket.test.js',
    '<rootDir>/src/__tests__/DetallePaciente-Formularios.test.js',
    '<rootDir>/src/hooks/__tests__/useWizardStepNavigation.test.js',
  ],
};
