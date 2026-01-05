/**
 * @file jest.setup.js
 * @description Setup global para Jest - Incluye MSW y otras configuraciones
 * @author Senior Developer
 * @date 2025-11-08
 */

// Mock de react-native-gesture-handler antes de cualquier importación
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View, TouchableOpacity, TouchableHighlight, TouchableWithoutFeedback } = require('react-native');
  
  const PanGestureHandler = ({ children, onGestureEvent, ...props }) => {
    return React.createElement(View, props, children);
  };
  
  return {
    GestureHandlerRootView: ({ children }) => <View>{children}</View>,
    PanGestureHandler,
    TouchableOpacity,
    TouchableHighlight,
    TouchableWithoutFeedback,
    Swipeable: ({ children }) => <View>{children}</View>,
    DrawerLayout: ({ children }) => <View>{children}</View>,
    State: {},
    Directions: {},
    gestureHandlerRootHOC: (component) => component,
    // Mock del módulo nativo
    default: {
      GestureHandlerRootView: ({ children }) => <View>{children}</View>,
      PanGestureHandler,
    },
  };
});

// Mock de react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return {
    default: {
      View,
      Value: jest.fn(),
      event: jest.fn(),
      add: jest.fn(),
      eq: jest.fn(),
      set: jest.fn(),
      cond: jest.fn(),
      interpolate: jest.fn(),
      View: View,
      Extrapolate: { EXTEND: 'extend' },
      Transition: {
        Together: 'Together',
        OutIn: 'OutIn',
        InOut: 'InOut',
      },
    },
    Easing: {
      in: jest.fn(),
      out: jest.fn(),
      inOut: jest.fn(),
    },
  };
});

// MSW se inicializará solo si está disponible
// Esto evita errores si MSW no está completamente configurado
let server = null;

try {
  // Intentar importar MSW server
  const mswModule = require('./src/mocks/server');
  if (mswModule && mswModule.server) {
    server = mswModule.server;
    
    // Establecer handlers de MSW antes de todos los tests
    beforeAll(() => {
      if (server && server.listen) {
        server.listen({ onUnhandledRequest: 'warn' });
      }
    });

    // Reset handlers después de cada test para limpiar estado
    afterEach(() => {
      if (server && server.resetHandlers) {
        server.resetHandlers();
      }
    });

    // Cerrar server después de todos los tests
    afterAll(() => {
      if (server && server.close) {
        server.close();
      }
    });
  }
} catch (error) {
  // MSW no está disponible o hay un error de configuración
  // Continuar sin MSW (los tests seguirán funcionando con mocks manuales)
  // No hacer nada, los tests seguirán funcionando
}

// Mock global de console para evitar ruido en tests
global.console = {
  ...console,
  // Mantener console.error y console.warn para ver errores reales
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

// Timeout global para tests (30 segundos)
jest.setTimeout(30000);
