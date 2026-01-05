module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '@testing-library/jest-native/extend-expect'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/?(*.)(spec|test).(js|jsx|ts|tsx)'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation|react-native-paper|react-native-vector-icons|@react-native-async-storage|axios|msw)'
  ],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/src/__mocks__/svgMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '@react-native-async-storage/async-storage': '<rootDir>/src/__mocks__/AsyncStorage.js',
    'react-native-encrypted-storage': '<rootDir>/src/__mocks__/EncryptedStorage.js'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/index.js',
    '!src/**/*.test.{js,jsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  resetMocks: true
};

